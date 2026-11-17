# Quickstart: Validação do Deploy Web no Pages

## Objetivo

Validar ponta a ponta que a publicação da pasta `web/` no GitHub Pages funciona com:

1. build válido do frontend,
2. upload de artefato de Pages,
3. deploy consumindo o artefato,
4. documentação atualizada no README para operação e verificação.

## Notas de implementação da feature

- Workflow de publicação: `.github/workflows/deploy-web-pages.yml`
- Jobs esperados: `build-and-upload` e `deploy-pages`
- A publicação depende de artefato `github-pages` válido antes do deploy

## Pré-requisitos

- Node.js LTS instalado
- Dependências instaladas no repositório e em `web/`
- Permissões de mantenedor para visualizar execuções do Actions e ambiente do Pages

## Cenário 1 — validar build local do web

```bash
cd web
npm install
npm run build
```

Resultado esperado:

- o build conclui sem erro;
- o diretório de saída estático é gerado;
- a feature está apta para etapa de upload no CI.

## Cenário 2 — executar publicação no GitHub Actions

1. Enviar alteração na pasta `web/` conforme o gatilho definido.
2. Acompanhar o workflow de deploy no Actions.
3. Confirmar ordem dos jobs:
   - build/upload de artefato
   - deploy no Pages

Resultado esperado:

- job de upload finaliza com artefato disponível;
- job de deploy inicia somente após upload bem-sucedido;
- execução completa com status de sucesso.
- URL publicada aparece no ambiente `github-pages` da execução.

## Cenário 3 — validar permissões e falhas explícitas

1. Verificar no workflow que as permissões necessárias estão declaradas.
2. Reproduzir execução com configuração inválida de permissão (em branch de teste).

Resultado esperado:

- com permissões corretas, deploy autorizado e concluído;
- sem permissão crítica, workflow falha com erro explícito de autorização.
- sem artefato `github-pages` válido, workflow falha com erro explícito de artefato ausente/inválido.

## Cenário 4 — validar publicação final e documentação

1. Abrir URL do Pages após execução bem-sucedida.
2. Confirmar que a versão publicada reflete o commit da execução.
3. Revisar seção do README sobre deploy web.

Resultado esperado:

- versão esperada disponível publicamente;
- README descreve gatilho, fluxo e validação;
- mantenedor consegue confirmar sucesso em até 5 minutos.

## Checklist de evidências da execução

- registrar link da execução bem-sucedida do workflow no Actions;
- registrar URL pública do Pages retornada no deploy;
- registrar commit publicado correspondente ao run;
- registrar erro observado em cenário de permissão inválida (branch de teste).

## Referências

- Especificação: [spec.md](./spec.md)
- Plano: [plan.md](./plan.md)
- Pesquisa: [research.md](./research.md)
- Modelo de dados: [data-model.md](./data-model.md)
- Contrato: [contracts/github-pages-deploy.contract.yaml](./contracts/github-pages-deploy.contract.yaml)
