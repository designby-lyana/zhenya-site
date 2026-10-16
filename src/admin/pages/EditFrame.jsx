// Поля редагування кадру. Відкриваються просто під рядком кадру на сторінці «Кадри».
import { useRef, useState } from 'react';
import { useStore, update, uploadFile, toast } from '../store.js';
import { sorted, catKey, renumber, fileName } from '../model.js';
import { Btn, Icon, Photo, Field, Text } from '../ui.jsx';
import { prepareImage, PhotoError } from '../image.js';

export function FrameForm({ id, onClose }) {
  const doc = useStore((s) => s.doc);
  const p = doc.portfolio.find((x) => x.id === id);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  if (!p) return null;
  const cats = sorted(doc.categories);
  const mine = (p.categories || []).map(catKey);
  const patch = (fn) => update((d) => { fn(d.portfolio.find((x) => x.id === id), d); });

  const replace = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const img = await prepareImage(file);
      const path = await uploadFile(img.blob, img.name);
      patch((x) => (x.photo = path));
    } catch (e) {
      toast(e instanceof PhotoError || e.status ? e.message : 'Не вдалося завантажити фото. Спробуйте ще раз.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const recentOn = (on) =>
    update((d) => {
      const x = d.portfolio.find((y) => y.id === id);
      if (on) {
        d.portfolio.forEach((y) => y.recent && (y.recent += 1));
        x.recent = 1;
      } else {
        const was = x.recent;
        delete x.recent;
        d.portfolio.forEach((y) => y.recent && y.recent > was && (y.recent -= 1));
      }
    });

  return (
    <div className="frame-form">
      <div className="frame-form-photo">
        <Photo path={p.photo} alt={p.alt} size={960} className="big" style={{ opacity: p.hidden ? 0.55 : 1 }} />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { replace(e.target.files[0]); e.target.value = ''; }} />
        <Btn className="btn-sm" icon={Icon.upload} disabled={busy} onClick={() => fileRef.current.click()}>{busy ? 'Завантажую…' : 'Замінити фото'}</Btn>
        <span className="muted small">{fileName(p.photo)}</span>
      </div>
      <div className="form">
        <Field label="Назва" hint="Видно під фото на сайті." error={!p.title?.trim() ? 'Напишіть назву — без неї кадр на сайті буде без підпису' : ''}>
          <Text value={p.title} onChange={(v) => patch((x) => (x.title = v))} autoFocus />
        </Field>
        <Field label="Що на фото" hint={`Для пошуковиків і людей, які не бачать фото. ${(p.alt || '').length} знаків, добре — до 125.`}>
          <Text multiline rows={2} value={p.alt} onChange={(v) => patch((x) => (x.alt = v))} />
        </Field>
        <fieldset className="field">
          <legend className="field-label">Категорії</legend>
          <div className="checks">
            {cats.map((c) => (
              <label key={c.id} className={`check ${mine.includes(c.id) ? 'is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={mine.includes(c.id)}
                  onChange={(e) =>
                    patch((x) => {
                      const cur = (x.categories || []).map(catKey).filter((k) => k !== c.id);
                      x.categories = e.target.checked ? [...cur, c.id] : cur;
                    })
                  }
                />
                {c.name}
              </label>
            ))}
          </div>
          <span className="field-hint">Кадр з’являється під кожною з обраних кнопок.</span>
        </fieldset>
        <label className="check-line">
          <input type="checkbox" checked={!!p.recent} onChange={(e) => recentOn(e.target.checked)} />
          Показувати у вкладці «Останні» (першим)
        </label>
        <div className="frame-form-foot">
          {ask ? (
            <div className="confirm-inline">
              <span>Прибрати кадр з сайту назавжди? Фото лишиться в «Усіх файлах».</span>
              <Btn onClick={() => setAsk(false)}>Ні</Btn>
              <Btn
                kind="danger"
                onClick={() => {
                  update((d) => {
                    d.portfolio = renumber(sorted(d.portfolio.filter((x) => x.id !== id)));
                  });
                  onClose?.();
                }}
              >
                Видалити кадр
              </Btn>
            </div>
          ) : (
            <>
              <Btn kind="text-danger" onClick={() => setAsk(true)}>Видалити кадр</Btn>
              <Btn kind="primary" onClick={onClose}>Готово</Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
