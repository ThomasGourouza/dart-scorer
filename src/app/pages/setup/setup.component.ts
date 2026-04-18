import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameStateService, GameVariant } from '../../services/game-state.service';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './setup.component.html',
  styleUrl: './setup.component.css',
})
export class SetupComponent {
  protected playerCount = 2;
  protected names: string[] = ['Player 1', 'Player 2'];
  protected variant: GameVariant = 501;

  constructor(
    private readonly game: GameStateService,
    private readonly router: Router,
  ) {}

  protected onCountChange(event: Event): void {
    const el = event.target as HTMLSelectElement;
    const n = Math.min(10, Math.max(2, parseInt(el.value, 10) || 2));
    this.playerCount = n;
    while (this.names.length < n) {
      this.names.push(`Player ${this.names.length + 1}`);
    }
    if (this.names.length > n) {
      this.names.length = n;
    }
  }

  protected start(): void {
    this.game.startGame(this.names.slice(0, this.playerCount), this.variant);
    void this.router.navigate(['/play']);
  }
}
