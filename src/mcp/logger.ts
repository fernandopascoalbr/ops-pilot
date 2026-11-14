export function logToStderr(message: string): void {
  process.stderr.write(`[incidentarena-mcp] ${message}\n`);
}

export function logErrorToStderr(message: string, error: unknown): void {
  const details = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[incidentarena-mcp] ${message}: ${details}\n`);
}
