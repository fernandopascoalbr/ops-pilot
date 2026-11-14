# Data Model: Reflect Plan-and-Execute Strategy

## 1) IncidentExecutionPlan

- **Purpose**: Representar o plano ativo de resposta para um incidente durante uma execução da estratégia.
- **Fields**:
  - `planId` (string): identificador único do plano de execução.
  - `incidentContext` (string): resumo do incidente/alerta que originou o plano.
  - `status` (enum): `draft | running | completed | terminated`.
  - `steps` (PlanStep[]): lista ordenada de passos vigentes.
  - `createdAt` (ISO datetime)
  - `updatedAt` (ISO datetime)
- **Validation rules**:
  - Deve existir ao menos 1 passo no plano inicial.
  - Status `completed` exige que todos os passos executáveis tenham sido avaliados/encerrados.
  - Status `terminated` exige motivo de término e registro de fallback (quando aplicável).
- **Relationships**:
  - 1:N com `PlanStep`
  - 1:N com `ReflectionRecord`
  - 1:1 com `StoppingPolicy` em uma execução específica

## 2) PlanStep

- **Purpose**: Representar uma ação executável e auditável dentro do plano.
- **Fields**:
  - `stepId` (string)
  - `order` (integer, >= 1)
  - `description` (string)
  - `goal` (string)
  - `status` (enum): `pending | running | done | skipped | failed`
  - `executionSummary` (string, opcional)
  - `tool` (string, opcional)
  - `args` (object, opcional)
- **Validation rules**:
  - `order` deve ser único por plano.
  - `description` e `goal` não podem ser vazios.
  - `done`, `failed` ou `skipped` devem possuir `executionSummary`.
- **State transitions**:
  - `pending -> running -> done`
  - `pending -> running -> failed`
  - `pending -> skipped`

## 3) ReflectionRecord

- **Purpose**: Registrar a avaliação pós-etapa e a decisão de continuidade.
- **Fields**:
  - `reflectionId` (string)
  - `stepId` (string, opcional quando reflexão é por bloco)
  - `iteration` (integer, >= 1)
  - `evidenceQuality` (enum): `low | medium | high`
  - `riskLevel` (enum): `low | medium | high | critical`
  - `confidenceLevel` (enum): `low | medium | high`
  - `decision` (enum): `continue | adjust | end`
  - `reasoning` (string)
  - `updatedSteps` (array de string, opcional)
  - `createdAt` (ISO datetime)
- **Validation rules**:
  - `decision` é obrigatório.
  - `adjust` deve justificar e, quando aplicável, trazer `updatedSteps`.
  - `end` deve registrar motivo explícito.
- **Relationships**:
  - N:1 com `IncidentExecutionPlan`
  - N:1 opcional com `PlanStep`

## 4) StoppingPolicy

- **Purpose**: Definir limites e gatilhos de término seguro da execução.
- **Fields**:
  - `maxIterations` (integer, >= 1)
  - `stopOnCriticalRisk` (boolean)
  - `stopOnResolved` (boolean)
  - `fallbackMode` (enum): `safe-close | human-escalation`
- **Validation rules**:
  - `maxIterations` obrigatório e superior a zero.
  - `fallbackMode` obrigatório para garantir finalização segura.

## Derived Metrics (for StrategyRunResult)

- `stepsUsed`: total de passos executados.
- `interactionLimit`: limite efetivo aplicado na execução.
- `latencyMs`: tempo total de execução.
- `llmCalls`: número de chamadas ao modelo para planejamento/reflexão/replanejamento.
