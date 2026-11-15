# Feature Specification: Context Budgeting

**Feature Branch**: `[010-context-budgeting]`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "Context builder com orçamento por seção:
src/context/context-builder.ts monta o prompt de TODAS as estratégias com teto por seção via env CONTEXT_BUDGET_*: system e mensagens intocáveis, resumo 200, janela 1200 (corta as mais antigas), memória 300 (corta menor score). Teste: tetos baixos cortam na ordem certa."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build a prompt that respects per-section budgets (Priority: P1)

The system assembles one prompt that combines all active strategies while ensuring that each section stays within its configured budget. This keeps the prompt useful and within operational limits without discarding the most critical instructions or recent user context.

**Why this priority**: The prompt is the core interface for downstream reasoning and any overflow or over-pruning can degrade the usefulness of every strategy at the same time.

**Independent Test**: The feature can be validated by constructing a prompt with multiple sections under a constrained budget and confirming the resulting content honors the configured limits and protected sections.

**Acceptance Scenarios**:

1. **Given** a prompt builder with system instructions and user messages, **When** a section budget is configured, **Then** the system preserves system instructions and user messages without trimming them.
2. **Given** a summary section capped at 200, **When** the prompt is built with more available content than allowed, **Then** the summary is reduced to fit the configured cap.
3. **Given** a conversation window capped at 1200, **When** the window exceeds the cap, **Then** the oldest entries are removed first while preserving the most recent context.
4. **Given** a memory section capped at 300 and scored memories, **When** the section exceeds the cap, **Then** the lowest-score entries are removed first while keeping higher-value memories.

---

### User Story 2 - Preserve the intended pruning order when budgets are tight (Priority: P1)

When all section budgets are active and the overall prompt must shrink further, the system trims sections in a predictable order so the most essential context remains intact. The order is governed by the configured limits and the protected status of the system and message sections.

**Why this priority**: Predictable trimming prevents accidental loss of important context and makes the prompt builder testable and explainable.

**Independent Test**: A low-budget scenario can be tested by checking that summary, then window, then memory are pruned in the defined sequence while protected sections remain untouched.

**Acceptance Scenarios**:

1. **Given** a prompt that exceeds the configured budgets, **When** the builder must reduce content, **Then** it trims the summary before the window and memory sections.
2. **Given** an oversized window, **When** pruning is required, **Then** the oldest window entries are removed first.
3. **Given** an oversized memory store, **When** pruning is required, **Then** the entries with the lowest score are removed first.

---

### User Story 3 - Operate with environment-configured section budgets (Priority: P2)

A team can tune the prompt budget by environment variables without changing business logic. The system respects each configured cap and uses the correct pruning rules for each section.

**Why this priority**: Runtime configuration allows safer operation across different environments and reduces the risk of a hardcoded prompt size harming the system.

**Independent Test**: The feature can be validated by setting different `CONTEXT_BUDGET_*` values and confirming the resulting prompt respects those values.

**Acceptance Scenarios**:

1. **Given** different budget values for summary, window, and memory, **When** the context builder runs, **Then** each section respects its own cap.
2. **Given** a missing or incomplete budget configuration, **When** the system expands the prompt, **Then** it falls back to sensible defaults or preserves the configured baseline without violating protected sections.

---

### Edge Cases

- What happens when a configured budget is lower than the current content in a non-protected section?
- How does the system behave when the window includes messages with identical timestamps or no clear age ordering?
- What happens when memory items are missing a score or when multiple entries share the same lowest score?
- How does the system behave when the total prompt must be reduced below the sum of the individual section budgets while protected sections remain fixed?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST build a single prompt that combines all active strategies while honoring per-section budgets.
- **FR-002**: The system MUST keep the system instructions section and the user message section intact, treating them as protected content that is not trimmed.
- **FR-003**: The system MUST enforce a summary section budget of 200 items or tokens, as defined by the environment configuration for that section.
- **FR-004**: The system MUST enforce a conversation window budget of 1200 items or tokens, trimming the oldest entries first when the window exceeds the cap.
- **FR-005**: The system MUST enforce a memory budget of 300 items or tokens, trimming entries with the lowest relevance score first when the memory section exceeds the cap.
- **FR-006**: The system MUST apply trimming in a predictable order when the overall prompt is forced below a tighter cap, with summary content reduced first, then the conversation window, and then memory content.
- **FR-007**: The system MUST allow the section budgets to be configured through environment variables in the `CONTEXT_BUDGET_*` family without requiring code changes.
- **FR-008**: The system MUST preserve the highest-value available context first by keeping the most recent conversation entries and the highest-scoring memory items when trimming is necessary.
- **FR-009**: The system MUST behave deterministically when ties occur in pruning decisions so that repeated builds produce consistent output.
- **FR-010**: The system MUST expose or document the effective budget used for each section in a way that supports testing and debugging.

### Key Entities *(include if feature involves data)*

- **Prompt Section**: A distinct part of the final prompt, such as system instructions, user messages, summary, conversation window, or memory. Each section has a configured budget and a trimming policy.
- **Conversation Window Entry**: A single message or item in the recent interaction history, ordered by recency and subject to oldest-first trimming.
- **Memory Item**: A retained fact or observation with an associated relevance score that determines its priority when memory must be reduced.
- **Budget Configuration**: The environment-based limit for each prompt section, including the protected status of system and message content.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The final prompt never exceeds the configured budget for each section under normal operating conditions.
- **SC-002**: In low-budget scenarios, the prompt builder trims the summary, then the conversation window, and then memory in the defined order while leaving protected sections untouched.
- **SC-003**: At least 95% of produced prompts keep the most recent conversation turns and the highest-scoring memory items when pruning is required.
- **SC-004**: Users can trust that the system preserves critical instructions and recent context while still keeping the prompt within operational limits.

## Assumptions

- The prompt builder already has a concept of summary, window, and memory sections before this feature is introduced.
- Each section can be reduced independently without changing the underlying source data.
- Relevance scores are comparable across memory items and lower scores indicate lower priority.
- The environment configuration is the authoritative source for budget limits unless a safer default is required at runtime.
- This feature focuses on prompt composition and pruning behavior rather than altering how summaries or memory entries are generated.
