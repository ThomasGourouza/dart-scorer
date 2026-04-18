import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GameStateService } from '../services/game-state.service';

export const playGuard: CanActivateFn = () => {
  const game = inject(GameStateService);
  const router = inject(Router);
  if (game.hasActiveGame()) return true;
  return router.createUrlTree(['/']);
};
