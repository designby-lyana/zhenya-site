
(function(){
  var MAP = { 'портретна': { chip: 'Портрети' }, 'творча': { chip: 'Творчі' }, 'сімейна': { chip: 'З дітьми' }, 'події': { tab: 'Tab 2' } };
  function target(){
    var sec = document.getElementById('portfolio') || document.querySelector('.w-tabs');
    var ttl = sec.querySelector('h1, h2') || sec;
    var hd = document.querySelector('.site-header');
    return Math.max(0, Math.round(ttl.getBoundingClientRect().top + window.scrollY - (hd ? hd.getBoundingClientRect().height : 74) - 40));
  }
  function scrollTo(y, smooth){
    if (window.__lenis) window.__lenis.scrollTo(y, smooth ? { duration: 1.1, force: true } : { immediate: true, force: true });
    else window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
  }
  function go(cfg){
    var t = document.querySelector('.w-tabs');
    var tab = cfg.tab || 'Tab 1';
    var l = t && t.querySelector('.w-tab-link[data-w-tab="' + tab + '"]');
    if (l && !l.classList.contains('w--current')) l.click();
    setTimeout(function(){
      if (cfg.chip) {
        var p = t.querySelector('.w-tab-pane.w--tab-active') || t;
        var c = [].slice.call(p.querySelectorAll('.chip')).filter(function(x){ return x.textContent.trim() === cfg.chip; })[0];
        if (c && !c.classList.contains('is-active')) c.click();
      }
      setTimeout(function(){
        scrollTo(target(), true);
        setTimeout(function(){ var y = target(); if (Math.abs(window.scrollY - y) > 24) scrollTo(y, true); }, 1300);
      }, 380);
    }, 280);
  }
  function init(){
    var g = document.querySelector('[data-hg]'); if (!g || g._hg) return; g._hg = true;
    g.innerHTML = g.textContent.replace(/[А-Яа-яЄєІіЇїҐґʼ']+/g, function(w){
      return MAP[w.toLowerCase()] ? '<a class="hg-w" role="link" tabindex="0" data-k="' + w.toLowerCase() + '">' + w + '</a>' : w;
    });
    g.addEventListener('click', function(e){ var a = e.target.closest('.hg-w'); if (!a) return; e.preventDefault(); go(MAP[a.getAttribute('data-k')]); });
    g.addEventListener('keydown', function(e){ var a = e.target.closest && e.target.closest('.hg-w'); if (a && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(MAP[a.getAttribute('data-k')]); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
