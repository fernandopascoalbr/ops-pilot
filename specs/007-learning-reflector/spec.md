# Feature Specification: Learning Reflection Memory

**Feature Branch**: `[007-learning-reflector]`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "Refletor de aprendizado: após cada resposta, um withStructuredOutput({hasLearning, fact}) lê a ultima mensagem do usuário e destila fatos duráveis (nunca pedido pontual, nunca segredo) -> memories.remember assíncrono; tool forget_preference"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capturar aprendizados duráveis automaticamente (Priority: P1)

Como operador, eu quero que o sistema identifique automaticamente fatos duráveis nas minhas mensagens para reduzir repetição de contexto e melhorar respostas futuras.

**Why this priority**: Este é o núcleo de valor da funcionalidade: sem captura automática, não existe ganho contínuo de contexto.

**Independent Test**: Enviar uma mensagem com preferência estável do usuário, finalizar a resposta do sistema e verificar que um fato durável foi registrado sem bloquear a entrega da resposta.

**Acceptance Scenarios**:

1. **Given** uma conversa em andamento, **When** o usuário fornece uma preferência durável, **Then** o sistema marca que existe aprendizado e registra o fato como memória útil para interações futuras.
2. **Given** uma conversa em andamento, **When** o usuário envia um pedido pontual de tarefa, **Then** o sistema não registra esse conteúdo como aprendizado durável.

---

### User Story 2 - Proteger privacidade e evitar memorizar segredos (Priority: P1)

Como usuário, eu quero que dados sensíveis não sejam guardados automaticamente, para manter segurança e confiança no uso do sistema.

**Why this priority**: Captura automática sem proteção de privacidade cria risco alto de retenção indevida.

**Independent Test**: Enviar uma mensagem contendo dado sensível e verificar que nenhuma memória foi criada e que o fluxo da conversa segue normalmente.

**Acceptance Scenarios**:

1. **Given** uma mensagem com segredo explícito, **When** o refletor analisa o conteúdo, **Then** ele não produz fato memorizável e o sistema não persiste memória.
2. **Given** uma mensagem com mistura de conteúdo útil e conteúdo sensível, **When** o refletor processa a mensagem, **Then** somente o conteúdo durável não sensível pode ser elegível para memória.

---

### User Story 3 - Esquecer preferências quando solicitado (Priority: P2)

Como usuário, eu quero remover preferências aprendidas para manter controle sobre o que o sistema lembra.

**Why this priority**: Controle de exclusão mantém transparência e reduz risco de contexto desatualizado.

**Independent Test**: Registrar uma preferência, acionar a operação de esquecimento e confirmar que a preferência removida não volta a aparecer no contexto.

**Acceptance Scenarios**:

1. **Given** uma preferência previamente aprendida, **When** o usuário aciona a ferramenta de esquecimento, **Then** a preferência correspondente deixa de estar disponível para futuras consultas.
2. **Given** um pedido de esquecimento para preferência inexistente, **When** a ferramenta é acionada, **Then** o sistema responde de forma segura e sem remover dados não relacionados.

---

### Edge Cases

- O que acontece quando a última mensagem do usuário é ambígua e não permite concluir se há aprendizado durável?
- Como o sistema se comporta quando a gravação assíncrona falha após a resposta já ter sido enviada?
- O que acontece quando o mesmo fato durável é identificado repetidamente em mensagens consecutivas?
- Como evitar retenção acidental quando a mensagem contém dado sensível com baixa confiança de detecção?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST analisar a última mensagem do usuário após cada resposta para decidir se há aprendizado durável.
- **FR-002**: O sistema MUST produzir uma decisão explícita de aprendizado com dois resultados: existe aprendizado durável ou não existe aprendizado durável.
- **FR-003**: O sistema MUST extrair um único fato claro quando a decisão indicar que existe aprendizado durável.
- **FR-004**: O sistema MUST ignorar pedidos pontuais e instruções temporárias na etapa de extração de aprendizado.
- **FR-005**: O sistema MUST bloquear memorização de segredos e dados sensíveis identificados na mensagem.
- **FR-006**: O sistema MUST persistir o fato durável de forma assíncrona, sem impedir o envio da resposta principal ao usuário.
- **FR-007**: O sistema MUST registrar somente fatos duráveis associados ao usuário correto, preservando isolamento de contexto.
- **FR-008**: O sistema MUST disponibilizar uma operação de esquecimento de preferência para remover memórias aprendidas sob solicitação explícita do usuário.
- **FR-009**: O sistema MUST responder de forma segura quando a solicitação de esquecimento não encontrar uma preferência correspondente.
- **FR-010**: O sistema MUST manter rastreabilidade da decisão de aprendizado para auditoria operacional sem expor conteúdo sensível.

### Key Entities *(include if feature involves data)*

- **Mensagem do Usuário**: entrada textual mais recente usada para decidir se existe aprendizado durável.
- **Candidato de Aprendizado**: resultado da análise da mensagem, contendo decisão de aprendizado e possível fato extraído.
- **Fato Durável**: preferência ou informação estável, não sensível e útil em interações futuras.
- **Solicitação de Esquecimento de Preferência**: comando explícito do usuário para remover memória previamente aprendida.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Pelo menos 95% dos pedidos pontuais identificados em amostras de validação não são armazenados como aprendizado durável.
- **SC-002**: Pelo menos 99% das mensagens com segredos detectados não resultam em memória persistida.
- **SC-003**: Em cenários de uso contínuo, o registro assíncrono de aprendizado não aumenta o tempo percebido de resposta ao usuário acima de 5%.
- **SC-004**: Pelo menos 90% das solicitações válidas de esquecimento removem corretamente a preferência alvo na primeira tentativa.
- **SC-005**: Em revisão operacional, 100% das decisões de aprendizado podem ser auditadas sem exibir dados sensíveis no registro.

## Assumptions

- O recurso opera sobre fluxos de conversa já existentes e usa a última mensagem do usuário como unidade de análise.
- O usuário possui identificação disponível para associar aprendizado e esquecimento ao contexto correto.
- O processo de análise de aprendizado pode ocorrer após a resposta principal, desde que não comprometa a experiência de interação.
- Conteúdos classificados como segredo ou sensíveis têm prioridade sobre qualquer benefício de memorização.
- A operação de esquecimento atua sobre preferências aprendidas e não altera histórico de incidentes ou outros dados operacionais fora do escopo.
