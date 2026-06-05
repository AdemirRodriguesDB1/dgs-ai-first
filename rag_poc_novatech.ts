import * as fs from "fs/promises";
import { existsSync } from "fs";
import * as path from "path";
import * as net from "net";

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

type InMemoryChunk = {
  id: string;
  text: string;
  metadata: Metadata;
  embedding: number[];
};

const __dirname = process.cwd();

const COLLECTION_NAME = "novatech_rag";
const MAX_WORDS = 320;
const OVERLAP_WORDS = 40;
const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

const FALLBACK_DOCUMENTS: Array<{ name: string; content: string }> = [
  {
    name: "POL-001-politica-devolucao.md",
    content:
      "POL-001 seção 3.2: mercadorias podem ser devolvidas em até 7 dias úteis após recebimento, exceto cargas perigosas (classes 1 a 6 ANTT).",
  },
  {
    name: "SLA-2024-tabela-sla-clientes.md",
    content:
      "SLA-2024: cliente Gold resposta em até 2h e resolução em até 24h; cliente Silver resposta em até 4h e resolução em até 48h; cliente Standard resposta em até 8h e resolução em até 72h.",
  },
  {
    name: "PROC-042-v2-frete-especial-revisado.md",
    content:
      "PROC-042-v2 seção 2: frete especial acima de 500kg = valor base x multiplicador regional. Norte 1.8, Sudeste 1.1, Sul 1.3, Nordeste 1.5, Centro-Oeste 1.4.",
  },
];

const inMemoryStore: InMemoryChunk[] = [];

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
    host: "localhost",
    port: 8000,
    ssl: false,
  });

  try {
    return await client.getCollection({ name: COLLECTION_NAME } as any);
  } catch {
    return await client.createCollection({ name: COLLECTION_NAME } as any);
  }
}

async function isChromaReachable(host = "127.0.0.1", port = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(500);

    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });

    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function ingestDocuments(documentPaths: string[]): Promise<void> {
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

  if (documents.length === 0) {
    throw new Error("Nenhum documento válido foi encontrado para ingestão.");
  }

  const embeddings = await embedTexts(documents);

  let collection: any = null;
  const chromaOnline = await isChromaReachable();
  if (chromaOnline) {
    collection = await getCollection();
  }

  if (!collection) {
    // Fallback para execução local sem servidor Chroma.
    for (let i = 0; i < ids.length; i++) {
      inMemoryStore.push({
        id: ids[i],
        text: documents[i],
        metadata: metadatas[i],
        embedding: embeddings[i],
      });
    }
    return;
  }

  await collection.add({
    ids,
    documents,
    metadatas,
    embeddings,
  });
}

async function search(question: string, topK = 5): Promise<QueryResult[]> {
  const [queryEmbedding] = await embedTexts([question]);

  let collection: any = null;
  const chromaOnline = await isChromaReachable();
  if (chromaOnline) {
    collection = await getCollection();
  }

  if (!collection) {
    const ranked = inMemoryStore
      .map((item) => ({
        item,
        score: cosineSimilarity(queryEmbedding, item.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return ranked.map(({ item, score }) => ({
      chunkId: `${item.metadata.document}#${item.metadata.chunk_index}`,
      document: item.metadata.document,
      text: item.text,
      score,
    }));
  }

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

async function ingestFallbackDocuments(): Promise<void> {
  const ids: string[] = [];
  const docs: string[] = [];
  const metadatas: Metadata[] = [];

  FALLBACK_DOCUMENTS.forEach((doc, index) => {
    ids.push(`${path.parse(doc.name).name}-${index}`);
    docs.push(doc.content);
    metadatas.push({
      document: doc.name,
      chunk_index: index,
    });
  });

  const embeddings = await embedTexts(docs);
  for (let i = 0; i < ids.length; i++) {
    inMemoryStore.push({
      id: ids[i],
      text: docs[i],
      metadata: metadatas[i],
      embedding: embeddings[i],
    });
  }
}

async function main() {
  const docs = loadDefaultDocuments().filter((p) => existsSync(p));

  if (docs.length > 0) {
    await ingestDocuments(docs);
  } else {
    await ingestFallbackDocuments();
  }

  const question = "Qual o prazo de devolução para carga perigosa?";
  const chunks = await search(question, 3);
  const prompt = buildPrompt(question, chunks);

  console.log(prompt);
}

main().catch((error) => {
  console.error("Erro ao executar a POC de RAG:", error);
  process.exit(1);
});
