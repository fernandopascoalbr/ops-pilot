# Research: Medição de Contexto e Tokens

## Decision: Estimar tokens com regra determinística chars/4

Implementar estimativa de tokens a partir do tamanho do texto em caracteres dividido por 4, com resultado inteiro não negativo e comportamento estável para entradas vazias.

### Rationale

- É uma heurística simples, barata e reproduzível para breakdown por fonte.
- Permite comparação direta entre fontes de contexto sem depender de tokenizador remoto.
- Atende a necessidade de observabilidade operacional mesmo quando o uso real não estiver disponível.

### Alternatives considered

- Tokenização exata por modelo: rejeitada por custo/complexidade e variação por provedor.
- Estimativa por palavras: rejeitada por maior desvio em textos técnicos e multilíngues.

## Decision: Extrair prompt tokens reais de múltiplos formatos de uso do runtime

Criar uma extração normalizada para ler o uso real de prompt tokens em formatos comuns retornados pelo ecossistema LangChain/OpenRouter (ex.: `usage_metadata.input_tokens`, `response_metadata.tokenUsage.promptTokens`).

### Rationale

- Diferentes integrações retornam nomes/estruturas distintas para os mesmos dados de uso.
- Uma normalização única reduz acoplamento com uma estratégia específica.
- Evita quebra do endpoint quando um formato não está presente.

### Alternatives considered

- Ler apenas um formato único: rejeitada por fragilidade e baixa portabilidade entre modelos/provedores.
- Ignorar uso real e usar só estimativa: rejeitada por não atender ao requisito de métrica real.

## Decision: Expor métricas de contexto no contrato de resposta do `/chat`

Adicionar ao objeto `metrics` do `/chat` os campos de uso real de prompt tokens e o `contextBreakdown` estimado por fonte.

### Rationale

- Preserva compatibilidade com resposta atual baseada em `metrics`.
- Entrega observabilidade acionável por turno sem alterar fluxo principal de resposta (`answer`/`trace`).
- Facilita instrumentação em testes e script de conversa longa.

### Alternatives considered

- Retornar métricas fora de `metrics`: rejeitada por aumentar fragmentação do contrato.
- Expor apenas total agregado: rejeitada por não mostrar custo por fonte.

## Decision: Definir fontes de contexto padronizadas para breakdown

Padronizar no breakdown as fontes `currentMessage`, `conversationHistory` e `memoryRecall`.

### Rationale

- Reflete exatamente a composição atual do input no servidor HTTP.
- Simplifica análise de crescimento de contexto por componente.
- Evita nomenclaturas ad-hoc entre chamadas.

### Alternatives considered

- Fontes dinâmicas livres por implementação: rejeitada por dificultar comparação entre turnos.

## Decision: Script de conversa longa imprime prompt tokens por turno

Criar/ajustar `scripts/conversa-longa.sh` para iterar turnos no `POST /chat`, manter `conversationId` e imprimir `promptTokens` por turno.

### Rationale

- Fornece validação operacional rápida para cenários de crescimento de contexto.
- Reutiliza contrato HTTP real em vez de simulação desconectada.
- Facilita diagnóstico manual sem depender de ferramentas adicionais.

### Alternatives considered

- Apenas teste automatizado sem script: rejeitada por menor utilidade para inspeção operacional ad-hoc.
