import { z } from 'zod';

export const severitySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const alertStatusSchema = z.enum(['firing', 'resolved']);
export const incidentStatusSchema = z.enum(['open', 'resolved']);

export const alertSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  service: z.string().min(1),
  severity: severitySchema,
  status: alertStatusSchema,
  createdAt: z.string(),
  resolvedAt: z.string().nullable().optional(),
});

export const incidentSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  service: z.string().min(1),
  severity: severitySchema,
  status: incidentStatusSchema,
  openedAt: z.string(),
  resolvedAt: z.string().nullable().optional(),
});

export type Severity = z.infer<typeof severitySchema>;
export type AlertStatus = z.infer<typeof alertStatusSchema>;
export type IncidentStatus = z.infer<typeof incidentStatusSchema>;
