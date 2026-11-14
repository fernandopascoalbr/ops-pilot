import { once } from 'node:events';
import { createServer, type ChatServerOptions } from '../../src/http/server.js';

export async function postChat(
  body: Record<string, unknown>,
  options: ChatServerOptions = {},
): Promise<{ status: number; body: any }> {
  const server = createServer(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Unable to resolve test server address');
  }

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/chat`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    return {
      status: response.status,
      body: json,
    };
  } finally {
    server.close();
    await once(server, 'close');
  }
}

