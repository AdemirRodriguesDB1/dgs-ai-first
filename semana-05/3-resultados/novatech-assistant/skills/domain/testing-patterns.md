# Skill — Testing Patterns

## Context

Use esta skill para gerar testes unitários e de integração alinhados ao projeto.

Frase de ativação recomendada: generate tests using the novatech testing patterns.

## Regras prescritivas

1. Seguir estrutura arrange, act, assert.
2. Nomear testes com comportamento observável.
3. Validar status HTTP e payload, não só existência de retorno.
4. Em integração, usar mocks de dependências externas.
5. Cobrir ao menos método inválido, payload inválido e cenário válido.
6. Evitar assertions vagas como toBeDefined isolado.

## DO

```ts
it("should return 400 when question is missing", async () => {
	const response = await handleQueryRequest({ method: "POST", json: async () => ({}) });
	expect(response.status).toBe(400);
	expect(JSON.parse(response.body).error).toBe("VALIDATION_ERROR");
});
```

## DON'T

```ts
it("works", async () => {
	const response = await handler({});
	expect(response).toBeDefined();
});
```

## Anti-padrões

- Testes que dependem de ordem de execução.
- Acesso a serviços reais em testes automatizados locais.
- Assertions sem verificar conteúdo do erro.

## Dependências

- skills/foundation/typescript-conventions.md
- skills/foundation/error-handling.md
