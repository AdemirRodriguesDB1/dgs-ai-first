# Skill — TypeScript Conventions

## Context

Use esta skill quando gerar ou revisar qualquer código TypeScript do `novatech-assistant`, especialmente handlers, services, validators e testes.

Frase de ativação recomendada: `follow the novatech TypeScript conventions skill`.

## Regras prescritivas

1. Sempre escreva TypeScript estrito e tipado; nunca introduza `any` sem justificativa documentada.
2. Prefira `type` ou `interface` nomeados para contratos de request, response e serviços compartilhados.
3. Use imports ESM estáticos no topo do arquivo; nunca use `require()` dinâmico.
4. Valide input externo com Zod antes de usar os dados em handlers ou serviços.
5. Use `pino` para logging estruturado; nunca use `console.log`, `console.error` ou similares.
6. Faça funções pequenas e coesas; parsing, validação e montagem de resposta devem ficar separados.
7. Toda resposta HTTP deve ser JSON estruturado e previsível.
8. Quando uma integração ainda não estiver pronta, devolva comportamento placeholder explícito; não simule sucesso falso com dados inventados.

## DO

```ts
import { z } from "zod";

const payloadSchema = z.object({
	question: z.string().trim().min(1),
});

export function parsePayload(payload: unknown) {
	return payloadSchema.parse(payload);
}
```

```ts
import { logger } from "../../shared/logger";

logger.info({ invocationId, questionLength: question.length }, "query request accepted");
```

## DON'T

```ts
export async function handler(request: any) {
	console.log(request.body);
	return { ok: true };
}
```

```ts
const payload = JSON.parse(request.body as string);
const question = payload.question || "";
```

## Anti-padrões

- `as any` para silenciar erro de tipo em vez de modelar o contrato corretamente.
- `console.log` em handlers e serviços.
- Body parseado manualmente sem validação de schema.
- Resposta HTTP com shape diferente para cada branch de erro.
- Função única fazendo leitura do request, validação, orchestration, retry e formatação da resposta.
- Import condicional ou `require()` dinâmico que dificulta build e teste.

## Dependências desta skill

- `skills/foundation/error-handling.md`
- `skills/foundation/project-structure.md`

## Resultado esperado

Código gerado com esta skill deve compilar em `strict`, ser testável isoladamente e manter contratos previsíveis entre endpoint, validação e services.
