import raw from "@/data/bolao.json";

/** points = pela regra; sheetPoints = o que estava na planilha, quando era diferente */
export type Pick = { pick: [number, number] | null; points: number; sheetPoints?: number };
export type Game = {
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  postponed: boolean;
  picks: Record<string, Pick>;
};
/** Onde a rodada fica na aba "Rodadas": 1ª linha de jogos e ordem das colunas a partir de G. */
export type SheetLayout = { row: number; columns: string[] };
export type Round = { number: number; games: Game[]; participants: string[]; sheet: SheetLayout };
export type Fixture = { home: string; away: string };
export type UpcomingRound = { number: number; games: Fixture[]; sheet: SheetLayout };
export type Participant = { id: string; name: string };
type Adjustment = { round: number; participant: string; points: number; reason: string };
type Data = {
  season: number;
  title: string;
  rules: { exact: number; outcome: number; galoExact: number; galoOutcome: number; galoTeam: string };
  participants: Participant[];
  rounds: Round[];
  adjustments: Adjustment[];
  upcoming: UpcomingRound[];
};

const data = raw as unknown as Data;

export const season = data.season;
export const rules = data.rules;
export const rounds = [...data.rounds].sort((a, b) => a.number - b.number);
export const participants = data.participants;
export const lastRound = rounds[rounds.length - 1];
export const upcoming = [...data.upcoming].sort((a, b) => a.number - b.number);

const nameById = Object.fromEntries(participants.map((p) => [p.id, p.name]));
export const nameOf = (id: string) => nameById[id] ?? id;

export const isGalo = (g: Game) => g.home === rules.galoTeam || g.away === rules.galoTeam;
export const isExact = (p: Pick, g: Game) => p.points > 0 && p.points === (isGalo(g) ? rules.galoExact : rules.exact);

/** Pontos de cada participante em cada rodada (inclui ajustes manuais). */
export function roundPoints(round: Round, id: string): number {
  const games = round.games.reduce((s, g) => s + (g.picks[id]?.points ?? 0), 0);
  const adj = data.adjustments
    .filter((a) => a.round === round.number && a.participant === id)
    .reduce((s, a) => s + a.points, 0);
  return games + adj;
}

export function adjustmentsFor(roundNumber: number) {
  return data.adjustments.filter((a) => a.round === roundNumber);
}

/** Classificação com empates dividindo a mesma posição. */
function rank<T extends { total: number }>(rows: T[]): (T & { position: number })[] {
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  let pos = 0;
  return sorted.map((r, i) => {
    if (i === 0 || r.total !== sorted[i - 1].total) pos = i + 1;
    return { ...r, position: pos };
  });
}

/** Linha do tempo: total acumulado e posição de cada um ao fim de cada rodada. */
export const timeline = (() => {
  const acc: Record<string, number> = Object.fromEntries(participants.map((p) => [p.id, 0]));
  return rounds.map((round) => {
    for (const p of participants) acc[p.id] += roundPoints(round, p.id);
    const ranked = rank(participants.map((p) => ({ id: p.id, total: acc[p.id] })));
    return {
      round: round.number,
      totals: { ...acc },
      positions: Object.fromEntries(ranked.map((r) => [r.id, r.position])) as Record<string, number>,
    };
  });
})();

export type StatLine = {
  id: string;
  name: string;
  total: number;
  position: number;
  previousPosition: number | null;
  lastRoundPoints: number;
  exacts: number;
  outcomes: number;
  misses: number;
  played: number;
  galoPoints: number;
  bestRound: { round: number; points: number };
  roundWins: number;
};

/** Quem fez mais pontos em cada rodada (pode haver empate). */
export const roundWinners = rounds.map((round) => {
  const pts = participants.map((p) => ({ id: p.id, points: roundPoints(round, p.id) }));
  const max = Math.max(...pts.map((p) => p.points));
  return { round: round.number, points: max, ids: pts.filter((p) => p.points === max).map((p) => p.id) };
});

export const standings: StatLine[] = (() => {
  const last = timeline[timeline.length - 1];
  const prev = timeline[timeline.length - 2];
  const rows = participants.map((p) => {
    let exacts = 0, outcomes = 0, misses = 0, played = 0, galoPoints = 0;
    let bestRound = { round: 0, points: -1 };
    for (const round of rounds) {
      const rp = roundPoints(round, p.id);
      if (rp > bestRound.points) bestRound = { round: round.number, points: rp };
      for (const g of round.games) {
        const pk = g.picks[p.id];
        if (!pk?.pick || g.postponed) continue;
        played++;
        if (isGalo(g)) galoPoints += pk.points;
        if (isExact(pk, g)) exacts++;
        else if (pk.points > 0) outcomes++;
        else misses++;
      }
    }
    return {
      id: p.id,
      name: p.name,
      total: last.totals[p.id],
      position: last.positions[p.id],
      previousPosition: prev ? prev.positions[p.id] : null,
      lastRoundPoints: roundPoints(lastRound, p.id),
      exacts, outcomes, misses, played, galoPoints, bestRound,
      roundWins: roundWinners.filter((w) => w.ids.includes(p.id)).length,
    };
  });
  return rows.sort((a, b) => a.position - b.position || b.exacts - a.exacts || a.name.localeCompare(b.name));
})();

export function roundStandings(round: Round) {
  return rank(participants.map((p) => ({ id: p.id, name: p.name, total: roundPoints(round, p.id) })));
}

export const fmtPick = (p: [number, number] | null) => (p ? `${p[0]} x ${p[1]}` : "–");
