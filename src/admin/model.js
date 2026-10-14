// Правила даних, однакові для всіх сторінок адмінки (і такі самі, як на сайті).

export const byOrder = (a, b) => (a.order ?? 99) - (b.order ?? 99);
export const sorted = (list) => [...(list || [])].sort(byOrder);

/** Після перестановки — порядкові номери 1, 2, 3… усім елементам. */
export function renumber(list) {
  list.forEach((x, i) => (x.order = i + 1));
  return list;
}

/** Номери кадрів на сайті: сховані не рахуються. id → номер (або null). */
export function siteNumbers(list) {
  const out = {};
  let n = 0;
  for (const x of sorted(list)) out[x.id] = x.hidden ? null : ++n;
  return out;
}

/** Ключ категорії так, як його зберігає Pages CMS ("bw" або "src/content/categories/bw.json"). */
export const catKey = (v) => String(v).split('/').pop().replace(/\.json$/, '');

/** Скільки видимих кадрів у кожній категорії (на сайті показуємо лише непорожні). */
export function catCounts(doc) {
  const out = {};
  for (const p of doc.portfolio) {
    if (p.hidden) continue;
    for (const c of p.categories || []) out[catKey(c)] = (out[catKey(c)] || 0) + 1;
  }
  return out;
}

export function fileName(path) {
  return String(path || '').replace(/^\/media\//, '').replace(/^[0-9a-f]{24}_/, '');
}

/** Де на сайті використане фото. */
export function usages(doc) {
  const map = {};
  const addU = (path, label) => {
    if (!path) return;
    (map[path] ||= []).push(label);
  };
  for (const p of doc.portfolio) addU(p.photo, `Кадри · ${p.title}`);
  for (const a of doc.albums) {
    addU(a.cover, `Альбом · ${a.title} (обкладинка)`);
    for (const ph of a.photos || []) if (ph.photo !== a.cover) addU(ph.photo, `Альбом · ${a.title}`);
  }
  const h = doc.site?.hero || {};
  for (const x of [...(h.pair || []), ...(h.slides || [])]) addU(x.photo, 'Фото головного екрана');
  addU(doc.site?.about?.photo, 'Про мене');
  addU(doc.site?.seo?.shareImage, 'Картинка для соцмереж');
  for (const t of doc.vibe?.tiles || []) {
    addU(t.photo, 'Вайбовий екран');
    addU(t.video, 'Вайбовий екран (відео)');
  }
  return map;
}

export function uniqueId(base, taken) {
  const b = latinSlug(base) || 'item';
  let id = b;
  for (let i = 2; taken.has(id); i++) id = `${b}-${i}`;
  return id;
}

const MAP = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', ʼ: '', "'": '', '’': '',
};
export const latinSlug = (s) =>
  String(s || '')
    .toLowerCase()
    .split('')
    .map((c) => MAP[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
