# Desenvolvedor - Exercicio 3.2

## Objetivo
Revisar criticamente modulo de feedback gerado por IA e reescrever conforme AGENTS.md.

## Codigo reescrito
- Arquivo: src/functions/feedback/handler.ts

## Evidencias de uso de ferramentas (Copilot + Claude)
Iteracao 1 (analise humana antes da IA):
- Listei manualmente os achados obrigatorios e classifiquei por tipo (violacao AGENTS.md, seguranca, bug potencial).

Iteracao 2 (Claude - segunda revisao):
- Prompt usado: "Atue como co-reviewer. Revise este handler e destaque lacunas de seguranca, observabilidade e aderencia ao AGENTS.md."
- Resultado observado: reforco em padronizacao de resposta HTTP e minimizacao de dados pessoais.

Iteracao 3 (Copilot - reescrita guiada):
- Prompt usado: "Reescreva o handler com Zod strict, pino, imports estaticos, sem log de PII e com tratamento de erro 400/500."
- Resultado observado: modulo final aderente ao AGENTS.md, com validacao de entrada e erros tratados.

Evidencia de convergencia humano + IA:
- Os 4 problemas obrigatorios foram identificados na analise propria.
- Os pontos do Claude complementaram robustez de API e privacidade.
- O codigo final incorporou ambos os conjuntos de recomendacao.

## Minha revisao (ANTES do Claude)

### Achados e classificacao
1. Uso de "as any" sem validacao Zod.
   - Classificacao: violacao AGENTS.md.

2. Uso de console.log para logging.
   - Classificacao: violacao AGENTS.md.

3. Import dinamico com require dentro da funcao.
   - Classificacao: violacao AGENTS.md e smell arquitetural.

4. Log de attendantEmail (dado pessoal) em texto claro.
   - Classificacao: problema de seguranca e privacidade.

5. Falta de tratamento robusto para JSON invalido e payload malformado.
   - Classificacao: bug potencial.

6. Falta de tratamento explicito para erro de persistencia.
   - Classificacao: bug potencial.

## Segunda revisao (Claude)
Pontos adicionais reforcados:
1. Melhor padronizar resposta HTTP em JSON com codigos semanticos.
2. Evitar persistir PII em claro quando nao ha necessidade operacional.

## Comparacao humano vs Claude
- Concordancias:
  - Zod obrigatorio.
  - pino no lugar de console.log.
  - import estatico no topo.
  - nao expor/logar PII.
- Complemento do Claude:
  - maior foco em padronizacao de resposta e minimizacao de dados.

## Correcao aplicada no codigo final
1. Validacao de input com Zod strict.
2. Logger pino com logs estruturados.
3. Imports estaticos no topo, removendo require.
4. Nenhum log de e-mail; armazenamento usa hash SHA-256 opcional.
5. Tratamento de erro para JSON invalido (400) e persistencia (500).
6. Resposta de sucesso em 201 com payload objetivo.

## Conformidade com AGENTS.md
- TypeScript strict-ready: sem any.
- Zod para input: aplicado.
- pino para logging: aplicado.
- sem log de dado pessoal: aplicado.
- imports estaticos no topo: aplicado.
