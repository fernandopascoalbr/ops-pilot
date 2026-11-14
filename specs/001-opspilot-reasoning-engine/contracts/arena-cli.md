# CLI Contract: Strategy Arena

## Purpose
The arena is the command entry point for evaluating one or more reasoning strategies against the same incident input.

## Command

```bash
tsx src/arena.ts --strategies react,plan-and-execute --max-iterations 8
```

## Inputs

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `--strategies` | string | Yes | Comma-separated strategy names to run |
| `--max-iterations` | integer | No | Maximum allowed reasoning or tool iterations per strategy |
| `--input` | string | No | Incident description or prompt used by the strategies |

## Behavior
- The arena must run each selected strategy against the same input.
- Each strategy returns `answer`, `trace`, and `metrics` in a comparable structure.
- The output must clearly print the strategy name, final answer, structured trace, and metric summary.
- If the configured interaction limit is met, the strategy ends cleanly and includes the remaining trace as evidence.

## Output Contract
The output is human-readable for CLI use and includes:
- strategy name
- final result text
- ordered trace events
- LLM call count
- latency in milliseconds

## Validation Rules
- `--strategies` must contain at least one valid strategy identifier.
- `--max-iterations` must be a positive integer.
- Invalid tool inputs or empty prompts must fail gracefully without crashing the arena.
