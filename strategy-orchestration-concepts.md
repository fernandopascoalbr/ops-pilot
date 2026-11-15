# Conceitos de Orquestração de Estratégias no OpsPilot

> Documento de estudo para evolução da camada de agentes.  
> Foco: remover `strategy` do body do cliente e tornar a decisão de execução mais autônoma, resiliente e auditável.

---

## Objetivo da evolução

Hoje o cliente ainda escolhe a estratégia (`react`, `plan-and-execute`, `reflect-plan-and-execute`) no request.  
A proposta é mover essa decisão para dentro do sistema, com quatro pilares:

1. **Roteador (nó classificador)** para escolher estratégia automaticamente;
2. **Retry + fallback de modelo** para falhas transitórias e indisponibilidade;
3. **Raio-X do grafo** para auditoria por nó produtor de evento;
4. **Paralelismo em ondas** para executar passos independentes em paralelo.

---

## Bloco de estudos aplicado (Feature 012)

Para transformar os conceitos em prática incremental no projeto, usar a feature **012-model-fallback-resilience** como trilha guiada:

- [spec.md](./specs/012-model-fallback-resilience/spec.md)
- [plan.md](./specs/012-model-fallback-resilience/plan.md)
- [research.md](./specs/012-model-fallback-resilience/research.md)
- [data-model.md](./specs/012-model-fallback-resilience/data-model.md)
- [chat-model-resilience.contract.yaml](./specs/012-model-fallback-resilience/contracts/chat-model-resilience.contract.yaml)
- [tasks.md](./specs/012-model-fallback-resilience/tasks.md)

### Objetivos de estudo deste bloco

1. Configuração operacional de fallback via `OPENROUTER_MODEL_FALLBACK`;
2. Encadeamento `retry -> fallback` na fábrica de modelo;
3. Auditabilidade por trace com evento `fallback`;
4. Exposição de `metrics.modelUsed` como evidência de execução;
5. Tratamento explícito de indisponibilidade com status `503` quando todos os modelos falham.

---

## 1) Roteador: nó classificador de estratégia

## O que é

Um nó inicial do fluxo que recebe o pedido do usuário e decide qual estratégia é mais adequada, sem exigir `strategy` no body.

## Como funciona

Entrada do classificador:

- mensagem do usuário;
- metadados opcionais (criticidade, urgência, tamanho do pedido);
- contexto mínimo da conversa (quando existir).

Saída do classificador:

- estratégia escolhida (`react`, `plan-and-execute`, `reflect-plan-and-execute`);
- justificativa curta (auditável);
- nível de confiança.

## Heurística inicial (simples e previsível)

- **ReAct**: pedidos curtos e operacionais, com baixa ambiguidade.
- **Plan-and-Execute**: tarefas multi-etapa com sequência clara.
- **Reflect Plan-and-Execute**: cenários críticos, conflitantes ou com incerteza alta.

## Benefícios

- UX mais simples para o cliente (não precisa saber estratégia);
- escolha consistente e centralizada;
- base para melhoria contínua (ajuste de regras e métricas de acerto).

---

## 2) Retry + fallback de modelo

## O que é

Camada de resiliência para chamadas de LLM:

- tenta novamente em falhas passageiras (retry);
- troca para modelo reserva quando o principal está indisponível/degradado (fallback).

## Quando aplicar retry

Falhas transitórias típicas:

- timeout;
- erro de rede;
- 429 (rate limit);
- 5xx do provedor.

Evitar retry em erros não recuperáveis (ex.: payload inválido).

## Política sugerida

- retries com **backoff exponencial + jitter**;
- limite pequeno de tentativas (ex.: 2 ou 3);
- timeout por chamada;
- circuit breaker opcional para evitar tempestade de requisições.

## Fluxo esperado

1. chama modelo principal;
2. falha transitória -> retry controlado;
3. esgotou retry -> tenta modelo reserva;
4. se ambos falharem -> erro explícito e auditável.

## Benefícios

- maior disponibilidade percebida;
- menor taxa de erro em picos/intermitências;
- comportamento previsível sob degradação.

---

## 3) Raio-X do grafo (tracing assinado por nó)

## O que é

Evolução do trace para que cada evento carregue a identidade do nó que o produziu.  
Isso permite perícia técnica posterior (U7) com trilha causal clara.

## Estrutura conceitual de evento

- `eventId`
- `timestamp`
- `nodeId` / `nodeType` (quem gerou)
- `eventType` (`thought`, `action`, `observation`, `plan`, `critique`, `answer`, etc.)
- `payload` (dados do evento)
- `correlationId` (liga eventos da mesma execução)
- `parentEventId` (opcional, para encadeamento causal)

## Assinatura do nó (conceito)

"Assinado pelo nó" pode começar como assinatura lógica (metadados imutáveis de autoria do evento).  
Se necessário no futuro, evolui para assinatura criptográfica/hmac para integridade.

## Benefícios

- auditoria e debug muito mais rápidos;
- rastreabilidade ponta-a-ponta;
- base sólida para observabilidade e compliance.

---

## 4) Paralelismo em ondas

## O que é

Execução paralela de passos do plano que não possuem dependência entre si, agrupados por "ondas".

## Intuição

Se o plano tem tarefas independentes, não faz sentido executar tudo em série.

Exemplo:

- Passo B depende de A
- Passo C depende de A
- Passo D depende de B e C

Ondas:

- **Onda 1**: A
- **Onda 2**: B e C (paralelo)
- **Onda 3**: D

## Regras principais

- montar grafo de dependências (DAG);
- em cada onda, executar somente nós com pré-requisitos concluídos;
- aguardar conclusão da onda antes da próxima;
- controlar concorrência máxima por onda;
- tratar falha parcial (fail-fast ou coleta de erros, conforme política).

## Benefícios

- menor latência total em planos longos;
- melhor uso de recursos;
- escalabilidade com previsibilidade.

---

## Como os quatro conceitos se conectam

1. **Roteador** escolhe a estratégia;
2. estratégia executa com **retry/fallback** nas chamadas de modelo;
3. execução gera **raio-x de grafo** completo, com autoria por nó;
4. quando a estratégia for de plano, usa **ondas paralelas** para reduzir tempo total.

Resultado: sistema mais autônomo, robusto, auditável e performático.

---

## Sequência recomendada de implementação (alto nível)

1. Implementar **roteador** e tornar `strategy` opcional/depreciado na fronteira HTTP;
2. Adicionar **retry + fallback** no cliente de modelo (camada única reutilizável);
3. Evoluir trace para **eventos com nodeId/correlationId**;
4. Introduzir **executor em ondas** no plan-and-execute;
5. Medir impacto: latência, taxa de fallback, taxa de sucesso e qualidade de resposta.

---

## Critérios de pronto (referência para evolução)

- Cliente não precisa enviar `strategy`;
- falhas transitórias não derrubam execução no primeiro erro;
- todos os eventos do trace indicam nó produtor;
- passos independentes executam em paralelo quando possível;
- comportamento permanece determinístico sob limites e políticas definidas.
