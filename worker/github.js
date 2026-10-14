import { Buffer } from 'node:buffer';
// Робота з GitHub: прочитати контент сайту з гілки і записати зміни одним комітом.
// Використовує GraphQL API — так весь контент читається одним запитом, а коміт атомарний.

import { DIRS, FILES, MEDIA_DIR } from './content.js';

export class GitHub {
  constructor(env) {
    this.token = env.GITHUB_TOKEN;
    this.owner = env.GITHUB_OWNER || 'designby-lyana';
    this.repo = env.GITHUB_REPO || 'zhenya-site';
    this.branch = env.GITHUB_BRANCH || 'main';
    this.api = (env.GITHUB_API || 'https://api.github.com').replace(/\/$/, '');
  }

  async gql(query, variables) {
    const res = await fetch(this.api + '/graphql', {
      method: 'POST',
      headers: {
        authorization: `bearer ${this.token}`,
        'content-type': 'application/json',
        'user-agent': 'zhenya-admin',
      },
      body: JSON.stringify({ query, variables }),
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`GitHub ${res.status}: ${text.slice(0, 200)}`);
    }
    if (!res.ok || json.errors) {
      const msg = json.errors ? json.errors.map((e) => e.message).join('; ') : text.slice(0, 200);
      const err = new Error(`GitHub: ${msg}`);
      err.stale = /expected|head|oid|not up to date|stale/i.test(msg);
      throw err;
    }
    return json.data;
  }

  async headOid() {
    const d = await this.gql(
      `query($o:String!,$r:String!,$q:String!){repository(owner:$o,name:$r){ref(qualifiedName:$q){target{oid}}}}`,
      { o: this.owner, r: this.repo, q: `refs/heads/${this.branch}` },
    );
    const oid = d.repository?.ref?.target?.oid;
    if (!oid) throw new Error(`Гілку ${this.branch} не знайдено`);
    return oid;
  }

  /** Увесь контент на коміті oid: { files: {path: text}, media: [{path, size}] }. */
  async readContent(oid) {
    const tree = (alias, path, withText) =>
      `${alias}: object(expression: "${oid}:${path}") { ... on Tree { entries { name type object { ... on Blob { ${withText ? 'text' : 'byteSize'} } } } } }`;
    const blob = (alias, path) => `${alias}: object(expression: "${oid}:${path}") { ... on Blob { text } }`;
    const parts = [
      ...Object.entries(DIRS).map(([k, p]) => tree(k, p, true)),
      ...Object.entries(FILES).map(([k, p]) => blob(k, p)),
      tree('media', MEDIA_DIR, false),
    ];
    const d = await this.gql(
      `query($o:String!,$r:String!){repository(owner:$o,name:$r){ ${parts.join('\n')} }}`,
      { o: this.owner, r: this.repo },
    );
    const repo = d.repository;
    const files = {};
    for (const [k, p] of Object.entries(DIRS)) {
      for (const e of repo[k]?.entries || []) if (e.type === 'blob' && e.object?.text != null) files[`${p}/${e.name}`] = e.object.text;
    }
    for (const [k, p] of Object.entries(FILES)) if (repo[k]?.text != null) files[p] = repo[k].text;
    const media = (repo.media?.entries || [])
      .filter((e) => e.type === 'blob')
      .map((e) => ({ path: `/media/${e.name}`, size: e.object?.byteSize ?? 0 }));
    return { files, media };
  }

  async rest(method, path, body) {
    const res = await fetch(`${this.api}/repos/${this.owner}/${this.repo}${path}`, {
      method,
      headers: {
        authorization: `bearer ${this.token}`,
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
        'user-agent': 'zhenya-admin',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const err = new Error(`GitHub ${res.status}: ${json.message || text.slice(0, 200)}`);
      // 422 «Update is not a fast forward» — main змінився, поки ми готували коміт
      err.stale = res.status === 422 || res.status === 409;
      throw err;
    }
    return json;
  }

  /** Фото відправляємо в GitHub одразу під час завантаження — тоді публікація легка й швидка. Повертає sha. */
  async createBlob(base64) {
    const r = await this.rest('POST', '/git/blobs', { content: base64, encoding: 'base64' });
    return r.sha;
  }

  /**
   * Коміт у гілку поверх expectedOid.
   * files: [{path, text}] — текстові файли; blobs: [{path, sha}] — уже завантажені фото; deletions: [path].
   * Якщо гілка за цей час змінилась, оновлення відхиляється (err.stale) — тоді повторюємо з новим станом.
   */
  async commit({ expectedOid, message, files = [], blobs = [], deletions = [] }) {
    const parent = await this.rest('GET', `/git/commits/${expectedOid}`);
    const tree = [
      ...files.map((f) => ({ path: f.path, mode: '100644', type: 'blob', content: f.text })),
      ...blobs.map((b) => ({ path: b.path, mode: '100644', type: 'blob', sha: b.sha })),
      ...deletions.map((p) => ({ path: p, mode: '100644', type: 'blob', sha: null })),
    ];
    const t = await this.rest('POST', '/git/trees', { base_tree: parent.tree.sha, tree });
    const c = await this.rest('POST', '/git/commits', { message, tree: t.sha, parents: [expectedOid] });
    await this.rest('PATCH', `/git/refs/heads/${this.branch}`, { sha: c.sha, force: false });
    return c.sha;
  }
}


export function bytesToBase64(bytes) {
  // Buffer (nodejs_compat) кодує нативно й швидко; запасний шлях — для середовищ без нього
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64');
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  return btoa(bin);
}
