
(function(){
  var ft=document.querySelector('.site-footer'); if(!ft) return;
  // Instagram: замість слова — аватар у кільці сторіс і «Підписатись»
  function ig(){
  var a=ft.querySelector('a[href*="instagram.com"]');
  if(a){ a.classList.add('ig-link'); a.setAttribute('aria-label','Підписатись на Instagram Жені'); a.target='_blank'; a.rel='noopener';
    a.innerHTML='<span class="ig-ava"><img alt="" loading="lazy" width="64" height="64" src="https://cdn.prod.website-files.com/6a65e6828ad7099333ebb2c2/6ab4f49770d828296938d6a0_zh-ig-avatar.jpg"></span><span class="ig-txt">Підписатись</span><span class="ig-arr" aria-hidden="true">↗</span>'; }
  }
  // колонки футера стоять у розмітці після цього коду — чекаємо, поки сторінка збереться
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ig); else ig();
  // футер лягає поверх вайбової сітки: зсуваємо вгору на власну висоту, сітка отримує таку ж довжину хвоста
  var last=0;
  function fit(){
    var h=ft.offsetHeight; if(h===last) return; last=h;
    ft.style.marginTop=(-h)+'px';
    document.documentElement.style.setProperty('--ft-h', h+'px');
    if(window.__zfLay) window.__zfLay();
  }
  fit(); addEventListener('load',fit); addEventListener('resize',fit);
  if(window.ResizeObserver) new ResizeObserver(fit).observe(ft);
})();
