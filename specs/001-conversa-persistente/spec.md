# Feature Specification: Conversa Persistente no Chat

**Feature Branch**: `[001-conversa-persistente]`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "Conversa persistente: ConversationStore (append/lastMessages/create) + tabela messages como no sqliteOpsStore; /chat: conversationId optional, devolvido na resposta; 12 últimas mensagens no prompt via composição; métrica historyMessages; testes ':memory:' + fake"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Retomar conversa existente (Priority: P1)

Como operador, quero continuar uma conversa anterior de chat para manter o contexto de incidentes sem repetir informações já fornecidas.

**Why this priority**: Continuidade de contexto é o principal valor da funcionalidade e reduz perda de tempo durante operações críticas.

**Independent Test**: Pode ser testado enviando uma mensagem com identificador de conversa existente e verificando que a resposta mantém o contexto anterior e retorna o mesmo identificador.

**Acceptance Scenarios**:

1. **Given** uma conversa já existente com histórico salvo, **When** o operador envia nova mensagem informando o identificador da conversa, **Then** o sistema usa o histórico recente dessa conversa no processamento e retorna o mesmo identificador na resposta.
2. **Given** uma conversa existente, **When** o operador envia múltiplas mensagens sequenciais, **Then** cada interação é anexada à mesma conversa e permanece disponível para próximas interações.

---

### User Story 2 - Iniciar conversa sem identificador (Priority: P2)

Como operador, quero iniciar uma conversa sem precisar fornecer identificador para começar rapidamente o atendimento.

**Why this priority**: Facilita adoção e reduz atrito de entrada para novos atendimentos.

**Independent Test**: Pode ser testado enviando uma mensagem sem identificador e validando que o sistema cria uma nova conversa e devolve um identificador válido na resposta.

**Acceptance Scenarios**:

1. **Given** que o operador não informa identificador de conversa, **When** envia uma mensagem de chat, **Then** o sistema cria uma nova conversa e devolve seu identificador na resposta.
2. **Given** que uma nova conversa foi criada automaticamente, **When** o operador reutiliza o identificador retornado na próxima mensagem, **Then** a conversa segue de forma contínua no mesmo contexto.

---

### User Story 3 - Limitar histórico enviado ao processamento (Priority: P3)

Como operador, quero que apenas as mensagens mais recentes sejam reutilizadas no contexto para manter respostas rápidas e relevantes.

**Why this priority**: Controla volume de contexto e melhora previsibilidade operacional sem perder o conteúdo mais importante.

**Independent Test**: Pode ser testado com conversa longa, verificando que apenas as 12 mensagens mais recentes são consideradas no contexto e que a métrica de uso de histórico é registrada.

**Acceptance Scenarios**:

1. **Given** uma conversa com mais de 12 mensagens, **When** uma nova interação é processada, **Then** somente as 12 mensagens mais recentes são consideradas como histórico para composição de contexto.
2. **Given** qualquer interação processada com histórico, **When** o processamento termina, **Then** o sistema registra a quantidade de mensagens históricas usadas na métrica `historyMessages`.

---

### Edge Cases

- O que acontece quando um identificador de conversa inexistente é informado? O sistema deve retornar erro claro de conversa não encontrada, sem criar conversa silenciosamente.
- Como o sistema lida com conversa com menos de 12 mensagens? Deve usar todo o histórico disponível sem falhar.
- Como o sistema lida com conteúdo vazio ou inválido na mensagem? Deve rejeitar a solicitação com feedback explícito de entrada inválida.
- O que acontece quando há falha na persistência ao anexar uma nova mensagem? A interação deve falhar de forma explícita, sem reportar sucesso parcial.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir criar uma nova conversa quando uma interação de chat chega sem identificador de conversa.
- **FR-002**: O sistema MUST permitir anexar novas mensagens a uma conversa existente quando um identificador válido for informado.
- **FR-003**: O sistema MUST retornar o identificador da conversa em toda resposta de chat, tanto para conversas novas quanto existentes.
- **FR-004**: O sistema MUST recuperar e usar as 12 mensagens mais recentes da conversa como histórico de contexto antes de gerar a resposta.
- **FR-005**: O sistema MUST registrar a métrica `historyMessages` com a quantidade de mensagens históricas efetivamente usadas na composição de contexto.
- **FR-006**: O sistema MUST persistir as mensagens trocadas em armazenamento durável para permitir continuidade entre requisições.
- **FR-007**: O sistema MUST retornar erro explícito quando receber identificador de conversa inexistente.
- **FR-008**: O sistema MUST validar entradas externas de chat e rejeitar entradas inválidas com mensagem de erro clara.
- **FR-009**: O sistema MUST ter cobertura de testes automatizados para criação, anexação e recuperação de histórico de conversa usando isolamento de estado e dependências simuladas.

### Key Entities *(include if feature involves data)*

- **Conversa**: Representa uma sessão contínua de chat, com identificador único, estado de criação e sequência de mensagens associadas.
- **Mensagem**: Representa uma interação individual de usuário ou assistente dentro de uma conversa, incluindo autoria, conteúdo, ordem temporal e vínculo com a conversa.
- **Resumo de Interação de Chat**: Representa o resultado da interação, contendo resposta do assistente, identificador da conversa e informação de uso de histórico para telemetria.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das interações de chat sem identificador informado retornam um identificador de conversa válido na primeira resposta.
- **SC-002**: 100% das interações com identificador válido retornam o mesmo identificador na resposta.
- **SC-003**: Em conversas com 13 mensagens ou mais, 100% das interações usam no máximo 12 mensagens históricas na composição de contexto.
- **SC-004**: Em pelo menos 95% dos casos de erro por identificador inexistente ou entrada inválida, o usuário recebe mensagem de erro clara e acionável.
- **SC-005**: A taxa de cenários críticos automatizados (criar conversa, continuar conversa, limite de histórico e métrica de histórico) permanece em 100% de sucesso na suíte de validação.

## Assumptions

- O fluxo de chat já existente continuará como ponto único de interação para usuários operacionais.
- A continuidade de conversa é necessária apenas dentro do mesmo ambiente operacional (sem requisitos de sincronização entre múltiplos ambientes nesta entrega).
- O limite de 12 mensagens históricas é fixo para esta versão e não será configurável por usuário.
- A métrica `historyMessages` será consumida pelas rotinas de observabilidade já existentes do produto.
- Testes automatizados desta funcionalidade devem ser executáveis de forma isolada, sem dependência de infraestrutura externa persistente.
