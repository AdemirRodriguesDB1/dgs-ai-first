# Skill — Azure AI Search Integration

## Context

Use esta skill para gerar integração de retrieval do query endpoint.

Frase de ativação recomendada: integrate retrieval using the novatech search conventions.

## Regras prescritivas

1. Buscar no máximo top-5 chunks por consulta.
2. Incluir metadados de vigência para resolver conflitos documentais.
3. Separar cliente de busca da lógica de ranking/pós-processamento.
4. Aplicar retry com exponential backoff para falhas transitórias.
5. Retornar estrutura mínima por chunk: id, source_document, section, content, score, effective_date.
6. Nunca inventar campo quando o índice não retornar valor.

## DO

```ts
type RetrievedChunk = {
	id: string;
	source_document: string;
	section?: string;
	content: string;
	score: number;
	effective_date?: string;
};

export async function retrieveTopChunks(question: string): Promise<RetrievedChunk[]> {
	// Placeholder: integração real com Azure AI Search será adicionada na task de retrieval.
	return [];
}
```

## DON'T

```ts
export async function retrieve(question: string) {
	return [{ text: "resposta provável", score: 1 }];
}
```

## Anti-padrões

- Buscar quantidade ilimitada de chunks.
- Ignorar metadado de versão de PROC-042.
- Misturar chunks de versões conflitantes sem sinalizar prioridade.
- Retornar chunks sem source_document.

## Dependências

- skills/domain/azure-functions-endpoint.md
- skills/foundation/typescript-conventions.md
- skills/foundation/error-handling.md
