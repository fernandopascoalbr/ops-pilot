---

description: "Task list for Deploy Web no GitHub Pages"
---

# Tasks: Deploy Web no GitHub Pages

**Input**: Design documents from `/specs/001-deploy-web-pages/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Não há solicitação explícita de TDD na spec; portanto, não há tarefas de criação de testes automatizados nesta lista.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar base de workflow e estrutura de documentação para a feature

- [X] T001 Create workflows directory scaffold in .github/workflows/.gitkeep
- [X] T002 Create feature deployment notes placeholder in specs/001-deploy-web-pages/quickstart.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Definir o contrato base do workflow e alinhamento documental antes das user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Create GitHub Pages workflow file skeleton with trigger block in .github/workflows/deploy-web-pages.yml
- [X] T004 Define job dependency skeleton (build-and-upload -> deploy-pages) in .github/workflows/deploy-web-pages.yml
- [X] T005 [P] Add permissions contract section for deploy workflow in specs/001-deploy-web-pages/contracts/github-pages-deploy.contract.yaml
- [X] T006 [P] Add validation checklist items for workflow run evidence in specs/001-deploy-web-pages/quickstart.md

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Publicar versão web automaticamente (Priority: P1) 🎯 MVP

**Goal**: Publicar automaticamente o conteúdo de `web/` no Pages com pipeline em duas etapas (artefato + deploy)

**Independent Test**: Executar o workflow e confirmar que o job de upload gera artefato e o job de deploy publica a versão esperada na URL do Pages.

### Implementation for User Story 1

- [X] T007 [US1] Add build and artifact upload steps (npm ci + npm run build + upload-pages-artifact) in .github/workflows/deploy-web-pages.yml
- [X] T008 [US1] Add deploy-pages step consuming uploaded artifact in .github/workflows/deploy-web-pages.yml
- [X] T009 [US1] Configure workflow environment output for published Pages URL visibility in .github/workflows/deploy-web-pages.yml
- [X] T010 [US1] Document MVP publish flow validation steps in specs/001-deploy-web-pages/quickstart.md

**Checkpoint**: User Story 1 should publish `web/` to Pages end-to-end

---

## Phase 4: User Story 2 - Garantir permissões corretas de publicação (Priority: P2)

**Goal**: Garantir execução com permissões mínimas e falha explícita em caso de autorização insuficiente

**Independent Test**: Executar o workflow com permissões corretas e validar sucesso; em branch de teste com permissão crítica removida, validar falha explícita de autorização.

### Implementation for User Story 2

- [X] T011 [US2] Set explicit workflow permissions `pages: write` and `id-token: write` (and `contents: read` only if needed) in .github/workflows/deploy-web-pages.yml
- [X] T012 [US2] Add explicit guard for missing artifact before deploy in .github/workflows/deploy-web-pages.yml
- [X] T013 [US2] Align permission failure signals and authorization expectations in specs/001-deploy-web-pages/contracts/github-pages-deploy.contract.yaml
- [X] T014 [US2] Add permission-failure and artifact-missing diagnostic procedure in specs/001-deploy-web-pages/quickstart.md

**Checkpoint**: User Story 2 should enforce least privilege and explicit failure diagnostics

---

## Phase 5: User Story 3 - Documentar o processo para contribuidores (Priority: P3)

**Goal**: Atualizar README com instruções claras de gatilho, verificação e troubleshooting do deploy

**Independent Test**: Um contribuidor consegue explicar quando o deploy roda e como validar sucesso usando apenas README.

### Implementation for User Story 3

- [X] T015 [US3] Add "Deploy Web no GitHub Pages" section with trigger strategy in README.md
- [X] T016 [US3] Add publication verification steps (workflow run + Pages URL + commit correspondence) in README.md
- [X] T017 [US3] Add common failure diagnosis notes (permissão e artefato ausente) in README.md
- [X] T018 [US3] Cross-link README deployment section to specs quickstart in README.md

**Checkpoint**: User Story 3 should provide complete operator-facing documentation

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validação final integrada da feature

- [X] T019 [P] Run end-to-end checklist review and expected outcomes update in specs/001-deploy-web-pages/quickstart.md
- [X] T020 Validate workflow/documentation consistency against specification requirements in specs/001-deploy-web-pages/spec.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 workflow base completed
- **User Story 3 (Phase 5)**: Depends on User Story 1 and User Story 2 behavior being finalized
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: starts after Foundational; no dependency on other stories
- **US2 (P2)**: depends on US1 workflow implementation to constrain permissions and diagnostics
- **US3 (P3)**: depends on finalized behavior from US1 and US2 for accurate documentation

### Within Each User Story

- Workflow structure changes precede diagnostics/documentation updates.
- Deploy logic precedes validation narrative.
- Documentation of behavior happens after behavior is fully defined.

### Parallel Opportunities

- **Phase 2**: T005 and T006 can run in parallel.
- **Phase 6**: T019 can run in parallel with any final manual validation evidence collection before T020.

---

## Parallel Example: User Story 2

```bash
Task: "Set explicit workflow permissions in .github/workflows/deploy-web-pages.yml"
Task: "Align permission failure signals in specs/001-deploy-web-pages/contracts/github-pages-deploy.contract.yaml"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup)
2. Complete Phase 2 (Foundational)
3. Complete Phase 3 (US1)
4. Validate publication end-to-end using quickstart criteria

### Incremental Delivery

1. Deliver US1 (publication works)
2. Deliver US2 (permissions hardening + explicit diagnostics)
3. Deliver US3 (contributor documentation in README)
4. Final polish and consistency validation

### Parallel Team Strategy

1. One maintainer finaliza T003/T004 (workflow base).
2. Outro contribuidor pode executar T005/T006 em paralelo.
3. Após US1, segurança/permissões (US2) e documentação detalhada (US3) podem ser preparados em paralelo parcial, com merge final após estabilização.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should remain independently testable per spec criteria
- Avoid same-file concurrent edits in `.github/workflows/deploy-web-pages.yml`
