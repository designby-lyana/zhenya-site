// Стан адмінки: опубліковане, чернетка, автозбереження чернетки на сервер, публікація.
import { useSyncExternalStore } from 'react';

const listeners = new Set();
let S = {
  status: 'loading', // loading | ready | error | auth
  error: '',
  published: null, // документ, який зараз на сайті
  doc: null, // чернетка (те, що бачить і змінює Женя)
  media: [], // файли в public/media на сайті
  uploads: [], // щойно завантажені, ще не опубліковані
  mediaDel: [], // файли, які Женя видалила (зникнуть після публікації)
  oid: '',
  rev: 0,
  saving: false,
  saveError: '',
  publishing: false,
  publishedAt: 0,
  user: '',
  siteUrl: '',
  toast: null,
};

const emit = () => listeners.forEach((l) => l());
const set = (patch) => {
  S = { ...S, ...patch };
  emit();
};
export const getState = () => S;
export function useStore(sel = (s) => s) {
  return sel(useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), getState, getState));
}

async function api(path, opts = {}) {
  const res = await fetch(path, { credentials: 'same-origin', ...opts });
  if (res.status === 401) {
    set({ status: 'auth' });
    throw new Error('auth');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.error || `Помилка ${res.status}`);
    e.status = res.status;
    e.data = data;
    throw e;
  }
  return data;
}

export async function load() {
  try {
    const d = await api('/api/state');
    const onSite = new Set(d.media.map((m) => m.path));
    set({
      status: 'ready',
      published: d.published,
      doc: d.draft ? d.draft.doc : structuredClone(d.published),
      mediaDel: d.draft?.mediaDel || [],
      rev: d.draft?.rev || 0,
      media: d.media,
      // щойно опубліковані фото вже є серед файлів сайту — у «нових» їх не показуємо
      uploads: d.uploads.filter((u) => !onSite.has(u.path)),
      oid: d.oid,
      user: d.user,
      siteUrl: d.siteUrl,
    });
  } catch (e) {
    if (e.message !== 'auth') set({ status: 'error', error: e.message });
  }
}

// ---------- зміни чернетки ----------
let saveTimer = null;
/** Змінити чернетку. fn отримує копію документа і змінює її на місці (що повертає fn — не важливо). */
export function update(fn) {
  if (S.publishing) {
    toast('Зачекайте кілька секунд — публікую попередні зміни.');
    return;
  }
  const doc = structuredClone(S.doc);
  fn(doc);
  set({ doc });
  scheduleSave();
}
export function setMediaDel(list) {
  if (S.publishing) return;
  set({ mediaDel: list });
  scheduleSave();
}
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => save().catch(() => {}), 1200);
}
let saving = null;
async function save() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (saving) await saving.catch(() => {});
  const body = { doc: S.doc, baseOid: S.oid, rev: S.rev, mediaDel: S.mediaDel };
  set({ saving: true });
  const run = api('/api/draft', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    .then((r) => set({ rev: r.rev, saving: false, saveError: '' }))
    .catch((e) => {
      if (e.status === 409) {
        const d = e.data?.draft;
        if (d) set({ doc: d.doc, rev: d.rev, oid: d.baseOid || S.oid, mediaDel: d.mediaDel || [], saving: false });
        else set({ doc: structuredClone(S.published), rev: 0, mediaDel: [], saving: false });
        toast('Чернетку змінили на іншому пристрої — показую найновішу версію.');
        return;
      }
      if (e.message === 'auth') return;
      set({ saving: false, saveError: e.status === 503 ? 'Сервер зайнятий — повторю збереження за кілька секунд.' : 'Не вдалося зберегти чернетку. Перевірте інтернет — спробую ще раз.' });
      saveTimer = setTimeout(() => save().catch(() => {}), 5000);
      throw e;
    });
  const tracked = run.finally(() => {
    if (saving === tracked) saving = null;
  });
  tracked.catch(() => {});
  saving = tracked;
  return run;
}
/** Дочекатися, поки чернетка точно збережена. Кидає помилку, якщо зберегти не вдалося. */
export async function flushSave() {
  if (saveTimer) await save();
  else if (saving) await saving;
  if (S.saveError) throw new Error(S.saveError);
}

window.addEventListener('beforeunload', (e) => {
  if (saveTimer || saving || S.saveError) {
    e.preventDefault();
    e.returnValue = '';
  }
});

export async function publish() {
  try {
    await flushSave();
  } catch {
    toast('Не вдалося зберегти останні зміни, тому публікацію зупинено. Перевірте інтернет і спробуйте ще раз.', 'error');
    return;
  }
  set({ publishing: true });
  try {
    await api('/api/publish', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rev: S.rev }) });
    set({ publishing: false, publishedAt: Date.now() });
    await load();
    toast('Опубліковано. На сайті з’явиться за 1–2 хвилини.');
  } catch (e) {
    set({ publishing: false });
    if (e.message !== 'auth') toast(e.message || 'Не вдалося опублікувати. Спробуйте ще раз.', 'error');
  }
}

export async function discardAll() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (saving) await saving.catch(() => {});
  await api('/api/discard', { method: 'POST' });
  set({ doc: structuredClone(S.published), mediaDel: [], uploads: [], rev: 0, saveError: '' });
  await load();
  toast('Повернуто все як на сайті.');
}

// ---------- фото ----------
export async function uploadFile(blob, name) {
  const r = await api('/api/upload?name=' + encodeURIComponent(name), {
    method: 'POST',
    headers: { 'content-type': blob.type || 'image/jpeg' },
    body: blob,
  });
  set({ uploads: [...S.uploads, { path: r.path, size: r.size, type: blob.type, at: Date.now() }] });
  return r.path;
}
export async function removeUpload(path) {
  await api('/api/upload?path=' + encodeURIComponent(path), { method: 'DELETE' });
  set({ uploads: S.uploads.filter((u) => u.path !== path) });
}

/** Адреса для показу фото в адмінці. */
export function src(path, size = 480) {
  if (!path) return '';
  if (S.uploads.some((u) => u.path === path)) return '/api/media?path=' + encodeURIComponent(path);
  if (/\.(jpe?g|png|webp|avif)$/i.test(path) && size) {
    const base = path.replace(/^\/media\//, '').replace(/\.[^.]+$/, '');
    return `/_img/${base}-${size}.webp`;
  }
  return path;
}
/** Якщо легкої копії немає (фото ще не на сайті або сайт ще перезбирається) — пробуємо оригінал, потім копію з адмінки. */
export function onImgError(e, path) {
  const img = e.currentTarget;
  const step = +(img.dataset.step || 0);
  const chain = [path, '/api/media?path=' + encodeURIComponent(path)];
  if (step >= chain.length) return;
  img.dataset.step = step + 1;
  const next = chain[step];
  if (img.src.endsWith(next)) return onImgError(e, path);
  img.src = next;
}

// ---------- повідомлення ----------
let toastTimer;
export function toast(text, kind = 'ok') {
  clearTimeout(toastTimer);
  set({ toast: { text, kind, id: Date.now() } });
  toastTimer = setTimeout(() => set({ toast: null }), 5000);
}
