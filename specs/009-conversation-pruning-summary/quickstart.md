# Quickstart: Validação de Pruning com Sumarização

## Prerequisites

- Dependências instaladas (`npm install`)
- Banco SQLite acessível (por padrão `./data/opspilot.db` ou `OPSPILOT_DB`)
- API rodando localmente em `localhost:3000`

## Scenario 1: Trigger de sumarização só após lote de 8 deslocadas

1. Inicie a API:

   ```bash
   npm run dev
   ```

2. Inicie uma conversa e capture `conversationId`:

   ```bash
   curl -sS -X POST http://localhost:3000/chat \
     -H 'content-type: application/json' \
     -d '{"message":"turno-1","strategy":"react"}'
   ```

3. Envie mensagens sequenciais no mesmo `conversationId` até ultrapassar a janela ativa.
4. Verifique que a sumarização só ocorre quando completar um lote de 8 mensagens deslocadas.

**Expected**:
- Antes do lote completo: sem novo evento `summarize`.
- No lote completo: evento `summarize` aparece no `trace` e resumo persistido é atualizado.

## Scenario 2: Requisições intermediárias não regeneram resumo

1. Após uma sumarização concluída, envie menos de 8 novas mensagens.
2. Consulte resposta do `/chat` nesses turnos intermediários.

**Expected**:
- Não há novo ciclo de sumarização.
- Estado persistido do resumo permanece inalterado até o próximo lote completo.

## Scenario 3: Contexto inclui resumo consolidado

1. Continue a conversa após ao menos uma sumarização executada.
2. Valide que o processamento do turno considera o resumo persistido junto de histórico recente e mensagem atual.

**Expected**:
- Respostas continuam coerentes com decisões/fatos/pendências antigas mesmo com janela curta.

## Automated Validation

Execute validação automatizada mínima:

```bash
npm test -- tests/integration/chat-persistence.test.ts
npm run typecheck
```

> Observação: incluir cenário com fake determinístico para o trigger de lote e persistência do resumo conforme contrato da feature.

## Validation Record (2026-11-15)

- `node --import tsx --test tests/unit/chat/conversation-summary.test.ts tests/integration/chat-persistence.test.ts tests/integration/chat-success.test.ts` ✅
- `npm run typecheck` ✅

## References

- Especificação: [spec.md](./spec.md)
- Plano: [plan.md](./plan.md)
- Pesquisa: [research.md](./research.md)
- Modelo de dados: [data-model.md](./data-model.md)
- Contrato: [contracts/chat-pruning-summary.contract.yaml](./contracts/chat-pruning-summary.contract.yaml)
