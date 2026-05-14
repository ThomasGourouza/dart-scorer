import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GameListPlayerDto {
  readonly playerIndex: number;
  readonly playerName: string;
  readonly color: string;
  readonly winner: boolean | null;
}

export interface GameListItemDto {
  readonly gameId: string;
  readonly dateTime: string;
  readonly playersCount: number;
  readonly roundsCount: number;
  readonly throwsCount: number;
  readonly durationSeconds: number | null;
  readonly winner: GameListPlayerDto | null;
  readonly players: readonly GameListPlayerDto[];
}

export interface GameListPageDto {
  readonly items: readonly GameListItemDto[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export type HistorySortField =
  | 'date'
  | 'duration'
  | 'rounds'
  | 'throws'
  | 'winner'
  | 'players';

export type HistorySortDir = 'asc' | 'desc';

export interface HistoryListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly sort?: HistorySortField;
  readonly dir?: HistorySortDir;
  readonly from?: string | null;
  readonly to?: string | null;
  readonly winner?: string | null;
  readonly player?: string | null;
  readonly minDuration?: number | null;
  readonly maxDuration?: number | null;
  readonly minRounds?: number | null;
  readonly maxRounds?: number | null;
}

export interface GameThrowDto {
  readonly dateTime: string;
  readonly throwNumber: number;
  readonly base: number;
  readonly multiplier: number;
  readonly delta: number;
  readonly scoreBefore: number;
  readonly scoreAfter: number;
}

export interface GameRoundDto {
  readonly roundNumber: number;
  readonly playerIndex: number;
  readonly playerName: string;
  readonly color: string;
  readonly scoreBefore: number;
  readonly scoreAfter: number;
  readonly throws: readonly GameThrowDto[];
}

export interface GameDetailDto {
  readonly gameId: string;
  readonly dateTime: string;
  readonly durationSeconds: number | null;
  readonly players: readonly GameListPlayerDto[];
  readonly rounds: readonly GameRoundDto[];
}

interface RuntimeConfig {
  apiBaseUrl?: string;
}

interface RuntimeWindow extends Window {
  __dartScorerConfig?: RuntimeConfig;
}

@Injectable({ providedIn: 'root' })
export class HistoryApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = this.resolveApiBaseUrl();

  listGames(query: HistoryListQuery = {}): Observable<GameListPageDto> {
    const params = buildHistoryParams(query);
    return this.http.get<GameListPageDto>(`${this.apiBaseUrl}/api/history/games`, { params });
  }

  getGame(gameId: string): Observable<GameDetailDto> {
    return this.http.get<GameDetailDto>(`${this.apiBaseUrl}/api/history/games/${gameId}`);
  }

  private resolveApiBaseUrl(): string {
    const runtime = (window as RuntimeWindow).__dartScorerConfig?.apiBaseUrl;
    return (runtime ?? environment.apiBaseUrl).replace(/\/+$/, '');
  }
}

function buildHistoryParams(query: HistoryListQuery): HttpParams {
  let params = new HttpParams();
  const setIf = (key: string, value: unknown): void => {
    if (value === null || value === undefined) return;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') return;
      params = params.set(key, trimmed);
      return;
    }
    params = params.set(key, String(value));
  };

  setIf('page', query.page);
  setIf('pageSize', query.pageSize);
  setIf('sort', query.sort);
  setIf('dir', query.dir);
  setIf('from', query.from);
  setIf('to', query.to);
  setIf('winner', query.winner);
  setIf('player', query.player);
  setIf('minDuration', query.minDuration);
  setIf('maxDuration', query.maxDuration);
  setIf('minRounds', query.minRounds);
  setIf('maxRounds', query.maxRounds);
  return params;
}
