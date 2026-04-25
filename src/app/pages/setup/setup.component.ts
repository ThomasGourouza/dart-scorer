import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  GameStateService,
  GameStartEntry,
  GameVariant,
} from '../../services/game-state.service';
import {
  PLAYER_COLOR_PALETTE,
  defaultColorIdsForCount,
} from '../../theme/player-colors';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './setup.component.html',
  styleUrl: './setup.component.css',
})
export class SetupComponent {
  protected readonly game = inject(GameStateService);
  private readonly router = inject(Router);

  protected readonly palette = PLAYER_COLOR_PALETTE;

  protected playerCount = 2;
  protected names: string[] = ['Vika', 'Tom'];
  protected colorIds: string[] = defaultColorIdsForCount(2);
  protected variant: GameVariant | null = null;

  protected onCountChange(event: Event): void {
    const el = event.target as HTMLSelectElement;
    const n = Math.min(10, Math.max(2, parseInt(el.value, 10) || 2));
    this.playerCount = n;
    while (this.names.length < n) {
      this.names.push(`Player ${this.names.length + 1}`);
    }
    if (this.names.length > n) {
      this.names.length = n;
    }
    while (this.colorIds.length < n) {
      const used = new Set(this.colorIds);
      const next = PLAYER_COLOR_PALETTE.find((p) => !used.has(p.id));
      this.colorIds.push(next?.id ?? PLAYER_COLOR_PALETTE[0]!.id);
    }
    if (this.colorIds.length > n) {
      this.colorIds.length = n;
    }
  }

  protected colorDisabledForRow(row: number, colorId: string): boolean {
    return this.colorIds.some((c, j) => j !== row && c === colorId);
  }

  protected pickColor(row: number, colorId: string): void {
    if (this.colorDisabledForRow(row, colorId)) return;
    this.colorIds[row] = colorId;
  }

  protected start(variant: GameVariant): void {
    const entries: GameStartEntry[] = [];
    for (let i = 0; i < this.playerCount; i++) {
      entries.push({
        name: this.names[i] ?? `Player ${i + 1}`,
        colorId: this.colorIds[i] ?? defaultColorIdsForCount(this.playerCount)[i]!,
      });
    }
    this.game.startGame(entries, variant);
    void this.router.navigate(['/play']);
  }

  protected chooseVariantAndStart(variant: GameVariant): void {
    this.variant = variant;

    if (this.game.hasActiveGame()) {
      const ok = confirm('Start a new game? This will replace the current game.');
      if (!ok) {
        this.variant = null;
        return;
      }
    }

    this.start(variant);
  }

  protected resume(): void {
    void this.router.navigate(['/play']);
  }

  /** Row indices 0 .. playerCount-1 for template iteration. */
  protected slotIndexes(): number[] {
    return Array.from({ length: this.playerCount }, (_, i) => i);
  }
}
