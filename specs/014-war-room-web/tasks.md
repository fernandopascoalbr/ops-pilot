# Tasks: War Room Web

**Input**: Design documents from `/specs/014-war-room-web/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the web app shell and shared design foundation for the war room.

- [ ] T001 Create Vite + React + TypeScript app structure in `web/`, `web/src/`, `web/public/`, and `web/index.html` per the implementation plan
- [ ] T002 Initialize the app entry point and root rendering in `web/src/main.tsx` and `web/src/app/App.tsx`
- [ ] T003 [P] Add shared design tokens and theme variables in `web/src/styles/tokens.css` and `web/src/styles/dark.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the shared client contracts, state model, and base UI shell needed before story work begins.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel.

- [ ] T004 [P] Create the typed API client and configuration layer in `web/src/services/api.ts` and `web/src/services/config.ts` for base URL composition and `POST /chat` requests
- [ ] T005 [P] Define the shared domain models for messages, traces, decision cards, and error states in `web/src/types/chat.ts`, `web/src/types/trace.ts`, `web/src/types/decision.ts`, and `web/src/features/war-room/states.ts`
- [ ] T006 Create the war room application shell and provider wiring in `web/src/features/war-room/war-room-page.tsx` and `web/src/app/providers/`
- [ ] T007 Implement the client state machine for empty, loading, success, and error flows in `web/src/features/war-room/use-war-room.ts`
- [ ] T008 [P] Add accessibility defaults for focus visibility and readable semantics in `web/src/styles/accessibility.css` and `web/src/components/*`

---

## Phase 3: User Story 1 - Active incident coordination in the war room (Priority: P1) 🎯 MVP

**Goal**: Let responders send prompts and receive contextual operational responses in a dedicated chat flow.

**Independent Test**: Open the war room, send a prompt, and verify the UI renders the response, message timeline, and current operational context without leaving the page.

### Implementation for User Story 1

- [ ] T009 [P] [US1] Build the chat composer, message feed, and assistant message rendering in `web/src/components/chat/`
- [ ] T010 [US1] Implement send-message behavior and `POST /chat` integration in `web/src/features/war-room/use-war-room.ts` and `web/src/services/api.ts`
- [ ] T011 [US1] Render answer summaries, metrics, and message ordering in `web/src/components/chat/*` and `web/src/features/war-room/war-room-page.tsx`
- [ ] T012 [US1] Handle success, empty-state, and retry behavior for the active conversation in `web/src/features/war-room/use-war-room.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional and independently testable.

---

## Phase 4: User Story 2 - Review the decision logic before approving or rejecting (Priority: P1)

**Goal**: Provide a review-and-decision card for every recommended action with trace visibility and explicit approve/reject status.

**Independent Test**: Open a decision card, inspect its reasoning trace, and confirm the card moves to `approved` or `rejected` without ambiguity.

### Implementation for User Story 2

- [ ] T013 [P] [US2] Create the decision card and trace panel components in `web/src/components/decision-card/*` and `web/src/components/trace-panel/*`
- [ ] T014 [US2] Wire the decision review flow to open the reasoning trace and update the card status in `web/src/features/war-room/war-room-page.tsx`
- [ ] T015 [US2] Persist decision state transitions (`pending -> approved`, `pending -> rejected`) in `web/src/features/war-room/states.ts` and `web/src/types/decision.ts`

**Checkpoint**: At this point, User Stories 1 and 2 should both work independently.

---

## Phase 5: User Story 3 - Configure backend connectivity and resilience for the browser app (Priority: P2)

**Goal**: Allow the operator to set the backend base URL and recover cleanly from connectivity, timeout, and CORS issues.

**Independent Test**: Change the backend URL from the gear control, retry the request, and verify the app surfaces the right error or recovery guidance when the backend is unreachable or blocked.

### Implementation for User Story 3

- [ ] T016 [P] [US3] Add the settings gear UI and API base URL form in `web/src/components/settings/`
- [ ] T017 [US3] Persist the backend base URL and theme choice in local storage and validate `baseUrl` and `chatPath` in `web/src/services/config.ts`
- [ ] T018 [US3] Implement network, timeout, and CORS recovery messaging and retry guidance in `web/src/services/api.ts` and `web/src/features/war-room/use-war-room.ts`

**Checkpoint**: At this point, the war room can be connected to the correct operational API environment and fails safely when misconfigured.

---

## Phase 6: User Story 4 - Use a consistent interface across light and dark modes (Priority: P3)

**Goal**: Ensure the war room remains legible, comfortable, and accessible across themes and user inputs.

**Independent Test**: Toggle light and dark mode, navigate by keyboard, and confirm focus states, contrast, and labels remain visible and understandable.

### Implementation for User Story 4

- [ ] T019 [P] [US4] Update dark mode tokens and component contrast rules in `web/src/styles/dark.css` and `web/src/styles/tokens.css`
- [ ] T020 [US4] Ensure accessible keyboard navigation, aria labels, and visible focus styles in `web/src/components/*` and `web/src/styles/accessibility.css`
- [ ] T021 [US4] Verify empty/error, retry, and decision states remain screen-reader friendly and visually consistent in `web/src/features/war-room/*`

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and quality pass before release.

- [ ] T022 [P] Update the feature validation notes and quickstart instructions in `specs/014-war-room-web/quickstart.md`
- [ ] T023 Run the final quickstart smoke validation and confirm the API contract remains aligned with the UI expectations in `specs/014-war-room-web/contracts/war-room-ui.contract.yaml` and `web/src/services/api.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies; can start immediately.
- **Foundational (Phase 2)**: depends on Setup completion and blocks all user stories.
- **User Story phases (3-6)**: depend on Phase 2 completion and can proceed in priority order or in parallel with team capacity.
- **Polish (Phase 7)**: depends on all desired story work being complete.

### User Story Dependencies

- **User Story 1 (P1)**: can start after Phase 2; no dependency on other stories.
- **User Story 2 (P1)**: can start after Phase 2 and may reuse the same session state as US1.
- **User Story 3 (P2)**: can start after Phase 2 and is independent from the chat flow once the client contract is stabilized.
- **User Story 4 (P3)**: can start after Phase 2 and can be completed in parallel with the earlier stories once core components exist.

### Parallel Opportunities

- All setup tasks marked `[P]` can run in parallel.
- All foundational tasks marked `[P]` can run in parallel after the app shell is scaffolded.
- Story 1 and Story 2 tasks can be advanced together once the shared state model exists.
- The settings/config UI and the dark-mode/accessibility work are independent from the main workflow implementation and can be parallelized when the base components are ready.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup (Phase 1)
2. Complete Foundational (Phase 2)
3. Complete User Story 1 (Phase 3)
4. Validate the story end-to-end through the war room flow
5. Stop and confirm the chat-first experience is stable before expanding to the decision and configuration stories

### Incremental Delivery

1. Complete foundation and shared client contracts
2. Add User Story 1 to deliver the core incident chat experience
3. Add User Story 2 for trace review and approval gateway
4. Add User Story 3 for remote configuration and recovery UX
5. Add User Story 4 for theme consistency and accessibility improvements
6. Finish with polish and final contract validation

## Notes

- `[P]` tasks represent files or workstreams that can be developed independently without blocking the same implementation path.
- Each user story is structured to be independently testable and reviewable.
- File paths are intentionally exact so the implementation can be delegated without additional context.
- The generated task list matches the available design artifacts and respects the repository constitution: safety-first operational behavior, explicit evidence, and testability.
