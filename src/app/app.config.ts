import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { GameStateService } from './services/game-state.service';

function restoreGameState(game: GameStateService): () => void {
  return () => game.restoreFromStorage();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      useFactory: restoreGameState,
      deps: [GameStateService],
      multi: true,
    },
  ],
};
