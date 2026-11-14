# Feature Specification: Add Chat Endpoint

**Feature Branch**: `[003-add-chat-endpoint]`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "POST /chat em src/http/server.ts (ou padrao do express) : body {message, strategy?, reflect?} validado com zod; default react.

200 {answer, trace, metrics}; 400 body invalido (issues do zod); 422 estratégia desconhecida; timeout 180s -> 504. Registry em src/agents/index.ts (nome -> estratégia; reflect aplica withReflection). 
Teste de integração com estratégia fake determinística, sem rede."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enviar mensagem no chat (Priority: P1)

Como pessoa operadora, quero enviar uma mensagem para o chat e receber uma resposta estruturada para conseguir conduzir triagem e ações operacionais com rastreabilidade.

**Why this priority**: É o fluxo principal de valor da funcionalidade; sem isso, não existe experiência de chat utilizável.

**Independent Test**: Pode ser testado de forma independente enviando uma requisição válida com mensagem e verificando retorno de resposta, trilha e métricas no sucesso.

**Acceptance Scenarios**:

1. **Given** uma requisição com mensagem válida e sem estratégia informada, **When** a solicitação é processada, **Then** o sistema usa a estratégia padrão e retorna sucesso com resposta estruturada.
2. **Given** uma requisição com mensagem válida e estratégia conhecida, **When** a solicitação é processada, **Then** o sistema retorna sucesso com resposta, trilha de execução e métricas.

---

### User Story 2 - Receber feedback claro para erros de entrada (Priority: P2)

Como pessoa operadora, quero receber erros claros quando envio dados inválidos para corrigir rapidamente a requisição sem tentativa e erro.

**Why this priority**: Erros de validação são frequentes em integrações e precisam ser autoexplicativos para reduzir retrabalho.

**Independent Test**: Pode ser testado enviando corpo inválido e estratégia desconhecida, validando que os erros retornam códigos distintos e mensagens acionáveis.

**Acceptance Scenarios**:

1. **Given** uma requisição sem os campos obrigatórios, **When** a validação de entrada falha, **Then** o sistema retorna erro de requisição inválida com lista de problemas de validação.
2. **Given** uma requisição com estratégia não registrada, **When** a solicitação é avaliada, **Then** o sistema retorna erro indicando estratégia desconhecida.

---

### User Story 3 - Evitar espera indefinida no processamento (Priority: P3)

Como pessoa operadora, quero limite de tempo no processamento para não ficar bloqueada em requisições que demoram além do aceitável.

**Why this priority**: Protege a operação contra travamentos e melhora previsibilidade de atendimento durante incidentes.

**Independent Test**: Pode ser testado com estratégia que exceda o tempo máximo e verificando retorno de timeout padronizado.

**Acceptance Scenarios**:

1. **Given** uma requisição válida cujo processamento ultrapassa o limite de tempo definido, **When** o limite é atingido, **Then** o sistema encerra a solicitação com erro de timeout apropriado.

---

### Edge Cases

- O que acontece quando `message` é string vazia ou composta apenas por espaços?
- Como o sistema se comporta quando `reflect` é informado com tipo inválido?
- Como o sistema responde quando a estratégia padrão não estiver disponível no catálogo?
- O que acontece quando há falha inesperada durante construção da trilha ou métricas após processar a resposta?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST aceitar solicitações de chat contendo `message` obrigatório e `strategy` e `reflect` opcionais.
- **FR-002**: O sistema MUST validar a estrutura e os tipos do corpo de entrada antes de processar a solicitação.
- **FR-003**: O sistema MUST usar uma estratégia padrão quando `strategy` não for informada.
- **FR-004**: O sistema MUST rejeitar solicitações com corpo inválido e retornar os detalhes específicos de validação.
- **FR-005**: O sistema MUST rejeitar solicitações com nome de estratégia não reconhecido com retorno explícito de estratégia desconhecida.
- **FR-006**: O sistema MUST aplicar comportamento de reflexão adicional quando `reflect` for verdadeiro.
- **FR-007**: O sistema MUST retornar, em sucesso, os três componentes: resposta final, trilha de execução e métricas.
- **FR-008**: O sistema MUST impor limite máximo de 180 segundos por solicitação de chat e retornar erro de timeout quando esse limite for ultrapassado.
- **FR-009**: O sistema MUST manter um catálogo de estratégias por nome para resolver qual processamento será executado em cada solicitação.
- **FR-010**: O sistema MUST incluir teste de integração determinístico e sem dependência de rede que valide o fluxo de sucesso com estratégia simulada e os fluxos de erro esperados.

### Key Entities *(include if feature involves data)*

- **Chat Request**: Representa a entrada da solicitação, com mensagem obrigatória e parâmetros opcionais de estratégia e reflexão.
- **Strategy Catalog Entry**: Representa uma estratégia identificada por nome e vinculada a uma rotina de processamento de chat.
- **Chat Result**: Representa a saída de sucesso com resposta ao usuário, trilha de execução e métricas.
- **Validation Issue**: Representa cada inconsistência de entrada identificada na validação do corpo da solicitação.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das solicitações válidas retornam resposta estruturada contendo resposta final, trilha e métricas.
- **SC-002**: 100% das solicitações com corpo inválido retornam erro de requisição inválida contendo detalhes de validação utilizáveis para correção.
- **SC-003**: 100% das solicitações com estratégia não cadastrada retornam erro explícito de estratégia desconhecida.
- **SC-004**: 100% das solicitações que excedem 180 segundos retornam timeout, sem permanecerem indefinidamente em processamento.
- **SC-005**: A suíte de integração da funcionalidade executa localmente sem acesso à rede e produz resultado determinístico em execuções repetidas.

## Assumptions

- A funcionalidade será consumida por pessoas operadoras ou integrações internas que já autenticam acesso fora deste escopo.
- O limite de 180 segundos é suficiente para o comportamento esperado das estratégias nesta primeira versão.
- A estratégia padrão esperada para solicitações sem `strategy` é `react`.
- O retorno de validação deve priorizar clareza para correção rápida, incluindo lista de problemas por campo.
- O escopo desta entrega cobre apenas o endpoint de chat, catálogo de estratégias e testes de integração associados, sem incluir mudanças de interface.
