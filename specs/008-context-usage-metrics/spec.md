# Feature Specification: Medição de Contexto e Tokens

**Feature Branch**: `[008-context-usage-metrics]`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "Instrumente a medição de contexto: src/context/token.ts com estimateTokens (chars/4) e o usage real do LangChain; métricas do /chat com promptTokens real e contextBreakdown estimado por fontes; conversa-longa.sh imprime o promptTokens por turno. Com testes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Medir uso real de prompt no chat (Priority: P1)

Como pessoa responsável por operação, quero ver o consumo real de tokens de prompt em cada resposta do chat para acompanhar custo e risco de estouro de contexto.

**Why this priority**: Sem medição real por interação, não é possível gerir custo e qualidade do atendimento com confiabilidade.

**Independent Test**: Pode ser testado chamando o chat uma vez e verificando se a resposta inclui o valor de tokens reais de prompt.

**Acceptance Scenarios**:

1. **Given** uma solicitação de chat processada com sucesso, **When** a resposta é retornada, **Then** o consumo real de tokens de prompt da interação é incluído nas métricas retornadas.
2. **Given** múltiplas solicitações consecutivas de chat, **When** cada resposta é recebida, **Then** cada resposta apresenta o valor de prompt tokens referente apenas ao seu próprio turno.

---

### User Story 2 - Entender composição do contexto por fonte (Priority: P2)

Como pessoa investigando qualidade de resposta, quero visualizar a estimativa de tokens por fonte de contexto para entender quais entradas estão consumindo mais espaço.

**Why this priority**: O detalhamento por fonte acelera diagnóstico de ruído, excesso de contexto e decisões de otimização.

**Independent Test**: Pode ser testado executando uma requisição com múltiplas fontes de contexto e verificando se a resposta expõe o detalhamento estimado por fonte.

**Acceptance Scenarios**:

1. **Given** uma solicitação de chat com mais de uma fonte de contexto, **When** a resposta é retornada, **Then** o detalhamento estimado mostra cada fonte separadamente com sua estimativa de consumo.
2. **Given** uma fonte de contexto vazia, **When** o detalhamento é gerado, **Then** a fonte aparece com consumo zero sem quebrar o retorno.

---

### User Story 3 - Acompanhar consumo por turno em conversa longa (Priority: P3)

Como pessoa avaliando comportamento em conversas longas, quero que o script de simulação imprima os prompt tokens por turno para analisar tendência de crescimento de contexto.

**Why this priority**: A visibilidade por turno reduz tempo de análise e facilita detectar regressões em cenários de longa duração.

**Independent Test**: Pode ser testado executando o script de conversa longa e verificando se há saída por turno com o valor de prompt tokens.

**Acceptance Scenarios**:

1. **Given** execução completa do script de conversa longa, **When** os turnos são processados, **Then** cada turno imprime o valor de prompt tokens correspondente.
2. **Given** uma execução com falha em um turno intermediário, **When** o script interrompe, **Then** os turnos anteriores já processados permanecem com seus valores impressos.

---

### Edge Cases

- O que acontece quando não há fontes extras de contexto além da conversa atual?
- Como o sistema se comporta quando o uso real de prompt tokens não está disponível no retorno da execução?
- Como o sistema trata fontes com conteúdo muito grande sem perder o detalhamento por origem?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST calcular a estimativa de tokens de qualquer texto usando a regra de caracteres divididos por 4, com arredondamento consistente para evitar resultados ambíguos.
- **FR-002**: O sistema MUST registrar e expor, para cada resposta de chat, o valor real de prompt tokens reportado pela execução do modelo quando esse valor estiver disponível.
- **FR-003**: O sistema MUST retornar, na resposta do chat, um detalhamento estimado de contexto por fonte de entrada usada na construção do prompt.
- **FR-004**: O sistema MUST manter os nomes das fontes no detalhamento de contexto para permitir rastreabilidade durante análise operacional.
- **FR-005**: O sistema MUST garantir que ausência de uso real reportado não interrompa o fluxo de chat e seja tratada como ausência explícita de métrica, sem mascarar o dado.
- **FR-006**: Usuários MUST be able to executar o script de conversa longa e visualizar o valor de prompt tokens em cada turno processado.
- **FR-007**: O sistema MUST incluir testes automatizados para validar cálculo estimado, exposição das métricas do chat e impressão por turno no script de conversa longa.

### Key Entities *(include if feature involves data)*

- **Token Usage Metric**: Representa a medição de consumo de tokens por interação; inclui valor real de prompt tokens e metadados do turno.
- **Context Source Breakdown Item**: Representa uma fonte de contexto individual; inclui identificador da fonte e sua estimativa de tokens.
- **Chat Turn Metric Record**: Representa o conjunto de métricas de um turno de conversa; agrega uso real, estimativas e referência do turno.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das respostas de chat bem-sucedidas expõem um campo de métricas contendo o valor real de prompt tokens quando o provedor informar esse valor.
- **SC-002**: 100% das respostas de chat com múltiplas fontes de contexto incluem detalhamento estimado por fonte, sem consolidar tudo em um único total.
- **SC-003**: Em execução de conversa longa com no mínimo 10 turnos, cada turno apresenta seu prompt tokens no output do script.
- **SC-004**: A suíte de testes automatizados cobre os cenários principais e de borda desta feature, mantendo taxa de aprovação de 100% nas verificações adicionadas.

## Assumptions

- O endpoint de chat já possui estrutura de resposta capaz de receber novos campos de métricas sem quebrar consumidores existentes.
- Fontes de contexto já possuem identificação suficiente para compor o detalhamento por origem.
- O script de conversa longa continua sendo a forma padrão de simulação de múltiplos turnos para avaliação operacional.
- O valor real de prompt tokens depende de disponibilidade do provedor/modelo em cada execução.
