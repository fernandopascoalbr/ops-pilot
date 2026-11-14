# Research: Semantic Memory Store

## Decision: Local semantic memory with SQLite + transformer embeddings

The project will use a dedicated `MemoryStore` and `Embeddings` module to generate embeddings with `@huggingface/transformers`, using mean pooling and vector normalization enabled. The stored embedding will be persisted as a binary value in SQLite, matching the repository’s local operational persistence requirement and keeping the memory model decoupled from the HTTP layer.

### Rationale

- The feature requirement explicitly names `@huggingface/transformers`, coverage for mean pooling, normalized vectors, and a lazy singleton transformer instance, so the implementation should align directly with the requested design rather than introducing an alternate embedding library.
- The codebase already uses SQLite through `node:sqlite` for operational state and `OPSPILOT_DB` for database location, so the memory table should conform to that same persistence standard instead of introducing a second database engine.
- The chat endpoint already composes a recent conversation context before invoking a strategy. Extending this pattern to include a semantic memory recall block is a natural fit and preserves the current architecture’s traceability and bounded execution model.

### Alternatives considered

- Pure string match memory: rejected because it would not satisfy the requirement to recall facts without overlapping words.
- Remote vector service: rejected because the requirement explicitly calls for a local embedding model and the repository prefers local operational persistence and auditable state.
- Per-user memory in a separate file or JSON store: rejected because it would bypass the repository’s SQLite governance and create an inconsistent persistence pattern.

## Decision: Per-user isolation and bounded recall

The memory layer will be keyed by `user_id` and limited to a top-3 recall set using cosine or dot-product similarity, with an explicit minimum threshold of 0.3. The same `user_id` filter will be applied for deduplication, forgotten entries, and context injection.

### Rationale

- The feature requirement explicitly calls out `MemoryStore por userId`, and the repository treats user/workload separation as a core safety boundary.
- Top-3 recall and threshold controls are both specified in the feature description and should become first-class policy constants in the memory service, rather than hidden in the chat route.
- Constraining recall to a bounded set prevents prompt bloat and remains compatible with the existing chat timeout model.
- The minimum score threshold is mandatory to suppress low-signal matches that increase token cost and can inject imprecise or unnecessary context into prompts.

### Alternatives considered

- Global memory without user partitioning: rejected because it would create cross-user leakage and violate the feature’s isolation requirement.
- Unlimited memory recall: rejected because it could cause prompt bloat and degrade both response quality and latency.

## Decision: Semantic deduplication threshold

New facts will be rejected when they exceed the deduplication similarity threshold of 0.92 against an existing memory for the same user.

### Rationale

- The requirement explicitly defines the deduplication rule, which should be treated as a stable product contract rather than a local optimization.
- This threshold ensures the memory layer is conservative about duplicates while still allowing semantically equivalent phrasing to collapse into one fact.

### Alternatives considered

- Fixed exact-text duplicate check only: rejected because it would fail the test case requiring recall from semantically related phrasing.
- A lower threshold for all users: rejected as it would create more false positives and reduce the quality of remembered facts.

## Decision: Forget semantics

`forget` will remove a specific memory row by identifier and will not delete the rest of the user’s memory set.

### Rationale

- This aligns with the requirement for targeted memory deletion while preserving user-specific context integrity.
- The stored schema already includes a unique `id`, making the forget path straightforward and auditable.

### Alternatives considered

- Forget by content match only: rejected because it risks deleting multiple entries with the same wording and creates ambiguity.
- Bulk user-wide cleanup: rejected because it is broader than the requested behavior and could surprise users.

## Decision: Memory recall injected into `/chat`

The `/chat` route will accept an optional `userId` field and, when present, inject the recall results into the prompt before invoking the strategy. This preserves the current conversation path while enabling memory-aware responses without changing the default behavior for users without memory.

### Rationale

- The requirement explicitly states `/chat` gains `userId` and injects recall into the prompt, which is the most natural extension of the current compose-history pattern in the HTTP server.
- Keeping the recall injection close to request processing allows the memory service to remain reusable and simplifies testability.

### Alternatives considered

- Memory retrieval inside the strategy layer only: rejected because the feature specifically requires the HTTP boundary to carry `userId` and inject recall before generation.
- Long-lived memory attached only to conversation identifiers: rejected because it would not meet the user-wide memory requirement and would break isolation by account.
