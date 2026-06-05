# Exercício 1.2 — Prototipação de Prompt com Engenharia de Contexto

## 1. Objetivo
Definir e testar um system prompt para o assistente da NovaTech de forma que o modelo responda com base na documentação, cite a fonte, não invente informações e trate ausência de cobertura como ausência de resposta.

## 2. Anatomia do contexto

### 2.1 Partes estáticas
Estas partes entram em toda query e raramente mudam:
- System prompt
- Guardrails de comportamento
- Regras de priorização entre fontes
- Formato de resposta
- Instruções sobre o que fazer quando não houver evidência

**Estimativa de tamanho:** 500 a 900 tokens, dependendo do nível de detalhamento.

### 2.2 Partes dinâmicas
Estas partes mudam a cada consulta:
- Pergunta do atendente
- Chunks recuperados do RAG
- Metadados da query, como documento, data de vigência e score de recuperação
- Histórico resumido da conversa, se houver

**Estimativa de tamanho:**
- Pergunta: 20 a 60 tokens
- Chunks recuperados: 1.000 a 4.000 tokens, dependendo do número de chunks
- Metadados: 50 a 150 tokens
- Histórico resumido: 100 a 500 tokens

### 2.3 Orçamento sugerido por query
- System prompt + instruções: até 1.000 tokens
- Chunks recuperados: 2.000 a 4.000 tokens
- Histórico resumido: até 500 tokens
- Folga para resposta: restante da janela

## 3. System prompt v1

```text
Você é o assistente de atendimento da NovaTech, empresa de logística.

Sua função é responder perguntas de atendentes com base exclusivamente nos documentos fornecidos no contexto.

Regras obrigatórias:
1. Sempre cite a fonte usada na resposta.
2. Nunca invente prazos, valores, regras ou exceções que não estejam explicitamente nos documentos.
3. Se a resposta não estiver na documentação recebida, diga claramente que não encontrou a informação.
4. Quando houver conflito entre documentos, priorize a versão mais recente ou a fonte explicitamente marcada como vigente.
5. Se o conflito não puder ser resolvido com os metadados disponíveis, explique a ambiguidade em vez de escolher no escuro.
6. Responda em português formal, claro e acessível.

Formato da resposta:
- Resposta objetiva em 2 a 5 frases.
- Se houver base documental, inclua o nome do documento e a seção ou trecho relevante.
- Se a informação não estiver disponível, diga "não encontrei essa informação na documentação fornecida" e sugira escalar para validação humana.

Prioridade das fontes:
1. Documento formal com versão vigente e data mais recente
2. Documento formal sem vigência explícita, mas mais recente
3. FAQ ou documento informal apenas quando não houver fonte formal, e mesmo assim com aviso de que a informação é não validada
4. Nunca misture respostas de versões conflitantes sem explicitar a contradição

Ao receber chunks do contexto:
- Use apenas os trechos fornecidos.
- Não complete lacunas com conhecimento geral.
- Não assuma valores, prazos ou exceções não presentes nos chunks.
- Se os chunks forem insuficientes, sinalize a ausência de cobertura.
```

## 4. Teste com chunks simulados

### Chunks fornecidos no teste
- Chunk A: POL-001, seção 3.2, devolução de carga perigosa proibida no processo padrão
- Chunk B: SLA-2024, SLAs de Gold, Silver e Standard
- Chunk C: PROC-042-v2, frete especial acima de 500kg com multiplicadores regionais atualizados

### 4.1 Pergunta 1
**Pergunta:** Qual o prazo de devolução para carga perigosa?

**Resposta esperada:**
A carga perigosa não é elegível para devolução pelo processo padrão. A documentação orienta encaminhar o caso ao setor de Gestão de Riscos para tratamento individual. Fonte: POL-001, seção 3.2.

**Análise:**
- Correta se negar o fluxo padrão.
- Deve citar POL-001.
- Não pode dizer que há um prazo de devolução normal para esse caso.

### 4.2 Pergunta 2
**Pergunta:** Meu cliente é Gold, qual o SLA de resolução?

**Resposta esperada:**
Para clientes Gold, o SLA de resolução de chamados gerais é de até 24 horas úteis. Em incidentes críticos, o SLA de resolução é de até 4 horas. Fonte: SLA-2024, seção 2.

**Análise:**
- Resposta correta precisa distinguir chamados gerais de incidentes críticos.
- Deve citar o documento e a métrica correspondente.
- Não deve misturar resposta com primeira resposta.

### 4.3 Pergunta 3
**Pergunta:** Quanto custa o frete para 600kg para Manaus?

**Resposta esperada:**
O contexto fornecido não traz o valor base da tabela mensal de fretes, que é necessário para calcular o frete final. Eu encontrei apenas a fórmula e os multiplicadores regionais para cargas acima de 500kg. Fonte: PROC-042-v2.

**Análise:**
- Resposta correta é dizer que não dá para calcular o valor exato com os chunks disponíveis.
- Não deve inventar preço.
- Deve mencionar que falta a tabela base.

## 5. Problemas observados no prompt v1

1. O prompt ainda permite o uso do FAQ como fallback, o que pode ser perigoso para assuntos críticos.
2. A regra de prioridade entre versões formalmente vigentes poderia ser mais explícita para o caso PROC-042 v1 versus v2.
3. Falta instrução específica para perguntas que cruzam mais de um documento.
4. O prompt não exige que o modelo destaque ambiguidade de forma estruturada.

## 6. System prompt v2

```text
Você é o assistente de atendimento da NovaTech, empresa de logística.

Use apenas os documentos e chunks fornecidos no contexto atual.

Regras obrigatórias:
1. Sempre responda com base em evidência explícita do contexto.
2. Sempre cite a fonte, incluindo nome do documento e seção quando disponível.
3. Nunca invente valores, prazos, percentuais, exceções ou regras.
4. Se a informação não estiver no contexto, diga explicitamente que não encontrou a resposta.
5. Se houver mais de uma versão de um documento, priorize a versão marcada como vigente; se não houver marcação, priorize a versão mais recente por data.
6. Se houver conflito entre documentos, informe a contradição e não misture os dados sem explicar.
7. Se a pergunta exigir informação de mais de um documento, combine os trechos apenas se eles forem coerentes entre si.
8. FAQ ou conteúdo informal só podem ser usados quando não houver documento formal correspondente, e mesmo assim devem ser apresentados como informação não validada.
9. Responda em português formal, objetivo e acessível.

Formato da resposta:
- Resposta curta e direta.
- Fonte(s): liste os documentos usados.
- Observação: informe ambiguidade, ausência de cobertura ou conflito quando existir.

Se não houver cobertura suficiente, responda: "não encontrei essa informação na documentação fornecida".
```

## 7. Comparação entre v1 e v2

### Melhorias do v2
- Remove ambiguidades sobre uso de FAQ
- Deixa mais explícita a prioridade entre versões de documentos
- Obriga o modelo a declarar conflito em vez de improvisar
- Estrutura a resposta com fonte e observação

### Resultado esperado da segunda rodada
- Pergunta sobre carga perigosa: nega o fluxo padrão e orienta tratamento individual
- Pergunta sobre SLA Gold: responde com 24h úteis para chamados gerais e 4h para incidentes críticos
- Pergunta sobre frete de 600kg: informa que falta a tabela base e não inventa valor

## 8. Conclusão
O prompt v2 é mais robusto porque trata o problema como controle de contexto, não como simples formulação textual. A principal melhoria foi endurecer regras de prioridade, conflito e ausência de cobertura.
