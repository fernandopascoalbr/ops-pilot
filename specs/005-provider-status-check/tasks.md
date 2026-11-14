# Tasks: Verificação de status de provedores externos

**Input**: Design documents from `/specs/005-provider-status-check/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are explicitly requested in the feature specification and must cover success, timeout, and invalid response without real network access.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm project constraints and create the test harness for the provider-status tool.

- [X] T001 Review the existing agent tool conventions and registry flow in src/agents/tools.ts and src/agents/index.ts
- [X] T002 [P] Create the provider-status test scaffold in tests/integration/provider-status-tool.test.ts and tests/unit/provider-status-tool.test.ts
- [X] T003 [P] Confirm the project test runner and import pattern in package.json and existing test files before implementing the fetch wrapper

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the reusable status-fetch logic and validation boundary the stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Implement the provider status fetch abstraction in src/agents/tools.ts with a dependency-injected fetch function for deterministic tests
- [X] T005 Implement provider URL resolution and request dispatch for github and cloudflare in src/agents/tools.ts using the public status endpoints from the spec
- [X] T006 [P] Add Zod validation for the API payload in src/agents/tools.ts enforcing `status.indicator` and `status.description` as required strings
- [X] T007 [P] Add the 5-second timeout logic with `AbortSignal.timeout` and a single retry after network or 5xx failures in src/agents/tools.ts
- [X] T008 Add the compact one-line output formatter that returns `indicator + description` without inflating agent context in src/agents/tools.ts
- [X] T009 Add final readable error handling so the tool returns an observation instead of throwing beyond the tool boundary in src/agents/tools.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Consultar o status de um provedor externo (Priority: P1) 🎯 MVP

**Goal**: Deliver a working tool that checks the public status of a supported provider and returns a compact operational summary.

**Independent Test**: Verify that a valid request to `provider=github` or `provider=cloudflare` returns a compact single-line status result without network dependence.

### Tests for User Story 1 (REQUIRED)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T010 [P] [US1] Add success-path tests for `provider=github` and `provider=cloudflare` in tests/integration/provider-status-tool.test.ts using a fake fetch response
- [X] T011 [P] [US1] Add default-provider test covering omitted `provider` == `github` in tests/unit/provider-status-tool.test.ts

### Implementation for User Story 1

- [X] T012 [P] [US1] Add the `provider` enum input definition and `.describe()` guidance to the tool schema in src/agents/tools.ts
- [X] T013 [US1] Implement the public provider lookup flow that resolves the correct StatusPage URL and validates the response in src/agents/tools.ts
- [X] T014 [US1] Format the successful result as a single-line operational summary in src/agents/tools.ts
- [X] T015 [US1] Ensure the success path returns exactly the expected status indicator and description with no extra noise in src/agents/tools.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Entender rapidamente falhas de rede e validação (Priority: P2)

**Goal**: Ensure network failures, invalid payloads, and server-side errors are surfaced as readable tool observations rather than unhandled exceptions.

**Independent Test**: Verify that a fake fetch error and an invalid payload each produce clear, agent-safe results without crashing the execution flow.

### Tests for User Story 2 (REQUIRED)

- [X] T016 [P] [US2] Add invalid-response tests for missing `status.indicator` or `status.description` in tests/unit/provider-status-tool.test.ts
- [X] T017 [P] [US2] Add network-failure test covering the retry behavior in tests/integration/provider-status-tool.test.ts
- [X] T018 [P] [US2] Add 5xx-response test covering the single retry and final readable failure in tests/integration/provider-status-tool.test.ts

### Implementation for User Story 2

- [X] T019 [US2] Harden the fetch wrapper in src/agents/tools.ts to retry once after network failure or HTTP 5xx before returning the final error observation
- [X] T020 [US2] Translate invalid schema responses into a readable tool result without throwing exceptions outside the tool boundary in src/agents/tools.ts
- [X] T021 [US2] Keep error messages concise and operationally useful for incident triage in src/agents/tools.ts

**Checkpoint**: At this point, User Stories 1 and 2 should both work independently.

---

## Phase 5: User Story 3 - Respeitar limites operacionais de latência (Priority: P3)

**Goal**: Guarantee the tool respects the 5-second operational deadline and degrades gracefully when the provider is slow or unavailable.

**Independent Test**: Verify that a fake fetch that exceeds 5 seconds is aborted with timeout handling and that the retry pattern behaves predictably.

### Tests for User Story 3 (REQUIRED)

- [X] T022 [P] [US3] Add timeout test using a fake fetch that triggers `AbortSignal.timeout(5000)` in tests/unit/provider-status-tool.test.ts
- [X] T023 [P] [US3] Add retry-after-timeout verification in tests/integration/provider-status-tool.test.ts guaranteeing a single retry before final failure

### Implementation for User Story 3

- [X] T024 [US3] Enforce the 5-second timeout for every fetch attempt in src/agents/tools.ts using `AbortSignal.timeout`
- [X] T025 [US3] Ensure the final timeout result remains readable and compact while preserving the tool contract in src/agents/tools.ts
- [X] T026 [US3] Validate the overall end-to-end behavior against the requirements in spec.md and the contract in specs/005-provider-status-check/contracts/provider-status-tool.contract.yaml

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, and regression checks across the successful feature flow.

- [X] T027 [P] Run the targeted provider-status test files and confirm the success, timeout, and invalid-response scenarios are green
- [X] T028 [P] Review src/agents/tools.ts for consistency with repository tool description conventions and keep the tool output compact for agent context
- [X] T029 Run the quickstart validation scenarios from specs/005-provider-status-check/quickstart.md and confirm deterministic local execution without external network access
- [X] T030 Final review of spec.md, plan.md, research.md, data-model.md, and contracts/provider-status-tool.contract.yaml for alignment with implementation results

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel if team capacity allows
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational completion and is the MVP
- **User Story 2 (P2)**: Can start after Foundational completion; independent from US1 but shares the same tool boundary
- **User Story 3 (P3)**: Can start after Foundational completion; independent from US1 and US2 but validates operational reliability

### Parallel Opportunities

- Phase 1 tasks T002 and T003 can run in parallel.
- Phase 2 tasks T006 and T007 can run in parallel once T004 and T005 are complete.
- Within US1, T010 and T011 can run in parallel.
- Within US2, T016, T017, and T018 can run in parallel.
- Within US3, T022 and T023 can run in parallel.
- The final polish tasks T027 and T028 can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Add success-path tests for provider=github and provider=cloudflare in tests/integration/provider-status-tool.test.ts"
Task: "Add default-provider test covering omitted provider == github in tests/unit/provider-status-tool.test.ts"

# Launch implementation tasks in parallel after test scaffolding:
Task: "Add the provider enum input definition and .describe() guidance to the tool schema in src/agents/tools.ts"
Task: "Implement the public provider lookup flow that resolves the correct StatusPage URL and validates the response in src/agents/tools.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run the success-path tests for github and cloudflare
5. Deploy or demonstrate only after the story is green

### Incremental Delivery

1. Complete Setup + Foundational → foundation ready
2. Add User Story 1 → validate success behavior
3. Add User Story 2 → validate network and invalid payload handling
4. Add User Story 3 → validate timeout and retry behavior
5. Final polish and quickstart validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together.
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Final phase validates all stories together.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to the specific user story for traceability.
- Tests are explicitly required and should fail before the implementation tasks are completed.
- Keep each task focused on one file or one narrow behavior to reduce merge conflicts.
- Validate each complete story independently before continuing to the next priority.
