import { seedStore } from './infra/store.js';
import { createServer } from './http/server.js';

function main() {
  seedStore();
  const port = Number(process.env.PORT ?? 3000);
  const server = createServer();

  server.listen(port, () => {
    console.log(`OpsPilot HTTP server running on port ${port}`);
  });
}

main();
