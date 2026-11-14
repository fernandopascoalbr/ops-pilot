# Research: Learning Reflection Memory

## Decision: Reflection output com decisão binária de aprendizado

Usar uma saída estruturada por mensagem com dois campos: indicador de aprendizado e fato destilado.

### Rationale

- Garante decisão explícita e auditável.
- Reduz ambiguidade entre “não aprender” e “aprender”.
- Facilita validação automática do fluxo de persistência assíncrona.

### Alternatives considered

- Extração livre em texto: rejeitada por baixa previsibilidade.
- Regras apenas por palavra-chave: rejeitada por baixa robustez semântica.

## Decision: Persistência assíncrona após resposta principal

A escrita da memória acontece em background após a resposta do chat.

### Rationale

- Preserva experiência do usuário sem bloquear resposta.
- Mantém separação entre geração da resposta e aprendizado contínuo.
- Permite fallback seguro em falha de persistência sem interromper o chat.

### Alternatives considered

- Persistência síncrona no caminho crítico: rejeitada por impacto de latência.

## Decision: Política de retenção segura

Nunca memorizar pedido pontual e nunca memorizar segredo/dado sensível.

### Rationale

- Alinha com segurança e privacidade definidas na spec.
- Evita ruído contextual e memórias de baixa utilidade.
- Reduz risco operacional e de compliance.

### Alternatives considered

- Permitir memorização com revisão posterior: rejeitada por risco de retenção indevida.

## Decision: Operação explícita forget_preference

Fornecer ferramenta de esquecimento para remover preferências aprendidas sob solicitação do usuário.

### Rationale

- Dá controle de ciclo de vida da memória ao usuário.
- Corrige preferências desatualizadas sem apagar histórico inteiro.
- Melhora confiança no sistema.

### Alternatives considered

- Limpeza global de memória por usuário: rejeitada por impacto excessivo.
- Sem ferramenta de esquecimento: rejeitada por ausência de controle do usuário.

## Decision: Expor ciclo de memória em endpoint HTTP dedicado

Manter um endpoint `/memories` para registrar, consultar e remover memórias sem depender exclusivamente do fluxo `/chat`.

### Rationale

- Permite validação operacional direta da camada de memória.
- Facilita testes de save/recall/forget de forma independente da resposta do agente.
- Reduz acoplamento entre observabilidade de memória e orquestração de estratégia.

### Alternatives considered

- Operar memória apenas por tool MCP: rejeitada por limitar validação via API HTTP principal.
- Operar memória apenas de forma implícita no `/chat`: rejeitada por baixa auditabilidade de operações de memória.
