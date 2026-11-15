# Feature Specification: Trace Persistido e Logs JSON

**Feature Branch**: `[013-trace-persistido-logs-json]`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "Trace persistido + logs JSON:
- /chat: requestId no corpo e no header X-Request-Id
- SQLite: requests (métricas) e trace_events (node, payloads)
- src/obs/logger.ts: 1 linha JSON por evento, só metadados
- GET /requests/:id registro + trace ordenados"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Correlacionar requisição de chat ponta a ponta (Priority: P1)

Como operador da API, quero receber um identificador único da requisição no corpo e no cabeçalho de resposta do `/chat` para correlacionar diagnóstico, suporte e auditoria com precisão.

**Why this priority**: Sem correlação consistente, investigação de incidentes e atendimento operacional ficam lentos e sujeitos a erro.

**Independent Test**: Pode ser testado chamando `/chat` e validando que o mesmo `requestId` está presente no corpo e no header `X-Request-Id`.

**Acceptance Scenarios**:

1. **Given** uma chamada válida ao `/chat`, **When** a resposta é retornada, **Then** ela contém `requestId` no corpo e `X-Request-Id` no header com o mesmo valor.
2. **Given** uma chamada ao `/chat` que resulta em erro de processamento, **When** a resposta de erro é retornada, **Then** ela também expõe o `requestId` no corpo e no header para rastreabilidade.

---

### User Story 2 - Consultar histórico persistido da requisição (Priority: P2)

Como analista de operações, quero consultar um endpoint de leitura por identificador para recuperar o registro da requisição e o traço completo em ordem temporal.

**Why this priority**: A consulta consolidada reduz tempo de análise e evita buscas manuais em múltiplas fontes.

**Independent Test**: Pode ser testado processando uma requisição, depois consultando `GET /requests/:id` e validando retorno do registro e eventos de trace ordenados.

**Acceptance Scenarios**:

1. **Given** uma requisição já processada, **When** `GET /requests/:id` é chamado com o identificador correto, **Then** o retorno inclui os dados do registro e os eventos de trace em ordem cronológica.
2. **Given** um identificador inexistente, **When** `GET /requests/:id` é chamado, **Then** o sistema retorna erro de não encontrado de forma explícita.

---

### User Story 3 - Registrar eventos operacionais em JSON enxuto (Priority: P3)

Como responsável por observabilidade, quero que cada evento gere uma única linha JSON contendo apenas metadados para facilitar ingestão e reduzir risco de vazamento de conteúdo sensível.

**Why this priority**: Logs estruturados e mínimos melhoram monitoramento, custo operacional e segurança de dados.

**Independent Test**: Pode ser testado executando uma requisição e validando no log que cada evento gera uma linha JSON individual sem payloads completos.

**Acceptance Scenarios**:

1. **Given** uma requisição com múltiplos eventos de trace, **When** o fluxo é executado, **Then** cada evento é registrado como uma linha JSON separada com metadados.
2. **Given** eventos que carregam payloads de entrada/saída, **When** o log é gerado, **Then** os payloads não são serializados integralmente no log e apenas metadados permitidos aparecem.

### Edge Cases

- Requisição com falha antes de concluir o fluxo principal ainda precisa produzir `requestId` e registros suficientes para diagnóstico.
- Consulta de `GET /requests/:id` para requisição existente sem eventos de trace deve retornar registro com lista de eventos vazia, sem erro.
- Eventos fora de ordem de chegada precisam ser retornados em ordem temporal consistente na consulta.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST garantir que toda resposta do endpoint `/chat`, inclusive respostas de erro, contenha o mesmo `requestId` no corpo e no header `X-Request-Id`.
- **FR-002**: O sistema MUST persistir um registro de requisição em armazenamento SQLite com métricas operacionais associadas ao `requestId`.
- **FR-003**: O sistema MUST persistir eventos de trace por requisição em uma estrutura `trace_events`, incluindo identificação do nó de execução e payloads necessários para auditoria.
- **FR-004**: O sistema MUST disponibilizar `GET /requests/:id` para retornar o registro da requisição e seus eventos de trace ordenados por tempo.
- **FR-005**: O sistema MUST registrar cada evento operacional em uma única linha JSON no logger de observabilidade.
- **FR-006**: O sistema MUST limitar logs JSON a metadados operacionais e não incluir payloads completos de conteúdo da requisição/resposta.
- **FR-007**: O sistema MUST retornar erro explícito de não encontrado ao consultar `GET /requests/:id` com identificador inexistente.

### Key Entities *(include if feature involves data)*

- **Request Record**: Representa uma requisição de chat identificada por `requestId`, contendo métricas operacionais e status final.
- **Trace Event**: Representa cada etapa do fluxo com referência à requisição, nó executado, carimbo temporal e dados necessários de auditoria.
- **Observability Log Event**: Representa a linha JSON emitida por evento, contendo metadados de correlação e contexto operacional mínimo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das respostas do `/chat` (sucesso ou erro) retornam `requestId` no corpo e no header `X-Request-Id` com o mesmo valor.
- **SC-002**: 100% das requisições processadas geram um registro persistido consultável por identificador único.
- **SC-003**: Em ao menos 95% das consultas de `GET /requests/:id`, o histórico completo é retornado em até 2 segundos com eventos ordenados.
- **SC-004**: 100% dos eventos observáveis geram exatamente uma linha JSON de log contendo apenas metadados definidos para operação.

## Assumptions

- O identificador de requisição é único por chamada e pode ser usado como chave primária de correlação operacional.
- O endpoint de consulta será usado por operadores internos e não altera dados existentes.
- Existe política de retenção para dados persistidos e logs, aplicada fora do escopo desta feature.
- A definição de metadados permitidos em log já está alinhada com os requisitos internos de segurança e privacidade.
