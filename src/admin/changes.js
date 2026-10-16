// Список змін «що зміниться на сайті» — для панелі публікації і вікна перегляду.
// Кожна зміна: { text, revert(doc) } — revert повертає цю частину так, як на сайті.

const eq = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const byId = (list) => Object.fromEntries((list || []).map((x) => [x.id, x]));
const q = (s) => (String(s ?? '').trim() ? `«${s}»` : 'без назви');
const sortedIds = (list) => [...(list || [])].sort((a, b) => (a.order ?? 99) - (b.order ?? 99)).map((x) => x.id);

function orderChanged(pubList, draftList) {
  const common = new Set(pubList.map((x) => x.id).filter((id) => draftList.some((y) => y.id === id)));
  const a = sortedIds(pubList).filter((id) => common.has(id));
  const b = sortedIds(draftList).filter((id) => common.has(id));
  return !eq(a, b);
}
function restoreOrder(key) {
  return (doc, pub) => {
    const p = byId(pub[key]);
    let max = Math.max(0, ...pub[key].map((x) => x.order ?? 0));
    const sorted = [...doc[key]].sort((a, b) => (p[a.id]?.order ?? 1e9) - (p[b.id]?.order ?? 1e9) || (a.order ?? 0) - (b.order ?? 0));
    sorted.forEach((x) => (x.order = p[x.id] ? p[x.id].order : ++max));
    doc[key] = sorted;
  };
}
// Повернути видалений елемент на його місце (як на сайті) або прибрати новий.
function restoreItem(key, id) {
  return (doc, pub) => {
    const p = pub[key].find((x) => x.id === id);
    const i = doc[key].findIndex((x) => x.id === id);
    if (!p) {
      if (i >= 0) doc[key].splice(i, 1);
    } else if (i < 0) {
      const list = [...doc[key]].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
      const rank = [...pub[key]].sort((a, b) => (a.order ?? 99) - (b.order ?? 99)).findIndex((x) => x.id === id);
      list.splice(Math.min(rank, list.length), 0, structuredClone(p));
      list.forEach((x, n) => (x.order = n + 1));
      doc[key] = list;
    }
  };
}
// Повернути лише вказані поля елемента — решта змін лишається.
function restoreFields(key, id, fields) {
  return (doc, pub) => {
    const p = pub[key].find((x) => x.id === id);
    const x = doc[key].find((y) => y.id === id);
    if (!p || !x) return;
    for (const f of fields) {
      if (p[f] === undefined) delete x[f];
      else x[f] = structuredClone(p[f]);
    }
  };
}

export function computeChanges(pub, doc, extra = {}) {
  if (!pub || !doc) return [];
  const out = [];
  const add = (text, revert) => out.push({ text, revert });

  // --- кадри ---
  const pP = byId(pub.portfolio);
  const dP = byId(doc.portfolio);
  for (const x of doc.portfolio) {
    const p = pP[x.id];
    if (!p) {
      add(`Новий кадр ${q(x.title)}${x.hidden ? ' (схований)' : ''}`, restoreItem('portfolio', x.id));
      continue;
    }
    const name = q(x.title);
    if (!eq(p.title, x.title)) add(`Назва кадру: ${q(p.title)} → ${name}`, restoreFields('portfolio', x.id, ['title']));
    if (!eq(p.photo, x.photo)) add(`Нове фото в кадрі ${name}`, restoreFields('portfolio', x.id, ['photo']));
    if (!eq(p.alt, x.alt)) add(`Опис фото в кадрі ${name}`, restoreFields('portfolio', x.id, ['alt']));
    if (!eq(p.categories, x.categories)) add(`Категорії кадру ${name}`, restoreFields('portfolio', x.id, ['categories']));
    if (!!p.hidden !== !!x.hidden) add(x.hidden ? `Кадр ${name} сховано з сайту` : `Кадр ${name} знову на сайті`, restoreFields('portfolio', x.id, ['hidden']));
    if (!!p.recent !== !!x.recent) add(x.recent ? `Кадр ${name} у вкладці «Останні»` : `Кадр ${name} прибрано з «Останніх»`, restoreFields('portfolio', x.id, ['recent']));
  }
  for (const p of pub.portfolio) if (!dP[p.id]) add(`Видалено кадр ${q(p.title)}`, restoreItem('portfolio', p.id));
  if (orderChanged(pub.portfolio, doc.portfolio)) add('Змінено порядок кадрів', restoreOrder('portfolio'));
  const recentOrder = (list) => list.filter((x) => x.recent).sort((a, b) => a.recent - b.recent).map((x) => x.id);
  {
    const a = recentOrder(pub.portfolio).filter((id) => dP[id]?.recent);
    const b = recentOrder(doc.portfolio).filter((id) => pP[id]?.recent);
    if (!eq(a, b))
      add('Змінено порядок у вкладці «Останні»', (d, pb) => {
        const pr = byId(pb.portfolio);
        d.portfolio.forEach((x) => {
          if (x.recent && pr[x.id]?.recent) x.recent = pr[x.id].recent;
        });
      });
  }

  // --- категорії ---
  const pC = byId(pub.categories);
  const dC = byId(doc.categories);
  for (const c of doc.categories) {
    const p = pC[c.id];
    if (!p) add(`Нова категорія ${q(c.name)}`, restoreItem('categories', c.id));
    else if (!eq(p.name, c.name)) add(`Категорію ${q(p.name)} перейменовано на ${q(c.name)}`, restoreFields('categories', c.id, ['name']));
  }
  for (const p of pub.categories)
    if (!dC[p.id])
      add(`Видалено категорію ${q(p.name)}`, (d, pb) => {
        restoreItem('categories', p.id)(d, pb);
        // повертаємо категорію і в кадри, де вона була
        const pr = byId(pb.portfolio);
        d.portfolio.forEach((x) => {
          if (pr[x.id]?.categories?.includes(p.id) && !x.categories.includes(p.id)) x.categories = [...x.categories, p.id];
        });
      });
  if (orderChanged(pub.categories, doc.categories)) add('Змінено порядок категорій', restoreOrder('categories'));

  // --- альбоми ---
  const pA = byId(pub.albums);
  const dA = byId(doc.albums);
  for (const a of doc.albums) {
    const p = pA[a.id];
    if (!p) {
      add(`Новий альбом ${q(a.title)}`, restoreItem('albums', a.id));
      continue;
    }
    const name = q(a.title);
    if (!eq(p.title, a.title)) add(`Назва альбому: ${q(p.title)} → ${name}`, restoreFields('albums', a.id, ['title']));
    if (!!p.hidden !== !!a.hidden) add(a.hidden ? `Альбом ${name} сховано з сайту` : `Альбом ${name} знову на сайті`, restoreFields('albums', a.id, ['hidden']));
    if (!eq(p.cover, a.cover) || !eq(p.coverAlt, a.coverAlt)) add(`Нова обкладинка альбому ${name}`, restoreFields('albums', a.id, ['cover', 'coverAlt']));
    if (!eq(p.photos, a.photos)) {
      const pp = (p.photos || []).map((x) => x.photo);
      const dp = (a.photos || []).map((x) => x.photo);
      const added = dp.filter((x) => !pp.includes(x)).length;
      const removed = pp.filter((x) => !dp.includes(x)).length;
      const parts = [];
      if (added) parts.push(`додано ${plural(added, 'фото', 'фото', 'фото')}`);
      if (removed) parts.push(`прибрано ${plural(removed, 'фото', 'фото', 'фото')}`);
      if (!added && !removed) parts.push(eq([...pp].sort(), [...dp].sort()) && !eq(pp, dp) ? 'змінено порядок фото' : 'змінено описи фото');
      add(`Альбом ${name}: ${parts.join(', ')}`, restoreFields('albums', a.id, ['photos', 'cover', 'coverAlt']));
    }
  }
  for (const p of pub.albums) if (!dA[p.id]) add(`Видалено альбом ${q(p.title)}`, restoreItem('albums', p.id));
  if (orderChanged(pub.albums, doc.albums)) add('Змінено порядок альбомів', restoreOrder('albums'));

  // --- сторінка ---
  const S = (label, keys) => {
    const changed = keys.some((k) => !eq(get(pub.site, k), get(doc.site, k)));
    if (changed)
      add(label, (d, pb) => {
        for (const k of keys) put(d.site, k, structuredClone(get(pb.site, k)));
      });
  };
  S('Фото головного екрану', ['hero.pair', 'hero.slides']);
  S('Тексти головного екрану', ['hero.title', 'hero.titleAccent', 'hero.subtitle', 'hero.facts', 'header.genres', 'header.tagline']);
  S('Блок «Про мене»', ['about']);
  S('Ціни', ['prices']);
  S('Відгуки', ['reviews']);
  S('Контакти', ['contacts', 'contact']);
  S('Тексти для пошуку і соцмереж', ['seo']);
  S('Підпис у вкладці «Останні»', ['portfolio.recentNote']);
  if (!eq(pub.vibe, doc.vibe))
    add('Вайбовий екран', (d, pb) => {
      d.vibe = structuredClone(pb.vibe);
    });

  // --- файли ---
  for (const path of extra.mediaDel || []) out.push({ text: `Видалено файл ${path.replace('/media/', '')}`, revertMedia: path });
  const nUp = (extra.uploads || []).length;
  if (nUp && !out.some((x) => x.text.startsWith('Новий кадр')) ) {
    out.push({ text: `Завантажено ${plural(nUp, 'файл', 'файли', 'файлів')} у «Усі файли»`, info: true });
  }
  return out;
}

export function plural(n, a, b, c) {
  const x = n % 10;
  const y = n % 100;
  return `${n} ${x === 1 && y !== 11 ? a : x >= 2 && x <= 4 && (y < 12 || y > 14) ? b : c}`;
}

function get(o, path) {
  return path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
}
function put(o, path, v) {
  const ks = path.split('.');
  let cur = o;
  for (const k of ks.slice(0, -1)) cur = cur[k] ??= {};
  if (v === undefined) delete cur[ks[ks.length - 1]];
  else cur[ks[ks.length - 1]] = v;
}
