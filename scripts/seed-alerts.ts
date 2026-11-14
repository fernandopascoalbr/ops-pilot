import { seedStore, store } from '../src/infra/store.js';

seedStore();
console.log('Seeded store with 5 services and 6 alerts.');
console.log(JSON.stringify({
  services: store.services.length,
  alerts: store.alerts.length,
  firing: store.alerts.filter((alert) => alert.status === 'firing').length,
  resolved: store.alerts.filter((alert) => alert.status === 'resolved').length,
}, null, 2));
