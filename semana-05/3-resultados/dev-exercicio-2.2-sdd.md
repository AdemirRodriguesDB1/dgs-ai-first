# Exercício 2.2 — Implementação com Spec Driven Development

## 1. Artefatos produzidos

- `novatech-assistant/specs/query-endpoint/plan.md`
- `novatech-assistant/specs/query-endpoint/tasks.md`
- `novatech-assistant/src/functions/query/handler.ts`
- `novatech-assistant/src/functions/query/validator.ts`
- `novatech-assistant/src/functions/query/response-builder.ts`
- `novatech-assistant/tests/unit/query-handler.test.ts`

## 2. Como o plan foi decomposto em tasks

A decomposição separa o trabalho em etapas independentes e testáveis:

1. scaffold HTTP e validação de método;
2. contratos Zod de entrada e saída;
3. carregamento do prompt versionado;
4. retrieval top-5;
5. completion com GPT-4o;
6. observabilidade e tratamento de erro;
7. testes unitários.

Essa divisão evita tasks grandes demais e permite validar a primeira entrega sem depender de Azure AI Search ou Azure OpenAI.

## 3. Primeira task implementada

Foi implementada a `T-001 — Criar scaffold HTTP do endpoint`, junto com os contratos de validação mínimos necessários para torná-la executável.

Comportamento atual:

- `GET /api/query` retorna `405`.
- `POST` sem `question` retorna `400` com detalhes de validação.
- `POST` válido retorna `202` com resposta placeholder explícita, sem inventar resultado de retrieval.
- O handler está registrado explicitamente no modelo Azure Functions v4 com `app.http("query", ...)`.

## 4. Revisão crítica do código gerado

Pontos que ainda precisariam de ajuste antes de um code review real:

1. O handler ainda não integra o pipeline real de produção: falta carregar o system prompt, buscar top-5 chunks no Azure AI Search e chamar o GPT-4o. O `202` atual é apenas scaffold controlado da primeira task.
2. Ainda não existe retry com exponential backoff para integrações Azure, apesar de isso estar definido no plan como decisão técnica obrigatória.
3. A resposta placeholder usa `source_document: null`; quando o endpoint evoluir para produção, será necessário forçar `source_document` real e validação determinística da evidência principal.
4. Ainda não há correlação completa de observabilidade, como `requestId` propagado entre handler e serviços internos.

## 5. Relação com o cenário 1

O protótipo open-source da fase anterior validou a abordagem RAG. Nesta fase, o código migra para um scaffold de produção com contratos explícitos, validação estruturada e separação entre handler, validator e response builder.

## 6. Validação executada

- `npm run build`: concluído com sucesso no repositório em `3-resultados/novatech-assistant`.
- `npm run test`: concluído com sucesso em 2026-06-15 após ativar Node `18.20.0`.
- Resultado do Vitest: `1` arquivo de teste aprovado, `3` testes aprovados (`405`, `400`, `202`).
- Observação operacional: com o Node padrão do ambiente (`14.15.5`), a cadeia atual de tooling continua incompatível; para reproduzir a validação automatizada é preciso usar `use-node18.bat` ou ajustar o `PATH` para Node 18.

Conclusão prática: o slice implementado passa tanto na compilação TypeScript estrita quanto nos testes automatizados quando executado com o runtime suportado pelo projeto.