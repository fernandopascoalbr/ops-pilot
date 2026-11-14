# Tasks: MCP Incident Server

**Input**: Design documents from `/specs/001-mcp-incident-server/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/mcp-incident-server.contract.yaml](./contracts/mcp-incident-server.contract.yaml), [quickstart.md](./quickstart.md)

**Tests**: Incluir testes é obrigatório nesta feature, pois a spec exige “sobe o server e valida o list de tools”.

**Organization**: Tasks agrupadas por user story para permitir implementação e validação independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: Mapeia a user story (`[US1]`, `[US2]`, `[US3]`)
- Todas as tarefas abaixo incluem caminho explícito de arquivo

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar dependências e entrypoint do servidor MCP.

- [X] T001 Adicionar `@modelcontextprotocol/sdk` em [package.json](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/package.json)
- [X] T002 Adicionar script npm `mcp = "tsx src/mcp/server.ts"` em [package.json](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/package.json)
- [X] T003 Criar estrutura inicial do servidor MCP em [src/mcp/server.ts](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/src/mcp/server.ts)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Definir base compartilhada para evitar divergência entre tools existentes e MCP.

**⚠️ CRITICAL**: Nenhuma user story deve começar antes de concluir esta fase.

- [X] T004 Extrair e exportar schemas compartilhados de `list_alerts`, `open_incident` e `resolve_incident` em [src/agents/tools.ts](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/src/agents/tools.ts)
- [X] T005 [P] Criar adaptadores de execução MCP reutilizando as operações existentes (`listAlerts`, `openIncident`, `resolveIncident`) em [src/mcp/handlers.ts](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/src/mcp/handlers.ts)
- [X] T006 [P] Criar utilitário de diagnóstico para stderr (sem `console.log`) em [src/mcp/logger.ts](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/src/mcp/logger.ts)

**Checkpoint**: Servidor MCP pode ser implementado com fonte única de schemas/store e regra de canais de saída.

---

## Phase 3: User Story 1 - Operar incidentes via MCP (Priority: P1) 🎯 MVP

**Goal**: Expor `list_alerts`, `open_incident` e `resolve_incident` no servidor MCP `incidentarena`.

**Independent Test**: Subir o servidor MCP e validar que as três tools aparecem no catálogo e executam fluxo básico.

### Tests for User Story 1

- [X] T007 [P] [US1] Criar teste de integração para startup MCP e listagem de tools (`list_alerts`, `open_incident`, `resolve_incident`) em [tests/integration/mcp-server-tools.test.ts](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/tests/integration/mcp-server-tools.test.ts)
- [X] T008 [P] [US1] Criar teste de contrato dos schemas de entrada das três tools em [tests/integration/mcp-server-contracts.test.ts](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/tests/integration/mcp-server-contracts.test.ts)

### Implementation for User Story 1

- [X] T009 [US1] Implementar inicialização do servidor `incidentarena` com transporte stdio em [src/mcp/server.ts](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/src/mcp/server.ts)
- [X] T010 [US1] Registrar a tool `list_alerts` em [src/mcp/server.ts](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/src/mcp/server.ts) com a restrição literal `status enum [firing, resolved, all], default firing` definida em [specs/001-mcp-incident-server/contracts/mcp-incident-server.contract.yaml](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/specs/001-mcp-incident-server/contracts/mcp-incident-server.contract.yaml)
- [X] T011 [US1] Registrar a tool `open_incident` em [src/mcp/server.ts](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/src/mcp/server.ts) com as restrições literais `required [title, service, severity]`, `title minLength 1`, `service minLength 1`, `severity enum [low, medium, high, critical]`, `summary minLength 1 nullable true` definidas em [specs/001-mcp-incident-server/contracts/mcp-incident-server.contract.yaml](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/specs/001-mcp-incident-server/contracts/mcp-incident-server.contract.yaml)
- [X] T012 [US1] Registrar a tool `resolve_incident` em [src/mcp/server.ts](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/src/mcp/server.ts) com a restrição literal `id minLength 1` definida em [specs/001-mcp-incident-server/contracts/mcp-incident-server.contract.yaml](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/specs/001-mcp-incident-server/contracts/mcp-incident-server.contract.yaml)
- [X] T013 [US1] Conectar handlers MCP ao estado operacional compartilhado (sem store paralelo) em [src/mcp/handlers.ts](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/src/mcp/handlers.ts)

**Checkpoint**: User Story 1 funcional e testável de forma independente.

---

## Phase 4: User Story 2 - Garantir consistência de validação (Priority: P2)

**Goal**: Garantir que MCP e tools existentes compartilhem a mesma fonte de verdade para schema e store.

**Independent Test**: Requisições válidas/inválidas devem produzir os mesmos resultados e validações no MCP e nas tools atuais.

### Tests for User Story 2

- [X] T014 [P] [US2] Criar teste de paridade de validação entre MCP e tools existentes para entradas inválidas em [tests/integration/mcp-validation-parity.test.ts](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/tests/integration/mcp-validation-parity.test.ts)
- [X] T015 [P] [US2] Criar teste de paridade de persistência (mesmo OpsStore compartilhado) em [tests/integration/mcp-store-parity.test.ts](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/tests/integration/mcp-store-parity.test.ts)

### Implementation for User Story 2

- [X] T016 [US2] Refatorar para reutilizar schemas Zod exportados em [src/agents/tools.ts](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/src/agents/tools.ts) dentro de [src/mcp/server.ts](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/src/mcp/server.ts)
- [X] T017 [US2] Garantir reutilização das mesmas operações de store existentes via [src/agents/ops-store.ts](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/src/agents/ops-store.ts) em [src/mcp/handlers.ts](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/src/mcp/handlers.ts)
- [X] T018 [US2] Implementar mapeamento explícito de erros de validação/estado incompatível em [src/mcp/server.ts](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/src/mcp/server.ts)

**Checkpoint**: User Story 2 funcional e testável de forma independente.

---

## Phase 5: User Story 3 - Preservar canal de protocolo sem ruído (Priority: P3)

**Goal**: Manter stdout exclusivo do protocolo MCP e diagnóstico apenas em stderr.

**Independent Test**: Exercitar chamadas MCP e comprovar ausência de logs de diagnóstico em stdout.

### Tests for User Story 3

- [X] T019 [P] [US3] Criar teste de disciplina de canais (stdout sem ruído, stderr para diagnóstico) em [tests/integration/mcp-stdio-discipline.test.ts](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/tests/integration/mcp-stdio-discipline.test.ts)

### Implementation for User Story 3

- [X] T020 [US3] Integrar utilitário de logging em stderr e remover qualquer `console.log` do servidor em [src/mcp/server.ts](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/src/mcp/server.ts)
- [X] T021 [US3] Garantir que mensagens operacionais do servidor usem apenas [src/mcp/logger.ts](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/src/mcp/logger.ts)

**Checkpoint**: User Story 3 funcional e testável de forma independente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Consolidar documentação e validação final ponta a ponta.

- [X] T022 Atualizar instruções de execução MCP em [README.md](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/README.md)
- [X] T023 [P] Alinhar guia de validação final com comandos reais em [specs/001-mcp-incident-server/quickstart.md](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/specs/001-mcp-incident-server/quickstart.md)
- [X] T024 Validar contrato final das tools e exemplos de erro em [specs/001-mcp-incident-server/contracts/mcp-incident-server.contract.yaml](/Users/fernando/Repos/unipds/04-agentes-audonomos-spec/arena-de-incidentes/specs/001-mcp-incident-server/contracts/mcp-incident-server.contract.yaml)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: sem dependências
- **Phase 2 (Foundational)**: depende da Phase 1 e bloqueia todas as user stories
- **Phase 3 (US1)**: depende da Phase 2
- **Phase 4 (US2)**: depende da Phase 2 e pode iniciar sem depender de conclusão da US1
- **Phase 5 (US3)**: depende da Phase 2 e pode iniciar sem depender de conclusão da US1/US2
- **Phase 6 (Polish)**: depende da conclusão das stories selecionadas

### User Story Dependencies

- **US1 (P1)**: sem dependência de outras stories após fundação
- **US2 (P2)**: sem dependência funcional de outras stories; integra artefatos compartilhados
- **US3 (P3)**: sem dependência funcional de outras stories; foca canal de protocolo/log

### Within Each User Story

- Testes devem ser escritos antes da implementação e falhar inicialmente
- Registro/contrato de tool antes de validação final de integração
- Tratamento de erros e observabilidade antes de marcar story como concluída

### Parallel Opportunities

- Phase 2: T005 e T006 em paralelo
- US1: T007 e T008 em paralelo
- US2: T014 e T015 em paralelo
- US3: T019 pode rodar em paralelo com ajustes de implementação iniciais
- Phase 6: T023 em paralelo com revisão final de contrato (T024)

---

## Parallel Example: User Story 1

```bash
# Testes em paralelo da US1:
Task: "T007 tests/integration/mcp-server-tools.test.ts"
Task: "T008 tests/integration/mcp-server-contracts.test.ts"
```

## Parallel Example: User Story 2

```bash
# Paridade em paralelo da US2:
Task: "T014 tests/integration/mcp-validation-parity.test.ts"
Task: "T015 tests/integration/mcp-store-parity.test.ts"
```

## Parallel Example: User Story 3

```bash
# Validação de canais da US3:
Task: "T019 tests/integration/mcp-stdio-discipline.test.ts"
Task: "T021 src/mcp/logger.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Concluir Phase 1 e Phase 2
2. Entregar Phase 3 (US1)
3. Validar independentemente o catálogo MCP e chamadas básicas
4. Demonstrar MVP com `list_alerts`, `open_incident`, `resolve_incident`

### Incremental Delivery

1. US1 entrega operação MCP mínima
2. US2 consolida consistência de schema/store com canal existente
3. US3 reforça robustez operacional de stdio/stderr
4. Polish finaliza docs e contrato

### Parallel Team Strategy

1. Time fecha Setup + Foundational
2. Após fundação:
   - Dev A: US1
   - Dev B: US2
   - Dev C: US3
3. Integração final na Phase 6

---

## Notes

- Todos os tasks seguem formato obrigatório com checkbox, ID, labels e caminho de arquivo.
- `[P]` marca tarefas sem conflito direto de arquivo/dependência.
- Evitar duplicação de schema/store para manter uma única fonte de verdade.
