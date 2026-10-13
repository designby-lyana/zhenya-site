
(function(){
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {};
  var type = nav.type || (performance.navigation && ({0:'navigate',1:'reload',2:'back_forward'})[performance.navigation.type]) || 'navigate';
  function strip(){ if (location.hash) history.replaceState(null, '', location.pathname + location.search); }
  window.addEventListener('hashchange', strip);
  document.addEventListener('click', function(e){ var a = e.target.closest && e.target.closest('a[href^="#"]'); if (a) setTimeout(strip, 50); });
  if (type === 'back_forward') return;
  if (type === 'navigate' && location.hash) { setTimeout(strip, 1500); return; }
  strip();
  var user = false, until = Date.now() + 2500;
  function top(){ if (user || Date.now() > until) return; if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true, force: true }); if (window.scrollY !== 0) window.scrollTo(0, 0); }
  ['touchstart', 'wheel', 'keydown', 'mousedown'].forEach(function(ev){ window.addEventListener(ev, function(){ user = true; }, { passive: true, once: true }); });
  window.addEventListener('scroll', function(){ if (!user && Date.now() < until && window.scrollY > 0) requestAnimationFrame(top); }, { passive: true });
  top();
  document.addEventListener('DOMContentLoaded', top);
  window.addEventListener('load', function(){ top(); setTimeout(top, 150); setTimeout(top, 500); setTimeout(top, 1000); });
  window.addEventListener('pageshow', function(){ top(); setTimeout(top, 200); });
})();
(function(){
  [].forEach.call(document.querySelectorAll('.header-cta'), function(b){
    b.setAttribute('href', 'https://ig.me/m/photo_zhenshen'); b.setAttribute('target', '_blank'); b.setAttribute('rel', 'noopener');
    b.setAttribute('aria-label', 'Написати Жені в Instagram');
  });
})();
