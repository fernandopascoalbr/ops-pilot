# Quickstart: MCP Incident Server

## Objetivo

Validar ponta a ponta que o servidor MCP `incidentarena`:
- inicia via script dedicado,
- registra as tools `list_alerts`, `open_incident` e `resolve_incident`,
- mantém stdout reservado ao protocolo e diagnóstico em stderr.

## Pré-requisitos

- Node.js LTS
- Dependências instaladas (`npm install`)
- Ambiente local com acesso ao repositório

## Fluxo de validação

### 1. Verificar consistência de base

```bash
npm test
```

Resultado esperado:
- Suite atual passa sem regressões antes da nova borda MCP.

### 2. Subir o servidor MCP

```bash
npm run mcp
```

Resultado esperado:
- Processo inicia sem erro.
- O canal de protocolo fica disponível em stdio.
- Não há uso de `console.log` no servidor.

### 3. Validar listagem de tools

Execute o cenário automatizado que conecta no servidor MCP e consulta o catálogo de tools.

Exemplo:

```bash
npm test -- tests/integration/mcp-server-tools.test.ts tests/integration/mcp-server-contracts.test.ts
```

Resultado esperado:
- A listagem contém `list_alerts`, `open_incident` e `resolve_incident`.
- Os contratos de entrada correspondem aos schemas compartilhados.

### 4. Validar disciplina de canais

No cenário de integração, confirmar que:
- stdout contém somente tráfego do protocolo MCP.
- mensagens de diagnóstico (quando houver) aparecem em stderr.

```bash
npm test -- tests/integration/mcp-stdio-discipline.test.ts
```

## Referências de design

- Contrato das interfaces: [contracts/mcp-incident-server.contract.yaml](./contracts/mcp-incident-server.contract.yaml)
- Modelo de dados e transições: [data-model.md](./data-model.md)
- Decisões de arquitetura: [research.md](./research.md)
