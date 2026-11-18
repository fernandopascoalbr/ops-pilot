# Data Model: Team Supervisor

## Entities

### TeamSession

Represents a single collaborative operation. It owns the active blackboard and the role assignments for the current cycle.

- `id`: string
- `route`: literal `"team"`
- `status`: `active | paused | resolved`
- `maxParticipants`: integer, fixed at `8`
- `participants`: array of `TeamParticipant`
- `blackboard`: `BlackboardState`
- `trace`: array of `TraceEvent`
- `createdAt`: timestamp
- `updatedAt`: timestamp

Validation rules:
- `maxParticipants` must be exactly `8`
- `participants.length <= 8`
- `participants` must contain exactly one `supervisor`
- `blackboard` must be non-null while the session is active

### TeamParticipant

Represents a member of the team and their current role.

- `id`: string
- `name`: string
- `role`: `analyst | planner | executor | supervisor`
- `canWrite`: boolean
- `canUseTools`: boolean
- `status`: `active | inactive`

Validation rules:
- `role` must map to the permitted behavior matrix
- `supervisor` is the only role allowed to emit final direction to the team
- `analyst` is read-only and cannot create or mutate the plan
- `planner` is not permitted direct tool access
- `executor` can only act on incidents within the defined incident workflow

### BlackboardState

Shared state synchronized across the session and treated as the source of truth.

- `objective`: string
- `summary`: string
- `incidentId`: string | null
- `openItems`: array of string
- `decisionHistory`: array of `SupervisorDecision`
- `lastUpdatedBy`: string
- `updatedAt`: timestamp

Validation rules:
- `objective` and `summary` must not be empty
- `openItems` must be a list of actionable, non-duplicate items
- only the supervisor or a valid handoff transition can update the board

### SupervisorDecision

Structured output emitted by the supervisor to guide the next action.

- `next`: string
- `brief`: string
- `createdAt`: timestamp
- `actor`: `supervisor`

Validation rules:
- `next` must be short and actionable
- `brief` must capture the operating context without repeating the full state
- one decision summarizes the chosen move to the team

### HandoffEvent

Represents a transfer of responsibility or context between roles or workflow stages.

- `type`: literal `"handoff"`
- `from`: `TeamParticipant.role`
- `to`: `TeamParticipant.role`
- `summary`: string
- `context`: string
- `timestamp`: timestamp

Validation rules:
- event must be emitted whenever ownership changes
- both `from` and `to` roles must be present and different
- event must appear in the reasoning trace for later review

### Incident

Operational issue managed under the executor guardrail.

- `id`: string
- `title`: string
- `status`: `open | in_progress | resolved`
- `service`: string
- `severity`: `low | medium | high | critical`
- `owner`: `executor`

Validation rules:
- only executor can transition incident status through the allowed workflow
- incident updates must be accompanied by a trace event or supervisor decision entry

## Relationships

- One `TeamSession` contains many `TeamParticipant` records.
- One `TeamSession` owns exactly one `BlackboardState`.
- One `BlackboardState` may include many `SupervisorDecision` entries as history.
- Many `HandoffEvent` entries belong to one session trace and one workflow boundary.
- `Incident` is a child operational object that may be referenced by the blackboard and by the executor lifecycle.

## State transitions

1. `session.created` -> `session.active`
2. `active` -> `handoff` -> `active` (role or responsibility transfer)
3. `active` -> `paused` when context is incomplete or awaiting human approval
4. `active` -> `resolved` when the mission state is complete and no open incident remains

## Permission matrix

| Role | Read board | Propose next step | Use tools | Act on incidents |
|------|------------|------------------|-----------|------------------|
| Supervisor | Yes | Yes | Yes, via orchestration boundary | Yes, with guardrails |
| Analyst | Yes | No | No | No |
| Planner | Yes | Yes | No | No |
| Executor | Yes | No | Only via permitted incident actions | Yes |

The matrix is enforced at runtime and is also a core testing target for the feature.
