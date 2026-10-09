/* =====================================================================
   CROC — VARIANTE « JEU VIDÉO RÉTRO »
   Le monde tel que Croc le perçoit : un JRPG 16-bit.
   Tout le contenu vient de data.js (window.CROC). Aucun fichier son :
   la musique et les bruitages sont synthétisés en direct (WebAudio).
   ===================================================================== */
(()=>{
'use strict';
const D=window.CROC||{};
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rnd=(a,b)=>a+Math.random()*(b-a),ri=(a,b)=>Math.floor(rnd(a,b+1)),pick=a=>a[Math.random()*a.length|0];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pad=(n,l=2)=>String(n).padStart(l,'0');
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}};
const anim=(dur,fn)=>new Promise(res=>{const t0=performance.now();(function f(now){const p=Math.min(1,(now-t0)/dur);fn(p);if(p<1)requestAnimationFrame(f);else res()})(t0)});

/* ---------------- palette ---------------- */
const PAL={
 o:'#0b0a10',h:'#eef7fa',H:'#8fc9d9',s:'#dccfc1',S:'#a9958a',e:'#e0263d',c:'#1f1a2c',C:'#3a3050',
 b:'#e8e0cc',B:'#b5ab95',p:'#16131f',P:'#2a2140',f:'#b8c8d6',F:'#6b7a8a',r:'#b0102a',
 m:'#6b6577',M:'#9d97a6',w:'#3a3346',a:'#e8e0cc',d:'#9d97a6',i:'#8fe3f0',x:'#e0263d',v:'#45365e'
};
const COL={ink:'#0b0a10',night:'#16131f',deep:'#1d1830',vio:'#2a2140',vio2:'#45365e',vio3:'#6a5590',gray:'#6b6577',gray2:'#9d97a6',bone:'#e8e0cc',bone2:'#c9c0aa',blood0:'#5a0a16',blood:'#b0102a',blood2:'#e0263d',ice0:'#1f4f5c',ice2:'#4fb6c9',ice:'#8fe3f0',white:'#fbf6ea'};

/* ---------------- matrice de Bayer 8×8 (tramage) ---------------- */
const BAY=(()=>{const m=[[0]];let n=1;while(n<8){const r=[];for(let y=0;y<n*2;y++){r.push([]);for(let x=0;x<n*2;x++){const q=(y<n?0:2)+(x<n?0:1);const b=[0,2,3,1][q];r[y].push(4*m[y%n][x%n]+b)}}m.length=0;r.forEach(row=>m.push(row));n*=2}return m.flat()})();
const bay=(x,y)=>BAY[(y&7)*8+(x&7)]/64;

/* ---------------- police bitmap 5×7 (pour les canvas) ---------------- */
const FONT={A:[14,17,17,31,17,17,17],B:[30,17,17,30,17,17,30],C:[14,17,16,16,16,17,14],D:[30,17,17,17,17,17,30],E:[31,16,16,30,16,16,31],F:[31,16,16,30,16,16,16],G:[14,17,16,23,17,17,15],H:[17,17,17,31,17,17,17],I:[14,4,4,4,4,4,14],J:[7,2,2,2,2,18,12],K:[17,18,20,24,20,18,17],L:[16,16,16,16,16,16,31],M:[17,27,21,21,17,17,17],N:[17,17,25,21,19,17,17],O:[14,17,17,17,17,17,14],P:[30,17,17,30,16,16,16],Q:[14,17,17,17,21,18,13],R:[30,17,17,30,20,18,17],S:[15,16,16,14,1,1,30],T:[31,4,4,4,4,4,4],U:[17,17,17,17,17,17,14],V:[17,17,17,17,17,10,4],W:[17,17,17,21,21,21,10],X:[17,17,10,4,10,17,17],Y:[17,17,17,10,4,4,4],Z:[31,1,2,4,8,16,31],
'0':[14,17,19,21,25,17,14],'1':[4,12,4,4,4,4,14],'2':[14,17,1,2,4,8,31],'3':[31,2,4,2,1,17,14],'4':[2,6,10,18,31,2,2],'5':[31,16,30,1,1,17,14],'6':[6,8,16,30,17,17,14],'7':[31,1,2,4,8,8,8],'8':[14,17,17,14,17,17,14],'9':[14,17,17,15,1,2,12],
'!':[4,4,4,4,4,0,4],'?':[14,17,1,2,4,0,4],'.':[0,0,0,0,0,12,12],':':[0,12,12,0,12,12,0],'-':[0,0,0,31,0,0,0],'+':[0,4,4,31,4,4,0],'/':[1,1,2,4,8,16,16],'%':[24,25,2,4,8,19,3],'♥':[0,10,31,31,14,4,0],'É':[2,4,31,16,30,16,31],'[':[14,8,8,8,8,8,14],']':[14,2,2,2,2,2,14],"'":[4,4,8,0,0,0,0],',':[0,0,0,0,12,4,8],'·':[0,0,0,12,12,0,0],'#':[10,10,31,10,31,10,10],' ':[0,0,0,0,0,0,0],'★':[4,4,31,14,14,27,17],'♪':[6,5,4,4,12,28,8]};
const fnorm=s=>String(s).toUpperCase().replace(/[ÈÊË]/g,'E').replace(/[ÀÂÄ]/g,'A').replace(/[ÎÏ]/g,'I').replace(/[ÔÖ]/g,'O').replace(/[ÙÛÜ]/g,'U').replace(/Ç/g,'C').replace(/Œ/g,'OE').replace(/[«»"]/g,"'").replace(/…/g,'...');
const textW=(s,sc=1)=>Math.max(0,fnorm(s).length*6*sc-sc);
function drawText(x,s,px,py,col,sc=1,rowCol){
 const t=fnorm(s);let cx=Math.round(px);py=Math.round(py);
 for(const ch of t){const g=FONT[ch]||FONT['?'];for(let r=0;r<7;r++){const bits=g[r];if(!bits)continue;x.fillStyle=rowCol?rowCol(r):col;for(let c=0;c<5;c++)if(bits&(16>>c))x.fillRect(cx+c*sc,py+r*sc,sc,sc)}cx+=6*sc}
}
function drawTextOutlined(x,s,px,py,col,sc=1,out=COL.ink){for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1],[1,1]])drawText(x,s,px+dx,py+dy,out,sc);drawText(x,s,px,py,col,sc)}

/* ---------------- sprites (chaînes de pixels) ---------------- */
const SPR={};
function sprite(key,rows,pal={}){
 if(SPR[key])return SPR[key];
 const h=rows.length,w=Math.max(...rows.map(r=>r.length));const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
 rows.forEach((r,y)=>{for(let i=0;i<r.length;i++){const ch=r[i];if(ch==='.'||ch===' ')continue;const col=pal[ch]||PAL[ch];if(!col)continue;x.fillStyle=col;x.fillRect(i,y,1,1)}});
 return SPR[key]=c;
}
function tinted(key,src,col){const k=key+'|'+col;if(SPR[k])return SPR[k];const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const x=c.getContext('2d');x.drawImage(src,0,0);x.globalCompositeOperation='source-in';x.fillStyle=col;x.fillRect(0,0,c.width,c.height);return SPR[k]=c}
function flipped(key,src){const k=key+'|flip';if(SPR[k])return SPR[k];const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const x=c.getContext('2d');x.translate(c.width,0);x.scale(-1,1);x.drawImage(src,0,0);return SPR[k]=c}
function spriteURI(rows,pal={}){
 const h=rows.length,w=Math.max(...rows.map(r=>r.length));let r='';
 rows.forEach((row,y)=>{let i=0;while(i<row.length){const ch=row[i];if(ch==='.'){i++;continue}let j=i;while(j<row.length&&row[j]===ch)j++;r+=`<rect x="${i}" y="${y}" width="${j-i}" height="1" fill="${pal[ch]||PAL[ch]}"/>`;i=j}});
 return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${r}</svg>`);
}

/* Personnages : le pixel art est dans sprites.js (window.CROC_SPRITES).
   crocSprite(dir,f) — 16×24, dir 'down' | 'up' | 'left' | 'right' ;
   f : 0 repos · 1 souffle · 2-5 marche (contact, passage, contact, passage). */
const SPR_=window.CROC_SPRITES;
const CROC_DY=SPR_.crocDy;
function crocSprite(dir,frame){
 frame=clamp(frame|0,0,5);const k='croc-'+dir+frame;if(SPR[k])return SPR[k];
 const v=dir==='up'?'up':dir==='down'?'down':'left';const s=SPR_.rows(SPR_.croc[v][frame],SPR_.pal.croc);
 return SPR[k]=dir==='right'?flipped(k,s):s;
}
/* marteau à pointes sur l'épaule (repère du sprite 16×24) */
const drawHammer=(x,ox,oy,dir,sc=1)=>SPR_.hammer(x,ox,oy,dir,sc);
/* PNJ génériques 12×18 (générateur dans sprites.js) */
const NPC_PALS=SPR_.NPC_PALS;
/* Eilyn — 16×24 : 0 lit · 1 souffle · 2 mèche · 3-4 tourne une page · 5-8 marche */
const eilynSprite=f=>{f=clamp(f|0,0,8);const k='eilyn16-'+f;return SPR[k]||(SPR[k]=SPR_.rows(SPR_.eilyn.front[f],SPR_.pal.eilyn))};
const FOE_PAL=null;
const npcSprite=(pi,f,pal)=>{const k='npc'+pi+'-'+(f|0)+(pal?'p':'');return SPR[k]||(SPR[k]=SPR_.npc(typeof pi==='number'?pi:0,f|0,pal||null))};
const foeSprite=f=>{const k='foe'+f;return SPR[k]||(SPR[k]=SPR_.foe(f))};

/* main-curseur + icônes de menu */
const HAND=["...oooo.........","..oaaaaoooooooo.",".oaaaaaaaaaaaaao",".oaaaaaaoooooooo",".oaaaaaaaaaao...",".oaaaaaaoooo....",".oadaaaaaaao....",".oddaaaaoooo....","..odddddo.......","...ooooo........"];
const ICONS={
 statut:["...aaa...","..aaaaa..","..aaaaa..","...aaa...","....a....",".aaaaaaa.","aaaaaaaaa","aaaaaaaaa","aaaaaaaaa"],
 psyche:[".........","..aaaaa..",".a.....a.","a..xxx..a","a..xax..a","a..xxx..a",".a.....a.","..aaaaa..","........."],
 competences:[".....xx..","....xx...","...xx....","..xxxxx..","....xx...","...xx....","..xx.....",".xx......","........."],
 titres:[".........","a...a...a","aa.aaa.aa","aaaaaaaaa","axaaxaaxa","aaaaaaaaa",".........","aaaaaaaaa","........."],
 album:["aaaaaaaaa","a.......a","a.....x.a","a.......a","a..d....a","a.ddd.d.a","addddddda","aaaaaaaaa","........."],
 relations:["..a...x..",".aaa.xxx.",".aaa.xxx.","..a...x..",".aaa.xxx.","aaaaxxxxx","aaaaxxxxx","aaaaxxxxx","........."],
 sauvegarder:["aaaaaaaa.","a.dddd.aa","a.dddd..a","a.......a","a.aaaaa.a","a.a...a.a","a.a...a.a","aaaaaaaaa","........."],
 balade:["aaaaaaaaa","a.......a","a.xx.xx.a","a.xx.xx.a","a.......a","a..ddd..a","a.d...d.a","aaaaaaaaa","........."]
};
function frameURI(c1,c2,c3,c4){
 let r='';const R=(x,y,w,h,c)=>r+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
 R(1,0,10,12,c1);R(0,1,12,10,c1);R(2,1,8,10,c2);R(1,2,10,8,c2);R(2,2,8,8,c3);R(3,3,6,6,c4);
 return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" shape-rendering="crispEdges">${r}</svg>`);
}
function setupDecor(){
 const st=document.documentElement.style;
 st.setProperty('--fr-os',`url("${frameURI(COL.ink,COL.bone,COL.gray,'#120e1d')}")`);
 st.setProperty('--fr-glace',`url("${frameURI(COL.ink,COL.ice,COL.ice2,'#0e1a22')}")`);
 st.setProperty('--fr-sang',`url("${frameURI(COL.ink,COL.blood2,COL.blood0,'#1a0609')}")`);
 st.setProperty('--fr-dim',`url("${frameURI(COL.ink,COL.vio2,COL.vio,COL.night)}")`);
 st.setProperty('--hand',`url("${spriteURI(HAND)}")`);
 $$('.ico').forEach(i=>{const k=i.dataset.ico;if(ICONS[k])i.style.setProperty('--ico',`url("${spriteURI(ICONS[k])}")`)});
}

/* ---------------- images : pixelisation + tramage ---------------- */
const IMGP={};
function loadImg(src){if(IMGP[src])return IMGP[src];const im=new Image();im.decoding='async';IMGP[src]=new Promise((res,rej)=>{im.onload=()=>res(im);im.onerror=()=>rej(new Error('image introuvable : '+src))});im.src=src;return IMGP[src]}
const DPAL=['#0b0a10','#1d1830','#2a2140','#45365e','#6a5590','#6b6577','#9d97a6','#c9c0aa','#e8e0cc','#fbf6ea','#5a0a16','#b0102a','#e0263d','#1f4f5c','#4fb6c9','#8fe3f0','#d9b9a3','#a07868'].map(h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]);
function ditherData(d){
 const w=d.width,a=d.data;for(let i=0;i<a.length;i+=4){const p=i/4,x=p%w,y=(p/w)|0;const o=(bay(x,y)-.5)*44;const r=a[i]+o,g=a[i+1]+o,b=a[i+2]+o;let best=0,bd=1e9;for(let k=0;k<DPAL.length;k++){const q=DPAL[k],dr=r-q[0],dg=g-q[1],db=b-q[2];const dd=dr*dr*.3+dg*dg*.59+db*db*.11;if(dd<bd){bd=dd;best=k}}const q=DPAL[best];a[i]=q[0];a[i+1]=q[1];a[i+2]=q[2];a[i+3]=255}
}
let ditherOK=null; /* null = inconnu, false = bloqué (file://) */
function pixelArt(im,w,opt={}){
 const cr=opt.crop||[0,0,im.naturalWidth,im.naturalHeight];const h=opt.h||Math.max(1,Math.round(w*cr[3]/cr[2]));
 const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingEnabled=true;try{x.imageSmoothingQuality='high'}catch(e){}
 x.drawImage(im,cr[0],cr[1],cr[2],cr[3],0,0,w,h);
 if(opt.dither&&ditherOK!==false){try{const d=x.getImageData(0,0,w,h);ditherData(d);x.putImageData(d,0,0);ditherOK=true;c.dataset.dither='1'}catch(e){ditherOK=false;c.dataset.dither='0'}}
 return c;
}

/* ---------------- effets d'écran ---------------- */
function flash(col='#fff',o=.6,d=240){if(RM){o=Math.min(o,.18)}const f=$('#flash');f.style.background=col;f.animate([{opacity:o},{opacity:0}],{duration:d,easing:'steps(4)'})}
function shake(el,p=8,d=360){if(RM||!el)return;const k=[];const n=10;for(let i=0;i<n;i++){const f=1-i/n;k.push({transform:`translate(${Math.round((i%2?-1:1)*p*f)}px,${Math.round(((i%3)-1)*p*f*.6)}px)`})}k.push({transform:'none'});el.animate(k,{duration:d,easing:'steps('+n+')'})}
async function wipe(mid,opt={}){
 if(RM){await mid();return}
 const c=$('#wipe'),x=c.getContext('2d');const cell=opt.cell||Math.max(14,Math.round(Math.max(innerWidth,innerHeight)/56));
 const w=Math.ceil(innerWidth/cell),h=Math.ceil(innerHeight/cell);c.width=w;c.height=h;c.style.display='block';
 const th=(i,j)=>((i+j*.8)/(w+h*.8))*.72+bay(i,j)*.28;
 const draw=(t,inv)=>{x.clearRect(0,0,w,h);x.fillStyle=opt.color||COL.ink;for(let j=0;j<h;j++)for(let i=0;i<w;i++){const v=th(i,j);if(inv?v>=t:v<t)x.fillRect(i,j,1,1)}};
 const dur=opt.dur||300;
 await anim(dur,p=>draw(p*1.01,false));
 await mid();await sleep(60);
 await anim(dur,p=>draw(p*1.01,true));
 c.style.display='none';
}
/* mosaïque locale (fenêtre du panneau) */
async function mosaic(el,mid){
 if(RM){await mid();return}
 const r=el.getBoundingClientRect();const c=$('#wipe'),x=c.getContext('2d');const cell=12;
 const vt=Math.max(0,r.top),vb=Math.min(innerHeight,r.bottom);if(vb-vt<20){await mid();return}
 const w=Math.ceil(r.width/cell),h=Math.ceil((vb-vt)/cell);c.width=w;c.height=h;
 Object.assign(c.style,{display:'block',left:r.left+'px',top:vt+'px',width:(w*cell)+'px',height:(h*cell)+'px',inset:'auto'});
 c.style.left=r.left+'px';c.style.top=vt+'px';
 const draw=(t,inv)=>{x.clearRect(0,0,w,h);for(let j=0;j<h;j++)for(let i=0;i<w;i++){const v=bay(i,j);if(inv?v>=t:v<t){x.fillStyle=(i+j)%7===0?COL.vio:'#120e1d';x.fillRect(i,j,1,1)}}};
 await anim(150,p=>draw(p*1.02,false));await mid();await anim(170,p=>draw(p*1.02,true));
 c.removeAttribute('style');
}

/* =====================================================================
   AUDIO — puce sonore virtuelle : ondes carrées (12,5 / 25 / 50 %),
   triangle « 4 bits », bruit LFSR, écho façon 16-bit. Séquenceur chiptune.
   ===================================================================== */
const AU=(()=>{
 let ctx=null,master,musG,musF,sfxG,sfxF,echoIn,on=false,want=null,seq=null,timer=null,amb=null,rate=1,slowK=0;
 const WV={};let NL,NS;
 const mtof=m=>440*Math.pow(2,(m-69)/12);
 function init(){
  if(ctx)return true;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
  try{ctx=new AC()}catch(e){return false}
  const comp=ctx.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=4;comp.attack.value=.004;comp.release.value=.2;
  master=ctx.createGain();master.gain.value=0;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=10500;
  master.connect(lp);lp.connect(comp);comp.connect(ctx.destination);
  /* filtres « bande magnétique » (ralenti de la BALADE) : grands ouverts par défaut */
  musF=ctx.createBiquadFilter();musF.type='lowpass';musF.frequency.value=20000;musF.Q.value=.8;musF.connect(master);
  sfxF=ctx.createBiquadFilter();sfxF.type='lowpass';sfxF.frequency.value=20000;sfxF.Q.value=.5;sfxF.connect(master);
  musG=ctx.createGain();musG.gain.value=.5;musG.connect(musF);
  sfxG=ctx.createGain();sfxG.gain.value=.9;sfxG.connect(sfxF);
  echoIn=ctx.createGain();const dl=ctx.createDelay(1);dl.delayTime.value=.24;const fb=ctx.createGain();fb.gain.value=.36;const ef=ctx.createBiquadFilter();ef.type='lowpass';ef.frequency.value=2300;const eo=ctx.createGain();eo.gain.value=.5;
  echoIn.connect(dl);dl.connect(ef);ef.connect(fb);fb.connect(dl);ef.connect(eo);eo.connect(master);
  const pulse=d=>{const n=40,re=new Float32Array(n+1),im=new Float32Array(n+1);for(let k=1;k<=n;k++)im[k]=(2/(k*Math.PI))*Math.sin(k*Math.PI*d);return ctx.createPeriodicWave(re,im)};
  WV.p12=pulse(.125);WV.p25=pulse(.25);WV.p50=pulse(.5);
  WV.tri=(()=>{const N=256,M=32,xs=[];for(let n=0;n<N;n++){const ph=n/N;let v=ph<.5?ph*2:2-ph*2;v=Math.floor(v*15.99)/15*2-1;xs.push(v)}const re=new Float32Array(M+1),im=new Float32Array(M+1);for(let k=1;k<=M;k++){let a=0,b=0;for(let n=0;n<N;n++){a+=xs[n]*Math.cos(2*Math.PI*k*n/N);b+=xs[n]*Math.sin(2*Math.PI*k*n/N)}re[k]=2*a/N;im[k]=2*b/N}return ctx.createPeriodicWave(re,im)})();
  const lfsr=(short,len)=>{const b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);let r=1;for(let i=0;i<len;i++){const bit=(r&1)^((r>>(short?6:1))&1);r=(r>>1)|(bit<<14);d[i]=(r&1)?.8:-.8}return b};
  NL=lfsr(false,32767);NS=lfsr(true,93*64);
  document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden)ctx.suspend();else if(on)ctx.resume()});
  return true;
 }
 const ok=()=>!!(ctx&&on);
 function tone(o){
  const t=Math.max(o.t||0,ctx.currentTime),dur=o.dur||.1,a=o.a??.004,d=o.d??.05,s=o.s??.7,r=o.r??.035,v=o.v??.1;
  const os=ctx.createOscillator();const w=WV[o.w||'p50'];if(w)os.setPeriodicWave(w);else os.type=o.w;
  os.frequency.setValueAtTime(o.f,t);if(o.f2)os.frequency.exponentialRampToValueAtTime(Math.max(20,o.f2),t+(o.sl??dur));
  const g=ctx.createGain(),end=t+Math.max(dur,a+.005);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+a);g.gain.linearRampToValueAtTime(v*s,Math.min(end,t+a+d));g.gain.setValueAtTime(v*s,end);g.gain.linearRampToValueAtTime(0,end+r);
  os.connect(g);g.connect(o.bus||sfxG);
  if(o.echo){const e=ctx.createGain();e.gain.value=o.echo;g.connect(e);e.connect(echoIn)}
  if(o.vib){const l=ctx.createOscillator(),lg=ctx.createGain();l.frequency.value=o.vr||5.6;const vd=t+(o.vd??.15);lg.gain.setValueAtTime(0,t);lg.gain.setValueAtTime(0,vd);lg.gain.linearRampToValueAtTime(o.vib,vd+.12);l.connect(lg);lg.connect(os.detune);l.start(t);l.stop(end+r+.05)}
  os.start(t);os.stop(end+r+.05);
 }
 function noise(o){
  const t=Math.max(o.t||0,ctx.currentTime),dur=o.dur||.1,a=o.a??.002,v=o.v??.2;
  const src=ctx.createBufferSource();src.buffer=o.short?NS:NL;src.loop=true;src.playbackRate.setValueAtTime(o.rate||1,t);if(o.rate2)src.playbackRate.exponentialRampToValueAtTime(o.rate2,t+dur);
  let node=src;if(o.ft){const f=ctx.createBiquadFilter();f.type=o.ft;f.frequency.setValueAtTime(o.ff||1000,t);if(o.ff2)f.frequency.exponentialRampToValueAtTime(o.ff2,t+dur);f.Q.value=o.q??.8;src.connect(f);node=f}
  const g=ctx.createGain(),end=t+dur;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+a);
  if(o.hold){const r=o.r??.2;g.gain.setValueAtTime(v,Math.max(t+a,end-r));g.gain.linearRampToValueAtTime(0,end)}else{g.gain.exponentialRampToValueAtTime(.0008,end);g.gain.linearRampToValueAtTime(0,end+.01)}
  node.connect(g);g.connect(o.bus||sfxG);if(o.echo){const e=ctx.createGain();e.gain.value=o.echo;g.connect(e);e.connect(echoIn)}
  src.start(t,Math.random()*.5);src.stop(end+.05);
 }
 const notes=(list,t0,bus)=>list.forEach(([dt,w,m,du,v,ex])=>tone(Object.assign({w,f:mtof(m),t:t0+dt,dur:du,v,bus},ex||{})));
 function duck(sec){if(!ctx)return;const t=ctx.currentTime;musG.gain.cancelScheduledValues(t);musG.gain.setValueAtTime(musG.gain.value,t);musG.gain.linearRampToValueAtTime(.08,t+.06);musG.gain.setValueAtTime(.08,t+sec);musG.gain.linearRampToValueAtTime(.5,t+sec+.8)}

 /* ---------- batterie ---------- */
 const DR={
  k:(t,b)=>{tone({w:'tri',f:170,f2:42,sl:.09,t,dur:.11,v:.55,a:.001,d:.1,s:.3,r:.03,bus:b});noise({t,dur:.03,v:.1,rate:.5,ft:'lowpass',ff:900,bus:b})},
  s:(t,b)=>{noise({t,dur:.15,v:.24,rate:.75,ft:'bandpass',ff:2300,q:.5,bus:b});tone({w:'tri',f:240,f2:140,t,dur:.06,v:.22,bus:b})},
  h:(t,b)=>noise({t,dur:.03,v:.06,rate:1,ft:'highpass',ff:7000,bus:b}),
  o:(t,b)=>noise({t,dur:.18,v:.05,rate:1,ft:'highpass',ff:6500,bus:b}),
  c:(t,b)=>noise({t,dur:1,v:.12,rate:.9,ft:'highpass',ff:4000,bus:b}),
  t:(t,b)=>tone({w:'tri',f:210,f2:90,t,dur:.12,v:.3,bus:b})
 };
 /* ---------- morceaux (accords + mélodies notées « note:durée » en doubles-croches) ---------- */
 const SONGS={
  titre:{bpm:84,chords:['Am','F','G','E','Am','F','Dm','E'],
   voices:[{w:'p25',v:.1,echo:.35,vib:14,seq:'A4:6 C5:2 E5:4 D5:2 C5:2 C5:6 A4:2 F4:4 A4:2 C5:2 B4:6 D5:2 G5:4 F5:2 D5:2 E5:8 G#4:4 B4:4 A5:6 G5:2 E5:4 C5:2 E5:2 F5:6 E5:2 C5:4 A4:2 C5:2 D5:4 F5:4 E5:4 D5:2 C5:2 B4:8 G#4:4 E4:4'}],
   bass:{style:'oct8',v:.2},arp:{w:'p12',style:'up16',v:.028,oct:4,echo:.2},
   drums:{k:'x.......x.......',s:'....x.......x...',h:'..x...x...x...x.'},fill:{s:'....x.......x.xx',c:'x...............'}},
  menu:{bpm:72,chords:['Dm','Bb','C','A','Dm','Gm','A','Dm'],
   voices:[{w:'p25',v:.075,echo:.42,vib:10,seq:'F5:4 E5:2 D5:2 A4:8 D5:4 C5:2 Bb4:2 F4:8 E5:4 F5:2 G5:2 C5:6 E5:2 C#5:8 E5:4 A4:4 A5:4 G5:2 F5:2 D5:8 Bb5:4 A5:2 G5:2 D5:8 C#5:4 D5:2 E5:2 G5:4 F5:2 E5:2 D5:12 r:4'}],
   bass:{style:'walk',v:.17},arp:{w:'p12',style:'box',v:.028,oct:4,echo:.3},
   drums:{k:'x.........x.....',h:'....x.......x...'}},
  monde:{bpm:100,chords:['Em','F','Em','B','Em','F','C','B'],
   voices:[{w:'p25',v:.075,echo:.3,vib:12,seq:'E5:6 G5:2 F#5:4 E5:4 F5:8 A5:4 C6:4 B5:6 A5:2 G5:4 F#5:4 D#5:8 F#5:4 B4:4 r:16 r:8 A4:4 C5:4 E5:4 D5:4 C5:4 B4:4 B4:8 D#5:4 F#5:4'}],
   bass:{style:'walk',v:.19},arp:{w:'tri',style:'box',v:.06,oct:5},
   drums:{k:'x.......x.......',h:'..x...x...x...x.'}},
  combat:{bpm:150,chords:['Bm','G','A','F#','Bm','G','Em','F#'],
   voices:[{w:'p25',v:.095,echo:.2,vib:12,seq:'B4:2 D5:2 F#5:4 E5:2 D5:2 C#5:2 D5:2 B4:4 G4:4 B4:2 D5:2 G5:4 A5:4 G5:2 F#5:2 E5:4 C#5:4 F#5:8 A#4:4 C#5:4 B5:4 A5:2 F#5:2 D5:4 B4:4 D5:2 E5:2 G5:4 F#5:2 E5:2 D5:4 E5:4 G5:4 B5:4 A5:2 G5:2 F#5:12 r:4'},
           {w:'p50',v:.035,tr:-12,seq:'B4:2 D5:2 F#5:4 E5:2 D5:2 C#5:2 D5:2 B4:4 G4:4 B4:2 D5:2 G5:4 A5:4 G5:2 F#5:2 E5:4 C#5:4 F#5:8 A#4:4 C#5:4 B5:4 A5:2 F#5:2 D5:4 B4:4 D5:2 E5:2 G5:4 F#5:2 E5:2 D5:4 E5:4 G5:4 B5:4 A5:2 G5:2 F#5:12 r:4'}],
   bass:{style:'drive',v:.21},arp:{w:'p12',style:'stab',v:.026,oct:4},
   drums:{k:'x.....x...x.....',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.'},fill:{s:'....x.......xxxx'}},
  alerte:{bpm:172,chords:['Bm','C','Bm','C'],
   voices:[{w:'p12',v:.05,seq:'B5:1 r:1 B5:1 r:13 C6:1 r:1 C6:1 r:13 B5:1 r:1 B5:1 r:13 C6:1 r:1 C6:1 r:5 D6:1 r:1 D6:1 r:5'}],
   bass:{style:'drive',v:.22},arp:{w:'p12',style:'up16',v:.025,oct:4},
   drums:{k:'x...x...x...x...',h:'xxxxxxxxxxxxxxxx'}},
  album:{bpm:66,chords:['Am','Em','F','C','Dm','Am','E','Am'],
   voices:[{w:'tri',v:.17,echo:.45,seq:'E5:4 A5:4 C6:4 B5:4 G5:8 E5:8 A5:4 C6:4 F5:4 A5:4 G5:12 E5:4 F5:4 A5:4 D6:4 C6:4 C6:4 B5:2 A5:2 E5:8 G#5:4 B5:4 E6:4 D6:4 A5:12 r:4'}],
   bass:{style:'long',v:.13},arp:{w:'p12',style:'up8',v:.024,oct:4,echo:.4}},
  gloire:{bpm:132,chords:['Cm','Ab','Bb','G','Cm','Ab','Bb','G'],
   voices:[{w:'p25',v:.095,echo:.25,vib:12,seq:'C5:2 C5:2 G5:4 Eb5:2 F5:2 G5:4 Ab5:4 G5:2 F5:2 Eb5:4 C5:4 D5:2 F5:2 Bb5:4 Ab5:2 G5:2 F5:4 G5:8 B4:4 D5:4 C5:2 C5:2 G5:4 Eb5:2 F5:2 G5:4 Ab5:4 G5:2 F5:2 Eb5:4 C5:4 D5:2 F5:2 Bb5:4 Ab5:2 G5:2 F5:4 G5:12 r:4'}],
   bass:{style:'drive',v:.21},arp:{w:'p50',style:'stab',v:.026,oct:4},
   drums:{k:'x...x...x...x...',s:'....x.......x...',h:'..x...x...x...x.'},fill:{s:'....x.......xxxx'}}
 };
 const NT={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
 const n2m=s=>{const m=/^([A-G])([#b]?)(-?\d)$/.exec(s);if(!m)return null;return 12*(+m[3]+1)+NT[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0)};
 const chord=s=>{const m=/^([A-G][#b]?)(m|dim)?(7)?$/.exec(s);const q=m[2]==='m'?[0,3,7]:m[2]==='dim'?[0,3,6]:[0,4,7];if(m[3])q.push(10);return{n:m[1],q}};
 const BASS={oct8:[[0,0,2],[2,12,2],[4,0,2],[6,12,2],[8,0,2],[10,12,2],[12,0,2],[14,12,2]],walk:[[0,0,4],[4,7,4],[8,12,4],[12,7,4]],long:[[0,0,8],[8,7,8]],drive:[[0,0,2],[2,0,2],[4,0,2],[6,12,2],[8,0,2],[10,0,2],[12,0,2],[14,12,2]]};
 function compile(S){
  const st=60/S.bpm/4,len=S.chords.length*16,ev=Array.from({length:len},()=>[]);
  (S.voices||[]).forEach(V=>{let p=0;V.seq.trim().split(/\s+/).forEach(tok=>{const[n,l]=tok.split(':');const L=+l||1;if(n!=='r'&&p<len){const m=n2m(n);if(m!=null)ev[p].push({w:V.w,m:m+(V.tr||0),l:L,v:V.v,e:V.echo,vib:V.vib})}p+=L})});
  S.chords.forEach((cs,b)=>{const c=chord(cs),o=b*16,last=b===S.chords.length-1;
   if(S.bass){const r=n2m(c.n+'2');BASS[S.bass.style].forEach(([s,iv,l])=>ev[o+s].push({w:'tri',m:r+iv,l,v:S.bass.v}))}
   if(S.arp){const A=S.arp,r=n2m(c.n+A.oct),q=c.q.slice(0,3);const P=(s,iv,l,v)=>ev[o+s].push({w:A.w,m:r+iv,l,v:v||A.v,e:A.echo});
    if(A.style==='up16')for(let s=0;s<16;s++)P(s,q[s%3]+((s/3|0)%2)*12,1);
    if(A.style==='up8')for(let s=0;s<16;s+=2)P(s,[q[0],q[1],q[2],q[0]+12][(s/2)%4],2);
    if(A.style==='box')for(let s=0;s<16;s+=2)P(s,[q[0],q[2],q[1]+12,q[2],q[0]+12,q[2],q[1]+12,q[2]][s/2],2);
    if(A.style==='stab')[2,6,10,14].forEach(s=>q.forEach(iv=>P(s,iv+12,1,A.v*.8)));}
   if(S.drums){const dr=Object.assign({},S.drums,last&&S.fill?S.fill:{});for(const k in dr){const pat=dr[k];for(let s=0;s<16;s++)if(pat[s]==='x')ev[o+s].push({d:k})}}
  });
  return{st,len,ev};
 }
 function tick(){
  if(!seq||!ctx)return;const C=seq.C;
  while(seq.t<ctx.currentTime+.16){
   for(const e of C.ev[seq.step]){if(e.d)DR[e.d](seq.t,seq.bus);else tone({w:e.w,f:mtof(e.m)*rate,t:seq.t,dur:e.l*C.st*.9/rate,v:e.v,a:.004,d:.08,s:.62,r:.04,bus:seq.bus,echo:e.e,vib:e.l>=4?e.vib:0})}
   seq.t+=C.st/rate;seq.step=(seq.step+1)%C.len;
  }
 }
 function stopSeq(){if(timer)clearInterval(timer);timer=null;if(seq&&ctx){const b=seq.bus,t=ctx.currentTime;b.gain.cancelScheduledValues(t);b.gain.setValueAtTime(b.gain.value,t);b.gain.linearRampToValueAtTime(0,t+.3);setTimeout(()=>{try{b.disconnect()}catch(e){}},900)}seq=null}
 function startSeq(name){
  stopSeq();const S=SONGS[name];if(!S)return;if(!S._c)S._c=compile(S);
  const bus=ctx.createGain(),t=ctx.currentTime;bus.gain.setValueAtTime(0,t);bus.gain.linearRampToValueAtTime(1,t+.35);bus.connect(musG);
  seq={name,C:S._c,bus,step:0,t:t+.1};timer=setInterval(tick,25);tick();
 }
 function music(name){want=name;if(!ok())return;if(seq&&seq.name===name)return;if(!name){stopSeq();return}startSeq(name)}
 function ambience(v){
  if(!ctx)return;
  if(v&&on&&!amb){const src=ctx.createBufferSource();src.buffer=NL;src.loop=true;src.playbackRate.value=.9;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=2600;f.Q.value=.35;const g=ctx.createGain();g.gain.setValueAtTime(0,ctx.currentTime);g.gain.linearRampToValueAtTime(.05,ctx.currentTime+1.5);src.connect(f);f.connect(g);g.connect(sfxG);src.start();amb={src,g}}
  else if(!v&&amb){const a=amb;amb=null;a.g.gain.setTargetAtTime(0,ctx.currentTime,.2);setTimeout(()=>{try{a.src.stop()}catch(e){}},1200)}
 }
 let ambWanted=false;
 function setOn(v){
  on=!!v;if(!ctx)return;const t=ctx.currentTime;
  if(on){if(ctx.state!=='running')ctx.resume();master.gain.cancelScheduledValues(t);master.gain.setTargetAtTime(.85,t,.04);if(want)music(want);if(ambWanted)ambience(true)}
  else{master.gain.cancelScheduledValues(t);master.gain.setTargetAtTime(0,t,.03);stopSeq();ambience(false)}
 }
 const P=fn=>(...a)=>{if(ok())try{fn(ctx.currentTime,...a)}catch(e){console.warn(e)}};
 const X={
  move:P(t=>tone({w:'p25',f:1568,t,dur:.022,v:.07,a:.001,d:.02,s:.5,r:.01})),
  ok:P(t=>{tone({w:'p25',f:988,t,dur:.04,v:.09});tone({w:'p25',f:1480,t:t+.05,dur:.07,v:.09,echo:.2})}),
  back:P(t=>{tone({w:'p25',f:784,t,dur:.04,v:.08});tone({w:'p25',f:523,t:t+.05,dur:.07,v:.08})}),
  err:P(t=>{tone({w:'p50',f:110,t,dur:.2,v:.09,s:1});tone({w:'p50',f:117,t,dur:.2,v:.07,s:1})}),
  blip:P((t,who)=>{if(who==='croc')tone({w:'tri',f:131,f2:104,t,dur:.09,v:.32});else if(who==='pnj')tone({w:'p50',f:rnd(520,700),t,dur:.026,v:.045,a:.001});else tone({w:'p12',f:1180+rnd(-40,40),t,dur:.022,v:.05,a:.001})}),
  step:P(t=>noise({t,dur:.025,v:.05,rate:.3,ft:'lowpass',ff:900})),
  swing:P(t=>noise({t,dur:.2,v:.14,rate:.8,ft:'bandpass',ff:450,ff2:3600,q:1,a:.07})),
  hammer:P((t,p=1)=>{noise({t,dur:.5,v:.6*p,rate:.12,ft:'lowpass',ff:1700,ff2:80});tone({w:'tri',f:170,f2:34,sl:.3,t,dur:.36,v:.75*p,a:.001,d:.3,s:.2});noise({short:true,t,dur:.14,v:.12*p,rate:.6});tone({w:'p50',f:92,f2:44,t,dur:.12,v:.12*p})}),
  hit:P(t=>{noise({t,dur:.15,v:.32,rate:.45,ft:'lowpass',ff:3000,ff2:400});tone({w:'p50',f:260,f2:60,t,dur:.12,v:.11})}),
  poof:P(t=>{noise({t,dur:.38,v:.25,rate:.3,ft:'bandpass',ff:1300,ff2:200,q:.7});tone({w:'p25',f:880,f2:110,t,dur:.3,v:.05})}),
  chaos:P(t=>[64,63,58,52].forEach((m,i)=>tone({w:'p50',f:mtof(m-12),t:t+i*.08,dur:.1,v:.07,echo:.3}))),
  good:P(t=>[88,92,95,100].forEach((m,i)=>tone({w:'p25',f:mtof(m),t:t+i*.05,dur:.06,v:.055,echo:.3}))),
  heart:P(t=>{[72,76,79,83,86].forEach((m,i)=>{tone({w:'tri',f:mtof(m),t:t+i*.1,dur:.6,v:.17,echo:.5});tone({w:'p12',f:mtof(m+12),t:t+i*.1,dur:.12,v:.025,echo:.3})});duck(1.2)}),
  link:P(t=>{noise({short:true,t,dur:.55,v:.07,rate:.25});tone({w:'p12',f:220,f2:1760,sl:.55,t,dur:.6,v:.07,echo:.4,vib:30});tone({w:'tri',f:110,f2:55,t,dur:.65,v:.2})}),
  luck:P(t=>tone({w:'p12',f:pick([2093,2349,2637,3136]),t,dur:.04,v:.035,echo:.3})),
  alarm:P((t,hi)=>{tone({w:'p50',f:hi?1319:988,t,dur:.13,v:.085,a:.001,s:1});tone({w:'p50',f:hi?1976:1480,t:t+.15,dur:.1,v:.05,a:.001,s:1})}),
  boom:P(t=>{noise({t,dur:1.9,v:.9,rate:.07,ft:'lowpass',ff:3200,ff2:60,a:.003});noise({t,dur:.5,v:.38,rate:.5});tone({w:'tri',f:120,f2:28,t,dur:1.2,v:.8,a:.002,d:1,s:.3});[76,71,67,64,60,55,52,48].forEach((m,i)=>tone({w:'p50',f:mtof(m),t:t+.05+i*.06,dur:.07,v:.05}))}),
  rumble:P((t,d=1.5)=>noise({t,dur:d,v:.32,rate:.05,ft:'lowpass',ff:220,a:.2,hold:true,r:.4})),
  dice:P(t=>tone({w:'p12',f:rnd(700,2200),t,dur:.016,v:.055,a:.001})),
  coin:P((t,k=0)=>{const m=1+k*.06;tone({w:'p25',f:1319*m,t,dur:.04,v:.055});tone({w:'p25',f:1976*m,t:t+.045,dur:.08,v:.055})}),
  sparkle:P(t=>{for(let i=0;i<9;i++)tone({w:'p12',f:mtof(96+ri(0,12)),t:t+i*.05,dur:.04,v:.03,echo:.45})}),
  sad:P(t=>{tone({w:'tri',f:220,f2:147,sl:.9,t,dur:.9,v:.24,vib:45,vd:.25});tone({w:'p50',f:110,f2:73,sl:.9,t,dur:.9,v:.03})}),
  whoosh:P(t=>noise({t,dur:.22,v:.06,rate:.9,ft:'bandpass',ff:3500,ff2:500,q:.8,a:.05})),
  thud:P(t=>{tone({w:'tri',f:130,f2:48,t,dur:.14,v:.4,a:.001});noise({t,dur:.06,v:.12,rate:.3,ft:'lowpass',ff:700})}),
  open:P(t=>{tone({w:'p25',f:523,f2:1046,t,dur:.08,v:.06});noise({t,dur:.12,v:.04,rate:.9,ft:'highpass',ff:3000})}),
  thunder:P(t=>{noise({t,dur:3.2,v:.55,rate:.045,ft:'lowpass',ff:900,ff2:55,a:.06});noise({t,dur:.45,v:.22,rate:.3,ft:'lowpass',ff:2600,ff2:300})}),
  ene:P(t=>{tone({w:'p12',f:330,f2:1320,sl:.4,t,dur:.42,v:.05,echo:.4})}),
  lvl:P((t,lv=1)=>{for(let i=0;i<lv;i++)tone({w:'p25',f:mtof(72+[0,4,7,12,16][i]),t:t+i*.045,dur:.06,v:.06,echo:.25})}),
  start:P(t=>{[69,72,76,81,84,88,93].forEach((m,i)=>tone({w:'p25',f:mtof(m),t:t+i*.035,dur:.06,v:.08,echo:.4}));noise({t:t+.25,dur:.6,v:.08,rate:.9,ft:'highpass',ff:5000});tone({w:'tri',f:mtof(45),t:t+.25,dur:.6,v:.3})}),
  fanfare:P(t=>{duck(3.2);const L=[[0,'p25',67,.07,.09],[.07,'p25',72,.07,.09],[.14,'p25',75,.07,.09],[.21,'p25',79,.07,.09],[.3,'p25',84,.55,.1,{vib:16,echo:.35}],[.3,'p50',79,.55,.04],[.3,'p50',75,.55,.04],[.3,'tri',48,.55,.25],
   [.92,'p25',82,.11,.09],[1.04,'p25',80,.11,.09],[1.16,'p25',82,.11,.09],[1.3,'p25',84,1.1,.1,{vib:18,echo:.45}],[1.3,'p50',76,1.1,.045],[1.3,'p50',79,1.1,.04],[1.3,'tri',36,1.1,.3],[.92,'tri',44,.35,.25],[1.04,'tri',46,.25,.25]];
   notes(L,t);for(let i=0;i<8;i++)DR.s(t+i*.035,sfxG);DR.c(t+.3,sfxG);DR.k(t+.3,sfxG);DR.c(t+1.3,sfxG);DR.k(t+1.3,sfxG)}),
  rest:P(t=>{duck(3);notes([[0,'tri',69,.22,.2],[.24,'tri',72,.22,.2],[.48,'tri',76,.22,.2],[.72,'tri',81,.5,.2],[1.25,'tri',79,.22,.2],[1.5,'tri',76,.22,.2],[1.75,'tri',81,1,.22],[0,'p12',57,.7,.03],[.72,'p12',64,.5,.03],[1.25,'p12',60,.5,.03],[1.75,'p12',57,1,.03]].map(n=>(n.push({echo:.45}),n)),t)}),
  save:P(t=>{notes([[0,'p25',84,.06,.07],[.07,'p25',91,.06,.07],[.14,'p25',96,.3,.07,{echo:.5}],[0,'tri',60,.3,.2]],t)}),
  croc:P(t=>tone({w:'tri',f:110,f2:98,t,dur:.18,v:.3}))
 };
 /* ---------- extensions (utilisées par la BALADE, balade.js) ---------- */
 /* nouveau bruitage : fn(t,{tone,noise,mtof},...args) */
 function def(name,fn){X[name]=P((t,...a)=>fn(t,{tone,noise,mtof},...a))}
 /* nouveau morceau pour le séquenceur */
 function song(name,S){SONGS[name]=S;delete S._c}
 /* ralenti « bande magnétique » : k de 0 (normal) à 1 (ralenti total) → tempo et hauteur baissent, son étouffé */
 function slow(k){k=clamp(+k||0,0,1);if(Math.abs(k-slowK)<.01&&(k===0)===(slowK===0))return;slowK=k;rate=1-.3*k;if(!ctx)return;const t=ctx.currentTime;
  musF.frequency.setTargetAtTime(20000*Math.pow(520/20000,k),t,.04);sfxF.frequency.setTargetAtTime(20000*Math.pow(2600/20000,k),t,.04)}
 /* boucle continue (pluie, bourdonnement de néon…) → {set(volume,fréq. filtre),stop()} */
 function drone(o){
  if(!ctx)return null;const g=ctx.createGain();g.gain.value=0;let src,f=null;
  if(o.noise){src=ctx.createBufferSource();src.buffer=o.short?NS:NL;src.loop=true;src.playbackRate.value=o.rate||1}
  else{src=ctx.createOscillator();const w=WV[o.w];if(w)src.setPeriodicWave(w);else src.type=o.w||'sawtooth';src.frequency.value=o.f||110}
  let node=src;if(o.ft){f=ctx.createBiquadFilter();f.type=o.ft;f.frequency.value=o.ff||1000;f.Q.value=o.q??.7;src.connect(f);node=f}
  node.connect(g);g.connect(sfxG);src.start();let dead=false;
  return{set(v,ff,tc=.12){if(dead)return;const t=ctx.currentTime;g.gain.setTargetAtTime(Math.max(0,v),t,tc);if(f&&ff)f.frequency.setTargetAtTime(ff,t,tc)},
   stop(){if(dead)return;dead=true;const t=ctx.currentTime;g.gain.cancelScheduledValues(t);g.gain.setTargetAtTime(0,t,.06);setTimeout(()=>{try{src.stop();src.disconnect();g.disconnect();f&&f.disconnect()}catch(e){}},450)}};
 }
 return{init,setOn,music,ambience(v){ambWanted=v;ambience(v)},X,def,song,slow,drone,get on(){return on},get ready(){return!!ctx}};
})();
const SFX=AU.X;

/* =====================================================================
   BOÎTE DE DIALOGUE — lettre par lettre, avec « blips ».
   Croc est muet : quand il « parle », la boîte n'affiche que « …… ».
   ===================================================================== */
const FACE={};
function drawFace(cv,who){
 const x=cv.getContext('2d');x.imageSmoothingEnabled=false;x.fillStyle=COL.ink;x.fillRect(0,0,32,32);
 if(who==='croc'){
  if(FACE.croc)x.drawImage(FACE.croc,0,0);
  else{x.drawImage(crocSprite('down',0),0,0,16,12,0,4,32,24)}
 }else if(who==='rel'&&FACE.rel){x.drawImage(FACE.rel,0,0,32,32);
 }else if(who==='pnj'){
  x.fillStyle=COL.night;x.fillRect(0,0,32,32);x.drawImage(npcSprite(FACE.pnjPal||0,0),0,0,12,10,-2,2,36,30);
 }else{
  /* l'œil du Système */
  for(let y=0;y<32;y++)for(let i=0;i<32;i++){const dx=Math.abs(i-15.5),dy=Math.abs(y-15.5);const d=dx+dy*1.6;
   let c=null;if(d<6)c=d<3?COL.ink:COL.ice;else if(d<9)c=COL.ice2;else if(d<11)c=bay(i,y)<.5?COL.ice0:null;else if(d<12.5)c=COL.ice0;
   if(c){x.fillStyle=c;x.fillRect(i,y,1,1)}}
  x.fillStyle=COL.white;x.fillRect(17,12,2,2);
  x.fillStyle=COL.ice2;x.fillRect(2,2,4,1);x.fillRect(2,2,1,4);x.fillRect(26,29,4,1);x.fillRect(29,26,1,4);
 }
}
const DLG=(()=>{
 let queue=Promise.resolve(),isOpen=false,adv=null,typing=false,finish=false,skipAll=false,prevFocus=null;
 const box=()=>$('#dlgBox');
 function open(){if(isOpen)return;isOpen=true;skipAll=false;prevFocus=document.activeElement;$('#dlg').hidden=false;box().focus({preventScroll:true})}
 function close(){isOpen=false;$('#dlg').hidden=true;$('#dlgText').textContent='';if(prevFocus&&document.contains(prevFocus)&&!prevFocus.closest('[hidden]'))prevFocus.focus({preventScroll:true})}
 async function line(L){
  const who=L.who||'sys';const b=box();b.className='dlg-box win '+who;
  $('#dlgName').textContent=L.name||(who==='croc'?(D.nom||'CROC'):who==='pnj'?'PNJ':'SYSTÈME');
  if(who==='pnj')FACE.pnjPal=L.pal||0;
  drawFace($('#dlgFace'),who);
  const txt=who==='croc'?'……':String(L.t||'');
  $('#dlgLive').textContent=(who==='croc'?(D.nom||'Croc')+' ne dit rien.':txt);
  const el=$('#dlgText'),nx=$('#dlgNext');nx.classList.remove('on');el.textContent='';
  typing=true;finish=skipAll;
  const chars=[...txt];
  for(let i=0;i<chars.length;i++){
   if(finish){el.textContent=txt;break}
   el.textContent+=chars[i];const c=chars[i];
   if(who==='croc'){SFX.blip('croc');await sleep(RM?60:300)}
   else{if(c!==' '&&i%2===0)SFX.blip(who==='rel'?'pnj':who);await sleep(/[.!?…]/.test(c)?110:/[,;:]/.test(c)?70:RM?8:24)}
  }
  typing=false;nx.classList.add('on');
  if(skipAll)return;
  await new Promise(r=>{adv=r});
 }
 async function run(lines){open();for(const L of lines){if(skipAll)break;await line(L)}close()}
 function advance(){if(!isOpen)return;if(typing){finish=true;return}if(adv){const a=adv;adv=null;SFX.move();a()}}
 function skip(){if(!isOpen)return;skipAll=true;finish=true;if(adv){const a=adv;adv=null;a()}SFX.back()}
 function key(e){
  if(e.key==='Enter'||e.key===' '||e.key==='z'||e.key==='Z'){e.preventDefault();advance()}
  else if(e.key==='Escape'){e.preventDefault();skip()}
  else if(e.key==='Tab'){e.preventDefault();box().focus()}
 }
 function say(lines){queue=queue.then(()=>run(lines)).catch(()=>{});return queue}
 return{say,key,advance,get open(){return isOpen}};
})();

/* =====================================================================
   ÉCRAN TITRE — pluie pixel, lune rouge, éclairs, Croc de dos sur le rempart.
   ===================================================================== */
const Title=(()=>{
 let cv,x,W=200,H=120,s=4,raf=0,last=0,T=0,drops=[],stars=[],splash=[],bolt=null,nextBolt=4,sky=null,logoDrips=[],reveal=0,active=false,towers=[];
 function resize(){
  s=clamp(Math.floor(Math.min(innerWidth/150,innerHeight/105)),2,7);W=Math.ceil(innerWidth/s);H=Math.ceil(innerHeight/s);cv.width=W;cv.height=H;
  stars=Array.from({length:Math.round(W*H/90)},()=>({x:ri(0,W),y:ri(0,H*.6),p:Math.random()*6,c:Math.random()<.2?COL.ice:COL.bone2}));
  drops=Array.from({length:Math.round(W*H/70)},()=>newDrop(true));
  logo=null;towers=[];let tx=-4;while(tx<W){const w=ri(8,22);towers.push({x:tx,w,h:ri(10,34),win:Math.random()<.5});tx+=w+ri(0,6)}
  buildSky();
 }
 const wallY=()=>Math.round(H-Math.max(26,H*.2));
 const logoY=()=>Math.round(Math.max(10,H*.2-12));
 function buildSky(){
  sky=document.createElement('canvas');sky.width=W;sky.height=H;const g=sky.getContext('2d');
  const bands=[COL.ink,'#100d18',COL.night,COL.deep,COL.vio];const wy=wallY();
  for(let y=0;y<H;y++){const f=clamp(y/(wy-4),0,1)*(bands.length-1);const i=Math.floor(f),fr=f-i;for(let xx=0;xx<W;xx++){g.fillStyle=bands[Math.min(bands.length-1,i+(fr>bay(xx,y)?1:0))];g.fillRect(xx,y,1,1)}}
  /* lune rouge */
  const mr=Math.round(Math.min(W,H)*.16),mx=Math.round(W>H?W*.8:W*.74),my=Math.round(W>H?H*.3:logoY()+60+mr);
  for(let y=-mr-8;y<=mr+8;y++)for(let xx=-mr-8;xx<=mr+8;xx++){const d=Math.hypot(xx,y);let c=null;
   if(d<=mr){const sh=(xx+y*.6)/mr;c=sh>.35?(bay(xx+99,y+99)<.5?COL.blood:COL.blood0):sh>.1&&bay(xx,y)<(sh-.1)*3?COL.blood:COL.blood2;
    const cr=Math.hypot(xx+mr*.3,y-mr*.2),cr2=Math.hypot(xx-mr*.35,y+mr*.35);if(cr<mr*.18||cr2<mr*.12)c=COL.blood;if(d>mr-1.2)c=COL.blood;}
   else if(d<mr+8&&bay(xx,y)<(1-(d-mr)/8)*.35)c=COL.blood0;
   if(c){g.fillStyle=c;g.fillRect(Math.round(mx+xx),Math.round(my+y),1,1)}}
  /* tours lointaines du Dédale */
  for(const t of towers){g.fillStyle='#120f1c';g.fillRect(t.x,wy-t.h,t.w,t.h);for(let i=0;i<t.w;i+=4)g.fillRect(t.x+i,wy-t.h-2,2,2);if(t.win){g.fillStyle=COL.blood0;g.fillRect(t.x+Math.floor(t.w/2),wy-t.h+5,1,2)}}
  /* rempart proche */
  g.fillStyle=COL.ink;g.fillRect(0,wy,W,H-wy);
  for(let i=0;i<W;i+=12){g.fillRect(i,wy-5,7,5)}
  g.fillStyle=COL.night;for(let y=wy+3;y<H;y+=5)for(let i=((y/5)%2?0:6);i<W;i+=12)g.fillRect(i,y,10,1);
  g.fillStyle=COL.vio;g.fillRect(0,wy,W,1);for(let i=0;i<W;i+=12)g.fillRect(i,wy-5,7,1);
 }
 function newDrop(any){return{x:rnd(-20,W+20),y:any?rnd(-H,H):rnd(-30,-2),v:rnd(110,190),l:ri(2,4),c:Math.random()<.25?COL.gray:COL.vio2}}
 let logo=null;
 function buildLogo(){
  const sc=W>=130?4:3,txt=D.nom||'CROC',tw=textW(txt,sc);logo=document.createElement('canvas');logo.width=tw+8;logo.height=sc*7+10;const g=logo.getContext('2d');const ox=3,oy=3;
  for(let dy=-2;dy<=sc+2;dy++)for(let dx=-2;dx<=2;dx++)drawText(g,txt,ox+dx,oy+dy,COL.ink,sc);
  for(let d=sc;d>=1;d--)drawText(g,txt,ox,oy+d,d>sc/2?COL.blood0:COL.blood,sc);
  drawText(g,txt,ox,oy,null,sc,r=>r<1?COL.white:r<4?COL.bone:r<6?COL.bone2:COL.gray2);
  logo.lx=Math.round((W-tw)/2)-ox;logo.sc=sc;logo.tw=tw;
 }
 function drawLogo(){
  if(!logo)buildLogo();const sc=logo.sc,tw=logo.tw,lx=logo.lx+3,ly=logoY();x.drawImage(logo,logo.lx,ly-3);
  /* gouttes de sang qui perlent des lettres */
  if(!RM&&Math.random()<.04&&logoDrips.length<6){logoDrips.push({x:lx+ri(0,tw-1),y:ly+sc*7,l:0,v:0})}
  for(const d of logoDrips){d.l+=.12;if(d.l>3)d.v+=.06;d.y+=d.v;x.fillStyle=COL.blood2;x.fillRect(Math.round(d.x),Math.round(d.y),1,Math.round(Math.min(3,d.l)));x.fillStyle=COL.blood;x.fillRect(Math.round(d.x),Math.round(d.y)-1,1,1)}
  logoDrips=logoDrips.filter(d=>d.y<H);
  const sub='LE DÉDALE',sw=textW(sub,1);drawTextOutlined(x,sub,Math.round((W-sw)/2),ly+sc*7+sc+8,COL.gray2,1);
 }
 function frame(now){
  raf=requestAnimationFrame(frame);const dt=Math.min(.05,(now-(last||now))/1000);last=now;if(!dt&&T)return;T+=dt;
  x.drawImage(sky,0,0);
  for(const st of stars){const tw=RM?0:Math.sin(T*2+st.p);if(tw>-.2){x.fillStyle=st.c;x.fillRect(st.x,st.y,1,1);if(tw>.92){x.fillRect(st.x-1,st.y,3,1);x.fillRect(st.x,st.y-1,1,3)}}}
  /* éclair */
  nextBolt-=dt;if(nextBolt<=0&&!RM){nextBolt=rnd(7,14);const pts=[];let bx=rnd(W*.1,W*.9),by=0;while(by<wallY()-20){pts.push([bx,by]);bx+=rnd(-6,6);by+=rnd(3,7)}bolt={t:0,pts};if(active)setTimeout(()=>SFX.thunder(),260)}
  if(bolt){bolt.t+=dt;const on=bolt.t<.08||(bolt.t>.14&&bolt.t<.22);if(on){x.fillStyle='rgba(232,224,204,.18)';x.fillRect(0,0,W,wallY());x.fillStyle=COL.white;for(let i=1;i<bolt.pts.length;i++){const[a,b]=bolt.pts[i-1],[c,d]=bolt.pts[i];const n=Math.max(Math.abs(c-a),Math.abs(d-b));for(let k=0;k<=n;k++)x.fillRect(Math.round(a+(c-a)*k/n),Math.round(b+(d-b)*k/n),1,1)}}if(bolt.t>.3)bolt=null}
  drawLogo();
  /* Croc de dos sur le rempart, marteau sur l'épaule, manteau qui claque */
  const k=H>W*1.2?2:1,wy=wallY(),cx=Math.round(W/2-8*k),cy=wy-24*k;const sp=crocSprite('up',RM?0:Math.floor(T/1.3)%2);
  x.drawImage(sp,cx,cy,16*k,24*k);drawHammer(x,cx,cy,'up',k);
  const fl=Math.floor(T*5)%2;x.fillStyle=PAL.c;x.fillRect(cx+(fl?15:16)*k,cy+(15+fl)*k,k,3*k);x.fillRect(cx+(fl?16:17)*k,cy+17*k,k,k);x.fillStyle=PAL.h;x.fillRect(cx+(fl?13:14)*k,cy+(fl?0:1)*k,k,k);
  /* pluie */
  const mv=RM?0:dt;
  for(const d of drops){d.y+=d.v*mv;d.x-=d.v*mv*.28;x.fillStyle=d.c;for(let k=0;k<d.l;k++)x.fillRect(Math.round(d.x+k*.28),Math.round(d.y-k),1,1);
   if(d.y>=wy-1&&d.y<wy+3&&Math.random()<.5){splash.push({x:d.x,y:wy-1,t:0});Object.assign(d,newDrop(false))}else if(d.y>H)Object.assign(d,newDrop(false))}
  x.fillStyle=COL.gray;for(const p of splash){p.t+=dt;x.fillRect(Math.round(p.x)-1,p.y-(p.t<.05?1:0),1,1);x.fillRect(Math.round(p.x)+1,p.y-(p.t<.05?1:0),1,1)}splash=splash.filter(p=>p.t<.1);
  /* apparition tramée */
  if(reveal<1){reveal=Math.min(1,reveal+dt*1.3);x.fillStyle=COL.ink;for(let y=0;y<H;y++)for(let i=0;i<W;i++)if(bay(i,y)>=reveal)x.fillRect(i,y,1,1)}
 }
 function start(){if(!cv){cv=$('#tcv');x=cv.getContext('2d');addEventListener('resize',()=>{if(raf)resize()})}resize();reveal=RM?1:0;last=0;cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);active=true}
 function stop(){cancelAnimationFrame(raf);raf=0;active=false}
 return{start,stop};
})();

/* =====================================================================
   ÉTAT DE LA PARTIE + HUD + MENU
   ===================================================================== */
const SAVE_KEY='croc-retro-sauvegarde';
const G={chaos:0,cata:0,coups:0,chLv:1,marques:0,abattus:0,renfort:0,chPret:true,elapsed:0,ene:100,lv:1,journal:[false,false,false,false],screen:null,booted:false,inGame:false,met:{}};
(function restore(){const s=store.get(SAVE_KEY,null);if(s&&typeof s==='object'){G.chaos=+s.chaos||0;G.cata=+s.cata||0;G.coups=+s.coups||0;G.elapsed=+s.elapsed||0;if(Array.isArray(s.journal))G.journal=s.journal.slice(0,4).map(Boolean).concat([false,false,false,false]).slice(0,4)}})();
const fmtTime=s=>`${pad(Math.floor(s/3600))}:${pad(Math.floor(s/60)%60)}:${pad(Math.floor(s%60))}`;
function hud(){
 $('#chaosN').textContent=G.chaos;$('#cataN').textContent=G.cata;$('#timeN').textContent=fmtTime(G.elapsed);
 const e=$('#sideEne');if(e)e.style.width=G.ene+'%';
}
function addChaos(){G.chaos++;hud();const h=$('#hudChaos');h.classList.remove('bump');void h.offsetWidth;h.classList.add('bump')}
setInterval(()=>{if(G.inGame&&!document.hidden){G.elapsed++;$('#timeN').textContent=fmtTime(G.elapsed)}},1000);

function syncSound(){const b=$('#sndBtn');b.setAttribute('aria-pressed',AU.on);$('b',b).textContent=AU.on?'ON':'OFF'}
function toggleSound(){AU.init();AU.setOn(!AU.on);syncSound();if(AU.on)SFX.ok()}
function syncCrt(){const on=document.body.classList.contains('crt');const b=$('#crtBtn');b.setAttribute('aria-pressed',on);$('b',b).textContent=on?'ON':'OFF'}

/* déplacement du curseur-main */
function placeHand(hand,el,off=2){if(!hand||!el)return;const y=el.offsetTop+el.offsetHeight/2-11;hand.style.transform=`translate(${el.offsetLeft+off}px,${y}px)`}
/* navigation flèches dans un groupe de boutons */
function rove(container,sel,{onMove,horizontal=true,vertical=true}={}){
 container.addEventListener('keydown',e=>{
  const items=$$(sel,container).filter(b=>!b.disabled&&b.offsetParent!==null);const i=items.indexOf(document.activeElement);if(i<0)return;
  let j=-1;if((vertical&&e.key==='ArrowDown')||(horizontal&&e.key==='ArrowRight'))j=(i+1)%items.length;else if((vertical&&e.key==='ArrowUp')||(horizontal&&e.key==='ArrowLeft'))j=(i-1+items.length)%items.length;else if(e.key==='Home')j=0;else if(e.key==='End')j=items.length-1;
  if(j>=0){e.preventDefault();e.stopPropagation();items[j].focus();SFX.move();onMove&&onMove(items[j])}
 });
}

const SCREENS={};
let unmount=null,switching=false;
async function go(name,{focus=true}={}){
 if(switching||!SCREENS[name])return;if(G.screen===name&&$('#panel').childElementCount){if(focus)focusPanel();return}
 switching=true;const panel=$('#panel');
 SFX.whoosh();
 await mosaic(panel,async()=>{
  if(unmount){try{unmount()}catch(e){console.error(e)}unmount=null}
  panel.innerHTML='';G.screen=name;
  $$('.mi').forEach(m=>{if(m.dataset.go===name)m.setAttribute('aria-current','page');else m.removeAttribute('aria-current')});
  const S=SCREENS[name];if(S.song!==undefined)AU.music(S.song);
  unmount=S.mount(panel)||null;
 });
 switching=false;if(focus&&!DLG.open)focusPanel();
 const top=$('#panel').getBoundingClientRect().top;if(top<0||top>innerHeight*.6)$('#panel').scrollIntoView({behavior:RM?'auto':'smooth',block:'start'});
}
function focusPanel(){const h=$('#panel h2');if(h)h.focus({preventScroll:true})}
const head=(t,sub)=>`<div class="scr-head"><h2 tabindex="-1">${esc(t)}</h2>${sub?`<p>${sub}</p>`:''}</div>`;

/* =====================================================================
   STATUT
   ===================================================================== */
SCREENS.statut={song:'menu',mount(p){
 const champs=(D.champs||[]);const stats=D.stats||[];const rolls=D.rolls||[];
 p.innerHTML=head('STATUT','[SYSTÈME] Fiche du personnage')+`
 <div class="st-top">
  <div class="portrait-col">
   <button type="button" class="portrait" id="ptr" aria-label="Parler à ${esc(D.nom||'Croc')}"><canvas width="64" height="64"></canvas><span class="say">PARLER ▶</span></button>
   <div class="who"><p class="nm">${esc(D.nom||'???')}</p><p class="cls">${esc(D.sousTitre||'')}</p>
    <div class="bar-row"><span class="lbl">ENE</span><span class="pbar"><i id="stEne"></i></span><span>${G.ene} %</span></div></div>
  </div>
  <div class="box"><h3 class="cap">IDENTITÉ <small>[SYSTÈME]</small></h3>
   <dl class="idl">${champs.map(c=>`<div><dt>${esc(c.label)}</dt><span class="dots"></span><dd class="${String(c.valeur).trim()==='???'?'unk':''}">${esc(c.valeur)}</dd></div>`).join('')}</dl>
   ${(D.physique||[]).length?`<ul class="phys">${D.physique.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:''}
  </div>
 </div>
 <div class="st-mid">
  <div class="box"><h3 class="cap">CARACTÉRISTIQUES <small>SUR 20</small></h3><div class="stats">${stats.map((s,i)=>`
   <div class="stat" data-v="${+s.val||0}"><span class="n">${esc(s.nom)}${s.bonus?`<button type="button" class="bonus" title="Bonus de titre" aria-label="${esc(s.bonus)} : bonus du titre, voir TITRES">${esc(s.bonus)}</button>`:''}</span>
   <span class="segs" aria-hidden="true">${'<i></i>'.repeat(+s.max||20)}</span><span class="v"><b class="cnt">0</b><small>/${+s.max||20}</small></span></div>`).join('')}</div></div>
  <div class="box"><h3 class="cap">ROLLS <small>SUR 100</small></h3><div class="rolls">${rolls.map(r=>{const v=+r.val||0;return`
   <div class="roll ${v>=100?'max':v<=10?'low':''}" data-v="${v}"><div class="top"><span>${esc(r.nom)}${v>=100?'<span class="tag">MAX</span>':''}</span><span class="num"><b class="cnt">0</b><small>/100</small></span></div><div class="gauge"><i></i></div></div>`}).join('')}</div></div>
 </div>`;
 $('#stEne').style.width=G.ene+'%';
 /* portrait pixelisé */
 const pc=$('#ptr canvas'),px=pc.getContext('2d');px.imageSmoothingEnabled=false;px.fillStyle=COL.ink;px.fillRect(0,0,64,64);
 loadImg('images/croc-sourire.jpg').then(im=>{const c=pixelArt(im,64,{crop:[70,0,440,440],dither:true});px.drawImage(c,0,0)}).catch(()=>{px.drawImage(crocSprite('down',0),0,0,16,12,0,8,64,48)});
 $('#ptr').onclick=()=>DLG.say([{who:'croc'},{who:'sys',t:'[SYSTÈME] Aucune réponse. '+((D.physique||[]).find(t=>/muet/i.test(t))||'')}]);
 $$('.bonus',p).forEach(b=>b.onclick=()=>{SFX.ok();go('titres')});
 /* remplissage animé */
 const timers=[];const T=(f,ms)=>timers.push(setTimeout(f,RM?0:ms));
 $$('.stat',p).forEach((st,i)=>{const v=+st.dataset.v,segs=$$('.segs i',st),cnt=$('.cnt',st);
  for(let k=0;k<v&&k<segs.length;k++)T(()=>{segs[k].classList.add('on');cnt.textContent=k+1;SFX.coin(i*.6+k)},300+i*140+k*110)});
 $$('.roll',p).forEach((r,i)=>{const v=+r.dataset.v,g=$('.gauge i',r),cnt=$('.cnt',r);const st=1300+i*700;const steps=Math.max(1,Math.min(20,v));
  for(let k=1;k<=steps;k++)T(()=>{const val=Math.round(v*k/steps);g.style.width=val+'%';cnt.textContent=val;if(k%2===0||v<10)SFX.dice()},st+k*45);
  T(()=>{if(v>=100){r.classList.add('full');SFX.sparkle();sparks(r)}else if(v<=10)SFX.sad()},st+steps*45+120)});
 const sp=setInterval(()=>{const m=$('.roll.max.full',p);if(m&&!RM)sparks(m,2)},1400);
 return()=>{timers.forEach(clearTimeout);clearInterval(sp)};
}};
function sparks(el,n=7){const g=$('.gauge',el);if(!g)return;for(let i=0;i<n;i++){const s=document.createElement('i');s.className='spark';s.style.left=rnd(2,96)+'%';s.style.top=rnd(10,70)+'%';s.style.animationDelay=(i*.08)+'s';g.appendChild(s);setTimeout(()=>s.remove(),1400)}}

/* =====================================================================
   PSYCHÉ — scène « overworld » : le monde vu par Croc.
   Tout le monde porte une étiquette NPC… sauf son frère.
   ===================================================================== */
function drawLabel(x,txt,cx,top,fg,bg,bd){
 const w=textW(txt,1)+6,h=11,l=Math.round(cx-w/2),t=Math.round(top-h);
 x.fillStyle=bd;x.fillRect(l-1,t-1,w+2,h+2);x.fillStyle=bg;x.fillRect(l,t,w,h);
 x.fillStyle=bd;x.fillRect(Math.round(cx)-1,t+h+1,3,1);x.fillRect(Math.round(cx),t+h+2,1,1);
 drawText(x,txt,l+3,t+2,fg,1);
}
function Overworld(cv,hooks){
 const W=256,H=160;let VW=W,cam=0;cv.height=H;const x=cv.getContext('2d');
 const fitView=()=>{const nv=(cv.parentElement&&cv.parentElement.clientWidth<520)?160:W;if(nv!==VW||cv.width!==nv){VW=nv;cv.width=VW;cv.style.aspectRatio=VW+'/'+H;x.imageSmoothingEnabled=false;buildVig()}};
 const SOL=[[0,0,256,44],[0,0,16,160],[240,0,16,160],[0,146,256,14],[64,86,16,8],[176,86,16,8]];
 const PIL=[{x:72,y:94},{x:184,y:94}];
 /* ---- décor pré-rendu ---- */
 const bg=document.createElement('canvas');bg.width=W;bg.height=H;(()=>{const g=bg.getContext('2d');const R=(a,b,c,d,col)=>{g.fillStyle=col;g.fillRect(a,b,c,d)};
  R(0,0,W,H,COL.night);
  for(let y=44;y<146;y++)for(let i=16;i<240;i++){const tx=(i+(Math.floor((y-44)/16)%2?8:0))%16,ty=(y-44)%16;let c=(tx===0||ty===0)?'#110e19':(bay(i,y)<.12?COL.deep:COL.night);if(tx===1||ty===1)c=bay(i,y)<.5?'#211a31':c;g.fillStyle=c;g.fillRect(i,y,1,1)}
  /* lueur des torches sur le sol */
  for(const tx of[56,200])for(let y=44;y<110;y++)for(let i=tx-50;i<tx+50;i++){const d=Math.hypot((i-tx)*.8,(y-44)*1.4)/60;if(d<1&&bay(i,y)<(1-d)*.32)R(i,y,1,1,'#3a1622')}
  /* taches de sang */
  [[40,120,5],[150,64,4],[214,132,3],[110,136,4]].forEach(([a,b,r])=>{for(let y=-r;y<=r;y++)for(let i=-r*2;i<=r*2;i++)if(Math.hypot(i*.5,y)<r&&bay(a+i,b+y)<.7)R(a+i,b+y,1,1,COL.blood0)});
  /* mur du fond en briques */
  R(0,0,W,8,COL.ink);
  for(let y=8;y<40;y++)for(let i=0;i<W;i++){const row=Math.floor((y-8)/6),bx=(i+(row%2?6:0))%12,by=(y-8)%6;let c=(by===0||bx===0)?'#120f1c':(by===1?COL.vio2:COL.vio);if(c===COL.vio&&bay(i,y)<.15)c=COL.deep;R(i,y,1,1,c)}
  R(0,40,W,4,COL.ink);R(0,40,W,1,COL.vio2);
  /* porte rouge */
  R(110,10,36,34,COL.ink);R(112,12,32,32,COL.blood0);R(114,14,13,28,COL.blood);R(129,14,13,28,COL.blood);R(114,14,13,1,COL.blood2);R(129,14,13,1,COL.blood2);R(125,26,2,3,COL.bone2);R(131,26,2,3,COL.bone2);
  /* appliques des torches */
  for(const tx of[56,200]){R(tx-2,22,5,3,COL.gray);R(tx-1,25,3,4,COL.gray);R(tx-2,21,5,1,COL.gray2)}
  /* murs latéraux */
  for(const sx of[0,240]){R(sx,8,16,H-8,COL.ink);for(let y=10;y<H;y+=8)R(sx+(sx?2:3),y,11,6,'#120f1c');R(sx?240:15,8,1,H,COL.vio)}
  R(0,146,W,14,COL.ink);R(16,146,224,1,COL.vio2);
 })();
 let vig=null;function buildVig(){vig=document.createElement('canvas');vig.width=VW;vig.height=H;const g=vig.getContext('2d');g.fillStyle=COL.ink;for(let y=0;y<H;y++)for(let i=0;i<VW;i++){const d=Math.hypot((i-VW/2)/(VW/2),(y-H/2)/(H/2));if(bay(i,y)<(d-.82)*1.6)g.fillRect(i,y,1,1)}}
 VW=0;fitView();const onRs=()=>fitView();addEventListener('resize',onRs);
 /* ---- personnages ---- */
 const croc={x:128,y:126,dir:'up',f:0,ft:0,moving:false,swing:-1,target:null};
 let npcs=[],nid=1,busy=false,hover=null,near=null,parts=[],T=0,raf=0,last=0,alive=true;
 const keys=new Set();
 const free=(px,py,r=5,self)=>{if(px-r<16||px+r>240||py-3<44||py+2>146)return false;for(const s of SOL)if(px+r>s[0]&&px-r<s[0]+s[2]&&py+2>s[1]&&py-3<s[1]+s[3])return false;
  for(const e of[croc,...npcs]){if(e===self||e.alive===false)continue;const dx=(e.x-px)/11,dy=(e.y-py)/6;if(dx*dx+dy*dy<1)return false}return true};
 function spawn(eilyn,atDoor){
  let px,py,tries=0;do{px=atDoor?128:rnd(28,228);py=atDoor?50:rnd(56,140);tries++}while(tries<200&&(!free(px,py,6)||Math.hypot(px-croc.x,py-croc.y)<30));
  const n={id:nid,name:eilyn?(D.frere||'???').toUpperCase():'PNJ #'+pad(nid),pi:ri(0,NPC_PALS.length-1),x:px,y:py,dir:1,f:0,ft:0,mvx:0,mvy:atDoor?1:0,mt:atDoor?1.2:0,wait:rnd(.3,2),frozen:false,judged:null,eilyn:!!eilyn,alive:true,spawnT:atDoor?0:1};
  if(!eilyn)nid++;npcs.push(n);return n;
 }
 for(let i=0;i<8;i++)spawn(false);const eil=spawn(true);
 /* ---- entrées ---- */
 const KM={ArrowUp:'u',ArrowDown:'d',ArrowLeft:'l',ArrowRight:'r',w:'u',z:'u',s:'d',a:'l',q:'l',d:'r',W:'u',Z:'u',S:'d',A:'l',Q:'l',D:'r'};
 cv.addEventListener('keydown',e=>{if(KM[e.key]){e.preventDefault();e.stopPropagation();keys.add(KM[e.key]);croc.target=null}
  else if(e.key==='Enter'||e.key===' '||e.key==='e'||e.key==='E'){e.preventDefault();e.stopPropagation();if(near)interact(near)}});
 cv.addEventListener('keyup',e=>{if(KM[e.key])keys.delete(KM[e.key])});
 cv.addEventListener('blur',()=>keys.clear());
 const toLocal=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)/r.width*VW+cam,(e.clientY-r.top)/r.height*H]};
 const hit=(px,py)=>npcs.find(n=>n.alive&&px>n.x-(n.eilyn?9:7)&&px<n.x+(n.eilyn?9:7)&&py>n.y-(n.eilyn?27:21)&&py<n.y+2);
 cv.addEventListener('pointerdown',e=>{if(busy)return;const[px,py]=toLocal(e);const n=hit(px,py);cv.focus({preventScroll:true});croc.target=n?{npc:n}:{x:clamp(px,20,236),y:clamp(py,48,142)};SFX.move()});
 cv.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const[px,py]=toLocal(e);const h=hit(px,py)||null;if(h!==hover){hover=h;if(h)SFX.move()}});
 cv.addEventListener('pointerleave',()=>hover=null);
 async function interact(n){
  if(busy||!n.alive)return;busy=true;keys.clear();croc.target=null;croc.moving=false;n.frozen=true;
  const dx=n.x-croc.x,dy=n.y-croc.y;croc.dir=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');n.dir=dx>0?-1:1;
  try{await hooks.talk(n)}catch(e){console.error(e)}
  n.frozen=false;busy=false;if(document.contains(cv))cv.focus({preventScroll:true});
 }
 /* ---- actions ---- */
 const burst=(px,py,type,n,cols)=>{for(let i=0;i<n;i++){const a=rnd(0,Math.PI*2),v=rnd(10,60);parts.push({type,x:px,y:py,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(type==='heart'?30:10),life:0,max:rnd(.5,1.2),col:pick(cols)})}};
 function smash(n){return new Promise(res=>{
  croc.swing=0;SFX.swing();const t0=performance.now(),dur=RM?60:420;let hitDone=false;
  (function f(){const p=Math.min(1,(performance.now()-t0)/dur);croc.swing=p;
   if(p>=.55&&!hitDone){hitDone=true;SFX.hammer();SFX.poof();flash(COL.blood2,.35,220);shake(cv.parentElement,9,380);n.alive=false;
    burst(n.x,n.y-8,'smoke',16,[COL.gray,COL.gray2,COL.bone2]);burst(n.x,n.y-8,'bit',10,[COL.blood,COL.blood2,COL.bone]);burst(n.x,n.y-4,'star',8,[COL.bone]);
    setTimeout(()=>{if(alive){npcs=npcs.filter(m=>m!==n);spawn(false,true)}},4200)}
   if(p<1)requestAnimationFrame(f);else{croc.swing=-1;res()}})();
 })}
 function bless(n){n.judged='bon';SFX.good();burst(n.x,n.y-18,'spark',10,[COL.ice,COL.white,COL.ice2])}
 function hearts(n){burst(n.x,n.y-(n.eilyn?26:18),'heart',9,[COL.blood2,COL.bone])}
 /* ---- boucle ---- */
 function step(e,vx,vy,dt,sp){const nx=e.x+vx*sp*dt,ny=e.y+vy*sp*dt;let m=false;if(vx&&free(nx,e.y,5,e)){e.x=nx;m=true}if(vy&&free(e.x,ny,5,e)){e.y=ny;m=true}return m}
 function update(dt){
  T+=dt;
  let vx=0,vy=0;
  if(!busy){if(keys.has('l'))vx-=1;if(keys.has('r'))vx+=1;if(keys.has('u'))vy-=1;if(keys.has('d'))vy+=1;
   if(!vx&&!vy&&croc.target){const tg=croc.target.npc||croc.target;const dx=tg.x-croc.x,dy=tg.y-croc.y,d=Math.hypot(dx,dy);
    if(croc.target.npc&&(d<17||!tg.alive)){const n=croc.target.npc;croc.target=null;if(n.alive)interact(n)}
    else if(!croc.target.npc&&d<2)croc.target=null;else{vx=dx/d;vy=dy/d}}}
  const l=Math.hypot(vx,vy);if(l){vx/=l;vy/=l;croc.dir=Math.abs(vx)>Math.abs(vy)+.1?(vx<0?'left':'right'):(vy<0?'up':'down');const m=step(croc,vx,vy,dt,54);if(!m&&croc.target&&!croc.target.npc)croc.target=null;croc.moving=m}else croc.moving=false;
  /* marche en 4 temps (contact, passage, contact, passage) ; au repos il respire */
  if(croc.moving){croc.ft+=dt;if(croc.ft>.11){croc.ft=0;croc.wf=((croc.wf||0)+1)%4;if(croc.wf%2===0)SFX.step()}croc.f=2+(croc.wf||0)}else{croc.wf=0;croc.ft=.11;croc.f=(T%2.6)<1.4?0:1}
  for(const n of npcs){if(!n.alive||n.frozen)continue;
   if(n.mt>0){n.mt-=dt;const m=step(n,n.mvx,n.mvy,dt,n.eilyn?16:20);if(!m)n.mt=0;n.ft+=dt;if(n.ft>.15){n.ft=0;n.wf=((n.wf||0)+1)%4}n.f=(n.eilyn?5:2)+(n.wf||0);if(n.mvx)n.dir=n.mvx<0?1:-1}
   else{n.f=idleF(n);n.wait-=dt;if(n.wait<=0){const a=pick([[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[-.7,.7],[.7,-.7],[-.7,-.7]]);n.mvx=a[0];n.mvy=a[1];n.mt=rnd(.4,1.4);n.wait=rnd(.8,3)}}
   if(n.spawnT<1)n.spawnT+=dt*2;}
  near=null;let bd=24;for(const n of npcs){if(!n.alive)continue;const d=Math.hypot(n.x-croc.x,(n.y-croc.y)*1.3);if(d<bd){bd=d;near=n}}
  if(!RM&&Math.random()<dt*1.2){const n=eil;if(n.alive)parts.push({type:'heart',x:n.x+rnd(-3,3),y:n.y-20,vx:rnd(-4,4),vy:-14,life:0,max:1.3,col:COL.blood2})}
  for(const p of parts){p.life+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.type==='smoke'){p.vx*=.92;p.vy*=.92}else if(p.type==='bit')p.vy+=160*dt;else if(p.type==='heart')p.vx*=.97}
  parts=parts.filter(p=>p.life<p.max);
 }
 /* au repos : PNJ qui respirent ; Eilyn lit, tourne une page de temps en temps, une mèche glisse */
 function idleF(n){const t=T+(n.ph||(n.ph=rnd(0,9)));if(!n.eilyn)return(t%2.2)<1.1?0:1;const c=t%7;if(c>5.3&&c<5.55)return 3;if(c>=5.55&&c<5.8)return 4;if(c>2.6&&c<3.4)return 2;return(t%2.4)<1.2?0:1}
 function drawCroc(){
  const sp=crocSprite(croc.dir,croc.f),ox=Math.round(croc.x-8),oy=Math.round(croc.y-24);
  x.drawImage(sp,ox,oy);
  if(croc.swing<0){drawHammer(x,ox,oy+CROC_DY[croc.f],croc.dir,1)}
  else{const p=croc.swing,e=p<.55?(p/.55)**2:1,phi=Math.PI*.8-(Math.PI*.8+.35)*e;const fx=croc.dir==='left'?-1:croc.dir==='right'?1:0;const hx=croc.x+(fx?fx*2:5),hy=croc.y-14,R=16;
   let px,py;if(fx){px=hx+fx*R*Math.cos(phi);py=hy-R*Math.sin(phi)}else{const fy=croc.dir==='down'?1:-1;px=hx+2;py=hy-R*Math.sin(phi)+fy*R*Math.max(0,Math.cos(phi))*.8}
   for(let k=0;k<=8;k++){x.fillStyle=PAL.w;x.fillRect(Math.round(hx+(px-hx)*k/8),Math.round(hy+(py-hy)*k/8),1,1)}
   x.fillStyle=PAL.m;x.fillRect(Math.round(px-3),Math.round(py-3),7,6);x.fillStyle=PAL.M;x.fillRect(Math.round(px-3),Math.round(py-3),7,1);
   if(p<.6){x.fillStyle='rgba(232,224,204,.5)';for(let k=1;k<4;k++){const q=Math.max(0,e-k*.12),ph=Math.PI*.8-(Math.PI*.8+.35)*q;const gx=fx?hx+fx*R*Math.cos(ph):hx+2,gy=fx?hy-R*Math.sin(ph):hy-R*Math.sin(ph);x.fillRect(Math.round(gx-2),Math.round(gy-2),4,4)}}}
 }
 function drawNpc(n){
  const sp=n.eilyn?eilynSprite(n.f):npcSprite(n.pi,n.f);const img=n.dir===-1?flipped((n.eilyn?'eilyn16':'npc'+n.pi)+'-'+n.f,sp):sp;
  const ox=Math.round(n.x-sp.width/2),oy=Math.round(n.y-sp.height);
  if(n.spawnT<1&&Math.floor(T*20)%2)return;
  if(n.eilyn){const g=tinted('eil16-'+n.f,img,COL.ice);x.globalAlpha=.3+.12*Math.sin(T*3);x.drawImage(g,ox-1,oy);x.drawImage(g,ox+1,oy);x.drawImage(g,ox,oy-1);x.globalAlpha=1}
  x.drawImage(img,ox,oy);
  if(n.judged==='bon'){const b=Math.floor(T*3)%2;drawText(x,'♪',n.x-2,n.y-28-b,COL.ice,1)}
 }
 function draw(){
  const tc=clamp(Math.round(croc.x-VW/2),0,W-VW);cam+=(tc-cam)*.15;if(Math.abs(tc-cam)<.5)cam=tc;cam=VW===W?0:cam;
  x.save();x.translate(-Math.round(cam),0);
  x.drawImage(bg,0,0);
  for(const tx of[56,200]){const f=Math.floor(T*8+tx)%3;x.fillStyle=COL.blood2;x.fillRect(tx-1,17-f%2,3,4);x.fillStyle=COL.bone;x.fillRect(tx,18,1,2+(f===1?1:0));x.fillStyle=COL.blood;x.fillRect(tx-2+(f%2),15-f,1,2)}
  for(const e of[croc,...npcs.filter(n=>n.alive)]){x.fillStyle='rgba(11,10,16,.55)';x.fillRect(Math.round(e.x-5),Math.round(e.y-1),11,3);x.fillRect(Math.round(e.x-3),Math.round(e.y+1),7,1)}
  const ents=[...npcs.filter(n=>n.alive).map(n=>({y:n.y,d:()=>drawNpc(n)})),{y:croc.y,d:drawCroc},...PIL.map(pl=>({y:pl.y,d:()=>{x.fillStyle=COL.ink;x.fillRect(pl.x-9,pl.y-44,18,46);x.fillStyle=COL.vio;x.fillRect(pl.x-8,pl.y-42,16,42);x.fillStyle=COL.vio2;x.fillRect(pl.x-8,pl.y-42,3,42);x.fillStyle=COL.deep;x.fillRect(pl.x+4,pl.y-42,4,42);x.fillStyle=COL.vio2;x.fillRect(pl.x-9,pl.y-46,18,4);x.fillRect(pl.x-9,pl.y-2,18,3)}}))];
  ents.sort((a,b)=>a.y-b.y).forEach(e=>e.d());
  /* cible du clic */
  if(croc.target&&!croc.target.npc){const b=Math.floor(T*6)%2;x.fillStyle=COL.ice;const tx=Math.round(croc.target.x),ty=Math.round(croc.target.y);x.fillRect(tx-3-b,ty,2,1);x.fillRect(tx+2+b,ty,2,1);x.fillRect(tx,ty-2-b,1,2);x.fillRect(tx,ty+1+b,1,2)}
  /* particules */
  for(const p of parts){const k=1-p.life/p.max;
   if(p.type==='smoke'){const r=Math.round(2+p.life*6);x.fillStyle=p.col;for(let yy=-r;yy<=r;yy++)for(let xx=-r;xx<=r;xx++)if(xx*xx+yy*yy<=r*r&&bay(Math.round(p.x)+xx,Math.round(p.y)+yy)<k*.8)x.fillRect(Math.round(p.x)+xx,Math.round(p.y)+yy,1,1)}
   else if(p.type==='heart'){if(k>.15||Math.floor(T*20)%2)drawText(x,'♥',p.x-2,p.y-3,p.col,1)}
   else if(p.type==='star'){x.fillStyle=p.col;const L=Math.round(3*k)+1;for(let i=0;i<L;i++)x.fillRect(Math.round(p.x+p.vx*.05*i),Math.round(p.y+p.vy*.05*i),1,1)}
   else{x.fillStyle=p.col;x.fillRect(Math.round(p.x),Math.round(p.y),p.type==='spark'&&k>.5?2:1,p.type==='spark'&&k>.5?2:1)}}
  x.restore();x.drawImage(vig,0,0);x.save();x.translate(-Math.round(cam),0);
  /* étiquettes */
  const show=new Set([hover,near].filter(Boolean));
  for(const n of show){if(!n.alive)continue;const top=n.y-(n.eilyn?26:20)-(n.judged?6:0);
   if(n.eilyn)drawLabel(x,n.name+' ♥',n.x,top-1,COL.bone,COL.blood0,COL.bone);
   else drawLabel(x,n.judged==='bon'?'BON NPC':'NPC',n.x,top-1,n.judged?COL.ice:COL.bone,COL.ink,n.judged?COL.ice2:COL.gray)}
  if(!show.has(eil)&&eil.alive){const b=Math.floor(T*2)%2;drawText(x,'♥',eil.x-2,eil.y-34-b,COL.blood2,1)}
  if(near&&!busy){const b=Math.floor(T*4)%2;x.fillStyle=COL.bone;x.fillRect(Math.round(croc.x)-1,Math.round(croc.y)-33-b,3,1);x.fillRect(Math.round(croc.x),Math.round(croc.y)-32-b,1,1)}
  x.restore();
 }
 function loop(now){if(!alive)return;raf=requestAnimationFrame(loop);const dt=Math.min(.05,(now-(last||now))/1000);last=now;update(dt);draw()}
 raf=requestAnimationFrame(loop);
 if(/[?&]test\b/.test(location.search))window.__ow={npcs:()=>npcs,croc,W,H};/* aide aux tests automatiques uniquement */
 return{smash,bless,hearts,destroy(){alive=false;cancelAnimationFrame(raf);removeEventListener('resize',onRs)},get eilyn(){return eil}};
}

const PNJ_DEF=['Bonjour, voyageur !','Belle journée, hein ?','Je dis toujours la même phrase.','…','Hé ! Arrête de me fixer comme ça.','Tu as l\'air costaud, toi.','Il paraît que je suis important pour l\'histoire.','Bienvenue ! Bienvenue ! Bienvenue !'];
const J_HINTS=['Entre dans la scène.','Parle à un PNJ.','Trouve celui qui n\'est pas un NPC.','Juge un « mauvais NPC ».'];
SCREENS.psyche={song:'monde',mount(p){
 const ps=D.psycho||[],nom=esc(D.nom||'Croc');let judged=0;
 p.innerHTML=head('PSYCHÉ','Le monde tel que '+nom+' le perçoit')+`
 <div class="ow-wrap" id="owWrap"><canvas id="ow" tabindex="0" role="application" aria-label="Scène jouable : ${nom} parmi les PNJ. Flèches ou ZQSD pour marcher, Entrée pour parler. Un seul personnage n'est pas un NPC."></canvas>
  <div class="choice win" id="owChoice" hidden role="group" aria-label="Jugement"><p class="q">JUGER CE PNJ ?</p><button type="button" class="good" data-j="bon">BON NPC</button><button type="button" class="bad" data-j="mauvais">MAUVAIS NPC</button><button type="button" data-j="rien">LAISSER</button><span class="hand" aria-hidden="true"></span></div></div>
 <div class="ow-bar"><span>PNJ JUGÉS <b id="owJ">0</b></span><span>CHAOS <b id="owC">${G.chaos}</b></span></div>
 <p class="ow-help"><kbd>←↑↓→</kbd> / <kbd>ZQSD</kbd> marcher · <kbd>Entrée</kbd> parler · clic ou toucher : aller vers quelqu'un · un seul n'est pas un NPC.</p>
 <div class="box journal"><h3 class="cap">JOURNAL DU SYSTÈME <small id="jCount"></small></h3><ol id="jList"></ol><div class="j-foot"><button type="button" class="pbtn" id="jAll">TOUT RÉVÉLER</button></div></div>`;
 const renderJ=()=>{
  $('#jList',p).innerHTML=ps.map((t,i)=>G.journal[i]?`<li class="on ${i===3?'warn':''}"><div><p>${esc(t)}</p><button type="button" class="replay" data-i="${i}">▶ RELIRE EN DIALOGUE</button></div></li>`:`<li><div class="lock">??? — <b>Indice :</b> ${esc(J_HINTS[i]||'???')}</div></li>`).join('');
  const n=ps.filter((_,i)=>G.journal[i]).length;$('#jCount',p).textContent=n+' / '+ps.length;$('#jAll',p).hidden=n>=ps.length;
 };
 const unlock=i=>{if(i>=ps.length)return Promise.resolve();const was=G.journal[i];G.journal[i]=true;renderJ();if(!was)SFX.save();return DLG.say([{who:'sys',t:'[SYSTÈME] '+ps[i]}])};
 renderJ();
 $('#jList',p).addEventListener('click',e=>{const b=e.target.closest('.replay');if(b)DLG.say([{who:'sys',t:'[SYSTÈME] '+ps[+b.dataset.i]}])});
 $('#jAll',p).onclick=()=>{ps.forEach((_,i)=>G.journal[i]=true);renderJ();SFX.ok();$('#jList',p).scrollIntoView({block:'nearest',behavior:RM?'auto':'smooth'})};
 /* menu de jugement */
 const ch=$('#owChoice',p),hand=$('.hand',ch);rove(ch,'button',{onMove:b=>placeHand(hand,b)});
 ch.addEventListener('focusin',e=>{if(e.target.matches('button'))placeHand(hand,e.target)});
 ch.addEventListener('mouseover',e=>{const b=e.target.closest('button');if(b&&document.activeElement!==b){b.focus();SFX.move()}});
 const choose=()=>new Promise(res=>{ch.hidden=false;const bs=$$('button',ch);bs[0].focus();placeHand(hand,bs[0]);
  const done=v=>{ch.hidden=true;ch.onclick=null;ch.onkeydown=null;res(v)};
  ch.onclick=e=>{const b=e.target.closest('button');if(b){b.dataset.j==='rien'?SFX.back():SFX.ok();done(b.dataset.j)}};
  ch.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();SFX.back();done('rien')}}});
 const lines=(D.retro&&Array.isArray(D.retro.repliquesPNJ)&&D.retro.repliquesPNJ.length)?D.retro.repliquesPNJ:PNJ_DEF;
 const ow=Overworld($('#ow',p),{async talk(n){
  if(n.eilyn){SFX.heart();ow.hearts(n);
   await DLG.say([{who:'croc'},{who:'sys',t:`[SYSTÈME] ${D.frere||'???'}. Son frère. Statut : PAS un NPC.`}]);
   if(!G.journal[2])await unlock(2);return}
  await DLG.say([{who:'pnj',name:n.name,pal:n.pi,t:pick(lines)},{who:'croc'}]);
  if(!G.journal[1])await unlock(1);
  const j=await choose();
  if(j==='mauvais'){await ow.smash(n);addChaos();SFX.chaos();judged++;$('#owJ',p).textContent=judged;$('#owC',p).textContent=G.chaos;
   await DLG.say([{who:'sys',t:'[SYSTÈME]. C\'était un mauvais NPC, Croc l\'a éliminé.'}]);if(!G.journal[3])await unlock(3)}
  else if(j==='bon'){ow.bless(n);judged++;$('#owJ',p).textContent=judged;await DLG.say([{who:'sys',t:'[SYSTÈME] Bon NPC. Pour l\'instant.'}])}
 }});
 if(!G.journal[0]||!G.met.psyche){G.met.psyche=true;DLG.say([{who:'sys',t:'[SYSTÈME] Chargement de la vue subjective…'}]);unlock(0)}
 return()=>ow.destroy();
}};

/* =====================================================================
   COMPÉTENCES — scène de combat pixel
   [Lien Infortuné] : lien, transfert de chance, alerte du Système,
   catastrophe aléatoire (l'utilisateur compte parmi les victimes), dé au LV.5.
   [Maîtrise des armes lourdes] : coup de marteau.
   ===================================================================== */
function Battle(cv){
 const W=256,H=144;cv.width=W;cv.height=H;const x=cv.getContext('2d');x.imageSmoothingEnabled=false;
 const bg=document.createElement('canvas');bg.width=W;bg.height=H;(()=>{const g=bg.getContext('2d');const R=(a,b,c,d,col)=>{g.fillStyle=col;g.fillRect(a,b,c,d)};
  for(let y=0;y<76;y++)for(let i=0;i<W;i++){const row=Math.floor(y/7),bx=(i+(row%2?7:0))%14,by=y%7;let c=(by===0||bx===0)?'#110e19':(by===1?'#2f2546':COL.vio);const dk=(1-y/76)*.7;if(bay(i,y)<dk)c=c==='#110e19'?COL.ink:COL.deep;R(i,y,1,1,c)}
  /* arches */
  for(const ax of[44,128,212]){for(let y=18;y<76;y++)for(let i=-14;i<=14;i++){const top=18+Math.max(0,14-Math.sqrt(Math.max(0,196-i*i)))*1;if(y>=top+ (Math.abs(i)>12?0:0)&&Math.hypot(i,Math.max(0,32-y))<=14||(y>32&&Math.abs(i)<=14))R(ax+i,y,1,1,y>40&&bay(ax+i,y)<.5?COL.ink:'#0e0b16')}R(ax-15,18,1,58,COL.vio2);R(ax+15,18,1,58,COL.vio2)}
  for(let y=76;y<H;y++){const k=(y-76)/(H-76);for(let i=0;i<W;i++){let c=bay(i,y)<k*.8?COL.deep:COL.night;const vx=(i-128)/((y-60)/16);if(Math.abs(vx%16)<.6)c='#110e19';if((Math.floor(Math.pow(k,.6)*9*4)%4)===0&&bay(i,y)<.6)c='#110e19';R(i,y,1,1,c)}}
  R(0,76,W,1,COL.vio2);
  for(const tx of[86,170]){R(tx-2,30,5,3,COL.gray);R(tx-1,33,3,4,COL.gray)}
  for(let y=0;y<H;y++)for(let i=0;i<W;i++){const d=Math.hypot((i-W/2)/(W/2),(y-H/2)/(H/2));if(bay(i,y)<(d-.85)*1.5)R(i,y,1,1,COL.ink)}
 })();
 const S={croc:{x:204,y:120,dx:0,dy:0,flash:0,hurt:0,swing:-1,cast:0},foe:{x:66,y:124,flash:0,hurt:0,dx:0,down:0,marks:0},link:0,parts:[],pops:[],dark:0,tint:null,tintA:0,fx:null,flood:0,T:0};
 let raf=0,last=0,alive=true;
 const hand=()=>[S.croc.x+S.croc.dx-11,S.croc.y-15],chest=()=>[S.foe.x+S.foe.dx+6,S.foe.y-30];
 function update(dt){
  S.T+=dt;const T=S.T;
  for(const k of['croc','foe']){const o=S[k];o.flash=Math.max(0,o.flash-dt);o.hurt=Math.max(0,o.hurt-dt)}
  if(S.fx){const f=S.fx;f.t+=dt;const on=f.t<f.dur;
   if(on){const r=(n)=>Math.random()<n*dt;
    if(f.kind==='chute'){if(r(46))S.parts.push({t:'rock',x:rnd(10,246),y:-8,vx:rnd(-10,10),vy:rnd(0,40),g:320,s:ri(2,6),gy:rnd(96,140),life:0,max:2.4})}
    if(f.kind==='eau'){S.flood=Math.min(16,S.flood+dt*14);if(r(90))S.parts.push({t:'drop',x:pick([96,170])+rnd(-6,6),y:rnd(0,8),vx:rnd(-40,40),vy:rnd(20,80),g:300,gy:rnd(110,140),life:0,max:1.2})}
    if(f.kind==='panne'){S.dark=Math.min(.9,S.dark+dt*4)}
    if(f.kind==='feu'){S.tint=COL.blood;S.tintA=Math.min(.22,S.tintA+dt*.4);if(r(110))S.parts.push({t:'flame',x:rnd(0,W),y:rnd(110,144),vx:rnd(-6,6),vy:rnd(-60,-25),g:0,life:0,max:rnd(.5,1.1)})}
    if(f.kind==='ruee'){if(r(9))S.parts.push({t:'run',x:-24,y:rnd(100,140),vx:rnd(200,300),vy:0,g:0,life:0,max:2,pi:ri(0,7)})}
    if(f.kind==='boom'){if(f.t<.1&&!f.did){f.did=1;for(let i=0;i<40;i++){const a=rnd(0,6.28),v=rnd(30,160);S.parts.push({t:'bit',x:128,y:90,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,g:200,gy:rnd(110,140),life:0,max:1.4,col:pick([COL.bone,COL.blood2,COL.gray2])})}}}
   }else{S.dark=Math.max(0,S.dark-dt*1.5);S.tintA=Math.max(0,S.tintA-dt*.3);S.flood=Math.max(0,S.flood-dt*8);if(f.t>f.dur+1.2)S.fx=null}
  }else{S.dark=Math.max(S.restDark||0,S.dark-dt*1.5)}
  for(const p of S.parts){p.life+=dt;p.vy+=(p.g||0)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.gy&&p.y>p.gy){p.y=p.gy;if(p.t==='rock'&&Math.abs(p.vy)>60){p.vy*=-.3;p.vx*=.5;for(let i=0;i<3;i++)S.parts.push({t:'dust',x:p.x,y:p.y,vx:rnd(-20,20),vy:rnd(-20,-5),g:0,life:0,max:.5})}else{p.vy=0;p.vx*=.8}}}
  S.parts=S.parts.filter(p=>p.life<p.max&&p.x<W+30);
  for(const q of S.pops)q.life+=dt;S.pops=S.pops.filter(q=>q.life<1.6);
 }
 function drawCroc(){
  const c=S.croc,T=S.T,sc=2;const fr=c.hurt>0?0:Math.floor(T*1.3)%2;const sp=crocSprite('left',fr);const ox=Math.round(c.x+c.dx-16),oy=Math.round(c.y-48+c.dy+(c.hurt>0?4:0));
  x.fillStyle='rgba(11,10,16,.6)';x.fillRect(Math.round(c.x+c.dx-12),c.y-1,24,4);
  const img=c.flash>0&&Math.floor(T*24)%2?tinted('crocL'+fr,sp,COL.white):sp;
  x.drawImage(img,ox,oy,32,48);
  if(c.swing<0)drawHammer(x,ox,oy,'left',sc);
  else{const p=c.swing,e=p<.55?(p/.55)**2:1,phi=Math.PI*.8-(Math.PI*.8+.4)*e;const hx=ox+8,hy=oy+30,R=32;const px=hx-R*Math.cos(phi),py=hy-R*Math.sin(phi);
   x.fillStyle=PAL.w;for(let k=0;k<=14;k++)x.fillRect(Math.round(hx+(px-hx)*k/14),Math.round(hy+(py-hy)*k/14),2,2);
   if(p<.62){x.fillStyle='rgba(232,224,204,.45)';for(let k=1;k<5;k++){const q=Math.max(0,e-k*.1),ph=Math.PI*.8-(Math.PI*.8+.4)*q;x.fillRect(Math.round(hx-R*Math.cos(ph)-6),Math.round(hy-R*Math.sin(ph)-5),12,10)}}
   x.drawImage(SPR_.hammerHead(),Math.round(px-10),Math.round(py-8),20,16)}
  if(c.cast>0){const[hx,hy]=hand();const r=2+Math.floor(T*10)%2;x.fillStyle=COL.blood2;x.fillRect(hx-r,hy-r,r*2,r*2);x.fillStyle=COL.bone;x.fillRect(hx-1,hy-1,2,2)}
 }
 function drawFoe(){
  const f=S.foe,T=S.T;const fr=f.hurt>0?2:Math.floor(T*1.1)%2;const sp=foeSprite(fr);const sway=Math.round(Math.sin(T*2.2));const ox=Math.round(f.x+f.dx-18+sway+(f.hurt>0?(Math.floor(T*30)%2?-2:2):0)),oy=Math.round(f.y-52+(f.hurt>0?2:0));
  x.fillStyle='rgba(11,10,16,.6)';x.fillRect(Math.round(f.x-17),f.y-1,34,4);
  const img=f.flash>0&&Math.floor(T*24)%2?tinted('foeW'+fr,sp,COL.white):sp;
  if(f.down>0)x.globalAlpha=Math.max(0,1-f.down);
  const rim=tinted('foeR'+fr,sp,COL.vio3);x.globalAlpha*=.75;x.drawImage(rim,ox-1,oy);x.drawImage(rim,ox+1,oy);x.drawImage(rim,ox,oy-1);x.globalAlpha=f.down>0?Math.max(0,1-f.down):1;x.drawImage(tinted('foeK'+fr,sp,COL.ink),ox+1,oy+2);
  x.drawImage(img,ox,oy);
  /* yeux rouges qui clignent, lueur */
  const eb=fr===1?1:0,eh=fr===2?-2:0;if(Math.floor(T*3)%7){for(const[ex,ey]of SPR_.foeEyes){x.fillStyle=COL.blood0;x.fillRect(ox+ex+eh-1,oy+ey+eb-1,4,3);x.fillStyle=COL.blood2;x.fillRect(ox+ex+eh,oy+ey+eb,2,1);x.fillStyle='#ffd0d6';x.fillRect(ox+ex+eh,oy+ey+eb,1,1)}}
  drawText(x,'CIBLE',Math.round(f.x-textW('CIBLE')/2),oy-12,COL.gray2,1);
  if(f.marks>0){const cx=Math.round(f.x),cy=oy-24+Math.round(Math.sin(T*3)*1.5),r=Math.floor(T*8)%4;
   /* sceau du Chaos : losange rouge + croix, qui pulse */
   x.fillStyle=COL.ink;x.fillRect(cx-6,cy-6,13,13);
   for(let i=-5;i<=5;i++){const w=5-Math.abs(i);x.fillStyle=COL.blood2;x.fillRect(cx-w,cy+i,w*2+1,1)}
   x.fillStyle=COL.bone;x.fillRect(cx,cy-3,1,7);x.fillRect(cx-3,cy,7,1);x.fillStyle=r%2?COL.white:COL.bone;x.fillRect(cx,cy,1,1);
   x.fillStyle=COL.blood2;for(let k=0;k<4;k++){const a=T*2.4+k*1.571;x.fillRect(Math.round(cx+Math.cos(a)*9),Math.round(cy+Math.sin(a)*9),1,1)}
   if(f.marks>1)drawTextOutlined(x,'x'+f.marks,cx+9,cy-4,COL.bone,1)}
  x.globalAlpha=1;
 }
 function drawLink(){
  if(S.link<=0)return;const[ax,ay]=hand(),[bx,by]=chest();const d=Math.hypot(bx-ax,by-ay),n=Math.max(2,Math.floor(d/4)*S.link);const nx=-(by-ay)/d,ny=(bx-ax)/d;const T=S.T;
  for(let i=0;i<=n;i++){const u=i/Math.floor(d/4);const w=Math.sin(i*.8-T*10)*2.2;const px=Math.round(ax+(bx-ax)*u+nx*w),py=Math.round(ay+(by-ay)*u+ny*w);const pulse=Math.floor(T*26)%Math.max(1,Math.floor(d/4))===i;x.fillStyle=pulse?COL.white:i%2?COL.blood2:COL.vio3;x.fillRect(px-1,py-1,i%2?2:3,i%2?2:3)}
 }
 function draw(){
  const T=S.T;x.drawImage(bg,0,0);
  for(const tx of[86,170]){const f=Math.floor(T*9+tx)%3;x.fillStyle=COL.blood2;x.fillRect(tx-1,25-f%2,3,5);x.fillStyle=COL.bone;x.fillRect(tx,27,1,2+(f===1?1:0))}
  if(S.fx&&S.fx.kind==='chute'&&S.fx.t<S.fx.dur){x.fillStyle=COL.ink;for(let i=0;i<W;i+=9){const L=Math.floor(Math.abs(Math.sin(i*1.7))*14*Math.min(1,S.fx.t*3));for(let k=0;k<L;k++)x.fillRect(i+Math.round(Math.sin(k*1.3+i)*2),k,1,1)}}
  if(S.flood>0){const fy=H-S.flood;for(let y=Math.floor(fy);y<H;y++)for(let i=0;i<W;i++){const wv=Math.sin(i*.2+T*6)*1.2;if(y>fy+wv)x.fillStyle=bay(i,y)<.5?COL.ice0:COL.ice2,x.fillRect(i,y,1,1)}}
  if(S.fx&&S.fx.kind==='eau'&&S.fx.t<S.fx.dur){for(const px of[96,170]){x.fillStyle=COL.gray;x.fillRect(px-5,0,10,6);for(let y=6;y<H-S.flood;y++){const w=2+Math.floor((y/H)*4);for(let i=-w;i<=w;i++)if(bay(px+i,y+Math.floor(T*60))<.6){x.fillStyle=i===0?COL.white:COL.ice;x.fillRect(px+i,y,1,1)}}}}
  drawFoe();drawLink();drawCroc();
  for(const p of S.parts){const k=1-p.life/p.max,X=Math.round(p.x),Y=Math.round(p.y);
   if(p.t==='rock'){x.fillStyle=COL.ink;x.fillRect(X-1,Y-1,p.s+2,p.s+2);x.fillStyle=COL.gray;x.fillRect(X,Y,p.s,p.s);x.fillStyle=COL.gray2;x.fillRect(X,Y,p.s,1)}
   else if(p.t==='drop'){x.fillStyle=COL.ice;x.fillRect(X,Y,1,2)}
   else if(p.t==='dust'){x.fillStyle=COL.gray2;if(bay(X,Y)<k)x.fillRect(X,Y,1,1)}
   else if(p.t==='flame'){x.fillStyle=k>.7?COL.bone:k>.45?COL.blood2:k>.2?COL.blood:COL.blood0;const s=k>.5?2:1;x.fillRect(X,Y,s,s+1)}
   else if(p.t==='run'){const wf=2+Math.floor(p.life*14)%4;const sp=tinted('runner'+p.pi+'-'+wf,npcSprite(p.pi,wf),COL.ink);x.drawImage(sp,X-12,Y-36,24,36);x.fillStyle=COL.blood2;x.fillRect(X-4,Y-30+(wf%2?0:2),2,2);x.fillRect(X+2,Y-30+(wf%2?0:2),2,2)}
   else if(p.t==='luck'){const u=Math.min(1,p.life/p.max);const[ax,ay]=hand(),[bx,by]=chest();const px=Math.round(ax+(bx-ax)*u),py=Math.round(ay+(by-ay)*u+Math.sin(u*9+p.ph)*4);x.fillStyle=p.col;x.fillRect(px-1,py,3,1);x.fillRect(px,py-1,1,3)}
   else if(p.t==='absorb'){const u=Math.min(1,p.life/p.max),e=u*u;const[bx,by]=chest();const ax=S.croc.x+S.croc.dx-2,ay=S.croc.y-26;const px=Math.round(bx+(ax-bx)*e+Math.sin(u*7+p.ph)*10*(1-u)),py=Math.round(by+(ay-by)*e-Math.sin(u*3.14)*18);x.fillStyle=p.col;x.fillRect(px-1,py-1,2,2);if(u>.85){x.fillStyle=COL.white;x.fillRect(px,py,1,1)}}
   else if(p.t==='star'){x.fillStyle=COL.bone;const L=Math.round(8*k);for(let i=2;i<L;i++)x.fillRect(Math.round(p.x+Math.cos(p.a)*i*2),Math.round(p.y+Math.sin(p.a)*i*2),2,2)}
   else{x.fillStyle=p.col||COL.bone;x.fillRect(X,Y,2,2)}}
  if(S.dark>0){x.fillStyle=`rgba(11,10,16,${S.dark})`;x.fillRect(0,0,W,H)}
  if(S.fx&&S.fx.kind==='panne'&&S.fx.t<S.fx.dur){for(let b=0;b<2;b++){let px=rnd(20,236),py=0;x.fillStyle=Math.random()<.5?COL.ice:COL.bone;while(py<H){const nx=px+rnd(-8,8),ny=py+rnd(4,10);const n=Math.max(Math.abs(nx-px),Math.abs(ny-py));for(let k=0;k<=n;k++)x.fillRect(Math.round(px+(nx-px)*k/n),Math.round(py+(ny-py)*k/n),1,1);px=nx;py=ny}}}
  if(S.tintA>0){x.fillStyle=S.tint;x.globalAlpha=S.tintA;x.fillRect(0,0,W,H);x.globalAlpha=1}
  for(const q of S.pops){const yy=Math.round(q.y-Math.min(1,q.life*2)*12);if(q.life>1.2&&Math.floor(q.life*20)%2)continue;drawTextOutlined(x,q.t,Math.round(q.x-textW(q.t,q.sc)/2),yy,q.col,q.sc)}
 }
 function loop(now){if(!alive)return;raf=requestAnimationFrame(loop);const dt=Math.min(.05,(now-(last||now))/1000);last=now;update(dt);draw()}
 raf=requestAnimationFrame(loop);
 const tween=(dur,fn)=>RM?(fn(1),Promise.resolve()):anim(dur,fn);
 return{
  S,
  async link(on){if(on){S.croc.cast=1;await tween(450,p=>S.link=p)}else{S.croc.cast=0;await tween(300,p=>S.link=1-p)}},
  luck(n=14){for(let i=0;i<n;i++)setTimeout(()=>{if(!alive)return;S.parts.push({t:'luck',x:0,y:0,vx:0,vy:0,g:0,life:0,max:.8,ph:rnd(0,6),col:pick([COL.ice,COL.bone,COL.white])});SFX.luck()},i*90)},
  cata(kind){S.fx={kind,t:0,dur:1.8};if(kind==='boom'){}return sleep(1900)},
  hurt(who){const o=S[who];o.flash=.7;o.hurt=.7},
  mark(n){S.foe.marks=n},
  async fell(){S.foe.flash=.5;await tween(520,p=>S.foe.down=p)},
  async respawn(){S.foe.marks=0;S.foe.dx=-40;await tween(420,p=>{S.foe.down=1-p;S.foe.dx=Math.round(-40*(1-p)/4)*4});S.foe.down=0;S.foe.dx=0},
  absorb(n=12){for(let i=0;i<n;i++)setTimeout(()=>{if(!alive)return;S.parts.push({t:'absorb',x:0,y:0,vx:0,vy:0,g:0,life:0,max:.9,ph:rnd(0,6),col:pick([COL.blood2,COL.blood2,COL.bone,COL.vio3])});if(i%3===0)SFX.luck()},i*55);setTimeout(()=>{if(alive){S.croc.flash=.5}},n*55+700)},
  pop(t,who,col,sc=1){const o=S[who];S.pops.push({t,x:o.x+(o.dx||0),y:o.y-(who==='foe'?56:54),col,sc,life:0})},
  async hammer(){const c=S.croc;SFX.swing();await tween(220,p=>c.dx=-Math.round(p*104/4)*4);c.swing=0;
   let hitDone=false;await tween(260,p=>{c.swing=p;if(p>=.55&&!hitDone){hitDone=true;SFX.hammer(1.1);flash('#fff',.5,160);shake(cv.parentElement,12,420);S.foe.flash=.6;S.foe.hurt=.6;const[fx,fy]=chest();for(let i=0;i<12;i++)S.parts.push({t:'star',x:fx-4,y:fy+10,a:i/12*6.28,vx:0,vy:0,g:0,life:0,max:.35});S.pops.push({t:'BAM!',x:S.foe.x,y:S.foe.y-50,col:COL.bone,sc:2,life:0})}});
   c.swing=-1;await sleep(160);await tween(300,p=>c.dx=-104+Math.round(p*104/4)*4);c.dx=0},
  async rest(){S.restDark=.92;await sleep(RM?200:2300);S.restDark=0},
  destroy(){alive=false;cancelAnimationFrame(raf)}
 };
}
const kindOf=s=>{s=String(s).toLowerCase();if(/plafond|éboul|ebou|pont|effondr|chute|rompu/.test(s))return'chute';if(/canalis|eau|inond|fuite/.test(s))return'eau';if(/panne|court|électr|electr/.test(s))return'panne';if(/incend|feu|flamm|brûl/.test(s))return'feu';if(/stampede|ruée|ruee|monstre|horde/.test(s))return'ruee';return'boom'};

SCREENS.competences={song:'combat',mount(p){
 const SK=D.competences||[];const L=SK.find(s=>s.icone==='lien')||SK[0];const C=SK.find(s=>s.icone==='chaos');const M=SK.find(s=>s.icone==='marteau')||SK.find(s=>s!==L&&s!==C);
 const nivC=(C&&C.niveaux)||[];let lvC=clamp(G.chLv,1,Math.max(1,nivC.length));
 const gOf=s=>{const g=String(s&&s.groupe||'').toLowerCase();return g.startsWith('sp')?'SPÉCIALES':g.startsWith('cl')?'CLASSIQUES':(g?g.toUpperCase():'AUTRES')};
 const GRP=[];SK.forEach(s=>{const g=gOf(s);let e=GRP.find(x=>x.g===g);if(!e)GRP.push(e={g,l:[]});e.l.push(s)});
 GRP.sort((a,b)=>(a.g==='SPÉCIALES'?0:a.g==='CLASSIQUES'?1:2)-(b.g==='SPÉCIALES'?0:b.g==='CLASSIQUES'?1:2));
 const idOf=s=>s===L?'sk-lien':s===C?'sk-chaos':s===M?'sk-marteau':'';
 const lvOf=s=>s===L?`LV.<span class="cl">${lv}</span>`:s===C?`LV.<span class="clc">${lvC}</span>`:(s.niveau?'LV.'+esc(s.niveau):'');
 const ghead=(g)=>`<h3 class="grp-h"><span>COMPÉTENCES ${esc(g)}</span></h3>`;
 const niv=(L&&L.niveaux)||[];let lv=clamp(G.lv,1,Math.max(1,niv.length));let busy=false;
 p.innerHTML=head('COMPÉTENCES','[SYSTÈME] Simulation de combat')+`
 <div class="box sk-ov" role="list" aria-label="Fiche des compétences">${GRP.map(e=>`<div class="ov-g"><span class="lbl">COMPÉTENCES ${esc(e.g)}</span>${e.l.map(s=>`<a role="listitem" href="#${idOf(s)}" class="ov-i" data-sk="${idOf(s)}"><span class="nm">[${esc(s.nom)}]</span><span class="tp${/act/i.test(s.type||'')?' act':''}">${esc(s.type||'')}</span><span class="lv">${lvOf(s)}</span></a>`).join('')}</div>`).join('')}</div>
 <div class="bt-wrap" id="btWrap"><div class="bt-msg win" id="btMsg" aria-live="polite"></div><canvas id="bt" aria-label="Scène de combat : ${esc(D.nom||'Croc')} face à une cible."></canvas><div class="bt-count" id="btCount" hidden></div></div>
 <div class="bt-ui">
  <div class="box cmds" id="cmds" role="group" aria-label="Commandes"><h3 class="cap">COMMANDES</h3>
   ${(L&&gOf(L)==='SPÉCIALES')||(C&&gOf(C)==='SPÉCIALES')?'<span class="cmd-g">SPÉCIALES</span>':''}
   ${L?`<button type="button" class="cmd" data-c="lien">${esc((L.nom||'').toUpperCase())}<small>LV.<span class="cl">${lv}</span> · coût <span class="cc"></span> % ENE</small></button>
   <div class="lvsel" id="lvsel" role="group" aria-label="Niveau de ${esc(L.nom)}">${niv.map(n=>`<button type="button" data-lv="${n.lv}" aria-pressed="${n.lv===lv}">LV.${n.lv}</button>`).join('')}</div>`:''}
   ${C?`<button type="button" class="cmd" data-c="chaos">${esc((C.nom||'').toUpperCase())}<small>LV.<span class="clc">${lvC}</span> · <span id="chState"></span></small></button>
   <div class="lvsel" id="lvselC" role="group" aria-label="Niveau de ${esc(C.nom)}">${nivC.map(n=>`<button type="button" data-lv="${n.lv}" aria-pressed="${n.lv===lvC}">LV.${n.lv}</button>`).join('')}</div>`:''}
   ${M?`<span class="cmd-g">${esc(gOf(M))}</span><button type="button" class="cmd" data-c="marteau">MARTEAU<small>[${esc(M.nom||'')}]${M.niveau?' · LV.'+esc(M.niveau):''}</small></button>`:''}
   <button type="button" class="cmd" data-c="repos">SE REPOSER<small>ENE → 100 %</small></button><span class="hand" aria-hidden="true"></span></div>
  <div class="box party"><h3 class="cap">${esc(D.nom||'CROC')}</h3>
   <div class="row ene" id="eneRow"><span class="lbl">ENE</span><span class="pbar"><i id="btEne"></i></span><b id="btEneV">${G.ene} %</b></div>
   <p class="meta">CATASTROPHES SIMULÉES <b id="btCata">${G.cata}</b><br>COUPS DE MARTEAU <b id="btCoups">${G.coups}</b>${C?`<br>MARQUES ABSORBÉES <b id="btMarq">${G.marques}</b><br>RENFORT CUMULÉ <b id="btRenf">+${String(G.renfort).replace('.',',')} %</b>`:''}</p></div>
 </div>
 ${(L&&gOf(L)==='SPÉCIALES')||(C&&gOf(C)==='SPÉCIALES')?ghead('SPÉCIALES'):''}
 ${L?`<div class="box sang" id="sk-lien"><div class="sk-head"><span class="nm">[${esc(L.nom)}]</span><span class="tp act">${esc(L.type||'')}</span><span class="lv">LV.<span class="cl">${lv}</span></span></div>
  <p class="sk-desc">${esc(L.desc||'')}</p>
  <div class="lvtab"><div><span class="lbl">Coût</span><b id="lvC"></b></div><div><span class="lbl">Préavis du Système</span><b id="lvP"></b></div><div><span class="lbl">Dé du Système</span><b id="lvD"></b></div><div class="w"><span class="lbl">Pour atteindre ce niveau</span><b id="lvR"></b></div></div>
  <div class="lvspec" id="lvS" hidden></div></div>`:''}
 ${C?`<div class="box sang chbox" id="sk-chaos"><div class="sk-head"><span class="nm">[${esc(C.nom)}]</span><span class="tp act">${esc(C.type||'')}</span><span class="lv">LV.<span class="clc">${lvC}</span></span></div>
  <p class="sk-desc">${esc(C.desc||'')}</p>
  <div class="lvtab"><div><span class="lbl">Coût</span><b id="chC"></b></div><div><span class="lbl">Rechargement · après une marque absorbée</span><b id="chR"></b></div><div><span class="lbl">Renfort par marque</span><b id="chB"></b></div><div class="w"><span class="lbl">Pour atteindre ce niveau</span><b id="chQ"></b></div></div>
  <div class="lvspec" id="chS" hidden></div>
  <div class="chbar"><span class="lbl">RECHARGEMENT</span><span class="pbar"><i id="chBar"></i></span><b id="chTxt"></b></div></div>`:''}
 ${M?ghead(gOf(M)):''}
 ${M?`<div class="box sk2" id="sk-marteau"><div class="sk-head"><span class="nm">[${esc(M.nom)}]</span><span class="tp">${esc(M.type||'')}</span>${M.niveau?`<span class="lv">LV.${esc(M.niveau)}</span>`:''}</div><p class="sk-desc" style="margin:0">${esc(M.desc||'')}</p></div>`:''}
 <p class="sim-note">Simulation illustrative : les catastrophes affichées sont des exemples tirés de data.js. Le dé du LV.5 va de 1 à ${esc(L&&L.des||100)}.${C?' Pour [Accumulation du Chaos], chaque coup de MARTEAU abat la cible : un nouvel adversaire apparaît.':''}</p>`;
 const bt=Battle($('#bt',p)),wrap=$('#btWrap',p),msgEl=$('#btMsg',p);
 $$('.ov-i',p).forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const t=$('#'+a.dataset.sk,p);if(!t)return;SFX.ok();t.scrollIntoView({block:'start',behavior:RM?'auto':'smooth'});t.classList.remove('ping');void t.offsetWidth;t.classList.add('ping')}));
 let mtok=0;
 async function msg(t){const tok=++mtok;msgEl.textContent='';for(const[i,c]of[...t].entries()){if(tok!==mtok)return;msgEl.textContent+=c;if(c!==' '&&i%2===0)SFX.blip('sys');await sleep(RM?4:18)}await sleep(RM?100:500)}
 const setEne=v=>{G.ene=clamp(v,0,100);$('#btEne',p).style.width=G.ene+'%';$('#btEneV',p).textContent=G.ene+' %';$('#eneRow',p).classList.toggle('low',G.ene<30);hud()};
 setEne(G.ene);
 const setLv=n=>{lv=n;G.lv=n;const d=niv.find(z=>z.lv===n)||{};$$('#lvsel button',p).forEach(b=>b.setAttribute('aria-pressed',+b.dataset.lv===n));$$('.cl',p).forEach(e=>e.textContent=n);
  $('#lvC',p).textContent=(d.cout??'???')+' % ENE';$('.cc',p).textContent=d.cout??'?';$('#lvP',p).textContent=(d.preavis??'???')+' s';$('#lvR',p).textContent=d.requis||'???';$('#lvD',p).textContent=d.special?('1 – '+(L.des||100)):'—';
  const s=$('#lvS',p);s.hidden=!d.special;s.innerHTML=d.special?`<span class="lbl">Spécial LV.${n}</span>${esc(d.special)}`:''};
 if(L){setLv(lv);const ls=$('#lvsel',p);rove(ls,'button',{vertical:false});ls.addEventListener('click',e=>{const b=e.target.closest('button');if(b){setLv(+b.dataset.lv);SFX.lvl(+b.dataset.lv)}})}
 const cm=$('#cmds',p),hand=$('.hand',cm);rove(cm,'.cmd',{onMove:b=>placeHand(hand,b)});
 cm.addEventListener('focusin',e=>{if(e.target.matches('.cmd'))placeHand(hand,e.target)});
 cm.addEventListener('mouseover',e=>{const b=e.target.closest('.cmd');if(b&&hand.dataset.on!==b.dataset.c){hand.dataset.on=b.dataset.c;placeHand(hand,b);SFX.move()}});
 placeHand(hand,$('.cmd',cm));
 const lock=v=>{busy=v;$$('.cmd',cm).forEach(b=>b.disabled=v);$$('#lvsel button,#lvselC button',p).forEach(b=>b.disabled=v)};
 const alive=()=>document.contains(wrap);const mus=n=>{if(alive())AU.music(n)};
 async function lien(){
  const d=niv.find(z=>z.lv===lv)||{cout:0,preavis:5};
  if(G.ene<d.cout){SFX.err();await msg(`[SYSTÈME] Énergie insuffisante : ${G.ene} % (coût ${d.cout} %). Repose-toi.`);return}
  lock(true);SFX.ok();
  await msg(`[SYSTÈME] ${D.nom||'Croc'} active [${L.nom}] LV.${lv}.`);if(!alive())return;
  SFX.link();await bt.link(true);setEne(G.ene-d.cout);
  bt.luck(14);await msg("[SYSTÈME] Lien établi. La chance de l'utilisateur est transférée à la cible.");if(!alive())return;
  await sleep(500);
  mus('alerte');wrap.classList.add('alert');const cnt=$('#btCount',p);cnt.hidden=false;
  for(let s=d.preavis;s>0;s--){if(!alive())return;cnt.innerHTML=`${s}<small>CATASTROPHE IMMINENTE</small>`;msgEl.textContent=`[SYSTÈME] ALERTE ! Catastrophe dans ${s} s. L'utilisateur est compté parmi les victimes.`;SFX.alarm(s<=3);await sleep(1000)}
  cnt.hidden=true;wrap.classList.remove('alert');mus(null);
  let spared=false,roll=null;
  if(d.special){const des=+L.des||100;const box=document.createElement('div');box.className='dice win';box.innerHTML='<span class="lbl">DÉ DU SYSTÈME</span><b>--</b>';wrap.appendChild(box);const b=$('b',box);
   msgEl.textContent='[SYSTÈME] Lancer du dé…';for(let i=0;i<(RM?1:22);i++){b.textContent=ri(1,des);SFX.dice();await sleep(40+i*4)}
   roll=ri(1,des);b.textContent=roll;spared=roll<20;b.className=spared?'lo':'hi';spared?SFX.good():SFX.err();await sleep(1100);box.remove();if(!alive())return}
  const ev=pick(D.catastrophes&&D.catastrophes.length?D.catastrophes:['???']);const k=kindOf(ev);
  SFX.boom();if(k==='chute'||k==='ruee')SFX.rumble(1.8);flash(k==='eau'?COL.ice:k==='panne'?'#fff':COL.blood2,.6,320);shake(wrap,k==='panne'?6:16,900);if(!RM)document.body.animate([{filter:'invert(1)'},{filter:'none'}],{duration:120,easing:'steps(2)'});
  msgEl.textContent=`[SYSTÈME] ${String(ev).toUpperCase()} !`;
  await bt.cata(k);if(!alive())return;
  bt.hurt('foe');bt.pop('VICTIME','foe',COL.blood2);SFX.hit();
  await sleep(350);
  if(spared){bt.pop('ÉPARGNÉ','croc',COL.ice)}else{bt.hurt('croc');bt.pop('VICTIME','croc',COL.blood2);SFX.hit()}
  G.cata++;$('#btCata',p).textContent=G.cata;hud();
  await msg(spared?`[SYSTÈME] Dé : ${roll} (< 20). Seule la cible est incluse dans la catastrophe.`:(roll!=null?`[SYSTÈME] Dé : ${roll}. L'utilisateur est compté parmi les victimes..`:"[SYSTÈME] L'utilisateur est compté parmi les victimes.."));
  await bt.link(false);mus('combat');lock(false);
 }
 const fr=v=>String(Math.round(v*10)/10).replace('.',',');
 const dC=()=>nivC.find(z=>z.lv===lvC)||{cout:10,recharge:5,bonus:.5,marques:1};
 function chSync(){if(!C)return;const d=dC();
  $('#chC',p).textContent=(d.cout??'???')+' % ENE';$('#chR',p).textContent=d.recharge!=null?`${d.recharge} adversaires tués`:'???';$('#chR',p).title='Après une marque absorbée';
  $('#chB',p).textContent=d.bonus!=null?`+${fr(d.bonus)} %`+((d.marques||1)>1?` (×${d.marques} marques)`:''):'???';$('#chQ',p).textContent=d.requis||'???';
  const sp=$('#chS',p);sp.hidden=!d.special;sp.innerHTML=d.special?`<span class="lbl">Spécial LV.${lvC}</span>${esc(d.special)}`:'';
  const N=d.recharge||1,k=G.chPret?N:Math.min(N,G.abattus);$('#chBar',p).style.width=(k/N*100)+'%';
  $('#chTxt',p).textContent=bt.S.foe.marks?'MARQUE POSÉE':G.chPret?'PRÊTE':`${G.abattus} / ${N}`;
  $('#chState',p).textContent=bt.S.foe.marks?'cible marquée':G.chPret?`coût ${d.cout} % ENE`:`recharge ${G.abattus}/${N}`;
  $('.chbox',p).classList.toggle('ready',G.chPret&&!bt.S.foe.marks);
  const m=$('#btMarq',p);if(m)m.textContent=G.marques;const r=$('#btRenf',p);if(r)r.textContent='+'+fr(G.renfort)+' %'}
 const setLvC=n=>{lvC=n;G.chLv=n;$$('#lvselC button',p).forEach(b=>b.setAttribute('aria-pressed',+b.dataset.lv===n));$$('.clc',p).forEach(e=>e.textContent=n);chSync()};
 if(C){setLvC(lvC);const ls=$('#lvselC',p);rove(ls,'button',{vertical:false});ls.addEventListener('click',e=>{const b=e.target.closest('button');if(b){setLvC(+b.dataset.lv);SFX.lvl(+b.dataset.lv)}})}
 async function chaos(){
  const d=dC();
  if(bt.S.foe.marks){SFX.err();await msg('[SYSTÈME] La cible porte déjà la marque du Chaos. Abats-la pour l\'absorber.');return}
  if(!G.chPret){SFX.err();await msg(`[SYSTÈME] [${C.nom}] en rechargement : ${G.abattus} / ${d.recharge} adversaires tués.`);return}
  if(G.ene<d.cout){SFX.err();await msg(`[SYSTÈME] Énergie insuffisante : ${G.ene} % (coût ${d.cout} %). Repose-toi.`);return}
  lock(true);SFX.ok();
  await msg(`[SYSTÈME] ${D.nom||'Croc'} active [${C.nom}] LV.${lvC}.`);if(!alive())return;
  SFX.chaos();setEne(G.ene-d.cout);bt.mark(d.marques||1);flash(COL.blood2,.35,240);shake(wrap,5,260);G.chPret=false;G.abattus=0;chSync();
  await msg((d.marques||1)>1?`[SYSTÈME] ${d.marques} marques du Chaos posées. Abats les adversaires marqués pour les absorber.`:'[SYSTÈME] Marque du Chaos posée. Abats la cible pour l\'absorber.');
  lock(false);
 }
 async function marteau(){
  lock(true);await msg(`[SYSTÈME] ${D.nom||'Croc'} frappe : [${M.nom}].`);if(!alive())return;
  await bt.hammer();G.coups++;$('#btCoups',p).textContent=G.coups;
  if(!C){await msg('[SYSTÈME] '+(M.desc||''));lock(false);return}
  const mk=bt.S.foe.marks;await bt.fell();if(!alive())return;bt.pop('ABATTU','foe',COL.gray2);
  const d=dC();
  if(mk){bt.absorb(10+mk*6);SFX.chaos();await sleep(RM?100:900);if(!alive())return;
   G.marques+=mk;G.renfort=Math.round((G.renfort+mk*(d.bonus||0))*10)/10;G.abattus=0;bt.mark(0);SFX.good();bt.pop('+'+fr(mk*(d.bonus||0))+' %','croc',COL.blood2);chSync();
   await msg(`[SYSTÈME] Marque${mk>1?'s':''} absorbée${mk>1?'s':''} (${mk}). Statistiques renforcées de ${fr(mk*(d.bonus||0))} %.${lvC>=3?' (F. Physique, F. Musculaire, Robustesse)':''} Rechargement : ${d.recharge} adversaires.`)}
  else{if(!G.chPret){G.abattus++;if(G.abattus>=(d.recharge||1)){G.chPret=true;G.abattus=0;SFX.ene();chSync();await msg(`[SYSTÈME] [${C.nom}] rechargée.`)}else{chSync();await msg(`[SYSTÈME] Adversaire abattu. Rechargement : ${G.abattus} / ${d.recharge}.`)}}
   else await msg('[SYSTÈME] Adversaire abattu.')}
  if(!alive())return;await bt.respawn();lock(false);
 }
 async function repos(){
  lock(true);await msg(`[SYSTÈME] ${D.nom||'Croc'} se repose…`);SFX.rest();mus(null);await bt.rest();if(!alive())return;setEne(100);SFX.ene();mus('combat');await msg('[SYSTÈME] ENE rétablie : 100 %.');lock(false);
 }
 cm.addEventListener('click',e=>{const b=e.target.closest('.cmd');if(!b||busy)return;const c=b.dataset.c;const r=wrap.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)wrap.scrollIntoView({block:r.height<innerHeight-20?'center':'start',behavior:RM?'auto':'smooth'});(c==='lien'?lien:c==='chaos'?chaos:c==='marteau'?marteau:repos)().catch(err=>{console.error(err);lock(false)})});
 msg(`[SYSTÈME] Une cible apparaît. Choisis une commande.`);
 return()=>{bt.destroy();mtok++};
}};

/* =====================================================================
   RELATIONS — carnet des contacts (data.js > relations)
   ===================================================================== */
const HEART_ROWS=[".xx.xx.","xbxxxxx","xxxxxxx",".xxxxx.","..xxx..","...x..."];
const HEART_HALF=[".xx.vv.","xbxvvvv","xxxvvvv",".xxvvv.","..xvv..","...v..."];
const HEART_URI={full:spriteURI(HEART_ROWS,{x:COL.blood2,b:COL.white}),half:spriteURI(HEART_HALF,{x:COL.blood2,b:COL.white,v:COL.vio}),empty:spriteURI(HEART_ROWS,{x:COL.vio,b:COL.vio2})};
const REL_ST=s=>{const u=String(s||'').toUpperCase();if(!u)return{k:'nd',g:'—',l:'NON DÉFINI'};if(u.includes('ALLI'))return{k:'allie',g:'●',l:'ALLIÉ'};if(u.includes('NEUTRE'))return{k:'neutre',g:'◆',l:'NEUTRE'};if(u.includes('ENNEMI'))return{k:'ennemi',g:'▲',l:'ENNEMI'};return{k:'inconnu',g:'?',l:'INCONNU'}};
function relHash(s){let h=7;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return h}
function relPortrait(cv,r,size){
 const x=cv.getContext('2d');cv.width=size;cv.height=size;x.imageSmoothingEnabled=false;
 x.fillStyle=COL.night;x.fillRect(0,0,size,size);for(let y=0;y<size;y+=2)for(let i=(y/2)%2;i<size;i+=2)if(bay(i,y)<.25){x.fillStyle=COL.deep;x.fillRect(i,y,1,1)}
 const isFr=r.npc===false;
 const drawSp=()=>{const sp=isFr?eilynSprite(0):npcSprite(relHash(r.nom)%NPC_PALS.length,0);const k=Math.max(1,Math.floor(size*.8/sp.height));const w=sp.width*k,h=sp.height*k,ox=Math.round((size-w)/2),oy=size-h;
  if(isFr){x.globalAlpha=.45;for(const[dx,dy]of[[-1,0],[1,0],[0,-1]])x.drawImage(tinted('eil16-0',sp,COL.ice),ox+dx*k,oy+dy*k,w,h);x.globalAlpha=1}
  x.drawImage(sp,ox,oy,w,h)};
 if(r.portrait){loadImg(r.portrait).then(im=>{const W=im.naturalWidth,H=im.naturalHeight;let q=Math.min(W,H);if(size<=40)q*=.76;const cx=(W-q)/2,cy=size<=40?Math.min(H-q,H*.1):0;const c=pixelArt(im,size,{crop:[cx,cy,q,q],h:size,dither:true});x.drawImage(c,0,0)}).catch(drawSp)}else drawSp();
}
function relFace(r){const c=document.createElement('canvas');relPortrait(c,r,32);FACE.rel=c}
function relHearts(a){if(a==null||a==='')return`<span class="rl-noaff">NON ÉVALUÉE</span>`;const v=Math.max(0,Math.min(100,+a||0));let o='';for(let i=0;i<10;i++){const f=v-i*10;o+=`<i style="background-image:url('${f>=10?HEART_URI.full:f>=5?HEART_URI.half:HEART_URI.empty}')"></i>`}return`<span class="rl-hearts" aria-label="Affinité ${v} sur 100">${o}</span><b class="rl-affv">${v}</b>`}
SCREENS.relations={song:'menu',mount(p){
 const R=Array.isArray(D.relations)?D.relations:[];const cases=Math.max(R.length,+D.relationsCases||6);
 const FIL=[['tous','TOUS'],['allie','ALLIÉS'],['neutre','NEUTRES'],['ennemi','ENNEMIS'],['inconnu','INCONNUS']];
 let fil='tous',tri=0,sel=R.length?0:-1;const TRI=['ORDRE','AFFINITÉ ▼','AFFINITÉ ▲'];
 p.innerHTML=head('RELATIONS',`[SYSTÈME] ${R.length} contact${R.length>1?'s':''} enregistré${R.length>1?'s':''}`)+`
 <div class="rl-bar"><div class="rl-fil" role="group" aria-label="Filtrer">${FIL.map(([k,l])=>`<button type="button" data-f="${k}" aria-pressed="${k==='tous'}">${l}</button>`).join('')}</div>
  <button type="button" class="rl-tri" id="rlTri" aria-label="Changer le tri">TRI : <b>${TRI[0]}</b></button></div>
 <div class="rl-grid"><div class="rl-list" id="rlList" role="list"></div><div class="box rl-det" id="rlDet" aria-live="polite"></div></div>
 <p class="sim-note">Vue de ${esc(D.nom||'Croc')} : tout le monde est un NPC, sauf ${esc(D.frere||'son frère')}.</p>`;
 const list=$('#rlList',p),det=$('#rlDet',p);
 function order(){let ix=R.map((r,i)=>i).filter(i=>fil==='tous'||REL_ST(R[i].statut).k===fil);
  if(tri){ix.sort((a,b)=>{const va=R[a].affinite,vb=R[b].affinite;if(va==null&&vb==null)return a-b;if(va==null)return 1;if(vb==null)return-1;return tri===1?vb-va:va-vb})}return ix}
 function drawList(){
  const ix=order();let h='';
  ix.forEach(i=>{const r=R[i],st=REL_ST(r.statut);h+=`<button type="button" role="listitem" class="rl-card st-${st.k}${r.npc===false?' fr':''}" data-i="${i}" aria-pressed="${i===sel}"><canvas aria-hidden="true"></canvas><span class="t"><span class="n">${esc(r.nom||'???')}</span><span class="r">${esc(r.role||'')}</span></span><span class="g" title="${st.l}">${st.g}</span><span class="tag">${r.npc===false?'♥':'NPC'}</span></button>`});
  const empty=fil==='tous'?cases-R.length:0;for(let k=0;k<empty;k++)h+=`<button type="button" role="listitem" class="rl-card vide" data-i="-1" aria-label="Case vide"><span class="t"><span class="n">???</span><span class="r">— case libre —</span></span></button>`;
  if(!ix.length&&!empty)h=`<p class="rl-none">[SYSTÈME] Aucun contact dans cette catégorie.</p>`;
  list.innerHTML=h;$$('.rl-card canvas',list).forEach(cv=>relPortrait(cv,R[+cv.parentElement.dataset.i],32));
 }
 function drawDet(){
  const r=R[sel];if(!r){det.innerHTML=`<p class="rl-none">[SYSTÈME] Aucun contact enregistré.</p>`;return}
  const st=REL_ST(r.statut);const row=(l,v)=>v?`<div><span class="lbl">${l}</span><b>${esc(v)}</b></div>`:'';
  det.className='box rl-det st-'+st.k+(r.npc===false?' fr':'');
  det.innerHTML=`<div class="rl-top"><canvas class="rl-big" aria-hidden="true"></canvas><div class="rl-id"><p class="rl-nm">${esc(r.nom||'???')}</p><p class="rl-role">${esc(r.role||'')}</p>
   <p class="rl-badges"><span class="rl-st">${st.g} ${st.l}</span><span class="rl-view">${r.npc===false?'♥ NON-NPC':'[NPC]'}</span></p></div></div>
   <div class="rl-aff"><span class="lbl">AFFINITÉ</span>${relHearts(r.affinite)}</div>
   <div class="rl-rows">${row('RENCONTRE',r.rencontre)}${row('DERNIÈRE INTERACTION',r.derniereMaj)}</div>
   ${r.note?`<div class="rl-note"><span class="lbl">NOTE DU SYSTÈME</span>${esc(r.note)}</div>`:''}
   <div class="rl-act"><button type="button" class="pbtn" id="rlTalk">▶ PARLER</button></div>`;
  relPortrait($('.rl-big',det),r,80);
  $('#rlTalk',det).onclick=()=>{SFX.ok();const nm=String(r.nom||'???').toUpperCase();
   relFace(r);const L=r.citation?[{who:'rel',name:nm,t:r.citation},{who:'croc'}]:[{who:'sys',t:`[SYSTÈME] Aucune réplique enregistrée pour ${r.nom||'ce contact'}.`},{who:'croc'}];
   DLG.say(L)};
 }
 function selRel(i,sound=true){if(i<0){SFX.err();return}sel=i;$$('.rl-card',list).forEach(b=>b.setAttribute('aria-pressed',+b.dataset.i===i));drawDet();if(sound){R[i]&&R[i].npc===false?SFX.heart():SFX.ok()}
  if(innerWidth<=820){const t=det.getBoundingClientRect().top;if(t>innerHeight*.7)det.scrollIntoView({behavior:RM?'auto':'smooth',block:'start'})}}
 drawList();drawDet();
 rove(list,'.rl-card',{});list.addEventListener('focusin',e=>{const b=e.target.closest('.rl-card');if(b&&+b.dataset.i>=0&&+b.dataset.i!==sel)selRel(+b.dataset.i,false)});
 list.addEventListener('click',e=>{const b=e.target.closest(".rl-card");if(b)selRel(+b.dataset.i)});
 list.addEventListener('mouseover',e=>{const b=e.target.closest('.rl-card');if(b&&b.dataset.h!=='1'){$$('.rl-card',list).forEach(c=>c.dataset.h='');b.dataset.h='1';SFX.move()}});
 const fb=$('.rl-fil',p);rove(fb,'button',{vertical:false});
 fb.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;fil=b.dataset.f;$$('button',fb).forEach(x=>x.setAttribute('aria-pressed',x===b));SFX.move();drawList();const ix=order();if(ix.length&&!ix.includes(sel))selRel(ix[0],false)});
 $('#rlTri',p).onclick=()=>{tri=(tri+1)%3;$('#rlTri b',p).textContent=TRI[tri];SFX.ok();drawList()};
 return()=>{};
}};

/* =====================================================================
   TITRES — jingle « titre obtenu », gros texte pixel animé
   ===================================================================== */
/* =====================================================================
   BALADE — mini-jeu d'exploration (fichier balade.js).
   balade.js déclare window.CrocBalade(kit) ; on lui prête ici les briques
   du site (police, sprites, sons, dialogues, état de partie…) et il rend
   l'écran SCREENS.balade. Sans balade.js, l'entrée du menu est masquée.
   ===================================================================== */
if(typeof window.CrocBalade==='function'){
 try{SCREENS.balade=window.CrocBalade({D,$,$$,sleep,RM,esc,rnd,ri,pick,clamp,pad,store,anim,PAL,COL,bay,FONT,fnorm,textW,drawText,drawTextOutlined,
  sprite,tinted,flipped,crocSprite,drawHammer,npcSprite,NPC_PALS,eilynSprite,AU,SFX,DLG,G,go,head,hud,flash,shake,drawLabel,PNJ_DEF,fmtTime})}
 catch(e){console.error('BALADE indisponible :',e)}
}

if(/[?&]test\b/.test(location.search))window.__spr={crocSprite,drawHammer,eilynSprite,npcSprite,NPC_PALS,foeSprite,tinted,S:SPR_};/* aide aux tests uniquement */
SCREENS.titres={song:null,mount(p){
 const TT=D.titres||[];const bon=(D.stats||[]).filter(s=>s.bonus);
 const big=t=>[...`[${t}]`].map((c,i,a)=>c===' '?' ':`<span class="ch ${c==='['||c===']'?'br':c==='!'?'ex':''}" style="--i:${i}" aria-hidden="true">${esc(c)}</span>`).join('');
 p.innerHTML=head('TITRES',`[SYSTÈME] ${TT.length} titre${TT.length>1?'s':''} obtenu${TT.length>1?'s':''}`)+TT.map((t,k)=>`
 <div class="tt" ${k?'style="margin-top:28px"':''}>${k?'':'<canvas class="tt-fx" aria-hidden="true"></canvas>'}
  <span class="tt-get">★ TITRE OBTENU ★</span>
  <button type="button" class="tt-name" aria-label="Titre : ${esc(t.nom)}. Cliquer pour fléchir.">${big(t.nom)}</button>
  <div class="tt-grid">
   <div class="box"><h3 class="cap">CONDITION D'OBTENTION</h3><p>${esc(t.condition||'???')}</p></div>
   <div class="box sang"><h3 class="cap">EFFET</h3><p>${esc(t.effet||'???')}</p>${k===0&&bon.length?`<ul class="eff-list">${bon.map(s=>`<li><span>${esc(s.nom)}</span><span>${esc(s.val)}/${esc(s.max)} <b>${esc(s.bonus)}</b></span></li>`).join('')}</ul>`:''}</div>
   ${k===0?`<div class="tt-art" id="ttArt"><canvas aria-label="Croc accroupi, marteau en main (illustration pixelisée)"></canvas></div>`:''}
  </div></div>`).join('')+`<div class="tt-btns"><button type="button" class="pbtn" id="ttAgain">♪ REJOUER LE JINGLE</button></div>`;
 const timers=[];const T=(f,ms)=>timers.push(setTimeout(f,RM?0:ms));
 const fx=$('.tt-fx',p);let conf=[],raf=0,alive=true;
 function confetti(){if(RM||!fx)return;const r=fx.getBoundingClientRect();fx.width=Math.max(10,Math.round(r.width/4));fx.height=Math.max(10,Math.round(r.height/4));const x=fx.getContext('2d');
  for(let i=0;i<70;i++)conf.push({x:rnd(0,fx.width),y:rnd(-fx.height*.6,-2),vy:rnd(14,40),vx:rnd(-6,6),c:pick([COL.bone,COL.blood2,COL.ice,COL.white,COL.vio3]),s:ri(1,2),ph:rnd(0,6)});
  let last=performance.now();cancelAnimationFrame(raf);(function f(now){if(!alive)return;const dt=Math.min(.05,(now-last)/1000);last=now;x.clearRect(0,0,fx.width,fx.height);
   for(const q of conf){q.y+=q.vy*dt;q.x+=q.vx*dt+Math.sin(now/200+q.ph)*.2;x.fillStyle=q.c;x.fillRect(Math.round(q.x),Math.round(q.y),q.s,Math.floor(now/120+q.ph)%2?q.s:1)}
   conf=conf.filter(q=>q.y<fx.height);if(conf.length)raf=requestAnimationFrame(f);else x.clearRect(0,0,fx.width,fx.height)})(last)}
 function play(){
  const chs=$$('.tt-name .ch',p);chs.forEach(c=>c.classList.remove('in'));
  chs.forEach((c,i)=>T(()=>{c.classList.add('in');if(i%2===0)SFX.thud()},i*45));
  AU.music(null);T(()=>{SFX.fanfare();flash(COL.bone,.35,260);confetti()},chs.length*45+120);
  T(()=>{if(G.screen==='titres'&&alive)AU.music('gloire')},chs.length*45+3300);
 }
 play();
 $('#ttAgain',p).onclick=()=>{timers.forEach(clearTimeout);play()};
 $$('.tt-name',p).forEach(b=>b.onclick=()=>{b.classList.remove('flex');void b.offsetWidth;b.classList.add('flex');SFX.hammer(.7);SFX.coin(4);shake($('#panel'),6,260);const a=$('#ttArt',p);if(a){a.classList.remove('flexing');void a.offsetWidth;a.classList.add('flexing')}});
 const ac=$('#ttArt canvas',p);if(ac)loadImg('images/croc-accroupi.jpg').then(im=>{const c=pixelArt(im,92,{dither:true});ac.width=c.width;ac.height=c.height;const x=ac.getContext('2d');x.drawImage(c,0,0)}).catch(()=>{});
 return()=>{alive=false;timers.forEach(clearTimeout);cancelAnimationFrame(raf)};
}};

/* =====================================================================
   ALBUM — vue PIXEL / TRAMÉ (16 couleurs) / ORIGINAL + agrandissement
   ===================================================================== */
const LB={i:0,mode:'pixel',tok:0,prev:null};
const GAL=()=>D.galerie||[];
function fitTo(el,im){const st=$('#lbStage');const aw=st.clientWidth||600,ah=Math.max(160,Math.min(innerHeight-220,760));const r=im.naturalWidth/im.naturalHeight;let w=Math.min(aw,ah*r);el.style.width=Math.round(w)+'px';el.style.height=Math.round(w/r)+'px'}
async function lbShow(){
 const g=GAL()[LB.i];if(!g)return;const tok=++LB.tok;$('#lbNum').textContent=pad(LB.i+1)+' / '+pad(GAL().length);$('#lbCap').textContent=g.alt||'';
 const st=$('#lbStage');let im;try{im=await loadImg(g.src)}catch(e){st.textContent='Image introuvable : '+g.src;return}
 if(tok!==LB.tok)return;
 for(const w of(RM?[]:[5,9,15,26,44])){if(tok!==LB.tok)return;const c=pixelArt(im,w);fitTo(c,im);st.replaceChildren(c);SFX.dice();await sleep(75)}
 if(tok!==LB.tok)return;
 let fin;if(LB.mode==='net'){fin=new Image();fin.src=g.src;fin.alt=g.alt||''}else{fin=pixelArt(im,LB.mode==='trame'?150:110,{dither:LB.mode==='trame'});fin.setAttribute('role','img');fin.setAttribute('aria-label',g.alt||'')}
 fitTo(fin,im);st.replaceChildren(fin);SFX.coin(2);
}
function lbOpen(i,mode){LB.prev=document.activeElement;LB.i=i;LB.mode=mode;$('#lb').hidden=false;SFX.open();$('#lbWin').focus({preventScroll:true});lbShow()}
function lbClose(){$('#lb').hidden=true;LB.tok++;SFX.back();if(LB.prev&&document.contains(LB.prev))LB.prev.focus({preventScroll:true})}
function lbGo(d){const n=GAL().length;LB.i=(LB.i+d+n)%n;SFX.move();lbShow()}
function lbKey(e){
 if(e.key==='Escape'){e.preventDefault();lbClose()}else if(e.key==='ArrowRight'){e.preventDefault();lbGo(1)}else if(e.key==='ArrowLeft'){e.preventDefault();lbGo(-1)}
 else if(e.key==='Tab'){const f=$$('#lbWin button');const i=f.indexOf(document.activeElement);e.preventDefault();f[(i+(e.shiftKey?-1:1)+f.length)%f.length].focus()}
}
SCREENS.album={song:'album',mount(p){
 let mode=store.get('croc-retro-album','pixel');if(!['pixel','trame','net'].includes(mode))mode='pixel';
 p.innerHTML=head('ALBUM',`${GAL().length} illustrations`)+`
 <div class="al-mode" role="radiogroup" aria-label="Rendu des images"><span class="lbl">RENDU</span><button type="button" role="radio" data-m="pixel">PIXEL</button><button type="button" role="radio" data-m="trame">TRAMÉ 16 COUL.</button><button type="button" role="radio" data-m="net">ORIGINAL</button></div>
 <div class="al-grid" id="alg">${GAL().map((g,i)=>`<button type="button" class="card" data-i="${i}" aria-label="Agrandir : ${esc(g.alt||'illustration '+(i+1))}"><span class="th"></span><span class="no"><span>N°${pad(i+1)}</span><span>▶ VOIR</span></span></button>`).join('')}</div>
 <p class="al-note" id="alNote">Illustrations : fan arts, droits réservés à leurs auteurs.</p>`;
 let tok=0;
 async function render(){
  const t=++tok;$$('.al-mode button',p).forEach(b=>b.setAttribute('aria-checked',b.dataset.m===mode));
  const cards=$$('.card',p);
  for(const c of cards){const g=GAL()[+c.dataset.i];const th=$('.th',c);try{const im=await loadImg(g.src);if(t!==tok)return;
   let el;if(mode==='net'){el=new Image();el.src=g.src;el.alt='';el.loading='lazy'}else el=pixelArt(im,mode==='trame'?72:40,{dither:mode==='trame'});th.replaceChildren(el)}catch(e){th.textContent='?'}}
  $('#alNote',p).textContent='Illustrations : fan arts, droits réservés à leurs auteurs.'+(mode==='trame'&&ditherOK===false?' — Le rendu TRAMÉ a besoin que le site soit en ligne (en ouvrant le fichier en local, le navigateur bloque la lecture des pixels) : affichage PIXEL à la place.':'');
 }
 render();
 const mg=$('.al-mode',p);rove(mg,'button',{vertical:false});
 mg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;store.set('croc-retro-album',mode);SFX.ok();render()});
 const grid=$('#alg',p);rove(grid,'.card');
 grid.addEventListener('click',e=>{const b=e.target.closest('.card');if(b)lbOpen(+b.dataset.i,mode)});
 return()=>{tok++};
}};

/* =====================================================================
   SAUVEGARDER — fichier de sauvegarde (navigateur) + capture PNG
   ===================================================================== */
function drawSprite(cv){cv.width=24;cv.height=30;const x=cv.getContext('2d');x.imageSmoothingEnabled=false;x.clearRect(0,0,24,30);x.drawImage(crocSprite('down',0),1,5);drawHammer(x,1,5,'down',1)}
function makeCard(){
 const W=320,H=180,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
 for(let y=0;y<H;y++)for(let i=0;i<W;i++){const k=y/H;x.fillStyle=bay(i,y)<k?COL.night:COL.deep;x.fillRect(i,y,1,1)}
 const R=(a,b,w,h,col)=>{x.fillStyle=col;x.fillRect(a,b,w,h)};
 R(2,2,W-4,2,COL.bone);R(2,H-4,W-4,2,COL.bone);R(2,2,2,H-4,COL.bone);R(W-4,2,2,H-4,COL.bone);R(5,5,W-10,1,COL.gray);R(5,H-6,W-10,1,COL.gray);
 drawText(x,'FICHIER 1',12,12,COL.ice,1);const z='LE DEDALE';drawText(x,z,W-12-textW(z),12,COL.gray2,1);
 R(12,26,62,94,COL.ink);R(13,27,60,92,COL.vio);x.imageSmoothingEnabled=false;x.drawImage(crocSprite('down',0),15,40,48,72);drawHammer(x,15,40,'down',3);
 drawTextOutlined(x,D.nom||'CROC',86,26,COL.bone,3);
 String(D.sousTitre||'').split('·').map(t=>t.trim()).filter(Boolean).reduce((acc,t)=>{const l=acc[acc.length-1];if(l&&textW(l+' - '+t)<=118)acc[acc.length-1]=l+' - '+t;else acc.push(t);return acc},[]).slice(0,2).forEach((t,i)=>drawText(x,t,86,54+i*10,COL.bone2,1));
 const rows=[['TEMPS',fmtTime(G.elapsed)],['CHAOS',G.chaos],['CATASTROPHES',G.cata],['COUPS',G.coups]];
 rows.forEach(([k,v],i)=>{drawText(x,k,86,80+i*11,COL.gray2,1);const s=String(v);drawText(x,s,202-textW(s),80+i*11,i===1?COL.blood2:COL.bone,1)});
 R(208,24,1,116,COL.vio2);
 (D.stats||[]).forEach((s,i)=>{const y=26+i*14;drawText(x,fnorm(s.nom).replace(/\. ?/,'.').slice(0,10),214,y,COL.gray2,1);for(let k=0;k<20;k++){R(214+k*4.6|0,y+9,3,2,k<(+s.val||0)?COL.bone:COL.vio2)}});
 const t=(D.titres&&D.titres[0])?'['+D.titres[0].nom+']':'';drawText(x,'TITRE',12,130,COL.gray2,1);drawText(x,t,12,142,COL.blood2,1);
 const d=new Date();const ds=`${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;drawText(x,ds,W-12-textW(ds),H-18,COL.gray,1);
 const rm=(D.rolls||[]).map(r=>fnorm(r.nom)+' '+r.val).join('  ');drawText(x,rm,12,H-18,COL.ice,1);
 const big=document.createElement('canvas');big.width=W*3;big.height=H*3;const bx=big.getContext('2d');bx.imageSmoothingEnabled=false;bx.drawImage(c,0,0,W*3,H*3);return big;
}
SCREENS.sauvegarder={song:'menu',mount(p){
 const s=store.get(SAVE_KEY,null);const nj=G.journal.filter(Boolean).length;const t=(D.titres&&D.titres[0])?D.titres[0].nom:'???';
 const fmtD=v=>{try{return new Date(v).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'})}catch(e){return'?'}};
 p.innerHTML=head('SAUVEGARDER','[SYSTÈME] Point de sauvegarde')+`
 <div class="box slot"><canvas aria-hidden="true"></canvas><div><p class="h"><span>FICHIER 1 · ${esc(D.nom||'CROC')}</span><b id="svDate">${s&&s.date?'Sauvé le '+esc(fmtD(s.date)):'— vide —'}</b></p>
 <dl><div><dt>ZONE</dt><dd>LE DÉDALE</dd></div><div><dt>TEMPS</dt><dd id="svT">${fmtTime(G.elapsed)}</dd></div><div><dt>CHAOS</dt><dd>${G.chaos}</dd></div><div><dt>CATASTROPHES</dt><dd>${G.cata}</dd></div><div><dt>COUPS</dt><dd>${G.coups}</dd></div><div><dt>JOURNAL</dt><dd>${nj}/${(D.psycho||[]).length}</dd></div><div><dt>TITRE</dt><dd>[${esc(t)}]</dd></div></dl></div></div>
 <div class="save-btns"><button type="button" class="pbtn" id="svSave">▶ SAUVEGARDER</button><button type="button" class="pbtn" id="svShot">EXPORTER UNE CAPTURE (.PNG)</button><button type="button" class="pbtn red" id="svTitle">◀ ÉCRAN TITRE</button></div>
 <p class="save-msg" id="svMsg" aria-live="polite"></p><div class="save-prev" id="svPrev" hidden></div>`;
 drawSprite($('.slot canvas',p));
 const say=t=>{$('#svMsg',p).textContent=t};
 $('#svSave',p).onclick=()=>{const ok=store.set(SAVE_KEY,{chaos:G.chaos,cata:G.cata,coups:G.coups,elapsed:G.elapsed,journal:G.journal,date:Date.now()});
  if(ok){SFX.save();flash(COL.ice,.25,300);$('#svDate',p).textContent='Sauvé le '+fmtD(Date.now());say('[SYSTÈME] Partie sauvegardée dans ce navigateur.')}else{SFX.err();say('[SYSTÈME] Sauvegarde impossible ici (navigation privée ?).')}};
 $('#svShot',p).onclick=()=>{try{const c=makeCard();const pv=$('#svPrev',p);pv.hidden=false;pv.replaceChildren(c);c.setAttribute('role','img');c.setAttribute('aria-label','Capture de la sauvegarde');
  c.toBlob(b=>{if(!b){say('[SYSTÈME] Capture impossible.');return}const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='croc-sauvegarde.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);SFX.save();say('[SYSTÈME] Capture exportée : croc-sauvegarde.png')},'image/png')}catch(e){SFX.err();say('[SYSTÈME] Capture impossible dans ce navigateur.')}};
 $('#svTitle',p).onclick=()=>{SFX.back();toTitle()};
 const iv=setInterval(()=>{const e=$('#svT',p);if(e)e.textContent=fmtTime(G.elapsed)},1000);
 return()=>clearInterval(iv);
}};

/* =====================================================================
   DÉMARRAGE — écran titre, START, boot du Système
   ===================================================================== */
let titleOn=true,starting=false;
function titleHand(el){const h=$('#tmenu .hand');if(h&&el)h.style.transform=`translate(${el.offsetLeft-30}px,${el.offsetTop+el.offsetHeight/2-10}px)`}
async function startGame(sound){
 if(starting||!titleOn)return;starting=true;
 AU.init();AU.setOn(sound);syncSound();
 const btn=sound?$('#startSound'):$('#startMute');btn.classList.add('go');SFX.start();
 await sleep(RM?0:700);
 await wipe(async()=>{Title.stop();AU.ambience(false);titleOn=false;$('#title-screen').hidden=true;$('#game').hidden=false;G.inGame=true;hud();drawSprite($('#sideSprite'));scrollTo(0,0);placeHand($('#hand'),$('.mi'))},{dur:380});
 btn.classList.remove('go');
 if(!G.booted){G.booted=true;AU.music('titre');$('#panel').innerHTML='<div class="boot-ph"><p class="sys">[SYSTÈME] Chargement de la fiche…</p><div class="pbar"><i></i></div><p class="lbl">NOW LOADING</p></div>';
  await DLG.say((D.boot||[]).map(t=>({who:'sys',t})).concat([{who:'croc'},{who:'sys',t:'[SYSTÈME] Menu ouvert. Flèches + Entrée, ou clic. Échap pour revenir au menu.'}]))}
 starting=false;
 await go(G.last||'statut');
}
async function toTitle(){
 await wipe(async()=>{if(unmount){try{unmount()}catch(e){}unmount=null}G.last=G.screen;G.screen=null;$('#panel').innerHTML='';G.inGame=false;$('#game').hidden=true;$('#title-screen').hidden=false;titleOn=true;Title.start();AU.music('titre');AU.ambience(true);
  const b=$('#startSound');b.focus({preventScroll:true});titleHand(b)},{dur:380});
}
function init(){
 setupDecor();
 if(!SCREENS.balade){const b=$('.mi[data-go="balade"]');if(b)b.closest('li').remove()}
 if(store.get('croc-retro-crt',true)===false)document.body.classList.remove('crt');syncCrt();syncSound();hud();
 /* menu principal */
 const menu=$('#menu'),hand=$('#hand');
 rove(menu,'.mi',{onMove:b=>placeHand(hand,b)});
 menu.addEventListener('focusin',e=>{const b=e.target.closest('.mi');if(b)placeHand(hand,b)});
 menu.addEventListener('mouseover',e=>{const b=e.target.closest('.mi');if(b&&hand.dataset.on!==b.dataset.go){hand.dataset.on=b.dataset.go;placeHand(hand,b);SFX.move()}});
 menu.addEventListener('click',e=>{const b=e.target.closest('.mi');if(b){SFX.ok();go(b.dataset.go)}});
 addEventListener('resize',()=>{const c=$('.mi[aria-current="page"]')||$('.mi');placeHand(hand,c)});
 /* écran titre */
 const tm=$('#tmenu');const th=document.createElement('span');th.className='hand';th.setAttribute('aria-hidden','true');tm.appendChild(th);
 tm.addEventListener('focusin',e=>{const b=e.target.closest('.t-opt');if(b)titleHand(b)});
 tm.addEventListener('mouseover',e=>{const b=e.target.closest('.t-opt');if(b){titleHand(b)}});
 $('#startSound').onclick=()=>startGame(true);$('#startMute').onclick=()=>startGame(false);
 /* HUD */
 $('#sndBtn').onclick=toggleSound;
 $('#crtBtn').onclick=()=>{document.body.classList.toggle('crt');store.set('croc-retro-crt',document.body.classList.contains('crt'));syncCrt();SFX.ok()};
 /* dialogue */
 $('#dlgBack').addEventListener('click',()=>DLG.advance());$('#dlgBox').addEventListener('click',()=>DLG.advance());
 /* album */
 $('#lbX').onclick=lbClose;$('#lbBack').onclick=lbClose;$('#lbPrev').onclick=()=>lbGo(-1);$('#lbNext').onclick=()=>lbGo(1);
 /* clavier global */
 document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(!$('#lb').hidden){lbKey(e);return}
  if(DLG.open){DLG.key(e);return}
  if(titleOn){
   if((e.key==='Enter'||e.key===' ')&&!(e.target.closest&&e.target.closest('.t-opt'))){e.preventDefault();startGame(true)}
   else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const o=$$('.t-opt');const i=o.indexOf(document.activeElement);const n=o[(i+(e.key==='ArrowDown'?1:-1)+o.length)%o.length]||o[0];n.focus();titleHand(n)}
   return}
  if(e.key==='m'||e.key==='M'){toggleSound();return}
  if(e.key==='Escape'){const c=$('.mi[aria-current="page"]')||$('.mi');if(c&&c.offsetParent!==null){c.focus();SFX.back()}}
 });
 /* visage du Croc pour les dialogues */
 loadImg('images/croc-sourire.jpg').then(im=>{FACE.croc=pixelArt(im,32,{crop:[110,10,380,380],dither:true})}).catch(()=>{});
 drawSprite($('#sideSprite'));
 Title.start();const sb=$('#startSound');sb.focus({preventScroll:true});requestAnimationFrame(()=>titleHand(sb));
}
init();
})();
