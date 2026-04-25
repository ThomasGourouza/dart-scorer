import { NgStyle } from '@angular/common';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  readonly game = inject(GameStateService);
  private readonly router = inject(Router);

  readonly dartBases = [
    0,
    ...Array.from({ length: 20 }, (_, i) => i + 1),
    25,
    50,
  ] as const;

  readonly selectedBase = signal<number>(0);
  multiplier: Multiplier = 1;
  readonly animState = signal<AnimLayer>('idle');
  readonly emailDialogOpen = signal(false);
  emailTo = '';

  private animTimerId: ReturnType<typeof setTimeout> | undefined;

  ngOnDestroy(): void {
    if (this.animTimerId !== undefined) {
      clearTimeout(this.animTimerId);
    }
  }

  panelTheme(): Record<string, string> {
    if (this.game.isFinished()) return {};
    const c = getPlayerColor(this.game.currentPlayer()?.colorId);
    return {
      '--p-accent': c.accent,
      '--p-muted': c.accentMuted,
      '--p-surface': c.surface,
      '--p-ring': c.ring,
    };
  }

  winnerTheme(): Record<string, string> {
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

  isMultAllowedForBase(base: number, mult: Multiplier): boolean {
    return GameStateService.allowedMultipliers(base).includes(mult);
  }

  pickAndSubmitBase(b: number): void {
    if (this.animState() !== 'idle') return;

    const mult = this.multiplier;
    if (!this.isMultAllowedForBase(b, mult)) return;

    this.selectedBase.set(b);
    const clamped = GameStateService.clampMultiplier(b, mult);
    this.multiplier = clamped;

    const result = this.game.submitAttempt(b, clamped);
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

  winnerName(): string {
    const w = this.game.winner();
    if (w === null) return '';
    return this.game.playersList()[w]?.name ?? '';
  }

  takeBack(): void {
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

  newGame(): void {
    if (!this.game.hasActiveGame()) return;
    this.game.abortGame();
    void this.router.navigate(['/']);
  }

  downloadHistory(): void {
    const csv = this.game.getHistoryCsv();
    const started = this.game.startedAtIso() ?? new Date().toISOString();
    const stamp = started.replaceAll(/[-:]/g, '').replaceAll('T', '-').slice(0, 15);
    const filename = `dart-scorer-history-${stamp}.csv`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  openEmailDialog(): void {
    this.emailTo = '';
    this.emailDialogOpen.set(true);
  }

  closeEmailDialog(): void {
    this.emailDialogOpen.set(false);
  }

  sendEmailHistory(): void {
    const to = this.emailTo.trim();
    if (to.length === 0) return;

    const csv = this.game.getHistoryCsv();
    const subject = 'Dart scorer - game history (CSV)';
    const body = `Hi,\n\nHere is the game history CSV:\n\n${csv}`;
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    this.emailDialogOpen.set(false);
  }
}
