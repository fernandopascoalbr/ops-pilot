# Quickstart: Validação de Resiliência de Modelo

## Pré-requisitos

- Node.js LTS
- Dependências instaladas com `npm install`
- Credencial de provedor configurada: `OPENROUTER_API_KEY`
- Modelo primário e reservas configurados (exemplo):
  ```bash
  export OPENROUTER_MODEL="openai/gpt-4o-mini"
  export OPENROUTER_MODEL_FALLBACK="openai/gpt-4o-mini,openai/gpt-4.1-mini"
  ```

## Cenário 1: sucesso no modelo primário (sem fallback)

1. Suba a API:
   ```bash
   npm run dev
   ```
2. Faça uma chamada básica:
   ```bash
   curl -X POST http://localhost:3000/chat \
     -H 'content-type: application/json' \
     -d '{"message":"Resuma os alertas de produção."}'
   ```
3. Valide:
   - status `200`,
   - `metrics.modelUsed` preenchido,
   - ausência de evento `fallback` no `trace`.

## Cenário 2: falha no primário e sucesso em reserva

1. Configure um primário inválido e reserva válida:
   ```bash
   export OPENROUTER_MODEL="invalid/provider-model"
   export OPENROUTER_MODEL_FALLBACK="openai/gpt-4o-mini"
   ```
2. Execute a mesma requisição ao `/chat`.
3. Valide:
   - status `200`,
   - `trace` contém evento com `type: "fallback"`,
   - `metrics.modelUsed` indica o modelo de reserva,
   - o fallback ocorre apenas depois de esgotar as tentativas do modelo primário.

## Cenário 3: falha total em todos os modelos

1. Configure apenas modelos inválidos:
   ```bash
   export OPENROUTER_MODEL="invalid/primary"
   export OPENROUTER_MODEL_FALLBACK="invalid/fallback-a,invalid/fallback-b"
   ```
2. Chame o endpoint `/chat`.
3. Valide:
   - status `503`,
   - corpo com campo `error`,
   - sem payload de sucesso (`answer`/`metrics`).

## Execução de testes recomendada

Após implementar a feature, execute:

```bash
npm run typecheck
npm test
```

## Referências

- Regras de contrato: [chat-model-resilience.contract.yaml](./contracts/chat-model-resilience.contract.yaml)
- Entidades e estados: [data-model.md](./data-model.md)
- Implementação de resiliência: [src/agents/model.ts](../../src/agents/model.ts)
