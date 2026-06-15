# Skill — Azure Functions Endpoint

## Context

Use esta skill para criar ou revisar endpoints HTTP em Azure Functions v4 no novatech-assistant.

Frase de ativação recomendada: generate an Azure Functions endpoint following novatech rules.

## Regras prescritivas

1. Registrar endpoint com app.http em Azure Functions v4.
2. Exportar uma função core separada para facilitar teste unitário.
3. Validar payload com Zod antes de chamar serviços.
4. Responder sempre com JSON e content-type explícito.
5. Usar pino para logs estruturados.
6. Não usar console.log.
7. Para scaffolds, retornar placeholder explícito e rastreável.

## Template

```ts
import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";

export async function handleXxxRequest(input: { method?: string; body?: unknown }): Promise<{ status: number; body: string; headers: Record<string, string> }> {
	if (input.method?.toUpperCase() !== "POST") {
		return {
			status: 405,
			headers: { "content-type": "application/json; charset=utf-8" },
			body: JSON.stringify({ error: "METHOD_NOT_ALLOWED" }),
		};
	}

	return {
		status: 202,
		headers: { "content-type": "application/json; charset=utf-8" },
		body: JSON.stringify({ status: "accepted" }),
	};
}

export async function xxxHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
	return handleXxxRequest({ method: request.method, body: await request.json().catch(() => undefined) });
}

app.http("xxx", {
	methods: ["POST"],
	authLevel: "anonymous",
	route: "xxx",
	handler: xxxHandler,
});
```

## DO

```ts
app.http("query", {
	methods: ["POST"],
	authLevel: "anonymous",
	route: "query",
	handler: queryHandler,
});
```

## DON'T

```ts
export default async function handler(req: any, res: any) {
	console.log(req.body);
	res.send("ok");
}
```

## Anti-padrões

- Endpoint sem registro app.http.
- Handler não tipado.
- Validação manual sem Zod.
- Logs sem contexto de correlação.

## Dependências

- skills/foundation/typescript-conventions.md
- skills/foundation/error-handling.md
- skills/foundation/project-structure.md
