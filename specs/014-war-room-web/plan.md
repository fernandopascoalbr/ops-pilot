# Implementation Plan: War Room Web

**Branch**: `014-war-room-web` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-war-room-web/spec.md`

## Summary

Implementar uma interface web em Vite + React + TypeScript para a sala de guerra operacional do OpsPilot. A experiência central é um chat de incidentes com resposta em contexto, abertura de trace tipado para revisão humana, cartões de decisão para aprovar ou rejeitar ações e uma configuração de conexão com a API base do backend (`/opspilot/`). A solução deve reforçar estados vazios, erro e carregamento, suporte a dark mode e acessibilidade, preservando a segurança da comunicação entre browser e backend com tratamento explícito de CORS e falhas de rede.

## Technical Context

**Language/Version**: TypeScript strict com Vite + React + TypeScript em runtime browser moderno (Node.js LTS para build e execução local)

**Primary Dependencies**: Vite, React, React DOM, browser fetch, Zod para validação de configuração e payloads do cliente, Vitest + Testing Library para UI tests

**Storage**: Local storage do navegador para preferência de tema e configuração de URL da API; sem banco novo no frontend

**Testing**: `vitest` com `@testing-library/react` para cenários de interface e regressão de estados; testes de integração do cliente com mock de fetch para manter a camada HTTP determinística

**Target Platform**: Aplicação web em navegador, com suporte a desktop e ambientes de operação em incidentes

**Project Type**: Web application (frontend + integração com backend existente)

**Performance Goals**:
- responder visualmente as interações de chat em menos de 1s para estados locais
- apresentar a primeira resposta de operação em até 30s em rede e backend saudáveis
- manter comportamento estável em sessões longas com foco em incident response

**Constraints**:
- must preserve the backend contract already exposed by `POST /chat`
- browser must recover gracefully from network, timeout, and CORS failures without leaving the user in a blank state
- approval/rejection actions must be clear and auditable, with trace accessible before finalizing a decision
- dark mode and accessibility must be part of the default design, not a late add-on

**Scale/Scope**:
- one page war room with chat, trace inspector, decision cards, and settings panel
- interface state model for loading, success, empty, and error states
- configuration for configurable backend base URL and environment selection

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate Review

- **Spec-First Delivery**: PASS — a feature specification exists and fully defines the expected user value.
- **Agent Safety Over Automation Speed**: PASS — the design preserves explicit review before operational action and explains failure states instead of silent behavior.
- **Evidence-Driven Incident Handling**: PASS — reasoning trace and decision evidence are first-class UI objects.
- **Tool and Context Boundaries**: PASS — the front-end stays separated from backend orchestration and only consumes the existing API contract.
- **Quality, Security, and Testability**: PASS — design includes validation, error handling, and UI testability.

### Post-Phase 1 Re-Check

- **Spec-First Delivery**: PASS — research, data model, contracts and quickstart are produced.
- **Agent Safety Over Automation Speed**: PASS — the plan includes explicit approval workflow and recovery guidance for misconfigured or blocked requests.
- **Evidence-Driven Incident Handling**: PASS — trace inspection and decision cards become audit objects in the UI.
- **Tool and Context Boundaries**: PASS — backend remains the integration boundary; the web app is a client layer with a strict config contract.
- **Quality, Security, and Testability**: PASS — plan calls for contract validation, typed state, and deterministic client tests.

## Project Structure

### Documentation (this feature)

```text
specs/014-war-room-web/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── war-room-ui.contract.yaml
└── tasks.md
```

### Source Code (repository root)

```text
web/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   └── providers/
│   ├── components/
│   │   ├── chat/
│   │   ├── decision-card/
│   │   ├── trace-panel/
│   │   └── settings/
│   ├── features/
│   │   └── war-room/
│   │       ├── war-room-page.tsx
│   │       ├── states.ts
│   │       └── use-war-room.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── config.ts
│   │   └── cors.ts
│   ├── types/
│   │   ├── chat.ts
│   │   ├── trace.ts
│   │   └── decision.ts
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── dark.css
│   │   └── accessibility.css
│   └── main.tsx
├── public/
│   └── favicon.svg
├── index.html
├── vite.config.ts
├── package.json
└── tsconfig.json
```

**Structure Decision**: A dedicated `web/` application is the right boundary for the experience. The existing backend remains in the repository root and is consumed through a dedicated API client layer with a single configuration source for `baseUrl` and route resolution.

## Complexity Tracking

Nenhuma violação constitucional identificada; seção de exceções não aplicável.
