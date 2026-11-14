# Contract: Learning Reflection and Forget Preference

## Reflection Decision Contract

Saída estruturada da etapa de reflexão pós-resposta.

```json
{
  "hasLearning": true,
  "fact": "O usuário prefere respostas objetivas em português."
}
```

### Rules

- `hasLearning` define se haverá tentativa de persistência.
- `fact` deve representar somente fato durável, sem segredo e sem pedido pontual.
- Quando `hasLearning` for `false`, `fact` deve vir vazio ou omitido.

## Async Persistence Contract

Quando `hasLearning = true`:

1. O sistema agenda persistência assíncrona.
2. O sucesso/falha da persistência não altera a resposta já entregue ao usuário.
3. Falhas devem ser registradas para auditoria operacional.

## Tool Contract: forget_preference

### Input

```json
{
  "userId": "user-123",
  "target": "respostas objetivas em português"
}
```

### Expected behavior

- Remove preferências aprendidas correspondentes apenas do `userId` informado.
- Se não houver correspondência, retorna resultado seguro sem efeito colateral.
- Nunca remove dados de outro usuário.

## HTTP Contract: `/memories`

### `POST /memories`

Input:

```json
{
  "userId": "user-123",
  "fact": "Prefiro incidentes ordenados por severidade do critical para low."
}
```

Behavior:

- Registra memória para o usuário.
- Se duplicado semântico, retorna resposta de não gravação segura.

### `GET /memories`

Query params:

- `userId` (obrigatório)
- `query` (obrigatório)
- `k` (opcional, default 3)
- `minScore` (opcional, default 0.3)

Behavior:

- Retorna top-k memórias relevantes acima do limiar de score.
- Não inclui embedding bruto na resposta.

### `DELETE /memories`

Input:

```json
{
  "userId": "user-123",
  "target": "critical para low"
}
```

Behavior:

- Remove memórias do mesmo usuário que correspondam ao alvo.
- Retorna quantidade removida.
- Nunca remove memórias de outro usuário.
