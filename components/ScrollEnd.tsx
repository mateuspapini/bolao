"use client";

import { useEffect, useRef } from "react";

/**
 * Caixa com rolagem lateral que já abre mostrando o mais recente (o fim),
 * ou o item marcado com .on — no celular as rodadas novas ficam à vista sem precisar arrastar.
 */
export default function ScrollEnd({
  className,
  to = "end",
  children,
  ...rest
}: { className?: string; to?: "end" | "active"; children: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (to === "active") {
      const on = el.querySelector<HTMLElement>(".on");
      if (on) el.scrollLeft = on.offsetLeft - el.clientWidth / 2 + on.offsetWidth / 2;
    } else {
      el.scrollLeft = el.scrollWidth;
    }
  }, [to]);
  return (
    <div ref={ref} className={className} {...rest}>
      {children}
    </div>
  );
}
