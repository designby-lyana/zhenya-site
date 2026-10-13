
(function(){
  function init(){
    var imgs = [].slice.call(document.querySelectorAll('.album-gallery-slot .w-dyn-item img[src]'));
    if (!imgs.length) return;
    var L = function(d){ return d === 'l' ? '<svg width="26" height="26" fill="none" stroke="#F2F0EA" stroke-width="1.2"><path d="M16 4 7 13l9 9"/></svg>' : d === 'r' ? '<svg width="26" height="26" fill="none" stroke="#F2F0EA" stroke-width="1.2"><path d="m10 4 9 9-9 9"/></svg>' : '<svg width="22" height="22" fill="none" stroke="#F2F0EA" stroke-width="1.2"><path d="M4 4l14 14M18 4 4 18"/></svg>'; };
    var o = document.createElement('div'); o.className = 'alb'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'Перегляд фото');
    o.innerHTML = '<div class="alb-stage"><img class="alb-img" alt=""><span class="alb-count"></span>' +
      '<button type="button" class="alb-btn alb-prev" aria-label="Попереднє фото">' + L('l') + '</button>' +
      '<button type="button" class="alb-btn alb-next" aria-label="Наступне фото">' + L('r') + '</button>' +
      '<button type="button" class="alb-btn alb-x" aria-label="Закрити">' + L('x') + '</button></div><div class="alb-strip"></div>';
    document.body.appendChild(o);
    var big = o.querySelector('.alb-img'), cnt = o.querySelector('.alb-count'), strip = o.querySelector('.alb-strip'), stage = o.querySelector('.alb-stage');
    var ths = imgs.map(function(im, i){ var b = document.createElement('button'); b.type = 'button'; b.className = 'alb-th'; b.setAttribute('aria-label', 'Фото ' + (i + 1)); b.style.backgroundImage = 'url("' + (im.currentSrc || im.src) + '")'; b.addEventListener('click', function(){ show(i); }); strip.appendChild(b); return b; });
    var cur = 0, last = null;
    function src(im){ return im.getAttribute('src'); }
    function show(i){
      cur = (i + imgs.length) % imgs.length; var im = imgs[cur];
      big.classList.remove('in'); void big.offsetWidth; big.src = src(im); big.alt = im.alt || ''; big.classList.add('in');
      cnt.textContent = (cur + 1) + ' / ' + imgs.length;
      ths.forEach(function(t, k){ t.classList.toggle('on', k === cur); });
      if (ths[cur].scrollIntoView) ths[cur].scrollIntoView({ block: 'nearest', inline: 'center' });
      [cur + 1, cur - 1].forEach(function(k){ var p = imgs[(k + imgs.length) % imgs.length]; var pre = new Image(); pre.src = src(p); });
    }
    function open(i){ last = document.activeElement; show(i); o.classList.add('is-open'); document.documentElement.classList.add('alb-lock'); setTimeout(function(){ o.querySelector('.alb-x').focus({ preventScroll: true }); }, 60); }
    function close(){ o.classList.remove('is-open'); document.documentElement.classList.remove('alb-lock'); if (last && last.focus) last.focus({ preventScroll: true }); }
    imgs.forEach(function(im, i){ im.setAttribute('tabindex', '0'); im.setAttribute('role', 'button'); im.addEventListener('click', function(){ open(i); }); im.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } }); });
    o.querySelector('.alb-prev').addEventListener('click', function(e){ e.stopPropagation(); show(cur - 1); });
    o.querySelector('.alb-next').addEventListener('click', function(e){ e.stopPropagation(); show(cur + 1); });
    o.querySelector('.alb-x').addEventListener('click', close);
    stage.addEventListener('click', function(e){ if (e.target === stage) close(); });
    document.addEventListener('keydown', function(e){ if (!o.classList.contains('is-open')) return; if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') show(cur + 1); else if (e.key === 'ArrowLeft') show(cur - 1); });
    var sx = 0, sy = 0, on = false;
    o.addEventListener('touchstart', function(e){ var t = e.touches[0]; sx = t.clientX; sy = t.clientY; on = true; }, { passive: true });
    o.addEventListener('touchend', function(e){ if (!on) return; on = false; var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) show(cur + (dx < 0 ? 1 : -1)); else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5) close(); }, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
