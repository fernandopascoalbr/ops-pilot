# Feature Specification: IncidentArena Reasoning Engine

**Feature Branch**: `[001-opspilot-reasoning-engine]`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description: "Núcleo de raciocinio do IncidentArena: - Interface comum ReasoningStrategy: name + run(input) -> (answer, trace, metrics). trace = eventos tipados (thought | action | observation | plan | critique | answer) action carrega (tool, args). metrics = (llmCalls, latencyMs). Fabrica única em src/agents/model.ts lendo OPENROUTER_API_KEY e OPENROUTER_MODEL (baseUrl do openrouter), temperature 0. - ferraemntas mock em src/agents/tools.ts sobre um store in-memory pré-populado (o seed primário: 5 serviços, 6 alertas variados - 3 firing, 3 resolved (crie um script para rodar o seed, execute ele ao final desse prompt)): list_alerts(status), open_incident(title, service, severity), resolve_incident(id), Schemas zod, banco mysql, utilizando sequelize. - Estratégia ReAct em src/agents/react.ts usando o agent ReAct pré-construído do langgraph com essas tools, capturando o trace completo. Estratégia Plan-and-Execute em src/agents/plan-and-execute.ts como grafo: planner (saída estruturada: lista de passos), executor (um passo por vez com as tools), replanner (revisa o restante após cada passo; encerra quando nao resta nada). Máximo de 8 passos. - Toda estratégia respeita limite de intereações e conta chamadas de LLM. - Arena mínima em src/arean.ts: roda 1+ estratégias sobre o mesmo input e imprime traces e metricas (flags --strategies e --max-iterations) - Testes: store e formatacao de trace (determinísticos, sem rede)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compare reasoning strategies on the same incident (Priority: P1)

An operations analyst can submit the same service alert to multiple reasoning strategies and compare how each one reasons, which actions it takes, and how many LLM calls it consumes. This makes it possible to choose the most reliable strategy without re-running the entire decision process manually.

**Why this priority**: This is the primary value of the IncidentArena reasoning core: it turns incident triage into a measurable comparison between decision strategies and exposes evidence in the form of trace and metrics.

**Independent Test**: A single incident input can be evaluated against more than one strategy and deliver a comparable answer, full step-by-step trace, and cost/latency metrics.

**Acceptance Scenarios**:

1. **Given** a set of operational alerts and an incident request, **When** the operator runs a comparison across two or more strategies, **Then** each strategy returns an answer together with a typed trace and performance metrics.
2. **Given** the same input is reused across strategies, **When** the comparison is initiated, **Then** the leading strategy is identified by reviewing the output, trace, and bounded interaction count without ambiguity.

---

### User Story 2 - Resolve and track incidents with safe tool-driven actions (Priority: P2)

An on-call engineer can use the reasoning core to inspect alert status, open an incident, and resolve it when justified by the evidence provided by the system. The workflow uses validated tool calls and a clear audit trail to reduce unsafe or undocumented actions.

**Why this priority**: Incident response needs safe, observable actions. The capability matters even when the primary role is comparison, because the strategies must be able to act on the operational data they are evaluating.

**Independent Test**: A user can ask the system to review alerts, open a new incident, and close a matching incident while the resulting trace shows the actual tool actions and outcomes.

**Acceptance Scenarios**:

1. **Given** a firing alert in the mock store, **When** the strategy requests an incident to be opened, **Then** the alert is associated with a newly opened incident record with a valid title, service, and severity.
2. **Given** an incident exists in the system, **When** the strategy resolves it, **Then** the system records the action and updates the state without bypassing validation.

---

### User Story 3 - Gracefully stop when interaction limits are reached (Priority: P3)

An operator can run strategies under a controlled maximum interaction budget. When the limit is reached, the system stops safely and shows the partial reasoning trail so the result remains explainable and auditable.

**Why this priority**: Production environments require bounded autonomy; this feature protects operators from runaway loops while preserving the reasoning context that informed the final state.

**Independent Test**: If a strategy reaches the configured interaction ceiling, it returns a controlled answer and trace instead of continuing indefinitely.

**Acceptance Scenarios**:

1. **Given** a strategy is configured with a small interaction limit, **When** the limit is reached, **Then** the system ends the run and reports the final trace and metrics.
2. **Given** the system is running a multi-step plan, **When** no steps remain or the maximum step count is reached, **Then** the execution terminates cleanly with an explicit result.

---

### Edge Cases

- What happens when the user submits input without any matching alerts or services?
- How does the system handle an invalid incident payload or a tool input that violates the expected schema?
- What happens when the planner produces more than the allowed maximum of 8 steps?
- How does the system behave when a strategy exceeds its configured interaction limit before it can finalize an answer?
- What happens when a tool call attempts to resolve an already resolved alert or incident?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose a common `ReasoningStrategy` interface with a `name` and a `run(input)` method that returns an answer, a typed trace, and metrics.
- **FR-002**: The system MUST provide a single model factory that reads `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`, uses the OpenRouter base URL, and sets the model temperature to `0`.
- **FR-003**: The system MUST define a structured reasoning trace that records typed events including `thought`, `action`, `observation`, `plan`, `critique`, and `answer`.
- **FR-004**: Every tool action in the trace MUST include the tool name and its arguments in a structured format for inspection and debugging.
- **FR-005**: The system MUST include a mock tool layer based on an in-memory store seeded with 5 services and 6 alerts, including 3 firing alerts and 3 resolved alerts.
- **FR-006**: The system MUST support at least the following tool operations: listing alerts by status, opening a new incident, and resolving an existing incident.
- **FR-007**: The tool layer MUST validate incoming data using Zod schemas and reject invalid requests before mutating the in-memory state.
- **FR-008**: The system MUST implement a ReAct reasoning strategy that runs against the provided tool set and captures the complete trace of decision-making steps.
- **FR-009**: The system MUST implement a Plan-and-Execute reasoning strategy with a planner, executor, and replanner that maintains a maximum of 8 steps and revises the remaining plan after each action.
- **FR-010**: Every strategy MUST respect the configured interaction budget and record both the number of LLM calls and the elapsed latency in the metrics output.
- **FR-011**: The minimum comparison arena MUST run one or more strategies against the same incident input and print both traces and metrics.
- **FR-012**: The arena MUST accept CLI flags for strategy selection and the maximum iteration value.
- **FR-013**: The system MUST include deterministic tests for the in-memory store and the trace formatting output without requiring external network access.
- **FR-014**: The system MUST make the reasoning output auditable so operators can review the sequence of tool calls, observations, and final answer in context.

### Key Entities *(include if feature involves data)*

- **ReasoningStrategy**: The common contract for a strategy implementation, including how it is named and executed.
- **Trace Event**: A typed record in the reasoning sequence, representing a thought, tool action, observation, plan, critique, or final answer.
- **Tool Call**: A structured action entry that captures the tool name and arguments during execution.
- **Alert**: A monitored operational signal with status, service, severity, and title information.
- **Incident**: A tracked operational event created from an alert and later resolved when appropriate.
- **Run Metrics**: The aggregate measurements used to compare strategies, including LLM call count and latency.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can compare two or more reasoning strategies on the same incident input within a single evaluation session.
- **SC-002**: At least 95% of reasoning runs complete within the configured interaction limit and produce a final answer with an auditable trace.
- **SC-003**: Users can identify why a strategy chose a specific action from the trace and metrics without needing to re-run the workflow manually.
- **SC-004**: The system provides deterministic test coverage for the store and trace formatting so behavior remains stable across repeated executions.
- **SC-005**: Operational teams can evaluate incident response decisions using consistent evidence and a bounded, explainable workflow.

## Assumptions

- Operational users are evaluating the reasoning engine in a controlled environment rather than directly modifying production systems.
- The mock tool store is sufficient for validation, demo use, and deterministic automated tests.
- Staff can interpret the reasoning trace as audit evidence without requiring a full event timeline beyond the captured steps.
- OpenRouter is used as the external model provider only when credentials are configured, while offline tests rely on deterministic local behavior.
- The primary audience is internal operations teams that need explainable decision support rather than autonomous production control without review.
