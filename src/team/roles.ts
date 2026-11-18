import { z } from 'zod';

export const teamRoleValues = ['supervisor', 'analista', 'planejador', 'executor', 'analyst', 'planner', 'done'] as const;
export type TeamRole = (typeof teamRoleValues)[number];

export type RoleAction = 'read' | 'write' | 'plan' | 'tool' | 'incident';

export const normalizedSupervisorNextValues = ['analista', 'planejador', 'executor', 'done'] as const;
export type SupervisorNextValue = (typeof normalizedSupervisorNextValues)[number];

export const teamRoleSchema = z.enum(['supervisor', 'analyst', 'planner', 'executor', 'analista', 'planejador']);
export const supervisorNextSchema = z.object({
  next: z.enum(['analista', 'planejador', 'executor', 'done']),
  brief: z.string().min(1).describe('instrução de trabalho para o próximo papel (nó) ou resumo final se done'),
});

export function normalizeRoleName(role: string): TeamRole {
  const normalized = role.trim().toLowerCase();

  if (normalized === 'analyst' || normalized === 'analista') {
    return 'analista';
  }

  if (normalized === 'planner' || normalized === 'planejador') {
    return 'planejador';
  }

  if (normalized === 'executor') {
    return 'executor';
  }

  if (normalized === 'supervisor') {
    return 'supervisor';
  }

  if (normalized === 'done') {
    return 'done';
  }

  return 'supervisor';
}

export function canRolePerform(role: string, action: RoleAction): boolean {
  const normalized = normalizeRoleName(role);

  if (action === 'read') {
    return ['supervisor', 'analista', 'planejador', 'executor'].includes(normalized);
  }

  if (action === 'write') {
    return normalized === 'supervisor';
  }

  if (action === 'plan') {
    return ['supervisor', 'planejador'].includes(normalized);
  }

  if (action === 'tool') {
    return normalized === 'supervisor';
  }

  if (action === 'incident') {
    return normalized === 'executor';
  }

  return false;
}

export function roleLabel(role: string): string {
  switch (normalizeRoleName(role)) {
    case 'analista':
      return 'analista';
    case 'planejador':
      return 'planejador';
    case 'executor':
      return 'executor';
    case 'supervisor':
      return 'supervisor';
    case 'done':
      return 'done';
    default:
      return 'supervisor';
  }
}

export function isSupervisorDecision(next: string): next is SupervisorNextValue {
  return normalizedSupervisorNextValues.includes(normalizeRoleName(next) as SupervisorNextValue);
}
