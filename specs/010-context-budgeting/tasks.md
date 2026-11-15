# Tasks: Context Budgeting

**Input**: Design documents from `/specs/010-context-budgeting/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Testes são obrigatórios nesta feature e explicitamente solicitados no requisito de corte por ordem e em cenários de orçamento baixo.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Criar a base para o builder de contexto, mutáveis de ambiente e testes de orçamento por seção.

- [ ] T001 Create context builder scaffold in `src/context/context-builder.ts` and test harness in `tests/unit/context/context-builder.test.ts`
- [ ] T002 [P] Add integration scenario skeleton for prompt-budget validation in `tests/integration/context-budget.test.ts`
- [ ] T003 [P] Add minimal environment configuration reference for `CONTEXT_BUDGET_*` in `README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Definir as regras compartilhadas de orçamento, proteção e recorte antes de qualquer entrega por história.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Implement parse and default budget configuration in `src/context/context-builder.ts` for `CONTEXT_BUDGET_SUMMARY`, `CONTEXT_BUDGET_WINDOW`, and `CONTEXT_BUDGET_MEMORY`, preserving default caps of `200`, `1200`, and `300`
- [ ] T005 [P] Implement section model and protected-content handling in `src/context/context-builder.ts` so `system` and `messages` remain untouched while `summary`, `window`, and `memory` are subject to trimming
- [ ] T006 [P] Implement deterministic trimming helpers in `src/context/context-builder.ts` using the rules: "summary before window before memory", "oldest-first for window", and "lowest-score-first for memory" with stable tie-breaking
- [ ] T007 Add foundation unit tests in `tests/unit/context/context-builder.test.ts` covering default budgets, protected sections, and determinism for identical inputs

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Respeitar orçamento por seção (Priority: P1) 🎯 MVP

**Goal**: Garantir que o prompt final respeita o teto de cada seção sem cortar instruções críticas ou mensagens do usuário.

**Independent Test**: Construir um prompt com `system`, `messages`, `summary`, `window` e `memory` excedendo os limites e verificar que `system` e `messages` permanecem intactos e que as demais seções são reduzidas até o cap configurado.

### Tests for User Story 1

- [ ] T008 [P] [US1] Add failing unit test in `tests/unit/context/context-builder.test.ts` for protected `system` and `messages` sections with summary/window/memory over budget
- [ ] T009 [P] [US1] Add failing integration test in `tests/integration/context-budget.test.ts` validating per-section caps under realistic prompt composition

### Implementation for User Story 1

- [ ] T010 [P] [US1] Implement summary and window cap enforcement in `src/context/context-builder.ts` while preserving `system` and `messages` as protected content
- [ ] T011 [US1] Implement memory cap enforcement in `src/context/context-builder.ts` keeping the highest-scoring memory items and removing the lowest-score entries first
- [ ] T012 [US1] Return audit metadata from `src/context/context-builder.ts` so tests can assert trimmed section totals and retained content without relying on implementation internals

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Cortar na ordem correta em orçamento baixo (Priority: P1)

**Goal**: Garantir que a ordem de remoção seja previsível e correta em cenários com tetos muito pequenos.

**Independent Test**: Executar um cenário de orçamento reduzido e verificar que o builder corta primeiro `summary`, depois `window`, e depois `memory`, sem afetar as partes protegidas.

### Tests for User Story 2

- [ ] T013 [P] [US2] Add failing unit test in `tests/unit/context/context-builder.test.ts` for summary-before-window-before-memory pruning order
- [ ] T014 [P] [US2] Add failing integration test in `tests/integration/context-budget.test.ts` for low-budget ordering and final prompt length constraints

### Implementation for User Story 2

- [ ] T015 [US2] Implement explicit ordered pruning pipeline in `src/context/context-builder.ts` so the final builder trims `summary`, then `window`, then `memory` whenever necessary
- [ ] T016 [US2] Add deterministic tie-handling in `src/context/context-builder.ts` for window entries with equal age and memory entries with equal score, preserving stable ordering across runs
- [ ] T017 [US2] Ensure the builder exposes per-section post-trim totals and selected keep/remove policy in `src/context/context-builder.ts` for regression tests

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Configurar orçamentos via ambiente (Priority: P2)

**Goal**: Permitir ajuste operacional de tetos por seção sem mudar a lógica de composição do prompt.

**Independent Test**: Definir valores diferentes de `CONTEXT_BUDGET_*` e verificar que cada seção respeita seu cap individual e que o comportamento do builder permanece consistente.

### Tests for User Story 3

- [ ] T018 [P] [US3] Add unit test in `tests/unit/context/context-builder.test.ts` covering custom budget values from environment variables
- [ ] T019 [P] [US3] Add integration test in `tests/integration/context-budget.test.ts` for alternative environment budgets and fallback behavior when values are missing or partial

### Implementation for User Story 3

- [ ] T020 [US3] Implement env-driven budget resolution in `src/context/context-builder.ts` and validate the exact configuration contract: `CONTEXT_BUDGET_SUMMARY`, `CONTEXT_BUDGET_WINDOW`, `CONTEXT_BUDGET_MEMORY`, plus safe defaults when values are absent or invalid
- [ ] T021 [US3] Wire the builder to the active prompt assembly flow so all strategies use the same section-budget logic without custom code per strategy in `src/context/context-builder.ts`
- [ ] T022 [US3] Update operational guidance in `README.md` to document how to override the prompt budget values and what the default caps are

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Consolidar documentação, validações finais e consistência da feature.

- [ ] T023 [P] Run targeted context-budget tests in `tests/unit/context/context-builder.test.ts` and `tests/integration/context-budget.test.ts` to verify all user stories pass together
- [ ] T024 [P] Execute repository validation using `npm test` and `npm run typecheck` to confirm the new prompt-budgeting logic did not regress existing behavior
- [ ] T025 Final review of `src/context/context-builder.ts` against the spec constraints: "system e mensagens intocáveis", "resumo 200", "janela 1200 (corta as mais antigas)", "memória 300 (corta menor score)", and "tetos baixos cortam na ordem certa"
- [ ] T026 Validate the final quickstart and feature docs for the prompt-budget behavior in `README.md` and the design artifacts under `specs/010-context-budgeting/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational completion
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 and delivers the core prompt-budget behavior
- **US2 (P2)**: Can start after Phase 2 and may run in parallel with US1 after the trimming contract is stable
- **US3 (P3)**: Can start after Phase 2 and depends on the same builder contract, but should remain independently testable with custom env values

### Within Each User Story

- Tests MUST be written and fail before implementation
- Models/helpers before the prompt pipeline
- Builder logic before end-to-end validation
- Story complete before moving to the next priority

### Parallel Opportunities

- Phase 1: T002 and T003 can run in parallel
- Phase 2: T005, T006, and T007 can run in parallel after T004 defines the base config
- User Story 1: T008 and T009 can run in parallel; T010 and T011 may proceed in parallel once the cap rules are defined
- User Story 2: T013 and T014 can run in parallel; T015 and T016 may proceed in parallel once the pruning contract is agreed
- User Story 3: T018 and T019 can run in parallel
- Final polish: T023 and T024 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Run US1 tests in parallel
Task: "T008 [US1] in tests/unit/context/context-builder.test.ts"
Task: "T009 [US1] in tests/integration/context-budget.test.ts"

# Implement cap enforcement in parallel across sections
Task: "T010 [US1] in src/context/context-builder.ts"
Task: "T011 [US1] in src/context/context-builder.ts"
```

## Parallel Example: User Story 2

```bash
# Run low-budget ordering checks in parallel
Task: "T013 [US2] in tests/unit/context/context-builder.test.ts"
Task: "T014 [US2] in tests/integration/context-budget.test.ts"

# Apply trimming order rules in parallel once shared helpers exist
Task: "T015 [US2] in src/context/context-builder.ts"
Task: "T016 [US2] in src/context/context-builder.ts"
```

## Parallel Example: User Story 3

```bash
# Run env-driven budget tests in parallel
Task: "T018 [US3] in tests/unit/context/context-builder.test.ts"
Task: "T019 [US3] in tests/integration/context-budget.test.ts"

# Implement config reading and documentation in parallel
Task: "T020 [US3] in src/context/context-builder.ts"
Task: "T022 [US3] in README.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1
2. Complete Phase 2
3. Complete Phase 3: US1
4. Validate User Story 1 independently with budgeted prompt assembly
5. Stop and confirm the MVP is stable before extending to pruning order or env tuning

### Incremental Delivery

1. Setup + Foundational
2. Deliver US1 (budget enforcement per section)
3. Deliver US2 (deterministic pruning order under low budgets)
4. Deliver US3 (env-based budget configuration)
5. Run final polish and validation

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is ready:
   - Developer A: US1
   - Developer B: US2
   - Developer C: US3
3. Final phase consolidates test runs and docs

---

## Notes

- All tasks follow the required checklist format `- [ ] Txxx ...`
- Story labels `[US1]`, `[US2]`, `[US3]` are used only in user story phases
- Paths are explicit in every task description
- This feature is intentionally scoped to the prompt builder and budget logic, not the rest of the reasoning engine
