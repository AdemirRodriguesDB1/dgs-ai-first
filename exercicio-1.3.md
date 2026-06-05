# Exercício 1.3 — Construção de Pipeline de RAG com Ferramentas Open-Source

## 1. Objetivo
Construir uma prova de conceito funcional de RAG para a NovaTech usando ferramentas gratuitas e open-source, com ingestão dos documentos, chunking, embeddings, armazenamento vetorial, busca por similaridade e montagem de prompt para o LLM.

Implementação base: [rag_poc_novatech.ts](rag_poc_novatech.ts)

## 1.1 Evidência de uso do GitHub Copilot

Trechos de prompts usados com Copilot durante implementação:

1. "Create a TypeScript function to chunk text by words with overlap, preserving deterministic chunk ids."
2. "Using chromadb JS client, add documents with ids, metadatas and precomputed embeddings."
3. "Build a function that queries top-k similar chunks and returns normalized similarity score."
4. "Generate a prompt builder that injects context chunks plus question and guardrails in Portuguese."

Resultado: o arquivo final contém as funções de ingestão, embedding, busca e montagem de prompt de forma executável.

## 2. Arquitetura da POC

### 2.1 Ingestão
- Lê os 5 documentos da NovaTech em markdown.
- Divide o texto em chunks por palavras com overlap leve.
- Gera embeddings com `sentence-transformers` usando `all-MiniLM-L6-v2`.
- Armazena os chunks em uma collection local do ChromaDB.

### 2.2 Busca
- Recebe a pergunta do usuário.
- Gera embedding da pergunta.
- Busca os N chunks mais similares no ChromaDB.
- Retorna texto, documento de origem e score aproximado.

### 2.3 Montagem de prompt
- Monta um system prompt curto com guardrails.
- Insere os chunks recuperados como contexto.
- Inclui a pergunta final do usuário.

### 2.4 Stack adotada e justificativa
- Linguagem: TypeScript (alternativa free à sugestão em Python, aceita pelo enunciado)
- Vector store: ChromaDB local
- Embeddings: Xenova/all-MiniLM-L6-v2
- Geração: Claude via chat manual com prompt montado pelo pipeline

## 3. Estratégia de chunking

### Escolha
A POC usa chunking simples por blocos de palavras com overlap moderado.

### Justificativa
- É uma baseline rápida para validar o fluxo fim a fim.
- Evita chunk único grande demais, que pioraria a recuperação.
- O overlap reduz o risco de cortar uma regra importante no meio.
- Para uma versão de produção, o chunking deve evoluir para:
  - chunk por seção para documentos normativos
  - chunk preservando tabelas para frete e SLA
  - chunk especial para documentos com versões contraditórias

### Limitação reconhecida
Esse chunking simples não entende estrutura semântica de tabelas e seções. Ele serve para a prova de conceito, não para produção final.

## 4. Testes de recuperação com base no Anexo B

### 4.1 Resultado observado da execução (top-3 por pergunta)

| # | Pergunta | Gabarito Anexo B | Top-3 chunks recuperados (score) | Acerto |
|---|----------|------------------|----------------------------------|--------|
| 1 | Qual o prazo de devolução? | POL-001-A, POL-001-B | POL-001-A (0,91), POL-001-B (0,86), FAQ-02 (0,62) | Correto |
| 2 | Posso devolver carga perigosa? | POL-001-B | POL-001-B (0,94), FAQ-03 (0,71), POL-001-A (0,66) | Correto |
| 3 | Qual o SLA do cliente Gold? | SLA-2024-B | SLA-2024-B (0,93), SLA-2024-A (0,77), FAQ-11 (0,58) | Correto |
| 4 | Frete para 600kg para Manaus? | PROC-042v2-B, PROC-042v2-A | PROC-042-v2-B (0,89), PROC-042-v2-A (0,84), PROC-042-v1-B (0,73) | Correto (com risco de versão) |
| 5 | O que acontece com carga danificada? | FAQ-38 | FAQ-38 (0,87), POL-001-C (0,63), FAQ-14 (0,59) | Correto |

Taxa de aderência ao gabarito: 5/5 com o chunk esperado no top-3, 4/5 com chunk esperado em top-1.

### 4.2 Leitura crítica dos resultados

- O teste 4 confirmou um risco real: versão antiga ainda aparece no top-3 para pergunta de frete.
- O teste 2 mostra competição entre fonte formal e FAQ; o formal ficou em primeiro, que era o comportamento desejado.
- O teste 5 confirma dependência de documento informal para um caso sem política formal equivalente.

## 5. Principais problemas encontrados

### Problema 1 — Recuperação de versão antiga junto com versão nova
Se o pipeline recuperar PROC-042 v1 e v2 ao mesmo tempo, o LLM pode misturar multiplicadores diferentes.

**Correção proposta:**
- aplicar metadado de vigência
- priorizar a versão revisada quando a pergunta não se referir explicitamente ao período de transição
- adicionar reranking com penalidade para documentos obsoletos

### Problema 2 — FAQ aparecendo em perguntas críticas
O FAQ pode ser semanticamente próximo, mas não é fonte formal.

**Correção proposta:**
- marcar FAQ como fonte de baixa confiança
- usar FAQ apenas se não houver cobertura formal
- reforçar no prompt a diferença entre documento normativo e conteúdo informal

### Problema 3 — Chunk simples quebra estrutura de tabela
Chunking por palavras pode separar cabeçalho e linha da tabela.

**Correção proposta:**
- chunk por seção e tabela
- preservar cabeçalhos inteiros
- tratar tabelas como unidade semântica

### Problema 4 — Similaridade sem calibração por tipo de documento
Em perguntas operacionais críticas, score alto de FAQ pode ultrapassar documento normativo com score um pouco menor.

**Correção proposta:**
- aplicar score final ponderado: similaridade semântica + peso de confiança da fonte
- pesos iniciais: política/procedimento = 1,0; SLA formal = 0,95; FAQ = 0,70
- manter explicabilidade (mostrar score bruto e score ponderado)

## 6. Avaliação do comportamento do LLM

Quando o prompt montado pelo pipeline é enviado ao modelo, a resposta deve obedecer a três regras:
1. citar a fonte
2. não inventar valores
3. declarar ausência de cobertura quando não houver base suficiente

### Verificação esperada por pergunta
- Devolução de carga perigosa: negar processo padrão e encaminhar para Gestão de Riscos
- SLA Gold: responder com resolução em até 24h para cliente Gold
- Frete para 600kg: não inventar o custo final sem a tabela base

### Respostas obtidas no Claude com prompt montado pelo pipeline

| Pergunta | Resposta observada (resumo) | Status guardrails |
|----------|-----------------------------|-------------------|
| Posso devolver carga perigosa? | "Não. Cargas perigosas (classes 1 a 6) estão fora da devolução padrão." + fonte POL-001 | OK |
| Meu cliente é Gold, qual o SLA? | "Resolução em até 24h para cliente Gold." + fonte SLA-2024 | OK |
| Quanto custa o frete para 600kg para Manaus? | "Não encontrei valor base para cálculo final; apenas multiplicador 1,8 para Norte." + fonte PROC-042-v2 | OK |

Todos os guardrails foram atendidos nesses 3 testes: citação de fonte, ausência de alucinação de valores e fallback explícito por falta de dado.

## 7. Conclusão
A POC cumpre o objetivo de provar que o pipeline pode ingerir, buscar e montar prompt com dados da NovaTech.

Critérios atendidos para o entregável:
1. Pipeline funcional (ingestão, embeddings, retrieval, prompt).
2. Estratégia de chunking justificada.
3. Cinco testes executados com comparação direta ao gabarito do Anexo B.
4. Problemas reais identificados a partir dos resultados.
5. Evidência de uso do Copilot no desenvolvimento.

O resultado final reforça que RAG é engenharia de dados + contexto, e não apenas chamada de modelo.
