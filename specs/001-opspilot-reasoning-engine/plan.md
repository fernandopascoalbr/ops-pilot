# Implementation Plan: OpsPilot Reasoning Engine

**Branch**: `001-opspilot-reasoning-engine` | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from [spec.md](./spec.md)

## Summary

The OpsPilot reasoning engine will provide a shared `ReasoningStrategy` contract, a single model factory for OpenRouter configuration, and a mock operational tool layer backed by an in-memory alert and incident store. The implementation will include both a ReAct strategy and a Plan-and-Execute strategy with bounded interaction limits, a comparison arena to run multiple strategies on the same input, and deterministic tests for a seeded data store and the reasoning trace formatter.

## Technical Context

**Language/Version**: Node.js LTS with TypeScript ESM in strict mode

**Primary Dependencies**: Zod for boundary validation, LangChain/LangGraph for agent orchestration, OpenRouter as the LLM provider, Sequelize for the schema layer, and a lightweight CLI runtime for the arena

**Storage**: In-memory mock store for alert and incident operations; schema definitions prepared for a MySQL/Sequelize integration layer and deterministic test fixtures

**Testing**: `node:test` with `tsx` as the local runner for deterministic, no-network tests

**Target Platform**: Local CLI and service logic for operations evaluation and comparison runs

**Project Type**: CLI-oriented library with orchestration services and validation boundaries

**Performance Goals**: Run a comparison across multiple strategies in a single invocation and keep runtime bounded by the configured interaction limit and max-step count

**Constraints**: Validate all external inputs with Zod; enforce max 8 planner steps; response traces must be complete and auditable; no model calls may exceed the configured interaction budget

**Scale/Scope**: Simulated operational environment with 5 services and 6 alerts, designed for local comparison and test execution rather than production deployment

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Spec-First Delivery**: Pass — the feature is fully described in the specification before implementation work.
- **Agent Safety Over Automation Speed**: Pass — all tool inputs are validated and execution is capped by step and interaction limits.
- **Evidence-Driven Incident Handling**: Pass — the system records a typed trace, tool observations, and metrics for each strategy run.
- **Tool and Context Boundaries**: Pass — tool logic, model configuration, and strategy orchestration remain separate responsibilities.
- **Quality, Security, and Testability**: Pass — deterministic tests and boundary validation are required by the feature; no secrets are committed.

**Result**: No constitution violations requiring exception or complexity justification.

## Project Structure

```text
src/
├── agents/
│   ├── model.ts
│   ├── react.ts
│   ├── plan-and-execute.ts
│   ├── tools.ts
│   └── types.ts
├── arena.ts
├── config/
│   └── env.ts
├── domain/
│   ├── alerts.ts
│   ├── incidents.ts
│   └── strategy.ts
├── infra/
│   ├── store.ts
│   └── sequelize.ts
├── index.ts
└── cli.ts
tests/
├── store.test.ts
├── trace-format.test.ts
└── arena.test.ts
scripts/
├── seed-alerts.ts
└── seed-store.ts
specs/
└── 001-opspilot-reasoning-engine/
    ├── spec.md
    ├── plan.md
    ├── research.md
    ├── data-model.md
    ├── quickstart.md
    ├── contracts/
    │   └── arena-cli.md
    └── checklists/
        └── requirements.md
```

**Structure Decision**: Single project CLI library with a dedicated `src/agents` orchestration layer, support modules under `src/domain` and `src/infra`, and a test suite focused on deterministic validation of store state and trace formatting.

## Complexity Tracking

> No constitution violations identified. No additional complexity exceptions are required.
