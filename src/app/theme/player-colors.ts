/** Fixed palette: one id per player slot (max 10). */
export interface PlayerColorDef {
  id: string;
  label: string;
  /** Primary accent (borders, badge) */
  accent: string;
  /** Softer accent for fills */
  accentMuted: string;
  /** Slight panel tint */
  surface: string;
  /** Ring / outline for scoreboard */
  ring: string;
}

export const PLAYER_COLOR_PALETTE: readonly PlayerColorDef[] = [
  { id: 'coral', label: 'Coral', accent: '#f97066', accentMuted: 'rgba(249,112,102,0.22)', surface: 'rgba(249,112,102,0.08)', ring: '#f97066' },
  { id: 'sky', label: 'Sky', accent: '#38bdf8', accentMuted: 'rgba(56,189,248,0.22)', surface: 'rgba(56,189,248,0.08)', ring: '#38bdf8' },
  { id: 'mint', label: 'Mint', accent: '#34d399', accentMuted: 'rgba(52,211,153,0.22)', surface: 'rgba(52,211,153,0.08)', ring: '#34d399' },
  { id: 'violet', label: 'Violet', accent: '#a78bfa', accentMuted: 'rgba(167,139,250,0.25)', surface: 'rgba(167,139,250,0.1)', ring: '#a78bfa' },
  { id: 'amber', label: 'Amber', accent: '#fbbf24', accentMuted: 'rgba(251,191,36,0.22)', surface: 'rgba(251,191,36,0.08)', ring: '#fbbf24' },
  { id: 'rose', label: 'Rose', accent: '#fb7185', accentMuted: 'rgba(251,113,133,0.22)', surface: 'rgba(251,113,133,0.08)', ring: '#fb7185' },
  { id: 'lime', label: 'Lime', accent: '#a3e635', accentMuted: 'rgba(163,230,53,0.2)', surface: 'rgba(163,230,53,0.08)', ring: '#a3e635' },
  { id: 'azure', label: 'Azure', accent: '#22d3ee', accentMuted: 'rgba(34,211,238,0.22)', surface: 'rgba(34,211,238,0.08)', ring: '#22d3ee' },
  { id: 'peach', label: 'Peach', accent: '#fdba74', accentMuted: 'rgba(253,186,116,0.22)', surface: 'rgba(253,186,116,0.08)', ring: '#fdba74' },
  { id: 'lilac', label: 'Lilac', accent: '#e879f9', accentMuted: 'rgba(232,121,249,0.22)', surface: 'rgba(232,121,249,0.09)', ring: '#e879f9' },
] as const;

export function getPlayerColor(id: string | undefined): PlayerColorDef {
  const found = PLAYER_COLOR_PALETTE.find((p) => p.id === id);
  return found ?? PLAYER_COLOR_PALETTE[0];
}

export function isKnownPlayerColorId(id: string | undefined): boolean {
  return !!id && PLAYER_COLOR_PALETTE.some((p) => p.id === id);
}

/** First N unique color ids from the palette (in order). */
export function defaultColorIdsForCount(n: number): string[] {
  return PLAYER_COLOR_PALETTE.slice(0, n).map((p) => p.id);
}
