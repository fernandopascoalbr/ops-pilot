# Revisão técnica do projeto Ops Pilot

Este arquivo consolida **o que já foi desenvolvido** no projeto, com foco em:

- estado atual do repositório
- funcionalidades implementadas
- funcionamento das estratégias de agente
- endpoint HTTP de chat
- testes e cobertura de comportamento

> Contexto: projeto TypeScript/Node para simular triagem operacional de alertas e incidentes com estratégias de raciocínio comparáveis.

---

## Atualização rápida (2026-11-15)

Desde a versão revisada em 2026-11-14, o projeto evoluiu com a feature **008-context-usage-metrics**:

- Instrumentação de contexto em `src/context/token.ts` com `estimateTokens` (chars/4).
- Extração de `promptTokens` real (quando disponível) no fluxo das estratégias.
- Resposta de `POST /chat` com:
  - `metrics.promptTokens`
  - `metrics.contextBreakdown` por fontes (`currentMessage`, `conversationHistory`, `memoryRecall`).
- Script operacional `scripts/conversa-longa.sh` com impressão de `promptTokens` por turno.
- Contrato de chat atualizado em `specs/003-add-chat-endpoint/contracts/chat-endpoint.contract.yaml`.
- Suite de testes ampliada, incluindo testes unitários de token/contexto e integração de conversa longa.

Validação executada nesta atualização:

- `npm test` ✅ (55 testes passando)
- `npm run typecheck` ✅

Nova evolução (2026-11-15): feature **009-conversation-pruning-summary**:

- janela de histórico recente reduzida para 8 mensagens no contexto ativo do chat;
- criação da tabela `conversation_summaries` para persistência de resumo consolidado por conversa;
- summarizing incremental em lotes: apenas quando 8 novas mensagens saem da janela;
- resumo limitado a 150 tokens, mesclado ao resumo anterior e reinjetado no contexto;
- evento de trace `summarize` emitido quando há compactação efetiva;
- testes unitários e de integração cobrindo trigger por lote, não re-sumarização entre lotes incompletos e merge de resumo.

---

## 1) Leitura do estado atual (`git status`)

Atualizado em 2026-11-14:

- branch `main`, único commit: `e78f2a5` (arquivos iniciais do Speckit)
- **todo o código ainda não está commitado**: `src/`, `tests/`, `scripts/`, `specs/`, `data/`, `tsconfig.json`, `.gitignore`, `.npmignore`, `.env.example` e `package-lock.json` são untracked; `README.md` e `package.json` estão modificados
- `npm test` → **15 testes, 15 passando** (sem rede)
- as tasks das features `001-reflect-plan-and-execute` e `003-add-chat-endpoint` estão marcadas como concluídas (`[X]`); a `002-reflection-critique` tem só a spec (rascunho)

Resumo prático: o projeto está funcional, com execução de estratégias, API HTTP e testes de integração. Falta commitar o trabalho.

> `data/seed.json` é reescrito a cada mutação do store (inclusive por testes), então aparece como alterado com frequência. Se for versionar, vale decidir se ele entra no `.gitignore`.

---

## 2) O que a aplicação faz hoje

### Objetivo

A aplicação implementa um motor de raciocínio para operações (Ops), permitindo:

1. analisar alertas ativos
2. abrir/encerrar incidentes
3. executar diferentes estratégias de decisão
4. comparar comportamento das estratégias via arena
5. expor tudo também por endpoint HTTP (`POST /chat`)

### Componentes principais

- Estratégias de raciocínio em [src/agents/](./src/agents/)
- Domínio (schemas Zod de alertas/incidentes em `alerts.ts`; tipos `TraceEvent`, `StrategyMetrics`, `ReasoningStrategy` em `strategy.ts`) em [src/domain/](./src/domain/)
- Config do modelo (OpenRouter) em [src/config/env.ts](./src/config/env.ts) e [src/agents/model.ts](./src/agents/model.ts)
- Store em memória com persistência em arquivo JSON em [src/infra/store.ts](./src/infra/store.ts)
- Interface CLI/arena em [src/cli.ts](./src/cli.ts) e [src/arena.ts](./src/arena.ts)
- Endpoint HTTP em [src/http/server.ts](./src/http/server.ts)

---

## 3) Estratégias implementadas e como funcionam

## 3.1 `react`

Arquivo: [src/agents/react.ts](./src/agents/react.ts)

Fluxo:

1. cria agente ReAct via LangGraph (`createReactAgent`)
2. injeta ferramentas operacionais (`list_alerts`, `open_incident`, `resolve_incident`)
3. executa com limite de recursão (`maxIterations`)
4. converte mensagens para `trace` e retorna `answer + metrics`

Fallback:

- se modelo/execução falhar, gera resposta local determinística com leitura de alertas ativos (sem quebrar o fluxo)

---

## 3.2 `plan-and-execute`

Arquivo: [src/agents/plan-and-execute.ts](./src/agents/plan-and-execute.ts)

Fluxo:

1. **planner** gera uma lista de passos (máx. 8)
2. **executor** executa cada passo sequencialmente (listar alertas, abrir incidente, resolver incidente, etc.)
3. **replanner** decide `continue | adjust | end`
4. termina com evidência consolidada na resposta final

Comportamentos importantes:

- possui fallback de planejamento/reflexão quando o modelo não está disponível
- mantém execução limitada por iterações para evitar loop (`Math.min(Math.max(1, maxIterations), 8)`)
- conta separadamente chamadas do planner e do replanner e soma em `metrics.llmCalls`
- **não é um `StateGraph`**: é um laço `while` sequencial; o executor interpreta o texto do passo (palavras-chave) e chama as funções do store direto, sem passar pelo LLM com tools

---

## 3.3 `reflect-plan-and-execute`

Arquivo: [src/agents/reflect-plan-and-execute.ts](./src/agents/reflect-plan-and-execute.ts)

Essa é a estratégia mais “governada”, com reflexão explícita por etapa:

1. planejamento inicial
2. execução do passo
3. reflexão estruturada (`decision`, `reasoning`, `confidence`, `risk`)
4. decisão:
   - `continue`: segue
   - `adjust`: replaneja apenas passos restantes
   - `end`: encerra
5. políticas de parada (limite de iteração, risco crítico, resolução)
6. fallback seguro quando confiança/risco não permitem continuar

A estratégia usa helpers de [src/agents/trace.ts](./src/agents/trace.ts), como:

- `clampIterationLimit` (limites 1..8)
- `shouldStopByPolicy` (parada por política)

---

## 3.4 Registry e wrapper de reflexão

Arquivo: [src/agents/index.ts](./src/agents/index.ts)

O registry mantém o mapeamento:

- `react`
- `plan-and-execute`
- `reflect-plan-and-execute`

Funções relevantes:

- `resolveStrategy(...)`: resolve estratégia por nome (default: `react`)
- `withReflection(...)`: aplica um wrapper que acrescenta evento de `critique` quando `reflect=true`
  - hoje é só um **evento fixo no trace**, não há crítico LLM nem regeneração (isso é o que a spec 002 descreve e ainda não foi implementado)
- `UnknownStrategyError`: lançado por `resolveStrategy` e convertido em `422` pela API

---

## 4) Ferramentas operacionais e store

### Ferramentas (tools)

Arquivo: [src/agents/tools.ts](./src/agents/tools.ts)

- `list_alerts(status)`
- `open_incident({ title, service, severity })`
- `resolve_incident({ id })`

### Store

Arquivo: [src/infra/store.ts](./src/infra/store.ts)

- dados seedados em [data/seed.json](./data/seed.json)
- 5 serviços e 6 alertas iniciais
- incidentes abertos/resolvidos persistidos no mesmo JSON

Operações principais:

- `seedStore()`
- `listAlerts(...)`
- `openIncident(...)`
- `resolveIncident(...)`

---

## 5) API HTTP implementada (`POST /chat`)

Arquivos:

- [src/http/server.ts](./src/http/server.ts)
- [src/http/chat-schema.ts](./src/http/chat-schema.ts)
- contrato em [specs/003-add-chat-endpoint/contracts/chat-endpoint.contract.yaml](./specs/003-add-chat-endpoint/contracts/chat-endpoint.contract.yaml)

### Entrada

Body JSON:

- `message` (obrigatório)
- `strategy` (opcional)
- `reflect` (opcional, default `false`)

Validação com Zod:

- erro `400` para body inválido (com `issues`)

### Saída de sucesso

`200` com:

- `answer`
- `trace`
- `metrics`

### Summarizing de histórico no fluxo HTTP

O `POST /chat` agora inclui compactação incremental de histórico para evitar crescimento indefinido de contexto:

- mantém a janela ativa de 8 mensagens recentes;
- processa mensagens deslocadas em lotes completos de 8;
- gera resumo telegráfico até 150 tokens (com foco em decisões/fatos/incidentes/pendências);
- mescla com resumo anterior da conversa e persiste em `conversation_summaries`;
- injeta o resumo consolidado no contexto antes da execução da estratégia;
- adiciona evento `summarize` ao `trace` quando houve atualização de resumo.

### Erros de domínio/execução

- `422`: estratégia desconhecida
- `504`: timeout de processamento (padrão 180s)

---

## 6) Arena, CLI e execução local

### Arena

Arquivo: [src/arena.ts](./src/arena.ts)

Permite rodar e comparar estratégias por linha de comando:

- parse de argumentos `--strategies`, `--max-iterations`, `--input`
- imprime resposta, trace formatado e métricas por estratégia

### Bootstrap da aplicação

Arquivo: [src/index.ts](./src/index.ts)

- faz `seedStore()`
- sobe servidor HTTP na porta `3000` (ou `PORT`)

### Scripts úteis

Arquivo: [package.json](./package.json)

- `npm run dev` (servidor HTTP)
- `npm run arena` (comparação de estratégias)
- `npm run reflect:plan-and-execute` (foco na estratégia reflect)
- `npm run seed` (reset da base de dados seed)
- `npm test`

---

## 7) Testes implementados

Pasta: [tests/](./tests/)

### Estratégias e trace

- [tests/arena.test.ts](./tests/arena.test.ts)
- [tests/trace-format.test.ts](./tests/trace-format.test.ts)
- [tests/store.test.ts](./tests/store.test.ts)

Cobrem:

- execução básica das estratégias
- ordem de eventos de plano/ação
- caminhos `continue` e `adjust` da reflexão
- limite de iteração e fallback seguro
- formato determinístico de trace
- seed e manipulação do store

### Integração HTTP

- [tests/integration/chat-success.test.ts](./tests/integration/chat-success.test.ts)
- [tests/integration/chat-validation-errors.test.ts](./tests/integration/chat-validation-errors.test.ts)
- [tests/integration/chat-strategy-errors.test.ts](./tests/integration/chat-strategy-errors.test.ts)
- [tests/integration/chat-timeout.test.ts](./tests/integration/chat-timeout.test.ts)

Cobrem:

- sucesso com estratégia default e explícita
- validação de payload inválido (`400`)
- estratégia desconhecida (`422`)
- timeout (`504`)

As fixtures determinísticas estão em [tests/fixtures/](./tests/fixtures/), evitando dependência de rede externa nos testes do endpoint.

---

## 8) Evolução por Speckit (o que já foi concluído)

Features e artefatos relevantes:

1. **Reflect Plan-and-Execute**
   - spec: [specs/001-reflect-plan-and-execute/spec.md](./specs/001-reflect-plan-and-execute/spec.md)
   - plan: [specs/001-reflect-plan-and-execute/plan.md](./specs/001-reflect-plan-and-execute/plan.md)
   - tasks: [specs/001-reflect-plan-and-execute/tasks.md](./specs/001-reflect-plan-and-execute/tasks.md)
2. **Add Chat Endpoint**
   - spec: [specs/003-add-chat-endpoint/spec.md](./specs/003-add-chat-endpoint/spec.md)
   - plan: [specs/003-add-chat-endpoint/plan.md](./specs/003-add-chat-endpoint/plan.md)
   - tasks: [specs/003-add-chat-endpoint/tasks.md](./specs/003-add-chat-endpoint/tasks.md)

3. **OpsPilot Reasoning Engine** (base): [spec](./specs/001-opspilot-reasoning-engine/spec.md), [contrato da arena](./specs/001-opspilot-reasoning-engine/contracts/arena-cli.md)
4. **Reflection Critique** (002): só [spec](./specs/002-reflection-critique/spec.md), em rascunho. Descreve `withReflection(strategy)` com crítico `{approved, feedback}`, regeneração e `maxReflections` (padrão 2)

As trilhas mostram uma evolução concreta: de estratégia e arena (núcleo de raciocínio) para interface HTTP consumível por cliente externo.

### Fluxo do Spec Kit (para lembrar)

`constitution` → `specify` (spec.md) → `clarify` → `plan` (plan.md, research.md, data-model.md, contracts/) → `tasks` (tasks.md) → `implement`. Cada pasta em `specs/NNN-feature/` guarda esses artefatos.

Observação: existem **duas pastas com prefixo `001`** (`001-opspilot-reasoning-engine` e `001-reflect-plan-and-execute`), efeito da numeração do Spec Kit por branch.

---

## 9) Conclusão (estado do projeto até aqui)

O projeto já está em uma fase funcional, com:

- múltiplas estratégias operacionais implementadas
- trilha auditável (`trace`) e métricas
- fallback seguro em cenários de baixa confiança/limite
- endpoint `POST /chat` com contrato claro e tratamento de erro robusto
- testes de unidade/integração cobrindo os fluxos principais

Em resumo: não está apenas “planejado”; está **implementado, executável e testável**.

---

## 10) Desvios entre spec e implementação (bom ponto de estudo)

| Spec dizia | Implementação atual |
|---|---|
| Banco MySQL com Sequelize | Store em memória persistido em `data/seed.json` |
| Plan-and-Execute como grafo (LangGraph) | Laço sequencial planner → executor → replanner |
| Executor usa as tools com o LLM | Executor escolhe a ação por palavras-chave do passo |
| `withReflection` com crítico LLM e regeneração (spec 002) | Wrapper que só acrescenta um evento `critique` |
| Arquivo `src/arean.ts` (typo na spec) | `src/arena.ts` |

Vale registrar isso como "decisão consciente de simplificação" ou como backlog, dependendo do que a disciplina cobrar.

---

## 11) Conceitos para estudo

- **ReAct** (*Reason + Act*): o modelo alterna pensamento e chamada de ferramenta no mesmo laço. Simples e flexível, mas o caminho é imprevisível e o custo em chamadas de LLM é difícil de limitar.
- **Plan-and-Execute**: separa planejar de executar. Dá mais previsibilidade e permite limitar passos, mas um plano ruim contamina a execução, por isso existe o **replanner**.
- **Reflection / Critique**: etapa que avalia o resultado (ou o passo) antes de seguir. Aqui aparece como `decision` + `confidence` + `risk` e como política de parada.
- **Saída estruturada**: `withStructuredOutput(zodSchema)` força o LLM a devolver JSON validado (plano e reflexão).
- **Guardrails**: limite de iterações (`clampIterationLimit`, máx. 8), `recursionLimit` no ReAct, timeout de 180 s na API, parada por risco crítico.
- **Fallback determinístico**: sem `OPENROUTER_API_KEY` ou com erro do modelo, cada estratégia responde por heurística. Isso torna os testes reproduzíveis e offline.
- **Observabilidade**: `trace` tipado (`thought | action | observation | plan | critique | answer`) + `metrics` (`llmCalls`, `latencyMs`, `stepsUsed`) permitem comparar estratégias na arena.
- **Spec-Driven Development**: a spec é a fonte de verdade e o código é derivado dela. Quando o código diverge, a divergência deve ser registrada (seção 10).

---

## 12) Perguntas para autoavaliação

1. Quando preferir ReAct a Plan-and-Execute, e vice-versa?
2. Qual a diferença entre o `replanner` do plan-and-execute e a reflexão do `reflect-plan-and-execute`?
3. Por que `shouldStopByPolicy` checa o limite de iterações antes de resolução e risco?
4. Que riscos existem em deixar o LLM chamar `open_incident` e `resolve_incident` diretamente? Como o projeto mitiga?
5. Por que os testes passam sem chave de API? O que isso deixa de validar?
6. Como seria implementar o crítico da spec 002 (`{approved, feedback}`) sobre o `withReflection` atual?
7. O que muda ao trocar o store em JSON por MySQL/Sequelize (concorrência, ids, transações)?

---

## 13) Comandos úteis

```bash
npm install
npm run seed
npm run arena -- --strategies react,plan-and-execute,reflect-plan-and-execute --max-iterations 6 --input "Analise os alertas ativos"
npm run dev
curl -X POST localhost:3000/chat -H 'content-type: application/json' -d '{"message":"Como está o plantão?","strategy":"reflect-plan-and-execute"}'
npm test
```

## 14) Próximos passos possíveis

> Para conceitos de **memória de agentes** (histórico de sessão, fatos duráveis, refletor de aprendizado, esquecimento, working memory), veja o documento complementar: [memory-concepts.md](./memory-concepts.md).



- commitar o código (ainda untracked)
- implementar a spec 002 (crítico real com `maxReflections`)
- fazer o executor do plan-and-execute usar as tools via LLM
- decidir entre manter JSON ou migrar para MySQL/Sequelize, conforme a spec 001

---

## 15) Guardrails de IA já presentes (resumo para reaproveitar em projetos futuros)

Checklist objetivo do que **já existe** e pode servir de baseline:

1. **Timeout de requisição no endpoint de chat**
   - proteção por `Promise.race` com erro dedicado e retorno HTTP `504`
2. **Validação de entrada na fronteira HTTP (Zod)**
   - payload inválido retorna `400` com `issues` detalhadas
3. **Limite de tamanho do body**
   - proteção contra payload excessivo (`MAX_BODY_BYTES`)
4. **Limite de iteração/recursão do agente**
   - `recursionLimit` no ReAct e clamp de iterações (1..8) nas estratégias planejadas
5. **Política explícita de parada**
   - interrupção por limite de passos, resolução ou risco crítico
6. **Fallback seguro quando o modelo falha/não está configurado**
   - execução heurística determinística para não quebrar o fluxo principal
7. **Mapeamento explícito de erros de domínio e execução**
   - `422` para estratégia desconhecida e `504` para timeout
8. **Rastro auditável e métricas**
   - `trace` tipado + métricas (`llmCalls`, `latencyMs`, `stepsUsed/interactionLimit`)
9. **Testes de integração cobrindo falhas de operação**
   - timeout, validação de payload e estratégia inválida

### Observação importante

Apesar da ideia geral estar correta, **retry automático com backoff não aparece como mecanismo transversal implementado** no código atual de chamada ao LLM/HTTP. Hoje a robustez está mais forte em timeout, validação, limites, políticas de parada e fallback.

Se for usar este review como checklist de arquitetura para próximos projetos de IA, vale adicionar explicitamente:

- retries com backoff exponencial + jitter
- idempotência para operações com efeito colateral
- circuit breaker/rate limiting
- budget de custo/tokens por request
