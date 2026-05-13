import { Component, computed, inject } from '@angular/core';
import { HealthService, HealthStatus } from '../../services/health.service';

@Component({
  selector: 'app-status-pill',
  standalone: true,
  templateUrl: './status-pill.component.html',
  styleUrl: './status-pill.component.css',
})
export class StatusPillComponent {
  private readonly health = inject(HealthService);

  readonly status = this.health.status;
  readonly apiUp = this.health.apiUp;
  readonly dbUp = this.health.dbUp;
  readonly lastCheckedAt = this.health.lastCheckedAt;

  readonly label = computed<string>(() => this.labelFor(this.status()));
  readonly tooltip = computed<string>(() => {
    const api = this.apiUp() ? 'up' : 'down';
    const db = this.dbUp() ? 'up' : 'down';
    const ts = this.lastCheckedAt();
    const stamp = ts ? this.formatTime(ts) : '...';
    return `API: ${api} \u00B7 DB: ${db} \u00B7 checked ${stamp}`;
  });

  private labelFor(status: HealthStatus): string {
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'waking':
        return 'Waking up...';
      case 'down':
        return 'Offline';
      case 'probing':
      default:
        return 'Checking...';
    }
  }

  private formatTime(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
}
