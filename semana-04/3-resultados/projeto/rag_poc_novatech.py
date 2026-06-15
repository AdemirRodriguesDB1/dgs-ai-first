import os
import socket
import math
from pathlib import Path
from typing import TypedDict

from sentence_transformers import SentenceTransformer
import chromadb

# ---------------------------------------------------------------------------
# Configurações
# ---------------------------------------------------------------------------

COLLECTION_NAME = "novatech_rag"
MAX_WORDS = 320
OVERLAP_WORDS = 40
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

FALLBACK_DOCUMENTS = [
    {
        "name": "POL-001-politica-devolucao.md",
        "content": (
            "POL-001 seção 3.2: mercadorias podem ser devolvidas em até 7 dias úteis "
            "após recebimento, exceto cargas perigosas (classes 1 a 6 ANTT)."
        ),
    },
    {
        "name": "SLA-2024-tabela-sla-clientes.md",
        "content": (
            "SLA-2024: cliente Gold resposta em até 2h e resolução em até 24h; "
            "cliente Silver resposta em até 4h e resolução em até 48h; "
            "cliente Standard resposta em até 8h e resolução em até 72h."
        ),
    },
    {
        "name": "PROC-042-v2-frete-especial-revisado.md",
        "content": (
            "PROC-042-v2 seção 2: frete especial acima de 500kg = valor base x multiplicador regional. "
            "Norte 1.8, Sudeste 1.1, Sul 1.3, Nordeste 1.5, Centro-Oeste 1.4."
        ),
    },
]

# ---------------------------------------------------------------------------
# Tipos
# ---------------------------------------------------------------------------

class Metadata(TypedDict):
    document: str
    chunk_index: int


class QueryResult(TypedDict):
    chunk_id: str
    document: str
    text: str
    score: float


class InMemoryChunk(TypedDict):
    id: str
    text: str
    metadata: Metadata
    embedding: list[float]


# ---------------------------------------------------------------------------
# Store em memória (fallback quando ChromaDB não está disponível)
# ---------------------------------------------------------------------------

in_memory_store: list[InMemoryChunk] = []

# ---------------------------------------------------------------------------
# Modelo de embeddings (singleton)
# ---------------------------------------------------------------------------

_embedding_model: SentenceTransformer | None = None


def get_embedding_model() -> SentenceTransformer:
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer(EMBEDDING_MODEL)
    return _embedding_model


def embed_texts(texts: list[str]) -> list[list[float]]:
    model = get_embedding_model()
    vectors = model.encode(texts, normalize_embeddings=True)
    return [v.tolist() for v in vectors]

# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

def simple_chunk_text(text: str, max_words: int = MAX_WORDS, overlap_words: int = OVERLAP_WORDS) -> list[str]:
    words = text.split()
    if not words:
        return []

    chunks: list[str] = []
    start = 0

    while start < len(words):
        end = min(len(words), start + max_words)
        chunk = " ".join(words[start:end]).strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(words):
            break
        start = max(end - overlap_words, start + 1)

    return chunks

# ---------------------------------------------------------------------------
# ChromaDB
# ---------------------------------------------------------------------------

def is_chroma_reachable(host: str = "127.0.0.1", port: int = 8000) -> bool:
    try:
        with socket.create_connection((host, port), timeout=0.5):
            return True
    except OSError:
        return False


def get_collection():
    client = chromadb.HttpClient(host="localhost", port=8000)
    try:
        return client.get_collection(name=COLLECTION_NAME)
    except Exception:
        return client.create_collection(name=COLLECTION_NAME)

# ---------------------------------------------------------------------------
# Similaridade cosseno (para o fallback in-memory)
# ---------------------------------------------------------------------------

def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)

# ---------------------------------------------------------------------------
# Ingestão
# ---------------------------------------------------------------------------

def ingest_documents(document_paths: list[str]) -> None:
    ids: list[str] = []
    documents: list[str] = []
    metadatas: list[Metadata] = []

    for doc_path in document_paths:
        raw_text = Path(doc_path).read_text(encoding="utf-8")
        chunks = simple_chunk_text(raw_text)
        stem = Path(doc_path).stem

        for index, chunk in enumerate(chunks):
            ids.append(f"{stem}-{index}")
            documents.append(chunk)
            metadatas.append({"document": Path(doc_path).name, "chunk_index": index})

    if not documents:
        raise ValueError("Nenhum documento válido foi encontrado para ingestão.")

    embeddings = embed_texts(documents)

    if is_chroma_reachable():
        collection = get_collection()
        collection.add(ids=ids, documents=documents, metadatas=metadatas, embeddings=embeddings)
    else:
        for i in range(len(ids)):
            in_memory_store.append({
                "id": ids[i],
                "text": documents[i],
                "metadata": metadatas[i],
                "embedding": embeddings[i],
            })


def ingest_fallback_documents() -> None:
    ids: list[str] = []
    docs: list[str] = []
    metadatas: list[Metadata] = []

    for index, doc in enumerate(FALLBACK_DOCUMENTS):
        stem = Path(doc["name"]).stem
        ids.append(f"{stem}-{index}")
        docs.append(doc["content"])
        metadatas.append({"document": doc["name"], "chunk_index": index})

    embeddings = embed_texts(docs)
    for i in range(len(ids)):
        in_memory_store.append({
            "id": ids[i],
            "text": docs[i],
            "metadata": metadatas[i],
            "embedding": embeddings[i],
        })

# ---------------------------------------------------------------------------
# Busca
# ---------------------------------------------------------------------------

def search(question: str, top_k: int = 5) -> list[QueryResult]:
    query_embedding = embed_texts([question])[0]

    if is_chroma_reachable():
        collection = get_collection()
        result = collection.query(query_embeddings=[query_embedding], n_results=top_k)
        docs = result["documents"][0] if result.get("documents") else []
        metas = result["metadatas"][0] if result.get("metadatas") else []
        distances = result["distances"][0] if result.get("distances") else []

        results: list[QueryResult] = []
        for i, doc in enumerate(docs):
            meta: Metadata = metas[i]
            distance = distances[i] if i < len(distances) else 1.0
            results.append({
                "chunk_id": f"{meta['document']}#{meta['chunk_index']}",
                "document": meta["document"],
                "text": doc or "",
                "score": 1 - float(distance),
            })
        return results

    # Fallback in-memory
    ranked = sorted(
        in_memory_store,
        key=lambda item: cosine_similarity(query_embedding, item["embedding"]),
        reverse=True,
    )[:top_k]

    return [
        {
            "chunk_id": f"{item['metadata']['document']}#{item['metadata']['chunk_index']}",
            "document": item["metadata"]["document"],
            "text": item["text"],
            "score": cosine_similarity(query_embedding, item["embedding"]),
        }
        for item in ranked
    ]

# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------

def build_prompt(question: str, chunks: list[QueryResult]) -> str:
    context_block = "\n\n".join(f"[{c['chunk_id']}] {c['text']}" for c in chunks)

    return f"""Você é o assistente de atendimento da NovaTech.

Regras:
- Use apenas o contexto fornecido.
- Cite a fonte.
- Não invente valores, prazos ou regras.
- Se a informação não estiver no contexto, diga que não encontrou.
- Se houver conflito entre versões, explicite a contradição.

Contexto recuperado:
{context_block}

Pergunta:
{question}

Resposta:"""

# ---------------------------------------------------------------------------
# Documentos padrão
# ---------------------------------------------------------------------------

def load_default_documents() -> list[str]:
    files = [
        "POL-001-politica-devolucao.md",
        "PROC-042-frete-especial-v1.md",
        "PROC-042-v2-frete-especial-revisado.md",
        "SLA-2024-tabela-sla-clientes.md",
        "FAQ-atendimento.md",
    ]

    base_dir = Path(__file__).parent
    paths: list[str] = []

    for name in files:
        local = base_dir / name
        parent = base_dir.parent / name
        if local.exists():
            paths.append(str(local))
        elif parent.exists():
            paths.append(str(parent))

    return paths

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    docs = load_default_documents()

    if docs:
        ingest_documents(docs)
    else:
        ingest_fallback_documents()

    question = "Qual o prazo de devolução para carga perigosa?"
    chunks = search(question, top_k=3)
    prompt = build_prompt(question, chunks)

    print(prompt)


if __name__ == "__main__":
    main()
