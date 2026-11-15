#!/usr/bin/env bash
set -euo pipefail

CHAT_URL="${CHAT_URL:-http://localhost:3000/chat}"
STRATEGY="${STRATEGY:-react}"
USER_ID="${USER_ID:-long-conversation-user}"

messages=(
  "Analise os alertas ativos do plantão."
  "Quais serviços estão com maior risco?"
  "Sugira próxima ação para reduzir impacto."
  "Atualize o plano com base no histórico."
  "Liste os pontos de atenção para o próximo turno."
)

if [[ "$#" -gt 0 ]]; then
  messages=("$@")
fi

conversation_id=""
turn=0

for message in "${messages[@]}"; do
  turn=$((turn + 1))

  payload="$(node -e '
    const [message, strategy, userId, conversationId] = process.argv.slice(1);
    const body = { message, strategy, userId };
    if (conversationId) body.conversationId = conversationId;
    process.stdout.write(JSON.stringify(body));
  ' "$message" "$STRATEGY" "$USER_ID" "$conversation_id")"

  response_file="$(mktemp)"
  http_code="$(curl -sS -o "$response_file" -w "%{http_code}" \
    -H "content-type: application/json" \
    -X POST "$CHAT_URL" \
    -d "$payload")"

  body="$(cat "$response_file")"
  rm -f "$response_file"

  if [[ "$http_code" != "200" ]]; then
    echo "Turno ${turn}: erro HTTP ${http_code}" >&2
    echo "$body" >&2
    exit 1
  fi

  parsed="$(printf '%s' "$body" | node -e '
    const fs = require("node:fs");
    const raw = fs.readFileSync(0, "utf8");
    const json = JSON.parse(raw);
    const promptTokens = json?.metrics?.promptTokens;
    const conversationId = json?.conversationId ?? "";
    process.stdout.write(`${conversationId}\t${promptTokens === null || promptTokens === undefined ? "null" : String(promptTokens)}`);
  ')"

  conversation_id="${parsed%%$'\t'*}"
  prompt_tokens="${parsed#*$'\t'}"
  echo "Turno ${turn}: promptTokens=${prompt_tokens}"
done
