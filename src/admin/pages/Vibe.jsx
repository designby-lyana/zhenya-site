import { useRef, useState } from 'react';
import { useStore, update, uploadFile, toast, src } from '../store.js';
import { Btn, Icon, Sortable, Dialog, arrayMove } from '../ui.jsx';
import { prepareImage, PhotoError } from '../image.js';

// Адреса прев'ю плитки: нові фото — як звичайні; старі з Webflow — їхні готові копії -p-500.
function thumb(t) {
  if (t.photo) return src(t.photo, 480);
  if (t.video) return `/media/${t.poster}.jpg`;
  return t.full ? `/media/${t.img}.jpg` : `/media/${t.img}-p-500.jpg`;
}

export default function Vibe() {
  const vibe = useStore((s) => s.doc.vibe);
  const [busy, setBusy] = useState(null);
  const [pv, setPv] = useState(false);
  const ref = useRef(null);
  const target = useRef(null);
  if (!vibe?.tiles) return <div className="empty">Вайбовий екран ще не підключено до адмінки.</div>;
  const tiles = vibe.tiles.map((t, i) => ({ ...t, id: `t${i}:${t.photo || t.img || t.video}` }));

  const pick = (i) => {
    target.current = i;
    ref.current.click();
  };
  const onFile = async (file) => {
    if (!file) return;
    const i = target.current;
    setBusy(i);
    try {
      const img = await prepareImage(file);
      const path = await uploadFile(img.blob, img.name);
      update((d) => {
        if (i === 'new') d.vibe.tiles.push({ photo: path, ar: '4/5', tail: true, auto: true });
        else {
          const t = d.vibe.tiles[i];
          const keep = { tail: t.tail, c4: t.c4, anchor: t.anchor };
          d.vibe.tiles[i] = Object.fromEntries(Object.entries({ photo: path, ar: t.ar, auto: true, ...keep }).filter(([, v]) => v !== undefined && v !== false));
        }
      });
    } catch (e) {
      toast(e instanceof PhotoError ? e.message : 'Не вдалося завантажити фото.', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Вайбовий екран</h1>
          <p className="sub">Мозаїка фото й відео в самому низу сайту, під футером. Порядок — зліва направо, рядами.</p>
        </div>
        <div className="row">
          <Btn icon={Icon.eye} onClick={() => setPv(true)}>Як це виглядає на сайті</Btn>
          <Btn kind="primary" icon={Icon.plus} disabled={busy !== null} onClick={() => pick('new')}>Додати фото</Btn>
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files[0]); e.target.value = ''; }} />
      <Sortable
        grid
        items={tiles}
        className="vgrid"
        onMove={(a, b) => update((d) => { d.vibe.tiles = arrayMove(d.vibe.tiles, tiles.findIndex((t) => t.id === a), tiles.findIndex((t) => t.id === b)); })}
        render={(t, handle) => {
          const i = tiles.indexOf(t);
          return (
            <div className="vtile">
              <div className="ptile-img" {...handle} aria-label={`Перемістити плитку ${i + 1}`}>
                <img src={thumb(t)} alt="" loading="lazy" draggable="false" onError={(e) => { if (t.photo && !e.currentTarget.dataset.f) { e.currentTarget.dataset.f = 1; e.currentTarget.src = t.photo; } }} />
                <span className="num-badge">{i + 1}</span>
                {t.video && <span className="cover-badge">{Icon.play} Відео</span>}
                {busy === i && <span className="busy">Завантажую…</span>}
              </div>
              {tiles.length > 10 && (
                <button type="button" className="ptile-x" aria-label={`Прибрати плитку ${i + 1}`} onClick={() => update((d) => d.vibe.tiles.splice(i, 1))}>{Icon.close}</button>
              )}
              <div className="ptile-actions">
                <Btn className="btn-sm" kind="text" disabled={busy !== null} onClick={() => pick(i)}>Замінити фото</Btn>
              </div>
            </div>
          );
        }}
      />
      {pv && (
        <Dialog title="Як це виглядає на сайті" onClose={() => setPv(false)} wide>
          <p className="sub">Приблизно: на сайті плитки розкладаються в 5 колонок і доходять рівно до низу сторінки, футер лежить поверх них.</p>
          <div className="pv-frame dark">
            <div className="pv-vibe">
              {tiles.map((t) => (
                <img key={t.id} src={thumb(t)} alt="" style={{ aspectRatio: (t.ar || '4/5').replace('/', ' / ') }} />
              ))}
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
