# Exercício 2.1 — Configuração e uso real de MCP servers

## 1. Mapeamento necessidade -> server local

| Necessidade do projeto | Server escolhido | O que expõe | Quem consome | Escopo |
|---|---|---|---|---|
| Ler e editar código, specs, skills e prompts | `filesystem-workspace` | Tools de leitura e escrita em arquivos/diretórios | Desenvolvedores, Tech Lead, agentes Claude/Copilot | `./src`, `./specs`, `./skills`, `./prompts`, `./tests`, `./.mcp` |
| Ler documentação de negócio da NovaTech | `filesystem-docs` | Tools de leitura/listagem/pesquisa de arquivos | Desenvolvedores, Product Specialist, QA, agentes Claude/Copilot | `./docs/novatech` |
| Ler corpus de chunks para retrieval | `filesystem-retrieval` | Tools de leitura/listagem/pesquisa de arquivos | Desenvolvedores, QA, agentes Claude/Copilot | `./data/retrieval-corpus` |
| Ler histórico, diff e branches do repositório local | `git` | Tools e resources do repositório Git local | Desenvolvedores, Tech Lead, agentes Claude/Copilot | repositório local `.` |
| Persistir linguagem ubíqua e decisões do projeto | `memory` | Knowledge graph persistente | Desenvolvedores, Tech Lead, Product Specialist | grafo local do server |
| Explorar primitivas MCP para aprendizado e depuração | `everything` | Prompts, tools e resources de referência | Desenvolvedores e Tech Lead | sem escopo de pasta |

## 2. Least privilege aplicado

- `filesystem-workspace` não recebe `./docs` nem `./data`; isso evita que um agente com permissão de escrita altere fontes de negócio ou corpus de retrieval.
- `filesystem-docs` isola somente `./docs/novatech`, reduzindo exposição do restante de `./docs` e mantendo a documentação de negócio separada do código.
- `filesystem-retrieval` isola somente `./data/retrieval-corpus`, reduzindo o risco de mistura entre corpus de teste e artefatos do produto.
- `git` aponta só para o repositório local e não depende de GitHub remoto, token ou rede externa.
- `memory` não recebe credenciais nem paths locais; ele é usado apenas para decisões persistentes e linguagem ubíqua.

Nota operacional: o reference server padrão de filesystem expõe tools de escrita e não oferece `read-only` nativo por argumento fora do modo Docker. Para fechar o requisito da rubrica neste ambiente Windows local, `filesystem-docs` e `filesystem-retrieval` passaram a usar o script `scripts/readonly-filesystem-server.mjs`, que expõe apenas tools de leitura.

## 3. Configuração final

Arquivo configurado em `novatech-assistant/.mcp/mcp.json`.

Decisões de compatibilidade local:

- O server `filesystem` usa o binário local `node_modules/.bin/mcp-server-filesystem.cmd`, porque o `npx` legado do Node 14 deste ambiente não executou a forma moderna do pacote de maneira confiável.
- O server `git` usa `python -m mcp_server_git` como fallback local, porque `uvx` não está instalado neste ambiente.
- No workspace real desta entrega, o repositório Git ativo está na raiz `dgs-ai-first`; por isso o `.mcp/mcp.json` foi ajustado para `--repository ../../../`, alinhando a configuração ao Git root efetivo do ambiente.
- Os servers `filesystem-docs` e `filesystem-retrieval` usam `node ./scripts/readonly-filesystem-server.mjs`, o que remove `write_file`, `edit_file`, `create_directory` e `move_file` da superfície MCP das fontes de negócio.

## 4. Evidência de execução

### 4.1 Pré-requisitos encontrados no ambiente

- `node -v` -> `v14.15.5`
- `npm -v` -> `6.14.11`
- `python --version` -> `Python 3.12.10`
- `pip --version` -> `pip 25.0.1`
- `uvx` indisponível localmente

### 4.2 Evidência local já validada

- Repositório Git local com histórico disponível:
  - `bbdd03a chore: starter repo (Anexo D) — estrutura + dados semeados dos Anexos A e B`
- Documentos de negócio presentes em `docs/novatech/`:
  - `POL-001-politica-devolucao.md`
  - `PROC-042-v2-frete-especial-revisado.md`
  - `SLA-2024-tabela-sla-clientes.md`
- Corpus de retrieval presente em `data/retrieval-corpus/chunks-novatech.md`

Saídas coletadas no ambiente:

```text
docs/novatech/
- FAQ-atendimento.md
- POL-001-politica-devolucao.md
- PROC-042-frete-especial-v1.md
- PROC-042-v2-frete-especial-revisado.md
- README.md
- SLA-2024-tabela-sla-clientes.md
```

```text
Pergunta de referência: "Posso devolver carga perigosa?"
Chunk principal encontrado no corpus:
- Chunk POL-001-B -> cargas perigosas NÃO são elegíveis para devolução pelo processo padrão
Chunk secundário encontrado no corpus:
- Chunk FAQ-03 -> orientar o cliente para Gestão de Riscos / tratamento especial
Mapa de cobertura do corpus:
- "Posso devolver carga perigosa?" -> POL-001-B | FAQ-03, POL-001-A
```

```text
git log --oneline --decorate -n 5
bbdd03a (HEAD -> master) chore: starter repo (Anexo D) — estrutura + dados semeados dos Anexos A e B
```

### 4.3 Evidência MCP

Evidência MCP real revalidada em 2026-06-15 com `npm run mcp:evidence`:

```text
git_mcp
- status: ok
- repository: C:\SIG\Treinamentos\dgs-ai-first
- git_log retornou commit real do repositório local

filesystem_docs_mcp
- status: ok
- tools: apenas leitura (`read_file`, `read_text_file`, `read_multiple_files`, `list_directory`, `list_directory_with_sizes`, `directory_tree`, `search_files`, `get_file_info`, `list_allowed_directories`)
- list_directory em docs/novatech retornou os 6 documentos esperados
- read_text_file em POL-001-politica-devolucao.md retornou conteúdo válido

filesystem_retrieval_mcp
- status: ok
- write_tools_present: false
- retrieval_question: "Posso devolver carga perigosa?"
- question_mapping_found: true
- primary_chunk_found: true (POL-001-B)
- secondary_reference_found: true (FAQ-03)
```

Conclusão da revalidação:

- A evidência MCP agora cobre os 3 itens exigidos pela rubrica: leitura de documentação, prova do caso de retrieval pelo gabarito do Anexo B e leitura do histórico Git.
- O `git` MCP passou a funcionar de forma estável depois que o script e o `.mcp/mcp.json` foram alinhados ao Git root real do workspace.
- O corpus foi validado contra a pergunta `"Posso devolver carga perigosa?"`, com `POL-001-B` como chunk principal e `FAQ-03` como referência secundária.
- `filesystem-docs` e `filesystem-retrieval` agora expõem apenas tools de leitura, fechando tecnicamente o requisito de read-only das fontes de negócio.

Com isso, o critério de least privilege deixa de depender apenas de regra processual e passa a ter enforcement técnico no MCP configurado.

## 5. Riscos de segurança e mitigação

| Risco | Impacto no contexto local | Mitigação |
|---|---|---|
| Escopo amplo demais no filesystem | Exposição acidental de `.env`, segredos e arquivos fora do projeto | Restringir diretórios por server, não montar a raiz do workspace e manter código/dados separados |
| Escrita habilitada em fontes de negócio | Agente pode alterar `docs/novatech` ou `data/retrieval-corpus` sem revisão humana | Isolar docs e corpus em servers dedicados e expor apenas tools de leitura via `readonly-filesystem-server.mjs` |
| Dependência silenciosa de runtime ou client incompatível | Falha de compatibilidade pode deixar o agente sem histórico mesmo com fallback local | Validar pré-requisitos no onboarding, testar o fluxo automatizado de evidência e manter fallback explícito com `python -m mcp_server_git` |
| Mistura de versões documentais contraditórias | Agente pode ler v1 e v2 de `PROC-042` e responder de forma inconsistente | Manter guardrail de priorização da versão vigente e registrar a regra em spec/prompt/AGENTS |