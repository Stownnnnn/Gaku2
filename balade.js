/* =====================================================================
   CROC — BALADE
   Mini-jeu d'exploration en vue de côté : nuit, pluie, néons, écran VHS,
   ralenti, relecture de cassette (hommage à la « POV » de Katana Zero).
   Croc n'a pas de katana : il a son marteau à pointes.

   Ce fichier déclare seulement window.CrocBalade(kit). app.js l'appelle
   en lui prêtant ses briques (police, sprites, sons, dialogues, état de
   partie…) et reçoit en retour l'écran SCREENS.balade du menu.
   Rien n'est inventé sur Croc : lieux génériques (TOITS, RUELLE…),
   PNJ génériques, monstres génériques du Dédale.

   Plan du fichier :
     1. outils (dessin pixel, hasard reproductible, lueurs)
     2. sons et musique (ajoutés au moteur audio du site)
     3. personnages dessinés en pixel art (Croc articulé, marteau, PNJ, monstres)
     4. les cinq zones (géométrie, décors, néons, lumières)
     5. moteur : physique, monstres, PNJ, objets, particules
     6. cassette : enregistrement, rembobinage, relecture
     7. rendu : parallaxe, lumières, pluie, ralenti, filtre VHS, HUD
     8. entrées (clavier AZERTY/QWERTY, souris, manette, tactile)
     9. couche plein écran + écran BALADE du menu
   ===================================================================== */
window.CrocBalade=function(K){
'use strict';
const {D,$,$$,RM,esc,rnd,ri,pick,clamp,pad,store,COL,bay,FONT,drawText,textW,sprite,tinted,eilynSprite,NPC_PALS,AU,SFX,DLG,G,go,head,PNJ_DEF}=K;
const TEST=/[?&]test\b/.test(location.search);

/* =====================================================================
   1. OUTILS
   ===================================================================== */
const TILE=8,VH=216;
const NEON={pink:'#ff3fa4',pink2:'#9c1f66',cyan:'#43f0ff',cyan2:'#1a8aa6',vio:'#a066ff',amber:'#ffb04a',green:'#3dff8a',red:'#ff2b45',white:'#f4f0ff'};
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));const x=c.getContext('2d');x.imageSmoothingEnabled=false;return[c,x]};
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const lerp=(a,b,t)=>a+(b-a)*t;
const appr=(v,t,d)=>v<t?Math.min(t,v+d):Math.max(t,v-d);
const sgn=v=>v<0?-1:1;
function R(x,a,b,w,h,c){if(c)x.fillStyle=c;x.fillRect(Math.round(a),Math.round(b),w,h)}
/* ligne pixel (épaisseur w) */
function L(x,x0,y0,x1,y1,c,w=1){x.fillStyle=c;x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))||1;const o=w>>1;for(let i=0;i<=n;i++)x.fillRect(Math.round(x0+(x1-x0)*i/n)-o,Math.round(y0+(y1-y0)*i/n)-o,w,w)}
/* polygone plein, sans anticrénelage */
function poly(x,P,c){
 x.fillStyle=c;let y0=1e9,y1=-1e9;for(const p of P){if(p[1]<y0)y0=p[1];if(p[1]>y1)y1=p[1]}
 for(let y=Math.floor(y0);y<Math.ceil(y1);y++){const yc=y+.5,xs=[];
  for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];if((yc>=a[1]&&yc<b[1])||(yc>=b[1]&&yc<a[1]))xs.push(a[0]+(yc-a[1])*(b[0]-a[0])/(b[1]-a[1]))}
  xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2){const l=Math.round(xs[i]),r=Math.round(xs[i+1]);if(r>l)x.fillRect(l,y,r-l,1)}}
}
/* lueurs tramées (Bayer) mises en cache — dessinées en mode « lighter » */
const GLW={};
function glow(r,col,k=1,pw=1.7){r=Math.max(2,Math.round(r));const key=r+col+k+pw;if(GLW[key])return GLW[key];const[c,g]=mk(r*2+1,r*2+1);g.fillStyle=col;
 for(let y=-r;y<=r;y++)for(let i=-r;i<=r;i++){const d=Math.hypot(i,y)/r;if(d>=1)continue;if(bay(i+r,y+r)<Math.pow(1-d,pw)*k)g.fillRect(i+r,y+r,1,1)}return GLW[key]=c}
/* lueur douce (dégradé) */
function sglow(r,col){r=Math.max(2,Math.round(r));const key='s'+r+col;if(GLW[key])return GLW[key];const[c,g]=mk(r*2,r*2);const gr=g.createRadialGradient(r,r,0,r,r,r);gr.addColorStop(0,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,r*2,r*2);return GLW[key]=c}
const hex2=(h,a)=>{const n=parseInt(h.slice(1),16);return`rgba(${n>>16},${n>>8&255},${n&255},${a})`};
/* dégradé vertical tramé entre plusieurs couleurs */
function vgrad(g,x0,y0,w,h,cols){const n=cols.length-1;for(let y=0;y<h;y++){const f=y/Math.max(1,h-1)*n,i=Math.min(n-1,Math.floor(f)),fr=f-i;for(let xx=0;xx<w;xx++){g.fillStyle=cols[fr>bay(x0+xx,y0+y)?i+1:i];g.fillRect(x0+xx,y0+y,1,1)}}}

/* police : quelques glyphes de plus pour l'affichage VHS */
Object.assign(FONT,{'▶':[8,12,14,15,14,12,8],'◀':[2,6,14,30,14,6,2],'×':[0,17,10,4,10,17,0],'◆':[0,4,14,31,14,4,0],'(':[2,4,8,8,8,4,2],')':[8,4,2,2,2,4,8],'=':[0,0,31,0,31,0,0],
 '>':[8,4,2,1,2,4,8],'<':[2,4,8,16,8,4,2],'↓':[4,4,4,21,14,4,0],'↑':[0,4,14,21,4,4,4],'←':[0,4,8,31,8,4,0],'→':[0,4,2,31,2,4,0],'_':[0,0,0,0,0,0,31],'|':[4,4,4,4,4,4,4],'■':[0,31,31,31,31,31,0],'▼':[0,0,31,31,14,4,0],'▲':[0,4,14,31,31,0,0],'—':[0,0,0,31,0,0,0],'❚':[27,27,27,27,27,27,27]});
/* texte « néon VHS » : décalage rouge/cyan */
function vhsText(x,s,px,py,col,sc,ab=1){drawText(x,s,px-ab,py,'rgba(255,40,90,.75)',sc);drawText(x,s,px+ab,py,'rgba(60,230,255,.7)',sc);drawText(x,s,px,py,col,sc)}

/* =====================================================================
   2. SONS ET MUSIQUE (synthétisés : aucun fichier)
   ===================================================================== */
if(AU.def){
 AU.def('pas',(t,{tone,noise},k=0,wet=0)=>{const f=k?60:68;tone({w:'tri',f:f*1.7,f2:f*.7,t,dur:.07,v:.3,a:.001,d:.06,s:.2});noise({t,dur:.05,v:.08,rate:.25,ft:'lowpass',ff:650});if(wet)noise({t:t+.004,dur:.1,v:.05*wet,rate:1,ft:'bandpass',ff:2700,ff2:1100,q:.9})});
 AU.def('saut',(t,{tone,noise})=>{noise({t,dur:.15,v:.07,rate:.7,ft:'bandpass',ff:800,ff2:2600,q:.8,a:.02});tone({w:'tri',f:100,f2:150,t,dur:.06,v:.14})});
 AU.def('reception',(t,{tone,noise},p=1)=>{tone({w:'tri',f:120,f2:38,t,dur:.12*p,v:Math.min(.6,.34*p),a:.001,d:.1,s:.2});noise({t,dur:.1*p,v:.13*p,rate:.3,ft:'lowpass',ff:900,ff2:180});
  if(p>1.4){noise({t,dur:.8,v:.32,rate:.08,ft:'lowpass',ff:520,ff2:55});noise({short:true,t:t+.02,dur:.16,v:.07,rate:.5});tone({w:'p50',f:70,f2:35,t,dur:.25,v:.08})}});
 AU.def('roulade',(t,{tone,noise})=>{noise({t,dur:.26,v:.1,rate:.6,ft:'bandpass',ff:500,ff2:1900,q:.7,a:.05});tone({w:'tri',f:92,f2:58,t:t+.22,dur:.06,v:.2})});
 AU.def('lourd',(t,{noise})=>{noise({t,dur:.22,v:.18,rate:.5,ft:'bandpass',ff:240,ff2:2600,q:1.1,a:.05});noise({t:t+.06,dur:.1,v:.05,rate:1,ft:'highpass',ff:4200})});
 AU.def('impactSol',(t,{tone,noise})=>{tone({w:'p50',f:170,f2:62,t,dur:.07,v:.09});noise({short:true,t,dur:.07,v:.09,rate:.9});noise({t,dur:.16,v:.16,rate:.2,ft:'lowpass',ff:800})});
 AU.def('bois',(t,{tone,noise})=>{noise({t,dur:.06,v:.35,rate:.8,ft:'bandpass',ff:1900,q:1.4});noise({t:t+.03,dur:.24,v:.2,rate:.4,ft:'bandpass',ff:700,ff2:260,q:.9});[0,.04,.09,.15].forEach((d,i)=>tone({w:'p25',f:rnd(300,520)-i*40,t:t+d,dur:.025,v:.05}))});
 AU.def('metal',(t,{tone,noise})=>{[523,786,1180,1567].forEach((f,i)=>tone({w:i%2?'p25':'p50',f:f*rnd(.98,1.03),t,dur:.5-i*.08,v:.055-i*.01,a:.001,d:.4,s:.1,echo:.2}));noise({t,dur:.08,v:.25,rate:.9,ft:'highpass',ff:1800})});
 AU.def('verre',(t,{tone,noise})=>{noise({t,dur:.5,v:.28,rate:1,ft:'highpass',ff:3500,a:.001});for(let i=0;i<10;i++)tone({w:'p12',f:rnd(2600,5200),t:t+i*.03+rnd(0,.03),dur:.03,v:.035,echo:.3});noise({short:true,t,dur:.18,v:.1,rate:1.4});tone({w:'p50',f:60,f2:240,t,dur:.12,v:.06})});
 AU.def('zap',(t,{tone,noise})=>{noise({short:true,t,dur:.1,v:.07,rate:1.4});tone({w:'p50',f:120,f2:240,t,dur:.06,v:.04})});
 AU.def('grogne',(t,{tone,noise})=>{tone({w:'p50',f:95,f2:52,t,dur:.42,v:.09,vib:70,vd:0,vr:22});tone({w:'p25',f:101,f2:50,t,dur:.42,v:.06});noise({t,dur:.36,v:.08,rate:.2,ft:'bandpass',ff:420,q:2})});
 AU.def('cri',(t,{tone,noise})=>{tone({w:'p12',f:900,f2:1900,sl:.3,t,dur:.32,v:.05,vib:80,vd:0,vr:30});noise({t,dur:.3,v:.06,rate:.8,ft:'bandpass',ff:2500,q:3})});
 AU.def('abattu',(t,{tone,noise})=>{noise({t,dur:.12,v:.42,rate:.35,ft:'lowpass',ff:2400,ff2:280});tone({w:'p50',f:220,f2:38,t,dur:.36,v:.12});noise({t:t+.05,dur:.7,v:.12,rate:.6,ft:'bandpass',ff:1300,ff2:180,q:.6})});
 AU.def('porte',(t,{tone,noise})=>{tone({w:'p25',f:190,f2:130,sl:.5,t,dur:.5,v:.03,vib:40,vd:0,vr:9});noise({t,dur:.5,v:.05,rate:.5,ft:'bandpass',ff:900,q:6,hold:true,r:.2});tone({w:'tri',f:90,f2:48,t:t+.5,dur:.12,v:.3});noise({short:true,t:t+.5,dur:.05,v:.1})});
 AU.def('ralentiOn',(t,{tone,noise})=>{tone({w:'tri',f:240,f2:52,sl:.38,t,dur:.42,v:.3});noise({t,dur:.36,v:.1,rate:.6,rate2:.1,ft:'lowpass',ff:3000,ff2:300});tone({w:'p12',f:880,f2:220,sl:.3,t,dur:.3,v:.03,echo:.4})});
 AU.def('ralentiOff',(t,{tone,noise})=>{tone({w:'tri',f:58,f2:210,sl:.16,t,dur:.18,v:.2});noise({t,dur:.16,v:.06,rate:.2,rate2:.8,ft:'lowpass',ff:400,ff2:3000})});
 AU.def('rembobine',(t,{tone,noise},d=1)=>{noise({t,dur:d,v:.11,rate:.6,rate2:1.7,ft:'bandpass',ff:1800,ff2:4300,q:2,hold:true,r:.1});for(let i=0;i<d*14;i++)tone({w:'p12',f:rnd(1200,3600),t:t+i/14,dur:.02,v:.022});tone({w:'p50',f:80,t,dur:d,v:.025,s:1})});
 AU.def('clic',(t,{tone,noise})=>{noise({short:true,t,dur:.03,v:.18,rate:.7});tone({w:'tri',f:150,f2:80,t:t+.01,dur:.05,v:.25})});
 AU.def('mal',(t,{tone,noise})=>{noise({t,dur:.45,v:.34,rate:.15,ft:'lowpass',ff:3000,ff2:150});tone({w:'p50',f:330,f2:40,t,dur:.5,v:.12});noise({short:true,t,dur:.3,v:.12,rate:1.2})});
 AU.def('sursaut',(t,{tone})=>{tone({w:'p25',f:1046,f2:1568,t,dur:.06,v:.07});tone({w:'p25',f:1568,t:t+.07,dur:.05,v:.05})});
 AU.def('vide',(t,{tone,noise})=>{noise({t,dur:.12,v:.05,rate:.9,ft:'bandpass',ff:2000,q:.7});tone({w:'p12',f:300,f2:200,t,dur:.08,v:.03})});
 AU.def('pilon',(t,{tone,noise})=>{noise({t,dur:1.3,v:.8,rate:.07,ft:'lowpass',ff:2600,ff2:55,a:.003});noise({t,dur:.4,v:.3,rate:.5});tone({w:'tri',f:120,f2:28,t,dur:.9,v:.75,a:.002,d:.8,s:.3});noise({short:true,t:t+.05,dur:.3,v:.1,rate:.4})});
 AU.def('goutte',(t,{tone})=>tone({w:'tri',f:rnd(1400,2300),f2:rnd(650,900),sl:.05,t,dur:.06,v:.05,echo:.45}));
 AU.def('eclabousse',(t,{noise})=>noise({t,dur:.18,v:.1,rate:.9,ft:'bandpass',ff:1600,ff2:650,q:.6}));
 AU.def('cassette',(t,{tone,noise})=>{noise({short:true,t,dur:.04,v:.2,rate:.6});tone({w:'tri',f:110,f2:70,t,dur:.06,v:.25});noise({t:t+.08,dur:.5,v:.05,rate:.4,rate2:1.2,ft:'bandpass',ff:900,ff2:2400,q:2,hold:true,r:.1});tone({w:'p25',f:523,t:t+.6,dur:.05,v:.05});tone({w:'p25',f:784,t:t+.66,dur:.08,v:.05,echo:.3})});
 AU.def('stop',(t,{tone,noise})=>{noise({short:true,t,dur:.05,v:.2,rate:.5});tone({w:'tri',f:140,f2:40,sl:.3,t,dur:.3,v:.25});tone({w:'p25',f:440,f2:110,sl:.3,t,dur:.3,v:.04})});
 AU.def('battement',(t,{tone})=>{tone({w:'tri',f:62,f2:40,t,dur:.12,v:.32,a:.002});tone({w:'tri',f:58,f2:38,t:t+.18,dur:.1,v:.22,a:.002})});
}
/* Morceau « balade » : synthwave nocturne (fa# mineur), basse en octaves, arpège, pad.
   Pendant le ralenti, le moteur ralentit la bande et étouffe le son. */
if(AU.song)AU.song('balade',{bpm:96,chords:['F#m','D','A','E','F#m','D','Bm','C#'],
 voices:[{w:'p25',v:.072,echo:.38,vib:12,seq:'F#5:6 E5:2 C#5:4 A4:4 B4:6 A4:2 F#4:8 C#5:6 E5:2 A5:4 G#5:4 G#5:6 F#5:2 E5:4 B4:4 F#5:4 A5:4 G#5:2 F#5:2 E5:4 D5:6 E5:2 F#5:8 F#5:4 E5:4 D5:4 B4:4 C#5:6 F5:2 G#5:8'},
         {w:'p50',v:.026,echo:.45,seq:'A4:16 F#4:16 E4:16 G#4:16 A4:16 F#4:16 D4:16 F4:16'},
         {w:'tri',v:.07,seq:'C#4:16 A3:16 C#4:16 B3:16 C#4:16 A3:16 F#3:16 G#3:16'}],
 bass:{style:'oct8',v:.18},arp:{w:'p12',style:'up16',v:.02,oct:4,echo:.32},
 drums:{k:'x.......x.......',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.'},fill:{s:'....x.......x.xx',h:'x.x.x.x.xxxxxxxx'}});

/* tampon de pixels (ImageData) pour les grands aplats tramés */
const C32={};
const c32=h=>{if(C32[h]!=null)return C32[h];const n=parseInt(h.slice(1),16);return C32[h]=((255<<24)|((n&255)<<16)|(((n>>8)&255)<<8)|(n>>16))>>>0};
function PX(w,h){w=Math.ceil(w);h=Math.ceil(h);const id=new ImageData(w,h),d=new Uint32Array(id.data.buffer);
 return{w,h,d,set(x,y,c){x|=0;y|=0;if(x>=0&&y>=0&&x<w&&y<h)d[y*w+x]=c},
  rect(x,y,ww,hh,c){for(let j=Math.max(0,y|0);j<Math.min(h,(y|0)+hh);j++)for(let i=Math.max(0,x|0);i<Math.min(w,(x|0)+ww);i++)d[j*w+i]=c},
  vgrad(x0,y0,ww,hh,cols,gx=0,gy=0){const cs=cols.map(c32),n=cs.length-1;for(let y=0;y<hh;y++){const f=y/Math.max(1,hh-1)*n,i=Math.min(n-1,Math.floor(f)),fr=f-i;const yy=y0+y;if(yy<0||yy>=h)continue;for(let x=0;x<ww;x++){const xx=x0+x;if(xx<0||xx>=w)continue;d[yy*w+xx]=cs[fr>bay(xx+gx,yy+gy)?i+1:i]}}},
  toCanvas(){const[c,g]=mk(w,h);g.putImageData(id,0,0);return c}}}
/* lueurs tramées (remplace la version lente) */
function glowPX(r,col,k=1,pw=1.7){r=Math.max(2,Math.round(r));const key='p'+r+col+k+pw;if(GLW[key])return GLW[key];const p=PX(r*2+1,r*2+1),c=c32(col);
 for(let y=-r;y<=r;y++)for(let i=-r;i<=r;i++){const d=Math.hypot(i,y)/r;if(d<1&&bay(i+r,y+r)<Math.pow(1-d,pw)*k)p.d[(y+r)*p.w+i+r]=c}return GLW[key]=p.toCanvas()}

/* =====================================================================
   3. PERSONNAGES
   Croc est dessiné « en articulé » : hanches, épaules, genoux et coudes
   sont calculés (cinématique inverse à deux segments), puis tracés pixel
   par pixel. Ça donne des animations fluides (course, saut, roulade,
   coup de marteau en arc) sans perdre le rendu pixel net.
   ===================================================================== */
const CP={coat:'#2a2140',coat2:'#463a64',coat3:'#15101e',coat4:'#5e5084',pant:'#1d1828',pant2:'#332b45',pant3:'#100c17',band:'#ece4d2',band2:'#b3a893',band3:'#7f7767',shoe:'#d6e2ec',shoe2:'#8794a6',shoe3:'#4b5566',lace:'#9aa6b8',ink:'#0b0a10',
 met:'#5f596d',met2:'#a39cb2',met3:'#2c2838',spk:'#e4dccb',shaft:'#4a4358',shaft2:'#77708a',rib:'#d4ecf4',rib2:'#86b4c6',skin:'#e3d7cc',skin2:'#b9a497',gold:'#cdb27a'};
/* tête de profil (vers la droite), 14×13 : cheveux blanc-bleuté hérissés et rejetés en arrière,
   œil rouge sous un sourcil dur, cicatrice sur la joue, oreille et boucle noire carrée */
const HEAD_PAL={h:'#e9f6fa',H:'#aed2de',I:'#6d9aae',J:'#3f6478',s:'#e8d3c4',S:'#b8968a',T:'#7d625e',e:'#e0243c',o:'#2a1020',k:'#050408',K:'#d2b6a6',r:'#b0142e',m:'#7a5450'};
const HEAD=[
"....h...h.....",
"..h.hh.hhh.h..",
".hhhhhhhhhhhh.",
"hhhHhhhhhhhhhh",
".hHHhhhhhhHhh.",
"..IHHhHhhHHhs.",
"..JIHHIHhIsTTs",
"...JIHKsssoess",
"...JIIKSsssSss",
"....JIkSsrssS.",
".....JkSsssTs.",
"......SSsssS..",
".......TTT....",
];
const HEAD2=HEAD.map((r,i)=>i===7?"...JIHKsssTTss":r); /* yeux fermés (clignement) */
const headSpr=b=>b?sprite('bal-head2',HEAD2,HEAD_PAL):sprite('bal-head',HEAD,HEAD_PAL);
/* cinématique inverse : hanche/épaule (hx,hy) → cible (fx,fy) ; dir=1 genou vers l'avant, -1 coude vers le bas */
function ik(hx,hy,fx,fy,l1,l2,dir){let dx=fx-hx,dy=fy-hy,d=Math.hypot(dx,dy)||.001;const m=l1+l2-.05;if(d>m){dx*=m/d;dy*=m/d;d=m}
 const a=Math.atan2(dy,dx),b=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1)),g=a-dir*b;return[hx+Math.cos(g)*l1,hy+Math.sin(g)*l1,hx+dx,hy+dy]}
/* jambe : pantalon ample (cuisse 4 px, pli au genou), basket claire lacée */
function leg(x,h,f,back){const e=ik(h[0],h[1],f[0],f[1],7.2,7.2,1),kx=e[0],ky=e[1],fx=e[2],fy=e[3];
 const c=back?CP.pant3:CP.pant,c2=back?CP.pant:CP.pant2;
 L(x,h[0],h[1],kx,ky,c,4);L(x,kx,ky,fx,fy-2,c,3);L(x,fx-1,fy-3,fx+2,fy-3,c,2);
 if(!back){L(x,h[0]+1,h[1]-1,kx+1,ky-1,c2,1);R(x,kx-1,ky,1,1,CP.pant3);R(x,kx+1,ky+2,1,1,c2)}
 R(x,fx-2,fy-3,6,2,back?CP.shoe2:CP.shoe);R(x,fx-2,fy-1,6,1,back?CP.shoe3:CP.shoe2);
 if(!back){R(x,fx,fy-3,2,1,CP.lace);R(x,fx+3,fy-3,1,1,'#f4f8fb');R(x,fx-2,fy-3,1,2,CP.shoe2)}}
/* bras : épaule musclée (manche du manteau), avant-bras et main bandés */
function arm(x,s,h,back){const e=ik(s[0],s[1],h[0],h[1],5.2,5.2,-1),ex=e[0],ey=e[1],hx=e[2],hy=e[3];
 const cc=back?CP.coat3:CP.coat;L(x,s[0],s[1],ex,ey,cc,back?3:4);if(!back)L(x,s[0],s[1]-1,ex,ey-1,CP.coat2,1);
 const mx=lerp(ex,hx,.25),my=lerp(ey,hy,.25);L(x,ex,ey,mx,my,cc,3);
 L(x,mx,my,hx,hy,back?CP.band2:CP.band,2);const n=Math.max(1,Math.round(Math.hypot(hx-mx,hy-my)/2));for(let i=1;i<n;i++)R(x,lerp(mx,hx,i/n),lerp(my,hy,i/n)+1,2,1,back?CP.band3:CP.band2);
 R(x,hx-1,hy-1,3,3,back?CP.band2:CP.band);R(x,hx+1,hy+1,1,1,back?CP.band3:CP.band2)}
/* marteau : manche long, tête-bloc couverte de pointes (comme sur les illustrations) */
function hammerGeo(G,a){const c=Math.cos(a),s=Math.sin(a);return{c,s,pom:[G[0]-c*5,G[1]-s*5],hc:[G[0]+c*23,G[1]+s*23],tip:[G[0]+c*29,G[1]+s*29]}}
function hammer(x,G,a){const{c,s,hc}=hammerGeo(G,a);
 L(x,G[0]-c*5,G[1]-s*5,G[0]+c*19,G[1]+s*19,CP.shaft,2);L(x,G[0]-c*3+s*.6,G[1]-s*3-c*.6,G[0]+c*17+s*.6,G[1]+s*17-c*.6,CP.shaft2,1);
 for(const t of[2,6])R(x,G[0]-c*t,G[1]-s*t,1,1,CP.band2);
 R(x,G[0]-c*5-1,G[1]-s*5-1,2,2,CP.met2);
 const hx=hc[0],hy=hc[1],ux=c,uy=s,vx=-s,vy=c;const q=(A,B)=>[[hx-ux*A-vx*B,hy-uy*A-vy*B],[hx+ux*A-vx*B,hy+uy*A-vy*B],[hx+ux*A+vx*B,hy+uy*A+vy*B],[hx-ux*A+vx*B,hy-uy*A+vy*B]];
 poly(x,q(4.6,6.6),CP.ink);poly(x,q(3.6,5.6),CP.met);
 poly(x,[[hx+ux*1.8-vx*5.6,hy+uy*1.8-vy*5.6],[hx+ux*3.6-vx*5.6,hy+uy*3.6-vy*5.6],[hx+ux*3.6+vx*5.6,hy+uy*3.6+vy*5.6],[hx+ux*1.8+vx*5.6,hy+uy*1.8+vy*5.6]],CP.met2);
 poly(x,[[hx-ux*3.6-vx*5.6,hy-uy*3.6-vy*5.6],[hx-ux*2-vx*5.6,hy-uy*2-vy*5.6],[hx-ux*2+vx*5.6,hy-uy*2+vy*5.6],[hx-ux*3.6+vx*5.6,hy-uy*3.6+vy*5.6]],CP.met3);
 for(const sv of[-1,1])for(const t of[-2,.5,3]){const px=hx+ux*t+vx*sv*6.4,py=hy+uy*t+vy*sv*6.4;R(x,px,py,1,1,CP.spk);R(x,px+vx*sv*1.2,py+vy*sv*1.2,1,1,CP.met2)}
 for(const t of[-3.5,0,3.5]){R(x,hx+ux*4.6+vx*t,hy+uy*4.6+vy*t,1,1,CP.spk);R(x,hx+ux*5.7+vx*t,hy+uy*5.7+vy*t,1,1,CP.met2)}
 for(const i of[-1.2,1.6])for(const j of[-3,0,3]){R(x,hx+ux*i+vx*j,hy+uy*i+vy*j,1,1,CP.spk);R(x,hx+ux*(i-.9)+vx*(j+.9),hy+uy*(i-.9)+vy*(j+.9),1,1,CP.met3)}}
/* pose de Croc à partir de son état (repère local : pieds en (0,0), regard vers +x) */
const easeO=t=>1-(1-t)*(1-t),easeI=t=>t*t,ease3=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,back_=t=>{const k=1.7;return 1+(k+1)*Math.pow(t-1,3)+k*Math.pow(t-1,2)};
const ATK={w:.09,s:.065,h:.11,r:.17};ATK.tot=ATK.w+ATK.s+ATK.h+ATK.r;
const A_REST=-2.1;
function crocPose(c,T){
 const P={H:[0,-12],lean:.04,FB:[-3,0],FF:[3,0],a:A_REST,G1:null,two:false,HB:null,rot:0,gOff:[3,4],cb:c.cb||0,cl:c.cl||0,hd:0,blink:0,hs:c.hs||0};
 const st=c.st,t=c.stT||0;
 const br=Math.sin(T*2.1);P.blink=(T%4.3)<.12?1:0;
 if(st==='run'){
  const sp=Math.min(1,Math.abs(c.vx)/120),ph=c.ph||0;const str=lerp(3.5,7,sp),lift=lerp(2.5,5.5,sp);
  const foot=o=>{const q=(ph+o)%1;if(q<.5)return[lerp(str,-str,q/.5),0];const s=(q-.5)/.5;return[lerp(-str,str,ease3(s)),-Math.sin(s*Math.PI)*lift]};
  P.FF=foot(0);P.FB=foot(.5);const bob=Math.abs(Math.cos(ph*Math.PI*2));P.H=[0,-12+(bob>.7?1:0)*(sp>.4?1:0)];P.lean=lerp(.08,.3,sp);
  P.swing=Math.sin(ph*Math.PI*2)*lerp(.6,1.2,sp);P.hd=bob>.7&&sp>.4?1:0;P.gOff=[3,4+(bob>.7?1:0)];
 }else if(st==='jump'){if(t<.09){P.H=[0,-14];P.FF=[2,1];P.FB=[-2,0];P.lean=.05;P.HB='up';P.hd=-1}else if(Math.abs(c.vy)<70){P.H=[0,-13];P.FF=[5,-6];P.FB=[-2,-3];P.lean=.18;P.HB='out'}else{P.H=[0,-13];P.FF=[4,-4];P.FB=[-3,-1];P.lean=.12}}
 else if(st==='fall'){if(Math.abs(c.vy)<70){P.H=[0,-13];P.FF=[5,-5];P.FB=[-2,-3];P.lean=.15;P.HB='out'}else{P.H=[0,-13];P.FF=[3,-1];P.FB=[-4,0];P.lean=0;P.HB='up';P.hd=-1}}
 else if(st==='land'){const k=1-clamp(t/.12,0,1);P.H=[0,-12+Math.round(k*3)];P.FF=[4,0];P.FB=[-4,0];P.lean=.1+k*.25;P.hd=Math.round(k)}
 else if(st==='landH'||st==='pilonL'){const k=clamp(t/(st==='pilonL'?.4:.34),0,1);const d=k<.7?1:1-(k-.7)/.3;P.H=[0,-12+Math.round(d*5.5)];P.FF=[6,0];P.FB=[-6,0];P.lean=.15+d*.45;P.HB='sol';P.hd=Math.round(d);
  if(st==='pilonL'){P.a=lerp(1.35,A_REST,clamp((k-.6)/.4,0,1));P.gOff=[lerp(6,3,clamp((k-.6)/.4,0,1)),lerp(5,4,k)];P.two=k<.6}}
 else if(st==='crouch'){P.H=[0,-8];P.FF=[5,0];P.FB=[-5,0];P.lean=.38;P.hd=1}
 else if(st==='roll'){P.H=[-2,-4];P.FF=[2,-6];P.FB=[-1,-4];P.lean=1.5;P.hd=1;P.a=-.35;P.gOff=[3,3];P.rot=Math.floor(clamp(t/c.rollD,0,.999)*4)}
 else if(st==='atk'){const k=t,aw=c.ak==='air';
  P.two=true;const w=ATK.w,s=ATK.s,h=ATK.h,r=ATK.r;const A0=aw?-2.4:-2.85,A1=aw?.95:.45;
  const g0=[3,4],g1=aw?[0,-4]:[-2,-6],g2=aw?[6,3]:[7,4];
  if(k<w){/* anticipation : il arme en se cambrant */const e=easeO(k/w);P.a=lerp(A_REST,A0,e);P.gOff=[lerp(g0[0],g1[0],e),lerp(g0[1],g1[1],e)];P.lean=lerp(.06,-.22,e);if(!aw){P.H=[0,-12-Math.round(e)];P.FB=[-5,0];P.FF=[4,0]}P.hd=-1}
  else if(k<w+s){/* frappe */const e=Math.pow((k-w)/s,1.3);P.a=lerp(A0,A1+.12,e);P.gOff=[lerp(g1[0],g2[0],e),lerp(g1[1],g2[1],e)];P.lean=lerp(-.22,aw?.3:.6,e);if(!aw){P.H=[0,-12+Math.round(e*3)];P.FF=[lerp(4,8,e),0];P.FB=[lerp(-5,-7,e),0]}}
  else if(k<w+s+h){/* impact : la tête du marteau rebondit légèrement */const e=(k-w-s)/h;P.a=A1+.12*(1-easeO(e))-.05*Math.sin(e*Math.PI);P.gOff=g2;P.lean=aw?.3:.6;if(!aw){P.H=[0,-9];P.FF=[8,0];P.FB=[-7,0]}P.hd=1}
  else{/* suivi : il relève le marteau sur l'épaule */const e=back_(clamp((k-w-s-h)/r,0,1));P.a=lerp(A1,A_REST,e);P.gOff=[lerp(g2[0],g0[0],e),lerp(g2[1],g0[1],e)];P.lean=lerp(aw?.3:.6,.06,e);P.two=e<.6;if(!aw){P.H=[0,-9-Math.round(e*3)];P.FF=[lerp(8,3,e),0];P.FB=[lerp(-7,-3,e),0]}}
  if(aw){P.H=[0,-13];P.FF=[4,-3];P.FB=[-3,-1]}}
 else if(st==='pilon'){P.two=true;P.H=[0,-13];P.FF=[3,-4];P.FB=[-2,-3];if(t<.1){P.a=lerp(A_REST,-1.75,easeO(t/.1));P.gOff=[1,-7];P.lean=-.15;P.hd=-1}else{P.a=1.38;P.gOff=[5,4];P.lean=.35;P.hd=1}}
 else if(st==='hurt'){P.H=[0,-11];P.lean=-.5;P.FF=[6,0];P.FB=[-2,0];P.a=.9;P.gOff=[6,0];P.HB='up';P.hd=-1;P.blink=1}
 else{/* repos : respiration, de temps en temps il recale le marteau sur l'épaule */P.FF=[3,0];P.FB=[-3,0];P.lean=.04;const sh=(T%6.2);if(sh<.35){const e=Math.sin(sh/.35*Math.PI);P.gOff=[3,4-e*2];P.a=A_REST-e*.15}}
 P.H=[P.H[0],P.H[1]-1.5];const H=P.H,ln=P.lean;const breath=(st==='idle'||st==='talk')&&br>.35?1:0;
 const S=[H[0]+Math.sin(ln)*8,H[1]-Math.cos(ln)*8+breath];P.S=S;
 P.G1=[S[0]+P.gOff[0],S[1]+P.gOff[1]];
 const Sb=[S[0]-3,S[1]+1];
 if(P.HB==='up')P.HB=[Sb[0]-5,Sb[1]+1];
 else if(P.HB==='out')P.HB=[Sb[0]-4,Sb[1]+5];
 else if(P.HB==='sol')P.HB=[H[0]+7,-1];
 else if(!P.HB){const sw=P.swing||0;P.HB=[Sb[0]+sw*4.5-.5,Sb[1]+9-Math.abs(sw)*1.5]}
 return P;
}
function rig(x,P){
 const H=P.H,S=P.S;const Sb=[S[0]-3,S[1]+1],Sf=[S[0]+2,S[1]+1];
 const c=Math.cos(P.a),s=Math.sin(P.a),G1=P.G1,G2=[G1[0]-c*4,G1[1]-s*4];
 arm(x,Sb,P.two?G2:P.HB,true);
 leg(x,[H[0]-1,H[1]],P.FB,true);
 leg(x,[H[0]+1,H[1]],P.FF,false);
 /* manteau à col montant : 3 tons, plis, le pan arrière flotte (ressort amorti) */
 const cb=P.cb,cl=P.cl;
 poly(x,[[S[0]-5.5,S[1]-1],[S[0]+3.5,S[1]-1.5],[S[0]+6.5,S[1]+2],[S[0]+6,S[1]+5],[H[0]+4.5,H[1]+1],[H[0]+5,H[1]+6-cl*.35],[H[0]-4.5-cb,H[1]+6-cl],[H[0]-5,H[1]],[S[0]-6,S[1]+3]],CP.coat);
 poly(x,[[S[0]-5.5,S[1]-1],[S[0]-3,S[1]],[H[0]-2,H[1]+1],[H[0]-2.5-cb*.8,H[1]+6-cl*.9],[H[0]-4.5-cb,H[1]+6-cl],[H[0]-5,H[1]],[S[0]-6,S[1]+3]],CP.coat3);
 L(x,S[0]+6,S[1]+2,H[0]+4.5,H[1]+1,CP.coat2,1);L(x,S[0]-4,S[1]-1,S[0]+3,S[1]-1.5,CP.coat2,1);R(x,S[0]+4,S[1],1,1,CP.coat4);
 L(x,H[0]+1,H[1]+1,H[0]+2-cb*.2,H[1]+5-cl*.5,CP.coat3,1);L(x,H[0]-1,H[1]-3,H[0]-1-cb*.4,H[1]+5-cl*.8,'#1f182c',1);
 L(x,H[0]-4.5-cb,H[1]+6-cl,H[0]+5,H[1]+6-cl*.35,'#0f0b16',1);
 R(x,S[0]-2,S[1]-4,6,4,CP.coat);R(x,S[0]+2,S[1]-4,2,4,CP.coat2);R(x,S[0]+3,S[1]-1,1,1,CP.gold);R(x,S[0]-2,S[1]-4,1,4,CP.coat3);
 /* mèches à l'arrière de la tête (mouvement secondaire) */
 const nx=Math.round(S[0]+.5+P.lean*1.5),ny=Math.round(S[1]-2+(P.hd||0)*.5);
 const hs=P.hs||0;for(const[k,ox,oy,len]of[[0,-6,-8,4],[1,-5,-5,3],[2,-4,-10,3]]){const ang=Math.PI+.35-hs*.35+k*.25;L(x,nx+ox,ny+oy,nx+ox+Math.cos(ang)*len,ny+oy+Math.sin(ang)*len-hs*.4,k===1?'#7aa6b8':'#bcdde7',1)}
 x.drawImage(headSpr(P.blink),nx-7,ny-12);
 hammer(x,G1,P.a);
 arm(x,Sf,G1,false);
}
/* PNJ civils en vue de côté — même « kit » que sur la carte (sprites.js) : coiffure, tenue,
   accessoire, teint ; dans la rue : parapluie ou téléphone. Repos : respiration, regard qui se lève ;
   certains marchent ; sursaut (« ! ») quand le marteau passe à côté. */
const SK=window.CROC_SPRITES||{NPC_KIT:[['court','manteau',null,1]]};
const NSKIN=['#e8cbb4','#d9b9a3','#b98c6c','#8c5e44'];
const tn=(h,k)=>{const n=parseInt(h.slice(1),16),c=[n>>16,n>>8&255,n&255].map(v=>Math.round(k>0?v+(255-v)*k:v*(1+k)));return'#'+c.map(v=>clamp(v,0,255).toString(16).padStart(2,'0')).join('')};
const UMB=['#23202e','#6a2234','#2b4a66','#3d3352','#5a5a6a'];
function drawNPC(x,n,T){
 const P=NPC_PALS[n.pi%NPC_PALS.length],kit=SK.NPC_KIT[n.pi%SK.NPC_KIT.length];const hair=kit[0],top=kit[1],sk=kit[3];
 const acc=n.v==='pluie'?'parapluie':n.v==='tel'?'tel':kit[2];
 const skin=NSKIN[sk],skin2=tn(skin,-.2),H=P[1],H1=tn(H,.28),H2=tn(H,-.35),cl=P[2],cl1=tn(cl,.22),cl2=P[3],pt=P[4],ink='#0d0b12';
 const jy=-Math.round(n.jy||0),up=n.startle>0,walk=n.mv?n.wp:-1,sw=walk>=0?Math.sin(walk*Math.PI*2):0;
 const b=walk<0&&Math.sin(T*1.6+n.seed*6.28)>.45?1:0,look=walk<0&&((T+n.seed*9)%5.5)<.7?1:0;
 const hip=-9+jy-(walk>=0&&Math.abs(sw)<.35?1:0),y0=-19+b+jy+(walk>=0&&Math.abs(sw)<.35?-1:0);
 /* jambes */
 const fB=[sw*3,-Math.max(0,-sw)*2],fF=[-sw*3,-Math.max(0,sw)*2];if(walk<0){fB[0]=-1.5;fF[0]=1.5}
 L(x,-1,hip,fB[0]-.5,fB[1]-2+jy,tn(pt,-.35),2);R(x,fB[0]-1.5,fB[1]-2+jy,4,2,'#0b0a10');
 L(x,0,hip,fF[0],fF[1]-2+jy,pt,2);L(x,1,hip,fF[0]+1,fF[1]-2+jy,tn(pt,.22),1);R(x,fF[0]-1,fF[1]-2+jy,4,2,'#1a1622');R(x,fF[0]+2,fF[1]-2+jy,1,1,'#3a3446');
 /* buste selon la tenue */
 const bh=hip-y0;
 if(top==='robe'){R(x,-3,y0,7,bh,cl);poly(x,[[-4,hip],[4,hip],[6,hip+6],[-6,hip+6]],cl);R(x,-3,y0,2,bh,cl2);L(x,4,hip,6,hip+5,cl1,1);R(x,-6,hip+5,12,1,cl2)}
 else{R(x,-4,y0,8,bh+(top==='manteau'?6:1),cl);R(x,-4,y0,2,bh+(top==='manteau'?6:1),cl2);R(x,3,y0+1,1,bh+(top==='manteau'?4:-1),cl1);
  if(top==='manteau'){R(x,-4,hip+5,8,1,cl2);R(x,1,y0+3,1,1,'#c9b98a');R(x,1,y0+7,1,1,'#c9b98a');L(x,-2,hip-1,-3,hip+4,cl2,1)}
  if(top==='sweat'){R(x,-6,y0-1,3,4,cl2);R(x,-5,y0-1,1,1,cl1);R(x,0,hip-4,4,1,cl2);R(x,2,y0+1,1,3,tn(cl,.55))}
  if(top==='veste'){R(x,2,y0+1,2,bh-1,tn(cl,.5));R(x,1,y0+1,1,bh-1,cl2);R(x,2,y0+1,2,1,tn(cl,.7))}}
 /* tête : profil, nez, œil, oreille ; le regard se lève parfois */
 R(x,-1,y0-1,3,1,skin2);
 R(x,-3,y0-7,6,6,skin);R(x,3,y0-5,1,2,skin);R(x,-3,y0-2,6,1,skin2);R(x,-1,y0-5,1,2,skin2);R(x,1,y0-5-look,1,1,ink);R(x,2,y0-2,1,1,tn(skin,-.32));
 const hr=(a,c,w,h,col)=>R(x,a,y0+c,w,h,col);const sway=Math.round(Math.sin(T*2+n.seed*5)*.8+sw);
 switch(hair){
  case'court':hr(-3,-8,6,2,H);hr(-4,-7,2,4,H2);hr(-2,-8,3,1,H1);hr(2,-7,2,1,H);break;
  case'long':hr(-3,-8,6,2,H);hr(-4,-7,2,9,H);hr(-5,-5,1,6,H2);hr(-2,-8,3,1,H1);hr(2,-7,2,1,H);break;
  case'chignon':hr(-3,-8,6,2,H);hr(-4,-7,2,3,H2);hr(-7,-9,3,3,H);hr(-6,-9,1,1,H1);break;
  case'casquette':hr(-3,-9,6,3,tn(cl2,-.25));hr(3,-7,3,1,tn(cl2,-.45));hr(-2,-9,2,1,tn(cl,.15));hr(-4,-6,1,3,H);break;
  case'capuche':hr(-4,-9,7,3,cl);hr(-5,-7,3,7,cl2);hr(-2,-9,3,1,cl1);hr(2,-7,1,1,H2);break;
  case'boucle':hr(-4,-9,7,3,H);hr(-5,-7,2,5,H);[-4,-2,0,2].forEach(i=>hr(i,-10,1,1,H1));hr(-5,-2,1,1,H2);break;
  case'queue':hr(-3,-8,6,2,H);hr(-4,-7,2,3,H2);hr(-2,-8,3,1,H1);L(x,-4,y0-6,-7+sway,y0-1,H,2);L(x,-7+sway,y0-1,-7+sway,y0+1,H2,1);break;
  case'rase':hr(-3,-8,6,1,H2);hr(-3,-7,1,2,H2);break;
 }
 if(acc==='lunettes'){hr(0,-5,4,1,'#1a1626');hr(2,-5,1,1,'#8fe3f0')}
 if(acc==='echarpe'){hr(-3,0,7,2,'#b0102a');hr(-3,0,7,1,'#e0263d');L(x,-3,y0+1,-6-sway,y0+5,'#8a0c22',2)}
 if(acc==='sac'){L(x,-3,y0,3,hip-3,tn(cl2,-.3),1);R(x,-6,hip-4,4,5,'#3a2a20');R(x,-6,hip-4,4,1,'#5a4030')}
 /* bras avant */
 if(up){L(x,0,y0+1,3,y0-8,cl1,2);R(x,3,y0-10,2,2,skin);L(x,-3,y0+1,-6,y0-7,cl2,2);R(x,-7,y0-9,2,2,skin2)}
 else if(acc==='tel'){L(x,0,y0+1,1,y0+5,cl1,2);L(x,1,y0+5,3,y0-1,cl1,2);R(x,3,y0-4,2,3,'#1a1626');R(x,4,y0-4,1,2,'#9ff8ff');R(x,2,y0-5,2,3,hex2('#9ff8ff',.25))}
 else if(acc==='parapluie'){L(x,0,y0+1,2,y0+6,cl1,2);R(x,2,y0+5,2,2,skin)}
 else{const ax=Math.round(sw*2);L(x,0,y0+1,ax+1,hip-1,cl1,2);R(x,ax,hip-1,2,2,skin)}
 /* parapluie (retourné quand il sursaute) */
 if(acc==='parapluie'){const u=UMB[Math.floor(n.seed*UMB.length)],ux=up?0:3,top=y0-14+(up?-4:0)+Math.round(Math.sin(T*1.3+n.seed*4)*.6);if(!up)L(x,ux,y0+6,ux,top,'#0e0c12',1);
  const rows=[[-3,4],[-6,7],[-8,9],[-9,10]];rows.forEach(([a,c],i)=>{const yy=up?top+3-i:top+i;R(x,ux+a,yy,c-a,1,i===rows.length-1?'#0e0c12':u)});
  if(!up){R(x,ux-7,top+1,3,1,hex2('#ffffff',.18));for(const k of[-9,-4,4,9])R(x,ux+k,top+4,1,1,'#0e0c12');R(x,ux,top-1,1,1,'#0e0c12')}}
}
/* Eilyn de profil (BALADE) : il lit, tourne une page de temps en temps, une mèche glisse */
const EILP=[];
function eilProf(f){return EILP[f]||(EILP[f]=SK.rows(SK.eilyn.profile[f],SK.pal.eilyn))}
function eilFrame(t){const c=t%7;if(c>5.3&&c<5.55)return 3;if(c>=5.55&&c<5.8)return 4;if(c>2.6&&c<3.4)return 2;return(t%2.4)<1.2?0:1}
/* monstres du Dédale : silhouettes d'ombre, yeux rouges, fumée qui s'échappe des épines.
   Télégraphie : le rôdeur se ramasse en arrière, griffe levée, gueule ouverte ; le chargeur
   se tasse, gratte le sol et hérisse son échine avant de foncer. */
const MON={ink:'#0c0912',mid:'#1b1427',lo:'#2a1f3c',bone:'#4a3a62',eye:'#ff2b45',core:'#ffd0d6',claw:'#b9b2c8',tooth:'#d8d0c0',maw:'#3a0a14'};
function wisps(x,pts,T,k=1){for(const[i,[px,py]]of pts.entries()){const t=(T*1.6+i*.37)%1;const yy=py-t*7*k,xx=px+Math.sin(T*3+i)*1.2-t*2;x.globalAlpha=(1-t)*.8;x.fillStyle=i%2?MON.mid:MON.lo;x.fillRect(Math.round(xx),Math.round(yy),1,Math.max(1,Math.round(2*k*(1-t))));x.globalAlpha=1}}
function drawRodeur(x,m,T,k=1){
 const Q=(a,b)=>[a*k,b*k],ph=m.ph||0,sw=Math.sin(ph*Math.PI*2);
 let claw=[9+sw*2,-3],claw2=[5-sw*2,-3],jaw=0,eyeB=0,coil=0,bob=Math.round(Math.abs(sw)*.8);
 if(m.st==='windup'){const e=easeO(clamp(m.t0?1-m.t/m.t0:0,0,1));coil=e;claw=[lerp(9,-1,e),lerp(-3,-32,e)];jaw=2;eyeB=1}
 else if(m.st==='strike'){claw=[22,-8];claw2=[13,-5];jaw=2;eyeB=1}
 else if(m.st==='alert'){jaw=2;eyeB=1}else if(m.st==='chase'){jaw=1}
 else if(m.st==='stun'){claw=[6,-1];claw2=[-2,-1];bob=1}
 const bx=-coil*3,by=bob;const B=(a,b)=>Q(a+bx,b+by);
 /* jambes digitigrades */
 const legs=[[-3,-10,-4+sw*3],[2,-10,1-sw*3]];
 for(const[i,[hx,hy,fx]]of legs.entries()){const lift=i?Math.max(0,sw)*2:Math.max(0,-sw)*2;const kn=Q(hx+3+bx*.5,-5);L(x,...B(hx,hy),...kn,i?MON.mid:MON.ink,Math.max(2,Math.round(2*k)));L(x,...kn,...Q(fx,-lift),MON.ink,Math.max(1,Math.round(1.5*k)));R(x,...Q(fx-1,-lift-1),Math.round(3*k),1,MON.ink);R(x,...Q(fx+2,-lift-1),1,1,MON.claw)}
 /* bras arrière */
 L(x,...B(2,-17),...Q(claw2[0]-2,claw2[1]-6),MON.mid,Math.round(2*k));L(x,...Q(claw2[0]-2,claw2[1]-6),...Q(claw2[0],claw2[1]),MON.mid,Math.round(2*k));
 /* corps voûté, côtes, épines */
 poly(x,[B(-7,-10),B(-6,-17),B(-1,-22),B(4,-23),B(8,-20),B(8,-14),B(3,-9)],MON.ink);
 poly(x,[B(-3,-12),B(-2,-18),B(3,-20),B(5,-15),B(2,-11)],MON.mid);
 for(const r of[-15,-13,-11]){const a=B(-1,r),c=B(3,r-1);L(x,a[0],a[1],c[0],c[1],MON.lo,1)}
 const sp=[[[-6,-17],[-10,-23],[-3,-19]],[[-2,-21],[-5,-28],[0,-22]],[[2,-23],[1,-29],[5,-22]]];
 for(const[a,b,c]of sp)poly(x,[B(...a),B(...b),B(...c)],MON.ink);
 for(const[,b]of sp){const p=B(...b);R(x,p[0],p[1]+1,1,1,MON.bone)}
 wisps(x,sp.map(([,b])=>B(...b)),T+m.ph,k);
 /* tête, gueule, dents */
 poly(x,[B(5,-22),B(12,-21-coil*2),B(14,-17-coil*2),B(10,-15),B(5,-17)],MON.ink);
 if(jaw){const j=B(10,-15),j2=B(15,-12+jaw*.5-coil);poly(x,[j,B(14,-16-coil*2),j2],MON.maw);L(x,j[0],j[1],j2[0],j2[1],MON.ink,Math.round(2*k));for(const tx of[11,13])R(x,...B(tx,-15-(coil?1:0)),1,1,MON.tooth);R(x,...B(12,-13),1,1,MON.tooth)}
 else{R(x,...B(11,-16),1,1,MON.tooth);R(x,...B(13,-16),1,1,MON.tooth)}
 const e1=B(10,-19-coil*2),e2=B(12,-19-coil*2);R(x,e1[0],e1[1],1,1,MON.eye);R(x,e2[0],e2[1],eyeB?2:1,1,MON.eye);if(eyeB){R(x,e1[0]-1,e1[1],1,1,MON.eye);R(x,e2[0],e2[1],1,1,MON.core)}
 /* bras avant, griffes ; traînée rouge pendant le coup */
 const sh=B(4,-18),el=Q((4+claw[0])/2+2+bx,(-18+claw[1])/2+3);L(x,...sh,...el,MON.ink,Math.round(2*k));L(x,...el,...Q(...claw),MON.ink,Math.round(2*k));
 const cl=Q(...claw);for(const d of[-2,0,2])L(x,cl[0],cl[1],cl[0]+3*k,cl[1]+d*k+2,MON.claw,1);
 if(m.st==='strike'){x.globalAlpha=.85;for(let i=0;i<7;i++){const a=-1.2+i*.32,r=17*k;R(x,Math.round(4*k+Math.cos(a)*r),Math.round(-16*k+Math.sin(a)*r),2,1,i%2?'#ff2b45':'#ff8a9a')}x.globalAlpha=1}
}
function drawChargeur(x,m,T){
 const ph=m.ph||0,ch=m.st==='charge',tell=m.st==='tell';const gal=ch?Math.sin(ph*Math.PI*2):Math.sin(ph*Math.PI*2)*.6;
 const bob=ch?Math.round(Math.abs(gal)*2):0,crouch=tell?3:0,str=ch?2:0,Y=v=>v+crouch-bob;
 if(ch){x.globalAlpha=.5;for(const ly of[-13,-9,-6])R(x,-26-Math.round((T*60)%6),Y(ly),8,1,MON.lo);x.globalAlpha=1}
 for(const[i,hx]of[-9,-6,6,9].entries()){let s=Math.sin(ph*Math.PI*2+(i<2?0:Math.PI)+(i%2)*.8);if(tell&&i===3)s=Math.sin(T*28);const fx=hx+(i<2?-str:str)+s*(ch?5:2.5),lift=Math.max(0,-s)*(ch?4:2);L(x,hx,Y(-7),hx+(i<2?-2:2)+s,-4+crouch,i%2?MON.mid:MON.ink,2);L(x,hx+(i<2?-2:2)+s,-4+crouch,fx,-lift,MON.ink,2);R(x,fx+1,-lift-1,1,1,MON.claw)}
 poly(x,[[-13-str,Y(-9)],[-9,Y(-15)],[0,Y(-17)],[7,Y(-16)],[11+str,Y(-12)],[9+str,Y(-6)],[-9-str,Y(-6)]],MON.ink);
 poly(x,[[-7,Y(-9)],[-4,Y(-13)],[3,Y(-14)],[6,Y(-10)]],MON.mid);
 for(const rx of[-4,-1,2])L(x,rx,Y(-12),rx+1,Y(-8),MON.lo,1);
 const mane=[];for(const sx of[-8,-4,0,4]){const h=tell?7:ch?3:5;poly(x,[[sx-2,Y(-15)],[sx-(ch?2:0),Y(-15-h)],[sx+2,Y(-16)]],MON.ink);mane.push([sx-(ch?2:0),Y(-15-h)])}
 wisps(x,mane,T+m.ph,1);
 L(x,-13-str,Y(-10),-18-str,Y(-15)+Math.round(Math.sin(T*9)),MON.ink,2);L(x,-18-str,Y(-15),-21-str,Y(-14),MON.ink,1);
 const jo=ch||tell?3:1;poly(x,[[9+str,Y(-15)],[17+str,Y(-13)],[18+str,Y(-10)],[12+str,Y(-8)],[9+str,Y(-9)]],MON.ink);
 if(jo>1)poly(x,[[12+str,Y(-9)],[18+str,Y(-10)],[18+str,Y(-8+jo)],[12+str,Y(-8)]],MON.maw);
 L(x,11+str,Y(-8),18+str,Y(-8+jo),MON.ink,2);for(const tx of[13,15,17])R(x,tx+str,Y(-9)+(jo>1?1:0),1,1,MON.tooth);
 R(x,14+str,Y(-13),1,1,MON.eye);R(x,16+str,Y(-13),1,1,MON.eye);if(tell||ch){R(x,13+str,Y(-13),1,1,MON.eye);R(x,16+str,Y(-13),1,1,MON.core)}
}
/* pipeline de sprites : dessin dans un petit canevas → liseré coloré, flash, dissolution tramée, miroir */
const EW=97,EHh=80,EO=[48,68];
const[EC,ex]=mk(EW,EHh),[TC,tcx]=mk(EW,EHh);
const DIS=[];for(let l=0;l<=8;l++){const p=PX(EW,EHh);for(let y=0;y<EHh;y++)for(let i=0;i<EW;i++)if(bay(i,y)<l/8)p.d[y*EW+i]=0xff000000;DIS.push(p.toCanvas())}
function tintTC(col,src=EC){tcx.globalCompositeOperation='source-over';tcx.clearRect(0,0,EW,EHh);tcx.drawImage(src,0,0);tcx.globalCompositeOperation='source-in';tcx.fillStyle=col;tcx.fillRect(0,0,EW,EHh);tcx.globalCompositeOperation='source-over'}
function stampPut(dst,img,X0,Y0,face,dx,dy,a,rot){if(a<=0)return;dst.globalAlpha=a;
 if(rot){dst.save();dst.translate(X0+dx,Y0+dy-12);dst.rotate(rot*Math.PI/2*(face<0?-1:1));if(face<0)dst.scale(-1,1);dst.drawImage(img,-EO[0],-EO[1]+12);dst.restore()}
 else if(face>=0)dst.drawImage(img,X0-EO[0]+dx,Y0-EO[1]+dy);else{dst.save();dst.translate(X0+EO[0]+1+dx,Y0-EO[1]+dy);dst.scale(-1,1);dst.drawImage(img,0,0);dst.restore()}dst.globalAlpha=1}
function stamp(dst,fn,X0,Y0,face,o={}){
 ex.clearRect(0,0,EW,EHh);ex.save();ex.translate(EO[0],EO[1]);fn(ex);ex.restore();
 if(o.dis>0){ex.globalCompositeOperation='destination-out';ex.drawImage(DIS[clamp(Math.round(o.dis*8),0,8)],0,0);ex.globalCompositeOperation='source-over'}
 X0=Math.round(X0);Y0=Math.round(Y0);
 if(o.rim){tintTC(o.rim);stampPut(dst,TC,X0,Y0,face,o.rd||0,0,o.ra??.85,o.rot);stampPut(dst,TC,X0,Y0,face,0,-1,(o.ra??.85)*.55,o.rot)}
 stampPut(dst,EC,X0,Y0,face,0,0,o.a??1,o.rot);
 if(o.flash){tintTC(o.flash);stampPut(dst,TC,X0,Y0,face,0,0,o.fa??1,o.rot)}
 if(o.keep)o.keep(EC);
}

/* =====================================================================
   4. LES ZONES
   Chaque zone est construite par code sur une grille de tuiles 8×8 :
   0 vide · 1 plein · 2 demi-tuile basse (marches) · 3 plateforme traversable.
   Le décor fixe est peint une seule fois dans un grand canevas ; le ciel,
   la ville et les arches défilent en parallaxe sur plusieurs plans.
   ===================================================================== */
/* motifs tramés 8×8 (remplissages rapides) */
const DPAT={};
function dpat(x,col,lv){lv=clamp(Math.round(lv*16),0,16);const k=col+lv;let p=DPAT[k];if(!p){const[c,g]=mk(8,8);g.fillStyle=col;for(let j=0;j<8;j++)for(let i=0;i<8;i++)if(bay(i,j)<lv/16)g.fillRect(i,j,1,1);p=DPAT[k]=c}return x.createPattern(p,'repeat')}
function dfill(x,X,Y,w,h,col,lv){if(lv<=0)return;x.fillStyle=dpat(x,col,lv);x.fillRect(Math.round(X),Math.round(Y),Math.round(w),Math.round(h))}

function Grid(w,h){
 const t=new Uint8Array(w*h),s=new Uint8Array(w*h);
 const g={w,h,t,s,ents:[],lights:[],neons:[],deco:[],over:[],exits:[],spawns:{},puddles:[],waters:[],vents:[],drips:[],shafts:[],doors:[],tubes:[],
  set(x,y,v,st='#'){if(x<0||y<0||x>=w||y>=h)return;t[y*w+x]=v;s[y*w+x]=st.charCodeAt(0)},
  fill(x0,y0,x1,y1,v=1,st='#'){for(let y=Math.min(y0,y1);y<=Math.max(y0,y1);y++)for(let x=Math.min(x0,x1);x<=Math.max(x0,x1);x++)g.set(x,y,v,st)},
  /* escalier : n colonnes qui descendent de 4 px chacune (dir=1 vers la droite), plein en dessous */
  stairs(x0,y0,n,dir,st='s'){for(let i=1;i<=n;i++){const x=x0+i*dir,fy=y0*8+4*i,r=Math.floor(fy/8);g.set(x,r,fy%8?2:1,st);g.fill(x,r+1,x,h-1,1,'r')}},
  npc(tx,ty,v='',o={}){g.ents.push(Object.assign({k:'npc',x:tx*8+4,y:ty*8,v},o))},
  mon(kind,tx,ty,range=32){g.ents.push({k:kind,x:tx*8+4,y:ty*8,range})},
  crate(tx,ty,dy=0){g.ents.push({k:'crate',x:tx*8+4,y:ty*8-dy})},
  barrel(tx,ty){g.ents.push({k:'barrel',x:tx*8+4,y:ty*8})},
  eilyn(tx,ty){g.ents.push({k:'eilyn',x:tx*8+4,y:ty*8})},
  light(x,y,r,col,a=.5,fl=0){const L={x,y,r,col,a,fl,on:1};g.lights.push(L);return L},
  neon(o){const n=Object.assign({sc:1,col:NEON.pink,fl:1,brk:false,on:1},o);g.neons.push(n);return n},
  tube(tx,ty){g.tubes.push({x:tx*8+4,y:ty*8})},
  exit(x0,y0,x1,y1,o){g.exits.push(Object.assign({x0,y0,x1,y1},o))},
  spawn(k,x,y,face=1){g.spawns[k]={x,y,face}},
  door(o){g.doors.push(o);return o}
 };
 return g;
}
/* ---------- générateur de silhouettes de ville (fonds) ---------- */
function skyline(w,h,base,seed,o){
 const r=mulberry(seed);const[c,x]=mk(w,h);let X=-4;
 while(X<w){const bw=Math.round(o.wmin+r()*(o.wmax-o.wmin)),bh=Math.round(o.hmin+r()*(o.hmax-o.hmin)),top=base-bh;
  R(x,X,top,bw,h-top,o.col);if(o.edge)R(x,X+bw-1,top,1,h-top,o.edge);
  if(r()<.35&&bw>8){const rw=Math.round(bw*.5);R(x,X+((bw-rw)/2|0),top-3,rw,3,o.col)}
  if(r()<.4){const ax=X+2+Math.floor(r()*(bw-4));R(x,ax,top-8-Math.floor(r()*8),1,10,o.col);if(o.blink)o.blink.push([ax,top-15])}
  if(o.tank&&r()<.18&&bw>10){const tx=X+3;R(x,tx,top-10,7,6,o.col);R(x,tx+1,top-4,1,4,o.col);R(x,tx+5,top-4,1,4,o.col);R(x,tx-1,top-11,9,1,o.col)}
  for(let wy=top+3;wy<h-2;wy+=o.wy)for(let wx=X+2;wx<X+bw-2;wx+=o.wx){const q=r();if(q<o.lit){x.fillStyle=q<o.lit*.15?NEON.cyan2:q<o.lit*.3?NEON.pink2:o.win;x.fillRect(wx,wy,o.ww,1)}}
  if(o.neon&&r()<o.neon&&bw>6){const nx=X+2+Math.floor(r()*(bw-5)),ny=top+6+Math.floor(r()*Math.max(1,bh*.4)),nh=10+Math.floor(r()*18),nc=pick([NEON.pink,NEON.cyan,NEON.vio,NEON.amber]);
   R(x,nx-1,ny-1,4,nh+2,'#08060c');for(let k=0;k<nh;k+=3)R(x,nx,ny+k,2,2,nc);o.glows&&o.glows.push([nx+1,ny+nh/2,nh,nc])}
  X+=bw+Math.floor(r()*o.gap)}
 return c;
}
/* ciel nocturne (gradient tramé, étoiles, lune, nuages) */
function skyCanvas(W,H,o){const p=PX(W,H);p.vgrad(0,0,W,H,o.cols);const r=mulberry(o.seed||7);
 for(let i=0;i<W*H/260;i++){const sx=Math.floor(r()*W),sy=Math.floor(r()*H*.55);p.set(sx,sy,r()<.2?c32('#8fe3f0'):c32('#9d97b6'))}
 if(o.moon){const[mx,my,mr]=o.moon;const A=c32('#f3d6e6'),B=c32('#d79ac0'),C=c32('#a8608f'),G=c32(o.cols[o.cols.length-2]);
  for(let y=-mr-14;y<=mr+14;y++)for(let i=-mr-14;i<=mr+14;i++){const d=Math.hypot(i,y);const px=mx+i,py=my+y;
   if(d<=mr){const sh=(i*.7+y*.5)/mr;let c=sh>.45?(bay(px,py)<.5?B:C):sh>.15&&bay(px,py)<(sh-.15)*3?B:A;if(Math.hypot(i+mr*.3,y-mr*.25)<mr*.17||Math.hypot(i-mr*.35,y+mr*.3)<mr*.12)c=B;p.set(px,py,c)}
   else if(d<mr+14&&bay(px,py)<(1-(d-mr)/14)*.45)p.set(px,py,G)}}
 const c=p.toCanvas(),x=c.getContext('2d');
 if(o.clouds)for(let k=0;k<o.clouds;k++){const cy=Math.floor(H*(.42+r()*.16)),cw=60+r()*140,cx=r()*W;dfill(x,cx,cy,cw,2+r()*3,'#2a1640',.5);dfill(x,cx+cw*.2,cy-2,cw*.5,2,'#2a1640',.3)}
 return c}

/* ---------- ZONES ---------- */
const ZONES=[
{id:'toits',nom:'TOITS',w:150,h:27,th:'toits',pluie:1,ext:1,song:'balade',
 build(g){
  const roof=(a,b,top)=>g.fill(a,top,b,26,1,'b');
  roof(0,34,18);roof(40,66,16);roof(71,95,20);roof(96,118,14);roof(124,141,17);
  g.fill(1,12,7,17,1,'h');                       /* cabanon de l'escalier (départ) */
  g.over.push(x=>{R_(x,3*8+2,14*8,10,16,'#0d0a12');R_(x,3*8+3,14*8+1,8,15,'#2a1d28');R_(x,3*8+9,14*8+8,1,2,'#c9c0aa');R_(x,2*8,13*8+2,20,1,'#4a3f63');
   for(let i=0;i<5;i++)R_(x,8*8+i*3,10*8+4-i*6,1,i*6+28,'#2c2838');R_(x,8*8,10*8,13,1,'#3a3346');R_(x,8*8+12,9*8,1,2,'#ff2b45')});
  g.fill(18,16,20,17,1,'m');g.fill(46,14,48,15,1,'m');g.fill(91,18,94,19,1,'m');g.fill(104,12,106,13,1,'m');g.fill(130,15,131,16,1,'m');
  g.spawn('A',11*8,18*8,1);
  g.npc(14,18,'pluie',{pi:2});g.crate(24,18);g.barrel(27,18);g.crate(29,18);
  g.mon('m',56,16,64);g.crate(61,16);g.crate(61,16,12);
  g.mon('k',85,20,40);g.barrel(78,20);
  g.npc(110,14,'tel',{pi:5});g.npc(100,14,'',{pi:7,walk:1});g.crate(114,14);
  g.mon('m',135,17,30);g.barrel(138,17);
  g.neon({x:28*8,y:13*8-4,kind:'coeur',col:NEON.pink,brk:true,poles:1});
  g.neon({x:44*8,y:18*8+6,kind:'txt',txt:'BAR',sc:2,col:NEON.cyan});
  g.neon({x:78*8,y:9*8,kind:'txt',txt:'OUVERT 24H',sc:1,col:NEON.amber,board:1,poles:1,brk:true,fl:2});
  g.neon({x:97*8+2,y:15*8+4,kind:'txt',txt:'HOTEL',sc:2,col:NEON.pink,vert:1});
  g.neon({x:128*8,y:20*8,kind:'fleche',col:NEON.cyan,fl:2});
  g.light(4*8,12*8+10,10,NEON.amber,.4,2);
  g.exit(142*8,27*8,150*8,40*8,{to:'ruelle',sp:'A',mode:'chute'});
 }},
{id:'ruelle',nom:'RUELLE',w:130,h:27,th:'ruelle',pluie:1,ext:1,
 build(g){
  g.fill(0,0,1,26,1,'w');g.fill(0,23,129,26,1,'a');g.fill(128,0,129,22,1,'w');
  g.fill(12,18,20,18,3,'f');g.fill(16,13,24,13,3,'f');g.fill(58,18,66,18,3,'f');g.fill(62,13,68,13,3,'f');
  g.fill(30,21,33,22,1,'d');g.fill(84,21,86,22,1,'d');
  g.spawn('A',6*8,-24,1);
  g.crate(22,13);g.npc(38,23,'pluie',{pi:6});g.mon('m',50,23,44);
  g.barrel(70,23);g.barrel(71,23);g.npc(76,23,'tel',{pi:1});g.npc(60,23,'',{pi:9,walk:1});g.npc(106,23,'pluie',{pi:11,walk:1});g.crate(66,13);
  g.crate(90,23);g.crate(91,23);g.crate(90,23,12);g.mon('k',100,23,30);g.mon('m',112,23,24);
  g.neon({x:36*8,y:8*8,kind:'txt',txt:'BAR',sc:3,col:NEON.pink,board:1});
  g.neon({x:52*8+2,y:18*8+2,kind:'txt',txt:'OUVERT',sc:1,col:NEON.cyan,board:1,brk:true,fl:1});
  g.neon({x:67*8+4,y:5*8,kind:'croix',col:NEON.green});
  g.neon({x:80*8,y:16*8,kind:'tabac',col:NEON.red,brk:true,fl:1});
  g.neon({x:111*8,y:3*8,kind:'txt',txt:'HOTEL',sc:2,col:NEON.amber,vert:1,fl:2});
  g.neon({x:96*8,y:10*8,kind:'txt',txt:'KARAOKE',sc:1,col:NEON.vio,board:1});
  g.puddles.push([5,14],[40,47],[73,82],[101,109],[115,121]);
  g.vents.push([45*8,23*8],[95*8,23*8]);
  g.door({x:121*8,y:23*8,w:20,h:30,col:'#3a2a2a',exit:true});
  g.exit(121*8,17*8,124*8,23*8,{to:'couloir',sp:'A',mode:'porte',label:'ENTRER'});
 }},
{id:'couloir',nom:'COULOIR',w:96,h:27,th:'couloir',pluie:0,
 build(g){
  g.fill(0,0,95,9,1,'k');g.fill(0,21,95,26,1,'p');g.fill(0,10,1,20,1,'w');g.fill(94,10,95,20,1,'w');
  g.fill(40,19,42,20,1,'x');g.fill(63,18,64,20,1,'x');
  g.spawn('A',4*8+2,21*8,1);
  for(const tx of[12,30,48,66,82])g.tube(tx,10);
  g.npc(24,21,'',{pi:3});g.npc(60,21,'',{pi:8,walk:1});g.mon('m',55,21,30);g.crate(46,21);g.mon('g',76,21,18);g.barrel(70,21);
  [8,20,34,52,70].forEach((tx,i)=>g.door({x:tx*8,y:21*8,w:16,h:26,col:'#3a2420',num:String(201+i)}));
  g.door({x:88*8,y:21*8,w:26,h:40,col:'#b0102a',rouge:1});
  g.light(89*8+5,20*8+6,40,'#ff2b45',.55,3);
  g.exit(86*8,13*8,92*8,21*8,{to:'escalier',sp:'A',mode:'porte',label:'OUVRIR'});
 }},
{id:'escalier',nom:'ESCALIER',w:100,h:52,th:'escalier',pluie:0,
 build(g){
  g.fill(0,0,1,51,1,'w');g.fill(98,0,99,37,1,'w');
  g.fill(0,10,8,51,1,'s');g.stairs(8,10,32,1);g.fill(41,26,52,51,1,'s');
  g.fill(57,26,60,51,1,'s');g.stairs(60,26,32,1);g.fill(93,42,99,51,1,'s');
  g.spawn('A',4*8,10*8,1);
  g.npc(30,Math.floor((10*8+4*22)/8),'',{pi:4,yp:10*8+4*22});
  g.crate(44,26);g.mon('m',48,26,20);g.mon('m',76,34,22);
  g.door({x:3*8,y:10*8,w:22,h:34,col:'#b0102a',rouge:1,open:1});
  g.light(46*8,13*8,18,NEON.amber,.45,2);g.light(95*8,32*8,70,'#ff2b45',.6,3);g.light(20*8,4*8,30,'#8fe3f0',.18,0);g.light(70*8,20*8,30,'#8fe3f0',.16,0);
  g.exit(96*8,37*8,100*8,42*8,{to:'souterrains',sp:'A',mode:'bord'});
 }},
{id:'souterrains',nom:'SOUTERRAINS',w:170,h:30,th:'souterrains',pluie:0,
 build(g){
  g.fill(0,0,169,5,1,'q');g.fill(0,24,169,29,1,'q');g.fill(0,6,1,23,1,'q');g.fill(168,6,169,23,1,'q');
  g.fill(40,24,72,26,0);g.waters.push([40*8,73*8,25*8+3]);
  g.fill(45,21,49,21,3,'l');g.fill(55,20,59,20,3,'l');g.fill(65,21,68,21,3,'l');
  g.fill(92,6,112,13,1,'q');g.fill(140,2,167,5,0);g.fill(150,0,154,1,0);
  g.spawn('A',3*8,24*8,1);
  g.mon('m',26,24,30);g.crate(34,24);g.barrel(36,24);g.mon('k',84,24,40);g.mon('m',101,24,26);g.mon('g',118,24,16);g.mon('m',128,24,22);
  g.crate(132,24);g.crate(133,24);g.barrel(137,24);g.npc(143,24,'tel',{pi:10});
  g.eilyn(152,24);
  for(const tx of[20,60,100,128])g.light(tx*8,9*8,46,NEON.amber,.32,tx===60?2:1);
  g.light(152*8+4,8*8,70,'#cfe9ff',.24,3);g.shafts.push([150*8,155*8]);
  for(const[a,b]of[[44,23],[52,23],[61,23],[70,23],[86,21],[123,23]])g.light(a*8,b*8,10,NEON.vio,.35,3);
  for(const tx of[12,33,48,57,70,88,105,120,135,160])g.drips.push([tx*8+3,6*8]);
  g.exit(164*8,14*8,168*8,24*8,{to:'fin',mode:'bord'});
 }}
];
const ZI={};ZONES.forEach((z,i)=>{z.i=i;ZI[z.id]=z});

/* ---------- peinture des tuiles et décors, par thème ---------- */
const TH={};
TH.toits={
 layers(R){const W=384,H=VH;R.blink=[];R.skyGl=[];return[
  {c:skyCanvas(W,H,{cols:['#05030a','#0a0614','#110a20','#1a0f2e','#25113b','#36164a','#4e1d58','#6a2560'],moon:[292,40,19],clouds:7,seed:3}),f:0},
  {c:skyline(512,H,150,11,{col:'#140c22',wmin:10,wmax:30,hmin:30,hmax:96,gap:4,wx:3,wy:4,ww:1,lit:.12,win:'#4a2e3e',blink:R.blink}),f:.08,tile:1},
  {c:skyline(640,H,168,23,{col:'#1b1030',edge:'#26173d',wmin:16,wmax:44,hmin:40,hmax:120,gap:10,wx:4,wy:5,ww:2,lit:.16,win:'#6a4048',neon:.35,glows:R.skyGl,tank:1}),f:.22,tile:1},
  {c:skyline(768,H,190,37,{col:'#110a1c',edge:'#1d1230',wmin:24,wmax:60,hmin:50,hmax:110,gap:30,wx:6,wy:7,ww:2,lit:.07,win:'#3a2236',tank:1}),f:.42,tile:1}]},
 tile(x,R,tx,ty,v,st){const X=tx*8,Y=ty*8,r=R.rng;const up=!R.sol(tx,ty-1),lf=!R.sol(tx-1,ty),rt=!R.sol(tx+1,ty);
  if(st==='m'){R_(x,X,Y,8,8,'#2c2838');if(up){R_(x,X,Y,8,1,'#6b6577');R_(x,X,Y+1,8,1,'#45405a')}for(let i=2;i<8;i+=2)R_(x,X+1,Y+i,6,1,'#1e1b28');if(lf)R_(x,X,Y,1,8,'#14121c');if(rt)R_(x,X+7,Y,1,8,'#5f596d');return}
  if(st==='h'){R_(x,X,Y,8,8,'#231b33');dfill(x,X,Y,8,8,'#2b2240',.35);if(up){R_(x,X,Y,8,2,'#3d3352');R_(x,X,Y,8,1,'#5d5078')}if(lf)R_(x,X,Y,1,8,'#120e1b');if(rt)R_(x,X+7,Y,1,8,'#3a2f55');return}
  const top=R.top[tx]??ty,d=ty-top;
  R_(x,X,Y,8,8,'#181224');dfill(x,X,Y,8,8,'#1e172d',.4);
  if(up){R_(x,X,Y,8,3,'#3b3152');R_(x,X,Y,8,1,'#75669a');R_(x,X,Y+3,8,1,'#120e1b');if(r()<.4)R_(x,X+Math.floor(r()*6),Y+1,2,1,'#a596cf')}
  else if(d===1){R_(x,X,Y,8,2,'#120e1b')}
  else if(d>=2&&tx%4!==0&&(d-2)%3<2&&!lf&&!rt){const lit=R.winLit(tx,Math.floor((d-2)/3));R_(x,X+1,Y+((d-2)%3?0:2),6,(d-2)%3?5:6,lit?lit:'#0d0a15');if(lit)R_(x,X+1,Y+((d-2)%3?0:2),6,1,'#140f1d')}
  if(lf)R_(x,X,Y,1,8,'#0c0913');if(rt)R_(x,X+7,Y,1,8,'#2c2440')},
 over(x,R){/* assombrissement vers la rue, très bas */for(let k=0;k<6;k++)dfill(x,0,R.ph-48+k*8,R.pw,8,'#07050b',(k+1)/6)}
};
TH.ruelle={
 layers(R){const W=384,H=VH;R.blink=[];return[
  {c:skyCanvas(W,H,{cols:['#06040c','#0d0819','#170d29','#24123a','#3a1a4e','#5a2462'],clouds:4,seed:9}),f:0},
  {c:skyline(640,H,120,51,{col:'#1a0f2c',edge:'#25163a',wmin:14,wmax:40,hmin:40,hmax:110,gap:6,wx:4,wy:5,ww:2,lit:.2,win:'#6a4048',neon:.3,blink:R.blink}),f:.18,tile:1}]},
 back(x,R){const r=mulberry(77);let X=-8;const cols=['#241a31','#2a1f36','#201828','#2d2136'];
  while(X<R.pw){const bw=(14+Math.floor(r()*18))*8,gap=r()<.35?(3+Math.floor(r()*4))*8:0,top=(1+Math.floor(r()*4))*8,c=pick(cols);
   R_(x,X,top,bw,R.ph-top,c);dfill(x,X,top,bw,R.ph-top,'#1a1324',.3);
   for(let y=top+6;y<R.ph;y+=6)for(let i=X+((y/6)%2?0:4);i<X+bw;i+=8)R_(x,i,y,1,1,'#18111f');
   R_(x,X,top,bw,2,'#3a2e4a');R_(x,X,top+2,bw,1,'#120d18');
   for(let wy=top+10;wy<20*8;wy+=22)for(let wx=X+10;wx<X+bw-14;wx+=22){const q=r();R_(x,wx-1,wy-1,12,16,'#120d18');R_(x,wx,wy,10,14,q<.18?'#d9a04a':q<.28?'#3a8a9a':'#0c0912');if(q<.28){R_(x,wx,wy,10,1,'#f4d48a');dfill(x,wx,wy+8,10,6,'#000',.4)}R_(x,wx+4,wy,1,14,'#120d18');R_(x,wx-2,wy+15,14,2,'#3a2e4a')}
   if(r()<.6){const ax=X+20+Math.floor(r()*(bw-40));R_(x,ax,12*8,14,10,'#3a3346');R_(x,ax,12*8,14,1,'#6b6577');for(let i=2;i<10;i+=2)R_(x,ax+1,12*8+i,12,1,'#24202e');R_(x,ax+6,12*8+10,1,R.ph,'#1a1622')}
   const px=X+bw-6;R_(x,px,top,3,R.ph-top,'#2c2838');R_(x,px,top,1,R.ph-top,'#4a4458');
   X+=bw+gap}
  /* câbles tendus entre les immeubles */
  for(let k=0;k<9;k++){const a=r()*R.pw,b=a+60+r()*120,y0=10+r()*30;for(let i=0;i<=b-a;i++){const t=i/(b-a);R_(x,a+i,y0+Math.sin(t*Math.PI)*(8+r()*.2),1,1,'#0b0910')}}},
 tile(x,R,tx,ty,v,st){const X=tx*8,Y=ty*8,up=!R.sol(tx,ty-1),r=R.rng;
  if(st==='a'){R_(x,X,Y,8,8,'#120e19');dfill(x,X,Y,8,8,'#1a1424',.45);if(up){R_(x,X,Y,8,1,'#4a3f63');R_(x,X,Y+1,8,1,'#2a2238');R_(x,X,Y+2,8,1,'#1d1729');if(r()<.5)R_(x,X+Math.floor(r()*6),Y+3,2,1,'#2e2640')}if(ty>23)dfill(x,X,Y,8,8,'#07050b',(ty-23)/4);return}
  if(st==='w'){R_(x,X,Y,8,8,'#15101d');for(let i=0;i<8;i+=4)R_(x,X,Y+i,8,1,'#0d0a12');if(!R.sol(tx+1,ty))R_(x,X+7,Y,1,8,'#3a2e4a');return}
  if(st==='d'){R_(x,X,Y,8,8,'#25332f');R_(x,X,Y+7,8,1,'#141c1a');if(up){R_(x,X-1,Y,10,2,'#3e504c');R_(x,X-1,Y,10,1,'#5b706a')}if(!R.sol(tx-1,ty))R_(x,X,Y,1,8,'#141c1a');R_(x,X+3,Y+3,2,1,'#141c1a');return}
  if(st==='f'){R_(x,X,Y,8,2,'#4f465f');R_(x,X,Y,8,1,'#7a7090');for(let i=1;i<8;i+=3)R_(x,X+i,Y+2,1,1,'#2c2838');return}},
 over(x,R){for(let y=0;y<R.h;y++)for(let tx=0;tx<R.w;tx++){if(R.g.t[y*R.w+tx]!==3)continue;const X=tx*8,Y=y*8;R_(x,X,Y-8,8,1,'#5a5068');if(tx%2===0)R_(x,X,Y-8,1,8,'#3e374c');if(R.g.t[y*R.w+tx+1]!==3)R_(x,X+7,Y-8,1,8,'#3e374c')}
  for(const[a,b]of[[12,24],[58,68]]){for(let y=6*8;y<23*8;y+=4)R_(x,a*8+2,y,5,1,'#2a2436');R_(x,a*8+2,6*8,1,17*8,'#3e374c');R_(x,a*8+6,6*8,1,17*8,'#3e374c')}}
};
TH.couloir={
 layers(){return[{c:(()=>{const[c,x]=mk(384,VH);R_(x,0,0,384,VH,'#07050a');return c})(),f:0}]},
 back(x,R){R_(x,0,0,R.pw,R.ph,'#120a10');
  for(let X=0;X<R.pw;X+=6){R_(x,X,10*8,3,11*8,'#2a121c');R_(x,X+3,10*8,3,11*8,'#23101a')}
  dfill(x,0,10*8,R.pw,11*8,'#3a1a26',.12);
  for(let X=4;X<R.pw;X+=12)for(let Y=10*8+6;Y<16*8;Y+=12)R_(x,X,Y,1,1,'#4a2030');
  R_(x,0,16*8,R.pw,5*8,'#24160f');for(let X=0;X<R.pw;X+=16)R_(x,X,16*8,1,5*8,'#1a0f0b');R_(x,0,16*8,R.pw,1,'#4a3020');R_(x,0,16*8+1,R.pw,1,'#120a08');R_(x,0,21*8-2,R.pw,2,'#120a08');
  dfill(x,0,10*8,R.pw,10,'#000',.6);
  const r=mulberry(5);for(let k=0;k<7;k++){const hx=40+r()*(R.pw-120),hy=12*8+r()*30;for(let i=0;i<5;i++){R_(x,hx+i*2,hy+(i%2),1,3+(i%3),'#4a0a14')}R_(x,hx,hy+3,8,4,'#4a0a14');for(let d=0;d<6;d++)R_(x,hx+r()*8,hy+7+d*2,1,2+r()*3,'#3a0810')}
  for(let k=0;k<5;k++){const sx=r()*R.pw,sy=10*8+r()*50;for(let i=0;i<18;i++)R_(x,sx+i*(1+r()),sy+i*.7+r()*2,1,1,'#08050a')}},
 tile(x,R,tx,ty,v,st){const X=tx*8,Y=ty*8,up=!R.sol(tx,ty-1),dn=!R.sol(tx,ty+1);
  if(st==='k'){R_(x,X,Y,8,8,'#0b070c');if(dn){R_(x,X,Y+5,8,3,'#1d1218');R_(x,X,Y+7,8,1,'#2c1c22')}return}
  if(st==='p'){R_(x,X,Y,8,8,'#2a1a16');for(let i=0;i<8;i+=3)R_(x,X,Y+i+1,8,1,'#1e120f');if((tx+ty)%3===0)R_(x,X+3,Y,1,8,'#1a0f0c');if(up){R_(x,X,Y,8,1,'#5a3a2a');R_(x,X,Y+1,8,2,'#6a1622');R_(x,X,Y+1,8,1,'#8a2030')}if(ty>21)dfill(x,X,Y,8,8,'#050305',(ty-21)/5);return}
  if(st==='w'){R_(x,X,Y,8,8,'#0d080c');return}
  if(st==='x'){R_(x,X,Y,8,8,'#2a1d1a');R_(x,X,Y+3,8,1,'#1a100e');if(up){R_(x,X,Y,8,1,'#5a4030')}R_(x,X+3,Y+5,2,1,'#8a6a40');return}}
};
TH.escalier={
 layers(R){R.blink=[];return[
  {c:skyCanvas(384,VH,{cols:['#05030a','#0b0716','#140c24','#22113a','#3a1650'],seed:21}),f:0},
  {c:skyline(512,VH,190,61,{col:'#160d26',wmin:12,wmax:34,hmin:40,hmax:150,gap:5,wx:3,wy:4,ww:1,lit:.18,win:'#6a4048',neon:.25,blink:R.blink}),f:.1,tile:1,fy:.02}]},
 back(x,R){R_(x,0,0,R.pw,R.ph,'#17121d');dfill(x,0,0,R.pw,R.ph,'#1d1724',.35);
  for(let y=0;y<R.ph;y+=12)for(let X=(y/12)%2?0:12;X<R.pw;X+=24)R_(x,X,y,1,12,'#120e17');
  for(let y=0;y<R.ph;y+=12)R_(x,0,y,R.pw,1,'#120e17');
  /* grandes fenêtres (trous vers la ville) */
  for(const[wx,wy]of[[14,2],[34,6],[58,12],[80,20]]){const X=wx*8,Y=wy*8;R_(x,X-3,Y-3,46,62,'#0b080f');x.clearRect(X,Y,40,56);R_(x,X+19,Y,2,56,'#0b080f');R_(x,X,Y+27,40,2,'#0b080f');R_(x,X-3,Y+56,46,3,'#3a3346');R_(x,X-3,Y+56,46,1,'#5a5068')}
  /* lueur rouge vers le bas */
  for(let k=0;k<10;k++)dfill(x,0,R.ph-200+k*20,R.pw,20,'#3a0a14',k/14);
  const r=mulberry(9);for(let k=0;k<40;k++){const sx=r()*R.pw,sy=r()*R.ph;R_(x,sx,sy,1,2+r()*4,'#120d16')}},
 tile(x,R,tx,ty,v,st){const X=tx*8,Y=ty*8,r=R.rng;
  if(st==='w'){R_(x,X,Y,8,8,'#0c090f');if(!R.sol(tx+1,ty))R_(x,X+7,Y,1,8,'#2a2436');if(!R.sol(tx-1,ty))R_(x,X,Y,1,8,'#2a2436');return}
  const up=!R.sol(tx,ty-1);const red=clamp((ty-14)/30,0,1);
  if(v===2){R_(x,X,Y+4,8,4,'#2a2333');R_(x,X,Y+4,8,1,red>.5?'#c46a72':'#6a6078');R_(x,X,Y+5,8,1,'#1d1824');if(r()<.25)R_(x,X+Math.floor(r()*6),Y+4,2,1,'#6a0a18');return}
  if(st==='s'&&up){R_(x,X,Y,8,8,'#2a2333');R_(x,X,Y,8,1,red>.5?'#c46a72':'#6a6078');R_(x,X,Y+1,8,1,'#1d1824');if(r()<.25)R_(x,X+Math.floor(r()*6),Y,2,1,'#6a0a18');return}
  R_(x,X,Y,8,8,'#100c15');dfill(x,X,Y,8,8,'#18121f',.3);if(red>0)dfill(x,X,Y,8,8,'#2a0810',red*.5)},
 over(x,R){/* rampe qui suit l'escalier */
  const rail=(x0,y0,n)=>{for(let i=0;i<=n*8;i++){const X=x0*8+i,Y=y0*8-9+i/2;R_(x,X,Y,1,1,'#5a5068');if(i%16===0)R_(x,X,Y,1,9,'#3a3346')}};rail(8,10,32);rail(60,26,32);
  const r=mulberry(4);for(let k=0;k<26;k++){const t=r(),f=r()<.5;const X=f?(8+t*32)*8:(60+t*32)*8,Y=f?10*8+t*32*4:26*8+t*32*4;for(let i=0;i<4;i++)R_(x,X+r()*10,Y-1+r()*2,1+r()*2,1,'#5a0a16')}}
};
TH.souterrains={
 layers(R){const W=384,H=VH;const[a,ax]=mk(256,H);R_(ax,0,0,256,H,'#07060b');for(let i=0;i<2;i++){const X=i*128;poly(ax,[[X+14,H],[X+14,70],[X+64,40],[X+114,70],[X+114,H]],'#0d0a14');poly(ax,[[X+30,H],[X+30,84],[X+64,62],[X+98,84],[X+98,H]],'#07060b');dfill(ax,X+30,84,68,H-84,'#120e1a',.25)}
  const[b,bx]=mk(320,H);for(let i=0;i<4;i++){const X=i*80+20;R_(bx,X,0,16,H,'#120e19');R_(bx,X,0,2,H,'#1d1726');R_(bx,X+14,0,2,H,'#0a080f');for(let y=10;y<H;y+=14)R_(bx,X,y,16,1,'#0a080f');for(let y=0;y<60;y+=3)R_(bx,X+30+Math.sin(y*.3)*1,y,1,2,'#16121f')}
  return[{c:(()=>{const[c,x]=mk(W,H);R_(x,0,0,W,H,'#050408');return c})(),f:0},{c:a,f:.25,tile:1,fy:.1},{c:b,f:.55,tile:1,fy:.2}]},
 back(x,R){const r=mulberry(13);R_(x,0,0,R.pw,R.ph,'#1a1523');
  for(let y=0;y<R.ph;y+=5)for(let X=(Math.floor(y/5)%2)*6;X<R.pw;X+=12){R_(x,X,y,11,4,r()<.5?'#211b2b':'#1d1826');R_(x,X,y,11,1,'#2a2336')}
  /* arches ouvertes sur le lointain */
  for(let ax=10;ax<R.w-10;ax+=17){const X=ax*8,top=8*8;x.save();x.beginPath();x.rect(X,top+28,56,24*8-top-28);x.arc(X+28,top+28,28,Math.PI,0);x.clip();x.clearRect(X,top-4,56,R.ph);x.restore();
   for(let a=0;a<=20;a++){const t=Math.PI+a/20*Math.PI;R_(x,X+28+Math.cos(t)*30-2,top+28+Math.sin(t)*30-2,4,4,'#2c2438')}R_(x,X-2,top+28,4,24*8-top-28,'#2c2438');R_(x,X+54,top+28,4,24*8-top-28,'#2c2438')}
  /* tuyaux */
  for(const[y,c]of[[8*8+2,'#2e2a36'],[22*8-3,'#2a2532']]){R_(x,0,y,R.pw,4,c);R_(x,0,y,R.pw,1,'#4a4458');for(let X=20;X<R.pw;X+=64){R_(x,X,y-1,3,6,'#3a3446');dfill(x,X+3,y+4,2,30+r()*30,'#3a2a1e',.5)}}
  /* traces d'eau et griffures */
  for(let k=0;k<50;k++){const X=r()*R.pw;dfill(x,X,6*8,2+r()*3,20+r()*60,'#120e18',.6)}
  for(let k=0;k<14;k++){const X=r()*R.pw,Y=12*8+r()*60;for(let s=0;s<3;s++)L(x,X+s*4,Y,X+s*4+8,Y+12,'#0e0b13',1)}
  for(let k=0;k<30;k++){const X=r()*R.pw;dfill(x,X,23*8-6,10+r()*20,6,'#1f3a34',.5)}
  /* salle finale : grande voûte, grille au plafond */
  dfill(x,140*8,0,30*8,R.ph,'#0a0810',.25)},
 tile(x,R,tx,ty,v,st){const X=tx*8,Y=ty*8,up=!R.sol(tx,ty-1),dn=!R.sol(tx,ty+1);
  if(st==='l'){R_(x,X,Y,8,3,'#3d3450');R_(x,X,Y,8,1,'#5d5078');R_(x,X,Y+3,8,1,'#120e18');return}
  R_(x,X,Y,8,8,'#231d2e');R_(x,X,Y+((tx%2)?3:7),8,1,'#15111d');R_(x,X+((ty%2)?2:6),Y,1,8,'#15111d');
  if(up){R_(x,X,Y,8,1,'#5d5078');R_(x,X,Y+1,8,1,'#3d3450')}if(dn)R_(x,X,Y+7,8,1,'#0d0a12');
  if(!R.sol(tx-1,ty))R_(x,X,Y,1,8,'#120e18');if(!R.sol(tx+1,ty))R_(x,X+7,Y,1,8,'#3d3450');
  if(ty>25)dfill(x,X,Y,8,8,'#050408',(ty-25)/5)}
};
function R_(x,a,b,w,h,c){x.fillStyle=c;x.fillRect(Math.round(a),Math.round(b),Math.round(w),Math.round(h))}

/* ---------- enseignes néon (pré-rendues allumées / éteintes) ---------- */
function neonArt(n){
 const sc=n.sc||1;let w,h;const txt=n.txt||'';
 if(n.kind==='txt'){if(n.vert){w=6*sc+8;h=txt.length*8*sc+6}else{w=textW(txt,sc)+8;h=7*sc+8}}
 else if(n.kind==='croix'){w=h=27}else if(n.kind==='tabac'){w=31;h=34}else if(n.kind==='coeur'){w=19;h=17}else{w=12;h=16}
 n.w=w;n.h=h;
 const mkS=(on)=>{const[c,x]=mk(w+2,h+2+(n.poles?30:0));const col=on?n.col:'#3a3346',dim=on?hex2(n.col,.35):'#24202e',core=on?'#ffffff':'#4a4458';
  if(n.poles){R_(x,3,h+2,2,30,'#2c2838');R_(x,w-3,h+2,2,30,'#2c2838')}
  if(n.board||n.kind==='txt'){R_(x,1,1,w,h,'#0b0910');R_(x,1,1,w,1,'#2c2838');R_(x,1,h,w,1,'#05040a')}
  if(n.kind==='txt'){if(n.vert){[...fnormT(txt)].forEach((ch,i)=>{const px=5,py=4+i*8*sc;drawText(x,ch,px+1,py+1,dim,sc);drawText(x,ch,px,py,col,sc)})}else{drawText(x,txt,5,5,dim,sc);drawText(x,txt,4,4,col,sc)}
   if(on&&sc>1)for(let i=0;i<w;i+=3)R_(x,i+2,2,1,1,hex2('#ffffff',.25))}
  else if(n.kind==='croix'){for(const[k,cc]of[[0,dim],[1,col],[2,dim],[3,col]]){const a=1+k*2,b=27-k*2;R_(x,9+k,a,9-k*2,b-a,cc);R_(x,a,9+k,b-a,9-k*2,cc)}R_(x,12,4,3,19,on?'#d8ffe8':core);R_(x,4,12,19,3,on?'#d8ffe8':core)}
  else if(n.kind==='tabac'){poly(x,[[16,1],[27,17],[16,33],[5,17]],'#0b0910');poly(x,[[16,3],[25,17],[16,31],[7,17]],col);poly(x,[[16,8],[21,17],[16,26],[11,17]],dim);R_(x,1,13,30,9,'#0b0910');drawText(x,'TABAC',3,14,on?'#ffe6e6':core,1)}
  else if(n.kind==='coeur'){const rows=[".xx...xx.","xxxx.xxxx","xxxxxxxxx","xxxxxxxxx",".xxxxxxx.","..xxxxx..","...xxx...","....x...."];rows.forEach((r,j)=>{for(let i=0;i<9;i++)if(r[i]==='x'){R_(x,1+i*2,1+j*2,2,2,(i+j)%3?col:dim)}});R_(x,4,3,2,2,core)}
  else{for(let j=0;j<8;j++)R_(x,5,1+j,2,1,col);poly(x,[[1,9],[11,9],[6,15]],col);R_(x,5,2,1,8,core)}
  return c};
 n.cOn=mkS(true);n.cOff=mkS(false);
}
const fnormT=s=>String(s).toUpperCase().replace(/[ÈÊË]/g,'E').replace(/[ÔÖ]/g,'O');

/* ---------- construction d'une zone (partie fixe, mise en cache) ---------- */
const ROOMC={};
function roomStatic(id){
 if(ROOMC[id])return ROOMC[id];const Z=ZI[id];const g=Grid(Z.w,Z.h);Z.build(g);
 const R={Z,id,g,w:Z.w,h:Z.h,pw:Z.w*8,ph:Z.h*8,rng:mulberry(Z.i*97+5)};
 R.sol=(tx,ty)=>{if(tx<0||tx>=R.w)return true;if(ty<0||ty>=R.h)return false;const v=g.t[ty*R.w+tx];return v===1||v===2};
 R.top=[];for(let tx=0;tx<R.w;tx++){for(let ty=0;ty<R.h;ty++)if(R.sol(tx,ty)){R.top[tx]=ty;break}}
 const wr=mulberry(Z.i*13+1);const WL={};R.winLit=(tx,k)=>{const key=tx+','+k;if(WL[key]===undefined){const q=wr();WL[key]=q<.07?'#9a6e34':q<.1?'#2a6a78':q<.12?'#7a2a52':null}return WL[key]};
 const T=TH[Z.th];const[c,x]=mk(R.pw,R.ph);
 if(T.back)T.back(x,R);
 for(const f of g.deco)f(x,R);
 for(let ty=0;ty<R.h;ty++)for(let tx=0;tx<R.w;tx++){const v=g.t[ty*R.w+tx];if(v)T.tile(x,R,tx,ty,v,String.fromCharCode(g.s[ty*R.w+tx]))}
 if(T.over)T.over(x,R);for(const f of g.over)f(x,R);
 R.stat=c;R.layers=T.layers(R);
 g.neons.forEach(neonArt);
 /* surfaces exposées à la pluie (pour les éclaboussures) */
 R.surf=[];if(Z.ext)for(let tx=0;tx<R.w;tx++){for(let ty=0;ty<R.h;ty++){const v=g.t[ty*R.w+tx];if(v){R.surf[tx]=ty*8+(v===2?4:0);break}}}
 return ROOMC[id]=R;
}

/* =====================================================================
   5. MOTEUR
   ===================================================================== */
const PH={run:118,accG:1150,decG:1500,turn:2600,accA:760,jv:292,gUp:870,gCut:1700,gDn:1320,vmax:440,roll:220};
/* instance vivante d'une zone : monstres, PNJ, objets, enseignes (état sauvegardable) */
function roomInst(id){
 const R=roomStatic(id),g=R.g;
 const I={R,id,mons:[],npcs:[],props:[],eil:null,decals:[],lights:[],neons:[],tubes:[]};
 let nid=1;
 for(const e of g.ents){
  if(e.k==='npc')I.npcs.push({x:e.x,x0:e.x,y:e.yp??e.y,face:-1,pi:e.pi??ri(0,NPC_PALS.length-1),v:e.v,walk:!!e.walk,seed:Math.random(),startle:0,jy:0,jv:0,name:'PNJ #'+pad(Z_NPC++)});
  else if(e.k==='eilyn')I.eil={x:e.x,y:e.y,face:1,seed:.5,heart:0};
  else if(e.k==='crate'||e.k==='barrel')I.props.push({k:e.k,x:e.x,y:e.y,w:e.k==='crate'?12:10,h:e.k==='crate'?12:14,alive:1,solid:1,vy:0});
  else I.mons.push({k:e.k,x:e.x,y:e.y,x0:e.x,range:e.range,vx:0,vy:0,face:Math.random()<.5?-1:1,hw:e.k==='k'?9:e.k==='g'?7:5,h:e.k==='k'?14:e.k==='g'?32:22,
   onG:false,st:'patrol',t:0,t0:0,hp:e.k==='g'?2:1,alive:1,dead:0,ph:Math.random(),flash:0,id:nid++})}
 for(const L of g.lights)I.lights.push(Object.assign({},L,{seed:Math.random()}));
 for(const n of g.neons){const N={n,on:1,seed:Math.random(),lit:1};I.neons.push(N);
  const L={x:n.x+n.w/2,y:n.y+n.h/2,r:Math.max(n.w,n.h)*1.25+12,col:n.col,a:.42,fl:n.fl,on:1,seed:N.seed,src:N};I.lights.push(L)}
 for(const t of g.tubes){const T={x:t.x,y:t.y,alive:1,seed:Math.random(),lit:1};I.tubes.push(T);I.lights.push({x:t.x,y:t.y+10,r:46,col:'#cdefff',a:.34,fl:2,on:1,seed:T.seed,src:T,cone:1})}
 return I;
}
let Z_NPC=1;
/* ---------- collisions ---------- */
const SOL=[];
function solids(I,x0,y0,x1,y1,self){
 SOL.length=0;const R=I.R,g=R.g;const tx0=Math.floor(x0/8),tx1=Math.floor((x1-.001)/8),ty0=Math.floor(y0/8),ty1=Math.floor((y1-.001)/8);
 for(let ty=ty0;ty<=ty1;ty++)for(let tx=tx0;tx<=tx1;tx++){let v;if(tx<0||tx>=R.w)v=1;else if(ty<0||ty>=R.h)v=0;else v=g.t[ty*R.w+tx];if(!v)continue;
  let r;if(v===1)r=[tx*8,ty*8,tx*8+8,ty*8+8,0];else if(v===2)r=[tx*8,ty*8+4,tx*8+8,ty*8+8,0];else r=[tx*8,ty*8,tx*8+8,ty*8+3,1];
  if(r[0]<x1&&r[2]>x0&&r[1]<y1&&r[3]>y0)SOL.push(r)}
 for(const p of I.props)if(p!==self&&p.alive&&p.solid){const a=p.x-p.w/2,b=p.y-p.h,c=p.x+p.w/2,d=p.y;if(a<x1&&c>x0&&b<y1&&d>y0)SOL.push([a,b,c,d,0])}
 return SOL;
}
function freeBox(I,x0,y0,x1,y1,self){for(const r of solids(I,x0,y0,x1,y1,self))if(!r[4])return false;return true}
function floorAt(I,x0,x1,y,maxd,oneway=true,self){let best=null;for(const r of solids(I,x0,y-.01,x1,y+maxd,self)){if(r[4]&&!oneway)continue;if(r[1]>=y-.01&&r[1]<=y+maxd&&(best===null||r[1]<best))best=r[1]}return best}
function moveEnt(I,e,dt,o={}){
 const wasG=e.onG;e.onG=false;e.wall=0;
 let dx=e.vx*dt;const n=Math.ceil(Math.abs(dx)/3)||1;
 for(let i=0;i<n;i++){const sx=dx/n;e.x+=sx;
  for(const r of solids(I,e.x-e.hw,e.y-e.h,e.x+e.hw,e.y-.01,e).slice()){if(r[4])continue;
   if(o.step&&wasG&&r[1]>=e.y-4.6&&freeBox(I,e.x-e.hw,r[1]-e.h,e.x+e.hw,r[1]-.01,e)){e.y=r[1];continue}
   if(sx>0)e.x=Math.min(e.x,r[0]-e.hw);else e.x=Math.max(e.x,r[2]+e.hw);e.vx=0;e.wall=sgn(sx)}}
 let dy=e.vy*dt;const m=Math.ceil(Math.abs(dy)/3)||1;
 for(let i=0;i<m;i++){const sy=dy/m,prev=e.y;e.y+=sy;
  for(const r of solids(I,e.x-e.hw,e.y-e.h,e.x+e.hw,e.y,e).slice()){
   if(r[4]){if(sy>0&&prev<=r[1]+.01&&!(e.drop>0)){e.y=r[1];e.vy=0;e.onG=true}continue}
   if(sy>0&&prev<=r[1]+3){e.y=r[1];e.vy=0;e.onG=true}else if(sy<0&&prev-e.h>=r[3]-3){e.y=r[3]+e.h;e.vy=0}}}
 if(!e.onG&&wasG&&e.vy>=0&&o.snap){const f=floorAt(I,e.x-e.hw,e.x+e.hw,e.y,6,!(e.drop>0),e);if(f!==null){e.y=f;e.onG=true;e.vy=0}}
 if(!e.onG&&e.vy>=0){const f=floorAt(I,e.x-e.hw,e.x+e.hw,e.y,.5,!(e.drop>0),e);if(f!==null&&Math.abs(f-e.y)<.6){e.y=f;e.onG=true}}
}
const overlap=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
const boxOf=e=>[e.x-e.hw,e.y-e.h,e.x+e.hw,e.y];

/* ---------- particules (cosmétiques) ---------- */
let PARTS=[];
function part(o){if(PARTS.length>700)PARTS.shift();PARTS.push(Object.assign({vx:0,vy:0,g:0,life:0,max:1,s:1,fr:1},o))}
function burst(n,x,y,o,spread=Math.PI*2,dir=0,vmin=20,vmax=80){for(let i=0;i<n;i++){const a=dir+rnd(-spread/2,spread/2),v=rnd(vmin,vmax);part(Object.assign({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v},typeof o==='function'?o(i):o))}}
function partsUpdate(I,dt){
 for(const p of PARTS){p.life+=dt;p.vy+=p.g*dt;if(p.fr!==1){const f=Math.pow(p.fr,dt*60);p.vx*=f;p.vy*=f}p.x+=p.vx*dt;p.y+=p.vy*dt;
  if(p.bounce&&p.vy>0){const tx=Math.floor(p.x/8),ty=Math.floor(p.y/8);const R=I.R;if(tx>=0&&tx<R.w&&ty>=0&&ty<R.h){const v=R.g.t[ty*R.w+tx];const top=ty*8+(v===2?4:0);if((v===1||v===2||v===3)&&p.y>=top){p.y=top-.01;p.vy*=-p.bounce;p.vx*=.6;if(Math.abs(p.vy)<15){p.vy=0;p.g=0;p.vx*=.5;p.rest=1}}}}
  if(p.t==='drip'&&!p.done){const R=I.R,tx=Math.floor(p.x/8),ty=Math.floor(p.y/8);let hit=false,wy=null;for(const w of R.g.waters)if(p.x>=w[0]&&p.x<w[1]&&p.y>=w[2]){hit=true;wy=w[2]}
   if(!hit&&tx>=0&&tx<R.w&&ty>=0&&ty<R.h&&R.g.t[ty*R.w+tx])hit=true;if(hit){p.done=1;p.life=p.max;part({t:'ring',x:p.x,y:wy??Math.floor(p.y/8)*8,max:.5,col:'#8fe3f0'});burst(3,p.x,(wy??Math.floor(p.y/8)*8)-1,{t:'px',g:300,max:.35,col:'#6fb9cc'},1.4,-Math.PI/2,30,60);if(p.snd)SFX.goutte&&SFX.goutte()}}}
 PARTS=PARTS.filter(p=>p.life<p.max);
}

/* ---------- session (conservée quand on revient au menu) ---------- */
let S=null,V=null;
const STORE='croc-retro-balade';
const stats=()=>{const s=store.get(STORE,{});return{total:+s.total||0,best:+s.best||0,fins:+s.fins||0}};
const LINES=()=>(D.retro&&Array.isArray(D.retro.repliquesPNJ)&&D.retro.repliquesPNJ.length)?D.retro.repliquesPNJ:PNJ_DEF;
function newCroc(s){return{x:s.x,y:s.y,vx:0,vy:0,face:s.face||1,onG:false,st:'fall',stT:0,coy:0,jbuf:0,jcut:false,atkCd:0,ak:'sol',hitDone:0,lunged:0,
 rollD:.36,rollCd:0,rollBuf:0,inv:0,peakY:s.y,ph:0,cb:0,cl:0,cbv:0,clv:0,drop:0,hw:5,h:28,smear:[],rib:null,ghosts:[],eyes:[]}}
function newSession(){
 PARTS=[];Z_NPC=1;for(const id in ROOMC)for(const d of ROOMC[id].g.doors)d.opening=0;
 S={rooms:{},cur:null,croc:null,mode:'play',kills:0,fails:0,clock:0,rt:0,T:0,bat:1,batLock:0,slow:0,slowOn:false,slowView:0,hit:0,
  rec:[],ev:[],entry:0,fin:false,cam:{x:0,y:0,look:0},shake:0,ab:0,glitch:0,flashA:0,flashC:'#fff',zoom:0,zx:0,zy:0,
  toast:null,card:null,near:null,killBump:0,bolt:null,boltT:rnd(4,9),light:0,beat:0,coupsStart:G.coups||0};
 enterRoom('toits','A',true);
 S.card={t:0,big:1};
}
function room(id){return S.rooms[id]||(S.rooms[id]=roomInst(id))}
function enterRoom(id,sp,first,keepV){
 const I=room(id);S.cur=I;const s=I.R.g.spawns[sp]||{x:40,y:40,face:1};
 const vx=S.croc&&keepV?S.croc.vx:0;
 if(!S.croc)S.croc=newCroc(s);else Object.assign(S.croc,{x:s.x,y:s.y,vx,vy:s.y<0?160:0,face:s.face,onG:false,st:'fall',stT:0,peakY:s.y,drop:0,inv:.4,rib:null,ghosts:[],smear:[],eyes:[]});
 S.near=null;camUpdate(0,true);S.entry=S.rec.length;
 if(!first)S.card={t:0};
 live('Zone : '+I.R.Z.nom);
}
/* ---------- effets (journalisés pour la relecture) ---------- */
function fx(type,...a){if(S.ev)S.ev.push([type,...a]);runFx(type,a,false)}
const snd=(n,...a)=>{const f=SFX[n];if(f)f(...a)};
function dustRing(x,y,n,p){for(let i=0;i<n;i++){const d=i%2?1:-1;part({t:'dust',x:x+d*rnd(1,5),y:y-1,vx:d*rnd(25,85)*p,vy:-rnd(4,22)*p,fr:.87,g:-8,max:rnd(.3,.6)*Math.max(.8,p*.8),col:pick(['#5a5068','#4a4258','#6a6078']),s:Math.min(1.6,p)})}}
function runFx(type,a,rp){const x=a[0],y=a[1],p=a[2],q=a[3];const I=S.cur;
 switch(type){
 case'jump':snd('saut');for(const d of[-1,1])part({t:'dust',x:x+d*3,y:y-1,vx:d*30,vy:-8,fr:.88,max:.3,col:'#4a4258'});break;
 case'land':snd('reception',1);dustRing(x,y,4,.7);S.shake=Math.max(S.shake,.18);break;
 case'landH':snd('reception',2);dustRing(x,y,10,1.6);S.shake=Math.max(S.shake,.62);S.zoom=.035;S.zx=x-S.cam.x;S.zy=y-S.cam.y;S.ab=Math.max(S.ab,.6);
  burst(10,x,y-1,{t:'px',g:500,bounce:.3,max:1.2,col:'#3a3346'},1.6,-Math.PI/2,60,150);I.decals.push({k:'crack',x,y});break;
 case'step':{const wet=S.cur.R.Z.ext?1:0;const pud=inPuddle(I,x,y);snd('pas',p,wet+(pud?1.5:0));if(pud)burst(4,x,y-1,{t:'px',g:400,max:.4,col:'#7a70a6'},1.2,-Math.PI/2,30,70);
  else if(Math.abs(S.croc.vx)>90)part({t:'dust',x:x-S.croc.face*3,y:y-1,vx:-S.croc.face*20,vy:-6,fr:.88,max:.25,col:'#3a3346'});
  if(inWater(I,S.croc)){snd('eclabousse');burst(5,x,y-6,{t:'px',g:420,max:.5,col:'#8fd8e6'},1.4,-Math.PI/2,40,90)}break}
 case'turn':for(let i=0;i<4;i++)part({t:'dust',x,y:y-1,vx:-p*rnd(20,60),vy:-rnd(4,14),fr:.86,max:.35,col:'#4a4258'});break;
 case'roll':snd('roulade');dustRing(x,y,3,.6);break;
 case'swing':snd('lourd');break;
 case'floor':snd('impactSol');burst(5,x,y-2,{t:'spark',max:.25,col:'#ffe6b0'},1.6,-Math.PI/2,60,160);dustRing(x,y,4,.8);S.shake=Math.max(S.shake,.25);I.decals.push({k:'crack',x,y,s:.6});break;
 case'hitM':snd('hit');snd('hammer',.7);burst(10,x,y,{t:'spark',max:.28,col:'#fff'},1.2,p>0?0:Math.PI,80,220);S.shake=Math.max(S.shake,.45);S.ab=Math.max(S.ab,.8);S.flashA=Math.max(S.flashA,.12);S.flashC='#ffffff';break;
 case'kill':snd('hammer',1);snd('abattu');
  burst(16,x,y,i=>({t:'ichor',g:420,bounce:.2,max:rnd(.6,1.3),col:i%4?'#1a0f22':'#b0102a',s:i%3?1:2}),1.4,p>0?-.4:Math.PI+.4,90,280);
  burst(12,x,y,{t:'smoke',max:rnd(.7,1.2),col:'#2a1c3a',g:-30,fr:.9},Math.PI*2,0,10,50);
  burst(9,x,y,{t:'spark',max:.3,col:'#fff'},1,p>0?0:Math.PI,120,300);
  burst(5,x,y-2,{t:'px',max:.5,col:'#ff2b45',g:-20,fr:.92},Math.PI*2,0,10,40);
  I.decals.push({k:'splat',x:x+p*14,y:floorBelow(I,x+p*14,y)});
  S.shake=Math.max(S.shake,.7);S.flashA=Math.max(S.flashA,.22);S.flashC='#ffffff';S.ab=Math.max(S.ab,1.2);S.zoom=.045;S.zx=x-S.cam.x;S.zy=y-S.cam.y;S.killBump=1;
  part({t:'txt',x,y:y-14,vy:-22,max:.9,txt:'+1',col:'#ff2b45'});break;
 case'crate':snd('bois');burst(9,x,y,i=>({t:'plank',g:520,bounce:.35,max:rnd(.8,1.6),col:i%3?'#6a4630':'#3a2418',w:ri(2,5),h:ri(1,2)}),1.8,-Math.PI/2+p*.5,60,200);dustRing(x,y+5,5,.9);S.shake=Math.max(S.shake,.32);break;
 case'barrel':snd('metal');burst(8,x,y,i=>({t:'plank',g:520,bounce:.45,max:rnd(.8,1.5),col:i%2?'#5a6a7a':'#2a3440',w:ri(2,4),h:2}),1.8,-Math.PI/2+p*.5,60,200);burst(8,x,y,{t:'spark',max:.3,col:'#ffd27a'},1.6,-Math.PI/2+p*.6,80,220);S.shake=Math.max(S.shake,.35);break;
 case'neon':snd('verre');burst(16,x,y,i=>({t:'shard',g:480,bounce:.3,max:rnd(.7,1.4),col:i%3?q||'#ff3fa4':'#ffffff'}),Math.PI*2,0,40,170);burst(14,x,y,{t:'spark',max:.35,col:'#fff7d0',g:300},Math.PI*2,0,60,220);S.flashA=Math.max(S.flashA,.1);S.flashC=q||'#fff';S.shake=Math.max(S.shake,.3);break;
 case'tube':snd('verre');burst(12,x,y+2,i=>({t:'shard',g:480,bounce:.3,max:rnd(.7,1.3),col:i%2?'#e8fbff':'#9fb6c8'}),1.8,Math.PI/2,40,140);burst(10,x,y+2,{t:'spark',max:.4,col:'#dff8ff',g:400},2,Math.PI/2,60,200);break;
 case'pilon':snd('pilon');snd('hammer',1.2);part({t:'ring',x,y,max:.45,col:'#e8e0cc',r:60});part({t:'ring',x,y,max:.3,col:'#ff3fa4',r:36});dustRing(x,y,18,2);
  burst(18,x,y-1,{t:'px',g:600,bounce:.3,max:1.3,col:'#4a4258'},1.4,-Math.PI/2,80,240);burst(12,x,y-2,{t:'spark',max:.35,col:'#fff'},2.4,-Math.PI/2,100,260);
  I.decals.push({k:'crack',x,y,s:1.6});S.shake=1;S.flashA=Math.max(S.flashA,.28);S.flashC='#fff';S.ab=1.4;S.zoom=.06;S.zx=x-S.cam.x;S.zy=y-S.cam.y;break;
 case'startle':snd('sursaut');part({t:'txt',x,y,vy:-18,max:.9,txt:'!',col:'#e8e0cc'});break;
 case'heart':for(let i=0;i<(p||1)*3;i++)part({t:'heart',x:x+rnd(-6,6),y:y+rnd(-2,2),vx:rnd(-12,12),vy:rnd(-30,-14),max:rnd(1,1.6),col:i%3?'#e0263d':'#e8e0cc'});break;
 case'hurt':snd('mal');S.flashA=.55;S.flashC='#ff2b45';S.glitch=1;S.ab=1.6;S.shake=.85;burst(10,x,y,{t:'ichor',g:400,bounce:.2,max:1,col:'#b0102a'},Math.PI*2,0,40,160);break;
 case'door':snd('porte');break;
 case'growl':snd(p==='k'?'cri':'grogne');part({t:'txt',x,y,vy:-14,max:.7,txt:'!',col:'#ff2b45'});break;
 case'swipe':snd('swing');break;
 case'charge':for(let i=0;i<5;i++)part({t:'dust',x:x-p*6,y:y-1,vx:-p*rnd(30,80),vy:-rnd(5,20),fr:.88,max:.4,col:'#4a4258'});break;
 case'zap':snd('zap');burst(5,x,y,{t:'spark',max:.25,col:'#fff7d0',g:300},Math.PI*2,0,30,90);break;
 }
}
function floorBelow(I,x,y){const f=floorAt(I,x-1,x+1,y-8,40);return f===null?y:f}
function inPuddle(I,x,y){for(const[a,b]of I.R.g.puddles)if(x>=a*8&&x<b*8&&Math.abs(y-(I.R.surf[Math.floor(x/8)]??-99))<2)return true;return false}

/* ---------- Croc ---------- */
function setSt(c,s){if(c.st!==s){c.st=s;c.stT=0}}
function spring(o,k,t,dt,Kk,Dd){const v=k+'v';o[v]=(o[v]||0)+(t-o[k])*Kk*dt;o[v]*=Math.pow(Dd,dt*60);o[k]+=o[v]*dt}
function startRoll(c,mx){if(mx)c.face=mx;setSt(c,'roll');c.rollD=.36;c.rollCd=.14;c.h=16;c.inv=Math.max(c.inv,.34);c.rollBuf=0;fx('roll',c.x,c.y,c.face)}
function startAtk(c,k){setSt(c,'atk');c.ak=k;c.hitDone=0;c.lunged=0;c.atkCd=ATK.tot-.06;c.smear=[];G.coups=(G.coups||0)+1}
function startPilon(c){setSt(c,'pilon');c.hitDone=0;c.vx*=.3;c.smear=[];fx('swing',c.x,c.y,c.face);G.coups=(G.coups||0)+1}
function onOneWay(I,c){const tx0=Math.floor((c.x-c.hw)/8),tx1=Math.floor((c.x+c.hw-.01)/8),ty=Math.floor((c.y+1)/8);let ow=false;for(let tx=tx0;tx<=tx1;tx++){const v=I.R.g.t[ty*I.R.w+tx];if(v===1||v===2)return false;if(v===3)ow=true}return ow}
function inWater(I,e){for(const w of I.R.g.waters)if(e.x>=w[0]&&e.x<w[1]&&e.y>w[2]+1)return true;return false}
function crocStep(c,I,dt,inp){
 c.stT+=dt;c.inv=Math.max(0,c.inv-dt);c.atkCd-=dt;c.rollCd-=dt;c.jbuf-=dt;c.coy-=dt;c.rollBuf-=dt;c.drop=Math.max(0,c.drop-dt);
 if(inp.tap.jump)c.jbuf=.13;
 const mx=(inp.r?1:0)-(inp.l?1:0);
 if(c.st==='roll'&&c.stT>=c.rollD){setSt(c,c.onG?'idle':'fall');c.h=28}
 if(c.st==='atk'&&c.stT>=ATK.tot)setSt(c,c.onG?'idle':'fall');
 if(c.st==='land'&&c.stT>=.12)setSt(c,'idle');
 if(c.st==='landH'&&c.stT>=.34)setSt(c,'idle');
 if(c.st==='pilonL'&&c.stT>=.4)setSt(c,'idle');
 const lock=c.st==='landH'||c.st==='pilonL'||c.st==='pilon'||c.st==='hurt';
 if(inp.tap.roll&&!lock&&c.st!=='roll'&&c.rollCd<=0){if(c.onG&&(c.st!=='atk'||c.stT>ATK.w+ATK.s+.03))startRoll(c,mx);else if(!c.onG)c.rollBuf=.22}
 if(inp.tap.atk&&!lock&&c.st!=='roll'&&c.st!=='atk'&&c.atkCd<=0){if(inp.aim)c.face=inp.aim;if(!c.onG&&inp.d)startPilon(c);else startAtk(c,c.onG?'sol':'air')}
 const canJ=!lock&&(c.st!=='atk'||c.stT>ATK.w+ATK.s+ATK.h*.5)&&(c.st!=='roll'||c.stT>c.rollD*.4);
 if(c.jbuf>0&&(c.onG||c.coy>0)&&canJ){
  if(inp.d&&c.onG&&onOneWay(I,c)){c.drop=.25;c.jbuf=0;c.onG=false;c.y+=1;setSt(c,'fall')}
  else{c.vy=-PH.jv;c.onG=false;c.coy=0;c.jbuf=0;c.jcut=false;c.h=28;setSt(c,'jump');fx('jump',c.x,c.y,c.face)}}
 if(!inp.jump&&c.vy<0&&!c.jcut&&c.st==='jump'){c.vy*=.45;c.jcut=true}
 const wade=inWater(I,c)?.62:1;
 if(c.st==='roll')c.vx=c.face*lerp(PH.roll,140,c.stT/c.rollD)*wade;
 else{let tv=mx*PH.run*wade;if(c.st==='crouch'||lock)tv=0;if(c.st==='atk')tv=c.ak==='air'?mx*PH.run*.75:mx*24;
  const acc=c.onG?(mx?(c.vx&&sgn(mx)!==sgn(c.vx)?PH.turn:PH.accG):PH.decG):PH.accA;c.vx=appr(c.vx,tv,acc*dt)}
 if(mx&&!lock&&c.st!=='atk'&&c.st!=='roll'){if(mx!==c.face&&c.onG&&Math.abs(c.vx)>70)fx('turn',c.x,c.y,mx);c.face=mx}
 if(c.st==='pilon'){c.vy=c.stT<.1?0:560;c.vx=appr(c.vx,0,900*dt)}
 else{const g=c.vy<0?(inp.jump&&!c.jcut?PH.gUp:PH.gCut):PH.gDn;c.vy=Math.min(PH.vmax,c.vy+g*dt);if(c.st==='atk'&&c.ak==='air'&&c.stT<ATK.w+ATK.s+ATK.h)c.vy=Math.min(c.vy,40)}
 const vyB=c.vy,wasG=c.onG;
 moveEnt(I,c,dt,{step:true,snap:c.st!=='jump'&&c.vy>=0});
 if(c.onG)c.coy=.1;else c.peakY=Math.min(c.peakY,c.y);
 if(!wasG&&c.onG){const fall=c.y-c.peakY;
  if(c.st==='pilon')pilonImpact(c,I);
  else if(c.rollBuf>0){startRoll(c,mx);fx('land',c.x,c.y,1)}
  else if(vyB>=420||fall>100){setSt(c,'landH');c.vx=0;fx('landH',c.x,c.y,fall)}
  else if(vyB>150){if(c.st!=='atk')setSt(c,'land');fx('land',c.x,c.y,vyB/300)}
  c.peakY=c.y}
 if(c.onG)c.peakY=c.y;
 const busy=['roll','atk','land','landH','pilonL','pilon','hurt'].includes(c.st);
 if(!busy){if(c.onG&&inp.d&&!S.near)setSt(c,'crouch');else if(!c.onG)setSt(c,c.vy<0?'jump':'fall');else setSt(c,Math.abs(c.vx)>10?'run':'idle')}
 if(c.st==='run'){const p0=c.ph;c.ph=(c.ph+Math.abs(c.vx)*dt/(Math.abs(c.vx)>70?30:24))%1;if((p0<.5&&c.ph>=.5)||c.ph<p0)fx('step',c.x,c.y,c.ph<.5?0:1)}
 spring(c,'cb',clamp(Math.abs(c.vx)/32,0,4)+(c.onG?0:1.2),dt,90,.82);
 spring(c,'cl',c.onG?0:clamp(c.vy/80,-1.5,4.5),dt,80,.8);
 spring(c,'hs',clamp(Math.abs(c.vx)/55,0,2.2)+(c.onG?0:clamp(-c.vy/140,-1.5,1.8))+(c.st==='atk'?1:0),dt,120,.78);
 if(c.st==='atk'){const k=c.stT;if(!c.lunged&&k>=ATK.w){c.lunged=1;if(c.ak==='sol')c.vx+=c.face*80;fx('swing',c.x,c.y,c.face)}if(!c.hitDone&&k>=ATK.w+ATK.s*.6){c.hitDone=1;hammerHit(c,I)}}
}
function atkBox(c){const f=c.face;return c.ak==='air'?[c.x+(f>0?-2:-36),c.y-38,c.x+(f>0?36:2),c.y+4]:[c.x+(f>0?0:-38),c.y-44,c.x+(f>0?38:0),c.y+2]}
function hammerHit(c,I){
 const b=atkBox(c),f=c.face;let hit=0,big=0;
 for(const m of I.mons)if(m.alive&&overlap(b,boxOf(m))){hitMon(m,f,1);hit++;big=1}
 for(const p of I.props)if(p.alive&&overlap(b,[p.x-p.w/2,p.y-p.h,p.x+p.w/2,p.y])){breakProp(p,f);hit++}
 for(const N of I.neons)if(N.on&&N.n.brk&&overlap(b,[N.n.x,N.n.y,N.n.x+N.n.w,N.n.y+N.n.h])){breakNeon(N);hit++}
 for(const T of I.tubes)if(T.alive&&overlap(b,[T.x-8,T.y,T.x+8,T.y+6])){breakTube(T);hit++}
 for(const n of I.npcs)if(overlap([b[0]-8,b[1],b[2]+8,b[3]],[n.x-5,n.y-26,n.x+5,n.y]))startle(n);
 if(I.eil&&overlap([b[0]-8,b[1],b[2]+8,b[3]],[I.eil.x-8,I.eil.y-26,I.eil.x+8,I.eil.y]))fx('heart',I.eil.x,I.eil.y-28,1);
 if(hit)S.hit=Math.max(S.hit,big?.11:.06);
 else if(c.ak==='sol'){const hx=c.x+f*31;if(floorAt(I,hx-3,hx+3,c.y-6,10)!==null)fx('floor',hx,c.y,f)}
}
function hitMon(m,dir,pw){m.hp-=pw;m.flash=.14;
 if(m.hp<=0){m.alive=0;m.dead=0;m.vx=dir*180;m.vy=-150;m.onG=false;S.kills++;fx('kill',m.x,m.y-m.h/2,dir)}
 else{m.st='stun';m.t=.7;m.vx=dir*150;fx('hitM',m.x,m.y-m.h/2,dir)}}
function breakProp(p,dir){p.alive=0;fx(p.k,p.x,p.y-p.h/2,dir)}
function breakNeon(N){N.on=0;fx('neon',N.n.x+N.n.w/2,N.n.y+N.n.h/2,0,N.n.col)}
function breakTube(T){T.alive=0;fx('tube',T.x,T.y,0)}
function startle(n){if(n.startle>0)return;n.startle=.8;n.jv=95;fx('startle',n.x,n.y-30)}
function pilonImpact(c,I){setSt(c,'pilonL');c.vx=0;const x=c.x+c.face*14,y=c.y;
 for(const m of I.mons)if(m.alive&&Math.abs(m.x-x)<58&&Math.abs(m.y-y)<30)hitMon(m,sgn(m.x-x),2);
 for(const p of I.props)if(p.alive&&Math.abs(p.x-x)<42&&Math.abs(p.y-y)<26)breakProp(p,sgn(p.x-x));
 for(const n of I.npcs)if(Math.abs(n.x-x)<80&&Math.abs(n.y-y)<34)startle(n);
 S.hit=Math.max(S.hit,.12);fx('pilon',x,y,c.face)}

/* ---------- monstres : patrouille, alerte, poursuite, coup ; le chargeur fonce ---------- */
function edgeAhead(I,m){const fx_=m.x+m.face*(m.hw+3);return floorAt(I,fx_-1,fx_+1,m.y,7)===null}
function monStep(m,I,c,dt){
 if(!m.alive){m.dead+=dt;if(m.dead<1.2){m.vy+=900*dt;m.vx*=Math.pow(.9,dt*60);moveEnt(I,m,dt,{})}return}
 m.flash=Math.max(0,m.flash-dt);
 const dx=c.x-m.x,dy=c.y-m.y,adx=Math.abs(dx);
 if(adx>340){return}
 m.t-=dt;
 const sees=S.mode==='play'&&c.st!=='hurt'&&adx<(m.k==='k'?160:125)&&Math.abs(dy)<34&&(sgn(dx)===m.face||adx<48);
 const spd=m.k==='g'?20:m.k==='k'?30:26;
 const alert=()=>{m.st='alert';m.t=m.k==='g'?.5:.42;m.vx=0;m.face=sgn(dx);fx('growl',m.x,m.y-m.h-6,m.k)};
 switch(m.st){
  case'patrol':m.vx=m.face*spd;if(m.wall||edgeAhead(I,m)||(Math.abs(m.x-m.x0)>m.range&&sgn(m.x-m.x0)===m.face)){m.st='idle';m.t=rnd(.5,1.1);m.vx=0}if(sees)alert();break;
  case'idle':m.vx=0;if(m.t<=0){m.face*=-1;m.st='patrol'}if(sees)alert();break;
  case'alert':m.vx=0;if(m.t<=0){if(m.k==='k'){m.st='tell';m.t=m.t0=.55;fx('growl',m.x,m.y-m.h-6,'k')}else m.st='chase'}break;
  case'chase':m.face=sgn(dx);m.vx=m.face*(m.k==='g'?38:56);if(m.wall||edgeAhead(I,m))m.vx=0;
   if(adx<(m.k==='g'?30:21)&&Math.abs(dy)<22){m.st='windup';m.t=m.t0=m.k==='g'?.62:.36;m.vx=0}
   if(adx>230||Math.abs(dy)>64){m.st='patrol'}break;
  case'windup':m.vx=0;if(m.t<=0){m.st='strike';m.t=.13;m.vx=m.face*(m.k==='g'?30:90);fx('swipe',m.x,m.y)}break;
  case'strike':{const hb=m.k==='g'?[m.x+(m.face>0?0:-38),m.y-40,m.x+(m.face>0?38:0),m.y]:[m.x+(m.face>0?2:-25),m.y-26,m.x+(m.face>0?25:-2),m.y];
   if(overlap(hb,boxOf(c)))hurtCroc('coup');m.vx=appr(m.vx,0,500*dt);if(m.t<=0){m.st='recover';m.t=m.k==='g'?.75:.5}break}
  case'recover':m.vx=appr(m.vx,0,600*dt);if(m.t<=0)m.st='chase';break;
  case'tell':m.vx=0;m.face=sgn(dx);if(m.t<=0){m.st='charge';m.t=1.3;fx('charge',m.x,m.y,m.face)}break;
  case'charge':m.vx=m.face*240;if(overlap(boxOf(m),boxOf(c)))hurtCroc('charge');if(m.wall||edgeAhead(I,m)||m.t<=0){m.st='skid';m.t=.3;fx('charge',m.x,m.y,m.face)}break;
  case'skid':m.vx=appr(m.vx,0,900*dt);if(m.t<=0){m.st='stun';m.t=.9}break;
  case'stun':m.vx=appr(m.vx,0,800*dt);if(m.t<=0){m.st='patrol'}break;
 }
 m.vy=Math.min(PH.vmax,m.vy+PH.gDn*dt);moveEnt(I,m,dt,{step:true,snap:true});
 m.ph=(m.ph+Math.abs(m.vx)*dt/(m.k==='k'?(m.st==='charge'?40:26):18))%1;
}
function npcStep(n,c,dt){n.startle=Math.max(0,n.startle-dt);if(n.jv||n.jy){n.jy+=n.jv*dt;n.jv-=520*dt;if(n.jy<=0){n.jy=0;n.jv=0}}
 n.t=(n.t||0)+dt;const near=Math.abs(c.x-n.x)<60&&Math.abs(c.y-n.y)<40;
 /* certains PNJ font les cent pas (sauf quand Croc est tout près ou leur parle) */
 if(n.walk&&!near&&!n.talk&&n.startle<=0){n.wt=(n.wt||0)-dt;if(n.wt<=0){n.mv=n.mv?0:1;n.wt=n.mv?rnd(1.6,3):rnd(1.2,2.6);if(n.mv&&Math.abs(n.x-n.x0)>10)n.face=sgn(n.x0-n.x)}
  if(n.mv){n.x+=n.face*13*dt;n.wp=((n.wp||0)+dt*1.6)%1;if(Math.abs(n.x-n.x0)>18){n.x=n.x0+sgn(n.x-n.x0)*18;n.mv=0;n.wt=rnd(1,2)}}else n.wp=0}
 else{n.mv=0;n.wp=0}
 if(!n.talk&&near)n.face=sgn(c.x-n.x)}
function propStep(p,I,dt){if(!p.alive)return;const f=floorAt(I,p.x-p.w/2+1,p.x+p.w/2-1,p.y,.5,true,p);if(f===null){p.vy=Math.min(400,(p.vy||0)+900*dt);const ny=p.y+p.vy*dt;const f2=floorAt(I,p.x-p.w/2+1,p.x+p.w/2-1,p.y,ny-p.y+.5,true,p);if(f2!==null){p.y=f2;p.vy=0}else p.y=ny;if(p.y>I.R.ph+60)p.alive=0}else p.vy=0}

/* ---------- interactions ---------- */
function findNear(c,I){let best=null,bd=1e9;
 for(const n of I.npcs){const d=Math.abs(n.x-c.x);if(d<26&&Math.abs(n.y-c.y)<22&&d<bd){bd=d;best={k:'npc',o:n,x:n.x,y:n.y-34,label:'PARLER'}}}
 if(I.eil){const e=I.eil,d=Math.abs(e.x-c.x);if(d<30&&Math.abs(e.y-c.y)<22&&d<bd){bd=d;best={k:'eil',o:e,x:e.x,y:e.y-40,label:'PARLER'}}}
 for(const x of I.R.g.exits)if(x.mode==='porte'&&c.x>x.x0-6&&c.x<x.x1+6&&c.y>x.y0&&c.y<=x.y1+1)best={k:'exit',o:x,x:(x.x0+x.x1)/2,y:x.y0-8,label:x.label||'ENTRER'};
 return best}
async function interact(t){
 const c=S.croc;
 if(t.k==='exit'){const d=S.cur.R.g.doors.find(d=>Math.abs(d.x+d.w/2-t.x)<40);if(d)d.opening=0.001;fx('door',t.x,t.o.y1);c.vx=0;setSt(c,'idle');goRoom(t.o.to,t.o.sp,.45);return}
 S.mode='talk';c.vx=0;setSt(c,'idle');c.face=sgn(t.x-c.x);inputClear();
 try{
  if(t.k==='eil'){t.o.face=-c.face;fx('heart',t.o.x,t.o.y-30,4);snd('heart');
   await DLG.say([{who:'croc'},{who:'sys',t:`[SYSTÈME] ${D.frere||'???'}. Son frère. Statut : PAS un NPC.`}]);S.metEil=1}
  else{const n=t.o;n.face=-c.face;n.talk=1;await DLG.say([{who:'pnj',name:n.name,pal:n.pi%NPC_PALS.length,t:pick(LINES())},{who:'croc'}]);n.talk=0}
 }catch(e){console.error(e)}
 if(S&&S.mode==='talk')S.mode='play';inputClear();
}
function hurtCroc(why){const c=S.croc;if(S.mode!=='play'||c.inv>0||c.st==='roll')return;setSt(c,'hurt');c.vx=-c.face*60;S.mode='dead';S.deadT=0;S.hit=.16;S.slowOn=false;fx('hurt',c.x,c.y-14,why==='chute'?0:1);toast(why==='chute'?'[SYSTÈME] CHUTE. REMBOBINAGE…':'[SYSTÈME] TOUCHÉ. REMBOBINAGE…')}

/* =====================================================================
   6. CASSETTE : chaque image est enregistrée (positions, états) ;
   on peut rembobiner après un échec, ou revoir les dernières secondes.
   ===================================================================== */
const CST=['idle','run','jump','fall','land','landH','roll','atk','pilon','pilonL','crouch','hurt'];
const MST=['patrol','idle','alert','chase','windup','strike','recover','tell','charge','skid','stun'];
const snapCroc=c=>[c.x,c.y,c.vx,c.vy,c.face,c.onG?1:0,CST.indexOf(c.st),c.stT,c.ak==='air'?1:0,c.hitDone,c.lunged,c.rollD,c.inv,c.peakY,c.ph,c.h,c.jcut?1:0];
function loadCroc(c,a){c.x=a[0];c.y=a[1];c.vx=a[2];c.vy=a[3];c.face=a[4];c.onG=!!a[5];c.st=CST[a[6]]||'idle';c.stT=a[7];c.ak=a[8]?'air':'sol';c.hitDone=a[9];c.lunged=a[10];c.rollD=a[11];c.inv=a[12];c.peakY=a[13];c.ph=a[14];c.h=a[15];c.jcut=!!a[16]}
function snapRoom(I){const m=[];for(const o of I.mons)m.push(o.x,o.y,o.vx,o.vy,o.face,MST.indexOf(o.st),o.t,o.t0,o.hp,o.alive,o.dead,o.ph,o.onG?1:0);
 const n=[];for(const o of I.npcs)n.push(o.x,o.face,o.startle,o.jy,o.jv,o.mv||0,o.wp||0);const p=[];for(const o of I.props)p.push(o.alive,o.y);
 return[m,n,p,I.neons.map(o=>o.on),I.tubes.map(o=>o.alive),I.decals.length]}
function loadRoom(I,s){const[m,n,p,ne,tu,dl]=s;I.mons.forEach((o,i)=>{const b=i*13;o.x=m[b];o.y=m[b+1];o.vx=m[b+2];o.vy=m[b+3];o.face=m[b+4];o.st=MST[m[b+5]]||'patrol';o.t=m[b+6];o.t0=m[b+7];o.hp=m[b+8];o.alive=m[b+9];o.dead=m[b+10];o.ph=m[b+11];o.onG=!!m[b+12]});
 I.npcs.forEach((o,i)=>{const b=i*7;o.x=n[b];o.face=n[b+1];o.startle=n[b+2];o.jy=n[b+3];o.jv=n[b+4];o.mv=n[b+5];o.wp=n[b+6]});I.props.forEach((o,i)=>{o.alive=p[i*2];o.y=p[i*2+1]});
 I.neons.forEach((o,i)=>o.on=ne[i]);I.tubes.forEach((o,i)=>o.alive=tu[i]);if(I.decals.length>dl)I.decals.length=dl}
function record(){const f={rt:S.rt,room:S.cur.id,c:snapCroc(S.croc),r:snapRoom(S.cur),cam:[S.cam.x,S.cam.y],k:S.kills,sl:S.slowView,ev:S.ev};S.ev=[];S.rec.push(f);
 if(S.rec.length>60&&S.rt-S.rec[60].rt>22){S.rec.splice(0,60);S.entry=Math.max(0,S.entry-60)}}
function loadFrame(f){if(S.cur.id!==f.room)S.cur=room(f.room);loadRoom(S.cur,f.r);loadCroc(S.croc,f.c);S.cam.x=f.cam[0];S.cam.y=f.cam[1];S.kills=f.k;S.slowView=f.sl}
function startRewind(){
 const rec=S.rec,last=rec.length-1;
 if(last<S.entry||last<0){respawnRoom();return}
 const now=rec[last].rt,id=S.cur.id;let tgt=S.entry;
 for(let j=last;j>=S.entry;j--){const f=rec[j];if(f.room!==id){tgt=j+1;break}if(now-f.rt>=1.5&&f.c[5]&&f.c[6]!==CST.indexOf('hurt')){tgt=j;break}}
 tgt=clamp(tgt,S.entry,last);
 const dur=RM?.25:clamp((last-tgt)/60*.35,.45,1.1);
 S.rw={i:last,tgt,spd:(last-tgt)/dur};S.mode='rewind';S.ev=[];snd('rembobine',dur);snd('clic');
}
function respawnRoom(){const I=S.cur;S.rooms[I.id]=null;delete S.rooms[I.id];const sp=Object.keys(I.R.g.spawns)[0];S.croc=null;enterRoom(I.id,sp,true);S.mode='play'}
function rewindStep(rdt){const r=S.rw;r.i-=r.spd*rdt;S.glitch=Math.max(S.glitch,.7);
 if(r.i<=r.tgt){loadFrame(S.rec[r.tgt]);S.rec.length=r.tgt+1;S.croc.inv=1.1;S.croc.rib=null;S.mode='play';S.fails++;S.hit=0;S.slowOn=false;PARTS=PARTS.filter(p=>p.t==='txt');snd('clic');toast('[SYSTÈME] ON REPREND.');return}
 loadFrame(S.rec[Math.floor(r.i)])}
function startReplay(auto){
 if(S.rec.length<20){toast('[SYSTÈME] RIEN À RELIRE.');snd('err');return}
 S.saved={cur:S.cur.id,croc:snapCroc(S.croc),rooms:Object.values(S.rooms).map(I=>[I,snapRoom(I),I.decals.slice()]),cam:[S.cam.x,S.cam.y],kills:S.kills,mode:S.mode,parts:PARTS,slow:S.slowView};
 PARTS=[];const end=S.rec.length-1,lim=S.rec[end].rt-20;let st=end;while(st>0&&S.rec[st-1].rt>=lim)st--;
 S.rp={i:end,start:st,end,ph:'rew',t:0,auto,dur:RM?.3:1.1};S.mode='replay';S.slowOn=false;snd('clic');snd('rembobine',S.rp.dur);live('Relecture de la cassette');
}
function replayStep(rdt,ff){const r=S.rp;
 if(r.ph==='rew'){r.i-=(r.end-r.start)/r.dur*rdt;S.glitch=Math.max(S.glitch,.55);if(r.i<=r.start){r.i=r.start;r.ph='play';r.t=S.rec[r.start].rt;loadFrame(S.rec[r.start]);snd('clic');return}loadFrame(S.rec[Math.floor(r.i)]);return}
 r.t+=rdt*(ff?3:1);while(r.i<r.end&&S.rec[r.i+1].rt<=r.t){r.i++;for(const e of S.rec[r.i].ev)runFx(e[0],e.slice(1),true)}
 loadFrame(S.rec[r.i]);if(r.i>=r.end)stopReplay()}
function stopReplay(){const s=S.saved;if(!s)return;S.saved=null;for(const[I,sn,dec]of s.rooms){I.decals=dec;loadRoom(I,sn)}S.cur=room(s.cur);loadCroc(S.croc,s.croc);S.cam.x=s.cam[0];S.cam.y=s.cam[1];S.kills=s.kills;PARTS=s.parts;S.slowView=s.slow;S.croc.rib=null;
 const auto=S.rp&&S.rp.auto;S.rp=null;snd('stop');S.mode=auto||S.fin?'end':(s.mode==='replay'?'play':s.mode);if(S.mode==='end')showEnd();}
/* ---------- passage d'une zone à l'autre (glitch de bande) ---------- */
function goRoom(to,sp,delay=0){if(S.mode!=='play')return;if(to==='fin'){finish();return}S.mode='trans';S.tr={t:-delay,to,sp,sw:false};}
function transStep(rdt){const tr=S.tr;tr.t+=rdt;for(const d of S.cur.R.g.doors)if(d.opening&&d.opening<1)d.opening=Math.min(1,d.opening+rdt*3);const half=RM?.12:.3;if(tr.t>0){S.glitch=Math.max(S.glitch,1-Math.abs(tr.t-half)/half)}
 if(tr.t>=0&&!tr.snd){tr.snd=1;snd('rembobine',.5)}
 if(!tr.sw&&tr.t>=half){tr.sw=true;enterRoom(tr.to,tr.sp,false,ZI[tr.to]&&S.cur.R.g.exits.some(e=>e.to===tr.to&&e.mode==='bord'))}
 if(tr.t>=half*2)S.mode='play'}
function finish(){S.mode='end';S.fin=true;S.endT=0;S.card={t:0,fin:1};snd('stop');
 const st=stats(),tm=S.clock;st.fins++;st.total+=S.kills-(S.killsSaved||0);S.killsSaved=S.kills;if(!st.best||tm<st.best)st.best=tm;store.set(STORE,st);live('Fin de la bande');
 setTimeout(()=>{if(S&&S.mode==='end'&&V&&!S.rp)startReplay(true)},RM?600:1900)}
/* ---------- messages ---------- */
function toast(t){if(S)S.toast={t:0,txt:t}}
function live(t){if(V&&V.live)V.live.textContent=t}

/* =====================================================================
   7. RENDU
   Le monde est dessiné dans un petit canevas (W×216), puis agrandi en
   pixels entiers sur l'écran avec le filtre VHS (aberration chromatique,
   lignes de balayage, bruit, décrochages). Le HUD est dessiné par-dessus,
   net, à la résolution de l'écran.
   ===================================================================== */
function camUpdate(rdt,snap){const c=S.croc,I=S.cur,cam=S.cam,W=V?V.W:384;
 cam.look=appr(cam.look,c.face*W*.1+clamp(c.vx*.22,-30,30),(snap?999:rdt*150));
 const tx=clamp(c.x-W/2+cam.look,0,Math.max(0,I.R.pw-W)),ty=clamp(c.y-VH*.64,0,Math.max(0,I.R.ph-VH));
 if(snap){cam.x=tx;cam.y=ty;return}
 cam.x+=(tx-cam.x)*(1-Math.exp(-rdt*5.5));cam.y+=(ty-cam.y)*(1-Math.exp(-rdt*(c.onG?6:3.2)))}
function flick(fl,seed,T){if(!fl)return 1;if(fl===3)return .82+.18*Math.sin(T*2.2+seed*9);
 const t=T*(fl===2?8:2.6)+seed*100,n=Math.sin(t*1.7)*Math.sin(t*.63+1)*Math.sin(t*2.9+2);
 if(fl===1)return n>.8?.12:1;return n>.3?(Math.sin(t*37)>0?.08:.55):1}
function rimFor(I,x,y){let best=null,bd=110;for(const L of I.lights){if(!(L.it>.1))continue;const d=Math.hypot(L.x-x,(L.y-y)*1.3);if(d<bd){bd=d;best=L}}
 return best?{col:best.col,d:best.x<x?-1:1,a:clamp(1.15-bd/110,.3,1)*.9}:{col:'#3e3158',d:-1,a:.7}}
/* ---------- pluie (3 plans) ---------- */
const WIND=-.2;
function newDrop(any){const l=Math.random(),layer=l<.45?0:l<.85?1:2;return{x:rnd(-20,V.W+40),y:any?rnd(-20,VH):rnd(-40,-4),layer,v:[270,370,480][layer]*rnd(.9,1.1),len:[3,5,8][layer]}}
function rainInit(){V.drops=[];const n=Math.round(V.W*VH/250);for(let i=0;i<n;i++)V.drops.push(newDrop(true))}
const RCOL=['#2e2850','#5f5888','#a29cd0'],RPAR=[.45,1,1.35];
function rainStep(gdt,dcx,dcy){for(const d of V.drops){d.y+=d.v*gdt;d.x+=d.v*gdt*WIND;d.x-=dcx*RPAR[d.layer];d.y-=dcy*RPAR[d.layer];if(d.y>VH+10||d.x<-30||d.x>V.W+40){Object.assign(d,newDrop(false))}}}
function rainDraw(g,ts){const k=Math.max(.35,Math.sqrt(ts));for(const d of V.drops){g.fillStyle=RCOL[d.layer];const n=Math.max(1,Math.round(d.len*k));const x0=Math.round(d.x),y0=Math.round(d.y);for(let i=0;i<n;i++)g.fillRect(x0-Math.round(i*WIND),y0-i,1,1)}}
/* ---------- éléments animés ---------- */
function drawDoor(g,d,cx,cy){const X=Math.round(d.x-cx),Y=Math.round(d.y-cy-d.h);if(X>V.W+30||X+d.w<-30)return;
 R_(g,X-2,Y-2,d.w+4,d.h+2,'#0b0709');const o=d.open?1:d.opening?Math.min(1,d.opening):0;
 R_(g,X,Y,d.w,d.h,o>0?'#030203':d.col);
 if(o<1){const pw=Math.round(d.w*(1-o));R_(g,X,Y,pw,d.h,d.col);R_(g,X+1,Y+1,pw-2,1,hex2('#ffffff',.12));for(let i=4;i<d.h-4;i+=8)R_(g,X+2,Y+i,Math.max(0,pw-4),1,hex2('#000000',.25));if(pw>6)R_(g,X+pw-4,Y+d.h/2,2,2,'#c9c0aa')}
 if(d.num){drawText(g,d.num,X+2,Y+4,'#c9a86a',1);}
 if(d.rouge){g.globalCompositeOperation='lighter';g.globalAlpha=.55;R_(g,X-1,Y+d.h-1,d.w+2,1,'#ff2b45');g.globalAlpha=.25;R_(g,X-3,Y-3,d.w+6,1,'#ff2b45');R_(g,X-3,Y-3,1,d.h+3,'#ff2b45');R_(g,X+d.w+2,Y-3,1,d.h+3,'#ff2b45');g.globalAlpha=1;g.globalCompositeOperation='source-over'}}
function drawProp(g,p,cx,cy){const X=Math.round(p.x-cx-p.w/2),Y=Math.round(p.y-cy-p.h);if(X>V.W+20||X<-30)return;
 if(p.k==='crate'){R_(g,X,Y,12,12,'#4e321f');R_(g,X,Y,12,1,'#7a5238');R_(g,X,Y+11,12,1,'#2a1a10');R_(g,X,Y,1,12,'#6a4630');R_(g,X+11,Y,1,12,'#2a1a10');for(let i=1;i<11;i++){R_(g,X+i,Y+i,1,1,'#3a2418');R_(g,X+11-i,Y+i,1,1,'#3a2418')}R_(g,X+1,Y+5,10,1,'#3a2418')}
 else{R_(g,X,Y+1,10,13,'#2c3a48');R_(g,X+1,Y,8,2,'#5a6a7a');R_(g,X,Y+4,10,1,'#1c2632');R_(g,X,Y+9,10,1,'#1c2632');R_(g,X+1,Y+2,1,11,'#4a5a6a');R_(g,X+8,Y+2,1,11,'#18202a');R_(g,X+3,Y+6,4,2,'#8a6a20')}}
function drawTube(g,T,cx,cy){const X=Math.round(T.x-cx),Y=Math.round(T.y-cy);if(X<-20||X>V.W+20)return;R_(g,X-9,Y,18,2,'#2c2838');R_(g,X-9,Y,18,1,'#4a4458');
 if(T.alive){const on=T.lit>.4;R_(g,X-8,Y+2,16,2,on?'#eafcff':'#4a5060');if(on)R_(g,X-8,Y+4,16,1,'#9fd8e8')}else{R_(g,X-8,Y+2,5,2,'#4a5060');L(g,X+3,Y+2,X+5,Y+9,'#1a1622',1);if(Math.sin(S.T*30+T.seed*50)>.96)R_(g,X+5,Y+9,1,1,'#fff7d0')}}
function drawDecal(g,d,cx,cy){const X=Math.round(d.x-cx),Y=Math.round(d.y-cy);if(X<-40||X>V.W+40)return;
 if(d.k==='splat'){R_(g,X-7,Y-1,14,1,'#1a0f22');R_(g,X-4,Y-2,9,1,'#1a0f22');R_(g,X-10,Y-1,2,1,'#1a0f22');R_(g,X+8,Y-1,3,1,'#1a0f22');R_(g,X-2,Y-1,2,1,'#5a0a16');R_(g,X+3,Y-2,1,1,'#5a0a16')}
 else{const s=d.s||1;g.fillStyle='#0b0910';for(const a of[-.4,.3,2.9,3.5]){for(let i=0;i<8*s;i++)g.fillRect(Math.round(X+Math.cos(a)*i),Math.round(Y-1+Math.sin(a)*i*.25),1,1)}}}
function drawNeon(g,N,cx,cy){const n=N.n,X=Math.round(n.x-cx),Y=Math.round(n.y-cy);if(X>V.W+10||X+n.w<-10)return;g.drawImage(N.on&&N.lit>.4?n.cOn:n.cOff,X-1,Y-1)}
function drawLabelS(g,txt,x,top,fg,bg,bd){K.drawLabel(g,txt,Math.round(x),Math.round(top),fg,bg,bd)}
/* ---------- le monde ---------- */
function render(rdt){
 const g=V.g,W=V.W,I=S.cur,R=I.R,cam=S.cam,T=S.T,c=S.croc;
 const cx=Math.round(cam.x),cy=Math.round(cam.y);
 for(const Lt of I.lights){let it=Lt.on?flick(Lt.fl,Lt.seed,S.rt):0;if(Lt.src){if(Lt.src.n){it*=Lt.src.on?1:0;Lt.src.lit=it}else{it*=Lt.src.alive?1:0;Lt.src.lit=it}}Lt.it=it}
 /* fonds */
 for(const Lr of R.layers){const ox=Math.round(cx*(Lr.f||0)),oy=Math.round(cy*(Lr.fy||0));
  if(Lr.tile){const w=Lr.c.width;for(let x=-(ox%w);x<W;x+=w)g.drawImage(Lr.c,x,-oy);
   if(Lr===R.layers[1]&&R.blink){for(const[bx,by]of R.blink){const sx=((bx-ox)%w+w)%w;if(sx<W&&Math.sin(S.rt*2.2+bx)>.2){g.fillStyle='#ff2b45';g.fillRect(sx,by-oy,1,1)}}}
   if(Lr===R.layers[2]&&R.skyGl){g.globalCompositeOperation='lighter';for(const[gx,gy,gh,gc]of R.skyGl){const sx=((gx-ox)%w+w)%w;if(sx<W+20){g.globalAlpha=.35*flick(1,gx,S.rt);g.drawImage(glowPX(gh*.8,gc,1,1.8),sx-gh*.8,gy-oy-gh*.8)}}g.globalAlpha=1;g.globalCompositeOperation='source-over'}}
  else g.drawImage(Lr.c,W-Lr.c.width,0);
  if(Lr===R.layers[0]){if(S.bolt&&S.bolt.t<.32&&(S.bolt.t<.07||(S.bolt.t>.12&&S.bolt.t<.2))){g.fillStyle='rgba(210,190,255,.22)';g.fillRect(0,0,W,VH);g.fillStyle='#f4f0ff';for(let i=1;i<S.bolt.p.length;i++){const[a,b]=S.bolt.p[i-1],[e,f]=S.bolt.p[i];L(g,a,b,e,f,'#f4f0ff',1)}}}}
 g.drawImage(R.stat,cx,cy,W,VH,0,0,W,VH);
 for(const d of R.g.doors)drawDoor(g,d,cx,cy);
 for(const N of I.neons)drawNeon(g,N,cx,cy);
 for(const Tb of I.tubes)drawTube(g,Tb,cx,cy);
 for(const d of I.decals)drawDecal(g,d,cx,cy);
 /* rai de lune */
 for(const[a,b]of R.g.shafts){const X0=a-cx,X1=b-cx;g.globalCompositeOperation='lighter';g.globalAlpha=.12+.03*Math.sin(S.rt*1.3);g.fillStyle=dpat(g,'#bcd8ff',.5);g.beginPath();g.moveTo(X0,-cy);g.lineTo(X1,-cy);g.lineTo(X1+30,24*8-cy);g.lineTo(X0-30,24*8-cy);g.closePath();g.fill();g.globalAlpha=1;g.globalCompositeOperation='source-over'}
 for(const p of I.props)if(p.alive)drawProp(g,p,cx,cy);
 const shadow=(x,y,w)=>{const f=floorAt(I,x-2,x+2,y-2,40);if(f===null)return;const d=f-y,k=clamp(1-d/40,0,1);if(k<=0)return;const ww=Math.round(w*(.5+.5*k));g.fillStyle=dpat(g,'#05030a',.75*k);g.fillRect(Math.round(x-cx-ww/2),Math.round(f-cy-1),ww,2)};
 for(const n of I.npcs)shadow(n.x,n.y,10);if(I.eil)shadow(I.eil.x,I.eil.y,12);for(const m of I.mons)if(m.alive)shadow(m.x,m.y,m.k==='k'?24:m.k==='g'?18:12);if(c.st!=='roll')shadow(c.x,c.y,14);
 /* PNJ, Eilyn, monstres */
 for(const n of I.npcs){const X=n.x-cx;if(X<-30||X>W+30)continue;const rm=rimFor(I,n.x,n.y-14);stamp(g,x=>drawNPC(x,n,T),X,n.y-cy,n.face,{rim:rm.col,rd:rm.d,ra:rm.a*.8})}
 if(I.eil){const e=I.eil,X=Math.round(e.x-cx),Y=Math.round(e.y-cy);if(X>-30&&X<W+30){const fr=eilFrame(S.rt+e.seed*3),sp=eilProf(fr),gl=tinted('eilp'+fr,sp,'#8fe3f0'),flip=S.croc.x>e.x;g.save();if(flip){g.translate(X*2,0);g.scale(-1,1)}g.globalAlpha=.28+.14*Math.sin(S.rt*3);for(const[dx,dy]of[[-1,0],[1,0],[0,-1]])g.drawImage(gl,X-9+dx,Y-30+dy);g.globalAlpha=1;g.drawImage(sp,X-9,Y-30);g.restore()}}
 for(const m of I.mons){if(!m.alive&&m.dead>.85)continue;const X=m.x-cx;if(X<-60||X>W+60)continue;
  const tel=(m.st==='windup'||m.st==='tell')&&m.alive&&Math.floor(S.rt*14)%2;const rm=rimFor(I,m.x,m.y-12);
  stamp(g,m.k==='k'?x=>drawChargeur(x,m,T):x=>drawRodeur(x,m,T,m.k==='g'?1.45:1),X,m.y-cy,m.face,{rim:rm.col==='#3e3158'?'#6a4a98':rm.col,rd:rm.d,ra:.85,flash:m.flash>0?'#ffffff':tel?'#ff2b45':null,fa:m.flash>0?1:.45,dis:m.alive?0:clamp(m.dead/.8,0,1)})}
 /* Croc : traînées, sprite articulé, marteau, ruban */
 drawCroc(g,c,cx,cy,rdt);
 /* particules */
 drawParts(g,cx,cy);
 /* eau, flaques */
 for(const[a,b,wy]of R.g.waters){const X0=a-cx,X1=b-cx,Y=wy-cy;g.globalAlpha=.6;g.fillStyle='#0b2733';g.fillRect(X0,Y,X1-X0,R.ph-wy);g.globalAlpha=1;R_(g,X0,Y,X1-X0,1,'#1f6f86');for(let x=Math.max(0,Math.round(X0));x<Math.min(W,X1);x++){if((x+cx+Math.floor(S.rt*14))%9===0)R_(g,x,Y,2,1,'#8fe3f0');if((x+cx*1+Math.floor(S.rt*6))%23===0)R_(g,x,Y+3,3,1,'#2a8aa0')}}
 for(const[a,b]of R.g.puddles){const y=R.surf[a];if(y==null)continue;const X0=a*8-cx,X1=b*8-cx,Y=y-cy;if(X1<0||X0>W)continue;R_(g,X0+2,Y,X1-X0-4,1,'#0c0a16');const col=nearNeonCol(I,(a+b)*4);for(let x=Math.max(0,X0+2);x<Math.min(W,X1-2);x++)if(Math.sin(x*.9+S.rt*3.1)>.55)R_(g,x,Y,1,1,col)}
 /* avant-plan (silhouettes) */
 if(R.Z.th==='ruelle'||R.Z.th==='souterrains')fgDraw(g,R,cx,cy);
 /* lumières additives */
 g.globalCompositeOperation='lighter';
 for(const Lt of I.lights){if(!(Lt.it>.03))continue;const sx=Lt.x-cx,sy=Lt.y-cy;if(sx<-Lt.r*1.6||sx>W+Lt.r*1.6||sy<-Lt.r*1.6||sy>VH+Lt.r*1.6)continue;
  g.globalAlpha=Lt.a*Lt.it;g.drawImage(glowPX(Lt.r,Lt.col,1,1.6),Math.round(sx-Lt.r),Math.round(sy-Lt.r));g.globalAlpha=Lt.a*Lt.it*.32;const r2=Math.round(Lt.r*1.7);g.drawImage(sglow(r2,Lt.col),Math.round(sx-r2),Math.round(sy-r2));
  if(Lt.cone){g.globalAlpha=.18*Lt.it;g.fillStyle=dpat(g,'#cdefff',.5);g.beginPath();g.moveTo(sx-7,sy-8);g.lineTo(sx+7,sy-8);g.lineTo(sx+30,sy+80);g.lineTo(sx-30,sy+80);g.closePath();g.fill()}}
 for(const m of I.mons){if(!m.alive)continue;const k=m.k==='g'?1.45:1,ex=m.x+m.face*(m.k==='k'?15:11*k)-cx,ey=m.y-(m.k==='k'?13:19*k)-cy;if(ex<-10||ex>W+10)continue;g.globalAlpha=(m.st==='windup'||m.st==='tell'||m.st==='charge')?.9:.5;g.drawImage(glowPX(5,'#ff2b45',1,1.3),Math.round(ex-5),Math.round(ey-5))}
 if(I.eil){g.globalAlpha=.09+.04*Math.sin(S.rt*2);g.drawImage(glowPX(26,'#8fe3f0',1,1.8),Math.round(I.eil.x-cx-26),Math.round(I.eil.y-cy-38))}
 g.globalAlpha=1;g.globalCompositeOperation='source-over';
 /* Eilyn redessiné par-dessus la lumière : il reste lisible sous le rai de lune */
 if(I.eil){const e=I.eil,X=Math.round(e.x-cx),Y=Math.round(e.y-cy);if(X>-30&&X<W+30){const sp=eilProf(eilFrame(S.rt+e.seed*3));g.save();if(S.croc.x>e.x){g.translate(X*2,0);g.scale(-1,1)}g.globalAlpha=.7;g.drawImage(sp,X-9,Y-30);g.restore();g.globalAlpha=1}}
 /* pluie */
 if(R.Z.pluie){const ts=S.mode==='play'?1-.7*S.slow:1;rainDraw(g,ts)}
 if(S.light>0){g.fillStyle=`rgba(200,190,255,${S.light*.12})`;g.fillRect(0,0,W,VH)}
 /* ralenti : monde désaturé et bleui */
 const sv=S.slowView||0;
 if(sv>.01){g.globalCompositeOperation='saturation';g.globalAlpha=.8*sv;g.fillStyle='#808080';g.fillRect(0,0,W,VH);g.globalCompositeOperation='multiply';g.globalAlpha=.42*sv;g.fillStyle='#6e7cff';g.fillRect(0,0,W,VH);g.globalCompositeOperation='screen';g.globalAlpha=.08*sv;g.fillStyle='#ff3fa4';g.fillRect(0,0,W,VH);g.globalAlpha=1;g.globalCompositeOperation='source-over'}
 /* traînées et œil rouge (restent vives) */
 for(const gh of c.ghosts){const a=(1-gh.life/gh.max)*.32;stampPut(g,gh.c,Math.round(gh.x-cx),Math.round(gh.y-cy),gh.face,0,0,a,gh.rot)}
 if(sv>.2&&c.eyes.length>1){for(let i=1;i<c.eyes.length;i++){const[a,b]=c.eyes[i-1],[e,f]=c.eyes[i];g.globalAlpha=i/c.eyes.length*.9;L(g,a-cx,b-cy,e-cx,f-cy,'#ff2b45',1)}g.globalAlpha=1}
 /* étiquettes (vue de Croc) */
 if(S.mode!=='replay'&&S.mode!=='rewind'){
  for(const n of I.npcs){const X=n.x-cx;if(X<-20||X>W+20)continue;const near=S.near&&S.near.o===n;drawLabelS(g,'NPC',X,n.y-cy-(n.v==='pluie'?40:31)-Math.round(n.jy||0),near?COL.bone:COL.gray2,COL.ink,near?COL.bone:COL.gray)}
  if(I.eil){const e=I.eil,X=e.x-cx;if(X>-40&&X<W+40){drawLabelS(g,(D.frere||'???').toUpperCase()+' ♥',X,e.y-cy-33,COL.bone,COL.blood0,COL.bone);const b=Math.floor(S.rt*2)%2;drawText(g,'♥',Math.round(X-2),Math.round(e.y-cy-51-b),COL.blood2,1)}}
  if(S.near&&S.mode==='play'){const t=S.near,b=Math.floor(S.rt*3)%2,tx=(V.touch?'▼ ':'E ')+t.label,y=t.k==='exit'?t.y-cy:t.k==='npc'?t.o.y-cy-(t.o.v==='pluie'?40:31)-16:t.y-cy-16;drawLabelS(g,tx,t.x-cx,y-b,COL.ink,COL.ice,COL.white)}}
 if(S.mode==='dead'||S.mode==='rewind'){g.globalCompositeOperation='multiply';g.fillStyle='#ff8a9a';g.globalAlpha=.5;g.fillRect(0,0,W,VH);g.globalAlpha=1;g.globalCompositeOperation='source-over'}
}
function nearNeonCol(I,x){let best='#4a4258',bd=220;for(const N of I.neons){if(!N.on||N.lit<.4)continue;const d=Math.abs(N.n.x+N.n.w/2-x);if(d<bd){bd=d;best=N.n.col}}return best}
function fgDraw(g,R,cx,cy){if(!R.fgc){const r=mulberry(R.Z.i*7+3);const w=R.pw*1.25+400;const[c,x]=mk(w,VH);for(let X=260;X<w;X+=320+r()*360){const kind=r();if(R.Z.th==='ruelle'){if(kind<.5){R_(x,X,0,5,VH,'#050308');R_(x,X+4,0,1,VH,'#151020');R_(x,X-6,40+r()*40,17,3,'#050308')}else{for(let i=0;i<3;i++){const y0=r()*60;for(let k=0;k<200;k++)R_(x,X+k,y0+Math.sin(k/200*Math.PI)*18,1,1,'#050308')}}}
  else{R_(x,X,0,8,VH,'#040306');R_(x,X+7,0,1,VH,'#120e18');for(let y=r()*20;y<VH;y+=14)R_(x,X-1,y,14,2,'#040306')}}R.fgc=c}
 g.drawImage(R.fgc,-Math.round(cx*1.25)+0,-Math.round(cy*1.1))}
function drawParts(g,cx,cy){
 for(const p of PARTS){const k=1-p.life/p.max,X=Math.round(p.x-cx),Y=Math.round(p.y-cy);if(X<-30||X>V.W+30||Y<-40||Y>VH+40)continue;
  switch(p.t){
  case'dust':case'smoke':case'steam':{const r=Math.round((p.s||1)*(1.5+p.life*7));g.fillStyle=dpat(g,p.col,k*(p.t==='steam'?.35:.7));g.fillRect(X-r,Y-r,r*2+1,r*2+1);break}
  case'spark':{g.fillStyle=k>.5?'#ffffff':p.col;const n=Math.max(1,Math.round(4*k));for(let i=0;i<n;i++)g.fillRect(Math.round(X-p.vx*.012*i),Math.round(Y-p.vy*.012*i),1,1);break}
  case'shard':{g.fillStyle=p.col;g.fillRect(X,Y,Math.floor(p.life*20)%2?2:1,1);if(!p.rest&&Math.floor(p.life*30)%3===0){g.fillStyle='#fff';g.fillRect(X,Y,1,1)}break}
  case'plank':g.fillStyle=p.col;g.fillRect(X,Y,p.rest?p.w:(Math.floor(p.life*16)%2?p.w:p.h),p.rest?p.h:(Math.floor(p.life*16)%2?p.h:p.w));break;
  case'ichor':g.fillStyle=p.col;g.fillRect(X,Y,p.s||1,p.s||1);break;
  case'ring':{const r=Math.round((p.r||10)*(1-k*k*0)*(p.life/p.max)+2);g.fillStyle=p.col;g.globalAlpha=k;for(let i=-r;i<=r;i+=1){const yy=Math.round(Math.sqrt(Math.max(0,1-(i*i)/(r*r)))*r*.22);g.fillRect(X+i,Y-yy,1,1);g.fillRect(X+i,Y+yy-1,1,1)}g.globalAlpha=1;break}
  case'heart':if(k>.2||Math.floor(p.life*20)%2)drawText(g,'♥',X-2,Y-3,p.col,1);break;
  case'txt':if(k>.25||Math.floor(p.life*20)%2){drawText(g,p.txt,X-Math.floor(textW(p.txt)/2)+1,Y+1,COL.ink,1);drawText(g,p.txt,X-Math.floor(textW(p.txt)/2),Y,p.col,1)}break;
  case'drip':g.fillStyle='#8fd8e6';g.fillRect(X,Y,1,2);break;
  case'mote':g.globalAlpha=Math.sin(k*Math.PI)*.8;g.fillStyle='#dfefff';g.fillRect(X,Y,1,1);g.globalAlpha=1;break;
  default:g.fillStyle=p.col||'#fff';g.fillRect(X,Y,p.s||1,p.s||1)}}}
function drawCroc(g,c,cx,cy,rdt){
 const P=crocPose(c,S.T);c.P=P;const f=c.face;const X0=c.x-cx,Y0=c.y-cy;
 const toW=(lx,ly)=>[c.x+(f>0?lx:-lx-0),c.y+ly];
 /* ruban (bandage) noué au manche : petite corde à ressort */
 const geo=hammerGeo(P.G1,P.a);const an=toW(geo.pom[0],geo.pom[1]);
 if(!c.rib){c.rib=[];for(let i=0;i<6;i++)c.rib.push([an[0]-i*1.5,an[1]+i*1.6,an[0]-i*1.5,an[1]+i*1.6])}
 const live_=S.mode!=='replay'&&S.mode!=='rewind'?1:1,dt=Math.min(.033,rdt);
 if(dt>0){c.rib[0][0]=an[0];c.rib[0][1]=an[1];const wind=S.cur.R.Z.ext?-30+Math.sin(S.rt*3.7)*18:0;
  for(let i=1;i<c.rib.length;i++){const p=c.rib[i];const vx=(p[0]-p[2])*.94,vy=(p[1]-p[3])*.94;p[2]=p[0];p[3]=p[1];p[0]+=vx+(wind-c.face*25)*dt*dt*6;p[1]+=vy+170*dt*dt}
  for(let it=0;it<3;it++)for(let i=1;i<c.rib.length;i++){const a=c.rib[i-1],b=c.rib[i];const dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy)||.01,df=(d-2.1)/d;if(i===1){b[0]-=dx*df;b[1]-=dy*df}else{a[0]+=dx*df*.5;a[1]+=dy*df*.5;b[0]-=dx*df*.5;b[1]-=dy*df*.5}}}
 /* traînée du coup de marteau (croissant blanc) */
 if(c.st==='atk'||c.st==='pilon'){const k=c.stT;if((c.st==='atk'&&k>=ATK.w-.01&&k<=ATK.w+ATK.s+.02)||(c.st==='pilon'&&k>.1)){const o=toW(P.G1[0]+Math.cos(P.a)*31,P.G1[1]+Math.sin(P.a)*31),i=toW(P.G1[0]+Math.cos(P.a)*15,P.G1[1]+Math.sin(P.a)*15);c.smear.push([o[0],o[1],i[0],i[1],S.rt])}}
 c.smear=c.smear.filter(s=>S.rt-s[4]<.11);
 if(c.smear.length>1){for(let i=1;i<c.smear.length;i++){const a=c.smear[i-1],b=c.smear[i];const al=1-(S.rt-b[4])/.11;g.globalAlpha=clamp(al,0,1)*.95;poly(g,[[a[0]-cx,a[1]-cy],[b[0]-cx,b[1]-cy],[b[2]-cx,b[3]-cy],[a[2]-cx,a[3]-cy]],'#f4f0ff');g.globalAlpha=clamp(al,0,1)*.7;L(g,a[0]-cx,a[1]-cy,b[0]-cx,b[1]-cy,'#8fe3f0',2)}g.globalAlpha=1}
 /* fantômes (ralenti, roulade) */
 c.ghosts=c.ghosts.filter(gh=>(gh.life+=rdt)<gh.max);
 const wantG=(S.slowView>.3||c.st==='roll'||c.st==='pilon')&&S.mode!=='rewind';V.gfr=(V.gfr||0)+1;
 const rm=rimFor(S.cur,c.x,c.y-16);const blink=c.inv>0&&S.mode==='play'&&c.st!=='roll'&&Math.floor(S.rt*18)%2;
 stamp(g,x=>rig(x,P),X0,Y0,f,{rim:rm.col,rd:rm.d,ra:rm.a,rot:P.rot,a:blink?.4:1,keep:wantG&&V.gfr%3===0&&Math.hypot(c.x-(c.gx??-99),c.y-(c.gy??-99))>3.5?src=>{c.gx=c.x;c.gy=c.y;const gc=V.gpool[V.gpi=(V.gpi+1)%V.gpool.length];const gx=gc.getContext('2d');gx.globalCompositeOperation='source-over';gx.clearRect(0,0,EW,EHh);gx.drawImage(src,0,0);gx.globalCompositeOperation='source-in';gx.fillStyle=(V.gfr/3)%2?'#2fb8d0':'#d0307e';gx.fillRect(0,0,EW,EHh);gx.globalCompositeOperation='source-over';c.ghosts.push({c:gc,x:c.x,y:c.y,face:f,rot:P.rot,life:0,max:.24})}:null});
 /* œil (pour la traînée rouge au ralenti) */
 const nx=Math.round(P.S[0]+.5+P.lean*1.5),ny=Math.round(P.S[1]-2);const eye=toW(nx+4+(f>0?.5:-.5),ny-4.5);c.eyes.push(eye);if(c.eyes.length>9)c.eyes.shift();
 /* ruban */
 for(let i=1;i<c.rib.length;i++){const a=c.rib[i-1],b=c.rib[i];L(g,a[0]-cx,a[1]-cy,b[0]-cx,b[1]-cy,i>3?CP.rib2:CP.rib,1)}
}
/* ---------- émetteurs d'ambiance (pluie qui éclabousse, vapeur, gouttes, poussière de lune) ---------- */
function ambient(gdt,dcx,dcy){
 const I=S.cur,R=I.R,W=V.W,cx=S.cam.x;
 if(R.Z.pluie){rainStep(gdt,dcx,dcy);const n=gdt*W*.45;for(let i=0;i<n;i++){const wx=cx+Math.random()*W,tx=Math.floor(wx/8),y=R.surf[tx];if(y==null)continue;part({t:'px',x:wx,y:y-1,vx:rnd(-20,20),vy:rnd(-45,-20),g:300,max:.18,col:'#8f86c0'})}
  for(const n of I.npcs)if(n.v==='pluie'&&Math.random()<gdt*14)part({t:'px',x:n.x+(n.face>0?2:-2)+rnd(-8,8),y:n.y-37,vx:rnd(-25,25),vy:rnd(-30,-12),g:300,max:.2,col:'#8f86c0'});
  const c=S.croc;if(Math.random()<gdt*6)part({t:'px',x:c.x+rnd(-4,4),y:c.y-31,vx:rnd(-20,20),vy:rnd(-30,-10),g:300,max:.18,col:'#c9c3ef'});
  if(R.Z.ext){S.boltT-=gdt;if(S.boltT<=0&&!RM){S.boltT=rnd(7,14);const p=[];let bx=rnd(W*.15,W*.85),by=0;while(by<90){p.push([bx,by]);bx+=rnd(-7,7);by+=rnd(4,9)}S.bolt={t:0,p};setTimeout(()=>{if(V&&S&&S.cur.R.Z.ext)snd('thunder')},350)}}}
 if(S.bolt){S.bolt.t+=gdt;S.light=S.bolt.t<.3?(S.bolt.t<.07||(S.bolt.t>.12&&S.bolt.t<.2)?1:.2):0;if(S.bolt.t>.4)S.bolt=null}else S.light=0;
 for(const[vx,vy]of R.g.vents)if(Math.abs(vx-cx-W/2)<W&&Math.random()<gdt*9)part({t:'steam',x:vx+rnd(-4,4),y:vy-2,vx:rnd(-6,10),vy:rnd(-30,-16),fr:.97,max:rnd(1,1.8),col:'#6a6078',s:1});
 for(const[dx,dy]of R.g.drips)if(Math.random()<gdt*.7){const near=Math.abs(dx-S.croc.x)<160;part({t:'drip',x:dx,y:dy,vy:20,g:500,max:3,snd:near})}
 for(const[a,b]of R.g.shafts)if(Math.random()<gdt*8)part({t:'mote',x:rnd(a,b),y:rnd(20,180),vx:rnd(-3,3),vy:rnd(-4,4),max:rnd(2,4)});
 if(I.eil&&Math.random()<gdt*.9)part({t:'heart',x:I.eil.x+rnd(-3,3),y:I.eil.y-30,vx:rnd(-4,4),vy:-14,max:1.4,col:'#e0263d'});
 for(const N of I.neons)if(N.on&&N.n.fl===2&&N.lit<.4&&Math.random()<gdt*3&&Math.abs(N.n.x-S.croc.x)<140)fx('zap',N.n.x+rnd(0,N.n.w),N.n.y+rnd(0,N.n.h));
 partsUpdate(I,gdt);
}

/* ---------- filtre VHS + HUD (résolution écran) ---------- */
function buildPost(){
 const W=V.W,k=V.k,Wk=W*k,Hk=VH*k;
 [V.rc,V.rcx]=mk(W,VH);[V.gc,V.gcx]=mk(W,VH);
 const[s,sx]=mk(Wk,Hk);if(k>=2){sx.fillStyle='rgba(0,0,0,.24)';for(let y=k-1;y<Hk;y+=k)sx.fillRect(0,y,Wk,1);sx.fillStyle='rgba(255,255,255,.025)';for(let y=0;y<Hk;y+=k)sx.fillRect(0,y,Wk,1)}V.scan=s;
 V.noise=[];for(let n=0;n<3;n++){const p=PX(Math.ceil(Wk/2),Math.ceil(Hk/2));for(let i=0;i<p.d.length;i++){const v=Math.random();if(v<.5){const l=(Math.random()*255)|0;p.d[i]=((Math.random()*90|0)<<24|l<<16|l<<8|l)>>>0}}V.noise.push(p.toCanvas())}
 const vg=PX(W,VH);for(let y=0;y<VH;y++)for(let x=0;x<W;x++){const d=Math.hypot((x-W/2)/(W/2),(y-VH/2)/(VH/2));if(bay(x,y)<(d-.78)*1.5)vg.d[y*W+x]=0x8c000000}V.vig=vg.toCanvas();
}
function present(){
 const X=V.ox,k=V.k,W=V.W,Wk=W*k,Hk=VH*k;const vhs=V.vhs&&!RM;
 X.globalCompositeOperation='source-over';X.globalAlpha=1;X.imageSmoothingEnabled=false;X.fillStyle='#000';X.fillRect(0,0,Wk,Hk);
 const sh=RM?0:S.shake*S.shake,sx=Math.round((Math.random()*2-1)*sh*5*k),sy=Math.round((Math.random()*2-1)*sh*3.5*k);
 const z=RM?0:S.zoom;let a=0,b=0,w=W,h=VH;if(z>0){w=W*(1-z);h=VH*(1-z);a=clamp(S.zx-w/2,0,W-w);b=clamp(S.zy-h/2,0,VH-h)}
 const ab=vhs?Math.round((1+S.ab*5+(S.slowView||0)*2.5+S.glitch*3)*k/3):0;
 if(ab>=1){V.rcx.globalCompositeOperation='source-over';V.rcx.drawImage(V.buf,0,0);V.rcx.globalCompositeOperation='multiply';V.rcx.fillStyle='#ff0000';V.rcx.fillRect(0,0,W,VH);
  V.gcx.globalCompositeOperation='source-over';V.gcx.drawImage(V.buf,0,0);V.gcx.globalCompositeOperation='multiply';V.gcx.fillStyle='#00ffff';V.gcx.fillRect(0,0,W,VH);
  X.drawImage(V.gc,a,b,w,h,sx-Math.floor(ab/2),sy,Wk,Hk);X.globalCompositeOperation='lighter';X.drawImage(V.rc,a,b,w,h,sx+Math.ceil(ab/2),sy,Wk,Hk);X.globalCompositeOperation='source-over'}
 else X.drawImage(V.buf,a,b,w,h,sx,sy,Wk,Hk);
 if(vhs){const gl=S.glitch;
  if(gl>.04||Math.random()<.012){const n=1+Math.floor(gl*7);for(let i=0;i<n;i++){const y=Math.floor(Math.random()*Hk),hh=Math.max(k,Math.floor(rnd(1,14)*k*Math.max(.3,gl))),dx=Math.round(rnd(-1,1)*(4+gl*26)*k);X.drawImage(V.out,0,y,Wk,hh,dx,y,Wk,hh);if(gl>.3){X.fillStyle=`rgba(255,255,255,${.06+gl*.12})`;X.fillRect(0,y+Math.floor(hh/2),Wk,k)}}}
  const hb=Math.round(4*k);X.drawImage(V.out,0,Hk-hb,Wk,hb,Math.round(rnd(-3,6)*k/2),Hk-hb,Wk,hb);X.fillStyle='rgba(230,230,255,.05)';X.fillRect(0,Hk-hb,Wk,hb);
  X.globalAlpha=.06+S.glitch*.2;X.drawImage(V.noise[V.ni=(V.ni+1)%3],-Math.random()*8|0,-Math.random()*8|0,Wk+16,Hk+16);X.globalAlpha=1;
  if(k>=2)X.drawImage(V.scan,0,0)}
 X.drawImage(V.vig,0,0,Wk,Hk);
 if(S.flashA>0){X.globalAlpha=RM?Math.min(S.flashA,.15):S.flashA;X.fillStyle=S.flashC;X.fillRect(0,0,Wk,Hk);X.globalAlpha=1}
}
const fmtClock=s=>`${pad(Math.floor(s/60))}:${pad(Math.floor(s%60))}.${Math.floor(s*10)%10}`;
const tc=s=>`${pad(Math.floor(s/3600))}:${pad(Math.floor(s/60)%60)}:${pad(Math.floor(s%60))}:${pad(Math.floor(s*30)%30)}`;
function hud(){
 const X=V.ox,k=V.k,W=V.W;const Hr=(x,y,w,h,c)=>{X.fillStyle=c;X.fillRect(Math.round(x*k),Math.round(y*k),Math.round(w*k),Math.round(h*k))};
 const Tt=(s,x,y,c,sc=1)=>drawText(X,s,Math.round(x*k),Math.round(y*k),c,k*sc);const To=(s,x,y,c,sc=1)=>{Tt(s,x+sc/2,y+sc/2,'#05040a',sc);Tt(s,x,y,c,sc)};
 const rep=S.mode==='replay'||S.mode==='rewind';
 if(!rep){
  Hr(0,0,W,13,'rgba(7,5,12,.84)');Hr(0,13,W,1,'#2a2140');
  /* batterie du ralenti */
  const low=S.bat<.25,blink=(S.batLock||low)&&Math.floor(S.rt*4)%2;Hr(4,3,31,8,blink?'#ff2b45':'#c9c0aa');Hr(5,4,29,6,'#07050c');Hr(35,5,2,4,blink?'#ff2b45':'#c9c0aa');
  for(let i=0;i<10;i++){const on=S.bat>i/10+.001;Hr(6+i*2.8,5,2,4,on?(S.slowOn?'#ff3fa4':S.batLock?'#7a2030':'#43f0ff'):'#1a1626')}
  /* zone */
  const zn='◆ '+S.cur.R.Z.nom;To(zn,42,3,'#9d97a6');
  /* chrono + monstres */
  const kt='×'+pad(S.kills);const kw=textW(kt)/1;const kx=W-6-kw;const bump=S.killBump>0;
  To(kt,kx,3,bump?'#ff2b45':'#e8e0cc');
  Hr(kx-10,3,7,6,'#e8e0cc');Hr(kx-9,4,2,2,'#07050c');Hr(kx-6,4,2,2,'#07050c');Hr(kx-9,8,1,2,'#e8e0cc');Hr(kx-7,8,1,2,'#e8e0cc');Hr(kx-5,8,1,2,'#e8e0cc');
  const cl=fmtClock(S.clock);const cw=textW(cl);To(cl,Math.min(kx-16-cw,W/2+20),3,'#43f0ff');
 }
 /* message du Système */
 if(S.toast&&!rep){const t=S.toast,n=Math.min(t.txt.length,Math.floor(t.t*45));const s=t.txt.slice(0,n);const w=textW(t.txt)+8,x=Math.round((W-w)/2);if(!(t.t>2.2&&Math.floor(t.t*12)%2)){Hr(x,18,w,11,'rgba(7,5,12,.85)');Hr(x,18,w,1,'#43f0ff');To(s,x+4,20,'#8fe3f0')}}
 /* carton de zone (cassette) */
 if(S.card)drawCard(Hr,To,Tt);
 /* affichage magnétoscope */
 if(S.mode==='rewind'||(S.mode==='replay'&&S.rp&&S.rp.ph==='rew')){const b=Math.floor(S.rt*6)%2;To('◀◀ REW',8,8,'#e8e0cc',2);if(b)Hr(4,8,2,14,'#ff2b45')}
 else if(S.mode==='replay'){const b=Math.floor(S.rt*2)%2;To((b?'▶':' ')+' PLAY',8,8,'#e8e0cc',2);To('RELECTURE',W-8-textW('RELECTURE'),9,'#9d97a6');
  const f=S.rec[S.rp.i];if(f)To('SP '+tc(f.rt-S.rec[S.rp.start].rt),8,VH-16,'#e8e0cc');const hint=(V.touch?'TOUCHER':'R / ÉCHAP')+' : ARRÊTER';To(hint,W-8-textW(hint),VH-16,'#9d97a6')}
 if(S.mode==='dead'||S.mode==='rewind'){const t='ÉCHEC',w=textW(t,3);vhsText(X,t,Math.round((W-w)/2*k),Math.round(80*k),'#ffe6ea',k*3,Math.max(1,k))}
 if(V.paused){Hr(0,0,W,VH,'rgba(5,4,10,.55)');const t='❚❚ PAUSE',w=textW(t,2);To(t,(W-w)/2,92,'#e8e0cc',2);const h=V.touch?'TOUCHER POUR REPRENDRE':'UNE TOUCHE POUR REPRENDRE';To(h,(W-textW(h))/2,114,'#9d97a6')}
}
function drawCard(Hr,To,Tt){
 const c=S.card,W=V.W,k=V.k,t=c.t;const dur=c.fin?99:c.big?3.2:2.2;
 const inT=Math.min(1,t/.18),out=c.fin?0:Math.max(0,(t-(dur-.25))/.25);const wv=Math.round(W*inT*(1-out));if(wv<=0)return;
 const X=V.ox;X.save();X.beginPath();X.rect(0,0,wv*k,VH*k);X.clip();
 if(c.big||c.fin){const y=60;Hr(0,y,W,64,'rgba(5,4,10,.9)');Hr(0,y,W,1,'#ff3fa4');Hr(0,y+63,W,1,'#43f0ff');
  const tt=c.fin?'FIN DE LA BANDE':(D.nom||'CROC'),sc=W>=300?4:3,tw=textW(tt,sc);vhsText(X,tt,Math.round((W-tw)/2*k),Math.round((y+10)*k),'#f4f0ff',k*sc,Math.max(1,Math.round(k*.7)));
  const sub=c.fin?'▶ RELECTURE AUTOMATIQUE':'BALADE · LE DÉDALE';To(sub,(W-textW(sub))/2,y+44,'#9d97a6');
  const b=Math.floor(S.rt*2)%2;To((b?'▶ ':'  ')+'PLAY',8,y+4,'#e8e0cc');To('SP',W-20,y+4,'#e8e0cc')}
 else{const y=20,nm=S.cur.R.Z.nom,n=S.cur.R.Z.i+1,sc=W>=300?3:2;Hr(0,y,W,38,'rgba(5,4,10,.88)');Hr(0,y,W,1,'#43f0ff');Hr(0,y+37,W,1,'#ff3fa4');
  To('ZONE '+pad(n)+'/'+pad(ZONES.length),8,y+4,'#9d97a6');const shown=nm.slice(0,Math.max(0,Math.floor((t-.12)*22)));vhsText(X,shown,Math.round(8*k),Math.round((y+14)*k),'#f4f0ff',k*sc,Math.max(1,Math.round(k*.6)));
  const r=tc(S.clock);To(r,W-8-textW(r),y+4,'#e8e0cc');const b=Math.floor(S.rt*2)%2;To((b?'▶ ':'  ')+'PLAY',W-8-textW('▶ PLAY'),y+24,'#e8e0cc')}
 X.restore();
}

/* =====================================================================
   8. ENTRÉES — clavier AZERTY et QWERTY, souris, manette, tactile
   ===================================================================== */
const KEYS={arrowleft:'l',q:'l',a:'l',arrowright:'r',d:'r',' ':'jump',spacebar:'jump',arrowup:'jump',z:'jump',w:'jump',x:'atk',j:'atk',c:'roll',k:'roll',shift:'slow',e:'talk',arrowdown:'d',s:'d',r:'replay',escape:'esc',p:'pause',f:'ff'};
function inputClear(){if(!V)return;V.kb.clear();V.tp.clear();V.taps.clear();V.dirs=new Set();$$('.bld-pad .on',V.root).forEach(b=>b.classList.remove('on'))}
function onKey(e){
 if(!V||DLG.open)return;if(e.ctrlKey||e.metaKey||e.altKey)return;
 if(e.key==='Tab'){const f=$$('button:not([hidden]),canvas',V.root).filter(b=>b.offsetParent!==null&&!b.closest('[hidden]'));const i=f.indexOf(document.activeElement);e.preventDefault();e.stopPropagation();(f[(i+(e.shiftKey?-1:1)+f.length)%f.length]||f[0]).focus();return}
 const k=(e.key||'').toLowerCase();let a=KEYS[k];if(!a&&e.code==='Space')a='jump';if(!a&&/^Shift/.test(e.code||''))a='slow';
 if(!a)return;
 if(V.endOpen&&e.target.closest&&e.target.closest('.bld-end')&&(k===' '||k==='enter'))return;
 e.preventDefault();e.stopPropagation();
 if(e.type==='keydown'){if(!e.repeat)V.taps.add(a);V.kb.add(a);if(V.paused&&a!=='esc'){V.paused=false;V.taps.clear();snd('clic')}}else V.kb.delete(a);
 if(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('.bld-top'))V.cv.focus({preventScroll:true});
}
function padPoll(){V.pd.clear();let gp=null;try{gp=navigator.getGamepads?[...navigator.getGamepads()].find(p=>p&&p.connected):null}catch(e){}
 if(gp){const b=i=>gp.buttons[i]&&gp.buttons[i].pressed,ax=gp.axes[0]||0,ay=gp.axes[1]||0;
  if(ax<-.35||b(14))V.pd.add('l');if(ax>.35||b(15))V.pd.add('r');if(ay>.55||b(13))V.pd.add('d');if(b(0)||b(12))V.pd.add('jump');if(b(2))V.pd.add('atk');if(b(1))V.pd.add('roll');
  if(b(4)||b(5)||b(6)||b(7))V.pd.add('slow');if(b(3))V.pd.add('talk');if(b(8))V.pd.add('replay');if(b(9))V.pd.add('esc')}
 for(const a of V.pd)if(!V.pdPrev.has(a))V.taps.add(a);V.pdPrev=new Set(V.pd)}
function readInput(){const H=a=>V.kb.has(a)||V.tp.has(a)||V.pd.has(a)||V.dirs.has(a);const t=a=>V.taps.has(a);
 return{l:H('l'),r:H('r'),d:H('d'),jump:H('jump'),slow:H('slow'),ff:H('ff')||H('r')&&S.mode==='replay',tap:{jump:t('jump'),atk:t('atk'),roll:t('roll'),talk:t('talk'),d:t('d'),replay:t('replay')},aim:V.aim||0}}
function bindTouch(){
 const pad=$('.bld-pad',V.root),dp=$('.bld-dpad',pad);
 const btn=e=>e.target.closest('[data-k]');
 const down=e=>{const b=btn(e);if(!b)return;e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(_){}const a=b.dataset.k;V.tp.add(a);V.taps.add(a);b.classList.add('on');b.dataset.pid=e.pointerId;if(V.paused){V.paused=false}};
 const up=e=>{const b=btn(e)||$$('[data-k]',pad).find(x=>x.dataset.pid==String(e.pointerId));if(!b)return;V.tp.delete(b.dataset.k);b.classList.remove('on');delete b.dataset.pid};
 $$('[data-k]',pad).forEach(b=>{b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up);b.addEventListener('contextmenu',e=>e.preventDefault())});
 const P={};const dirOf=(e)=>{const r=dp.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,s=new Set();const dz=r.width*.14;if(x<-dz&&Math.abs(x)>Math.abs(y)*.45)s.add('l');if(x>dz&&Math.abs(x)>Math.abs(y)*.45)s.add('r');if(y<-dz&&Math.abs(y)>Math.abs(x)*.45)s.add('jump');if(y>dz&&Math.abs(y)>Math.abs(x)*.45)s.add('d');return s};
 const sync=()=>{const all=new Set();for(const k in P)for(const a of P[k])all.add(a);for(const a of all)if(!V.dirs.has(a))V.taps.add(a);V.dirs=all;$$('span',dp).forEach(s=>s.classList.toggle('on',all.has(s.dataset.d)))};
 dp.addEventListener('pointerdown',e=>{e.preventDefault();try{dp.setPointerCapture(e.pointerId)}catch(_){}P[e.pointerId]=dirOf(e);sync();if(V.paused)V.paused=false});
 dp.addEventListener('pointermove',e=>{if(P[e.pointerId]){P[e.pointerId]=dirOf(e);sync()}});
 const dup=e=>{delete P[e.pointerId];sync()};dp.addEventListener('pointerup',dup);dp.addEventListener('pointercancel',dup);dp.addEventListener('lostpointercapture',dup);
}

/* =====================================================================
   9. COUCHE PLEIN ÉCRAN, BOUCLE, ÉCRAN DU MENU
   ===================================================================== */
const isTouch=()=>{try{return matchMedia('(pointer:coarse)').matches||(navigator.maxTouchPoints>0&&innerWidth<900)}catch(e){return false}};
function layout(){
 if(!V)return;const vw=innerWidth,vh=innerHeight,touch=isTouch(),port=vh>vw*1.05;V.touch=touch;V.root.classList.toggle('touch',touch);V.root.classList.toggle('port',port);
 const top=$('.bld-top',V.root).offsetHeight||40,help=touch?0:($('.bld-help',V.root).offsetHeight||24);
 let aw=vw-(touch&&!port?0:16),ah;
 if(port&&touch){ah=Math.max(180,vh-top-250);}else ah=vh-top-help-12;
 let W;if(port)W=clamp(Math.round(VH*aw/Math.min(ah,aw*1.05)),216,384);else W=aw/ah>=384/VH?384:clamp(Math.round(VH*aw/ah),216,384);
 let s=Math.min(aw/W,ah/VH);if(s>=2)s=Math.floor(s);
 const dpr=Math.min(3,window.devicePixelRatio||1),k=clamp(Math.round(s*dpr),1,4);
 const cssW=Math.floor(W*s),cssH=Math.floor(VH*s);
 V.cv.style.width=cssW+'px';V.cv.style.height=cssH+'px';
 if(V.W!==W||V.k!==k){V.W=W;V.k=k;[V.buf,V.g]=mk(W,VH);V.cv.width=W*k;V.cv.height=VH*k;V.out=V.cv;V.ox=V.cv.getContext('2d');V.ox.imageSmoothingEnabled=false;buildPost();rainInit();if(S)camUpdate(0,true)}
 $('.bld-pad',V.root).hidden=!touch;
}
function syncBtns(){if(!V)return;const s=$('[data-a="son"] b',V.root),v=$('[data-a="vhs"] b',V.root);if(s&&s.textContent!==(AU.on?'ON':'OFF'))s.textContent=AU.on?'ON':'OFF';V.vhs=document.body.classList.contains('crt');if(v&&v.textContent!==(V.vhs?'ON':'OFF'))v.textContent=V.vhs?'ON':'OFF'}
/* sons d'ambiance continus (pluie, bourdonnement des néons, grondement) */
function drones(){
 if(!V)return;const ok=AU.on&&AU.ready;
 if(ok&&!V.dr&&AU.drone){V.dr={rain:AU.drone({noise:1,rate:.9,ft:'bandpass',ff:2400,q:.35}),hum:AU.drone({w:'p50',f:120,ft:'lowpass',ff:600,q:.6}),rum:AU.drone({noise:1,rate:.05,ft:'lowpass',ff:140,q:.5})}}
 if(!ok&&V.dr){for(const k in V.dr)V.dr[k]&&V.dr[k].stop();V.dr=null}
 if(!V.dr)return;const Z=S.cur.R.Z,I=S.cur,c=S.croc;
 const rv=Z.pluie?.075:Z.th==='couloir'?.012:Z.th==='escalier'?.02:0,rf=Z.pluie?2400:420;V.dr.rain&&V.dr.rain.set(S.mode==='replay'?rv*.6:rv,rf,.4);
 let h=0;for(const L of I.lights){if(!L.src||!(L.it>.3))continue;const d=Math.hypot(L.x-c.x,(L.y-c.y)*.7);if(d<140)h+=(1-d/140)*.022*L.it}V.dr.hum&&V.dr.hum.set(Math.min(.035,h),600,.08);
 V.dr.rum&&V.dr.rum.set(Z.th==='souterrains'?.09:Z.th==='escalier'?.05:Z.th==='couloir'?.03:0,140,.5)}
function step(rdt,inp){
 S.rt+=rdt;
 S.shake=Math.max(0,S.shake-rdt*1.9);S.ab=Math.max(0,S.ab-rdt*3);S.glitch=Math.max(0,S.glitch-rdt*2.2);S.flashA=Math.max(0,S.flashA-rdt*4.5);S.zoom=Math.max(0,S.zoom-rdt*.35);S.killBump=Math.max(0,S.killBump-rdt*2.5);
 if(S.toast){S.toast.t+=rdt;if(S.toast.t>2.8)S.toast=null}
 if(S.card){S.card.t+=rdt;if(!S.card.fin&&S.card.t>(S.card.big?3.2:2.2))S.card=null}
 if(inp.tap.replay&&!DLG.open){if(S.mode==='replay')stopReplay();else if(S.mode==='play')startReplay(false)}
 if(S.mode==='replay'&&(V.taps.has('atk')||V.taps.has('jump')||V.taps.has('talk'))&&V.touch)stopReplay();
 const ocx=S.cam.x,ocy=S.cam.y;
 switch(S.mode){
 case'play':{
  const want=inp.slow&&S.bat>0&&!S.batLock;
  if(want&&!S.slowOn){S.slowOn=true;snd('ralentiOn');S.beat=0}else if(!want&&S.slowOn){S.slowOn=false;snd('ralentiOff')}
  if(S.slowOn){S.bat=Math.max(0,S.bat-rdt/4.2);S.beat-=rdt;if(S.beat<=0){S.beat=.85;snd('battement')}if(S.bat<=0){S.slowOn=false;S.batLock=1;snd('vide');snd('ralentiOff');toast('[SYSTÈME] RALENTI ÉPUISÉ.')}}
  else{S.bat=Math.min(1,S.bat+rdt/8);if(S.batLock&&S.bat>.3)S.batLock=0}
  S.slow=appr(S.slow,S.slowOn?1:0,rdt*(S.slowOn?7:5));S.slowView=S.slow;
  let gdt=rdt*(1-.7*S.slow);if(S.hit>0){S.hit-=rdt;gdt=0}
  S.clock+=rdt;
  if(gdt>0)sim(gdt,inp);
  if(S.mode==='play'||S.mode==='dead')camUpdate(rdt);
  ambient(gdt,S.cam.x-ocx,S.cam.y-ocy);
  record();break}
 case'talk':case'end':camUpdate(rdt);ambient(rdt,S.cam.x-ocx,S.cam.y-ocy);break;
 case'dead':S.deadT+=rdt;S.hit=Math.max(0,S.hit-rdt);ambient(rdt*.25,0,0);if(S.deadT>(RM?.35:.75))startRewind();break;
 case'rewind':rewindStep(rdt);ambient(0,S.cam.x-ocx,S.cam.y-ocy);break;
 case'replay':replayStep(rdt,inp.ff);ambient(rdt,S.cam.x-ocx,S.cam.y-ocy);break;
 case'trans':transStep(rdt);if(S.mode!=='trans')break;ambient(rdt,0,0);break;
 }
 if(AU.slow)AU.slow(S.mode==='play'||S.mode==='replay'?S.slowView:0);
}
function sim(gdt,inp){
 const I=S.cur,c=S.croc;S.T+=gdt;
 S.near=c.onG&&!['atk','roll','landH','pilonL','hurt','pilon'].includes(c.st)?findNear(c,I):null;
 if(S.near&&(inp.tap.talk||inp.tap.d)){interact(S.near);return}
 crocStep(c,I,gdt,inp);
 for(const m of I.mons)monStep(m,I,c,gdt);
 for(const n of I.npcs)npcStep(n,c,gdt);
 for(const p of I.props)propStep(p,I,gdt);
 for(const d of I.R.g.doors)if(d.opening&&d.opening<1)d.opening=Math.min(1,d.opening+gdt*3);
 if(S.mode!=='play')return;
 for(const x of I.R.g.exits){if(x.mode==='porte')continue;if(c.x>x.x0&&c.x<x.x1&&c.y>x.y0&&c.y-14<x.y1){goRoom(x.to,x.sp);return}}
 if(c.y>I.R.ph+30)hurtCroc('chute');
}
function frame(now){
 if(!V)return;V.raf=requestAnimationFrame(frame);
 const rdt=Math.min(.05,Math.max(0,(now-(V.last||now))/1000));V.last=now;
 padPoll();const inp=readInput();
 if(V.taps.has('esc')){closeGame();return}
 if(V.taps.has('pause')&&!V.paused&&S.mode!=='end'){V.paused=true;V.taps.clear();snd('clic')}
 if(!V.paused&&!DLG.open||S.mode==='talk')step(V.paused?0:rdt,inp);
 if((V.fc=(V.fc||0)+1)%12===0){drones();syncBtns()}
 render(V.paused?0:rdt);present();hud();
 V.taps.clear();V.aim=0;
}
function commitKills(){if(!S)return;const add=S.kills-(S.killsSaved||0);if(add>0){const st=stats();st.total+=add;store.set(STORE,st);S.killsSaved=S.kills}}
function settle(){/* termine proprement un rembobinage / une relecture / une transition en cours */
 if(!S)return;if(S.mode==='replay')stopReplay();if(S.mode==='dead')startRewind();if(S.mode==='rewind'){S.rw.i=S.rw.tgt;rewindStep(0)}if(S.mode==='trans'){S.tr.t=9;transStep(0)}if(S.mode==='talk')S.mode='play'}
function openGame(fresh){
 if(V)return;
 if(fresh||!S||S.fin)newSession();
 AU.init&&0;
 const root=document.createElement('div');root.className='bld';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','BALADE — mini-jeu, vue de côté');
 root.innerHTML=`<div class="bld-top"><button type="button" class="bld-b" data-a="menu">◀ MENU <small>ÉCHAP</small></button><span class="bld-t">CROC · BALADE</span>
  <button type="button" class="bld-b" data-a="replay">◀◀ RELECTURE <small>R</small></button><button type="button" class="bld-b" data-a="son">♪ SON <b>OFF</b></button><button type="button" class="bld-b" data-a="vhs">VHS <b>ON</b></button></div>
  <div class="bld-stage"><canvas class="bld-cv" tabindex="0" role="img" aria-label="${esc((D.nom||'Croc')+' se balade de nuit : toits, ruelle, couloir, escalier, souterrains. Monstres à abattre au marteau, PNJ à qui parler, et '+(D.frere||'son frère')+' quelque part.')}"></canvas>
   <div class="bld-end win" hidden><p class="bld-end-t">FIN DE LA BANDE</p><dl class="bld-end-l"></dl>
    <div class="bld-end-b"><button type="button" class="pbtn" data-a="revoir">▶ REVOIR LA BANDE</button><button type="button" class="pbtn" data-a="nouvelle">⟲ NOUVELLE BANDE</button><button type="button" class="pbtn red" data-a="menu">◀ MENU</button></div></div></div>
  <div class="bld-pad" hidden><div class="bld-dpad" aria-label="Croix directionnelle"><span data-d="jump">▲</span><span data-d="l">◀</span><span data-d="r">▶</span><span data-d="d">▼</span></div>
   <div class="bld-btns"><button type="button" data-k="talk" class="k-t">PARLER</button><button type="button" data-k="slow" class="k-s">RALENTI</button><button type="button" data-k="roll" class="k-o">ROULADE</button><button type="button" data-k="atk" class="k-a">MARTEAU</button><button type="button" data-k="jump" class="k-j">SAUT</button></div></div>
  <p class="bld-help"><kbd>← →</kbd>/<kbd>Q D</kbd>/<kbd>A D</kbd> marcher · <kbd>Espace</kbd>/<kbd>↑</kbd>/<kbd>Z</kbd>/<kbd>W</kbd> sauter · <kbd>X</kbd>/<kbd>J</kbd>/clic marteau · <kbd>C</kbd>/<kbd>K</kbd> roulade · <kbd>Maj</kbd> ralenti · <kbd>E</kbd>/<kbd>↓</kbd> parler · <kbd>↓</kbd>+marteau en l'air : pilon · <kbd>R</kbd> relecture · <kbd>Échap</kbd> menu</p>
  <p class="sr-only" aria-live="polite"></p>`;
 document.body.appendChild(root);document.body.classList.add('balade-on');document.documentElement.classList.add('balade-lock');
 V={root,cv:$('.bld-cv',root),live:$('.sr-only',root),kb:new Set(),tp:new Set(),pd:new Set(),pdPrev:new Set(),taps:new Set(),dirs:new Set(),W:0,k:0,vhs:true,gpool:[],gpi:0,ni:0,ls:[],dr:null,paused:false};
 for(let i=0;i<8;i++)V.gpool.push(mk(EW,EHh)[0]);
 const on=(t,ev,f,o)=>{t.addEventListener(ev,f,o);V.ls.push([t,ev,f,o])};
 on(window,'keydown',onKey,true);on(window,'keyup',onKey,true);
 on(window,'blur',()=>{inputClear();if(S&&S.mode==='play'&&!DLG.open)V.paused=true});
 on(document,'visibilitychange',()=>{if(document.hidden){inputClear();if(S&&S.mode==='play')V.paused=true}});
 on(window,'resize',()=>layout());
 on(V.cv,'pointerdown',e=>{V.cv.focus({preventScroll:true});if(V.paused){V.paused=false;return}if(S.mode==='replay'){stopReplay();return}if(e.pointerType==='touch')return;e.preventDefault();
  const r=V.cv.getBoundingClientRect(),wx=(e.clientX-r.left)/r.width*V.W+S.cam.x;if(e.button===2)V.taps.add('roll');else{V.taps.add('atk');V.aim=sgn(wx-S.croc.x)}});
 on(V.cv,'contextmenu',e=>e.preventDefault());
 on(root,'click',e=>{const b=e.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;
  if(a==='menu'){closeGame();return}
  if(a==='replay'){if(S.mode==='replay')stopReplay();else if(S.mode==='play')startReplay(false)}
  if(a==='son'){const sb=$('#sndBtn');if(sb)sb.click();syncBtns()}
  if(a==='vhs'){const cb=$('#crtBtn');if(cb)cb.click();syncBtns()}
  if(a==='revoir'){hideEnd();startReplay(true)}
  if(a==='nouvelle'){hideEnd();commitKills();newSession();layout();camUpdate(0,true);snd('cassette')}
  if(!b.closest('.bld-end'))V.cv.focus({preventScroll:true})});
 bindTouch();layout();syncBtns();camUpdate(0,true);
 AU.music('balade');snd('cassette');
 if(S.mode==='end'&&S.fin)showEnd();
 V.cv.focus({preventScroll:true});
 V.raf=requestAnimationFrame(frame);
 live('Balade lancée. '+S.cur.R.Z.nom);
 if(TEST)window.__bal=testHook();
}
function closeGame(){
 if(!V)return;settle();commitKills();
 cancelAnimationFrame(V.raf);for(const[t,ev,f,o]of V.ls)t.removeEventListener(ev,f,o);V.ls=[];
 if(V.dr)for(const k in V.dr)V.dr[k]&&V.dr[k].stop();
 if(AU.slow)AU.slow(0);
 V.root.remove();document.body.classList.remove('balade-on');document.documentElement.classList.remove('balade-lock');
 V=null;inputClear();snd('back');
 if(LAUNCH)LAUNCH.refresh(true);
}
function showEnd(){if(!V)return;const e=$('.bld-end',V.root),st=stats();
 $('.bld-end-l',e).innerHTML=`<div><dt>TEMPS</dt><dd>${fmtClock(S.clock)}</dd></div><div><dt>MONSTRES ABATTUS</dt><dd>${S.kills}</dd></div><div><dt>REMBOBINAGES</dt><dd>${S.fails}</dd></div><div><dt>MEILLEUR TEMPS</dt><dd>${st.best?fmtClock(st.best):'—'}</dd></div>${S.metEil?`<div class="eil"><dt>${esc((D.frere||'???').toUpperCase())}</dt><dd>♥</dd></div>`:''}`;
 e.hidden=false;V.endOpen=true;S.card=null;$('button',e).focus({preventScroll:true});live('Fin de la bande. Temps '+fmtClock(S.clock)+', '+S.kills+' monstres abattus.')}
function hideEnd(){if(!V)return;$('.bld-end',V.root).hidden=true;V.endOpen=false;V.cv.focus({preventScroll:true})}

/* ---------- écran BALADE du menu (lanceur « cassette ») ---------- */
let LAUNCH=null;
function launcher(p){
 const nom=esc(D.nom||'Croc');
 p.innerHTML=head('BALADE','[SYSTÈME] Cassette 01 · vue de côté · nuit')+`
 <div class="bl-grid">
  <div class="bl-tape"><canvas class="bl-prev" width="256" height="144" aria-hidden="true"></canvas><span class="bl-rec" aria-hidden="true">● REC</span></div>
  <div class="bl-side">
   <div class="box glace bl-start"><button type="button" class="pbtn red bl-go"></button><button type="button" class="pbtn bl-new">⟲ NOUVELLE BANDE</button>
    <p class="bl-note">Plein écran · <kbd>Échap</kbd> pour revenir ici. La partie en cours est gardée tant que la page reste ouverte.</p></div>
   <div class="box bl-stats"><h3 class="cap">COMPTEUR <small>CE NAVIGATEUR</small></h3><dl class="bl-dl"></dl></div>
  </div>
 </div>
 <div class="box bl-keys"><h3 class="cap">COMMANDES</h3>
  <ul class="bl-k">
   <li><span class="lbl">Marcher</span><b><kbd>← →</kbd> · <kbd>Q D</kbd> (AZERTY) · <kbd>A D</kbd> (QWERTY)</b></li>
   <li><span class="lbl">Sauter</span><b><kbd>Espace</kbd> · <kbd>↑</kbd> · <kbd>Z</kbd> · <kbd>W</kbd> — maintenir pour sauter plus haut</b></li>
   <li><span class="lbl">Marteau</span><b><kbd>X</kbd> · <kbd>J</kbd> · clic (vers le pointeur) — en l'air + <kbd>↓</kbd> : pilon</b></li>
   <li><span class="lbl">Roulade</span><b><kbd>C</kbd> · <kbd>K</kbd> · clic droit — esquive, amortit une chute</b></li>
   <li><span class="lbl">Ralenti</span><b><kbd>Maj</kbd> maintenu — jauge-batterie en haut à gauche</b></li>
   <li><span class="lbl">Parler / entrer</span><b><kbd>E</kbd> · <kbd>↓</kbd> près de quelqu'un ou d'une porte</b></li>
   <li><span class="lbl">Cassette</span><b><kbd>R</kbd> relecture des dernières secondes · <kbd>P</kbd> pause · <kbd>Échap</kbd> menu</b></li>
   <li><span class="lbl">Manette / tactile</span><b>Croix + A saut · X marteau · B roulade · gâchettes ralenti · Y parler — boutons à l'écran sur mobile</b></li>
  </ul></div>
 <p class="sim-note">TOITS → RUELLE → COULOIR → ESCALIER → SOUTERRAINS. Les monstres du Dédale tombent sous le marteau ; les PNJ ne sont pas des cibles (le coup passe à côté). Un seul personnage n'est pas un NPC. Touché ou tombé : la bande se rembobine.</p>`;
 const go_=$('.bl-go',p),nw=$('.bl-new',p),dl=$('.bl-dl',p),cv=$('.bl-prev',p);
 function refresh(focus){const st=stats(),cur=S&&!S.fin;go_.innerHTML=cur?'▶ REPRENDRE LA BANDE':'▶ INSÉRER LA CASSETTE';nw.hidden=!cur;
  dl.innerHTML=`<div><dt>MONSTRES ABATTUS</dt><dd>${st.total+(S?S.kills-(S.killsSaved||0):0)}</dd></div><div><dt>MEILLEUR TEMPS</dt><dd>${st.best?fmtClock(st.best):'—'}</dd></div><div><dt>BANDES TERMINÉES</dt><dd>${st.fins}</dd></div>${cur?`<div><dt>EN COURS</dt><dd>${esc(S.cur.R.Z.nom)} · ${fmtClock(S.clock)}</dd></div>`:''}`;
  if(focus&&document.contains(go_))go_.focus({preventScroll:true})}
 go_.onclick=()=>{AU.init&&AU.init();openGame(false)};nw.onclick=()=>{openGame(true)};
 refresh(false);
 /* aperçu animé : toits sous la pluie, Croc de profil */
 const x=cv.getContext('2d');x.imageSmoothingEnabled=false;const R=roomStatic('toits');let raf=0,last=0,t=0,alive=true;const drops=Array.from({length:150},()=>({x:rnd(0,280),y:rnd(0,144),v:rnd(220,420),l:ri(2,6)}));
 const fake={st:'idle',stT:0,vx:0,vy:0,cb:0,cl:0,ph:0};
 function fr(now){if(!alive)return;raf=requestAnimationFrame(fr);if(V||document.hidden)return;const dt=Math.min(.05,(now-(last||now))/1000);last=now;t+=dt;
  x.drawImage(R.layers[0].c,40,30,256,144,0,0,256,144);for(const[i,Lr]of R.layers.slice(1).entries()){const w=Lr.c.width,o=Math.round(t*(6+i*10))%w;x.drawImage(Lr.c,-o,-60);x.drawImage(Lr.c,w-o,-60)}
  x.fillStyle='#0d0a15';x.fillRect(0,118,150,26);x.fillStyle='#3b3152';x.fillRect(0,118,150,2);x.fillStyle='#75669a';x.fillRect(0,118,150,1);
  fake.T=t;const P=crocPose(fake,t);stamp(x,g=>rig(g,P),118,118,1,{rim:'#ff3fa4',rd:1,ra:.9});
  x.globalCompositeOperation='lighter';x.globalAlpha=.5+.2*Math.sin(t*7)*(Math.sin(t*1.3)>.8?1:0);x.drawImage(glowPX(34,'#ff3fa4',1,1.6),196-34,70-34);x.globalAlpha=1;x.globalCompositeOperation='source-over';
  x.fillStyle='#ff3fa4';drawText(x,'BAR',186,64,'#ff3fa4',2);
  for(const d of drops){d.y+=d.v*dt;d.x-=d.v*dt*.2;if(d.y>150){d.y=-6;d.x=rnd(0,300)}x.fillStyle=d.l>4?'#cfc9ef':'#5a5088';for(let i=0;i<d.l;i++)x.fillRect(Math.round(d.x+i*.2),Math.round(d.y-i),1,1)}
  const tt='BALADE',w=textW(tt,3);vhsText(x,tt,Math.round((256-w)/2),14,'#f4f0ff',3,1);drawText(x,'LE DÉDALE · CASSETTE 01',Math.round((256-textW('LE DÉDALE · CASSETTE 01'))/2),40,'#9d97a6',1);
  if(Math.floor(t*2)%2)drawText(x,'▶ PLAY',8,132,'#e8e0cc',1);drawText(x,tc(t).slice(3),256-8-textW(tc(t).slice(3)),132,'#e8e0cc',1)}
 raf=requestAnimationFrame(fr);
 LAUNCH={refresh};
 return()=>{alive=false;cancelAnimationFrame(raf);if(V)closeGame();LAUNCH=null};
}
/* ---------- aide aux tests automatiques (uniquement avec ?test dans l'adresse) ---------- */
function testHook(){return{
 get S(){return S},get V(){return V},ZONES:ZONES.map(z=>z.id),
 tp(id,x,y){settle();S.mode='play';enterRoom(id,'A',false);S.card=null;if(x!=null){if(y==null){const I=S.cur;for(let yy=30;yy<I.R.ph;yy++){if(freeBox(I,x-5,yy-28,x+5,yy)&&floorAt(I,x-5,x+5,yy,.5,true)!==null){y=yy;break}}}
  S.croc.x=x;S.croc.y=y??40;S.croc.vy=0;S.croc.peakY=S.croc.y;S.croc.inv=1}camUpdate(0,true);S.entry=S.rec.length;return S.cur.id},
 key(a,on){if(on)V.kb.add(a);else V.kb.delete(a)},tap(a){V.taps.add(a)},
 state(){const c=S.croc,I=S.cur;return{room:I.id,mode:S.mode,x:Math.round(c.x),y:Math.round(c.y),st:c.st,onG:c.onG,kills:S.kills,fails:S.fails,bat:+S.bat.toFixed(2),slow:+S.slow.toFixed(2),rec:S.rec.length,
  mons:I.mons.map(m=>({k:m.k,x:Math.round(m.x),y:Math.round(m.y),alive:m.alive,st:m.st})),npcs:I.npcs.map(n=>({x:n.x,y:n.y,st:n.startle})),eil:I.eil?{x:I.eil.x,y:I.eil.y}:null,props:I.props.filter(p=>p.alive).length,neons:I.neons.map(n=>n.on),near:S.near?S.near.k:null,W:V&&V.W,k:V&&V.k,parts:PARTS.length,raf:V&&V.raf}},
 rooms(){return ZONES.map(z=>{const R=roomStatic(z.id);return{id:z.id,pw:R.pw,ph:R.ph,exits:R.g.exits,spawns:R.g.spawns}})},
 sheet(z=6){const L=[['repos',{st:'idle'}],['repos (souffle)',{st:'idle'},1.2],['recale le marteau',{st:'idle'},6.25],['course 1',{st:'run',vx:118,ph:0}],['course 2',{st:'run',vx:118,ph:.25}],['course 3',{st:'run',vx:118,ph:.5}],['course 4',{st:'run',vx:118,ph:.75}],['marche',{st:'run',vx:45,ph:.3}],
  ['impulsion',{st:'jump',vy:-280,stT:.03}],['montée',{st:'jump',vy:-200,stT:.2,cl:-1,hs:1.5}],['apex',{st:'jump',vy:-20,stT:.4,cl:1}],['chute',{st:'fall',vy:300,cl:4,hs:-1}],['réception',{st:'land',stT:.02}],['réception lourde',{st:'landH',stT:.08}],['accroupi',{st:'crouch'}],['touché',{st:'hurt'}],
  ['anticipation',{st:'atk',ak:'sol',stT:.05}],['armé',{st:'atk',ak:'sol',stT:.088}],['frappe',{st:'atk',ak:'sol',stT:.12}],['impact',{st:'atk',ak:'sol',stT:.17}],['rebond',{st:'atk',ak:'sol',stT:.22}],['suivi',{st:'atk',ak:'sol',stT:.3}],['suivi 2',{st:'atk',ak:'sol',stT:.37}],['coup aérien',{st:'atk',ak:'air',stT:.13}],
  ['roulade 1',{st:'roll',stT:.02,rollD:.36}],['roulade 2',{st:'roll',stT:.11,rollD:.36}],['roulade 3',{st:'roll',stT:.2,rollD:.36}],['roulade 4',{st:'roll',stT:.3,rollD:.36}],['pilon : armé',{st:'pilon',stT:.06}],['pilon : chute',{st:'pilon',stT:.2}],['pilon : impact',{st:'pilonL',stT:.05}],['pilon : relève',{st:'pilonL',stT:.36}]];
  const items=L.map(([n,o,tt])=>{const cr=Object.assign({vx:0,vy:0,cb:0,cl:0,ph:0,stT:0,hs:0},o);if(o.st==='run')cr.cb=3;const P=crocPose(cr,tt||0);const[t,tx]=mk(EW,EHh);tx.fillStyle='#16131f';tx.fillRect(0,0,EW,EHh);tx.fillStyle='#45365e';tx.fillRect(0,EO[1],EW,1);stamp(tx,g=>rig(g,P),EO[0],EO[1],1,{rot:P.rot,rim:'#ff3fa4',rd:1,ra:.7});return t});
  return window.__sheet?window.__sheet([{name:'Croc (BALADE) : '+L.slice(0,8).map(l=>l[0]).join(', '),items:items.slice(0,8)},{name:L.slice(8,16).map(l=>l[0]).join(', '),items:items.slice(8,16)},{name:L.slice(16,24).map(l=>l[0]).join(', '),items:items.slice(16,24)},{name:L.slice(24).map(l=>l[0]).join(', '),items:items.slice(24)}],z,'APRÈS - Croc dans la BALADE'):null},
 mons(z=6){const C=(w,h)=>{const[t,tx]=mk(w,h);tx.fillStyle='#16131f';tx.fillRect(0,0,w,h);return[t,tx]};const rows=[];
  const mon=(k,st,tt,ph=.2)=>{const m={k,st,t:tt||0,t0:.4,ph,face:1,alive:1};const[t,tx]=C(EW,EHh);stamp(tx,k==='k'?g=>drawChargeur(g,m,ph*3):g=>drawRodeur(g,m,ph*3,k==='g'?1.45:1),EO[0],EO[1],1,{rim:'#6a4a98',rd:-1});return t};
  rows.push({name:'rôdeur : patrouille 1-2, alerte, armé (télégraphie), coup',items:[mon('m','patrol',0,.1),mon('m','patrol',0,.6),mon('m','alert'),mon('m','windup',.25),mon('m','windup',.02),mon('m','strike')]});
  rows.push({name:'chargeur : rôde, se tasse et gratte (télégraphie), charge 1-2 ; colosse : marche, armé',items:[mon('k','patrol'),mon('k','tell',0,.1),mon('k','tell',0,.4),mon('k','charge',0,.1),mon('k','charge',0,.6),mon('g','patrol'),mon('g','windup',.05)]});
  const dis=[0,.25,.5,.75].map(d=>{const m={k:'m',st:'stun',t:0,ph:.2,face:1,alive:0};const[t,tx]=C(EW,EHh);stamp(tx,g=>drawRodeur(g,m,0),EO[0],EO[1],1,{rim:'#6a4a98',rd:-1,dis:d,flash:d<.1?'#ffffff':null});return t});
  rows.push({name:'mort : flash puis dissipation tramée',items:dis});
  for(let r=0;r<2;r++)rows.push({name:'PNJ de profil '+(r*6)+'-'+(r*6+5)+' (repos / marche / sursaut)',items:[0,1,2,3,4,5].flatMap(i=>{const pi=r*6+i;return[0,1,2].map(v=>{const n={pi,v:i===0&&r===0?'pluie':i===4?'tel':'',seed:.3+i*.1,startle:v===2?.5:0,jy:v===2?3:0,mv:v===1,wp:.25};const[t,tx]=C(40,52);tx.save();tx.translate(20,46);drawNPC(tx,n,0);tx.restore();return t})})});
  rows.push({name:'Eilyn de profil : lit, souffle, mèche, page, page',items:[0,1,2,3,4].map(f=>{const[t,tx]=C(26,36);tx.drawImage(eilProf(f),4,3);return t})});
  return window.__sheet(rows,z,'APRÈS - BALADE : monstres, PNJ, Eilyn')}
}}
return{song:'balade',mount(p){return launcher(p)}};
};
