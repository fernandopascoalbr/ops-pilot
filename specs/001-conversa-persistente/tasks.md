# Tasks: Conversa Persistente no Chat

**Input**: Design documents from `/specs/001-conversa-persistente/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Testes são obrigatórios nesta feature (FR-009 e quickstart), incluindo cenários com `:memory:` e fake strategy.

**Organization**: Tasks agrupadas por user story para implementação e validação independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode executar em paralelo (arquivos distintos, sem dependência de tarefas incompletas)
- **[Story]**: Mapeia a tarefa para a user story (US1, US2, US3)
- Todos os itens incluem caminho exato de arquivo

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar estrutura mínima para persistência de conversa e testes da feature

- [X] T001 Criar pasta de domínio de conversa em src/chat/ com barrel export em src/chat/index.ts
- [X] T002 Criar esqueleto de testes de persistência em tests/integration/chat-persistence.test.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Fundamentos compartilhados que bloqueiam todas as user stories

**⚠️ CRITICAL**: Nenhuma user story inicia antes desta fase

- [X] T003 Definir contrato do ConversationStore com métodos create/append/lastMessages em src/chat/conversation-store.ts
- [X] T004 Implementar SqliteConversationStore com `DatabaseSync` e schema com tabela conversations/messages em src/chat/sqlite-conversation-store.ts
- [X] T005 [P] Exportar e integrar store de conversa no bootstrap em src/http/server.ts e src/http/index.ts
- [X] T006 [P] Adicionar tipos de mensagem histórica (`role` user|assistant, content, createdAt) em src/chat/conversation-store.ts
- [X] T007 Criar testes unitários do store com `:memory:` para create/append/lastMessages em tests/chat/conversation-store.test.ts

**Checkpoint**: Foundation pronta — execução de user stories pode começar

---

## Phase 3: User Story 1 - Retomar conversa existente (Priority: P1) 🎯 MVP

**Goal**: Permitir continuidade de conversa existente via `conversationId`

**Independent Test**: Enviar duas requisições com o mesmo `conversationId` e validar retorno do mesmo id, histórico reutilizado e persistência de mensagens

### Tests for User Story 1

- [X] T008 [P] [US1] Criar teste de integração para continuidade com conversationId existente em tests/integration/chat-persistence.test.ts
- [X] T009 [P] [US1] Criar teste de erro para `conversationId` inexistente retornando erro explícito em tests/integration/chat-persistence.test.ts

### Implementation for User Story 1

- [X] T010 [US1] Estender schema HTTP para aceitar `conversationId` opcional não vazio em src/http/chat-schema.ts
- [X] T011 [US1] Introduzir erro de domínio `ConversationNotFoundError` em src/chat/conversation-store.ts e tratativa na fronteira em src/http/server.ts
- [X] T012 [US1] Implementar resolução de conversa existente no fluxo de chat em src/http/server.ts
- [X] T013 [US1] Persistir mensagem do usuário e do assistente com append no fluxo de chat em src/http/server.ts
- [X] T014 [US1] Garantir retorno obrigatório de `conversationId` na resposta 200 em src/http/server.ts

**Checkpoint**: User Story 1 funcional e testável de forma independente

---

## Phase 4: User Story 2 - Iniciar conversa sem identificador (Priority: P2)

**Goal**: Criar conversa automaticamente quando `conversationId` não for informado

**Independent Test**: Enviar requisição sem `conversationId` e validar criação automática e retorno de id válido

### Tests for User Story 2

- [X] T015 [P] [US2] Criar teste de integração para criação automática de conversa sem conversationId em tests/integration/chat-persistence.test.ts
- [X] T016 [P] [US2] Criar teste de integração confirmando reutilização do id criado na segunda chamada em tests/integration/chat-persistence.test.ts

### Implementation for User Story 2

- [X] T017 [US2] Implementar caminho de criação de conversa quando `conversationId` estiver ausente em src/http/server.ts
- [X] T018 [US2] Garantir que o `conversationId` criado seja devolvido no payload de sucesso em src/http/server.ts

**Checkpoint**: User Story 2 funcional independentemente da US1

---

## Phase 5: User Story 3 - Limitar histórico e medir historyMessages (Priority: P3)

**Goal**: Usar somente as últimas 12 mensagens no contexto e registrar `metrics.historyMessages`

**Independent Test**: Popular conversa com mais de 12 mensagens e validar limite aplicado e métrica consistente

### Tests for User Story 3

- [X] T019 [P] [US3] Criar teste de integração para limite de 12 mensagens no histórico em tests/integration/chat-persistence.test.ts
- [X] T020 [P] [US3] Criar teste de integração para `metrics.historyMessages` refletindo contagem real (0..12) em tests/integration/chat-persistence.test.ts

### Implementation for User Story 3

- [X] T021 [US3] Implementar busca de histórico com `lastMessages(conversationId, 12)` antes do append do usuário em src/http/server.ts
- [X] T022 [US3] Adaptar execução de estratégia para usar mensagem composta com histórico em src/http/server.ts
- [X] T023 [US3] Enriquecer métricas com `historyMessages` no retorno de sucesso em src/http/server.ts
- [X] T024 [US3] Garantir no store que `lastMessages` retorne ordem cronológica crescente e tamanho máximo 12 em src/chat/sqlite-conversation-store.ts

**Checkpoint**: Todas as user stories implementadas e independentes

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Consolidação, regressão e documentação final

- [X] T025 [P] Atualizar testes de contrato HTTP para incluir `conversationId` e `metrics.historyMessages` em tests/integration/chat-success.test.ts
- [X] T026 [P] Atualizar fixtures/helper de teste para suportar payload com `conversationId` em tests/fixtures/http-client.ts
- [X] T027 Executar suíte focada da feature em tests/chat/conversation-store.test.ts e tests/integration/chat-persistence.test.ts
- [X] T028 Executar regressão de chat em tests/integration/chat-*.test.ts e registrar ajustes necessários em specs/001-conversa-persistente/quickstart.md
- [X] T029 Executar suíte completa do projeto e typecheck via package scripts em /Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/package.json

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: sem dependências
- **Phase 2 (Foundational)**: depende da Phase 1 e bloqueia todas as user stories
- **Phase 3 (US1)**: depende da Phase 2
- **Phase 4 (US2)**: depende da Phase 2 (pode avançar em paralelo com US1 após base pronta, mas prioridade é P1 -> P2)
- **Phase 5 (US3)**: depende da Phase 2 e da base de fluxo em `src/http/server.ts` estabilizada pelas fases anteriores
- **Phase 6 (Polish)**: depende de todas as user stories concluídas

### User Story Dependencies

- **US1 (P1)**: início após fundação, sem dependência funcional de outras US
- **US2 (P2)**: início após fundação, reutiliza o mesmo fluxo de chat da US1
- **US3 (P3)**: início após fundação, depende da persistência e continuidade já implementadas

### Within Each User Story

- Testes da história devem falhar antes da implementação
- Contrato/schema antes de orquestração de endpoint
- Persistência antes de validação final de resposta

### Parallel Opportunities

- **Foundational**: T005 e T006 em paralelo após T003/T004
- **US1**: T008 e T009 em paralelo
- **US2**: T015 e T016 em paralelo
- **US3**: T019 e T020 em paralelo
- **Polish**: T025 e T026 em paralelo

---

## Parallel Example: User Story 1

```bash
# Testes de US1 em paralelo:
Task: "T008 [US1] continuidade com conversationId existente em tests/integration/chat-persistence.test.ts"
Task: "T009 [US1] erro explícito para conversationId inexistente em tests/integration/chat-persistence.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Concluir Phase 1 e Phase 2
2. Concluir US1 (Phase 3)
3. Validar US1 de forma independente
4. Demonstrar continuidade de conversa como MVP

### Incremental Delivery

1. Base pronta (Phase 1 + 2)
2. Entregar US1 (continuidade de conversa)
3. Entregar US2 (criação automática sem id)
4. Entregar US3 (limite de histórico + métrica)
5. Consolidar com Phase 6

### Parallel Team Strategy

Com múltiplos devs após fundação:

1. Dev A: fluxo e testes US1
2. Dev B: fluxo e testes US2
3. Dev C: fluxo e testes US3 e ajustes de métricas

---

## Notes

- `[P]` indica tarefas em arquivos distintos e sem bloqueio direto
- Labels `[US1]`, `[US2]`, `[US3]` garantem rastreabilidade com o spec
- Cada história mantém critério de teste independente
