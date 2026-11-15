# Implementation Plan: Trace Persistido e Logs JSON

**Branch**: `013-trace-persistido-logs-json` | **Date**: 2026-11-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from [spec.md](./spec.md)

## Summary

Implementar rastreabilidade ponta a ponta da execução de `/chat` com `requestId` consistente em corpo e header, persistência de registro e trace em SQLite e consulta operacional dedicada em `GET /requests/:id`. O desenho também inclui padronização de log estruturado (uma linha JSON por evento, apenas metadados) para auditoria segura e redução de ruído operacional.

## Technical Context

**Language/Version**: Node.js LTS com TypeScript ESM (`strict`).

**Primary Dependencies**: `node:http`, `node:sqlite`, Zod nas fronteiras HTTP/CLI, runtime de agentes existente (LangChain/LangGraph) e infraestrutura atual de trace.

**Storage**: SQLite local para `requests` (métricas e status) e `trace_events` (eventos ordenáveis por tempo e nó).

**Testing**: `node:test` + `tsx` com testes unitários para serialização/log e persistência, e integração HTTP para `/chat` e `GET /requests/:id`.

**Target Platform**: API backend local em `localhost:3000` (execução por `tsx src/index.ts`).

**Project Type**: Web-service orientado a operações e resposta a incidentes.

**Performance Goals**: manter processamento de `/chat` dentro do envelope atual e atender consultas `GET /requests/:id` com retorno completo em até 2 segundos para histórico típico.

**Constraints**: logs sem payload sensível completo, correlação obrigatória por `requestId`, ordenação determinística de trace no endpoint de leitura e erros explícitos para `id` inexistente.

**Scale/Scope**: escopo focado em contrato HTTP (`/chat` e `/requests/:id`), camada de persistência SQLite e logging observável; sem alterar semântica funcional do agente fora de rastreabilidade.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- PASS (Spec-First Delivery): trabalho parte de spec versionada e planejada antes de execução.
- PASS (Agent Safety Over Automation Speed): reforça observabilidade e auditoria, sem ações autônomas destrutivas.
- PASS (Evidence-Driven Incident Handling): persistência de trace e consulta por `requestId` ampliam rastreabilidade operacional.
- PASS (Tool and Context Boundaries): separa fronteira HTTP, persistência e logging sem colapsar responsabilidades.
- PASS (Quality, Security, and Testability): mantém validação de fronteiras, logging mínimo de metadados e foco em testes direcionados.

### Re-check after Phase 1 design

- PASS: artefatos de pesquisa, modelo de dados, contratos e quickstart preservam rastreabilidade, limites de dados em log e validação explícita de comportamento esperado.

## Project Structure

### Documentation (this feature)

```text
specs/013-trace-persistido-logs-json/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── chat-trace-observability.contract.yaml
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── http/
│   ├── chat-schema.ts
│   └── server.ts
├── store/
│   ├── ops-store.ts
│   ├── sqlite-ops-store.ts
│   └── index.ts
├── chat/
│   └── index.ts
├── infra/
│   └── store.ts
├── config/
│   └── env.ts
└── mcp/
    └── logger.ts

tests/
├── integration/
├── unit/
├── sqlite-ops-store.test.ts
└── trace-format.test.ts
```

**Structure Decision**: manter projeto único e aplicar mudanças nas camadas já existentes de fronteira HTTP, persistência (`store`) e observabilidade (`logger`), preservando o restante do fluxo de chat.

## Complexity Tracking

Sem violações de constituição que exijam justificativa adicional.
