import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, catchError, of, switchMap, timeout, timer } from 'rxjs';
import { environment } from '../../environments/environment';

export type HealthStatus = 'probing' | 'ready' | 'waking' | 'down';

interface HealthResponse {
  status?: string;
  components?: Record<string, { status?: string }>;
}

interface RuntimeConfig {
  apiBaseUrl?: string;
}

interface RuntimeWindow extends Window {
  __dartScorerConfig?: RuntimeConfig;
}

const PROBE_TIMEOUT_MS = 35_000;
const POLL_INTERVAL_READY_MS = 60_000;
const POLL_INTERVAL_WAKING_MS = 3_000;
const POLL_INTERVAL_DOWN_MS = 15_000;
/** Allow cold starts (Render/Neon) without flipping to Offline prematurely. */
const WAKING_DEADLINE_MS = 600_000;

function parseHealthPayload(raw: unknown): HealthResponse {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as HealthResponse;
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as HealthResponse;
    } catch {
      return {};
    }
  }
  return {};
}

function dbComponentStatus(components: Record<string, { status?: string }>): string | undefined {
  const db =
    components['db'] ??
    components['jdbc'] ??
    components['dataSource'] ??
    components['datasource'];
  return db?.status;
}

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly apiBaseUrl = this.resolveApiBaseUrl();

  private readonly statusSignal = signal<HealthStatus>('probing');
  private readonly apiUpSignal = signal(false);
  private readonly dbUpSignal = signal(false);
  private readonly lastCheckedAtSignal = signal<Date | null>(null);
  private wakingSince: number | null = null;
  private currentSub: Subscription | null = null;

  readonly status = this.statusSignal.asReadonly();
  readonly apiUp = this.apiUpSignal.asReadonly();
  readonly dbUp = this.dbUpSignal.asReadonly();
  readonly lastCheckedAt = this.lastCheckedAtSignal.asReadonly();
  readonly isReady = computed(() => this.statusSignal() === 'ready');

  start(): void {
    if (this.currentSub) return;
    this.scheduleNext(0);
  }

  private scheduleNext(delayMs: number): void {
    if (this.currentSub) {
      this.currentSub.unsubscribe();
      this.currentSub = null;
    }
    this.currentSub = timer(delayMs)
      .pipe(
        switchMap(() => this.probe()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((nextStatus) => {
        this.applyResult(nextStatus);
      });
  }

  private probe() {
    return this.http
      .get<HealthResponse>(`${this.apiBaseUrl}/actuator/health`, {
        observe: 'response',
      })
      .pipe(
        timeout(PROBE_TIMEOUT_MS),
        switchMap((response) => {
          const body = parseHealthPayload(response.body);
          const components = body.components ?? {};
          const apiUp = (body.status ?? '').toUpperCase() === 'UP';
          const dbStatus = dbComponentStatus(components);
          const dbUp = dbStatus ? dbStatus.toUpperCase() === 'UP' : apiUp;
          this.apiUpSignal.set(apiUp);
          this.dbUpSignal.set(dbUp);
          if (apiUp && dbUp) return of<HealthStatus>('ready');
          return of<HealthStatus>('down');
        }),
        catchError((err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status >= 400 && err.status < 600) {
            const body = parseHealthPayload(err.error);
            const status = (body.status ?? '').toUpperCase();
            if (status === 'DOWN' || status === 'OUT_OF_SERVICE') {
              const components = body.components ?? {};
              const dbStatus = dbComponentStatus(components);
              const dbUp = dbStatus ? dbStatus.toUpperCase() === 'UP' : false;
              this.apiUpSignal.set(true);
              this.dbUpSignal.set(dbUp);
              return of<HealthStatus>('down');
            }
          }
          this.apiUpSignal.set(false);
          this.dbUpSignal.set(false);
          return of<HealthStatus>('waking');
        }),
      );
  }

  private applyResult(next: HealthStatus): void {
    this.lastCheckedAtSignal.set(new Date());
    if (next === 'ready') {
      this.wakingSince = null;
      this.statusSignal.set('ready');
      this.scheduleNext(POLL_INTERVAL_READY_MS);
      return;
    }

    if (next === 'down') {
      this.wakingSince = null;
      this.statusSignal.set('down');
      this.scheduleNext(POLL_INTERVAL_DOWN_MS);
      return;
    }

    const now = Date.now();
    if (this.wakingSince === null) {
      this.wakingSince = now;
    }
    if (now - this.wakingSince >= WAKING_DEADLINE_MS) {
      this.wakingSince = null;
      this.statusSignal.set('down');
      this.scheduleNext(POLL_INTERVAL_DOWN_MS);
      return;
    }
    this.statusSignal.set('waking');
    this.scheduleNext(POLL_INTERVAL_WAKING_MS);
  }

  private resolveApiBaseUrl(): string {
    const runtime = (window as RuntimeWindow).__dartScorerConfig?.apiBaseUrl;
    return (runtime ?? environment.apiBaseUrl).replace(/\/+$/, '');
  }
}
