var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/github.js
import { Buffer as Buffer2 } from "node:buffer";

// worker/content.js
var DIRS = {
  categories: "src/content/categories",
  portfolio: "src/content/portfolio",
  albums: "src/content/albums"
};
var FILES = {
  site: "src/data/site.json",
  vibe: "src/data/vibe.json"
};
var MEDIA_DIR = "public/media";
var clone = /* @__PURE__ */ __name((x) => x === void 0 ? void 0 : JSON.parse(JSON.stringify(x)), "clone");
function filesToDoc(files) {
  const doc = { categories: [], portfolio: [], albums: [], site: {}, vibe: null };
  for (const [key, dir] of Object.entries(DIRS)) {
    for (const [path, text] of Object.entries(files)) {
      if (!path.startsWith(dir + "/") || !path.endsWith(".json")) continue;
      const id = path.slice(dir.length + 1, -5);
      if (id.includes("/")) continue;
      try {
        doc[key].push({ id, ...JSON.parse(text) });
      } catch {
      }
    }
    doc[key].sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || String(a.id).localeCompare(String(b.id)));
  }
  for (const [key, path] of Object.entries(FILES)) {
    if (files[path] !== void 0) doc[key] = JSON.parse(files[path]);
  }
  return doc;
}
__name(filesToDoc, "filesToDoc");
function docToFiles(doc) {
  const out = {};
  for (const [key, dir] of Object.entries(DIRS)) {
    for (const item of doc[key] || []) {
      const { id, ...rest } = item;
      out[`${dir}/${id}.json`] = rest;
    }
  }
  for (const [key, path] of Object.entries(FILES)) {
    if (doc[key] !== null && doc[key] !== void 0) out[path] = doc[key];
  }
  return out;
}
__name(docToFiles, "docToFiles");
var stringify = /* @__PURE__ */ __name((obj) => JSON.stringify(obj, null, 2) + "\n", "stringify");
function eq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
__name(eq, "eq");
function diffFiles(baseDoc, nextDoc) {
  const a = docToFiles(baseDoc);
  const b = docToFiles(nextDoc);
  const out = [];
  for (const path of /* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!(path in b)) out.push({ path, op: "delete" });
    else if (!(path in a)) out.push({ path, op: "put", value: b[path] });
    else if (!eq(a[path], b[path])) out.push({ path, op: "put", value: b[path], patch: fieldPatch(a[path], b[path]) });
  }
  return out;
}
__name(diffFiles, "diffFiles");
function fieldPatch(a, b, prefix = []) {
  const ops = [];
  const isObj = /* @__PURE__ */ __name((x) => x && typeof x === "object" && !Array.isArray(x), "isObj");
  if (!isObj(a) || !isObj(b)) return [{ path: prefix, value: clone(b) }];
  for (const k of /* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!(k in b)) ops.push({ path: [...prefix, k], del: true });
    else if (!(k in a)) ops.push({ path: [...prefix, k], value: clone(b[k]) });
    else if (!eq(a[k], b[k])) {
      if (isObj(a[k]) && isObj(b[k])) ops.push(...fieldPatch(a[k], b[k], [...prefix, k]));
      else ops.push({ path: [...prefix, k], value: clone(b[k]) });
    }
  }
  return ops;
}
__name(fieldPatch, "fieldPatch");
function applyPatch(target, ops) {
  const root = clone(target);
  for (const op of ops) {
    if (op.path.length === 0) return clone(op.value);
    let cur = root;
    for (const k of op.path.slice(0, -1)) {
      if (!cur[k] || typeof cur[k] !== "object") cur[k] = {};
      cur = cur[k];
    }
    const last = op.path[op.path.length - 1];
    if (op.del) delete cur[last];
    else cur[last] = clone(op.value);
  }
  return root;
}
__name(applyPatch, "applyPatch");
function planPublish(baseDoc, currentFiles, draftDoc) {
  const put = {};
  const del = [];
  for (const ch of diffFiles(baseDoc, draftDoc)) {
    if (ch.op === "delete") {
      if (ch.path in currentFiles) del.push(ch.path);
      continue;
    }
    let value = ch.value;
    if (ch.patch && currentFiles[ch.path] !== void 0) {
      try {
        value = applyPatch(JSON.parse(currentFiles[ch.path]), ch.patch);
      } catch {
        value = ch.value;
      }
    }
    const text = stringify(value);
    if (currentFiles[ch.path] === void 0 || !eq(JSON.parse(currentFiles[ch.path]), value)) put[ch.path] = text;
  }
  return { put, del };
}
__name(planPublish, "planPublish");
function referencedMedia(doc) {
  const out = /* @__PURE__ */ new Set();
  const walk = /* @__PURE__ */ __name((x) => {
    if (typeof x === "string") {
      if (x.startsWith("/media/")) out.add(x);
    } else if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === "object") Object.values(x).forEach(walk);
  }, "walk");
  walk(doc);
  return out;
}
__name(referencedMedia, "referencedMedia");

// worker/github.js
var GitHub = class {
  static {
    __name(this, "GitHub");
  }
  constructor(env) {
    this.token = env.GITHUB_TOKEN;
    this.owner = env.GITHUB_OWNER || "designby-lyana";
    this.repo = env.GITHUB_REPO || "zhenya-site";
    this.branch = env.GITHUB_BRANCH || "main";
    this.api = (env.GITHUB_API || "https://api.github.com").replace(/\/$/, "");
  }
  async gql(query, variables) {
    const res = await fetch(this.api + "/graphql", {
      method: "POST",
      headers: {
        authorization: `bearer ${this.token}`,
        "content-type": "application/json",
        "user-agent": "zhenya-admin"
      },
      body: JSON.stringify({ query, variables })
    });
    const text = await res.text();
    let json2;
    try {
      json2 = JSON.parse(text);
    } catch {
      throw new Error(`GitHub ${res.status}: ${text.slice(0, 200)}`);
    }
    if (!res.ok || json2.errors) {
      const msg = json2.errors ? json2.errors.map((e) => e.message).join("; ") : text.slice(0, 200);
      const err = new Error(`GitHub: ${msg}`);
      err.stale = /expected|head|oid|not up to date|stale/i.test(msg);
      throw err;
    }
    return json2.data;
  }
  async headOid() {
    const d = await this.gql(
      `query($o:String!,$r:String!,$q:String!){repository(owner:$o,name:$r){ref(qualifiedName:$q){target{oid}}}}`,
      { o: this.owner, r: this.repo, q: `refs/heads/${this.branch}` }
    );
    const oid = d.repository?.ref?.target?.oid;
    if (!oid) throw new Error(`\u0413\u0456\u043B\u043A\u0443 ${this.branch} \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E`);
    return oid;
  }
  /** Увесь контент на коміті oid: { files: {path: text}, media: [{path, size}] }. */
  async readContent(oid) {
    const tree = /* @__PURE__ */ __name((alias, path, withText) => `${alias}: object(expression: "${oid}:${path}") { ... on Tree { entries { name type object { ... on Blob { ${withText ? "text" : "byteSize"} } } } } }`, "tree");
    const blob = /* @__PURE__ */ __name((alias, path) => `${alias}: object(expression: "${oid}:${path}") { ... on Blob { text } }`, "blob");
    const parts = [
      ...Object.entries(DIRS).map(([k, p]) => tree(k, p, true)),
      ...Object.entries(FILES).map(([k, p]) => blob(k, p)),
      tree("media", MEDIA_DIR, false)
    ];
    const d = await this.gql(
      `query($o:String!,$r:String!){repository(owner:$o,name:$r){ ${parts.join("\n")} }}`,
      { o: this.owner, r: this.repo }
    );
    const repo = d.repository;
    const files = {};
    for (const [k, p] of Object.entries(DIRS)) {
      for (const e of repo[k]?.entries || []) if (e.type === "blob" && e.object?.text != null) files[`${p}/${e.name}`] = e.object.text;
    }
    for (const [k, p] of Object.entries(FILES)) if (repo[k]?.text != null) files[p] = repo[k].text;
    const media = (repo.media?.entries || []).filter((e) => e.type === "blob").map((e) => ({ path: `/media/${e.name}`, size: e.object?.byteSize ?? 0 }));
    return { files, media };
  }
  async rest(method, path, body) {
    const res = await fetch(`${this.api}/repos/${this.owner}/${this.repo}${path}`, {
      method,
      headers: {
        authorization: `bearer ${this.token}`,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
        "user-agent": "zhenya-admin"
      },
      body: body ? JSON.stringify(body) : void 0
    });
    const text = await res.text();
    const json2 = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const err = new Error(`GitHub ${res.status}: ${json2.message || text.slice(0, 200)}`);
      err.stale = res.status === 422 || res.status === 409;
      throw err;
    }
    return json2;
  }
  /** Фото відправляємо в GitHub одразу під час завантаження — тоді публікація легка й швидка. Повертає sha. */
  async createBlob(base64) {
    const r = await this.rest("POST", "/git/blobs", { content: base64, encoding: "base64" });
    return r.sha;
  }
  /**
   * Коміт у гілку поверх expectedOid.
   * files: [{path, text}] — текстові файли; blobs: [{path, sha}] — уже завантажені фото; deletions: [path].
   * Якщо гілка за цей час змінилась, оновлення відхиляється (err.stale) — тоді повторюємо з новим станом.
   */
  async commit({ expectedOid, message, files = [], blobs = [], deletions = [] }) {
    const parent = await this.rest("GET", `/git/commits/${expectedOid}`);
    const tree = [
      ...files.map((f) => ({ path: f.path, mode: "100644", type: "blob", content: f.text })),
      ...blobs.map((b) => ({ path: b.path, mode: "100644", type: "blob", sha: b.sha })),
      ...deletions.map((p) => ({ path: p, mode: "100644", type: "blob", sha: null }))
    ];
    const t = await this.rest("POST", "/git/trees", { base_tree: parent.tree.sha, tree });
    const c = await this.rest("POST", "/git/commits", { message, tree: t.sha, parents: [expectedOid] });
    await this.rest("PATCH", `/git/refs/heads/${this.branch}`, { sha: c.sha, force: false });
    return c.sha;
  }
};
function bytesToBase64(bytes) {
  if (typeof Buffer2 !== "undefined") return Buffer2.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
  let bin = "";
  const CH = 32768;
  for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  return btoa(bin);
}
__name(bytesToBase64, "bytesToBase64");

// worker/access.js
var COOKIE = "adm";
var DAYS = 60;
async function hmac(secret, text) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(hmac, "hmac");
var secretOf = /* @__PURE__ */ __name((env) => env.SESSION_SECRET || env.ADMIN_LOGINS || "", "secretOf");
function logins(env) {
  return String(env.ADMIN_LOGINS || "").split(";").map((x) => x.trim()).filter(Boolean).map((x) => {
    const i = x.indexOf(":");
    return { name: x.slice(0, i).trim(), password: x.slice(i + 1) };
  }).filter((x) => x.name && x.password);
}
__name(logins, "logins");
function same(a, b) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] || 0) ^ (y[i] || 0);
  return d === 0;
}
__name(same, "same");
async function login(env, password) {
  const who = logins(env).find((l) => same(l.password, String(password || "")));
  if (!who) return null;
  const exp = Math.floor(Date.now() / 1e3) + DAYS * 86400;
  const body = `${encodeURIComponent(who.name)}.${exp}`;
  const sig = await hmac(secretOf(env), body);
  return { name: who.name, cookie: `${COOKIE}=${body}.${sig}; Path=/; Max-Age=${DAYS * 86400}; HttpOnly; Secure; SameSite=Lax` };
}
__name(login, "login");
var logoutCookie = `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
async function fromCookie(request, env) {
  const raw = (request.headers.get("cookie") || "").match(/(?:^|;\s*)adm=([^;]+)/)?.[1];
  if (!raw || !secretOf(env)) return null;
  const [name, exp, sig] = raw.split(".");
  if (!name || !exp || !sig || +exp < Date.now() / 1e3) return null;
  if (!same(await hmac(secretOf(env), `${name}.${exp}`), sig)) return null;
  const n = decodeURIComponent(name);
  if (!logins(env).some((l) => l.name === n)) return null;
  return { email: n };
}
__name(fromCookie, "fromCookie");
var jwksCache = null;
async function verifyAccess(request, env) {
  if (env.DEV_USER) return { email: env.DEV_USER };
  const c = await fromCookie(request, env);
  if (c) return c;
  const token = request.headers.get("cf-access-jwt-assertion") || (request.headers.get("cookie") || "").match(/CF_Authorization=([^;]+)/)?.[1];
  if (!token || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) throw new Error("no token");
  const [h, p, s] = token.split(".");
  const header = JSON.parse(b64urlText(h));
  const payload = JSON.parse(b64urlText(p));
  const now = Math.floor(Date.now() / 1e3);
  if (payload.exp && payload.exp < now) throw new Error("expired");
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.ACCESS_AUD)) throw new Error("aud");
  if (payload.iss && payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) throw new Error("iss");
  const key = await getKey(env.ACCESS_TEAM_DOMAIN, header.kid);
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64urlBytes(s),
    new TextEncoder().encode(`${h}.${p}`)
  );
  if (!ok) throw new Error("signature");
  const email = String(payload.email || "").toLowerCase();
  if (env.ALLOWED_EMAILS) {
    const allowed = env.ALLOWED_EMAILS.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
    if (!allowed.includes(email)) throw new Error("not allowed");
  }
  return { email };
}
__name(verifyAccess, "verifyAccess");
async function getKey(team, kid) {
  if (!jwksCache || !jwksCache.keys.some((k) => k.kid === kid)) {
    const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
    jwksCache = await res.json();
  }
  const jwk = jwksCache.keys.find((k) => k.kid === kid);
  if (!jwk) throw new Error("kid");
  return crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
}
__name(getKey, "getKey");
function b64urlBytes(s) {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}
__name(b64urlBytes, "b64urlBytes");
function b64urlText(s) {
  return new TextDecoder().decode(b64urlBytes(s));
}
__name(b64urlText, "b64urlText");

// worker/index.js
var json = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
}), "json");
var fail = /* @__PURE__ */ __name((status, message, extra = {}) => json({ error: message, ...extra }, status), "fail");
var MAX_UPLOAD = 24 * 1024 * 1024;
var EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "video/mp4": ".mp4" };
function validDoc(d) {
  return !!d && typeof d === "object" && !Array.isArray(d) && ["portfolio", "categories", "albums"].every((k) => Array.isArray(d[k])) && !!d.site && typeof d.site === "object";
}
__name(validDoc, "validDoc");
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (url.pathname === "/api/login" && request.method === "POST") return handleLogin(request, env);
    if (url.pathname === "/api/logout" && request.method === "POST")
      return new Response('{"ok":true}', { headers: { "set-cookie": logoutCookie, "content-type": "application/json" } });
    let user;
    try {
      user = await verifyAccess(request, env);
    } catch (e) {
      return fail(401, "\u041F\u043E\u0442\u0440\u0456\u0431\u043D\u043E \u0443\u0432\u0456\u0439\u0442\u0438 \u0432 \u0430\u0434\u043C\u0456\u043D\u043A\u0443");
    }
    try {
      return await route(request, env, url, user);
    } catch (e) {
      console.error(e);
      return fail(e.status || 500, e.publicMessage || "\u0429\u043E\u0441\u044C \u043F\u0456\u0448\u043B\u043E \u043D\u0435 \u0442\u0430\u043A. \u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0449\u0435 \u0440\u0430\u0437 \u0437\u0430 \u0445\u0432\u0438\u043B\u0438\u043D\u0443.", { detail: String(e.message || e) });
    }
  }
};
async function route(request, env, url, user) {
  const kv = env.ADMIN_KV;
  const gh = new GitHub(env);
  const m = request.method;
  const p = url.pathname;
  if (p === "/api/state" && m === "GET") return json(await loadState(env, gh, user));
  if (p === "/api/draft" && m === "PUT") {
    const body = await request.json();
    if (!validDoc(body.doc)) return fail(400, "\u0427\u0435\u0440\u043D\u0435\u0442\u043A\u0430 \u043F\u043E\u0448\u043A\u043E\u0434\u0436\u0435\u043D\u0430 \u2014 \u0437\u043C\u0456\u043D\u0443 \u043D\u0435 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E. \u041E\u043D\u043E\u0432\u0456\u0442\u044C \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0443.");
    const cur = await getDraft(kv);
    if (cur && body.rev !== cur.rev || !cur && body.rev) return fail(409, "\u0427\u0435\u0440\u043D\u0435\u0442\u043A\u0443 \u0437\u043C\u0456\u043D\u0435\u043D\u043E \u043D\u0430 \u0456\u043D\u0448\u043E\u043C\u0443 \u043F\u0440\u0438\u0441\u0442\u0440\u043E\u0457", { draft: cur });
    const next = {
      rev: (cur?.rev || 0) + 1,
      baseOid: body.baseOid,
      doc: body.doc,
      mediaDel: Array.isArray(body.mediaDel) ? body.mediaDel : [],
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      by: user.email
    };
    try {
      await kv.put("draft", JSON.stringify(next));
    } catch (e) {
      return fail(503, "\u0421\u0435\u0440\u0432\u0435\u0440 \u0437\u0430\u0439\u043D\u044F\u0442\u0438\u0439, \u043F\u043E\u0432\u0442\u043E\u0440\u044E\u044E \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043D\u044F\u2026");
    }
    return json({ rev: next.rev, updatedAt: next.updatedAt });
  }
  if (p === "/api/upload" && m === "POST") {
    const type = (request.headers.get("content-type") || "").split(";")[0].trim();
    const ext = EXT[type];
    if (!ext) return fail(415, "\u041F\u0456\u0434\u0445\u043E\u0434\u044F\u0442\u044C \u0444\u043E\u0442\u043E JPG, PNG, WebP \u0430\u0431\u043E \u0432\u0456\u0434\u0435\u043E MP4");
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > MAX_UPLOAD) return fail(413, "\u0424\u0430\u0439\u043B \u0437\u0430\u0432\u0435\u043B\u0438\u043A\u0438\u0439");
    const base = (url.searchParams.get("name") || "foto").toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "foto";
    const rand = [...crypto.getRandomValues(new Uint8Array(3))].map((x) => x.toString(16).padStart(2, "0")).join("");
    const path = `/media/${base}-${rand}${ext}`;
    const sha = await gh.createBlob(bytesToBase64(new Uint8Array(bytes)));
    await kv.put(`up:${path}`, bytes, { metadata: { size: bytes.byteLength, type, at: Date.now(), sha } });
    return json({ path, size: bytes.byteLength });
  }
  if (p === "/api/upload" && m === "DELETE") {
    await kv.delete(`up:${url.searchParams.get("path")}`);
    return json({ ok: true });
  }
  if (p === "/api/media" && m === "GET") {
    const path = url.searchParams.get("path") || "";
    let { value, metadata } = await kv.getWithMetadata(`up:${path}`, { type: "arrayBuffer" });
    if (!value) ({ value, metadata } = await kv.getWithMetadata(`was:${path}`, { type: "arrayBuffer" }));
    if (value) return new Response(value, { headers: { "content-type": metadata?.type || "image/jpeg", "cache-control": "private, max-age=3600" } });
    return Response.redirect(new URL(path, url).href, 302);
  }
  if (p === "/api/publish" && m === "POST") {
    const body = await request.json().catch(() => ({}));
    return json(await publish(env, gh, body.rev, user));
  }
  if (p === "/api/discard" && m === "POST") {
    await kv.delete("draft");
    for (const k of await listUploads(kv)) await kv.delete(`up:${k.path}`);
    return json({ ok: true });
  }
  return fail(404, "\u041D\u0435\u043C\u0430\u0454 \u0442\u0430\u043A\u043E\u0457 \u0434\u0456\u0457");
}
__name(route, "route");
async function getDraft(kv) {
  const t = await kv.get("draft");
  return t ? JSON.parse(t) : null;
}
__name(getDraft, "getDraft");
async function listUploads(kv) {
  const out = [];
  let cursor;
  do {
    const r = await kv.list({ prefix: "up:", cursor });
    for (const k of r.keys) out.push({ path: k.name.slice(3), size: k.metadata?.size || 0, type: k.metadata?.type, at: k.metadata?.at || 0, sha: k.metadata?.sha });
    cursor = r.list_complete ? void 0 : r.cursor;
  } while (cursor);
  return out;
}
__name(listUploads, "listUploads");
async function published(env, gh, oid) {
  const key = `pub:${oid}`;
  const cached = await env.ADMIN_KV.get(key);
  if (cached) return JSON.parse(cached);
  const data = await gh.readContent(oid);
  await env.ADMIN_KV.put(key, JSON.stringify(data), { expirationTtl: 60 * 60 * 24 * 14 });
  return data;
}
__name(published, "published");
async function loadState(env, gh, user) {
  const kv = env.ADMIN_KV;
  const oid = await gh.headOid();
  const pub = await published(env, gh, oid);
  let draft = await getDraft(kv);
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
    await kv.put("draft", JSON.stringify(draft));
  }
  return {
    user: user.email,
    oid,
    published: filesToDoc(pub.files),
    media: pub.media,
    draft,
    uploads: await listUploads(kv),
    siteUrl: env.SITE_URL || ""
  };
}
__name(loadState, "loadState");
async function publish(env, gh, rev, user) {
  const kv = env.ADMIN_KV;
  const draft = await getDraft(kv);
  const uploads = await listUploads(kv);
  if (!draft && uploads.length === 0) return { ok: true, nothing: true, published: [] };
  if (draft && rev !== void 0 && rev !== draft.rev) {
    const e = new Error("stale draft");
    e.status = 409;
    e.publicMessage = "\u0427\u0435\u0440\u043D\u0435\u0442\u043A\u0443 \u0437\u043C\u0456\u043D\u0435\u043D\u043E \u043D\u0430 \u0456\u043D\u0448\u043E\u043C\u0443 \u043F\u0440\u0438\u0441\u0442\u0440\u043E\u0457. \u041E\u043D\u043E\u0432\u0456\u0442\u044C \u0441\u0442\u043E\u0440\u0456\u043D\u043A\u0443.";
    throw e;
  }
  for (let attempt = 0; ; attempt++) {
    const oid = await gh.headOid();
    try {
      const pub = await published(env, gh, oid);
      const base = draft ? await published(env, gh, draft.baseOid).catch(() => pub) : pub;
      const plan = draft ? planPublish(filesToDoc(base.files), pub.files, draft.doc) : { put: {}, del: [] };
      const final = { ...pub.files, ...plan.put };
      for (const d of plan.del) delete final[d];
      const used = referencedMedia(filesToDoc(final));
      const existing = new Set(pub.media.map((x) => x.path));
      const mediaDel = (draft?.mediaDel || []).filter((x) => existing.has(x) && !used.has(x)).map((x) => "public" + x);
      const blobs = [];
      for (const u of uploads) {
        let sha = u.sha;
        if (!sha) {
          const bytes = await kv.get(`up:${u.path}`, { type: "arrayBuffer" });
          if (!bytes) continue;
          sha = await gh.createBlob(bytesToBase64(new Uint8Array(bytes)));
        }
        blobs.push({ path: "public" + u.path, sha });
      }
      const files = Object.entries(plan.put).map(([path, text]) => ({ path, text }));
      const deletions = [...plan.del, ...mediaDel];
      let newOid = oid;
      if (files.length || blobs.length || deletions.length) {
        newOid = await gh.commit({ expectedOid: oid, message: `\u0410\u0434\u043C\u0456\u043D\u043A\u0430: \u0437\u043C\u0456\u043D\u0438 \u043D\u0430 \u0441\u0430\u0439\u0442\u0456 (${user.email})`, files, blobs, deletions });
      }
      const now = await getDraft(kv);
      if (!now || !draft || now.rev === draft.rev) await kv.delete("draft");
      for (const u of uploads) {
        const bytes = await kv.get(`up:${u.path}`, { type: "arrayBuffer" });
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
__name(publish, "publish");
async function handleLogin(request, env) {
  const ip = request.headers.get("cf-connecting-ip") || "local";
  const key = `fail:${ip}`;
  const fails = +(await env.ADMIN_KV.get(key) || 0);
  if (fails >= 8) return fail(429, "\u0417\u0430\u0431\u0430\u0433\u0430\u0442\u043E \u0441\u043F\u0440\u043E\u0431. \u0421\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0437\u0430 15 \u0445\u0432\u0438\u043B\u0438\u043D.");
  const body = await request.json().catch(() => ({}));
  const r = await login(env, body.password);
  if (!r) {
    await env.ADMIN_KV.put(key, String(fails + 1), { expirationTtl: 15 * 60 });
    return fail(401, "\u041F\u0430\u0440\u043E\u043B\u044C \u043D\u0435 \u043F\u0456\u0434\u0445\u043E\u0434\u0438\u0442\u044C. \u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0440\u043E\u0437\u043A\u043B\u0430\u0434\u043A\u0443 \u0439 \u0432\u0435\u043B\u0438\u043A\u0456 \u043B\u0456\u0442\u0435\u0440\u0438.");
  }
  return new Response(JSON.stringify({ ok: true, name: r.name }), {
    headers: { "content-type": "application/json", "set-cookie": r.cookie, "cache-control": "no-store" }
  });
}
__name(handleLogin, "handleLogin");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-MsLFjh/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-MsLFjh/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
