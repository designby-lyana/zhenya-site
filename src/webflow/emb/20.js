
(function(){
  var KEY = 'zh-back-v1';
  function tabs(){ return document.querySelector('.w-tabs'); }
  function activePane(){ var t = tabs(); return t && t.querySelector('.w-tab-pane.w--tab-active'); }
  function save(){
    try {
      var t = tabs(); if (!t) return;
      var cur = t.querySelector('.w-tab-link.w--current');
      var p = activePane();
      var chip = p && p.querySelector('.chip.is-active');
      var view = p && p.querySelector('.view-btn.is-active');
      sessionStorage.setItem(KEY, JSON.stringify({
        at: Date.now(), y: window.scrollY,
        tab: cur ? cur.getAttribute('data-w-tab') : null,
        grid: !t.classList.contains('pf-film'),
        chip: chip ? chip.textContent.trim() : null,
        view: view ? view.textContent.trim() : null
      }));
    } catch (e) {}
  }
  window.addEventListener('pagehide', save);
  document.addEventListener('click', function(e){ var a = e.target.closest && e.target.closest('a[href]'); if (a && !a.getAttribute('href').startsWith('#')) save(); }, true);

  var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {};
  var back = nav.type === 'back_forward' || (performance.navigation && performance.navigation.type === 2);
  var st = null; try { st = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (!back || !st || Date.now() - st.at > 30 * 60 * 1000) return;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  function byText(root, sel, txt){ return [].slice.call(root.querySelectorAll(sel)).filter(function(el){ return el.textContent.trim() === txt; })[0]; }
  function go(y){ if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true }); window.scrollTo(0, y); }
  function restore(){
    var t = tabs(); if (!t) return;
    if (st.tab) { var l = t.querySelector('.w-tab-link[data-w-tab="' + st.tab + '"]'); if (l && !l.classList.contains('w--current')) l.click(); }
    setTimeout(function(){
      if (st.grid && t.classList.contains('pf-film')) { var m = t.querySelector('.pf-more'); if (m) m.click(); }
      setTimeout(function(){
        var p = activePane() || t;
        if (st.chip) { var c = byText(p, '.chip', st.chip); if (c && !c.classList.contains('is-active')) c.click(); }
        if (st.view) { var v = byText(p, '.view-btn', st.view); if (v && !v.classList.contains('is-active')) v.click(); }
        setTimeout(function(){ go(st.y); setTimeout(function(){ go(st.y); }, 350); }, 120);
      }, 320);
    }, 260);
  }
  if (document.readyState === 'complete') setTimeout(restore, 150); else window.addEventListener('load', function(){ setTimeout(restore, 150); });
  window.addEventListener('pageshow', function(e){ if (e.persisted && window.scrollY !== st.y) go(st.y); });
})();
