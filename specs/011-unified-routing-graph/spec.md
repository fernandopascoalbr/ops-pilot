# Feature Specification: Unified Routing Graph

**Feature Branch**: `[011-unified-routing-graph]`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "Grafo unificado:
- production-graph.ts: nós contexto, roteador, as 3 estratégias como nós e resposta.
- roteador: withStructuredOutput (route, reason); tabela no prompt; evento "route" e campo node em todo evento de trace
- /chat: withStructuredOutput (route, reason);"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Route the incident through a single decision graph (Priority: P1)

When an operator submits an incident or request with contextual signals, the system evaluates the situation through one shared graph instead of treating routing and strategy selection as separate processes. This keeps the decision path consistent and easier to explain to operators.

**Why this priority**: This is the core value of the feature: the system must select a route and a strategy in a single, understandable flow before responding.

**Independent Test**: Can be fully tested by submitting a representative request and confirming that the system identifies a single route, explains the reason, and continues through the correct strategy path.

**Acceptance Scenarios**:

1. **Given** a request with sufficient context to classify the problem, **When** the system evaluates the unified graph, **Then** it picks a single route and provides a clear reason for that decision.
2. **Given** a request that matches one of the supported operational strategies, **When** the graph processes it, **Then** the selected strategy becomes the active branch of the workflow and the response is grounded in that route.

---

### User Story 2 - Operators can understand why a route was chosen (Priority: P2)

Operators need to see the decision logic in plain language, so they can trust the system and decide whether to accept, revise, or escalate the response.

**Why this priority**: A route without an explanation creates uncertainty, slows review, and weakens operational confidence.

**Independent Test**: Can be fully tested by requesting a response through the chat flow and verifying that the system returns both the route and the rationale in a structured form.

**Acceptance Scenarios**:

1. **Given** a chat-based incident request, **When** the system returns a response, **Then** it includes the selected route and a brief reason in a structured summary.
2. **Given** the operator reviews the prompt context, **When** the route is explained, **Then** the explanation is concise and aligned with the actual decision factors used by the graph.

---

### User Story 3 - Trace data shows the real path of the decision (Priority: P3)

Support teams need the full trace of a request to audit the graph, verify that each node executed as expected, and debug decisions without guessing.

**Why this priority**: Traceability is essential for confidence, reviewability, and operational learning, even when it is not the main user interaction.

**Independent Test**: Can be fully tested by reviewing an execution trace and confirming that every event records the current node and the route selected by the router.

**Acceptance Scenarios**:

1. **Given** a request processed through the unified graph, **When** trace events are emitted, **Then** each event includes the active node name and the route chosen by the router.
2. **Given** multiple strategy branches are evaluated, **When** a route is selected, **Then** the trace preserves the path from context through the router to the response without losing the decision context.

---

### Edge Cases

- What happens when the context is incomplete or ambiguous?
- How does the system handle a request where more than one strategy could fit?
- What happens when the route is selected but the trace does not include the active node or route field?
- How does the system behave when no route is confidently supported by the context?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST evaluate each incident or support request through a unified graph that includes context, router, strategy nodes, and the final response path.
- **FR-002**: The system MUST allow the router to make a single decision about the active route for a given request based on the available context and user intent.
- **FR-003**: The system MUST provide a human-readable reason for the selected route whenever a route is chosen.
- **FR-004**: The system MUST present the selected route and its reason in a structured format in user-facing chat interactions.
- **FR-005**: The system MUST maintain a prompt-level summary that clearly shows the chosen route alongside the reasoning used to make the decision.
- **FR-006**: The system MUST emit trace events for the execution path, including the currently active node and the route selected by the router.
- **FR-007**: The system MUST preserve the distinction between context, routing, strategy evaluation, and final response while treating them as a single operational flow.
- **FR-008**: The system MUST support the three strategy branches as selectable nodes within the unified graph without losing the ability to compare or explain each route decision.
- **FR-009**: The system MUST handle ambiguous or low-confidence routing cases in a safe manner by surfacing uncertainty instead of silently forcing a route.

### Key Entities

- **Incident Request**: The user input or operational event that requires classification, response generation, or triage.
- **Route Decision**: The selected path through the unified graph, along with the reason explaining why it was chosen.
- **Strategy Branch**: One of the supported operational strategies available to the graph for handling the request.
- **Trace Event**: A single execution step in the workflow, including its node, route, and contextual status.
- **Response**: The output delivered to the user or operator after the selected route and strategy are applied.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can see a route and explanation for 100% of supported interaction flows that require routing.
- **SC-002**: At least 95% of route decisions are accompanied by trace data that identifies the active node and the selected route.
- **SC-003**: Users can complete the primary chat-based decision flow with a route and rationale visible in the same response without needing to inspect internal logs.
- **SC-004**: Support teams can reconstruct the sequence of route selection and strategy execution for at least 90% of reviewed incidents using the trace records alone.
- **SC-005**: Ambiguous requests are surfaced as uncertain rather than silently assigned to a route in more than 99% of evaluated low-confidence cases.

## Assumptions

- The system is used for decision support and incident response workflows, not for autonomous destructive actions without human review.
- The unified graph is the standard path for routing and strategy execution in supported operational scenarios.
- Context needed for routing is available before the route decision is finalized.
- Operators and support teams are expected to inspect route explanations and trace events during review, escalation, and verification.
- The feature is intentionally scoped to routing clarity and traceability rather than broad automation changes beyond the chosen workflow.
