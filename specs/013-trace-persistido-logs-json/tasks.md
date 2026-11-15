# Tasks: Trace Persistido e Logs JSON

**Input**: Design documents from `/specs/013-trace-persistido-logs-json/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/chat-trace-observability.contract.yaml, quickstart.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar estrutura mínima para persistência de trace e logging observável.

- [X] T001 Criar tipos base de rastreabilidade de requisição em `src/store/request-trace-store.ts`
- [X] T002 Exportar contrato de store de rastreabilidade em `src/store/index.ts`
- [X] T003 [P] Criar utilitário de emissão JSON por evento em `src/obs/logger.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Entregar fundação comum para todas as histórias (schema SQLite, integração de store e wiring no servidor).

**⚠️ CRITICAL**: Nenhuma história pode iniciar antes desta fase.

- [X] T004 Implementar schema SQLite de rastreabilidade em `src/store/sqlite-request-trace-store.ts` com tabelas `requests` e `trace_events` definidas no contrato `specs/013-trace-persistido-logs-json/contracts/chat-trace-observability.contract.yaml`
- [X] T005 Implementar `RequestRecord` em `src/store/request-trace-store.ts` citando restrições verbatim: "`requestId` Obrigatório; único", "`status` Obrigatório; `success` ou `error`", "`llmCalls` Obrigatório; inteiro >= 0", "`latencyMs` Obrigatório; inteiro >= 0", "`createdAt` Obrigatório", "`finishedAt` Obrigatório"
- [X] T006 [P] Implementar `TraceEvent` em `src/store/request-trace-store.ts` citando restrições verbatim: "`eventId` Obrigatório; único", "`requestId` Obrigatório; chave para `RequestRecord`", "`seq` Obrigatório; inteiro >= 1", "`node` Obrigatório", "`payload` Obrigatório; formato controlado por tipo de evento", "`occurredAt` Obrigatório"
- [X] T007 Integrar `SqliteRequestTraceStore` no bootstrap do servidor em `src/http/server.ts` e `src/index.ts`

**Checkpoint**: Store de rastreabilidade criado, exportado e conectado ao servidor.

---

## Phase 3: User Story 1 - Correlacionar requisição de chat ponta a ponta (Priority: P1) 🎯 MVP

**Goal**: Garantir `requestId` consistente em body e header `X-Request-Id` em respostas de sucesso e erro do `/chat`.

**Independent Test**: Chamar `POST /chat` em sucesso e falha e validar `body.requestId === header['x-request-id']`.

- [X] T008 [P] [US1] Criar teste de integração para resposta de sucesso com `requestId` em body e header em `tests/integration/chat-request-id-success.test.ts`
- [X] T009 [P] [US1] Criar teste de integração para resposta de erro com `requestId` em body e header em `tests/integration/chat-request-id-error.test.ts`
- [X] T010 [US1] Gerar/propagar `requestId` no fluxo de `processChatRequest` em `src/http/server.ts`
- [X] T011 [US1] Ajustar serialização HTTP para sempre incluir header `X-Request-Id` em `src/http/server.ts`
- [X] T012 [US1] Garantir inclusão de `requestId` em todos os corpos de resposta de `/chat` em `src/http/server.ts`

**Checkpoint**: `/chat` retorna correlação consistente para sucesso e erro.

---

## Phase 4: User Story 2 - Consultar histórico persistido da requisição (Priority: P2)

**Goal**: Persistir `requests` e `trace_events` e expor `GET /requests/:id` com retorno ordenado.

**Independent Test**: Executar um `/chat`, consultar `GET /requests/:id` e validar registro + trace ordenado; validar `404` para ID inexistente.

- [X] T013 [P] [US2] Criar teste de integração para consulta de histórico ordenado em `tests/integration/get-request-by-id-success.test.ts`
- [X] T014 [P] [US2] Criar teste de integração para `GET /requests/:id` com `404` em `tests/integration/get-request-by-id-not-found.test.ts`
- [X] T015 [US2] Persistir `RequestRecord` ao finalizar `/chat` em `src/http/server.ts` e `src/store/sqlite-request-trace-store.ts`
- [X] T016 [US2] Persistir `TraceEvent` por execução com ordenação determinística (`occurredAt` e `seq`) em `src/http/server.ts` e `src/store/sqlite-request-trace-store.ts`
- [X] T017 [US2] Implementar leitura `RequestTraceView` em `src/store/sqlite-request-trace-store.ts` respeitando validações: "`GET /requests/:id` deve retornar erro explícito para identificador inexistente" e "`O retorno de trace em GET /requests/:id deve ser determinístico na ordenação" (de `specs/013-trace-persistido-logs-json/data-model.md`)
- [X] T018 [US2] Implementar endpoint `GET /requests/:id` em `src/http/server.ts`
- [X] T019 [US2] Atualizar contrato de resposta HTTP para incluir estrutura `request` + `trace` em `src/http/server.ts`

**Checkpoint**: Histórico persistido consultável por ID com ordenação estável.

---

## Phase 5: User Story 3 - Registrar eventos operacionais em JSON enxuto (Priority: P3)

**Goal**: Emitir uma linha JSON por evento com metadados mínimos, sem payload completo.

**Independent Test**: Executar `/chat` e validar linhas JSON por evento contendo metadados e sem payload integral.

- [X] T020 [P] [US3] Criar teste unitário para formato de linha JSON por evento em `tests/unit/obs-json-line.test.ts`
- [X] T021 [P] [US3] Criar teste unitário para bloqueio de payload completo no log em `tests/unit/obs-metadata-only.test.ts`
- [X] T022 [US3] Implementar logger estruturado em `src/obs/logger.ts` garantindo "Uma linha JSON por evento operacional" e restrições de contrato em `specs/013-trace-persistido-logs-json/contracts/chat-trace-observability.contract.yaml`
- [X] T023 [US3] Integrar logging de eventos de trace no fluxo de `/chat` em `src/http/server.ts`
- [X] T024 [US3] Garantir que logs incluam `requestId`, `eventType`, `node`, `metadata` e excluam payload completo em `src/obs/logger.ts`

**Checkpoint**: Logs operacionais estruturados e seguros.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Consolidar qualidade e validação ponta a ponta da feature.

- [X] T025 [P] Atualizar exports e tipagens públicas de store/logger em `src/store/index.ts` e `src/obs/logger.ts`
- [X] T026 Executar validação completa da feature com `npm run typecheck` e `npm test`
- [X] T027 Validar cenários de `specs/013-trace-persistido-logs-json/quickstart.md` e ajustar documentação em `specs/013-trace-persistido-logs-json/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: inicia imediatamente.
- **Phase 2 (Foundational)**: depende de T001-T003.
- **Phase 3-5 (User Stories)**: dependem da conclusão da Phase 2.
- **Phase 6 (Polish)**: depende da conclusão das histórias implementadas.

### User Story Dependencies

- **US1 (P1)**: inicia após Phase 2; independe de US2/US3 para ser validada.
- **US2 (P2)**: inicia após Phase 2; usa `requestId` já estabelecido em US1.
- **US3 (P3)**: inicia após Phase 2; pode usar os eventos produzidos por US1/US2.

### Within Each User Story

- Testes primeiro (devem falhar antes da implementação).
- Wiring/contratos depois de persistência/regras de domínio.
- Checkpoint de cada história antes de avançar para a próxima prioridade.

---

## Parallel Opportunities

- **Setup**: T003 em paralelo com T001/T002.
- **Foundational**: T006 em paralelo com T005.
- **US1**: T008 e T009 em paralelo.
- **US2**: T013 e T014 em paralelo.
- **US3**: T020 e T021 em paralelo.
- **Polish**: T025 pode rodar antes de T026/T027.

---

## Parallel Example: User Story 1

```bash
Task: "T008 [US1] Criar teste de integração para resposta de sucesso em tests/integration/chat-request-id-success.test.ts"
Task: "T009 [US1] Criar teste de integração para resposta de erro em tests/integration/chat-request-id-error.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "T013 [US2] Criar teste de integração de sucesso em tests/integration/get-request-by-id-success.test.ts"
Task: "T014 [US2] Criar teste de integração 404 em tests/integration/get-request-by-id-not-found.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "T020 [US3] Criar teste unitário de json-line em tests/unit/obs-json-line.test.ts"
Task: "T021 [US3] Criar teste unitário de metadados mínimos em tests/unit/obs-metadata-only.test.ts"
```

---

## Implementation Strategy

### MVP First (US1)

1. Finalizar Phase 1 e Phase 2.
2. Entregar US1 completa (T008-T012).
3. Validar correlação de `requestId` ponta a ponta.

### Incremental Delivery

1. Após MVP, implementar US2 para consulta operacional persistida.
2. Em seguida, implementar US3 para padronização de observabilidade.
3. Finalizar com Phase 6 para validação completa e documentação.

### Team Parallel Strategy

1. Time completo na fundação (Phase 1-2).
2. Depois, distribuição por história:
   - Dev A: US1
   - Dev B: US2
   - Dev C: US3
