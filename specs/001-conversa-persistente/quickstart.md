# Quickstart: Conversa Persistente no Chat

## Objetivo

Validar ponta a ponta que `POST /chat` suporta conversa persistente com:

1. criação automática de conversa sem `conversationId`,
2. continuidade com `conversationId` existente,
3. uso de no máximo 12 mensagens históricas no contexto,
4. preenchimento de `metrics.historyMessages`,
5. falha explícita para `conversationId` inexistente.

## Pré-requisitos

- Node.js LTS
- Dependências instaladas:

```bash
npm install
```

## Cenário 1 — Executar suíte focada de chat

```bash
node --import tsx --test tests/integration/chat-*.test.ts
```

**Resultado esperado**:

- Casos de sucesso retornam status `200` com `conversationId` e `metrics.historyMessages`.
- Casos de entrada inválida retornam `400`.
- Estratégia desconhecida retorna `422`.
- Timeout continua retornando `504`.

## Cenário 2 — Validar persistência e continuidade da conversa

```bash
node --import tsx --test tests/integration/chat-persistence.test.ts
```

**Resultado esperado**:

- Primeira chamada sem `conversationId` retorna um id novo.
- Segunda chamada com esse id mantém continuidade e retorna o mesmo id.
- Histórico utilizado não ultrapassa 12 mensagens e a métrica reflete a contagem.
- `conversationId` inexistente resulta em erro explícito.

## Cenário 3 — Executar regressão completa

```bash
npm test
```

**Resultado esperado**:

- Testes existentes permanecem verdes.
- Não há dependência de rede externa para validar a feature.

## Referências

- Especificação: [spec.md](./spec.md)
- Plano: [plan.md](./plan.md)
- Pesquisa: [research.md](./research.md)
- Modelo de dados: [data-model.md](./data-model.md)
- Contrato: [contracts/chat-persistent.contract.yaml](./contracts/chat-persistent.contract.yaml)
