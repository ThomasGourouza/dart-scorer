import { Component, Input } from '@angular/core';
import type { GameHistoryTurn } from '../../../../services/history/game-history.model';
import type { PlayerRow } from '../../../../services/game-state.service';
import { getPlayerColor } from '../../../../theme/player-colors';

@Component({
  selector: 'app-game-history-timeline',
  standalone: true,
  templateUrl: './game-history-timeline.component.html',
  styleUrl: './game-history-timeline.component.css',
})
export class GameHistoryTimelineComponent {
  @Input({ required: true }) turns: GameHistoryTurn[] = [];
  @Input({ required: true }) players: PlayerRow[] = [];

  formatIsoUi(iso: string): string {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return iso;
    const pad2 = (n: number) => String(n).padStart(2, '0');
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} - ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  }

  accentForTurn(t: GameHistoryTurn): string {
    const colorId = this.players[t.playerIndex]?.colorId;
    return getPlayerColor(colorId).accent;
  }
}

