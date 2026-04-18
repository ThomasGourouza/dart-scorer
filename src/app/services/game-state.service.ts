import { Injectable, computed, signal } from '@angular/core';

export type GameVariant = 301 | 501;
export type Multiplier = 1 | 2 | 3;

export interface PlayerRow {
  name: string;
  score: number;
}

const VALID_BASES = new Set<number>([
  0,
  ...Array.from({ length: 20 }, (_, i) => i + 1),
  25,
  50,
]);

@Injectable({ providedIn: 'root' })
export class GameStateService {
  private readonly players = signal<PlayerRow[]>([]);
  private readonly variant = signal<GameVariant | null>(null);
  private readonly currentPlayerIndex = signal(0);
  private readonly attemptNumber = signal(1);
  private readonly scoreAtTurnStart = signal(0);
  private readonly winnerIndex = signal<number | null>(null);
  private readonly active = signal(false);

  readonly playersList = this.players.asReadonly();
  readonly gameVariant = this.variant.asReadonly();
  readonly currentIndex = this.currentPlayerIndex.asReadonly();
  readonly attempt = this.attemptNumber.asReadonly();
  readonly turnStartScore = this.scoreAtTurnStart.asReadonly();
  readonly winner = this.winnerIndex.asReadonly();
  readonly isActive = this.active.asReadonly();

  readonly hasActiveGame = computed(
    () => this.active() && this.players().length >= 2,
  );

  readonly currentPlayer = computed(() => {
    const list = this.players();
    const i = this.currentPlayerIndex();
    return list[i] ?? null;
  });

  readonly isFinished = computed(() => this.winnerIndex() !== null);

  static allowedMultipliers(base: number): Multiplier[] {
    if (base === 0) return [1];
    if (base >= 1 && base <= 20) return [1, 2, 3];
    if (base === 25) return [1, 2];
    if (base === 50) return [1];
    return [1];
  }

  static clampMultiplier(base: number, m: Multiplier): Multiplier {
    const allowed = GameStateService.allowedMultipliers(base);
    if (allowed.includes(m)) return m;
    return allowed[allowed.length - 1]!;
  }

  static normalizeBase(base: number): number {
    if (VALID_BASES.has(base)) return base;
    return 0;
  }

  startGame(playerNames: string[], variant: GameVariant): void {
    const names = playerNames.map((raw, i) => {
      const t = raw.trim();
      const label = t.length > 0 ? t : `Player ${i + 1}`;
      return label.length > 48 ? label.slice(0, 48) : label;
    });
    const rows = names.map((name) => ({ name, score: variant }));
    this.players.set(rows);
    this.variant.set(variant);
    this.currentPlayerIndex.set(0);
    this.attemptNumber.set(1);
    this.scoreAtTurnStart.set(variant);
    this.winnerIndex.set(null);
    this.active.set(true);
  }

  abortGame(): void {
    this.players.set([]);
    this.variant.set(null);
    this.currentPlayerIndex.set(0);
    this.attemptNumber.set(1);
    this.scoreAtTurnStart.set(0);
    this.winnerIndex.set(null);
    this.active.set(false);
  }

  submitAttempt(rawBase: number, multiplier: Multiplier): void {
    if (!this.active() || this.winnerIndex() !== null) return;

    const base = GameStateService.normalizeBase(rawBase);
    const mult = GameStateService.clampMultiplier(base, multiplier);
    const list = [...this.players()];
    const idx = this.currentPlayerIndex();
    const row = list[idx];
    if (!row) return;

    const delta = base === 0 ? 0 : base * mult;
    const candidate = row.score - delta;

    if (candidate < 0) {
      row.score = this.scoreAtTurnStart();
      list[idx] = row;
      this.players.set(list);
      this.advanceToNextPlayer(list);
      return;
    }

    if (candidate === 0) {
      row.score = 0;
      list[idx] = row;
      this.players.set(list);
      this.winnerIndex.set(idx);
      return;
    }

    row.score = candidate;
    list[idx] = row;
    this.players.set(list);

    if (this.attemptNumber() < 3) {
      this.attemptNumber.update((a) => a + 1);
    } else {
      this.advanceToNextPlayer(list);
    }
  }

  private advanceToNextPlayer(updatedPlayers: PlayerRow[]): void {
    const n = updatedPlayers.length;
    if (n === 0) return;
    const next = (this.currentPlayerIndex() + 1) % n;
    this.currentPlayerIndex.set(next);
    this.attemptNumber.set(1);
    this.scoreAtTurnStart.set(updatedPlayers[next]!.score);
  }
}
