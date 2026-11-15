import { z } from 'zod';
import { createModel } from '../agents/model.js';
import { createTraceEvent } from '../agents/trace.js';
import type { TraceEvent } from '../domain/strategy.js';

export const routeDecisionSchema = z.object({
  route: z.enum(['react', 'planExecute', 'reflect']),
  reason: z.string().min(1).describe('uma frase justificando a escolha'),
});

export type RouteDecision = z.infer<typeof routeDecisionSchema>;
export type RouteValue = RouteDecision['route'];

export function mapRouteToStrategy(route: RouteValue): string {
  if (route === 'planExecute') {
    return 'plan-and-execute';
  }
  if (route === 'reflect') {
    return 'reflect-plan-and-execute';
  }
  return 'react';
}

export function inferRouteFromInput(input: string): RouteValue {
  const normalized = input.toLowerCase();

  if (
    normalized.includes('reflet')
    || normalized.includes('replanejar')
    || normalized.includes('conflito')
    || normalized.includes('risco')
    || normalized.includes('incerteza')
  ) {
    return 'reflect';
  }

  if (
    normalized.includes('plano')
    || normalized.includes('passo')
    || normalized.includes('execucao')
    || normalized.includes('executar')
    || normalized.includes('investigue')
    || normalized.includes('resolver')
  ) {
    return 'planExecute';
  }

  return 'react';
}

export function routeForStrategy(strategyName: string | undefined): { route: RouteValue; strategyName: string; reason: string; trace: TraceEvent[] } {
  const normalizedName = (strategyName ?? 'react').trim().toLowerCase();

  if (normalizedName === 'plan-and-execute' || normalizedName === 'planexecute' || normalizedName === 'plan_execute') {
    return {
      route: 'planExecute',
      strategyName: 'plan-and-execute',
      reason: 'A estratégia foi escolhida explicitamente como execução planejada com passos claros.',
      trace: [createTraceEvent('route', 'Rota escolhida: planExecute', {
        node: 'roteador',
        route: 'planExecute',
        reason: 'A estratégia foi escolhida explicitamente como execução planejada com passos claros.',
        args: { source: 'explicit', strategy: strategyName ?? 'plan-and-execute' },
      })],
    };
  }

  if (normalizedName === 'reflect-plan-and-execute' || normalizedName === 'reflect' || normalizedName === 'reflect-plan') {
    return {
      route: 'reflect',
      strategyName: 'reflect-plan-and-execute',
      reason: 'A estratégia foi escolhida explicitamente para reflexão e revisão crítica do plano.',
      trace: [createTraceEvent('route', 'Rota escolhida: reflect', {
        node: 'roteador',
        route: 'reflect',
        reason: 'A estratégia foi escolhida explicitamente para reflexão e revisão crítica do plano.',
        args: { source: 'explicit', strategy: strategyName ?? 'reflect-plan-and-execute' },
      })],
    };
  }

  return {
    route: 'react',
    strategyName: 'react',
    reason: 'A estratégia foi escolhida explicitamente como resposta reativa e direta ao contexto atual.',
    trace: [createTraceEvent('route', 'Rota escolhida: react', {
      node: 'roteador',
      route: 'react',
      reason: 'A estratégia foi escolhida explicitamente como resposta reativa e direta ao contexto atual.',
      args: { source: 'explicit', strategy: strategyName ?? 'react' },
    })],
  };
}

export async function routeRequest(input: string): Promise<{ route: RouteValue; strategyName: string; reason: string; trace: TraceEvent[] }> {
  const fallbackRoute = inferRouteFromInput(input);
  const fallbackReason =
    fallbackRoute === 'planExecute'
      ? 'O contexto pede uma execução em etapas com planejamento explícito.'
      : fallbackRoute === 'reflect'
        ? 'O contexto sugere revisão crítica e ajuste do plano antes de responder.'
        : 'O contexto indica uma resposta direta e reativa, sem necessidade de plano longo.';

  try {
    const veredict = await createModel().withStructuredOutput(routeDecisionSchema).invoke([
      ['system', 'Você decide qual caminho de resposta melhor atende ao contexto operacional.'],
      ['user', input],
    ]);

    const resolvedRoute = veredict.route ?? fallbackRoute;
    const resolvedReason = veredict.reason?.trim() || fallbackReason;

    return {
      route: resolvedRoute,
      strategyName: mapRouteToStrategy(resolvedRoute),
      reason: resolvedReason,
      trace: [
        createTraceEvent('route', `Rota escolhida: ${resolvedRoute}`, {
          node: 'roteador',
          route: resolvedRoute,
          reason: resolvedReason,
          args: { source: 'llm', inputLength: input.length },
        }),
      ],
    };
  } catch {
    return {
      route: fallbackRoute,
      strategyName: mapRouteToStrategy(fallbackRoute),
      reason: fallbackReason,
      trace: [
        createTraceEvent('route', `Rota escolhida: ${fallbackRoute}`, {
          node: 'roteador',
          route: fallbackRoute,
          reason: fallbackReason,
          args: { source: 'heuristic', inputLength: input.length },
        }),
      ],
    };
  }
}
