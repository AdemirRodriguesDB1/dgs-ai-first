# Tasks — Query Endpoint

## T-001 — Criar scaffold HTTP do endpoint

- **Descrição:** Implementar o handler `POST /api/query` com validação de método, parsing seguro do body e resposta HTTP estruturada.
- **Critérios de aceite:**
	- Requisições com método diferente de `POST` retornam `405`.
	- Body sem `question` ou com `question` vazia retorna `400` com detalhes de validação.
	- Body válido retorna resposta JSON e não usa `console.log`.
- **Dependências:** Nenhuma.
- **Estimativa:** P.

## T-002 — Criar contratos de entrada e saída

- **Descrição:** Definir schemas Zod para request e response do query endpoint.
- **Critérios de aceite:**
	- O schema de request aceita `question` e metadados opcionais de rastreabilidade.
	- O schema de response exige `answer`, `source_document` e `confidence`.
	- Schemas são reutilizáveis por handler e testes.
- **Dependências:** T-001.
- **Estimativa:** P.

## T-003 — Carregar system prompt versionado

- **Descrição:** Ler o arquivo `/prompts/system-prompt.md` e expor o conteúdo para o pipeline de montagem de prompt.
- **Critérios de aceite:**
	- O serviço falha com erro explícito se o prompt não existir.
	- O conteúdo do prompt é carregado sem hardcode no handler.
- **Dependências:** T-001.
- **Estimativa:** P.

## T-004 — Integrar busca top-5 de chunks

- **Descrição:** Implementar o serviço de retrieval contra Azure AI Search respeitando metadado de vigência.
- **Critérios de aceite:**
	- A chamada pede no máximo 5 chunks.
	- Resultados contraditórios carregam metadados suficientes para priorização da versão vigente.
	- Falhas transitórias usam retry com exponential backoff.
- **Dependências:** T-002, T-003.
- **Estimativa:** M.

## T-005 — Integrar geração da resposta no Azure OpenAI

- **Descrição:** Construir prompt final e chamar GPT-4o com o context budget definido na ADR-0002.
- **Critérios de aceite:**
	- O budget de contexto limita system prompt e chunks conforme o plan.
	- A saída é validada contra o contrato de response.
	- O retorno inclui `source_document` da evidência principal.
- **Dependências:** T-002, T-003, T-004.
- **Estimativa:** M.

## T-006 — Observabilidade e tratamento de erro

- **Descrição:** Adicionar logging estruturado, correlação básica e respostas consistentes para falhas conhecidas.
- **Critérios de aceite:**
	- Toda falha retorna JSON estruturado com código de erro.
	- O logger registra o fluxo sem expor payload sensível completo.
	- Não há uso de `console.log`.
- **Dependências:** T-001, T-002.
- **Estimativa:** P.

## T-007 — Testes unitários do endpoint

- **Descrição:** Cobrir método inválido, payload inválido e payload válido do scaffold do endpoint.
- **Critérios de aceite:**
	- Existe ao menos um teste para `405`, um para `400` e um para `202`.
	- Os testes usam assertions específicas no JSON retornado.
- **Dependências:** T-001, T-002, T-006.
- **Estimativa:** P.
