import { Routes } from '@angular/router';
import { playGuard } from './guards/play.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/setup/setup.component').then((m) => m.SetupComponent),
  },
  {
    path: 'play',
    canActivate: [playGuard],
    loadComponent: () => import('./pages/play/play.component').then((m) => m.PlayComponent),
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./pages/history/history.component').then((m) => m.HistoryComponent),
  },
  {
    path: 'history/:gameId',
    loadComponent: () =>
      import('./pages/history/game-detail/game-detail.component').then(
        (m) => m.GameDetailComponent,
      ),
  },
  {
    path: 'stats',
    loadComponent: () => import('./pages/stats/stats.component').then((m) => m.StatsComponent),
  },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
