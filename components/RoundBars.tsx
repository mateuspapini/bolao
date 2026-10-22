"use client";

import Link from "next/link";
import { useState } from "react";
import { useWidth } from "./useWidth";

type Bar = { round: number; points: number; win: boolean; played: boolean };

/** Pontos de uma pessoa em cada rodada, com a média do grupo tracejada. */
export default function RoundBars({ bars, groupAvg, name }: { bars: Bar[]; groupAvg: number; name: string }) {
  const [wrapRef, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const narrow = W < 560;
  const H = narrow ? 180 : 210;
  const M = { top: 20, right: 6, bottom: 24, left: 26 };
  const max = Math.max(...bars.map((b) => b.points), 1);
  const yMax = Math.ceil(max / 5) * 5;
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const bw = iw / bars.length;
  const gap = narrow ? 1 : 2;
  const y = (v: number) => M.top + ih - (v / yMax) * ih;
  const every = narrow ? 10 : 5;

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Pontos de ${name} por rodada`}>
        <g className="grid">
          {[0, yMax / 2, yMax].map((t) => (
            <line key={t} x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
          ))}
        </g>
        <g className="axis">
          {[0, yMax / 2, yMax].map((t) => (
            <text key={t} x={M.left - 6} y={y(t) + 4} textAnchor="end">{t}</text>
          ))}
          {bars.map((b, i) =>
            i === 0 || i === bars.length - 1 || (b.round % every === 0 && bars.length - 1 - i > 3) ? (
              <text key={b.round} x={M.left + i * bw + bw / 2} y={H - 6} textAnchor="middle">R{b.round}</text>
            ) : null,
          )}
        </g>
        {bars.map((b, i) => {
          const h = Math.max(0, y(0) - y(b.points));
          const x = M.left + i * bw + gap / 2;
          const w = Math.max(1, bw - gap);
          const r = Math.min(3, w / 2, h);
          return (
            <Link key={b.round} href={`/rodadas/${b.round}/`}>
              <g onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
                <rect x={M.left + i * bw} y={M.top} width={bw} height={ih} fill="transparent" />
                {h > 0 && (
                  <path
                    d={`M${x},${y(0)} V${y(b.points) + r} Q${x},${y(b.points)} ${x + r},${y(b.points)} H${x + w - r} Q${x + w},${y(b.points)} ${x + w},${y(b.points) + r} V${y(0)} Z`}
                    fill={b.win ? "var(--gold)" : "var(--ink-2)"}
                    opacity={hover === null || hover === i ? 1 : 0.55}
                  />
                )}
                {(b.win || b.points === max) && !narrow && (
                  <text x={x + w / 2} y={y(b.points) - 5} textAnchor="middle" fontSize={11} fill="var(--ink)" fontWeight={600}>
                    {b.points}
                  </text>
                )}
              </g>
            </Link>
          );
        })}
        <line x1={M.left} x2={W - M.right} y1={y(groupAvg)} y2={y(groupAvg)} stroke="var(--ink)" strokeDasharray="4 4" strokeWidth={1.5} />
      </svg>
      {hover !== null && (
        <div
          className="tooltip"
          style={{
            left: M.left + hover * bw + bw / 2,
            top: 0,
            transform: hover > bars.length / 2 ? "translateX(calc(-100% - 8px))" : "translateX(8px)",
          }}
        >
          <div className="t">Rodada {bars[hover].round}</div>
          <div>
            {bars[hover].played ? `${bars[hover].points} pts` : "não palpitou"}
            {bars[hover].win ? " · rei da rodada 👑" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
