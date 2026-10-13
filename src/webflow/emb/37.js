
(function(){
  var h=document.querySelector('.site-header'); if(!h) return;
  function f(){ h.classList.toggle('is-scrolled', window.scrollY>8); }
  f(); window.addEventListener('scroll', f, {passive:true});
})();
(function(){
  // Портфоліо: таби і чіпи в один рядок, поки чіпи не налізають на таби
  var t = document.querySelector('.w-tabs'); if (!t) return;
  function fit(){
    var bar = t.querySelector('.w-tab-pane.w--tab-active > .filter-bar');
    var tabs = t.querySelectorAll('.w-tab-link');
    t.classList.add('fb-inline');
    if (!bar || !tabs.length) { t.classList.remove('fb-inline'); return; }
    var last = tabs[tabs.length - 1].getBoundingClientRect().right;
    if (bar.getBoundingClientRect().left < last + 32) t.classList.remove('fb-inline');
  }
  var r; window.addEventListener('resize', function(){ clearTimeout(r); r = setTimeout(fit, 120); });
  t.addEventListener('click', function(){ setTimeout(fit, 60); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  fit();
})();
(function(){
  // Скільки мілісекунд тримається одна пара. Саме перетікання — 1.6 с (FADE; після свайпу — 0.5 с), наїзд — 9 с, у CSS вище
  var HOLD = 4500, FADE = 1600, FAST = 500;
  // пари, у яких на телефоні кадри міняються місцями (частина назви файлу будь-якого з двох)
  var MSWAP = ['hero-vulytsya-lvova'];
  function run(){
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var pool = [].slice.call(document.querySelectorAll('[data-hero-pool] img')).filter(function(i){ return i.getAttribute('src'); });
    var L = document.querySelector('.hero-cell-l'), R = document.querySelector('.hero-cell-r');
    if (!L || !R || pool.length < 2) return;
    var base = [L.querySelector('.hero-img'), R.querySelector('.hero-img')].filter(Boolean);
    function mk(cell, s){
      var im = document.createElement('img');
      im.className = 'hf'; im.alt = ''; im.setAttribute('aria-hidden', 'true'); im.decoding = 'async';
      if (s.getAttribute('data-fit')) im.style.objectFit = s.getAttribute('data-fit');
      if (s.getAttribute('data-scale')) im.style.scale = s.getAttribute('data-scale');
      if (s.getAttribute('srcset')) { im.srcset = s.getAttribute('srcset'); im.sizes = '(max-width:767px) 100vw, 50vw'; }
      im.src = s.getAttribute('src');
      cell.appendChild(im); return im;
    }
    function restart(els, cls){ els.forEach(function(e){ e.classList.remove(cls); void e.offsetWidth; e.classList.add(cls); }); }
    function ready(els){
      return Promise.all((els || []).map(function(e){
        if (e.complete && e.naturalWidth) return Promise.resolve();
        return (e.decode ? e.decode() : new Promise(function(r){ e.onload = e.onerror = r; })).catch(function(){});
      }));
    }
    // шар 0 — пара в самих комірках херо; далі — пари з пулу
    var layers = [null], swaps = [];
    for (var i = 0; i + 1 < pool.length; i += 2) {
      var pa = mk(L, pool[i]), pb = mk(R, pool[i + 1]);
      layers.push([pa, pb]);
      var both = (pool[i].getAttribute('src') || '') + ' ' + (pool[i + 1].getAttribute('src') || '');
      if (MSWAP.some(function(k){ return both.indexOf(k) > -1; })) swaps.push([pa, pb]);
    }
    // телефон: у позначених парах лівий кадр йде в нижню комірку, правий — у верхню; на ширших екранах — як було
    var mq = window.matchMedia ? matchMedia('(max-width:767px)') : null;
    function place(){
      var m = !!(mq && mq.matches);
      swaps.forEach(function(p){
        var cA = m ? R : L, cB = m ? L : R;
        if (p[0].parentNode !== cA) cA.appendChild(p[0]);
        if (p[1].parentNode !== cB) cB.appendChild(p[1]);
      });
    }
    place();
    if (mq) { if (mq.addEventListener) mq.addEventListener('change', place); else if (mq.addListener) mq.addListener(place); }
    restart(base, 'kb');
    var k = 0, z = 1, busy = false, pending = null;
    // стара пара ховається після перетікання; якщо до неї швидко повернулись свайпом — ховання скасовується
    function hide(els, ms){ els.forEach(function(e){ clearTimeout(e._ht); e._ht = setTimeout(function(){ e.classList.remove('on', 'out', 'fast'); }, ms + 150); }); }
    function show(nk, fast){
      if (nk === k) return;
      if (busy) { if (fast) pending = nk; return; }        // поки вантажиться попередня зміна — свайп стає в чергу
      if (!fast && document.hidden) return;
      busy = true;
      var prev = layers[k], cur = layers[nk], ms = fast ? FAST : FADE;
      ready(cur).then(function(){
        k = nk; busy = false;
        var all = (prev || base).concat(cur || []);
        all.forEach(function(e){ e.classList.toggle('fast', !!fast); });
        if (cur) {
          // нова пара проявляється ПОВЕРХ старої; стара лишається під нею, поки не сховається
          z++;
          cur.forEach(function(e){ clearTimeout(e._ht); e.style.zIndex = z; e.classList.remove('out'); });
          restart(cur, 'on');
          if (prev) hide(prev, ms);
        } else {
          // повертаємось до першої пари: вона вже лежить знизу, тож просто гасимо верхню
          restart(base, 'kb');
          if (prev) { prev.forEach(function(e){ e.classList.add('out'); }); hide(prev, ms); }
        }
        if (pending !== null) { var p = pending; pending = null; show(p, true); }
      });
    }
    function step(dir, fast){ var n = layers.length; show(((k + (dir || 1)) % n + n) % n, fast); }
    var timer = setInterval(function(){ step(1); }, HOLD);
    function rearm(){ clearInterval(timer); timer = setInterval(function(){ step(1); }, HOLD); }

    // свайп по герою: лише дотик, лише виразний горизонтальний рух (вертикальний — це звичайна прокрутка сторінки)
    var media = L.parentElement, sx = 0, sy = 0, st = 0, on = false, done = false;
    function fire(dx){ if (done) return; done = true; step(dx < 0 ? 1 : -1, true); rearm(); }
    media.addEventListener('touchstart', function(e){
      var t = e.touches[0]; if (!t || e.touches.length > 1) { on = false; return; }
      sx = t.clientX; sy = t.clientY; st = Date.now(); on = true; done = false;
    }, { passive: true });
    // спрацьовує вже під час руху пальця — не чекаючи, поки його відпустять
    media.addEventListener('touchmove', function(e){
      if (!on || done) return; var t = e.touches[0]; if (!t) return;
      var dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) fire(dx);
    }, { passive: true });
    media.addEventListener('touchend', function(e){
      if (!on) return; on = false;
      var t = e.changedTouches[0]; if (!t || done) return;
      var dx = t.clientX - sx, dy = t.clientY - sy;
      if (Date.now() - st > 1200 || Math.abs(dx) < 35 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      fire(dx);
    }, { passive: true });
    media.addEventListener('touchcancel', function(){ on = false; }, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
