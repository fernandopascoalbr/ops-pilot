import { once } from 'node:events';
import { SqliteConversationStore } from '../../src/chat/sqlite-conversation-store.js';
import { createServer, type ChatServerOptions } from '../../src/http/server.js';

export async function startTestServer(options: ChatServerOptions = {}): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
}> {
  const server = createServer({
    ...options,
    conversationStore: options.conversationStore ?? new SqliteConversationStore(':memory:'),
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Unable to resolve test server address');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      server.close();
      await once(server, 'close');
    },
  };
}

export async function requestJson(
  path: string,
  method: string,
  body: Record<string, unknown> | undefined,
  options: ChatServerOptions = {},
): Promise<{ status: number; body: any }> {
  const server = await startTestServer(options);

  try {
    const response = await fetch(`${server.baseUrl}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await response.json();
    return {
      status: response.status,
      body: json,
    };
  } finally {
    await server.close();
  }
}

export async function postChat(
  body: Record<string, unknown>,
  options: ChatServerOptions = {},
): Promise<{ status: number; body: any }> {
  return requestJson('/chat', 'POST', body, options);
}

