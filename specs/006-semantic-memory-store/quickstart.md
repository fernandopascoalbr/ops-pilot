# Quickstart: Semantic Memory Validation

## Prerequisites

- Node.js LTS installed
- Dependencies installed via `npm install`
- A writable SQLite location or default `./data/opspilot.db` from `OPSPILOT_DB`

## Setup

1. Ensure the project dependencies are installed.
2. Confirm the database path is available by setting `OPSPILOT_DB` when needed.
3. Run the existing project validation commands for the repository.

## Validation scenarios

### 1. Semantic retrieval without word overlap

- Insert a memory such as: "A conta do cliente está em atraso e precisa de revisão manual."
- Submit a prompt like: "Qual é o estado da cobrança do cliente?"
- Expected result: the memory is recalled and injected before the response generation step.

### 2. Deduplication threshold

- Insert a fact that is nearly identical to an existing fact for the same user.
- Expected result: the duplicate is rejected because the similarity score exceeds `0.92`.

### 3. User isolation

- Persist one memory for `user-1` and another for `user-2`.
- Query each user’s memory store separately.
- Expected result: each user only sees their own memory set and no cross-user leakage occurs.

### 4. Forget path

- Save two memories for the same user.
- Delete one by `id`.
- Expected result: only the selected memory disappears; the unrelated memory remains available.

### 5. Low-score suppression (noise control)

- Save memories for the same user with topics unrelated to the query.
- Submit a query whose semantic score should stay below `0.3` for those unrelated memories.
- Expected result: unrelated memories are not injected into the prompt and `memoryRecallCount` remains `0` (or only includes items above threshold).

## Commands

```bash
npm test
npm run typecheck
```

The implementation should add focused tests covering the scenarios above before finalizing the feature.
