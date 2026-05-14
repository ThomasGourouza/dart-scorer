import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';
import { PlayerCompareDto } from '../../../../services/stats-api.service';
import {
  PLAYER_COLOR_PALETTE,
  PlayerColorDef,
  getPlayerColor,
} from '../../../../theme/player-colors';

type AxisKey =
  | 'bestRound'
  | 'firstPlayerWinRate'
  | 'winRate'
  | 'avgDart'
  | 'bestCheckout'
  | 'tonPlus';

interface RadarAxis {
  readonly key: AxisKey;
  readonly label: string;
  readonly max: number;
  readonly format: (value: number) => string;
  readonly x: number;
  readonly y: number;
  readonly labelX: number;
  readonly labelY: number;
  readonly labelAnchor: 'start' | 'middle' | 'end';
  readonly maxLabel: string;
}

interface RadarSeries {
  readonly playerName: string;
  readonly gamesPlayed: number;
  readonly stroke: string;
  readonly fill: string;
  readonly polygonPoints: string;
  readonly vertices: readonly { readonly x: number; readonly y: number }[];
}

const SVG_SIZE = 320;
const CENTER = SVG_SIZE / 2;
const RADIUS = 120;
const RING_LEVELS = [0.25, 0.5, 0.75, 1.0] as const;

@Component({
  selector: 'app-stats-compare-radar',
  standalone: true,
  templateUrl: './stats-compare-radar.component.html',
  styleUrl: './stats-compare-radar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsCompareRadarComponent {
  readonly players = input.required<readonly PlayerCompareDto[]>();

  protected readonly svgSize = SVG_SIZE;
  protected readonly center = CENTER;
  protected readonly radius = RADIUS;
  protected readonly ringRadii = RING_LEVELS.map((l) => l * RADIUS);

  // Names of players currently rendered on the chart. Defaults to every name
  // present in `players()`; reconciled by the effect below whenever the input
  // changes (e.g. a fresh /compare response with a different roster).
  protected readonly visibleNames = signal<ReadonlySet<string>>(new Set());

  protected readonly visiblePlayers = computed(() =>
    this.players().filter((p) => this.visibleNames().has(p.playerName)),
  );

  protected readonly axes = computed<readonly RadarAxis[]>(() => {
    const players = this.visiblePlayers();
    const bestRound = players.map((p) => p.bestRound ?? 0);
    const firstWinRate = players.map((p) => p.firstPlayerWinRate);
    const winRate = players.map((p) => p.winRate);
    const avgDart = players.map((p) => p.averageDeltaPerThrow);
    const bestCheckout = players.map((p) => p.bestCheckout ?? 0);
    const tonPlus = players.map((p) => p.tonPlusRoundCount);

    const definitions: Array<
      Omit<RadarAxis, 'x' | 'y' | 'labelX' | 'labelY' | 'labelAnchor' | 'maxLabel'>
    > = [
      { key: 'bestRound',          label: 'Best round',     max: max(bestRound),    format: fmtInt },
      { key: 'firstPlayerWinRate', label: 'Win rate (1st)', max: max(firstWinRate), format: fmtPct },
      { key: 'winRate',            label: 'Win rate',       max: max(winRate),      format: fmtPct },
      { key: 'avgDart',            label: 'Avg / dart',     max: max(avgDart),      format: (v) => v.toFixed(2) },
      { key: 'bestCheckout',       label: 'Best checkout',  max: max(bestCheckout), format: fmtInt },
      { key: 'tonPlus',            label: 'Ton+',           max: max(tonPlus),      format: fmtInt },
    ];

    const labelOffset = 18;
    return definitions.map((def, idx) => {
      const angle = angleForIndex(idx, definitions.length);
      const x = CENTER + Math.cos(angle) * RADIUS;
      const y = CENTER + Math.sin(angle) * RADIUS;
      const labelX = CENTER + Math.cos(angle) * (RADIUS + labelOffset);
      const labelY = CENTER + Math.sin(angle) * (RADIUS + labelOffset);
      const cos = Math.cos(angle);
      const labelAnchor: RadarAxis['labelAnchor'] =
        Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
      return {
        ...def,
        x,
        y,
        labelX,
        labelY,
        labelAnchor,
        maxLabel: def.max > 0 ? def.format(def.max) : '',
      };
    });
  });

  protected readonly series = computed<readonly RadarSeries[]>(() => {
    const axes = this.axes();
    return this.visiblePlayers().map((player, idx) => {
      const palette = this.colorFor(player, idx);
      const values = axes.map((axis) => valueForAxis(player, axis));
      const vertices = axes.map((axis, i) => {
        const norm = axis.max > 0 ? Math.max(0, values[i]!) / axis.max : 0;
        const angle = angleForIndex(i, axes.length);
        return {
          x: CENTER + Math.cos(angle) * RADIUS * norm,
          y: CENTER + Math.sin(angle) * RADIUS * norm,
        };
      });
      const polygonPoints = vertices.map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(' ');
      return {
        playerName: player.playerName,
        gamesPlayed: player.gamesPlayed,
        stroke: palette.accent,
        fill: palette.accentMuted,
        polygonPoints,
        vertices,
      };
    });
  });

  constructor() {
    effect(
      () => {
        const names = new Set(this.players().map((p) => p.playerName));
        this.visibleNames.set(names);
      },
      { allowSignalWrites: true },
    );
  }

  protected toggle(name: string): void {
    const next = new Set(this.visibleNames());
    if (next.has(name)) next.delete(name);
    else next.add(name);
    this.visibleNames.set(next);
  }

  protected isVisible(name: string): boolean {
    return this.visibleNames().has(name);
  }

  protected legendColor(player: PlayerCompareDto): string {
    const idx = this.players().findIndex((p) => p.playerName === player.playerName);
    return this.colorFor(player, Math.max(0, idx)).accent;
  }

  private colorFor(player: PlayerCompareDto, fallbackIndex: number): PlayerColorDef {
    if (player.dominantColor) return getPlayerColor(player.dominantColor);
    return PLAYER_COLOR_PALETTE[fallbackIndex % PLAYER_COLOR_PALETTE.length]!;
  }
}

function angleForIndex(index: number, total: number): number {
  return -Math.PI / 2 + (index * 2 * Math.PI) / total;
}

function max(values: readonly number[]): number {
  let m = 0;
  for (const v of values) if (v > m) m = v;
  return m;
}

function valueForAxis(player: PlayerCompareDto, axis: RadarAxis): number {
  switch (axis.key) {
    case 'bestRound':
      return player.bestRound ?? 0;
    case 'firstPlayerWinRate':
      return player.firstPlayerWinRate;
    case 'winRate':
      return player.winRate;
    case 'avgDart':
      return player.averageDeltaPerThrow;
    case 'bestCheckout':
      return player.bestCheckout ?? 0;
    case 'tonPlus':
      return player.tonPlusRoundCount;
  }
}

function fmtInt(v: number): string {
  return String(Math.round(v));
}

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(0)}%`;
}
