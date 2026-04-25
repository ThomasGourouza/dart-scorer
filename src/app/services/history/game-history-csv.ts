import type { GameHistoryRow } from './game-history.model';

export interface BuildHistoryCsvArgs {
  gameStartedAtIso: string | null;
  rows: readonly GameHistoryRow[];
  winnerName: string;
}

export function buildGameHistoryCsv(args: BuildHistoryCsvArgs): string {
  const header = [
    'game_started_at',
    'recorded_at',
    'player_index',
    'player_name',
    'round',
    'attempt',
    'base',
    'multiplier',
    'delta',
    'score_before',
    'score_after',
    'winner_name',
  ].join(',');

  const roundByPlayerIndex = new Map<number, number>();
  const lines = args.rows.map((r) => {
    let round = roundByPlayerIndex.get(r.playerIndex) ?? 0;
    if (r.attemptNumber === 1) {
      round += 1;
      roundByPlayerIndex.set(r.playerIndex, round);
    }
    return [
      csvCell(formatDateTimeForCsv(args.gameStartedAtIso)),
      csvCell(formatDateTimeForCsv(r.recordedAtIso)),
      String(r.playerIndex + 1),
      csvCell(r.playerName),
      String(round),
      String(r.attemptNumber),
      String(r.base),
      String(r.mult),
      String(r.delta),
      String(r.scoreBefore),
      String(r.scoreAfter),
      csvCell(args.winnerName),
    ].join(',');
  });

  return [header, ...lines].join('\n') + '\n';
}

export function formatDateTimeForCsv(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yyyy = String(d.getFullYear());
  const hh = pad2(d.getHours());
  const min = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  return `${dd}/${mm}/${yyyy} - ${hh}:${min}:${ss}`;
}

export function csvCell(v: string): string {
  if (v.includes('"')) v = v.replaceAll('"', '""');
  if (v.includes(',') || v.includes('\n') || v.includes('\r') || v.includes('"')) {
    return `"${v}"`;
  }
  return v;
}

