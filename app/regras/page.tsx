import { rules } from "@/lib/bolao";

export const metadata = { title: "Regras · Bolão Maurício Papini" };

export default function Regras() {
  return (
    <main className="wrap" style={{ maxWidth: 720 }}>
      <div className="section-head">
        <h2 className="display">Regras</h2>
      </div>
      <div className="card card-pad">
        <ul className="rules-list">
          <li>
            <span className="pts display num">{rules.exact}</span>
            <span><b>Placar exato.</b> Acertou o placar do jogo.</span>
          </li>
          <li>
            <span className="pts display num">{rules.outcome}</span>
            <span><b>Resultado certo.</b> Acertou quem venceu, ou que deu empate, mas errou o placar.</span>
          </li>
          <li>
            <span className="pts display num" style={{ color: "var(--gold)" }}>{rules.galoExact}</span>
            <span><b>Placar exato do Galo.</b> Nos jogos do Atlético, o placar exato vale mais.</span>
          </li>
          <li>
            <span className="pts display num" style={{ color: "var(--gold)" }}>{rules.galoOutcome}</span>
            <span><b>Resultado certo do Galo.</b> Vitória, empate ou derrota do Atlético certinho.</span>
          </li>
        </ul>
      </div>
      <p className="note" style={{ marginTop: 16 }}>
        Os pontos do jogo do Atlético substituem os pontos normais (não somam). De vez em quando o grupo combina um
        bônus especial (por exemplo, por acertar os cruzamentos de um sorteio de chaves); quando acontece, ele aparece
        na página da rodada.
      </p>
    </main>
  );
}
