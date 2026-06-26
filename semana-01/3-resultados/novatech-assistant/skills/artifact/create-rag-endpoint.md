# Skill — Create RAG Endpoint

## Context

Use esta skill para gerar um endpoint completo de RAG no padrão NovaTech.

Frase de ativação: create a complete rag endpoint for novatech.

## Pré-condições

1. Ler skills/foundation/typescript-conventions.md.
2. Ler skills/domain/azure-functions-endpoint.md.
3. Ler skills/domain/azure-ai-search-integration.md.

## Resultado esperado

Gerar endpoint em src/functions/<modulo>/ com:

1. handler.ts com registro app.http.
2. validator.ts com Zod para request e response.
3. response-builder.ts com resposta JSON estruturada.
4. integração de retrieval top-5 e montagem de prompt.
5. retorno obrigatório com source_document.

## Checklist de geração

1. Validar método HTTP.
2. Validar payload com question obrigatório.
3. Buscar chunks relevantes com metadado de vigência.
4. Montar contexto respeitando budget.
5. Registrar logs estruturados com pino.
6. Tratar erros de validação e erros internos.

## Template base

```ts
export async function handleRequest(input: RequestLike): Promise<ResponseLike> {
	// validate
	// retrieve chunks
	// build prompt
	// call model
	// return answer + source_document
}
```

## DO

```ts
return buildJsonResponse(200, {
	answer,
	source_document,
	confidence,
});
```

## DON'T

```ts
return { answer: "provavelmente é isso", confidence: 1 };
```

## Anti-padrões

- Endpoint sem source_document.
- Misturar validação, retrieval e resposta final em uma função gigante.
- Ignorar regras de documento vigente quando houver versões conflitantes.
