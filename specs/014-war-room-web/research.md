# Research: War Room Web

## Decision: single-page war room with a dedicated API client and settings-driven route configuration

The web experience will be implemented as a single-page React application that shows the incident conversation in one panel, exposes a reasoning drawer for the typed trace, and keeps decision approval/rejection actions in a dedicated review card. The application will not embed the backend URL in code; instead, it will read a configurable base URL from browser settings/local storage and compose the chat route from that value.

### Rationale

- The repository already exposes a clear backend contract for conversation: `POST /chat` with structured `answer`, `trace`, and `metrics` output.
- The user story requires reviewability before action, which matches a typed trace model and an explicit decision card rather than a generic chat-only view.
- The user explicitly requested a gear control for the API base URL, which is best handled as application configuration state rather than hardcoded environment values.
- The design must support both empty-state and error-state flows without a blank screen, which requires a deliberate UI state model in the client.

### Alternatives considered

- Keep the experience as a plain chat panel only: rejected because it does not meet the requirement for reasoning review and approval cards.
- Hardcode a single backend URL in code: rejected because it blocks multi-environment use and conflicts with the gear configuration requirement.
- Hide the trace behind the same conversation stream: rejected because operational review needs a typed trace with a clear opening action and more stable navigation.
- Bypass CORS by removing or weakening browser protections: rejected because it is unsafe and violates the requirement to address CORS explicitly.

## Decision: use a typed reasoning trace as the review object

The review flow will open a typed trace panel with structured lineage: message, step, reasoning, confidence, artifact references, and optional decision metadata. This allows the user to open the same trace model used by the backend and present it in a user-friendly way without losing auditability.

### Rationale

- The OpsPilot backend already defines a trace concept and uses it as evidence for operational reasoning.
- Incident teams need to validate the logic behind a suggestion before approving or rejecting it.
- A typed trace can also support future export, search, and timeline views without redesigning the data model.

### Alternatives considered

- Show a plain text explanation: rejected because it is harder to audit and less consistent across actions.
- Display only final answer text: rejected because it hides the rationale and removes the human review safeguard.

## Decision: treat CORS as a first-class operational error

The browser client will handle CORS and network failures as explicit states with actionable recovery UX. When an origin is blocked or the API is unreachable, the app shows a message, keeps the current session state intact, and points the user to the settings gear to update the backend base URL or deployment environment.

### Rationale

- The war room is a browser-based incident product; the app is expected to run in a secure context where cross-origin restrictions are normal.
- An operational UI must explain what is wrong instead of silently failing or leaving the user staring at a broken screen.
- The requirement explicitly mentions `CORS`, meaning the design must tolerate it and recover clearly.

### Alternatives considered

- Ignore the issue and rely only on backend headers: rejected due to user experience and real-world deployment variation.
- Use a reverse proxy without any client feedback: rejected because it hides the actual problem and reduces operator confidence.

## Decision: approval/rejection becomes a decision card workflow

The feature will model recommended actions as review cards with a status (`pending`, `approved`, `rejected`), summary, rationale, and actor metadata. The card is the interaction object that the responder clicks to open the trace and then choose approve or reject.

### Rationale

- The requirement states that a decision should become a card that changes from a “202” status into an approval/rejection state.
- A decision card creates an explicit boundary between suggestion and action, which is important in incident response.
- The UI can maintain a single source of truth for the card state, easier to test and audit.

### Alternatives considered

- Approve/reject as inline buttons in chat: rejected because it reduces clarity and weakens the explicit decision-review pattern.
- Approve/reject as modal only: rejected because the decision should remain visible as a task card in the war room context.
