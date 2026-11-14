export type ServiceTier = 'core' | 'standard' | 'edge';
export type ServiceStatus = 'healthy' | 'degraded';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'firing' | 'resolved';
export type IncidentStatus = 'open' | 'resolved';
export type IncidentFilter = 'open' | 'resolved' | 'all';

export type Service = {
  id: string;
  name: string;
  status: ServiceStatus;
  tier: ServiceTier;
};

export type Alert = {
  id: string;
  title: string;
  service: string;
  severity: Severity;
  status: AlertStatus;
  createdAt: string;
  resolvedAt?: string | null;
};

export type Incident = {
  id: string;
  title: string;
  service: string;
  severity: Severity;
  status: IncidentStatus;
  openedAt: string;
  resolvedAt?: string | null;
  summary?: string | null;
};

export type Runbook = {
  id: string;
  service: string;
  title: string;
  summary: string;
  steps: string[];
  tier: ServiceTier;
};

export interface OpsStore {
  readonly services: Service[];
  readonly alerts: Alert[];
  readonly incidents: Incident[];
  readonly runbooks: Runbook[];

  seed(): { services: Service[]; alerts: Alert[]; incidents: Incident[]; runbooks: Runbook[] };
  listAlerts(status?: 'firing' | 'resolved' | 'all'): Alert[];
  listIncidents(filter?: IncidentFilter): Incident[];
  openIncident(input: { title: string; service: string; severity: Severity; summary?: string | null }): Incident;
  resolveIncident(id: string): Incident | null;
  consultarRunbook(service: string): Runbook | null;
}
