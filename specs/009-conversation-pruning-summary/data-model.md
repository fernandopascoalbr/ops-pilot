# Data Model: Sumarização Incremental de Histórico

## Entity: ConversationSummary

Representa o resumo consolidado e persistido de uma conversa para todo conteúdo fora da janela ativa.

| Field | Type | Description | Constraints |
|---|---|---|---|
| conversationId | string | Identificador da conversa | Obrigatório; chave única por conversa |
| summaryText | string | Resumo consolidado da conversa | Obrigatório; até 150 tokens por geração incremental |
| summarizedMessageCount | integer | Quantidade total de mensagens já cobertas pelo resumo | Obrigatório; `>= 0`; não regressivo |
| updatedAt | string (ISO datetime) | Última atualização do resumo | Obrigatório |

## Entity: RecentMessageWindow

Representa a janela de mensagens mantidas em forma completa para contexto imediato.

| Field | Type | Description | Constraints |
|---|---|---|---|
| conversationId | string | Referência da conversa | Obrigatório |
| messages | array\<ConversationMessage\> | Últimas mensagens da conversa | Obrigatório; tamanho máximo 8 |

## Entity: DisplacedBatch

Representa o lote de mensagens que saiu da janela ativa e se tornou elegível para sumarização.

| Field | Type | Description | Constraints |
|---|---|---|---|
| conversationId | string | Referência da conversa | Obrigatório |
| batchSize | integer | Quantidade de mensagens deslocadas no ciclo atual | Obrigatório; deve ser exatamente 8 para disparo |
| messages | array\<ConversationMessage\> | Conteúdo deslocado usado para gerar novo resumo incremental | Obrigatório quando `batchSize = 8` |

## Entity: SummarizeTraceEvent

Evento de auditoria emitido quando uma rodada de sumarização é executada.

| Field | Type | Description | Constraints |
|---|---|---|---|
| type | string | Tipo do evento de trace | Obrigatório; valor `summarize` |
| message | string | Descrição da sumarização executada | Obrigatório |
| args | object | Metadados do ciclo de sumarização | Opcional; inclui pelo menos `conversationId` e `batchSize` |
| timestamp | string (ISO datetime) | Momento do evento | Obrigatório |

## Relationships

- Cada `ConversationSummary` pertence a exatamente uma conversa.
- Cada conversa possui no máximo um `ConversationSummary` consolidado.
- Um `DisplacedBatch` atualiza exatamente um `ConversationSummary`.
- Cada execução de `DisplacedBatch` com sucesso gera um `SummarizeTraceEvent`.

## Validation Rules

- A sumarização só executa quando `batchSize = 8`.
- `summaryText` consolidado deve preservar decisões, fatos e pendências presentes no lote deslocado.
- `summarizedMessageCount` só pode aumentar após execução válida de sumarização.
- Quando não houver novo lote completo, `ConversationSummary` não deve ser alterado.
- O resumo consolidado deve ser incluído na composição de contexto quando existir.

## State Transitions

1. Conversa recebe novas mensagens.
2. Sistema calcula quantas mensagens passaram a ficar fora da janela ativa de 8.
3. Se houver novo lote completo de 8 deslocadas:
   - gera resumo incremental do lote;
   - mescla com `summaryText` anterior;
   - persiste `ConversationSummary` com novo `summarizedMessageCount`;
   - emite `SummarizeTraceEvent`.
4. Se não houver novo lote completo:
   - reaproveita resumo existente sem alteração;
   - não emite `SummarizeTraceEvent`.
