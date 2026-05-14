import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  GameListItemDto,
  GameListPlayerDto,
  HistoryApiService,
  HistoryListQuery,
  HistorySortDir,
  HistorySortField,
} from '../../services/history-api.service';
import { getPlayerColor } from '../../theme/player-colors';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const DEFAULT_PAGE_SIZE = 5;
const PAGE_SIZE_OPTIONS = [5, 10, 50, 100] as const;
const DEFAULT_SORT: HistorySortField = 'date';
const DEFAULT_DIR: HistorySortDir = 'desc';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './history.component.html',
  styleUrl: './history.component.css',
})
export class HistoryComponent implements OnInit {
  private readonly api = inject(HistoryApiService);

  readonly state = signal<LoadState>('idle');
  readonly items = signal<readonly GameListItemDto[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly pageSize = signal<number>(DEFAULT_PAGE_SIZE);
  readonly errorMsg = signal<string | null>(null);

  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  readonly sort = signal<HistorySortField>(DEFAULT_SORT);
  readonly dir = signal<HistorySortDir>(DEFAULT_DIR);

  // Filters - applied on submit/Apply, not on every keystroke.
  readonly fromDate = signal<string | null>(null);
  readonly toDate = signal<string | null>(null);
  readonly winnerLike = signal<string | null>(null);
  readonly playerLike = signal<string | null>(null);
  readonly minDurationMin = signal<number | null>(null);
  readonly maxDurationMin = signal<number | null>(null);
  readonly minRounds = signal<number | null>(null);
  readonly maxRounds = signal<number | null>(null);

  readonly totalPages = computed(() => {
    const total = this.total();
    const size = this.pageSize();
    if (total <= 0 || size <= 0) return 0;
    return Math.ceil(total / size);
  });
  readonly hasNext = computed(() => (this.page() + 1) * this.pageSize() < this.total());
  readonly hasPrev = computed(() => this.page() > 0);
  readonly isEmpty = computed(() => this.state() === 'ready' && this.items().length === 0);

  ngOnInit(): void {
    this.load(0);
  }

  load(page: number): void {
    this.state.set('loading');
    this.errorMsg.set(null);
    this.api.listGames(this.buildQuery(page)).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.total.set(res.total);
        this.page.set(res.page);
        this.pageSize.set(res.pageSize);
        this.state.set('ready');
      },
      error: (err: unknown) => {
        this.errorMsg.set(this.formatError(err));
        this.state.set('error');
      },
    });
  }

  next(): void {
    if (this.hasNext()) this.load(this.page() + 1);
  }

  prev(): void {
    if (this.hasPrev()) this.load(this.page() - 1);
  }

  retry(): void {
    this.load(this.page());
  }

  applyFilters(): void {
    this.load(0);
  }

  resetFilters(): void {
    this.sort.set(DEFAULT_SORT);
    this.dir.set(DEFAULT_DIR);
    this.pageSize.set(DEFAULT_PAGE_SIZE);
    this.fromDate.set(null);
    this.toDate.set(null);
    this.winnerLike.set(null);
    this.playerLike.set(null);
    this.minDurationMin.set(null);
    this.maxDurationMin.set(null);
    this.minRounds.set(null);
    this.maxRounds.set(null);
    this.load(0);
  }

  onPageSizeChange(value: number): void {
    if (!Number.isFinite(value) || value <= 0) return;
    this.pageSize.set(value);
    this.load(0);
  }

  onSortChange(value: string): void {
    const allowed: readonly HistorySortField[] = [
      'date',
      'duration',
      'rounds',
      'throws',
      'winner',
      'players',
    ];
    const next = allowed.find((f) => f === value) ?? DEFAULT_SORT;
    this.sort.set(next);
    this.load(0);
  }

  onDirToggle(): void {
    this.dir.set(this.dir() === 'asc' ? 'desc' : 'asc');
    this.load(0);
  }

  onTextInput(target: 'winner' | 'player', value: string): void {
    const trimmed = value.trim();
    const sig = target === 'winner' ? this.winnerLike : this.playerLike;
    sig.set(trimmed === '' ? null : value);
  }

  onDateInput(target: 'from' | 'to', value: string): void {
    const sig = target === 'from' ? this.fromDate : this.toDate;
    sig.set(value || null);
  }

  onNumberInput(
    target: 'minDuration' | 'maxDuration' | 'minRounds' | 'maxRounds',
    value: string,
  ): void {
    const parsed = value === '' ? null : Number(value);
    const sig =
      target === 'minDuration'
        ? this.minDurationMin
        : target === 'maxDuration'
        ? this.maxDurationMin
        : target === 'minRounds'
        ? this.minRounds
        : this.maxRounds;
    sig.set(parsed === null || !Number.isFinite(parsed) ? null : parsed);
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return iso;
    const pad2 = (n: number) => String(n).padStart(2, '0');
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} - ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  formatDuration(seconds: number | null): string {
    if (seconds === null || seconds <= 0) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  }

  playerColor(p: GameListPlayerDto): string {
    return getPlayerColor(p.color).accent;
  }

  trackById(_index: number, item: GameListItemDto): string {
    return item.gameId;
  }

  private buildQuery(page: number): HistoryListQuery {
    return {
      page,
      pageSize: this.pageSize(),
      sort: this.sort(),
      dir: this.dir(),
      from: this.fromDate(),
      to: this.toDate(),
      winner: this.winnerLike(),
      player: this.playerLike(),
      minDuration: this.minDurationMin(),
      maxDuration: this.maxDurationMin(),
      minRounds: this.minRounds(),
      maxRounds: this.maxRounds(),
    };
  }

  private formatError(err: unknown): string {
    if (err instanceof Error) return err.message;
    return 'Failed to load games.';
  }
}
