# OpsPilot

Núcleo de raciocínio para **triagem operacional de alertas e incidentes**, com múltiplas estratégias de agente autônomo que podem ser comparadas entre si (ReAct, Plan-and-Execute e Plan-and-Execute com reflexão). Os agentes operam sobre um store local de serviços, alertas e incidentes e podem ser usados por **CLI (arena)** ou por **API HTTP (`POST /chat`)**.

> Projeto da disciplina de **Agentes Autônomos** da pós-graduação em **IA Aplicada** (UniPDS). O desenvolvimento foi conduzido com agentes de IA seguindo o fluxo de **Spec-Driven Development** do [GitHub Spec Kit](https://github.com/github/spec-kit) (as specs ficam em [specs/](specs/)).

## Sumário

- [Visão geral](#visão-geral)
- [Stack](#stack)
- [Começando](#começando)
- [Configuração](#configuração)
- [Scripts](#scripts)
- [Estratégias de raciocínio](#estratégias-de-raciocínio)
- [Ferramentas dos agentes](#ferramentas-dos-agentes)
- [Dados e store](#dados-e-store)
- [Arena (CLI)](#arena-cli)
- [API HTTP](#api-http)
- [Trace e métricas](#trace-e-métricas)
- [Testes](#testes)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Specs (Spec Kit)](#specs-spec-kit)
- [Limitações conhecidas](#limitações-conhecidas)

## Visão geral

O que a aplicação faz:

1. Lista alertas de monitoramento (`firing` / `resolved`).
2. Abre e resolve incidentes operacionais.
3. Executa diferentes **estratégias de decisão** sobre o mesmo pedido, todas com a mesma interface (`ReasoningStrategy`).
4. Devolve sempre `answer` + `trace` (trilha tipada e auditável) + `metrics` (chamadas de LLM, latência, passos).
5. Mantém **limite de iterações** e **fallbacks determinísticos**: sem chave de API ou em caso de falha do modelo, as estratégias continuam funcionando com heurísticas locais.

```
            ┌──────────── CLI: src/arena.ts ───────────┐
Usuário ───▶│                                          │
            └─ HTTP: POST /chat (src/http/server.ts) ──┤
                                                       ▼
                                   resolveStrategy(name, { reflect })
                                                       │
                ┌──────────────────┬───────────────────┴───────────┐
                ▼                  ▼                               ▼
              react        plan-and-execute        reflect-plan-and-execute
                └──────────────────┴───────────────┬───────────────┘
                                                   ▼
                          tools / ops-store ──▶ data/seed.json
```

## Stack

- **Node.js** + **TypeScript** (ESM), executado com [`tsx`](https://github.com/privatenumber/tsx)
- [**LangGraph**](https://langchain-ai.github.io/langgraphjs/) (`@langchain/langgraph`) — agente ReAct pré-construído
- **LangChain** (`@langchain/core`, `@langchain/openai`) — tools e saída estruturada
- [**OpenRouter**](https://openrouter.ai/) como gateway de modelos (API compatível com OpenAI)
- [**Zod**](https://zod.dev/) — schemas de domínio, das tools e do payload HTTP
- `node:http` (servidor) e `node:test` (testes), sem frameworks adicionais

## Começando

Pré-requisitos: Node.js 20+ (recomendado 22) e, opcionalmente, uma chave do OpenRouter.

```bash
npm install
cp .env.example .env     # preencha OPENROUTER_API_KEY (opcional, ver abaixo)
npm run seed             # (re)popula data/seed.json
npm run arena -- --input "Analise os alertas ativos"
```

## Configuração

Variáveis lidas de `.env` (carregado via `--env-file` nos scripts; ver [src/config/env.ts](src/config/env.ts)):

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `OPENROUTER_API_KEY` | Não* | — | Chave do OpenRouter |
| `OPENROUTER_MODEL` | Não | `openai/gpt-4o-mini` | Modelo usado pelas estratégias |
| `PORT` | Não | `3000` | Porta do servidor HTTP |

Fixos: `baseURL = https://openrouter.ai/api/v1` e `temperature = 0`.

\* **Sem chave, o modelo não é criado** ([src/agents/model.ts](src/agents/model.ts) lança erro) e as estratégias caem nos fallbacks locais, o que permite rodar o projeto e os testes totalmente offline.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o servidor HTTP (`src/index.ts`) |
| `npm run arena -- [flags]` | Executa a arena de estratégias |
| `npm run reflect:plan-and-execute -- [flags]` | Atalho da arena só com `reflect-plan-and-execute` |
| `npm run seed` | Restaura o seed (5 serviços, 6 alertas, 0 incidentes) |
| `npm run mcp` | Sobe o servidor MCP `opspilot` via stdio |
| `npm test` | Roda a suíte de testes (`node:test`) |

## Estratégias de raciocínio

Todas implementam `ReasoningStrategy` ([src/domain/strategy.ts](src/domain/strategy.ts)): `name` + `run(input, maxIterations) → { answer, trace, metrics }`.

### `react` — [src/agents/react.ts](src/agents/react.ts)

Usa `createReactAgent` do LangGraph com as três tools operacionais. O modelo decide a cada passo entre raciocinar e chamar uma ferramenta (ciclo *Reason + Act*). `maxIterations` vira o `recursionLimit` do grafo (padrão 12). As mensagens são convertidas em `trace`. Em falha, responde com análise local dos alertas `firing`.

### `plan-and-execute` — [src/agents/plan-and-execute.ts](src/agents/plan-and-execute.ts)

1. **Planner**: gera uma lista de passos (saída estruturada Zod, máx. 8).
2. **Executor**: executa um passo por vez (listar alertas, abrir/resolver incidente).
3. **Replanner**: após cada passo decide `continue | adjust | end` e pode reescrever os passos restantes.

Contabiliza chamadas de LLM de planner e replanner separadamente. Sem modelo, usa plano e replanejamento heurísticos.

### `reflect-plan-and-execute` — [src/agents/reflect-plan-and-execute.ts](src/agents/reflect-plan-and-execute.ts)

Variante "governada" do plan-and-execute, com **reflexão explícita após cada passo**:

- Reflexão estruturada: `decision` (`continue | adjust | end`), `reasoning`, `confidence` (`low|medium|high`), `risk` (`low|medium|high|critical`) e `updatedSteps` opcional.
- **Política de parada** (`StoppingPolicy`, [src/agents/types.ts](src/agents/types.ts)): limite de iterações, parada em risco crítico, parada ao resolver e `fallbackMode: 'safe-close'`.
- `end` com baixa confiança ou risco não-baixo gera **fallback seguro** e a resposta informa o motivo.
- Limite de iterações travado em 1..8 (`clampIterationLimit`).
- Heurística local de reflexão quando não há modelo (ex.: entradas com "incerteza"/"conflito" encerram com fallback; "ajuste"/"contradit" forçam `adjust`).

### Registry e wrapper de reflexão — [src/agents/index.ts](src/agents/index.ts)

- `defaultStrategyRegistry` mapeia os três nomes acima.
- `resolveStrategy(name?, { reflect, registry })` resolve a estratégia (padrão `react`) e lança `UnknownStrategyError` se não existir.
- `withReflection(strategy)` decora qualquer estratégia acrescentando um evento `critique` ao trace (usado por `reflect: true` na API).

## Ferramentas dos agentes

Definidas em [src/agents/tools.ts](src/agents/tools.ts) com `tool()` do LangChain e schemas Zod:

| Tool | Entrada | Efeito |
|---|---|---|
| `list_alerts` | `status`: `firing` \| `resolved` \| `all` (padrão `firing`) | Lista alertas |
| `open_incident` | `title`, `service`, `severity` (`low`/`medium`/`high`/`critical`) | Cria incidente `open` |
| `resolve_incident` | `id` | Resolve o incidente e o alerta `firing` do mesmo serviço |

## Dados e store

[src/infra/store.ts](src/infra/store.ts) mantém um store em memória **persistido em [data/seed.json](data/seed.json)** a cada mutação.

- **Seed**: 5 serviços (`auth-api`, `payments-api`, `search-index`, `billing-worker`, `notification-gateway`) e 6 alertas (3 `firing`, 3 `resolved`).
- Operações: `seedStore()`, `listAlerts(status)`, `openIncident(input)`, `resolveIncident(id)`, `persistStore()`.
- Schemas de domínio (severidade, status de alerta/incidente) em [src/domain/alerts.ts](src/domain/alerts.ts).

## Arena (CLI)

Executa uma ou mais estratégias sobre o **mesmo input** e imprime resposta, trace e métricas de cada uma.

```bash
npm run arena -- --strategies react,plan-and-execute,reflect-plan-and-execute \
  --max-iterations 8 \
  --input "Analise os alertas ativos e proponha a próxima ação de resposta."
```

| Flag | Padrão | Descrição |
|---|---|---|
| `--strategies` | `react,plan-and-execute` | Lista separada por vírgula |
| `--max-iterations` | `8` | Limite de interações por estratégia |
| `--input` | "Analise os alertas ativos e proponha a próxima ação de resposta." | Prompt |

Estratégia desconhecida imprime erro e define `exitCode = 1`, sem interromper as demais.

## API HTTP

Servidor em `node:http` ([src/http/server.ts](src/http/server.ts)); contrato em [specs/003-add-chat-endpoint/contracts/chat-endpoint.contract.yaml](specs/003-add-chat-endpoint/contracts/chat-endpoint.contract.yaml).

```bash
npm run dev
curl -X POST http://localhost:3000/chat \
  -H 'content-type: application/json' \
  -d '{"message":"Como está o plantão?","strategy":"plan-and-execute","reflect":false}'
```

**Request** (validado com Zod, [src/http/chat-schema.ts](src/http/chat-schema.ts)):

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `message` | string (não vazia) | Sim | Pedido do usuário |
| `strategy` | string | Não | Padrão `react` |
| `reflect` | boolean | Não | Padrão `false`; adiciona evento `critique` |

**Respostas**:

| Status | Quando | Corpo |
|---|---|---|
| `200` | Sucesso | `{ answer, trace, metrics }` |
| `400` | JSON inválido ou payload inválido | `{ issues: [...] }` |
| `422` | Estratégia desconhecida | `{ error }` |
| `504` | Timeout (180 s) | `{ error }` |
| `404` | Qualquer rota diferente de `POST /chat` | `{ error: "Not Found" }` |

Limites: corpo máximo de 1 MB e `maxIterations` padrão 8 por requisição.

## Servidor MCP

O projeto expõe um servidor MCP em [src/mcp/server.ts](src/mcp/server.ts):

```bash
npm run mcp
```

Características:

- Nome do servidor: `opspilot`
- Transporte: `stdio`
- Tools expostas: `list_alerts`, `open_incident`, `resolve_incident`
- Reuso da mesma fonte de verdade de validação (`zod`) e operações de store já usadas nas tools dos agentes
- Diagnóstico em `stderr` (sem `console.log`, para não poluir o canal de protocolo em `stdout`)

## Trace e métricas

Cada execução devolve uma trilha auditável de eventos tipados:

```ts
type TraceEvent = {
  type: 'thought' | 'action' | 'observation' | 'plan' | 'critique' | 'answer';
  message: string;
  tool?: string;                  // em eventos 'action'
  args?: Record<string, unknown>;
  timestamp?: string;
};

type StrategyMetrics = {
  llmCalls: number;
  latencyMs: number;
  interactionLimit?: number;
  stepsUsed?: number;
};
```

`formatTrace` ([src/agents/trace.ts](src/agents/trace.ts)) gera a saída textual determinística `[tipo] mensagem :: tool :: args`.

## Testes

```bash
npm test
```

15 testes, **sem dependência de rede** (sem chave, as estratégias usam fallback; o HTTP usa estratégias falsas):

- [tests/arena.test.ts](tests/arena.test.ts) — estratégias, ordem plano→ação, caminhos `continue`/`adjust`, limite de iterações e fallback seguro
- [tests/store.test.ts](tests/store.test.ts) — seed e abertura/resolução de incidentes
- [tests/trace-format.test.ts](tests/trace-format.test.ts) — formatação determinística do trace
- [tests/integration/](tests/integration/) — `POST /chat`: sucesso (`200`), validação (`400`), estratégia inválida (`422`) e timeout (`504`)
- [tests/fixtures/](tests/fixtures/) — estratégias falsas e cliente HTTP de teste

## Estrutura do projeto

```
├── data/seed.json              # store persistido (serviços, alertas, incidentes)
├── scripts/seed-alerts.ts      # reset do seed
├── specs/                      # artefatos do GitHub Spec Kit
├── src/
│   ├── index.ts                # bootstrap do servidor HTTP
│   ├── arena.ts                # CLI de comparação de estratégias
│   ├── cli.ts                  # banner/ajuda do CLI
│   ├── config/env.ts           # leitura de variáveis do OpenRouter
│   ├── domain/                 # schemas Zod e tipos (alertas, strategy, trace)
│   ├── agents/                 # estratégias, tools, modelo, trace, registry
│   ├── http/                   # servidor e schema do /chat
│   └── infra/store.ts          # store com persistência em JSON
└── tests/                      # unitários, integração e fixtures
```

## Specs (Spec Kit)

| Spec | Tema | Estado |
|---|---|---|
| [001-opspilot-reasoning-engine](specs/001-opspilot-reasoning-engine/) | Núcleo: interface `ReasoningStrategy`, tools, ReAct, Plan-and-Execute, arena | Implementada (com desvios, ver abaixo) |
| [001-reflect-plan-and-execute](specs/001-reflect-plan-and-execute/) | Estratégia com reflexão por passo e políticas de parada | Implementada |
| [002-reflection-critique](specs/002-reflection-critique/) | Camada de crítica sobre qualquer estratégia | Apenas spec (rascunho) |
| [003-add-chat-endpoint](specs/003-add-chat-endpoint/) | `POST /chat` | Implementada |

## Limitações conhecidas

- A spec 001 pedia **MySQL + Sequelize**; a implementação usa **arquivo JSON** como persistência.
- A spec 001 descreve o plan-and-execute como **grafo**; a implementação é um laço sequencial planner → executor → replanner. O executor interpreta os passos por palavras-chave em vez de chamar as tools via LLM.
- `withReflection` é um wrapper simples que só **adiciona um evento `critique`**; o crítico com saída `{approved, feedback}` e regeneração da spec 002 ainda não existe.
- O store é global e de processo único (sem concorrência, ids de incidente baseados em `Date.now()`).
- O servidor HTTP não tem autenticação nem rate limit; é voltado a uso didático/local.
