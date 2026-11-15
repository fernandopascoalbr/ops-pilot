# Tasks: Sumarização Incremental de Histórico

**Input**: Design documents from `/specs/009-conversation-pruning-summary/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Incluídos porque a especificação exige validação determinística com fake (`FR-010`).

**Organization**: Tasks agrupadas por user story para implementação e validação independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: Mapeamento da tarefa para user story (US1, US2, US3)
- Todos os itens incluem caminho exato de arquivo

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar base de implementação e teste para sumarização incremental.

- [X] T001 Criar fixture determinístico de conversa longa para testes fake em tests/fixtures/conversation-summary-fixtures.ts
- [X] T002 [P] Criar utilitário de contagem/limite de tokens para resumo incremental (máximo 150 tokens) em src/chat/conversation-summary.ts
- [X] T003 [P] Definir helpers de montagem de resumo consolidado (merge resumo anterior + novo lote) em src/chat/conversation-summary.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura central que bloqueia todas as user stories.

**⚠️ CRITICAL**: Nenhuma história começa antes deste bloco.

- [X] T004 Evoluir contrato de store com operações de resumo por conversa em src/chat/conversation-store.ts
- [X] T005 Implementar schema e acesso SQLite da tabela conversation_summaries em src/chat/sqlite-conversation-store.ts com constraints verbatim: `conversationId ... chave única por conversa`, `summaryText ... até 150 tokens por geração incremental`, `summarizedMessageCount ... >= 0; não regressivo`, `updatedAt ... Obrigatório`
- [X] T006 [P] Criar função para calcular lote deslocado elegível com regra verbatim `batchSize ... deve ser exatamente 8 para disparo` em src/chat/conversation-summary.ts
- [X] T007 [P] Adicionar suporte ao tipo de trace `summarize` em src/domain/strategy.ts
- [X] T008 Atualizar helper de trace para criar eventos `summarize` reutilizáveis em src/agents/trace.ts

**Checkpoint**: Persistência e primitives de sumarização prontas; histórias podem iniciar.

---

## Phase 3: User Story 1 - Preserve long conversation context (Priority: P1) 🎯 MVP

**Goal**: Persistir resumo consolidado quando mensagens saem da janela de 8 e incluir esse resumo no contexto.

**Independent Test**: Processar conversa com volume suficiente para deslocar mensagens da janela e validar criação/merge persistido + uso do resumo no contexto.

### Tests for User Story 1

- [X] T009 [P] [US1] Adicionar teste de integração para criação inicial de summary persistido ao deslocar lote em tests/integration/chat-persistence.test.ts
- [X] T010 [P] [US1] Adicionar teste de integração para merge com resumo anterior persistido em tests/integration/chat-persistence.test.ts
- [X] T011 [P] [US1] Adicionar teste unitário fake de preservação de decisões/fatos/pendências na função de resumo em tests/unit/chat/conversation-summary.test.ts

### Implementation for User Story 1

- [X] T012 [US1] Implementar leitura do resumo persistido e injeção no contexto composto do chat em src/http/server.ts
- [X] T013 [US1] Implementar geração de resumo incremental para mensagens fora da janela ativa de 8 em src/http/server.ts
- [X] T014 [US1] Persistir resumo consolidado (merge anterior + novo lote) após geração incremental em src/http/server.ts
- [X] T015 [US1] Garantir que janela ativa preserve apenas 8 mensagens recentes na composição de histórico em src/http/server.ts

**Checkpoint**: US1 funcional e testável de forma independente.

---

## Phase 4: User Story 2 - Avoid unnecessary re-summarization (Priority: P2)

**Goal**: Impedir re-sumarização quando não houver novo lote completo de 8 mensagens deslocadas.

**Independent Test**: Repetir requests intermediárias após ciclo de sumarização e comprovar ausência de nova geração/persistência até completar novo lote.

### Tests for User Story 2

- [X] T016 [P] [US2] Adicionar teste de integração para garantir que menos de 8 mensagens deslocadas não disparam nova sumarização em tests/integration/chat-persistence.test.ts
- [X] T017 [P] [US2] Adicionar teste de integração para validar que o resumo persistido permanece inalterado entre gatilhos de lote em tests/integration/chat-persistence.test.ts

### Implementation for User Story 2

- [X] T018 [US2] Implementar controle por summarizedMessageCount para bloquear reprocessamento de mensagens já sumarizadas em src/http/server.ts
- [X] T019 [US2] Aplicar regra de trigger por lote completo (8 novas deslocadas) antes de qualquer atualização de resumo em src/http/server.ts

**Checkpoint**: US2 funcional e testável de forma independente.

---

## Phase 5: User Story 3 - Audit summarization lifecycle (Priority: P3)

**Goal**: Emitir evento `summarize` em toda sumarização efetiva para rastreabilidade operacional.

**Independent Test**: Executar ciclo de sumarização e validar presença de evento `summarize` no trace do turno.

### Tests for User Story 3

- [X] T020 [P] [US3] Adicionar teste de integração para validar evento trace `summarize` em ciclo válido de sumarização em tests/integration/chat-persistence.test.ts
- [X] T021 [P] [US3] Adicionar teste de integração para validar ausência de `summarize` quando lote completo não é atingido em tests/integration/chat-persistence.test.ts

### Implementation for User Story 3

- [X] T022 [US3] Emitir evento de trace `summarize` com metadados de conversa e batch ao persistir resumo em src/http/server.ts
- [X] T023 [US3] Atualizar contrato do endpoint para incluir `summarize` no trace e regras comportamentais finais em specs/009-conversation-pruning-summary/contracts/chat-pruning-summary.contract.yaml

**Checkpoint**: US3 funcional e auditável de forma independente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Ajustes finais multi-história e validação end-to-end.

- [X] T024 [P] Atualizar guia de validação operacional com cenários finais de lote/sumarização/evento em specs/009-conversation-pruning-summary/quickstart.md
- [X] T025 Executar e ajustar suite direcionada de regressão de chat para não quebrar comportamento existente em tests/integration/chat-success.test.ts
- [X] T026 Validar tipos e suíte de testes do escopo da feature (`npm run typecheck` e `npm test -- tests/integration/chat-persistence.test.ts tests/unit/chat/conversation-summary.test.ts`) e registrar resultados em specs/009-conversation-pruning-summary/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: sem dependências.
- **Phase 2 (Foundational)**: depende de Phase 1 e bloqueia todas as user stories.
- **Phase 3 (US1)**: começa após Phase 2.
- **Phase 4 (US2)**: começa após Phase 2; depende logicamente da infraestrutura de US1 para reutilizar resumo persistido.
- **Phase 5 (US3)**: começa após Phase 2; depende da existência do ciclo de sumarização implementado em US1/US2.
- **Phase 6 (Polish)**: depende das histórias selecionadas concluídas.

### User Story Dependencies

- **US1 (P1)**: independente após foundational; define o MVP.
- **US2 (P2)**: depende do mecanismo base de sumarização/persistência introduzido em US1.
- **US3 (P3)**: depende do gatilho de sumarização para auditar eventos reais.

### Within Each User Story

- Testes da história primeiro (devem falhar antes da implementação).
- Implementação de regra de negócio depois.
- Ajustes de contrato/documentação ao final da história.

### Parallel Opportunities

- Setup: T002 e T003 paralelas após T001.
- Foundational: T006 e T007 paralelas após T004/T005; T008 após T007.
- US1: T009, T010 e T011 paralelas.
- US2: T016 e T017 paralelas.
- US3: T020 e T021 paralelas.
- Polish: T024 paralela a ajustes finais antes de T026.

---

## Parallel Example: User Story 1

```bash
# Testes independentes em paralelo (US1):
T009 tests/integration/chat-persistence.test.ts
T010 tests/integration/chat-persistence.test.ts
T011 tests/unit/chat/conversation-summary.test.ts
```

## Parallel Example: User Story 2

```bash
# Cenários de não re-sumarização em paralelo (US2):
T016 tests/integration/chat-persistence.test.ts
T017 tests/integration/chat-persistence.test.ts
```

## Parallel Example: User Story 3

```bash
# Auditoria de evento summarize em paralelo (US3):
T020 tests/integration/chat-persistence.test.ts
T021 tests/integration/chat-persistence.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Finalizar Phase 1 + Phase 2.
2. Entregar Phase 3 (US1).
3. Validar teste independente da US1.
4. Demonstrar valor de contexto preservado com janela curta.

### Incremental Delivery

1. MVP com US1.
2. Adicionar US2 para controle de custo/estabilidade de trigger.
3. Adicionar US3 para rastreabilidade completa.
4. Fechar com Phase 6 (polish + validação final).

### Parallel Team Strategy

1. Time converge em Phase 1/2.
2. Após foundational:
   - Dev A: US1
   - Dev B: US2
   - Dev C: US3
3. Consolidar com Phase 6.

---

## Notes

- Todos os tasks seguem formato checklist obrigatório com ID sequencial, labels e caminhos.
- Evitar dependência cruzada desnecessária entre histórias para preservar testabilidade independente.
- Manter validação de fronteira e persistência auditável conforme constituição.
