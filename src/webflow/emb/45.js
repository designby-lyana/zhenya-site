
(function(){
  var tries = 0, t = 0, last = '';
  function regroup(){
    var track = document.querySelector('[data-pf-track]'); if (!track || !window.Webflow || !Webflow.require) return;
    var sig = '', changed = false;
    [].forEach.call(track.children, function(it){
      if (!it.classList.contains('w-dyn-item')) return;
      var l = it.querySelector('.w-lightbox'), s = l && l.querySelector('script.w-json'); if (!s) return;
      var g = it.classList.contains('pf-off') ? 'pf-hidden' : 'portfolio'; sig += g.charAt(0);
      try { var j = JSON.parse(s.textContent); if (j.group !== g) { j.group = g; s.textContent = JSON.stringify(j); changed = true; } } catch (e) {}
    });
    if (changed || sig !== last) { last = sig; try { Webflow.require('lightbox').ready(); } catch (e) {} }
  }
  function init(){
    var track = document.querySelector('[data-pf-track]');
    if (!track) { if (tries++ < 40) setTimeout(init, 250); return; }
    regroup();
    new MutationObserver(function(){ clearTimeout(t); t = setTimeout(regroup, 120); }).observe(track, { attributes: true, subtree: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'complete') init(); else window.addEventListener('load', init);
})();
