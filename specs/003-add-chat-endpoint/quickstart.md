# Quickstart: Add Chat Endpoint Validation

## Objetivo

Validar localmente que o endpoint `POST /chat`:

1. processa requisições válidas e retorna `answer`, `trace`, `metrics`,
2. aplica estratégia padrão quando `strategy` não é enviada,
3. retorna erros corretos para body inválido e estratégia desconhecida,
4. encerra corretamente por timeout de 180 segundos,
5. é coberto por teste de integração determinístico sem rede.

## Pré-requisitos

- Node.js LTS
- Dependências instaladas:

```bash
npm install
```

## Cenário 1 — Verificar regressão geral da suíte existente

```bash
npm test
```

**Resultado esperado**:

- Testes existentes seguem verdes.
- Não há dependência de rede para os testes da feature.

## Cenário 2 — Executar testes de integração do endpoint

```bash
node --import tsx --test tests/integration/chat-*.test.ts
```

**Resultado esperado**:

- Caso de sucesso retorna status `200` e payload com `answer`, `trace`, `metrics`.
- Body inválido retorna `400` e contém `issues` de validação.
- Estratégia desconhecida retorna `422`.
- Fluxo acima do limite retorna `504`.

## Cenário 3 — Validação manual do contrato HTTP

> Com o servidor local em execução, enviar chamadas para verificar contrato funcional.

Exemplo de requisição válida:

```json
{
  "message": "Analise os alertas ativos do plantão",
  "strategy": "react",
  "reflect": false
}
```

**Resultado esperado**:

- Resposta JSON em formato conforme contrato.
- Sem campos obrigatórios ausentes.

## Referências

- Contrato: [contracts/chat-endpoint.contract.yaml](./contracts/chat-endpoint.contract.yaml)
- Modelo de dados: [data-model.md](./data-model.md)
- Especificação: [spec.md](./spec.md)

## Checklist rápido de aceite

- [ ] Endpoint responde `200` para payload válido.
- [ ] Estratégia default `react` é aplicada quando omitida.
- [ ] Erro `400` inclui `issues` detalhadas de validação.
- [ ] Erro `422` é retornado para estratégia não registrada.
- [ ] Erro `504` ocorre ao ultrapassar 180 segundos.
- [ ] Testes de integração executam sem rede e com resultado determinístico.
