# Data Model: Semantic Memory Store

## Entity: Memory

Represents a single remembered fact associated with a user.

| Field | Type | Description | Constraints |
| --- | --- | --- | --- |
| `id` | string | Unique memory identifier | Required, immutable, generated with `randomUUID`-style value |
| `user_id` | string | User/account owner for the memory | Required, used to isolate recall and deduplication |
| `fact` | string | Human-readable fact to remember | Required, trimmed, non-empty |
| `embedding` | blob | Vector representation of the fact | Required, stored as binary value in SQLite |
| `created_at` | string | ISO-8601 timestamp | Required, set when memory is first inserted |

### Validation rules

- A memory cannot be saved without a non-empty `user_id` and `fact`.
- Embedding storage must be binary-safe and compatible with the chosen local transformer model output.
- Deduplication compares only memories from the same `user_id` to avoid cross-user contamination.
- `forget` only deletes by `id` and does not alter other stored facts.

## Relationships

- One user has many memories.
- One memory belongs to exactly one user.
- Recall is a read-only projection derived from memory rows and their similarity score against the current prompt.

## State transitions

1. `new` memory received from chat or external input.
2. `embedded` after generating vector representation.
3. `validated` when deduplication and schema checks pass.
4. `stored` after insert into `memories`.
5. `recalled` when the embedding search returns the top-3 relevant entries for a user.
6. `forgotten` when a memory row is explicitly deleted by `id`.

## Notes

The model should treat the `embedding` column as a local, opaque vector value. The application can store a raw BLOB or serialized float array depending on the transformer output contract, as long as the retrieval path uses the same normalization and similarity method consistently.
