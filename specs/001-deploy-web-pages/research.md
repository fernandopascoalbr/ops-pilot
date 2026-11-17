# Research: Deploy Web no GitHub Pages

## Decision: usar pipeline em duas etapas (artefato + deploy)

A publicação no Pages deve separar explicitamente a geração do artefato da etapa de deploy. A primeira etapa produz o pacote estático da pasta `web/`; a segunda consome somente esse artefato para publicar no Pages.

### Rationale

- A separação aumenta rastreabilidade: fica claro o que foi empacotado e o que foi publicado.
- O requisito funcional exige uso explícito de upload de artefato antes do deploy.
- Em caso de falha, o diagnóstico fica mais objetivo (falha de build/empacotamento vs falha de publicação).

### Alternatives considered

- Deploy direto sem artefato intermediário: rejeitado por reduzir auditabilidade e não atender o requisito explícito.
- Workflow único sem fronteira de responsabilidade: rejeitado por dificultar troubleshooting.

## Decision: restringir permissões ao mínimo necessário para Pages

O workflow deve declarar permissões de forma explícita e mínima para não depender de defaults permissivos.

### Rationale

- Reduz risco operacional e superfície de abuso em automações.
- Atende o requisito de permissões explícitas e evita falhas por configuração implícita.
- Mantém alinhamento com os princípios de segurança e auditabilidade da constituição.

### Alternatives considered

- Usar permissões amplas globais do repositório: rejeitado por risco desnecessário.
- Não declarar permissões no workflow: rejeitado por comportamento implícito e pouco previsível.

## Decision: publicar somente após build válido do `web/`

A publicação deve depender de build válido do frontend para evitar envio de conteúdo incompleto ou inconsistente.

### Rationale

- Garante que o conteúdo publicado é exatamente o resultado do build esperado.
- Evita deploys “verdes” com site quebrado por erro de construção.
- Dá previsibilidade para mantenedores ao validar localmente antes de acionar a publicação.

### Alternatives considered

- Publicar sem etapa de build no fluxo: rejeitado por risco de publicar fonte não preparada para hosting estático.
- Reaproveitar arquivos locais não gerados em CI: rejeitado por baixa reprodutibilidade.

## Decision: atualizar README com operação e validação do deploy

A documentação deve descrever quando o fluxo dispara, como validar sucesso e como investigar falhas comuns.

### Rationale

- Reduz dependência de conhecimento tácito dos mantenedores.
- Acelera onboarding de contribuidores para mudanças em `web/`.
- Atende o requisito de atualização de README com instruções objetivas.

### Alternatives considered

- Documentar apenas no arquivo do workflow: rejeitado por baixa descoberta para contribuidores.
- Não documentar validação pós-deploy: rejeitado por dificultar verificação do critério de sucesso.
