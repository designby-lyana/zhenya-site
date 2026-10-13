
(function(){try{var d=document.documentElement;d.classList.add('hg-js');if('IntersectionObserver' in window && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)){d.classList.add('pr-anim');}}catch(e){}})();
// Телефон: «Про мене» стоїть після цін (портфоліо → ціни → про мене → контакти → вайб).
// Показано перший абзац; «Читати далі» розгортає решту. На ширших екранах блок повертається на своє місце, кнопки там не видно.
(function(){
  var mq = window.matchMedia ? matchMedia('(max-width:767px)') : null; if (!mq) return;
  function init(){
    var ab = document.querySelector('.about'), pk = document.getElementById('packages');
    if (!ab || !pk || ab._mob) return; ab._mob = true;
    var home = document.createComment('about-home'); ab.parentNode.insertBefore(home, ab);
    var ps = [].slice.call(ab.querySelectorAll('.about-p'));
    if (ps.length > 1) {
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'about-more'; btn.textContent = 'Читати далі';
      ps[0].parentNode.insertBefore(btn, ps[0].nextSibling);
      btn.addEventListener('click', function(){ ab.classList.add('is-open'); btn.remove(); });
    }
    function apply(){
      if (mq.matches) { if (pk.nextSibling !== ab) pk.parentNode.insertBefore(ab, pk.nextSibling); }
      else if (home.nextSibling !== ab) home.parentNode.insertBefore(ab, home.nextSibling);
    }
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply); else if (mq.addListener) mq.addListener(apply);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
// Телефон: портфоліо.
// Стрічка гортається ПО ОДНОМУ КАДРУ (кадр по центру, сусідні видно по краях): свайп — рівно на один кадр (snap + snap-stop),
// сама — крок на наступний кадр кожні PAGE мс з плавним доїздом. Після дотику/свайпу автогортання відновлюється через IDLE мс.
// Дійшла до кінця — плавно на початок. «Менше руху» в налаштуваннях телефону — без автогортання, лише свайп.
// В кінці стрічки — дві однакові текстові картки: «Альбоми · N зйомок →» (відкриває вкладку альбомів) і «Усі роботи · N фото →» (сітка всіх робіт).
// РЕЖИМ ТАБІВ: таби видно, коли відкрито альбоми, останні або сітку всіх робіт. У цьому режимі «Категорії» теж відкриваються сіткою (як дві інші вкладки).
// «Згорнути» під сіткою — назад до стрічки, таби ховаються.
// Альбоми: у кожної обкладинки випадково — або без заокруглення, або один заокруглений кут у випадковому місці (сусідні — не в однаковому).
(function(){
  var mq = window.matchMedia ? matchMedia('(max-width:767px)') : null; if (!mq || !('IntersectionObserver' in window)) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PAGE = 3200, IDLE = 1500;
  function word(n){ var a = n % 10, b = n % 100; if (a === 1 && b !== 11) return 'зйомка'; if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'зйомки'; return 'зйомок'; }
  var tries = 0;
  function init(){
    var tabs = document.querySelector('.w-tabs'); if (!tabs || tabs._mpf) return;
    var more = tabs.querySelector('.pf-more');
    if (!more) { if (tries++ < 40) setTimeout(init, 250); return; }   // плівку ще не зібрано
    tabs._mpf = true;
    var track = more.parentElement, list = track.parentElement;   // .w-dyn-list — на телефоні саме він гортається вбік

    function curTab(){ var cur = tabs.querySelector('.w-tab-link.w--current'); return cur ? cur.getAttribute('data-w-tab') : 'Tab 1'; }
    function sync(){ tabs.classList.toggle('pf-m-other', curTab() !== 'Tab 1' || !tabs.classList.contains('pf-film')); }
    if ('MutationObserver' in window) new MutationObserver(sync).observe(tabs, { attributes: true, attributeFilter: ['class'] });
    tabs.addEventListener('click', function(e){
      var wasOther = tabs.classList.contains('pf-m-other');
      var to1 = e.target.closest && e.target.closest('.w-tab-link[data-w-tab="Tab 1"]');
      setTimeout(function(){
        // у режимі табів «Категорії» відкриваються сіткою, як «Альбоми» і «Останні»
        if (mq.matches && to1 && wasOther && tabs.classList.contains('pf-film')) more.click();
        sync();
      }, 80);
    });
    sync();

    // «Усі роботи»: на телефоні підпис — кількість фото (лише кадри самої стрічки, без вкладених списків категорій), на ширших екранах — як був
    var moreSub = more.querySelector('span'), moreSubDesk = moreSub ? moreSub.textContent : '';
    var total = [].filter.call(track.children, function(el){ return el.classList.contains('w-dyn-item'); }).length;
    function moreText(){ if (moreSub) moreSub.textContent = mq.matches ? (total ? total + ' фото →' : '→') : moreSubDesk; }
    moreText();
    if (mq.addEventListener) mq.addEventListener('change', moreText); else if (mq.addListener) mq.addListener(moreText);

    var pane2 = tabs.querySelector('.w-tab-pane[data-w-tab="Tab 2"]'), link2 = tabs.querySelector('.w-tab-link[data-w-tab="Tab 2"]');
    if (pane2 && link2) {
      var n = pane2.querySelectorAll('.album-card').length;
      var al = document.createElement('a'); al.href = '#'; al.className = 'pf-albums';
      var b = document.createElement('b'); b.textContent = 'Альбоми';
      var c = document.createElement('span'); c.textContent = (n ? n + ' ' + word(n) + ' ' : '') + '→';
      al.appendChild(b); al.appendChild(c);
      more.parentNode.insertBefore(al, more);
      al.addEventListener('click', function(e){
        e.preventDefault(); link2.click();
        setTimeout(function(){ sync(); var y = tabs.getBoundingClientRect().top + scrollY - 90; scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); }, 80);
      });

      // випадкові кути обкладинок
      var cv = [].slice.call(pane2.querySelectorAll('.album-cover')), prevC = -2;
      var corners = cv.map(function(){
        if (Math.random() < .35) { prevC = -1; return -1; }
        var k; do { k = Math.floor(Math.random() * 4); } while (k === prevC); prevC = k; return k;
      });
      var R = ['28px 0 0 0', '0 28px 0 0', '0 0 28px 0', '0 0 0 28px'];
      function round(){ cv.forEach(function(el, i){ var k = corners[i]; el.style.overflow = mq.matches ? 'hidden' : ''; el.style.borderRadius = (mq.matches && k >= 0) ? R[k] : ''; }); }
      round();
      if (mq.addEventListener) mq.addEventListener('change', round); else if (mq.addListener) mq.addListener(round);
    }

    // автогортання по кадру (з урахуванням бокового відступу стрічки — кадр стає по центру)
    var lastUser = 0, lastAuto = Date.now(), autoUntil = 0, inView = false;
    function user(){ lastUser = Date.now(); }
    ['touchstart', 'touchmove', 'touchend', 'pointerdown', 'wheel'].forEach(function(ev){ list.addEventListener(ev, user, { passive: true }); });
    list.addEventListener('scroll', function(){ if (Date.now() > autoUntil) lastUser = Date.now(); }, { passive: true });   // інерція свайпу теж рахується
    tabs.addEventListener('click', user);
    new IntersectionObserver(function(es){ var was = inView; inView = es[0].isIntersecting; if (inView && !was) lastAuto = Date.now(); }, { threshold: .4 }).observe(list);
    function items(){ return [].filter.call(track.children, function(el){ return el.offsetParent && !el.classList.contains('pf-off'); }); }
    function next(){
      var its = items(); if (!its.length) return;
      var pad = parseFloat(getComputedStyle(list).scrollPaddingLeft) || 0;
      var lr = list.getBoundingClientRect(), x = list.scrollLeft, max = list.scrollWidth - list.clientWidth, target = null;
      for (var i = 0; i < its.length; i++) { var p = its[i].getBoundingClientRect().left - lr.left + x - pad; if (p > x + 8) { target = p; break; } }
      if (target === null || x >= max - 4) target = 0;
      autoUntil = Date.now() + 1000;
      list.scrollTo({ left: Math.min(target, max), behavior: 'smooth' });
    }
    (function loop(){
      setTimeout(loop, 300);
      if (!mq.matches || reduce || !inView || document.hidden || tabs.classList.contains('pf-m-other') || !tabs.classList.contains('pf-film')) return;
      var now = Date.now();
      if (now - lastUser < IDLE || now - lastAuto < PAGE) return;
      lastAuto = now; next();
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
