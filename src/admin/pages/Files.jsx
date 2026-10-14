import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, uploadFile, removeUpload, setMediaDel, toast } from '../store.js';
import { usages, fileName } from '../model.js';
import { Btn, Icon, Photo, Dialog } from '../ui.jsx';
import { prepareImage, PhotoError } from '../image.js';

const VARIANT = /-p-\d+\.(jpe?g|png|webp)$/i; // копії, які зробив Webflow під різні екрани — показувати не треба
const norm = (n) => decodeURIComponent(String(n)).toLowerCase().replace(/[^a-z0-9]+/g, '-');
const kb = (n) => (n > 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} МБ` : `${Math.max(1, Math.round(n / 1e3))} КБ`);

export default function Files() {
  const st = useStore();
  const [tab, setTab] = useState('all');
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(0);
  const ref = useRef(null);
  const [code, setCode] = useState(new Set());
  useEffect(() => {
    fetch('/admin/code-media.json').then((r) => r.json()).then((l) => setCode(new Set(l.map(norm)))).catch(() => {});
  }, []);

  const vibeBases = (st.doc.vibe?.tiles || []).flatMap((t) => [t.img, t.video, t.poster]).filter(Boolean);
  const use = useMemo(() => usages(st.doc), [st.doc]);
  const files = useMemo(() => {
    const up = st.uploads.map((u) => ({ path: u.path, size: u.size, fresh: true }));
    const pub = st.media.filter((m) => !VARIANT.test(m.path) && !st.mediaDel.includes(m.path));
    return [...up.reverse(), ...pub].map((f) => {
      const base = f.path.replace('/media/', '').replace(/\.[^.]+$/, '');
      const where = use[f.path] || (vibeBases.some((b) => base === b) ? ['Вайбовий екран'] : code.has(norm(f.path.replace('/media/', ''))) ? ['оформлення сайту'] : null);
      return { ...f, where };
    });
  }, [st.uploads, st.media, st.mediaDel, use, code]);

  const shown = files.filter((f) => (tab === 'all' ? true : tab === 'used' ? !!f.where : !f.where));
  const usedN = files.filter((f) => f.where).length;

  const upload = async (list) => {
    const arr = [...list];
    setBusy(arr.length);
    let ok = 0;
    for (const file of arr) {
      try {
        const img = await prepareImage(file);
        await uploadFile(img.blob, img.name);
        ok++;
      } catch (e) {
        toast(`${file.name}: ${e instanceof PhotoError ? e.message : 'не вдалося завантажити'}`, 'error');
      }
      setBusy((n) => n - 1);
    }
    if (ok) {
      setTab('unused');
      toast(`Завантажено ${ok}. Щоб фото з’явилися на сайті, додайте їх у кадри, альбом чи на головний екран.`);
    }
  };

  const remove = async (f) => {
    if (f.fresh) await removeUpload(f.path);
    else {
      const base = f.path.replace(/\.[^.]+$/, '');
      const variants = st.media.filter((m) => VARIANT.test(m.path) && m.path.startsWith(base + '-p-')).map((m) => m.path);
      setMediaDel([...st.mediaDel, f.path, ...variants]);
    }
    setDel(null);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Усі файли</h1>
          <p className="sub">Усі завантажені фото. На сайті лише ті, що додані в кадри, альбоми чи на головний екран.</p>
        </div>
        <div className="row">
          <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
          <Btn icon={Icon.upload} disabled={busy > 0} onClick={() => ref.current.click()}>{busy ? `Завантажую… ще ${busy}` : 'Завантажити файли'}</Btn>
        </div>
      </div>
      <div className="chips" role="group" aria-label="Показати файли">
        {[
          ['all', 'Усі', files.length],
          ['used', 'На сайті', usedN],
          ['unused', 'Ніде не використані', files.length - usedN],
        ].map(([id, label, n]) => (
          <button key={id} type="button" className={`chip ${tab === id ? 'is-on' : ''}`} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {label} <span className="chip-n">{n}</span>
          </button>
        ))}
      </div>
      {shown.length === 0 && <div className="empty">Тут поки порожньо.</div>}
      <div className="fgrid">
        {shown.map((f) => (
          <div key={f.path} className="fcard">
            <Photo path={f.path} alt={fileName(f.path)} className="fimg" />
            <div className="fname" title={fileName(f.path)}>{fileName(f.path)}</div>
            <div className={`small ${f.where ? 'link-color' : 'warn-color'}`}>
              {f.where ? `На сайті: ${f.where[0]}${f.where.length > 1 ? ` і ще ${f.where.length - 1}` : ''}` : 'Ніде не використано'}
              {f.fresh ? ' · нове' : ''}
            </div>
            <div className="muted small">{kb(f.size)}</div>
            {!f.where && (
              <div className="row-tight">
                <Btn className="btn-sm" kind="text-danger" onClick={() => setDel(f)}>Видалити</Btn>
              </div>
            )}
          </div>
        ))}
      </div>
      {del && (
        <Dialog
          title={`Видалити «${fileName(del.path)}»?`}
          onClose={() => setDel(null)}
          footer={
            <div className="row end">
              <Btn onClick={() => setDel(null)}>Залишити файл</Btn>
              <Btn kind="danger" onClick={() => remove(del)}>Видалити файл</Btn>
            </div>
          }
        >
          <p>На сайті його ніде немає, тож нічого не зламається. {del.fresh ? '' : 'Файл зникне після публікації, а до того зміну можна повернути.'}</p>
        </Dialog>
      )}
    </>
  );
}
