# Research: Sumarização Incremental de Histórico

## Decision: Usar gatilho por lote deslocado de 8 mensagens

Executar sumarização somente quando 8 novas mensagens saírem da janela ativa das 8 mensagens mais recentes.

### Rationale

- Atende diretamente ao requisito de não sumarizar a cada request.
- Reduz custo e ruído operacional em conversas longas.
- Mantém regra objetiva e auditável para quando resumir.

### Alternatives considered

- Sumarizar em toda requisição: rejeitada por custo e comportamento instável.
- Sumarizar por tempo (ex.: a cada N minutos): rejeitada por não refletir progresso real da conversa.

## Decision: Persistir estado de progresso de sumarização por conversa

Armazenar em `conversation_summaries` um marcador de progresso (quantidade já sumarizada) para saber quando um novo lote completo foi deslocado.

### Rationale

- Permite decisão determinística do trigger sem reprocessar histórico completo.
- Simplifica reentrada/continuidade de conversa após reinício de processo.
- Evita duplicar sumarização sobre o mesmo trecho de mensagens.

### Alternatives considered

- Inferir trigger apenas pelo tamanho atual do histórico: rejeitada por ambiguidade quando há janelas parcialmente processadas.
- Manter estado só em memória: rejeitada por perda de consistência entre execuções.

## Decision: Mesclar resumo novo com resumo anterior antes de persistir

Sempre combinar o resumo recém-gerado do lote deslocado com o resumo já persistido da conversa, salvando um único resumo consolidado.

### Rationale

- Preserva memória acumulada da conversa.
- Evita fragmentação de múltiplos resumos concorrentes para a mesma conversa.
- Mantém o contexto injetado simples (uma seção consolidada).

### Alternatives considered

- Guardar resumo por lote sem consolidação: rejeitada por aumentar complexidade de montagem de contexto.
- Substituir resumo antigo pelo novo: rejeitada por perda de informação histórica.

## Decision: Injetar resumo persistido no contexto do `/chat`

Adicionar o resumo consolidado à composição de contexto quando existir, junto de memória e histórico recente.

### Rationale

- Cumpre o requisito explícito de “resumo entra no contexto”.
- Mantém o histórico curto na janela ativa sem perder decisões relevantes.
- Preserva previsibilidade da entrada entregue às estratégias.

### Alternatives considered

- Expor resumo apenas para observabilidade externa: rejeitada por não influenciar a qualidade da resposta.
- Injetar resumo somente em estratégias específicas: rejeitada por comportamento inconsistente entre estratégias.

## Decision: Emitir evento `summarize` no trace do turno

Registrar evento dedicado quando uma rodada de sumarização for executada e persistida.

### Rationale

- Atende requisito de auditoria da feature.
- Facilita depuração de quando houve compactação de contexto.
- Mantém rastreabilidade alinhada ao fluxo já existente de trace.

### Alternatives considered

- Apenas log interno sem trace: rejeitada por baixa visibilidade no contrato do endpoint.
- Evento genérico (`observation`) sem tipo dedicado: rejeitada por dificultar filtro/monitoramento.

## Decision: Cobrir comportamento com teste fake determinístico

Adicionar cenário automatizado com estratégia fake para validar trigger por lote, persistência de resumo e não re-sumarização fora do gatilho.

### Rationale

- Elimina variabilidade de modelo externo nos testes.
- Garante validação da regra principal de negócio (lote de 8).
- Mantém execução rápida e estável em CI/local.

### Alternatives considered

- Testar apenas com LLM real: rejeitada por não determinismo e custo.
- Teste manual somente via curl: rejeitada por baixa confiabilidade regressiva.
