
(function(){
  function upd(){
    var bd = document.querySelector('.w-lightbox-backdrop'); if (!bd) return;
    var items = bd.querySelectorAll('.w-lightbox-item'); var act = bd.querySelector('.w-lightbox-item.w-lightbox-active');
    var c = bd.querySelector('.zlb-count');
    if (!items.length) { if (c) c.remove(); return; }
    if (!c) { c = document.createElement('div'); c.className = 'zlb-count'; bd.appendChild(c); }
    var i = act ? [].indexOf.call(items, act) + 1 : 1;
    var t = i + ' / ' + items.length; if (c.textContent !== t) c.textContent = t;
  }
  new MutationObserver(upd).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
})();
(function(){
  var mq = window.matchMedia ? matchMedia('(min-width:768px)') : null; if (!mq) return;
  var tries = 0;
  function init(){
    var tabs = document.querySelector('.w-tabs'), film = document.querySelector('.pf-sticky');
    if (!tabs || !film) { if (tries++ < 40) setTimeout(init, 250); return; }
    function active(){ return mq.matches && tabs.classList.contains('pf-film') && !tabs.classList.contains('pf-swipe') && !tabs.classList.contains('pf-m-other'); }
    function by(dy){
      if (window.__lenis) window.__lenis.scrollTo(window.__lenis.targetScroll + dy, { lerp: 0.12 });
      else window.scrollBy(0, dy);
    }
    film.addEventListener('wheel', function(e){
      if (!active()) return;
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 1) return;
      e.preventDefault(); e.stopPropagation();
      by(e.deltaX * 1.1);
    }, { passive: false, capture: true });
    var down = false, sx = 0, lx = 0, moved = false;
    film.addEventListener('pointerdown', function(e){
      if (!active() || e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; sx = lx = e.clientX;
    });
    window.addEventListener('pointermove', function(e){
      if (!down) return;
      if (!moved && Math.abs(e.clientX - sx) > 6) { moved = true; film.classList.add('zf-drag'); }
      if (moved) { by((lx - e.clientX) * 1.4); lx = e.clientX; }
    });
    function up(){ if (!down) return; down = false; if (moved) setTimeout(function(){ film.classList.remove('zf-drag'); }, 30); }
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    film.addEventListener('click', function(e){ if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    film.addEventListener('dragstart', function(e){ if (active()) e.preventDefault(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
