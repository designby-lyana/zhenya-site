// Одноразове перенесення фото з Webflow у репозиторій.
// Бере список із scripts/webflow-media.json і зберігає кожне фото в public/media.
// Запускається кнопкою в GitHub (Actions → «Перенести фото з Webflow»).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const list = JSON.parse(await readFile('scripts/webflow-media.json', 'utf8'));
await mkdir('public/media', { recursive: true });

let ok = 0, skip = 0, fail = 0;
for (const [local, url] of Object.entries(list)) {
  const dest = path.join('public', local);
  if (existsSync(dest)) { skip++; continue; }
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
