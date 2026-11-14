# Implementation Plan: Reflect Plan-and-Execute Strategy

**Branch**: `[001-reflect-plan-and-execute]` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-reflect-plan-and-execute/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Adicionar uma nova estratégia de execução chamada `reflect-plan-and-execute` que mantém a lógica de planejamento inicial e execução passo a passo, porém com reflexão explícita por etapa (ou bloco) para decidir entre continuar, replanejar ou encerrar com fallback seguro. A abordagem preserva o contrato atual de estratégias, reaproveita o store e ferramentas operacionais existentes, e adiciona governança de limites/critério de parada sem quebrar o fluxo atual de `react` e `plan-and-execute`.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.x, Node.js LTS (ESM)

**Primary Dependencies**: `@langchain/core`, `@langchain/langgraph`, `@langchain/openai`, `zod`

**Storage**: Arquivo local JSON em `data/seed.json` via `src/infra/store.ts`

**Testing**: `node:test` com execução via `node --import tsx --test tests/**/*.test.ts`

**Target Platform**: CLI local em macOS/Linux (ambiente Node.js)

**Project Type**: Engine de raciocínio operacional com CLI e estratégias plugáveis

**Performance Goals**:
- Encerrar execução da estratégia dentro do limite configurado de iterações (hard cap)
- Produzir trilha auditável completa (`trace`) para 100% das execuções
- Manter latência proporcional ao número de passos (sem loops não limitados)

**Constraints**:
- Preservar compatibilidade com `ReasoningStrategy` e fluxo de execução atual
- Não introduzir ações destrutivas sem fallback seguro
- Reutilizar validação de fronteira com Zod e trilha observável existente

**Scale/Scope**:
- Escopo local de uma nova estratégia + integração com scripts de execução
- Até 8 iterações por execução por padrão (alinhado com limites atuais)
- Cobertura de testes unitários/integrados para sucesso, ajuste e fallback

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Spec-First Delivery**: PASS — spec aprovada em [spec.md](./spec.md), planejamento segue workflow Speckit.
- **Agent Safety Over Automation Speed**: PASS — design exige limite de iterações, critérios de parada e fallback seguro.
- **Evidence-Driven Incident Handling**: PASS — todas decisões da estratégia deverão registrar justificativa auditável em trace.
- **Tool and Context Boundaries**: PASS — estratégia nova será isolada em `src/agents/` e reutilizará domínio/store já existentes.
- **Quality, Security, and Testability**: PASS — plano inclui validação com testes e preservação de tipagem/contratos.

## Project Structure

### Documentation (this feature)

```text
specs/001-reflect-plan-and-execute/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── agents/
│   ├── model.ts
│   ├── ops-store.ts
│   ├── plan-and-execute.ts
│   ├── react.ts
│   ├── tools.ts
│   ├── trace.ts
│   └── types.ts
├── domain/
│   ├── alerts.ts
│   └── strategy.ts
├── infra/
│   └── store.ts
├── arena.ts
├── cli.ts
└── index.ts

tests/
├── arena.test.ts
├── store.test.ts
└── trace-format.test.ts
```

**Structure Decision**: projeto único TypeScript com estratégias em `src/agents/`, contratos de domínio em `src/domain/`, persistência em `src/infra/` e testes centralizados em `tests/`.

## Complexity Tracking

Nenhuma violação de constituição identificada neste planejamento.

## Phase 0: Research Output

Ver [research.md](./research.md) para decisões sobre arquitetura reflect, integração incremental, limites de execução e política de fallback.

## Phase 1: Design Output

- Modelo de dados: [data-model.md](./data-model.md)
- Contratos: [contracts/reflect-plan-execute.contract.yaml](./contracts/reflect-plan-execute.contract.yaml)
- Guia de validação local: [quickstart.md](./quickstart.md)

## Integration Strategy (sem quebra de comportamento)

1. Introduzir nova estratégia isolada (`reflect-plan-and-execute`) sem alterar `react` e `plan-and-execute`.
2. Manter o contrato `ReasoningStrategy` inalterado para evitar impacto em consumidores existentes.
3. Adicionar opção de estratégia no fluxo de seleção (CLI/arena) mantendo defaults atuais.
4. Acrescentar script dedicado para execução da nova estratégia, sem remover scripts existentes.
5. Preservar formato de `trace` e `metrics` para manter comparabilidade em testes e benchmarking.

## Testing Strategy

- **Unitário**:
  - decisão da reflexão (`continue`, `adjust`, `end`) com entradas controladas;
  - aplicação de limites de iteração e critérios de parada;
  - fallback seguro em cenários de baixa confiança.
- **Integração**:
  - execução fim a fim da estratégia com store seedado e geração de trace auditável;
  - compatibilidade de múltiplas estratégias no `arena` sem regressão.
- **Regressão**:
  - manter testes atuais de `plan-and-execute`, `react`, `store` e `trace-format` passando.

## Rollout & Local Validation Plan

1. Implementar estratégia em paralelo ao comportamento atual (feature additive).
2. Expor comando de execução dedicado via script npm.
3. Executar bateria local de testes e cenário manual guiado (quickstart).
4. Validar métricas mínimas de completude (trace, stepsUsed, limite aplicado).
5. Somente após validação, promover uso da nova estratégia em cenários de comparação no arena.

## Technical Decisions and Main Risks

### Decisões técnicas principais

- Usar arquitetura de estratégia plugável existente (`ReasoningStrategy`) para reduzir risco de integração.
- Reutilizar store, ferramentas e esquema de trace/metrics para manter auditabilidade consistente.
- Tratar reflexão como etapa explícita pós-execução com decisão estruturada (`continue|adjust|end`).
- Tornar fallback seguro obrigatório quando critérios de confiança/limite falharem.

### Riscos principais

- **Risco de loop de replanejamento**: mitigado por hard cap de iterações e gatilho de parada.
- **Risco de degradação de clareza do trace**: mitigado por eventos de reflexão dedicados e formato consistente.
- **Risco de regressão no CLI/arena**: mitigado por integração aditiva e testes de regressão.
- **Risco de baixa qualidade de plano em contexto incompleto**: mitigado por fallback determinístico e encerramento seguro.

## Constitution Check (Post-Design Re-evaluation)

- **Spec-First Delivery**: PASS — artefatos de design produzidos no diretório da feature.
- **Agent Safety Over Automation Speed**: PASS — critérios de parada/fallback definidos nos contratos.
- **Evidence-Driven Incident Handling**: PASS — data model e contratos exigem justificativa e trace.
- **Tool and Context Boundaries**: PASS — separação mantida entre estratégia, domínio e infraestrutura.
- **Quality, Security, and Testability**: PASS — quickstart e estratégia de testes cobrem unitário + integração + regressão.
