import DanielArea from "@/components/DanielArea";
import { lastRound, participants, rules, season, standings, upcoming } from "@/lib/bolao";

export const metadata = {
  title: "Área do Daniel · Bolão Maurício Papini",
  robots: { index: false, follow: false },
};

export default function Daniel() {
  return (
    <DanielArea
      upcoming={upcoming}
      people={participants}
      rules={rules}
      lastPlayed={{ number: lastRound.number, columns: lastRound.sheet.columns }}
      standings={standings.map((s) => ({ id: s.id, name: s.name, total: s.total, position: s.position }))}
      siteUrl="https://bolao.mapasolucoesdigitais.com.br"
      season={season}
    />
  );
}
