// Готує оригінальний код з Webflow до збірки:
// якщо медіафайл уже лежить у public/, адреса Webflow CDN замінюється на локальну.
// Вхід: src/webflow/site.css, src/webflow/{emb,album}/*  →  Вихід: public/wf/site.css, src/webflow-build/{emb,album}/*
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const man = JSON.parse(await readFile('scripts/webflow-media.json', 'utf8'));
const pairs = Object.entries(man).filter(([loc]) => existsSync(path.join('public', loc)));
const CDN = 'https://cdn.prod.website-files.com/6a65e6828ad7099333ebb2c2/';
const zf = Object.entries(man).filter(([, u]) => u.startsWith(CDN) && /zh-(ig|v\d)/.test(u));
const zfLocal = zf.length > 0 && zf.every(([loc]) => existsSync(path.join('public', loc)));

function localize(text) {
  for (const [loc, url] of pairs) text = text.split(url).join(loc);
  if (zfLocal) text = text.split(`var C="${CDN}"`).join('var C="/media/"');
  return text;
}

await mkdir('public/wf', { recursive: true });
await writeFile('public/wf/site.css', localize(await readFile('src/webflow/site.css', 'utf8')));
for (const dir of ['emb', 'album']) {
  await mkdir(path.join('src/webflow-build', dir), { recursive: true });
  for (const f of await readdir(path.join('src/webflow', dir))) {
    await writeFile(path.join('src/webflow-build', dir, f), localize(await readFile(path.join('src/webflow', dir, f), 'utf8')));
  }
}
console.log(`Webflow-код: локальних файлів ${pairs.length} з ${Object.keys(man).length}${zfLocal ? ', вайбова сітка — локально' : ''}`);
