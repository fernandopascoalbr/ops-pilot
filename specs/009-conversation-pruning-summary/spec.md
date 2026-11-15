# Feature Specification: Conversation Pruning Summary

**Feature Branch**: `[009-conversation-pruning-summary]`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "Sumarização de histórico (pruning): tabela conversation_summaries; o que sai das 8 mensagens recentes vira resumo de 150 tokens preservando decisões, fatos e pendencias, MESCLADO ao resumo anterior e persistido - refeito só quando 8 novas mensagens saem da janela, nunca a cada request. Resumo entra no contexto; evento summarize. Com teste fake"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Preserve long conversation context (Priority: P1)

As an incident operator, I want older conversation history to be compacted into a persistent summary so that important decisions, facts, and pending items remain available without overloading the active context window.

**Why this priority**: Losing critical context during incident handling directly increases triage errors and response delay.

**Independent Test**: Can be fully tested by processing a conversation where messages move beyond the latest 8-message window and verifying that a persisted merged summary is produced and re-used in context.

**Acceptance Scenarios**:

1. **Given** a conversation with more than 8 recent messages and no previous summary, **When** older messages leave the 8-message window, **Then** a summary up to 150 tokens is generated, persisted, and added to the working context.
2. **Given** a conversation with an existing persisted summary, **When** a new batch of 8 messages leaves the recent window, **Then** the new summary is merged with the previous summary, persisted as the latest summary state, and added to the working context.

---

### User Story 2 - Avoid unnecessary re-summarization (Priority: P2)

As an incident operator, I want summarization to run only when a full new batch exits the recent window so the system avoids repeated work and keeps response flow stable.

**Why this priority**: Preventing summarization on every request reduces operational noise and keeps behavior predictable.

**Independent Test**: Can be tested by making repeated requests without 8 new messages leaving the window and confirming no new summary computation or replacement occurs.

**Acceptance Scenarios**:

1. **Given** fewer than 8 newly displaced messages since the last summary, **When** another request is processed, **Then** no new summary is generated and the existing persisted summary remains unchanged.

---

### User Story 3 - Audit summarization lifecycle (Priority: P3)

As an operations lead, I want a dedicated summarize event emitted whenever summarization is performed so I can trace when context compaction happened.

**Why this priority**: Traceability is required to audit context decisions during incident reviews.

**Independent Test**: Can be tested by triggering a summarization cycle and validating that one summarize event is emitted with linkage to the conversation.

**Acceptance Scenarios**:

1. **Given** a summarization cycle is triggered, **When** the summary is persisted, **Then** a summarize event is emitted for that cycle.

---

### Edge Cases

- What happens when exactly 8 messages leave the recent window in a single update? A single summarization cycle must run once for that batch.
- How does the system handle conversations where displaced messages contain only operational noise? The summary must still preserve explicit decisions, facts, and pending items if present, and avoid inventing new content.
- What happens when a previous summary exists but no new batch of 8 messages has exited? The previous summary remains active and unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST keep the 8 most recent conversation messages as the active non-summarized window.
- **FR-002**: The system MUST summarize messages that leave the active 8-message window into a compact text with a maximum size of 150 tokens.
- **FR-003**: The system MUST ensure each generated summary preserves decisions, factual statements, and pending items from the displaced message batch.
- **FR-004**: The system MUST merge each new displaced-batch summary with the previously persisted summary before saving the updated summary state.
- **FR-005**: The system MUST persist the merged summary in a conversation summary record associated with the conversation history.
- **FR-006**: The system MUST regenerate and persist a new merged summary only when a full new batch of 8 messages has left the active window since the previous summarization cycle.
- **FR-007**: The system MUST NOT regenerate summaries on every request when the full-batch trigger condition has not been met.
- **FR-008**: The system MUST include the latest persisted summary in the context used for subsequent conversation processing.
- **FR-009**: The system MUST emit a `summarize` event whenever a summarization cycle is executed.
- **FR-010**: The feature MUST be covered by at least one deterministic automated validation scenario using synthetic/fake conversation data that proves batch-trigger behavior and summary persistence.

### Key Entities *(include if feature involves data)*

- **Conversation Summary**: Persisted compact representation of conversation history outside the latest 8-message window; includes merged summary content and linkage to its conversation.
- **Conversation Message Window**: Ordered set of the 8 most recent messages kept in full form for immediate context.
- **Summarization Event**: Recorded event indicating a summarization cycle occurred for a conversation, for auditability.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of evaluated conversations with more than 8 messages, all messages outside the latest 8-message window are represented in persisted summary form instead of remaining only in raw-window context.
- **SC-002**: 100% of generated summaries stay within the 150-token limit.
- **SC-003**: In controlled validation runs, 100% of summarization cycles preserve at least one explicitly verifiable decision/fact/pending item when such items are present in displaced messages.
- **SC-004**: Across repeated requests without a new displaced batch of 8 messages, summary regeneration count remains at 0.
- **SC-005**: 100% of executed summarization cycles produce a corresponding summarize event entry.

## Assumptions

- Summarization operates per conversation independently; summaries are not shared across conversations.
- The latest 8-message window is ordered chronologically and represents the active context slice.
- Existing governance for event logging and persistence applies to summarize events and summary records.
- Existing context assembly flow supports injecting one persisted summary segment alongside recent messages.
