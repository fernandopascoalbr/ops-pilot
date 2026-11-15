# Implementation Plan: Medição de Contexto e Tokens

**Branch**: `008-context-usage-metrics` | **Date**: 2026-11-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from [spec.md](./spec.md)

## Summary

Instrumentar medição de contexto no fluxo de chat com dois níveis complementares: estimativa determinística por fonte (chars/4) e uso real de prompt tokens retornado pelo runtime do LangChain/OpenRouter. Expor essas métricas no `POST /chat`, adicionar suporte de observabilidade por turno no script de conversa longa e validar tudo com testes unitários e de integração.

## Technical Context

**Language/Version**: Node.js LTS com TypeScript ESM (`strict`).

**Primary Dependencies**: `@langchain/openai`, `@langchain/core`, `zod` (fronteiras), servidor HTTP nativo.

**Storage**: N/A para esta feature (somente cálculo e exposição de métricas de execução em memória da requisição).

**Testing**: `node:test` com `tsx`, incluindo unitários e integração HTTP.

**Target Platform**: Backend local (HTTP `POST /chat`) e script shell para validação operacional.

**Project Type**: Web-service com CLI/script auxiliar.

**Performance Goals**: Acrescentar métricas sem impacto perceptível na latência do `/chat` (mesma ordem de grandeza das respostas atuais).

**Constraints**: Manter compatibilidade com clientes existentes do `/chat`; não bloquear o fluxo quando uso real de token não vier no retorno do modelo.

**Scale/Scope**: Escopo restrito à instrumentação de métricas por requisição/turno e observabilidade em conversa longa.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- PASS (Spec-first): spec existente e versionada para a feature.
- PASS (Safety): mudança é observabilidade; não adiciona ação destrutiva nem bypass de validação.
- PASS (Evidence-driven): adiciona rastreabilidade explícita de consumo de contexto e tokens.
- PASS (Boundaries): cálculo de contexto, extração de uso real e serialização HTTP ficam em camadas separáveis.
- PASS (Quality/Testability): plano inclui testes unitários e integração para os novos contratos de métrica.

### Re-check after Phase 1 design

- PASS: os artefatos de pesquisa, dados, contratos e quickstart preservam validação de fronteira, rastreabilidade e foco em testes.

## Project Structure

### Documentation (this feature)

```text
specs/008-context-usage-metrics/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── chat-context-metrics.contract.yaml
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── context/
│   └── token.ts
├── domain/
│   └── strategy.ts
├── agents/
│   ├── react.ts
│   ├── plan-and-execute.ts
│   └── reflect-plan-and-execute.ts
├── http/
│   ├── chat-schema.ts
│   └── server.ts
└── arena.ts

scripts/
└── conversa-longa.sh

tests/
├── unit/
│   └── context/
└── integration/
    └── chat-*.test.ts
```

**Structure Decision**: manter projeto único e instrumentar pontos existentes (`src/http`, `src/agents`, `src/domain`), adicionando módulo dedicado em `src/context/token.ts` para cálculo/normalização de métricas e um script operacional em `scripts/conversa-longa.sh`.

## Complexity Tracking

Sem violações de constituição que exijam justificativa adicional.
