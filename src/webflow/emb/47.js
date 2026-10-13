
(function(){
  // шапка темніє, коли під нею вайбовий екран (і далі футер)
  var hd = document.querySelector('.site-header'), alive = document.querySelector('section.alive');
  if (hd && alive) {
    var hraf = 0;
    var hcheck = function(){ hraf = 0; hd.classList.toggle('hd-dark', alive.getBoundingClientRect().top <= hd.getBoundingClientRect().height); };
    addEventListener('scroll', function(){ if (!hraf) hraf = requestAnimationFrame(hcheck); }, { passive: true });
    addEventListener('resize', hcheck); hcheck();
  }
})();
(function(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var root = document.documentElement; root.classList.add('mo');
  var touch = matchMedia('(hover: none)').matches;

  // 1. Інерційна прокрутка
  var lenis = null;
  if (window.Lenis && !touch) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
    (function raf(t){ lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    // якорі (#portfolio, #packages, #contact) — плавно, з поправкою на шапку; перехоплюємо раніше за Webflow.
    // Таби портфоліо та посилання самого сайту без якоря секції — НЕ чіпаємо (інакше таби не перемикаються).
    window.addEventListener('click', function(e){
      var a = e.target.closest && e.target.closest('a[href*="#"]'); if (!a) return;
      if (a.closest('.w-tab-menu') || a.hasAttribute('data-w-tab') || a.classList.contains('w-tab-link')) return;
      var id = a.getAttribute('href').split('#')[1]; if (!id) return;
      var el = document.getElementById(id); if (!el) return;
      if (el.classList.contains('w-tab-pane')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      lenis.scrollTo(el, { offset: -80, duration: 1.4 });
    }, true);
    window.__lenis = lenis;
  }

  // 2. Поява блоків
  var SEL = '.h-section, .about-eyebrow, .about-p, .about-photo, .contact-title, .contact-cta .btn, .footer-cols > div, .pf-hint';
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('sr-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
  function watch(el, i){
    if (el.hasAttribute('data-w-id') || el.closest('[data-pr]')) return;   // не чіпаємо те, що вже анімує Webflow або блок цін
    el.classList.add('sr'); el.style.setProperty('--d', Math.min(i || 0, 6) * 0.08 + 's'); io.observe(el);
  }
  [].forEach.call(document.querySelectorAll(SEL), function(el){
    var sib = el.parentElement ? [].indexOf.call(el.parentElement.children, el) : 0;
    watch(el, sib);
  });

  // вайбовий екран — плитки з'являються з невеликою затримкою по колонках
  function watchTiles(){
    [].forEach.call(document.querySelectorAll('.zf-i'), function(el){
      var left = parseFloat(el.style.left) || 0;
      el.style.setProperty('--d', (left / Math.max(1, innerWidth)) * 0.35 + 's');
      io.observe(el);
    });
  }
  if (document.readyState === 'complete') watchTiles(); else addEventListener('load', watchTiles);

  // 3. Плівка портфоліо
  var tabs = document.querySelector('.w-tabs'), list = document.querySelector('.pf-sticky');
  if (tabs && list) {
    var photos = function(){ return [].slice.call(tabs.querySelectorAll('.pf-track > .w-dyn-item:not(.pf-off) .gallery-photo')); };
    // паралакс фото всередині рамки
    // + поява під скрол: кадр, що тільки визирнув справа, — прозорий, розмитий і трохи менший; повністю в екрані — чіткий
    (function loop(){
      if (tabs.classList.contains('pf-film')) {
        var cx = innerWidth / 2, sw = tabs.classList.contains('pf-swipe');
        photos().forEach(function(p){
          var r = p.getBoundingClientRect();
          if (r.right < -200 || r.left > innerWidth + 200) { p.style.setProperty('--pv', '0'); return; }
          var t = Math.min(1, Math.max(0, (innerWidth - r.left) / (r.width * 0.9)));
          t = 1 - Math.pow(1 - t, 2);
          p.style.setProperty('--pv', t.toFixed(3));
          if (!sw) {
            var off = ((r.left + r.width / 2) - cx) / innerWidth;          // -0.5…0.5
            p.style.setProperty('--px', (-off * r.width * 0.12).toFixed(1) + 'px');
          }
        });
      }
      requestAnimationFrame(loop);
    })();
  }

  // 4. Ціни: картки під'їжджають справа в такт прокрутці (друга трохи випереджає третю)
  var all = [].slice.call(document.querySelectorAll('[data-pr] .pr-card'));
  all.forEach(function(c){ c.classList.add('pc-now'); });   // усі картки цін — одразу на місці, без анімації
  var cards = [];   // щоб повернути виїзд справа для останньої картки: all.slice(-1) і клас 'pc-slide'
  if (cards.length) {
    var craf = 0;
    var slide = function(){
      craf = 0;
      var vh = innerHeight, D = Math.min(320, innerWidth * 0.3);
      cards.forEach(function(c, i){
        var raw = (vh - c.getBoundingClientRect().top) / (vh * 0.55);
        var p = Math.min(1, Math.max(0, (raw - i * 0.18) / 0.82));
        var e = 1 - Math.pow(1 - p, 3);
        c.style.setProperty('--pc-x', ((1 - e) * D).toFixed(1) + 'px');
        c.style.setProperty('--pc-o', Math.min(1, e * 1.5).toFixed(3));
      });
    };
    addEventListener('scroll', function(){ if (!craf) craf = requestAnimationFrame(slide); }, { passive: true });
    addEventListener('resize', slide); slide();
  }

  // сітка «Усі роботи»: коли відкрили — кадри спливають хвилею
  var gal = document.querySelector('.gallery');
  var gio = new IntersectionObserver(function(es){
    es.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('sg-in'); gio.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  if (gal) new MutationObserver(function(){
    if (gal.classList.contains('pf-track')) return;
    var k = 0;
    [].forEach.call(gal.children, function(el){
      if (el.classList.contains('pf-off') || el.classList.contains('sg') || !el.classList.contains('w-dyn-item')) return;
      el.classList.add('sg'); el.style.setProperty('--d', (k++ % 4) * 0.07 + 's'); gio.observe(el);
    });
  }).observe(gal, { attributes: true, subtree: true, attributeFilter: ['class'] });
})();
