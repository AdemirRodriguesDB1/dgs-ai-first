# Exercício 2.3 — Estratégia de skills do projeto

## 1. Árvore de skills proposta

### Foundation

| Skill | Descrição / frase de ativação | Quem cria | Quem consome | Frequência |
|---|---|---|---|---|
| `typescript-conventions` | `follow the novatech TypeScript conventions skill` | Tech Lead + Dev Sênior | Devs, Tech Lead, Copilot, Claude | Muito alta |
| `error-handling` | `apply the novatech error handling rules` | Tech Lead | Devs, QA, Copilot | Alta |
| `project-structure` | `place files according to the novatech project structure` | Tech Lead | Devs, Product Specialist, Copilot | Alta |

### Domain

| Skill | Descrição / frase de ativação | Quem cria | Quem consome | Frequência |
|---|---|---|---|---|
| `azure-functions-endpoint` | `generate an Azure Functions endpoint following novatech rules` | Tech Lead | Devs, Copilot | Alta |
| `azure-ai-search-integration` | `integrate retrieval using the novatech search conventions` | Dev Sênior + Tech Lead | Devs, Copilot | Média |
| `react-components` | `create dashboard components following novatech UI patterns` | Dev Frontend + Product Specialist | Devs, Copilot | Média |
| `testing-patterns` | `generate tests using the novatech testing patterns` | QA + Tech Lead | QA, Devs, Copilot, Claude | Alta |

### Artifact

| Skill | Descrição / frase de ativação | Quem cria | Quem consome | Frequência |
|---|---|---|---|---|
| `create-rag-endpoint` | `create a complete rag endpoint for novatech` | Dev Sênior | Devs, Copilot | Alta |
| `create-integration-test` | `create an integration test for a novatech endpoint` | QA | QA, Devs, Copilot, Claude | Alta |
| `create-react-card` | `create a response or feedback card for the novatech panel` | Dev Frontend + Product Specialist | Devs, Copilot | Média |

## 2. Skill Foundation prioritária

A skill Foundation mais importante é `typescript-conventions`, porque ela afeta diretamente todos os artefatos técnicos: handlers, services, validators, testes e adapters.

Arquivo criado no repositório:

- `novatech-assistant/skills/foundation/typescript-conventions.md`

## 2.1 Skills implementadas no repositório

- `novatech-assistant/skills/foundation/typescript-conventions.md`
- `novatech-assistant/skills/foundation/error-handling.md`
- `novatech-assistant/skills/foundation/project-structure.md`
- `novatech-assistant/skills/domain/azure-functions-endpoint.md`
- `novatech-assistant/skills/domain/azure-ai-search-integration.md`
- `novatech-assistant/skills/domain/react-components.md`
- `novatech-assistant/skills/domain/testing-patterns.md`
- `novatech-assistant/skills/artifact/create-rag-endpoint.md`
- `novatech-assistant/skills/artifact/create-integration-test.md`
- `novatech-assistant/skills/artifact/create-react-card.md`

## 3. Por que essa estratégia é coerente com o projeto

- Ela cobre os artefatos repetidos do cenário: endpoint RAG, teste de integração, componentes React, documentação e specs.
- A criação e o consumo são multi-papel: QA e Product Specialist também produzem skills, não apenas desenvolvedores.
- A hierarquia Foundation -> Domain -> Artifact reduz duplicação: regras globais entram em Foundation; padrões por camada entram em Domain; receitas completas entram em Artifact.

## 4. Anti-padrões explicitamente evitados

- Criar skills que ninguém acionaria no fluxo real do projeto.
- Concentrar toda autoria das skills em desenvolvedores.
- Escrever skills abstratas sem exemplos de código e sem DO/DON'T.