# Data Model: Trace Persistido e Logs JSON

## Entity: RequestRecord

Representa o registro principal de uma requisição de chat correlacionada por `requestId`.

| Field | Type | Description | Constraints |
|---|---|---|---|
| requestId | string | Identificador único da requisição | Obrigatório; único |
| status | string | Situação final da requisição | Obrigatório; `success` ou `error` |
| route | string | Rota/estratégia aplicada no processamento | Obrigatório |
| routeReason | string | Justificativa da rota aplicada | Obrigatório |
| llmCalls | number | Quantidade de chamadas de modelo durante o processamento | Obrigatório; inteiro >= 0 |
| latencyMs | number | Latência total observada | Obrigatório; inteiro >= 0 |
| createdAt | string | Instante de criação do registro | Obrigatório |
| finishedAt | string | Instante de conclusão do processamento | Obrigatório |

## Entity: TraceEvent

Representa cada evento do fluxo de execução associado à requisição.

| Field | Type | Description | Constraints |
|---|---|---|---|
| eventId | string | Identificador do evento de trace | Obrigatório; único |
| requestId | string | Referência ao registro da requisição | Obrigatório; chave para `RequestRecord` |
| seq | number | Ordem lógica do evento dentro da requisição | Obrigatório; inteiro >= 1 |
| node | string | Nó/etapa de execução que gerou o evento | Obrigatório |
| payload | object | Dados de trace necessários para auditoria | Obrigatório; formato controlado por tipo de evento |
| occurredAt | string | Instante de ocorrência do evento | Obrigatório |

## Entity: RequestTraceView

Representa a resposta de leitura operacional em `GET /requests/:id`.

| Field | Type | Description | Constraints |
|---|---|---|---|
| request | RequestRecord | Registro principal da requisição | Obrigatório |
| trace | TraceEvent[] | Lista de eventos associados | Obrigatório; ordenada por `occurredAt` e `seq` |

## Entity: ObservabilityLogEvent

Representa a linha JSON emitida no logger por evento operacional.

| Field | Type | Description | Constraints |
|---|---|---|---|
| timestamp | string | Instante da emissão do log | Obrigatório |
| requestId | string | Correlacionador da execução | Obrigatório |
| eventType | string | Tipo do evento logado | Obrigatório |
| node | string | Origem lógica do evento | Obrigatório |
| metadata | object | Metadados mínimos permitidos | Obrigatório; sem payload completo |

## Relationships

- Um `RequestRecord` possui 0..N `TraceEvent`.
- Todo `TraceEvent` pertence a exatamente um `RequestRecord` via `requestId`.
- `RequestTraceView` compõe um `RequestRecord` e todos os seus `TraceEvent` ordenados.
- Cada `TraceEvent` pode originar um `ObservabilityLogEvent` correlacionado pelo mesmo `requestId`.

## Validation Rules

- Toda resposta de `/chat` deve carregar `requestId` no corpo e no header com mesmo valor.
- `requestId` de `TraceEvent` deve existir em `RequestRecord`.
- `GET /requests/:id` deve retornar erro explícito para identificador inexistente.
- Logs de observabilidade não podem conter payload integral de entrada/saída do chat.
- O retorno de trace em `GET /requests/:id` deve ser determinístico na ordenação.

## State Transitions

1. Receber requisição de `/chat` e gerar/associar `requestId`.
2. Criar `RequestRecord` inicial com status em andamento.
3. Persistir `TraceEvent` conforme execução progride.
4. Atualizar `RequestRecord` com métricas finais e status de conclusão.
5. Em consulta `GET /requests/:id`, compor `RequestTraceView` com trace ordenado.
