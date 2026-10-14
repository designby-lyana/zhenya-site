// Сервер адмінки (Cloudflare Worker). Усе, що не /api/*, віддається як звичайний статичний сайт.
//
// Як живуть дані:
//   • опубліковане — файли в гілці main на GitHub (з них Cloudflare збирає сайт);
//   • чернетка — один запис у сховищі KV (ADMIN_KV), спільний для всіх пристроїв Жені;
//   • щойно завантажені фото — теж у KV, доки їх не опублікують.
// «Опублікувати» = один коміт у main → Cloudflare сам перезбирає сайт за 1–2 хв.

import { GitHub, bytesToBase64 } from './github.js';
import { filesToDoc, planPublish, referencedMedia } from './content.js';
import { verifyAccess, login, logoutCookie } from './access.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
const fail = (status, message, extra = {}) => json({ error: message, ...extra }, status);

const MAX_UPLOAD = 24 * 1024 * 1024;
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'video/mp4': '.mp4' };

function validDoc(d) {
  return !!d && typeof d === 'object' && !Array.isArray(d) && ['portfolio', 'categories', 'albums'].every((k) => Array.isArray(d[k])) && !!d.site && typeof d.site === 'object';
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    if (url.pathname === '/api/login' && request.method === 'POST') return handleLogin(request, env);
    if (url.pathname === '/api/logout' && request.method === 'POST')
      return new Response('{"ok":true}', { headers: { 'set-cookie': logoutCookie, 'content-type': 'application/json' } });

    let user;
    try {
      user = await verifyAccess(request, env);
    } catch (e) {
      return fail(401, 'Потрібно увійти в адмінку');
    }

    try {
      return await route(request, env, url, user);
    } catch (e) {
      console.error(e);
      return fail(e.status || 500, e.publicMessage || 'Щось пішло не так. Спробуйте ще раз за хвилину.', { detail: String(e.message || e) });
    }
  },
};

async function route(request, env, url, user) {
  const kv = env.ADMIN_KV;
  const gh = new GitHub(env);
  const m = request.method;
  const p = url.pathname;

  if (p === '/api/state' && m === 'GET') return json(await loadState(env, gh, user));

  if (p === '/api/draft' && m === 'PUT') {
    const body = await request.json();
    if (!validDoc(body.doc)) return fail(400, 'Чернетка пошкоджена — зміну не збережено. Оновіть сторінку.');
    const cur = await getDraft(kv);
    // хтось уже змінив чернетку (інший пристрій) або її щойно скасували/опублікували
    if ((cur && body.rev !== cur.rev) || (!cur && body.rev)) return fail(409, 'Чернетку змінено на іншому пристрої', { draft: cur });
    const next = {
      rev: (cur?.rev || 0) + 1,
      baseOid: body.baseOid,
      doc: body.doc,
      mediaDel: Array.isArray(body.mediaDel) ? body.mediaDel : [],
      updatedAt: new Date().toISOString(),
      by: user.email,
    };
    try {
      await kv.put('draft', JSON.stringify(next));
    } catch (e) {
      return fail(503, 'Сервер зайнятий, повторюю збереження…');
    }
    return json({ rev: next.rev, updatedAt: next.updatedAt });
  }

  if (p === '/api/upload' && m === 'POST') {
    const type = (request.headers.get('content-type') || '').split(';')[0].trim();
    const ext = EXT[type];
    if (!ext) return fail(415, 'Підходять фото JPG, PNG, WebP або відео MP4');
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > MAX_UPLOAD) return fail(413, 'Файл завеликий');
    // назва: латиниця з назви файлу + випадковий хвостик, щоб два «image.jpg» з телефона не затерли одне одного
    const base = (url.searchParams.get('name') || 'foto').toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'foto';
    const rand = [...crypto.getRandomValues(new Uint8Array(3))].map((x) => x.toString(16).padStart(2, '0')).join('');
    const path = `/media/${base}-${rand}${ext}`;
    // одразу кладемо фото в GitHub (поки що «нічиє» — до публікації сайт його не бачить)
    const sha = await gh.createBlob(bytesToBase64(new Uint8Array(bytes)));
    await kv.put(`up:${path}`, bytes, { metadata: { size: bytes.byteLength, type, at: Date.now(), sha } });
    return json({ path, size: bytes.byteLength });
  }

  if (p === '/api/upload' && m === 'DELETE') {
    await kv.delete(`up:${url.searchParams.get('path')}`);
    return json({ ok: true });
  }

  if (p === '/api/media' && m === 'GET') {
    const path = url.searchParams.get('path') || '';
    let { value, metadata } = await kv.getWithMetadata(`up:${path}`, { type: 'arrayBuffer' });
    // щойно опубліковане фото: поки сайт перезбирається, віддаємо копію з адмінки
    if (!value) ({ value, metadata } = await kv.getWithMetadata(`was:${path}`, { type: 'arrayBuffer' }));
    if (value) return new Response(value, { headers: { 'content-type': metadata?.type || 'image/jpeg', 'cache-control': 'private, max-age=3600' } });
    return Response.redirect(new URL(path, url).href, 302);
  }

  if (p === '/api/publish' && m === 'POST') {
    const body = await request.json().catch(() => ({}));
    return json(await publish(env, gh, body.rev, user));
  }

  if (p === '/api/discard' && m === 'POST') {
    await kv.delete('draft');
    for (const k of await listUploads(kv)) await kv.delete(`up:${k.path}`);
    return json({ ok: true });
  }

  return fail(404, 'Немає такої дії');
}

async function getDraft(kv) {
  const t = await kv.get('draft');
  return t ? JSON.parse(t) : null;
}

async function listUploads(kv) {
  const out = [];
  let cursor;
  do {
    const r = await kv.list({ prefix: 'up:', cursor });
    for (const k of r.keys) out.push({ path: k.name.slice(3), size: k.metadata?.size || 0, type: k.metadata?.type, at: k.metadata?.at || 0, sha: k.metadata?.sha });
    cursor = r.list_complete ? undefined : r.cursor;
  } while (cursor);
  return out;
}

// Опублікований контент на коміті — з кешу KV або з GitHub.
async function published(env, gh, oid) {
  const key = `pub:${oid}`;
  const cached = await env.ADMIN_KV.get(key);
  if (cached) return JSON.parse(cached);
  const data = await gh.readContent(oid);
  await env.ADMIN_KV.put(key, JSON.stringify(data), { expirationTtl: 60 * 60 * 24 * 14 });
  return data;
}

async function loadState(env, gh, user) {
  const kv = env.ADMIN_KV;
  const oid = await gh.headOid();
  const pub = await published(env, gh, oid);
  let draft = await getDraft(kv);

  // Поки Женя редагувала, у main могли з'явитися правки розробки — переносимо чернетку на свіжу основу.
  if (draft && draft.baseOid !== oid) {
    const base = await published(env, gh, draft.baseOid).catch(() => null);
    if (base) {
      const plan = planPublish(filesToDoc(base.files), pub.files, draft.doc);
      const files = { ...pub.files };
      for (const [path, text] of Object.entries(plan.put)) files[path] = text;
      for (const path of plan.del) delete files[path];
      draft = { ...draft, baseOid: oid, doc: filesToDoc(files), rev: draft.rev + 1 };
    } else {
      draft = { ...draft, baseOid: oid, rev: draft.rev + 1 };
    }
    await kv.put('draft', JSON.stringify(draft));
  }

  return {
    user: user.email,
    oid,
    published: filesToDoc(pub.files),
    media: pub.media,
    draft,
    uploads: await listUploads(kv),
    siteUrl: env.SITE_URL || '',
  };
}

async function publish(env, gh, rev, user) {
  const kv = env.ADMIN_KV;
  const draft = await getDraft(kv);
  const uploads = await listUploads(kv);
  if (!draft && uploads.length === 0) return { ok: true, nothing: true, published: [] };
  if (draft && rev !== undefined && rev !== draft.rev) {
    const e = new Error('stale draft');
    e.status = 409;
    e.publicMessage = 'Чернетку змінено на іншому пристрої. Оновіть сторінку.';
    throw e;
  }

  for (let attempt = 0; ; attempt++) {
    const oid = await gh.headOid();
    try {
      const pub = await published(env, gh, oid);
      const base = draft ? await published(env, gh, draft.baseOid).catch(() => pub) : pub;
      const plan = draft ? planPublish(filesToDoc(base.files), pub.files, draft.doc) : { put: {}, del: [] };

      // фото видаляємо лише якщо на нього справді більше ніщо не посилається
      const final = { ...pub.files, ...plan.put };
      for (const d of plan.del) delete final[d];
      const used = referencedMedia(filesToDoc(final));
      const existing = new Set(pub.media.map((x) => x.path));
      const mediaDel = (draft?.mediaDel || []).filter((x) => existing.has(x) && !used.has(x)).map((x) => 'public' + x);

      const blobs = [];
      for (const u of uploads) {
        let sha = u.sha;
        if (!sha) {
          const bytes = await kv.get(`up:${u.path}`, { type: 'arrayBuffer' });
          if (!bytes) continue;
          sha = await gh.createBlob(bytesToBase64(new Uint8Array(bytes)));
        }
        blobs.push({ path: 'public' + u.path, sha });
      }
      const files = Object.entries(plan.put).map(([path, text]) => ({ path, text }));
      const deletions = [...plan.del, ...mediaDel];
      let newOid = oid;
      if (files.length || blobs.length || deletions.length) {
        newOid = await gh.commit({ expectedOid: oid, message: `Адмінка: зміни на сайті (${user.email})`, files, blobs, deletions });
      }

      // Чернетку прибираємо, лише якщо поки ми публікували її ніхто не змінив (інакше нові правки лишаються в чернетці).
      const now = await getDraft(kv);
      if (!now || !draft || now.rev === draft.rev) await kv.delete('draft');
      for (const u of uploads) {
        const bytes = await kv.get(`up:${u.path}`, { type: 'arrayBuffer' });
        if (bytes) await kv.put(`was:${u.path}`, bytes, { metadata: { type: u.type }, expirationTtl: 60 * 60 * 24 * 2 });
        await kv.delete(`up:${u.path}`);
      }
      return { ok: true, oid: newOid, published: uploads.map((u) => u.path) };
    } catch (e) {
      if (e.stale && attempt < 2) continue;
      throw e;
    }
  }
}

// Вхід паролем. Після 8 невдалих спроб з однієї адреси — пауза 15 хвилин.
async function handleLogin(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  const key = `fail:${ip}`;
  const fails = +((await env.ADMIN_KV.get(key)) || 0);
  if (fails >= 8) return fail(429, 'Забагато спроб. Спробуйте за 15 хвилин.');
  const body = await request.json().catch(() => ({}));
  const r = await login(env, body.password);
  if (!r) {
    await env.ADMIN_KV.put(key, String(fails + 1), { expirationTtl: 15 * 60 });
    return fail(401, 'Пароль не підходить. Перевірте розкладку й великі літери.');
  }
  return new Response(JSON.stringify({ ok: true, name: r.name }), {
    headers: { 'content-type': 'application/json', 'set-cookie': r.cookie, 'cache-control': 'no-store' },
  });
}
