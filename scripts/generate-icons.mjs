// Genera los iconos de la PWA desde un SVG (provisionales hasta decidir el diseño final).
// Uso: node scripts/generate-icons.mjs
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const BG = "#0f766e"; // --primary (claro)
const FG = "#ffffff";
const ACCENT = "#fb923c"; // --accent (oscuro), el mismo naranja del "+"

// `scale` encoge el glifo hacia el centro: los iconos maskable deben caber en el 80% central.
function svg({ scale, rounded }) {
  const r = rounded ? 112 : 0;
  const t = (1 - scale) * 256;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${r}" fill="${BG}"/>
  <g transform="translate(${t} ${t}) scale(${scale})">
    <circle cx="256" cy="256" r="150" fill="none" stroke="${FG}" stroke-width="40"/>
    <path d="M190 260 l46 46 l92 -100" fill="none" stroke="${FG}" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="372" cy="140" r="40" fill="${ACCENT}" stroke="${BG}" stroke-width="16"/>
  </g>
</svg>`;
}

const outputs = [
  { file: "public/icons/icon-192.png", size: 192, scale: 0.9, rounded: true },
  { file: "public/icons/icon-512.png", size: 512, scale: 0.9, rounded: true },
  { file: "public/icons/maskable-512.png", size: 512, scale: 0.7, rounded: false },
  { file: "public/icons/apple-touch-icon.png", size: 180, scale: 0.8, rounded: false },
];

for (const { file, size, scale, rounded } of outputs) {
  await sharp(Buffer.from(svg({ scale, rounded }))).resize(size, size).png().toFile(file);
  console.log("✓", file);
}

await writeFile("public/icons/icon.svg", svg({ scale: 0.95, rounded: true }));
console.log("✓ public/icons/icon.svg");
