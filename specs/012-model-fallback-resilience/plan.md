# Implementation Plan: Model Fallback Resilience

**Branch**: `012-model-fallback-resilience` | **Date**: 2026-11-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from [spec.md](./spec.md)

## Summary

Adicionar resiliência de modelo no fluxo de chat com prioridade no modelo primário e fallback ordenado para modelos de reserva definidos por ambiente. O plano inclui tentativas controladas no primário, cadeia de fallback explícita, rastreabilidade operacional por evento `fallback`, exposição de `metrics.modelUsed` em sucesso e retorno determinístico de indisponibilidade quando nenhum modelo responder.

## Technical Context

**Language/Version**: Node.js LTS com TypeScript ESM (`strict`).

**Primary Dependencies**: LangChain/LangGraph, `@langchain/openai` (OpenRouter), Zod para fronteiras HTTP/CLI, `node:http`.

**Storage**: N/A para a feature; sem nova persistência, apenas instrumentação de trace e métricas por requisição.

**Testing**: `node:test` + `tsx` com cobertura de unidade (fábrica de modelo/trace) e integração HTTP (`processChatRequest`/`POST /chat`).

**Target Platform**: Serviço backend local (`localhost:3000`) e execução CLI.

**Project Type**: Web-service de operações com agente de raciocínio e estratégias LangGraph.

**Performance Goals**: manter latência de respostas bem-sucedidas dentro do envelope atual, adicionando no máximo o custo incremental das tentativas de retry/fallback quando o primário falhar.

**Constraints**: manter segurança operacional (sem fallback silencioso), rastreabilidade obrigatória de fallback e erro explícito de indisponibilidade quando todos os modelos falharem.

**Scale/Scope**: escopo restrito à configuração de modelos (`env`), fábrica de modelo (`src/agents/model.ts`), trace/métricas e contrato HTTP do `/chat`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- PASS (Spec-First): a feature possui especificação versionada antes da implementação.
- PASS (Agent Safety): fallback é explícito, observável e preserva falha determinística quando não houver resposta segura.
- PASS (Evidence-Driven): evento de trace `fallback` e `metrics.modelUsed` garantem auditabilidade.
- PASS (Tool and Context Boundaries): mudanças concentram-se em configuração, camada de agentes e fronteira HTTP sem misturar responsabilidades.
- PASS (Quality/Testability): critérios contemplam testes direcionados para retry/fallback, telemetria e erro 503.

### Re-check after Phase 1 design

- PASS: artefatos de pesquisa, modelo de dados, contrato e quickstart mantêm validação de fronteira, rastreabilidade e tratamento explícito de falha.

## Project Structure

### Documentation (this feature)

```text
specs/012-model-fallback-resilience/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── chat-model-resilience.contract.yaml
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── agents/
│   ├── model.ts
│   ├── trace.ts
│   ├── react.ts
│   ├── plan-and-execute.ts
│   └── reflect-plan-and-execute.ts
├── config/
│   └── env.ts
├── http/
│   ├── chat-schema.ts
│   └── server.ts
└── domain/
    └── strategy.ts

tests/
├── unit/
├── integration/
└── trace-format.test.ts
```

**Structure Decision**: manter projeto único e aplicar a feature nas camadas existentes (`config` → `agents` → `http`), preservando o contrato externo em `/chat` e testes em `tests/unit` e `tests/integration`.

## Complexity Tracking

Sem violações de constituição que exijam justificativa adicional.
