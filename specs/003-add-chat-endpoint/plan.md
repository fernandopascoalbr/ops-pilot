# Implementation Plan: Add Chat Endpoint

**Branch**: `003-add-chat-endpoint` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-add-chat-endpoint/spec.md`

## Summary

Adicionar um endpoint HTTP de chat que receba mensagem com estratégia opcional e reflexão opcional, valide entrada na borda, resolva estratégia via registry nomeado e retorne resposta estruturada (`answer`, `trace`, `metrics`) com tratamento explícito de erros de validação, estratégia desconhecida e timeout de 180 segundos. A entrega inclui contrato de interface e teste de integração determinístico sem rede.

## Technical Context

**Language/Version**: TypeScript (strict) com runtime Node.js LTS (ES2022 / NodeNext)

**Primary Dependencies**: `zod` para validação de borda; estratégias existentes em `src/agents/*`; runner de testes `node:test` com `tsx`

**Storage**: N/A (sem persistência nova para esta feature)

**Testing**: `node --import tsx --test` com foco em teste de integração HTTP + doubles determinísticos

**Target Platform**: Serviço backend Node.js local (HTTP JSON)

**Project Type**: Web-service backend em projeto único TypeScript

**Performance Goals**:
- Responder requisições válidas dentro do orçamento configurado por estratégia
- Encerrar 100% das requisições acima de 180s com timeout explícito

**Constraints**:
- Validação obrigatória de entrada com schema de borda
- Sem acesso de rede externa nos testes da feature
- Preservar contrato de estratégias existentes (`run(input, maxIterations?) => StrategyRunResult`)

**Scale/Scope**:
- Um novo endpoint (`POST /chat`)
- Um registry de estratégias por nome
- Um wrapper opcional de reflexão aplicado por flag de entrada
- Testes de integração cobrindo sucesso e erros principais

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate Review

- **Spec-First Delivery**: PASS — spec da feature disponível e vinculada ao plano.
- **Agent Safety Over Automation Speed**: PASS — validação de entrada, erro explícito e timeout mandatórios.
- **Evidence-Driven Incident Handling**: PASS — resposta exige `trace` e `metrics` auditáveis.
- **Tool and Context Boundaries**: PASS — boundary HTTP separado de orquestração de estratégia.
- **Quality, Security, and Testability**: PASS — testes de integração determinísticos e sem rede definidos.

### Post-Phase 1 Re-Check

- **Spec-First Delivery**: PASS — artefatos de design (research, modelo, contrato, quickstart) gerados.
- **Agent Safety Over Automation Speed**: PASS — contrato inclui comportamento de timeout e erro por estratégia desconhecida.
- **Evidence-Driven Incident Handling**: PASS — modelo e contrato mantêm rastreabilidade de `trace` e `metrics`.
- **Tool and Context Boundaries**: PASS — registry e servidor HTTP isolam responsabilidades.
- **Quality, Security, and Testability**: PASS — quickstart define validação local reprodutível e sem rede.

## Project Structure

### Documentation (this feature)

```text
specs/003-add-chat-endpoint/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── chat-endpoint.contract.yaml
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── agents/
│   ├── index.ts                  # novo registry nome -> strategy (+ withReflection)
│   ├── react.ts
│   ├── plan-and-execute.ts
│   └── reflect-plan-and-execute.ts
├── http/
│   ├── server.ts                 # novo endpoint POST /chat
│   └── chat-schema.ts            # schema zod do request/response de erro
├── domain/
│   └── strategy.ts
└── index.ts                      # opcional: bootstrap do server

tests/
└── integration/
    └── chat-endpoint.test.ts     # novo teste de integração determinístico sem rede
```

**Structure Decision**: Projeto único backend TypeScript; adicionar camada HTTP dedicada e registry explícito em `src/agents/index.ts` para não acoplar resolução de estratégia ao endpoint.

## Complexity Tracking

Nenhuma violação constitucional identificada; seção de exceções não aplicável.
