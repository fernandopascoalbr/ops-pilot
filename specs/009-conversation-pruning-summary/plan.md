# Implementation Plan: Sumarização Incremental de Histórico

**Branch**: `009-conversation-pruning-summary` | **Date**: 2026-11-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from [spec.md](./spec.md)

## Summary

Adicionar pruning incremental do histórico de conversa no fluxo do `/chat`: manter apenas as 8 mensagens mais recentes em janela ativa, resumir em até 150 tokens o que sai dessa janela, mesclar com resumo anterior persistido em `conversation_summaries`, reexecutar somente quando um novo lote de 8 mensagens sair da janela e registrar evento `summarize` rastreável no `trace`.

## Technical Context

**Language/Version**: Node.js LTS com TypeScript ESM (`strict`).

**Primary Dependencies**: HTTP nativo Node, `zod` nas fronteiras, estratégias de agente existentes (`@langchain/*`) sem nova dependência obrigatória.

**Storage**: SQLite (`node:sqlite`) no mesmo banco operacional (`OPSPILOT_DB`), adicionando tabela `conversation_summaries`.

**Testing**: `node:test` com `tsx`, com foco em teste de integração HTTP e teste unitário determinístico com fake.

**Target Platform**: Serviço backend local (`POST /chat`) com persistência SQLite.

**Project Type**: Web-service único com camadas de chat/store/HTTP.

**Performance Goals**: Evitar sumarização por requisição; executar sumarização apenas em gatilhos de lote (8 mensagens deslocadas), mantendo latência do `/chat` na mesma ordem de grandeza atual.

**Constraints**: Resumo limitado a 150 tokens; preservação explícita de decisões/fatos/pendências; comportamento determinístico de trigger por lote; rastreabilidade por evento `summarize`.

**Scale/Scope**: Escopo restrito ao pipeline de conversa (`src/chat` + `src/http`) e contratos/testes associados; sem mudança de API pública além do trace/evento esperado.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- PASS (Spec-first): feature está especificada e versionada em `specs/009-conversation-pruning-summary`.
- PASS (Safety): mudança é de gestão de contexto e auditoria, sem automação destrutiva.
- PASS (Evidence-driven): evento `summarize` e persistência de resumo reforçam rastreabilidade do histórico operacional.
- PASS (Boundaries): separação clara entre fronteira HTTP, lógica de composição de contexto e persistência SQLite.
- PASS (Quality/Testability): plano inclui validação com testes determinísticos fake e integração do endpoint.

### Re-check after Phase 1 design

- PASS: artefatos gerados mantêm Zod nas fronteiras, persistência auditável em SQLite e foco em testes reproduzíveis.

## Project Structure

### Documentation (this feature)

```text
specs/009-conversation-pruning-summary/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── chat-pruning-summary.contract.yaml
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── chat/
│   ├── conversation-store.ts
│   └── sqlite-conversation-store.ts
├── domain/
│   └── strategy.ts
├── http/
│   └── server.ts
└── agents/
    └── trace.ts

tests/
├── integration/
│   └── chat-persistence.test.ts
└── unit/
    └── chat/
```

**Structure Decision**: manter projeto único e evoluir módulos existentes de chat/persistência/HTTP para suportar pruning + sumarização incremental, adicionando testes focados em comportamento de lote e preservação de contexto.

## Complexity Tracking

Sem violações de constituição que exijam justificativa adicional.
