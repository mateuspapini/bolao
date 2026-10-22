export type Rules = { exact: number; outcome: number; galoExact: number; galoOutcome: number; galoTeam: string };

const outcome = (h: number, a: number) => Math.sign(h - a);

/** Pontos de um palpite pela regra do bolão (jogo do Galo substitui, não soma). */
export function scorePick(
  pick: [number, number] | null,
  game: { home: string; away: string },
  result: [number, number] | null,
  rules: Rules,
): number {
  if (!pick || !result) return 0;
  const galo = game.home === rules.galoTeam || game.away === rules.galoTeam;
  if (pick[0] === result[0] && pick[1] === result[1]) return galo ? rules.galoExact : rules.exact;
  if (outcome(...pick) === outcome(...result)) return galo ? rules.galoOutcome : rules.outcome;
  return 0;
}
