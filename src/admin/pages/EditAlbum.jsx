import { useState } from 'react';
import { useStore, update } from '../store.js';
import { sorted, renumber } from '../model.js';
import { Btn, LinkBtn, Icon, Photo, Switch, Field, Text, Sortable, Dialog, arrayMove } from '../ui.jsx';
import { go } from '../App.jsx';

export default function EditAlbum({ id }) {
  const doc = useStore((s) => s.doc);
  const pub = useStore((s) => s.published);
  const a = doc.albums.find((x) => x.id === id);
  const [ask, setAsk] = useState(false);
  const [altOf, setAltOf] = useState(null);
  const [pv, setPv] = useState(false);
  if (!a)
    return (
      <div className="empty">
        Такого альбому вже немає. <a href="#/albums">До альбомів</a>
      </div>
    );
  const patch = (fn) => update((d) => { fn(d.albums.find((x) => x.id === id)); });
  const photos = (a.photos || []).map((x, i) => ({ ...x, id: `${i}:${x.photo}` }));
  const onSite = pub.albums.some((x) => x.id === id && !x.hidden);

  return (
    <>
      <a href="#/albums" className="back">{Icon.back} Альбоми</a>
      <div className="page-head">
        <div>
          <h1>{a.title || 'Без назви'}</h1>
          <p className="sub">Сторінка альбому на сайті: /albums/{a.id}</p>
        </div>
        <div className="row">
          <Btn icon={Icon.eye} onClick={() => setPv(true)}>Як це виглядає на сайті</Btn>
          <LinkBtn kind="primary" icon={Icon.plus} href={`#/add?to=album:${encodeURIComponent(id)}`}>Додати фото</LinkBtn>
        </div>
      </div>
      <div className="form narrow">
        <Field label="Назва альбому" error={!a.title?.trim() ? 'Напишіть назву' : ''} hint="Адреса сторінки не зміниться, тож старі посилання працюватимуть.">
          <Text value={a.title} onChange={(v) => patch((x) => (x.title = v))} />
        </Field>
        <div className="field">
          <span className="field-label">На сайті</span>
          <Switch on={!a.hidden} onChange={(on) => patch((x) => (x.hidden = !on))} label="Показувати альбом на сайті" />
          {a.hidden && onSite && <span className="field-hint">Після публікації сторінка альбому перестане відкриватися.</span>}
        </div>
      </div>
      <h2 className="h2">Фото в альбомі <span className="muted">{photos.length}</span></h2>
      <p className="sub">Перетягніть, щоб змінити порядок. Обкладинку видно у вкладці «Альбоми».</p>
      {photos.length === 0 && <div className="empty">Альбом порожній. <a href={`#/add?to=album:${encodeURIComponent(id)}`}>Додати фото</a></div>}
      <Sortable
        grid
        items={photos}
        className="pgrid"
        onMove={(f, t) =>
          patch((x) => {
            const ia = photos.findIndex((p) => p.id === f);
            const ib = photos.findIndex((p) => p.id === t);
            x.photos = arrayMove(x.photos, ia, ib);
          })
        }
        render={(p, handle) => {
          const i = photos.indexOf(p);
          const isCover = p.photo === a.cover;
          return (
            <div className="ptile">
              <div className="ptile-img" {...handle} aria-label={`Перемістити фото ${i + 1}`}>
                <Photo path={p.photo} alt={p.alt} />
                <span className="num-badge">{i + 1}</span>
                {isCover && <span className="cover-badge">Обкладинка</span>}
              </div>
              <button
                type="button"
                className="ptile-x"
                aria-label={`Прибрати фото ${i + 1} з альбому`}
                onClick={() =>
                  patch((x) => {
                    x.photos = x.photos.filter((_, j) => j !== i);
                    if (isCover) {
                      x.cover = x.photos[0]?.photo || '';
                      x.coverAlt = x.photos[0]?.alt || '';
                    }
                  })
                }
              >
                {Icon.close}
              </button>
              <div className="ptile-actions">
                {!isCover && (
                  <Btn className="btn-sm" kind="text" onClick={() => patch((x) => { x.cover = p.photo; x.coverAlt = p.alt || ''; })}>
                    Зробити обкладинкою
                  </Btn>
                )}
                <Btn className="btn-sm" kind="text" onClick={() => setAltOf(i)}>{p.alt ? 'Опис фото' : 'Додати опис'}</Btn>
              </div>
            </div>
          );
        }}
      />
      <div className="danger-zone">
        {ask ? (
          <div className="confirm-inline">
            <span>Видалити альбом «{a.title}»? Фото лишаться в «Усіх файлах».</span>
            <Btn onClick={() => setAsk(false)}>Ні</Btn>
            <Btn kind="danger" onClick={() => { update((d) => { d.albums = renumber(sorted(d.albums.filter((x) => x.id !== id))); }); go('#/albums'); }}>Видалити альбом</Btn>
          </div>
        ) : (
          <Btn kind="text-danger" onClick={() => setAsk(true)}>Видалити альбом</Btn>
        )}
      </div>

      {altOf !== null && photos[altOf] && (
        <Dialog title={`Фото ${altOf + 1}: що на ньому`} onClose={() => setAltOf(null)} footer={<div className="row end"><Btn kind="primary" onClick={() => setAltOf(null)}>Готово</Btn></div>}>
          <div className="alt-edit">
            <Photo path={photos[altOf].photo} alt="" size={480} />
            <Field label="Опис" hint="Для пошуковиків і людей, які не бачать фото.">
              <Text
                multiline
                rows={3}
                value={photos[altOf].alt}
                onChange={(v) =>
                  patch((x) => {
                    x.photos[altOf].alt = v;
                    if (x.photos[altOf].photo === x.cover) x.coverAlt = v;
                  })
                }
              />
            </Field>
          </div>
        </Dialog>
      )}
      {pv && (
        <Dialog title="Як це виглядає на сайті" onClose={() => setPv(false)} wide>
          <div className="pv-frame">
            <div className="pv-site">
              <div className="pv-eyebrow">Альбом</div>
              <div className="pv-h2">{a.title}</div>
              <div className="pv-masonry">
                {(a.photos || []).map((p, i) => (
                  <Photo key={i} path={p.photo} alt={p.alt} />
                ))}
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
