
(function(){
  var g = document.querySelector('[data-hg]');
  var hd = document.querySelector('.site-header');
  var hero = document.getElementById('top');
  var io = hero && 'IntersectionObserver' in window;
  var past = false, up = false, lastY = window.scrollY, acc = 0, raf = 0;
  var UP = 24, DOWN = 8;
  function upd(){ var on = past && up; if (g) g.classList.toggle('is-shown', on); if (hd) hd.classList.toggle('hg-up', on); }
  if (io) {
    new IntersectionObserver(function(es){ past = !es[0].isIntersecting; if (!past) up = false; upd(); }, { rootMargin: '-74px 0px 0px 0px' }).observe(hero);
  }
  function tick(){
    raf = 0;
    var y = window.scrollY, d = y - lastY; lastY = y;
    if (!io) past = y > 400;
    if (d < 0) { acc = Math.min(0, acc) + d; if (acc < -UP) up = true; }
    else if (d > 0) { acc = Math.max(0, acc) + d; if (acc > DOWN) up = false; }
    upd();
  }
  window.addEventListener('scroll', function(){ if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
  tick();
})();
