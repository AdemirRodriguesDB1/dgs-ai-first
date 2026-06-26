# Autoavaliacao - Desenvolvedor (Cenario 3)

Base de avaliacao usada:
- semana-03/2-correcao/avaliacao-foundation.md
- semana-03/2-correcao/avaliacao-desenvolvedor.md

## Exercicio 3.1 - Structured output e verificacoes deterministicas

| Dimensao | Score | Justificativa resumida |
|---|---:|---|
| D1 - Dominio Conceitual | 3 | Diferenciei prompt probabilistico de validacao deterministica e apliquei structured output com Zod. |
| D2 - Uso de Ferramentas | 3 | Entregavel agora inclui evidencias de iteracoes, prompts usados, achados e correcoes aplicadas com Copilot + Claude. |
| D3 - Qualidade do Entregavel | 3 | Codigo funcional com schema valido, bloqueio efetivo dos 2 guardrails e fallback seguro. |
| D4 - Pensamento Critico | 3 | Identifiquei e corrigi problemas reais (schema permissivo e regex fraca). |
| D5 - Aplicabilidade ao Projeto | 3 | Regras conectadas ao dominio NovaTech (carga perigosa/devolucao e fonte obrigatoria). |

Score medio estimado: 3.0
Classificacao estimada: Aprovado com distincao

Checklist de armadilhas:
- Guardrail que apenas loga sem bloquear: NAO ocorreu.
- Code review com problemas inventados: NAO ocorreu.

## Exercicio 3.2 - Revisao critica de codigo gerado por IA

| Dimensao | Score | Justificativa resumida |
|---|---:|---|
| D1 - Dominio Conceitual | 3 | Revisao cobriu confiabilidade, seguranca e aderencia a padrao de engenharia. |
| D2 - Uso de Ferramentas | 3 | Entregavel inclui fluxo humano primeiro, segunda revisao com Claude e reescrita guiada por Copilot com prompts e resultados. |
| D3 - Qualidade do Entregavel | 3 | Handler reescrito com Zod, pino, import estatico, sem log de PII e com tratamento de erros. |
| D4 - Pensamento Critico | 3 | Identifiquei os 4 problemas obrigatorios antes da segunda revisao. |
| D5 - Aplicabilidade ao Projeto | 3 | Correcao alinhada ao AGENTS.md e ao contexto Azure Functions/Cosmos. |

Score medio estimado: 3.0
Classificacao estimada: Aprovado com distincao

Checklist de armadilhas obrigatorias:
- as any sem Zod: identificado.
- console.log em vez de pino: identificado.
- require dinamico: identificado.
- attendantEmail logado: identificado.

## Consolidado do Cenario 3 (estimado)
- Media estimada dos 2 exercicios: 3.0
- Status estimado: Aprovado com distincao

## Melhorias sugeridas antes da entrega final
1. Adicionar testes unitarios para o validador de resposta (casos positivos e bloqueios).
2. Documentar decisoes de regex/padroes para facilitar manutencao do guardrail.
3. Incluir uma secao curta de riscos residuais e plano de monitoramento pos-go-live.
