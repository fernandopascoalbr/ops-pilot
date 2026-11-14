# Implementation Plan: Semantic Memory Store

**Branch**: `006-semantic-memory-store` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from [spec.md](./spec.md)

## Summary

Add a user-scoped semantic memory layer to the existing chat flow so the agent can remember important facts, deduplicate similar inputs, recall the three most relevant facts by similarity, and forget specific entries without affecting other users. The implementation fits the repository’s current structure: SQLite-backed operational state, bounded HTTP chat processing, and a dedicated memory module for embeddings and retrieval.

## Technical Context

**Language/Version**: Node.js LTS with TypeScript ESM and `strict` mode enabled.

**Primary Dependencies**: `@huggingface/transformers`, `node:sqlite`, `zod`, and the current strategy-based chat runtime.

**Storage**: SQLite via `OPSPILOT_DB` (default `./data/opspilot.db`), with `memories` storing `id`, `user_id`, `fact`, `embedding`, and `created_at`.

**Testing**: `node:test` + `tsx` using the repo’s existing `npm test` command and focused memory tests.

**Target Platform**: Local server and CLI runtime for OpsPilot chat operations.

**Project Type**: Web-service with local persistence and conversational user flow.

**Performance Goals**: Return the top 3 relevant memories per query while keeping prompt injection bounded and preserving the existing chat timeout constraints.

**Constraints**: User data must remain isolated by `userId`; memory injection must be optional and no more than a context hint; semantic deduplication must remain above the configured threshold.

**Scale/Scope**: Single-tenant memory store per user with local vector storage, top-3 retrieval, delete-by-id semantics, and a minimal but testable semantic match workflow.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Pass: The feature follows the repository’s spec-first workflow and keeps the design grounded in the feature specification.
- Pass: User isolation and explicit delete semantics protect the system from unintended cross-user leakage.
- Pass: The design uses local SQLite persistence, which matches the repository’s constitutional requirement for operational state and auditable storage.
- Pass: The feature adds focused tests for semantic recall, deduplication, user isolation, and forget behavior, meeting the quality and testability requirement.
- Pass: No override or exception is needed; the feature remains consistent with the safety and evidence-driven principles in the constitution.

## Project Structure

### Documentation (this feature)

```text
specs/006-semantic-memory-store/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
├── checklists/          # Quality validation artifacts
├── spec.md              # Original feature specification
└── tasks.md             # Phase 2 output (not created here)
```

### Source Code (repository root)

```text
src/
├── chat/
│   ├── conversation-store.ts
│   ├── index.ts
│   └── sqlite-conversation-store.ts
├── http/
│   ├── chat-schema.ts
│   ├── index.ts
│   └── server.ts
├── memory/
│   ├── embeddings.ts
│   └── memory-store.ts
├── store/
│   ├── index.ts
│   ├── in-memory-ops-store.ts
│   └── sqlite-ops-store.ts
├── agents/
├── config/
├── domain/
├── infra/
└── index.ts

tests/
├── integration/
├── unit/
└── memory/
```

**Structure Decision**: The feature will keep the chat HTTP contract in `src/http/`, use the current SQLite access patterns from `src/chat/` and `src/store/`, and introduce a dedicated `src/memory/` module for embedding generation and per-user memory persistence. This is the smallest architecture change that preserves the repository’s current boundaries and keeps the system testable.

## Complexity Tracking

No constitution violations require explicit complexity tracking for this feature.
