# Feature Specification: Verificação de status de provedores externos

**Feature Branch**: `[005-provider-status-check]`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "Tool de status de provedores externos:
- Tool check_provider_statusem src/agents/tools.ts: consulta a statuspage pública do provedor via API statuspage.io (sem chage):
github -> https://www.githubstatus.com/api/v2/status.json
cloudflare -> https://www.cloudflarestatus.com/api/v2/status.json
Parametro provider (enum: github | cloudflare, default "github", .describe explicando).
Descrição orientada a quando usar: suspeita de problema externo, "é o nosso ou do provedor?", dependencia fora do ar.
- Resiliência: timeout de 5s via AbortSignal.timeout; falha de rede ou 5xx, UMA nova tentativa; resposta valida com zod
({status: {indicador, descriotion}}); qualquer falha final retorna de erro legível como resultado da tool (eror é observação - nunca lançar exceção para fora da tool).
- Retorno compacto (indicador + descrição, uma linha), para não inflar o contexto.
- Teste: a função de fetch é injetável; testes cobrem sucesso, timeout e resposta inválida sem uso d erede (fake fetch)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar o status de um provedor externo (Priority: P1)

Como agente ou operador de suporte, quero consultar rapidamente o status público de um provedor crítico para confirmar se um problema observado é interno ou resultado de uma interrupção externa.

**Why this priority**: Este é o fluxo principal de valor da ferramenta; sem ele, o time não consegue separar falhas internas de indisponibilidade do provedor em menos de alguns segundos.

**Independent Test**: Pode ser testado de forma independente enviando `provider=github` ou `provider=cloudflare` com uma resposta válida e validando que o resultado retornado em uma linha informa indicador e descrição.

**Acceptance Scenarios**:

1. **Given** um ambiente com problema de produção e suspeita de falha externa, **When** a ferramenta é chamada com o provedor `github`, **Then** o sistema consulta a API pública correspondente e retorna um resumo compacto do estado atual.
2. **Given** um ambiente com problema de produção e suspeita de falha externa, **When** a ferramenta é chamada com o provedor `cloudflare`, **Then** o sistema consulta a API pública correspondente e devolve o indicador e a descrição do status em uma única linha.

---

### User Story 2 - Entender rapidamente falhas de rede e validação (Priority: P2)

Como agente operacional, quero receber erros legíveis e observáveis quando a consulta falha por rede, timeout ou resposta inesperada para decidir sem ter que depurar a ferramenta internamente.

**Why this priority**: A consistência de mensagens e a ausência de exceções para fora da tool reduzem ruído e ajudam a interpretar incidentes com maior rapidez.

**Independent Test**: Pode ser testado com falha de rede, timeout e payload inválido, validando que a ferramenta retorna erro legível em vez de lançar exceção e que a mensagem descreve a falha em linguagem operacional.

**Acceptance Scenarios**:

1. **Given** uma consulta cujo fetch falha por rede, **When** a resolução tenta executar, **Then** a ferramenta aplica uma nova tentativa e, se ainda falhar, retorna uma observação legível sobre indisponibilidade de serviço.
2. **Given** uma resposta da API pública com formato inválido, **When** a validação do payload falhar, **Then** o sistema retorna erro de resposta inválida sem quebrar o fluxo do agente.

---

### User Story 3 - Respeitar limites operacionais de latência (Priority: P3)

Como agente que acompanha incidentes, quero que a verificação de status tenha limite de tempo e recuperação automática para não bloquear a análise do incidente por indisponibilidade do provedor ou atraso da rede.

**Why this priority**: Respostas lentas ou sem timeout podem travar a investigação e tornar o diagnóstico menos confiável em cenários críticos.

**Independent Test**: Pode ser testado com um fetch que exceda 5 segundos e com uma resposta 5xx em primeira tentativa, validando que a tool faz exatamente uma nova tentativa e retorna o resultado esperado.

**Acceptance Scenarios**:

1. **Given** uma requisição que excede o limite de 5 segundos, **When** a operação alcança o timeout via `AbortSignal.timeout`, **Then** o sistema tenta uma nova vez e, se persistir, retorna erro de timeout legível.
2. **Given** uma API pública retornando erro 5xx, **When** a consulta falha no servidor, **Then** a ferramenta executa uma nova tentativa antes de retornar erro final observável.

---

### Edge Cases

- O que acontece quando `provider` não é informado e o valor padrão `github` deve ser usado?
- Como o sistema se comporta quando a resposta da API pública não contém o campo `status` ou usa um schema diferente?
- O que acontece quando a primeira tentativa falha por timeout e a segunda também falha?
- Como o sistema responde quando a URL do provedor estiver indisponível ou retornar erro sem corpo útil?
- O que acontece quando a ferramenta é utilizada em contexto de diagnóstico e o retorno deve ficar em uma linha para não inflar o contexto?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A ferramenta MUST expor um parâmetro `provider` com suporte aos valores `github` e `cloudflare`, com padrão `github` e descrição explícita do uso.
- **FR-002**: A ferramenta MUST consultar a API pública do provedor relevante usando o endpoint correspondente: `github` em `https://www.githubstatus.com/api/v2/status.json` e `cloudflare` em `https://www.cloudflarestatus.com/api/v2/status.json`.
- **FR-003**: A ferramenta MUST validar qualquer payload recebido com Zod e aceitar apenas a estrutura esperada `{ status: { indicator, description } }`.
- **FR-004**: A ferramenta MUST aplicar timeout de 5 segundos em cada tentativa de requisição usando `AbortSignal.timeout`.
- **FR-005**: A ferramenta MUST executar uma única nova tentativa após falha de rede ou resposta com status HTTP 5xx antes de concluir com erro final.
- **FR-006**: A ferramenta MUST retornar uma resposta compacta em uma linha com indicador e descrição, sem inflar o contexto da conversa.
- **FR-007**: A ferramenta MUST devolver erro legível como resultado da tool em vez de lançar exceção para fora da ferramenta quando a consulta falha irreversivelmente.
- **FR-008**: A ferramenta MUST descrever seu uso principal como suporte à investigação de problemas externos e à diferenciação entre falhas internas e indisponibilidade do provedor.
- **FR-009**: O fetch da consulta MUST ser injetável para permitir testes determinísticos sem acesso à rede.
- **FR-010**: A suíte de testes MUST cobrir sucesso, timeout e resposta inválida usando fetch falso, sem depender de rede externa.

### Key Entities *(include if feature involves data)*

- **Provider Status Request**: Representa a entrada da consulta, com o provedor selecionado e o contexto operacional em que a checagem é necessária.
- **Provider Status Result**: Representa o retorno final da tool, contendo indicador e descrição resumida do estado atual do provedor.
- **External Status Payload**: Representa a resposta pública do serviço de status com o bloco `status` e seus campos `indicator` e `description`.
- **Tool Error Observation**: Representa a falha final legível retornada pela ferramenta quando não é possível obter um status válido.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das consultas válidas para `github` e `cloudflare` retornam o status atual do provedor em um único resumo compacto.
- **SC-002**: 100% das falhas por rede ou 5xx são retriadas uma vez antes de concluir com erro ao usuário ou ao agente.
- **SC-003**: 100% dos timeouts da requisição respeitam o limite de 5 segundos sem bloquear a execução do fluxo de incidentes.
- **SC-004**: 100% das respostas com esquema inválido são rejeitadas com erro observável e sem exceção não tratada.
- **SC-005**: A suíte de testes da ferramenta executa localmente sem rede externa e cobre os cenários de sucesso, timeout e payload inválido.

## Assumptions

- O uso principal da tool é auxiliar a triagem de incidentes e a diferenciação entre falhas internas e problemas externos.
- Os provedores suportados nesta versão são os dois listados no requisito inicial: GitHub e Cloudflare.
- A ferramenta deve priorizar clareza operacional em detrimento de detalhes detalhados do statuspage interno.
- Em cenários de falha irreversível, o retorno deve ser observacional e legível para o agente, não uma exceção não tratada.
- Testes determinísticos são preferíveis a chamadas de rede reais para manter o comportamento estável e reproduzível.
