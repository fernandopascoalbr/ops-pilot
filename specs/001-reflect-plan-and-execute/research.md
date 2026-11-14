# Research: Reflect Plan-and-Execute Strategy

## Decision 1: Reflection cadence per executed step

- **Decision**: Executar reflexão após cada passo concluído, com opção de agrupar passos em bloco no futuro sem alterar o contrato principal.
- **Rationale**: Reflexão por passo maximiza rastreabilidade e facilita aplicar critérios de parada imediatamente após novas evidências.
- **Alternatives considered**:
  - Reflexão apenas no fim do plano completo (rejeitado por atrasar correções de rota).
  - Reflexão em intervalos fixos de N passos (adiado; pode ser extensão futura).

## Decision 2: Structured decision model for reflection

- **Decision**: Manter decisão estruturada com três saídas: `continue`, `adjust`, `end`.
- **Rationale**: Modelo já alinhado com comportamento existente de replanejamento e simples de testar.
- **Alternatives considered**:
  - Decisão livre em texto natural (rejeitado por menor previsibilidade e testabilidade).
  - Modelo com mais estados (`pause`, `escalate`, etc.) (adiado para não aumentar complexidade inicial).

## Decision 3: Hard safety limits and fallback

- **Decision**: Aplicar limite máximo de iterações por execução + encerramento obrigatório com fallback seguro em baixa confiança ou limite atingido.
- **Rationale**: Evita loops, protege contra ação autônoma indefinida e cumpre princípio de segurança do projeto.
- **Alternatives considered**:
  - Sem limite fixo (rejeitado por risco operacional alto).
  - Limite apenas por tempo (rejeitado por baixa determinabilidade em testes).

## Decision 4: Integration approach without regressions

- **Decision**: Introduzir estratégia nova como opção adicional sem modificar assinatura de `ReasoningStrategy`.
- **Rationale**: Reduz acoplamento, preserva consumidores atuais (`arena`, `cli`, comparações existentes).
- **Alternatives considered**:
  - Refatorar interface base de estratégias (rejeitado por risco de regressão transversal).
  - Substituir `plan-and-execute` atual (rejeitado por perda de baseline comparativo).

## Decision 5: Testing mix (unit + integration + regression)

- **Decision**: Cobrir lógica de reflexão com testes unitários e validar fluxo completo com testes de integração no runner atual.
- **Rationale**: Unitários dão diagnóstico rápido da decisão; integração prova compatibilidade com store/tools/trace.
- **Alternatives considered**:
  - Apenas integração fim a fim (rejeitado por diagnóstico fraco de falhas).
  - Apenas unitário com mocks extensivos (rejeitado por baixa confiança em comportamento real).
