# Quickstart: Learning Reflection Validation

## Prerequisites

- Dependências instaladas (`npm install`)
- Ambiente local com banco configurado via `OPSPILOT_DB` (ou padrão do projeto)

## Validation Scenarios

### 1) Captura de fato durável

1. Envie mensagem contendo preferência estável do usuário.
2. Verifique que a resposta principal é entregue normalmente.
3. Confirme que a memória foi registrada de forma assíncrona.
4. Valide que a resposta chega antes da gravação de memória ser concluída.

**Expected**: fato durável armazenado para o usuário correto.

### 2) Bloqueio de pedido pontual

1. Envie mensagem com tarefa momentânea (“agora faça X”).
2. Verifique o resultado da reflexão.

**Expected**: nenhum aprendizado persistido.

### 3) Bloqueio de segredo/sensível

1. Envie mensagem com dado sensível.
2. Verifique logs/resultado da reflexão.

**Expected**: nenhum aprendizado persistido; resposta do chat segue normal.

### 4) Esquecimento de preferência

1. Garanta que exista uma preferência aprendida para o usuário.
2. Execute `forget_preference` com o alvo correto.

**Expected**: preferência removida para aquele usuário.

### 5) Esquecimento seguro sem correspondência

1. Execute `forget_preference` com alvo inexistente.

**Expected**: operação segura sem remoções indevidas.

### 6) Fluxo completo via API de memória

1. Cadastre incidentes de severidades diferentes.
2. Grave em `POST /memories` um fato de preferência de ordenação (`critical` → `low`).
3. Consulte `GET /memories` para validar recall do fato com score acima do limiar.
4. Envie solicitação no chat pedindo listagem ordenada por severidade.

**Expected**: o fato de preferência aparece no contexto recuperado e influencia a resposta operacional.

## Commands

```bash
npm test
npm run typecheck
```
