# Data Model: Add Chat Endpoint

## 1) ChatRequest

- **Purpose**: Representar a entrada recebida pelo endpoint de chat.
- **Fields**:
  - `message` (string, obrigatório): mensagem enviada para processamento.
  - `strategy` (string, opcional): nome da estratégia desejada.
  - `reflect` (boolean, opcional): habilita reflexão adicional sobre a estratégia base.
- **Validation rules**:
  - `message` deve existir e conter conteúdo textual válido.
  - `strategy`, quando presente, deve ser string não vazia.
  - `reflect`, quando presente, deve ser booleano.

## 2) StrategyRegistryEntry

- **Purpose**: Representar uma estratégia registrada e resolvível por nome.
- **Fields**:
  - `name` (string): identificador público da estratégia.
  - `strategy` (ReasoningStrategy): implementação executável.
  - `supportsReflection` (boolean): indica se pode ser envolvida por `withReflection`.
- **Validation rules**:
  - `name` deve ser único no catálogo.
  - `strategy.run` deve retornar `answer`, `trace` e `metrics`.
- **Relationships**:
  - 1:N entre catálogo e chamadas de chat resolvidas por `strategy`.

## 3) ChatResponse

- **Purpose**: Representar a saída de sucesso para consumidores do endpoint.
- **Fields**:
  - `answer` (string): resposta final gerada pela estratégia.
  - `trace` (TraceEvent[]): trilha auditável de raciocínio/execução.
  - `metrics` (StrategyMetrics): métricas de execução da estratégia.
- **Validation rules**:
  - Todos os campos são obrigatórios em sucesso.
  - `trace` deve ser serializável e ordenável temporalmente.

## 4) ValidationErrorResponse

- **Purpose**: Retornar erros de entrada com detalhes acionáveis.
- **Fields**:
  - `issues` (array): lista de inconsistências de validação por campo.
- **Validation rules**:
  - Deve ser retornado quando o body não atende o schema esperado.

## 5) ChatFailure (Domain-level HTTP failures)

- **Purpose**: Padronizar erros operacionais do endpoint.
- **Variants**:
  - `InvalidBody` → HTTP 400 com `issues`.
  - `UnknownStrategy` → HTTP 422 com identificação da estratégia solicitada.
  - `Timeout` → HTTP 504 após 180 segundos.
- **State transitions**:
  - `received -> validated -> resolved -> executed -> success`
  - `received -> invalid_body`
  - `validated -> unknown_strategy`
  - `executed -> timeout`
