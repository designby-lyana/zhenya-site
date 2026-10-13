
(function(){
  var s = document.querySelector('[data-pr]');
  if (!s) return;
  var $ = function(q){ return s.querySelector(q); };
  var price = $('[data-pr-price]'), cap = $('[data-pr-caption]'), ind = $('[data-pr-ind]');
  var btns = [].slice.call(s.querySelectorAll('[data-h]'));
  var n = btns.length || 1;
  // Підпис під ціною для кожної кількості годин
  var WORDS = ['', 'за першу годину', 'за дві години', 'за три години', 'за чотири години', 'за пʼять годин', 'за шість годин'];
  // На останній кнопці додається правило для довших зйомок
  var MORE = ' · кожна наступна +500 грн';

  // Ціни й підписи беруться з кнопок (data-price / data-per — їх задає адмінка), інакше — стара формула
  function btnOf(h){ for (var i = 0; i < btns.length; i++) if (+btns[i].getAttribute('data-h') === h) return btns[i]; return null; }
  function calc(h){ var b = btnOf(h); if (b && b.getAttribute('data-price')) return b.getAttribute('data-price'); return h <= 1 ? 2500 : 4000 + 500 * (h - 2); }
  function fmt(x){ return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  // фіксуємо ширину числа: пробуємо всі варіанти годин, беремо найширший
  function lockWidth(){
    if (!price) return;
    var cur = price.textContent, mx = 0;
    price.style.display = 'inline-block';
    price.style.minWidth = '';
    for (var h = 1; h <= n; h++) { price.textContent = fmt(calc(h)); mx = Math.max(mx, price.getBoundingClientRect().width); }
    price.textContent = cur;
    if (mx) price.style.minWidth = Math.ceil(mx) + 'px';
  }

  function asButton(el, fn){
    el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.removeAttribute('href');
    el.addEventListener('click', function(e){ e.preventDefault(); fn(); });
    el.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
  }

  function setHours(h){
    if (price) price.textContent = fmt(calc(h));
    var bb = btnOf(h);
    if (cap) cap.textContent = (bb && bb.getAttribute('data-per')) ? bb.getAttribute('data-per') : (WORDS[h] || ('за ' + h + ' год')) + (h === n ? MORE : '');
    if (ind) { ind.style.width = (100 / n) + '%'; ind.style.left = (100 / n * (h - 1)) + '%'; }
    btns.forEach(function(b){
      var on = +b.getAttribute('data-h') === h;
      b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  btns.forEach(function(b){ asButton(b, function(){ setHours(+b.getAttribute('data-h')); }); });
  setHours(1);
  lockWidth();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(lockWidth);
  window.addEventListener('load', lockWidth);
  var lr; window.addEventListener('resize', function(){ clearTimeout(lr); lr = setTimeout(lockWidth, 150); });

  if (!document.documentElement.classList.contains('pr-anim')) return;
  var els = [].slice.call(s.querySelectorAll('[data-rv]'));
  var io = new IntersectionObserver(function(entries){
    var k = 0;
    entries.forEach(function(en){
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      var el = en.target;
      setTimeout(function(){ el.classList.add('is-in'); }, (k++) * 140);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  els.forEach(function(el){ io.observe(el); });
})();
