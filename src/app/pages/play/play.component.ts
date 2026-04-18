import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameStateService, Multiplier } from '../../services/game-state.service';
import { ScoreboardComponent } from '../../components/scoreboard/scoreboard.component';

@Component({
  selector: 'app-play',
  standalone: true,
  imports: [FormsModule, ScoreboardComponent],
  templateUrl: './play.component.html',
  styleUrl: './play.component.css',
})
export class PlayComponent {
  protected readonly game = inject(GameStateService);

  protected readonly dartBases = [
    0,
    ...Array.from({ length: 20 }, (_, i) => i + 1),
    25,
    50,
  ] as const;

  protected readonly selectedBase = signal<number>(20);
  protected multiplier: Multiplier = 1;

  protected allowedMults(base: number): Multiplier[] {
    return GameStateService.allowedMultipliers(base);
  }

  protected isMultAllowed(m: number): boolean {
    return this.allowedMults(this.selectedBase()).includes(m as Multiplier);
  }

  protected onBaseChange(raw: string): void {
    const v = parseInt(raw, 10);
    const base = Number.isFinite(v) ? v : 0;
    this.selectedBase.set(base);
    this.multiplier = GameStateService.clampMultiplier(base, this.multiplier);
  }

  protected submit(): void {
    this.game.submitAttempt(this.selectedBase(), this.multiplier);
  }

  protected winnerName(): string {
    const w = this.game.winner();
    if (w === null) return '';
    return this.game.playersList()[w]?.name ?? '';
  }
}
