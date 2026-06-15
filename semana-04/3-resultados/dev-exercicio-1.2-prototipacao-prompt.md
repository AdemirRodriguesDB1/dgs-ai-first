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

### 4.1 Rodada 1 (system prompt v1) - respostas obtidas

| Pergunta | Resposta obtida no Claude (resumo fiel) | Correta? | Observações |
|----------|------------------------------------------|----------|-------------|
| Qual o prazo de devolução para carga perigosa? | "Cargas perigosas (classes 1 a 6) não seguem devolução padrão de 7 dias. O caso deve ser tratado fora do fluxo comum. Fonte: POL-001, 3.2." | Sim | Passou na armadilha obrigatória (não inventou prazo para carga perigosa). |
| Meu cliente é Gold, qual o SLA de resolução? | "Cliente Gold tem resolução em até 24h. Fonte: SLA-2024." | Sim | Correta para os dados disponíveis nos chunks simulados. |
| Quanto custa o frete para 600kg para Manaus? | "Use valor base x 1,8 para região Norte. Não há valor base no contexto. Fonte: PROC-042-v2." | Sim | Não inventou valor final; faltou explicitar "não encontrei valor exato" no formato definido. |

## 5. Problemas observados no prompt v1

1. O prompt ainda permite o uso do FAQ como fallback, o que pode ser perigoso para assuntos críticos.
2. A regra de prioridade entre versões formalmente vigentes poderia ser mais explícita para o caso PROC-042 v1 versus v2.
3. Falta instrução específica para perguntas que cruzam mais de um documento.
4. O prompt não exige que o modelo destaque ambiguidade de forma estruturada.
5. O formato da resposta não força distinção entre "resposta completa" e "resposta parcial por falta de dado".

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

### 7.1 Rodada 2 (system prompt v2) - respostas obtidas

| Pergunta | Resposta obtida no Claude (resumo fiel) | Correta? | Guardrails atendidos |
|----------|------------------------------------------|----------|----------------------|
| Qual o prazo de devolução para carga perigosa? | "Não é elegível para devolução no processo padrão; tratar como exceção operacional. Fonte: POL-001, 3.2. Observação: sem prazo padrão aplicável." | Sim | Fonte citada, sem invenção, português formal. |
| Meu cliente é Gold, qual o SLA de resolução? | "Resolução em até 24h para cliente Gold. Fonte: SLA-2024." | Sim | Fonte citada e resposta aderente ao chunk disponível. |
| Quanto custa o frete para 600kg para Manaus? | "Não encontrei valor base no contexto para calcular preço final. Encontrei apenas multiplicador Norte 1,8 para cargas >500kg. Fonte: PROC-042-v2, seção 2." | Sim | Cumpriu fallback correto sem inventar valor. |

### Diferença verificável entre rodadas
- v1: 3 respostas corretas, mas com formato menos rigoroso no fallback
- v2: 3 respostas corretas e completas
- Ganho principal: melhora na completude e no fallback explícito por ausência de dados

## 8. Conclusão
O prompt v2 é mais robusto porque trata o problema como controle de contexto, não como simples formulação textual. A principal melhoria foi endurecer regras de prioridade, conflito e ausência de cobertura.
