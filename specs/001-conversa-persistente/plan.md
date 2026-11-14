# Implementation Plan: Conversa Persistente no Chat

**Branch**: `001-conversa-persistente` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-conversa-persistente/spec.md`

## Summary

Adicionar persistência de conversas no fluxo `POST /chat`, com criação automática de conversa quando `conversationId` não for enviado, reaproveitamento das 12 últimas mensagens como histórico de contexto, retorno obrigatório do `conversationId` na resposta, e telemetria `historyMessages`. A entrega inclui contrato HTTP atualizado, modelo de dados para conversas/mensagens e testes determinísticos com `:memory:` e fake para estratégia.

## Technical Context

**Language/Version**: TypeScript (strict) em Node.js LTS (ESM/NodeNext)

**Primary Dependencies**: `zod` (validação na fronteira HTTP), `node:sqlite` (persistência local), estratégias em `src/agents/*`, `node:test` + `tsx` para testes

**Storage**: SQLite local via `DatabaseSync` (nova tabela `messages` e estrutura de conversas), com `:memory:` em testes

**Testing**: `node --import tsx --test` com foco em integração HTTP + unidade do ConversationStore usando fake strategy e banco em memória

**Target Platform**: Serviço backend Node.js local (HTTP JSON)

**Project Type**: Web-service backend em projeto único TypeScript

**Performance Goals**:
- Requisições `POST /chat` com histórico de até 12 mensagens devem manter latência perceptível equivalente ao fluxo atual em ambiente local
- 100% das respostas de sucesso devem incluir `conversationId` e `metrics.historyMessages`

**Constraints**:
- Validar toda entrada externa com Zod na borda
- Não quebrar contrato existente de resposta (`answer`, `trace`, `metrics`)
- Em caso de `conversationId` inexistente, retornar erro explícito (sem fallback silencioso)
- Histórico para composição limitado às últimas 12 mensagens

**Scale/Scope**:
- Evolução de um endpoint existente (`POST /chat`)
- Inclusão de um novo componente de domínio/aplicação para conversa (`ConversationStore`)
- Cobertura de testes para criação, continuação, limite de histórico e erro de conversa inexistente

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate Review

- **Spec-First Delivery**: PASS — feature possui spec formal em [spec.md](./spec.md).
- **Agent Safety Over Automation Speed**: PASS — entradas e erros de conversa serão explícitos e auditáveis.
- **Evidence-Driven Incident Handling**: PASS — histórico e métrica `historyMessages` preservam rastreabilidade da conversa.
- **Tool and Context Boundaries**: PASS — persistência de conversa ficará separada da borda HTTP e da estratégia.
- **Quality, Security, and Testability**: PASS — testes com `:memory:` e fake strategy garantem reprodutibilidade sem rede.

### Post-Phase 1 Re-Check

- **Spec-First Delivery**: PASS — artefatos de design gerados e vinculados.
- **Agent Safety Over Automation Speed**: PASS — contrato explicita criação de conversa, continuidade e falhas.
- **Evidence-Driven Incident Handling**: PASS — modelo inclui relacionamento entre conversa, mensagens e métrica de histórico.
- **Tool and Context Boundaries**: PASS — contratos e modelo separam HTTP, domínio de conversa e execução de estratégia.
- **Quality, Security, and Testability**: PASS — quickstart define validações ponta a ponta e cenários de erro.

## Project Structure

### Documentation (this feature)

```text
specs/001-conversa-persistente/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── chat-persistent.contract.yaml
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── http/
│   ├── chat-schema.ts            # adiciona conversationId opcional no request
│   └── server.ts                 # orquestra conversa persistente no POST /chat
├── chat/
│   ├── conversation-store.ts     # contrato append/lastMessages/create
│   └── sqlite-conversation-store.ts # implementação SQLite com tabela messages
├── agents/
│   └── index.ts                  # resolução de estratégia sem quebra de contrato
└── store/
    └── sqlite-ops-store.ts       # referência de padrões SQLite usados no projeto

tests/
├── integration/
│   └── chat-persistence.test.ts  # criação/continuidade/histórico/erros
└── fixtures/
    └── fake-strategies.ts        # fake determinístico reutilizado
```

**Structure Decision**: Manter projeto único TypeScript, evoluindo a camada HTTP existente e adicionando módulo dedicado de conversa para preservar separação de responsabilidades e testabilidade.

## Complexity Tracking

Nenhuma violação constitucional identificada; sem necessidade de exceções.
