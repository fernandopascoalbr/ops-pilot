# Research: Trace Persistido e Logs JSON

## Decision: usar `requestId` único por requisição como chave de correlação ponta a ponta

Definir um identificador único por execução de `/chat` e devolvê-lo no corpo e no header `X-Request-Id`, incluindo cenários de erro.

### Rationale

- Garante rastreabilidade consistente entre cliente, logs e armazenamento.
- Reduz tempo de diagnóstico operacional em incidentes.
- Evita ambiguidade ao consultar histórico por identificador.

### Alternatives considered

- Correlacionar apenas por timestamp: rejeitado por colisões e baixa precisão.
- Expor `requestId` apenas no corpo: rejeitado por incompatibilidade com clientes/proxies que dependem de header.

## Decision: persistir rastreabilidade em duas entidades separadas (`requests` e `trace_events`)

Armazenar metadados e métricas da execução em `requests` e registrar a trilha de eventos em `trace_events`, ligados por `requestId`.

### Rationale

- Mantém granularidade adequada para consulta rápida de resumo + detalhamento.
- Facilita ordenação temporal dos eventos sem duplicar campos de alto nível.
- Suporta evolução de telemetria sem reestruturar o registro principal.

### Alternatives considered

- Um único documento por requisição com trace embutido: rejeitado por dificultar ordenação/filtro de eventos.
- Persistir somente trace sem tabela de requisição: rejeitado por piorar consulta de métricas agregadas.

## Decision: consulta de auditoria dedicada em `GET /requests/:id` com ordenação determinística

Disponibilizar endpoint de leitura que retorna registro da requisição e lista de trace já ordenada por tempo de ocorrência.

### Rationale

- Evita que cada consumidor implemente ordenação própria e gere divergências.
- Entrega resultado pronto para suporte e investigação.
- Mantém contrato operacional claro para inexistência de `id`.

### Alternatives considered

- Reutilizar `/chat` para consulta de histórico: rejeitado por misturar execução com leitura operacional.
- Retornar eventos sem ordenação: rejeitado por aumentar risco de interpretação incorreta.

## Decision: logs estruturados em JSON por evento com metadados mínimos

Emitir uma linha JSON por evento e limitar o conteúdo a metadados operacionais permitidos, sem serializar payloads completos.

### Rationale

- Facilita ingestão por ferramentas de observabilidade.
- Reduz risco de exposição de conteúdo sensível.
- Mantém custo de armazenamento e processamento de logs sob controle.

### Alternatives considered

- Logs textuais livres: rejeitado por baixa analisabilidade automática.
- Incluir payload completo no log: rejeitado por risco de privacidade e ruído operacional.
