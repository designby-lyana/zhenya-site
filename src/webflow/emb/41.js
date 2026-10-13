
(function(){
  function fix(){
    [].forEach.call(document.querySelectorAll('.album-card[data-album]'), function(c){
      var s = c.getAttribute('data-album'); if (!s) return;
      [].forEach.call(c.querySelectorAll('a'), function(a){ a.setAttribute('href', '/albums/' + s); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fix); else fix();
})();
