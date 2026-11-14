# Feature Specification: Persistência real de operações

**Feature Branch**: `[004-sqlite-ops-persistence]`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "Persistência real de operações:
- SqliteOpsStore (src/store/sqlite-ops-store.ts) implementa a interface OpsStore existente via node:sqlite (DatabaseSync); caminho em OPSPILOT_DB (default ./data/opspilot.db); ':memory:' nos testes
- 4 tabelas - services, alerts, incidents, runbooks - espelhando os tipos atuais do domínio (incidents ganha resolved_at e summary, anuláveis); DDL idempotente no construtor; CHECK em todo campo de domínio fechado (tier, severity, status)
- seed idempotente = cenário Mercadinho do mock (5 serviços, 6 alertas: 3 firing, 3 resolved; runbooks de checkout/payments/auth)
- prepared statements em toda query; sem SQL concatenado
- tools novas: list_incidents (status open | resolved | all, default open) e consultar_runbook(service) - descrições pelas 6 regras
- composição injeta o SqliteOpsStore; mock in memory fica para testes e para o bench (cenarios possam ser reproduzidos)
- data/ no .gitignore
- revisar descrições de src/agents/tools.ts pelas 6 regras (dividida do open_incident: quando usar; .describe() em todo campo; enums)
- testes ':memory:' seed, abrir/listar/resolver, filtros e CHECKS; testes das tools existentes passam a rodar sobre ':memory:'"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Persistir operações em SQLite de forma confiável (Priority: P1)

Como pessoa operadora, quero que o estado operacional seja persistido em SQLite para que incidentes, alertas, serviços e runbooks permaneçam rastreáveis e reproduzíveis em execução real.

**Why this priority**: Essa é a base funcional da mudança; sem persistência real, o sistema continua dependente de estado em memória e não atende ao requisito de operação em produção.

**Independent Test**: Pode ser testado de forma independente criando um `SqliteOpsStore` com banco em memória, semeando dados e validando que as operações de leitura e escrita persistem e reflitam o estado esperado.

**Acceptance Scenarios**:

1. **Given** um `SqliteOpsStore` configurado com banco `:memory:`, **When** o construtor inicializa, **Then** as quatro tabelas são criadas de forma idempotente e válidas para uso imediato.
2. **Given** uma base de dados SQLite vazia, **When** o seed operacional é aplicado, **Then** a estrutura contém 5 serviços, 6 alertas e runbooks do cenário Mercadinho, mantendo 3 alertas `firing` e 3 `resolved`.
3. **Given** um serviço e um conjunto de dados válidos, **When** um incidente é aberto, **Then** o registro é persistido com status `open` e metadata obrigatória preenchida.
4. **Given** um incidente em aberto, **When** ele é resolvido, **Then** o registro recebe `resolved_at` e o incidente transforma-se em `resolved`.

---

### User Story 2 - Consultar incidentes e runbooks por contexto operacional (Priority: P1)

Como pessoa operadora, quero listar incidentes filtrados por estado e consultar runbooks por serviço para decidir a próxima ação com base em contexto operacional correto.

**Why this priority**: O diagnóstico e a resposta exigem contexto relevante sobre incidentes e procedimentos operacionais; sem isso, o agente não consegue agir com segurança.

**Independent Test**: Pode ser testado executando `list_incidents` com `open`, `resolved` e `all`, além de `consultar_runbook(service)`, validando filtros e retorno de conteúdo do runbook.

**Acceptance Scenarios**:

1. **Given** uma base populada com incidentes abertos e resolvidos, **When** `list_incidents('open')` é chamado, **Then** retorna apenas os incidentes em estado `open`.
2. **Given** uma base populada com incidentes abertos e resolvidos, **When** `list_incidents('resolved')` é chamado, **Then** retorna apenas os incidentes resolvidos.
3. **Given** uma base com incidentes existentes, **When** `list_incidents('all')` é chamado, **Then** retorna todos os registros sem filtro.
4. **Given** um serviço com runbook registrado, **When** `consultar_runbook(service)` é chamado, **Then** o sistema retorna as instruções operacionais do serviço solicitado.

---

### User Story 3 - Respeitar restrições de domínio e segurança de consulta (Priority: P2)

Como mantenedor do sistema, quero que o esquema e as consultas usem validação do domínio e SQL preparado para evitar inconsistências de dados e injeção de SQL.

**Why this priority**: O sistema opera em contexto crítico; falhas de integridade ou query concatenada afetam confiabilidade e segurança.

**Independent Test**: Pode ser testado executando tentativas de inserção com valores inválidos e verificando que os `CHECK` do SQLite rejeitam valores fora do domínio, além de verificar que as queries usam parâmetros preparados.

**Acceptance Scenarios**:

1. **Given** uma tentativa de inserir um alerta com severidade fora do enum permitido, **When** a operação é executada, **Then** o banco rejeita a linha por violação de `CHECK`.
2. **Given** uma tentativa de inserir um incidente com status inválido, **When** a operação é executada, **Then** o banco rejeita a linha por violação de `CHECK`.
3. **Given** um comando de query do store, **When** ele executa, **Then** todas as consultas devem usar prepared statements e não concatenar texto SQL em runtime.

---

### User Story 4 - Integrar persistência real com as ferramentas e testes do agente (Priority: P2)

Como desenvolvedor, quero que a composição do agente injetasse o `SqliteOpsStore` e os testes rodem sobre bancos em memória para manter reprodutibilidade e isolamento entre execuções.

**Why this priority**: A arquitetura e a suíte devem refletir o comportamento real da aplicação, sem dependência de estado compartilhado entre testes ou benchmark.

**Independent Test**: Pode ser testado instanciando a composição com `SqliteOpsStore`, rodando os testes de tools existentes em ambiente `:memory:` e verificando que os cenários continuam estáveis.

**Acceptance Scenarios**:

1. **Given** a composição da aplicação, **When** o store real é injetado, **Then** o agente usa `SqliteOpsStore` em vez do mock em memória de produção.
2. **Given** um cenário de teste, **When** o banco é configurado como `:memory:`, **Then** a execução fica isolada e determinística.
3. **Given** as tools existentes, **When** o conjunto de testes roda em ambiente `:memory:`, **Then** o comportamento esperado continua validado sem depender do arquivo de dados persistente real.

---

### Edge Cases

- O que acontece quando um serviço inexistente é consultado em `consultar_runbook(service)`?
- Como o sistema responde quando `list_incidents` recebe status fora do enum permitido?
- O que acontece quando o arquivo `OPSPILOT_DB` não existe e o diretório `data/` ainda não foi criado?
- Como o ambiente de teste deve se comportar quando o processo cria vários stores em memória em paralelo?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST implementar `SqliteOpsStore` em `src/store/sqlite-ops-store.ts` seguindo a interface `OpsStore` existente e usando `node:sqlite` com `DatabaseSync`.
- **FR-002**: O sistema MUST usar `OPSPILOT_DB` como caminho do banco SQLite, com valor padrão `./data/incidentarena.db` e `:memory:` em testes.
- **FR-003**: O sistema MUST criar, de forma idempotente, as tabelas `services`, `alerts`, `incidents` e `runbooks` no construtor do store.
- **FR-004**: O sistema MUST espelhar os tipos do domínio atual, incluindo `resolved_at` e `summary` em `incidents` como campos anuláveis quando aplicável.
- **FR-005**: O sistema MUST aplicar `CHECK` em todos os campos de domínio fechado, incluindo `tier`, `severity` e `status`.
- **FR-006**: O sistema MUST lançar seed idempotente do cenário Mercadinho, com 5 serviços, 6 alertas e runbooks de checkout, payments e auth.
- **FR-007**: O sistema MUST usar prepared statements para toda query, sem concatenar strings de SQL em runtime.
- **FR-008**: O sistema MUST expor ferramentas `list_incidents(status)` e `consultar_runbook(service)` com comportamento documentado e estados permitidos (`open | resolved | all`, default `open`).
- **FR-009**: O sistema MUST manter o mock em memória apenas para testes e bench, enquanto a composição de produção usa `SqliteOpsStore`.
- **FR-010**: O sistema MUST registrar `data/` no `.gitignore` para evitar versionamento de artefatos locais do banco SQLite.
- **FR-011**: O sistema MUST revisar e ajustar as descrições de `src/agents/tools.ts` conforme as 6 regras de descrição das ferramentas, separando claramente o uso de `open_incident` e definindo `describe()` de campos e enums corretamente.
- **FR-012**: O sistema MUST manter testes com banco em memória para seed, abrir, listar, resolver, filtros e validações de `CHECK`.
- **FR-013**: O sistema MUST garantir que os testes das tools existentes passem a rodar sobre `:memory:` sem depender de estado persisted em JSON ou arquivo local.

### Key Entities *(include if feature involves data)*

- **Service**: Representa um serviço monitorado, com identificador, nome e estado operacional.
- **Alert**: Representa um evento de monitoramento associado a um serviço, com severidade, status e timestamps de criação e resolução.
- **Incident**: Representa um incidente operacional, com título, serviço, severidade, status, `opened_at`, `resolved_at` e `summary`.
- **Runbook**: Representa instruções operacionais para um serviço, incluindo procedimento e contexto de execução.
- **SqliteOpsStore**: Implementação persistente do contrato de operações com SQLite e queries preparadas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos testes do store e das tools rodando em `:memory:` passam sem depender de arquivo real de banco.
- **SC-002**: 100% das tabelas requeridas são criadas idempotentemente no construtor do store.
- **SC-003**: 100% dos valores de enum em domínio fechado são validados por `CHECK` do SQLite, sem permitir valores fora do conjunto esperado.
- **SC-004**: 100% das queries executadas pelo store usam prepared statements, sem SQL concatenado em runtime.
- **SC-005**: O seed de produção contém 5 serviços, 6 alertas e runbooks de checkout, payments e auth conforme o cenário Mercadinho.
- **SC-006**: 100% das ferramentas de agente incluindo `list_incidents` e `consultar_runbook` têm descrições alinhadas às regras de uso, enumeração e documentação de campos.

## Assumptions

- O banco SQLite é o mecanismo local padrão de persistência para operações do projeto nesta contribuição.
- O ambiente de testes usa `:memory:` para isolar execução, enquanto produção usa `OPSPILOT_DB` com arquivo local em `data/`.
- O mock em memória continua disponível apenas para testes e benchmark, não como backend de produção.
- O projeto mantém a convenção de tipos e `zod` nas fronteiras, mas a persistência real deve aderir ao domínio já estabelecido.
- O runbook de cada serviço precisa refletir procedimentos operacionais reais do cenário Mercadinho, sem introduzir conteúdo genérico demais para uso em produção.
