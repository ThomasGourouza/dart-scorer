import { Component, inject } from '@angular/core';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-scoreboard',
  standalone: true,
  templateUrl: './scoreboard.component.html',
  styleUrl: './scoreboard.component.css',
})
export class ScoreboardComponent {
  protected readonly game = inject(GameStateService);
}
