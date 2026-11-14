<!--
Sync Impact Report
- Version change: 0.x (legacy) → 1.1.0
- Modified principles: legacy repository guidance → IncidentArena principles
- Added sections: Technology Stack, Operational Architecture, Development Workflow
- Removed sections: generic MVC framing and ambiguous process notes
- Follow-up TODOs: none
-->

# IncidentArena Constitution

## Core Principles

### I. Spec-First Delivery (NON-NEGOTIABLE)
Every feature, change, and operational workflow begins with a spec captured in the Spec Kit flow: `/speckit.specify -> /speckit.plan -> /speckit.tasks -> /speckit.implement`.
Work must not bypass requirements capture, design review, and task decomposition. The repository is treated as a governed system where the constitution, specs, plans, and code evolve together and remain versioned.

### II. Agent Safety Over Automation Speed
IncidentArena manages production alerts and incidents; therefore, the system must prefer safe, explainable, and reviewable behavior over autonomous action without constraints. Every tool call, external API invocation, and automation step must be bounded by clear input validation, explicit guardrails, and human oversight for actions that could affect production systems.

### III. Evidence-Driven Incident Handling
Operational decisions must be based on evidence, not guesses. Alerts, incident timelines, runbooks, tool outputs, and agent reasoning must be traceable and auditable. When a diagnosis is uncertain, the system must ask for confirmation, surface uncertainty explicitly, and avoid destructive actions until confidence is enough.

### IV. Tool and Context Boundaries
This project is not a generic CRUD MVC application. Its domain is AI-assisted operations: alert intake, contextual enrichment, incident triage, tool orchestration, and response coordination. Components must be separated by responsibility, not by arbitrary MVC naming alone. Model logic, external API integration, orchestration, and user-facing boundaries must remain distinct and testable.

### V. Quality, Security, and Testability
No change is considered complete unless it preserves the project contract and keeps the quality gates green. Type checking and tests must remain passing; inputs entering the system must be validated at the boundary with Zod; secrets and credentials must never be committed; and new logic must be covered by focused tests.

## Operational Architecture and Constraints

IncidentArena must respect the operational realities of incident workflows:

- Alert ingestion, enrichment, triage, and response coordination are distinct responsibilities.
- Domain logic must not embed raw I/O or infrastructure concerns directly in business rules.
- External systems are integration boundaries and must enforce schema validation, error translation, and safe defaults.
- The agent must favor observability and traceability over implicit behavior.
- Destructive or high-impact actions require explicit guardrails and confirmation paths.

## Technology Stack

The project must remain aligned with the current runtime and tooling standards:

- Node.js LTS
- TypeScript ESM with `strict` mode enabled
- Zod only at system boundaries (HTTP, CLI, and external integration points)
- Tests with `node:test` and `tsx`
- LangChain/LangGraph over OpenRouter for agent orchestration
- SQLite via `node:sqlite` as the default local operational persistence layer for domain state, not a traditional server-based database
- Local runtime commands: `tsx src/index.ts` and `tsx src/cli.ts`
- Operational persistence must respect `OPSPILOT_DB` for the database path (defaulting to `./data/incidentarena.db`), while tests must use `:memory:` to isolate state

## Development Workflow and Quality Gates

All product work follows the repository's engineering standards:

- Start with a spec and task breakdown before implementation.
- Prefer small, reviewable changes with reversible scope.
- For every new behavior, validate the boundary contract and add tests covering the expected outcome.
- Run the project checks required by the repository before merging or finalizing a change.
- Keep implementation explicit, deterministic, and explainable in production contexts.

## Governance

This constitution supersedes generic framework assumptions and defines the non-negotiable operating rules for this repository. Any amendment requires a documented rationale, a version bump, and a clear migration note when behavior or guardrails change.

Operational persistence decisions are part of the repository's governance. The use of SQLite via `node:sqlite` is required for local, auditable operational state; alternative database engines or server-hosted persistence are not the default path unless an explicit architecture exception is documented and justified.

All changes must be reviewed against the constitution before being merged. If a proposed change conflicts with the principles above, the conflict must be resolved by a more explicit safety or operational requirement, not by weakening the standards.

**Version**: 1.2.0 | **Ratified**: 2026-11-03 | **Last Amended**: 2026-11-14

**Migration Note**: This amendment updates the repository to prefer SQLite-backed local operational persistence (`node:sqlite`) and clarifies the `OPSPILOT_DB` convention, while keeping the existing safety, evidence-driven, and testability principles intact.
