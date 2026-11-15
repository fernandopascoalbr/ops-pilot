# Quickstart: Validação do Grafo Unificado

## Pré-requisitos

- Node.js LTS instalado
- Dependências do projeto instaladas com `npm install`
- Opcional: chave do OpenRouter para cenários com modelo externo

## Cenário 1: rota padrão do chat

1. Execute o servidor local:
   ```bash
   npm run dev
   ```
2. Envie uma requisição para o endpoint com um contexto simples:
   ```bash
   curl -X POST http://localhost:3000/chat \
     -H 'content-type: application/json' \
     -d '{"message":"Analise os alertas ativos e me diga a próxima ação."}'
   ```
3. Verifique se a resposta contém:
   - `route`
   - `reason`
   - `trace[]` com eventos contendo `node`

## Cenário 2: estratégia explícita e mesmo contrato

```bash
curl -X POST http://localhost:3000/chat \
  -H 'content-type: application/json' \
  -d '{"message":"Preciso de um plano de execução para o incidente de autenticação.","strategy":"plan-and-execute"}'
```

Validação esperada:
- resposta retorna `route` e `reason` no mesmo corpo,
- a estratégia escolhida aparece no trace como nó ativo,
- o campo `node` é informado em todos os eventos relevantes do fluxo.

## Cenário 3: contexto ambíguo

```bash
curl -X POST http://localhost:3000/chat \
  -H 'content-type: application/json' \
  -d '{"message":"Há muita confusão e não sei qual caminho tomar."}'
```

Validação esperada:
- a rota não é forçada silenciosamente,
- a explicação da decisão menciona a incerteza,
- o trace registra a etapa de roteamento e a resposta preserva a decisão.

## Critério de sucesso

A feature estará validada quando a resposta do `/chat` sempre incluir `route` e `reason`, e quando o trace mostrar a sequência atual do grafo com o nó ativo em cada etapa relevante.
