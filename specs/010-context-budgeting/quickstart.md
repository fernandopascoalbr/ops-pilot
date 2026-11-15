# Quickstart: Context Budget Validation

## Prerequisites

- Node.js LTS
- Project dependencies installed via `npm install`
- Optional: environment values set for the prompt budget test cases

## Validate the default budget behavior

```bash
CONTEXT_BUDGET_SUMMARY=200 CONTEXT_BUDGET_WINDOW=1200 CONTEXT_BUDGET_MEMORY=300 npm test -- --test-name-pattern "context budget"
```

Expected outcome:
- The prompt builder preserves protected sections.
- The summary is reduced to the configured cap when needed.
- The window keeps the newest entries and drops the oldest ones first.
- Memory keeps the highest-scoring items and prunes lower-scoring ones first.

## Validate low-budget pruning order

```bash
CONTEXT_BUDGET_SUMMARY=50 CONTEXT_BUDGET_WINDOW=80 CONTEXT_BUDGET_MEMORY=30 npm test -- --test-name-pattern "low budget ordering"
```

Expected outcome:
- The system trims the summary first.
- If still over budget, it trims the window next.
- If still over budget, it trims memory last.

## Validate deterministic tie handling

```bash
CONTEXT_BUDGET_WINDOW=10 CONTEXT_BUDGET_MEMORY=10 npm test -- --test-name-pattern "deterministic pruning"
```

Expected outcome:
- Messages with the same age are ordered consistently and trimmed predictably.
- Memory items with the same score are removed in a stable order.
- Repeated execution yields the same output under identical inputs.

## Notes

This quickstart is a validation guide for the prompt-budget feature and is intentionally implementation-agnostic; it focuses on proving the correct operational outcome rather than internal code structure.
