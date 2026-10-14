// Хто зайшов в адмінку.
// Основний вхід — пароль (секрет ADMIN_LOGINS у Cloudflare: «Женя:пароль1;Ляна:пароль2»).
// Після входу браузер отримує підписаний пропуск (cookie) на 60 днів — пароль щоразу вводити не треба.
// Коли в сайту буде власний домен, можна додатково ввімкнути Cloudflare Access — тоді задати ACCESS_TEAM_DOMAIN і ACCESS_AUD.
// Для локальної розробки: DEV_USER=ім'я — перевірка пропускається.

const COOKIE = 'adm';
const DAYS = 60;

async function hmac(secret, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const secretOf = (env) => env.SESSION_SECRET || env.ADMIN_LOGINS || '';

function logins(env) {
  return String(env.ADMIN_LOGINS || '')
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const i = x.indexOf(':');
      return { name: x.slice(0, i).trim(), password: x.slice(i + 1) };
    })
    .filter((x) => x.name && x.password);
}

// однакове порівняння за часом, щоб пароль не можна було вгадувати по швидкості відповіді
function same(a, b) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] || 0) ^ (y[i] || 0);
  return d === 0;
}

/** Перевірити пароль і видати cookie. Повертає Set-Cookie або null. */
export async function login(env, password) {
  const who = logins(env).find((l) => same(l.password, String(password || '')));
  if (!who) return null;
  const exp = Math.floor(Date.now() / 1000) + DAYS * 86400;
  const body = `${encodeURIComponent(who.name)}.${exp}`;
  const sig = await hmac(secretOf(env), body);
  return { name: who.name, cookie: `${COOKIE}=${body}.${sig}; Path=/; Max-Age=${DAYS * 86400}; HttpOnly; Secure; SameSite=Lax` };
}
export const logoutCookie = `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;

async function fromCookie(request, env) {
  const raw = (request.headers.get('cookie') || '').match(/(?:^|;\s*)adm=([^;]+)/)?.[1];
  if (!raw || !secretOf(env)) return null;
  const [name, exp, sig] = raw.split('.');
  if (!name || !exp || !sig || +exp < Date.now() / 1000) return null;
  if (!same(await hmac(secretOf(env), `${name}.${exp}`), sig)) return null;
  const n = decodeURIComponent(name);
  if (!logins(env).some((l) => l.name === n)) return null; // людину прибрали зі списку — пропуск більше не діє
  return { email: n };
}

let jwksCache = null;

export async function verifyAccess(request, env) {
  if (env.DEV_USER) return { email: env.DEV_USER };
  const c = await fromCookie(request, env);
  if (c) return c;

  const token =
    request.headers.get('cf-access-jwt-assertion') ||
    (request.headers.get('cookie') || '').match(/CF_Authorization=([^;]+)/)?.[1];
  if (!token || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) throw new Error('no token');

  const [h, p, s] = token.split('.');
  const header = JSON.parse(b64urlText(h));
  const payload = JSON.parse(b64urlText(p));

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error('expired');
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.ACCESS_AUD)) throw new Error('aud');
  if (payload.iss && payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) throw new Error('iss');

  const key = await getKey(env.ACCESS_TEAM_DOMAIN, header.kid);
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlBytes(s),
    new TextEncoder().encode(`${h}.${p}`),
  );
  if (!ok) throw new Error('signature');

  const email = String(payload.email || '').toLowerCase();
  if (env.ALLOWED_EMAILS) {
    const allowed = env.ALLOWED_EMAILS.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    if (!allowed.includes(email)) throw new Error('not allowed');
  }
  return { email };
}

async function getKey(team, kid) {
  if (!jwksCache || !jwksCache.keys.some((k) => k.kid === kid)) {
    const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
    jwksCache = await res.json();
  }
  const jwk = jwksCache.keys.find((k) => k.kid === kid);
  if (!jwk) throw new Error('kid');
  return crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
}

function b64urlBytes(s) {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}
function b64urlText(s) {
  return new TextDecoder().decode(b64urlBytes(s));
}
