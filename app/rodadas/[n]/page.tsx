import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import ScrollEnd from "@/components/ScrollEnd";
import {
  adjustmentsFor,
  fmtPick,
  isExact,
  isGalo,
  nameOf,
  roundPoints,
  roundStandings,
  rounds,
  standings,
} from "@/lib/bolao";

export function generateStaticParams() {
  return rounds.map((r) => ({ n: String(r.number) }));
}

export async function generateMetadata({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  return { title: `Rodada ${n} · Bolão Maurício Papini` };
}

export default async function Rodada({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const round = rounds.find((r) => r.number === Number(n));
  if (!round) notFound();

  const table = roundStandings(round);
  // colunas na ordem da classificação geral
  const people = standings.map((s) => s.id);
  const adjustments = adjustmentsFor(round.number);
  const corrections = round.games.flatMap((g) =>
    Object.entries(g.picks)
      .filter(([, p]) => p.sheetPoints !== undefined)
      .map(([id, p]) => ({ id, game: `${g.home} x ${g.away}`, from: p.sheetPoints, to: p.points })),
  );

  return (
    <main className="wrap">
      <section className="section">
        <div className="section-head">
          <h2 className="display">{round.number}ª rodada</h2>
          <span className="sub">{round.games.length} jogos</span>
        </div>
        <ScrollEnd className="round-nav" to="active" aria-label="Escolher rodada">
          {rounds.map((r) => (
            <Link key={r.number} href={`/rodadas/${r.number}/`} className={r.number === round.number ? "on" : ""}>
              {r.number}
            </Link>
          ))}
        </ScrollEnd>
      </section>

      <section className="section grid-2" style={{ alignItems: "start" }}>
        <div className="card">
          <table className="rank-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Pontos na rodada</th>
                <th className="r">Pts</th>
              </tr>
            </thead>
            <tbody>
              {table.map((r) => (
                <tr key={r.id}>
                  <td className={`pos display num${r.position === 1 ? " top1" : ""}`}>{r.position}º</td>
                  <td className="who">
                    <Link href={`/participante/${r.id}/`} className="who-link">
                      <Avatar id={r.id} name={r.name} size={32} />
                      <span className="who-name">{r.name}</span>
                      {r.position === 1 && round.participants.includes(r.id) && (
                        <span className="pill gold" title="Rei da rodada">👑 rei</span>
                      )}
                    </Link>
                  </td>
                  <td className="total display num">
                    {round.participants.includes(r.id) ? r.total : <span className="pill">sem palpite</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <table className="rank-table">
            <thead>
              <tr>
                <th>Jogos</th>
                <th className="r">Placar</th>
              </tr>
            </thead>
            <tbody>
              {round.games.map((g, i) => (
                <tr key={i}>
                  <td>
                    {g.home} <span style={{ color: "var(--ink-3)" }}>x</span> {g.away}
                    {isGalo(g) && <span className="galo-tag">GALO</span>}
                  </td>
                  <td className="r display num" style={{ fontSize: 20 }}>
                    {g.postponed ? <span className="pill">adiado</span> : `${g.homeScore} x ${g.awayScore}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="display">Palpites de todo mundo</h2>
        </div>
        <div className="card table-scroll">
          <table className="picks">
            <thead>
              <tr>
                <th className="game">Jogo</th>
                {people.map((id) => (
                  <th key={id}>
                    <Link href={`/participante/${id}/`} className="pick-head">
                      <Avatar id={id} name={nameOf(id)} size={28} />
                      {nameOf(id)}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {round.games.map((g, i) => (
                <tr key={i}>
                  <td className="game">
                    {g.home} <b className="num">{g.postponed ? "–" : `${g.homeScore} x ${g.awayScore}`}</b> {g.away}
                    {isGalo(g) && <span className="galo-tag">GALO</span>}
                  </td>
                  {people.map((id) => {
                    const p = g.picks[id];
                    if (!p?.pick) return <td key={id} className="cell-miss">–</td>;
                    const cls = g.postponed ? "" : isExact(p, g) ? "cell-exact" : p.points > 0 ? "cell-outcome" : "cell-miss";
                    return (
                      <td key={id} className={`num ${cls}`} title={`${nameOf(id)}: ${fmtPick(p.pick)} → ${p.points} pts`}>
                        {fmtPick(p.pick)}
                        {p.points > 0 && <sup> +{p.points}</sup>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="game">Total da rodada</td>
                {people.map((id) => (
                  <td key={id} className="num">{roundPoints(round, id)}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="legend">
          <span><span className="swatch" style={{ background: "color-mix(in oklab, var(--exact) 32%, transparent)" }} /> Placar exato</span>
          <span><span className="swatch" style={{ background: "color-mix(in oklab, var(--outcome) 40%, transparent)" }} /> Acertou o resultado</span>
          <span>– sem palpite</span>
        </div>
        {adjustments.length > 0 && (
          <p className="note">
            <b>Bônus especial:</b>{" "}
            {adjustments.map((a) => `${nameOf(a.participant)} ${a.points > 0 ? "+" : ""}${a.points}`).join(", ")}. De vez em
            quando o grupo combina pontos extras, como por acertar os cruzamentos de um sorteio de chaves.
          </p>
        )}
        {corrections.length > 0 && (
          <p className="note">
            <b>Pontos corrigidos pela regra</b> (estavam diferentes na planilha):{" "}
            {corrections
              .map((c) => `${nameOf(c.id)} em ${c.game} (${c.from} → ${c.to})`)
              .join("; ")}
            .
          </p>
        )}
      </section>
    </main>
  );
}
