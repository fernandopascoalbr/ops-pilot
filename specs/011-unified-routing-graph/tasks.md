# Tasks: Unified Routing Graph

**Input**: Design documents from `/specs/011-unified-routing-graph/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the routing graph scaffolding and the shared contracts needed for route decisions and trace metadata.

- [X] T001 Create route decision scaffolding in `src/agents/production-graph.ts` and `tests/unit/agents/route.test.ts`
- [X] T002 [P] Add route/response serialization hooks in `src/http/server.ts` for structured `route` and `reason` output
- [X] T003 [P] Extend trace utilities in `src/agents/trace.ts` to support the `node` and `route` fields required by the unified flow

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the shared route contract and the core decision flow before any story-specific work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Implement the structured route decision model in `src/agents/types.ts`, including the fields `route`, `reason`, and the validation rule that route decisions must be explicit and explainable
- [X] T005 [P] Implement router resolution and strategy selection in `src/agents/index.ts` so the selected route is computed once and reused throughout the execution path
- [X] T006 [P] Update the trace event contract in `src/agents/trace.ts` so every event supports `node` and `route` and preserves the active node through execution

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Route the incident through a single decision graph (Priority: P1) 🎯 MVP

**Goal**: Deliver one unified graph that decides both the route and the strategy before the response is produced.

**Independent Test**: Submit a representative request and verify that the response includes one explicit `route`, a human-readable `reason`, and the correct strategy path in the flow.

### Implementation for User Story 1

- [X] T007 [P] [US1] Implement the unified production graph in `src/agents/production-graph.ts` that flows `context -> router -> strategy -> response` with one route decision at the center
- [X] T008 [US1] Wire the unified graph into the `/chat` response path in `src/http/server.ts` so successful requests return `answer`, `route`, and `reason` in the same payload
- [X] T009 [US1] Update the strategy registry and response flow in `src/agents/index.ts` so a selected route becomes the active branch for `react`, `plan-and-execute`, and `reflect-plan-and-execute`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Operators understand why a route was chosen (Priority: P2)

**Goal**: Surface route explanations in the user-visible response and prompt-level summary without forcing operators to inspect internals.

**Independent Test**: Send a chat request and confirm the output includes a route and a clear explanation that matches the active decision factors.

### Implementation for User Story 2

- [X] T010 [P] [US2] Add prompt-level route summary generation in `src/context/context-builder.ts` or `src/http/server.ts` so the chosen route and reason remain visible alongside the operational context
- [X] T011 [US2] Ensure the final chat response contract in `src/http/server.ts` preserves the `route` and `reason` fields exactly as returned by the router and never drops them during serialization
- [X] T012 [US2] Add an integration assertion in `tests/integration/chat-success.test.ts` verifying that a supported chat flow returns structured `route` and `reason` in the JSON response

**Checkpoint**: At this point, User Story 1 and 2 should both work independently

---

## Phase 5: User Story 3 - Trace data shows the real path of the decision (Priority: P3)

**Goal**: Ensure the execution trace proves what node was active and which route was selected at every step.

**Independent Test**: Inspect the trace for a request and verify that every relevant event includes both the current `node` and the active `route` selected by the router.

### Implementation for User Story 3

- [X] T013 [P] [US3] Update the strategy execution flows in `src/agents/react.ts`, `src/agents/plan-and-execute.ts`, and `src/agents/reflect-plan-and-execute.ts` so each step emits the active `node` and `route`
- [X] T014 [US3] Add trace validation in `tests/integration/chat-persistence.test.ts` (or the most relevant existing route test file) to assert that `trace[].node` and `trace[].route` are present when the route is selected
- [X] T015 [US3] Update the public contract in `specs/011-unified-routing-graph/contracts/chat-routing.contract.yaml` to include `route`, `reason`, and `node` requirements for the trace and response schema

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Harden ambiguous routing, document the final behavior, and validate the unified flow end-to-end.

- [X] T016 [P] Tighten low-confidence handling in `src/agents/production-graph.ts` and `src/agents/index.ts` so ambiguous cases surface uncertainty rather than silently forcing a route
- [X] T017 [P] Update the operational overview in `README.md` to describe the unified route/strategy graph and the new structured response contract
- [X] T018 Run focused validation against the unified routing flow in `tests/integration/chat-success.test.ts`, `tests/integration/chat-memory.test.ts`, and the relevant trace assertions in `tests/integration/chat-persistence.test.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+, 4, 5)**: Depend on the Foundational phase and can then proceed in priority order
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 and delivers the MVP
- **US2 (P2)**: Can start after Phase 2 and should be independently testable without depending on US1 implementation details
- **US3 (P3)**: Can start after Phase 2 and should validate the trace auditability independently of the user-facing route output

### Parallel Opportunities

- Phase 1: T002 and T003 can run in parallel
- Phase 2: T005 and T006 can run in parallel after T004
- US1: T007 and T009 can run in parallel, with T008 as the final integration step
- US2: T010 and T012 can run in parallel once the prompt summary path is stable
- US3: T013 and T015 can run in parallel, with T014 validating the final trace behavior
- Phase 6: T016 and T017 can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2
2. Complete the unified route/strategy flow in US1
3. Validate the route and reason are returned in a single response for a representative request
4. Stop and confirm the operational flow is correct before expanding to US2 and US3

### Incremental Delivery

1. Setup + Foundational
2. US1: route and strategy graph
3. US2: route explanation and visible rationale
4. US3: trace node/route auditability
5. Final polish and validation

### Parallel Team Strategy

1. One engineer handles the route contract and graph construction
2. One engineer handles the HTTP serialization and operator-facing summary
3. One engineer handles trace auditability and contract validation
4. Final integration and polish run after all story work is complete

---

## Notes

- All tasks follow the required checklist format: `- [X] T### ...`
- Story labels are used only in user-story phases (`[US1]`, `[US2]`, `[US3]`)
- Every task includes an exact file path or folder path in the description
- The implementation intentionally keeps story boundaries independent so each story can be validated without depending on the others
