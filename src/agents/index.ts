import { planAndExecuteStrategy } from './plan-and-execute.js';
import { reactStrategy } from './react.js';
import { reflectPlanAndExecuteStrategy } from './reflect-plan-and-execute.js';
import { createTraceEvent } from './trace.js';
import type { ReasoningStrategy } from '../domain/strategy.js';

export type StrategyRegistry = Record<string, ReasoningStrategy>;

export class UnknownStrategyError extends Error {
  readonly strategyName: string;

  constructor(strategyName: string) {
    super(`Estratégia desconhecida: ${strategyName}`);
    this.name = 'UnknownStrategyError';
    this.strategyName = strategyName;
  }
}

export const defaultStrategyRegistry: StrategyRegistry = {
  react: reactStrategy,
  'plan-and-execute': planAndExecuteStrategy,
  'reflect-plan-and-execute': reflectPlanAndExecuteStrategy,
};

export function withReflection(strategy: ReasoningStrategy): ReasoningStrategy {
  return {
    name: `${strategy.name}-with-reflection`,
    async run(input, maxIterations) {
      const result = await strategy.run(input, maxIterations);
      const reflectionTrace = createTraceEvent('critique', `REFLECTION WRAPPER: avaliação adicional aplicada na estratégia ${strategy.name}.`);
      return {
        ...result,
        trace: [...result.trace, reflectionTrace],
      };
    },
  };
}

export function resolveStrategy(
  strategyName: string | undefined,
  options: { reflect?: boolean; registry?: StrategyRegistry } = {},
): ReasoningStrategy {
  const registry = options.registry ?? defaultStrategyRegistry;
  const resolvedName = strategyName ?? 'react';
  const strategy = registry[resolvedName];

  if (!strategy) {
    throw new UnknownStrategyError(resolvedName);
  }

  return options.reflect ? withReflection(strategy) : strategy;
}

