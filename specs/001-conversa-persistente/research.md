# Research: Conversa Persistente no Chat

## Decision 1: Criar `conversationId` automaticamente quando ausente

- **Decision**: No fluxo de chat, quando `conversationId` não for informado, criar uma nova conversa antes de persistir a mensagem do usuário.
- **Rationale**: Atende FR-001 e reduz atrito para iniciar atendimentos, mantendo contrato simples para clientes.
- **Alternatives considered**:
  - Exigir `conversationId` em toda requisição (rejeitado por piorar UX e contrariar o spec).
  - Criar conversa somente após resposta da estratégia (rejeitado por risco de perder rastreabilidade em falhas intermediárias).

## Decision 2: Persistir mensagens em tabela `messages` seguindo padrão do `SqliteOpsStore`

- **Decision**: Implementar armazenamento SQLite dedicado para conversas, com tabela `messages` e operações `create`, `append`, `lastMessages`.
- **Rationale**: Reutiliza o padrão já adotado no projeto (`DatabaseSync`, schema inicializado no construtor, mapeamento explícito) e mantém estado auditável local.
- **Alternatives considered**:
  - Armazenamento apenas em memória (rejeitado por não garantir continuidade entre requisições).
  - Novo mecanismo externo de banco (rejeitado por conflito com a constituição que padroniza SQLite local).

## Decision 3: Compor prompt com as 12 últimas mensagens, excluindo a mensagem atual

- **Decision**: Buscar histórico antes do `append` da mensagem atual para que `historyMessages` reflita somente contexto prévio.
- **Rationale**: Alinha com a referência fornecida pelo usuário e evita contagem inflada da métrica.
- **Alternatives considered**:
  - Buscar histórico após persistir a nova mensagem do usuário (rejeitado por incluir a própria entrada recém-recebida no histórico).
  - Tornar o limite de histórico configurável agora (adiado; fora de escopo do spec atual).

## Decision 4: Tratar `conversationId` inexistente como erro explícito

- **Decision**: Se `conversationId` informado não existir no armazenamento, retornar erro de domínio traduzido na fronteira HTTP.
- **Rationale**: Segue requisito de edge case do spec e evita fallback silencioso para nova conversa.
- **Alternatives considered**:
  - Criar nova conversa automaticamente quando ID inválido (rejeitado por mascarar erro do cliente).
  - Retornar sucesso parcial sem histórico (rejeitado por ambiguidade operacional).

## Decision 5: Testes determinísticos com `:memory:` + fake strategy

- **Decision**: Cobrir os cenários críticos com testes em banco `:memory:` e estratégia fake determinística, sem rede externa.
- **Rationale**: Garante repetibilidade, velocidade e aderência às diretrizes de qualidade/testabilidade do projeto.
- **Alternatives considered**:
  - Testar com banco em arquivo real (rejeitado por tornar testes menos isolados).
  - Testar com estratégias reais LLM (rejeitado por não determinismo e dependência externa).
