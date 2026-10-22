export default function Movement({ now, before }: { now: number; before: number | null }) {
  if (before === null) return null;
  const d = before - now;
  if (d > 0) return <span className="move up" title={`Subiu ${d} posição(ões)`}>▲ {d}</span>;
  if (d < 0) return <span className="move down" title={`Caiu ${-d} posição(ões)`}>▼ {-d}</span>;
  return null;
}
