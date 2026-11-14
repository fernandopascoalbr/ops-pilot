# Data Model: Learning Reflection Memory

## Entity: LearningCandidate

Resultado da análise da última mensagem do usuário.

| Field | Type | Description | Constraints |
|---|---|---|---|
| hasLearning | boolean | Indica se há fato durável elegível | Obrigatório |
| fact | string | Fato destilado quando há aprendizado | Obrigatório quando hasLearning = true; vazio caso contrário |
| reason | string | Justificativa resumida para auditoria | Não deve conter segredo literal |

## Entity: DurableFact

Memória persistida para uso futuro.

| Field | Type | Description | Constraints |
|---|---|---|---|
| id | string | Identificador único | Obrigatório |
| userId | string | Dono da memória | Obrigatório; escopo isolado |
| fact | string | Conteúdo útil e estável | Obrigatório; não pontual; não sensível |
| createdAt | datetime string | Momento do registro | Obrigatório |
| source | string | Origem do aprendizado | Valor esperado: reflexão pós-resposta |

## Entity: ForgetPreferenceRequest

Solicitação explícita de remoção.

| Field | Type | Description | Constraints |
|---|---|---|---|
| userId | string | Usuário solicitante | Obrigatório |
| target | string | Preferência/fato alvo | Obrigatório; não vazio |

## Entity: MemoryRecallRequest

Consulta de memória para recall semântico.

| Field | Type | Description | Constraints |
|---|---|---|---|
| userId | string | Usuário dono do contexto | Obrigatório |
| query | string | Texto para busca semântica | Obrigatório; não vazio |
| k | integer | Quantidade máxima de resultados | Opcional; default 3; máximo 10 |
| minScore | number | Limiar de relevância | Opcional; default 0.3; intervalo 0..1 |

## Relationships

- Um usuário possui muitos DurableFacts.
- Um LearningCandidate pode gerar zero ou um DurableFact.
- Um ForgetPreferenceRequest remove no máximo os fatos correspondentes ao mesmo usuário.
- Um MemoryRecallRequest retorna apenas fatos do mesmo usuário com score acima do limiar.

## Validation Rules

- Se `hasLearning = false`, nenhum DurableFact é persistido.
- Se conteúdo for classificado como segredo/sensível, nenhum DurableFact é persistido.
- Pedidos pontuais não podem virar DurableFact.
- Esquecimento nunca deve remover fatos de outro usuário.

## State Transitions

1. Mensagem recebida.
2. LearningCandidate avaliado.
3. Se elegível, DurableFact enfileirado para persistência assíncrona.
4. DurableFact persistido.
5. Se solicitado, DurableFact removido por forget_preference.
