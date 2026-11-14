# Data Model: MCP Incident Server

## Entities

### MCPServerIdentity

Representa a identidade pública do servidor MCP.

- `name`: identificador estável do servidor (`opspilot`)
- `transport`: canal de comunicação (`stdio`)

Validation rules:
- O nome deve permanecer estável para compatibilidade com clientes.
- O servidor deve anunciar transporte compatível com stdio.

### MCPToolDefinition

Representa uma tool exposta pelo servidor MCP.

- `name`: nome da tool (`list_alerts`, `open_incident`, `resolve_incident`)
- `description`: descrição operacional para o cliente
- `inputSchema`: contrato de entrada baseado em schema validado

Validation rules:
- A tool deve ter nome único dentro do servidor.
- O `inputSchema` deve ser consistente com a fonte de verdade existente.
- Apenas as três tools definidas nesta feature entram no escopo inicial.

### Alert

Representa evento operacional monitorado, reutilizado do domínio existente.

- `id`
- `title`
- `service`
- `severity`
- `status` (`firing` | `resolved`)
- `createdAt`
- `resolvedAt` (opcional)

Validation rules:
- Campos obrigatórios seguem contrato já estabelecido no domínio/store.
- Filtro de listagem aceita estados válidos da operação de consulta.

### Incident

Representa incidente operacional no ciclo de vida do atendimento.

- `id`
- `title`
- `service`
- `severity`
- `status` (`open` | `resolved`)
- `openedAt`
- `resolvedAt` (opcional)
- `summary` (opcional)

Validation rules:
- Abertura exige título, serviço e severidade válidos.
- Resolução exige identificador de incidente válido.
- Erros de estado inválido (inexistente/já resolvido) devem ser explícitos.

### OpsStoreSharedState

Representa estado operacional compartilhado entre canais (agente atual e MCP).

- `alerts[]`
- `incidents[]`
- regras de transição e persistência existentes

Validation rules:
- Escritas via MCP devem refletir na mesma persistência usada pelas tools atuais.
- Não é permitido criar armazenamento paralelo para as mesmas operações.

## Relationships

- `MCPServerIdentity` contém múltiplas `MCPToolDefinition`.
- `MCPToolDefinition:list_alerts` lê `Alert` de `OpsStoreSharedState`.
- `MCPToolDefinition:open_incident` cria `Incident` em `OpsStoreSharedState`.
- `MCPToolDefinition:resolve_incident` atualiza `Incident` (e possível alerta relacionado) em `OpsStoreSharedState`.

## State Transitions

### Incident lifecycle

- `open_incident`:
  - `non-existent` -> `open`
- `resolve_incident`:
  - `open` -> `resolved`
  - `resolved` -> erro explícito (sem mudança)
  - `non-existent` -> erro explícito

### Alert status coupling

- `list_alerts` não altera estado.
- `resolve_incident` pode promover alerta associado de `firing` para `resolved` conforme regra já existente no store compartilhado.
