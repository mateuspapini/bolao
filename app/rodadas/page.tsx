import Link from "next/link";
import { nameOf, roundWinners, rounds } from "@/lib/bolao";

export const metadata = { title: "Rodadas · Bolão Maurício Papini" };

export default function Rodadas() {
  return (
    <main className="wrap">
      <div className="section-head">
        <h2 className="display">Rodadas</h2>
        <span className="sub">{rounds.length} rodadas disputadas</span>
      </div>
      <div className="card table-scroll">
        <table className="rank-table">
          <thead>
            <tr>
              <th>Rodada</th>
              <th>Rei da rodada</th>
              <th className="r">Pontos</th>
            </tr>
          </thead>
          <tbody>
            {[...roundWinners].reverse().map((w) => (
              <tr key={w.round}>
                <td className="display num" style={{ fontSize: 20 }}>
                  <Link href={`/rodadas/${w.round}/`} style={{ textDecoration: "none" }}>{w.round}ª</Link>
                </td>
                <td className="who">
                  <Link href={`/rodadas/${w.round}/`}>{w.ids.map(nameOf).join(", ")}</Link>
                </td>
                <td className="r num">{w.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
