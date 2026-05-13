import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PlayerSummaryDto {
  readonly playerName: string;
  readonly gamesPlayed: number;
  readonly wins: number;
  readonly winRate: number;
  readonly lastPlayedAt: string | null;
}

export interface PlayersListDto {
  readonly players: readonly PlayerSummaryDto[];
}

export interface PlayerStatsDto {
  readonly playerName: string;
  readonly gamesPlayed: number;
  readonly wins: number;
  readonly winRate: number;
  readonly totalThrows: number;
  readonly totalRounds: number;
  readonly totalDelta: number;
  readonly averageDeltaPerThrow: number;
  readonly averageThrowsPerGame: number;
  readonly averageRoundsPerGame: number;
  readonly missCount: number;
  readonly missRate: number;
  readonly tonPlusCount: number;
  readonly avgFirstThreeRoundsPoints: number;
  readonly bestRoundPoints: number | null;
  readonly bestCheckout: number | null;
  readonly favoriteSector: PlayerFavoriteSectorDto | null;
  readonly highestSingleDartScore: number;
  readonly perVariant: readonly PlayerVariantBreakdownDto[];
  readonly firstPlayedAt: string | null;
  readonly lastPlayedAt: string | null;
}

export interface PlayerVariantBreakdownDto {
  readonly variant: number;
  readonly gamesPlayed: number;
  readonly wins: number;
}

export interface PlayerFavoriteSectorDto {
  readonly base: number;
  readonly multiplier: number;
  readonly hitCount: number;
}

interface RuntimeConfig {
  apiBaseUrl?: string;
}

interface RuntimeWindow extends Window {
  __dartScorerConfig?: RuntimeConfig;
}

@Injectable({ providedIn: 'root' })
export class StatsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = this.resolveApiBaseUrl();

  listPlayers(): Observable<PlayersListDto> {
    return this.http.get<PlayersListDto>(`${this.apiBaseUrl}/api/stats/players`);
  }

  getPlayerStats(
    playerName: string,
    filters: { from?: string | null; to?: string | null; variant?: number | null } = {},
  ): Observable<PlayerStatsDto> {
    let params = new HttpParams();
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    if (filters.variant != null) params = params.set('variant', String(filters.variant));
    return this.http.get<PlayerStatsDto>(
      `${this.apiBaseUrl}/api/stats/players/${encodeURIComponent(playerName)}`,
      { params },
    );
  }

  private resolveApiBaseUrl(): string {
    const runtime = (window as RuntimeWindow).__dartScorerConfig?.apiBaseUrl;
    return (runtime ?? environment.apiBaseUrl).replace(/\/+$/, '');
  }
}
