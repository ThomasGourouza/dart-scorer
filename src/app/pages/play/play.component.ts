import { NgStyle } from '@angular/common';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameStateService, Multiplier, SubmitResult } from '../../services/game-state.service';
import { ScoreboardComponent } from '../../components/scoreboard/scoreboard.component';
import { getPlayerColor } from '../../theme/player-colors';

const DART_ANIM_MS = 420;
const TURN_ANIM_MS = 900;
const UNDO_ANIM_MS = 400;

export type AnimLayer = 'idle' | 'dart' | 'turn' | 'undo';

@Component({
  selector: 'app-play',
  standalone: true,
  imports: [FormsModule, NgStyle, ScoreboardComponent],
  templateUrl: './play.component.html',
  styleUrl: './play.component.css',
})
export class PlayComponent implements OnDestroy {
  protected readonly game = inject(GameStateService);

  protected readonly dartBases = [
    0,
    ...Array.from({ length: 20 }, (_, i) => i + 1),
    25,
    50,
  ] as const;

  protected readonly selectedBase = signal<number>(0);
  protected multiplier: Multiplier = 1;
  protected readonly animState = signal<AnimLayer>('idle');

  private animTimerId: ReturnType<typeof setTimeout> | undefined;

  ngOnDestroy(): void {
    if (this.animTimerId !== undefined) {
      clearTimeout(this.animTimerId);
    }
  }

  protected panelTheme(): Record<string, string> {
    if (this.game.isFinished()) return {};
    const c = getPlayerColor(this.game.currentPlayer()?.colorId);
    return {
      '--p-accent': c.accent,
      '--p-muted': c.accentMuted,
      '--p-surface': c.surface,
      '--p-ring': c.ring,
    };
  }

  protected winnerTheme(): Record<string, string> {
    const w = this.game.winner();
    if (w === null) return {};
    const c = getPlayerColor(this.game.playersList()[w]?.colorId);
    return {
      '--p-accent': c.accent,
      '--p-muted': c.accentMuted,
      '--p-surface': c.surface,
      '--p-ring': c.ring,
    };
  }

  protected pickBase(b: number): void {
    if (this.animState() !== 'idle') return;
    this.selectedBase.set(b);
    this.multiplier = GameStateService.clampMultiplier(b, this.multiplier);
  }

  protected allowedMults(base: number): Multiplier[] {
    return GameStateService.allowedMultipliers(base);
  }

  protected isMultAllowed(m: number): boolean {
    return this.allowedMults(this.selectedBase()).includes(m as Multiplier);
  }

  protected submit(): void {
    if (this.animState() !== 'idle') return;
    const result = this.game.submitAttempt(this.selectedBase(), this.multiplier);
    if (result === 'noop') return;

    if (result === 'win') {
      this.resetDartUi();
      return;
    }

    this.queuePostSubmitAnimation(result);
  }

  private queuePostSubmitAnimation(result: SubmitResult): void {
    if (this.animTimerId !== undefined) {
      clearTimeout(this.animTimerId);
    }

    const isTurn = result === 'next_player' || result === 'bust';
    this.animState.set(isTurn ? 'turn' : 'dart');
    const ms = isTurn ? TURN_ANIM_MS : DART_ANIM_MS;

    this.animTimerId = setTimeout(() => {
      this.resetDartUi();
      this.animState.set('idle');
      this.animTimerId = undefined;
    }, ms);
  }

  private resetDartUi(): void {
    this.selectedBase.set(0);
    this.multiplier = 1;
  }

  protected winnerName(): string {
    const w = this.game.winner();
    if (w === null) return '';
    return this.game.playersList()[w]?.name ?? '';
  }

  protected takeBack(): void {
    if (this.animState() !== 'idle' || !this.game.canTakeBack()) return;
    if (this.animTimerId !== undefined) {
      clearTimeout(this.animTimerId);
    }
    const restored = this.game.takeBack();
    if (restored) {
      this.selectedBase.set(restored.base);
      this.multiplier = GameStateService.clampMultiplier(restored.base, restored.mult);
    } else {
      this.resetDartUi();
    }
    this.animState.set('undo');
    this.animTimerId = setTimeout(() => {
      this.animState.set('idle');
      this.animTimerId = undefined;
    }, UNDO_ANIM_MS);
  }
}
