# Quickstart: Reflect Plan-and-Execute Validation

## Objetivo

Validar localmente que a estratégia reflect-plan-and-execute:

1. gera plano inicial antes de executar,
2. executa passos com reflexão auditável por iteração,
3. respeita limite de iteração e fallback seguro,
4. não quebra o comportamento atual das estratégias existentes.

## Pré-requisitos

- Node.js LTS
- Dependências instaladas (`npm install`)
- Arquivo `.env` configurado (quando necessário para modelo externo)

## Cenário 1 — Regressão baseline (estratégias atuais continuam operando)

```bash
npm test
```

**Resultado esperado**:

- Suite de testes atual passa sem falhas.
- Estratégias existentes (`react`, `plan-and-execute`) continuam com trace e métricas válidas.

## Cenário 2 — Execução comparativa no arena

```bash
npm run arena -- --strategies react,plan-and-execute --max-iterations 6 --input "Analise os alertas ativos e priorize resposta segura."
```

**Resultado esperado**:

- Ambas estratégias executam sem erro.
- Saídas exibem `answer`, `trace` e `metrics`.
- Nenhuma regressão de parsing/execução no runner existente.

## Cenário 3 — Nova estratégia reflect-plan-and-execute

> Runner definitivo: `src/arena.ts` com script npm `reflect:plan-and-execute`.

```bash
npm run reflect:plan-and-execute -- --input "Investigue o alerta crítico de pagamentos e proponha ação segura." --max-iterations 4
```

**Resultado esperado**:

- Planejamento inicial aparece antes da primeira ação.
- Há evento de reflexão por iteração com decisão (`continue|adjust|end`).
- `stepsUsed` nunca ultrapassa `max-iterations`.
- Em cenário de incerteza, resultado final aponta fallback seguro.

## Cenário 4 — Limite e encerramento seguro

```bash
npm run reflect:plan-and-execute -- --input "Contexto incompleto e conflito de evidências; evite ações arriscadas." --max-iterations 2
```

**Resultado esperado**:

- Execução encerra no limite configurado.
- Trace contém justificativa de encerramento.
- Saída final preserva comportamento não destrutivo.

## Referências de contrato e modelo

- Contrato: [contracts/reflect-plan-execute.contract.yaml](./contracts/reflect-plan-execute.contract.yaml)
- Modelo de dados: [data-model.md](./data-model.md)

## Checklist rápido de aceite local

- [ ] Estratégia nova executa com `answer`, `trace` e `metrics`.
- [ ] Reflexão aparece em todas as iterações executadas.
- [ ] Limites de execução são respeitados.
- [ ] Fallback seguro é acionado nos cenários de baixa confiança.
- [ ] Testes existentes permanecem passando.
