# IncidentArena

IncidentArena é um copiloto que gerencia alertas e incidentes de produção. O projeto contém uma API e um agente LangChain/LangGraph sobre OpenRouter.

## Stack
- Node.js LTS
- TypeScript ESM com `strict` habilitado
- Zod apenas nas fronteiras (HTTP/CLI)
- Testes com `node:test` + `tsx`

## Comandos
- `dev`: `tsx src/index.ts` (API em `localhost:3000`)
- `cli`: `tsx src/cli.ts`
- `test`: `node --import tsx --test /src/**/*.test.ts`
- `typecheck`: `tsc --noEmit`

## Convenções
- Camadas padrão MVC: Model, Service, Controller.
- Validar toda entrada externa com Zod.
- Erros de domínio são classes e devem ser traduzidos na fronteira.
- Toda nova lógica começa com teste.
- `typecheck` e testes devem permanecer verdes.
- Sempre utilizar funções puras.

## Fluxo
- Seguir o fluxo do Spec Kit (GitHub Copilot): /speckit.specify -> /speckit.plan -> /speckit.tasks -> /speckit.implement.
- Specs devem ser versionadas.
