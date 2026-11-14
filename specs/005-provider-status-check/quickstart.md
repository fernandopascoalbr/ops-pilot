# Quickstart: Verificação de status de provedores externos

## Objetivo

Validar que a ferramenta de diagnóstico de status externo consegue:
- consultar `github` e `cloudflare` corretamente,
- respeitar timeout de 5 segundos,
- fazer retry único em falhas transitórias,
- validar payload e devolver erro legível sem exceção.

## Pré-requisitos

- Node.js LTS
- Dependências do projeto instaladas (`npm install`)
- Ambiente de execução local do OpsPilot

## Cenários validados

### 1. Consulta bem-sucedida

```bash
npm test -- --test-name-pattern "provider status"
```

Resultado esperado:
- A tool aceita `provider=github` e `provider=cloudflare`.
- O retorno contém indicador e descrição em uma linha.
- O valor padrão `github` funciona quando `provider` é omitido.

### 2. Timeout e retry

```bash
npm test -- --test-name-pattern "timeout"
```

Resultado esperado:
- A chamada usa `AbortSignal.timeout(5000)`.
- O fetch falhando por timeout dispara retry único.
- Quando a segunda tentativa também falha, a tool devolve erro legível em vez de lançar exceção.

### 3. Payload inválido

```bash
npm test -- --test-name-pattern "invalid response"
```

Resultado esperado:
- O schema Zod rejeita payload sem `status.indicator` ou `status.description`.
- O erro fica encapsulado na resposta da tool, preservando o fluxo do agente.

### 4. Falha de rede / 5xx

```bash
npm test -- --test-name-pattern "network or server failure"
```

Resultado esperado:
- A tool executa uma segunda tentativa após falha de rede ou 5xx.
- O erro final permanece legível e observável.

## Observações

- Os testes devem usar `fetch` injetável para não depender de rede externa.
- A verificação deve ser determinística e reproduzível em CI/local.
- Nenhum cenário de sucesso ou falha deve depender de acesso real à internet.
