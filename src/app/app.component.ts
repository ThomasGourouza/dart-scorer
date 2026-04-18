import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { GameStateService } from './services/game-state.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  protected readonly title = 'Darts scorer';
  protected readonly game = inject(GameStateService);
  private readonly router = inject(Router);

  protected abort(): void {
    if (!this.game.hasActiveGame()) return;
    this.game.abortGame();
    void this.router.navigate(['/']);
  }
}
