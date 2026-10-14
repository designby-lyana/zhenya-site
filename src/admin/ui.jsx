// Дрібні спільні елементи адмінки.
import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { src, onImgError } from './store.js';

export const Icon = {
  grip: (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>
  ),
  eye: (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  plus: (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
  ),
  pencil: (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>
  ),
  close: (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
  ),
  check: (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
  ),
  grid: (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></svg>
  ),
  chevron: (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
  ),
  back: (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
  ),
  menu: (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
  ),
  upload: (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg>
  ),
  star: (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>
  ),
  play: (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z" /></svg>
  ),
};

export function Btn({ kind = 'secondary', icon, children, className = '', type = 'button', ...rest }) {
  return (
    <button type={type} className={`btn btn-${kind} ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function LinkBtn({ kind = 'secondary', icon, children, className = '', ...rest }) {
  return (
    <a className={`btn btn-${kind} ${className}`} {...rest}>
      {icon}
      {children}
    </a>
  );
}

export function Switch({ on, onChange, labelOn = 'На сайті', labelOff = 'Сховано', label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'is-on' : ''}`} onClick={() => onChange(!on)}>
      <span className="switch-track"><span className="switch-dot" /></span>
      <span className="switch-label">{on ? labelOn : labelOff}</span>
    </button>
  );
}

export function Photo({ path, alt = '', size = 480, className = '', style }) {
  if (!path) return <span className={`ph ph-empty ${className}`} style={style} />;
  if (/\.mp4$/i.test(path))
    return (
      <span className={`ph ph-video ${className}`} style={style}>
        <video src={src(path, 0)} muted playsInline preload="metadata" />
        <span className="ph-play">{Icon.play}</span>
      </span>
    );
  return <img className={`ph ${className}`} style={style} src={src(path, size)} alt={alt} loading="lazy" draggable="false" onError={(e) => onImgError(e, path)} />;
}

export function Dialog({ title, onClose, children, footer, wide = false, labelId }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.querySelector('button, [href], input, textarea, select')?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
      prev?.focus?.();
    };
  }, []);
  const id = labelId || 'dlg-' + title?.length;
  return (
    <div className="dlg-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`dlg ${wide ? 'dlg-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={id} ref={ref}>
        <div className="dlg-head">
          <h2 id={id}>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Закрити" onClick={onClose}>
            {Icon.close}
          </button>
        </div>
        <div className="dlg-body">{children}</div>
        {footer && <div className="dlg-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children, error }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

/** Текстове поле, яке зберігає значення по ходу набору (чернетка зберігається сама). */
export function Text({ value, onChange, multiline = false, rows = 4, ...rest }) {
  const Tag = multiline ? 'textarea' : 'input';
  return <Tag className="fld" value={value ?? ''} rows={multiline ? rows : undefined} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

// ---------- перетягування ----------
// Мишка й стилус — через PointerSensor; дотик пальцем — лише через TouchSensor (з утриманням), інакше гортання сторінки ставало б перетягуванням.
class MousePointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown',
      handler: ({ nativeEvent: e }) => e.isPrimary && e.button === 0 && e.pointerType !== 'touch',
    },
  ];
}
export function useDnDSensors() {
  return useSensors(
    useSensor(MousePointerSensor, { activationConstraint: { distance: 4 } }),
    // на телефоні: утримати палець ~0,25 с, тоді тягнути — так звичайне гортання сторінки не заважає
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

/**
 * Список, який можна переставляти перетягуванням.
 * items — масив з полем id; render(item, handleProps, state) малює елемент; onMove(fromId, toId).
 */
export function Sortable({ items, onMove, render, grid = false, className = '' }) {
  const sensors = useDnDSensors();
  const [active, setActive] = useState(null);
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setActive(e.active.id)}
      onDragCancel={() => setActive(null)}
      onDragEnd={(e) => {
        setActive(null);
        if (e.over && e.active.id !== e.over.id) onMove(e.active.id, e.over.id);
      }}
      accessibility={{
        screenReaderInstructions: { draggable: 'Щоб перемістити, натисніть пробіл, стрілками оберіть місце і ще раз пробіл. Esc — скасувати.' },
        announcements: {
          onDragStart: () => 'Взято. Стрілками оберіть нове місце.',
          onDragOver: () => '',
          onDragEnd: ({ over }) => (over ? 'Поставлено на нове місце.' : 'Повернуто на місце.'),
          onDragCancel: () => 'Скасовано.',
        },
      }}
    >
      <SortableContext items={items.map((x) => x.id)} strategy={grid ? rectSortingStrategy : verticalListSortingStrategy}>
        <div className={className}>
          {items.map((it) => (
            <SortableItem key={it.id} id={it.id} render={(h, st) => render(it, h, st)} />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>{null}</DragOverlay>
    </DndContext>
  );
}

function SortableItem({ id, render }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 5 : undefined,
    position: 'relative',
  };
  const handle = { ref: setActivatorNodeRef, ...attributes, ...listeners, 'aria-roledescription': 'перетягування', title: 'Потягніть, щоб змінити порядок' };
  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'is-dragging' : ''}>
      {render(handle, { isDragging })}
    </div>
  );
}

export { arrayMove };

/** Переставити елемент fromId на місце toId у масиві з id. */
export function moveById(list, fromId, toId) {
  const a = list.findIndex((x) => x.id === fromId);
  const b = list.findIndex((x) => x.id === toId);
  if (a < 0 || b < 0) return list;
  return arrayMove(list, a, b);
}
