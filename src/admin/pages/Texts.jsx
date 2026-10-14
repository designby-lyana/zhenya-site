import { useRef, useState } from 'react';
import { useStore, update, uploadFile, toast } from '../store.js';
import { Btn, Icon, Photo, Field, Text, Sortable, arrayMove } from '../ui.jsx';
import { prepareImage, PhotoError } from '../image.js';
import { plural } from '../changes.js';

// Факт зберігається шматками (звичайний текст + виділені слова). Після правки виділені слова лишаються виділеними, якщо вони є в тексті.
function keepBold(f, text) {
  const out = {};
  let rest = text;
  const take = (word, key, afterKey) => {
    const i = word ? rest.indexOf(word) : -1;
    if (i < 0) return false;
    out[key] = word;
    return { before: rest.slice(0, i), after: rest.slice(i + word.length) };
  };
  const a = take(f.strong, 'strong');
  if (!a) return { before: text };
  if (a.before) out.before = a.before;
  rest = a.after;
  const b = take(f.strong2, 'strong2');
  if (b) {
    if (b.before) out.after = b.before;
    if (b.after) out.after2 = b.after;
  } else if (rest) out.after = rest;
  return out;
}
const factText = (f) => [f.before, f.strong, f.after, f.strong2, f.after2].filter(Boolean).join('');
const igName = (url) => String(url || '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/[/?].*$/, '');

export default function Texts() {
  const doc = useStore((s) => s.doc);
  const pub = useStore((s) => s.published);
  const [open, setOpen] = useState({});
  const s = doc.site;
  const set = (fn) => update((d) => { fn(d.site); });
  const changed = (keys) => keys.some((k) => JSON.stringify(get(pub.site, k)) !== JSON.stringify(get(s, k)));

  const sections = [
    {
      id: 'hero',
      title: 'Головний екран',
      keys: ['hero.title', 'hero.titleAccent', 'hero.subtitle', 'hero.facts', 'header.genres', 'header.tagline'],
      sum: `«${s.hero.title}» · ${s.hero.subtitle}`,
      body: <HeroTexts s={s} set={set} />,
    },
    {
      id: 'about',
      title: 'Про мене',
      keys: ['about'],
      sum: `«${s.about.title}» · фото і ${plural(s.about.paragraphs.length, 'абзац', 'абзаци', 'абзаців')}`,
      body: <About s={s} set={set} />,
    },
    {
      id: 'prices',
      title: 'Ціни',
      keys: ['prices'],
      sum: s.prices.packages.map((p) => `${p.name} — ${p.price} грн`).join(' · '),
      body: <Prices s={s} set={set} />,
    },
    {
      id: 'reviews',
      title: 'Відгуки',
      keys: ['reviews'],
      sum: `${plural(s.reviews.length, 'відгук', 'відгуки', 'відгуків')} — повідомлення від клієнтів`,
      body: <Reviews s={s} set={set} />,
    },
    {
      id: 'contacts',
      title: 'Контакти',
      keys: ['contacts', 'contact'],
      sum: `${s.contacts.phone} · @${igName(s.contacts.instagram)} · ${s.contacts.cities}`,
      body: <Contacts s={s} set={set} />,
    },
    {
      id: 'seo',
      title: 'Пошук і соцмережі',
      keys: ['seo', 'portfolio.recentNote'],
      sum: 'Як сайт виглядає в Google і коли ним діляться',
      body: <Seo s={s} set={set} />,
    },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Тексти сайту</h1>
          <p className="sub">Блоки в тому ж порядку, що й на сайті. Натисніть блок, щоб змінити.</p>
        </div>
      </div>
      <div className="stack">
        {sections.map((sec) => {
          const isOpen = !!open[sec.id];
          return (
            <section key={sec.id} className={`acc ${isOpen ? 'is-open' : ''}`}>
              <button type="button" className="acc-head" aria-expanded={isOpen} onClick={() => setOpen({ ...open, [sec.id]: !isOpen })}>
                <span className="acc-chev">{Icon.chevron}</span>
                <span className="acc-title">
                  <span className="row-tight">
                    <h2>{sec.title}</h2>
                    {changed(sec.keys) && <span className="badge badge-warn">змінено</span>}
                  </span>
                  {!isOpen && <span className="acc-sum">{sec.sum}</span>}
                </span>
              </button>
              {isOpen && <div className="acc-body">{sec.body}</div>}
            </section>
          );
        })}
      </div>
    </>
  );
}

function HeroTexts({ s, set }) {
  const accentOk = !s.hero.titleAccent || s.hero.title.includes(s.hero.titleAccent);
  return (
    <>
      <Field label="Великий заголовок" hint="До 30 знаків, щоб уміщався на телефоні.">
        <Text value={s.hero.title} onChange={(v) => set((x) => (x.hero.title = v))} className="fld fld-big" />
      </Field>
      <Field label="Слово, виділене кольором" error={accentOk ? '' : 'Цього слова немає в заголовку — виділення не буде'} hint="Одне слово із заголовка.">
        <Text value={s.hero.titleAccent} onChange={(v) => set((x) => (x.hero.titleAccent = v))} />
      </Field>
      <Field label="Рядок під заголовком">
        <Text value={s.hero.subtitle} onChange={(v) => set((x) => (x.hero.subtitle = v))} />
      </Field>
      <div className="field">
        <span className="field-label">Короткі факти</span>
        <div className="stack-sm">
          {s.hero.facts.map((f, i) => (
            <div key={i} className="row-tight">
              <Text value={factText(f)} aria-label={`Факт ${i + 1}`} onChange={(v) => set((x) => (x.hero.facts[i] = keepBold(x.hero.facts[i], v)))} />
              <button type="button" className="icon-btn" aria-label={`Прибрати факт ${i + 1}`} onClick={() => set((x) => x.hero.facts.splice(i, 1))}>{Icon.close}</button>
            </div>
          ))}
        </div>
        <span className="field-hint">Цей рядок є і під «Про мене». На сайті факти розділяються «·».</span>
        <div><Btn className="btn-sm" icon={Icon.plus} onClick={() => set((x) => x.hero.facts.push({ before: '' }))}>Додати факт</Btn></div>
      </div>
      <Field label="Види зйомок у шапці" hint="Рядок, що з’являється в шапці, коли гортають сайт вгору.">
        <Text value={s.header.genres} onChange={(v) => set((x) => (x.header.genres = v))} />
      </Field>
      <Field label="Підпис під іменем">
        <Text value={s.header.tagline} onChange={(v) => set((x) => (x.header.tagline = v))} />
      </Field>
    </>
  );
}

const toParagraphs = (v) => v.split(/\n\s*\n/).map((t) => t.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);

function About({ s, set }) {
  // Текст тримаємо «як набрано», щоб пробіли й порожні рядки не зникали посеред набору
  const [raw, setRaw] = useState(() => s.about.paragraphs.join('\n\n'));
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const replace = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const img = await prepareImage(file);
      const path = await uploadFile(img.blob, img.name);
      set((x) => (x.about.photo = path));
    } catch (e) {
      toast(e instanceof PhotoError ? e.message : 'Не вдалося завантажити фото.', 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="about-edit">
      <div className="stack-sm about-photo">
        <span className="field-label">Фото</span>
        <Photo path={s.about.photo} alt={s.about.photoAlt} className="about-img" />
        <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => replace(e.target.files[0])} />
        <Btn disabled={busy} onClick={() => ref.current.click()}>{busy ? 'Завантажую…' : 'Замінити фото'}</Btn>
      </div>
      <div className="form grow">
        <Field label="Заголовок">
          <Text value={s.about.title} onChange={(v) => set((x) => (x.about.title = v))} />
        </Field>
        <Field label="Текст" hint="Новий абзац — через порожній рядок.">
          <Text multiline rows={12} value={raw} onChange={(v) => { setRaw(v); set((x) => (x.about.paragraphs = toParagraphs(v))); }} onBlur={() => setRaw(s.about.paragraphs.join('\n\n'))} />
        </Field>
        <Field label="Що на фото">
          <Text value={s.about.photoAlt} onChange={(v) => set((x) => (x.about.photoAlt = v))} />
        </Field>
      </div>
    </div>
  );
}

function Prices({ s, set }) {
  return (
    <>
      <div className="stack">
        {s.prices.packages.map((p, i) => (
          <div key={i} className="subcard">
            <div className="subcard-title">{p.name}</div>
            <div className="grid2">
              <Field label="Назва"><Text value={p.name} onChange={(v) => set((x) => (x.prices.packages[i].name = v))} /></Field>
              <Field label="Де"><Text value={p.where} onChange={(v) => set((x) => (x.prices.packages[i].where = v))} /></Field>
            </div>
            {p.hours?.length ? (
              <div className="field">
                <span className="field-label">Ціна залежно від тривалості</span>
                <div className="hours">
                  {p.hours.map((h, j) => (
                    <div key={j} className="hours-row">
                      <span className="hours-h">{h.hours} год</span>
                      <label><span className="sr-only">Ціна за {h.hours} год, грн</span><Text value={h.price} inputMode="numeric" onChange={(v) => set((x) => {
                        const pk = x.prices.packages[i];
                        pk.hours[j].price = v;
                        if (j === 0) pk.price = v;
                      })} /></label>
                      <span className="muted">грн</span>
                      <label className="grow"><span className="sr-only">Підпис</span><Text value={h.per} onChange={(v) => set((x) => {
                        const pk = x.prices.packages[i];
                        pk.hours[j].per = v;
                        if (j === 0) pk.per = v;
                      })} /></label>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid2">
                <Field label="Ціна, грн"><Text value={p.price} inputMode="numeric" onChange={(v) => set((x) => (x.prices.packages[i].price = v))} /></Field>
                <Field label="За що"><Text value={p.per} onChange={(v) => set((x) => (x.prices.packages[i].per = v))} /></Field>
              </div>
            )}
            <div className="field">
              <span className="field-label">Що входить</span>
              {p.stats.map((st, j) => (
                <div key={j} className="row-tight">
                  <label className="w-num"><span className="sr-only">Число</span><Text value={st.value} onChange={(v) => set((x) => (x.prices.packages[i].stats[j].value = v))} /></label>
                  <label className="grow"><span className="sr-only">Підпис</span><Text value={st.label} onChange={(v) => set((x) => (x.prices.packages[i].stats[j].label = v))} /></label>
                </div>
              ))}
            </div>
            {'note' in p && (
              <Field label="Примітка"><Text value={p.note} onChange={(v) => set((x) => (x.prices.packages[i].note = v))} /></Field>
            )}
          </div>
        ))}
      </div>
      <div className="field">
        <span className="field-label">Умови під цінами</span>
        {s.prices.terms.map((t, i) => (
          <div key={i} className="row-tight">
            <label className="w-label"><span className="sr-only">Назва</span><Text value={t.label} onChange={(v) => set((x) => (x.prices.terms[i].label = v))} /></label>
            <label className="grow"><span className="sr-only">Текст</span><Text value={t.text} onChange={(v) => set((x) => (x.prices.terms[i].text = v))} /></label>
          </div>
        ))}
      </div>
    </>
  );
}

function Reviews({ s, set }) {
  const items = s.reviews.map((r, i) => ({ ...r, id: `r${i}` }));
  return (
    <>
      <p className="sub">Кожен відгук — кілька повідомлень, як у месенджері. Одне повідомлення — один рядок. Перетягніть, щоб змінити порядок.</p>
      <Sortable
        items={items}
        className="stack"
        onMove={(a, b) => set((x) => (x.reviews = arrayMove(x.reviews, items.findIndex((r) => r.id === a), items.findIndex((r) => r.id === b))))}
        render={(r, handle) => {
          const i = items.indexOf(r);
          return (
            <div className="review">
              <button type="button" className="handle" {...handle} aria-label={`Перемістити відгук ${i + 1}`}>{Icon.grip}</button>
              <label className="grow">
                <span className="sr-only">Відгук {i + 1}</span>
                <Text multiline rows={Math.max(2, r.messages.length)} value={r.messages.join('\n')} onChange={(v) => set((x) => (x.reviews[i].messages = v.split('\n')))} onBlur={() => set((x) => (x.reviews[i].messages = x.reviews[i].messages.map((m) => m.trim()).filter(Boolean)))} />
              </label>
              <button type="button" className="icon-btn" aria-label={`Прибрати відгук ${i + 1}`} onClick={() => set((x) => x.reviews.splice(i, 1))}>{Icon.close}</button>
            </div>
          );
        }}
      />
      <div><Btn icon={Icon.plus} onClick={() => set((x) => x.reviews.unshift({ messages: [''] }))}>Додати відгук</Btn></div>
    </>
  );
}

function Contacts({ s, set }) {
  const c = s.contacts;
  return (
    <>
      <div className="grid2">
        <Field label="Телефон" hint="Цей номер підставиться і в кнопку WhatsApp.">
          <Text
            value={c.phone}
            inputMode="tel"
            onChange={(v) =>
              set((x) => {
                x.contacts.phone = v;
                let digits = v.replace(/\D/g, '');
                if (digits.length === 10 && digits.startsWith('0')) digits = '38' + digits; // 098… → 38098…
                if (/^380\d{9}$/.test(digits)) x.contacts.whatsapp = `https://wa.me/${digits}`;
              })
            }
          />
        </Field>
        <Field label="Instagram" hint="Лише ім’я профілю, без посилання.">
          <Text
            value={igName(c.instagram)}
            onChange={(v) =>
              set((x) => {
                const n = v.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/.*$/, '').trim();
                x.contacts.instagram = `https://www.instagram.com/${n}/`;
                x.contacts.instagramChat = `https://ig.me/m/${n}`;
              })
            }
          />
        </Field>
        <Field label="Міста"><Text value={c.cities} onChange={(v) => set((x) => (x.contacts.cities = v))} /></Field>
        <Field label="Виїзд"><Text value={c.travel} onChange={(v) => set((x) => (x.contacts.travel = v))} /></Field>
      </div>
      <Field label="Заголовок блоку контактів"><Text value={s.contact.title} onChange={(v) => set((x) => (x.contact.title = v))} /></Field>
    </>
  );
}

function Seo({ s, set }) {
  const o = s.seo;
  return (
    <>
      <Field label="Назва сайту в Google" hint={`${o.title.length} знаків, добре — до 60.`}><Text value={o.title} onChange={(v) => set((x) => (x.seo.title = v))} /></Field>
      <Field label="Опис у Google" hint={`${o.description.length} знаків, добре — до 160.`}><Text multiline rows={3} value={o.description} onChange={(v) => set((x) => (x.seo.description = v))} /></Field>
      <Field label="Заголовок, коли сайтом діляться"><Text value={o.shareTitle} onChange={(v) => set((x) => (x.seo.shareTitle = v))} /></Field>
      <Field label="Опис, коли сайтом діляться"><Text multiline rows={2} value={o.shareDescription} onChange={(v) => set((x) => (x.seo.shareDescription = v))} /></Field>
      <Field label="Підпис у вкладці «Останні»"><Text value={s.portfolio.recentNote} onChange={(v) => set((x) => (x.portfolio.recentNote = v))} /></Field>
    </>
  );
}

function get(o, path) {
  return path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
}
