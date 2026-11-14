# Conceitos de Memória em Agentes de IA

> Complemento ao [review.md](./review.md) com foco em **memória de agentes**.  
> O projeto atual não implementa nenhuma dessas camadas; este documento serve de guia para adicioná-las.

---

## Por que memória importa?

Hoje o `POST /chat` recebe `message` + `strategy` e devolve uma resposta — sem nenhum estado entre requisições. Cada chamada começa do zero. Isso tem duas consequências práticas:

- O modelo não sabe que o mesmo usuário já perguntou sobre o incidente `INC-42` há cinco minutos.
- Se o usuário preferir ver incidentes ordenados por severidade, o agente nunca aprende isso: vai continuar listando na ordem padrão do `store`.

As seções abaixo descrevem as camadas de memória que resolvem esse problema.

---

## 1. Memória episódica — o fio da conversa

**O que é:** sequência cronológica de mensagens trocadas (humano + assistente), armazenada e reenviada ao modelo em cada nova chamada.

**Como funciona:**

```
Requisição 1 → mensagens: [ { role: "user", content: "Liste os alertas." } ]
Requisição 2 → mensagens: [ { role: "user", content: "Liste os alertas." },
                             { role: "assistant", content: "Há 3 alertas críticos…" },
                             { role: "user", content: "Abra um incidente para o primeiro." } ]
```

O modelo "lembra" porque as mensagens anteriores estão literalmente no prompt. Sem isso, a segunda pergunta não tem contexto.

**No OpsPilot:** o `POST /chat` receberia também um `sessionId`; um `SessionStore` guardaria o histórico por sessão e o injetaria na chamada ao LLM.

**Limitação:** o contexto cresce sem parar. Para conversas longas, é necessário comprimir ou truncar (ver seção 5).

---

## 2. Memória episódica — fatos duráveis (semântica de episódios)

**O que é:** extração de fatos específicos da conversa e armazenamento como entidades, não como texto bruto. Diferente do histórico completo, aqui guardamos *o que vale lembrar*, não *tudo que foi dito*.

**Exemplos de fatos no OpsPilot:**

| Fato | Fonte |
|------|-------|
| `usuário prefere incidentes ordenados por severidade DESC` | o usuário pediu isso explicitamente |
| `serviço "payments" é crítico para o usuário` | mencionado em várias perguntas |
| `usuário não quer notificações de alertas de baixa prioridade` | pediu para ignorar `severity=low` |

**Como funciona:** após cada resposta, uma chamada extra (ver seção 4) analisa a troca e extrai fatos no formato `{ subject, predicate, value }`. Esses fatos são consultados no início da próxima requisição e inseridos no prompt como contexto.

**Por que episódico e não semântico puro:** o fato veio de uma interação específica com esse usuário; é pessoal e contextual, não conhecimento geral do domínio.

---

## 3. Memória semântica — embeddings do usuário

**O que é:** representação vetorial de preferências e fatos do usuário, permitindo busca por similaridade em vez de busca exata.

**Quando é necessário:** quando o volume de fatos cresce e uma busca `SELECT * FROM facts WHERE user_id = X` retornaria centenas de linhas — mais do que cabe no contexto.

**Fluxo:**

```
1. fato novo chega → gera embedding (ex: OpenAI text-embedding-3-small)
2. armazena no banco vetorial (ex: pgvector, ChromaDB) com metadados: userId, timestamp, tipo
3. na próxima requisição: a mensagem do usuário também é convertida em embedding
4. busca os K fatos mais próximos semanticamente
5. injeta apenas esses K fatos no prompt
```

**No OpsPilot:** se o usuário escrever "liste os incidentes", o sistema recupera automaticamente o fato "prefere ordenado por severidade DESC" porque os embeddings são próximos — sem precisar que o usuário repita a preferência.

**Custo:** requer infraestrutura extra (banco vetorial + modelo de embedding). Para poucos usuários, um simples array em SQLite com busca por palavras-chave pode ser suficiente.

---

## 4. Refletor de aprendizado

**O que é:** uma chamada extra ao LLM após cada resposta, cujo único objetivo é extrair frases duráveis sobre o que vale guardar.

**Fluxo:**

```
1. usuário envia mensagem → agente responde normalmente
2. dispara chamada assíncrona: "dado esse trecho de conversa, existe algum fato sobre
   preferências do usuário ou o estado operacional que vale registrar para sempre?
   Responda em JSON: [{ fact, confidence }] ou []."
3. fatos com confidence > 0.7 são salvos no store de fatos
```

**Características importantes:**

- **Assíncrona:** não bloqueia a resposta ao usuário.
- **Frase durável:** o refletor deve gerar fatos que façam sentido fora de contexto. `"usuário prefere severidade DESC"` é durável; `"o usuário perguntou isso agora"` não é.
- **Idempotente:** re-executar o refletor sobre a mesma conversa não deve duplicar fatos.

**No OpsPilot:** o `withReflection` atual já é uma estrutura análoga — executa algo extra ao final de cada passo. O refletor de aprendizado seria uma segunda dimensão: enquanto o `reflect-plan-and-execute` reflete *sobre a qualidade do raciocínio*, o refletor de aprendizado reflete *sobre o que saber do usuário*.

---

## 5. Working memory (memória de curto prazo)

**O que é:** o que está no contexto ativo do modelo naquele momento — a janela de tokens da conversa corrente.

**Não é persistida:** quando a sessão termina, a working memory some. É análoga à RAM de um processo.

**Desafio — conversa longa:** quando o histórico cresce além do limite de tokens do modelo, a estratégia usual é:

| Técnica | O que faz |
|---------|-----------|
| **Truncagem** | descarta as mensagens mais antigas |
| **Sumarização deslizante** | comprime N mensagens antigas em um único resumo e mantém as N recentes inteiras |
| **Retrieval seletivo** | em vez de enviar todas as mensagens, usa embedding para recuperar apenas as relevantes para a pergunta atual |

**No OpsPilot:** a sumarização deslizante seria o caminho mais simples. Um middleware no servidor verificaria o tamanho do histórico e, se ultrapassar `MAX_TOKENS`, chamaria o LLM uma vez só para gerar um resumo das mensagens antigas antes de prosseguir.

---

## 6. Esquecimento

**O que é:** mecanismo explícito para apagar memórias a pedido do usuário ou por expiração.

**Por que importa:** LGPD/GDPR exigem o "direito ao esquecimento". Além disso, fatos desatualizados podem prejudicar o agente (ex: usuário mudou de preferência).

**Tipos:**

- **Esquecimento explícito:** `"Esqueça que disse que prefiro ordenação por severidade."` → o agente identifica o fato e o deleta.
- **Expiração automática:** fatos com `TTL` (ex: 30 dias sem confirmação são descartados).
- **Invalidação por contradição:** o refletor detecta que um novo fato contradiz um antigo e apaga o antigo.

**Implementação mínima no OpsPilot:**

```typescript
interface Fact {
  id: string;
  userId: string;
  content: string;
  createdAt: Date;
  expiresAt?: Date;   // null = nunca expira automaticamente
  deletedAt?: Date;   // soft delete para auditoria
}
```

A query de fatos sempre filtra `deletedAt IS NULL AND (expiresAt IS NULL OR expiresAt > NOW())`.

---

## 7. Mapa de camadas — o que guardar onde

```
┌─────────────────────────────────────────────────────┐
│  Working Memory (RAM do modelo)                     │
│  • histórico da sessão atual                        │
│  • contexto do alerta/incidente em análise          │
│  • K fatos semânticos recuperados agora             │
│  → some quando a sessão encerra                     │
├─────────────────────────────────────────────────────┤
│  Memória Episódica (histórico persistido)           │
│  • todas as mensagens da conversa, por sessão       │
│  → banco relacional (SQLite/Postgres), por userId   │
├─────────────────────────────────────────────────────┤
│  Fatos Duráveis (semântica de episódios)            │
│  • preferências explícitas do usuário               │
│  • padrões operacionais observados                  │
│  → tabela de fatos com soft delete + TTL            │
├─────────────────────────────────────────────────────┤
│  Memória Semântica (embeddings)                     │
│  • fatos indexados por vetor para busca aproximada  │
│  → banco vetorial (pgvector, Chroma)                │
│  → útil quando fatos > 100 por usuário              │
└─────────────────────────────────────────────────────┘
```

---

## 8. Exemplo concreto no OpsPilot: ordem de incidentes

**Problema:** `list_alerts` retorna na ordem do store (criação). O usuário prefere ver por severidade.

**Sem memória:** o usuário pede a ordenação toda vez.

**Com memória em 3 etapas:**

1. **Episódica:** o refletor detecta na conversa: *"o usuário pediu para ordenar por severidade"* → salva fato `{ userId, content: "prefere listagem de alertas ordenada por severity DESC", confidence: 0.9 }`.

2. **Injeção no contexto:** na próxima requisição, o `SessionStore` carrega os fatos do usuário e injeta no system prompt: `"Preferência do usuário: alertas ordenados por severity DESC."`.

3. **Comportamento:** o agente chama `list_alerts` e, ao formatar a resposta, respeita a preferência sem que o usuário precise repetir.

**Esquecimento:** se o usuário disser *"pode mostrar na ordem normal agora"*, o refletor invalida o fato anterior.

---

## 9. Perguntas para autoavaliação

1. Qual a diferença entre memória episódica e working memory? Quando uma vira a outra?
2. Por que o refletor de aprendizado deve ser assíncrono? O que acontece se for síncrono?
3. Em que cenário vale o custo de um banco vetorial versus uma simples tabela de fatos com `LIKE`?
4. Como garantir que o esquecimento seja auditável (LGPD) sem apagar os dados permanentemente?
5. Se dois usuários diferentes usam o mesmo `sessionId` por acidente, qual fato seria corrompido?
6. Como o refletor de aprendizado se relaciona com o `withReflection` já implementado no projeto?
7. Qual camada de memória resolveria o problema da ordem de listagem de incidentes com o menor custo de implementação?

---

## 10. Próximos passos para implementar memória no OpsPilot

Ordem sugerida de complexidade crescente:

1. **Histórico de sessão** (episódica básica): adicionar `sessionId` ao `POST /chat` e um `SessionStore` em SQLite.
2. **Injeção no prompt**: enviar as últimas N mensagens da sessão junto com a nova mensagem do usuário.
3. **Refletor de aprendizado**: chamada assíncrona pós-resposta que extrai fatos e os salva.
4. **Esquecimento**: endpoint `DELETE /sessions/:id/facts/:factId` + expiração automática.
5. **Sumarização deslizante**: middleware que comprime histórico antigo antes de enviar ao LLM.
6. **Busca semântica**: só quando o volume de fatos por usuário tornar a injeção direta inviável.
