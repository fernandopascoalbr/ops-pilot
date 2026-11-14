# Implementation Plan: Verificação de status de provedores externos

**Branch**: `005-provider-status-check` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-provider-status-check/spec.md`

## Summary

Adicionar uma tool de diagnóstico operacional para consultar o status público de provedores externos (`github` e `cloudflare`) por meio de chamadas ao StatusPage público, aplicar validação de entrada e resposta com Zod, aplicar timeout de 5 segundos e retry único em falhas de rede/5xx, e devolver um resumo compacto em uma linha para uso no contexto do agente. A solução será implementada na camada de tools do agente com fetch injetável e testes determinísticos sem rede.

## Technical Context

**Language/Version**: TypeScript (strict) com runtime Node.js LTS (ES2022 / NodeNext)

**Primary Dependencies**: `zod` para validação de borda; `@langchain/core` para tools e schemas; `node:test` + `tsx` para testes determinísticos

**Storage**: N/A para esta feature; não haverá persistência nova

**Testing**: `node --import tsx --test` com `fetch` injetável e testes de sucesso, timeout e payload inválido sem rede

**Target Platform**: Backend/agent local em Node.js, executado dentro do ambiente do IncidentArena

**Project Type**: Backend library/agent tooling dentro de um projeto TypeScript único

**Performance Goals**:
- Resposta típica em menos de 5 segundos em condições normais
- No máximo uma nova tentativa após falha transitória
- Retorno compactado em uma linha para evitar inflar o contexto do agente

**Constraints**:
- Timeout obrigatório de 5 segundos por tentativa
- Falha de rede ou status 5xx exige retry único antes do erro final
- Nenhuma exceção não tratada deve escapar da tool
- A saída deve ser compacta e observável, nunca um stack trace para o usuário do agente

**Scale/Scope**:
- 2 provedores suportados: `github` e `cloudflare`
- 1 tool pública em `src/agents/tools.ts`
- Cobertura de testes para sucesso, retry em erro e payload inválido

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate Review

- **Spec-First Delivery**: PASS — a spec da feature foi criada e documenta valor, cenário e requisitos testáveis.
- **Agent Safety Over Automation Speed**: PASS — a tool exige timeout, validação, retry único e erro observável; não há exceção não tratada.
- **Evidence-Driven Incident Handling**: PASS — a feature é explicitamente orientada a diferenciar falhas internas de indisponibilidade externa.
- **Tool and Context Boundaries**: PASS — a integração com statuspage fica isolada em uma tool de agente, sem misturar responsabilidade de negócio com I/O externo.
- **Quality, Security, and Testability**: PASS — a feature exige testes determinísticos sem rede e validação de schemas em borda.

### Post-Phase 1 Re-Check

- **Spec-First Delivery**: PASS — artefatos de design foram produzidos e a feature continua alinhada à spec.
- **Agent Safety Over Automation Speed**: PASS — a arquitetura preserva timeout, retry e resposta legível em caso de falha final.
- **Evidence-Driven Incident Handling**: PASS — o contrato da tool documenta o uso operacional e a observação de status do provedor.
- **Tool and Context Boundaries**: PASS — a lógica de fetch, validação e uso do resultado permanece separada da orquestração do agente.
- **Quality, Security, and Testability**: PASS — quickstart e modelo de dados definem validação reprodutível e cenários de regressão.

## Project Structure

### Documentation (this feature)

```text
specs/005-provider-status-check/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── provider-status-tool.contract.yaml
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── agents/
│   ├── index.ts               # registry do agente e estratégias
│   ├── tools.ts               # nova tool check_provider_status
│   ├── react.ts
│   ├── plan-and-execute.ts
│   └── reflect-plan-and-execute.ts
├── http/
│   └── ...                    # não alterado por esta feature
├── domain/
│   └── strategy.ts            # tipos compartilhados do agente
└── config/
    └── env.ts                 # opcional, se necessário para URLs configuráveis

tests/
├── integration/
│   └── provider-status-tool.test.ts
└── unit/
    └── provider-status-tool.test.ts
```

**Structure Decision**: Projeto único TypeScript com extensão da camada de ferramentas do agente em `src/agents/tools.ts`; o fetch externo, a validação Zod e o retry ficam encapsulados na própria tool para manter a API do agente estável e o comportamento testável.

## Complexity Tracking

Nenhuma violação constitucional identificada; não há necessidade de justificar exceções ou escalar a arquitetura.
