# Tasks: Semantic Memory Store

**Input**: Design documents from `/specs/006-semantic-memory-store/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the memory module and validation scaffolding used by all user stories

- [x] T001 Create `src/memory/` directory and initialize the `src/memory/embeddings.ts` and `src/memory/memory-store.ts` entry points per the implementation plan in `src/memory/`
- [x] T002 [P] Add the memory test scaffolding in `tests/unit/memory-store.test.ts` and `tests/integration/chat-memory.test.ts` for semantic deduplication, retrieval, and `/chat` injection
- [x] T003 [P] Confirm the SQLite operational persistence contract in `src/store/sqlite-ops-store.ts` and align the new `memories` table with the repository’s `OPSPILOT_DB` pattern from `src/chat/sqlite-conversation-store.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the reusable memory primitives before user story implementation begins

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Implement the embedding factory and lazy singleton in `src/memory/embeddings.ts` using `@huggingface/transformers` with mean pooling and normalized vectors
- [x] T005 Implement the SQLite schema and CRUD operations in `src/memory/memory-store.ts` for the columns `id`, `user_id`, `fact`, `embedding`, and `created_at`
- [x] T006 [P] Add validation helpers in `src/memory/memory-store.ts` to reject empty `user_id` or `fact`, ensure `embedding` values are binary-safe, and preserve the per-user isolation rule
- [x] T007 [P] Add the semantic similarity helpers in `src/memory/memory-store.ts` for the deduplication threshold (0.92) and recall threshold (0.3), using the same embedding pipeline in `src/memory/embeddings.ts`
- [x] T008 Create the memory import/export boundary in `src/memory/index.ts` (if needed) and wire the module into the project’s existing `src/` conventions without introducing a new persistence engine

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Remember facts per user (Priority: P1) 🎯 MVP

**Goal**: Store important facts for each user and deduplicate near-duplicate entries before they are persisted.

**Independent Test**: A user can save a fact, save a semantically equivalent variation, and the system rejects the duplicate while keeping the original record in the `memories` table.

### Tests for User Story 1

- [x] T009 [P] [US1] Write the fail-first deduplication test in `tests/unit/memory-store.test.ts` for the rule: reject insertions with similarity above `0.92` for the same `user_id`
- [x] T010 [P] [US1] Write the fail-first storage test in `tests/unit/memory-store.test.ts` asserting the table stores `id`, `user_id`, `fact`, `embedding`, and `created_at` columns

### Implementation for User Story 1

- [x] T011 [P] [US1] Implement `remember` in `src/memory/memory-store.ts` to insert a new memory with the exact schema and timestamp requirements from `data-model.md`
- [x] T012 [US1] Implement the user-scoped deduplication guard in `src/memory/memory-store.ts` so each `user_id` only retains semantically unique facts above the required threshold
- [x] T013 [US1] Add the DB-level insertion logic in `src/memory/memory-store.ts` to persist the embedding as a BLOB and preserve the `created_at` column as an ISO-8601 timestamp

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Recall the top three relevant memories (Priority: P1)

**Goal**: Return the most relevant memories by semantic similarity without requiring overlapping words.

**Independent Test**: A user query like “Qual é o estado da cobrança do cliente?” finds a stored fact with different wording but strong semantic similarity, while returning no more than three records above the threshold.

### Tests for User Story 2

- [x] T014 [P] [US2] Write the fail-first recall test in `tests/unit/memory-store.test.ts` to assert that a fact is found even when there are no shared words between the input and stored fact
- [x] T015 [P] [US2] Write the fail-first threshold test in `tests/unit/memory-store.test.ts` to verify only the top three results above `0.3` are returned for a given `user_id`

### Implementation for User Story 2

- [x] T016 [P] [US2] Implement `recall` in `src/memory/memory-store.ts` to query by `user_id`, compute similarity using the embedding vectors, and keep only the top-3 results above the minimum score of `0.3`
- [x] T017 [US2] Ensure the `recall` flow uses the exact same normalized embedding representation created by `src/memory/embeddings.ts` so that semantic closeness is consistent across save and lookup
- [x] T018 [US2] Add the memory-context composition logic in `src/http/server.ts` to inject recall results into the prompt before calling the strategy, while preserving the usual conversation history behavior

**Checkpoint**: At this point, User Stories 1 and 2 should both work independently and with clear semantic recall behavior

---

## Phase 5: User Story 3 - Forget and isolate memory by user (Priority: P2)

**Goal**: Remove a specific memory for a user without affecting the rest of that user’s history or other users’ data.

**Independent Test**: A user can delete one memory by `id`; the rest of their memories remain accessible and no other user’s facts are exposed or removed.

### Tests for User Story 3

- [x] T019 [P] [US3] Write the fail-first forget test in `tests/unit/memory-store.test.ts` confirming that deleting one memory by `id` leaves unrelated memories intact
- [x] T020 [P] [US3] Write the fail-first isolation test in `tests/integration/chat-memory.test.ts` verifying that `user_id` scoping blocks cross-user memory leakage in `/chat`

### Implementation for User Story 3

- [x] T021 [P] [US3] Implement `forget` in `src/memory/memory-store.ts` to delete only the memory row identified by `id` and keep the remainder of the user’s memories untouched
- [x] T022 [US3] Update the HTTP contract in `src/http/chat-schema.ts` to accept the optional `userId` field and validate it as a non-empty string before memory recall is triggered
- [x] T023 [US3] Extend `processChatRequest` in `src/http/server.ts` to use `userId` for memory recall and ensure the prompt injection path fails safely when no relevant memory exists

**Checkpoint**: At this point, the memory feature is independently usable for a single user and isolated across users

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, and integration verification across the feature

- [x] T024 [P] Run the focused test suite for the semantic memory feature in `tests/unit/memory-store.test.ts` and `tests/integration/chat-memory.test.ts` before merge
- [x] T025 [P] Verify the `/chat` request schema and response semantics in `src/http/chat-schema.ts` and `src/http/server.ts` remain compatible with existing chat behavior for users without `userId`
- [x] T026 Review the implementation for repository compliance with the constitution: SQLite operational persistence, boundary validation, and test coverage for new behavior in `src/memory/` and `src/http/`
- [x] T027 [P] Update or add any validation guide text in `specs/006-semantic-memory-store/quickstart.md` if the implementation reveals new operational assumptions or edge cases

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3, 4, 5)**: All depend on Foundational phase completion
  - User Story 1 (P1) is the MVP and should ship first
  - User Story 2 (P1) extends the same memory layer and can run in parallel with Story 1 once foundational work is done
  - User Story 3 (P2) depends on the core recall and store logic but can be completed independently after the core flow is working
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - no dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational; should be implemented against the same memory store and embedding module created in Phase 2
- **User Story 3 (P2)**: Can start after Foundational and the core memory store is stable; it depends on the same underlying store behavior but remains independently testable

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- The fail-first tests for each story marked [P] can be authored in parallel once the core module exists
- Story 1 and Story 2 implementations share the same memory core and can proceed in parallel after foundational tasks complete

---

## Parallel Example: User Story 1

```bash
# Launch the story-specific tests together once the memory core exists
Task: "Write fail-first deduplication test in tests/unit/memory-store.test.ts"
Task: "Write fail-first storage test in tests/unit/memory-store.test.ts"

# Launch the story-specific implementation tasks together
Task: "Implement remember in src/memory/memory-store.ts"
Task: "Implement the user-scoped deduplication guard in src/memory/memory-store.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run the memory store tests and confirm deduplication works with a single user
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → foundation ready
2. Add User Story 1 → validate deduplication and persistence
3. Add User Story 2 → validate recall and threshold logic
4. Add User Story 3 → validate forget and isolation
5. Final polish and cross-cutting validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once foundational work is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Final integration checks and quickstart validation happen after story completion

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] labels map each task to the user story it supports for traceability
- Each user story should be independently completable and testable
- Write the relevant tests first and ensure they fail before implementing core logic
- Use the repository’s existing conventions: `node:test`, `tsx`, `zod`, and SQLite-backed persistence in local operational state
- Avoid vague tasks or cross-story dependencies that make the story impossible to validate on its own
