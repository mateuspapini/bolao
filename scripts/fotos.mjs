// Recorta as fotos dos participantes em quadrado 256px (webp) para public/fotos/<id>.webp
// Uso: node scripts/fotos.mjs "C:\Users\conta\Downloads\imagens-bolao"
// O nome do arquivo deve ser o id do participante (ex.: marcos.jpg, natalia.jpg).
// Ajuste fino do recorte: FOCO[id] = posição do rosto em % da largura/altura da foto original.
import sharp from "sharp";
import { readdirSync } from "node:fs";
import { join, parse } from "node:path";

const FOCO = {
  bernardo: { x: 61, y: 50, zoom: 0.5 },
  daniel: { x: 63, y: 36, zoom: 0.45 },
  grazielle: { x: 50, y: 50, zoom: 0.85 },
  helinho: { x: 52, y: 42, zoom: 0.75 },
  juliana: { x: 51, y: 34, zoom: 0.55 },
  marcio: { x: 51, y: 33, zoom: 0.55 },
  marcos: { x: 72, y: 38, zoom: 0.62 },
  mateus: { x: 48, y: 40, zoom: 0.5 },
  mauro: { x: 50, y: 42, zoom: 0.85 },
  natalia: { x: 47, y: 31, zoom: 0.5 },
  rodrigo: { x: 65, y: 39, zoom: 0.55 },
  taty: { x: 60, y: 17, zoom: 0.4 },
};

const dir = process.argv[2];
for (const file of readdirSync(dir)) {
  if (!/\.(jpe?g|png|webp)$/i.test(file)) continue;
  const id = parse(file).name.toLowerCase();
  const img = sharp(join(dir, file)).rotate();
  const { width, height } = await img.metadata();
  let out;
  const f = FOCO[id];
  if (f) {
    const side = Math.round(Math.min(width, height) * (f.zoom ?? 1));
    const left = Math.max(0, Math.min(width - side, Math.round((f.x / 100) * width - side / 2)));
    const top = Math.max(0, Math.min(height - side, Math.round((f.y / 100) * height - side / 2)));
    out = img.extract({ left, top, width: side, height: side }).resize(256, 256);
  } else {
    out = img.resize(256, 256, { fit: "cover", position: sharp.strategy.attention });
  }
  await out.webp({ quality: 80 }).toFile(join("public", "fotos", `${id}.webp`));
  console.log(id, `${width}x${height}`);
}
