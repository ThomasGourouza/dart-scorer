import type { GameHistoryRow, GameHistoryTurn } from './game-history.model';

export function groupHistoryByTurn(rows: readonly GameHistoryRow[]): GameHistoryTurn[] {
  const turns: GameHistoryTurn[] = [];
  const roundByPlayerIndex = new Map<number, number>();

  for (const r of rows) {
    if (r.attemptNumber === 1 || turns.length === 0) {
      const nextRound = (roundByPlayerIndex.get(r.playerIndex) ?? 0) + 1;
      roundByPlayerIndex.set(r.playerIndex, nextRound);
      turns.push({
        playerIndex: r.playerIndex,
        round: nextRound,
        playerName: r.playerName,
        throws: [],
      });
    }
    const t = turns[turns.length - 1]!;
    t.throws.push({
      idxInTurn: r.attemptNumber,
      base: r.base,
      mult: r.mult,
      delta: r.delta,
      scoreBefore: r.scoreBefore,
      scoreAfter: r.scoreAfter,
      atIso: r.recordedAtIso,
    });
  }

  return turns;
}

