# Feature Specification: Team Supervisor

**Feature Branch**: `015-team-supervision`

**Created**: 2026-11-17

**Status**: Draft

**Input**: User description: "modo equipe e src/team/: supervisor com withStructuredOutput({next, brief}) sobre um blackboard no estado. Papéis: analista (só leitura, não propoe), planejador (sem tools), executor (incidentes, sem bypass). Evento "handoff" no trace, renderizado no "ver raciocínio". Rota "team", teto 8."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Coordinated team supervision over a shared state (Priority: P1)

A supervisor manages a small team on a dedicated team route, keeping a shared blackboard as the source of truth for the current mission. The analyst can inspect the current state without proposing edits, the planner can shape the next actions without direct tool access, and the executor can act on incidents only within the permitted guardrails.

**Why this priority**: This is the core value of the feature: a coordinated operating model that keeps responsibility boundaries clear while the team still moves quickly and consistently.

**Independent Test**: Can be fully tested by starting a team session with a supervisor, assigning roles, and verifying that each role can only perform the actions aligned to its responsibilities.

**Acceptance Scenarios**:

1. **Given** a team session with a supervisor and the blackboard state visible, **When** the analyst reviews the shared context, **Then** they can inspect the state and relevant decisions without modifying the plan or the active incident queue.
2. **Given** a team session with an active plan, **When** the planner identifies the next step, **Then** the supervisor sees the proposed next action in the structured output without direct access to tools.
3. **Given** a team session with a defined incident, **When** the executor acts on it, **Then** the action is limited to the allowed incident workflow and cannot bypass safety constraints.

---

### User Story 2 - Handoff visibility in the reasoning trace (Priority: P1)

When a handoff occurs between roles or stages of work, the team needs to understand not only what changed, but also why it changed. The reasoning trace must make that transition visible so it can be reviewed and audited later.

**Why this priority**: Hand-offs are a critical coordination point in incident workflows; if the transition is hidden, the team loses traceability and accountability.

**Independent Test**: Can be fully tested by generating a handoff event during a team session and confirming it appears in the reasoning view with enough context to understand the transition.

**Acceptance Scenarios**:

1. **Given** a running team session, **When** a handoff event is emitted in the trace, **Then** the event is rendered in the reasoning view with a clear transition description.
2. **Given** a team session that includes a handoff, **When** the supervisor reviews the reasoning trail, **Then** they can identify the sender, the receiver, and the decision context without reconstructing it manually.

---

### User Story 3 - Team mode remains bounded and predictable (Priority: P2)

The team route must maintain an explicit cap and consistent guardrails so that collaboration remains manageable, transparent, and safe. The system should prevent over-scaling or role misuse before coordination breaks down.

**Why this priority**: Without strict boundaries, the team model becomes noisy, inconsistent, and harder to supervise, especially during incident response.

**Independent Test**: Can be fully tested by creating a team session at the maximum size and confirming the system enforces the participant cap and role constraints.

**Acceptance Scenarios**:

1. **Given** a team session that is at or below the allowed limit, **When** the supervisor adds participants, **Then** the session remains valid and visible in the team route.
2. **Given** a team session that attempts to exceed the participant cap, **When** the system evaluates the team size, **Then** it rejects the request or blocks the addition with a clear validation result.
3. **Given** a team session where a role attempts to bypass its permissions, **When** the system evaluates the request, **Then** it prevents the action and preserves the traceability of the denied attempt.

---

### Edge Cases

- What happens when a team session has no active incident but the workflow still requires a planner or executor decision?
- How does the system handle a handoff that occurs without sufficient context or without a valid next action?
- What happens when the team size is exactly eight or when a new participant would push it over the limit?
- How does the system behave when a role tries to propose changes despite being restricted to read-only access?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support a dedicated team operating mode exposed through the `team` route for supervisor-led collaboration.
- **FR-002**: The system MUST maintain a shared blackboard as the authoritative state for the team's current understanding, mission status, and outstanding work.
- **FR-003**: The system MUST provide a supervisor with structured output in the form of `{ next, brief }` for the next operational step and a concise summary of the current decision context.
- **FR-004**: The analyst role MUST be read-only and MUST be able to inspect the shared state without proposing new instructions or changing plan contents.
- **FR-005**: The planner role MUST be able to shape the next action or sequence of actions without direct tool access or bypass of the execution guardrails.
- **FR-006**: The executor role MUST handle incidents using the operational path allowed for execution and MUST NOT bypass the established safety and approval constraints.
- **FR-007**: The system MUST emit a `handoff` event in the trace whenever responsibility or context moves between roles or stages in the workflow.
- **FR-008**: The system MUST render `handoff` events in the reasoning view so supervisors and reviewers can understand what changed and why it changed.
- **FR-009**: The system MUST enforce a maximum team size of eight participants for a single team session.
- **FR-010**: The system MUST prevent role-based violations, including attempts to propose changes from the analyst role or perform restricted actions from the planner role.
- **FR-011**: The system MUST preserve an auditable timeline showing the team context, role changes, and the reasoning associated with each operational step.

### Key Entities *(include if feature involves data)*

- **Team Session**: The coordination unit for a supervisor-led workflow, with a fixed participant cap and a defined operational state.
- **Supervisor**: The lead operator responsible for coordinating decisions, reading the state, and guiding the flow between roles.
- **Blackboard State**: The shared context model that reflects current goals, open incidents, pending work, and decision rationale.
- **Role Assignment**: The operational boundary assigned to each participant, such as analyst, planner, or executor.
- **Incident**: A production or operational issue that the executor may address within the guardrails defined by the team workflow.
- **Handoff Event**: A traceable transition of responsibility or context between stages, roles, or task owners.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Team sessions remain stable and usable with up to eight participants without degraded comprehension of the shared state.
- **SC-002**: 100% of handoff events are visible in the reasoning trace and can be reviewed by the supervisor without reconstructing the sequence manually.
- **SC-003**: 100% of role-bound actions respect the defined permissions for analyst, planner, and executor roles.
- **SC-004**: Supervisors can complete a team coordination review in under 2 minutes for a standard incident cycle without losing the current context.
- **SC-005**: 90% or more of team sessions complete with a clear action path and no unresolved permission conflicts.

## Assumptions

- The team mode is intended for small, supervised workflows rather than unrestricted multi-agent collaboration.
- A single blackboard state reflects the most accurate current operational context and should remain the source of truth during a session.
- Role restrictions are enforced by design and are not optional for the first version of the feature.
- The team workflow is expected to support incident handling and coordination, but not unrestricted autonomous action outside the authorized operating path.
- Existing review and trace capabilities are reused where possible so the reasoning display remains consistent with current operational evidence.
