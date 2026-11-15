# Data Model: Medição de Contexto e Tokens

## Entity: ContextSourceSegment

Representa cada componente de entrada que compõe o prompt final processado no chat.

| Field | Type | Description | Constraints |
|---|---|---|---|
| source | string | Nome da fonte de contexto | Obrigatório; valores esperados: `currentMessage`, `conversationHistory`, `memoryRecall` |
| chars | integer | Quantidade de caracteres do segmento | Obrigatório; `>= 0` |
| estimatedTokens | integer | Estimativa determinística por chars/4 | Obrigatório; inteiro `>= 0` |

## Entity: ContextBreakdown

Coleção ordenada de segmentos por fonte para auditoria de composição de contexto.

| Field | Type | Description | Constraints |
|---|---|---|---|
| items | array\<ContextSourceSegment\> | Lista de fontes incluídas no prompt | Obrigatório; pode conter itens com `chars = 0` |
| totalEstimatedTokens | integer | Soma das estimativas de `items` | Obrigatório; consistente com soma dos segmentos |

## Entity: PromptUsageReal

Representa medição real retornada pelo runtime do modelo para o turno.

| Field | Type | Description | Constraints |
|---|---|---|---|
| promptTokens | integer \| null | Quantidade real de tokens de prompt | `null` quando indisponível; inteiro `>= 0` quando presente |
| sourcePath | string \| null | Caminho da estrutura de uso que originou o valor | `null` quando indisponível |

## Entity: ChatTurnMetrics

Métricas retornadas no `POST /chat` para uma execução individual.

| Field | Type | Description | Constraints |
|---|---|---|---|
| llmCalls | integer | Número de chamadas ao modelo | Obrigatório; já existente |
| latencyMs | integer | Latência total da estratégia | Obrigatório; já existente |
| historyMessages | integer | Total de mensagens de histórico incluídas | Obrigatório |
| memoryRecallCount | integer | Quantidade de memórias recuperadas | Obrigatório |
| promptTokens | integer \| null | Uso real de prompt tokens do turno | Novo campo; nulo quando indisponível |
| contextBreakdown | ContextBreakdown | Detalhamento estimado por fonte | Novo campo obrigatório no contrato da feature |

## Relationships

- Um `ChatTurnMetrics` possui exatamente um `ContextBreakdown`.
- Um `ContextBreakdown` contém 1..N `ContextSourceSegment`.
- Um `ChatTurnMetrics` referencia no máximo um `PromptUsageReal` efetivo (via `promptTokens` + `sourcePath` derivado internamente).

## Validation Rules

- `estimatedTokens` deve seguir a regra chars/4 de forma consistente em todos os segmentos.
- `totalEstimatedTokens` deve ser igual à soma de `estimatedTokens` dos itens.
- `promptTokens` deve ser `null` quando o runtime não retornar uso de prompt; nunca usar valor inventado.
- Fontes devem permanecer nomeadas de forma estável para comparação por turno.

## State Transitions

1. Requisição `/chat` recebida e contexto composto.
2. Segmentos de contexto gerados por fonte e estimados.
3. Estratégia executada e métricas base capturadas.
4. Uso real de prompt tokens extraído do resultado da execução (quando disponível).
5. `ChatTurnMetrics` retornado na resposta HTTP.
