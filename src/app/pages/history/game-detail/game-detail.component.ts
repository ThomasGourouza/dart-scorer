import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  GameDetailDto,
  GameListPlayerDto,
  GameRoundDto,
  HistoryApiService,
} from '../../../services/history-api.service';
import { getPlayerColor } from '../../../theme/player-colors';

type LoadState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-game-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './game-detail.component.html',
  styleUrl: './game-detail.component.css',
})
export class GameDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(HistoryApiService);

  readonly state = signal<LoadState>('loading');
  readonly game = signal<GameDetailDto | null>(null);
  readonly errorMsg = signal<string | null>(null);

  readonly totalThrows = computed(() => {
    const g = this.game();
    if (!g) return 0;
    return g.rounds.reduce((sum, r) => sum + r.throws.length, 0);
  });

  readonly winner = computed(() => {
    const g = this.game();
    if (!g) return null;
    return g.players.find((p) => p.winner === true) ?? null;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('gameId');
    if (!id) {
      this.state.set('error');
      this.errorMsg.set('Missing game id.');
      return;
    }
    this.load(id);
  }

  load(id: string): void {
    this.state.set('loading');
    this.errorMsg.set(null);
    this.api.getGame(id).subscribe({
      next: (g) => {
        this.game.set(g);
        this.state.set('ready');
      },
      error: (err: unknown) => {
        this.errorMsg.set(this.formatError(err));
        this.state.set('error');
      },
    });
  }

  retry(): void {
    const id = this.route.snapshot.paramMap.get('gameId');
    if (id) this.load(id);
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return iso;
    const pad2 = (n: number) => String(n).padStart(2, '0');
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} - ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
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

  roundAccent(r: GameRoundDto): string {
    return getPlayerColor(r.color).accent;
  }

  private formatError(err: unknown): string {
    if (err instanceof Error) return err.message;
    return 'Failed to load game.';
  }
}
