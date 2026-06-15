# Skill — Create Integration Test

## Context

Use esta skill para criar testes de integração de endpoints no padrão NovaTech.

Frase de ativação: create an integration test for a novatech endpoint.

## Pré-condições

1. Ler skills/domain/testing-patterns.md.
2. Ler skills/foundation/error-handling.md.

## Template

```ts
import { describe, it, expect } from "vitest";

describe("query endpoint integration", () => {
	it("should return 405 when method is not POST", async () => {
		// arrange
		// act
		// assert
	});
});
```

## Casos mínimos obrigatórios

1. Método inválido retorna 405.
2. Payload inválido retorna 400.
3. Payload válido retorna resposta com source_document.

## DO

```ts
expect(response.status).toBe(400);
expect(JSON.parse(response.body)).toMatchObject({ error: "VALIDATION_ERROR" });
```

## DON'T

```ts
expect(response).toBeTruthy();
```

## Anti-padrões

- Testes sem validação de payload.
- Testes que chamam serviço externo real.
- Uso de dados genéricos sem contexto de domínio.
