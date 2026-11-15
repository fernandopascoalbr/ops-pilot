# Tasks: Medição de Contexto e Tokens

**Input**: Design documents from `/specs/008-context-usage-metrics/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Testes são obrigatórios nesta feature (explicitado em "Com testes" e FR-007).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Criar estrutura base para instrumentação de tokens/contexto e testes associados.

- [X] T001 Criar scaffolding inicial em `src/context/token.ts`, `tests/unit/context/token.test.ts` e `scripts/conversa-longa.sh`
- [X] T002 [P] Preparar fixture de teste de chat para inspeção de métricas em `tests/fixtures/http-client.ts`
- [X] T003 [P] Criar arquivo de integração para conversa longa em `tests/integration/conversa-longa.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implementar utilitários compartilhados de medição reutilizados por todas as histórias.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Implementar `estimateTokens` em `src/context/token.ts` com regra chars/4 e comportamento determinístico para string vazia
- [X] T005 Implementar montagem de `ContextSourceSegment` e `ContextBreakdown` em `src/context/token.ts` citando e aplicando literalmente as constraints: "`source`: Obrigatório; valores esperados: `currentMessage`, `conversationHistory`, `memoryRecall`", "`chars`: Obrigatório; `>= 0`", "`estimatedTokens`: Obrigatório; inteiro `>= 0`", "`items`: Obrigatório; pode conter itens com `chars = 0`", "`totalEstimatedTokens`: Obrigatório; consistente com soma dos segmentos"
- [X] T006 [P] Implementar extração normalizada de uso real em `src/context/token.ts` suportando caminhos alternativos (`usage_metadata.input_tokens`, `response_metadata.tokenUsage.promptTokens`) e retorno nulo quando indisponível
- [X] T007 [P] Adicionar testes unitários de fundação em `tests/unit/context/token.test.ts` cobrindo chars/4, fonte vazia, soma total e ausência de uso real

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Medir uso real de prompt no chat (Priority: P1) 🎯 MVP

**Goal**: Expor `promptTokens` real por requisição no `/chat`, sem quebrar sucesso quando o dado não vier.

**Independent Test**: Chamar `POST /chat` e validar que `metrics.promptTokens` reflete uso real quando disponível e `null` quando indisponível, mantendo status `200`.

### Tests for User Story 1

- [X] T008 [P] [US1] Adicionar teste de integração em `tests/integration/chat-success.test.ts` validando `metrics.promptTokens` quando presente
- [X] T009 [P] [US1] Adicionar teste de integração em `tests/integration/chat-success.test.ts` validando fallback seguro com `metrics.promptTokens = null`

### Implementation for User Story 1

- [X] T010 [P] [US1] Instrumentar coleta de uso real nas estratégias em `src/agents/react.ts`, `src/agents/plan-and-execute.ts` e `src/agents/reflect-plan-and-execute.ts`
- [X] T011 [US1] Integrar extração de `promptTokens` em `src/http/server.ts` ao compor `metrics` da resposta do `/chat`
- [X] T012 [US1] Atualizar tipos de métricas para suportar o novo campo em `src/domain/strategy.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Entender composição do contexto por fonte (Priority: P2)

**Goal**: Expor `contextBreakdown` estimado por fonte no `/chat` com total consistente.

**Independent Test**: Chamar `POST /chat` com histórico/memória e validar fontes separadas, `estimatedTokens` por item e `totalEstimatedTokens` igual à soma.

### Tests for User Story 2

- [X] T013 [P] [US2] Adicionar teste de integração em `tests/integration/chat-memory.test.ts` validando `contextBreakdown.items` com fontes separadas (`currentMessage`, `conversationHistory`, `memoryRecall`)
- [X] T014 [P] [US2] Adicionar teste de integração em `tests/integration/chat-persistence.test.ts` validando fonte vazia com `chars = 0` sem falha no retorno

### Implementation for User Story 2

- [X] T015 [P] [US2] Refatorar composição de contexto em `src/http/server.ts` para gerar segmentos por fonte e estimativas via `src/context/token.ts`
- [X] T016 [US2] Incluir `metrics.contextBreakdown` no payload `200` de `POST /chat` em `src/http/server.ts`
- [X] T017 [US2] Atualizar contrato da rota em `specs/003-add-chat-endpoint/contracts/chat-endpoint.contract.yaml` para refletir `promptTokens` e `contextBreakdown`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Acompanhar consumo por turno em conversa longa (Priority: P3)

**Goal**: Disponibilizar script operacional que imprime `promptTokens` por turno em conversa contínua.

**Independent Test**: Executar `bash scripts/conversa-longa.sh` e verificar saída por turno com `promptTokens` sem perder turnos já processados em caso de falha intermediária.

### Tests for User Story 3

- [X] T018 [P] [US3] Adicionar teste de integração em `tests/integration/conversa-longa.test.ts` validando impressão de `promptTokens` por turno
- [X] T019 [P] [US3] Adicionar teste de integração em `tests/integration/conversa-longa.test.ts` validando preservação de saídas de turnos anteriores quando ocorre falha intermediária

### Implementation for User Story 3

- [X] T020 [US3] Implementar fluxo de múltiplos turnos com reuso de `conversationId` em `scripts/conversa-longa.sh`
- [X] T021 [US3] Implementar parsing do JSON de resposta e impressão de `metrics.promptTokens` por turno em `scripts/conversa-longa.sh`
- [X] T022 [US3] Documentar execução do script e interpretação da saída em `specs/008-context-usage-metrics/quickstart.md`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Consolidar documentação, validações finais e consistência cross-feature.

- [X] T023 [P] Atualizar visão geral das métricas de contexto/tokens em `README.md`
- [X] T024 [P] Executar suíte de testes da feature em `tests/unit/context/token.test.ts`, `tests/integration/chat-success.test.ts`, `tests/integration/chat-memory.test.ts`, `tests/integration/chat-persistence.test.ts` e `tests/integration/conversa-longa.test.ts`
- [X] T025 Executar validação final de qualidade com `npm test` e `npm run typecheck`
- [X] T026 Verificar aderência final aos contratos e constraints no código em `src/context/token.ts` e `src/http/server.ts` (incluindo `promptTokens` nulo quando indisponível e total de breakdown consistente)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: Depend on Foundational completion
- **Polish (Phase 6)**: Depends on completion of desired user stories

### User Story Dependencies

- **US1 (P1)**: Inicia após Phase 2 e entrega MVP
- **US2 (P2)**: Inicia após Phase 2; pode evoluir em paralelo com US1 após T010-T012 estabilizarem contrato de métricas
- **US3 (P3)**: Inicia após US1 (depende de `metrics.promptTokens` disponível no `/chat`)

### Within Each User Story

- Tests MUST be written and fail before implementation
- Instrumentação/base antes de serialização HTTP
- Contrato/documentação antes da validação final de polish

### Parallel Opportunities

- Fase 1: T002 e T003 em paralelo
- Fase 2: T006 e T007 em paralelo após T004-T005
- US1: T008 e T009 em paralelo; T010 pode avançar em paralelo a ajustes de tipo/documentação
- US2: T013 e T014 em paralelo; T015 e T017 em paralelo após definição dos campos
- US3: T018 e T019 em paralelo
- Polish: T023 e T024 em paralelo

---

## Parallel Example: User Story 1

```bash
# Executar testes de US1 em paralelo
Task: "T008 [US1] em tests/integration/chat-success.test.ts"
Task: "T009 [US1] em tests/integration/chat-success.test.ts"

# Executar instrumentação paralela por estratégia
Task: "T010 [US1] em src/agents/react.ts"
Task: "T010 [US1] em src/agents/plan-and-execute.ts"
Task: "T010 [US1] em src/agents/reflect-plan-and-execute.ts"
```

## Parallel Example: User Story 2

```bash
# Executar testes de breakdown em paralelo
Task: "T013 [US2] em tests/integration/chat-memory.test.ts"
Task: "T014 [US2] em tests/integration/chat-persistence.test.ts"

# Executar implementação de breakdown e ajuste contratual em paralelo
Task: "T015 [US2] em src/http/server.ts"
Task: "T017 [US2] em specs/003-add-chat-endpoint/contracts/chat-endpoint.contract.yaml"
```

## Parallel Example: User Story 3

```bash
# Escrever cenários de script em paralelo
Task: "T018 [US3] em tests/integration/conversa-longa.test.ts"
Task: "T019 [US3] em tests/integration/conversa-longa.test.ts"

# Implementação e documentação em paralelo
Task: "T020 [US3] em scripts/conversa-longa.sh"
Task: "T022 [US3] em specs/008-context-usage-metrics/quickstart.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1
2. Completar Phase 2
3. Completar Phase 3 (US1)
4. Validar US1 isoladamente via `POST /chat`
5. Demonstrar MVP com `metrics.promptTokens`

### Incremental Delivery

1. Setup + Foundational
2. Entregar US1 (métrica real de prompt tokens)
3. Entregar US2 (breakdown por fonte)
4. Entregar US3 (script por turno)
5. Executar polish e validação final

### Parallel Team Strategy

1. Time fecha Setup + Foundational
2. Após base pronta:
   - Dev A: US1
   - Dev B: US2
   - Dev C: US3 (após US1 expor `promptTokens`)
3. Reunir para Phase 6

---

## Notes

- Todas as tasks seguem checklist obrigatório `- [ ] Txxx ...`
- Labels `[US1]`, `[US2]`, `[US3]` aplicadas apenas em fases de user story
- Paths explícitos em todas as tasks
- Ordem privilegia independência de história e validação incremental
