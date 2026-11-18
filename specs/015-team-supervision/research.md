# Research: Team Supervisor Mode

## Decision

Adopt a dedicated team coordination subsystem with one supervisor, a shared blackboard, and strict role constraints for analyst, planner, and executor. The supervisor produces structured output in the form `{ next, brief }` and owns the team state, while the trace records every handoff and exposes it in the reasoning view.

## Rationale

The feature description makes the role boundaries explicit and safety-critical: the analyst is read-only, the planner cannot use tools directly, and the executor can only act on incidents via the defined workflow. A single shared blackboard avoids drift and makes the current mission state auditable. Capturing `handoff` events in the trace preserves accountability and complements the existing evidence-driven operations model already used in the repository.

## Alternatives considered

1. Fully autonomous team without role constraints
   - Rejected because it would allow bypasses, make permission validation ambiguous, and reduce human control in incident workflows.

2. Team session with independent per-role state, no central blackboard
   - Rejected because conflicting context would lead to duplicated assumptions and make reasoning hard to audit.

3. Handoff-only without trace rendering
   - Rejected because the transition would be invisible to reviewers and contradict the requirement that the reasoning view show the operational handoff clearly.

4. Unbounded team size
   - Rejected because the feature explicitly sets a maximum of eight participants and the operating model is designed to stay small and reviewable.

## Research findings

- The repository already favors structured output and bounded operational behavior through `withStructuredOutput(...)` and trace events. The team mode should integrate with these patterns rather than invent a parallel mechanism.
- `route` and `trace` are already first-class concepts in the agent graph, so the `team` route should integrate with that contract rather than live as an isolated feature.
- The “blackboard” should be treated as a session state object that can be read and updated only by authorized transitions; it should not be a mutable free-form note store.
- `handoff` is best represented as a trace event with stable fields (from, to, summary, context) so the UI can render a consistent review timeline.
- The team route should remain small and bounded: no unlimited swarm behavior, no direct role bypass, and no silent transitions. Every change must produce evidence.
