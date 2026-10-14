// Список фото й відео, які використовує сам код сайту (оформлення, ціни, аватарка тощо),
// а не дані з адмінки. Адмінка не дає їх видалити в «Усіх файлах». Збирається під час збірки.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(css|js|astro|ts|mjs)$/.test(n)) out.push(p);
  }
  return out;
}

export function GET() {
  const names = new Set();
  for (const f of [...walk('src/webflow'), ...walk('src/pages'), ...walk('src/lib')]) {
    const t = readFileSync(f, 'utf8');
    for (const m of t.matchAll(/\/media\/([^"'`)\s?#]+)/g)) names.add(decodeURIComponent(m[1]));
    for (const m of t.matchAll(/\b([0-9a-f]{24}_[A-Za-z0-9._%-]+?)(?=["'`)\s]|-p-\d)/g)) names.add(decodeURIComponent(m[1]));
  }
  return new Response(JSON.stringify([...names].sort()), { headers: { 'content-type': 'application/json' } });
}
