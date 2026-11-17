# Data Model: Deploy Web no GitHub Pages

## 1) WebPublicationRun

- **Purpose**: Representa uma execução de publicação do site web no GitHub Pages.
- **Fields**:
  - `runId` (string, obrigatório): identificador único da execução.
  - `trigger` (string, obrigatório): origem da execução (evento que iniciou o fluxo).
  - `commitRef` (string, obrigatório): referência da revisão publicada.
  - `status` (`queued|in_progress|success|failed`, obrigatório): estado do ciclo de publicação.
  - `startedAt` (string datetime, obrigatório)
  - `finishedAt` (string datetime, opcional)
- **Validation rules**:
  - `runId` deve ser único por execução.
  - `finishedAt` é obrigatório quando `status` for `success` ou `failed`.
- **State transitions**:
  - `queued -> in_progress`
  - `in_progress -> success`
  - `in_progress -> failed`

## 2) PagesArtifact

- **Purpose**: Representa o pacote de conteúdo estático gerado da pasta `web/` e enviado para publicação.
- **Fields**:
  - `artifactId` (string, obrigatório)
  - `sourcePath` (string, obrigatório): origem do conteúdo de publicação.
  - `createdFromRunId` (string, obrigatório): referência para `WebPublicationRun`.
  - `availability` (`available|missing|expired`, obrigatório)
- **Validation rules**:
  - todo `PagesArtifact` deve referenciar uma execução existente.
  - deploy só pode iniciar quando `availability = available`.
- **Relationships**:
  - N:1 com `WebPublicationRun`.

## 3) PagesDeployPermissionSet

- **Purpose**: Representa o conjunto mínimo de permissões necessárias para concluir publicação no Pages.
- **Fields**:
  - `permissionProfileId` (string, obrigatório)
  - `pagesPermission` (`granted|missing`, obrigatório)
  - `idTokenPermission` (`granted|missing`, obrigatório)
  - `contentsPermission` (`granted|missing`, opcional): quando necessário para leitura do repositório
- **Validation rules**:
  - publicação só pode seguir quando permissões obrigatórias estiverem como `granted`.
  - estado `missing` deve resultar em falha explícita de autorização.

## 4) ReadmeDeployGuide

- **Purpose**: Representa o bloco documental oficial de deploy web para contribuidores.
- **Fields**:
  - `sectionId` (string, obrigatório)
  - `audience` (`maintainer|contributor|all`, obrigatório)
  - `triggerDescription` (string, obrigatório)
  - `verificationSteps` (string[], obrigatório)
  - `failureNotes` (string[], opcional)
- **Validation rules**:
  - deve conter passos verificáveis de confirmação pós-publicação.
  - deve mencionar comportamento esperado em caso de falha de publicação.
