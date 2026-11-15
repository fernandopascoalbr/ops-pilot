# Research: Model Fallback Resilience

## Decision: configurar fallback por variável de ambiente dedicada

Adotar `OPENROUTER_MODEL_FALLBACK` como fonte da lista ordenada de modelos de reserva, separada do modelo primário.

### Rationale

- Permite ajuste operacional sem alterar código.
- Mantém fronteira de configuração explícita e auditável.
- Preserva compatibilidade com a variável já existente do modelo primário.

### Alternatives considered

- Reusar `OPENROUTER_MODEL` com múltiplos valores: rejeitado por ambiguidade entre primário e reservas.
- Hardcode de reservas em código: rejeitado por reduzir governança operacional.

## Decision: aplicar retry no primário antes do fallback

Encadear tentativas no modelo primário com política de retry antes de acionar modelos de reserva.

### Rationale

- Mantém preferência operacional pelo modelo principal.
- Reduz uso desnecessário de reservas em falhas transitórias.
- Separa claramente falha transitória (retry) de falha estrutural (fallback).

### Alternatives considered

- Ir direto para fallback na primeira falha: rejeitado por aumentar variabilidade de resposta.
- Retry em todos os modelos indistintamente: rejeitado por custo e comportamento menos previsível.

## Decision: usar cadeia de fallback ordenada e finita

Aplicar fallback com sequência explícita de modelos de reserva, respeitando a ordem configurada até sucesso ou esgotamento.

### Rationale

- Determinismo operacional para análise de incidentes.
- Facilidade de teste com cenários reproduzíveis.
- Alinhamento com requisito funcional de ordem de prioridade.

### Alternatives considered

- Escolha aleatória entre reservas: rejeitado por baixa previsibilidade.
- Seleção por heurística dinâmica não configurada: rejeitado por aumentar complexidade sem requisito no escopo.

## Decision: registrar fallback no trace e expor modelo usado em métricas

Emitir evento de trace `fallback` em toda troca de modelo e retornar `metrics.modelUsed` na resposta.

### Rationale

- Atende necessidade de auditabilidade ponta a ponta.
- Suporta análise de confiabilidade por modelo sem inspeção de logs brutos.
- Reduz tempo de diagnóstico em incidentes de provedor/modelo.

### Alternatives considered

- Registrar apenas em logs internos: rejeitado por dificultar consumo em testes/cliente.
- Expor só o modelo final sem evento de fallback: rejeitado por perder trilha causal.

## Decision: retornar indisponibilidade explícita quando todos os modelos falharem

Quando primário e reservas falharem, mapear o resultado para erro HTTP 503 no endpoint de chat.

### Rationale

- Comunica indisponibilidade temporária de capacidade de inferência.
- Evita respostas “de sucesso” com conteúdo degradado e sem garantia.
- Mantém contrato previsível para clientes com lógica de retry.

### Alternatives considered

- Retornar 500 genérico: rejeitado por sinalizar causa menos precisa para o cliente.
- Retornar resposta textual de fallback local: rejeitado por mascarar falha real de capacidade.
