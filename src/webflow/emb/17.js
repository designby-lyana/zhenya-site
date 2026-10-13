
(function(){
  var AVA = 'https://cdn.prod.website-files.com/6a65e6828ad7099333ebb2c2/6ab4f49770d828296938d6a0_zh-ig-avatar.jpg';
  function split(eb){
    if (eb.querySelector('.zp-l1')) return;
    var t = eb.textContent, k = t.lastIndexOf(' · ');
    if (k < 0 || !/грн/.test(t.slice(k))) return;
    var a = document.createElement('span'); a.className = 'zp-l1'; a.textContent = t.slice(0, k);
    var b = document.createElement('span'); b.className = 'zp-l2'; b.textContent = t.slice(k + 3);
    eb.textContent = ''; eb.appendChild(a); eb.appendChild(b);
  }
  function init(){
    var eb = document.querySelector('.zp-eyebrow');
    if (!eb) return setTimeout(init, 300);
    var card = eb.parentNode, msg = card.querySelector('.zp-msg'), title = card.querySelector('.zp-title');
    var fa = document.querySelector('.ig-ava img');
    var chat = document.createElement('div'); chat.className = 'zp-chat'; chat.setAttribute('aria-hidden', 'true');
    chat.innerHTML = '<span class="zp-ava"><img alt=""></span><span class="zp-who"><span class="zp-nick">photo_zhenshen</span><span class="zp-name">Євгенія Бичкова</span></span>';
    chat.querySelector('img').src = fa ? (fa.currentSrc || fa.src) : AVA;
    card.insertBefore(chat, title);
    var hint = document.createElement('p'); hint.className = 'zp-edit'; hint.textContent = 'Текст можна змінити';
    msg.parentNode.insertBefore(hint, msg.nextSibling);
    function grow(){ msg.style.height = 'auto'; msg.style.height = msg.scrollHeight + 'px'; }
    msg.addEventListener('input', grow);
    new MutationObserver(function(){ split(eb); requestAnimationFrame(grow); }).observe(eb, { childList: true, characterData: true, subtree: true });
    split(eb);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
