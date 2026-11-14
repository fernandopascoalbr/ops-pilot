# Data Model: OpsPilot Reasoning Engine

## Core Entities

### ReasoningStrategy
- **name**: string — stable identifier for the strategy (for example, `react` or `plan-and-execute`)
- **run(input)**: method returning an object containing `answer`, `trace`, and `metrics`
- **Responsibilities**: orchestrates reasoning, invokes tools, and emits a bounded, auditable decision trail

### TraceEvent
- **type**: `thought | action | observation | plan | critique | answer`
- **message**: string — human-readable rationale or summary
- **tool**: string | null — tool name when the event is an action event
- **args**: object | null — structured arguments passed to the tool
- **timestamp**: string — optional UTC marker for ordering
- **Relationships**: belongs to a single `RunTrace` and is ordered chronologically

### RunTrace
- **events**: TraceEvent[] — ordered reasoning sequence
- **strategyName**: string — strategy used for the run
- **summary**: string — optional final description of the evaluation

### RunMetrics
- **llmCalls**: number — number of LLM invocations used during the run
- **latencyMs**: number — end-to-end elapsed time for the run
- **interactionLimit**: number — configured cap for tool or reasoning turns
- **stepsUsed**: number — actual number of steps used in a plan-based run

### Alert
- **id**: string — unique alert identifier
- **title**: string — human-readable alert description
- **service**: string — owning service or component
- **severity**: `low | medium | high | critical`
- **status**: `firing | resolved`
- **createdAt**: string — creation timestamp
- **resolvedAt**: string | null — closing timestamp when applicable
- **Relationships**: can be associated with an `Incident` as the source event

### Incident
- **id**: string — unique incident identifier
- **title**: string — incident title
- **service**: string — service affected
- **severity**: `low | medium | high | critical`
- **status**: `open | resolved`
- **openedAt**: string — time the incident was created
- **resolvedAt**: string | null — time the incident was marked resolved
- **Relationships**: sourced from an alert or created directly by the strategy

### PlanStep
- **id**: string
- **description**: string — action to perform
- **status**: `pending | completed | skipped`
- **dependsOn**: string[] — optional prerequisites within the plan
- **Relationships**: part of a plan produced by the planner and revised by the replanner

## Validation Rules

- Alert service and title must be non-empty values.
- Incident severity must be one of the allowed values.
- A strategy must never exceed the configured interaction limit.
- Plan steps must be capped at 8 in the Plan-and-Execute strategy.
- Any invalid tool input must fail validation before mutating store state.

## State Transitions

- `Alert` moves from `firing` to `resolved` when the tool resolves an incident or the state is updated after a response cycle.
- `Incident` moves from `open` to `resolved` only through the validated resolution tool flow.
- `PlanStep` transitions from `pending` to `completed` when executed and to `skipped` when the replanner removes it or the max-step budget is reached.
