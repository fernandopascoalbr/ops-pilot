# Data Model: Conversa Persistente no Chat

## 1) ChatInput

- **Purpose**: Representar a entrada recebida pelo endpoint `/chat`.
- **Fields**:
  - `message` (string, obrigatório): texto enviado pelo operador.
  - `strategy` (string, opcional): estratégia de raciocínio.
  - `reflect` (boolean, opcional): habilita reflexão.
  - `conversationId` (string, opcional): identificador da conversa a continuar.
- **Validation rules**:
  - `message` deve existir e conter conteúdo não vazio.
  - `conversationId`, quando presente, deve ser string não vazia.
  - Campos opcionais seguem validação de tipo já existente.

## 2) Conversation

- **Purpose**: Representar uma sessão de chat persistente.
- **Fields**:
  - `id` (string): identificador único da conversa.
  - `createdAt` (string datetime): instante de criação.
- **Validation rules**:
  - `id` é gerado pelo sistema e único.
  - Conversa deve existir para aceitar `append` com ID explícito.

## 3) Message

- **Purpose**: Representar uma mensagem persistida dentro de uma conversa.
- **Fields**:
  - `id` (string): identificador único da mensagem.
  - `conversationId` (string): conversa associada.
  - `role` (`user` | `assistant`): origem da mensagem.
  - `content` (string): conteúdo textual.
  - `createdAt` (string datetime): ordem temporal da mensagem.
- **Validation rules**:
  - `conversationId` deve apontar para conversa existente.
  - `role` limitado aos dois papéis aceitos pelo fluxo.
  - `content` não pode ser vazio.
- **Relationships**:
  - 1:N entre `Conversation` e `Message`.

## 4) ConversationHistory

- **Purpose**: Coleção ordenada de mensagens anteriores usada para composição do contexto.
- **Fields**:
  - `messages` (Message[]): mensagens históricas selecionadas.
  - `limit` (number): limite máximo aplicado (12).
- **Validation rules**:
  - Mensagens devem estar em ordem cronológica crescente para montagem de prompt.
  - Tamanho máximo de `messages` deve ser 12.

## 5) ChatRunResult

- **Purpose**: Resultado da execução de chat retornado ao cliente.
- **Fields**:
  - `conversationId` (string): identificador da conversa ativa.
  - `answer` (string): resposta gerada.
  - `trace` (array): trilha de execução.
  - `metrics` (object): métricas da estratégia enriquecidas com `historyMessages`.
- **Validation rules**:
  - `conversationId` sempre presente em sucesso.
  - `metrics.historyMessages` deve refletir o tamanho real do histórico usado.

## State Transitions

1. `received` -> `conversation_resolved` (cria ou valida conversa)
2. `conversation_resolved` -> `history_loaded` (busca últimas 12 mensagens)
3. `history_loaded` -> `user_appended`
4. `user_appended` -> `strategy_executed`
5. `strategy_executed` -> `assistant_appended`
6. `assistant_appended` -> `response_emitted`

Transições de erro:

- `received` -> `invalid_input` (payload inválido)
- `conversation_resolved` -> `conversation_not_found` (`conversationId` inexistente)
- `user_appended|strategy_executed|assistant_appended` -> `persistence_error` (falha explícita sem sucesso parcial)
