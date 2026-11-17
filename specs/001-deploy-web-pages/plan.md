# Implementation Plan: Deploy Web no GitHub Pages

**Branch**: `001-deploy-web-pages` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-deploy-web-pages/spec.md`

## Summary

Planejar a publicação da pasta `web/` no GitHub Pages por workflow dedicado de Actions, com etapa explícita de upload de artefato e etapa de deploy, permissões mínimas necessárias e documentação de operação no README para mantenedores e contribuidores.

## Technical Context

**Language/Version**: YAML de GitHub Actions para orquestração de workflow + documentação Markdown; projeto com Node.js LTS e TypeScript ESM strict para build do frontend

**Primary Dependencies**: GitHub Actions (`actions/upload-pages-artifact`, `actions/deploy-pages`), frontend em `web/` com Vite + React + TypeScript

**Storage**: N/A (artefato efêmero de build publicado via GitHub Actions)

**Testing**: validação por execução do workflow no GitHub Actions + validação local de build do web (`npm run build` em `web/`) + checks existentes do repositório (`npm test`, `npm run typecheck`) quando mudanças de código forem introduzidas na implementação

**Target Platform**: GitHub-hosted runners Linux para CI/CD e GitHub Pages como plataforma de publicação

**Project Type**: Repositório backend + aplicação web com pipeline de publicação estática

**Performance Goals**:
- publicação concluída com sucesso em uma única execução sem intervenção manual
- confirmação de versão publicada em até 5 minutos após execução bem-sucedida

**Constraints**:
- usar somente permissões mínimas para deploy no Pages
- manter separação clara entre etapa de construção/empacotamento e etapa de deploy
- falhas de autorização ou artefato ausente devem aparecer com erro explícito no workflow
- README deve refletir o fluxo real de publicação e verificação

**Scale/Scope**:
- um workflow de publicação para a pasta `web/`
- atualização da documentação de deploy no README do projeto
- sem alteração do comportamento de runtime da API/CLI do OpsPilot

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate Review

- **Spec-First Delivery**: PASS — a especificação existe e define escopo, requisitos e critérios de sucesso para o deploy web.
- **Agent Safety Over Automation Speed**: PASS — o plano exige permissões mínimas e erro explícito, evitando automação com privilégios excessivos.
- **Evidence-Driven Incident Handling**: PASS — o fluxo de publicação prevê sinais auditáveis de sucesso/falha (execução, logs e ambiente do Pages).
- **Tool and Context Boundaries**: PASS — mudanças limitadas a CI/CD e documentação; sem acoplamento indevido em lógica de domínio.
- **Quality, Security, and Testability**: PASS — plano inclui validação de build, execução de workflow e atualização documental verificável.

### Post-Phase 1 Re-Check

- **Spec-First Delivery**: PASS — artefatos de planejamento e design da feature foram produzidos no diretório da spec.
- **Agent Safety Over Automation Speed**: PASS — contrato registra permissões mínimas e separação explícita entre upload de artefato e deploy.
- **Evidence-Driven Incident Handling**: PASS — quickstart define validação observável do resultado publicado e diagnóstico de falhas.
- **Tool and Context Boundaries**: PASS — modelo de dados e contrato permanecem no domínio de publicação web/documentação, sem expandir escopo.
- **Quality, Security, and Testability**: PASS — cenários de validação cobrem sucesso, autorização e consistência de documentação.

## Project Structure

### Documentation (this feature)

```text
specs/001-deploy-web-pages/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── github-pages-deploy.contract.yaml
└── tasks.md
```

### Source Code (repository root)

```text
.github/
└── workflows/
   └── [to be created] deploy-web-pages.yml

web/
├── src/
├── public/
├── package.json
└── vite.config.ts

README.md
```

**Structure Decision**: A feature atua sobre a fronteira de CI/CD e documentação. O workflow será definido em `.github/workflows/` para publicar o artefato estático de `web/`, enquanto o README na raiz documentará uso e verificação da publicação.

## Complexity Tracking

Nenhuma violação da constituição identificada; sem exceções a justificar.
