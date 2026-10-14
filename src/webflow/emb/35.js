
(function(){
  var g=4, box=document.getElementById("zf"); if(!box) return;
  var reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C="https://cdn.prod.website-files.com/6a65e6828ad7099333ebb2c2/";
  var rt; function later(){ clearTimeout(rt); rt=setTimeout(lay,100); }
  var tiles=[].slice.call(box.querySelectorAll(".zf-i"));
  tiles.forEach(function(el){
    var b=el.getAttribute("data-img"), v=el.getAttribute("data-v"), s=el.getAttribute("data-src");
    if(b||s){ var im=document.createElement("img"); im.alt=""; im.loading="lazy"; im.decoding="async";
      /* фото, додане через адмінку: готові адреси з data-src / data-srcset */
      if(s){ im.src=s; var ss=el.getAttribute("data-srcset"); if(ss){ im.srcset=ss; im.sizes="(max-width:767px) 50vw, (max-width:991px) 33vw, 20vw"; } }
      else if(el.hasAttribute("data-full")) im.src=C+b+".jpg";
      else { im.srcset=C+b+"-p-500.jpg 500w, "+C+b+"-p-800.jpg 800w, "+C+b+"-p-1080.jpg 1080w"; im.sizes="(max-width:767px) 50vw, (max-width:991px) 33vw, 20vw"; im.src=C+b+"-p-500.jpg"; }
      if(el.hasAttribute("data-auto")) im.addEventListener("load",function(){ if(im.naturalWidth){ el.style.setProperty("--ar",im.naturalWidth+"/"+im.naturalHeight); el.removeAttribute("data-auto"); later(); } });
      el.appendChild(im); }
    else if(v){ var vd=document.createElement("video"); vd.setAttribute("data-src",C+v+".mp4"); vd.poster=C+el.getAttribute("data-p")+".jpg";
      vd.muted=true; vd.loop=true; vd.playsInline=true; vd.setAttribute("playsinline",""); vd.preload="none"; el.appendChild(vd); }
  });
  function cols(){var w=window.innerWidth; return w<768?2:(w<992?3:5);}
  function ar(v){var a=v.split("/");return parseFloat(a[1])/parseFloat(a[0]);}
  function arOf(el){ return ar(getComputedStyle(el).getPropertyValue("--ar").trim()||"3/4"); }
  function put(el,c,cw,top,eh){ el._c=c; el._t=Math.round(top); el.style.display=""; el.style.width=cw+"px"; el.style.height=eh+"px"; el.style.left=Math.round(c*(cw+g))+"px"; el.style.top=Math.round(top)+"px"; }

  function fillCols(list,H,cw){
    tiles.forEach(function(el){ el.classList.remove("zf-dim1","zf-dim2"); });
    list.forEach(function(c){
      var col=tiles.filter(function(el){ return el._c===c && el.style.display!=="none"; }).sort(function(p,q){ return p._t-q._t; });
      col.forEach(function(el){ if(el._t>H-40) el.style.display="none"; });
      col=col.filter(function(el){ return el.style.display!=="none"; });
      var last=col[col.length-1], prev=col[col.length-2]; if(!last) return;
      if(H-last._t<cw*.45 && prev){ last.style.display="none"; last=prev; prev=col[col.length-3]; }
      last.style.height=(H-last._t)+"px";
      last.classList.add("zf-dim1"); if(prev) prev.classList.add("zf-dim2");
    });
  }

  var side=null, stack=null, dotsBox=null, cards=[], dots=[], colsNode=null, colsHome=null;
  function stacked(){ return cols()===5 && !!side && cards.length>1; }

  function moveCols(on){
    if(!colsNode) return;
    if(on && colsNode.parentNode!==side){ side.appendChild(colsNode); }
    else if(!on && colsHome && colsNode.parentNode===side){ colsHome.parentNode.insertBefore(colsNode,colsHome); }
  }

  function lay(){
    var n=cols(), W=box.clientWidth; if(!W) return;
    var st=stacked();
    document.documentElement.classList.toggle('fr-stacked', st);
    moveCols(st);
    var ft=document.querySelector(".site-footer"), TAIL=ft ? ft.offsetHeight : 260;
    var cw=(W-g*(n-1))/n, h=new Array(n).fill(0);
    if(!st){
      var V=0;
      var pk=function(){ var b=0; for(var i=1;i<h.length;i++) if(h[i]<h[b]) b=i; return b; };
      tiles.forEach(function(el){
        if(!V && el.hasAttribute("data-tail")) V=h[pk()]-g;
        var eh=Math.round(cw*arOf(el)), c=pk(); put(el,c,cw,h[c],eh); h[c]+=eh+g;
      });
      var H=Math.min((V||Math.min.apply(null,h)-g)+TAIL, Math.min.apply(null,h)-g);
      box.style.height=H+"px";
      fillCols(h.map(function(x,i){ return i; }),H,cw);
      return;
    }
    var free=[0,1,2,4], Y=0, c4=[], rest=[];
    function pick(){ var b=free[0]; free.forEach(function(i){ if(h[i]<h[b]) b=i; }); return b; }
    tiles.forEach(function(el){
      if(el.hasAttribute("data-c4")){ c4.push(el); return; }
      var eh=Math.round(cw*arOf(el)), c=pick(); put(el,c,cw,h[c],eh); h[c]+=eh+g;
      if(el.hasAttribute("data-anchor")) Y=h[c]-g;
    });
    if(!Y) Y=Math.round(Math.min(h[0],h[1],h[2],h[4])*.6);
    var y=0;
    for(var k=0;k<c4.length;k++){
      var el=c4[k];
      if(Y-y<60){ rest.push(el); continue; }
      var eh=Math.round(cw*arOf(el));
      if(y+eh>Y || Y-(y+eh+g)<cw*.55) eh=Y-y;
      put(el,3,cw,y,eh); y+=eh+g;
    }
    rest.forEach(function(el){ var eh=Math.round(cw*arOf(el)), c=pick(); put(el,c,cw,h[c],eh); h[c]+=eh+g; });
    side.style.left=Math.round(3*(cw+g))+"px"; side.style.width=cw+"px"; side.style.top=(Y+g)+"px";
    var mx=sizeStack(cw);
    stack.style.transition="none"; stack.style.height=(mx+peek*2)+"px";
    side.style.height="auto";
    var need=side.offsetHeight;
    draw(); void stack.offsetWidth; stack.style.transition="";
    var others=Math.min(h[0],h[1],h[2],h[4])-g;
    var H=Math.max(Y+g+need+TAIL, Math.min(others, Y+g+need+TAIL+140));
    box.style.height=H+"px";
    var low=W>=1200 ? 22 : TAIL;
    side.style.height=(H-low-Y-g)+"px";
    fillCols(free,H,cw);
  }

  // ——— стопка відгуків ———
  var a=0, peek=14;
  function sizeStack(cw){
    var mx=0; cards.forEach(function(c){ c.style.transition="none"; c.style.height="auto"; });
    cards.forEach(function(c){ c._h=c.offsetHeight; mx=Math.max(mx,c._h); });
    void stack.offsetWidth; cards.forEach(function(c){ c.style.transition=""; });
    return mx;
  }
  function draw(){
    var n=cards.length, fh=cards[a] && cards[a]._h;
    if(fh && stack) stack.style.height=(fh+peek*2)+'px';
    cards.forEach(function(c,k){
      var y,s,b,o,bl=0,r=0,d=a-k;
      if(k<=a){ y=-peek*Math.min(d,2); s=1-0.05*Math.min(d,2); b=1-0.22*Math.min(d,2); o=d>2?0:1; }
      else { y=70; s=.96; b=1; o=0; bl=6; r=(k%2?1.6:-1.6); }
      c.style.setProperty('--y',y+'px'); c.style.setProperty('--s',s.toFixed(3)); c.style.setProperty('--b',b.toFixed(3));
      c.style.setProperty('--o',o); c.style.setProperty('--r',r+'deg'); c.style.setProperty('--bl',bl+'px');
      if(fh) c.style.height=fh+'px';
      c.style.zIndex=k+1;
      c.classList.toggle('is-out',k>a); c.classList.toggle('is-back',k<a); c.classList.toggle('is-front',k===a);
      c.setAttribute('aria-hidden',k===a?'false':'true');
    });
    dots.forEach(function(d,k){ d.setAttribute('aria-current',k===a?'true':'false'); });
  }
  function go(k){ var n=cards.length; a=((k%n)+n)%n; draw(); }
  function replay(){ var f=cards[a]; if(!f || reduce) return; f.classList.remove('is-front'); void f.offsetWidth; f.classList.add('is-front'); }

  // автопрогравання: поки стопка на екрані, вкладка активна і курсор не над нею
  var inView=false, hover=false, holdUntil=0, timer=0;
  function loop(first){
    clearTimeout(timer);
    timer=setTimeout(function(){
      if(inView && !hover && !document.hidden && Date.now()>holdUntil && !reduce && stacked()) go(a+1);
      loop();
    }, first || (a===cards.length-1 ? 5200 : 3600));
  }
  function hold(){ holdUntil=Date.now()+7000; }

  // прокрутка: внизу сторінки рух ВНИЗ дезавгодно на екрані гортає відгуки по колу;
  // ВГОРУ з курсором строго над стопкою — відгуки назад (сторінка стоїть); ВГОРУ поза стопкою — сторінка
  var STEP=40, GAP=420, SETTLE=250, acc=0, racc=0, accT=0, lastStep=0, bottomAt=0;
  function atBottom(){ var el=document.scrollingElement||document.documentElement; return el.scrollHeight - window.innerHeight - (window.scrollY||el.scrollTop) <= 6; }
  function inStack(e){ if(!stack) return false; var r=stack.getBoundingClientRect(); return e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom; }
  function next(now){ go(a+1); hold(); lastStep=now; acc=0; }
  function onWheel(e){
    if(!stacked() || !inView) return;
    var d=Math.abs(e.deltaY)>=Math.abs(e.deltaX)?e.deltaY:0; if(!d) return;
    if(e.deltaMode===1) d*=16; else if(e.deltaMode===2) d*=innerHeight;
    var now=Date.now();
    if(d<0){
      acc=0; bottomAt=0;
      if(!inStack(e)){ racc=0; return; }            // вгору поза стопкою — сторінка їде вгору
      e.preventDefault(); e.stopPropagation();        // вгору над стопкою — попередній відгук
      if(now-accT>200) racc=0;
      accT=now; racc-=d;
      if(racc>=STEP && now-lastStep>=GAP){ go(a-1); hold(); lastStep=now; racc=0; }
      return;
    }
    racc=0;
    if(!atBottom()){ bottomAt=0; return; }            // ще не докрутили до низу — прокручуємо сторінку
    e.preventDefault(); e.stopPropagation();
    if(!bottomAt){ bottomAt=now; return; }
    if(now-bottomAt<SETTLE) return;                   // інерція скролу до низу не гортає картки
    if(now-accT>200) acc=0;
    accT=now; acc+=d;
    if(acc>=STEP && now-lastStep>=GAP) next(now);
  }
  function onKey(e){
    if(!stacked() || !inView || !atBottom()) return;
    var t=e.target; if(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName))) return;
    if(e.key==='ArrowDown' || e.key==='PageDown' || (e.key===' ' && !e.shiftKey)){ e.preventDefault(); var now=Date.now(); if(now-lastStep>=GAP) next(now); }
  }

  function build(){
    var src=[].slice.call(document.querySelectorAll('#fr .fr-card')); if(src.length<2 || side) return;
    side=document.createElement('div'); side.className='zf-side';
    stack=document.createElement('div'); stack.className='zf-stack'; stack.tabIndex=0;
    stack.setAttribute('role','region'); stack.setAttribute('aria-roledescription','стопка відгуків'); stack.setAttribute('aria-label','Що пишуть після зйомки — стрілки вгору/вниз гортають');
    src.forEach(function(c){ var k=c.cloneNode(true); stack.appendChild(k); cards.push(k); });
    dotsBox=document.createElement('div'); dotsBox.className='zf-dots';
    cards.forEach(function(c,k){ var b=document.createElement('button'); b.type='button'; b.setAttribute('aria-label','Відгук '+(k+1));
      b.addEventListener('click',function(){ go(k); hold(); }); dotsBox.appendChild(b); dots.push(b); });
    side.appendChild(stack); side.appendChild(dotsBox);
    box.appendChild(side);
    colsNode=document.querySelector('.site-footer .footer-cols');
    if(colsNode){ colsHome=document.createComment('footer-cols'); colsNode.parentNode.insertBefore(colsHome,colsNode); }
    window.addEventListener('wheel',onWheel,{passive:false,capture:true});
    window.addEventListener('keydown',onKey,true);
    stack.addEventListener('mouseenter',function(){ hover=true; });
    stack.addEventListener('mouseleave',function(){ hover=false; });
    stack.addEventListener('keydown',function(e){
      if(e.key==='ArrowUp'||e.key==='ArrowLeft'){ e.preventDefault(); e.stopPropagation(); go(a-1); hold(); }
      else if(e.key==='ArrowRight'){ e.preventDefault(); go(a+1); hold(); }
    });
    if(reduce) a=cards.length-1;
    draw();
    if(window.IntersectionObserver) new IntersectionObserver(function(es){ es.forEach(function(e){ var was=inView; inView=e.isIntersecting; if(inView && !was){ replay(); if(Date.now()>holdUntil) loop(1800); } }); },{threshold:.3}).observe(stack);
    else inView=true;
    loop();
    lay(); if(window.__ftFit) window.__ftFit();
  }
  function boot(){ setTimeout(build,0); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
  lay(); window.addEventListener("resize",later); window.addEventListener("load",lay);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(later);
  window.__zfLay=later;
  [].forEach.call(box.querySelectorAll("img"),function(im){
    function on(){im.classList.add("is-in");}
    if(im.complete&&im.naturalWidth) on(); else { im.addEventListener("load",on); im.addEventListener("error",on); }
  });
  var vids=[].slice.call(box.querySelectorAll("video"));
  function load(v){ if(!v.getAttribute("src")){ v.src=v.getAttribute("data-src"); v.preload="auto"; } }
  if(!window.IntersectionObserver){ vids.forEach(load); return; }
  var pre=new IntersectionObserver(function(es){es.forEach(function(e){
    if(e.isIntersecting){ load(e.target); pre.unobserve(e.target); }
  });},{rootMargin:"400px 0px"});
  var io=new IntersectionObserver(function(es){es.forEach(function(e){
    var v=e.target;
    if(e.isIntersecting && !reduce){ load(v); var p=v.play(); if(p&&p.catch) p.catch(function(){}); } else { v.pause(); }
  });},{threshold:0.25});
  vids.forEach(function(v){ v.muted=true; pre.observe(v); io.observe(v); });
})();
