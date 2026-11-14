# Research: Verificação de status de provedores externos

## Decision

A ferramenta `check_provider_status` será implementada como uma tool do agente em `src/agents/tools.ts`, com suporte a `provider` enum `github | cloudflare`, default `github`, e saída compacta no formato `"<indicator> — <description>"`.

## Rationale

- O requisito da feature é específico e está alinhado ao uso operacional do IncidentArena: distinguir falhas internas de indisponibilidade externa.
- O StatusPage público é a fonte apropriada e fornece resposta estruturada com `status.indicator` e `status.description`.
- A validação com Zod na borda e o limite de 5 segundos reduzem risco operacional e evitam que a ferramenta bloqueie o diagnóstico.
- O retry único em falhas transitórias e o retorno observável reduzem ruído sem expor stack traces ou exceções não tratadas.

## Alternatives considered

1. Consultar a API do provedor diretamente sem mapeamento por provider.
   - Rejeitado: a feature exige enum e endpoint explícito por provedor para manter clareza operacional e diminuir erro humano.

2. Fazer uma única tentativa e propagar exceções ao agente.
   - Rejeitado: contradiz a regra de erro legível e segurança do sistema; a tool deve se comportar com observação e não lançar exceção para fora.

3. Retornar JSON completo do payload original.
   - Rejeitado: o requisito exige retorno compacto em uma linha para não inflar o contexto de conversação.

## Resolved unknowns

- Nenhum item de `NEEDS CLARIFICATION` permaneceu na spec; os comportamentos de entrada, retry, timeout e schema foram considerados suficientes para implementação.
- O design usa fetch injetável em unit tests para permitir execução sem rede e controle determinístico de falhas.
