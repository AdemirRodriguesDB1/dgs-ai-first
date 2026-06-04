# Exercício 1.3 — Construção de Pipeline de RAG com Ferramentas Open-Source

## 1. Objetivo
Construir uma prova de conceito funcional de RAG para a NovaTech usando ferramentas gratuitas e open-source, com ingestão dos documentos, chunking, embeddings, armazenamento vetorial, busca por similaridade e montagem de prompt para o LLM.

Implementação base: [rag_poc_novatech.py](rag_poc_novatech.py)

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

Abaixo está o conjunto mínimo de testes que deve ser usado para validar o pipeline contra o gabarito de chunks.

### Teste 1
**Pergunta:** Qual o prazo de devolução?

**Chunks que devem aparecer:** POL-001-A, POL-001-B

**Resultado esperado:**
- POL-001-A deve recuperar o prazo de 7 dias úteis
- POL-001-B pode aparecer como contexto adicional por causa da exceção de carga perigosa

**Avaliação:** correta se o topo contiver POL-001-A e POL-001-B.

### Teste 2
**Pergunta:** Posso devolver carga perigosa?

**Chunks que devem aparecer:** POL-001-B

**Resultado esperado:**
- POL-001-B como chunk principal
- FAQ-03 pode aparecer, mas com menor prioridade por ser informal

**Avaliação:** correta se o pipeline priorizar a regra formal e não o FAQ.

### Teste 3
**Pergunta:** Qual o SLA do cliente Gold?

**Chunks que devem aparecer:** SLA-2024-B

**Resultado esperado:**
- SLA-2024-B como principal
- SLA-2024-A e SLA-2024-C podem aparecer como apoio

**Avaliação:** correta se o pipeline trouxer a tabela de SLAs gerais.

### Teste 4
**Pergunta:** Frete para 600kg para Manaus?

**Chunks que devem aparecer:** PROC-042v2-B, PROC-042v2-A

**Resultado esperado:**
- PROC-042v2-B deve aparecer com maior prioridade
- PROC-042v2-A complementa a fórmula
- PROC-042-B é risco de contradição e idealmente deve ser rebaixado

**Avaliação:** correta se privilegiar a versão revisada.

### Teste 5
**Pergunta:** O que acontece com carga danificada?

**Chunks que devem aparecer:** FAQ-38

**Resultado esperado:**
- FAQ-38 deve ser recuperado
- Não existe documento formal equivalente, então o assistente deve tratar como informação informal e potencialmente não validada

**Avaliação:** correta se o sistema marcar a falta de documento formal.

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

## 6. Avaliação do comportamento do LLM

Quando o prompt montado pelo pipeline é enviado ao modelo, a resposta deve obedecer a três regras:
1. citar a fonte
2. não inventar valores
3. declarar ausência de cobertura quando não houver base suficiente

### Verificação esperada por pergunta
- Devolução de carga perigosa: negar processo padrão e encaminhar para Gestão de Riscos
- SLA Gold: responder com 24h úteis para chamados gerais e 4h para incidentes críticos
- Frete para 600kg: não inventar o custo final sem a tabela base

## 7. Conclusão
A POC cumpre o objetivo de provar que o pipeline pode ingerir, buscar e montar prompt com dados da NovaTech. O resultado mais importante não é a perfeição do retorno, mas a demonstração de que o sistema depende de curadoria da base, chunking adequado e priorização correta entre documentos conflitantes.
