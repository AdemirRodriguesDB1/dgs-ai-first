# Skill — Error Handling

## Context

Use esta skill quando gerar handlers, services e integrações externas do novatech-assistant.

Frase de ativação recomendada: apply the novatech error handling skill.

## Regras prescritivas

1. Todo erro de entrada inválida deve retornar status 400 com payload estruturado.
2. Todo erro inesperado deve retornar status 500 com mensagem genérica e sem vazamento de stack.
3. Erros conhecidos de integração devem ser mapeados para códigos estáveis, por exemplo SEARCH_UNAVAILABLE.
4. Nunca lançar erro bruto para o cliente final.
5. Sempre registrar erro com pino usando campos estruturados.
6. Não incluir secrets, prompts completos ou documentos inteiros no log.
7. Falhas transitórias de integração externa devem usar retry com exponential backoff.

## DO

```ts
if (error instanceof RequestValidationError) {
	return buildJsonResponse(400, {
		error: "VALIDATION_ERROR",
		message: error.message,
		details: error.details,
	});
}
```

```ts
logger.error({ invocationId: context.invocationId, error }, "query endpoint failed unexpectedly");
return buildJsonResponse(500, {
	error: "INTERNAL_ERROR",
	message: "Unexpected error while preparing the query pipeline.",
});
```

## DON'T

```ts
catch (error) {
	return { status: 500, body: String(error) };
}
```

```ts
catch (error) {
	console.error(error);
	throw error;
}
```

## Anti-padrões

- Expor stack trace no body HTTP.
- Usar mensagem diferente para o mesmo tipo de erro em cada endpoint.
- Retornar 200 com campo error no corpo.
- Logar request body completo sem sanitização.

## Resultado esperado

Erros previsíveis para cliente, observabilidade consistente e baixo risco de vazamento de dados.
