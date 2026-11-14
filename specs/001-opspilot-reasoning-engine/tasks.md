# Tasks: IncidentArena Reasoning Engine

**Input**: Design documents from `/specs/001-opspilot-reasoning-engine/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are explicitly requested for the store and trace formatting behavior.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the project structure and toolchain for the reasoning engine.

- [x] T001 Create the project structure for the reasoning engine in `src/agents/`, `src/domain/`, `src/infra/`, `src/config/`, `tests/`, and `scripts/`
- [x] T002 Initialize the TypeScript ESM project and add the required runtime dependencies for Zod, LangGraph, OpenRouter integration, and test execution
- [x] T003 [P] Configure the local Node test runner and project scripts in `package.json` for deterministic validation without network execution

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared infrastructure that all stories depend on before strategy implementation begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Define the common strategy contract and metrics types in `src/domain/strategy.ts` and `src/agents/types.ts`
- [x] T005 [P] Implement environment configuration for `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, base URL, and temperature `0` in `src/config/env.ts`
- [x] T006 [P] Implement the in-memory alert and incident store with seeded services and alert data in `src/infra/store.ts`
- [x] T007 [P] Add the seed script to load 5 services and 6 alerts (3 firing, 3 resolved) in `scripts/seed-alerts.ts`
- [x] T008 Implement the validation layer for alert and incident payloads with Zod rules in `src/agents/tools.ts` and `src/domain/alerts.ts`
- [x] T009 Create the trace formatting utility that serializes typed events, tool actions, and metrics in `src/agents/trace.ts`

**Checkpoint**: Foundation ready; user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Compare reasoning strategies on the same incident (Priority: P1) 🎯 MVP

**Goal**: Deliver a comparable evaluation flow across multiple reasoning strategies with trace and metrics output.

**Independent Test**: A single incident input can be evaluated by one or more strategies, producing a final answer, a full trace, and bounded metrics without external network calls.

### Tests for User Story 1

- [x] T010 [P] [US1] Add failing unit tests for the seeded store and state transitions in `tests/store.test.ts`
- [x] T011 [P] [US1] Add failing unit tests for trace event formatting and ordering in `tests/trace-format.test.ts`

### Implementation for User Story 1

- [x] T012 [P] [US1] Implement the OpenRouter model factory with environment reading and temperature `0` in `src/agents/model.ts`
- [x] T013 [P] [US1] Implement the mock tool layer for `list_alerts(status)`, `open_incident(title, service, severity)`, and `resolve_incident(id)` in `src/agents/tools.ts`
- [x] T014 [US1] Implement the ReAct strategy that runs the mock tools, records the full trace, and respects the configured interaction limit in `src/agents/react.ts`
- [x] T015 [US1] Implement the comparison arena entry point that accepts `--strategies` and `--max-iterations` and prints traces and metrics in `src/arena.ts`
- [x] T016 [US1] Wire trace formatting and metrics aggregation into the arena and strategy outputs so the final answer and evidence remain auditable in `src/agents/trace.ts` and `src/domain/strategy.ts`
- [x] T017 [US1] Validate the comparison flow by running the seeded store and arena quickstart scenario from `specs/001-opspilot-reasoning-engine/quickstart.md`

**Checkpoint**: User Story 1 should be fully functional and independently testable.

---

## Phase 4: User Story 2 - Resolve and track incidents with safe tool-driven actions (Priority: P2)

**Goal**: Support safe incident lifecycle operations with validated inputs and a complete audit trail.

**Independent Test**: A firing alert can be opened as an incident and later resolved without violating the validation rules or bypassing the store state transitions.

### Tests for User Story 2

- [x] T018 [P] [US2] Add failing validation tests for invalid incident payloads and duplicate resolution attempts in `tests/store.test.ts`

### Implementation for User Story 2

- [x] T019 [P] [US2] Extend the store domain model with incident lifecycle state and service associations in `src/domain/incidents.ts`
- [x] T020 [P] [US2] Add the incident mutation workflow to `src/infra/store.ts` so `open_incident` and `resolve_incident` update records and statuses safely
- [x] T021 [US2] Enforce Zod validation for all incident tool arguments and guard against invalid operations before any state mutation in `src/agents/tools.ts`
- [x] T022 [US2] Ensure ReAct and Plan-and-Execute strategy traces capture incident-open and incident-resolve actions with tool arguments and observations in `src/agents/react.ts` and `src/agents/plan-and-execute.ts`
- [x] T023 [US2] Validate the safe incident workflow against the seeded data and update the quickstart proof points in `specs/001-opspilot-reasoning-engine/quickstart.md`

**Checkpoint**: User Stories 1 and 2 should both work independently from each other.

---

## Phase 5: User Story 3 - Gracefully stop when interaction limits are reached (Priority: P3)

**Goal**: Provide a bounded Plan-and-Execute workflow with replanning and safe termination when the limit is reached.

**Independent Test**: A strategy with a low interaction budget or a plan exceeding 8 steps terminates cleanly with a final trace and metrics instead of continuing indefinitely.

### Tests for User Story 3

- [x] T024 [P] [US3] Add failing tests covering the 8-step maximum and the interaction limit in `tests/arena.test.ts`

### Implementation for User Story 3

- [x] T025 [P] [US3] Implement the planner, executor, and replanner graph in `src/agents/plan-and-execute.ts`
- [x] T026 [US3] Add plan step tracking, remaining-step revision, and the stop condition when no steps remain or the maximum of 8 is reached in `src/agents/plan-and-execute.ts`
- [x] T027 [US3] Enforce the configured interaction budget and aggregate `llmCalls` and `latencyMs` in the strategy metrics in `src/domain/strategy.ts` and `src/agents/plan-and-execute.ts`
- [x] T028 [US3] Verify that the arena prints complete output and final traces for both strategies when the configured limit is reached in `src/arena.ts`
- [x] T029 [US3] Run the end-to-end validation scenario for the bounded plan flow from `specs/001-opspilot-reasoning-engine/quickstart.md`

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements that affect multiple stories and protected surfaces.

- [x] T030 [P] Review and update the repository documentation, including `README.md` and the feature quickstart notes, to reflect the maintained reasoning engine workflow
- [x] T031 [P] Run the deterministic test suite and the seeded quickstart validation across all stories to confirm store behavior, trace output, and CLI comparison remain stable

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; starts immediately
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories
- **User Stories (Phase 3+)**: All depend on Foundational completion
  - User stories can proceed in parallel if the team has capacity
  - Otherwise they can be delivered in priority order: US1 → US2 → US3
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories; it is the MVP
- **User Story 2 (P2)**: Depends on foundational tooling and the same alert/incident schema; should be independently testable
- **User Story 3 (P3)**: Depends on the same foundational model and strategy infrastructure; should be independently testable

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel.
- All Foundational tasks marked [P] can run in parallel.
- Test tasks for a story marked [P] can run in parallel with each other.
- Models and tool-layer tasks for the same story can proceed in parallel when keyed through the shared store interfaces.
- The arena and strategy tasks are parallelizable once the shared contract and store are complete.

---

## Parallel Example: User Story 1

```bash
# Launch the user-story-1 validation tasks in parallel once setup and foundational work are complete
Task: "Add failing unit tests for the seeded store and trace formatting in tests/store.test.ts and tests/trace-format.test.ts"
Task: "Implement the model factory in src/agents/model.ts"
Task: "Implement the mock tool layer in src/agents/tools.ts"
Task: "Implement the ReAct strategy in src/agents/react.ts"
Task: "Implement the arena CLI in src/arena.ts"
```

---

## Implementation Strategy

- Use the MVP-first approach: complete the strategy comparison and output format before expanding into the incident and planner edge cases.
- Build the shared validation and trace infrastructure before story-specific logic so the later stories remain consistent and testable.
- Keep each user story independently runnable through the seeded mock data and local deterministic tests so the feature can be demonstrated as a sequence of complete increments.

## Validation Summary

- All tasks follow the required checklist format: `- [x] T### ...`
- Each task includes a file path and, where applicable, the proper `[US1]`, `[US2]`, or `[US3]` story label
- Task ordering respects the dependency chain: setup → foundational → story phases → polish
- The generated task list is immediately executable by an implementation agent without additional context
