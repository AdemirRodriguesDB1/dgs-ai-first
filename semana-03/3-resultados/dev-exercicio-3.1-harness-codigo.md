# Desenvolvedor - Exercicio 3.1

## Objetivo
Implementar structured output com Zod e guardrails deterministicos para bloquear respostas inseguras antes de chegar ao atendente.

## Artefato de codigo
- Arquivo: src/services/response-validator.ts

## Evidencias de uso de ferramentas (Copilot + Claude)
Iteracao 1 (Copilot - geracao inicial):
- Prompt usado: "Gerar response-validator.ts com Zod para answer, source_document, confidence_score e fallback seguro em falha de schema."
- Resultado observado: schema funcional, mas permissivo para campos extras.

Iteracao 2 (Copilot - refinamento tecnico):
- Prompt usado: "Tornar schema estrito e reforcar guardrail de carga perigosa + devolucao com bloqueio real."
- Resultado observado: bloqueio deterministico implementado e retorno seguro padrao.

Iteracao 3 (Claude - revisao critica):
- Prompt usado: "Revise o validador e aponte riscos reais de bypass nos guardrails e de validacao insuficiente."
- Achados do Claude: necessidade de cobertura melhor para variacoes linguisticas e garantia de bloqueio efetivo.
- Acao aplicada: normalizacao de texto (acentos/caixa) e ampliacao dos padroes de negativa.

Evidencia de mudanca apos revisao:
- Strict mode no schema para impedir campos extras.
- Regras deterministicas de bloqueio (nao apenas log).
- Ajuste de deteccao para reduzir falso negativo em linguagem natural.

## Implementacao realizada
1. Structured output com Zod:
   - Campos obrigatorios: answer, source_document, confidence_score.
   - confidence_score validado no intervalo [0,1].
   - Schema em modo strict para rejeitar campos extras inesperados.

2. Guardrail 1 (source_document obrigatorio):
   - Resposta sem source_document valido e bloqueada.
   - Sistema retorna fallback seguro padrao.

3. Guardrail 2 (carga perigosa + devolucao):
   - Se a resposta mencionar carga perigosa e devolucao sem uma negativa explicita, a resposta e bloqueada.
   - Exemplo de negativa valida: "nao e possivel", "nao pode", "proibido", "vedado", "escalar para supervisor".

4. Logging:
   - Cada bloqueio registra motivo estruturado para observabilidade.
   - Retorno ao usuario final permanece seguro e padronizado.

## Revisao rapida (analise propria antes do Claude)
Problemas identificados na primeira versao gerada:
1. Schema permissivo aceitando campos extras sem controle.
2. Regex simplista para guardrail de carga perigosa, com baixa cobertura de variacoes linguisticas.

Correcoes aplicadas:
1. Adicao de strict() no schema Zod.
2. Normalizacao de texto (lowercase + remocao de acentos) e ampliacao de padroes de deteccao e negativa.

## Segunda revisao (Claude) e comparacao
Pontos levantados pelo Claude:
1. Reforcar bloqueio efetivo (nao apenas log).
2. Tornar deteccao semantica menos fragil a variacoes de escrita.

Comparacao honesta:
- Concordancia: ambos identificaram risco de regex fraca.
- Diferenca: eu identifiquei antes o risco de schema permissivo; Claude enfatizou mais a garantia de bloqueio na saida.
- Resultado: ambos os pontos foram incorporados no codigo final.

## Probabilistico vs deterministico
- Prompt e probabilistico: pode orientar o modelo, mas nao garante conformidade.
- Validator em codigo e deterministico: valida formato e regras de negocio com bloqueio obrigatorio.
- Conclusao: prompt orienta, codigo garante.
