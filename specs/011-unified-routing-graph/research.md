# Research: Grafo Unificado e Roteamento Estruturado

## Decision: centralizar a decisão de rota em um grafo único

Unificar contexto, roteador, estratégias e resposta em um único fluxo de execução, em vez de tratar decisão de estratégia e resposta como etapas separadas.

### Rationale

- Mantém a lógica de decisão em um único ponto de observação para operadores e analistas.
- Reduz divergência entre caminhos de execução e resposta.
- Permite explicação clara do porquê da rota escolhida antes de processar a ação final.

### Alternatives considered

- Roteamento ad hoc em `POST /chat`: rejeitado por fragmentar o fluxo e dificultar a auditabilidade.
- Estratégias independentes sem router explícito: rejeitado por tornar o caminho de decisão opaco e inconsistente.

## Decision: usar `withStructuredOutput` no roteador para expor `route` e `reason`

O módulo de roteamento deve produzir uma resposta estruturada com `route` e `reason`, ao invés de inferir a rota apenas a partir de texto livre.

### Rationale

- Garante um contrato determinístico para o restante do grafo.
- Facilita teste automatizado e validação por integração.
- Mantém o valor operacional em formato legível para humanos e máquinas.

### Alternatives considered

- Inferir rota por texto livre do LLM: rejeitado por ambiguidade e baixa confiabilidade.
- Expor apenas `route` sem explicação: rejeitado por não atender ao requisito de transparência.

## Decision: marcar todos os eventos de trace com `node` e `route`

Cada evento de trace deve conter o nó atual do fluxo e a rota selecionada no momento da execução.

### Rationale

- Dá visibilidade da sequência real de execução e sua relação com a decisão de rota.
- Ajuda em debug operacional sem exigir leitura do prompt completo.
- Mantém rastreabilidade da evolução do contexto até a resposta final.

### Alternatives considered

- Registrar apenas `type` e `message`: rejeitado por ocultar o ponto em que a decisão de fluxo ocorreu.
- Registrar `route` apenas na resposta final: rejeitado por reduzir a observabilidade do processo.

## Decision: o `/chat` deve emitir a mesma estrutura de `route`/`reason`

A camada HTTP precisa refletir o mesmo resultado do router em resposta ao cliente, em vez de esconder a decisão apenas no trace interno.

### Rationale

- A resposta do usuário precisa ser compreensível sem consultar logs internos.
- Cria contrato consistente entre execução interna e apresentação ao operador.
- Reduz risco de interpretação errada da decisão pelo usuário final.

### Alternatives considered

- Expor apenas `answer` no body: rejeitado por não atender ao objetivo de transparência.
- Incluir a rota só por convenção interna: rejeitado por política de observabilidade e segurança operacional.

## Decision: tratar ambiguidades com segurança e transparência

Quando o contexto não for suficiente, a decisão de rota deve sinalizar incerteza em vez de forçar uma rota arbitrária.

### Rationale

- Evita decisões de alto impacto baseadas em inferência fraca.
- Aumenta confiança operacional e reduz erros de classificação silenciosos.
- Alinha com os princípios de segurança e evidência do projeto.

### Alternatives considered

- Escolher a rota mais provável sem explicitar a incerteza: rejeitado por risco operacional.
- Bloquear todas as requisições ambíguas: rejeitado por reduzir utilidade do sistema em cenários de baixa confiança.
