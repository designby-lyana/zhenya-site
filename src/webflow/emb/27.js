
(function(){
  function move(){
    if (!window.matchMedia('(min-width:768px)').matches) return;
    var fb = document.querySelector('.site-footer .footer-bottom'), side = document.querySelector('.zf-side');
    if (!fb || !side) return;
    side.appendChild(fb); document.body.classList.add('zf-fb-moved');
    window.dispatchEvent(new Event('resize'));
  }
  if (document.readyState === 'complete') move(); else window.addEventListener('load', move);
})();
