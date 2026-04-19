import { NgStyle } from '@angular/common';
import { Component, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';
import { getPlayerColor } from '../../theme/player-colors';

@Component({
  selector: 'app-scoreboard',
  standalone: true,
  imports: [NgStyle],
  templateUrl: './scoreboard.component.html',
  styleUrl: './scoreboard.component.css',
})
export class ScoreboardComponent {
  protected readonly game = inject(GameStateService);

  protected rowVars(colorId: string): Record<string, string> {
    const c = getPlayerColor(colorId);
    return {
      '--row-accent': c.accent,
      '--row-muted': c.accentMuted,
      '--row-surface': c.surface,
      '--row-ring': c.ring,
    };
  }
}
