# Quickstart: War Room Web Validation

## Goal

Validate the web war room end-to-end:

1. open the chat view and send a request to the backend,
2. inspect a typed reasoning trace,
3. review a decision card and approve or reject the action,
4. configure the API base URL through the settings gear,
5. recover gracefully from CORS or network failures.

## Prerequisites

- Node.js LTS
- `npm install` in the repository root
- a running HTTP backend exposing `POST /chat`

## Scenario 1 — backend and client are healthy

```bash
npm install
npm run dev
```

Then run the Vite app in the new `web/` folder:

```bash
cd web
npm install
npm run dev -- --host 0.0.0.0
```

Expected result:

- the app loads without blank-screen errors,
- the chat view accepts a message,
- the response includes answer, trace, and metrics,
- the user can open the trace and review the supporting evidence.

## Scenario 2 — decision review flow

1. Send a message that produces a recommended action.
2. Open the decision card from the activity list.
3. Select `approve` or `reject`.
4. Confirm the card state changes visibly and retains the audit trail.

Expected result:

- a visible card exists for the suggested action,
- the trace panel can be opened before the action is finalized,
- the chosen decision is persisted in the UI state.

## Scenario 3 — configuration and CORS recovery

Use the gear icon to enter the backend API base URL, for example:

```text
http://localhost:3000/opspilot
```

Then verify the app composes the chat endpoint correctly and handles the browser response when the backend is down or the origin is blocked.

Expected result:

- the application uses the configured base URL to call the backend,
- if the request fails due to CORS or unavailability, the app shows a clear error state,
- the user can adjust the URL and retry without leaving the session.

## Scenario 4 — empty and error states

- Start the app with no prior conversation.
- Disconnect the backend or set an invalid URL.
- Confirm the app shows specific states for empty conversation and API failure.

Expected result:

- empty state explains what to do next,
- error state includes recovery guidance,
- the UI remains discoverable and accessible during the failure.

## References

- Specification: [spec.md](./spec.md)
- Data model: [data-model.md](./data-model.md)
- Contracts: [contracts/war-room-ui.contract.yaml](./contracts/war-room-ui.contract.yaml)
- Research: [research.md](./research.md)

## Acceptance checklist

- [ ] Chat view loads and sends messages correctly.
- [ ] Trace can be opened and inspected before the user decides.
- [ ] Decision card can be approved or rejected.
- [ ] Settings gear updates the API base URL.
- [ ] CORS and network failures present actionable recovery.
- [ ] Empty, loading, and error states are visually clear.
- [ ] Light and dark themes remain accessible and readable.
