/* =====================================================================
   CROC — VARIANTE « GOTHIQUE VAMPIRE » — script principal
   Aucun fichier son : toute l'acoustique de la cathédrale est
   synthétisée en direct par le navigateur (WebAudio).
   Le contenu vient de data.js (window.CROC).
   ===================================================================== */
(()=>{
'use strict';
const D = window.CROC || {};
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const dormir = ms=>new Promise(r=>setTimeout(r,ms));
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FIN = matchMedia('(pointer: fine)').matches && matchMedia('(hover: hover)').matches;
const DPR = Math.min(2, window.devicePixelRatio || 1);
const esc = s=>String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const alea = (a,b)=>a+Math.random()*(b-a);
const borne = (v,a,b)=>Math.max(a,Math.min(b,v));
const choisir = a=>a[Math.random()*a.length|0];
function romain(n){
  n = Math.floor(n); if(!(n>0)) return String(n);
  const t=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let s=''; for(const [v,r] of t){ while(n>=v){ s+=r; n-=v; } } return s;
}
const etat = { vivant:false, bpm:42, bpmBase:42 };

/* =====================================================================
   1. ACOUSTIQUE — orgue, cloches, chœur, cierges, cœur, pierre, verre…
   ===================================================================== */
const Son = (()=>{
  let ctx=null, maitre, rev, bruit, onde, actif=false, ambiance=false;
  const pret = ()=>!!ctx && actif && ctx.state==='running';

  function init(){
    if(ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return false;
    try{ ctx = new AC(); }catch(e){ return false; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value=-16; comp.knee.value=12; comp.ratio.value=5; comp.attack.value=.004; comp.release.value=.3;
    maitre = ctx.createGain(); maitre.gain.value = 0;
    maitre.connect(comp); comp.connect(ctx.destination);
    /* Réverbération de cathédrale : réponse impulsionnelle synthétique, sombre et longue */
    rev = ctx.createConvolver(); rev.buffer = impulsion(4.8, 2.4);
    const rg = ctx.createGain(); rg.gain.value = .9; rev.connect(rg); rg.connect(maitre);
    const n = ctx.sampleRate*2; bruit = ctx.createBuffer(1,n,ctx.sampleRate);
    const d = bruit.getChannelData(0); for(let i=0;i<n;i++) d[i]=Math.random()*2-1;
    /* Orgue : synthèse additive (principal 8', octave, quinte, doublette, fourniture) */
    const h=[0,1,.62,.32,.45,.1,.24,.05,.2,.03,.08,0,.07,0,0,0,.04];
    onde = ctx.createPeriodicWave(new Float32Array(h.length), new Float32Array(h));
    document.addEventListener('visibilitychange',()=>{
      if(!ctx) return;
      if(document.hidden) ctx.suspend(); else if(actif) ctx.resume();
    });
    return true;
  }
  function impulsion(dur,dec){
    const sr=ctx.sampleRate, len=Math.floor(sr*dur), b=ctx.createBuffer(2,len,sr);
    for(let c=0;c<2;c++){
      const d=b.getChannelData(c); let y=0;
      for(let i=0;i<len;i++){
        const p=i/len, a=.6-.54*p;               /* la pierre absorbe les aigus avec le temps */
        y += a*((Math.random()*2-1)-y);
        const pre = i < sr*.018 ? 0 : 1;          /* pré-délai : la nef est grande */
        d[i] = y*Math.pow(1-p,dec)*pre*2.2;
      }
    }
    return b;
  }
  function sortie(node,{sec=1,hum=0,pan=0}={}){
    let n=node;
    if(pan && ctx.createStereoPanner){ const p=ctx.createStereoPanner(); p.pan.value=borne(pan,-1,1); n.connect(p); n=p; }
    if(sec){ const g=ctx.createGain(); g.gain.value=sec; n.connect(g); g.connect(maitre); }
    if(hum){ const g=ctx.createGain(); g.gain.value=hum; n.connect(g); g.connect(rev); }
  }
  function env(t,pic,att,dec,opts){
    const g=ctx.createGain(); pic=Math.max(.0002,pic);
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(pic,t+att); g.gain.exponentialRampToValueAtTime(.0001,t+att+dec);
    sortie(g,opts); return g;
  }
  function osc(type,f0,f1,t,dur,vol,att=.004,opts={}){
    const o=ctx.createOscillator(); o.type=type; o.frequency.setValueAtTime(f0,t);
    if(f1) o.frequency.exponentialRampToValueAtTime(f1,t+dur);
    o.connect(env(t,vol,att,dur,opts)); o.start(t); o.stop(t+att+dur+.1); return o;
  }
  function souffle(t,dur,type,f0,f1,vol,att=.003,opts={},q){
    const s=ctx.createBufferSource(); s.buffer=bruit; s.loop=true;
    const f=ctx.createBiquadFilter(); f.type=type; f.frequency.setValueAtTime(f0,t);
    if(f1) f.frequency.exponentialRampToValueAtTime(f1,t+dur);
    f.Q.value = q ?? (type==='bandpass'?1.2:.7);
    s.connect(f); f.connect(env(t,vol,att,dur,opts)); s.start(t,Math.random()*1.5); s.stop(t+att+dur+.1);
    return f;
  }

  /* ---- Orgue ---- */
  function tuyau(f,t,dur,vol,opts={sec:.3,hum:.9},att=.4,rel=1.6){
    const g=ctx.createGain();
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+att);
    g.gain.setValueAtTime(vol,t+Math.max(att,dur-rel)); g.gain.linearRampToValueAtTime(0,t+dur);
    const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=Math.min(5200,f*9+700); lp.Q.value=.3;
    lp.connect(g); sortie(g,opts);
    [-2.4,2.6].forEach(c=>{ const o=ctx.createOscillator(); o.setPeriodicWave(onde); o.frequency.value=f; o.detune.value=c; o.connect(lp); o.start(t); o.stop(t+dur+.1); });
    const b=ctx.createOscillator(); b.type='sine'; b.frequency.value=f/2; const bg=ctx.createGain(); bg.gain.value=.55; b.connect(bg); bg.connect(lp); b.start(t); b.stop(t+dur+.1);
    souffle(t,.09,'bandpass',Math.min(8000,f*4),null,vol*.45,.012,{sec:.2,hum:.4},3); /* « chiff » d'attaque du tuyau */
  }
  const accord = (fs,t,dur,vol,att,rel,opts)=>fs.forEach(f=>tuyau(f,t,dur,vol,opts,att,rel));
  const ACCORDS=[
    [73.42,110,146.83,174.61],[58.27,116.54,146.83,174.61],[49,98,146.83,233.08],[55,110,138.59,164.81],
    [73.42,110,146.83,174.61],[58.27,87.31,116.54,174.61],[65.41,98,130.81,155.56],[55,82.41,110,138.59]
  ];
  let iAcc=0;
  function boucleOrgue(){
    if(pret()){ const t=ctx.currentTime+.05; accord(ACCORDS[iAcc%ACCORDS.length],t,15,.026,3.5,4.5,{sec:.22,hum:.95}); iAcc++; }
    setTimeout(boucleOrgue,11500);
  }

  /* ---- Cloches (partiels inharmoniques d'une cloche d'église) ---- */
  const PARTIELS=[[.5,.9,1],[1,1,.75],[1.183,.65,.6],[1.506,.5,.5],[2,.6,.42],[2.514,.3,.3],[2.662,.22,.28],[3.011,.2,.22],[4.166,.12,.16],[5.433,.07,.12],[6.796,.05,.09]];
  function cloche(f,t,vol=.2,{loin=0,duree=6,pan=0}={}){
    const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=6500-loin*5200;
    const g=ctx.createGain(); lp.connect(g); sortie(g,{sec:.95-loin*.75,hum:.45+loin*.55,pan});
    PARTIELS.forEach(([r,a,dd])=>{
      const o=ctx.createOscillator(); o.type='sine'; o.frequency.value=f*r*(1+alea(-.0025,.0025));
      const e=ctx.createGain(), fin=t+duree*dd*1.4;
      e.gain.setValueAtTime(.0001,t); e.gain.exponentialRampToValueAtTime(Math.max(.0002,vol*a),t+.006); e.gain.exponentialRampToValueAtTime(.0001,fin);
      o.connect(e); e.connect(lp); o.start(t); o.stop(fin+.1);
    });
    souffle(t,.05,'bandpass',Math.min(9000,f*3),null,vol*.5,.001,{sec:.5-loin*.4,hum:.4},2);
  }
  function boucleCloche(){
    if(pret()){
      const t=ctx.currentTime+.05, f=choisir([110,146.83,174.61,130.81]), n=Math.random()<.35?3:1;
      for(let i=0;i<n;i++) cloche(f,t+i*2.6,.12,{loin:.8,duree:9,pan:alea(-.5,.5)});
    }
    setTimeout(boucleCloche,alea(24000,46000));
  }

  /* ---- Chœur : sources (dents de scie + souffle) filtrées par formants ---- */
  const VOY={a:[[800,1],[1150,.5],[2900,.18]],o:[[450,1],[800,.45],[2830,.12]],ou:[[325,1],[700,.3],[2530,.08]],e:[[400,1],[1700,.35],[2600,.2]]};
  function choeur(fs,t,dur,vol=.06,v='a',att=1.4,rel=2){
    const sg=ctx.createGain();
    sg.gain.setValueAtTime(0,t); sg.gain.linearRampToValueAtTime(vol,t+att);
    sg.gain.setValueAtTime(vol,t+Math.max(att,dur-rel)); sg.gain.linearRampToValueAtTime(0,t+dur);
    sortie(sg,{sec:.35,hum:1});
    const entree=ctx.createGain();
    (VOY[v]||VOY.a).forEach(([f,a])=>{ const b=ctx.createBiquadFilter(); b.type='bandpass'; b.frequency.value=f; b.Q.value=8; const g=ctx.createGain(); g.gain.value=a*3.2; entree.connect(b); b.connect(g); g.connect(sg); });
    fs.forEach(f=>{
      [-10,0,9].forEach(c=>{
        const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.value=f; o.detune.value=c+alea(-4,4);
        const vib=ctx.createOscillator(); vib.frequency.value=alea(4.4,5.6); const vg=ctx.createGain(); vg.gain.value=f*.006; vib.connect(vg); vg.connect(o.frequency);
        const og=ctx.createGain(); og.gain.value=.11; o.connect(og); og.connect(entree);
        o.start(t); vib.start(t); o.stop(t+dur+.1); vib.stop(t+dur+.1);
      });
    });
    const s=ctx.createBufferSource(); s.buffer=bruit; s.loop=true; const bg=ctx.createGain(); bg.gain.value=.55; s.connect(bg); bg.connect(entree); s.start(t); s.stop(t+dur+.1);
  }
  function boucleChoeur(){
    if(pret()){ const a=ACCORDS[(iAcc+7)%ACCORDS.length].slice(1).map(f=>f*2); choeur(a,ctx.currentTime+.1,10,.035,choisir(['a','o','ou']),3.5,4); }
    setTimeout(boucleChoeur,alea(38000,62000));
  }

  /* ---- Crépitement des cierges ---- */
  function crepite(force=1){
    if(!pret()) return; const t=ctx.currentTime, n=1+(Math.random()*3|0);
    for(let i=0;i<n;i++) souffle(t+i*alea(.006,.05),alea(.004,.02),'highpass',alea(1500,4800),null,alea(.02,.07)*force,.0008,{sec:1,hum:.12,pan:alea(-.7,.7)});
  }
  function boucleCrepite(){ if(pret()) crepite(Math.random()<.08?2.2:.8); setTimeout(boucleCrepite,alea(140,1100)); }

  function demarrerAmbiance(){
    if(ambiance) return; ambiance=true;
    boucleOrgue(); boucleCrepite();
    setTimeout(boucleCloche,9000); setTimeout(boucleChoeur,22000);
  }
  function setActif(v){
    if(v && !init()) return false;
    actif=v; if(!ctx) return v;
    const t=ctx.currentTime;
    maitre.gain.cancelScheduledValues(t);
    if(v){ if(ctx.state!=='running') ctx.resume(); maitre.gain.setTargetAtTime(.9,t,.08); demarrerAmbiance(); }
    else maitre.gain.setTargetAtTime(0,t,.05);
    return v;
  }
  const P = fn=>(...a)=>{ if(pret()) fn(ctx.currentTime,...a); };

  return {
    init, setActif, get actif(){ return actif; }, pret, crepite,
    porte:P(t=>{
      osc('square',180,90,t,.05,.1,.001,{sec:1,hum:.4}); souffle(t,.05,'bandpass',2500,null,.3,.001,{sec:1,hum:.4},3);
      /* grincement des gonds */
      const o=ctx.createOscillator(); o.type='sawtooth'; const n=64, cv=new Float32Array(n); let f=55;
      for(let i=0;i<n;i++){ f=borne(f+alea(-10,10),28,115); cv[i]=f; }
      o.frequency.setValueCurveAtTime(cv,t+.25,2.1);
      const b1=ctx.createBiquadFilter(); b1.type='bandpass'; b1.frequency.value=900; b1.Q.value=5;
      const b2=ctx.createBiquadFilter(); b2.type='bandpass'; b2.frequency.value=2100; b2.Q.value=6;
      const g=ctx.createGain(); g.gain.setValueAtTime(0,t+.25); g.gain.linearRampToValueAtTime(.14,t+.55); g.gain.setValueAtTime(.14,t+1.95); g.gain.linearRampToValueAtTime(0,t+2.35);
      o.connect(b1); o.connect(b2); b1.connect(g); b2.connect(g); sortie(g,{sec:.7,hum:.6}); o.start(t+.25); o.stop(t+2.5);
      souffle(t+.3,2.4,'lowpass',300,120,.22,.6,{sec:.6,hum:.8});
      osc('sine',60,30,t+2.35,.9,.7,.003,{sec:1,hum:.9}); souffle(t+2.35,.6,'lowpass',500,80,.5,.002,{sec:1,hum:.9});
      accord([36.71,73.42,110,146.83,220,293.66],t+1.4,9,.045,2.5,4,{sec:.35,hum:1});
      choeur([146.83,220,293.66],t+1.8,8,.05,'a',2,3);
      cloche(110,t+2.6,.28,{loin:.4,duree:8});
    }),
    survol:P(t=>{ osc('sine',2637,2610,t,.09,.018,.002,{sec:.5,hum:.7,pan:alea(-.3,.3)}); }),
    tic:P(t=>{ osc('triangle',1800,1500,t,.03,.04,.001,{sec:1,hum:.2}); }),
    page:P(t=>{
      const s=ctx.createBufferSource(); s.buffer=bruit; s.loop=true;
      const f=ctx.createBiquadFilter(); f.type='bandpass'; f.Q.value=.9;
      f.frequency.setValueAtTime(900,t); f.frequency.linearRampToValueAtTime(3300,t+.22); f.frequency.linearRampToValueAtTime(1400,t+.5);
      const g=ctx.createGain(); g.gain.setValueAtTime(0,t); let tt=t;
      for(let i=0;i<9;i++){ tt+=alea(.022,.055); g.gain.linearRampToValueAtTime(alea(.04,.18)*(1-i/12),tt); }
      g.gain.linearRampToValueAtTime(.24,tt+.04); g.gain.exponentialRampToValueAtTime(.0001,tt+.28);
      s.connect(f); f.connect(g); sortie(g,{sec:.8,hum:.25,pan:alea(-.3,.3)}); s.start(t); s.stop(tt+.35);
      osc('sine',120,60,tt,.12,.1,.005,{sec:1});
    }),
    coeur:P((t,v=1)=>{
      osc('sine',58,36,t,.16,.55*v,.004,{sec:1,hum:.06}); souffle(t,.06,'lowpass',160,60,.22*v,.003,{sec:1});
      osc('sine',66,40,t+.21,.18,.38*v,.004,{sec:1,hum:.06});
    }),
    glas:P(t=>{ cloche(98,t,.5,{loin:.15,duree:7}); cloche(196.5,t,.1,{loin:.3,duree:4}); }),
    cloche:P((t,f=110,v=.2,loin=.5)=>cloche(f,t,v,{loin,duree:7})),
    goutte:P((t,v=1)=>{ osc('sine',1500,480,t,.1,.09*v,.002,{sec:.6,hum:.7,pan:alea(-.4,.4)}); osc('sine',2400,900,t+.01,.04,.035*v,.001,{sec:.5,hum:.5}); }),
    marteau:P((t,p=1)=>{
      osc('sine',72,26,t,.6,.95*p,.002,{sec:1,hum:.5});
      osc('sine',140,50,t,.25,.4*p,.002,{sec:1,hum:.3});
      souffle(t,.4,'lowpass',1600,110,.9*p,.001,{sec:1,hum:.6});
      souffle(t,.05,'highpass',2600,null,.5*p,.0008,{sec:1,hum:.4});
      for(let i=0;i<16;i++){ const tt=t+.04+Math.pow(Math.random(),1.7)*.9; souffle(tt,alea(.006,.03),'bandpass',alea(1200,5200),null,alea(.03,.12)*p*Math.max(.1,1-(tt-t)),.0008,{sec:1,hum:.3,pan:alea(-.8,.8)},4); }
      souffle(t+.05,2.2,'lowpass',110,45,.6*p,.15,{sec:1,hum:.9});
    }),
    verre:P((t,p=1)=>{
      souffle(t,.3,'highpass',2500,null,.7*p,.001,{sec:1,hum:.5}); souffle(t,.12,'bandpass',4500,null,.6*p,.001,{sec:1,hum:.5},1.5);
      osc('sine',90,40,t,.4,.45*p,.002,{sec:1,hum:.5});
      let tt=t; for(let i=0;i<46;i++){ tt+=Math.random()*Math.random()*.09; const f=alea(2200,9500);
        osc(Math.random()<.5?'sine':'triangle',f,f*alea(.97,1.01),tt,alea(.04,.3),alea(.02,.1)*p*Math.max(.15,1-(tt-t)/1.8),.001,{sec:1,hum:.6,pan:alea(-.9,.9)}); }
    }),
    sceau:P((t,lv=1)=>{
      osc('sine',110,55,t,.25,.45,.002,{sec:1,hum:.3}); souffle(t,.09,'lowpass',700,200,.28,.002,{sec:1});
      cloche(392*Math.pow(2,(lv-1)/5),t+.04,.05,{loin:.3,duree:2.5});
    }),
    lien:P(t=>{ choeur([110,164.81,233.08],t,3.2,.05,'ou',.6,1.6); osc('sine',55,52,t,2.6,.25,.4,{sec:.8,hum:.6}); }),
    catastrophe:P(t=>{ choeur([233.08,246.94,261.63,277.18],t+.05,2.6,.07,'a',.05,2); accord([36.71,38.89,73.42,77.78],t,3,.05,.05,2.5,{sec:.5,hum:1}); }),
    de:P(t=>{ for(let i=0;i<14;i++) souffle(t+i*alea(.04,.09),.02,'bandpass',alea(2200,4200),null,alea(.06,.14),.001,{sec:1,hum:.3,pan:alea(-.5,.5)},3); }),
    epargne:P(t=>{ cloche(784,t,.07,{loin:.3,duree:3}); cloche(1175,t+.14,.05,{loin:.3,duree:3}); choeur([293.66,369.99,440],t,3,.035,'o',.4,1.8); }),
    vent:P((t,v=1)=>{ souffle(t,1.6,'bandpass',300,900,.22*v,.5,{sec:.7,hum:.6},.6); }),
    rallume:P(t=>{ souffle(t,.14,'lowpass',520,150,.16,.008,{sec:1,hum:.3,pan:alea(-.6,.6)}); osc('sine',200,80,t,.1,.06,.004,{sec:1}); }),
    versement:P((t,dur=1)=>{
      const s=ctx.createBufferSource(); s.buffer=bruit; s.loop=true; const f=ctx.createBiquadFilter(); f.type='bandpass'; f.Q.value=4;
      const n=24, cv=new Float32Array(n); for(let i=0;i<n;i++) cv[i]=alea(280,900); f.frequency.setValueCurveAtTime(cv,t,dur);
      const g=ctx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.1,t+.08); g.gain.setValueAtTime(.1,t+dur*.7); g.gain.linearRampToValueAtTime(0,t+dur);
      s.connect(f); f.connect(g); sortie(g,{sec:.8,hum:.4}); s.start(t); s.stop(t+dur+.05);
      for(let i=0;i<5;i++){ const tt=t+alea(.05,dur); osc('sine',alea(260,420),alea(600,900),tt,.05,.05,.002,{sec:.8,hum:.4}); }
    }),
    cristal:P((t,k=1,v=1)=>{ osc('sine',1046.5*k,1046.5*k*.999,t,.9,.04*v,.004,{sec:.4,hum:.9}); osc('sine',1568*k,1568*k*.999,t+.02,.7,.02*v,.004,{sec:.4,hum:.9}); }),
    fonte:P((t,p=1)=>{
      const c=ctx.createOscillator(), m=ctx.createOscillator(), mg=ctx.createGain(), g=env(t,.3*p,.002,.5,{sec:1,hum:.6,pan:alea(-.4,.4)});
      const f=alea(560,700); c.frequency.value=f; m.frequency.value=f*2.76;
      mg.gain.setValueAtTime(f*1.4,t); mg.gain.exponentialRampToValueAtTime(10,t+.4);
      m.connect(mg); mg.connect(c.frequency); c.connect(g); c.start(t); m.start(t); c.stop(t+.6); m.stop(t+.6);
      souffle(t,.04,'highpass',4000,null,.2*p,.001,{sec:1});
      osc('sine',90,60,t,.15,.25*p,.002,{sec:1});
    }),
    grandAccord:P(t=>{
      accord([36.71,73.42,110,146.83,174.61,220,293.66],t,6,.055,.12,3,{sec:.5,hum:1});
      choeur([220,293.66,349.23,440],t,5.5,.07,'a',.4,2.5);
      cloche(110,t,.3,{loin:.3,duree:8});
    }),
    eilyn:P(t=>{
      accord([146.83,185,220,293.66],t,5,.03,.8,2.5,{sec:.3,hum:1});
      choeur([293.66,369.99,440],t+.2,5,.04,'o',1,2.5);
    }),
    mauvais:P(t=>{ cloche(138.59,t+.05,.08,{loin:.5,duree:3}); }),
    bon:P(t=>{ cloche(880,t,.05,{loin:.35,duree:2.5}); cloche(1318.5,t+.1,.035,{loin:.35,duree:2.5}); }),
    visee:P(t=>{ osc('sine',520,1400,t,.18,.02,.01,{sec:.6,hum:.5}); }),
  };
})();

/* =====================================================================
   2. LUMIÈRE — flammes de cierges (canvas), poussière, pénombre
   ===================================================================== */
function dessinerFlamme(c,x,y,F,I,t,ph,penche=0){
  if(I<=.015) return;
  const amp = RM ? .3 : 1;
  const n1 = Math.sin(t*1.9+ph)*.55 + Math.sin(t*4.3+ph*2.1)*.3 + Math.sin(t*9.7+ph*3.3)*.15;
  const n2 = Math.sin(t*2.7+ph*1.3)*.6 + Math.sin(t*6.1+ph*.7)*.4;
  const h = F*(1+.14*n2*amp)*(.35+.65*Math.min(1,I));
  const sw = F*.17*n1*amp + borne(penche,-1.2,1.2)*F*.55;
  c.save(); c.globalCompositeOperation='lighter';
  const hy=y-h*.45, R=Math.min(F*3.2, c.canvas.width/2, hy);
  if(R>2){
    let g=c.createRadialGradient(x+sw*.3,hy,0,x+sw*.3,hy,R);
    g.addColorStop(0,`rgba(255,196,120,${.36*I})`); g.addColorStop(.4,`rgba(255,140,60,${.12*I})`); g.addColorStop(1,'rgba(255,90,30,0)');
    c.fillStyle=g; c.beginPath(); c.arc(x+sw*.3,hy,R,0,Math.PI*2); c.fill();
  }
  const w=F*.27;
  const forme=k=>{
    c.beginPath(); c.moveTo(x-w*k,y);
    c.bezierCurveTo(x-w*k*1.25,y-h*k*.45, x+sw*.45-w*k*.5,y-h*k*.82, x+sw*k,y-h*k);
    c.bezierCurveTo(x+sw*.45+w*k*.5,y-h*k*.82, x+w*k*1.25,y-h*k*.45, x+w*k,y);
    c.bezierCurveTo(x+w*k*.8,y+w*k*.75, x-w*k*.8,y+w*k*.75, x-w*k,y);
  };
  let g=c.createLinearGradient(0,y+w,0,y-h);
  g.addColorStop(0,`rgba(70,110,255,${.55*I})`); g.addColorStop(.16,`rgba(255,190,110,${.85*I})`);
  g.addColorStop(.55,`rgba(255,120,40,${.7*I})`); g.addColorStop(1,'rgba(180,30,10,0)');
  forme(1); c.fillStyle=g; c.fill();
  g=c.createLinearGradient(0,y,0,y-h*.6); g.addColorStop(0,`rgba(255,255,235,${.95*Math.min(1,I)})`); g.addColorStop(1,'rgba(255,220,150,0)');
  forme(.55); c.fillStyle=g; c.fill();
  c.restore();
}

class Cierge{
  constructor(cv,opt={}){
    this.cv=cv; this.c=cv.getContext('2d'); this.ph=Math.random()*100;
    this.cire = opt.cire ?? +(cv.dataset.cire||1);
    this.hote = opt.hote || cv.parentElement;
    this.lux = opt.lux ?? true;
    this.seule = !!opt.seule;           /* flamme seule (curseur, bougie d'Eilyn) */
    this.vie=1; this.cible=1; this.fumee=-9; this.visible=true; this.k=0;
    this.coulures=Array.from({length:3+(Math.random()*2|0)},()=>({x:alea(.02,.8),w:alea(.1,.18),l:alea(.06,.3)}));
    this.taille();
  }
  taille(){
    const r=this.cv.getBoundingClientRect();
    this.W=Math.max(2,Math.round(r.width*DPR)); this.H=Math.max(2,Math.round(r.height*DPR));
    this.cv.width=this.W; this.cv.height=this.H;
  }
  eteindre(t){ this.cible=0; this.fumee=t; }
  rallumer(){ this.cible=1; }
  dessiner(t,vent){
    const {c,W,H}=this; c.clearRect(0,0,W,H);
    this.vie += (this.cible-this.vie)*(this.cible>this.vie?.06:.3);
    const I = this.vie*Lumiere.global*(.9+.1*Math.sin(t*7.3+this.ph)*(RM?.3:1));
    if(this.seule){ dessinerFlamme(c,W/2,H*.82,W*.38,I,t,this.ph,vent); return I; }
    const x=W/2, F=W*.4, cw=W*.44, zone=H-F*2.5;
    const hc=Math.max(F*.35,zone*borne(this.cire,0,1)), top=H-hc;
    const g=c.createLinearGradient(x-cw/2,0,x+cw/2,0);
    g.addColorStop(0,'#4e4336'); g.addColorStop(.32,'#e6d8b6'); g.addColorStop(.58,'#d2c29d'); g.addColorStop(1,'#3d342a');
    c.fillStyle=g; c.fillRect(x-cw/2,top,cw,hc);
    for(const d of this.coulures){
      const dx=x-cw/2+d.x*cw, dw=d.w*cw, dl=Math.min(hc*.9,d.l*zone);
      c.beginPath(); c.moveTo(dx,top); c.lineTo(dx,top+dl-dw/2); c.arc(dx+dw/2,top+dl-dw/2,dw/2,Math.PI,0,true); c.lineTo(dx+dw,top); c.closePath();
      c.fillStyle='rgba(245,234,208,.55)'; c.fill();
    }
    const gl=c.createLinearGradient(0,top,0,top+hc*.7);
    gl.addColorStop(0,`rgba(255,170,90,${.5*I})`); gl.addColorStop(1,'rgba(255,170,90,0)');
    c.fillStyle=gl; c.fillRect(x-cw/2,top,cw,hc*.7);
    c.beginPath(); c.ellipse(x,top,cw/2,cw*.15,0,0,Math.PI*2); c.fillStyle='#efe2c2'; c.fill();
    c.beginPath(); c.ellipse(x,top,cw*.32,cw*.08,0,0,Math.PI*2); c.fillStyle=`rgba(255,190,110,${.55*I+.08})`; c.fill();
    const mx=x+borne(vent,-1,1)*F*.12, my=top-F*.32;
    c.strokeStyle='#1a1210'; c.lineWidth=Math.max(1,W*.035); c.beginPath(); c.moveTo(x,top); c.lineTo(mx,my); c.stroke();
    if(this.vie<.5){ c.fillStyle=`rgba(255,120,40,${(.5-this.vie)*1.2})`; c.beginPath(); c.arc(mx,my,W*.03,0,Math.PI*2); c.fill(); }
    dessinerFlamme(c,mx,my,F,I,t,this.ph,vent);
    const age=t-this.fumee;
    if(age>0 && age<2.6){
      for(let k=0;k<8;k++){
        const py=my-(age*26+k*9)*DPR, px=mx+Math.sin(age*3+k*.9)*k*1.4*DPR, a=.22*(1-age/2.6)*(1-k/8);
        c.fillStyle=`rgba(190,180,175,${a})`; c.beginPath(); c.arc(px,py,(1.6+k*.7)*DPR,0,Math.PI*2); c.fill();
      }
    }
    this.fy = my/DPR;
    return I;
  }
}

const Lumiere = {
  global:1, vent:0, cierges:[], penombre:null, foyer:null,
  ajouter(cv,opt){ const k=new Cierge(cv,opt); this.cierges.push(k); if(this.io) this.io.observe(cv); return k; },
  souffler(){
    const t=performance.now()/1000;
    this.cierges.forEach(k=>{ if(k.visible && !k.seule) k.eteindre(t); });
    Son.vent(1.2);
    setTimeout(()=>this.cierges.forEach((k,i)=>{ if(k.cible===0) setTimeout(()=>{ k.rallumer(); if(k.visible) Son.rallume(); },i*alea(140,260)); }),RM?400:1700);
  },
  rafale(v){ this.vent += v*(Math.random()<.5?-1:1); },
  nuit(v){ if(!this.penombre) return; if(v==null) this.penombre.style.removeProperty('--nuit'); else this.penombre.style.setProperty('--nuit',v); },
};

/* Poussière qui flotte dans les rais de lumière */
const Poussiere = (()=>{
  const cv=$('#poussiere'), c=cv.getContext('2d'); let W=0,H=0,parts=[],eclats=[],rais=[];
  const R=Math.min(1.5,DPR);
  function taille(){
    W=innerWidth; H=innerHeight; cv.width=Math.round(W*R); cv.height=Math.round(H*R); c.setTransform(R,0,0,R,0,0);
    const N = FIN ? 120 : 55;
    parts=Array.from({length:N},()=>({x:Math.random()*W,y:Math.random()*H,z:alea(.3,1),vx:alea(-.05,.05),vy:alea(-.06,.03),ph:Math.random()*9}));
    rais=[{x:.2,dx:.34,w:.09,ph:0},{x:.55,dx:.26,w:.06,ph:2},{x:.8,dx:.16,w:.11,ph:4}];
  }
  function eclat(x,y,n=40,force=1){
    for(let i=0;i<n;i++){ const a=alea(Math.PI*1.05,Math.PI*1.95); const v=alea(.6,4.5)*force;
      eclats.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:.06,vie:1,d:alea(.006,.016),r:alea(.8,2.6),col:Math.random()<.7?'200,190,175':'110,100,95'}); }
  }
  function chute(n=40){
    for(let i=0;i<n;i++) eclats.push({x:Math.random()*W,y:alea(-40,0),vx:alea(-.2,.2),vy:alea(.3,1.4),g:.012,vie:1,d:alea(.003,.007),r:alea(.6,1.8),col:'220,205,180'});
  }
  function frame(t,mx,my){
    c.clearRect(0,0,W,H);
    c.globalCompositeOperation='lighter';
    for(const r of rais){
      const a=(.03+.018*Math.sin(t*.25+r.ph))*Lumiere.global;
      const x0=r.x*W, x1=x0+r.dx*W, w0=r.w*W, w1=w0*2.4;
      const g=c.createLinearGradient(x0,0,x1,H); g.addColorStop(0,`rgba(255,214,160,${a})`); g.addColorStop(.7,`rgba(255,190,130,${a*.35})`); g.addColorStop(1,'rgba(255,190,130,0)');
      c.fillStyle=g; c.beginPath(); c.moveTo(x0-w0/2,0); c.lineTo(x0+w0/2,0); c.lineTo(x1+w1/2,H); c.lineTo(x1-w1/2,H); c.closePath(); c.fill();
    }
    for(const p of parts){
      if(!RM){ p.x+=p.vx+Math.sin(t*.5+p.ph)*.06*p.z; p.y+=p.vy+Math.cos(t*.4+p.ph)*.04; if(p.x<-5)p.x=W+5; if(p.x>W+5)p.x=-5; if(p.y<-5)p.y=H+5; if(p.y>H+5)p.y=-5; }
      let b=.1;
      for(const r of rais){ const fy=p.y/H, cx=(r.x+r.dx*fy)*W, hw=r.w*W*(1+1.4*fy)/2; const d=Math.abs(p.x-cx); if(d<hw) b+=.55*(1-d/hw); }
      if(mx!=null){ const dx=p.x-mx, dy=p.y-my, d=Math.sqrt(dx*dx+dy*dy); if(d<230) b+=.7*(1-d/230); }
      c.fillStyle=`rgba(255,232,196,${Math.min(.9,b*p.z)*Lumiere.global})`;
      c.beginPath(); c.arc(p.x,p.y,p.z*1.3,0,Math.PI*2); c.fill();
    }
    c.globalCompositeOperation='source-over';
    for(let i=eclats.length-1;i>=0;i--){
      const e=eclats[i]; e.vx*=.985; e.vy+=e.g; e.x+=e.vx; e.y+=e.vy; e.vie-=e.d;
      if(e.vie<=0||e.y>H+20){ eclats.splice(i,1); continue; }
      c.fillStyle=`rgba(${e.col},${e.vie*.75})`; c.beginPath(); c.arc(e.x,e.y,e.r,0,Math.PI*2); c.fill();
    }
  }
  taille(); addEventListener('resize',taille);
  return {frame,eclat,chute,taille};
})();

/* =====================================================================
   3. EFFETS DIVERS
   ===================================================================== */
const flashEl=$('#flash');
function flash(couleur='#c4162b',op=.5,duree=500){ if(RM) op*=.5; flashEl.style.background=couleur; flashEl.animate([{opacity:op},{opacity:0}],{duration:duree,easing:'ease-out'}); }
function secousse(p=10,d=420){
  if(RM) return; const k=[];
  for(let i=0;i<10;i++){ const f=1-i/10; k.push({transform:`translate(${((i%2?-1:1)*p*f*alea(.6,1)).toFixed(1)}px,${(alea(-1,1)*p*f*.6).toFixed(1)}px)`}); }
  k.push({transform:'none'});
  $('#nef').animate(k,{duration:d}); const s=$('#fond svg'); if(s) s.animate(k.map(x=>({transform:x.transform})),{duration:d,composite:'add'});
}
function tache(x,y){
  const nef=$('#nef'), r=nef.getBoundingClientRect(), e=document.createElement('div'); e.className='tache';
  e.style.left=(x-r.left)+'px'; e.style.top=(y-r.top)+'px';
  let p=''; const n=9; for(let i=0;i<n;i++){ const a=i/n*Math.PI*2+alea(-.2,.2), rr=alea(5,11); p+=`<circle cx="${23+Math.cos(a)*rr*1.3}" cy="${23+Math.sin(a)*rr*1.3}" r="${alea(1,3)}"/>`; }
  e.innerHTML=`<svg viewBox="0 0 46 46" aria-hidden="true"><circle cx="23" cy="23" r="${alea(5,7)}"/>${p}</svg>`;
  nef.appendChild(e);
  e.animate([{transform:'scale(.2)',opacity:1},{transform:'scale(1)',opacity:1,offset:.08},{opacity:.9,offset:.6},{opacity:0}],{duration:4200,easing:'ease-out'}).onfinish=()=>e.remove();
}

/* =====================================================================
   4. LA NEF — décor de fond généré (arcs brisés en perspective + rosace)
   ===================================================================== */
function construireNef(){
  const vx=500, vy=470;
  let s=`<svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>
  <radialGradient id="nef-lum" cx="50%" cy="38%" r="55%"><stop offset="0" stop-color="#3a1a22" stop-opacity=".9"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <linearGradient id="nef-pil" x1="0" x2="1"><stop offset="0" stop-color="#08040606"/><stop offset=".5" stop-color="#22161b"/><stop offset="1" stop-color="#080406"/></linearGradient></defs>
  <rect width="1000" height="1000" fill="url(#nef-lum)"/>`;
  for(let i=-12;i<=12;i++) s+=`<line x1="${vx}" y1="${vy}" x2="${vx+i*130}" y2="1000" stroke="#1d1216" stroke-width="1.1"/>`;
  /* rosace du fond, au point de fuite */
  const RX=vx, RY=vy-175, RR=48; let rose=`<g id="nef-rose" opacity=".16"><circle cx="${RX}" cy="${RY}" r="${RR+6}" fill="#0a0507" stroke="#3a2a1c" stroke-width="3"/>`;
  const PAL=['#b3122a','#2e6fb3','#d9a93a','#6a2c8f','#a9d8ec'];
  for(let i=0;i<16;i++){ const a=i/16*360; rose+=`<path transform="translate(${RX} ${RY}) rotate(${a})" d="M-5 -24 L-5 -38 C-5 -44 -2 -47 0 -48 C2 -47 5 -44 5 -38 L5 -24 C2 -22 -2 -22 -5 -24Z" fill="${PAL[i%5]}" stroke="#050203" stroke-width="1"/>`; }
  rose+=`<circle cx="${RX}" cy="${RY}" r="16" fill="#b3122a" stroke="#050203" stroke-width="2"/></g>`;
  s+=rose;
  for(let k=9;k>=0;k--){
    const f=Math.pow(.7,k), w=430*f, bas=vy+600*f, nais=bas-480*f, apex=nais-w*1.05, sw=Math.max(.6,16*f);
    const op=(.3+.7*(1-k/9)).toFixed(2);
    const p=`M${vx-w} ${bas} V${nais} C${vx-w} ${nais-w*.55} ${vx-w*.42} ${apex+w*.14} ${vx} ${apex} C${vx+w*.42} ${apex+w*.14} ${vx+w} ${nais-w*.55} ${vx+w} ${nais} V${bas}`;
    s+=`<rect x="${vx-w-sw*1.6}" y="${nais}" width="${sw*3.2}" height="${bas-nais}" fill="url(#nef-pil)" opacity="${op}"/><rect x="${vx+w-sw*1.6}" y="${nais}" width="${sw*3.2}" height="${bas-nais}" fill="url(#nef-pil)" opacity="${op}"/>`;
    s+=`<path d="${p}" fill="none" stroke="#2a1b20" stroke-width="${sw}" opacity="${op}"/>`;
    s+=`<path d="${p}" fill="none" stroke="#8c7037" stroke-width="${Math.max(.4,1.3*f)}" opacity="${(op*.32).toFixed(2)}"/>`;
  }
  s+='</svg>';
  $('#fond').innerHTML=s;
}

/* =====================================================================
   5. RENDU DU CONTENU (depuis data.js)
   ===================================================================== */
const nomAffiche = (()=>{ const n=String(D.nom||'Croc'); return n.charAt(0).toUpperCase()+n.slice(1).toLowerCase(); })();
const FRERE = D.frere || '???';
function enluminer(txt){
  let h=esc(txt);
  h=h.replace(/\bNPC\b/g,'<span class="mot-npc">NPC</span>');
  if(D.frere) h=h.split(esc(D.frere)).join(`<span class="mot-frere">${esc(D.frere)}</span>`);
  h=h.replace(/\bChaos\b/g,'<span class="mot-chaos">Chaos</span>');
  return h;
}
function defsGlobales(){
  const d=document.createElement('div'); d.setAttribute('aria-hidden','true');
  d.innerHTML=`<svg width="0" height="0" style="position:absolute"><defs>
    <linearGradient id="robe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d2a33"/><stop offset=".55" stop-color="#1a1015"/><stop offset="1" stop-color="#080405"/></linearGradient>
    <linearGradient id="robe-eilyn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a4630"/><stop offset=".45" stop-color="#2a1a16"/><stop offset="1" stop-color="#0c0607"/></linearGradient>
    <linearGradient id="sang-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d01c32"/><stop offset=".15" stop-color="#9b0d1f"/><stop offset="1" stop-color="#3a040c"/></linearGradient>
  </defs></svg>`;
  document.body.prepend(d);
}

function rendre(){
  /* Frontispice */
  $('#titreTxt').textContent = nomAffiche;
  $('#porte-nom').textContent = nomAffiche;
  const gt=$('#gouttes');
  [[14,40,5.5,1.2],[37,72,7,3.4],[60,28,6,5.1],[82,58,8,2.2]].forEach(([l,h,d,dl])=>{
    const g=document.createElement('i'); g.className='goutte';
    g.style.cssText=`left:${l}%;--h:${h}px;--d:${d}s;--delai:${dl}s`;
    g.addEventListener('animationiteration',e=>{ if(e.target===g && enVue.frontispice) Son.goutte(.5); });
    gt.appendChild(g);
  });

  /* I · Identité */
  $('#champs').innerHTML=(D.champs||[]).map(c=>{
    const inc = String(c.valeur).trim()==='???';
    return `<div><dt>${esc(c.label)}</dt><dd${inc?' class="inconnu"':''}>${inc?'<span aria-hidden="true">???</span><span class="sr">inconnu</span>':esc(c.valeur)}</dd></div>`;
  }).join('');
  $('#physique').innerHTML=(D.physique||[]).map(p=>`<p>${esc(p)}</p>`).join('');

  /* II · Psychologie */
  const psy=D.psycho||[];
  $('#psycho').innerHTML=psy.map((p,i)=>`<p data-n="¶ ${romain(i+1)}"${i===psy.length-1&&i>0?' class="alerte"':''}>${enluminer(p)}</p>`).join('');
  construireProcession();

  /* III · Statistiques */
  construireFioles();
  construireRosaces();

  /* IV · Compétences */
  construireDons();

  /* V · Titre */
  construireTitres();

  /* VI · Galerie */
  construireGalerie();
}

/* ---------- Procession ---------- */
function silhouette(frere){
  return `<svg viewBox="0 0 60 140" aria-hidden="true">
    <ellipse cx="30" cy="138" rx="22" ry="3" fill="rgba(0,0,0,.65)"/>
    <ellipse class="aureole" cx="30" cy="5" rx="12" ry="3.6"/>
    <path class="robe" d="M30 10 C19 10 13 21 13 34 C13 42 15 47 17 51 C10 60 6 82 4 138 H56 C54 82 50 60 43 51 C45 47 47 42 47 34 C47 21 41 10 30 10 Z"/>
    <path d="M17 51 C22 56 38 56 43 51" fill="none" stroke="rgba(0,0,0,.6)" stroke-width="1.4"/>
    <path d="M30 56 V136" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>
    <path class="visage" d="M30 22 C24 22 21 28 21 35 C21 42 25 46 30 46 C35 46 39 42 39 35 C39 28 36 22 30 22Z"/>
    ${frere?'':'<g class="yeux"><circle cx="26.5" cy="35" r="1.3"/><circle cx="33.5" cy="35" r="1.3"/></g>'}
    <rect class="cire" x="27.5" y="58" width="5" height="16" rx="1"/>
    <path d="M21 72 C24 68.5 36 68.5 39 72 C37 76.5 23 76.5 21 72Z" fill="#120a0d" stroke="rgba(201,162,74,.25)" stroke-width=".8"/>
    ${frere?'':'<g class="sceau-rouge"><circle cx="30" cy="96" r="7" fill="#8a0f1c" stroke="#2a0508"/><path d="M26.2 92.2 L33.8 99.8 M33.8 92.2 L26.2 99.8" stroke="#ffd2d6" stroke-width="1.6"/></g>'}
  </svg>`;
}
let proc = { chaos:0 };
function construireProcession(){
  const box=$('#procession'), total=12, fr=2+Math.floor(Math.random()*8);
  let h='';
  for(let i=0;i<total;i++){
    const dl=(-i*.37).toFixed(2)+'s';
    if(i===fr){
      h+=`<button type="button" class="fig frere" style="--dl:${dl}" aria-label="${esc(FRERE)}, son frère. Pas un NPC.">${silhouette(true)}<canvas aria-hidden="true"></canvas><span class="etiq" aria-hidden="true">Frère · pas un NPC</span><span class="nom" aria-hidden="true">${esc(FRERE)}</span></button>`;
    } else {
      const n=String(i+1).padStart(2,'0');
      h+=`<button type="button" class="fig" data-n="${n}" style="--dl:${dl}" aria-label="Silhouette ${n} : NPC, non jugé">${silhouette(false)}<span class="etiq" aria-hidden="true">[NPC]</span><span class="visee" aria-hidden="true"></span></button>`;
    }
  }
  box.innerHTML=h;
}

/* ---------- Fioles ---------- */
const FY0=238, FPAS=8.4;
function construireFioles(){
  const st=D.stats||[];
  $('#fioles').innerHTML=st.map((s,i)=>{
    const max=s.max||20; let grad='';
    for(let k=1;k<=max;k++){ const y=FY0-k*(FPAS*20/max); grad+=`<line class="grad" data-k="${k}" x1="51" x2="${k%5===0?40:45}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>`; if(k%5===0) grad+=`<text class="chiffre" x="66" y="${(y+3).toFixed(1)}">${romain(k)}</text>`; }
    const corps='M25 34 V60 C11 68 8 84 8 100 V222 C8 236 20 244 35 244 C50 244 62 236 62 222 V100 C62 84 59 68 45 60 V34 Z';
    const lbl=`${s.nom} : ${s.val} sur ${max}${s.bonus?`, bonus ${s.bonus}`:''}`;
    return `<button type="button" class="fiole" data-v="${+s.val||0}" data-max="${max}" aria-label="${esc(lbl)}">
      <svg viewBox="0 0 80 250" aria-hidden="true">
        <defs><clipPath id="clip-f${i}"><path d="${corps}"/></clipPath></defs>
        <path d="${corps}" fill="rgba(5,2,3,.75)"/>
        <g clip-path="url(#clip-f${i})"><g class="liq" transform="translate(0 ${FY0+6})"><path class="vague" d="M-10 0 Q0 -4 10 0 T30 0 T50 0 T70 0 T90 0 T110 0 T130 0 T150 0 V260 H-10 Z" fill="url(#sang-grad)"/></g></g>
        ${grad}
        <path class="verre" d="${corps}"/>
        <path class="reflet" d="M15 106 V214"/>
        <rect x="21" y="31" width="28" height="6" rx="2" fill="rgba(239,228,204,.22)"/>
        <rect x="23" y="14" width="24" height="20" rx="3" fill="#5b3a22" stroke="#24150c"/>
        <path d="M35 6 C42 6 46 10 45 15 C46 20 41 23 35 22 C28 23 24 19 25 14 C24 9 29 6 35 6Z" fill="#8a0f1c" stroke="#3a040c"/>
        <text x="35" y="17.5" text-anchor="middle" font-size="8" fill="#e8b0b5" font-family="Georgia,serif">C</text>
      </svg>
      ${s.bonus?`<span class="bonus" aria-hidden="true">${esc(s.bonus)}</span>`:''}
      <span class="nomf">${esc(s.nom)}</span>
      <span class="valf"><span class="n">0</span><small> / ${max}</small></span>
    </button>`;
  }).join('');
  const bon=st.filter(s=>s.bonus), t=(D.titres||[])[0];
  if(bon.length) $('#noteBonus').innerHTML=`Les fioles marquées d'un sceau d'or reçoivent ${esc(bon[0].bonus)}${t?` du titre <b>[${esc(t.nom)}]</b>`:''} : ${bon.map(s=>esc(s.nom)).join(' et ')}.`;
}
function remplirFioles(){
  const fs=$$('#fioles .fiole');
  fs.forEach((f,i)=>setTimeout(()=>{
    const v=+f.dataset.v, max=+f.dataset.max, liq=$('.liq',f), n=$('.n',f), cible=FY0-v*(FPAS*20/max), dep=FY0+6, t0=performance.now(), dur=RM?10:1100+v*120;
    Son.versement(.9);
    (function pas(){
      const p=Math.min(1,(performance.now()-t0)/dur), e=1-Math.pow(1-p,3), y=dep+(cible-dep)*e;
      liq.setAttribute('transform',`translate(0 ${y.toFixed(2)})`);
      const niv=Math.round(v*e); n.textContent=niv;
      $$('.grad',f).forEach(g=>g.classList.toggle('on',+g.dataset.k<=niv));
      if(p<1) requestAnimationFrame(pas);
    })();
  },i*(RM?0:170)));
}

/* ---------- Rosaces ---------- */
const PAL_VITRAIL=['#b3122a','#2e6fb3','#d9a93a','#6a2c8f','#7fc4e0'];
function construireRosaces(){
  $('#rosaces').innerHTML=(D.rolls||[]).map(r=>{
    const v=+r.val||0; let p='';
    for(let i=0;i<20;i++) p+=`<path class="petale" data-i="${i}" transform="rotate(${i*18})" d="M-8.6 -58 L-8.6 -82 C-8.6 -93 -4 -99 0 -101 C4 -99 8.6 -93 8.6 -82 L8.6 -58 C4 -55 -4 -55 -8.6 -58Z" fill="${PAL_VITRAIL[i%5]}" fill-opacity=".05"/>`;
    let q=''; for(let i=0;i<10;i++){ const a=(i/10)*Math.PI*2-Math.PI/2; q+=`<circle class="petale int" data-i="${i}" cx="${(Math.cos(a)*40).toFixed(2)}" cy="${(Math.sin(a)*40).toFixed(2)}" r="11" fill="${PAL_VITRAIL[(i+2)%5]}" fill-opacity=".05"/>`; }
    const cls=v>=100?'pleine':v<=10?'eteinte':'';
    return `<figure class="rosace ${cls}" data-v="${v}" role="img" aria-label="${esc(r.nom)} : ${v} sur 100">
      <div class="halo" aria-hidden="true"></div>
      <svg viewBox="-112 -112 224 224" aria-hidden="true">
        <defs><radialGradient id="rl-${esc(r.nom).replace(/\W/g,'')}"><stop offset="0" stop-color="#fff6dc" stop-opacity=".35"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/></radialGradient></defs>
        <circle r="108" fill="#0a0507"/>
        <g class="p-ext">${p}</g><g class="p-int">${q}</g>
        <circle class="anneau" r="105"/><circle class="anneau-or" r="100.5"/><circle class="anneau-or" r="55.5"/>
        <circle r="27" fill="#0a0507" stroke="#c9a24a" stroke-width="1.2"/>
        ${v>=100?`<circle r="100" fill="url(#rl-${esc(r.nom).replace(/\W/g,'')})" pointer-events="none" class="lum" opacity="0"/>`:''}
        <text class="centre-txt" y="-3"><tspan class="n">0</tspan></text>
        <text class="centre-pct" y="16">sur 100</text>
      </svg>
      <figcaption><h4>${esc(r.nom)}</h4><p>${v>=100?'En pleine lumière.':v<=10?'Presque éteinte.':' '}</p></figcaption>
    </figure>`;
  }).join('');
}
function allumerRosaces(){
  $$('#rosaces .rosace').forEach((ro,j)=>setTimeout(()=>{
    const v=+ro.dataset.v, ext=$$('.p-ext .petale',ro), int=$$('.p-int .petale',ro), n=$('.n',ro);
    const t0=performance.now(), dur=RM?10:1800; let dernier=-1;
    (function pas(){
      const p=Math.min(1,(performance.now()-t0)/dur), cur=v*p;
      ext.forEach((e,i)=>{ const fr=borne(cur/5-i,0,1); e.setAttribute('fill-opacity',(.05+.85*fr).toFixed(2)); });
      int.forEach((e,i)=>{ const fr=borne(cur/10-i,0,1); e.setAttribute('fill-opacity',(.05+.8*fr).toFixed(2)); });
      n.textContent=Math.round(cur);
      const k=Math.floor(cur/5); if(k!==dernier){ dernier=k; Son.cristal(Math.pow(2,k/12),.8); }
      if(p<1) requestAnimationFrame(pas);
      else {
        if(v>=100){ const l=$('.lum',ro); if(l) l.animate([{opacity:0},{opacity:1}],{duration:1400,fill:'forwards'}); Son.cloche(220,.12,.3); }
        else if(v<=10){ const i=Math.min(19,Math.floor(v/5)); ext[i]&&ext[i].classList.add('vacille'); Son.cloche(73.42,.08,.7); }
      }
    })();
    if(v<=10 && v>0) Son.cristal(.5,.6);
  },j*(RM?0:700)));
}

/* ---------- Compétences ---------- */
const MARTEAU_SVG=`<svg viewBox="0 0 360 120" aria-hidden="true">
  <defs>
    <linearGradient id="m-manche" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3944"/><stop offset=".5" stop-color="#1e1d25"/><stop offset="1" stop-color="#0d0c12"/></linearGradient>
    <linearGradient id="m-tete" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9cb6c4"/><stop offset=".45" stop-color="#5d7a8a"/><stop offset="1" stop-color="#2c3e48"/></linearGradient>
  </defs>
  <path d="M8 66 C-14 80 -10 104 -30 112 M14 64 C0 92 10 104 -6 120" fill="none" stroke="#e9e4da" stroke-width="3" stroke-linecap="round" opacity=".75"/>
  <rect x="0" y="54" width="285" height="12" rx="6" fill="url(#m-manche)"/>
  <g stroke="#2a2620" stroke-width=".8">${Array.from({length:9},(_,i)=>`<path d="M${8+i*8} 53 l6 14 h4 l-6 -14z" fill="#ece6d8"/>`).join('')}</g>
  <g id="m-tete-g">
    <rect x="262" y="12" width="78" height="96" rx="4" fill="url(#m-tete)" stroke="#16222a" stroke-width="2"/>
    <g fill="#c9dbe4" stroke="#16222a" stroke-width="1.2">${[0,1,2].map(r=>[0,1,2].map(c=>`<path d="M${276+c*24} ${28+r*30} l9 -9 l9 9 l-9 9z"/>`).join('')).join('')}</g>
    <g fill="#7f9aa8" stroke="#16222a" stroke-width="1.2">
      ${[0,1,2,3].map(c=>`<path d="M${266+c*19} 108 l8 12 l8 -12z"/><path d="M${266+c*19} 12 l8 -12 l8 12z"/>`).join('')}
      ${[0,1,2,3].map(r=>`<path d="M340 ${18+r*23} l12 8 l-12 8z"/>`).join('')}
    </g>
    <rect x="262" y="12" width="78" height="10" fill="rgba(255,255,255,.18)"/>
  </g>
</svg>`;
function construireDons(){
  const C=D.competences||[]; let h='';
  const L=C.find(c=>Array.isArray(c.niveaux));
  if(L){
    const n0=L.niveaux[0];
    h+=`<article class="folio don brule" id="don-lien">
      <div class="don-tete"><div><p class="don-type">Compétence · ${esc(L.type)}</p><h3 class="don-nom">[${esc(L.nom)}]</h3></div><span class="don-niv">LV.<span id="lvRom">${romain(n0.lv)}</span></span></div>
      <div class="texte enlumine"><p>${esc(L.desc)}</p></div>
      <h4 class="rubrique">Le rituel</h4>
      <div class="sceaux" role="group" aria-label="Niveau de la compétence">${L.niveaux.map(n=>`<button type="button" class="sceau" data-lv="${n.lv}" aria-pressed="${n.lv===n0.lv}" aria-label="Niveau ${n.lv}">${romain(n.lv)}</button>`).join('')}</div>
      <dl class="rituel-info">
        <div><dt>Coût</dt><dd><b id="lvCout">${n0.cout} %</b> d'ENE</dd></div>
        <div><dt>Préavis du Système</dt><dd><b id="lvPreavis">${n0.preavis}</b> secondes</dd></div>
        <div><dt>Pour atteindre ce niveau</dt><dd id="lvRequis">${esc(n0.requis)}</dd></div>
      </dl>
      <p class="rituel-special" id="lvSpecial" hidden></p>
      <div class="autel" id="autel">
        <div class="sceau-lien u"><span>${esc(nomAffiche)}</span><small>l'utilisateur</small></div>
        <canvas id="vitrail" role="img" aria-label="Vitrail de l'autel"></canvas>
        <div class="sceau-lien c"><span>Cible</span><small>désignée</small></div>
        <svg class="fil" id="fil" aria-hidden="true"><path id="filPath" pathLength="1" d="M0 0"/></svg>
        <div class="compte" id="compte" aria-hidden="true"></div>
        <div class="de" id="de" aria-hidden="true"></div>
      </div>
      <div class="rituel-bas">
        <div class="ene" id="ene"><canvas id="cierge-ene" aria-hidden="true"></canvas><div><span>ENE</span><b id="eneVal">100 %</b></div></div>
        <button type="button" class="btn-or" id="rituelGo">Accomplir le rituel</button>
      </div>
      <div class="registre-rituel systeme" id="rituelLog" aria-live="polite">[SYSTÈME] En attente du rituel.</div>
      <ul class="victimes" id="victimes" aria-label="Victimes"></ul>
      <p class="note">Simulation illustrative : les catastrophes tirées au sort sont des exemples (liste « catastrophes » de data.js).</p>
    </article>`;
  }
  const M=C.find(c=>c!==L);
  if(M){
    h+=`<article class="folio don brule" id="don-marteau">
      <div class="don-tete"><div><p class="don-type">Compétence · ${esc(M.type)}</p><h3 class="don-nom">[${esc(M.nom)}]</h3></div>${M.niveau?`<span class="don-niv">LV.${romain(M.niveau)}</span>`:''}</div>
      <div class="forge-grille">
        <div>
          <div class="texte enlumine"><p>${esc(M.desc)}</p></div>
          <div class="forge" id="forge"><div class="dalle"><svg id="fissures" aria-hidden="true"></svg></div><div class="marteau" id="marteau">${MARTEAU_SVG}</div></div>
          <div class="forge-bas"><button type="button" class="btn-or" id="frapper">Frapper la dalle</button><p id="forgeLog" aria-live="polite">La dalle attend.</p></div>
        </div>
        <figure class="miniature cadre-or"><img src="images/croc-accroupi.jpg" alt="Croc accroupi, marteau cloué de pointes en main" loading="lazy"><figcaption>Le marteau</figcaption></figure>
      </div>
    </article>`;
  }
  $('#dons').innerHTML=h;
}

/* ---------- Titre ---------- */
function construireTitres(){
  $('#titres').innerHTML=(D.titres||[]).map((t,i)=>{
    const lettres=String(t.nom).split(' ').map(m=>`<span class="mot" style="display:inline-block;white-space:nowrap">${[...m].map(ch=>`<span>${esc(ch)}</span>`).join('')}</span>`).join(' ');
    return `<div class="folio brule"><div class="titre-grille">
      ${i===0?'<figure class="camee"><img src="images/croc-sourire.jpg" alt="Croc souriant, cicatrices fraîches sur la joue" loading="lazy"></figure>':'<div></div>'}
      <div>
        <div class="tombe" data-i="${i}">
          <span class="croix" aria-hidden="true">✠</span>
          <p class="kick">[Titre] · Ci-gît toute subtilité</p>
          <p class="grave"><span class="sr">${esc(t.nom)}</span><span aria-hidden="true">${lettres}</span></p>
          <div class="epitaphe">
            ${t.condition?`<p><em>Condition d'obtention</em>${esc(t.condition)}</p>`:''}
            ${t.effet?`<p><em>Effet</em>${esc(t.effet)}</p>`:''}
          </div>
          <svg class="fissure-tombe" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M56 0 L52 9 L58 15 L50 24 L54 31 L47 40" fill="none" stroke="#0a0607" stroke-width=".8" vector-effect="non-scaling-stroke" style="stroke-width:2"/></svg>
        </div>
        <p class="tombe-indice"><button type="button" class="btn-ombre resonner" data-i="${i}">Faire résonner la pierre</button></p>
      </div>
    </div></div>`;
  }).join('');
}

/* ---------- Galerie ---------- */
function construireGalerie(){
  $('#galerie').innerHTML=(D.galerie||[]).map((g,i)=>`<button type="button" class="lancette" data-i="${i}" aria-label="Agrandir : ${esc(g.alt)}">
    <span class="vitre"><img src="${esc(g.src)}" alt="" loading="lazy"></span>
    <svg class="cadre" viewBox="0 0 100 200" preserveAspectRatio="none" aria-hidden="true"><path d="M2 198 V56 C2 28 24 8 50 2 C76 8 98 28 98 56 V198 Z"/></svg>
    <span class="num" aria-hidden="true">${romain(i+1)}</span>
  </button>`).join('');
}

/* =====================================================================
   6. LE VITRAIL DE L'AUTEL (canvas) et ses éclats
   ===================================================================== */
const Vitrail=(()=>{
  let cv,c,W=0,H=0,cellules=[],arche=null,etat='entier',alpha=1,restes=[];
  function cheminArche(ctx,w,h,m){
    const x0=m,x1=w-m,y1=h-m,lw=x1-x0,ys=h*.36,ya=m;
    ctx.beginPath(); ctx.moveTo(x0,y1); ctx.lineTo(x0,ys);
    ctx.bezierCurveTo(x0,ys-lw*.5, w/2-lw*.2,ya+lw*.08, w/2,ya);
    ctx.bezierCurveTo(w/2+lw*.2,ya+lw*.08, x1,ys-lw*.5, x1,ys);
    ctx.lineTo(x1,y1); ctx.closePath();
  }
  function generer(){
    const r=cv.getBoundingClientRect(); if(r.width<10) return;
    W=Math.round(r.width*DPR); H=Math.round(r.height*DPR); cv.width=W; cv.height=H;
    const m=7*DPR, cols=5, rows=9, cw=(W-2*m)/cols, rh=(H-2*m)/rows, pts=[];
    for(let j=0;j<=rows;j++){ pts[j]=[]; for(let i=0;i<=cols;i++){
      const bord=(i===0||i===cols||j===0||j===rows);
      pts[j][i]=[m+i*cw+(bord?0:alea(-.32,.32)*cw), m+j*rh+(bord?0:alea(-.32,.32)*rh)];
    }}
    const cx=W/2, cy=H*.6, R=W*.2; cellules=[];
    const couleur=(x,y)=>{
      const d=Math.hypot(x-cx,y-cy);
      const dansGoutte = d<R || (y<cy && y>cy-R*2.3 && Math.abs(x-cx) < R*(1-(cy-y)/(R*2.3)));
      if(dansGoutte) return choisir(['#b3122a','#c4162b','#8a0f1c']);
      if(d<R*1.45) return choisir(['#d9a93a','#c9a24a','#e8cf8a']);
      return choisir(['#2e6fb3','#1f4f8a','#7fc4e0','#6a2c8f','#2e6fb3','#173a66']);
    };
    for(let j=0;j<rows;j++) for(let i=0;i<cols;i++){
      const a=pts[j][i],b=pts[j][i+1],cc=pts[j+1][i+1],d=pts[j+1][i];
      const tris = Math.random()<.5 ? [[a,b,cc],[a,cc,d]] : [[a,b,d],[b,cc,d]];
      for(const tr of tris){ const gx=(tr[0][0]+tr[1][0]+tr[2][0])/3, gy=(tr[0][1]+tr[1][1]+tr[2][1])/3; cellules.push({p:tr,gx,gy,col:couleur(gx,gy)}); }
    }
    arche=new Path2D(); const tmp={beginPath(){},moveTo:(x,y)=>arche.moveTo(x,y),lineTo:(x,y)=>arche.lineTo(x,y),bezierCurveTo:(...a)=>arche.bezierCurveTo(...a),closePath:()=>arche.closePath()};
    cheminArche(tmp,W,H,m);
    cellules=cellules.filter(k=>c.isPointInPath(arche,k.gx,k.gy));
    dessiner();
  }
  function dessiner(){
    if(!W) return;
    c.clearRect(0,0,W,H);
    c.save(); c.clip(arche);
    c.fillStyle='#050203'; c.fillRect(0,0,W,H);
    if(etat!=='brise'){
      c.globalAlpha=alpha;
      for(const k of cellules){ c.beginPath(); c.moveTo(...k.p[0]); c.lineTo(...k.p[1]); c.lineTo(...k.p[2]); c.closePath(); c.fillStyle=k.col; c.fill(); }
      c.globalCompositeOperation='lighter';
      const g=c.createRadialGradient(W/2,H*.45,0,W/2,H*.45,H*.6); g.addColorStop(0,'rgba(255,240,210,.32)'); g.addColorStop(1,'rgba(255,240,210,0)');
      c.fillStyle=g; c.fillRect(0,0,W,H);
      c.globalCompositeOperation='source-over';
      c.strokeStyle='#070304'; c.lineWidth=2.4*DPR; c.lineJoin='round';
      for(const k of cellules){ c.beginPath(); c.moveTo(...k.p[0]); c.lineTo(...k.p[1]); c.lineTo(...k.p[2]); c.closePath(); c.stroke(); }
      c.globalAlpha=1;
    } else {
      for(const k of restes){ c.beginPath(); c.moveTo(...k.p[0]); c.lineTo(...k.p[1]); c.lineTo(...k.p[2]); c.closePath(); c.fillStyle=k.col; c.globalAlpha=.55; c.fill(); c.globalAlpha=1; c.strokeStyle='#070304'; c.lineWidth=2*DPR; c.stroke(); }
    }
    c.restore();
    c.strokeStyle='#2a1f22'; c.lineWidth=7*DPR; c.stroke(arche);
    c.strokeStyle='#c9a24a'; c.lineWidth=1.2*DPR; c.stroke(arche);
  }
  /* Éclats : volent dans tout l'écran sur un canvas superposé */
  const ov=$('#eclats'), oc=ov.getContext('2d'); let shards=[], anim=false;
  function briser(){
    if(!W) return;
    const r=cv.getBoundingClientRect(), s=r.width/W, cx=r.left+r.width/2, cy=r.top+r.height*.5;
    restes=cellules.filter(k=>{ const e=Math.min(k.gx,W-k.gx,H-k.gy); return e<W*.12 && Math.random()<.45; });
    if(!RM){
      for(const k of cellules){
        if(restes.includes(k)) continue;
        const x=r.left+k.gx*s, y=r.top+k.gy*s, ang=Math.atan2(y-cy,x-cx), v=alea(3,11);
        shards.push({x,y,pts:k.p.map(p=>[(p[0]-k.gx)*s,(p[1]-k.gy)*s]),vx:Math.cos(ang)*v+alea(-2,2),vy:Math.sin(ang)*v-alea(2,7),rot:0,vr:alea(-.25,.25),col:k.col,vie:1,t0:performance.now(),duree:alea(1600,2600)});
        if(Math.random()<.5) shards.push({x,y,pts:[[-1.5,-1.5],[1.5,-1],[0,2]],vx:alea(-9,9),vy:alea(-12,-2),rot:0,vr:alea(-.5,.5),col:'#fff6e0',vie:1,glint:1,t0:performance.now(),duree:alea(900,1800)});
      }
    }
    etat='brise'; dessiner();
    if(!anim && shards.length){ anim=true; requestAnimationFrame(boucleEclats); }
  }
  let tPrec=0;
  function boucleEclats(ms){
    const w=innerWidth,h=innerHeight, k=tPrec?borne((ms-tPrec)/16.67,.5,4):1; tPrec=ms;
    if(ov.width!==Math.round(w*DPR)){ ov.width=Math.round(w*DPR); ov.height=Math.round(h*DPR); }
    oc.setTransform(DPR,0,0,DPR,0,0); oc.clearRect(0,0,w,h);
    for(let i=shards.length-1;i>=0;i--){
      const s=shards[i]; s.vy+=.38*k; s.x+=s.vx*k; s.y+=s.vy*k; s.rot+=s.vr*k; s.vie=1-(performance.now()-s.t0)/s.duree;
      if(s.y>h+60||s.vie<=0){ shards.splice(i,1); continue; }
      oc.save(); oc.translate(s.x,s.y); oc.rotate(s.rot); oc.globalAlpha=Math.min(1,s.vie*1.4);
      oc.beginPath(); oc.moveTo(...s.pts[0]); for(let k=1;k<s.pts.length;k++) oc.lineTo(...s.pts[k]); oc.closePath();
      oc.fillStyle=s.col; oc.fill();
      if(!s.glint){ oc.strokeStyle='#070304'; oc.lineWidth=1.6; oc.stroke(); oc.globalCompositeOperation='lighter'; oc.fillStyle='rgba(255,240,210,.18)'; oc.fill(); }
      oc.restore();
    }
    if(shards.length) requestAnimationFrame(boucleEclats); else { oc.clearRect(0,0,w,h); anim=false; tPrec=0; }
  }
  function reparer(){
    etat='entier'; alpha=0; const t0=performance.now();
    (function pas(){ alpha=Math.min(1,(performance.now()-t0)/1600); dessiner(); if(alpha<1) requestAnimationFrame(pas); })();
    Son.cristal(.5,.8); setTimeout(()=>Son.cristal(.75,.6),300); setTimeout(()=>Son.cristal(1,.5),600);
  }
  function init(){ cv=$('#vitrail'); if(!cv) return false; c=cv.getContext('2d'); generer(); addEventListener('resize',()=>{ clearTimeout(init.t); init.t=setTimeout(generer,200); }); return true; }
  return {init,briser,reparer,generer};
})();

/* =====================================================================
   7. INTERACTIONS
   ===================================================================== */
const enVue={};
function installer(){
  /* ---- son ---- */
  const bSon=$('#btnSon');
  const majSon=()=>{ bSon.setAttribute('aria-pressed',String(Son.actif)); $('#sonTxt').textContent='Son : '+(Son.actif?'activé':'coupé'); };
  bSon.addEventListener('click',()=>{ Son.setActif(!Son.actif); majSon(); if(Son.actif){ Son.cloche(220,.12,.5); } });
  installer.majSon=majSon;

  /* ---- sommaire ---- */
  const bS=$('#btnSommaire'), som=$('#sommaire');
  const fermerS=()=>{ som.hidden=true; bS.setAttribute('aria-expanded','false'); };
  bS.addEventListener('click',()=>{ const o=som.hidden; som.hidden=!o; bS.setAttribute('aria-expanded',String(o)); Son.page(); if(o) $('a',som).focus(); });
  som.addEventListener('click',e=>{ if(e.target.closest('a')) fermerS(); });
  document.addEventListener('click',e=>{ if(!som.hidden && !e.target.closest('#sommaire,#btnSommaire')) fermerS(); });
  addEventListener('keydown',e=>{ if(e.key==='Escape' && !som.hidden){ fermerS(); bS.focus(); } });

  /* ---- survols sonores (souris) ---- */
  let dernierSurvol=0, dernierEl=null;
  document.addEventListener('mouseover',e=>{
    const el=e.target.closest('button,a,.lancette'); if(!el||el===dernierEl||el.classList.contains('fig')) return; dernierEl=el;
    const t=performance.now(); if(t-dernierSurvol>70){ dernierSurvol=t; Son.survol(); }
  });
  document.addEventListener('mouseout',e=>{ if(e.target.closest('button,a,.lancette')===dernierEl && !e.relatedTarget?.closest?.('button,a,.lancette')) dernierEl=null; });
  document.addEventListener('click',e=>{ const b=e.target.closest('.btn-petit,.sommaire a,.descendre'); if(b && b.id!=='btnSon') Son.tic(); });

  /* ---- clic dans le vide : une goutte de sang ---- */
  $('#nef').addEventListener('click',e=>{
    if(!etat.vivant || e.target.closest('button,a,canvas,img,.tombe,.fig,.fiole,.autel,.forge,.registre,dd,dt,p,h1,h2,h3,h4')) return;
    tache(e.clientX,e.clientY); Son.goutte(1);
  });

  /* ---- chapitres : indicateur + tourne-page + zoom dans la nef ---- */
  const chaps=$$('.chap'); let courant=null;
  const io=new IntersectionObserver(es=>es.forEach(e=>{
    enVue[e.target.id]=e.isIntersecting;
    if(e.isIntersecting && courant!==e.target){
      courant=e.target; $('#chapNum').textContent=e.target.dataset.num; $('#chapNom').textContent=e.target.dataset.nom||'';
      if(etat.vivant) Son.page();
    }
  }),{rootMargin:'-45% 0px -50% 0px'});
  chaps.forEach(c=>io.observe(c));
  const ioFront=new IntersectionObserver(es=>es.forEach(e=>enVue.frontispice=e.isIntersecting));
  ioFront.observe($('#frontispice'));

  /* ---- révélations : embrasement doux ---- */
  const ro=new IntersectionObserver(es=>es.forEach(e=>{
    if(!e.isIntersecting) return; const el=e.target; ro.unobserve(el);
    el.classList.add('vu'); setTimeout(()=>el.classList.add('fait'),RM?0:2600);
    if(etat.vivant && !RM) Son.crepite(1.6);
    if(el.querySelector('#fioles')) setTimeout(remplirFioles,500);
    if(el.querySelector('#rosaces')) setTimeout(allumerRosaces,500);
    if(el.querySelector('.tombe')) setTimeout(()=>Son.cloche(98,.18,.6),400);
  }),{threshold:.12,rootMargin:'0px 0px -8% 0px'});
  $$('.brule').forEach(el=>ro.observe(el));

  installerProcession();
  installerFioles();
  installerRituel();
  installerMarteau();
  installerTitres();
  installerGalerie();

  $('#refermer').addEventListener('click',()=>{ Son.page(); setTimeout(()=>Son.cloche(110,.2,.5),200); scrollTo({top:0,behavior:RM?'auto':'smooth'}); setTimeout(()=>$('#titreCroc').focus({preventScroll:true}),RM?0:900); });
}

/* ---------- Procession ---------- */
function installerProcession(){
  const box=$('#procession'), ch=$('#chaos'), log=$('#procLog');
  const eilyn=$('.fig.frere canvas',box);
  if(eilyn) proc.flamme=Lumiere.ajouter(eilyn,{seule:true,hote:eilyn.parentElement});
  box.addEventListener('mouseover',e=>{
    const f=e.target.closest('.fig'); if(!f||f===proc.dernier) return; proc.dernier=f;
    box.classList.toggle('focus-frere',f.classList.contains('frere'));
    if(f.classList.contains('frere')) Son.coeur(.7); else Son.visee();
  });
  box.addEventListener('mouseleave',()=>{ box.classList.remove('focus-frere'); proc.dernier=null; });
  box.addEventListener('focusin',e=>{ const f=e.target.closest('.fig'); box.classList.toggle('focus-frere',!!f&&f.classList.contains('frere')); });
  box.addEventListener('focusout',()=>box.classList.remove('focus-frere'));
  box.addEventListener('click',e=>{
    const f=e.target.closest('.fig'); if(!f) return;
    const r=f.getBoundingClientRect();
    if(f.classList.contains('frere')){
      Son.eilyn(); Son.coeur(1); flash('#ffcf8a',.18,900);
      if(proc.flamme){ proc.flamme.vie=2.2; }
      log.textContent=`[SYSTÈME] Exception : ${FRERE} n'est pas un NPC.`;
      f.animate([{transform:'scale(1.12)'},{transform:'none'}],{duration:700,easing:'ease-out'});
      return;
    }
    const n=f.dataset.n, ancien=f.classList.contains('mauvais')?'mauvais':f.classList.contains('bon')?'bon':'neutre';
    const nouveau = ancien==='neutre'?'mauvais':ancien==='mauvais'?'bon':'neutre';
    f.classList.remove('mauvais','bon','juge');
    const etiq=$('.etiq',f);
    if(nouveau==='mauvais'){
      f.classList.add('mauvais','juge'); etiq.textContent='[MAUVAIS NPC]';
      proc.chaos++; ch.textContent=proc.chaos; ch.classList.remove('bump'); void ch.offsetWidth; ch.classList.add('bump');
      Son.marteau(.7); Son.mauvais(); secousse(8,320); flash('#c4162b',.22,420); tache(r.left+r.width/2,r.top+r.height*.55);
      log.textContent=`[SYSTÈME] NPC n°${n} jugé « mauvais NPC ». Chaos +1.`;
    } else if(nouveau==='bon'){
      f.classList.add('bon','juge'); etiq.textContent='[BON NPC]'; Son.bon();
      log.textContent=`[SYSTÈME] NPC n°${n} jugé « bon NPC ». La frontière reste très mince.`;
    } else {
      etiq.textContent='[NPC]'; Son.tic();
      log.textContent=`[SYSTÈME] NPC n°${n} : jugement retiré.`;
    }
    f.setAttribute('aria-label',`Silhouette ${n} : NPC, ${nouveau==='neutre'?'non jugé':'jugé '+nouveau}`);
  });
}

/* ---------- Fioles : remous ---------- */
function installerFioles(){
  $('#fioles').addEventListener('click',e=>{
    const f=e.target.closest('.fiole'); if(!f) return;
    const v=$('.vague',f); v.animate([{transform:'translateX(0) scaleY(1)'},{transform:'translateX(-12px) scaleY(3.4)'},{transform:'translateX(-24px) scaleY(.6)'},{transform:'translateX(-40px) scaleY(1)'}],{duration:900,composite:'replace'});
    f.animate([{transform:'rotate(0)'},{transform:'rotate(-7deg)'},{transform:'rotate(5deg)'},{transform:'rotate(-2deg)'},{transform:'none'}],{duration:800,easing:'ease-out'});
    Son.versement(.5);
  });
}

/* ---------- Rituel du Lien Infortuné ---------- */
function installerRituel(){
  const L=(D.competences||[]).find(c=>Array.isArray(c.niveaux)); if(!L||!$('#autel')) return;
  const autel=$('#autel'), log=$('#rituelLog'), vic=$('#victimes'), btn=$('#rituelGo'), compte=$('#compte'), de=$('#de');
  const svg=$('#fil'), path=$('#filPath'), eneEl=$('#ene'), eneVal=$('#eneVal');
  let lv=L.niveaux[0].lv, ene=100, enCours=false, fil=null, vibre=false;
  Vitrail.init();
  const cEne=Lumiere.ajouter($('#cierge-ene'),{cire:1,lux:false});

  function majFil(){
    const a=autel.getBoundingClientRect(), u=$('.sceau-lien.u',autel).getBoundingClientRect(), c=$('.sceau-lien.c',autel).getBoundingClientRect();
    svg.setAttribute('viewBox',`0 0 ${a.width.toFixed(1)} ${a.height.toFixed(1)}`);
    const x1=u.left+u.width/2-a.left, y1=u.top+u.height/2-a.top, x2=c.left+c.width/2-a.left, y2=c.top+c.height/2-a.top;
    fil={x1,y1,x2,y2,sag:Math.min(a.height*.28,30+Math.abs(x2-x1)*.16)}; tracerFil(0);
  }
  function tracerFil(j){
    if(!fil) return; const {x1,y1,x2,y2,sag}=fil, dx=x2-x1, r=()=>alea(-j,j);
    path.setAttribute('d',`M${x1.toFixed(1)} ${y1.toFixed(1)} C${(x1+dx*.3).toFixed(1)} ${(y1+sag+r()).toFixed(1)} ${(x2-dx*.3).toFixed(1)} ${(y2+sag+r()).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`);
  }
  majFil(); addEventListener('resize',()=>{ clearTimeout(majFil.t); majFil.t=setTimeout(majFil,150); });
  (function vibrer(){ if(vibre && !RM) tracerFil(5); requestAnimationFrame(vibrer); })();

  function choisirNiveau(n,son=true){
    lv=n; const d=L.niveaux.find(x=>x.lv===n);
    $$('.sceau').forEach(s=>{ const on=+s.dataset.lv===n; s.setAttribute('aria-pressed',String(on)); if(on&&son){ s.classList.remove('presse'); void s.offsetWidth; s.classList.add('presse'); } });
    $('#lvRom').textContent=romain(n); $('#lvCout').textContent=d.cout+' %'; $('#lvPreavis').textContent=d.preavis; $('#lvRequis').textContent=d.requis||'???';
    const sp=$('#lvSpecial'); sp.hidden=!d.special; sp.textContent=d.special||'';
    if(son) Son.sceau(n);
  }
  $('.sceaux').addEventListener('click',e=>{ const s=e.target.closest('.sceau'); if(s && !enCours) choisirNiveau(+s.dataset.lv); });

  function majEne(v,dur=900){
    const dep=ene, t0=performance.now(); ene=borne(v,0,100);
    (function pas(){ const p=Math.min(1,(performance.now()-t0)/(RM?1:dur)), x=dep+(ene-dep)*(1-Math.pow(1-p,3));
      cEne.cire=.12+.88*x/100; eneVal.textContent=Math.round(x)+' %'; if(p<1) requestAnimationFrame(pas); })();
  }
  const ecrire=h=>{ log.innerHTML=h; };
  function gouttesFil(){
    if(!fil) return; const g=document.createElement('i'); const x=(fil.x1+fil.x2)/2+alea(-20,20), y=(fil.y1+fil.y2)/2+fil.sag*.75;
    g.style.cssText=`position:absolute;left:${x}px;top:${y}px;width:5px;height:8px;margin-left:-2.5px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:#c4162b;z-index:2;pointer-events:none`;
    autel.appendChild(g); g.animate([{transform:'translateY(0)',opacity:1},{transform:'translateY(70px)',opacity:0}],{duration:900,easing:'ease-in'}).onfinish=()=>g.remove();
    Son.goutte(.5);
  }

  btn.addEventListener('click',async()=>{
    if(enCours) return; const d=L.niveaux.find(x=>x.lv===lv);
    if(ene<d.cout){
      enCours=true; btn.disabled=true; eneEl.classList.add('manque');
      ecrire(`[SYSTÈME] <strong>Énergie insuffisante.</strong> ${ene} % d'ENE, il en faut ${d.cout} %.`);
      cEne.eteindre(performance.now()/1000); Son.vent(.8);
      await dormir(1500);
      ecrire('[SYSTÈME] Recueillement… l\'énergie revient.'); majEne(100,1600); cEne.rallumer(); Son.rallume();
      await dormir(1700); eneEl.classList.remove('manque'); ecrire('[SYSTÈME] Énergie rétablie.'); Son.cristal(1,.7);
      enCours=false; btn.disabled=false; return;
    }
    enCours=true; btn.disabled=true; $$('.sceau').forEach(s=>s.disabled=true); vic.innerHTML='';
    majEne(ene-d.cout); majFil();
    autel.classList.add('lie'); Son.lien(); Lumiere.foyer=autel;
    ecrire('[SYSTÈME] Lien établi. La chance de l\'utilisateur est transférée à la cible…');
    let goutteT=setInterval(gouttesFil,650);
    await dormir(1500);
    autel.classList.add('alerte'); Lumiere.nuit(.7); vibre=true;
    for(let s=d.preavis;s>0;s--){
      ecrire(`[SYSTÈME] <strong>Catastrophe dans ${s} s.</strong> L'utilisateur est compté parmi les victimes.`);
      compte.textContent=s; compte.animate([{opacity:0,transform:'translate(-50%,-50%) scale(1.7)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.12},{opacity:1,transform:'translate(-50%,-50%) scale(.97)',offset:.82},{opacity:0,transform:'translate(-50%,-50%) scale(.88)'}],{duration:980,easing:'ease-out'});
      Son.glas(); etat.bpm=Math.min(130,70+(d.preavis-s)*9); Lumiere.rafale(.6);
      await dormir(1000);
    }
    vibre=false; clearInterval(goutteT); autel.classList.remove('alerte');
    const ev=(D.catastrophes&&D.catastrophes.length)?choisir(D.catastrophes):'Catastrophe';
    Vitrail.briser(); Son.verre(1); Son.marteau(.9); Son.catastrophe();
    flash('#c4162b',.6,700); secousse(24,800); Lumiere.souffler(); Poussiere.chute(70);
    if(!RM) $('#nef').animate([{filter:'saturate(2) contrast(1.4)'},{filter:'none'}],{duration:600});
    await dormir(700);
    ecrire(`[SYSTÈME] <strong>${esc(ev)}.</strong> Le malheur accumulé s'abat. Dégâts collatéraux possibles.`);
    vic.innerHTML=`<li>La cible</li><li class="croc">${esc(nomAffiche)} — l'utilisateur</li>`;
    if(d.special){
      await dormir(1000);
      const des=+L.des||100; de.textContent='?'; de.classList.add('on','roule'); Son.de();
      const t0=performance.now(); while(performance.now()-t0<(RM?200:1400)){ de.textContent=1+Math.floor(Math.random()*des); await dormir(70); }
      const r=1+Math.floor(Math.random()*des); de.textContent=r; de.classList.remove('roule');
      if(r<20){
        $('.croc',vic).classList.add('epargne'); Son.epargne();
        ecrire(`[SYSTÈME] Dé du Système : <strong>${r}</strong> sur ${des}. Résultat inférieur à 20 : seule la cible est incluse dans la catastrophe.`);
      } else {
        Son.glas();
        ecrire(`[SYSTÈME] Dé du Système : <strong>${r}</strong> sur ${des}. Résultat de 20 ou plus : l'utilisateur reste compté parmi les victimes.`);
      }
      setTimeout(()=>de.classList.remove('on'),2600);
    }
    Lumiere.nuit(null); etat.bpm=etat.bpmBase;
    await dormir(2800); Lumiere.foyer=null;
    autel.classList.remove('lie'); Vitrail.reparer();
    enCours=false; btn.disabled=false; $$('.sceau').forEach(s=>s.disabled=false);
  });
  choisirNiveau(lv,false);
}

/* ---------- Marteau ---------- */
function installerMarteau(){
  const b=$('#frapper'); if(!b) return;
  const m=$('#marteau'), fis=$('#fissures'), dalle=$('.dalle'), log=$('#forgeLog');
  const phrases=['La nef tremble.','Les cierges vacillent.','La poussière tombe des voûtes.','La dalle se fend.','Les vitraux frémissent.'];
  let coups=0, occupe=false;
  b.addEventListener('click',()=>{
    if(occupe) return; occupe=true;
    const dur=RM?300:1100, imp=RM?.5:.6;
    m.animate([{transform:'rotate(-23deg)'},{transform:'rotate(-38deg)',offset:.35,easing:'cubic-bezier(.7,0,1,.6)'},{transform:'rotate(-5deg)',offset:imp},{transform:'rotate(-9deg)',offset:.7},{transform:'rotate(-23deg)'}],{duration:dur,easing:'ease-in-out'});
    setTimeout(()=>{
      coups++;
      const tr=$('#m-tete-g',m).getBoundingClientRect(), dr=dalle.getBoundingClientRect();
      const x=borne(tr.left+tr.width/2-dr.left,10,dr.width-10), w=dr.width, h=dr.height;
      fis.setAttribute('viewBox',`0 0 ${w.toFixed(0)} ${h.toFixed(0)}`);
      if(coups%7===0) fis.innerHTML='';
      let p='';
      for(let k=0;k<4;k++){ let px=x, py=2, a=alea(.2,Math.PI-.2), d=`M${px.toFixed(1)} ${py}`; const n=4+(Math.random()*5|0);
        for(let i=0;i<n;i++){ a+=alea(-.6,.6); px+=Math.cos(a)*alea(6,16); py+=Math.abs(Math.sin(a))*alea(4,12); d+=` L${px.toFixed(1)} ${py.toFixed(1)}`; }
        p+=`<path d="${d}"/><path class="lueur" d="${d}"/>`; }
      fis.insertAdjacentHTML('beforeend',p);
      Son.marteau(1); secousse(16,480); flash('#fff1d6',.18,260); Lumiere.rafale(1.1);
      Poussiere.eclat(dr.left+x,dr.top+2,46,1); Poussiere.chute(26);
      log.textContent=`Coup n°${coups}. ${phrases[(coups-1)%phrases.length]}`;
    },dur*imp);
    setTimeout(()=>occupe=false,dur);
  });
}

/* ---------- Titre : la pierre qui résonne ---------- */
function installerTitres(){
  const jouer=async i=>{
    const t=$(`.tombe[data-i="${i}"]`); if(!t||t.dataset.occupe) return; t.dataset.occupe=1;
    t.classList.remove('fendue'); Son.grandAccord(); t.classList.add('dore'); flash('#ffe2a6',.14,1200);
    await dormir(RM?200:1500);
    const ls=$$('.grave [aria-hidden] span span',t);
    for(const l of ls){ l.classList.remove('flex'); void l.offsetWidth; l.classList.add('flex'); if(/\S/.test(l.textContent)) Son.fonte(.7); await dormir(RM?0:75); }
    await dormir(300); Son.marteau(.6); secousse(10,380); t.classList.add('fendue');
    setTimeout(()=>{ t.classList.remove('dore'); delete t.dataset.occupe; },2600);
  };
  $('#titres').addEventListener('click',e=>{ const b=e.target.closest('.resonner,.tombe'); if(b) jouer(b.dataset.i); });
}

/* ---------- Galerie et visionneuse ---------- */
function installerGalerie(){
  const v=$('#visionneuse'), img=$('#visImg'), leg=$('#visLeg'), G=D.galerie||[]; let i=0, retour=null;
  const montrer=k=>{ i=(k+G.length)%G.length; img.src=G[i].src; img.alt=G[i].alt; leg.textContent=`${romain(i+1)}. ${G[i].alt}`; const f=$('.vis-cadre',v); f.style.animation='none'; void f.offsetWidth; f.style.animation=''; };
  const ouvrir=k=>{ retour=document.activeElement; montrer(k); v.hidden=false; document.body.classList.add('verrou'); Son.page(); Son.cristal(.75,.6); $('#visFermer').focus(); };
  const fermer=()=>{ v.hidden=true; document.body.classList.remove('verrou'); Son.page(); retour&&retour.focus(); };
  $('#galerie').addEventListener('click',e=>{ const b=e.target.closest('.lancette'); if(b) ouvrir(+b.dataset.i); });
  $('#visFermer').addEventListener('click',fermer);
  $('#visPrec').addEventListener('click',()=>{ montrer(i-1); Son.page(); });
  $('#visSuiv').addEventListener('click',()=>{ montrer(i+1); Son.page(); });
  v.addEventListener('click',e=>{ if(e.target===v) fermer(); });
  addEventListener('keydown',e=>{
    if(v.hidden) return;
    if(e.key==='Escape') fermer();
    else if(e.key==='ArrowLeft'){ montrer(i-1); Son.page(); }
    else if(e.key==='ArrowRight'){ montrer(i+1); Son.page(); }
    else if(e.key==='Tab'){ const f=$$('button',v); const p=f.indexOf(document.activeElement); e.preventDefault(); f[(p+(e.shiftKey?-1:1)+f.length)%f.length].focus(); }
  });
}

/* =====================================================================
   8. BOUCLE DE LUMIÈRE (cierges, curseur-flamme, pénombre, poussière, nef)
   ===================================================================== */
function demarrerLumiere(){
  const pen=$('#penombre'); Lumiere.penombre=pen;
  Lumiere.io=new IntersectionObserver(es=>es.forEach(e=>{ const k=Lumiere.cierges.find(x=>x.cv===e.target); if(k) k.visible=e.isIntersecting; }),{rootMargin:'80px'});
  $$('canvas.cierge').forEach(cv=>Lumiere.ajouter(cv,{}));
  const placerLux=()=>Lumiere.cierges.forEach(k=>{ k.taille(); });
  addEventListener('resize',()=>{ clearTimeout(placerLux.t); placerLux.t=setTimeout(placerLux,200); });

  /* curseur-flamme */
  let mx=null,my=null,cx=innerWidth/2,cy=innerHeight/2,vx=0,cur=null;
  if(FIN){
    document.body.classList.add('fin-curseur');
    const cc=$('#curseur'); cur=Lumiere.ajouter(cc,{seule:true,lux:false}); Lumiere.io.unobserve(cc); cur.visible=true;
    addEventListener('pointermove',e=>{ if(mx==null){ cx=e.clientX; cy=e.clientY; } mx=e.clientX; my=e.clientY; },{passive:true});
    document.addEventListener('pointerleave',()=>{ mx=null; });
    addEventListener('pointerdown',()=>{ if(cur) cur.vie=1.8; });
  }
  let dernierY=scrollY, prog=-1, image=0, nefSvg=null, lx=innerWidth/2, ly=innerHeight*.42, foyerActif=false;
  function boucle(ms){
    const t=ms/1000; image++;
    /* vent : vitesse de défilement + rafales */
    const dy=scrollY-dernierY; dernierY=scrollY;
    Lumiere.vent = Lumiere.vent*.93 + borne(dy*.004,-.4,.4);
    etat.bpmBase = 42 + Math.min(18,Math.abs(dy)*.25);
    if(!document.querySelector('.autel.alerte')) etat.bpm += (etat.bpmBase-etat.bpm)*.02;

    /* curseur */
    if(cur){
      const cc=cur.cv;
      if(mx!=null){ const ncx=cx+(mx-cx)*.35; vx=ncx-cx; cx=ncx; cy+=(my-cy)*.35; cc.style.opacity=1; } else cc.style.opacity=0;
      cc.style.transform=`translate(${(cx-24).toFixed(1)}px,${(cy-80).toFixed(1)}px)`;
      cur.dessiner(t,borne(-vx*.08,-1.2,1.2)+Lumiere.vent);
      if(cur.vie>1) cur.vie+=(1-cur.vie)*.08;
    }
    /* cierges visibles */
    for(const k of Lumiere.cierges){
      if(k===cur || !k.visible) continue;
      const I=k.dessiner(t,Lumiere.vent+Math.sin(t*.7+k.ph)*.08);
      if(k.lux && image%2===0){ k.hote.style.setProperty('--lux',I.toFixed(2)); if(k.fy) k.hote.style.setProperty('--fy',k.fy.toFixed(0)+'px'); }
    }
    /* pénombre : le halo suit la flamme */
    const fl = RM?1:(1+.035*Math.sin(t*8.1)+.02*Math.sin(t*13.7));
    if(Lumiere.foyer){
      /* pendant le rituel, toute la lumière converge vers l'autel */
      const r=Lumiere.foyer.getBoundingClientRect();
      lx+=(r.left+r.width/2-lx)*.08; ly+=(r.top+r.height*.45-ly)*.08;
      pen.style.setProperty('--mx',lx.toFixed(0)+'px'); pen.style.setProperty('--my',ly.toFixed(0)+'px');
      pen.style.setProperty('--rayon',(Math.max(300,Math.min(innerWidth,innerHeight)*.75)*fl).toFixed(0)+'px');
      foyerActif=true;
    } else if(FIN || foyerActif){
      const hx = (!FIN||mx==null) ? innerWidth/2 : cx, hy = (!FIN||mx==null) ? innerHeight*.42 : cy-30;
      lx+=(hx-lx)*(foyerActif?.08:1); ly+=(hy-ly)*(foyerActif?.08:1);
      if(foyerActif && Math.abs(hx-lx)<2 && Math.abs(hy-ly)<2) foyerActif=false;
      pen.style.setProperty('--mx',lx.toFixed(0)+'px'); pen.style.setProperty('--my',ly.toFixed(0)+'px');
      if(FIN) pen.style.setProperty('--rayon',(Math.max(340,Math.max(innerWidth,innerHeight)*.42)*fl).toFixed(0)+'px');
      else if(!foyerActif) pen.style.removeProperty('--rayon');
    }
    /* poussière */
    Poussiere.frame(t,mx==null?null:cx,my==null?null:cy);
    /* la nef s'approfondit avec la lecture */
    const sh=document.documentElement.scrollHeight-innerHeight, p=sh>0?borne(scrollY/sh,0,1):0;
    if(Math.abs(p-prog)>.0005){
      prog=p; nefSvg=nefSvg||$('#fond svg');
      if(nefSvg && !RM) nefSvg.style.transform=`scale(${(1+p*.65).toFixed(4)})`;
      const rose=$('#nef-rose'); if(rose) rose.setAttribute('opacity',(.16+p*.22).toFixed(3));
      $('#progres').style.transform=`scaleX(${p.toFixed(4)})`;
    }
    requestAnimationFrame(boucle);
  }
  requestAnimationFrame(boucle);
}

/* Le cœur lent du vampire */
function battre(){
  const vig=$('#vignette');
  (function b(){
    if(etat.vivant){ Son.coeur(etat.bpm>80?1:.8); if(!RM) vig.animate([{opacity:.85},{opacity:1,offset:.14},{opacity:.85}],{duration:520,easing:'ease-out'}); }
    setTimeout(b,60000/Math.max(30,etat.bpm));
  })();
}

/* =====================================================================
   9. LA PORTE ET LE FRONTISPICE
   ===================================================================== */
let entre=false;
async function entrer(avecSon){
  if(entre) return; entre=true;
  if(avecSon){ Son.setActif(true); Son.porte(); }
  installer.majSon();
  const porte=$('#porte'); porte.classList.add('ouvre');
  await dormir(RM?300:1500);
  document.body.classList.remove('verrou'); $('#nef').inert=false; $('#entete').inert=false;
  etat.vivant=true; document.body.classList.add('vivant');
  await dormir(RM?300:1900);
  porte.classList.add('parti');
  $('#titreCroc').focus({preventScroll:true});
  intro();
}
async function intro(){
  const tt=$('#titreTxt'); tt.classList.add('allume'); Son.cloche(146.83,.16,.4);
  await dormir(RM?0:900);
  const st=$('#sousTitre'), txt=D.sousTitre||'';
  if(RM){ st.textContent=txt; } else { for(const ch of txt){ st.textContent+=ch; await dormir(28); } }
  const boot=$('#boot');
  for(const l of (D.boot||[])){
    const d=document.createElement('div'); d.className='braise'; boot.appendChild(d);
    if(RM) d.textContent=l; else { let k=0; for(const ch of l){ d.textContent+=ch; if(k++%3===0) Son.crepite(.5); await dormir(16); } }
    setTimeout(()=>d.classList.remove('braise'),RM?0:350);
    Son.cristal(.5,.5); await dormir(RM?0:240);
  }
  $('#muet').classList.add('vu');
}

/* =====================================================================
   DÉMARRAGE
   ===================================================================== */
defsGlobales();
construireNef();
rendre();
document.body.classList.add('verrou');
$('#nef').inert=true; $('#entete').inert=true;
if('scrollRestoration' in history) history.scrollRestoration='manual';
scrollTo(0,0);
demarrerLumiere();
installer();
battre();
$('#entrerSon').addEventListener('click',()=>entrer(true));
$('#entrerSilence').addEventListener('click',()=>entrer(false));
$('#entrerSon').focus();
})();
