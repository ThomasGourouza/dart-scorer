import { Injectable, computed, signal } from '@angular/core';
import { defaultColorIdsForCount, isKnownPlayerColorId } from '../theme/player-colors';

export type GameVariant = 301 | 501;
export type Multiplier = 1 | 2 | 3;
export type SubmitResult = 'noop' | 'next_attempt' | 'next_player' | 'bust' | 'win';

/** Sector + multiplier used on a scored dart (for take-back UI restore). */
export interface SubmittedDart {
  base: number;
  mult: Multiplier;
}

export interface PlayerRow {
  name: string;
  score: number;
  /** Stable id from PLAYER_COLOR_PALETTE */
  colorId: string;
}

export interface GameStartEntry {
  name: string;
  colorId: string;
}

/** Full game state slice for undo (unlimited history). */
export interface GameSnapshot {
  players: PlayerRow[];
  /** Starting score (301 or 501 in normal play; tests may use other totals). */
  variant: number;
  currentPlayerIndex: number;
  attemptNumber: number;
  scoreAtTurnStart: number;
  winnerIndex: number | null;
  active: boolean;
}

const VALID_BASES = new Set<number>([
  0,
  ...Array.from({ length: 20 }, (_, i) => i + 1),
  25,
  50,
]);

export const GAME_STORAGE_KEY = 'dart-scorer-game-v1';

interface StoredGameJson {
  v: 1 | 2 | 3;
  past?: GameSnapshot[];
  dartLog?: Array<{ base?: unknown; mult?: unknown }>;
  players: Array<{ name: string; score: number; colorId?: string }>;
  variant: number;
  currentPlayerIndex: number;
  attemptNumber: number;
  scoreAtTurnStart: number;
  winnerIndex: number | null;
  active: boolean;
}

interface PersistedPayload extends StoredGameJson {
  v: 3;
  past: GameSnapshot[];
  dartLog: SubmittedDart[];
}

@Injectable({ providedIn: 'root' })
export class GameStateService {
  private readonly players = signal<PlayerRow[]>([]);
  private readonly variant = signal<number | null>(null);
  private readonly currentPlayerIndex = signal(0);
  private readonly attemptNumber = signal(1);
  private readonly scoreAtTurnStart = signal(0);
  private readonly winnerIndex = signal<number | null>(null);
  private readonly active = signal(false);
  private readonly pastSnapshots = signal<GameSnapshot[]>([]);
  /** One entry per scored dart; same length as pastSnapshots when in sync. */
  private readonly dartLog = signal<SubmittedDart[]>([]);

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

  readonly canTakeBack = computed(
    () =>
      this.active() &&
      this.players().length >= 2 &&
      this.pastSnapshots().length > 0,
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
    if (base === 25) return [1];
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

  /** Call once at bootstrap (browser only). */
  restoreFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(GAME_STORAGE_KEY);
    if (!raw) return;
    let data: StoredGameJson;
    try {
      data = JSON.parse(raw) as StoredGameJson;
    } catch {
      localStorage.removeItem(GAME_STORAGE_KEY);
      return;
    }
    if ((data.v !== 1 && data.v !== 2 && data.v !== 3) || !Array.isArray(data.players)) {
      localStorage.removeItem(GAME_STORAGE_KEY);
      return;
    }
    if (data.players.length < 2 || data.players.length > 10) {
      localStorage.removeItem(GAME_STORAGE_KEY);
      return;
    }
    const startTotal = Number(data.variant);
    if (!Number.isFinite(startTotal) || startTotal < 1 || startTotal > 999999) {
      localStorage.removeItem(GAME_STORAGE_KEY);
      return;
    }
    if (data.active !== true) {
      localStorage.removeItem(GAME_STORAGE_KEY);
      return;
    }

    const fallbackColors = defaultColorIdsForCount(data.players.length);
    const rows: PlayerRow[] = data.players.map((p, i) => ({
      name: typeof p.name === 'string' ? p.name : `Player ${i + 1}`,
      score: typeof p.score === 'number' && Number.isFinite(p.score) ? p.score : startTotal,
      colorId:
        typeof p.colorId === 'string' && isKnownPlayerColorId(p.colorId)
          ? p.colorId
          : fallbackColors[i]!,
    }));

    this.players.set(rows);
    this.variant.set(startTotal);
    const rawIdx = Number(data.currentPlayerIndex);
    const idx = Number.isFinite(rawIdx)
      ? Math.min(Math.max(0, Math.floor(rawIdx)), rows.length - 1)
      : 0;
    this.currentPlayerIndex.set(idx);
    const rawAtt = Number(data.attemptNumber);
    const att = Number.isFinite(rawAtt)
      ? Math.min(3, Math.max(1, Math.floor(rawAtt)))
      : 1;
    this.attemptNumber.set(att);
    this.scoreAtTurnStart.set(
      typeof data.scoreAtTurnStart === 'number' && Number.isFinite(data.scoreAtTurnStart)
        ? data.scoreAtTurnStart
        : rows[this.currentPlayerIndex()]!.score,
    );
    const w = data.winnerIndex;
    this.winnerIndex.set(
      typeof w === 'number' && w >= 0 && w < rows.length ? w : null,
    );
    this.active.set(data.active === true);

    const pastRaw =
      (data.v === 2 || data.v === 3) && Array.isArray(data.past) ? data.past : [];
    const past = pastRaw
      .map((snap) => this.normalizeSnapshot(snap, rows.length))
      .filter((s): s is GameSnapshot => s !== null);
    this.pastSnapshots.set(past);
    this.dartLog.set(this.parseDartLogForRestore(data.dartLog, past.length));
  }

  startGame(entries: GameStartEntry[], variant: GameVariant): void {
    const n = entries.length;
    const fallback = defaultColorIdsForCount(n);
    const rows: PlayerRow[] = entries.map((e, i) => {
      const t = e.name.trim();
      const label = t.length > 0 ? t : `Player ${i + 1}`;
      const name = label.length > 48 ? label.slice(0, 48) : label;
      const cid = isKnownPlayerColorId(e.colorId) ? e.colorId : fallback[i]!;
      return { name, score: variant, colorId: cid };
    });
    this.players.set(rows);
    this.variant.set(variant);
    this.currentPlayerIndex.set(0);
    this.attemptNumber.set(1);
    this.scoreAtTurnStart.set(variant);
    this.winnerIndex.set(null);
    this.active.set(true);
    this.pastSnapshots.set([]);
    this.dartLog.set([]);
    this.persistToStorage();
  }

  abortGame(): void {
    this.players.set([]);
    this.variant.set(null);
    this.currentPlayerIndex.set(0);
    this.attemptNumber.set(1);
    this.scoreAtTurnStart.set(0);
    this.winnerIndex.set(null);
    this.active.set(false);
    this.pastSnapshots.set([]);
    this.dartLog.set([]);
    this.clearStorage();
  }

  /**
   * Reverts the last scored attempt. Returns the sector + multiplier that was
   * submitted for that dart (for restoring the form), or null if nothing was undone.
   */
  takeBack(): SubmittedDart | null {
    const past = this.pastSnapshots();
    const log = this.dartLog();
    if (!this.active() || this.players().length < 2 || past.length === 0) {
      return null;
    }
    const snap = past[past.length - 1]!;
    const lastDart = log.length > 0 ? log[log.length - 1]! : null;
    this.pastSnapshots.set(past.slice(0, -1));
    this.dartLog.set(log.slice(0, -1));
    this.applySnapshot(snap);
    this.persistToStorage();
    return lastDart;
  }

  submitAttempt(rawBase: number, multiplier: Multiplier): SubmitResult {
    if (!this.active() || this.winnerIndex() !== null) return 'noop';

    const base = GameStateService.normalizeBase(rawBase);
    const mult = GameStateService.clampMultiplier(base, multiplier);
    const list = [...this.players()];
    const idx = this.currentPlayerIndex();
    const row = list[idx];
    if (!row) return 'noop';

    this.pushUndoSnapshot();

    const delta = base === 0 ? 0 : base * mult;
    const candidate = row.score - delta;

    if (candidate < 0) {
      row.score = this.scoreAtTurnStart();
      list[idx] = row;
      this.players.set(list);
      this.advanceToNextPlayer(list);
      this.pushDartLog(base, mult);
      this.persistToStorage();
      return 'bust';
    }

    if (candidate === 0) {
      row.score = 0;
      list[idx] = row;
      this.players.set(list);
      this.winnerIndex.set(idx);
      this.pushDartLog(base, mult);
      this.persistToStorage();
      return 'win';
    }

    row.score = candidate;
    list[idx] = row;
    this.players.set(list);

    if (this.attemptNumber() < 3) {
      this.attemptNumber.update((a) => a + 1);
      this.pushDartLog(base, mult);
      this.persistToStorage();
      return 'next_attempt';
    }
    this.advanceToNextPlayer(list);
    this.pushDartLog(base, mult);
    this.persistToStorage();
    return 'next_player';
  }

  private pushDartLog(base: number, mult: Multiplier): void {
    this.dartLog.update((d) => [...d, { base, mult }]);
  }

  private parseDartLogForRestore(
    raw: unknown,
    pastLength: number,
  ): SubmittedDart[] {
    if (pastLength === 0) return [];
    if (!Array.isArray(raw)) {
      return Array.from({ length: pastLength }, () => ({ base: 0, mult: 1 as Multiplier }));
    }
    const out: SubmittedDart[] = [];
    for (let i = 0; i < pastLength; i++) {
      const row = raw[i] as { base?: unknown; mult?: unknown } | undefined;
      const b = Number(row?.['base']);
      const base = Number.isFinite(b) ? GameStateService.normalizeBase(b) : 0;
      const mr = Number(row?.['mult']);
      const multRaw = mr === 2 || mr === 3 ? mr : 1;
      const mult = GameStateService.clampMultiplier(base, multRaw as Multiplier);
      out.push({ base, mult });
    }
    return out;
  }

  private pushUndoSnapshot(): void {
    const v = this.variant();
    if (v === null) return;
    const snap: GameSnapshot = {
      players: this.players().map((p) => ({ ...p })),
      variant: v,
      currentPlayerIndex: this.currentPlayerIndex(),
      attemptNumber: this.attemptNumber(),
      scoreAtTurnStart: this.scoreAtTurnStart(),
      winnerIndex: this.winnerIndex(),
      active: this.active(),
    };
    this.pastSnapshots.update((past) => [...past, snap]);
  }

  private applySnapshot(s: GameSnapshot): void {
    this.players.set(s.players.map((p) => ({ ...p })));
    this.variant.set(s.variant);
    this.currentPlayerIndex.set(s.currentPlayerIndex);
    this.attemptNumber.set(s.attemptNumber);
    this.scoreAtTurnStart.set(s.scoreAtTurnStart);
    this.winnerIndex.set(s.winnerIndex);
    this.active.set(s.active);
  }

  private normalizeSnapshot(raw: unknown, playerCount: number): GameSnapshot | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    if (!Array.isArray(o['players']) || typeof o['currentPlayerIndex'] !== 'number') {
      return null;
    }
    const vr = o['variant'];
    const variant = Number(vr);
    if (!Number.isFinite(variant) || variant < 1) return null;
    const pl = o['players'] as Array<{ name?: unknown; score?: unknown; colorId?: unknown }>;
    if (pl.length !== playerCount) return null;
    const fallbackColors = defaultColorIdsForCount(playerCount);
    const players: PlayerRow[] = pl.map((p, i) => ({
      name: typeof p.name === 'string' ? p.name : `Player ${i + 1}`,
      score:
        typeof p.score === 'number' && Number.isFinite(p.score) ? p.score : variant,
      colorId:
        typeof p.colorId === 'string' && isKnownPlayerColorId(p.colorId)
          ? p.colorId
          : fallbackColors[i]!,
    }));
    const att = Number(o['attemptNumber']);
    const attemptNumber = Number.isFinite(att)
      ? Math.min(3, Math.max(1, Math.floor(att)))
      : 1;
    const cpi = Number(o['currentPlayerIndex']);
    const currentPlayerIndex = Number.isFinite(cpi)
      ? Math.min(Math.max(0, Math.floor(cpi)), playerCount - 1)
      : 0;
    const sts = Number(o['scoreAtTurnStart']);
    const scoreAtTurnStart = Number.isFinite(sts) ? sts : players[currentPlayerIndex]!.score;
    const w = o['winnerIndex'];
    const winnerIndex =
      typeof w === 'number' && w >= 0 && w < playerCount ? w : null;
    return {
      players,
      variant,
      currentPlayerIndex,
      attemptNumber,
      scoreAtTurnStart,
      winnerIndex,
      active: true,
    };
  }

  private advanceToNextPlayer(updatedPlayers: PlayerRow[]): void {
    const n = updatedPlayers.length;
    if (n === 0) return;
    const next = (this.currentPlayerIndex() + 1) % n;
    this.currentPlayerIndex.set(next);
    this.attemptNumber.set(1);
    this.scoreAtTurnStart.set(updatedPlayers[next]!.score);
  }

  private persistToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    if (!this.active() || this.players().length < 2) {
      this.clearStorage();
      return;
    }
    const past = this.pastSnapshots().map((s) => ({
      players: s.players.map((p) => ({ ...p })),
      variant: s.variant,
      currentPlayerIndex: s.currentPlayerIndex,
      attemptNumber: s.attemptNumber,
      scoreAtTurnStart: s.scoreAtTurnStart,
      winnerIndex: s.winnerIndex,
      active: s.active,
    }));
    const vNow = this.variant();
    if (vNow === null) return;

    const dartLog = this.dartLog().map((d) => ({ base: d.base, mult: d.mult }));

    const payload: PersistedPayload = {
      v: 3,
      past,
      dartLog,
      players: this.players().map((p) => ({
        name: p.name,
        score: p.score,
        colorId: p.colorId,
      })),
      variant: vNow,
      currentPlayerIndex: this.currentPlayerIndex(),
      attemptNumber: this.attemptNumber(),
      scoreAtTurnStart: this.scoreAtTurnStart(),
      winnerIndex: this.winnerIndex(),
      active: this.active(),
    };
    try {
      localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota */
    }
  }

  private clearStorage(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(GAME_STORAGE_KEY);
  }
}
