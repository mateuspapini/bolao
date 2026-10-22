import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar, { photoOf } from "@/components/Avatar";
import EvolutionChart from "@/components/EvolutionChart";
import RoundBars from "@/components/RoundBars";
import { participants, roundPoints, roundWinners, rounds, standings, timeline } from "@/lib/bolao";

export function generateStaticParams() {
  return participants.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = participants.find((x) => x.id === id);
  return { title: `${p?.name ?? "Participante"} · Bolão Maurício Papini` };
}

export default async function Participante({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = standings.find((s) => s.id === id);
  if (!me) notFound();

  const bars = rounds.map((r, i) => ({
    round: r.number,
    points: roundPoints(r, id),
    win: roundWinners[i].ids.includes(id),
    played: r.participants.includes(id),
  }));
  const avg = bars.reduce((s, p) => s + p.points, 0) / bars.length;
  const groupAvg =
    rounds.reduce((s, r) => s + participants.reduce((a, p) => a + roundPoints(r, p.id), 0), 0) /
    (rounds.length * participants.length);
  const bestPos = Math.min(...timeline.map((t) => t.positions[id]));

  const series = participants.map((p) => ({
    id: p.id,
    name: p.name,
    photo: photoOf(p.id),
    totals: timeline.map((t) => t.totals[p.id]),
    positions: timeline.map((t) => t.positions[p.id]),
  }));

  return (
    <main className="wrap">
      <section className="section">
        <p className="back">
          <Link href="/">← Classificação</Link>
        </p>
        <div className="profile">
          <Avatar id={me.id} name={me.name} size={88} ring />
          <div>
            <h2 className="display">{me.name}</h2>
            <div className="sub">
              {me.position}º lugar · {me.total} pontos
            </div>
          </div>
        </div>
        <div className="grid-4">
          <div className="card card-pad tile">
            <div className="k">Posição</div>
            <div className="v display num">{me.position}º</div>
            <div className="s">melhor no ano: {bestPos}º</div>
          </div>
          <div className="card card-pad tile">
            <div className="k">Pontos</div>
            <div className="v display num">{me.total}</div>
            <div className="s num">média {avg.toFixed(1)} por rodada</div>
          </div>
          <div className="card card-pad tile">
            <div className="k">Placares exatos</div>
            <div className="v display num">{me.exacts}</div>
            <div className="s num">+ {me.outcomes} resultados certos</div>
          </div>
          <div className="card card-pad tile">
            <div className="k">Melhor rodada</div>
            <div className="v display num">{me.bestRound.points} pts</div>
            <div className="s">
              na {me.bestRound.round}ª · rei {me.roundWins}×
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="display">Pontos em cada rodada</h2>
          <span className="sub">Tracejado: média do grupo ({groupAvg.toFixed(1)})</span>
        </div>
        <div className="card card-pad">
          <RoundBars bars={bars} groupAvg={groupAvg} name={me.name} />
          <div className="legend">
            <span><span className="swatch" style={{ background: "var(--ink-2)" }} /> Pontos na rodada</span>
            <span><span className="swatch" style={{ background: "var(--gold)" }} /> Foi o rei da rodada</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="display">Posição ao longo do ano</h2>
        </div>
        <div className="card card-pad">
          <EvolutionChart rounds={rounds.map((r) => r.number)} series={series} initial={[id]} />
        </div>
      </section>
    </main>
  );
}
