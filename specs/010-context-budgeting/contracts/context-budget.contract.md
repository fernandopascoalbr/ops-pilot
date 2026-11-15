# Internal Contract: Context Budgeting

This contract describes the internal runtime behavior of the prompt builder, not a public REST API. The contract is consumed by the OpsPilot orchestration layer and validated in unit tests.

## Inputs

The prompt builder consumes a set of named sections before final assembly:

- `system`: protected instructions
- `messages`: protected user/assistant exchange history or current request
- `summary`: summarized content with a configurable cap
- `window`: recent conversation history with a configurable cap
- `memory`: recall items with a configurable cap

Each section is associated with a configured maximum and a deterministic trimming rule.

## Budget Rules

1. `system` and `messages` are never truncated by ordinary budget logic.
2. `summary` cap is controlled by the effective `CONTEXT_BUDGET_SUMMARY` value.
3. `window` cap is controlled by the effective `CONTEXT_BUDGET_WINDOW` value and trims oldest entries first.
4. `memory` cap is controlled by the effective `CONTEXT_BUDGET_MEMORY` value and trims lowest-score entries first.
5. When multiple sections exceed the configured caps, the system trims in the order `summary`, `window`, then `memory`.

## Outputs

The builder returns the final prompt assembly and a compact audit trail describing what was retained or trimmed. The audit trail is not meant to be user-facing but must be available for debugging and test validation.

## Acceptance Conditions

- The final prompt respects each configured cap for non-protected sections.
- Protected sections remain intact even when other sections are pruned.
- Repeated runs with equivalent input produce identical trimming decisions.
- The audit trail reflects the pruning order and the final post-trim totals.
