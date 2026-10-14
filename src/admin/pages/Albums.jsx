import { useState } from 'react';
import { useStore, update } from '../store.js';
import { sorted, renumber } from '../model.js';
import { Btn, LinkBtn, Icon, Photo, Sortable, Dialog, moveById } from '../ui.jsx';
import { plural } from '../changes.js';

export default function Albums() {
  const doc = useStore((s) => s.doc);
  const [pv, setPv] = useState(false);
  const list = sorted(doc.albums);
  let n = 0;
  const nums = Object.fromEntries(list.map((a) => [a.id, a.hidden ? null : ++n]));
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Альбоми</h1>
          <p className="sub">Вкладка «Альбоми» на сайті. Кожен альбом — окрема сторінка.</p>
        </div>
        <div className="row">
          <Btn icon={Icon.eye} onClick={() => setPv(true)}>Як це виглядає на сайті</Btn>
          <LinkBtn kind="primary" icon={Icon.plus} href="#/add?to=album-new">Новий альбом</LinkBtn>
        </div>
      </div>
      <Sortable
        grid
        items={list}
        className="cards"
        onMove={(a, b) => update((d) => { d.albums = renumber(moveById(sorted(d.albums), a, b)); })}
        render={(a, handle) => {
          const rest = (a.photos || []).filter((x) => x.photo !== a.cover).slice(0, 2);
          return (
            <div className={`card ${a.hidden ? 'is-hidden' : ''}`}>
              <div className="cover" {...handle} aria-label={`Перемістити альбом «${a.title}»`}>
                <Photo path={a.cover} alt="" className="c1" />
                <Photo path={rest[0]?.photo} alt="" className="c2" />
                <Photo path={rest[1]?.photo} alt="" className="c3" />
                <span className="num-badge">{nums[a.id] ?? '—'}</span>
              </div>
              <div className="card-body">
                <div>
                  <a className="name-link" href={`#/album/${encodeURIComponent(a.id)}`}>{a.title}</a>
                  <div className="muted small">
                    {plural((a.photos || []).length, 'фото', 'фото', 'фото')}
                    {a.hidden ? ' · сховано з сайту' : ''}
                  </div>
                </div>
                <LinkBtn href={`#/album/${encodeURIComponent(a.id)}`}>Редагувати</LinkBtn>
              </div>
            </div>
          );
        }}
      />
      {pv && (
        <Dialog title="Як це виглядає на сайті" onClose={() => setPv(false)} wide>
          <div className="pv-frame">
            <div className="pv-site">
              <div className="pv-h2">Портфоліо</div>
              <div className="pv-tabs"><span>Кадри</span><span className="is-on">Альбоми</span><span>Останні</span></div>
              <div className="pv-albums">
                {list.filter((a) => !a.hidden).map((a) => (
                  <figure key={a.id}>
                    <Photo path={a.cover} alt={a.coverAlt} />
                    <figcaption>{a.title}<span>{(a.photos || []).length}</span></figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
