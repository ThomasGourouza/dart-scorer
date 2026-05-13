import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { GameStateService } from './services/game-state.service';
import { ScreenWakeLockService } from './services/screen-wake-lock.service';
import { HealthService } from './services/health.service';
import { StatusPillComponent } from './components/status-pill/status-pill.component';

interface NavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, StatusPillComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnDestroy {
  protected readonly title = 'Darts scorer';
  protected readonly game = inject(GameStateService);
  private readonly router = inject(Router);
  private readonly wakeLock = inject(ScreenWakeLockService);
  private readonly health = inject(HealthService);

  protected readonly drawerOpen = signal(false);
  protected readonly navItems: readonly NavItem[] = [
    { path: '/play', label: 'Play', icon: 'play' },
    { path: '/history', label: 'History', icon: 'history' },
    { path: '/stats', label: 'Stats', icon: 'stats' },
  ];

  protected readonly playUrl = computed(() =>
    this.game.hasActiveGame() ? '/play' : '/',
  );

  private readonly navSub: Subscription;

  constructor() {
    this.wakeLock.startManaging();
    this.health.start();
    this.navSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.drawerOpen.set(false));
  }

  ngOnDestroy(): void {
    this.wakeLock.stopManaging();
    this.navSub.unsubscribe();
  }

  protected toggleDrawer(): void {
    this.drawerOpen.update((open) => !open);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  protected abort(): void {
    if (!this.game.hasActiveGame()) return;
    this.game.abortGame();
    void this.router.navigate(['/']);
  }
}
