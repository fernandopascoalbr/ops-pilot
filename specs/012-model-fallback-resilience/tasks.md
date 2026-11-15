# Tasks: Model Fallback Resilience

**Input**: Design documents from `/specs/012-model-fallback-resilience/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Testes incluídos porque a constituição do projeto exige cobertura focada para nova lógica e a convenção local pede iniciar por teste.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar contratos de teste e base para validar resiliência de modelo no `/chat`.

- [X] T001 Create model-resilience test scaffold in `tests/unit/agents/model-resilience.test.ts` and `tests/integration/chat-model-resilience.test.ts`
- [X] T002 [P] Add reusable OpenRouter failure/success fixtures in `tests/fixtures/openrouter-resilience.ts` for primary-fail/fallback-success/all-fail scenarios
- [X] T003 [P] Add quickstart validation notes for fallback scenarios in `specs/012-model-fallback-resilience/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Definir contratos e tipos compartilhados de configuração, tentativas e erro antes das histórias.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Implement fallback env parsing in `src/config/env.ts` for `OPENROUTER_MODEL_FALLBACK` enforcing `primaryModel: "Obrigatório; não vazio"` and `fallbackModels: "Opcional; sem duplicatas; ordem estável"`
- [X] T005 [P] Define resilient model config/result types in `src/agents/model.ts` and `src/domain/strategy.ts` enforcing `temperature: "Obrigatório; valor válido no runtime"` and `isConfigured: "Obrigatório"`
- [X] T006 [P] Define model-attempt metadata in `src/agents/model.ts` enforcing `model: "Obrigatório"`, `role: "Obrigatório; \`primary\` ou \`fallback\`"`, `attemptIndex: "Obrigatório; inteiro >= 1"`, `outcome: "Obrigatório; \`success\` ou \`failure\`"`, and `errorMessage: "Obrigatório quando \`outcome=failure\`"`
- [X] T007 Define fallback trace payload contract in `src/agents/trace.ts` and `src/domain/strategy.ts` enforcing `type: "Obrigatório; valor \`fallback\`"`, `fromModel: "Obrigatório"`, `toModel: "Obrigatório"`, `reason: "Obrigatório"`, and `timestamp: "Obrigatório"`
- [X] T008 Create model-unavailable error contract in `src/agents/model.ts` and `src/http/server.ts` enforcing `status: "Obrigatório; valor \`503\`"` and `error: "Obrigatório; texto claro e acionável"`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Manter respostas com falha parcial de modelo (Priority: P1) 🎯 MVP

**Goal**: Garantir continuidade de resposta ao tentar o primário com retry e cair para reservas ordenadas.

**Independent Test**: Simular falha do primário com reserva saudável e confirmar resposta 200 com conteúdo válido.

### Tests for User Story 1

- [X] T009 [P] [US1] Add failing unit tests for primary retry then ordered fallback in `tests/unit/agents/model-resilience.test.ts`
- [X] T010 [P] [US1] Add failing integration test for primary-fail/fallback-success in `tests/integration/chat-model-resilience.test.ts`

### Implementation for User Story 1

- [X] T011 [US1] Implement `withRetry` on primary model in `src/agents/model.ts` before fallback chain starts
- [X] T012 [US1] Implement ordered `withFallbacks([...])` using `OPENROUTER_MODEL_FALLBACK` in `src/agents/model.ts`
- [X] T013 [US1] Wire resilient model factory usage in `src/agents/react.ts`, `src/agents/plan-and-execute.ts`, and `src/agents/reflect-plan-and-execute.ts`
- [X] T014 [US1] Ensure successful `/chat` flow preserves current behavior while using fallback-capable model path in `src/http/server.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Rastrear uso de fallback para operação (Priority: P2)

**Goal**: Tornar fallback auditável via trace e expor o modelo realmente usado nas métricas.

**Independent Test**: Forçar fallback e validar evento `fallback` no trace e `metrics.modelUsed` no response body.

### Tests for User Story 2

- [X] T015 [P] [US2] Add failing trace-format test for `fallback` event serialization in `tests/trace-format.test.ts`
- [X] T016 [P] [US2] Add failing integration assertions for `metrics.modelUsed` and fallback trace event in `tests/integration/chat-model-resilience.test.ts`

### Implementation for User Story 2

- [X] T017 [US2] Extend trace event typing/creation for fallback transitions in `src/domain/strategy.ts` and `src/agents/trace.ts`
- [X] T018 [US2] Capture and propagate model-used metadata from model execution in `src/agents/model.ts` and `src/agents/react.ts`
- [X] T019 [US2] Return `metrics.modelUsed` and fallback trace events in successful responses from `src/http/server.ts` and align schema in `src/http/chat-schema.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Falhar explicitamente quando nenhum modelo funciona (Priority: P3)

**Goal**: Retornar indisponibilidade explícita e previsível quando primário e reservas falharem.

**Independent Test**: Simular falha total (primário + reservas) e verificar status 503 com corpo de erro.

### Tests for User Story 3

- [X] T020 [P] [US3] Add failing integration test for all-models-fail → 503 in `tests/integration/chat-model-resilience.test.ts`
- [X] T021 [P] [US3] Add failing integration guard to ensure no success payload on 503 in `tests/integration/chat-model-resilience.test.ts`

### Implementation for User Story 3

- [X] T022 [US3] Raise model-unavailable domain error after exhausting primary retry and all fallbacks in `src/agents/model.ts`
- [X] T023 [US3] Map model-unavailable error to HTTP 503 in `src/http/server.ts` with explicit error body
- [X] T024 [US3] Align contract documentation for 503 and model resilience behavior in `specs/012-model-fallback-resilience/contracts/chat-model-resilience.contract.yaml`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Consolidar validação final, documentação operacional e regressão.

- [X] T025 [P] Update operational env documentation for `OPENROUTER_MODEL_FALLBACK` in `README.md` and `.env.example`
- [X] T026 [P] Run targeted validation suite for resilience behavior in `tests/unit/agents/model-resilience.test.ts`, `tests/integration/chat-model-resilience.test.ts`, and `tests/trace-format.test.ts`
- [X] T027 Run repository-level validation with `npm run typecheck` and `npm test` from repository root in `/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes`
- [X] T028 Validate quickstart execution steps and expected outcomes in `specs/012-model-fallback-resilience/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: Depend on Foundational completion
- **Polish (Phase 6)**: Depends on all selected user stories completion

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2 and is MVP
- **US2 (P2)**: Starts after Phase 2; depends on US1 model execution path being available for telemetry assertion
- **US3 (P3)**: Starts after Phase 2; depends on US1 fallback chain completion and reuses US2 telemetry plumbing for failure diagnostics

### Within Each User Story

- Tests first and failing before implementation
- Model/config changes before HTTP mapping
- HTTP mapping before final contract/doc sync
- Story must pass its independent test before moving on

### Parallel Opportunities

- Phase 1: T002 and T003 can run in parallel
- Phase 2: T005 and T006 can run in parallel after T004
- US1: T009 and T010 can run in parallel; T011 and T012 are sequential; T013 and T014 follow
- US2: T015 and T016 can run in parallel; T017 and T018 can run in parallel before T019
- US3: T020 and T021 can run in parallel; T022 then T023; T024 can run in parallel with T023 finalization
- Phase 6: T025 and T026 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Execute US1 tests in parallel
Task: "T009 [US1] in tests/unit/agents/model-resilience.test.ts"
Task: "T010 [US1] in tests/integration/chat-model-resilience.test.ts"
```

## Parallel Example: User Story 2

```bash
# Execute US2 tests in parallel
Task: "T015 [US2] in tests/trace-format.test.ts"
Task: "T016 [US2] in tests/integration/chat-model-resilience.test.ts"
```

## Parallel Example: User Story 3

```bash
# Execute US3 failure tests in parallel
Task: "T020 [US3] in tests/integration/chat-model-resilience.test.ts"
Task: "T021 [US3] in tests/integration/chat-model-resilience.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2
2. Complete Phase 3 (US1)
3. Validate US1 independent scenario (primary fail, fallback success)
4. Stop and confirm MVP behavior before observability/failure refinements

### Incremental Delivery

1. Setup + Foundational
2. Deliver US1 (fallback continuity)
3. Deliver US2 (trace + metrics auditability)
4. Deliver US3 (explicit 503 on total failure)
5. Execute Polish and full validation

### Parallel Team Strategy

1. Team completes Phase 1-2 together
2. After foundation:
   - Dev A: US1 execution chain
   - Dev B: US2 observability and metrics
   - Dev C: US3 failure mapping and contracts
3. Consolidate in Phase 6

---

## Notes

- All tasks follow required checklist format: `- [ ] T### ...`
- Story labels appear only in user-story phases (`[US1]`, `[US2]`, `[US3]`)
- Every task includes explicit file path(s)
- MVP scope is US1 after foundational completion
