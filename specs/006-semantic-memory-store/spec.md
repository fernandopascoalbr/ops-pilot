# Feature Specification: Semantic Memory Store

**Feature Branch**: `[006-semantic-memory-store]`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "Memória semântica: MemoryStore por userId - remember (dedup > 0.92), recall top-3 por produto escalar (min 0.3), forget; tabela memories, embeddings all-minilm-l6-v2 local em BLOB; /chat ganha userId e injeta o recall no prompt; teste: recall acha fato sem palavra em comum.

user: @huggingface/transformers com pooling: mean + normalize: true e lazy singleton
src/memory/embeddings.ts e src/memory/memory-store.ts

As colunas de memories (id, user_id, fact, embedding, created_at)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Salvar fatos relevantes por usuário (Priority: P1)

Quando um usuário conversa com o sistema e registra fatos importantes sobre o contexto de trabalho, o sistema deve armazenar essas informações de forma isolada por usuário e reutilizá-las em futuras interações.

**Why this priority**: A memória persistente é a base para respostas contextualizadas e consistentes; sem esse mecanismo, o agente repete informações ou ignora detalhes importantes do histórico do usuário.

**Independent Test**: Pode ser testado ao registrar um fato novo para um usuário e confirmar que ele é mantido para uso em interações futuras, sem misturar dados de outros usuários.

**Acceptance Scenarios**:

1. **Given** um usuário com histórico vazio, **When** o sistema salva o fato "O cliente prefere atendimento em português", **Then** esse fato fica associado ao usuário e pode ser recuperado em uma conversa posterior.
2. **Given** um usuário com um fato já registrado, **When** a mesma informação é enviada novamente com pequenas variações de redação, **Then** o sistema reconhece a duplicação e evita armazenar uma cópia redundante.

---

### User Story 2 - Recuperar contexto relevante sem depender de palavras iguais (Priority: P1)

Quando um usuário faz uma pergunta que não usa as mesmas palavras do fato anteriormente registrado, o sistema deve ainda encontrar os detalhes mais pertinentes por similaridade semântica.

**Why this priority**: O principal valor da memória semântica é recuperar contexto útil mesmo quando a linguagem muda, o que melhora a qualidade das respostas e reduz erros de compreensão.

**Independent Test**: Pode ser testado ao consultar memórias com uma pergunta semelhante em sentido, porém escrita com palavras diferentes, e confirmar que o fato correto é retornado entre os três primeiros resultados.

**Acceptance Scenarios**:

1. **Given** um usuário com o fato "A conta está em atraso e precisa de revisão manual", **When** a nova mensagem pergunta "Qual é o estado da cobrança do cliente?", **Then** o sistema retorna esse fato como contexto relevante.
2. **Given** múltiplas memórias para o mesmo usuário, **When** a busca por similaridade é executada, **Then** o sistema retorna no máximo os 3 resultados mais relevantes acima do limiar mínimo.

---

### User Story 3 - Remover memórias específicas e manter a conversa limpa (Priority: P2)

Quando uma memória deixa de ser útil ou um usuário solicita exclusão, o sistema deve remover a entrada sem afetar o restante do histórico do usuário.

**Why this priority**: O controle de memória é importante para manter a relevância do contexto e respeitar a intenção do usuário sobre o que deve ser lembrado ou descartado.

**Independent Test**: Pode ser testado ao remover uma memória específica e confirmar que o restante das memórias permanece disponível e sem vazamentos de contexto.

**Acceptance Scenarios**:

1. **Given** um usuário com várias memórias armazenadas, **When** uma memória específica é removida, **Then** somente essa entrada deixa de ser usada como contexto.
2. **Given** um usuário tenta buscar contexto após a exclusão, **When** não há memória relevante restante, **Then** o sistema responde sem incluir histórico semântico.

---

### Edge Cases

- O que acontece quando o mesmo fato é enviado de forma quase idêntica por um usuário em um curto intervalo de tempo?
- Como o sistema lida com um usuário que não possui memórias relevantes para a consulta atual?
- O que acontece quando o valor de similaridade cai abaixo do limiar mínimo de relevância?
- Como o sistema trata memórias corrompidas, nulas ou sem usuário associado?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST associar cada memória a um identificador de usuário e registrar a data de criação da entrada.
- **FR-002**: O sistema MUST persistir memórias por usuário em uma tabela com as colunas `id`, `user_id`, `fact`, `embedding` e `created_at`.
- **FR-003**: O sistema MUST gerar um embedding para cada fato e armazená-lo como valor binário local, mantendo a memória semântica por usuário.
- **FR-004**: O sistema MUST aplicar deduplicação semântica ao salvar novas memórias, rejeitando entradas com similaridade acima de 0,92 em relação a fatos já existentes do mesmo usuário.
- **FR-005**: O sistema MUST permitir a recuperação das 3 memórias mais relevantes por produto escalar, considerando apenas resultados com similaridade mínima de 0,3.
- **FR-006**: O sistema MUST devolver memórias relevantes mesmo quando não há palavras em comum entre a consulta e o fato armazenado, desde que a relação semântica seja suficientemente forte.
- **FR-007**: O sistema MUST remover memórias individuais quando solicitado, sem afetar o restante do histórico do usuário.
- **FR-008**: O sistema MUST incluir o histórico relevante do usuário no prompt de conversa quando o endpoint `/chat` recebe um `userId`.
- **FR-009**: O sistema MUST garantir que cada busca de memória seja isolada por usuário, evitando cruzamento de contexto entre contas diferentes.
- **FR-010**: O sistema MUST manter o comportamento consistente quando não há memória relevante para uma consulta, devolvendo resposta vazia ou sem contexto adicional.

### Key Entities *(include if feature involves data)*

- **Memória do Usuário**: representação do fato que o usuário deseja que o sistema relembre, incluindo o texto do fato, a associação ao usuário e a data de criação.
- **Embedding Semântico**: representação vetorial do fato usada para comparar significado mesmo quando as palavras mudam.
- **Contexto de Conversa**: conjunto de memórias relevantes selecionadas para um usuário em uma interação específica, montado antes da geração da resposta.
- **Usuário**: pessoa ou sessão que possui um conjunto isolado de fatos e histórico de memória.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em testes de recuperação semântica, pelo menos 95% dos fatos relevantes para o usuário são encontrados mesmo quando não compartilham palavras com a consulta.
- **SC-002**: A deduplicação semântica evita pelo menos 90% das inserções redundantes para um mesmo usuário quando a similaridade entre fatos excede o limiar de 0,92.
- **SC-003**: Em interações típicas, o sistema apresenta até 3 memórias relevantes por consulta, sem misturar contexto de outros usuários.
- **SC-004**: Usuários conseguem manter contexto útil em conversas sequenciais, com redução perceptível de respostas repetidas ou fora de contexto.
- **SC-005**: O fluxo de exclusão e recuperação de memória preserva a integridade do histórico e evita que fatos não solicitados sejam removidos.

## Assumptions

- O sistema atende a usuários autenticados ou identificados por `userId` em um fluxo de conversa com isolamento por conta.
- A memória semântica é um recurso de suporte para contexto e não substitui a validação de resposta do agente em casos sensíveis.
- O critério de similaridade e a seleção do top-3 são suficientes para o alcance do MVP do sistema.
- O armazenamento local de embeddings é aceitável para a operação de primeira versão, desde que mantenha integridade e isolamento por usuário.
- As memórias relevantes são usadas como contexto adicional e não como fonte definitiva de verdade para decisões de negócio sem validação complementar.
