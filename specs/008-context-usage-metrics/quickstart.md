# Quickstart: Validação de Métricas de Contexto

## Prerequisites

- Dependências instaladas (`npm install`)
- API rodando localmente em `localhost:3000`
- (Opcional) `OPENROUTER_API_KEY` configurada para observar uso real retornado pelo provedor

## Scenario 1: `/chat` retorna `promptTokens` real quando disponível

1. Inicie o servidor:

   ```bash
   npm run dev
   ```

2. Faça uma chamada ao chat:

   ```bash
   curl -sS -X POST http://localhost:3000/chat \
     -H 'content-type: application/json' \
     -d '{"message":"Analise os alertas ativos","strategy":"react"}'
   ```

3. Verifique no JSON de resposta:
   - `metrics.promptTokens` (inteiro quando disponível, `null` quando não disponível)
   - `metrics.contextBreakdown.items`
   - `metrics.contextBreakdown.totalEstimatedTokens`

**Expected**: resposta `200` mantém `answer`/`trace` e inclui os novos campos de métrica.

## Scenario 2: breakdown de contexto por fonte

1. Envie uma primeira mensagem para obter `conversationId`.
2. Envie uma segunda mensagem reutilizando o mesmo `conversationId` e `userId`.
3. Confirme que `contextBreakdown.items` contém fontes separadas (mensagem atual, histórico, memória quando houver).

**Expected**: cada fonte aparece com `source`, `chars` e `estimatedTokens`; o total fecha com a soma.

## Scenario 3: conversa longa com impressão de tokens por turno

1. Execute o script:

   ```bash
   bash scripts/conversa-longa.sh
   ```

2. Observe a saída por turno no formato `Turno N: promptTokens=<valor|null>`.
3. Opcionalmente force estratégia e endpoint:

   ```bash
   CHAT_URL=http://localhost:3000/chat STRATEGY=react bash scripts/conversa-longa.sh
   ```

**Expected**: cada turno imprime `promptTokens` sem interromper a execução por ausência eventual de uso real.

## Automated Validation

```bash
npm test
npm run typecheck
```

## References

- Contrato: [contracts/chat-context-metrics.contract.yaml](./contracts/chat-context-metrics.contract.yaml)
- Modelo de dados: [data-model.md](./data-model.md)
- Especificação funcional: [spec.md](./spec.md)
