# Quickstart: Team Supervisor Validation

## Prerequisites

- repository cloned and dependencies installed (`npm install`)
- local runtime available via `npm run dev` or a focused test runner
- a team session created from the `team` route or the equivalent supervisor entry point

## Validation scenarios

### 1. Create and inspect a team session

1. Start the application with `npm run dev`.
2. Open the `team` route or initialize a team session in the agent runtime.
3. Confirm that the session is created with one supervisor and the default shared blackboard state.
4. Verify that each participant can see the same mission summary and current open items.

Expected outcome:
- the blackboard is present and stable
- the session state is available before any action is taken
- the maximum participant count is visible as an enforcement rule

### 2. Validate role restrictions

1. Add an analyst, planner, and executor to the team session.
2. Attempt a write action as the analyst.
3. Attempt a tool action from the planner.
4. Attempt an unchecked incident action from the executor outside the incident workflow.

Expected outcome:
- the analyst cannot mutate the plan or blackboard
- the planner cannot use tools directly
- the executor is blocked if the action is outside the allowed incident path
- all denied attempts are recorded in trace output

### 3. Validate supervisor structured output

1. Ask the supervisor for the next action in the team session.
2. Confirm the response is generated with `withStructuredOutput({ next, brief })`.
3. Review both fields for clear, concise guidance tied to the current mission.

Expected outcome:
- `next` is a brief action directive
- `brief` is a short contextual statement for the whole team
- the output corresponds to the current blackboard state

### 4. Validate handoff flow and reasoning display

1. Trigger a handoff event from planner to executor or from executor to supervisor.
2. Confirm the trace contains a `handoff` event with `from`, `to`, `summary`, and `context`.
3. Open the reasoning view and check that the event is visible and understandable without reconstructing context manually.

Expected outcome:
- the handoff is visible in the user-facing reasoning view
- the reason for the transition is available to the supervisor and reviewer
- no handoff is silent or hidden

### 5. Validate the team-size cap

1. Add participants until the session reaches eight.
2. Attempt to add a ninth participant.
3. Confirm the system rejects the update with a clear validation error.

Expected outcome:
- the count remains at or under eight
- the failure is explicit
- the session remains usable and stable

## Test commands

```bash
npm test
npm run typecheck
```

## Expected results

- all permission tests pass
- all handoff events are traceable
- the maximum team size is always enforced
- the supervisor and reasoning flow remain clear and reviewable
