
(function(){
  var mq = window.matchMedia ? matchMedia('(max-width:767px)') : null; if (!mq) return;
  var IG_DM = 'https://ig.me/m/photo_zhenshen';
  function init(){
    var s = document.querySelector('[data-pr]'); if (!s || s._zp) return; s._zp = true;
    var waA = document.querySelector('.hero-cta a[href*="wa.me"]');
    var WA = (waA ? waA.getAttribute('href') : 'https://wa.me/380985111583').split('?')[0];
    function hw(h){ var a = h % 10, b = h % 100; if (a === 1 && b !== 11) return 'годину'; if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'години'; return 'годин'; }
    var p = document.createElement('div'); p.className = 'zp'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('aria-labelledby', 'zp-t');
    p.innerHTML = '<div class="zp-card"><button type="button" class="zp-x" aria-label="Закрити"></button>' +
      '<p class="zp-eyebrow"></p><h3 class="zp-title" id="zp-t">Напишіть Жені</h3>' +
      '<p class="zp-sub">Перше повідомлення вже готове — можна дописати своє:</p>' +
      '<textarea class="zp-msg" rows="3" aria-label="Повідомлення Жені"></textarea>' +
      '<a class="zp-ig" target="_blank" rel="noopener">Написати в Instagram</a>' +
      '<p class="zp-note">Текст скопіюється — у чаті просто вставте його</p>' +
      '<a class="zp-wa" target="_blank" rel="noopener">WhatsApp</a></div>';
    document.body.appendChild(p);
    var eb = p.querySelector('.zp-eyebrow'), msg = p.querySelector('.zp-msg'), igB = p.querySelector('.zp-ig'), waB = p.querySelector('.zp-wa'), x = p.querySelector('.zp-x');
    igB.href = IG_DM;
    function syncWa(){ waB.href = WA + '?text=' + encodeURIComponent(msg.value); }
    msg.addEventListener('input', syncWa);
    var last = null;
    function info(card){
      var nameEl = card.querySelector('.pr-name-hero, .pr-name');
      var name = nameEl ? (nameEl.childNodes[0] && nameEl.childNodes[0].nodeType === 3 ? nameEl.childNodes[0].textContent : nameEl.textContent).trim() : 'зйомка';
      var num = card.querySelector('.pr-num-hero, .pr-num');
      var price = num ? num.textContent.trim() + ' грн' : '';
      var lower = name.charAt(0).toLowerCase() + name.slice(1);
      if (card.classList.contains('pr-hero')) {
        var on = card.querySelector('.pr-seg-btn.is-on'); var h = on ? parseInt(on.textContent, 10) || 1 : 1;
        return { eb: name + ' · ' + h + ' ' + hw(h) + ' · ' + price, text: 'Привіт, Женю! Мене цікавить ' + lower + ' на ' + h + ' ' + hw(h) + '. Які дати вільні?' };
      }
      if (/донат/i.test(name)) return { eb: name + ' · ' + price, text: 'Привіт, Женю! Хочу на портрети за донат. Коли найближча зйомка?' };
      return { eb: name + ' · ' + price, text: 'Привіт, Женю! Мене цікавить ' + lower + '. Які дати вільні?' };
    }
    function open(card){
      var i = info(card); eb.textContent = i.eb; msg.value = i.text; syncWa(); last = card;
      p.classList.add('is-open'); document.documentElement.classList.add('zp-lock');
      if (window.__lenis) window.__lenis.stop();
      setTimeout(function(){ igB.focus({ preventScroll: true }); }, 80);
    }
    function close(){ p.classList.remove('is-open'); document.documentElement.classList.remove('zp-lock'); if (window.__lenis) window.__lenis.start(); }
    s.addEventListener('click', function(e){
      if (!mq.matches) return;
      var t = e.target;
      if (t.closest('.pr-seg-btn, .pr-hours, [data-tip], .pr-q-btn, .pr-q, a, button')) return;
      var card = t.closest('.pr-hero, .pr-card'); if (!card) return;
      open(card);
    });
    function copy(){
      var v = msg.value;
      try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(v); return; } } catch (er) {}
      try { msg.focus(); msg.select(); document.execCommand('copy'); } catch (er) {}
    }
    igB.addEventListener('click', function(){ copy(); setTimeout(close, 300); });
    waB.addEventListener('click', function(){ setTimeout(close, 300); });
    x.addEventListener('click', close);
    p.addEventListener('click', function(e){ if (e.target === p) close(); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && p.classList.contains('is-open')) close(); });
    if (mq.addEventListener) mq.addEventListener('change', function(){ if (!mq.matches) close(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
