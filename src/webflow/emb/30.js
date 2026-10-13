
(function(){
  var dq = window.matchMedia('(min-width:768px)');
  function hw(h){ var a = h % 10, b = h % 100; if (a === 1 && b !== 11) return 'годину'; if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'години'; return 'годин'; }
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
  function init(){
    var s = document.querySelector('[data-pr]'), p = document.querySelector('.zp');
    if (!s || !p) return setTimeout(init, 300);
    if (s._zpd) return; s._zpd = true;
    var eb = p.querySelector('.zp-eyebrow'), msg = p.querySelector('.zp-msg'), ig = p.querySelector('.zp-ig');
    s.addEventListener('click', function(e){
      if (!dq.matches) return;
      var t = e.target;
      if (t.closest('.pr-seg-btn, .pr-hours, [data-tip], .pr-q-btn, .pr-q, a, button')) return;
      var card = t.closest('.pr-hero, .pr-card'); if (!card) return;
      var i = info(card);
      eb.textContent = i.eb; msg.value = i.text; msg.dispatchEvent(new Event('input'));
      p.classList.add('is-open'); document.documentElement.classList.add('zp-lock');
      if (window.__lenis) window.__lenis.stop();
      setTimeout(function(){ msg.style.height = 'auto'; msg.style.height = msg.scrollHeight + 'px'; if (ig) ig.focus({ preventScroll: true }); }, 80);
    });
  }
  if (document.readyState === 'complete') init(); else window.addEventListener('load', init);
})();
