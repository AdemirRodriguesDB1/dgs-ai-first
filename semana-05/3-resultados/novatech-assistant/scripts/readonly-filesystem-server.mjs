#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { minimatch } from "minimatch";
import { z } from "zod";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node readonly-filesystem-server.mjs [allowed-directory] [additional-directories...]");
  process.exit(1);
}

const allowedDirectories = await Promise.all(
  args.map(async (directory) => {
    const absolute = path.resolve(directory);
    const stats = await fs.stat(absolute);

    if (!stats.isDirectory()) {
      throw new Error(`Not a directory: ${absolute}`);
    }

    return normalizePath(await fs.realpath(absolute));
  }),
);

function normalizePath(inputPath) {
  return path.normalize(inputPath);
}

async function validatePath(inputPath) {
  const resolved = normalizePath(await fs.realpath(path.resolve(inputPath)));

  const isAllowed = allowedDirectories.some((directory) => {
    const relative = path.relative(directory, resolved);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  });

  if (!isAllowed) {
    throw new Error(`Access denied: ${inputPath}`);
  }

  return resolved;
}

async function readTextFile(filePath, head, tail) {
  const content = await fs.readFile(filePath, "utf8");

  if (head && tail) {
    throw new Error("Cannot specify both head and tail");
  }

  const lines = content.split(/\r?\n/);

  if (head) {
    return lines.slice(0, head).join("\n");
  }

  if (tail) {
    return lines.slice(-tail).join("\n");
  }

  return content;
}

async function walkDirectory(directoryPath, excludePatterns = []) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);
    const normalized = normalizePath(fullPath);
    const excluded = excludePatterns.some((pattern) => minimatch(entry.name, pattern) || minimatch(normalized, pattern));

    if (excluded) {
      continue;
    }

    if (entry.isDirectory()) {
      results.push({ name: entry.name, type: "directory", path: normalized, children: await walkDirectory(fullPath, excludePatterns) });
    } else {
      results.push({ name: entry.name, type: "file", path: normalized });
    }
  }

  return results;
}

const server = new McpServer({
  name: "readonly-filesystem-server",
  version: "1.0.0",
});

const readTextFileSchema = {
  path: z.string(),
  head: z.number().optional(),
  tail: z.number().optional(),
};

server.registerTool(
  "read_file",
  {
    title: "Read File (Deprecated)",
    description: "Read a UTF-8 text file within allowed directories.",
    inputSchema: readTextFileSchema,
    annotations: { readOnlyHint: true },
  },
  async ({ path: inputPath, head, tail }) => {
    const validPath = await validatePath(inputPath);
    const content = await readTextFile(validPath, head, tail);
    return { content: [{ type: "text", text: content }], structuredContent: { content } };
  },
);

server.registerTool(
  "read_text_file",
  {
    title: "Read Text File",
    description: "Read a UTF-8 text file within allowed directories.",
    inputSchema: readTextFileSchema,
    annotations: { readOnlyHint: true },
  },
  async ({ path: inputPath, head, tail }) => {
    const validPath = await validatePath(inputPath);
    const content = await readTextFile(validPath, head, tail);
    return { content: [{ type: "text", text: content }], structuredContent: { content } };
  },
);

server.registerTool(
  "read_multiple_files",
  {
    title: "Read Multiple Files",
    description: "Read multiple UTF-8 text files within allowed directories.",
    inputSchema: { paths: z.array(z.string()).min(1) },
    annotations: { readOnlyHint: true },
  },
  async ({ paths }) => {
    const chunks = [];

    for (const inputPath of paths) {
      try {
        const validPath = await validatePath(inputPath);
        const content = await readTextFile(validPath);
        chunks.push(`${inputPath}:\n${content}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        chunks.push(`${inputPath}: Error - ${message}`);
      }
    }

    const content = chunks.join("\n---\n");
    return { content: [{ type: "text", text: content }], structuredContent: { content } };
  },
);

server.registerTool(
  "list_directory",
  {
    title: "List Directory",
    description: "List files and directories within an allowed directory.",
    inputSchema: { path: z.string() },
    annotations: { readOnlyHint: true },
  },
  async ({ path: inputPath }) => {
    const validPath = await validatePath(inputPath);
    const entries = await fs.readdir(validPath, { withFileTypes: true });
    const content = entries
      .map((entry) => `${entry.isDirectory() ? "[DIR]" : "[FILE]"} ${entry.name}`)
      .join("\n");

    return { content: [{ type: "text", text: content }], structuredContent: { content } };
  },
);

server.registerTool(
  "list_directory_with_sizes",
  {
    title: "List Directory With Sizes",
    description: "List files and directories with size metadata.",
    inputSchema: { path: z.string(), sortBy: z.enum(["name", "size"]).optional() },
    annotations: { readOnlyHint: true },
  },
  async ({ path: inputPath, sortBy = "name" }) => {
    const validPath = await validatePath(inputPath);
    const entries = await fs.readdir(validPath, { withFileTypes: true });
    const rows = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(validPath, entry.name);
        const stats = await fs.stat(fullPath);
        return {
          name: entry.name,
          isDirectory: entry.isDirectory(),
          size: entry.isDirectory() ? 0 : stats.size,
        };
      }),
    );

    rows.sort((left, right) => {
      if (sortBy === "size") {
        return left.size - right.size || left.name.localeCompare(right.name);
      }
      return left.name.localeCompare(right.name);
    });

    const content = rows
      .map((row) => `${row.isDirectory ? "[DIR]" : "[FILE]"} ${row.name}${row.isDirectory ? "" : ` (${row.size} bytes)`}`)
      .join("\n");

    return { content: [{ type: "text", text: content }], structuredContent: { content } };
  },
);

server.registerTool(
  "directory_tree",
  {
    title: "Directory Tree",
    description: "Return the directory tree as JSON.",
    inputSchema: { path: z.string(), excludePatterns: z.array(z.string()).optional() },
    annotations: { readOnlyHint: true },
  },
  async ({ path: inputPath, excludePatterns = [] }) => {
    const validPath = await validatePath(inputPath);
    const tree = await walkDirectory(validPath, excludePatterns);
    const content = JSON.stringify(tree, null, 2);
    return { content: [{ type: "text", text: content }], structuredContent: { content } };
  },
);

server.registerTool(
  "search_files",
  {
    title: "Search Files",
    description: "Search for file paths by glob-like pattern within allowed directories.",
    inputSchema: { path: z.string(), pattern: z.string(), excludePatterns: z.array(z.string()).optional() },
    annotations: { readOnlyHint: true },
  },
  async ({ path: inputPath, pattern, excludePatterns = [] }) => {
    const validPath = await validatePath(inputPath);
    const tree = await walkDirectory(validPath, excludePatterns);
    const matches = [];

    const visit = (nodes) => {
      for (const node of nodes) {
        const candidate = `${node.name} ${node.path}`;
        if (minimatch(node.name, pattern) || minimatch(node.path, pattern) || candidate.includes(pattern)) {
          matches.push(node.path);
        }
        if (node.type === "directory" && node.children) {
          visit(node.children);
        }
      }
    };

    visit(tree);

    const content = matches.length > 0 ? matches.join("\n") : "No matches found";
    return { content: [{ type: "text", text: content }], structuredContent: { content } };
  },
);

server.registerTool(
  "get_file_info",
  {
    title: "Get File Info",
    description: "Get metadata for a file or directory.",
    inputSchema: { path: z.string() },
    annotations: { readOnlyHint: true },
  },
  async ({ path: inputPath }) => {
    const validPath = await validatePath(inputPath);
    const stats = await fs.stat(validPath);
    const content = JSON.stringify(
      {
        path: validPath,
        type: stats.isDirectory() ? "directory" : "file",
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString(),
      },
      null,
      2,
    );

    return { content: [{ type: "text", text: content }], structuredContent: { content } };
  },
);

server.registerTool(
  "list_allowed_directories",
  {
    title: "List Allowed Directories",
    description: "List the directories this server can access.",
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  async () => {
    const content = allowedDirectories.join("\n");
    return { content: [{ type: "text", text: content }], structuredContent: { content } };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);