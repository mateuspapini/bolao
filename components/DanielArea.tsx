"use client";

import { useEffect, useMemo, useState } from "react";
import { scorePick, type Rules } from "@/lib/scoring";
import {
  fmtScore,
  parseFixtures,
  parseWhatsApp,
  readScore,
  norm,
  type FixtureLike,
  type ParsedMessage,
  type Person,
} from "@/lib/whatsapp";

type Upcoming = { number: number; games: FixtureLike[]; sheet: { row: number; columns: string[] } };
type Standing = { id: string; name: string; total: number; position: number };
type Draft = {
  games: FixtureLike[];
  picks: Record<string, string[]>;
  results: string[];
  bonus?: Record<string, string>;
  /** a mensagem da rodada que o Daniel colou, para copiar igualzinha */
  announce?: string;
};

const ALIAS_KEY = "bolao:aliases";
const draftKey = (n: number) => `bolao:daniel:rodada-${n}`;

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sem armazenamento: segue só na memória */
  }
}

function rank<T extends { total: number }>(rows: T[]) {
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  let pos = 0;
  return sorted.map((r, i) => {
    if (i === 0 || r.total !== sorted[i - 1].total) pos = i + 1;
    return { ...r, position: pos };
  });
}

const emptyDraft = (games: FixtureLike[]): Draft => ({ games, picks: {}, results: games.map(() => "") });

export default function DanielArea({
  upcoming,
  people,
  rules,
  lastPlayed,
  standings,
  siteUrl,
  season,
}: {
  upcoming: Upcoming[];
  people: Person[];
  rules: Rules;
  lastPlayed: { number: number; columns: string[] };
  standings: Standing[];
  siteUrl: string;
  season: number;
}) {
  const [roundNumber, setRoundNumber] = useState<number>(upcoming[0]?.number ?? lastPlayed.number + 1);
  const known = upcoming.find((u) => u.number === roundNumber);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(known?.games ?? []));
  const [loaded, setLoaded] = useState(false);
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const [paste, setPaste] = useState("");
  const [fallback, setFallback] = useState<string>("");
  const [parsed, setParsed] = useState<(ParsedMessage & { applied: string | null; choice: string })[]>([]);
  const [gamesText, setGamesText] = useState("");
  const [order, setOrder] = useState<"last" | "sheet">("last");
  const [toast, setToast] = useState<string | null>(null);

  // carrega rascunho salvo neste navegador
  useEffect(() => {
    setAliases(load(ALIAS_KEY, {}));
  }, []);
  useEffect(() => {
    const base = emptyDraft(known?.games ?? []);
    const saved = load<Draft | null>(draftKey(roundNumber), null);
    setDraft(saved && saved.games.length ? saved : base);
    setParsed([]);
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundNumber]);
  useEffect(() => {
    if (loaded) save(draftKey(roundNumber), draft);
  }, [draft, loaded, roundNumber]);

  const games = draft.games;
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? id.charAt(0).toUpperCase() + id.slice(1);

  // ordem das colunas que vai para a planilha
  const columns = order === "sheet" && known ? known.sheet.columns : lastPlayed.columns;
  const peopleOrder = [...columns.filter((c) => people.some((p) => p.id === c)), ...people.map((p) => p.id).filter((id) => !columns.includes(id))];
  const missingColumn = people.filter((p) => !columns.includes(p.id));
  const extraColumns = columns.filter((c) => !people.some((p) => p.id === c));

  const pickOf = (id: string, gi: number) => draft.picks[id]?.[gi] ?? "";
  const results = games.map((_, gi) => readScore(draft.results[gi] ?? ""));
  const pickScore = (id: string, gi: number) => {
    const p = readScore(pickOf(id, gi));
    const r = results[gi];
    return p && r ? scorePick(p, games[gi], r, rules) : null;
  };
  const filled = (id: string) => games.filter((_, gi) => readScore(pickOf(id, gi))).length;
  const received = people.filter((p) => filled(p.id) > 0);
  const missing = people.filter((p) => filled(p.id) === 0);
  const incomplete = people.filter((p) => filled(p.id) > 0 && filled(p.id) < games.length);
  const resultsCount = results.filter(Boolean).length;

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };
  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(msg);
    } catch {
      flash("Não consegui copiar — selecione o texto e copie manualmente");
    }
  };

  const setPick = (id: string, gi: number, value: string) =>
    setDraft((d) => {
      const row = [...(d.picks[id] ?? games.map(() => ""))];
      row[gi] = value;
      return { ...d, picks: { ...d.picks, [id]: row } };
    });
  const setResult = (gi: number, value: string) =>
    setDraft((d) => {
      const r = [...d.results];
      r[gi] = value;
      return { ...d, results: r };
    });

  const applyMessage = (m: ParsedMessage, id: string) =>
    setDraft((d) => {
      const row = [...(d.picks[id] ?? games.map(() => ""))];
      m.picks.forEach((p, gi) => {
        if (p) row[gi] = fmtScore(p);
      });
      return { ...d, picks: { ...d.picks, [id]: row } };
    });

  const read = () => {
    const msgs = parseWhatsApp(paste, games, people, aliases, fallback || null);
    const withState = msgs.map((m) => ({ ...m, applied: null as string | null, choice: m.participantId ?? "" }));
    for (const m of withState) {
      if (m.participantId) {
        applyMessage(m, m.participantId);
        m.applied = m.participantId;
      }
    }
    setParsed(withState);
    if (!msgs.length) flash("Não encontrei nenhum placar no texto colado");
    else setPaste("");
  };

  const applyManual = (i: number) => {
    const m = parsed[i];
    if (!m.choice) return;
    applyMessage(m, m.choice);
    if (m.author) {
      const next = { ...aliases, [norm(m.author).replace(/[^a-z0-9 ]/g, "").trim()]: m.choice };
      setAliases(next);
      save(ALIAS_KEY, next);
    }
    setParsed((ps) => ps.map((p, k) => (k === i ? { ...p, applied: p.choice } : p)));
  };

  const loadGames = () => {
    const g = parseFixtures(gamesText);
    if (!g.length) return flash("Não reconheci nenhum jogo (use “Time x Time”, um por linha)");
    // mantém o que já foi lançado nos jogos que continuam na lista
    setDraft((d) => {
      const from = g.map((ng) => d.games.findIndex((og) => og.home === ng.home && og.away === ng.away));
      const remap = (row: string[]) => from.map((k) => (k >= 0 ? row[k] ?? "" : ""));
      return {
        ...d,
        games: g,
        picks: Object.fromEntries(Object.entries(d.picks).map(([id, row]) => [id, remap(row)])),
        results: remap(d.results),
        announce: gamesText.trim(),
      };
    });
    setGamesText("");
    flash(`${g.length} jogos carregados`);
  };

  const clearRound = () => {
    if (!confirm(`Apagar os palpites e placares da ${roundNumber}ª rodada salvos neste navegador?`)) return;
    setDraft(emptyDraft(known?.games ?? []));
    setParsed([]);
  };

  // textos para o grupo e para a planilha. A mensagem da rodada segue o padrão que o Daniel já usa;
  // se ele colou a dele (com dias e horários) no passo 1, é ela que vai.
  const announce = useMemo(
    () =>
      draft.announce ||
      [`Cartola 🎩 Maurício Papini ${season}`, "", `${roundNumber}ª Rodada`, "", ...games.map((g) => `${g.home} x ${g.away}`)].join(
        "\n",
      ),
    [draft.announce, games, roundNumber, season],
  );
  const reminder = `⏰ Bolão ${roundNumber}ª rodada — ainda faltam os palpites de: ${missing.map((p) => p.name).join(", ")}`;

  const sheetBlock = games
    .map((g, gi) =>
      columns
        .flatMap((id) => {
          const p = readScore(pickOf(id, gi));
          const pts = results[gi] ? String(p ? scorePick(p, g, results[gi]!, rules) : 0) : "";
          return [p ? fmtScore(p) : " - x -", pts];
        })
        .join("\t"),
    )
    .join("\n");
  const scoresBlock = games.map((_, gi) => (results[gi] ? `${results[gi]![0]}\tX\t${results[gi]![1]}` : "\tX\t")).join("\n");

  // bônus especial (raro): pontos extras combinados no grupo, ex. acerto de cruzamentos
  const bonusOf = (id: string) => {
    const n = Number((draft.bonus?.[id] ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };
  const bonusList = people.filter((p) => bonusOf(p.id) !== 0);
  const setBonus = (id: string, value: string) => setDraft((d) => ({ ...d, bonus: { ...d.bonus, [id]: value } }));

  const roundTable = rank(
    people.map((p) => ({
      id: p.id,
      name: p.name,
      total: games.reduce((s, _, gi) => s + (pickScore(p.id, gi) ?? 0), 0) + bonusOf(p.id),
      played: filled(p.id) > 0 || bonusOf(p.id) !== 0,
    })),
  );
  const newTable = rank(
    standings.map((s) => ({ ...s, before: s.position, total: s.total + (roundTable.find((r) => r.id === s.id)?.total ?? 0) })),
  );
  const top = roundTable[0];
  const kings = roundTable.filter((r) => r.total === top?.total && r.played);
  const arrow = (d: number) => (d > 0 ? ` ▲${d}` : d < 0 ? ` ▼${-d}` : "");
  const resultMsg = [
    `🏆 *Bolão Maurício Papini — resultado da ${roundNumber}ª rodada*`,
    "",
    kings.length ? `👑 Rei da rodada: *${kings.map((k) => k.name).join(" e ")}* (${top.total} pts)` : "",
    "",
    "*Pontos na rodada*",
    ...rank(roundTable.filter((r) => r.played)).map((r) => `${r.position}º ${r.name} — ${r.total}`),
    ...(bonusList.length
      ? ["", `⭐ Bônus especial: ${bonusList.map((p) => `${p.name} ${bonusOf(p.id) > 0 ? "+" : ""}${bonusOf(p.id)}`).join(", ")}`]
      : []),
    ...(missing.length ? ["", `Não palpitaram: ${missing.map((p) => p.name).join(", ")}`] : []),
    "",
    "*Classificação geral*",
    ...newTable.map((r) => `${r.position}º ${r.name} — ${r.total}${arrow(r.before - r.position)}`),
    "",
    `Tudo no site: ${siteUrl}`,
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");

  const roundOptions = [...upcoming.map((u) => u.number)];
  if (!roundOptions.includes(roundNumber)) roundOptions.push(roundNumber);

  return (
    <main className="wrap da">
      <div className="section-head">
        <h2 className="display">Área do Daniel</h2>
        <span className="sub">Fica salvo só neste navegador, rodada por rodada</span>
      </div>

      {/* 1. rodada e jogos */}
      <section className="card card-pad section">
        <div className="da-step">1</div>
        <h3 className="display">Rodada e jogos</h3>
        <div className="da-row">
          <label>
            Rodada{" "}
            <select value={roundNumber} onChange={(e) => setRoundNumber(Number(e.target.value))}>
              {roundOptions.sort((a, b) => a - b).map((n) => (
                <option key={n} value={n}>{n}ª rodada</option>
              ))}
            </select>
          </label>
          <button className="btn" onClick={() => copy(announce, "Mensagem da rodada copiada")} disabled={!games.length}>
            Copiar mensagem da rodada
          </button>
          <button className="btn ghost" onClick={clearRound}>Recomeçar rodada</button>
        </div>
        {games.length ? (
          <ol className="da-games">
            {games.map((g, gi) => (
              <li key={gi}>
                {g.home} x {g.away}
                {(g.home === rules.galoTeam || g.away === rules.galoTeam) && <span className="galo-tag">GALO</span>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="note">Esta rodada ainda não tem jogos. Cole a lista abaixo.</p>
        )}
        <details className="da-details" open={!games.length}>
          <summary>Colar a sua mensagem da rodada (com dias e horários)</summary>
          <p className="note" style={{ margin: "0 0 8px" }}>
            Cole a mensagem que você manda no grupo. Os jogos são lidos dela e o botão acima passa a copiar exatamente ela.
          </p>
          <textarea
            rows={8}
            value={gamesText}
            onChange={(e) => setGamesText(e.target.value)}
            placeholder={`Cartola 🎩 Maurício Papini ${season}\n\n${roundNumber}ª Rodada\n\nHOJE\n20h00 - Mirassol x Internacional\n…`}
          />
          <button className="btn" onClick={loadGames}>Usar estes jogos</button>
        </details>
      </section>

      {/* 2. colar */}
      <section className="card card-pad section">
        <div className="da-step">2</div>
        <h3 className="display">Colar os palpites do WhatsApp</h3>
        <p className="lead">
          No WhatsApp, selecione as mensagens com os palpites, copie e cole aqui. Pode colar várias de uma vez ou aos
          poucos. Se alguém mandar de novo, vale o último palpite.
        </p>
        <textarea
          rows={8}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={"[21/10/2026, 20:15] Marcos: Cruzeiro 2 x 0 Remo\nMirassol 1 x 1 São Paulo\n…"}
        />
        <div className="da-row">
          <label>
            Se a mensagem não tiver nome, é de{" "}
            <select value={fallback} onChange={(e) => setFallback(e.target.value)}>
              <option value="">(perguntar)</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <button className="btn primary" onClick={read} disabled={!paste.trim() || !games.length}>
            Ler palpites
          </button>
        </div>
        {parsed.length > 0 && (
          <div className="da-msgs">
            {parsed.map((m, i) => (
              <div key={i} className={`da-msg${m.applied ? " ok" : " ask"}`}>
                <div className="da-msg-head">
                  <b>{m.author ?? "Sem nome"}</b>
                  <span className="note">
                    {m.picks.filter(Boolean).length} de {games.length} jogos
                  </span>
                  {m.applied ? (
                    <span className="pill gold">✓ lançado em {nameOf(m.applied)}</span>
                  ) : (
                    <span className="da-row" style={{ margin: 0 }}>
                      <select
                        value={m.choice}
                        onChange={(e) => setParsed((ps) => ps.map((p, k) => (k === i ? { ...p, choice: e.target.value } : p)))}
                      >
                        <option value="">De quem é?</option>
                        {people.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <button className="btn primary" disabled={!m.choice} onClick={() => applyManual(i)}>Lançar</button>
                    </span>
                  )}
                </div>
                <div className="da-msg-picks num">
                  {m.picks.map((p, gi) => (
                    <span key={gi} className={p ? "" : "faltou"} title={`${games[gi].home} x ${games[gi].away}`}>
                      {p ? fmtScore(p) : "—"}
                    </span>
                  ))}
                </div>
                {m.warnings.length > 0 && (
                  <details>
                    <summary className="note">{m.warnings.length} aviso(s) para conferir</summary>
                    <ul className="note">{m.warnings.map((w, k) => <li key={k}>{w}</li>)}</ul>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. conferir e placares */}
      <section className="card section">
        <div className="card-pad" style={{ paddingBottom: 8 }}>
          <div className="da-step">3</div>
          <h3 className="display">Conferir palpites e lançar os placares</h3>
          <p className="lead">
            Dá para corrigir qualquer célula na mão (ex.: <code>2x1</code>). Quando os jogos acabarem, preencha a coluna
            Placar e os pontos aparecem sozinhos.
          </p>
          <div className="da-row">
            <span className="pill">{received.length} de {people.length} mandaram</span>
            {incomplete.length > 0 && <span className="pill">incompletos: {incomplete.map((p) => p.name).join(", ")}</span>}
            {missing.length > 0 && (
              <button className="btn" onClick={() => copy(reminder, "Lembrete copiado")}>
                Copiar lembrete para quem falta ({missing.length})
              </button>
            )}
          </div>
        </div>
        <div className="table-scroll">
          <table className="picks da-grid">
            <thead>
              <tr>
                <th className="game">Jogo</th>
                <th>Placar</th>
                {peopleOrder.map((id) => (
                  <th key={id} className={filled(id) === 0 ? "faltou" : ""}>
                    {nameOf(id)}
                    <div className="note num">{filled(id)}/{games.length}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {games.map((g, gi) => (
                <tr key={gi}>
                  <td className="game">
                    {g.home} x {g.away}
                    {(g.home === rules.galoTeam || g.away === rules.galoTeam) && <span className="galo-tag">GALO</span>}
                  </td>
                  <td>
                    <input
                      className={`da-in result${results[gi] === undefined ? " bad" : ""}`}
                      value={draft.results[gi] ?? ""}
                      onChange={(e) => setResult(gi, e.target.value)}
                      placeholder="–"
                      aria-label={`Placar de ${g.home} x ${g.away}`}
                    />
                  </td>
                  {peopleOrder.map((id) => {
                    const v = pickOf(id, gi);
                    const ok = readScore(v);
                    const pts = pickScore(id, gi);
                    const cls =
                      ok === undefined ? " bad" : pts === null ? "" : pts >= rules.exact ? " cell-exact" : pts > 0 ? " cell-outcome" : "";
                    return (
                      <td key={id} className={cls}>
                        <input
                          className="da-in"
                          value={v}
                          onChange={(e) => setPick(id, gi, e.target.value)}
                          placeholder="–"
                          aria-label={`Palpite de ${nameOf(id)} em ${g.home} x ${g.away}`}
                        />
                        {pts !== null && <div className="da-pts num">{pts > 0 ? `+${pts}` : "0"}</div>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            {resultsCount > 0 && (
              <tfoot>
                <tr>
                  <td className="game">Pontos na rodada</td>
                  <td />
                  {peopleOrder.map((id) => (
                    <td key={id} className="num">{roundTable.find((r) => r.id === id)?.total ?? 0}</td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="card-pad" style={{ paddingTop: 12 }}>
          <details className="da-details" open={bonusList.length > 0}>
            <summary>Bônus especial nesta rodada (raro)</summary>
            <p className="note" style={{ margin: "0 0 8px" }}>
              Quando o grupo combina pontos extras (ex.: acertar os cruzamentos de um sorteio de chaves), coloque aqui.
              Entra na conta da rodada e na mensagem do resultado.
            </p>
            <div className="da-bonus">
              {people.map((p) => (
                <label key={p.id}>
                  {p.name}
                  <input
                    className="da-in"
                    inputMode="numeric"
                    value={draft.bonus?.[p.id] ?? ""}
                    onChange={(e) => setBonus(p.id, e.target.value)}
                    placeholder="0"
                  />
                </label>
              ))}
            </div>
          </details>
        </div>
      </section>

      {/* 4. planilha */}
      <section className="card card-pad section">
        <div className="da-step">4</div>
        <h3 className="display">Levar para a planilha</h3>
        <p className="lead">
          Os palpites e os pontos já calculados vão num bloco só. Na aba <b>Rodadas</b>, clique na célula indicada e cole
          (Ctrl+V).
        </p>
        <div className="da-row">
          <label>
            Ordem das colunas{" "}
            <select value={order} onChange={(e) => setOrder(e.target.value as "last" | "sheet")}>
              <option value="last">Igual à {lastPlayed.number}ª rodada (com Juliana e Rodrigo)</option>
              {known && <option value="sheet">Como está hoje na {roundNumber}ª rodada da planilha</option>}
            </select>
          </label>
        </div>
        <div className="da-cols">
          {columns.map((c, k) => (
            <span key={k} className={`pill${people.some((p) => p.id === c) ? "" : " warn"}`}>
              {colName(6 + k * 2)} · {nameOf(c)}
            </span>
          ))}
        </div>
        {(missingColumn.length > 0 || extraColumns.length > 0) && (
          <p className="note">
            {missingColumn.length > 0 && <>Sem coluna nessa ordem: {missingColumn.map((p) => p.name).join(", ")}. </>}
            {extraColumns.length > 0 && <>Coluna de quem não está no bolão: {extraColumns.map(nameOf).join(", ")} (vai em branco).</>}
          </p>
        )}
        <div className="da-row">
          <button className="btn primary" onClick={() => copy(sheetBlock, "Bloco copiado — cole na planilha")} disabled={!received.length}>
            Copiar palpites{resultsCount ? " e pontos" : ""} → colar em G{known?.sheet.row ?? "(1ª linha)"}
          </button>
          <button className="btn" onClick={() => copy(scoresBlock, "Placares copiados")} disabled={!resultsCount}>
            Copiar placares → colar em C{known?.sheet.row ?? "(1ª linha)"}
          </button>
        </div>
        {!resultsCount && <p className="note">Sem placares ainda: as colunas de pontos vão em branco.</p>}
        {bonusList.length > 0 && (
          <p className="note">
            Bônus não vai nesse bloco: some na aba <b>Tabela por rodada</b>, como foi o +10 da rodada 12 (
            {bonusList.map((p) => `${p.name} ${bonusOf(p.id) > 0 ? "+" : ""}${bonusOf(p.id)}`).join(", ")}).
          </p>
        )}
      </section>

      {/* 5. resultado */}
      <section className="card card-pad section">
        <div className="da-step">5</div>
        <h3 className="display">Mandar o resultado no grupo</h3>
        {resultsCount === 0 ? (
          <p className="note">Lance os placares no passo 3 para montar a mensagem.</p>
        ) : (
          <>
            {resultsCount < games.length && (
              <p className="note">
                Faltam {games.length - resultsCount} placar(es). Jogos sem placar ficam de fora da conta (como adiados).
              </p>
            )}
            <pre className="da-preview">{resultMsg}</pre>
            <div className="da-row">
              <button className="btn primary" onClick={() => copy(resultMsg, "Resultado copiado")}>Copiar mensagem</button>
              <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(resultMsg)}`} target="_blank" rel="noreferrer">
                Abrir no WhatsApp
              </a>
            </div>
          </>
        )}
      </section>

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

/** índice de coluna (0 = A) → letra(s) da planilha */
function colName(i: number) {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}
