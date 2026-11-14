#!/usr/bin/env node
import { reactStrategy } from './agents/react.js';
import { planAndExecuteStrategy } from './agents/plan-and-execute.js';
import { reflectPlanAndExecuteStrategy } from './agents/reflect-plan-and-execute.js';
import { formatTrace } from './agents/trace.js';

function parseArgs(argv: string[]) {
  const parsed: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[index + 1] : 'true';
    parsed[key] = value;
    if (value !== 'true' && argv[index + 1] && !argv[index + 1].startsWith('--')) {
      index += 1;
    }
  }
  return parsed;
}

const args = parseArgs(process.argv.slice(2));
const strategies = (args['strategies'] ?? 'react,plan-and-execute').split(',').map((entry) => entry.trim()).filter(Boolean);
const maxIterations = Number(args['max-iterations'] ?? 8);
const input = args['input'] ?? 'Analise os alertas ativos e proponha a próxima ação de resposta.';

const strategyMap = {
  react: reactStrategy,
  'plan-and-execute': planAndExecuteStrategy,
  'reflect-plan-and-execute': reflectPlanAndExecuteStrategy,
};

for (const strategyName of strategies) {
  const strategy = strategyMap[strategyName as keyof typeof strategyMap];
  if (!strategy) {
    console.error(`Estratégia desconhecida: ${strategyName}`);
    process.exitCode = 1;
    continue;
  }

  const result = await strategy.run(input, maxIterations);
  console.log(`\n=== ${strategy.name} ===`);
  console.log(result.answer);
  console.log('\nTrace:\n' + formatTrace(result.trace));
  console.log('\nMetrics: ' + JSON.stringify(result.metrics, null, 2));
}
