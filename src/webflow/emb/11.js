
(function(){
  var mq = window.matchMedia ? matchMedia('(max-width:767px)') : null; if (!mq) return;
  function init(){
    var burger = document.querySelector('.site-header .burger'); if (!burger || burger._mm) return; burger._mm = true;
    burger.setAttribute('role', 'button'); burger.setAttribute('tabindex', '0'); burger.setAttribute('aria-label', 'Меню'); burger.setAttribute('aria-expanded', 'false');
    function href(sel, fb){ var a = document.querySelector(sel); return a ? a.getAttribute('href') : fb; }
    var ig = href('.hero-cta a[href*="instagram.com"]', 'https://www.instagram.com/photo_zhenshen/');
    var wa = href('.hero-cta a[href*="wa.me"]', 'https://wa.me/380985111583');
    var tel = href('a[href^="tel:"]', 'tel:+380985111583');
    var m = document.createElement('div'); m.className = 'mm'; m.id = 'mm'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Меню'); m.setAttribute('aria-hidden', 'true');
    m.innerHTML =
      '<button type="button" class="mm-x" aria-label="Закрити меню"></button>' +
      '<p class="mm-eyebrow">Фотографка · Львів і Кривий Ріг</p>' +
      '<nav class="mm-links"><a href="#portfolio" data-go="#portfolio">Портфоліо</a><a href="#packages" data-go="#packages">Ціни</a><a href="#about" data-go=".about">Про мене</a><a href="#contact" data-go="#contact">Контакти</a></nav>' +
      '<div class="mm-cta"><a class="mm-ig" target="_blank" rel="noopener"></a><a class="mm-wa" target="_blank" rel="noopener">WhatsApp</a><a class="mm-tel"></a></div>';
    m.querySelector('.mm-ig').href = ig; m.querySelector('.mm-ig').textContent = 'Напиши в Instagram';
    m.querySelector('.mm-wa').href = wa;
    var t = m.querySelector('.mm-tel'); t.href = tel; t.textContent = tel.replace('tel:', '').replace(/^\+380(\d{2})(\d{3})(\d{2})(\d{2})$/, '+380 $1 $2 $3 $4');
    document.body.appendChild(m);
    var x = m.querySelector('.mm-x');
    function placeX(){ var r = burger.getBoundingClientRect(); x.style.top = Math.max(12, r.top + r.height / 2 - 23) + 'px'; x.style.left = (r.left + r.width / 2 - 23) + 'px'; }
    function open(){ if (!mq.matches) return; placeX(); m.classList.add('is-open'); m.setAttribute('aria-hidden', 'false'); burger.setAttribute('aria-expanded', 'true'); document.documentElement.classList.add('mm-lock'); setTimeout(function(){ x.focus({ preventScroll: true }); }, 60); }
    function close(focusBack){ m.classList.remove('is-open'); m.setAttribute('aria-hidden', 'true'); burger.setAttribute('aria-expanded', 'false'); document.documentElement.classList.remove('mm-lock'); if (focusBack) burger.focus({ preventScroll: true }); }
    burger.addEventListener('click', function(e){ if (!mq.matches) return; e.preventDefault(); e.stopPropagation(); open(); }, true);
    burger.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    x.addEventListener('click', function(){ close(true); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && m.classList.contains('is-open')) close(true); });
    [].forEach.call(m.querySelectorAll('[data-go]'), function(a){
      a.addEventListener('click', function(e){
        e.preventDefault();
        var el = document.querySelector(a.getAttribute('data-go'));
        close(false);
        if (!el) return;
        requestAnimationFrame(function(){ var y = el.getBoundingClientRect().top + window.scrollY - 16; window.scrollTo({ top: y, behavior: 'smooth' }); });
      });
    });
    [].forEach.call(m.querySelectorAll('.mm-cta a'), function(a){ a.addEventListener('click', function(){ close(false); }); });
    if (mq.addEventListener) mq.addEventListener('change', function(){ if (!mq.matches) close(false); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
