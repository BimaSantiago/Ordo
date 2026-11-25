// Genera los iconos de la PWA desde el SVG del ícono "Encerrado": trazo de marcador en tinta
// índigo que encierra un punto, sobre mandarina.
// Uso: node scripts/generate-icons.mjs
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const BG = "#ff6b1a"; // mandarina (--accent claro)
const INK = "#1a1446"; // tinta índigo (--fg claro)
const DOT = "#ffffff";

const STROKE =
  "M338 140 C 262 92, 140 128, 132 246 C 124 362, 252 408, 342 352 C 414 308, 408 186, 310 146 C 278 134, 244 138, 216 152";

// `scale` encoge el glifo hacia el centro: los iconos maskable deben caber en el 80% central.
function svg({ scale, rounded }) {
  const r = rounded ? 112 : 0;
  const t = (1 - scale) * 256;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${r}" fill="${BG}"/>
  <g transform="translate(${t} ${t}) scale(${scale})">
    <path d="${STROKE}" fill="none" stroke="${INK}" stroke-width="42" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="268" cy="258" r="40" fill="${DOT}"/>
  </g>
</svg>`;
}

const outputs = [
  { file: "public/icons/icon-192.png", size: 192, scale: 1, rounded: true },
  { file: "public/icons/icon-512.png", size: 512, scale: 1, rounded: true },
  { file: "public/icons/maskable-512.png", size: 512, scale: 0.78, rounded: false },
  { file: "public/icons/apple-touch-icon.png", size: 180, scale: 0.9, rounded: false },
];

for (const { file, size, scale, rounded } of outputs) {
  await sharp(Buffer.from(svg({ scale, rounded }))).resize(size, size).png().toFile(file);
  console.log("✓", file);
}

await writeFile("public/icons/icon.svg", svg({ scale: 1, rounded: true }));
console.log("✓ public/icons/icon.svg");
