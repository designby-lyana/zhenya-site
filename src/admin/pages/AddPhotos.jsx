import { useRef, useState } from 'react';
import { useStore, update, uploadFile, getState } from '../store.js';
import { sorted, renumber, uniqueId, catKey } from '../model.js';
import { Btn, LinkBtn, Icon, Photo, Field, Text } from '../ui.jsx';
import { prepareImage, PhotoError } from '../image.js';
import { heroSeq, setHeroSeq } from './Hero.jsx';
import { plural } from '../changes.js';

const BACK = { frames: ['#/frames', 'Кадри'], hero: ['#/hero', 'Фото головного екрана'] };

export default function AddPhotos({ to }) {
  const doc = useStore((s) => s.doc);
  const initAlbum = to.startsWith('album:') ? to.slice(6) : to === 'album-new' ? '__new' : '';
  const [dest, setDest] = useState(to.startsWith('album') ? 'album' : to === 'hero' ? 'hero' : 'frames');
  const [album, setAlbum] = useState(initAlbum || sorted(doc.albums)[0]?.id || '__new');
  const [newName, setNewName] = useState('');
  const [cats, setCats] = useState([]);
  const [recent, setRecent] = useState(true);
  const [items, setItems] = useState([]); // {key, name, status: 'wait'|'busy'|'done'|'error', error, path, frameId}
  const [over, setOver] = useState(false);
  const [err, setErr] = useState('');
  const createdAlbum = useRef(null);
  const ref = useRef(null);

  const locked = items.length > 0;
  const albumId = createdAlbum.current || (album === '__new' ? '' : album);
  const back = dest === 'album' ? (albumId ? [`#/album/${encodeURIComponent(albumId)}`, 'Альбом'] : ['#/albums', 'Альбоми']) : BACK[dest];

  const setItem = (key, patch) => setItems((l) => l.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const place = (path) => {
    let frameId = null;
    update((d) => {
      if (dest === 'frames') {
        frameId = uniqueId('kadr-' + path.replace('/media/', '').replace(/\.[^.]+$/, ''), new Set(d.portfolio.map((x) => x.id)));
        const list = sorted(d.portfolio);
        const item = { id: frameId, title: '', photo: path, alt: '', categories: [...cats], order: 0, hidden: false };
        if (recent) {
          d.portfolio.forEach((y) => y.recent && (y.recent += 1));
          item.recent = 1;
        }
        d.portfolio = renumber([item, ...list]);
      } else if (dest === 'album') {
        let id = createdAlbum.current || (album === '__new' ? null : album);
        let a = id && d.albums.find((x) => x.id === id);
        if (!a) {
          id = uniqueId(newName.trim(), new Set(d.albums.map((x) => x.id)));
          a = { id, title: newName.trim(), order: 0, cover: path, coverAlt: '', photos: [], hidden: false };
          d.albums = renumber([a, ...sorted(d.albums)]);
          createdAlbum.current = id;
        }
        a.photos = [...(a.photos || []), { photo: path, alt: '' }];
        if (!a.cover) a.cover = path;
      } else if (dest === 'hero') {
        setHeroSeq(d, [...heroSeq(d.site), { photo: path, alt: '' }]);
      }
    });
    return frameId;
  };

  const start = async (fileList) => {
    const files = [...fileList];
    if (!files.length) return;
    if (dest === 'album' && album === '__new' && !createdAlbum.current && !newName.trim()) {
      setErr('Спершу напишіть назву нового альбому');
      return;
    }
    setErr('');
    const known = new Set(getState().uploads.map((u) => u.path.replace('/media/', '').replace(/\.[^.]+$/, '')));
    const batch = files.map((f, i) => ({ key: Date.now() + '-' + i, file: f, name: f.name, status: 'wait' }));
    setItems((l) => [...l, ...batch]);
    for (const it of batch) {
      setItem(it.key, { status: 'busy' });
      try {
        const img = await prepareImage(it.file);
        const dup = known.has(img.name.replace(/\.jpg$/, ''));
        const path = await uploadFile(img.blob, img.name);
        const frameId = place(path);
        setItem(it.key, { status: 'done', path, frameId, dup });
      } catch (e) {
        setItem(it.key, { status: 'error', error: e instanceof PhotoError || e.status ? e.message : 'Не вдалося завантажити. Перевірте інтернет і спробуйте ще раз.' });
      }
    }
  };

  const done = items.filter((x) => x.status === 'done').length;
  const working = items.some((x) => x.status === 'busy' || x.status === 'wait');

  return (
    <>
      {back && <a href={back[0]} className="back">{Icon.back} {back[1]}</a>}
      <div className="page-head">
        <div>
          <h1>{dest === 'album' && album === '__new' ? 'Новий альбом' : 'Додати фото'}</h1>
          <p className="sub">Великі фото адмінка зменшить сама — якість на сайті не постраждає.</p>
        </div>
      </div>

      <div className="form narrow">
        <fieldset className="field" disabled={locked}>
          <legend className="field-label">Куди додати</legend>
          <div className="dest">
            {[
              ['frames', 'У кадри', 'Ряд «Портфоліо» на сайті'],
              ['album', 'В альбом', 'Серія з однієї зйомки'],
              ['hero', 'На головний екран', 'Фото під заголовком'],
            ].map(([id, t, s]) => (
              <label key={id} className={`dest-opt ${dest === id ? 'is-on' : ''}`}>
                <input type="radio" name="dest" checked={dest === id} onChange={() => setDest(id)} />
                <span><b>{t}</b><span className="muted small">{s}</span></span>
              </label>
            ))}
          </div>
        </fieldset>

        {dest === 'album' && (
          <>
            <Field label="Альбом">
              <select className="fld" value={album} disabled={locked} onChange={(e) => setAlbum(e.target.value)}>
                <option value="__new">+ Новий альбом</option>
                {sorted(doc.albums).map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </Field>
            {album === '__new' && (
              <Field label="Назва нового альбому" error={err}>
                <Text value={newName} disabled={locked} onChange={(v) => { setNewName(v); setErr(''); }} placeholder="Напр. «Осінь у Стрийському парку»" />
              </Field>
            )}
          </>
        )}

        {dest === 'frames' && (
          <>
            <fieldset className="field">
              <legend className="field-label">Категорії для цих кадрів</legend>
              <div className="checks">
                {sorted(doc.categories).map((c) => (
                  <label key={c.id} className={`check ${cats.includes(c.id) ? 'is-on' : ''}`}>
                    <input type="checkbox" disabled={locked} checked={cats.includes(c.id)} onChange={(e) => setCats(e.target.checked ? [...cats, c.id] : cats.filter((x) => x !== c.id))} />
                    {c.name}
                  </label>
                ))}
              </div>
              <span className="field-hint">Можна змінити потім для кожного кадру окремо.</span>
            </fieldset>
            <label className="check-line">
              <input type="checkbox" disabled={locked} checked={recent} onChange={(e) => setRecent(e.target.checked)} />
              Також показати у вкладці «Останні»
            </label>
          </>
        )}
      </div>

      <div
        className={`drop ${over ? 'is-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); start(e.dataTransfer.files); }}
      >
        <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => { start(e.target.files); e.target.value = ''; }} />
        <div className="drop-title">{items.length ? 'Додати ще фото' : 'Оберіть фото з однієї зйомки'}</div>
        <Btn kind="primary" icon={Icon.upload} onClick={() => ref.current.click()}>Обрати фото</Btn>
        <div className="muted small">Можна й перетягнути сюди. Підходять JPG, PNG і фото з телефона.</div>
      </div>

      {items.length > 0 && (
        <>
          <h2 className="h2">
            {working ? 'Завантажую…' : `Додано ${plural(done, 'фото', 'фото', 'фото')}`}
          </h2>
          {dest === 'frames' && done > 0 && <p className="sub">Назвіть нові кадри — назву видно під фото на сайті.</p>}
          <div className="stack">
            {items.map((it) => (
              <NewItem key={it.key} it={it} dest={dest} />
            ))}
          </div>
          {!working && back && (
            <div className="row">
              <LinkBtn kind="primary" href={back[0]}>Готово</LinkBtn>
              <span className="muted">Зміни вже в чернетці. На сайті — після «Опублікувати».</span>
            </div>
          )}
        </>
      )}
    </>
  );
}

function NewItem({ it, dest }) {
  const frame = useStore((s) => (it.frameId ? s.doc.portfolio.find((x) => x.id === it.frameId) : null));
  return (
    <div className={`newitem is-${it.status}`}>
      <div className="newitem-img">{it.path ? <Photo path={it.path} alt="" /> : <span className="ph ph-empty" />}</div>
      <div className="grow stack-sm">
        <div className="muted small">{it.name}</div>
        {it.status === 'busy' && <div className="small">Зменшую й завантажую…</div>}
        {it.status === 'wait' && <div className="small muted">У черзі</div>}
        {it.status === 'error' && <div className="field-error">{it.error}</div>}
        {it.status === 'done' && it.dup && <div className="small warn-color">Схоже, це фото вже завантажували раніше.</div>}
        {it.status === 'done' && dest === 'frames' && frame && (
          <div className="grid2">
            <Field label="Назва кадру" error={!frame.title.trim() ? 'Без назви кадр буде без підпису' : ''}>
              <Text value={frame.title} onChange={(v) => update((d) => { d.portfolio.find((x) => x.id === it.frameId).title = v; })} />
            </Field>
            <Field label="Що на фото">
              <Text value={frame.alt} onChange={(v) => update((d) => { d.portfolio.find((x) => x.id === it.frameId).alt = v; })} />
            </Field>
          </div>
        )}
        {it.status === 'done' && dest !== 'frames' && <div className="small ok-color">Додано</div>}
      </div>
    </div>
  );
}
