---

description: "Task list for implementing the Add Chat Endpoint feature"
---

# Tasks: Add Chat Endpoint

**Input**: Design documents from `/specs/003-add-chat-endpoint/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: A especificação pede teste de integração determinístico sem rede; por isso, tasks de testes foram incluídas.

**Organization**: Tasks agrupadas por user story para permitir implementação e validação independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de task incompleta)
- **[Story]**: User story da task (`[US1]`, `[US2]`, `[US3]`)
- Todas as descrições incluem caminhos de arquivo explícitos

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar estrutura mínima para camada HTTP e testes de integração.

- [X] T001 Criar estrutura inicial da feature em `src/http/server.ts`, `src/http/chat-schema.ts` e exportações em `src/http/index.ts`
- [X] T002 [P] Criar estrutura de testes de integração em `tests/integration/chat-success.test.ts`, `tests/integration/chat-validation-errors.test.ts`, `tests/integration/chat-strategy-errors.test.ts` e `tests/integration/chat-timeout.test.ts`
- [X] T003 [P] Criar fixtures determinísticas sem rede em `tests/fixtures/fake-strategies.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura comum que bloqueia todas as user stories.

**⚠️ CRITICAL**: Nenhuma user story começa antes desta fase.

- [X] T004 Implementar schema de entrada com validações verbatim do data-model em `src/http/chat-schema.ts`: "`message` deve existir e conter conteúdo textual válido", "`strategy`, quando presente, deve ser string não vazia", "`reflect`, quando presente, deve ser booleano"
- [X] T005 [P] Criar registry de estratégias em `src/agents/index.ts` com regra verbatim do data-model "`name` deve ser único no catálogo" e resolução por nome com default `react`
- [X] T006 Implementar wrapper condicional de reflexão em `src/agents/index.ts` para aplicar `withReflection` apenas quando `reflect=true`
- [X] T007 [P] Implementar contrato base de erro HTTP em `src/http/server.ts` para formatos de falha (`400` com `issues`, `422` com `error`, `504` com `error`)
- [X] T008 Integrar bootstrap do servidor HTTP em `src/index.ts` para expor rota `POST /chat` via `src/http/server.ts`

**Checkpoint**: Fundação pronta — user stories podem seguir.

---

## Phase 3: User Story 1 - Enviar mensagem no chat (Priority: P1) 🎯 MVP

**Goal**: Permitir envio de mensagem com estratégia opcional e retorno de sucesso estruturado.

**Independent Test**: Enviar payload válido com e sem `strategy` e validar `200` com `answer`, `trace`, `metrics`.

### Tests for User Story 1

- [X] T009 [US1] Implementar teste de integração de sucesso com estratégia default em `tests/integration/chat-success.test.ts` validando `POST /chat` sem `strategy` retorna `200` com `answer`, `trace`, `metrics`
- [X] T010 [US1] Implementar teste de integração de sucesso com estratégia explícita em `tests/integration/chat-success.test.ts` validando `POST /chat` com `strategy` conhecida retorna `200` com `answer`, `trace`, `metrics`

### Implementation for User Story 1

- [X] T011 [US1] Implementar resolução de estratégia default `react` no fluxo de `POST /chat` em `src/http/server.ts` usando `src/agents/index.ts`
- [X] T012 [US1] Implementar fluxo de resposta de sucesso em `src/http/server.ts` garantindo regra verbatim do data-model "`strategy.run` deve retornar `answer`, `trace` e `metrics`"
- [X] T013 [US1] Conectar estratégias fake determinísticas aos testes em `tests/fixtures/fake-strategies.ts` e uso em `tests/integration/chat-success.test.ts` sem dependência de rede

**Checkpoint**: User Story 1 funcional e testável de forma independente (MVP).

---

## Phase 4: User Story 2 - Receber feedback claro para erros de entrada (Priority: P2)

**Goal**: Retornar erros claros e distintos para body inválido e estratégia desconhecida.

**Independent Test**: Enviar body inválido e `strategy` desconhecida; validar códigos e payloads de erro corretos.

### Tests for User Story 2

- [X] T014 [P] [US2] Implementar teste de body inválido em `tests/integration/chat-validation-errors.test.ts` validando `400` com `issues`
- [X] T015 [P] [US2] Implementar teste de estratégia desconhecida em `tests/integration/chat-strategy-errors.test.ts` validando `422` com `error`

### Implementation for User Story 2

- [X] T016 [US2] Implementar mapeamento de falha de validação para `400` em `src/http/server.ts` usando schema de `src/http/chat-schema.ts` e retornando `issues` detalhadas
- [X] T017 [US2] Implementar mapeamento de estratégia não registrada para `422` em `src/http/server.ts` consumindo lookup do `src/agents/index.ts`
- [X] T018 [US2] Cobrir edge case de mensagem vazia/espacos no schema em `src/http/chat-schema.ts` para rejeição como body inválido (`400`)

**Checkpoint**: User Stories 1 e 2 funcionam com sucesso e erros independentes.

---

## Phase 5: User Story 3 - Evitar espera indefinida no processamento (Priority: P3)

**Goal**: Encerrar requisições que excedem o limite de 180 segundos com erro de timeout.

**Independent Test**: Simular estratégia lenta e validar retorno `504` ao ultrapassar o limite.

### Tests for User Story 3

- [X] T019 [US3] Implementar teste de timeout em `tests/integration/chat-timeout.test.ts` com estratégia fake lenta validando retorno `504`

### Implementation for User Story 3

- [X] T020 [US3] Implementar guarda de timeout de 180 segundos em `src/http/server.ts` no ciclo de execução da estratégia
- [X] T021 [US3] Implementar resposta de timeout (`504` com `error`) em `src/http/server.ts` sem retornar payload de sucesso parcial

**Checkpoint**: Todas as user stories funcionais e testáveis isoladamente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Consolidação final, validação integrada e documentação.

- [X] T022 [P] Atualizar validação guiada da feature em `specs/003-add-chat-endpoint/quickstart.md` com comandos finais dos testes de integração
- [X] T023 Validar aderência ao contrato em `specs/003-add-chat-endpoint/contracts/chat-endpoint.contract.yaml` contra comportamento implementado em `src/http/server.ts`
- [X] T024 Executar suíte alvo `node --import tsx --test tests/integration/chat-*.test.ts` e corrigir falhas nos arquivos `tests/integration/chat-*.test.ts` e `src/http/server.ts`
- [X] T025 Executar suíte geral `npm test` e corrigir regressões em `tests/**/*.test.ts` e arquivos impactados em `src/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: sem dependências
- **Phase 2 (Foundational)**: depende da Phase 1 e bloqueia todas as user stories
- **Phase 3 (US1)**: depende da conclusão da Phase 2
- **Phase 4 (US2)**: depende da conclusão da Phase 2 (pode executar em paralelo com US1 se houver equipe)
- **Phase 5 (US3)**: depende da conclusão da Phase 2 (pode executar em paralelo com US1/US2 se houver equipe)
- **Phase 6 (Polish)**: depende das user stories desejadas concluídas

### User Story Dependencies

- **US1 (P1)**: sem dependência de outras stories após fundação
- **US2 (P2)**: sem dependência funcional de US1; integra na mesma rota
- **US3 (P3)**: sem dependência funcional de US1/US2; integra no controle de execução da mesma rota

### Within Each User Story

- Testes da story primeiro, depois implementação
- Validação/schema antes da lógica final de retorno
- Endpoint finaliza integração da story

### Parallel Opportunities

- **Setup**: T002 e T003 em paralelo após T001
- **Foundational**: T005 e T007 em paralelo; T006 depende de T005
- **US1**: priorizar sequência T009 → T010 por compartilharem `tests/integration/chat-success.test.ts`
- **US2**: T014 e T015 em paralelo
- **Polish**: T022 em paralelo com T023

---

## Parallel Example: User Story 2

```bash
# Escrever testes de erro da US2 em paralelo:
Task: "T014 [US2] Implementar teste de body inválido em tests/integration/chat-validation-errors.test.ts"
Task: "T015 [US2] Implementar teste de estratégia desconhecida em tests/integration/chat-strategy-errors.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Concluir Phase 1 (Setup)
2. Concluir Phase 2 (Foundational)
3. Concluir Phase 3 (US1)
4. Validar independentemente com testes da US1
5. Demonstrar MVP com `POST /chat` em sucesso

### Incremental Delivery

1. Setup + Foundational
2. Entregar US1 (MVP)
3. Entregar US2 (qualidade de erro e UX de integração)
4. Entregar US3 (resiliência por timeout)
5. Finalizar polish e regressão

### Parallel Team Strategy

Com múltiplas pessoas:

1. Time resolve Setup + Foundational
2. Após fundação:
   - Pessoa A: US1
   - Pessoa B: US2
   - Pessoa C: US3
3. Convergir em Phase 6 para validação final

---

## Notes

- Tasks com `[P]` usam arquivos distintos e baixo acoplamento imediato
- Labels `[US1]`, `[US2]`, `[US3]` garantem rastreabilidade por história
- Cada user story possui critério de teste independente
- Escopo de implementação segue constituição: validação de borda, segurança operacional e testabilidade
