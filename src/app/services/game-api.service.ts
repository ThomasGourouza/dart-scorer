import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { PlayerRow } from './game-state.service';
import type { GameHistoryRow } from './history/game-history.model';
import { environment } from '../../environments/environment';

interface CreateGameRequest {
  gameStartedAt: string;
  players: PlayerPayload[];
  rounds: RoundPayload[];
}

interface PlayerPayload {
  playerIndex: number;
  playerName: string;
  color: string;
  winner: boolean | null;
}

interface RoundPayload {
  playerIndex: number;
  roundNumber: number;
  scoreBefore: number;
  scoreAfter: number;
  throws: ThrowPayload[];
}

interface ThrowPayload {
  dateTime: string;
  throwNumber: number;
  base: number;
  multiplier: number;
  delta: number;
  scoreBefore: number;
  scoreAfter: number;
}

interface CreateGameResponse {
  gameId: string;
}

@Injectable({ providedIn: 'root' })
export class GameApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');

  saveCompletedGame(args: {
    startedAtIso: string | null;
    players: readonly PlayerRow[];
    winnerIndex: number | null;
    historyRows: readonly GameHistoryRow[];
  }): Observable<CreateGameResponse> {
    if (!args.startedAtIso) {
      throw new Error('Cannot save game without start timestamp.');
    }
    const payload: CreateGameRequest = {
      gameStartedAt: args.startedAtIso,
      players: args.players.map((p, i) => ({
        playerIndex: i + 1,
        playerName: p.name,
        color: p.colorId,
        winner: args.winnerIndex === null ? null : args.winnerIndex === i,
      })),
      rounds: this.buildRounds(args.historyRows),
    };
    return this.http.post<CreateGameResponse>(`${this.apiBaseUrl}/api/games`, payload);
  }

  private buildRounds(historyRows: readonly GameHistoryRow[]): RoundPayload[] {
    const rounds: RoundPayload[] = [];
    const roundByPlayerIndex = new Map<number, number>();

    for (const row of historyRows) {
      if (row.attemptNumber === 1 || rounds.length === 0) {
        const nextRound = (roundByPlayerIndex.get(row.playerIndex) ?? 0) + 1;
        roundByPlayerIndex.set(row.playerIndex, nextRound);
        rounds.push({
          playerIndex: row.playerIndex + 1,
          roundNumber: nextRound,
          scoreBefore: row.scoreBefore,
          scoreAfter: row.scoreAfter,
          throws: [],
        });
      }

      const currentRound = rounds[rounds.length - 1]!;
      currentRound.throws.push({
        dateTime: row.recordedAtIso,
        throwNumber: row.attemptNumber,
        base: row.base,
        multiplier: row.mult,
        delta: row.delta,
        scoreBefore: row.scoreBefore,
        scoreAfter: row.scoreAfter,
      });
      currentRound.scoreAfter = row.scoreAfter;
    }

    return rounds;
  }
}
