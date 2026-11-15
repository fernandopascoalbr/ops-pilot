# Implementation Plan: Unified Routing Graph

**Branch**: `011-unified-routing-graph` | **Date**: 2026-11-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from [spec.md](./spec.md)

## Summary

Unificar a seleção de rota e estratégia em um único grafo operacional, mantendo contexto, roteador, três estratégias e resposta como nós de um fluxo contínuo. O plano centraliza a decisão do caminho em um router com saída estruturada (`route`, `reason`), mantém explicabilidade operacional em todos os eventos de trace e expõe o mesmo contrato em `/chat`, preservando a compatibilidade do fluxo de respostas atuais.

## Technical Context

**Language/Version**: Node.js LTS com TypeScript ESM (`strict`).

**Primary Dependencies**: LangChain/LangGraph, OpenRouter, Zod, `node:http`, `node:test`, `tsx`.

**Storage**: N/A para a feature; o estado permanece em memória por requisição e em eventos de trace do runtime, sem nova persistência obrigatória.

**Testing**: `node:test` com `tsx`, cobrindo unidade do roteador e integração HTTP do `/chat`.

**Target Platform**: Backend local e CLI/HTTP do sistema de operações.

**Project Type**: Web-service + agente de raciocínio com fluxo operacional orientado por grafo.

**Performance Goals**: manter a resolução de rota sem custo perceptível além da decisão atual da estratégia; o trace extra e o campo `route`/`reason` não devem prejudicar a latência principal do fluxo.

**Constraints**: preservar a estrutura atual das estratégias `react`, `plan-and-execute` e `reflect-plan-and-execute`, garantir saída estruturada para router e /chat e manter auditabilidade do caminho executado.

**Scale/Scope**: escopo restrito ao roteamento e observabilidade do fluxo, com três estratégias já existentes e um único ponto de decisão por requisição.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- PASS (Spec-first): a feature já possui especificação versionada e documentada.
- PASS (Safety): a mudança aumenta explicabilidade e controle do fluxo sem criar ação destrutiva automática.
- PASS (Evidence-driven): o roteador, a razão e o trace tornam a decisão auditável e rastreável.
- PASS (Boundaries): o grafo unificado e a saída estruturada ficam em camadas separadas (`agents`, `http`, `trace`).
- PASS (Quality/Testability): o plano inclui testes de contrato, trace e resposta do `/chat`.

### Re-check after Phase 1 design

- PASS: os artefatos de pesquisa, dados, contrato e quickstart preservam a validação de fronteira e a rastreabilidade do fluxo.

## Project Structure

### Documentation (this feature)

```text
specs/011-unified-routing-graph/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── chat-routing.contract.yaml
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── agents/
│   ├── index.ts
│   ├── react.ts
│   ├── plan-and-execute.ts
│   ├── reflect-plan-and-execute.ts
│   ├── trace.ts
│   └── types.ts
├── context/
│   └── context-builder.ts
├── domain/
│   ├── alerts.ts
│   └── strategy.ts
├── http/
│   ├── chat-schema.ts
│   └── server.ts
├── memory/
│   └── learning-reflector.ts
├── store/
│   └── sqlite-ops-store.ts
├── arena.ts
├── cli.ts
└── index.ts

tests/
├── unit/
│   └── agents/
├── integration/
│   └── chat-*.test.ts
└── fixtures/
```

**Structure Decision**: manter o projeto em um único backend e centralizar o grafo unificado em `src/agents`, com extração de rota e explicação em um módulo específico de roteamento e um contrato público alinhado ao `POST /chat`.

## Complexity Tracking

Sem violações de constituição que exijam justificativa adicional.
