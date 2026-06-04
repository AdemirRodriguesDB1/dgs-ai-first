# Exercício 1.1 — Análise Técnica de Viabilidade

## Objetivo

Avaliar a viabilidade técnica de um assistente de IA para a NovaTech considerando o tipo de documentação disponível, os riscos de geração e o impacto do gerenciamento de contexto na arquitetura.

## 1\. Leitura técnica do cenário

A solução é viável, mas não como um simples "chat com documentos". O problema real é de engenharia de recuperação e contexto: a base tem múltiplos formatos, fontes com qualidade desigual, versões conflitantes e documentos que exigem extração estrutural correta. Isso significa que o sucesso do assistente depende mais do pipeline de dados e do controle do contexto do que da escolha do modelo isoladamente.

## 2\. Riscos por tipo de fonte

### 2.1 PDFs com tabelas complexas

**Desafio:** tabelas com muitas colunas, texto distribuído em colunas, cabeçalhos repetidos e possível quebra de leitura na extração.

**Impacto na resposta:** o pipeline pode perder relacionamentos entre colunas, misturar valores de linhas diferentes ou omitir regras importantes. Em frete e SLA, um erro de tabela vira resposta incorreta com aparência convincente.

**Tratamento recomendado:** extração orientada a estrutura, preservando tabelas como blocos semânticos; validação pós-OCR; chunking por seção/tabela, não por tamanho fixo; armazenamento de metadados de seção e versão.

### 2.2 PDFs escaneados

**Desafio:** OCR introduz erro de reconhecimento, principalmente em números, prazos, siglas e valores monetários.

**Impacto na resposta:** prazos e multiplicadores podem ser lidos incorretamente; pequenas falhas de OCR geram respostas erradas com alta confiança.

**Tratamento recomendado:** OCR com revisão de qualidade; regras de confiança mínima; bloqueio de ingestão de trechos com baixa confiança; preferência por documentos não escaneados quando houver duplicidade.

### 2.3 Wiki Confluence com links e macros

**Desafio:** conteúdo distribuído entre páginas, navegação por links internos e macros que alteram o que o usuário vê.

**Impacto na resposta:** o chunk pode ficar incompleto se o contexto dependente do link não for resolvido; o modelo pode responder com base em um trecho isolado e ignorar dependências da página.

**Tratamento recomendado:** resolver links internos na ingestão; renderizar macros para texto plano; manter título, caminho da página e relação com páginas pai/filhas como metadado.

### 2.4 Planilhas com fórmulas interdependentes

**Desafio:** o valor relevante pode estar em fórmula, célula calculada, aba relacionada ou tabela auxiliar.

**Impacto na resposta:** o modelo pode citar a fórmula sem o valor calculado, ou o valor sem a regra que o gera.

**Tratamento recomendado:** extrair fórmula + valor calculado + contexto da aba; representar linhas/chaves como chunks semânticos; registrar dependências entre células quando relevante.

## 3\. Estimativa de tamanho da base em tokens

A base é grande o suficiente para exigir RAG, e não caberia integralmente em contexto.

### Estimativa conservadora

* PDFs: 800 documentos × 10 páginas × \~500 a 700 palavras por página = 4,0M a 5,6M palavras
* Wiki: 400 páginas × 1.500 palavras = 600.000 palavras
* Planilhas: 50 arquivos × \~200 a 400 palavras equivalentes = 10.000 a 20.000 palavras

Total aproximado: **4,61M a 6,22M palavras**

Usando a regra de **0,75 palavra por token**, isso representa aproximadamente:

* **6,1M a 8,3M tokens** na visão conservadora

Como as PDFs da NovaTech têm tabelas, OCR e possíveis repetições estruturais, uma estimativa operacional mais ampla pode chegar perto de **10M a 12M tokens** dependendo do método de extração. A referência simulada de \~12M tokens é plausível como teto prático.

## 4\. Orçamento de contexto por query

Assumindo GPT-4o com janela de **128K tokens** e consumo fixo de **\~2K tokens** em system prompt + instruções:

* Contexto útil restante: **126K tokens**
* Chunk médio: **500 tokens**
* Máximo teórico por query: **252 chunks**

Na prática, isso não é o número ideal. Se muitos chunks forem inseridos, cresce o risco de:

* perder relevância por excesso de informação
* diluir instruções importantes
* sofrer com efeito de *lost in the middle*
* aumentar custo e latência

### Recomendação prática

* Recuperar poucos chunks de alta precisão: **4 a 8 chunks** para perguntas simples
* Para perguntas multi-domínio: **8 a 12 chunks**, desde que organizados por prioridade
* Reservar contexto para histórico, metadados e resposta final
* Usar reranking antes de montar o prompt final

## 5\. Estratégia recomendada de chunking e retrieval

### Chunking

* Preferir chunking por seção e subtópico, não por tamanho cego
* Chunk alvo: **300 a 500 tokens** com overlap leve quando o texto for narrativo
* Para tabelas: manter linhas relacionadas juntas; nunca quebrar cabeçalho da tabela da linha de dados
* Para documentos com versões: incluir versão, data e status como metadados obrigatórios

### Retrieval

* Usar busca híbrida: semântica + lexical
* Aplicar reranker para selecionar os chunks mais úteis
* Deduplicar trechos muito parecidos entre versões
* Quando houver conflito entre versões, devolver ambos com indicação clara de vigência e priorizar a versão mais recente ou explicitamente vigente

## 6\. Riscos técnicos principais

1. **Alucinação por ausência de evidência suficiente**

   * O modelo pode completar lacunas com conhecimento geral.
   * Mitigação: instrução explícita para responder "não encontrei" quando a base não cobrir a pergunta.
2. **Resposta incorreta por documentos contraditórios**

   * Exemplo: PROC-042 v1 e v2 têm valores diferentes.
   * Mitigação: política de versionamento com vigência e metadados de prioridade.
3. **Degradação de qualidade por excesso de contexto**

   * Muitos chunks competem pela atenção do modelo.
   * Mitigação: limitar número de chunks, rerankear e posicionar primeiro o que é mais crítico.
4. **Context rot em sessões longas**

   * Em conversas no Teams, o histórico cresce e começa a competir com os chunks atuais.
   * Mitigação: resumo de histórico, reset por intenção e prioridade para última pergunta + documentos recuperados.
5. **Erro estrutural na extração de tabelas e OCR**

   * Prazos e multiplicadores podem ser lidos errado.
   * Mitigação: pipeline de ingestão com validação automática e amostragem manual.

## 7\. Conclusão de viabilidade

O projeto é tecnicamente viável, mas somente se for tratado como um problema de engenharia de informação: extração confiável, curadoria da base, versionamento, controle do contexto e política explícita para respostas sem cobertura.

Sem isso, o assistente pode parecer competente, mas produzir respostas inconsistentes ou perigosas para operação. Com um pipeline bem controlado, a meta de um assistente fundamentado em documentação é realista.
