
window.addEventListener('load',function(){setTimeout(function(){window.dispatchEvent(new Event('resize'));},50);});
(function(){
  if (!window.matchMedia || !matchMedia('(min-width:768px)').matches) return;
  var R = ['28px 0 0 0', '0 28px 0 0', '0 0 28px 0', '0 0 0 28px'];
  function run(){
    var prev = -1, prev2 = -1;
    [].forEach.call(document.querySelectorAll('.album-cover'), function(c){
      var k; do { k = Math.floor(Math.random() * 4); } while (k === prev || k === prev2);
      prev2 = prev; prev = k;
      c.style.setProperty('border-radius', R[k], 'important'); c.style.overflow = 'hidden';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
(function(){
  if (!window.matchMedia || !matchMedia('(max-width:767px)').matches) return;
  var tries = 0;
  function init(){
    var list = document.querySelector('.pf-film .pf-sticky');
    if (!list) { if (tries++ < 40) setTimeout(init, 250); return; }
    var imgs = [].slice.call(list.querySelectorAll('.pf-track img'));
    var raf = 0;
    function ahead(){
      raf = 0;
      var lr = list.getBoundingClientRect(), reach = list.clientWidth * 3;
      imgs = imgs.filter(function(img){
        if (img.getBoundingClientRect().left - lr.left <= reach) { img.loading = 'eager'; return false; }
        return true;
      });
      if (!imgs.length) list.removeEventListener('scroll', onScroll);
    }
    function onScroll(){ if (!raf) raf = requestAnimationFrame(ahead); }
    list.addEventListener('scroll', onScroll, { passive: true });
    ahead();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
