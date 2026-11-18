# Implementation Plan: Team Supervisor

**Branch**: `015-team-supervision` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-team-supervision/spec.md`

## Summary

Adicionar um modo de colaboração em equipe para o OpsPilot, com rota dedicada `team`, supervisor central e um blackboard compartilhado como estado único da operação. A camada de equipe deve separar papéis em analista, planejador e executor, preservando guardrails de segurança e evidência. O supervisor usa saída estruturada `withStructuredOutput({ next, brief })` para orientar a próxima ação, enquanto o traço de execução registra eventos `handoff` e os renderiza na visão de raciocínio para auditoria.

## Technical Context

**Language/Version**: TypeScript strict com runtime Node.js LTS (ESM)

**Primary Dependencies**: `zod` para contratos de estado e métricas de equipe, `@langchain/core` para `withStructuredOutput`, `node:test` + `tsx` para testes focados em permissão, handoff e limite de participantes

**Storage**: Estado em memória do runtime para a sessão ativa; sem persistência durável além do trace e do estado da sessão em execução

**Testing**: `node --import tsx --test` e testes de integração para sessão, permissões e renderização de eventos de handoff

**Target Platform**: Backend/agent local em Node.js, com integração opcional por rotas web/HTTP e uso em revisão operacional humana

**Project Type**: Backend library/agent workflow, com extensão de rota e estado compartilhado

**Performance Goals**:
- manter o blackboard e o supervisor estáveis para até 8 participantes
- responder à proposta do supervisor em menos de 1s para decisão local sem necessidade de modelos externos
- garantir legibilidade do trace em sessões longas sem perda de contexto

**Constraints**:
- o analista deve ser estritamente de leitura
- o planejador não pode ter acesso direto a ferramentas
- o executor só pode agir em incidentes dentro do fluxo permitido
- o máximo de participantes por sessão é 8
- todos os eventos de handoff devem ser rastreáveis no trace e visíveis no "ver raciocínio"

**Scale/Scope**:
- 1 rota `team` com supervisor e estado compartilhado
- 3 papéis com regras separadas e validação de permissão
- 1 blackboard por sessão e 1 fluxo de handoff por transição
- cobertura de testes para permissões, limite de equipe e visualização de trace

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate Review

- **Spec-First Delivery**: PASS — a feature specification exists and describes roles, guardrails, trace events, and team boundaries.
- **Agent Safety Over Automation Speed**: PASS — the plan favors explicit role isolation, bounded execution, and visible handoff evidence before action.
- **Evidence-Driven Incident Handling**: PASS — blackboard state and trace rendering are part of the operating contract, not an afterthought.
- **Tool and Context Boundaries**: PASS — the team mode is isolated as a coordination layer with distinct responsibilities for analyst, planner, and executor.
- **Quality, Security, and Testability**: PASS — the design includes validation rules, bounded size, and role checks that can be tested deterministically.

### Post-Phase 1 Re-Check

- **Spec-First Delivery**: PASS — research, data model, contracts and quickstart are produced and align with the feature spec.
- **Agent Safety Over Automation Speed**: PASS — the design preserves role guardrails, tool denial, and explicit handoff visibility.
- **Evidence-Driven Incident Handling**: PASS — the blackboard and trace are treated as the audit source for operational changes.
- **Tool and Context Boundaries**: PASS — no role bypasses; the executor handles incidents only through the allowed workflow.
- **Quality, Security, and Testability**: PASS — validation scenarios cover limit enforcement, permission checks, and reasoning display.

## Project Structure

### Documentation (this feature)

```text
specs/015-team-supervision/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── team-supervision.contract.yaml
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── team/
│   ├── blackboard.ts
│   ├── session.ts
│   ├── roles.ts
│   ├── supervisor.ts
│   ├── handoff.ts
│   └── trace.ts
├── graph/
│   └── production-graph.ts
├── agents/
│   ├── trace.ts
│   └── plan-and-execute.ts
├── http/
│   └── routes.ts
└── domain/
    └── strategy.ts

web/
└── src/
    └── features/
        └── team/
```

**Structure Decision**: The new coordination logic is isolated in `src/team/` to keep the blackboard, role permissions, and supervisory decisions separated from the existing route selection and execution engine. The `team` route is introduced as a boundary layer that reads and writes the same trace and state contracts already used by the operations graph.

## Complexity Tracking

Nenhuma violação constitucional identificada; a arquitetura mantém a operação em um módulo dedicado e não exige exceções nem relaxamento de segurança.
