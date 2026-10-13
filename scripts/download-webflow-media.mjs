// Одноразове перенесення фото з Webflow у репозиторій.
// Бере список із scripts/webflow-media.json і зберігає фото, відео й шрифти в public/media та public/fonts.
// Запускається кнопкою в GitHub (Actions → «Перенести фото з Webflow»).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const list = JSON.parse(await readFile('scripts/webflow-media.json', 'utf8'));

let ok = 0, skip = 0, fail = 0;
for (const [local, url] of Object.entries(list)) {
  const dest = path.join('public', local);
  if (existsSync(dest)) { skip++; continue; }
  await mkdir(path.dirname(dest), { recursive: true });
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    ok++;
  } catch (e) {
    console.error(`✗ ${local} — ${e.message}`);
    fail++;
  }
}
console.log(`Завантажено: ${ok}, вже були: ${skip}, помилок: ${fail}`);
if (fail) process.exit(1);
