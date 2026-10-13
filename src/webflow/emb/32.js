
(function(){
  function init(){
    var p = document.querySelector('.zp'); if (!p) return setTimeout(init, 300);
    var note = p.querySelector('.zp-note'), ig = p.querySelector('.zp-ig'); if (!note || !ig || note._done) return; note._done = true;
    note.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C93A6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg><span>Повідомлення скопіюється — у чаті Instagram <b>вставте його</b> і надішліть</span>';
    ig.parentNode.insertBefore(note, ig);
    var label = ig.textContent;
    ig.addEventListener('click', function(){ ig.textContent = 'Скопійовано ✓'; setTimeout(function(){ ig.textContent = label; }, 2500); });
  }
  if (document.readyState === 'complete') init(); else window.addEventListener('load', init);
})();
