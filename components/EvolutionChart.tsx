"use client";

import { useMemo, useState } from "react";
import { useWidth } from "./useWidth";

export type Series = { id: string; name: string; photo: string | null; totals: number[]; positions: number[] };

const SLOTS = ["var(--sel-1)", "var(--sel-2)", "var(--sel-3)"];

export default function EvolutionChart({
  rounds,
  series,
  initial,
}: {
  rounds: number[];
  series: Series[];
  initial: string[];
}) {
  const [mode, setMode] = useState<"totals" | "positions">("positions");
  // a cor fica presa à pessoa escolhida, não à posição dela no ranking
  const [selected, setSelected] = useState<(string | null)[]>([initial[0] ?? null, initial[1] ?? null, initial[2] ?? null]);
  const [hover, setHover] = useState<number | null>(null);
  const [wrapRef, W] = useWidth<HTMLDivElement>();

  const narrow = W < 560;
  const H = narrow ? 280 : 340;
  const M = { top: 14, right: narrow ? 78 : 110, bottom: 26, left: narrow ? 30 : 36 };

  const colorOf = (id: string) => {
    const i = selected.indexOf(id);
    return i >= 0 ? SLOTS[i] : null;
  };

  const toggle = (id: string) => {
    setSelected((cur) => {
      const i = cur.indexOf(id);
      if (i >= 0) return cur.map((v) => (v === id ? null : v));
      const free = cur.indexOf(null);
      if (free < 0) return cur; // já tem 3
      return cur.map((v, k) => (k === free ? id : v));
    });
  };

  const n = rounds.length;
  const maxTotal = Math.max(...series.flatMap((s) => s.totals));
  const yMax = mode === "totals" ? Math.ceil(maxTotal / 50) * 50 : series.length;
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const x = (i: number) => M.left + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) =>
    mode === "totals" ? M.top + ih - (v / yMax) * ih : M.top + ((v - 1) / (yMax - 1)) * ih;

  const ticks = useMemo(() => {
    if (mode === "totals") {
      const step = yMax > 300 ? 100 : 50;
      return Array.from({ length: Math.floor(yMax / step) + 1 }, (_, i) => i * step);
    }
    return [1, 4, 7, 10, 13].filter((t) => t <= yMax);
  }, [mode, yMax]);

  const every = narrow ? 10 : 5;
  const xTicks = rounds
    .map((r, i) => ({ r, i }))
    .filter(({ r, i }) => i === 0 || i === n - 1 || (r % every === 0 && n - 1 - i > (narrow ? 4 : 2)));

  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");

  const pick = (clientX: number, el: SVGSVGElement) => {
    const rect = el.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - M.left) / iw) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const values = (s: Series) => (mode === "totals" ? s.totals : s.positions);
  const muted = series.filter((s) => !colorOf(s.id));
  const highlighted = selected.map((id) => series.find((s) => s.id === id)).filter(Boolean) as Series[];

  // rótulos diretos no fim da linha, afastados para não colidir
  const labels = highlighted
    .map((s) => ({ s, y: y(values(s)[n - 1]) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) labels[i].y = Math.max(labels[i].y, labels[i - 1].y + 16);

  const tipRows =
    hover === null
      ? []
      : [...series]
          .map((s) => ({ s, v: values(s)[hover], c: colorOf(s.id) }))
          .sort((a, b) => (mode === "totals" ? b.v - a.v : a.v - b.v));
  const tipShown = tipRows.filter((r, i) => r.c || i < 3);
  const fmt = (v: number) => (mode === "positions" ? `${v}º` : `${v}`);

  return (
    <div>
      <div className="controls">
        <div className="seg" role="group" aria-label="Medida">
          <button aria-pressed={mode === "positions"} onClick={() => setMode("positions")}>Posição</button>
          <button aria-pressed={mode === "totals"} onClick={() => setMode("totals")}>Pontos</button>
        </div>
        <span className="note">Toque em até 3 pessoas para comparar</span>
      </div>
      <div className="chips">
        {series.map((s) => {
          const c = colorOf(s.id);
          return (
            <button
              key={s.id}
              className="chip"
              aria-pressed={!!c}
              onClick={() => toggle(s.id)}
              style={c ? { borderColor: c, boxShadow: `inset 0 0 0 1px ${c}` } : undefined}
            >
              {s.photo ? (
                <img className="avatar" src={s.photo} alt="" width={22} height={22} style={{ width: 22, height: 22 }} />
              ) : (
                <span className="swatch" style={{ background: c ?? "var(--line-muted)" }} />
              )}
              {s.name}
              {c && <span className="swatch" style={{ background: c }} />}
            </button>
          );
        })}
      </div>
      <div className="chart-wrap" ref={wrapRef} style={{ marginTop: 12 }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          role="img"
          aria-label={`Evolução por rodada (${mode === "totals" ? "pontos acumulados" : "posição"})`}
          style={{ touchAction: "pan-y" }}
          onPointerMove={(e) => pick(e.clientX, e.currentTarget)}
          onPointerDown={(e) => pick(e.clientX, e.currentTarget)}
          onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
        >
          <g className="grid">
            {ticks.map((t) => (
              <line key={t} x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
            ))}
          </g>
          <g className="axis">
            {ticks.map((t) => (
              <text key={t} x={M.left - 8} y={y(t) + 4} textAnchor="end">
                {mode === "positions" ? `${t}º` : t}
              </text>
            ))}
            {xTicks.map(({ r, i }) => (
              <text key={r} x={x(i)} y={H - 6} textAnchor="middle">
                R{r}
              </text>
            ))}
          </g>
          {muted.map((s) => (
            <path key={s.id} d={path(values(s))} fill="none" stroke="var(--line-muted)" strokeWidth={1.25} />
          ))}
          {hover !== null && (
            <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + ih} stroke="var(--ink-3)" strokeDasharray="3 3" />
          )}
          {highlighted.map((s) => (
            <g key={s.id}>
              <path d={path(values(s))} fill="none" stroke="var(--surface)" strokeWidth={5} strokeLinejoin="round" />
              <path d={path(values(s))} fill="none" stroke={colorOf(s.id)!} strokeWidth={2.5} strokeLinejoin="round" />
              {hover !== null && (
                <circle cx={x(hover)} cy={y(values(s)[hover])} r={5} fill={colorOf(s.id)!} stroke="var(--surface)" strokeWidth={2} />
              )}
            </g>
          ))}
          {labels.map(({ s, y: ly }) => (
            <g key={s.id}>
              <circle cx={x(n - 1)} cy={y(values(s)[n - 1])} r={4} fill={colorOf(s.id)!} stroke="var(--surface)" strokeWidth={2} />
              <text x={x(n - 1) + 9} y={ly + 4} fontSize={12} fill="var(--ink)" fontWeight={600}>
                {s.name.length > 9 && narrow ? s.name.slice(0, 8) + "." : s.name} {fmt(values(s)[n - 1])}
              </text>
            </g>
          ))}
        </svg>
        {hover !== null && (
          <div
            className="tooltip"
            style={{
              left: x(hover),
              top: 8,
              transform: x(hover) > W * 0.5 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
            }}
          >
            <div className="t">Rodada {rounds[hover]}</div>
            {tipShown.map(({ s, v, c }) => (
              <div className="row" key={s.id}>
                <span>
                  <span className="swatch" style={{ background: c ?? "var(--line-muted)" }} />
                  {s.name}
                </span>
                <span className="num">{mode === "positions" ? `${v}º` : `${v} pts`}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
