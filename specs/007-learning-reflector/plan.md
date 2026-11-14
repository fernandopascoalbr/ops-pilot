# Implementation Plan: Learning Reflection Memory

**Branch**: `007-learning-reflector` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from [spec.md](./spec.md)

## Summary

Adicionar um refletor de aprendizado após cada resposta para identificar fatos duráveis na última mensagem do usuário, bloquear conteúdo sensível ou pontual, persistir aprendizado de forma assíncrona e oferecer remoção explícita via operação de esquecimento de preferência.

## Technical Context

**Language/Version**: Node.js LTS com TypeScript ESM (`strict`).

**Primary Dependencies**: LangChain/OpenRouter para saída estruturada, Zod para validação de fronteira, módulos de memória existentes do projeto.

**Storage**: SQLite local (`node:sqlite`) usando o caminho governado por `OPSPILOT_DB`.

**Testing**: `node:test` + `tsx` com testes unitários e de integração no fluxo de chat/memória.

**Target Platform**: Serviço backend local exposto por HTTP e uso por CLI.

**Project Type**: Web-service com orquestração de agente e persistência local.

**Performance Goals**: O fluxo assíncrono de aprendizado não deve degradar perceptivelmente a latência de resposta ao usuário.

**Constraints**: Nunca armazenar pedido pontual, nunca armazenar segredo, manter isolamento por usuário, manter rastreabilidade segura da decisão.

**Scale/Scope**: Captura de aprendizado por mensagem em sessões de chat já existentes, com remoção de preferências aprendidas sob demanda.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- PASS (Spec-first): feature já possui spec versionada e plano dedicado.
- PASS (Safety): política explícita de bloqueio de segredos e de não memorização pontual reduz risco operacional.
- PASS (Evidence-driven): decisão de aprendizado é estruturada e auditável.
- PASS (Boundaries): refletor separado da fronteira HTTP e do store de memória, sem acoplar regra de domínio ao transporte.
- PASS (Quality/Testability): cobertura prevista para captura, bloqueio de sensível, persistência assíncrona e esquecimento.

### Re-check after Phase 1 design

- PASS: artefatos de pesquisa, dados, contrato e quickstart mantêm os mesmos gates sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/007-learning-reflector/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── agents/
├── chat/
├── http/
├── memory/
│   ├── embeddings.ts
│   ├── index.ts
│   ├── learning-reflector.ts
│   └── memory-store.ts
└── mcp/

tests/
├── integration/
└── unit/
```

**Structure Decision**: reutilizar `src/http` para gatilho pós-resposta e endpoint `/memories`, `src/memory` para persistência/recall/esquecimento, e `src/mcp` para a operação `forget_preference` como tool.

## Complexity Tracking

Sem violações de constituição que exijam justificativa adicional.
