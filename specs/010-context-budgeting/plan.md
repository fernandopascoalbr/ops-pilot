# Implementation Plan: Context Budgeting

**Branch**: `010-context-budgeting` | **Date**: 2026-11-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from [spec.md](./spec.md)

## Summary

Implementar um gerenciador de orçamento por seção no construtor de prompt do OpsPilot para preservar instruções críticas e contexto recente enquanto limita o tamanho do prompt por estratégia. A solução deve aplicar regras determinísticas de corte para `summary`, `window` e `memory`, usando variáveis de ambiente do tipo `CONTEXT_BUDGET_*`, e manter a ordem correta de poda quando o contexto excede o orçamento.

## Technical Context

**Language/Version**: Node.js LTS com TypeScript ESM (`strict`).

**Primary Dependencies**: `@langchain/core`, `@langchain/openai`, `@langchain/langgraph`, `zod`, runtime HTTP nativo e módulo de contexto local (`src/context`).

**Storage**: Sem persistência nova; os dados de contexto continuam sendo montados em memória por requisição/execução.

**Testing**: `node:test` com `tsx`; foco em testes unitários para o builder de contexto e comportamento de corte por seção.

**Target Platform**: Runtime do backend OpsPilot e scripts/CLI que montam prompts para estratégias de raciocínio.

**Project Type**: Web-service + CLI/service runtime com artefatos internos de contexto.

**Performance Goals**: Todos os cortes devem ocorrer em tempo linear sobre o volume de itens da seção sem custo desproporcional; o prompt final deve respeitar os tetos configurados antes de envio ao modelo.

**Constraints**: Manter `system` e `messages` protegidos; preservar as entradas mais recentes e os itens de memória mais relevantes; garantir ordem de poda estável em cenários de orçamento baixo.

**Scale/Scope**: Escopo restrito ao builder de contexto e à lógica de poda por seção, sem alterar a estratégia de raciocínio ou o modelo base escolhido.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- PASS (Spec-first): a feature já possui especificação versionada.
- PASS (Safety): a mudança não é destrutiva; modifica apenas composição e limites de contexto do prompt.
- PASS (Evidence-driven): o plano exige observabilidade do tamanho de cada seção e testes de ordem de corte.
- PASS (Boundaries): o orçamento por seção é um módulo separado de `src/context`, com regras de trimming e proteção de mensagens críticas.
- PASS (Quality/Testability): o plano exige validação por testes unitários e cenários de orçamento inferior ao normal.

### Re-check after Phase 1 design

- PASS: a pesquisa, o modelo de dados e o quickstart preservam observabilidade, determinismo e validação por testes.

## Project Structure

### Documentation (this feature)

```text
specs/010-context-budgeting/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── context-budget.contract.md
└── spec.md
```

### Source Code (repository root)

```text
src/
├── context/
│   ├── token.ts
│   └── context-builder.ts
├── agents/
│   ├── react.ts
│   ├── plan-and-execute.ts
│   ├── reflect-plan-and-execute.ts
│   └── index.ts
├── http/
│   ├── server.ts
│   └── chat-schema.ts
├── memory/
│   └── ...
├── domain/
│   └── ...
├── cli.ts
├── index.ts
└── arena.ts

tests/
├── unit/
│   └── context/
│       └── context-builder.test.ts
└── integration/
    └── chat-budget.test.ts
```

**Structure Decision**: manter um projeto único e ampliar o módulo de contexto existente (`src/context`), sem introduzir serviços ou bases adicionais; o comportamento de recorte será encapsulado em um builder dedicado e validado por testes unitários e integração leve.

## Complexity Tracking

Sem violações de constituição que exijam justificação adicional.
