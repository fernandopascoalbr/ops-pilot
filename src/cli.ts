import { argv } from 'node:process';
import { seedStore } from './infra/store.js';

seedStore();
console.log('IncidentArena CLI ready. Use `tsx src/arena.ts --strategies react,plan-and-execute --max-iterations 8`');
console.log('Reflect strategy: `npm run reflect:plan-and-execute -- --input "Analise os alertas ativos" --max-iterations 4`');
console.log('Received args:', argv.slice(2));
