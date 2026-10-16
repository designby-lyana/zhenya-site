import { useMemo, useState } from 'react';
import { useStore, update } from '../store.js';
import { sorted, renumber, siteNumbers, catCounts, catKey, uniqueId } from '../model.js';
import { Btn, LinkBtn, Icon, Photo, Switch, Sortable, Dialog, moveById } from '../ui.jsx';
import { plural } from '../changes.js';
import { FrameForm } from './EditFrame.jsx';

const SIZES = [
  { w: 56, h: 70, label: 'Малі фото' },
  { w: 88, h: 110, label: 'Середні фото' },
  { w: 132, h: 165, label: 'Великі фото' },
];

export default function Frames({ initialOpen = '' }) {
  const doc = useStore((s) => s.doc);
  const [open, setOpen] = useState(initialOpen); // кадр, у якого розгорнуто поля редагування
  const [filter, setFilter] = useState('all');
  const [size, setSize] = useState(() => +(localStorage.getItem('adm-size') || 1));
  const [cats, setCats] = useState(false);
  const [preview, setPreview] = useState(false);

  const list = useMemo(() => sorted(doc.portfolio), [doc.portfolio]);
  const nums = useMemo(() => siteNumbers(doc.portfolio), [doc.portfolio]);
  const counts = useMemo(() => catCounts(doc), [doc]);
  const catList = sorted(doc.categories);
  const catName = Object.fromEntries(catList.map((c) => [c.id, c.name]));
  const shown = filter === 'all' ? list : list.filter((p) => (p.categories || []).map(catKey).includes(filter));
  const dims = SIZES[size];

  const move = (from, to) =>
    update((d) => {
      d.portfolio = renumber(moveById(sorted(d.portfolio), from, to));
    });
  const setHidden = (id, hidden) => update((d) => { d.portfolio.find((x) => x.id === id).hidden = hidden; });
  const cycleSize = () => {
    const n = (size + 1) % SIZES.length;
    setSize(n);
    try { localStorage.setItem('adm-size', n); } catch {}
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Кадри</h1>
          <p className="sub">Перший ряд у блоці «Портфоліо» на сайті.</p>
        </div>
        <div className="row">
          <Btn icon={Icon.eye} onClick={() => setPreview(true)}>Як це виглядає на сайті</Btn>
          <LinkBtn kind="primary" icon={Icon.plus} href="#/add?to=frames">Додати кадри</LinkBtn>
        </div>
      </div>

      <div className="chips" role="group" aria-label="Показати в списку">
        <button type="button" className={`chip-all ${filter === 'all' ? 'is-on' : ''}`} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          {Icon.grid} Усі кадри
        </button>
        <span className="chips-div" aria-hidden="true" />
        {catList.map((c) => {
          const empty = !counts[c.id];
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={filter === c.id}
              className={`chip ${filter === c.id ? 'is-on' : ''} ${empty ? 'is-empty' : ''}`}
              title={empty ? 'Порожня — на сайті цієї кнопки не видно' : undefined}
              onClick={() => setFilter(c.id)}
            >
              {c.name}
            </button>
          );
        })}
        <Btn kind="text" icon={Icon.pencil} onClick={() => setCats(true)}>Змінити категорії</Btn>
      </div>

      <div className="table" style={{ '--pw': dims.w + 'px' }}>
        <div className="thead">
          <span className="c-num">№</span>
          <span className="c-photo">Фото</span>
          <span className="c-name">Назва</span>
          <span className="c-cats">Категорії</span>
          <span className="c-act">
            <button type="button" className="icon-btn" onClick={cycleSize} aria-label={`Розмір фото: ${dims.label}. Змінити`} title={dims.label}>
              <SizeIcon n={size} />
            </button>
          </span>
        </div>
        {shown.length === 0 && <div className="empty">У цій категорії ще немає кадрів. Додайте категорію кадру на його сторінці.</div>}
        <Sortable
          items={shown}
          onMove={move}
          render={(p, handle) => (
            <div className={`trow-wrap ${open === p.id ? 'is-open' : ''}`}>
            <div className={`trow ${p.hidden ? 'is-hidden' : ''}`}>
              <span className="c-num">
                <button type="button" className="handle" {...handle} aria-label={`Перемістити «${p.title}»`}>
                  {Icon.grip}
                </button>
                <span className="num">{nums[p.id] ?? '—'}</span>
              </span>
              <span className="c-photo">
                <Photo path={p.photo} alt={p.alt} style={{ width: dims.w, height: dims.h }} className="thumb" />
              </span>
              <span className="c-name">
                <button type="button" className="name-link name-btn" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? '' : p.id)}>{p.title || 'Без назви'}</button>
                {p.recent ? <span className="badge">{Icon.star} В «Останніх»</span> : null}
                {p.hidden ? <span className="badge badge-muted">Сховано — на сайті не видно</span> : null}
              </span>
              <span className="c-cats">
                {(p.categories || []).map(catKey).filter((k) => catName[k]).map((k) => (
                  <button key={k} type="button" className="pill" onClick={() => setFilter(k)} title="Показати лише цю категорію">
                    {catName[k]}
                  </button>
                ))}
              </span>
              <span className="c-act">
                <Switch on={!p.hidden} onChange={(on) => setHidden(p.id, !on)} label={`«${p.title}» на сайті`} />
                <Btn aria-expanded={open === p.id} aria-controls={`edit-${p.id}`} onClick={() => setOpen(open === p.id ? '' : p.id)}>{open === p.id ? 'Згорнути' : 'Редагувати'}</Btn>
              </span>
            </div>
            {open === p.id && (
              <div className="trow-edit" id={`edit-${p.id}`}>
                <FrameForm id={p.id} onClose={() => setOpen('')} />
              </div>
            )}
            </div>
          )}
        />
      </div>

      {cats && <CategoriesDialog onClose={() => setCats(false)} counts={counts} />}
      {preview && <FramesPreview onClose={() => setPreview(false)} />}
    </>
  );
}

function SizeIcon({ n }) {
  const s = [5, 7, 9][n];
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <rect x={10 - s} y={10 - s} width={s * 2} height={s * 2} rx="2" opacity=".85" />
    </svg>
  );
}

function CategoriesDialog({ onClose, counts }) {
  const doc = useStore((s) => s.doc);
  const list = sorted(doc.categories);
  const [ask, setAsk] = useState(null);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const taken = (n, except) => list.some((c) => c.id !== except && c.name.trim().toLowerCase() === n.trim().toLowerCase());

  const addCat = () => {
    const n = name.trim();
    if (!n) return setErr('Напишіть назву');
    if (taken(n)) return setErr('Така категорія вже є');
    update((d) => {
      const id = uniqueId(n, new Set(d.categories.map((c) => c.id)));
      d.categories.push({ id, name: n, order: d.categories.length + 1 });
      renumber(sorted(d.categories));
    });
    setName('');
    setErr('');
  };
  const rename = (id, n) => update((d) => { d.categories.find((c) => c.id === id).name = n; });
  const remove = (id) =>
    update((d) => {
      d.categories = renumber(sorted(d.categories.filter((c) => c.id !== id)));
      d.portfolio.forEach((p) => (p.categories = (p.categories || []).filter((k) => catKey(k) !== id)));
    });

  return (
    <Dialog title="Категорії" onClose={onClose} footer={<div className="row end"><Btn kind="primary" onClick={onClose}>Готово</Btn></div>}>
      <p className="sub">Кнопки над кадрами на сайті, у цьому ж порядку. Порожні категорії на сайті не показуються.</p>
      <p className="muted small">Слова «портретна», «творча», «сімейна» в шапці сайту відкривають «Портрети», «Творчі» і «З дітьми». Якщо перейменувати ці категорії, шапка відкриватиме всі кадри.</p>
      <Sortable
        items={list}
        className="stack"
        onMove={(a, b) => update((d) => { d.categories = renumber(moveById(sorted(d.categories), a, b)); })}
        render={(c, handle) => (
          <div className="cat-row">
            <button type="button" className="handle" {...handle} aria-label={`Перемістити «${c.name}»`}>{Icon.grip}</button>
            {ask === c.id ? (
              <div className="confirm-inline">
                <span>Видалити «{c.name}»? З кадрів вона теж зникне, самі кадри лишаться.</span>
                <Btn className="btn-sm" onClick={() => setAsk(null)}>Ні</Btn>
                <Btn className="btn-sm" kind="danger" onClick={() => { remove(c.id); setAsk(null); }}>Видалити</Btn>
              </div>
            ) : (
              <>
                <CatName cat={c} taken={taken} onRename={(v) => rename(c.id, v)} />
                <span className="muted nowrap">{plural(counts[c.id] || 0, 'кадр', 'кадри', 'кадрів')}</span>
                <Btn className="btn-sm" kind="text-danger" onClick={() => setAsk(c.id)}>Видалити</Btn>
              </>
            )}
          </div>
        )}
      />
      <div className="add-row">
        <input className="fld" placeholder="Нова категорія" value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} onKeyDown={(e) => e.key === 'Enter' && addCat()} aria-label="Назва нової категорії" />
        <Btn icon={Icon.plus} onClick={addCat}>Додати</Btn>
      </div>
      {err && <p className="field-error">{err}</p>}
    </Dialog>
  );
}

function FramesPreview({ onClose }) {
  const doc = useStore((s) => s.doc);
  const [cat, setCat] = useState('all');
  const [phone, setPhone] = useState(false);
  const counts = catCounts(doc);
  const cats = sorted(doc.categories).filter((c) => counts[c.id]);
  const vis = sorted(doc.portfolio).filter((p) => !p.hidden && (cat === 'all' || (p.categories || []).map(catKey).includes(cat)));
  return (
    <Dialog title="Як це виглядає на сайті" onClose={onClose} wide>
      <div className="pv-tools">
        <div className="seg" role="group" aria-label="Екран">
          <button type="button" aria-pressed={!phone} onClick={() => setPhone(false)}>Комп’ютер</button>
          <button type="button" aria-pressed={phone} onClick={() => setPhone(true)}>Телефон</button>
        </div>
        <span className="muted">Так буде після публікації</span>
      </div>
      <div className={`pv-frame ${phone ? 'is-phone' : ''}`}>
        <div className="pv-site">
          <div className="pv-h2">Портфоліо</div>
          <div className="pv-tabs"><span className="is-on">Кадри</span><span>Альбоми</span><span>Останні</span></div>
          <div className="pv-chips">
            <button type="button" className={cat === 'all' ? 'is-on' : ''} onClick={() => setCat('all')}>Усі</button>
            {cats.map((c) => (
              <button type="button" key={c.id} className={cat === c.id ? 'is-on' : ''} onClick={() => setCat(c.id)}>{c.name}</button>
            ))}
          </div>
          <div className="pv-film">
            {vis.map((p) => (
              <figure key={p.id}>
                <Photo path={p.photo} alt={p.alt} />
                <figcaption>{p.title}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

// Назва категорії зберігається одразу під час набору; порожню чи повторну назву не зберігаємо.
function CatName({ cat, taken, onRename }) {
  const [v, setV] = useState(cat.name);
  const bad = !v.trim() ? 'Напишіть назву' : taken(v, cat.id) ? 'Така категорія вже є' : '';
  return (
    <span className="grow stack-sm">
      <input
        className="fld"
        value={v}
        aria-label="Назва категорії"
        aria-invalid={!!bad}
        onChange={(e) => {
          setV(e.target.value);
          const t = e.target.value.trim();
          if (t && !taken(t, cat.id)) onRename(t);
        }}
        onBlur={() => bad && setV(cat.name)}
      />
      {bad && <span className="field-error">{bad}</span>}
    </span>
  );
}
