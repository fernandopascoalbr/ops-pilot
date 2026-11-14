export function logToStderr(message: string): void {
  process.stderr.write(`[opspilot-mcp] ${message}\n`);
}

export function logErrorToStderr(message: string, error: unknown): void {
  const details = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[opspilot-mcp] ${message}: ${details}\n`);
}
