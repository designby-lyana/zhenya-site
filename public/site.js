/* Євгенія Бичкова — поведінка сторінки (без бібліотек) */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var slow = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* 1. Шапка: ховається при скролі вниз, повертається вгору */
  var header = $('.site-header');
  var nav = $('#nav');
  var burger = $('#burger');
  if (header) {
    var last = window.pageYOffset || 0, acc = 0, tick = false;
    var upd = function () {
      tick = false;
      var y = window.pageYOffset || 0, d = y - last; last = y;
      header.classList.toggle('is-scrolled', y > 4);
      if (nav && nav.classList.contains('is-open')) { acc = 0; return; }
      if ((d > 0) !== (acc > 0)) acc = 0;
      acc += d;
      if (y <= 80) { header.classList.remove('is-tucked'); acc = 0; }
      else if (acc > 8) { header.classList.add('is-tucked'); acc = 0; }
      else if (acc < -10) { header.classList.remove('is-tucked'); acc = 0; }
    };
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
    header.addEventListener('focusin', function () { header.classList.remove('is-tucked'); });
    upd();
  }

  /* 2. Бургер */
  if (burger && nav) {
    var setNav = function (o) {
      nav.classList.toggle('is-open', o);
      burger.setAttribute('aria-expanded', o ? 'true' : 'false');
      document.body.classList.toggle('no-scroll', o);
    };
    burger.addEventListener('click', function () { setNav(!nav.classList.contains('is-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setNav(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setNav(false); burger.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth > 768) setNav(false); });
  }

  /* 3. Вкладки портфоліо */
  var tabs = $$('.tab[data-tab]');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var name = tab.getAttribute('data-tab');
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      $$('[data-pane]').forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== name; });
      store.set('zb-tab', name);
    });
  });

  /* 4. Фільтр категорій */
  var gallery = $('[data-gallery]');
  var note = $('.empty-note');
  $$('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var cat = chip.getAttribute('data-cat'), shown = 0;
      $$('.chip').forEach(function (c) {
        var on = c === chip;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      $$('.shot', gallery).forEach(function (s) {
        var ok = cat === 'all' || (' ' + s.getAttribute('data-cats') + ' ').indexOf(' ' + cat + ' ') !== -1;
        s.classList.toggle('is-out', !ok);
        if (ok) shown++;
      });
      if (note) note.hidden = shown > 0;
      if (gallery && gallery.scrollLeft) gallery.scrollTo({ left: 0, behavior: slow ? 'auto' : 'smooth' });
      if (chip.scrollIntoView) chip.scrollIntoView({ behavior: slow ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    });
  });

  /* 5. Стрічка / сітка */
  var modeBtns = $$('.view-switch button');
  var setMode = function (m) {
    if (gallery) gallery.classList.toggle('is-scroll', m === 'scroll');
    modeBtns.forEach(function (b) {
      var on = b.getAttribute('data-mode') === m;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    store.set('zb-view', m);
  };
  modeBtns.forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); }); });
  if (modeBtns.length) setMode(store.get('zb-view') || 'scroll');

  /* 6. Погодинний калькулятор у цінах */
  $$('[data-package]').forEach(function (card) {
    var btns = $$('[data-hours-price]', card);
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { var on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        $('[data-price]', card).textContent = b.getAttribute('data-hours-price');
        $('[data-per]', card).textContent = b.getAttribute('data-hours-per');
      });
    });
  });

  /* 7. Лайтбокс */
  var lb = $('#lightbox');
  if (lb) {
    var lbImg = $('img', lb), lbCap = $('figcaption', lb);
    var group = [], idx = 0, opener = null;
    var show = function (i) {
      idx = (i + group.length) % group.length;
      var a = group[idx], im = $('img', a);
      lbImg.src = im.currentSrc || im.src;
      lbImg.alt = im.alt;
      lbCap.textContent = a.getAttribute('data-caption') || '';
      var multi = group.length > 1;
      $('.lb-prev', lb).hidden = !multi; $('.lb-next', lb).hidden = !multi;
    };
    var open = function (a) {
      var g = a.getAttribute('data-lightbox');
      group = $$('[data-lightbox="' + g + '"]').filter(function (x) { return x.offsetParent !== null; });
      opener = a;
      show(group.indexOf(a));
      lb.hidden = false;
      document.body.classList.add('no-scroll');
      $('.lb-close', lb).focus();
    };
    var close = function () {
      lb.hidden = true; lbImg.removeAttribute('src');
      document.body.classList.remove('no-scroll');
      if (opener) opener.focus();
    };
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-lightbox]');
      if (a) { e.preventDefault(); open(a); return; }
      var b = e.target.closest('[data-lb]');
      if (b) { var act = b.getAttribute('data-lb'); if (act === 'close') close(); else show(idx + (act === 'next' ? 1 : -1)); return; }
      if (e.target === lb) close();
    });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft') show(idx - 1);
    });
    var x0 = null;
    lb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    });
  }

  /* 8. Герой: пари кадрів тихо змінюють одна одну */
  var hero = $('[data-hero]');
  if (hero && !slow) {
    var slides = [];
    try { slides = JSON.parse(hero.getAttribute('data-slides') || '[]'); } catch (e) {}
    var cells = $$('.hero-cell', hero);
    if (slides.length >= 2 && cells.length === 2) {
      var pairs = [[$('img', cells[0]).getAttribute('src'), $('img', cells[1]).getAttribute('src')]];
      var alts = [[$('img', cells[0]).alt, $('img', cells[1]).alt]];
      for (var i = 0; i + 1 < slides.length; i += 2) {
        pairs.push([slides[i].src || slides[i].photo, slides[i + 1].src || slides[i + 1].photo]);
        alts.push([slides[i].alt, slides[i + 1].alt]);
      }
      var p = 0, timer = null;
      var swap = function () {
        p = (p + 1) % pairs.length;
        cells.forEach(function (cell, k) {
          var cur = $('img:not(.is-next)', cell);
          var nxt = document.createElement('img');
          nxt.className = 'is-next'; nxt.alt = alts[p][k]; nxt.decoding = 'async';
          nxt.onload = function () {
            requestAnimationFrame(function () { nxt.classList.add('is-in'); });
            setTimeout(function () { cur.remove(); nxt.classList.remove('is-next', 'is-in'); }, 950);
          };
          nxt.src = pairs[p][k];
          cell.appendChild(nxt);
        });
      };
      var start = function () { if (!timer) timer = setInterval(swap, 5200); };
      var stop = function () { clearInterval(timer); timer = null; };
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { en[0].isIntersecting && !document.hidden ? start() : stop(); }, { threshold: .3 }).observe(hero);
      } else start();
      document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    }
  }

  /* 9. Поява секцій */
  var rev = $$('.reveal');
  if (rev.length && !slow && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-anim');
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    rev.forEach(function (el) { io.observe(el); });
    setTimeout(function () { rev.forEach(function (el) { el.classList.add('is-in'); }); }, 2500);
  }

  /* 10. Активний пункт меню */
  var links = $$('.nav a[href*="#"]');
  if ('IntersectionObserver' in window && links.length) {
    var map = links.map(function (a) { return { a: a, s: document.getElementById(a.getAttribute('href').split('#')[1]) }; }).filter(function (m) { return m.s; });
    var io2 = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) map.forEach(function (m) { m.a.classList.toggle('is-active', m.s === e.target); }); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    map.forEach(function (m) { io2.observe(m.s); });
  }
})();
