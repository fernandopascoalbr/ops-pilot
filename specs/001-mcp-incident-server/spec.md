# Feature Specification: MCP Incident Server

**Feature Branch**: `[001-mcp-incident-server]`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "MCP server do incidentArena: src/mcp/server.ts com @modelcontextprotocol/sdk, transport stdio, expondo list_alerts, open_incident e resolve_incident - reutilizando o mesmo OpsStore e os mesmos schemas zod das tools existentes (uma unica fonte de verdade). Nome do server: incidentarena. script npm: mcp = "tsx src/mcp/server.ts" (se precisar de env, alterar o script e carregar elas antes). REGRA CRITICA: nenhum console.log no server - no stdio o stdout e o canal do protocolo; diagnóstico vai para o stderr. Test: sobe o server e valida o list de tools."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Operar incidentes via MCP (Priority: P1)

Como operador que integra o IncidentArena em clientes MCP, quero listar alertas e abrir/encerrar incidentes pelo servidor MCP para executar o fluxo operacional sem depender de outros canais.

**Why this priority**: Este é o fluxo principal de valor: sem essas operações expostas, o servidor MCP não cumpre o objetivo funcional.

**Independent Test**: Iniciar o servidor MCP e validar que as operações de listar alertas, abrir incidente e resolver incidente estão disponíveis para chamada e retornam resultados válidos.

**Acceptance Scenarios**:

1. **Given** o servidor MCP em execução, **When** o cliente consulta as ferramentas disponíveis, **Then** as operações de listar alertas, abrir incidente e resolver incidente aparecem no catálogo.
2. **Given** um alerta elegível para tratamento, **When** o operador solicita abertura de incidente via MCP, **Then** o incidente é registrado e retorna confirmação com os dados esperados.
3. **Given** um incidente aberto, **When** o operador solicita resolução via MCP, **Then** o status é atualizado para resolvido e retorna confirmação consistente.

---

### User Story 2 - Garantir consistência de validação (Priority: P2)

Como mantenedor da plataforma, quero que o servidor MCP reutilize a mesma regra de validação e o mesmo armazenamento operacional já adotados nas ferramentas atuais para evitar divergência de comportamento.

**Why this priority**: Consistência reduz risco operacional e evita resultados conflitantes entre canais de automação.

**Independent Test**: Comparar entradas aceitas/rejeitadas e efeitos operacionais entre o canal MCP e as ferramentas existentes para as mesmas operações.

**Acceptance Scenarios**:

1. **Given** uma requisição inválida de abertura de incidente, **When** ela é enviada ao servidor MCP, **Then** ela é rejeitada com erro explícito equivalente ao comportamento já praticado nas ferramentas atuais.
2. **Given** uma requisição válida de resolução de incidente, **When** ela é enviada ao servidor MCP, **Then** o resultado persiste no mesmo estado operacional compartilhado pelas ferramentas existentes.

---

### User Story 3 - Preservar canal de protocolo sem ruído (Priority: P3)

Como integrador MCP, quero que o canal de saída do protocolo permaneça limpo para que o cliente não quebre por mensagens de diagnóstico misturadas ao tráfego de protocolo.

**Why this priority**: A confiabilidade de integração depende de não poluir o canal de comunicação do protocolo.

**Independent Test**: Executar o servidor, acionar operações e verificar que não há logs de diagnóstico no canal de saída do protocolo durante o uso normal.

**Acceptance Scenarios**:

1. **Given** o servidor MCP processando chamadas, **When** diagnósticos são emitidos, **Then** eles são enviados apenas para canal de erro e não para o canal de protocolo.

---

### Edge Cases

- O que acontece quando não há alertas disponíveis no momento da listagem?
- Como o sistema responde quando uma tentativa de abrir incidente referencia um alerta inexistente ou já associado a incidente ativo?
- Como o sistema responde quando há tentativa de resolver um incidente inexistente ou já resolvido?
- Como o sistema responde quando o cliente envia parâmetros malformados ou incompletos?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST disponibilizar um servidor MCP identificado como `incidentarena`.
- **FR-002**: O sistema MUST expor operações para listar alertas, abrir incidente e resolver incidente por meio do servidor MCP.
- **FR-003**: O sistema MUST validar as entradas dessas operações com a mesma fonte de verdade de validação já usada nas ferramentas operacionais existentes.
- **FR-004**: O sistema MUST aplicar as mudanças de estado operacional das operações MCP no mesmo repositório operacional compartilhado com as ferramentas existentes.
- **FR-005**: O sistema MUST oferecer um comando de execução dedicado para iniciar o servidor MCP no ambiente local do projeto.
- **FR-006**: O sistema MUST manter o canal de saída do protocolo livre de mensagens de diagnóstico.
- **FR-007**: O sistema MUST enviar diagnósticos e mensagens operacionais de suporte apenas para o canal de erro.
- **FR-008**: O sistema MUST permitir validar, em teste operacional, que o servidor inicia corretamente e lista as ferramentas esperadas.
- **FR-009**: O sistema MUST retornar erros explícitos quando entradas inválidas ou estados incompatíveis forem recebidos nas operações expostas.

### Key Entities *(include if feature involves data)*

- **Alerta**: Evento operacional que pode ser listado e usado como gatilho para abertura de incidente.
- **Incidente**: Registro de resposta operacional com ciclo de vida (aberto/resolvido) e vínculo com alerta.
- **Ferramenta MCP**: Capacidade exposta ao cliente MCP para executar ações operacionais no IncidentArena.
- **Estado Operacional Compartilhado**: Fonte de dados persistida e reutilizada por múltiplos canais de automação para manter consistência de comportamento.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das execuções de validação do servidor MCP exibem as três operações obrigatórias no catálogo de ferramentas disponíveis.
- **SC-002**: Em testes funcionais, 100% das chamadas válidas para listar alertas, abrir incidente e resolver incidente completam com resultado consistente com as ferramentas já existentes.
- **SC-003**: Em testes de execução do servidor, 0 ocorrências de mensagens de diagnóstico aparecem no canal de protocolo.
- **SC-004**: Pelo menos 95% das falhas por entrada inválida retornam mensagens explícitas e acionáveis para o operador.

## Assumptions

- O fluxo inicial cobre apenas as três operações solicitadas (listar alertas, abrir incidente e resolver incidente), sem incluir outras ações operacionais nesta entrega.
- O armazenamento operacional compartilhado e as regras de validação existentes já estão disponíveis e aptos a reutilização no novo canal.
- O comando local para iniciar o servidor MCP será usado por mantenedores e automações internas para validação do comportamento esperado.
- A verificação da listagem de ferramentas do servidor MCP é suficiente como evidência mínima de prontidão para avançar para implementação detalhada.
