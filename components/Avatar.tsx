import { existsSync } from "node:fs";
import { join } from "node:path";

/** Caminho da foto do participante (public/fotos/<id>.webp), ou null se não tiver. */
export function photoOf(id: string): string | null {
  return existsSync(join(process.cwd(), "public", "fotos", `${id}.webp`)) ? `/fotos/${id}.webp` : null;
}

/** Fotinho redonda; sem foto, mostra a inicial. */
export default function Avatar({ id, name, size = 32, ring }: { id: string; name: string; size?: number; ring?: boolean }) {
  const src = photoOf(id);
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  return src ? (
    <img className={`avatar${ring ? " ring" : ""}`} src={src} alt="" width={size} height={size} style={style} loading="lazy" />
  ) : (
    <span className={`avatar initial${ring ? " ring" : ""}`} style={style} aria-hidden>
      {name.charAt(0)}
    </span>
  );
}
