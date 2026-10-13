
(function(){
  var desk = window.matchMedia('(min-width:768px)');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');

  // ——— 1) назва картки ———
  function label(){
    var more = document.querySelector('.pf-more'); if (!more) return false;
    var b = more.querySelector('b'), s = more.querySelector('span');
    if (b && b.textContent !== 'Усі світлини') b.textContent = 'Усі світлини';
    if (s && desk.matches) {
      var pane = more.closest('.w-tab-pane'), chip = pane && pane.querySelector('.chip.is-active');
      var cat = chip && chip.getAttribute('data-cat') !== 'all' ? chip.textContent.trim() : '';
      var n = [].filter.call(more.parentElement.children, function(el){
        if (!el.classList.contains('w-dyn-item')) return false;
        if (!cat) return true;
        var t = el.querySelector('.cat-tags'); return !!t && t.textContent.indexOf(cat) > -1;
      }).length;
      var txt = n ? 'показати всі ' + n + ' разом' : 'показати всі разом';
      if (s.textContent !== txt) s.textContent = txt;
    }
    return true;
  }
  var tries = 0;
  (function wait(){ if (!label() && tries++ < 40) setTimeout(wait, 250); })();
  window.addEventListener('load', function(){ setTimeout(label, 300); });
  document.addEventListener('click', function(e){ if (e.target.closest && e.target.closest('.chip')) setTimeout(label, 0); });
  if (desk.addEventListener) desk.addEventListener('change', function(){ setTimeout(label, 50); });

  // ——— 2) без прокрутки після кліку ———
  var guardUntil = 0;
  function guarded(){ return Date.now() < guardUntil; }
  var nativeTo = window.scrollTo.bind(window);
  window.scrollTo = function(a){
    if (guarded() && a && typeof a === 'object' && a.behavior === 'smooth') return;
    return nativeTo.apply(window, arguments);
  };
  function wrapLenis(){
    var l = window.__lenis; if (!l || l._zhWrap) return;
    var orig = l.scrollTo.bind(l); l._zhWrap = true;
    // власна прокрутка Lenis (колесо, тачпад) іде з programmatic:false — її не чіпаємо
    l.scrollTo = function(t, o){ if (guarded() && !(o && (o.immediate || o.programmatic === false))) return; return orig(t, o); };
  }
  document.addEventListener('click', function(e){
    var m = e.target.closest && e.target.closest('.pf-more');
    if (!m || !e.isTrusted) return;
    wrapLenis();
    guardUntil = Date.now() + 1500;
    var pane = m.closest('.w-tab-pane');
    setTimeout(function(){
      if (!pane) return;
      var top = pane.getBoundingClientRect().top;
      if (top >= 120) return;                                   // верх галереї видно — нічого не рухаємо
      var y = Math.max(0, Math.round(top + window.scrollY - 120));
      if (y >= window.scrollY) return;                          // вниз — ніколи
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
      nativeTo(0, y);
    }, 30);
  }, true);

  // ——— 3) номер телефону: копіювання на комп'ютері ———
  function copy(t){
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
    return new Promise(function(res, rej){
      var x = document.createElement('textarea'); x.value = t; x.setAttribute('readonly', '');
      x.style.position = 'fixed'; x.style.opacity = '0'; document.body.appendChild(x); x.select();
      try { document.execCommand('copy') ? res() : rej(); } catch (er) { rej(er); }
      document.body.removeChild(x);
    });
  }
  function isNum(a){ return a && /\d/.test(a.textContent); }
  function titles(){ [].forEach.call(document.querySelectorAll('a[href^="tel:"]'), function(a){ if (isNum(a)) { if (fine.matches) a.title = 'Натисни, щоб скопіювати'; else a.removeAttribute('title'); } }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', titles); else titles();
  if (fine.addEventListener) fine.addEventListener('change', titles);
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href^="tel:"]');
    if (!isNum(a) || !fine.matches) return;
    e.preventDefault();
    if (a.dataset.zhBusy) return;
    var html = a.innerHTML, w = a.offsetWidth;
    copy(a.getAttribute('href').replace('tel:', '').replace(/\s+/g, '')).then(function(){
      a.dataset.zhBusy = '1'; a.style.minWidth = w + 'px';
      a.textContent = 'Скопійовано ✓';
      setTimeout(function(){ a.innerHTML = html; a.style.minWidth = ''; delete a.dataset.zhBusy; }, 1600);
    }).catch(function(){ window.location.href = a.href; });
  });
})();
