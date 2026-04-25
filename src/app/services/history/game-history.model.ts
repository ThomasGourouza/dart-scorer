import type { Multiplier } from '../game-state.service';

export interface GameHistoryRow {
  gameStartedAtIso: string | null;
  recordedAtIso: string;
  /** 0-based internal index */
  playerIndex: number;
  playerName: string;
  /** 1..3 */
  attemptNumber: number;
  base: number;
  mult: Multiplier;
  delta: number;
  scoreBefore: number;
  scoreAfter: number;
}

export interface GameHistoryThrow {
  idxInTurn: number;
  base: number;
  mult: Multiplier;
  delta: number;
  scoreBefore: number;
  scoreAfter: number;
  atIso: string;
}

export interface GameHistoryTurn {
  /** 0-based internal index */
  playerIndex: number;
  /** Per-player round number (1, 2, ...) */
  round: number;
  playerName: string;
  throws: GameHistoryThrow[];
}

