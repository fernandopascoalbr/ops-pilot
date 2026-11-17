# Feature Specification: Deploy Web no GitHub Pages

**Feature Branch**: `[001-deploy-web-pages]`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "Deploy do web/ no Pages via Actions: upload-pages-artifact + deploy-pages, permissions, README (atualizar)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publicar versão web automaticamente (Priority: P1)

Como mantenedor do projeto, quero que a pasta web seja publicada no GitHub Pages por workflow para que o site fique disponível sem deploy manual.

**Why this priority**: Este é o objetivo principal da solicitação e entrega valor imediato ao disponibilizar a interface web publicamente.

**Independent Test**: Pode ser testado executando o fluxo de publicação e verificando se uma nova versão do site fica acessível na URL do Pages após a execução.

**Acceptance Scenarios**:

1. **Given** que há uma alteração pronta na pasta web, **When** o fluxo de publicação é executado, **Then** o conteúdo atualizado é publicado no GitHub Pages.
2. **Given** que o fluxo concluiu sem erros, **When** o mantenedor abre a URL do Pages, **Then** a versão exibida corresponde à última publicação.

---

### User Story 2 - Garantir permissões corretas de publicação (Priority: P2)

Como mantenedor do repositório, quero que o workflow use apenas as permissões necessárias para publicar no Pages, reduzindo riscos operacionais e falhas por autorização incorreta.

**Why this priority**: Sem permissões adequadas, o deploy falha; com permissões excessivas, aumenta-se o risco de segurança.

**Independent Test**: Pode ser testado validando que o fluxo executa com sucesso com permissões mínimas definidas e falha quando permissões críticas são removidas.

**Acceptance Scenarios**:

1. **Given** que o workflow está configurado com permissões de publicação, **When** ele é executado, **Then** o deploy no Pages é autorizado e concluído.
2. **Given** que uma permissão necessária está ausente, **When** o workflow tenta publicar, **Then** a execução falha com erro explícito de autorização.

---

### User Story 3 - Documentar o processo para contribuidores (Priority: P3)

Como contribuidor, quero instruções claras no README sobre como funciona a publicação no Pages para entender quando e como mudanças no web são disponibilizadas.

**Why this priority**: Documentação clara reduz dúvidas, retrabalho e suporte interno.

**Independent Test**: Pode ser testado pedindo a um contribuidor que não participou da implementação para explicar o processo com base apenas no README atualizado.

**Acceptance Scenarios**:

1. **Given** que o README foi atualizado, **When** um contribuidor consulta a seção de deploy, **Then** ele encontra os pré-requisitos, gatilhos e resultado esperado da publicação no Pages.

---

### Edge Cases

- O que acontece quando o workflow de publicação é acionado sem artefato válido da pasta web?
- Como o sistema lida com falha intermitente da infraestrutura do Pages durante o deploy?
- Como evitar publicação indevida quando o conteúdo web não foi alterado no contexto esperado?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST publicar o conteúdo da pasta web no GitHub Pages por meio de um fluxo automatizado de publicação.
- **FR-002**: O sistema MUST executar uma etapa de empacotamento do conteúdo web antes da etapa de deploy no Pages, garantindo que o deploy use um artefato explícito.
- **FR-003**: O sistema MUST executar uma etapa de deploy dedicada que consuma o artefato gerado e publique a versão correspondente no Pages.
- **FR-004**: O sistema MUST definir explicitamente as permissões necessárias para o fluxo de publicação no Pages e não depender de permissões implícitas.
- **FR-005**: O sistema MUST registrar falhas de publicação com mensagem de erro clara para diagnóstico por mantenedores.
- **FR-006**: O sistema MUST atualizar o README com instruções do processo de publicação, incluindo condição de execução, resultado esperado e como verificar sucesso.
- **FR-007**: Usuários mantenedores MUST be able to verificar se a publicação mais recente do Pages corresponde à última execução bem-sucedida do fluxo.

### Key Entities *(include if feature involves data)*

- **Publicação Web**: Representa uma execução de entrega do conteúdo web para o Pages, com status (sucesso/falha), referência de origem e momento da publicação.
- **Artefato de Publicação**: Representa o pacote gerado a partir da pasta web e consumido pela etapa de deploy para garantir rastreabilidade da versão publicada.
- **Permissão de Deploy**: Representa o conjunto mínimo de autorizações necessárias para permitir a publicação no Pages.
- **Guia de Deploy no README**: Representa a documentação oficial para contribuidores sobre gatilhos, fluxo e validação da publicação.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das execuções bem-sucedidas de publicação disponibilizam a versão web esperada no Pages sem intervenção manual.
- **SC-002**: Mantenedores conseguem confirmar o sucesso da publicação em até 5 minutos após o término do fluxo.
- **SC-003**: Pelo menos 90% dos contribuidores que consultarem o README conseguem descrever corretamente quando ocorre o deploy e como validar o resultado.
- **SC-004**: Incidentes de falha por permissão ausente ou incorreta na publicação são reduzidos para zero após a configuração final.

## Assumptions

- A pasta web já gera conteúdo publicável válido dentro do processo atual do projeto.
- A publicação no GitHub Pages será feita para o ambiente padrão do repositório, sem necessidade de múltiplos ambientes neste escopo.
- O fluxo de publicação será usado principalmente por mantenedores com acesso às configurações do repositório.
- Atualizações do README ficarão no mesmo repositório e serão mantidas junto com as mudanças no fluxo de publicação.
