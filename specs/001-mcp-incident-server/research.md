# Research: MCP Incident Server

## Decision 1: Expor servidor MCP dedicado com transporte stdio

### Decision
Implementar um entrypoint dedicado para MCP com nome de servidor `opspilot`, usando transporte stdio e ciclo de vida próprio.

### Rationale
- Atende o requisito explícito de integração com clientes MCP.
- Mantém separação clara entre borda MCP e outras superfícies (API/CLI).
- Facilita validação objetiva do catálogo de tools no startup.

### Alternatives considered
1. Reutilizar processo HTTP existente com adaptação para MCP.
   - Rejeitado: aumenta acoplamento entre fronteiras distintas e dificulta isolamento operacional.
2. Expor MCP sem entrypoint dedicado.
   - Rejeitado: reduz clareza de execução e observabilidade do fluxo específico.

## Decision 2: Reutilizar a mesma fonte de verdade de schemas e operações

### Decision
As tools MCP `list_alerts`, `open_incident` e `resolve_incident` devem usar os mesmos schemas Zod e as mesmas operações de store já existentes nas tools operacionais atuais.

### Rationale
- Evita divergência de validação entre canais.
- Preserva comportamento funcional já testado em produção/local.
- Reduz risco de inconsistência de estado entre agente atual e servidor MCP.

### Alternatives considered
1. Duplicar schemas e regras no módulo MCP.
   - Rejeitado: cria dívida técnica e risco de drift semântico.
2. Criar contratos paralelos com mapeamento manual.
   - Rejeitado: adiciona complexidade sem ganho funcional imediato.

## Decision 3: Disciplina rígida de saída (stdout vs stderr)

### Decision
Proibir `console.log` no servidor MCP; qualquer diagnóstico deve ir para stderr, preservando stdout exclusivamente para tráfego de protocolo.

### Rationale
- Evita corrupção do canal stdio do protocolo MCP.
- Mantém integração robusta com clientes que tratam stdout como stream estruturada.
- Facilita troubleshooting sem comprometer o handshake/protocolo.

### Alternatives considered
1. Usar `console.log` em ambiente de desenvolvimento.
   - Rejeitado: comportamento inconsistente entre ambientes e risco de falha intermitente.
2. Silenciar completamente diagnósticos.
   - Rejeitado: reduz capacidade operacional de suporte e depuração.

## Decision 4: Validar readiness com teste de listagem de tools

### Decision
Incluir validação que inicia o servidor MCP e confirma que o catálogo contém `list_alerts`, `open_incident` e `resolve_incident`.

### Rationale
- Confirma o objetivo principal da feature de forma mensurável.
- Captura regressões de registro de tools e de inicialização do servidor.
- Mantém verificação ponta a ponta sem depender de detalhes internos.

### Alternatives considered
1. Testar apenas funções internas sem subir o servidor.
   - Rejeitado: não valida integração real do protocolo.
2. Teste manual não automatizado.
   - Rejeitado: baixa reprodutibilidade em CI.
