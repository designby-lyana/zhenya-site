
(function(){
  function init(){
    var tabs = document.querySelector('.w-tabs'); if (!tabs || tabs._tfix) return; tabs._tfix = true;
    var links = [].slice.call(tabs.querySelectorAll('.w-tab-link'));
    var panes = [].slice.call(tabs.querySelectorAll('.w-tab-pane'));
    var want = null;
    function show(id){
      links.forEach(function(l){ var on = l.getAttribute('data-w-tab') === id; l.classList.toggle('w--current', on); l.setAttribute('aria-selected', on ? 'true' : 'false'); l.setAttribute('tabindex', on ? '0' : '-1'); });
      panes.forEach(function(p){ var on = p.getAttribute('data-w-tab') === id; p.classList.toggle('w--tab-active', on); p.style.opacity = ''; p.style.transition = ''; });
      window.dispatchEvent(new Event('resize'));
    }
    function repair(){
      if (!want) return;
      var act = tabs.querySelector('.w-tab-pane.w--tab-active');
      var cur = tabs.querySelector('.w-tab-link.w--current');
      if (!act || act.getAttribute('data-w-tab') !== want || !cur || cur.getAttribute('data-w-tab') !== want) show(want);
    }
    tabs.addEventListener('click', function(e){
      var l = e.target.closest && e.target.closest('.w-tab-link'); if (!l) return;
      want = l.getAttribute('data-w-tab');
      setTimeout(repair, 260); setTimeout(repair, 700);
    }, true);
    tabs.addEventListener('click', function(e){
      if (!(e.target.closest && e.target.closest('.pf-more, .pf-gm'))) return;
      setTimeout(function(){
        if (!window.__lenis) return;
        var pane = tabs.querySelector('.w-tab-pane.w--tab-active') || tabs;
        window.__lenis.scrollTo(pane, { offset: -120, duration: 1.2 });
      }, 40);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
