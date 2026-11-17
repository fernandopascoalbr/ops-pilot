# Feature Specification: War Room Web

**Feature Branch**: `[014-war-room-web]`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "War room web/ (Vite+react+TS) com as instructions de design: chat -> /chat, com "ver raciocínio" abrindo o trace tipado. 202 vira cartão aprovar/negar; engrenagem com URL da API base /opspilot/; CORS"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Active incident coordination in the war room (Priority: P1)

As an incident responder, I want a focused web war room where I can follow the current conversation, ask for updates, and take action on the next recommended steps without leaving the incident context.

**Why this priority**: The war room is the primary operating surface for live incident response. If this flow is weak or confusing, the team loses the ability to coordinate quickly during critical events.

**Independent Test**: Can be fully tested by opening the war room, sending a message, and receiving a response that keeps the conversation and suggested actions visible in the same context.

**Acceptance Scenarios**:

1. **Given** a responder is in the war room, **When** they submit a message, **Then** the system sends it through the incident conversation flow and shows the response in the active thread.
2. **Given** the conversation is active, **When** the agent proposes an action or next step, **Then** the user can review the update in context and decide whether to continue or intervene.

---

### User Story 2 - Review the decision logic before approving or rejecting (Priority: P1)

As an incident responder, I want to inspect the reasoning behind a proposed action and decide whether to approve or reject it, so I can maintain control over operational changes.

**Why this priority**: In production operations, decisions must be transparent and reviewable. Approval gates reduce risk and make actions accountable.

**Independent Test**: Can be fully tested by opening a decision card, viewing the explanation or trace, and completing an approval or rejection outcome.

**Acceptance Scenarios**:

1. **Given** the system has generated a proposed action, **When** the responder opens the card, **Then** they can see the rationale and supporting evidence in a clear, reviewable format.
2. **Given** the responder is reviewing the action, **When** they choose approve or reject, **Then** the system records the decision and updates the card state accordingly.

---

### User Story 3 - Configure backend connectivity and resilience for the browser app (Priority: P2)

As an operator or administrator, I want a simple way to configure the backend base URL and understand when connectivity or cross-origin access is failing, so the war room remains usable and recoverable.

**Why this priority**: A production incident workflow depends on correct routing and secure browser access. Misconfigured endpoints or CORS restrictions block essential operations and reduce trust in the tool.

**Independent Test**: Can be fully tested by modifying the backend URL configuration, verifying the war room connects to the correct service, and observing error feedback when the connection is unavailable or blocked.

**Acceptance Scenarios**:

1. **Given** the app is configured with a valid backend base URL, **When** the user opens the war room, **Then** the app can reach the incident service and continue the conversation flow.
2. **Given** the backend is unavailable or blocked by network policy, **When** the user interacts with the app, **Then** the system shows a clear error state and actionable recovery guidance without leaving users in an unclear blank state.

---

### User Story 4 - Use a consistent interface across light and dark modes (Priority: P3)

As a responder working across different environments, I want the war room to remain clear and comfortable in both light and dark themes, with accessible interactions for keyboard and screen-reader use.

**Why this priority**: Incident work often occurs in long sessions and varied environments. A visually consistent, accessible interface reduces fatigue and supports inclusion.

**Independent Test**: Can be fully tested by switching theme modes, verifying content contrast, focus states, and the presence of meaningful labels and feedback across the interface.

**Acceptance Scenarios**:

1. **Given** the user is in the war room, **When** they switch between light and dark themes, **Then** the layout remains legible and the semantic meaning of each action remains clear.
2. **Given** a user navigates using keyboard or assistive technology, **When** they move through chat, actions, and error states, **Then** focus and labels remain visible and understandable.

### Edge Cases

- What happens when the chat is empty and the user opens the war room for the first time?
- How does the system handle an API outage, a timeout, or a blocked request from the browser environment?
- What happens when a decision card is submitted with no supporting trace or when the explanation is incomplete?
- How does the interface behave when the configured backend URL is invalid, missing, or changed during use?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a web-based war room that presents the active incident conversation and the current operational context in a single view.
- **FR-002**: Users MUST be able to send messages through the war room chat and receive responses from the incident workflow without leaving the operational context.
- **FR-003**: The system MUST expose a review path for agent reasoning so responders can inspect the underlying logic or trace before acting.
- **FR-004**: Decision outputs MUST be presented as reviewable cards that allow a responder to approve or reject the recommended action.
- **FR-005**: The system MUST record the user decision outcome and update the card state so the current status remains visible to the team.
- **FR-006**: The application MUST support a configurable backend base URL so teams can connect the web experience to the correct operational API environment.
- **FR-007**: The system MUST provide clear empty, loading, and error states when no conversation exists, the service is unavailable, or a request fails.
- **FR-008**: The system MUST protect the browser experience from silent failures by showing actionable guidance when the service is unreachable, misconfigured, or blocked by network restrictions.
- **FR-009**: The interface MUST support both light and dark modes with consistent layout, contrast, and terminology across states.
- **FR-010**: The war room MUST be keyboard and assistive-technology friendly, with visible focus states, meaningful labels, and equivalent options for critical actions.
- **FR-011**: The web experience MUST be compatible with the required cross-origin policy so the browser can communicate securely with the operational backend during normal use.

### Key Entities *(include if feature involves data)*

- **Incident Session**: The active operational context for a war room, including the conversation history and current task state.
- **Chat Message**: A user or system message exchanged during the incident workflow, associated with the operating context and response timeline.
- **Decision Card**: A structured action recommendation that includes status, rationale, and the responder approval decision.
- **Backend Configuration**: The operational endpoint settings used by the browser to reach the incident API environment.
- **Reasoning Trace**: The evidence or explanation behind a recommendation, used to support review and decision-making.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can start an incident conversation and receive a valid response in under 30 seconds during a healthy network and service state.
- **SC-002**: At least 90% of responders can successfully review a decision card and complete an approval or rejection flow without needing support.
- **SC-003**: 95% of operational actions include a visible explanation or trace available before the user makes a final decision.
- **SC-004**: Error and empty states are understood by at least 90% of tested users without confusion during the first use of the war room.
- **SC-005**: The web experience remains usable in both light and dark themes with no critical accessibility blockers for keyboard users or screen-reader users.

## Assumptions

- The primary users are responders and operators already familiar with incident workflows and operational decision-making.
- The war room is a browser-based interface that depends on an existing backend service for conversation and orchestration.
- The backend base URL can vary by environment, so configuration must be adjustable without code changes.
- A valid cross-origin policy is required for browser-to-backend communication, and the system should present clear guidance when this is not available.
- The first release focuses on core war room interactions and decision review, not on a broader multi-page operations suite.
