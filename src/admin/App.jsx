// Адмінка сайту Жені. Сторінки перемикаються через адресу після # (#/frames, #/albums …).
import { useEffect, useMemo, useState } from 'react';
import { useStore, load, publish, discardAll, update, setMediaDel, getState, flushSave } from './store.js';
import { computeChanges, plural } from './changes.js';
import { Btn, Dialog, Icon } from './ui.jsx';
import Frames from './pages/Frames.jsx';
import EditFrame from './pages/EditFrame.jsx';
import Albums from './pages/Albums.jsx';
import EditAlbum from './pages/EditAlbum.jsx';
import Hero from './pages/Hero.jsx';
import Texts from './pages/Texts.jsx';
import Vibe from './pages/Vibe.jsx';
import Files from './pages/Files.jsx';
import AddPhotos from './pages/AddPhotos.jsx';
import './admin.css';

const AVATAR = '/media/6ab4f49770d828296938d6a0_zh-ig-avatar.jpg';

export function useRoute() {
  const read = () => (location.hash.replace(/^#\/?/, '') || 'frames').split('?');
  const [r, setR] = useState(read);
  useEffect(() => {
    const on = () => {
      setR(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const [path, query] = r;
  const parts = path.split('/');
  return { page: parts[0], id: decodeURIComponent(parts[1] || ''), query: new URLSearchParams(query || '') };
}
export const go = (to) => (location.hash = to);

const NAV = [
  { group: 'Портфоліо', items: [['frames', 'Кадри'], ['albums', 'Альбоми']] },
  { group: 'Сторінка', items: [['hero', 'Фото головного екрана'], ['texts', 'Тексти сайту'], ['vibe', 'Вайбовий екран']] },
];
const ACTIVE = { frame: 'frames', add: 'frames', album: 'albums' };

export default function App() {
  const st = useStore();
  const route = useRoute();
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    load();
  }, []);
  useEffect(() => setMenu(false), [route.page, route.id]);

  if (st.status === 'loading') return <div className="boot">Відкриваю адмінку…</div>;
  if (st.status === 'auth') return <Login />;
  if (st.status === 'error')
    return (
      <div className="boot">
        <p>Не вдалося відкрити адмінку: {st.error}</p>
        <Btn kind="primary" onClick={() => load()}>Спробувати ще раз</Btn>
      </div>
    );

  const active = ACTIVE[route.page] || route.page;
  const page = (() => {
    switch (route.page) {
      case 'frames': return <Frames />;
      case 'frame': return <EditFrame key={route.id} id={route.id} />;
      case 'albums': return <Albums />;
      case 'album': return <EditAlbum key={route.id} id={route.id} />;
      case 'hero': return <Hero />;
      case 'texts': return <Texts />;
      case 'vibe': return <Vibe />;
      case 'files': return <Files />;
      case 'add': return <AddPhotos key={route.query.get('to') || 'frames'} to={route.query.get('to') || 'frames'} />;
      default: return <Frames />;
    }
  })();

  const nav = (
    <nav className="nav" aria-label="Розділи адмінки">
      <div className="brand">
        <span className="ava-ring">
          <img src={AVATAR} alt="" />
        </span>
        <span className="brand-text">
          <span className="brand-name">Сайт Жені</span>
          <a href={st.siteUrl || '/'} target="_blank" rel="noopener">Відкрити сайт ↗</a>
        </span>
      </div>
      {NAV.map((g) => (
        <div key={g.group} className="nav-group">
          <div className="nav-group-title">{g.group}</div>
          {g.items.map(([id, label]) => (
            <a key={id} href={`#/${id}`} className={`nav-link ${active === id ? 'is-current' : ''}`} aria-current={active === id ? 'page' : undefined}>
              {label}
            </a>
          ))}
        </div>
      ))}
      <div className="nav-spacer" />
      <a href="#/files" className={`nav-link nav-link-quiet ${active === 'files' ? 'is-current' : ''}`} aria-current={active === 'files' ? 'page' : undefined}>
        Усі файли
      </a>
      <button type="button" className="nav-link nav-link-quiet nav-logout" onClick={logout}>Вийти ({st.user})</button>
    </nav>
  );

  return (
    <div className="app">
      <header className="mbar">
        <button type="button" className="icon-btn" aria-label="Меню" aria-expanded={menu} onClick={() => setMenu(true)}>{Icon.menu}</button>
        <span className="mbar-title">Сайт Жені</span>
        <span className="ava-ring ava-sm"><img src={AVATAR} alt="" /></span>
      </header>
      <aside className={`side ${menu ? 'is-open' : ''}`}>
        <button type="button" className="icon-btn side-close" aria-label="Закрити меню" onClick={() => setMenu(false)}>{Icon.close}</button>
        {nav}
      </aside>
      {menu && <div className="side-back" onClick={() => setMenu(false)} />}
      <main className={`main ${st.publishing ? 'is-busy' : ''}`}>
        <PublishBar />
        <div className="page">{page}</div>
      </main>
      <Toast />
    </div>
  );
}

function PublishBar() {
  const st = useStore();
  const [open, setOpen] = useState(false);
  const changes = useMemo(() => computeChanges(st.published, st.doc, { mediaDel: st.mediaDel, uploads: st.uploads }), [st.published, st.doc, st.mediaDel, st.uploads]);
  const real = changes.filter((c) => !c.info);
  const n = real.length;
  const dirty = n > 0 || st.uploads.length > 0;
  return (
    <>
      <div className={`pubbar ${dirty ? 'is-dirty' : 'is-clean'}`} role="status">
        {!dirty ? (
          <>
            <span className="pubbar-ok">{Icon.check}</span>
            <span>{st.publishedAt ? 'Опубліковано. На сайті з’явиться за 1–2 хвилини.' : 'Усе опубліковано'}</span>
          </>
        ) : (
          <>
            <span className="pubbar-count">
              {n ? `${plural(n, 'зміна', 'зміни', 'змін')} ще не на сайті` : 'Нові файли ще не на сайті'}
              <span className="pubbar-save">{st.saveError ? st.saveError : st.saving ? 'Зберігаю чернетку…' : 'Чернетку збережено'}</span>
            </span>
            <Btn onClick={() => setOpen(true)}>Переглянути зміни</Btn>
            <Btn kind="primary" disabled={st.publishing} onClick={publish}>{st.publishing ? 'Публікую…' : 'Опублікувати'}</Btn>
          </>
        )}
      </div>
      {open && dirty && <Review changes={changes} onClose={() => setOpen(false)} />}
    </>
  );
}

function Review({ changes, onClose }) {
  const st = useStore();
  const [ask, setAsk] = useState(false);
  const revert = (c) => {
    if (c.revertMedia) setMediaDel(getState().mediaDel.filter((x) => x !== c.revertMedia));
    else if (c.revert) update((d) => { c.revert(d, getState().published); });
  };
  return (
    <Dialog
      title="Що зміниться на сайті"
      onClose={onClose}
      footer={
        ask ? (
          <div className="confirm">
            <span>Повернути все так, як зараз на сайті? Усі зміни й нові файли зникнуть.</span>
            <div className="row">
              <Btn onClick={() => setAsk(false)}>Ні, залишити</Btn>
              <Btn kind="danger" onClick={async () => { await discardAll(); onClose(); }}>Так, повернути</Btn>
            </div>
          </div>
        ) : (
          <div className="row between">
            <Btn kind="text-danger" onClick={() => setAsk(true)}>Скасувати всі зміни</Btn>
            <Btn kind="primary" disabled={st.publishing} onClick={async () => { await publish(); onClose(); }}>{st.publishing ? 'Публікую…' : 'Опублікувати'}</Btn>
          </div>
        )
      }
    >
      <ul className="changes">
        {changes.map((c, i) => (
          <li key={i}>
            <span>{c.text}</span>
            {!c.info && (
              <Btn className="btn-sm" onClick={() => revert(c)} aria-label={`Повернути як на сайті: ${c.text}`}>Повернути</Btn>
            )}
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

function Toast() {
  const t = useStore((s) => s.toast);
  if (!t) return null;
  return (
    <div className={`toast toast-${t.kind}`} role="status" key={t.id}>
      {t.text}
    </div>
  );
}

async function logout() {
  await flushSave();
  await fetch('/api/logout', { method: 'POST' });
  location.reload();
}

function Login() {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) load();
    else setErr(d.error || 'Не вдалося увійти');
  };
  return (
    <form className="login" onSubmit={submit}>
      <span className="ava-ring ava-lg"><img src={AVATAR} alt="" /></span>
      <h1>Адмінка сайту</h1>
      <label className="field">
        <span className="field-label">Пароль</span>
        <input className="fld" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        {err && <span className="field-error">{err}</span>}
      </label>
      <Btn kind="primary" type="submit" disabled={busy || !pw}>{busy ? 'Входжу…' : 'Увійти'}</Btn>
      <p className="muted small">Браузер запам’ятає вхід на 60 днів.</p>
    </form>
  );
}
