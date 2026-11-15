export type ConversationTurnFixture = {
  message: string;
};

export function buildPruningFixtureTurns(): ConversationTurnFixture[] {
  return [
    { message: 'Decisão: incidente INC-A permanece aberto até validação do SRE.' },
    { message: 'Fato: cliente Acme confirmou prazo 2026-11-20 para retorno.' },
    { message: 'Pendência: atualizar runbook de billing até amanhã.' },
    { message: 'Incidente INC-A resolvido parcialmente, falta confirmação final.' },
    { message: 'Decisão: incidente INC-B será tratado pelo time de pagamentos.' },
    { message: 'Fato: preferência do cliente é comunicação por email.' },
    { message: 'Pendência: revisar alerta de latência do checkout.' },
    { message: 'Incidente INC-B aberto para investigação detalhada.' },
    { message: 'Mensagem de continuidade sem informação crítica 1.' },
    { message: 'Mensagem de continuidade sem informação crítica 2.' },
    { message: 'Mensagem de continuidade sem informação crítica 3.' },
    { message: 'Mensagem de continuidade sem informação crítica 4.' },
    { message: 'Mensagem de continuidade sem informação crítica 5.' },
  ];
}
