import Link from "next/link";
import Avatar from "./Avatar";
import ScrollEnd from "./ScrollEnd";
import { nameOf, roundPoints, roundWinners, rounds, standings } from "@/lib/bolao";

const BINS = [5, 10, 15, 20, 25]; // limites: 0–4, 5–9, 10–14, 15–19, 20–24, 25+
const bin = (v: number) => BINS.filter((b) => v >= b).length;

export default function Heatmap() {
  return (
    <div>
      <ScrollEnd className="heat-scroll">
        <table className="heat">
          <thead>
            <tr>
              <th />
              {rounds.map((r) => (
                <th key={r.number}>
                  <Link href={`/rodadas/${r.number}/`}>{r.number}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standings.map((s) => (
              <tr key={s.id}>
                <th className="name">
                  <Link href={`/participante/${s.id}/`} className="who-link">
                    <Avatar id={s.id} name={s.name} size={22} /> {s.name}
                  </Link>
                </th>
                {rounds.map((r) => {
                  if (!r.participants.includes(s.id))
                    return (
                      <td key={r.number} className="h0" title={`${nameOf(s.id)} não palpitou na rodada ${r.number}`}>
                        ·
                      </td>
                    );
                  const v = roundPoints(r, s.id);
                  const win = roundWinners.find((w) => w.round === r.number)!.ids.includes(s.id);
                  return (
                    <td
                      key={r.number}
                      className={`h${bin(v)}${win ? " win" : ""}`}
                      title={`${nameOf(s.id)} · Rodada ${r.number}: ${v} pts${win ? " (rei da rodada)" : ""}`}
                    >
                      {v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollEnd>
      <div className="legend">
        <span>Pontos na rodada:</span>
        {["0–4", "5–9", "10–14", "15–19", "20–24", "25+"].map((l, i) => (
          <span key={l}>
            <span className={`swatch h${i}`} /> {l}
          </span>
        ))}
        <span>
          <span className="swatch" style={{ boxShadow: "inset 0 0 0 2px var(--ink)" }} /> rei da rodada
        </span>
        <span>· não palpitou</span>
      </div>
    </div>
  );
}
