(function(){
  var LIVE=true; // true = real weather from Open-Meteo. false = built-in sample data.
  var ICONS=window.ICONS; // vector icons, see js/icons.js
  var root=document.documentElement,mb=document.getElementById("mode");
  function $(i){return document.getElementById(i)}
  function css(n){return getComputedStyle(root).getPropertyValue(n).trim()}
  function pal(){return{I:css("--ink"),S:css("--soft")}}
  function setTheme(t){if(t==="dark")root.setAttribute("data-theme","dark");else root.removeAttribute("data-theme");mb.innerHTML=icon(t==="dark"?"night":"day");mb.setAttribute("aria-label",t==="dark"?"Switch to day mode":"Switch to night mode");mb.setAttribute("aria-pressed",t==="dark");if(window.drawLand)drawLand();if(window.repaint)repaint()}
  mb.addEventListener("click",function(){setTheme(root.getAttribute("data-theme")==="dark"?"light":"dark")});
  setTheme("light");
  var rm=matchMedia("(prefers-reduced-motion:reduce)").matches;

  /* Vector weather icons (traced from the 16x16 drawings) */
  function icon(c){var o=ICONS[c];return '<svg viewBox="0 0 '+o.w+' '+o.h+'" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="'+o.d+'"/></svg>'}

  /* Clothes: traced from the 16x16 drawings */
  function item(k,label,x){return '<div class="wc"><div class="wi'+(x?' x':'')+'">'+icon(k)+'</div><span>'+label+'</span></div>'}
  function items(t,c){
    var h=t<10?item("coat","Coat"):t<22?item("sweatshirt","Sweatshirt"):item("shirt","T-shirt");
    if(t>=24)h+=item("short","Shorts");
    if(c==="rain"||c==="storm")h+=item("umbrella","Umbrella",1);
    if((c==="sunny"||c==="heat"||c==="partly")&&t>=22)h+=item("glass","Sunglasses",1);
    $("fitems").innerHTML=h;
  }
  function wear(t,c){
    var top=t<0?"a heavy coat and a thermal layer":t<10?"a warm coat":t<16?"a thick sweatshirt or a light jacket":t<22?"a sweatshirt":t<30?"a t-shirt":"a light t-shirt";
    var bot=t<10?"warm trousers":t<24?"jeans or trousers":"shorts";
    var e=[];
    if(c==="rain")e.push("an umbrella","waterproof shoes");
    if(c==="storm")e.push("stay indoors if you can");
    if(c==="windy")e.push("a windbreaker");
    if(c==="snow")e.push("boots","gloves","a hat");
    if(c==="fog")e.push("bright colors to be seen");
    if(t<5&&c!=="snow")e.push("a scarf","gloves");
    if((c==="sunny"||c==="heat"||c==="partly")&&t>=22)e.push("sunglasses","sunscreen","water");
    if(t>=40)e.push("avoid the midday sun");
    var s=t<0?"Freezing. Bundle up.":t<10?"Cold. Wear a warm coat.":t<16?"Cool. Bring a jacket.":t<22?"Mild. Light layers work.":t<30?"Warm. Keep it light.":t<40?"Hot. Dress light and stay cool.":"Extreme heat. Stay indoors if you can.";
    return{s:s,top:top,bot:bot,ext:e.length?e.join(", "):"",d:"Wear "+top+" with "+bot+(e.length?". Also: "+e.join(", ")+".":". Nothing extra needed.")};
  }

  /* Data model */
  var C={sunny:["Sunny",24,25,14,58,5],partly:["Partly cloudy",23,23,15,60,10],cloudy:["Cloudy",21,21,16,65,20],rain:["Rain",18,16,20,85,80],storm:["Storm",17,14,38,90,95],windy:["Windy",19,16,42,50,10],snow:["Snow",-2,-6,22,88,70],fog:["Fog",11,10,5,97,10],heat:["Heatwave",52,55,10,12,0]};
  var UV={sunny:6,partly:5,cloudy:3,rain:2,storm:1,windy:5,snow:2,fog:2,heat:9};
  var order=["sunny","partly","cloudy","rain","storm","windy","snow","fog","heat"];
  var CITIES=[["Muğla",37.21,28.36,-2],["Antalya",36.9,30.69,0],["Istanbul",41.01,28.98,-8],["Ankara",39.93,32.86,-12],["Izmir",38.42,27.14,-4],["London",51.51,-.13,-14],["Paris",48.86,2.35,-14],["Berlin",52.52,13.4,-17],["Madrid",40.42,-3.7,-10],["Rome",41.9,12.5,-8],["Athens",37.98,23.73,-5],["Moscow",55.76,37.62,-22],["Cairo",30.04,31.24,-1],["Dubai",25.2,55.27,5],["Mumbai",19.08,72.88,7],["Delhi",28.61,77.21,2],["Bangkok",13.76,100.5,8],["Singapore",1.35,103.82,6],["Beijing",39.9,116.4,-14],["Tokyo",35.68,139.65,-10],["Seoul",37.57,126.98,-15],["Sydney",-33.87,151.21,-4],["Cape Town",-33.92,18.42,-5],["Lagos",6.52,3.38,6],["Nairobi",-1.29,36.82,-3],["New York",40.71,-74.01,-14],["Chicago",41.88,-87.63,-20],["Los Angeles",34.05,-118.24,-4],["Mexico City",19.43,-99.13,-6],["Sao Paulo",-23.55,-46.63,-2],["Buenos Aires",-34.6,-58.38,-3],["Toronto",43.65,-79.38,-19],["Reykjavik",64.15,-21.94,-24]];
  var SAMPLE=[["sunny",24,15,14,5],["cloudy",23,15,16,20],["rain",21,14,18,70],["storm",20,13,28,85],["windy",21,12,34,25],["partly",22,12,12,5],["sunny",23,13,10,5],["cloudy",22,14,15,25],["rain",20,13,20,65],["rain",19,12,17,60],["partly",20,12,14,30],["sunny",22,11,11,5],["windy",19,10,26,15],["sunny",23,12,12,5]];
  var city="Muğla",clat=37.21,clon=28.36,off=-2,state="now",NOW={c:"sunny",t:22,f:23,w:14,h:58,r:5},D=[],lastT=22,lastC="sunny";
  function hm(m){return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0")}

  function sampleData(){
    var d=C.sunny;NOW={c:"sunny",t:d[1]+off,f:d[2]+off,w:d[3],h:d[4],r:d[5]};
    D=SAMPLE.map(function(r,i){
      var dt=new Date();dt.setDate(dt.getDate()+i);var cd=C[r[0]],hi=r[1]+off;
      return{c:r[0],date:dt,hi:hi,lo:r[2]+off,f:hi+(cd[2]-cd[1]),w:r[3],g:Math.round(r[3]*1.5),w80:Math.round(r[3]*1.3),w120:Math.round(r[3]*1.5),w180:Math.round(r[3]*1.7),rain:r[4],mm:r[4]>50?(r[4]/12).toFixed(1):"0.0",hum:cd[4],uv:UV[r[0]],sr:hm(402+Math.round(i*1.3)),ss:hm(1032-Math.round(i*1.1))};
    });
  }
  function condOf(code,wind,t){
    var c=code<=1?"sunny":code===2?"partly":code===3?"cloudy":(code===45||code===48)?"fog":(code>=71&&code<=77)||code===85||code===86?"snow":code>=95?"storm":"rain";
    if(wind>=40&&(c==="sunny"||c==="partly"||c==="cloudy"))c="windy";
    if(t>=40&&c==="sunny")c="heat";
    return c;
  }
  function avg(a){return a.length?Math.round(a.reduce(function(s,v){return s+v},0)/a.length):0}
  function mx(a){return a.length?Math.round(Math.max.apply(null,a)):0}
  function fetchLive(){
    var u="https://api.open-meteo.com/v1/forecast?latitude="+clat+"&longitude="+clon+"&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,wind_speed_10m_max,wind_gusts_10m_max,precipitation_probability_max,uv_index_max,sunrise,sunset&hourly=relative_humidity_2m,rain,wind_speed_80m,wind_speed_120m,wind_speed_180m&models=best_match&forecast_days=14&timezone=auto";
    return fetch(u).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(j){
      var dl=j.daily,h=j.hourly,cu=j.current;
      D=dl.time.map(function(day,i){
        function sl(k){return h[k].slice(i*24,i*24+24).filter(function(v){return v!=null})}
        var hi=Math.round(dl.temperature_2m_max[i]);
        return{c:condOf(dl.weather_code[i],dl.wind_speed_10m_max[i],hi),date:new Date(day+"T12:00"),hi:hi,lo:Math.round(dl.temperature_2m_min[i]),f:Math.round(dl.apparent_temperature_max[i]),w:Math.round(dl.wind_speed_10m_max[i]),g:Math.round(dl.wind_gusts_10m_max[i]),w80:mx(sl("wind_speed_80m")),w120:mx(sl("wind_speed_120m")),w180:mx(sl("wind_speed_180m")),rain:dl.precipitation_probability_max[i]||0,mm:sl("rain").reduce(function(s,v){return s+v},0).toFixed(1),hum:avg(sl("relative_humidity_2m")),uv:Math.round(dl.uv_index_max[i]),sr:String(dl.sunrise[i]).slice(11,16),ss:String(dl.sunset[i]).slice(11,16)};
      });
      NOW={c:condOf(cu.weather_code,cu.wind_speed_10m,cu.temperature_2m),t:Math.round(cu.temperature_2m),f:Math.round(cu.apparent_temperature),w:Math.round(cu.wind_speed_10m),h:Math.round(cu.relative_humidity_2m),r:D[0].rain};
    });
  }

  /* Front page */
  function where(){return city+" · "+Math.abs(clat).toFixed(2)+"°"+(clat>=0?"N":"S")+" "+Math.abs(clon).toFixed(2)+"°"+(clon>=0?"E":"W")}
  function show(k){
    state=k;var live=k==="now",d=live?[C[NOW.c][0],NOW.t,NOW.f,NOW.w,NOW.h,NOW.r]:C[k],cc=live?NOW.c:k,tv=d[1],cls=tv>50?"hot":tv<0?"cold":"",af=$("arcF");
    $("cond").textContent=d[0];$("logo").innerHTML=icon(cc);
    $("temp").textContent=tv+"°C";$("temp").className="temp "+cls;
    af.setAttribute("class","fil "+cls);af.setAttribute("stroke-dasharray",(Math.max(0,Math.min(1,(tv+20)/70))*100)+" 100");
    $("s1").textContent=d[2]+"°";$("s2").textContent=d[3]+" km/h";$("s3").textContent=d[4]+"%";$("s4").textContent=d[5]+"%";
    $("where").textContent=where();
    var w=wear(tv,cc);$("wsum").textContent=w.s;$("wdesc").textContent=w.d;
    lastT=tv;lastC=cc;items(tv,cc);
  }
  
  var tk=$("ticks"),NS="http://www.w3.org/2000/svg";
  for(var tt=-20;tt<=50;tt+=5){
    var an=Math.PI*(1-(tt+20)/70),mj=tt%10===0,r2=mj?168:163,ln=document.createElementNS(NS,"line");
    ln.setAttribute("x1",170+156*Math.cos(an));ln.setAttribute("y1",165-156*Math.sin(an));
    ln.setAttribute("x2",170+r2*Math.cos(an));ln.setAttribute("y2",165-r2*Math.sin(an));
    ln.setAttribute("stroke","currentColor");ln.setAttribute("stroke-width",mj?1.5:1);tk.appendChild(ln);
  }

  /* 14 day list with tap-to-open details */
  var fc=$("fc");
  function cell(l,v){var d=document.createElement("div");d.className="cell";var b=document.createElement("b"),s=document.createElement("span");b.textContent=v;s.textContent=l;d.appendChild(b);d.appendChild(s);return d}
  function buildFc(){
    fc.textContent="";
    D.forEach(function(r,i){
      var cd=C[r.c],dw=document.createElement("div");dw.className="dw";
      var row=document.createElement("div");row.className="day"+(i?"":" t");row.setAttribute("role","button");row.tabIndex=0;row.setAttribute("aria-expanded","false");
      var ic=document.createElement("div");ic.className="ic";ic.innerHTML=icon(r.c);
      var mid=document.createElement("div"),b=document.createElement("b"),s=document.createElement("small");
      b.textContent=i?r.date.toLocaleDateString("en-GB",{weekday:"long"}):"Today";
      s.textContent=r.date.toLocaleDateString("en-GB",{day:"numeric",month:"short"})+" · "+cd[0]+" · "+r.rain+"% rain";
      mid.appendChild(b);mid.appendChild(s);
      var rg=document.createElement("div");rg.className="rng";rg.textContent=r.hi+"° / "+r.lo+"°";
      var bar=document.createElement("div"),fi=document.createElement("i");bar.className="bar";
      fi.style.left=Math.max(0,(r.lo+30)/80*100)+"%";fi.style.width=Math.max(4,(r.hi-r.lo)/80*100)+"%";bar.appendChild(fi);rg.appendChild(bar);
      row.appendChild(ic);row.appendChild(mid);row.appendChild(rg);
      var det=document.createElement("div");det.className="det";det.hidden=true;
      var g=document.createElement("div");g.className="dg";
      [["High / low",r.hi+"° / "+r.lo+"°"],["Feels like",r.f+"°"],["Humidity",r.hum+"%"],["Rain chance",r.rain+"%"],["Rain amount",r.mm+" mm"],["UV index",String(r.uv)],["Wind 10 m",r.w+" km/h"],["Gusts",r.g+" km/h"],["Wind 80 m",r.w80+" km/h"],["Wind 120 m",r.w120+" km/h"],["Wind 180 m",r.w180+" km/h"],["Sunrise / sunset",r.sr+" / "+r.ss]].forEach(function(a){g.appendChild(cell(a[0],a[1]))});
      var p=document.createElement("p");p.textContent=wear(r.hi,r.c).d;
      det.appendChild(g);det.appendChild(p);
      function tog(){
        var open=row.getAttribute("aria-expanded")==="true";
        [].slice.call(fc.querySelectorAll(".day")).forEach(function(x){x.setAttribute("aria-expanded","false")});
        [].slice.call(fc.querySelectorAll(".det")).forEach(function(x){x.hidden=true});
        if(!open){row.setAttribute("aria-expanded","true");det.hidden=false;dw.scrollIntoView({block:"nearest",behavior:rm?"auto":"smooth"})}
      }
      row.addEventListener("click",tog);
      row.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();tog()}});
      dw.appendChild(row);dw.appendChild(det);fc.appendChild(dw);
    });
  }
  window.repaint=function(){};

  /* Wind map: pixel land + flowing particles (live grid when available) */
  var W=240,H=120,lc=$("land").getContext("2d"),pc=$("wind").getContext("2d"),GRID=null,GN=18,GM=8;
  var P=[[-168,66,-160,71,-125,70,-95,72,-80,68,-62,60,-55,50,-66,44,-76,35,-81,31,-80,25,-90,29,-97,26,-97,19,-88,21,-83,10,-78,8,-86,13,-95,16,-105,20,-112,28,-117,32,-124,40,-125,48,-135,57,-150,60,-165,60],
  [-78,8,-62,10,-50,0,-35,-6,-39,-15,-48,-26,-58,-38,-65,-42,-68,-54,-74,-50,-73,-37,-71,-18,-81,-5,-80,0],
  [-73,78,-55,82,-20,82,-20,70,-43,60,-53,67],
  [-10,36,-9,43,-1,46,-5,48,4,52,9,55,8,58,14,56,20,60,26,66,30,70,45,68,70,73,100,77,140,72,170,70,180,66,160,58,142,52,140,46,130,42,127,38,122,40,121,31,108,21,105,10,100,13,103,2,98,8,92,22,80,15,77,8,72,20,66,25,57,24,59,21,52,16,43,13,35,28,33,31,36,36,28,36,26,40,23,38,22,36,12,38,8,44,3,43,-5,36],
  [-17,21,-10,30,-6,36,10,37,20,32,32,31,34,28,43,12,51,12,40,-3,40,-15,35,-25,20,-35,17,-30,12,-17,9,0,9,5,-8,4,-17,14],
  [114,-22,122,-18,130,-12,142,-11,146,-19,153,-27,150,-37,140,-38,131,-31,115,-34],
  [-180,-70,180,-70,180,-90,-180,-90],[-5,50,-3,58,2,53],[130,31,141,40,145,44,140,36]];
  window.drawLand=function(){
    var p=pal();lc.clearRect(0,0,W,H);lc.fillStyle=p.S;lc.strokeStyle=p.I;lc.lineWidth=1;
    P.forEach(function(a){lc.beginPath();for(var i=0;i<a.length;i+=2){var X=(a[i]+180)/1.5,Y=(90-a[i+1])/1.5;if(i)lc.lineTo(X,Y);else lc.moveTo(X,Y)}lc.closePath();lc.fill();lc.stroke()});
  };
  drawLand();
  function uv(x,y){
    var lon=x*1.5-180,lat=90-y*1.5;
    if(GRID){
      var fx=(lon+180)/20,fy=Math.max(0,Math.min(GM-1,(lat+60)/20)),i0=Math.floor(fx)%GN,i1=(i0+1)%GN,j0=Math.floor(fy),j1=Math.min(GM-1,j0+1),tx=fx-Math.floor(fx),ty=fy-j0;
      function g(i,j){return GRID[j*GN+i]}
      var a=g(i0,j0),b=g(i1,j0),c=g(i0,j1),d=g(i1,j1);
      return[0,1].map(function(k){return(a[k]*(1-tx)+b[k]*tx)*(1-ty)+(c[k]*(1-tx)+d[k]*tx)*ty});
    }
    var ph=lat*Math.PI/180;
    return[-8*Math.cos(3*ph)+3*Math.sin(lon*Math.PI/60+ph*4),4*Math.sin(lon*Math.PI/45+ph*2)*Math.cos(ph)];
  }
  function loadGrid(){
    var la=[],lo=[];for(var y=-60;y<=80;y+=20)for(var x=-180;x<=160;x+=20){la.push(y);lo.push(x)}
    fetch("https://api.open-meteo.com/v1/forecast?latitude="+la.join()+"&longitude="+lo.join()+"&current=wind_speed_10m,wind_direction_10m").then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(j){
      var arr=Array.isArray(j)?j:[j];if(arr.length!==la.length)throw 0;
      GRID=arr.map(function(o){var s=o.current.wind_speed_10m/3.6,d=o.current.wind_direction_10m*Math.PI/180;return[-s*Math.sin(d),-s*Math.cos(d)]});
      $("wnote").textContent="Live wind 10 m above ground from Open-Meteo, on a 20° grid. Tap the map to read the wind at that spot.";
    }).catch(function(){});
  }
  var N=520,px=[],py=[],pa=[];
  function spawn(i){px[i]=Math.random()*W;py[i]=Math.random()*H;pa[i]=40+Math.random()*120}
  for(var i=0;i<N;i++)spawn(i);
  function step(fade){
    if(fade){pc.globalCompositeOperation="destination-out";pc.fillStyle="rgba(0,0,0,.1)";pc.fillRect(0,0,W,H);pc.globalCompositeOperation="source-over"}
    pc.fillStyle=css("--ink");
    for(var i=0;i<N;i++){
      var w=uv(px[i],py[i]);px[i]+=w[0]*.06;py[i]-=w[1]*.06;
      if(px[i]<0)px[i]+=W;if(px[i]>=W)px[i]-=W;
      if(--pa[i]<0||py[i]<0||py[i]>=H)spawn(i);
      pc.fillRect(px[i]|0,py[i]|0,1,1);
    }
  }
  if(rm){for(var k=0;k<50;k++)step(false)}
  else{var n=0;(function loop(){if(++n&1)step(true);requestAnimationFrame(loop)})()}
  var cp=["N","NE","E","SE","S","SW","W","NW"];
  var mbx=$("mb"),mz=$("mz"),Z=1,TX=0,TY=0,drag=null;
  function applyZ(){
    var w=mbx.clientWidth,h=mbx.clientHeight;Z=Math.max(1,Math.min(8,Z));
    TX=Math.min(0,Math.max(w*(1-Z),TX));TY=Math.min(0,Math.max(h*(1-Z),TY));
    mz.style.setProperty("--z",Z);mz.style.setProperty("--tx",TX+"px");mz.style.setProperty("--ty",TY+"px");mbx.classList.toggle("zm",Z>1);
  }
  function zoomBy(k){var w=mbx.clientWidth,h=mbx.clientHeight,z2=Math.max(1,Math.min(8,Z*k)),r=z2/Z;TX=w/2-(w/2-TX)*r;TY=h/2-(h/2-TY)*r;Z=z2;applyZ()}
  $("zin").addEventListener("click",function(){zoomBy(1.6)});
  $("zout").addEventListener("click",function(){zoomBy(1/1.6)});
  window.addEventListener("resize",applyZ);
  function readWind(e){
    var r=mz.getBoundingClientRect(),fx=(e.clientX-r.left)/r.width,fy=(e.clientY-r.top)/r.height;
    if(fx<0||fx>1||fy<0||fy>1)return;
    var w=uv(fx*W,fy*H),sp=Math.round(Math.hypot(w[0],w[1])*3.6),b=(Math.atan2(-w[0],-w[1])*180/Math.PI+360)%360;
    var q=$("qp");q.hidden=false;q.style.left=fx*100+"%";q.style.top=fy*100+"%";
    $("rd").textContent="Lat "+(90-fy*180).toFixed(1)+"°, lon "+(fx*360-180).toFixed(1)+"° · wind "+sp+" km/h from the "+cp[Math.round(b/45)%8];
  }
  mbx.addEventListener("pointerdown",function(e){if(e.target.closest(".zb"))return;drag={x:e.clientX,y:e.clientY,tx:TX,ty:TY,moved:false}});
  mbx.addEventListener("pointermove",function(e){
    if(!drag)return;var dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(!drag.moved&&Z>1&&Math.hypot(dx,dy)>5){drag.moved=true;try{mbx.setPointerCapture(e.pointerId)}catch(x){}}
    if(drag.moved){TX=drag.tx+dx;TY=drag.ty+dy;applyZ()}
  });
  mbx.addEventListener("pointerup",function(e){var d=drag;drag=null;if(!d||d.moved)return;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>5)return;readWind(e)});
  mbx.addEventListener("pointercancel",function(){drag=null});

  /* Pager and bottom buttons */
  var pg=$("pager"),pages=[].slice.call(document.querySelectorAll(".pg")),tabs=[].slice.call(document.querySelectorAll(".tabs button")),idx=1;
  function setIdx(i){idx=i;tabs.forEach(function(b,j){if(j===i)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")})}
  function sync(){var w=pg.clientWidth||1;setIdx(Math.max(0,Math.min(2,Math.round(pg.scrollLeft/w))))}
  function go(i){pg.scrollTo({left:i*pg.clientWidth,behavior:rm?"auto":"smooth"})}
  tabs.forEach(function(b,i){b.addEventListener("click",function(){go(i)})});
  pg.addEventListener("scroll",sync,{passive:true});
  pg.addEventListener("scrollend",sync);
  if("IntersectionObserver" in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)setIdx(pages.indexOf(e.target))})},{root:pg,threshold:.6});
    pages.forEach(function(p){io.observe(p)});
  }
  function home(){pg.style.scrollSnapType="none";pg.scrollLeft=pg.clientWidth;pg.style.scrollSnapType="";sync()}
  home();requestAnimationFrame(home);window.addEventListener("load",home);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(home);
  window.addEventListener("resize",function(){pg.style.scrollSnapType="none";pg.scrollLeft=idx*pg.clientWidth;pg.style.scrollSnapType=""});
  document.addEventListener("keydown",function(e){if(e.target.tagName==="INPUT")return;if(e.key==="ArrowRight")go(Math.min(2,idx+1));if(e.key==="ArrowLeft")go(Math.max(0,idx-1))});

  /* City search: Open-Meteo geocoding when live, built-in list otherwise */
  var q=$("q"),rs=$("rs"),cur=[],tmr;
  function norm(s){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
  function local(){var v=norm(q.value.trim());return v?CITIES.filter(function(c){return norm(c[0]).indexOf(v)>-1}).map(function(c){return[c[0],c[1],c[2],c[3],c[0]]}):[]}
  function renderList(a){
    cur=a.slice(0,6);rs.textContent="";
    if(!cur.length){var d=document.createElement("div");d.className="nr";d.textContent=LIVE?"No city found.":"No match in the sample list yet.";rs.appendChild(d)}
    cur.forEach(function(c){var b=document.createElement("button");b.type="button";b.textContent=c[0];b.addEventListener("click",function(){pick(c)});rs.appendChild(b)});
    rs.hidden=false;
  }
  function pick(c){
    city=c[4]||c[0];clat=c[1];clon=c[2];off=c[3];
    var y=$("you");y.style.left=(clon+180)/3.6+"%";y.style.top=(90-clat)/1.8+"%";$("yl").textContent=city;
    q.value=city;rs.hidden=true;q.blur();loadCity();go(1);
  }
  q.addEventListener("input",function(){
    clearTimeout(tmr);var v=q.value.trim();if(!v){rs.hidden=true;return}
    if(!LIVE){renderList(local());return}
    tmr=setTimeout(function(){
      fetch("https://geocoding-api.open-meteo.com/v1/search?name="+encodeURIComponent(v)+"&count=6&language=en&format=json").then(function(r){return r.json()}).then(function(j){
        renderList((j.results||[]).map(function(x){return[x.name+(x.admin1?", "+x.admin1:"")+(x.country?", "+x.country:""),x.latitude,x.longitude,0,x.name]}));
      }).catch(function(){renderList(local())});
    },250);
  });
  q.addEventListener("keydown",function(e){if(e.key==="Enter"&&cur.length&&!rs.hidden)pick(cur[0])});
  document.addEventListener("click",function(e){if(!e.target.closest(".search"))rs.hidden=true});

  /* Load data for the current city */
  function loadCity(){
    function done(src){show("now");buildFc();$("src").textContent=src}
    if(!LIVE){sampleData();done("Sample weather. Live data is not connected in this version.");return}
    $("where").textContent="Loading "+city+"…";
    fetchLive().then(function(){done("Live data from Open-Meteo, "+new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}))})
    .catch(function(){sampleData();done("Could not reach Open-Meteo. Showing sample weather.")});
  }
  loadCity();
  if(LIVE)loadGrid();
})();
