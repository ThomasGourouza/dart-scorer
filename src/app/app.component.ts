import { Component, OnDestroy, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { GameStateService } from './services/game-state.service';
import { ScreenWakeLockService } from './services/screen-wake-lock.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnDestroy {
  protected readonly title = 'Darts scorer';
  protected readonly game = inject(GameStateService);
  private readonly router = inject(Router);
  private readonly wakeLock = inject(ScreenWakeLockService);

  constructor() {
    this.wakeLock.startManaging();
  }

  ngOnDestroy(): void {
    this.wakeLock.stopManaging();
  }

  protected abort(): void {
    if (!this.game.hasActiveGame()) return;
    this.game.abortGame();
    void this.router.navigate(['/']);
  }
}
