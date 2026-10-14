// Спільна логіка адмінки: як файли репозиторію перетворюються на «документ» адмінки і назад.
// Документ — це весь контент сайту одним об'єктом:
//   { categories: [{id, ...}], portfolio: [{id, ...}], albums: [{id, ...}], site: {...}, vibe: {...} }
// id запису = назва файлу без .json (для альбому це ще й адреса сторінки /albums/<id>).

export const DIRS = {
  categories: 'src/content/categories',
  portfolio: 'src/content/portfolio',
  albums: 'src/content/albums',
};
export const FILES = {
  site: 'src/data/site.json',
  vibe: 'src/data/vibe.json',
};
export const MEDIA_DIR = 'public/media';

const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

/** Файли (path → текст) → документ. */
export function filesToDoc(files) {
  const doc = { categories: [], portfolio: [], albums: [], site: {}, vibe: null };
  for (const [key, dir] of Object.entries(DIRS)) {
    for (const [path, text] of Object.entries(files)) {
      if (!path.startsWith(dir + '/') || !path.endsWith('.json')) continue;
      const id = path.slice(dir.length + 1, -5);
      if (id.includes('/')) continue;
      try {
        doc[key].push({ id, ...JSON.parse(text) });
      } catch {
        /* битий файл пропускаємо — сайт його теж не збере */
      }
    }
    doc[key].sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || String(a.id).localeCompare(String(b.id)));
  }
  for (const [key, path] of Object.entries(FILES)) {
    if (files[path] !== undefined) doc[key] = JSON.parse(files[path]);
  }
  return doc;
}

/** Документ → файли (path → об'єкт). */
export function docToFiles(doc) {
  const out = {};
  for (const [key, dir] of Object.entries(DIRS)) {
    for (const item of doc[key] || []) {
      const { id, ...rest } = item;
      out[`${dir}/${id}.json`] = rest;
    }
  }
  for (const [key, path] of Object.entries(FILES)) {
    if (doc[key] !== null && doc[key] !== undefined) out[path] = doc[key];
  }
  return out;
}

export const stringify = (obj) => JSON.stringify(obj, null, 2) + '\n';

function eq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Зміни між двома документами на рівні файлів і полів.
 * Повертає [{path, op: 'put'|'delete', patch?}] — patch: список змінених полів верхнього рівня.
 */
export function diffFiles(baseDoc, nextDoc) {
  const a = docToFiles(baseDoc);
  const b = docToFiles(nextDoc);
  const out = [];
  for (const path of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!(path in b)) out.push({ path, op: 'delete' });
    else if (!(path in a)) out.push({ path, op: 'put', value: b[path] });
    else if (!eq(a[path], b[path])) out.push({ path, op: 'put', value: b[path], patch: fieldPatch(a[path], b[path]) });
  }
  return out;
}

// Зміни полів (рекурсивно для об'єктів; масиви — цілком).
function fieldPatch(a, b, prefix = []) {
  const ops = [];
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  if (!isObj(a) || !isObj(b)) return [{ path: prefix, value: clone(b) }];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!(k in b)) ops.push({ path: [...prefix, k], del: true });
    else if (!(k in a)) ops.push({ path: [...prefix, k], value: clone(b[k]) });
    else if (!eq(a[k], b[k])) {
      if (isObj(a[k]) && isObj(b[k])) ops.push(...fieldPatch(a[k], b[k], [...prefix, k]));
      else ops.push({ path: [...prefix, k], value: clone(b[k]) });
    }
  }
  return ops;
}

function applyPatch(target, ops) {
  const root = clone(target);
  for (const op of ops) {
    if (op.path.length === 0) return clone(op.value);
    let cur = root;
    for (const k of op.path.slice(0, -1)) {
      if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {};
      cur = cur[k];
    }
    const last = op.path[op.path.length - 1];
    if (op.del) delete cur[last];
    else cur[last] = clone(op.value);
  }
  return root;
}

/**
 * Що записати в репозиторій під час публікації.
 * base — документ, від якого Женя почала чернетку; current — що зараз у main
 * (там можуть бути правки розробки, зроблені після початку чернетки); draft — чернетка.
 * Зміни чернетки накладаються поверх current, тож чужі правки в інших полях не губляться.
 * Повертає { put: {path: text}, del: [path] }.
 */
export function planPublish(baseDoc, currentFiles, draftDoc) {
  const put = {};
  const del = [];
  for (const ch of diffFiles(baseDoc, draftDoc)) {
    if (ch.op === 'delete') {
      if (ch.path in currentFiles) del.push(ch.path);
      continue;
    }
    let value = ch.value;
    if (ch.patch && currentFiles[ch.path] !== undefined) {
      try {
        value = applyPatch(JSON.parse(currentFiles[ch.path]), ch.patch);
      } catch {
        value = ch.value;
      }
    }
    const text = stringify(value);
    if (currentFiles[ch.path] === undefined || !eq(JSON.parse(currentFiles[ch.path]), value)) put[ch.path] = text;
  }
  return { put, del };
}

// Латиниця для назв файлів і адрес: «Ранок удвох» → ranok-udvoh (як у src/lib/img.ts)
const MAP = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', ʼ: '', "'": '', '’': '',
};
export const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .split('')
    .map((c) => MAP[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function uniqueId(base, taken) {
  const b = slugify(base) || 'item';
  let id = b;
  for (let i = 2; taken.has(id); i++) id = `${b}-${i}`;
  return id;
}

/** Усі шляхи /media/..., на які посилається документ. */
export function referencedMedia(doc) {
  const out = new Set();
  const walk = (x) => {
    if (typeof x === 'string') {
      if (x.startsWith('/media/')) out.add(x);
    } else if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === 'object') Object.values(x).forEach(walk);
  };
  walk(doc);
  return out;
}
