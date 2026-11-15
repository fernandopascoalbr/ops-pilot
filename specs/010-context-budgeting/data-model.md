# Data Model: Context Budgeting

## Entity: PromptBudgetConfig

Represents the operational cap for each prompt section.

| Field | Type | Description | Constraints |
|---|---|---|---|
| sectionName | string | Logical section in the final prompt | Required; values include `system`, `messages`, `summary`, `window`, `memory` |
| maxItems | integer | Maximum number of items or tokens allowed for that section | Required; `>= 0` |
| protected | boolean | Whether the section is exempt from trimming | Required |
| source | string | Configuration origin for the current cap | Required; typically `env` |

## Entity: PromptSection

Represents one slice of the composed prompt before final assembly.

| Field | Type | Description | Constraints |
|---|---|---|---|
| name | string | Section name | Required; stable values across runs |
| items | array | Stored content for the section | Required; may be empty |
| budget | integer | Active budget for the section | Required; `>= 0` |
| protected | boolean | Whether the section must retain all content | Required |

## Entity: ConversationWindowEntry

Represents one recent message or interaction in the windowed history.

| Field | Type | Description | Constraints |
|---|---|---|---|
| id | string | Stable identifier for the entry | Required |
| timestamp | string | Time or sequence value used for recency ordering | Required |
| content | string | Message body or associated context | Required |
| isRecent | boolean | Marks the current, most recent segment of the conversation | Optional |

## Entity: MemoryItem

Represents one recalled memory or fact eligible for retrieval in context.

| Field | Type | Description | Constraints |
|---|---|---|---|
| id | string | Stable identifier for the item | Required |
| score | number | Relevance or usefulness score | Required; numeric `>= 0` |
| content | string | Stored memory content | Required |
| source | string | Originating source or domain context | Optional |

## Entity: PromptBudgetDecision

Records the pruning decision applied to a section when the section exceeds its budget.

| Field | Type | Description | Constraints |
|---|---|---|---|
| sectionName | string | Section trimmed during build | Required |
| removedCount | integer | Number of items removed | Required; `>= 0` |
| keepPolicy | string | Rule used for selection | Required; values include `protected`, `oldestFirst`, `lowestScoreFirst` |
| orderIndex | integer | Position of this trimming step in the overall pruning order | Required; `>= 0` |

## Relationships

- A `PromptBudgetConfig` can map to one or more `PromptSection` instances.
- A `PromptSection` is composed of `ConversationWindowEntry` items, `MemoryItem` items, or a summary payload depending on its section type.
- A `PromptBudgetDecision` is emitted for every pruned section during prompt assembly.
- The final prompt is a composition of protected and trimmed sections, with a deterministic order across the assembled result.

## Validation Rules

- `system` and `messages` sections must remain protected and never be trimmed by the normal section budget logic.
- `summary`, `window`, and `memory` budgets must be enforced independently and cannot exceed their configured environment values.
- The pruning order across sections must be deterministic: `summary`, then `window`, then `memory`.
- Detailed tie-breaking must be stable: conversation trimming uses oldest-first order; memory trimming uses lowest-score-first order.
- A prompt is valid only when all non-protected sections are within their configured budgets after assembly.

## State Transitions

1. Prompt sections are initialized from system instructions, user messages, summary, recent history, and memory recall.
2. Section budgets are loaded from environment variables and validated.
3. Protected sections are retained; the non-protected sections are evaluated against their limits.
4. Each over-budget section is pruned according to the applicable policy.
5. The final prompt is assembled and returned for model use with the trimmed sections reported for auditability.
