# Tasks: Reflect Plan-and-Execute Strategy

**Input**: Design documents from `/specs/001-reflect-plan-and-execute/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Testes foram solicitados explicitamente no escopo da implementação.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single project TypeScript: `src/`, `tests/` at repository root

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar comandos e ponto de entrada para executar a nova estratégia sem quebrar scripts atuais.

- [X] T001 Add `reflect:plan-and-execute` script in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/package.json pointing to `tsx --env-file=.env src/arena.ts --strategies reflect-plan-and-execute`
- [X] T002 [P] Update strategy selection defaults and validation in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/src/arena.ts to accept `reflect-plan-and-execute`
- [X] T003 [P] Update strategy hints shown to users in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/src/cli.ts including the new script and strategy name

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Criar fundação compartilhada da estratégia para suportar todas as histórias de usuário.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create shared types for reflection lifecycle in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/src/agents/types.ts covering `decision: continue|adjust|end` and fallback outcomes
- [X] T005 Implement reusable helpers for safe iteration cap and stopping policy in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/src/agents/trace.ts with explicit support for `maxIterations` bounded by 1..8
- [X] T006 Create new strategy module scaffold in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/src/agents/reflect-plan-and-execute.ts implementing `ReasoningStrategy.run(input: string, maxIterations?: number): Promise<StrategyRunResult>`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Conduzir incidentes com plano guiado (Priority: P1) 🎯 MVP

**Goal**: Gerar plano inicial completo antes da execução e executar passos em ordem controlada.

**Independent Test**: Executar a estratégia com um incidente novo e verificar que há evento de plano antes da primeira ação e que os passos são executados sequencialmente.

### Tests for User Story 1

- [X] T007 [P] [US1] Add integration test in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/tests/arena.test.ts asserting plan events appear before action events for `reflect-plan-and-execute`
- [X] T008 [P] [US1] Add contract-shape test in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/tests/trace-format.test.ts asserting output has `answer`, `trace[]`, and `metrics{llmCalls,latencyMs}`

### Implementation for User Story 1

- [X] T009 [US1] Implement planner stage in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/src/agents/reflect-plan-and-execute.ts producing ordered steps with goal/summary before any execution
- [X] T010 [US1] Implement sequential executor stage in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/src/agents/reflect-plan-and-execute.ts recording `plan` and `action` trace events per step
- [X] T011 [US1] Wire strategy registration in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/src/index.ts and /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/src/arena.ts without changing current `react` and `plan-and-execute` behavior

**Checkpoint**: User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Ajustar o plano com reflexão controlada (Priority: P2)

**Goal**: Refletir após cada passo para decidir continuar, ajustar ou encerrar com justificativa auditável.

**Independent Test**: Rodar cenário com mudança de evidência e validar evento `critique` por iteração e replanejamento quando decisão for `adjust`.

### Tests for User Story 2

- [X] T012 [P] [US2] Add reflection decision tests in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/tests/arena.test.ts covering `continue`, `adjust`, and `end` branches
- [X] T013 [P] [US2] Add trace auditability test in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/tests/trace-format.test.ts ensuring each executed step has matching `critique` event with reasoning

### Implementation for User Story 2

- [X] T014 [US2] Implement reflection stage in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/src/agents/reflect-plan-and-execute.ts enforcing `decision` enum exactly `continue | adjust | end`
- [X] T015 [US2] Implement optional replanning in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/src/agents/reflect-plan-and-execute.ts updating only remaining steps when decision is `adjust`
- [X] T016 [US2] Persist decision rationale in trace using /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/src/agents/trace.ts so every reflection is auditable

**Checkpoint**: User Stories 1 and 2 should both work independently

---

## Phase 5: User Story 3 - Encerrar com limites e fallback seguro (Priority: P3)

**Goal**: Garantir critérios de parada, limite de iterações e fallback seguro sem loops.

**Independent Test**: Executar com limite baixo e baixa confiança para confirmar encerramento seguro sem ultrapassar limite.

### Tests for User Story 3

- [X] T017 [P] [US3] Add bounded-iterations test in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/tests/arena.test.ts asserting execution never exceeds configured max iterations
- [X] T018 [P] [US3] Add fallback behavior test in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/tests/arena.test.ts for low-confidence/limit reached scenarios

### Implementation for User Story 3

- [X] T019 [US3] Enforce StoppingPolicy in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/src/agents/reflect-plan-and-execute.ts quoting data-model constraints verbatim: `maxIterations (integer, >= 1)`, `stopOnCriticalRisk (boolean)`, `stopOnResolved (boolean)`, `fallbackMode (enum): safe-close | human-escalation`
- [X] T020 [US3] Enforce ReflectionRecord constraints in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/src/agents/reflect-plan-and-execute.ts quoting data-model constraints verbatim: `iteration (integer, >= 1)`, `decision (enum): continue | adjust | end`, and `end deve registrar motivo explícito`
- [X] T021 [US3] Emit deterministic safe fallback final answer in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/src/agents/reflect-plan-and-execute.ts when limit or confidence rules stop execution

**Checkpoint**: All user stories should now be independently functional

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Consolidar documentação, regressão e validação final ponta a ponta.

- [X] T022 [P] Update validation guide and commands in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/specs/001-reflect-plan-and-execute/quickstart.md with final run examples
- [X] T023 Run targeted regression test suite in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/tests/ and record expected results in /Users/fernando/Repos/second-brain/Unipds/AgentesAutonomos/projeto-02-ops-pilot/specs/001-reflect-plan-and-execute/tasks.md completion notes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user stories
- **User Stories (Phase 3+)**: Depend on Foundational completion
  - US1 (P1) first for MVP
  - US2 (P2) depends on US1 execution pipeline
  - US3 (P3) depends on US2 reflection decisions and then adds stopping/fallback enforcement
- **Polish (Final Phase)**: Depends on all user stories complete

### User Story Dependencies

- **US1**: Starts after Foundational, independent MVP slice
- **US2**: Depends on US1 planning/execution path
- **US3**: Depends on US2 reflection path for final stopping/fallback behavior

### Parallel Opportunities

- Phase 1: T002 and T003 can run in parallel
- Phase 3: T007 and T008 can run in parallel
- Phase 4: T012 and T013 can run in parallel
- Phase 5: T017 and T018 can run in parallel
- Final Phase: T022 can run while T023 is prepared

---

## Parallel Example: User Story 2

```bash
# Launch reflection-related tests in parallel:
Task: "T012 [US2] reflection decision tests in tests/arena.test.ts"
Task: "T013 [US2] trace auditability test in tests/trace-format.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup + Foundational phases
2. Complete US1 (planning before action + sequential execution)
3. Validate US1 independently with T007/T008
4. Keep current strategies unchanged and working

### Incremental Delivery

1. Add US2 (reflection + adjust/continue/end decisions)
2. Add US3 (hard limits + safe fallback)
3. Run regression and update quickstart

### End-to-End Completion Criteria

- Script `reflect:plan-and-execute` works from `package.json`
- Existing scripts remain intact
- Strategy output complies with contract in `contracts/reflect-plan-execute.contract.yaml`
- Relevant tests pass and validate expected behavior

## Completion Notes

- `npm test` executado com sucesso: 9 testes passando, 0 falhas.
- `npm run reflect:plan-and-execute -- --input "Contexto incompleto e conflito de evidencias" --max-iterations 2` executado com fallback seguro e trace auditável.
