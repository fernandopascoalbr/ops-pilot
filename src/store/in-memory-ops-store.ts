import type { Alert, Incident, IncidentFilter, OpsStore, Runbook, Service, Severity } from './ops-store.js';

const defaultServices: Service[] = [
  { id: 'svc-checkout', name: 'checkout', status: 'healthy', tier: 'core' },
  { id: 'svc-payments', name: 'payments', status: 'degraded', tier: 'core' },
  { id: 'svc-auth', name: 'auth', status: 'healthy', tier: 'core' },
  { id: 'svc-inventory', name: 'inventory', status: 'healthy', tier: 'standard' },
  { id: 'svc-notify', name: 'notify', status: 'healthy', tier: 'standard' },
];

const defaultAlerts: Alert[] = [
  { id: 'alert-1', title: 'Checkout queue latency spike', service: 'checkout', severity: 'high', status: 'firing', createdAt: '2026-11-03T08:00:00.000Z' },
  { id: 'alert-2', title: 'Payment retries above threshold', service: 'payments', severity: 'critical', status: 'firing', createdAt: '2026-11-03T08:03:00.000Z' },
  { id: 'alert-3', title: 'Auth error volume elevated', service: 'auth', severity: 'medium', status: 'firing', createdAt: '2026-11-03T08:07:00.000Z' },
  { id: 'alert-4', title: 'Inventory sync completed', service: 'inventory', severity: 'low', status: 'resolved', createdAt: '2026-11-03T07:15:00.000Z', resolvedAt: '2026-11-03T07:35:00.000Z' },
  { id: 'alert-5', title: 'Notification gateway recovered', service: 'notify', severity: 'medium', status: 'resolved', createdAt: '2026-11-03T07:22:00.000Z', resolvedAt: '2026-11-03T07:40:00.000Z' },
  { id: 'alert-6', title: 'Auth batch job cleared', service: 'auth', severity: 'low', status: 'resolved', createdAt: '2026-11-03T06:50:00.000Z', resolvedAt: '2026-11-03T07:10:00.000Z' },
];

const defaultRunbooks: Runbook[] = [
  { id: 'rb-checkout', service: 'checkout', title: 'Checkout recovery', summary: 'Rever fila e liberar retries', steps: ['Verificar fila de checkout', 'Revalidar limite de pagamento', 'Confirmar retry queue'], tier: 'core' },
  { id: 'rb-payments', service: 'payments', title: 'Payments runbook', summary: 'Mitigar processamento de pagamentos', steps: ['Avaliar retries', 'Confirmar status do gateway', 'Escalar equipe de plataforma'], tier: 'core' },
  { id: 'rb-auth', service: 'auth', title: 'Auth rollback', summary: 'Restabelecer autenticação', steps: ['Verificar latência do provider', 'Reverter deploy problemático', 'Confirmar tokens válidos'], tier: 'core' },
];

export class InMemoryOpsStore implements OpsStore {
  private _services: Service[] = [...defaultServices];
  private _alerts: Alert[] = [...defaultAlerts];
  private _incidents: Incident[] = [];
  private _runbooks: Runbook[] = [...defaultRunbooks];

  get services(): Service[] { return [...this._services]; }
  get alerts(): Alert[] { return [...this._alerts]; }
  get incidents(): Incident[] { return [...this._incidents]; }
  get runbooks(): Runbook[] { return [...this._runbooks]; }

  seed() {
    this._services = [...defaultServices];
    this._alerts = [...defaultAlerts];
    this._incidents = [];
    this._runbooks = [...defaultRunbooks];

    return {
      services: [...this._services],
      alerts: [...this._alerts],
      incidents: [...this._incidents],
      runbooks: [...this._runbooks],
    };
  }

  listAlerts(status: 'firing' | 'resolved' | 'all' = 'firing'): Alert[] {
    if (status === 'all') {
      return [...this._alerts];
    }
    return this._alerts.filter((alert) => alert.status === status);
  }

  listIncidents(filter: IncidentFilter = 'open'): Incident[] {
    if (filter === 'all') {
      return [...this._incidents];
    }
    return this._incidents.filter((incident) => incident.status === filter);
  }

  openIncident(input: { title: string; service: string; severity: Severity; summary?: string | null }): Incident {
    const incident: Incident = {
      id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: input.title,
      service: input.service,
      severity: input.severity,
      status: 'open',
      openedAt: new Date().toISOString(),
      resolvedAt: null,
      summary: input.summary ?? null,
    };

    this._incidents.push(incident);
    return { ...incident };
  }

  resolveIncident(id: string): Incident | null {
    const incident = this._incidents.find((item) => item.id === id);
    if (!incident) {
      return null;
    }

    incident.status = 'resolved';
    incident.resolvedAt = new Date().toISOString();

    const firingAlert = this._alerts.find((alert) => alert.service === incident.service && alert.status === 'firing');
    if (firingAlert) {
      firingAlert.status = 'resolved';
      firingAlert.resolvedAt = incident.resolvedAt;
    }

    return { ...incident };
  }

  consultarRunbook(service: string): Runbook | null {
    return this._runbooks.find((runbook) => runbook.service === service) ?? null;
  }
}
