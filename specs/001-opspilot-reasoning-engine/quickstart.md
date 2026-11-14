# Quickstart: OpsPilot Reasoning Engine

## Prerequisites
- Node.js LTS
- npm dependencies installed for the repository
- Optional environment variables for OpenRouter: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`

## 1. Install dependencies

```bash
npm install
```

## 2. Seed the mock operational store

```bash
tsx scripts/seed-alerts.ts
```

This initializes the default in-memory inventory with 5 services and 6 alerts (3 firing, 3 resolved), which is the baseline for strategy evaluation and deterministic testing.

## 3. Run the strategy arena

```bash
tsx src/arena.ts --strategies react,plan-and-execute --max-iterations 8 --input "Investigate the high-priority alert in the payments service"
```

Expected outcome: the CLI prints the result from each strategy, the reasoning trace, and the metrics summary.

## 4. Run deterministic tests

```bash
node --test
```

Expected outcome: the mock store behavior and trace formatting pass without requiring external network calls.

## 5. Optional local environment configuration

```bash
export OPENROUTER_API_KEY="your-key"
export OPENROUTER_MODEL="openai/gpt-4o-mini"
```

When credentials are present, the model factory can initialize the external provider; when absent, the local deterministic tests continue to validate the feature without network access.
