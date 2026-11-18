# Tasks: Team Supervisor

**Input**: Design documents from `/specs/015-team-supervision/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the team runtime scaffolding and the test structure for supervisor-led coordination.

- [ ] T001 Create the `src/team/` module skeleton and test folders in `src/team/`, `tests/unit/team/`, and `tests/integration/` for the new team workflow
- [ ] T002 Define the initial team state and session contracts in `src/team/session.ts` and `src/team/blackboard.ts` with the shared `TeamSession` and `BlackboardState` shapes
- [ ] T003 [P] Add trace support for handoff metadata and reasoning output in `src/agents/trace.ts` so `handoff` events can be serialized consistently

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the permission model, structured decision contract, and team route boundary before any user story is implemented.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel.

- [ ] T004 [P] Implement the role-permission matrix and validation rules in `src/team/roles.ts` for `supervisor`, `analyst`, `planner`, and `executor`
- [ ] T005 Implement the supervisor decision flow with `withStructuredOutput({ next, brief })` in `src/team/supervisor.ts` and preserve the decision payload contract
- [ ] T006 Create the handoff event model and trace binding in `src/team/handoff.ts` and `src/team/trace.ts` so transitions are recorded with `from`, `to`, `summary`, and `context`
- [ ] T007 Add the `team` route boundary and request validation in `src/http/routes.ts` to accept the session payload and reject invalid or unauthorized calls
- [ ] T008 [P] Add integration tests covering role gating and team size validation in `tests/integration/team-route.test.ts`

---

## Phase 3: User Story 1 - Coordinated team supervision over a shared state (Priority: P1) 🎯 MVP

**Goal**: Create a shared blackboard and supervisor-led session where the team operates under a single source of truth and role boundaries.

**Independent Test**: Start a team session, assign a supervisor and support roles, and verify that the blackboard is visible, the supervisor can direct the next action, and the analyst remains read-only.

### Implementation for User Story 1

- [ ] T009 [P] [US1] Implement the shared board fields (`objective`, `summary`, `openItems`, `decisionHistory`) and update logic in `src/team/blackboard.ts`
- [ ] T010 [US1] Implement the session lifecycle and enforce the maximum participant cap of `8` in `src/team/session.ts`
- [ ] T011 [US1] Wire the supervisor decision output to the current blackboard state in `src/team/supervisor.ts` so `next` and `brief` reflect the active mission context
- [ ] T012 [US1] Add unit tests for session creation, participant limits, and analyst read-only enforcement in `tests/unit/team/supervisor-session.test.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional and independently testable.

---

## Phase 4: User Story 2 - Handoff visibility in the reasoning trace (Priority: P1)

**Goal**: Ensure every team transition is visible and auditable in the reasoning view without requiring manual reconstruction.

**Independent Test**: Trigger a role transition or workflow handoff, then verify the reasoning trace records the event and shows the `from`/`to` context to the reviewer.

### Implementation for User Story 2

- [ ] T013 [P] [US2] Emit a `handoff` event from `src/team/handoff.ts` and include the event in the trace metadata with `type`, `from`, `to`, `summary`, and `context`
- [ ] T014 [US2] Render the `handoff` event in the reasoning flow and preserve the trace ordering in `src/team/trace.ts` and `src/http/routes.ts`
- [ ] T015 [US2] Add integration tests for trace visibility and reasoning readability in `tests/integration/team-handoff.test.ts`

**Checkpoint**: At this point, User Stories 1 and 2 should both work independently.

---

## Phase 5: User Story 3 - Team mode remains bounded and predictable (Priority: P2)

**Goal**: Enforce protection against role bypasses, feature overreach, and executor actions that do not respect the approved incident workflow.

**Independent Test**: Attempt a planner or analyst mutation, try to exceed the team cap, and validate that the executor only performs approved incident actions inside the guarded flow.

### Implementation for User Story 3

- [ ] T016 [P] [US3] Enforce the maximum team size and reject attempts beyond `8` in `src/team/session.ts` and `src/team/roles.ts`
- [ ] T017 [US3] Prevent planner and analyst bypass attempts and deny direct tool use for non-authorized roles in `src/team/roles.ts` and `src/team/supervisor.ts`
- [ ] T018 [US3] Guard executor incident actions to the approved incident workflow in `src/team/session.ts` and `src/team/blackboard.ts`, with trace-backed validation for each action
- [ ] T019 [US3] Add unit tests for guardrail enforcement and cap violations in `tests/unit/team/guardrails.test.ts`

**Checkpoint**: At this point, the team model remains stable, auditable, and restricted to the intended operational path.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation review, and quality passes across the team workflow.

- [ ] T020 [P] Update the validation guide and operational notes in `specs/015-team-supervision/quickstart.md` to reflect the final team behavior and evidence requirements
- [ ] T021 Run the focused validation pass with `npm test` and `npm run typecheck` to confirm the team contract, role guardrails, and trace behavior remain green
- [ ] T022 Review the contract and implementation boundaries in `specs/015-team-supervision/contracts/team-supervision.contract.yaml` and `src/http/routes.ts` to ensure the `team` route, blackboard, and handoff contract remain aligned

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies; can start immediately.
- **Foundational (Phase 2)**: depends on Setup completion and blocks all user stories.
- **User Story phases (3-5)**: depend on Phase 2 completion and can proceed in priority order or in parallel with team capacity.
- **Polish (Phase 6)**: depends on all desired story work being complete.

### User Story Dependencies

- **User Story 1 (P1)**: can start after Phase 2; no dependency on other stories.
- **User Story 2 (P1)**: can start after Phase 2 and depends on the shared trace model created in the foundation.
- **User Story 3 (P2)**: can start after Phase 2 and depends on the role and session validation rules created in the foundation.

### Parallel Opportunities

- The setup tasks marked `[P]` can run in parallel.
- The foundational tasks for permission matrix, structured output, and route boundary can proceed in parallel once the module skeleton exists.
- User Story 1 work can be parallelized across blackboard state and supervisor decision logic once the shared contracts are ready.
- The handoff tracing and guardrail enforcement tasks can proceed concurrently after the core state model is in place.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup (Phase 1)
2. Complete Foundational (Phase 2)
3. Complete User Story 1 (Phase 3)
4. Validate the blackboard and supervisor flow independently
5. Stop and confirm the team session is stable before extending to handoff and guardrails

### Incremental Delivery

1. Complete the shared team runtime and permission model
2. Add User Story 1 for the supervisor-led blackboard flow
3. Add User Story 2 for handoff trace visibility and reasoning review
4. Add User Story 3 for the bounded operational guardrails and team-size cap
5. Finish with polish and contract validation

## Notes

- `[P]` tasks represent workstreams that can be completed independently without blocking the same file path.
- Each user story remains independently testable and reviewable.
- File paths are intentionally specific so the implementation can be delegated without additional context.
- The generated task list is aligned with the repository constitution: safety-first governance, evidence-driven reasoning, and testability.
