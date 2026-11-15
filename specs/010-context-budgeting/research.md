# Research: Context Budgeting

## Decision: Section budgets are enforced independently with protected content

**Decision**: The prompt builder will treat `system` and `messages` as protected sections and enforce a separate budget for `summary`, `window`, and `memory` using environment variables in the `CONTEXT_BUDGET_*` family.

**Rationale**: The requirement explicitly states that these sections are the primary sources of prompt context and that system instructions plus user messages must remain intact to preserve safety and continuity. A per-section strategy is more predictable than a single global budget because it keeps the prompt useful while still respecting operational limits.

**Alternatives considered**:
- Single total prompt limit: rejected because it would not guarantee that critical sections remain available and would make pruning order harder to reason about.
- Budgeting only by total tokens: rejected because it would not support explicit goals for summary, recent messages, and memory relevance.

## Decision: Pruning order is summary -> window -> memory

**Decision**: When the prompt exceeds one or more caps, the system trims in the order `summary`, then `window`, then `memory`.

**Rationale**: The feature specification defines this order as the expected governance rule and the test requirement is explicit: low-budgets must cut in the correct order. This preserves the most recent conversation context and the most valuable memories while keeping the summary compact.

**Alternatives considered**:
- Memory-first pruning: rejected because it risks losing the most recent context and the most important operational narrative.
- Randomized or round-robin pruning: rejected because it is nondeterministic and harms auditability.

## Decision: Deterministic tie-breaking is required

**Decision**: When items within a section are equally eligible for pruning, the system uses stable ordering: oldest messages are removed first for the window, and lower-score memory items are removed first for memory; in ties, preserve insertion order or other deterministic ordering.

**Rationale**: Determinism is critical to testability and operational trust. Repeated runs under the same input and budget must produce the same result.

**Alternatives considered**:
- Hash-based or random ordering: rejected because it makes debugging and regression checks unreliable.
- Reordering by newest-first in all cases: rejected because the requirement clearly states a specific older-first rule for the window and lower-score-first rule for memory.

## Decision: Environment-based configuration remains the runtime contract

**Decision**: The project will use environment variables such as `CONTEXT_BUDGET_SUMMARY`, `CONTEXT_BUDGET_WINDOW`, and `CONTEXT_BUDGET_MEMORY` as the configuration source for per-section caps.

**Rationale**: This matches the requirement and keeps operational tuning outside code changes. It also supports easier testing with intentionally low budgets.

**Alternatives considered**:
- Hardcoded budgets in code: rejected because it prevents operational tuning and makes testing harder.
- A single global `CONTEXT_BUDGET` setting: rejected because it cannot express the section-specific needs of summary, recent messages, and memory.
