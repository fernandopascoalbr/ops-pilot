# Data Model: Verificação de status de provedores externos

## Entities

### ProviderStatusRequest

Represents the tool input used to check a third-party provider.

- `provider`: `github | cloudflare`
- `default`: `github`
- `description`: explains operational use in incident triage and external dependency checks

Validation rules:
- Must use one of the supported provider values.
- Input is validated at the boundary with Zod.
- Missing value falls back to `github`.

### ProviderStatusResult

Represents the compact result returned by the tool after a successful lookup.

- `indicator`: status indicator from the public StatusPage payload
- `description`: human-readable summary of the provider state
- `formatted`: compact string summary, usually `"<indicator> — <description>"`

Validation rules:
- Must be derived from a payload that matches the expected schema.
- Must be returned in one line to avoid context inflation.

### ExternalStatusPayload

Represents the public JSON from the provider status API.

- `status.indicator`: required string status such as `none`, `minor`, `major`, `critical`, etc.
- `status.description`: required string with human-readable status details

Validation rules:
- The payload must include `status` as an object.
- `status.indicator` and `status.description` must be present and strings.
- Any mismatch is treated as invalid response and converted to a readable tool error.

### ToolErrorObservation

Represents the visible failure reported by the tool when the final lookup fails.

- `message`: human-readable explanation describing the outcome
- `cause`: network timeout, 5xx failure, invalid schema, or unavailable provider

Validation rules:
- Must not throw beyond the tool boundary.
- Must remain in plain language suitable for the agent to use in diagnosis.

## Relationship summary

- `ProviderStatusRequest` -> resolves to a `ProviderStatusEndpoint` by `provider`
- `ProviderStatusEndpoint` -> fetches `ExternalStatusPayload`
- `ExternalStatusPayload` -> validated into `ProviderStatusResult`
- Failed validation or final retry failure -> `ToolErrorObservation`

## State transitions

- `idle` -> `requesting`
- `requesting` -> `validating` after fetch
- `validating` -> `success` when schema is correct
- `validating` -> `error` when payload invalid or fetch retries are exhausted
- `error` -> `finalized` with a compact tool result or readable observation
