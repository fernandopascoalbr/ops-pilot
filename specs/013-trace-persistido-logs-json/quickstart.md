# Quickstart: Validação de Trace Persistido e Logs JSON

## Pré-requisitos

- Node.js LTS
- Dependências instaladas (`npm install`)
- Variável `OPSPILOT_DB` apontando para um arquivo SQLite de teste (ou valor padrão local)

Exemplo:

```bash
export OPSPILOT_DB=./data/opspilot.db
```

## Setup básico

1. Inicie a API:
   ```bash
   npm run dev
   ```
2. Garanta que o serviço está respondendo com uma chamada mínima de chat:
   ```bash
   curl -i -X POST http://localhost:3000/chat \
     -H 'content-type: application/json' \
     -d '{"message":"ping operacional"}'
   ```

## Cenário 1: `/chat` retorna correlação completa

1. Envie uma requisição de chat:
   ```bash
   curl -i -X POST http://localhost:3000/chat \
     -H 'content-type: application/json' \
     -d '{"message":"Resuma os alertas críticos das últimas 2 horas."}'
   ```
2. Valide:
   - Header `X-Request-Id` presente.
   - Campo `requestId` presente no body.
   - Valores idênticos entre header e body.

## Cenário 2: consulta do histórico em `GET /requests/:id`

1. Capture o `requestId` retornado no cenário 1.
2. Consulte:
   ```bash
   curl -i http://localhost:3000/requests/<requestId>
   ```
3. Valide:
   - Status `200`.
   - Campo `request` com metadados/métricas da requisição.
   - Campo `trace` com eventos em ordem temporal.

## Cenário 3: id inexistente em `GET /requests/:id`

1. Consulte um identificador inexistente:
   ```bash
   curl -i http://localhost:3000/requests/req-inexistente
   ```
2. Valide:
   - Status `404`.
   - Corpo com erro explícito.

## Cenário 4: logs JSON por evento com metadados mínimos

1. Execute uma chamada ao `/chat`.
2. Inspecione saída de logs da aplicação.
3. Valide:
   - Uma linha JSON por evento.
   - Cada linha inclui `requestId` e metadados operacionais.
   - Não há payload completo de entrada/saída nos logs.

## Verificações recomendadas

Após implementação, execute:

```bash
npm run typecheck
npm test
```

## Referências

- Contrato de interfaces: [contracts/chat-trace-observability.contract.yaml](./contracts/chat-trace-observability.contract.yaml)
- Modelo de dados e regras: [data-model.md](./data-model.md)
- Especificação funcional: [spec.md](./spec.md)
