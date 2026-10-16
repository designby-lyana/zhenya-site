
(function(){
  var FILM_MAX = 10;          // скільки кадрів у плівці, решта — у сітці «Усі роботи»
  var GRID_ROWS = 3;          // скільки рядів сітки видно одразу; «Показати ще» додає стільки ж
  var tabs = document.querySelector('.w-tabs'); if (!tabs) return;
  var pane = tabs.querySelector('.w-tab-pane .filter-bar'); pane = pane && pane.closest('.w-tab-pane'); if (!pane) return;
  var track = pane.querySelector('.gallery'); if (!track) return;
  track.setAttribute('data-pf-track', '');           // стала мітка стрічки (клас pf-track знімається в режимі сітки)
  var list = track.parentElement;                    // .w-dyn-list — його й фіксуємо
  var sec = tabs.closest('section'); if (sec) sec.classList.add('pf-film-sec');
  var items = [].slice.call(track.children);
  var header = document.querySelector('.site-header');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = matchMedia('(max-width: 767px)');
  var cat = 'all', grid = false, dist = 0, raf = 0, gridShown = 0, lead = 0;   // lead — з якого відступу справа стартує плівка
  var filmN = 0;              // скільки кадрів саме в цьому ряду (для лічильника)
  // кадри, яких не показуємо у плівці (у сітці «Усі роботи» вони лишаються) — частина назви файлу
  var SKIP = ['chb-portret-shezlong', 'teplo-tato-malyuk'];
  // кадри, які в плівці показуємо крупніше: назва файлу → масштаб і точка, до якої наближаємо
  var ZOOM = { 'chb-portret-pryamyi-poglyad': ['1.45', '50% 28%'] };
  var REVEAL = 0.2;           // на якій частці плівки проявляються таби й чіпи (до того їх не видно зовсім)
  var menu = tabs.querySelector('.tabs-menu'), fbar = pane.querySelector('.filter-bar');
  var revealed = reduce;      // хто просив менше руху — інструменти одразу
  tabs.classList.add(revealed ? 'pf-tools-in' : 'pf-tools-wait');
  function reveal(){ if (revealed) return; revealed = true; tabs.classList.remove('pf-tools-wait'); tabs.classList.add('pf-tools-in'); }
  // таби й чіпи тримаються над плівкою: коли плівка відлипає й їде вгору — вони їдуть разом із нею
  function follow(off){
    var t = off < 0 ? 'translateY(' + off.toFixed(1) + 'px)' : '';
    if (menu && menu.style.transform !== t) menu.style.transform = t;
    if (fbar && fbar.style.transform !== t) fbar.style.transform = t;
  }
  // мишка біля таб/чіпів (±70px) — показуємо на 100% (лише після того, як вони проявились)
  function near(x, y){
    return [menu, fbar].some(function(el){
      if (!el || !el.offsetParent) return false;
      var r = el.getBoundingClientRect();
      return x > r.left - 70 && x < r.right + 70 && y > r.top - 70 && y < r.bottom + 70;
    });
  }
  var mraf = 0;
  addEventListener('mousemove', function(e){
    if (mraf || !revealed) return;
    mraf = requestAnimationFrame(function(){ mraf = 0; tabs.classList.toggle('pf-tools-on', near(e.clientX, e.clientY)); });
  }, { passive: true });
  // дотик: торкнулись поруч — показуємо на 4 с
  var tt;
  addEventListener('touchstart', function(e){
    var t = e.touches[0]; if (!revealed || !t || !near(t.clientX, t.clientY)) return;
    tabs.classList.add('pf-tools-on'); clearTimeout(tt);
    tt = setTimeout(function(){ tabs.classList.remove('pf-tools-on'); }, 4000);
  }, { passive: true });

  list.classList.add('pf-sticky');
  // нульова мітка перед списком — її позиція не «їде», коли список прилипає
  var mark = document.createElement('div'); mark.style.height = '0'; list.parentNode.insertBefore(mark, list);
  items.forEach(function(it){
    var im = it.querySelector('.gallery-img');
    function ar(){ if (im && im.naturalWidth) { it.style.setProperty('--pf-ar', im.naturalWidth + '/' + im.naturalHeight); measure(); } }
    if (im) { if (im.complete) ar(); else im.addEventListener('load', ar); }
    it._cats = (it.querySelector('.cat-tags') || {}).textContent || '';
    var src = im ? (im.getAttribute('src') || '') : '';
    it._skip = SKIP.some(function(k){ return src.indexOf(k) > -1; });
    Object.keys(ZOOM).forEach(function(k){ if (src.indexOf(k) > -1) { it.style.setProperty('--pf-zoom', ZOOM[k][0]); it.style.setProperty('--pf-zo', ZOOM[k][1]); } });
  });

  // картка в кінці плівки
  var more = document.createElement('a');
  more.href = '#'; more.className = 'pf-more';
  more.innerHTML = '<b>Усі роботи</b><span>Відкрити сіткою</span>';
  track.appendChild(more);
  more.addEventListener('click', function(e){ e.preventDefault(); setGrid(true); });

  // підказка і смужка прогресу під плівкою
  var hint = document.createElement('div'); hint.className = 'pf-hint';
  hint.innerHTML = '<div class="pf-bar"><i></i></div><div class="pf-count"></div>';
  list.appendChild(hint);
  var bar = hint.querySelector('i'), count = hint.querySelector('.pf-count');

  // лічильник: який кадр зараз із тих, що є в ряду (p — прогрес плівки від 0 до 1)
  function setCount(p){
    if (grid || !filmN) return;
    var cur = Math.min(filmN, Math.floor(Math.max(0, p) * filmN) + 1);
    var t = cur + ' із ' + filmN + ' · гортайте';
    if (count.textContent !== t) count.textContent = t;
  }

  // кнопка під сіткою: «Показати ще» → … → «Згорнути» (повертає до плівки)
  var gm = document.createElement('div'); gm.className = 'pf-gm-wrap';
  gm.innerHTML = '<a href="#" class="pf-gm"></a>';
  list.parentNode.insertBefore(gm, list.nextSibling);
  var gmBtn = gm.firstChild;
  function step(){ var n = getComputedStyle(track).gridTemplateColumns.split(' ').filter(Boolean).length || 4; return n * GRID_ROWS; }
  gmBtn.addEventListener('click', function(e){
    e.preventDefault();
    if (gmBtn.getAttribute('data-end')) { if (cat !== 'all') pick(chips[0]); setGrid(false); var y = pane.getBoundingClientRect().top + scrollY - 120; scrollTo({ top: y }); return; }
    gridShown += step(); apply();
  });

  function matches(it){ return cat === 'all' || it._cats.indexOf(cat) > -1; }

  function apply(){
    var shown = 0, total = 0, limit = grid ? gridShown : FILM_MAX;
    items.forEach(function(it){
      var ok = matches(it) && (grid || !it._skip); if (ok) total++;
      var inFilm = ok && shown < limit; if (inFilm) shown++;
      it.classList.toggle('pf-off', !inFilm);
      // перші 3 кадри плівки вантажимо одразу, решту — коли під'їжджають (див. tick)
      if (inFilm && shown <= 3) { var im = it.querySelector('.gallery-img'); if (im && im.loading === 'lazy') im.loading = 'eager'; }
    });
    more.style.display = (!grid && total > FILM_MAX) ? '' : 'none';
    gm.style.display = grid ? '' : 'none';
    if (grid) { var left = total - shown; gmBtn.textContent = left > 0 ? 'Показати ще · ' + Math.min(left, step()) : 'Згорнути'; if (left > 0) gmBtn.removeAttribute('data-end'); else gmBtn.setAttribute('data-end', '1'); }
    // у лічильнику — реальна кількість кадрів у цьому ряду, а не всіх робіт
    filmN = grid ? 0 : shown;
    count.textContent = '';
    setCount(0);
    measure();
  }

  function setGrid(on){
    grid = on;
    tabs.classList.toggle('pf-film', !grid);
    hint.style.display = grid ? 'none' : '';
    if (on) { track.classList.remove('pf-track'); track.style.transform = ''; pane.style.height = ''; gridShown = cat !== 'all' ? 1e9 : step(); reveal(); follow(0); }   // категорію показуємо всю одразу, «Усі роботи» — порціями
    else track.classList.add('pf-track');
    apply();
    if (on) { var y = pane.getBoundingClientRect().top + scrollY - 120; scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); }
  }

  function swipe(){ return small.matches || reduce; }

  function measure(){
    if (!bar || grid || !pane.offsetParent) return;   // ще не все зібрано (фото з кешу могли завантажитись раніше)
    tabs.classList.toggle('pf-swipe', swipe());
    var hh = header ? header.getBoundingClientRect().height : 0;
    var h = Math.max(320, Math.min(640, innerHeight - hh - 170));
    // на телефоні кадр ~78% ширини, щоб з-за краю виглядав наступний і було видно, що гортається
    if (swipe()) h = Math.min(innerHeight * 0.58, 520, (list.clientWidth || innerWidth) * 0.78 * 1.25);
    tabs.style.setProperty('--pf-h', h + 'px');
    var listH = list.getBoundingClientRect().height;
    tabs.style.setProperty('--pf-top', Math.max(hh + 16 + 80, (innerHeight - listH) / 2 + hh / 2 + 40) + 'px');   // +80 — місце для таб і чіпів над плівкою
    if (swipe()) { lead = 0; pane.style.height = ''; track.style.transform = ''; follow(0); return; }
    // старт: перші два кадри стоять у правій частині екрана, зліва порожньо; прокрутка тягне стрічку вліво
    var vis = [].filter.call(track.children, function(el){ return el.offsetParent; });
    lead = 0;
    if (vis.length > 1) lead = Math.max(0, list.clientWidth - (vis[1].offsetLeft + vis[1].offsetWidth - vis[0].offsetLeft));
    dist = Math.max(0, track.scrollWidth - list.clientWidth) + lead;
    // панель стає вищою рівно на довжину плівки — це і є «прокрутка вбік»
    pane.style.height = (mark.offsetTop + listH + dist) + 'px';
    tick();
  }

  function tick(){
    raf = 0;
    if (grid || swipe() || !pane.offsetParent) return;
    var pfTop = parseFloat(getComputedStyle(tabs).getPropertyValue('--pf-top'));
    var start = mark.getBoundingClientRect().top - pfTop;
    var p = dist ? Math.min(1, Math.max(0, -start / dist)) : 0;
    track.style.transform = 'translate3d(' + (lead - p * dist) + 'px,0,0)';
    bar.style.transform = 'scaleX(' + p + ')';
    setCount(p);
    // плівка відлипла й їде вгору — таби й чіпи їдуть разом з нею
    follow(Math.min(0, list.getBoundingClientRect().top - pfTop));
    // плівка зсувається трансформом, тож браузер сам «не бачить», що кадр близько, — довантажуємо за два екрани наперед
    var shift = lead - p * dist, ahead = list.clientWidth * 2;
    items.forEach(function(it){
      if (it.classList.contains('pf-off')) return;
      var im = it.querySelector('.gallery-img');
      if (im && im.loading === 'lazy' && it.offsetLeft + shift < ahead) im.loading = 'eager';
    });
    if (p >= REVEAL) reveal();
  }
  addEventListener('scroll', function(){ if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
  var rt; addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(measure, 120); });
  addEventListener('load', measure);
  small.addEventListener && small.addEventListener('change', measure);
  tabs.addEventListener('click', function(){ setTimeout(measure, 80); });

  // телефон: свайп плівки — оновлюємо лічильник; трохи свайпнули — проявляємо інструменти
  list.addEventListener('scroll', function(){
    if (!swipe()) return;
    var d = list.scrollWidth - list.clientWidth;
    if (d > 0) setCount(list.scrollLeft / d);
    if (d > 0 && list.scrollLeft / d >= REVEAL) reveal();
  }, { passive: true });

  // Tab по кадрах: сторінка докручується, щоб сфокусований кадр потрапив у кадр
  track.addEventListener('focusin', function(e){
    if (grid || swipe()) return;
    var it = e.target.closest('.w-dyn-item, .pf-more'); if (!it) return;
    var x = it.offsetLeft - (list.clientWidth - it.offsetWidth) / 2;
    var p = dist ? Math.min(1, Math.max(0, (x + lead) / dist)) : 0;
    var top = mark.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(tabs).getPropertyValue('--pf-top'));
    scrollTo({ top: top + p * dist });
  });

  // чіпи-фільтри.
  // «Усі» — плівка (горизонтальна стрічка). Будь-яка категорія — одразу сітка з усіма її кадрами,
  // як у «Останніх»: так видно всю категорію одразу, без гортання вбік. «Згорнути» під сіткою повертає до «Усі».
  var chips = [].slice.call(pane.querySelectorAll('.chip'));
  function pick(c){
    chips.forEach(function(x){ x.classList.toggle('is-active', x === c); });
    cat = c.getAttribute('data-cat') === 'all' ? 'all' : c.textContent.trim();
  }
  chips.forEach(function(c){
    c.addEventListener('click', function(e){
      e.preventDefault();
      pick(c);
      if (cat !== 'all') { setGrid(true); return; }
      if (grid) setGrid(false); else apply();
      var y = pane.getBoundingClientRect().top + scrollY - 120;
      if (scrollY > y) scrollTo({ top: y });
      var sc = list; if (swipe()) sc.scrollLeft = 0;
    });
  });

  setGrid(false);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
})();
