# Research: Add Chat Endpoint

## Decision 1: Endpoint contract and default strategy behavior

- **Decision**: Expor `POST /chat` com corpo `{ message, strategy?, reflect? }`; quando `strategy` ausente, usar `react` como padrão.
- **Rationale**: Mantém o fluxo principal mínimo, previsível e compatível com o comportamento esperado no spec.
- **Alternatives considered**:
  - Exigir `strategy` em todas as chamadas (rejeitado por piorar UX e aumentar acoplamento do cliente).
  - Definir outra estratégia padrão (rejeitado por conflito com requisito explícito).

## Decision 2: Boundary validation and error mapping

- **Decision**: Validar o body na borda HTTP com schema único e mapear falhas para `400` com lista detalhada de issues; mapear estratégia inválida para `422`.
- **Rationale**: Segue princípio constitucional de validação em fronteira e oferece feedback acionável para consumidores.
- **Alternatives considered**:
  - Unificar todos os erros de entrada em `400` genérico (rejeitado por perda de clareza de causa).
  - Validar parcialmente no endpoint e parcialmente no registry (rejeitado por fragmentar responsabilidade).

## Decision 3: Strategy registry and reflection wrapper

- **Decision**: Criar `src/agents/index.ts` com registro `nome -> estratégia` e aplicar `withReflection` somente quando `reflect=true`.
- **Rationale**: Centraliza descoberta de estratégias, reduz duplicação e mantém endpoint simples.
- **Alternatives considered**:
  - Resolver estratégia diretamente no endpoint com condicionais extensos (rejeitado por acoplamento e baixa extensibilidade).
  - Aplicar reflexão sempre (rejeitado por custo extra e mudança de comportamento implícita).

## Decision 4: Timeout policy for request lifecycle

- **Decision**: Encerrar a chamada em 180 segundos com retorno `504` quando o processamento não finalizar no prazo.
- **Rationale**: Evita espera indefinida e cumpre requisito de previsibilidade operacional.
- **Alternatives considered**:
  - Sem timeout explícito (rejeitado por risco operacional).
  - Timeout configurável por requisição (adiado; sem requisito no escopo atual).

## Decision 5: Deterministic integration testing without network

- **Decision**: Teste de integração com estratégia fake determinística registrada no catálogo de teste, cobrindo sucesso (200), body inválido (400), estratégia desconhecida (422) e timeout (504), sem chamadas externas.
- **Rationale**: Garante confiabilidade, reprodutibilidade e aderência à constituição de qualidade/testabilidade.
- **Alternatives considered**:
  - Testes apenas unitários de handlers (rejeitado por não validar contrato HTTP fim a fim).
  - Teste com estratégias reais dependentes de rede/modelo (rejeitado por não determinismo).
