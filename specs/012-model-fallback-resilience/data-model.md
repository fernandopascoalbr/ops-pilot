# Data Model: Model Fallback Resilience

## Entity: ModelRuntimeConfig

Representa a configuração efetiva de modelos usada na requisição.

| Field | Type | Description | Constraints |
|---|---|---|---|
| primaryModel | string | Modelo principal configurado para execução | Obrigatório; não vazio |
| fallbackModels | string[] | Lista ordenada de modelos de reserva | Opcional; sem duplicatas; ordem estável |
| temperature | number | Configuração de temperatura de inferência | Obrigatório; valor válido no runtime |
| isConfigured | boolean | Indica presença de credencial do provedor | Obrigatório |

## Entity: ModelAttempt

Representa uma tentativa de inferência em um modelo específico.

| Field | Type | Description | Constraints |
|---|---|---|---|
| model | string | Identificador do modelo tentado | Obrigatório |
| role | enum | Papel do modelo na cadeia | Obrigatório; `primary` ou `fallback` |
| attemptIndex | number | Ordem da tentativa na requisição | Obrigatório; inteiro >= 1 |
| outcome | enum | Resultado da tentativa | Obrigatório; `success` ou `failure` |
| errorMessage | string \| null | Motivo da falha quando houver | Obrigatório quando `outcome=failure` |

## Entity: FallbackTraceEvent

Representa a transição operacional entre modelos após falha.

| Field | Type | Description | Constraints |
|---|---|---|---|
| type | string | Tipo do evento de trace | Obrigatório; valor `fallback` |
| fromModel | string | Modelo anterior que falhou | Obrigatório |
| toModel | string | Próximo modelo selecionado | Obrigatório |
| reason | string | Motivo operacional da troca | Obrigatório |
| timestamp | string | Instante do evento | Obrigatório |

## Entity: ChatExecutionMetrics

Representa métricas de execução devolvidas ao cliente.

| Field | Type | Description | Constraints |
|---|---|---|---|
| llmCalls | number | Quantidade de chamadas ao runtime de modelo | Obrigatório; inteiro >= 0 |
| latencyMs | number | Latência total da requisição | Obrigatório; inteiro >= 0 |
| modelUsed | string | Modelo que efetivamente gerou a resposta final | Obrigatório em sucesso |
| route | string | Rota operacional do chat | Obrigatório |
| routeReason | string | Justificativa da rota | Obrigatório |

## Entity: ModelUnavailableErrorResponse

Representa a resposta externa quando nenhum modelo atende.

| Field | Type | Description | Constraints |
|---|---|---|---|
| status | number | Código HTTP da resposta | Obrigatório; valor `503` |
| error | string | Mensagem de indisponibilidade | Obrigatório; texto claro e acionável |

## Relationships

- Um `ModelRuntimeConfig` define 1 primário e 0..N reservas para uma execução.
- Uma execução gera 1..N `ModelAttempt` até sucesso ou esgotamento.
- Cada troca de modelo entre tentativas gera um `FallbackTraceEvent`.
- Em sucesso, `ChatExecutionMetrics` referencia o `modelUsed` do `ModelAttempt` bem-sucedido.
- Em falha total, a execução retorna `ModelUnavailableErrorResponse`.

## Validation Rules

- `fallbackModels` não pode repetir o `primaryModel`.
- Toda troca para reserva deve gerar evento `fallback` no trace.
- `metrics.modelUsed` deve refletir o modelo da tentativa que gerou a resposta.
- Quando não houver tentativa bem-sucedida, a resposta deve ser 503 e não deve sinalizar sucesso.

## State Transitions

1. Carregar `ModelRuntimeConfig` da configuração de ambiente.
2. Tentar `ModelAttempt` no primário com política de retry.
3. Em falha final do primário, avançar para reservas em ordem e registrar `FallbackTraceEvent` por transição.
4. Se alguma tentativa tiver sucesso, preencher resposta com `modelUsed`.
5. Se todas falharem, encerrar com `ModelUnavailableErrorResponse` (503).
