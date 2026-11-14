# Tasks: Learning Reflection Memory

**Input**: Design documents from `/specs/007-learning-reflector/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare reflection-learning scaffolding and feature entry points.

- [x] T001 Create reflection-learning module stubs in `src/memory/learning-reflector.ts` and export wiring in `src/memory/index.ts`
- [x] T002 [P] Add feature test files `tests/unit/learning-reflector.test.ts` and `tests/integration/chat-learning-reflector.test.ts`
- [x] T003 [P] Add tool contract placeholder and mapping notes in `src/mcp/handlers.ts` for `forget_preference`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build core shared components required by all stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Implement structured reflection result model in `src/memory/learning-reflector.ts` with `hasLearning` and `fact` fields
- [x] T005 Implement durable-learning filters in `src/memory/learning-reflector.ts` to enforce “never punctual request” and “never secret/sensitive” policy
- [x] T006 [P] Implement async persistence dispatcher in `src/memory/learning-reflector.ts` so learning writes do not block chat response path
- [x] T007 [P] Implement audit-safe decision logging hooks in `src/memory/learning-reflector.ts` to avoid exposing secret literals
- [x] T008 Add shared forget-preference service API in `src/memory/memory-store.ts` and export from `src/memory/index.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Capturar aprendizados duráveis automaticamente (Priority: P1) 🎯 MVP

**Goal**: Detect and persist durable user facts after each response without blocking user-visible latency.

**Independent Test**: Send a stable user preference, return chat response normally, and verify asynchronous memory persistence for the same user.

### Tests for User Story 1

- [x] T009 [P] [US1] Add unit test in `tests/unit/learning-reflector.test.ts` validating `hasLearning=true` and non-empty `fact` for durable user preference text
- [x] T010 [P] [US1] Add integration test in `tests/integration/chat-learning-reflector.test.ts` confirming chat response returns before async `memories.remember` completion

### Implementation for User Story 1

- [x] T011 [P] [US1] Implement durable fact extraction flow in `src/memory/learning-reflector.ts` to produce a single clear fact when learning is present
- [x] T012 [US1] Integrate post-response learning trigger in `src/http/server.ts` using the last user message and user context
- [x] T013 [US1] Persist extracted fact asynchronously through `src/memory/memory-store.ts` with user-scoped association

**Checkpoint**: User Story 1 is independently functional and testable

---

## Phase 4: User Story 2 - Proteger privacidade e evitar memorizar segredos (Priority: P1)

**Goal**: Ensure sensitive or punctual content is never persisted as durable learning.

**Independent Test**: Send secret-bearing and punctual-request messages and verify no durable memory is written while conversation flow remains normal.

### Tests for User Story 2

- [x] T014 [P] [US2] Add unit test in `tests/unit/learning-reflector.test.ts` asserting no persistence when content is classified as secret/sensitive
- [x] T015 [P] [US2] Add unit test in `tests/unit/learning-reflector.test.ts` asserting no persistence for punctual request instructions

### Implementation for User Story 2

- [x] T016 [P] [US2] Implement secret/sensitive guardrails in `src/memory/learning-reflector.ts` and force `hasLearning=false` on blocked content
- [x] T017 [US2] Implement punctual-request suppression in `src/memory/learning-reflector.ts` so temporary instructions are excluded from durable facts
- [x] T018 [US2] Update operational logging in `src/http/server.ts` and `src/memory/learning-reflector.ts` to keep auditability without revealing sensitive payloads

**Checkpoint**: User Story 2 is independently functional and testable

---

## Phase 5: User Story 3 - Esquecer preferências quando solicitado (Priority: P2)

**Goal**: Allow explicit removal of learned preferences safely and only within the requesting user scope.

**Independent Test**: Persist a preference, call `forget_preference`, verify target removal, and confirm no cross-user deletion.

### Tests for User Story 3

- [x] T019 [P] [US3] Add integration test in `tests/integration/chat-learning-reflector.test.ts` for successful `forget_preference` removal of an existing preference
- [x] T020 [P] [US3] Add integration test in `tests/integration/chat-learning-reflector.test.ts` for safe no-op behavior when preference target does not exist

### Implementation for User Story 3

- [x] T021 [P] [US3] Implement `forget_preference` handler in `src/mcp/handlers.ts` with request parsing and response shaping
- [x] T022 [US3] Implement memory deletion-by-target for same user in `src/memory/memory-store.ts` honoring constraint “ForgetPreferenceRequest.userId: Obrigatório” and “target: Obrigatório; não vazio”
- [x] T023 [US3] Enforce user isolation in `src/memory/memory-store.ts` so forget operation never removes memories from other users

**Checkpoint**: User Story 3 is independently functional and testable

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening, validation, and documentation alignment.

- [x] T024 [P] Run targeted feature tests via `tests/unit/learning-reflector.test.ts` and `tests/integration/chat-learning-reflector.test.ts`
- [x] T025 [P] Run full validation commands documented in `specs/007-learning-reflector/quickstart.md` (`npm test`, `npm run typecheck`)
- [x] T026 Verify data-model constraints in `src/memory/learning-reflector.ts` and `src/memory/memory-store.ts`: “hasLearning obrigatório”, “fact obrigatório quando hasLearning = true; vazio caso contrário”, “fact obrigatório; não pontual; não sensível”
- [x] T027 [P] Update docs for final behavior in `README.md` and `specs/007-learning-reflector/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: Depend on Foundational completion
- **Polish (Phase 6)**: Depends on completion of desired user stories

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational; delivers MVP value
- **US2 (P1)**: Starts after Foundational; complements US1 with privacy/safety constraints
- **US3 (P2)**: Starts after Foundational; can be developed after US1/US2 core memory flow stabilizes

### Parallel Opportunities

- T002 and T003 can run in parallel
- T006 and T007 can run in parallel
- US1/US2 test-writing tasks can run in parallel (T009, T010, T014, T015)
- US3 tests (T019, T020) can run in parallel
- Polish tasks T024, T025, T027 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Execute US1 tests in parallel
Task: "T009 [US1] in tests/unit/learning-reflector.test.ts"
Task: "T010 [US1] in tests/integration/chat-learning-reflector.test.ts"

# Execute independent US1 implementation tasks in parallel where possible
Task: "T011 [US1] in src/memory/learning-reflector.ts"
Task: "T013 [US1] in src/memory/memory-store.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup)
2. Complete Phase 2 (Foundational)
3. Complete Phase 3 (US1)
4. Validate US1 independently
5. Demo/deploy MVP

### Incremental Delivery

1. Setup + Foundational
2. Deliver US1 (core value)
3. Deliver US2 (privacy/safety guardrails)
4. Deliver US3 (user-controlled forgetting)
5. Final polish and validation

### Parallel Team Strategy

1. Whole team completes Setup + Foundational
2. Split by stories:
   - Dev A: US1
   - Dev B: US2
   - Dev C: US3
3. Reunify for Phase 6 validation

---

## Notes

- [P] tasks indicate safe parallelization (different files / no direct dependency)
- [USx] labels map tasks to user stories for traceability
- Keep safety gates explicit: no punctual-memory persistence and no secret-memory persistence
- Validate each story independently before advancing
