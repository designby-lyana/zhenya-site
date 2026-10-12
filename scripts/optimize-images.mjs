// Робить легкі копії фото під різні екрани (480 / 960 / 1600 px, WebP).
// Запускається автоматично перед кожною збіркою сайту (npm run build).
// Оригінали з public/media лишаються недоторканими.
import { readdir, mkdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'public/media';
const OUT = 'public/_img';
const WIDTHS = [480, 960, 1600];
const EXT = /\.(jpe?g|png|webp|avif)$/i;

await mkdir(OUT, { recursive: true });
const manifest = {};
const files = existsSync(SRC) ? (await readdir(SRC)).filter((f) => EXT.test(f)) : [];

let made = 0;
for (const file of files) {
  const input = path.join(SRC, file);
  const base = file.replace(EXT, '');
  let meta;
  try {
    meta = await sharp(input).metadata();
  } catch (e) {
    console.warn(`  ! пропускаю ${file}: ${e.message}`);
    continue;
  }
  const w0 = meta.autoOrient?.width ?? meta.width;
  const h0 = meta.autoOrient?.height ?? meta.height;
  const variants = [];
  for (const w of WIDTHS) {
    const width = Math.min(w, w0);
    const out = path.join(OUT, `${base}-${w}.webp`);
    const fresh = existsSync(out) && (await stat(out)).mtimeMs >= (await stat(input)).mtimeMs;
    if (!fresh) {
      await sharp(input).rotate().resize({ width }).webp({ quality: 78 }).toFile(out);
      made++;
    }
    variants.push({ w: width, src: `/_img/${base}-${w}.webp` });
    if (width === w0) break;
  }
  manifest[`/media/${file}`] = { width: w0, height: h0, variants };
}

await writeFile('src/data/images.json', JSON.stringify(manifest, null, 0));
console.log(`Фото: ${files.length}, нових копій: ${made}`);
