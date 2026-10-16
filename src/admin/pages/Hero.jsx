import { useState } from 'react';
import { useStore, update } from '../store.js';
import { Btn, LinkBtn, Icon, Photo, Sortable, Dialog, Text, arrayMove } from '../ui.jsx';

// На сайті перший екран показує фото парами: 1+2, потім 3+4… Зберігається як hero.pair (перша пара) + hero.slides (решта).
export function heroSeq(site) {
  return [...(site.hero?.pair || []), ...(site.hero?.slides || [])];
}
export function setHeroSeq(d, seq) {
  d.site.hero.pair = seq.slice(0, 2);
  d.site.hero.slides = seq.slice(2);
}

export default function Hero() {
  const site = useStore((s) => s.doc.site);
  const [pv, setPv] = useState(false);
  const seq = heroSeq(site).map((x, i) => ({ ...x, id: `${i}:${x.photo}` }));
  const strip = (l) => l.map(({ id, ...x }) => x);
  const odd = seq.length % 2 === 1;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Фото головного екрану</h1>
          <p className="sub">Перший екран сайту: фото змінюються парами під заголовком — 1 і 2, потім 3 і 4…</p>
        </div>
        <div className="row">
          <Btn icon={Icon.eye} onClick={() => setPv(true)}>Як це виглядає на сайті</Btn>
          <LinkBtn kind="primary" icon={Icon.plus} href="#/add?to=hero">Додати фото</LinkBtn>
        </div>
      </div>
      {odd && <div className="note">Фото непарна кількість — остання пара буде неповна. Додайте ще одне фото або приберіть одне.</div>}
      <Sortable
        grid
        items={seq}
        className="pgrid pgrid-pairs"
        onMove={(f, t) =>
          update((d) => {
            const cur = heroSeq(d.site);
            setHeroSeq(d, arrayMove(cur, seq.findIndex((x) => x.id === f), seq.findIndex((x) => x.id === t)));
          })
        }
        render={(x, handle) => {
          const i = seq.indexOf(x);
          return (
            <div className="ptile">
              <div className="ptile-img" {...handle} aria-label={`Перемістити фото ${i + 1}`}>
                <Photo path={x.photo} alt={x.alt} />
                <span className="num-badge">{i + 1}</span>
                <span className="pair-badge">Пара {Math.floor(i / 2) + 1}</span>
              </div>
              {seq.length > 2 && (
                <button
                  type="button"
                  className="ptile-x"
                  aria-label={`Прибрати фото ${i + 1}`}
                  onClick={() => update((d) => setHeroSeq(d, heroSeq(d.site).filter((_, j) => j !== i)))}
                >
                  {Icon.close}
                </button>
              )}
              <label className="ptile-alt">
                <span className="sr-only">Що на фото {i + 1}</span>
                <Text
                  value={x.alt}
                  placeholder="Що на фото"
                  onChange={(v) =>
                    update((d) => {
                      const s = heroSeq(d.site);
                      s[i] = { ...s[i], alt: v };
                      setHeroSeq(d, s);
                    })
                  }
                />
              </label>
            </div>
          );
        }}
      />
      {pv && <HeroPreview seq={strip(seq)} site={site} onClose={() => setPv(false)} />}
    </>
  );
}

function HeroPreview({ seq, site, onClose }) {
  const [k, setK] = useState(0);
  const pairs = Math.ceil(seq.length / 2);
  const a = seq[k * 2];
  const b = seq[k * 2 + 1];
  return (
    <Dialog title="Як це виглядає на сайті" onClose={onClose} wide>
      <div className="pv-tools">
        <div className="seg" role="group" aria-label="Пара">
          {Array.from({ length: pairs }, (_, i) => (
            <button key={i} type="button" aria-pressed={i === k} onClick={() => setK(i)}>{i + 1}</button>
          ))}
        </div>
        <span className="muted">На сайті пари змінюються самі кожні ~6 секунд</span>
      </div>
      <div className="pv-frame">
        <div className="pv-hero">
          <div className="pv-hero-pair">
            <Photo path={a?.photo} alt={a?.alt} size={960} />
            <Photo path={b?.photo} alt={b?.alt} size={960} />
          </div>
          <div className="pv-hero-text">
            <div className="pv-hero-title">{site.hero.title}</div>
            <div className="pv-hero-sub">{site.hero.subtitle}</div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
