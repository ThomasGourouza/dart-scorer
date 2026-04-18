import { Routes } from '@angular/router';
import { playGuard } from './guards/play.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/setup/setup.component').then((m) => m.SetupComponent) },
  {
    path: 'play',
    canActivate: [playGuard],
    loadComponent: () => import('./pages/play/play.component').then((m) => m.PlayComponent),
  },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
