/* Заміна рантайму Webflow (webflow.js + jQuery), без якого працює ваш власний код:
   1) вкладки .w-tabs  2) перегляд фото .w-lightbox (та сама розмітка й класи, що у Webflow,
   тож стилі з дизайну застосовуються як були)  3) window.Webflow.require / push. */
(function () {
  'use strict';
  var doc = document, html = doc.documentElement;
  var slow = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Вкладки ---------- */
  function initTabs() {
    [].forEach.call(doc.querySelectorAll('.w-tabs'), function (tabs) {
      var menu = tabs.querySelector('.w-tab-menu'), content = tabs.querySelector('.w-tab-content');
      if (!menu || !content) return;
      var links = [].slice.call(menu.querySelectorAll('.w-tab-link'));
      var panes = [].slice.call(content.querySelectorAll(':scope > .w-tab-pane'));
      function show(name) {
        links.forEach(function (l) {
          var on = l.getAttribute('data-w-tab') === name;
          l.classList.toggle('w--current', on);
          l.setAttribute('aria-selected', on ? 'true' : 'false');
          if (on) l.removeAttribute('tabindex'); else l.setAttribute('tabindex', '-1');
        });
        panes.forEach(function (p) {
          var on = p.getAttribute('data-w-tab') === name;
          if (on && !p.classList.contains('w--tab-active')) {
            p.classList.add('w--tab-active');
            if (!slow) { p.style.opacity = '0'; p.style.transition = 'opacity 300ms ease'; requestAnimationFrame(function () { requestAnimationFrame(function () { p.style.opacity = '1'; }); }); }
          } else if (!on) { p.classList.remove('w--tab-active'); p.style.opacity = ''; }
        });
        tabs.setAttribute('data-current', name);
      }
      links.forEach(function (l, i) {
        l.addEventListener('click', function (e) { e.preventDefault(); show(l.getAttribute('data-w-tab')); });
        l.addEventListener('keydown', function (e) {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          e.preventDefault();
          var n = links[(i + (e.key === 'ArrowRight' ? 1 : -1) + links.length) % links.length];
          n.focus(); n.click();
        });
      });
    });
  }

  /* ---------- 2. Перегляд фото (як Webflow Lightbox) ---------- */
  var P = 'w-lightbox';
  var box = null, refs = {}, list = [], idx = 0, opener = null;
  function el(tag, cls, attrs) { var e = doc.createElement(tag); if (cls) e.className = cls; for (var k in attrs || {}) e.setAttribute(k, attrs[k]); return e; }
  function readJson(a) {
    var s = a.querySelector('script.w-json'); if (!s) return null;
    try { return JSON.parse(s.textContent); } catch (e) { return null; }
  }
  function itemsFor(a) {
    var data = readJson(a); if (!data) return { items: [], index: 0 };
    if (!data.group) return { items: data.items || [], index: 0 };
    var all = [], index = 0;
    [].forEach.call(doc.querySelectorAll('.' + P), function (o) {
      var d = readJson(o); if (!d || d.group !== data.group) return;
      if (o === a) index = all.length;
      (d.items || []).forEach(function (it) { all.push(it); });
    });
    return { items: all, index: index };
  }
  function build() {
    refs.left = el('div', P + '-control ' + P + '-left ' + P + '-inactive', { role: 'button', 'aria-label': 'попереднє фото', tabindex: '0' });
    refs.right = el('div', P + '-control ' + P + '-right ' + P + '-inactive', { role: 'button', 'aria-label': 'наступне фото', tabindex: '0' });
    refs.close = el('div', P + '-control ' + P + '-close', { role: 'button', 'aria-label': 'закрити', tabindex: '0' });
    refs.spinner = el('div', P + '-spinner ' + P + '-hide', { role: 'progressbar', 'aria-live': 'polite', 'aria-hidden': 'false', 'aria-busy': 'true', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0', 'aria-valuetext': 'Завантаження' });
    refs.strip = el('div', P + '-strip', { role: 'tablist' });
    refs.content = el('div', P + '-content');
    [refs.spinner, refs.left, refs.right, refs.close].forEach(function (c) { refs.content.appendChild(c); });
    refs.container = el('div', P + '-container');
    refs.container.appendChild(refs.content); refs.container.appendChild(refs.strip);
    box = el('div', P + '-backdrop ' + P + '-hide', { tabindex: '0' });
    box.appendChild(refs.container);
    doc.body.appendChild(box);
    refs.left.addEventListener('click', function (e) { e.stopPropagation(); go(idx - 1); });
    refs.right.addEventListener('click', function (e) { e.stopPropagation(); go(idx + 1); });
    refs.close.addEventListener('click', function (e) { e.stopPropagation(); hide(); });
    box.addEventListener('click', function (e) {
      if (e.target.closest('.' + P + '-figure')) { if (list.length > 1) go(idx + 1); return; }
      if (e.target.closest('.' + P + '-strip') || e.target.closest('.' + P + '-control')) return;
      hide();
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hide();
      else if (e.key === 'ArrowLeft') go(idx - 1);
      else if (e.key === 'ArrowRight') go(idx + 1);
      else if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains(P + '-control')) { e.preventDefault(); e.target.click(); }
    });
    var sx = 0, sy = 0, t = false;
    box.addEventListener('touchstart', function (e) { var p = e.touches[0]; sx = p.clientX; sy = p.clientY; t = true; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (!t) return; t = false;
      var p = e.changedTouches[0], dx = p.clientX - sx, dy = p.clientY - sy;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) go(idx + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }
  function renderStrip() {
    refs.strip.innerHTML = '';
    if (list.length < 2) return;
    list.forEach(function (it, i) {
      var a = el('a', P + '-item', { 'aria-label': 'фото ' + (i + 1) + ' з ' + list.length, role: 'tab', tabindex: '-1' });
      var th = el('div', P + '-thumbnail');
      var im = el('img', P + '-thumbnail-image', { alt: '' });
      im.onload = function () { im.classList.add(im.naturalWidth > im.naturalHeight ? P + '-wide' : P + '-tall'); };
      im.src = it.thumbnailUrl || it.url;
      th.appendChild(im); a.appendChild(th); refs.strip.appendChild(a);
      a.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); go(i); });
    });
  }
  function go(i) {
    if (!list.length) return;
    idx = (i + list.length) % list.length;
    var it = list[idx];
    var view = el('div', P + '-view', { tabindex: '0' });
    var frame = el('div', P + '-frame');
    var fig = el('figure', P + '-figure');
    var im = el('img', P + '-img ' + P + '-image', { alt: it.caption || '' });
    fig.appendChild(im);
    if (it.caption) { var cap = el('figcaption', P + '-caption'); cap.textContent = it.caption; fig.appendChild(cap); }
    frame.appendChild(fig); view.appendChild(frame);
    refs.spinner.classList.remove(P + '-hide');
    im.onload = im.onerror = function () {
      refs.spinner.classList.add(P + '-hide');
      [].forEach.call(refs.content.querySelectorAll('.' + P + '-view'), function (v) { if (v !== view) v.remove(); });
      view.style.transition = slow ? 'none' : 'opacity 300ms ease';
      requestAnimationFrame(function () { view.style.opacity = '1'; });
    };
    im.src = it.url;
    refs.content.insertBefore(view, refs.spinner);
    var group = list.length > 1;
    refs.content.classList.toggle(P + '-group', group);
    refs.left.classList.toggle(P + '-inactive', !group);
    refs.right.classList.toggle(P + '-inactive', !group);
    [].forEach.call(refs.strip.children, function (a, k) {
      a.classList.toggle(P + '-active', k === idx);
      a.setAttribute('aria-selected', k === idx ? 'true' : 'false');
      if (k === idx && a.scrollIntoView) a.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
  }
  function show(items, index, from) {
    if (!items.length) return;
    if (!box) build();
    list = items; opener = from || doc.activeElement;
    renderStrip(); go(index);
    box.classList.remove(P + '-hide');
    html.classList.add(P + '-noscroll');
    box.style.transition = slow ? 'none' : 'opacity 300ms ease';
    requestAnimationFrame(function () { box.style.opacity = '1'; });
    box.focus({ preventScroll: true });
  }
  function hide() {
    if (!box || box.classList.contains(P + '-hide')) return;
    box.style.opacity = '0';
    html.classList.remove(P + '-noscroll');
    setTimeout(function () {
      box.classList.add(P + '-hide');
      [].forEach.call(refs.content.querySelectorAll('.' + P + '-view'), function (v) { v.remove(); });
    }, slow ? 0 : 300);
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  }
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.' + P);
    if (!a) return;
    e.preventDefault();
    var r = itemsFor(a);
    show(r.items, r.index, a);
  });
  var lightbox = { ready: function () {}, preview: function () {}, design: function () {}, show: show, hide: hide };

  /* ---------- 3. window.Webflow ---------- */
  var queue = window.Webflow && window.Webflow.length ? [].slice.call(window.Webflow) : [];
  var W = window.Webflow = {
    require: function (n) { return n === 'lightbox' ? lightbox : { ready: function () {} }; },
    push: function (fn) { if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', fn); else fn(); },
    env: function () { return false; }
  };
  function start() { initTabs(); queue.forEach(function (fn) { try { fn(); } catch (e) {} }); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
  void W;
})();
