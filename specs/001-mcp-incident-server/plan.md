# Implementation Plan: MCP Incident Server

**Branch**: `001-mcp-incident-server` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-mcp-incident-server/spec.md`

## Summary

Adicionar um servidor MCP chamado `incidentarena` com transporte stdio, expondo as operações `list_alerts`, `open_incident` e `resolve_incident`, reutilizando exatamente o mesmo `OpsStore` e os mesmos schemas Zod já usados nas tools existentes. O design prioriza fonte única de verdade para validação e regras de domínio, proíbe escrita de diagnóstico em stdout (somente stderr), e inclui validação prática de inicialização do servidor com checagem da listagem de tools.

## Technical Context

**Language/Version**: TypeScript ESM com `strict`, executando em Node.js LTS

**Primary Dependencies**: `@modelcontextprotocol/sdk` para servidor MCP e transporte stdio; `zod` para validação já consolidada; módulos internos de store e tools existentes

**Storage**: SQLite local via `SqliteOpsStore` (com `OPSPILOT_DB`), sem novo mecanismo de persistência

**Testing**: `node:test` + `tsx`, incluindo teste de integração/smoke para subir o servidor e validar listagem das tools

**Target Platform**: Processo backend local/CI em Node.js, integrável a clientes MCP via stdio

**Project Type**: Projeto único TypeScript com API/CLI/agent e nova borda MCP

**Performance Goals**:
- Inicialização do servidor MCP em até 3 segundos em ambiente local padrão
- Listagem de tools disponível imediatamente após handshake de inicialização
- Sem regressão perceptível nas operações já existentes de incidente

**Constraints**:
- Nenhum `console.log` no servidor MCP (stdout reservado ao protocolo)
- Diagnóstico e observabilidade operacional enviados apenas para stderr
- Reuso obrigatório da mesma validação e do mesmo armazenamento operacional já existentes
- Script npm dedicado para execução do servidor MCP

**Scale/Scope**:
- 1 servidor MCP (`incidentarena`)
- 3 tools expostas (`list_alerts`, `open_incident`, `resolve_incident`)
- 1 novo entrypoint em `src/mcp/server.ts`
- Cobertura de teste para validação da listagem de tools

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate Review

- **Spec-First Delivery**: PASS — há spec ativa para a feature com cenários e critérios mensuráveis.
- **Agent Safety Over Automation Speed**: PASS — borda MCP terá validação de entrada e erros explícitos, sem fallback silencioso.
- **Evidence-Driven Incident Handling**: PASS — o design exige comportamento auditável, com saída de diagnóstico em canal apropriado.
- **Tool and Context Boundaries**: PASS — o servidor MCP atua como nova fronteira de integração, reutilizando domínio/store já consolidados.
- **Quality, Security, and Testability**: PASS — a feature exige teste de inicialização e listagem de tools, mantendo validação na fronteira.

### Post-Phase 1 Re-Check

- **Spec-First Delivery**: PASS — artefatos de design (research, data model, contracts, quickstart) derivados da spec.
- **Agent Safety Over Automation Speed**: PASS — contrato define validação rígida, erros explícitos e disciplina de canais stdio/stderr.
- **Evidence-Driven Incident Handling**: PASS — entidades e fluxos mantêm rastreabilidade de incidentes e alertas no store existente.
- **Tool and Context Boundaries**: PASS — responsabilidades separadas entre servidor MCP, schemas compartilhados e lógica de domínio.
- **Quality, Security, and Testability**: PASS — quickstart descreve validação ponta a ponta e regressão mínima com testes automatizáveis.

## Project Structure

### Documentation (this feature)

```text
specs/001-mcp-incident-server/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── mcp-incident-server.contract.yaml
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── mcp/
│   └── server.ts                  # novo servidor MCP com transporte stdio
├── agents/
│   ├── tools.ts                   # schemas/tools existentes (fonte de verdade)
│   └── ops-store.ts               # acesso ao store operacional compartilhado
├── store/
│   ├── ops-store.ts               # contrato de domínio
│   └── sqlite-ops-store.ts        # persistência operacional SQLite
└── config/
    └── env.ts                     # reutilização se necessário para env loading

tests/
├── integration/
│   └── mcp-server-tools.test.ts   # valida listagem de tools via servidor MCP
└── ...                            # suites existentes sem alteração estrutural
```

**Structure Decision**: Manter projeto único TypeScript e adicionar apenas uma nova borda de integração em `src/mcp/server.ts`, reaproveitando módulos existentes para store e validação, evitando duplicação de lógica.

## Complexity Tracking

Nenhuma violação constitucional identificada; sem necessidade de justificativas de exceção.
