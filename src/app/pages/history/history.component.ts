import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  GameListItemDto,
  GameListPlayerDto,
  HistoryApiService,
} from '../../services/history-api.service';
import { getPlayerColor } from '../../theme/player-colors';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const PAGE_SIZE = 20;

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
  readonly pageSize = signal(PAGE_SIZE);
  readonly errorMsg = signal<string | null>(null);

  readonly hasNext = computed(() => (this.page() + 1) * this.pageSize() < this.total());
  readonly hasPrev = computed(() => this.page() > 0);
  readonly isEmpty = computed(() => this.state() === 'ready' && this.items().length === 0);

  ngOnInit(): void {
    this.load(0);
  }

  load(page: number): void {
    this.state.set('loading');
    this.errorMsg.set(null);
    this.api.listGames(page, this.pageSize()).subscribe({
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

  private formatError(err: unknown): string {
    if (err instanceof Error) return err.message;
    return 'Failed to load games.';
  }
}
