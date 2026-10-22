import Link from "next/link";
import Avatar, { photoOf } from "@/components/Avatar";
import EvolutionChart from "@/components/EvolutionChart";
import Heatmap from "@/components/Heatmap";
import Movement from "@/components/Movement";
import {
  lastRound,
  nameOf,
  participants,
  roundPoints,
  roundWinners,
  rounds,
  season,
  standings,
  timeline,
} from "@/lib/bolao";

const names = (ids: string[]) => ids.map(nameOf).join(" e ");

export default function Home() {
  const leader = standings[0];
  const lastWin = roundWinners[roundWinners.length - 1];

  // curiosidades
  const bestSingle = rounds
    .flatMap((r) => participants.map((p) => ({ id: p.id, round: r.number, points: roundPoints(r, p.id) })))
    .sort((a, b) => b.points - a.points)[0];
  const top = <K extends "exacts" | "galoPoints" | "roundWins">(k: K) => {
    const max = Math.max(...standings.map((s) => s[k]));
    return { value: max, ids: standings.filter((s) => s[k] === max).map((s) => s.id) };
  };
  const exactKing = top("exacts");
  const galoKing = top("galoPoints");
  const roundKing = top("roundWins");

  const maxHits = Math.max(...standings.map((s) => s.exacts + s.outcomes));
  const byHits = [...standings].sort((a, b) => b.exacts - a.exacts || b.outcomes - a.outcomes);

  const series = participants.map((p) => ({
    id: p.id,
    name: p.name,
    photo: photoOf(p.id),
    totals: timeline.map((t) => t.totals[p.id]),
    positions: timeline.map((t) => t.positions[p.id]),
  }));

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <img className="hero-photo" src="/logo.webp" alt="Bolão dos Papinis: Maurício Papini com a camisa do Atlético" width={480} height={480} />
          <div className="hero-title">
            <div className="eyebrow">Campeonato Brasileiro {season}</div>
            <h1 className="display">Bolão Maurício Papini</h1>
          </div>
          <p className="hero-text">
            O bolão que o Maurício organizou por tantos anos com a família continua firme, rodada a rodada.
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="k">Líder</div>
              <div className="v display hero-who">
                <Avatar id={leader.id} name={leader.name} size={28} /> {leader.name}
              </div>
              <div className="s num">{leader.total} pontos</div>
            </div>
            <div className="hero-stat">
              <div className="k">Rodada</div>
              <div className="v display num">
                {lastRound.number}
                <small>/38</small>
              </div>
              <div className="s">faltam {38 - lastRound.number}</div>
            </div>
            <div className="hero-stat">
              <div className="k">Rei da {lastWin.round}ª</div>
              <div className="v display hero-who">
                {lastWin.ids.length === 1 && <Avatar id={lastWin.ids[0]} name={nameOf(lastWin.ids[0])} size={28} />}{" "}
                {names(lastWin.ids)}
              </div>
              <div className="s num">{lastWin.points} pontos</div>
            </div>
          </div>
        </div>
      </section>

      <main className="wrap">
        <section className="section">
          <div className="section-head">
            <h2 className="display">Classificação</h2>
            <span className="sub">
              Atualizada até a <Link href={`/rodadas/${lastRound.number}/`}>rodada {lastRound.number}</Link>
            </span>
          </div>
          <div className="podium">
            {[1, 0, 2].map((k) => {
              const s = standings[k];
              return (
                <Link key={s.id} href={`/participante/${s.id}/`} className={`podium-spot p${k + 1}`}>
                  <Avatar id={s.id} name={s.name} size={k === 0 ? 84 : 64} ring />
                  <span className="podium-pos display">{s.position}º</span>
                  <span className="podium-name">{s.name}</span>
                  <span className="podium-pts display num">{s.total}</span>
                  <span className="podium-step" />
                </Link>
              );
            })}
          </div>
          <div className="card table-scroll">
            <table className="rank-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Participante</th>
                  <th className="r">R{lastRound.number}</th>
                  <th className="r hide-sm">Exatos</th>
                  <th className="r hide-sm">Resultados</th>
                  <th className="r hide-sm">Galo</th>
                  <th className="r">Total</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s) => {
                  return (
                    <tr key={s.id}>
                      <td className={`pos display num${s.position === 1 ? " top1" : ""}`}>
                        {s.position}º
                      </td>
                      <td className="who">
                        <Link href={`/participante/${s.id}/`} className="who-link">
                          <Avatar id={s.id} name={s.name} size={40} />
                          <span>
                            <span className="who-name">{s.name}</span>{" "}
                            <Movement now={s.position} before={s.previousPosition} />
                          </span>
                        </Link>
                      </td>
                      <td className="r num">
                        <span className={lastWin.ids.includes(s.id) ? "pill gold" : "pill"}>+{s.lastRoundPoints}</span>
                      </td>
                      <td className="r num hide-sm">{s.exacts}</td>
                      <td className="r num hide-sm">{s.outcomes}</td>
                      <td className="r num hide-sm">{s.galoPoints}</td>
                      <td className="total display num">{s.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section grid-4">
          <div className="card card-pad tile">
            <div className="k">Melhor rodada do ano</div>
            <div className="v display num">{bestSingle.points} pts</div>
            <div className="s">
              {nameOf(bestSingle.id)} na rodada {bestSingle.round}
            </div>
          </div>
          <div className="card card-pad tile">
            <div className="k">Mais placares exatos</div>
            <div className="v display num">{exactKing.value}</div>
            <div className="s">{names(exactKing.ids)}</div>
          </div>
          <div className="card card-pad tile">
            <div className="k">Mais vezes rei da rodada</div>
            <div className="v display num">{roundKing.value}×</div>
            <div className="s">{names(roundKing.ids)}</div>
          </div>
          <div className="card card-pad tile">
            <div className="k">Quem mais entende de Galo</div>
            <div className="v display num">{galoKing.value} pts</div>
            <div className="s">{names(galoKing.ids)} nos jogos do Atlético</div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2 className="display">Evolução rodada a rodada</h2>
          </div>
          <div className="card card-pad">
            <EvolutionChart
              rounds={rounds.map((r) => r.number)}
              series={series}
              initial={standings.slice(0, 3).map((s) => s.id)}
            />
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2 className="display">Pontos por rodada</h2>
            <span className="sub">Clique no número da rodada para ver os palpites</span>
          </div>
          <div className="card card-pad">
            <Heatmap />
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2 className="display">Quem mais acerta</h2>
            <span className="sub">Número de jogos com placar exato e com o resultado certo</span>
          </div>
          <div className="card card-pad">
            {byHits.map((s) => (
              <div className="hbar" key={s.id} title={`${s.name}: ${s.exacts} exatos, ${s.outcomes} resultados`}>
                <Link href={`/participante/${s.id}/`}>{s.name}</Link>
                <div className="track">
                  <div className="fill first" style={{ width: `${(s.exacts / maxHits) * 100}%`, background: "var(--exact)" }} />
                  <div className="fill" style={{ width: `${(s.outcomes / maxHits) * 100}%`, background: "var(--outcome)" }} />
                </div>
                <span className="val">{s.exacts + s.outcomes}</span>
              </div>
            ))}
            <div className="legend">
              <span><span className="swatch" style={{ background: "var(--exact)" }} /> Placar exato</span>
              <span><span className="swatch" style={{ background: "var(--outcome)" }} /> Só o resultado</span>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
