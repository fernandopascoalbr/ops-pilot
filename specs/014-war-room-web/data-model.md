# Data Model: War Room Web

## 1) WarRoomSession

- **Purpose**: Representa a sessão ativa da sala de guerra e seu contexto operacional.
- **Fields**:
  - `id` (string, obrigatório): identificador da sessão atual.
  - `title` (string, opcional): resumo do incidente ou contexto em execução.
  - `messages` (ChatMessage[], obrigatório): histórico do diálogo.
  - `decisionCards` (DecisionCard[], obrigatório): ações sugeridas e avaliadas.
  - `status` (`active|paused|error`, obrigatório): estado geral da sessão.
- **Validation rules**:
  - `id` deve ser único dentro do cliente.
  - `messages` deve ser serializável para persistência local e re-hydration.
- **Relationships**:
  - 1:N entre `WarRoomSession` e `ChatMessage`.
  - 1:N entre `WarRoomSession` e `DecisionCard`.

## 2) ChatMessage

- **Purpose**: Representa uma mensagem do usuário ou do sistema na conversa ativa.
- **Fields**:
  - `id` (string, obrigatório)
  - `role` (`user|assistant|system`, obrigatório)
  - `content` (string, obrigatório)
  - `timestamp` (string ISO, obrigatório)
  - `traceId` (string, opcional): referência ao raciocínio vinculado à resposta
- **Validation rules**:
  - `content` deve ser texto legível e não vazio para mensagens de usuário.
  - `role` deve estar dentro do conjunto permitido.
- **Relationships**:
  - cada mensagem pode referenciar um `ReasoningTrace` ou um `DecisionCard` relacionado.

## 3) ReasoningTrace

- **Purpose**: Armazena a evidência e a justificação por trás de uma resposta ou recomendação.
- **Fields**:
  - `id` (string, obrigatório)
  - `summary` (string, obrigatório)
  - `steps` (TraceStep[], obrigatório)
  - `confidence` (`low|medium|high`, obrigatório)
  - `risk` (`low|medium|high|critical`, obrigatório)
  - `source` (`agent|system|manual`, obrigatório)
- **Validation rules**:
  - `steps` deve ser uma lista ordenada por tempo ou precedência.
  - `confidence` e `risk` devem usar enumeração explícita.
- **Relationships**:
  - pode ser associado a uma mensagem e a um cartão de decisão.

## 4) TraceStep

- **Purpose**: Segmenta a evidência do raciocínio em passos observáveis.
- **Fields**:
  - `id` (string, obrigatório)
  - `label` (string, obrigatório)
  - `details` (string, obrigatório)
  - `kind` (`observation|decision|action|result`, obrigatório)
- **Validation rules**:
  - `label` e `details` não podem estar vazios.
  - cada passo deve manter uma ordem lógica de execução.

## 5) DecisionCard

- **Purpose**: Representa uma recomendação de ação a ser revisada ou executada.
- **Fields**:
  - `id` (string, obrigatório)
  - `title` (string, obrigatório)
  - `summary` (string, obrigatório)
  - `status` (`pending|approved|rejected`, obrigatório)
  - `createdAt` (string ISO, obrigatório)
  - `traceId` (string, opcional)
  - `decisionBy` (string, opcional)
- **Validation rules**:
  - o estado do cartão deve ser explícito antes de qualquer ação final.
  - `status` deve refletir a decisão final do operador.
- **State transitions**:
  - `pending -> approved`
  - `pending -> rejected`

## 6) ApiConnectionConfig

- **Purpose**: Define como a interface web se conecta com o backend de operação.
- **Fields**:
  - `baseUrl` (string, obrigatório): URL do backend ou do gateway que expõe a API.
  - `chatPath` (string, obrigatório): rota do endpoint de conversa; normalmente `/chat`.
  - `theme` (`light|dark|system`, obrigatório): preferência visual do usuário.
- **Validation rules**:
  - `baseUrl` deve ser um valor URL válido.
  - `chatPath` deve começar com `/`.

## 7) ErrorState

- **Purpose**: Padroniza a experiência de falha da interface.
- **Fields**:
  - `code` (`network|timeout|cors|invalid-config|empty-state`, obrigatório)
  - `message` (string, obrigatório)
  - `retryable` (boolean, obrigatório)
  - `actions` (string[], opcional): ações sugeridas ao usuário
- **Validation rules**:
  - todos os erros do cliente devem incluir uma mensagem clara e ação sugerida.
- **State transitions**:
  - `idle -> loading -> success`
  - `idle -> empty`
  - `loading -> error`
  - `error -> retrying`
