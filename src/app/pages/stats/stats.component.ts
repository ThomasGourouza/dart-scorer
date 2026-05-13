import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  PlayerStatsDto,
  PlayerSummaryDto,
  StatsApiService,
} from '../../services/stats-api.service';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.css',
})
export class StatsComponent implements OnInit {
  private readonly api = inject(StatsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly playersState = signal<LoadState>('idle');
  readonly statsState = signal<LoadState>('idle');
  readonly errorMsg = signal<string | null>(null);

  readonly players = signal<readonly PlayerSummaryDto[]>([]);
  readonly selectedName = signal<string | null>(null);
  readonly stats = signal<PlayerStatsDto | null>(null);

  readonly searchQuery = signal('');
  readonly fromDate = signal<string | null>(null);
  readonly toDate = signal<string | null>(null);
  readonly variantFilter = signal<number | null>(null);

  readonly filteredPlayers = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.players();
    if (!q) return list;
    return list.filter((p) => p.playerName.toLowerCase().includes(q));
  });

  readonly hasPlayers = computed(() => this.players().length > 0);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const name = params.get('name');
    const from = params.get('from');
    const to = params.get('to');
    const variantRaw = params.get('variant');
    const variant = variantRaw ? Number(variantRaw) : null;

    if (from) this.fromDate.set(from);
    if (to) this.toDate.set(to);
    if (variant && Number.isFinite(variant)) this.variantFilter.set(variant);

    this.loadPlayers(name);
  }

  loadPlayers(autoSelectName: string | null = null): void {
    this.playersState.set('loading');
    this.api.listPlayers().subscribe({
      next: (res) => {
        this.players.set(res.players);
        this.playersState.set('ready');
        const target = autoSelectName ?? res.players[0]?.playerName ?? null;
        if (target) this.selectPlayer(target);
      },
      error: (err: unknown) => {
        this.errorMsg.set(this.formatError(err));
        this.playersState.set('error');
      },
    });
  }

  selectPlayer(name: string): void {
    this.selectedName.set(name);
    this.syncUrl();
    this.loadStats();
  }

  applyFilters(): void {
    this.syncUrl();
    if (this.selectedName()) this.loadStats();
  }

  resetFilters(): void {
    this.fromDate.set(null);
    this.toDate.set(null);
    this.variantFilter.set(null);
    this.applyFilters();
  }

  retry(): void {
    if (this.playersState() === 'error') this.loadPlayers(this.selectedName());
    else if (this.selectedName()) this.loadStats();
  }

  private loadStats(): void {
    const name = this.selectedName();
    if (!name) return;
    this.statsState.set('loading');
    this.api
      .getPlayerStats(name, {
        from: this.fromDate(),
        to: this.toDate(),
        variant: this.variantFilter(),
      })
      .subscribe({
        next: (res) => {
          this.stats.set(res);
          this.statsState.set('ready');
        },
        error: (err: unknown) => {
          this.errorMsg.set(this.formatError(err));
          this.statsState.set('error');
        },
      });
  }

  private syncUrl(): void {
    const queryParams = {
      name: this.selectedName(),
      from: this.fromDate(),
      to: this.toDate(),
      variant: this.variantFilter() ?? null,
    };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  onFromChange(value: string): void {
    this.fromDate.set(value || null);
  }

  onToChange(value: string): void {
    this.toDate.set(value || null);
  }

  onVariantChange(value: string): void {
    if (!value) {
      this.variantFilter.set(null);
      return;
    }
    const n = Number(value);
    this.variantFilter.set(Number.isFinite(n) ? n : null);
  }

  pct(n: number): string {
    return `${(n * 100).toFixed(1)}%`;
  }

  num(n: number, digits = 2): string {
    return Number.isFinite(n) ? n.toFixed(digits) : '-';
  }

  formatDate(iso: string | null): string {
    if (!iso) return '-';
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return iso;
    const pad2 = (n: number) => String(n).padStart(2, '0');
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  formatSector(s: { base: number; multiplier: number } | null): string {
    if (!s) return '-';
    if (s.base === 0) return 'Miss';
    if (s.base === 50) return 'Bull (50)';
    if (s.base === 25) return 'Outer bull (25)';
    return `${s.base} ×${s.multiplier}`;
  }

  private formatError(err: unknown): string {
    if (err instanceof Error) return err.message;
    return 'Failed to load stats.';
  }
}
