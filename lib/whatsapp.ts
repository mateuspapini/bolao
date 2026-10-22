// Leitura dos palpites colados do WhatsApp. Funções puras: recebem os jogos e os
// participantes e devolvem o que entenderam, com avisos para o Daniel conferir.

export type Score = [number, number];
export type FixtureLike = { home: string; away: string };
export type Person = { id: string; name: string };

export type ParsedMessage = {
  /** nome como veio do WhatsApp (ou da linha com o nome) */
  author: string | null;
  /** participante reconhecido, ou null se não deu para saber */
  participantId: string | null;
  /** palpite de cada jogo, na ordem da rodada */
  picks: (Score | null)[];
  warnings: string[];
  raw: string;
};

export const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\u200e\u200f\u202a-\u202e]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// apelidos de cada time (já normalizados). O nome oficial também vale.
const TEAM_ALIASES: Record<string, string[]> = {
  "Atlético": ["atletico mg", "atletico-mg", "atletico mineiro", "galo", "cam", "atletico"],
  "Athlético-PR": ["athletico-pr", "athletico pr", "athletico paranaense", "atletico-pr", "atletico pr", "atletico paranaense", "athletico", "furacao", "cap"],
  "Bahia": ["bahia", "bahea", "esquadrao"],
  "Botafogo": ["botafogo", "fogao"],
  "Bragantino": ["red bull bragantino", "rb bragantino", "bragantino", "braga", "massa bruta", "rbb"],
  "Chapecoense": ["chapecoense", "chape"],
  "Corinthians": ["corinthians", "corintians", "timao", "curintia", "sccp"],
  "Coritiba": ["coritiba", "coxa"],
  "Cruzeiro": ["cruzeiro", "raposa", "cabuloso"],
  "Flamengo": ["flamengo", "mengao", "mengo", "fla"],
  "Fluminense": ["fluminense", "flu", "fluzao"],
  "Grêmio": ["gremio", "tricolor gaucho", "imortal"],
  "Internacional": ["internacional", "inter", "colorado"],
  "Mirassol": ["mirassol", "leao caipira"],
  "Palmeiras": ["palmeiras", "verdao", "porco", "palestra"],
  "Remo": ["clube do remo", "remo", "leao azul"],
  "Santos": ["santos", "peixe", "santastico"],
  "São Paulo": ["sao paulo", "spfc", "sp", "tricolor paulista"],
  "Vasco": ["vasco da gama", "vasco", "vascao", "gigante da colina"],
  "Vitória": ["vitoria", "leao da barra", "ecv"],
};

type Alias = { team: string; alias: string };
const ALL_ALIASES: Alias[] = Object.entries(TEAM_ALIASES)
  .flatMap(([team, list]) => [norm(team), ...list].map((alias) => ({ team, alias })))
  .sort((a, b) => b.alias.length - a.alias.length); // o mais longo primeiro ("atletico pr" antes de "atletico")

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ALIAS_RE = ALL_ALIASES.map((a) => ({ ...a, re: new RegExp(`(^|[^a-z0-9])${escapeRe(a.alias)}(?=$|[^a-z0-9])`, "g") }));

/** Times citados numa linha (normalizada), com a posição em que aparecem. */
function findTeams(line: string, gameTeams: Set<string>) {
  const taken: [number, number][] = [];
  const found: { team: string; index: number }[] = [];
  for (const { team, re } of ALIAS_RE) {
    if (!gameTeams.has(team)) continue;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      const start = m.index + m[1].length;
      const end = start + m[0].length - m[1].length;
      if (taken.some(([s, e]) => start < e && end > s)) continue;
      taken.push([start, end]);
      found.push({ team, index: start });
    }
  }
  return found.sort((a, b) => a.index - b.index);
}

// placar: "2 x 1", "2x1", "2×1", "2-1", "2 a 1"
const SCORE_RE = /(?<![\d:/])(\d{1,2})\s*(?:x|×|-|–|\s+a\s+)\s*(\d{1,2})(?![\d:/])/;
const ENUM_RE = /^\s*(?:\d{1,2}\s*[).º°]|\d{1,2}\s+-\s+(?=\D))\s*/;
// horário do jogo na mensagem da rodada: "20h00", "20h", "20hs", "20:00"
const TIME_RE = /(^|[^\d])\d{1,2}(?:h\d{0,2}s?|:\d{2})(?![\d])/g;

/** Lê um bloco de texto de uma pessoa e devolve os palpites por jogo. */
export function parsePicks(text: string, games: FixtureLike[]) {
  const picks: (Score | null)[] = games.map(() => null);
  const warnings: string[] = [];
  const gameTeams = new Set(games.flatMap((g) => [g.home, g.away]));
  let cursor = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = norm(rawLine).replace(TIME_RE, "$1").replace(ENUM_RE, "");
    const m = SCORE_RE.exec(line);
    if (!m) continue;
    let score: Score = [Number(m[1]), Number(m[2])];
    const scoreAt = m.index;
    const teams = findTeams(line, gameTeams);

    let gi = -1;
    if (teams.length >= 2) {
      const [a, b] = teams;
      gi = games.findIndex((g) => (g.home === a.team && g.away === b.team) || (g.home === b.team && g.away === a.team));
      if (gi >= 0 && games[gi].home !== a.team) score = [score[1], score[0]]; // escreveu o visitante primeiro
    }
    if (gi < 0 && teams.length >= 1) {
      const t = teams[0];
      gi = games.findIndex((g) => g.home === t.team || g.away === t.team);
      if (gi >= 0) {
        const before = t.index < scoreAt;
        const isHome = games[gi].home === t.team;
        if (before !== isHome) score = [score[1], score[0]];
      }
    }
    if (gi < 0) {
      // sem nome de time: segue a ordem dos jogos
      while (cursor < games.length && picks[cursor]) cursor++;
      if (cursor >= games.length) {
        warnings.push(`Placar a mais ignorado: "${rawLine.trim()}"`);
        continue;
      }
      gi = cursor;
      warnings.push(`"${rawLine.trim()}" sem time: considerei ${games[gi].home} x ${games[gi].away}`);
    }
    if (picks[gi] && (picks[gi]![0] !== score[0] || picks[gi]![1] !== score[1])) {
      warnings.push(`${games[gi].home} x ${games[gi].away} apareceu duas vezes; fiquei com ${score[0]} x ${score[1]}`);
    }
    picks[gi] = score;
    cursor = gi + 1;
  }
  return { picks, warnings };
}

// cabeçalhos de mensagem copiada/exportada do WhatsApp:
// [21/10/2026, 20:15] Nome: texto · [20:15, 21/10/2026] Nome: texto · 21/10/2026 20:15 - Nome: texto
const HEADER_RES = [
  /^\[(?:\d{1,2}[/.]\d{1,2}[/.]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?|\d{1,2}:\d{2}(?::\d{2})?,?\s+\d{1,2}[/.]\d{1,2}[/.]\d{2,4})\]\s*([^:]{1,60}?):\s?(.*)$/,
  /^\d{1,2}[/.]\d{1,2}[/.]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*-\s*([^:]{1,60}?):\s?(.*)$/,
];

/** Separa o texto colado em mensagens, cada uma com seu autor (se der para saber). */
export function splitMessages(text: string, people: Person[], aliases: Record<string, string>) {
  const out: { author: string | null; body: string[] }[] = [];
  let cur: { author: string | null; body: string[] } | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^[\u200e\u200f\s]+/, "");
    let header: RegExpExecArray | null = null;
    for (const re of HEADER_RES) if ((header = re.exec(line))) break;
    if (header) {
      cur = { author: header[1].trim(), body: [header[2]] };
      out.push(cur);
      continue;
    }
    // linha só com o nome ("Marcos" ou "Marcos:") começa um bloco novo
    const bare = line.replace(/[:\-–*_]+\s*$/, "").replace(/^[*_]+/, "").trim();
    if (bare && !SCORE_RE.test(bare) && bare.length <= 30 && matchPerson(bare, people, aliases)) {
      cur = { author: bare, body: [] };
      out.push(cur);
      continue;
    }
    if (!cur) {
      cur = { author: null, body: [] };
      out.push(cur);
    }
    cur.body.push(rawLine);
  }
  return out;
}

/** Descobre o participante pelo nome do WhatsApp ("Marcos Papini", "Tio Helinho"...). */
export function matchPerson(author: string, people: Person[], aliases: Record<string, string>): string | null {
  const a = norm(author).replace(/[^a-z0-9 ]/g, "").trim();
  if (!a) return null;
  if (aliases[a]) return aliases[a];
  const words = a.split(" ");
  const NICK: Record<string, string[]> = { helinho: ["helio"], danielle: ["daniele"] };
  for (const p of people) {
    const names = [norm(p.name), ...(NICK[p.id] ?? [])];
    if (names.some((n) => words.includes(n))) return p.id;
  }
  return null;
}

/** Texto colado → mensagens com autor reconhecido e palpites. Mensagens sem placar são descartadas. */
export function parseWhatsApp(
  text: string,
  games: FixtureLike[],
  people: Person[],
  aliases: Record<string, string> = {},
  fallbackAuthor: string | null = null,
): ParsedMessage[] {
  return splitMessages(text, people, aliases)
    .map(({ author, body }) => {
      const raw = body.join("\n");
      const { picks, warnings } = parsePicks(raw, games);
      const participantId = author ? matchPerson(author, people, aliases) : fallbackAuthor;
      return { author, participantId, picks, warnings, raw };
    })
    .filter((m) => m.picks.some(Boolean));
}

/** Lê a lista de jogos ("Cruzeiro x Remo", um por linha). */
export function parseFixtures(text: string): FixtureLike[] {
  const all = new Set(Object.keys(TEAM_ALIASES));
  const games: FixtureLike[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const t = findTeams(norm(raw), all);
    if (t.length >= 2 && t[0].team !== t[1].team) games.push({ home: t[0].team, away: t[1].team });
  }
  return games;
}

export const fmtScore = (s: Score | null) => (s ? `${s[0]} x ${s[1]}` : "");

/** "2x1", "2 - 1", "2 x 1" → [2, 1]; vazio → null; inválido → undefined */
export function readScore(s: string): Score | null | undefined {
  if (!s.trim()) return null;
  const m = /^\s*(\d{1,2})\s*(?:x|×|-|–|a)?\s*(\d{1,2})\s*$/i.exec(s);
  return m ? [Number(m[1]), Number(m[2])] : undefined;
}
