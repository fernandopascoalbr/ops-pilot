# Data Model: Grafo Unificado de Roteamento

## Entity: RequestContext

Representa a entrada operacional que alimenta o grafo e a escolha de rota.

| Field | Type | Description | Constraints |
|---|---|---|---|
| message | string | Mensagem ou incidente recebido | Obrigatório; não vazio |
| strategy | string \| null | Estratégia sugerida pelo cliente quando existir | Opcional; default do sistema quando ausente |
| userId | string \| null | Identificador do usuário/operador | Opcional |
| conversationId | string \| null | Identificador da conversa ativa | Opcional |
| metadata | object | Dados adicionais do contexto operacional | Opcional |

## Entity: RouteDecision

Representa a decisão do roteador após avaliar o contexto.

| Field | Type | Description | Constraints |
|---|---|---|---|
| route | string | Nome da rota selecionada | Obrigatório; valor estável e previsível |
| reason | string | Justificativa em linguagem clara | Obrigatório; texto legível por operador |
| confidence | string \| null | Grau de confiança se houver avaliação explícita | Opcional; valores esperados `low|medium|high` |

## Entity: StrategyNode

Representa uma das três estratégias variantes do fluxo operacional.

| Field | Type | Description | Constraints |
|---|---|---|---|
| name | string | Nome da estratégia selecionada | Obrigatório; `react`, `plan-and-execute` ou `reflect-plan-and-execute` |
| status | string | Estado do nó no fluxo | Obrigatório; `selected`, `executing`, `completed` |

## Entity: TraceEvent

Representa um passo do grafo e da execução resolvida.

| Field | Type | Description | Constraints |
|---|---|---|---|
| type | string | Tipo do evento de rastreio | Obrigatório |
| message | string | Descrição legível da etapa | Obrigatório |
| node | string | Nome do nó atual do grafo | Obrigatório |
| route | string \| null | Rota ativa no momento do evento | Obrigatório para eventos de decisão e de execução |
| timestamp | string \| null | Marca temporal do evento | Opcional |

## Entity: ChatResponse

Representa a resposta final entregue ao cliente em `/chat`.

| Field | Type | Description | Constraints |
|---|---|---|---|
| answer | string | Resposta final ao usuário | Obrigatório |
| route | string | Rota escolhida pelo roteador | Obrigatório |
| reason | string | Explicação da rota escolhida | Obrigatório |
| trace | array<TraceEvent> | Sequência completa de eventos do fluxo | Obrigatório |
| metrics | object | Métricas da execução | Obrigatório |

## Relationships

- Um `RequestContext` produz exatamente um `RouteDecision`.
- Um `RouteDecision` ativa um único `StrategyNode` como próximo nó do fluxo.
- Um `StrategyNode` gera 1..N `TraceEvent` durante a execução.
- Um `ChatResponse` encapsula a resposta final, sua rota, explicação e rastreio completo.

## Validation Rules

- `route` e `reason` devem estar presentes tanto no router quanto na resposta final do `/chat`.
- Todo evento de trace que descreve uma etapa do fluxo deve conter `node`.
- `route` em eventos de trace deve refletir a decisão ativa do grafo, não um valor arbitrário do cliente.
- Quando a rota não for suficientemente confiável, a decisão deve sinalizar incerteza em vez de ocultá-la.

## State Transitions

1. O `RequestContext` é montado a partir da mensagem e do histórico disponível.
2. O roteador avalia o contexto e produz `RouteDecision`.
3. O grafo ativa a `StrategyNode` correspondente à rota escolhida.
4. A estratégia executa e emite `TraceEvent` com `node` e `route`.
5. A resposta final é serializada em `ChatResponse` com `answer`, `route`, `reason` e `trace`.
