# Contract: Chat Memory Integration

## Endpoint

`POST /chat`

## Request body

```json
{
  "message": "Qual é o status do cliente?",
  "strategy": "reflect-plan-and-execute",
  "reflect": false,
  "conversationId": "conv-123",
  "userId": "user-456"
}
```

### Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `message` | string | Yes | User prompt text |
| `strategy` | string | No | Existing strategy selector |
| `reflect` | boolean | No | Existing reflection toggle |
| `conversationId` | string | No | Existing conversation identifier |
| `userId` | string | No | User scope for memory recall and isolation |

## Behavior

When `userId` is provided, the server should:

1. Retrieve the top three candidate memories for that user using semantic similarity.
2. Filter out matches below the minimum threshold of `0.3`.
3. Inject the selected memory context into the prompt before strategy execution.
4. Keep the rest of the existing chat processing workflow unchanged.

The score filter in step 2 is mandatory to avoid noisy prompt augmentation, control token cost, and prevent low-confidence memory fragments from biasing the model response.

## Response body

```json
{
  "conversationId": "conv-123",
  "answer": "O cliente está com a conta em atraso e a revisão manual foi agendada.",
  "trace": [],
  "metrics": {
    "historyMessages": 4,
    "memoryRecallCount": 2
  }
}
```

## Error handling

- Invalid JSON or invalid request schema returns the existing HTTP 400 validation response.
- Missing user-specific memory is treated as a normal empty recall set, not an error.
- Memory retrieval must not leak another user’s facts or merge memory sets across accounts.
