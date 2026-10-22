"use client";

import { useEffect, useRef, useState } from "react";

/** Largura real do elemento, para o gráfico desenhar no tamanho da tela (texto legível no celular). */
export function useWidth<T extends HTMLElement>(initial = 760) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}
