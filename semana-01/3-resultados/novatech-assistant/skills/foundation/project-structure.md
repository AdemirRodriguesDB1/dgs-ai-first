# Skill — Project Structure

## Context

Use esta skill quando criar arquivos novos no repositório para evitar paths fora do padrão.

Frase de ativação recomendada: follow the novatech project structure skill.

## Regras prescritivas

1. Endpoints HTTP ficam em src/functions/<modulo>/handler.ts.
2. Validações de endpoint ficam no mesmo módulo em validator.ts.
3. Montagem de payload HTTP fica em response-builder.ts quando necessário.
4. Lógica de integração externa fica em src/services.
5. Tipos compartilhados ficam em src/shared/types.ts.
6. Specs SDD ficam em specs/<modulo> com requirements.md, plan.md e tasks.md.
7. Skills ficam em skills/foundation, skills/domain e skills/artifact.
8. Testes unitários ficam em tests/unit e integração em tests/integration.

## DO

```text
src/functions/query/handler.ts
src/functions/query/validator.ts
src/functions/query/response-builder.ts
```

```text
specs/query-endpoint/requirements.md
specs/query-endpoint/plan.md
specs/query-endpoint/tasks.md
```

## DON'T

```text
src/api/query.ts
```

```text
spec/query-endpoint/task-list.md
```

## Anti-padrões

- Misturar código de endpoint e integração Azure no mesmo arquivo.
- Criar pastas novas sem necessidade fora da árvore definida.
- Colocar arquivo de skill fora da hierarquia foundation/domain/artifact.

## Resultado esperado

Estrutura previsível para pessoas e agentes, com navegação simples e menor custo de manutenção.
