import * as fs from "fs/promises";
import { existsSync } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

import { ChromaClient } from "chromadb";
import { pipeline } from "@xenova/transformers";

type Metadata = {
  document: string;
  chunk_index: number;
};

type QueryResult = {
  chunkId: string;
  document: string;
  text: string;
  score: number;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLLECTION_NAME = "novatech_rag";
const MAX_WORDS = 320;
const OVERLAP_WORDS = 40;
const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

async function readDocument(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf-8");
}

function simpleChunkText(text: string, maxWords = MAX_WORDS, overlapWords = OVERLAP_WORDS): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(words.length, start + maxWords);
    const chunk = words.slice(start, end).join(" ").trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    if (end >= words.length) {
      break;
    }

    start = Math.max(end - overlapWords, start + 1);
  }

  return chunks;
}

let embeddingPipeline: any = null;

async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline("feature-extraction", EMBEDDING_MODEL);
  }
  return embeddingPipeline;
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  const extractor = await getEmbeddingPipeline();
  const vectors: number[][] = [];

  for (const text of texts) {
    const output: any = await extractor(text, { pooling: "mean", normalize: true } as any);
    vectors.push(Array.from(output.data as Float32Array));
  }

  return vectors;
}

async function getCollection() {
  const client: any = new ChromaClient({
    path: "http://localhost:8000",
  });

  try {
    return await client.getCollection({ name: COLLECTION_NAME } as any);
  } catch {
    return await client.createCollection({ name: COLLECTION_NAME } as any);
  }
}

async function ingestDocuments(documentPaths: string[]): Promise<void> {
  const collection = await getCollection();

  const ids: string[] = [];
  const documents: string[] = [];
  const metadatas: Metadata[] = [];

  for (const docPath of documentPaths) {
    const rawText = await readDocument(docPath);
    const chunks = simpleChunkText(rawText);

    chunks.forEach((chunk, index) => {
      ids.push(`${path.parse(docPath).name}-${index}`);
      documents.push(chunk);
      metadatas.push({
        document: path.basename(docPath),
        chunk_index: index,
      });
    });
  }

  const embeddings = await embedTexts(documents);

  await collection.add({
    ids,
    documents,
    metadatas,
    embeddings,
  });
}

async function search(question: string, topK = 5): Promise<QueryResult[]> {
  const collection = await getCollection();
  const [queryEmbedding] = await embedTexts([question]);

  const result: any = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
  });

  const docs = (result.documents?.[0] ?? []) as Array<string | null>;
  const metas = (result.metadatas[0] ?? []) as Metadata[];
  const distances = (result.distances?.[0] ?? []) as number[];

  return docs.map((doc: string | null, index: number) => {
    const metadata = metas[index];
    const distance = distances[index] ?? 1;
    return {
      chunkId: `${metadata.document}#${metadata.chunk_index}`,
      document: metadata.document,
      text: doc ?? "",
      score: 1 - Number(distance),
    };
  });
}

function buildPrompt(question: string, chunks: QueryResult[]): string {
  const contextBlock = chunks.map((chunk) => `[${chunk.chunkId}] ${chunk.text}`).join("\n\n");

  return `Você é o assistente de atendimento da NovaTech.

Regras:
- Use apenas o contexto fornecido.
- Cite a fonte.
- Não invente valores, prazos ou regras.
- Se a informação não estiver no contexto, diga que não encontrou.
- Se houver conflito entre versões, explicite a contradição.

Contexto recuperado:
${contextBlock}

Pergunta:
${question}

Resposta:`;
}

function loadDefaultDocuments(): string[] {
  const files = [
    "POL-001-politica-devolucao.md",
    "PROC-042-frete-especial-v1.md",
    "PROC-042-v2-frete-especial-revisado.md",
    "SLA-2024-tabela-sla-clientes.md",
    "FAQ-atendimento.md",
  ];

  return files.map((name) => {
    const localPath = path.join(__dirname, name);
    if (existsSync(localPath)) {
      return localPath;
    }

    return path.join(__dirname, "..", name);
  });
}

async function main() {
  const docs = loadDefaultDocuments();
  await ingestDocuments(docs);

  const question = "Qual o prazo de devolução para carga perigosa?";
  const chunks = await search(question, 3);
  const prompt = buildPrompt(question, chunks);

  console.log(prompt);
}

main().catch((error) => {
  console.error("Erro ao executar a POC de RAG:", error);
  process.exit(1);
});
