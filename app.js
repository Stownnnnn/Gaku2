/* =====================================================================
   CROC — SYSTÈME DU DÉDALE
   Tout le contenu vient de data.js (window.CROC). Ce fichier ne contient
   que l'interface du Système : démarrage, onglets, fenêtres, effets,
   sons synthétisés (Web Audio, aucun fichier audio) et simulations.
   ===================================================================== */
(function(){
'use strict';

var D = window.CROC || {};

/* ---------------------------------------------------------------------
   OUTILS
   --------------------------------------------------------------------- */
var $ = function(s, r){ return (r || document).querySelector(s); };
var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}
var mqRM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches:false };
var RM = !!mqRM.matches;
if(mqRM.addEventListener){ mqRM.addEventListener('change', function(e){ RM = e.matches; }); }
var FINE = window.matchMedia ? window.matchMedia('(pointer: fine)').matches : true;
function sleep(ms){ return new Promise(function(r){ setTimeout(r, RM ? Math.min(ms, 80) : ms); }); }
function rand(a, b){ return a + Math.random() * (b - a); }
function ri(a, b){ return Math.floor(rand(a, b + 1)); }
function pick(a){ return a[Math.floor(Math.random() * a.length)]; }
function pad(n, l){ return String(n).padStart(l || 2, '0'); }
function fr(v){ return String(Math.round(v * 100) / 100).replace('.', ','); }
function norm(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
function isUnknown(v){ return v == null || /^\?+$/.test(String(v).trim()); }
function hashStr(s){ var h = 2166136261; for(var i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

var store = {
  get: function(k, d){ try{ var v = localStorage.getItem('croc-sys:' + k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } },
  set: function(k, v){ try{ localStorage.setItem('croc-sys:' + k, JSON.stringify(v)); }catch(e){} }
};
var sess = {
  get: function(k){ try{ return sessionStorage.getItem('croc-sys:' + k); }catch(e){ return null; } },
  set: function(k, v){ try{ sessionStorage.setItem('croc-sys:' + k, v); }catch(e){} }
};

var NOM = D.nom || 'CROC';
var SUBJECT_ID = 'CRC-' + pad(hashStr(NOM) % 10000, 4);
var GLYPHS = '01NPC#$%&*+=<>/\\|░▒▓▚▞';
function randGlyph(){ return GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length)); }

/* État persistant des simulations (dans CE navigateur uniquement) */
var S = Object.assign({ cata:0, analyses:0, bons:0, mauvais:0, chaos:0, marques:0, renfort:0, coups:0 }, store.get('etat', {}));
function saveS(){ store.set('etat', S); }

/* ---------------------------------------------------------------------
   SON — synthèse Web Audio (bips, frappe, alertes, glitch…)
   --------------------------------------------------------------------- */
var AU = (function(){
  var ctx = null, master = null, noiseBuf = null, hum = null;
  var on = store.get('son', false) === true;
  var last = {};

  function ensure(){
    if(!on) return null;
    if(!ctx){
      var AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return null;
      try{
        ctx = new AC();
        var comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16; comp.ratio.value = 6;
        master = ctx.createGain(); master.gain.value = 0.6;
        master.connect(comp); comp.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for(var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }catch(e){ ctx = null; return null; }
    }
    if(ctx.state === 'suspended'){ ctx.resume().catch(function(){}); }
    return ctx;
  }

  function tone(o){
    var t0 = ctx.currentTime + (o.t || 0);
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f || 440, t0);
    if(o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t0 + (o.dur || .1));
    if(o.detune) osc.detune.value = o.detune;
    var v = o.vol == null ? 0.05 : o.vol, dur = o.dur || 0.1;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + (o.a || 0.004));
    if(o.hold) g.gain.setValueAtTime(v, t0 + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    if(o.filter){ var f = ctx.createBiquadFilter(); f.type = o.filter; f.frequency.value = o.ff || 1200; g.connect(f); f.connect(master); }
    else g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }
  function noise(o){
    var t0 = ctx.currentTime + (o.t || 0), dur = o.dur || 0.2;
    var src = ctx.createBufferSource(); src.buffer = noiseBuf;
    src.playbackRate.value = o.rate || 1;
    var f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1000, t0);
    if(o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
    f.Q.value = o.q || 1;
    var g = ctx.createGain(), v = o.vol == null ? 0.1 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + (o.a || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0, Math.random() * 1.5); src.stop(t0 + dur + 0.02);
  }

  var SFX = {
    tick: function(){ tone({ f:rand(1050, 1350), dur:.035, vol:.018 }); },
    key: function(){ noise({ f:rand(2600, 4200), q:2, dur:.025, vol:.05 }); tone({ f:rand(180, 260), dur:.02, vol:.012, type:'triangle' }); },
    seg: function(i){ tone({ f:520 + (i || 0) * 38, dur:.05, vol:.03 }); },
    beep: function(){ tone({ f:880, dur:.07, vol:.04 }); tone({ f:1320, dur:.09, vol:.035, t:.075 }); },
    notif: function(){ [660, 880, 1320].forEach(function(f, i){ tone({ f:f, dur:.08, vol:.035, t:i * .07 }); }); },
    open: function(){ tone({ f:300, f2:900, dur:.12, vol:.035 }); noise({ f:3000, dur:.06, vol:.03 }); },
    close: function(){ tone({ f:900, f2:260, dur:.12, vol:.03 }); },
    ok: function(){ tone({ f:740, dur:.07, vol:.04 }); tone({ f:1110, dur:.12, vol:.04, t:.08 }); },
    err: function(){ tone({ f:150, dur:.09, vol:.06 }); tone({ f:130, dur:.14, vol:.06, t:.11 }); },
    sweep: function(){ tone({ f:240, f2:55, dur:.22, vol:.045 }); noise({ f:1800, f2:300, dur:.22, vol:.025 }); },
    glitch: function(){
      noise({ f:rand(400, 3000), q:6, dur:.12, vol:.08, rate:rand(.5, 2) });
      for(var i = 0; i < 4; i++) tone({ f:rand(80, 1800), dur:.03, vol:.03, t:i * .03, type:'square' });
    },
    alarm: function(urgent){
      var f1 = urgent ? 1040 : 880, f2 = urgent ? 760 : 620;
      tone({ f:f1, dur:.22, vol:.07, hold:.18, type:'square', filter:'lowpass', ff:3200 });
      tone({ f:f2, dur:.22, vol:.07, hold:.18, t:.25, type:'square', filter:'lowpass', ff:3200 });
    },
    boot: function(){
      tone({ f:40, f2:110, dur:1.4, vol:.08, type:'sawtooth', filter:'lowpass', ff:400, a:.2 });
      noise({ f:200, f2:4000, dur:1.2, vol:.03, type:'bandpass', q:3 });
      tone({ f:1760, dur:.06, vol:.02, t:1.2 });
    },
    lock: function(){ tone({ f:1200, dur:.04, vol:.04 }); tone({ f:1600, dur:.04, vol:.04, t:.05 }); tone({ f:2400, dur:.1, vol:.03, t:.1 }); },
    granted: function(){ [523, 659, 784, 1047].forEach(function(f, i){ tone({ f:f, dur:.14, vol:.04, t:i * .06 }); }); tone({ f:1047, dur:.5, vol:.03, t:.26, type:'triangle' }); },
    link: function(){
      for(var k = 0; k < 4; k++){
        [1, 2.76, 5.4].forEach(function(m){ tone({ f:620 * m * rand(.98, 1.02), dur:.18, vol:.025 / m, t:k * .11, type:'sine' }); });
        noise({ f:5000, q:4, dur:.04, vol:.05, t:k * .11 });
      }
    },
    transfer: function(){ tone({ f:400, f2:1600, dur:.5, vol:.025, type:'triangle' }); },
    boom: function(){
      noise({ type:'lowpass', f:1400, f2:60, dur:1.6, vol:.32, a:.01 });
      tone({ f:90, f2:28, dur:1.2, vol:.22, type:'sine' });
      tone({ f:60, f2:30, dur:.9, vol:.12, type:'square', filter:'lowpass', ff:180 });
    },
    rumble: function(){ noise({ type:'lowpass', f:180, dur:1.8, vol:.18, a:.2 }); },
    fire: function(){ noise({ type:'bandpass', f:900, q:.6, dur:1.4, vol:.12, a:.1 }); },
    water: function(){ noise({ type:'bandpass', f:600, f2:2400, q:2, dur:1.2, vol:.1, a:.05 }); },
    zap: function(){ for(var i = 0; i < 6; i++) tone({ f:rand(60, 120), dur:.06, vol:.08, t:i * .07, type:'sawtooth' }); },
    dice: function(){ tone({ f:rand(900, 1500), dur:.025, vol:.03 }); },
    hit: function(){ tone({ f:140, f2:40, dur:.25, vol:.2, type:'sine' }); noise({ type:'lowpass', f:900, dur:.15, vol:.18 }); },
    swing: function(){ noise({ f:600, f2:2400, q:1.5, dur:.16, vol:.06 }); },
    mark: function(){ tone({ f:900, f2:120, dur:.4, vol:.05, type:'sawtooth', filter:'bandpass', ff:900 }); noise({ f:300, f2:2000, dur:.3, vol:.04 }); },
    absorb: function(){ tone({ f:180, f2:1400, dur:.7, vol:.05, type:'triangle' }); tone({ f:270, f2:2100, dur:.7, vol:.025, type:'sine' }); },
    fanfare: function(){
      var n = [523, 523, 523, 659, 784, 698, 880, 1047];
      var t = [0, .1, .2, .3, .5, .7, .85, 1.0];
      n.forEach(function(f, i){ tone({ f:f, dur:i === n.length - 1 ? .7 : .12, vol:.05, t:t[i], hold:i === n.length - 1 ? .4 : 0 }); });
      [523, 659, 784].forEach(function(f){ tone({ f:f, dur:.9, vol:.025, t:1.0, type:'triangle', hold:.5 }); });
    },
    bad: function(){ tone({ f:220, f2:70, dur:.35, vol:.08, type:'sawtooth' }); },
    scan: function(){ tone({ f:1800, f2:2600, dur:.08, vol:.012, type:'sine' }); }
  };

  function play(name, arg){
    if(!on) return;
    var now = performance.now();
    var gap = (name === 'tick' || name === 'key' || name === 'dice') ? 28 : 40;
    if(last[name] && now - last[name] < gap) return;
    last[name] = now;
    if(!ensure() || !SFX[name]) return;
    try{ SFX[name](arg); }catch(e){}
  }

  function startHum(){
    if(hum || !ensure()) return;
    try{
      var o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = 50; o2.type = 'sine'; o2.frequency.value = 100.4;
      f.type = 'lowpass'; f.frequency.value = 160;
      g.gain.value = 0.0001; g.gain.linearRampToValueAtTime(0.012, ctx.currentTime + 1.5);
      o.connect(f); o2.connect(f); f.connect(g); g.connect(master);
      o.start(); o2.start();
      hum = { o:o, o2:o2, g:g };
    }catch(e){}
  }
  function stopHum(){
    if(!hum) return;
    try{ hum.g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + .3); var h = hum; setTimeout(function(){ try{ h.o.stop(); h.o2.stop(); }catch(e){} }, 400); }catch(e){}
    hum = null;
  }

  function setOn(v){
    on = !!v; store.set('son', on);
    if(on){ ensure(); startHum(); } else stopHum();
    var b = $('#soundToggle');
    if(b){ b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', on ? 'Couper le son' : 'Activer le son'); }
  }
  /* Le navigateur exige un geste de l'utilisateur avant tout son */
  function unlock(){ if(on){ ensure(); startHum(); } }

  return { play:play, setOn:setOn, isOn:function(){ return on; }, unlock:unlock };
})();

/* ---------------------------------------------------------------------
   EFFETS VISUELS
   --------------------------------------------------------------------- */
var fxOn = store.get('fx', true) !== false;
function fxActive(){ return fxOn && !RM; }
var busy = false;          // une simulation est en cours (pas de coupure de signal)
var modalOpen = false;

function setFx(v){
  fxOn = !!v; store.set('fx', fxOn);
  document.body.classList.toggle('fx-off', !fxOn);
  var b = $('#fxToggle'); if(b) b.setAttribute('aria-pressed', fxOn ? 'true' : 'false');
}

function initRain(){
  if(RM) return;
  var cv = document.createElement('canvas'); cv.id = 'matrixRain'; cv.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(cv, document.body.firstChild);
  var x = cv.getContext('2d'), fs = 16, cols, drops, words, dpr = Math.min(window.devicePixelRatio || 1, 2);
  var chars = '01NPC▓░▒#+=<>/\\';
  function resize(){
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(innerWidth / fs); drops = []; words = [];
    for(var i = 0; i < cols; i++){ drops[i] = Math.random() * -80; words[i] = 0; }
  }
  resize(); addEventListener('resize', resize);
  var lastT = 0;
  (function draw(t){
    requestAnimationFrame(draw);
    if(document.hidden || !fxOn || t - lastT < 50) return;
    lastT = t;
    x.fillStyle = 'rgba(0,0,0,0.08)'; x.fillRect(0, 0, innerWidth, innerHeight);
    x.font = fs + 'px monospace';
    for(var i = 0; i < drops.length; i++){
      var ch;
      if(words[i] > 0){ ch = 'NPC'.charAt(3 - words[i]); words[i]--; }
      else { ch = chars.charAt(Math.floor(Math.random() * chars.length)); if(Math.random() < .004) words[i] = 3; }
      var head = Math.random() > .94;
      x.fillStyle = head ? 'rgba(154,255,154,0.75)' : 'rgba(42,138,42,0.4)';
      if(ch === 'N' || ch === 'P' || ch === 'C'){ x.fillStyle = 'rgba(74,255,74,0.7)'; }
      x.fillText(ch, i * fs, drops[i] * fs);
      if(drops[i] * fs > innerHeight && Math.random() > .975) drops[i] = Math.random() * -20;
      drops[i]++;
    }
  })(0);
}

function initCursorFx(){
  if(RM || !FINE) return;
  var dot = document.createElement('div'); dot.id = 'crtGlow'; dot.setAttribute('aria-hidden', 'true');
  document.body.appendChild(dot);
  var mx = 0, my = 0, cx = 0, cy = 0, lastP = 0;
  addEventListener('mousemove', function(e){
    mx = e.clientX; my = e.clientY;
    if(fxOn) dot.classList.add('show');
    var n = performance.now();
    if(fxOn && n - lastP > 60){
      lastP = n;
      var p = document.createElement('span'); p.className = 'crt-particle'; p.textContent = randGlyph();
      p.style.left = mx + 'px'; p.style.top = my + 'px';
      document.body.appendChild(p);
      p.addEventListener('animationend', function(){ p.remove(); });
    }
  }, { passive:true });
  document.addEventListener('mouseleave', function(){ dot.classList.remove('show'); });
  (function raf(){ cx += (mx - cx) * .16; cy += (my - cy) * .16; dot.style.transform = 'translate(' + cx + 'px,' + cy + 'px)'; requestAnimationFrame(raf); })();
}

function initClickRipple(){
  document.addEventListener('click', function(e){
    if(!e.clientX && !e.clientY) return;
    AU.play('tick');
    if(!fxActive()) return;
    var ring = document.createElement('div'); ring.className = 'fx-ripple';
    ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px';
    for(var i = 0; i < 6; i++){
      var g = document.createElement('span'); g.textContent = randGlyph();
      g.style.setProperty('--rot', (i * 60) + 'deg'); ring.appendChild(g);
    }
    document.body.appendChild(ring);
    setTimeout(function(){ ring.remove(); }, 650);
  }, true);
}

function flashBars(card, n){
  var bars = $$('.gb', card); if(!bars.length || !fxActive()) return;
  var ch = bars.sort(function(){ return Math.random() - .5; }).slice(0, n);
  ch.forEach(function(b){
    b.style.top = Math.random() * 100 + '%'; b.style.height = (2 + Math.random() * 7) + 'px';
    b.style.opacity = (.3 + Math.random() * .6) + '';
    b.style.background = pick(['#4aff4a', '#ff4aff', '#00ffff', '#ffd700', '#fff']);
    b.style.left = Math.random() * 10 + '%'; b.style.right = Math.random() * 10 + '%';
  });
  setTimeout(function(){ ch.forEach(function(b){ b.style.opacity = '0'; }); }, 60 + Math.random() * 70);
}
function glitchCard(card, sound){
  if(!card) return;
  if(sound) AU.play('glitch');
  if(!fxActive()) return;
  card.classList.remove('glitch-effect'); void card.offsetWidth; card.classList.add('glitch-effect');
  setTimeout(function(){ card.classList.remove('glitch-effect'); }, 460);
  flashBars(card, 4); setTimeout(function(){ flashBars(card, 3); }, 60); setTimeout(function(){ flashBars(card, 2); }, 140);
}
function shake(hard){
  if(!fxActive()) return;
  var v = $('#view'); var c = hard ? 'shake-hard' : 'shake';
  v.classList.remove('shake', 'shake-hard'); void v.offsetWidth; v.classList.add(c);
  setTimeout(function(){ v.classList.remove(c); }, hard ? 760 : 380);
}
function flashScreen(color){
  if(!fxActive()) return;
  var f = document.createElement('div'); f.className = 'flash-screen'; f.style.background = color || '#fff';
  document.body.appendChild(f); setTimeout(function(){ f.remove(); }, 520);
}

function scheduleAmbient(){
  /* micro-déchirure */
  (function tear(){ setTimeout(function(){
    if(fxActive() && !busy && !modalOpen){ var v = $('#view'); v.classList.add('fx-tear'); setTimeout(function(){ v.classList.remove('fx-tear'); }, 230); }
    tear();
  }, 16000 + Math.random() * 20000); })();
  /* fenêtre qui tressaute */
  (function jitter(){ setTimeout(function(){
    if(fxActive() && !modalOpen){
      var cards = $$('#view .card').filter(function(c){ var r = c.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
      if(cards.length && Math.random() < .55){ var c = pick(cards); flashBars(c, 2); if(Math.random() < .35) glitchCard(c, Math.random() < .5); }
    }
    jitter();
  }, 5000 + Math.random() * 6000); })();
  /* surtension */
  (function surge(){ setTimeout(function(){
    if(fxActive() && !busy && !modalOpen){
      var bar = document.createElement('div'); bar.className = 'fx-surge'; document.body.appendChild(bar);
      document.documentElement.classList.add('fx-surge-flash'); AU.play('sweep');
      setTimeout(function(){ document.documentElement.classList.remove('fx-surge-flash'); bar.remove(); }, 900);
    }
    surge();
  }, 70000 + Math.random() * 60000); })();
  /* coupure de signal */
  (function cut(){ setTimeout(function(){
    if(fxActive() && !busy && !modalOpen && !document.hidden){
      var el = $('#signalCut'); el.textContent = 'SIGNAL PERDU…'; el.classList.add('active'); AU.play('glitch');
      setTimeout(function(){ el.textContent = 'RECONNEXION…'; }, 550);
      setTimeout(function(){ el.classList.remove('active'); }, 1050);
    }
    cut();
  }, 60000 + Math.random() * 60000); })();
  /* notifications du Système */
  var MSG = [
    'NPC détecté à proximité. Classement automatique effectué.',
    'Analyse comportementale du sujet mise à jour.',
    'Aucune émotion détectée sur le visage du sujet.',
    'Rappel : prudence recommandée à l\'approche du sujet.',
    'Synchronisation des archives du Dédale terminée.',
    'Fluctuation d\'énergie détectée dans le secteur.',
    'Signal entrant — source inconnue.'
  ];
  (function nt(){ setTimeout(function(){
    if(!busy && !modalOpen && !document.hidden) notify('SYSTÈME', pick(MSG));
    nt();
  }, 45000 + Math.random() * 45000); })();
}

/* Texte qui se recompose depuis des glyphes */
function scramble(el, text, speed, done){
  if(RM){ el.textContent = text; if(done) done(); return; }
  var len = text.length, frame = 0, ok = 0;
  (function tick(){
    var out = '';
    for(var i = 0; i < len; i++){ var c = text.charAt(i); out += (i < ok || c === ' ') ? c : randGlyph(); }
    el.textContent = out;
    if(frame > 5 && frame % 2 === 0 && ok < len){ ok++; if(ok % 2) AU.play('tick'); }
    frame++;
    if(ok < len) setTimeout(tick, speed || 26); else { el.textContent = text; if(done) done(); }
  })();
}
/* Machine à écrire (avec frappe sonore) */
function typeInto(el, text, speed, opts){
  opts = opts || {};
  return new Promise(function(resolve){
    if(RM || opts.instant){ el.textContent = text; resolve(); return; }
    var i = 0, caret = document.createElement('span'); caret.className = 'caret';
    (function tick(){
      if(opts.abort && opts.abort()){ el.textContent = text; resolve(); return; }
      el.textContent = text.slice(0, i); el.appendChild(caret);
      if(i % 2 === 0 && text.charAt(i) !== ' ') AU.play('key');
      i += opts.step || 1;
      if(i <= text.length + (opts.step || 1) - 1) setTimeout(tick, speed || 16);
      else { el.textContent = text; resolve(); }
    })();
  });
}

/* Révélation au défilement */
var revealObs = ('IntersectionObserver' in window) ? new IntersectionObserver(function(en){
  en.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('rv-show'); revealObs.unobserve(e.target); if(e.target._onReveal) e.target._onReveal(); } });
}, { threshold:.08, rootMargin:'0px 0px -6% 0px' }) : null;
function initReveal(root){
  $$('[data-reveal]', root).forEach(function(el, i){
    if(RM || !revealObs){ el.classList.add('rv-show'); if(el._onReveal) el._onReveal(); return; }
    el.style.transitionDelay = Math.min(i, 4) * 70 + 'ms';
    revealObs.observe(el);
  });
}
function onReveal(el, fn){
  if(!el) return;
  if(RM || !revealObs || el.classList.contains('rv-show')){ fn(); return; }
  if(!el.hasAttribute('data-reveal')){
    var o = new IntersectionObserver(function(en){ if(en[0].isIntersecting){ o.disconnect(); fn(); } }, { threshold:.25 });
    o.observe(el); return;
  }
  el._onReveal = fn;
}

/* ---------------------------------------------------------------------
   NOTIFICATIONS DU SYSTÈME
   --------------------------------------------------------------------- */
function notify(label, text, kind, ms){
  var box = $('#notifs'); if(!box) return;
  ms = ms || 5600;
  var n = document.createElement('div'); n.className = 'notif ' + (kind || ''); n.setAttribute('role', kind === 'red' ? 'alert' : 'status');
  n.innerHTML = '<span class="nl">[' + esc(label) + ']</span><span class="nt">' + esc(text) + '</span>' +
    '<button class="notif-x" type="button" aria-label="Fermer la notification">✕</button><span class="notif-bar" style="animation-duration:' + ms + 'ms"></span>';
  box.appendChild(n);
  while(box.children.length > 3) box.firstChild.remove();
  AU.play(kind === 'red' ? 'err' : 'notif');
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ n.classList.add('show'); }); });
  function kill(){ n.classList.remove('show'); setTimeout(function(){ n.remove(); }, 320); }
  $('.notif-x', n).addEventListener('click', kill);
  setTimeout(kill, ms);
}

/* ---------------------------------------------------------------------
   GABARITS : fenêtre du Système, code-barres, icônes
   --------------------------------------------------------------------- */
function barcode(seed){
  var h = '';
  for(var i = 0; i < 28; i++){
    var w = 1 + (i % 3), hh = 12 + 5 * Math.sin(i * 1.0 + (seed || 0)) * Math.cos(i * .37 + (seed || 0));
    h += '<span style="width:' + w + 'px;height:' + Math.max(7, hh + 4).toFixed(1) + 'px;background:' + (i % 2 ? '#000' : 'var(--acc)') + '"></span>';
  }
  return '<div class="barcode" aria-hidden="true">' + h + '</div>';
}
var cardSeed = 0;
function card(o){
  cardSeed++;
  return '<section class="card ' + (o.cls || '') + '"' + (o.id ? ' id="' + o.id + '"' : '') + ' data-reveal aria-label="' + esc(o.aria || o.sub) + '">' +
    '<div class="gb"></div><div class="gb"></div><div class="gb"></div><div class="gb"></div><div class="scanline"></div>' +
    '<div class="card-header"><div class="org-wrap"><div class="org-name">' + (o.org || 'SYSTÈME') + '</div><div class="header-id">' + o.sub + '</div></div>' +
    '<div class="header-pips" aria-hidden="true"><i></i><i></i><i></i></div><div class="header-sweep"></div></div>' +
    o.body +
    (o.footer === false ? '' : '<div class="card-footer">' + barcode(cardSeed * 1.7) + '<div class="footer-seal-c">' + (o.seal || '// WELCXME TO THE DEDALE') + '</div></div>') +
  '</section>';
}
var ICON = {
  figure: '<svg viewBox="0 0 16 24" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M6 0h4v1h1v4h-1v1H6V5H5V1h1zM3 7h10v1h1v8h-2v-6h-1v14H9v-7H7v7H5V10H4v6H2V8h1z"/></svg>',
  monster: '<svg viewBox="0 0 20 20" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M3 1h2v3h10V1h2v4h1v9h-2v4h-3v-3H7v3H4v-4H2V5h1z"/><path fill="#ff3030" d="M6 8h2v2H6zM12 8h2v2h-2z"/></svg>',
  mark: '<svg class="mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1L23 12 12 23 1 12z" fill="#200" stroke="#ff3030" stroke-width="2"/><path d="M8 8l8 8M16 8l-8 8" stroke="#ff3030" stroke-width="2.4"/></svg>',
  hammer: '<svg viewBox="0 0 24 24" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M4 3h10v2h2v6h-2v2H4v-2H2V5h2z"/><path fill="currentColor" d="M10 13h3v10h-3z"/><path fill="#000" d="M5 5h1v1H5zM9 5h1v1H9zM5 9h1v1H5zM9 9h1v1H9z"/></svg>'
};

function fieldVal(v){
  if(isUnknown(v)) return '<button type="button" class="redacted" data-redacted aria-label="Donnée inconnue">???</button>';
  return esc(v);
}
function bindRedacted(root){
  $$('[data-redacted]', root).forEach(function(b){
    b.addEventListener('click', function(){
      if(b.classList.contains('flash')) return;
      b.classList.add('flash'); b.textContent = 'DONNÉE INTROUVABLE'; AU.play('err');
      setTimeout(function(){ b.classList.remove('flash'); b.textContent = '???'; }, 1300);
    });
  });
}

/* Fenêtres déplaçables (souris / stylet) + glitch au clic sur l'en-tête */
var zTop = 20;
function bindCards(root){
  $$('.card', root).forEach(function(c){
    var h = $('.card-header', c); if(!h) return;
    var dragging = false, moved = false, sx = 0, sy = 0, bx = 0, by = 0;
    if(FINE){
      h.classList.add('draggable');
      h.title = 'Fenêtre déplaçable · double-clic pour la replacer';
      h.addEventListener('pointerdown', function(e){
        if(e.button !== 0 || e.pointerType === 'touch') return;
        dragging = true; moved = false; sx = e.clientX; sy = e.clientY;
        bx = +c.dataset.dx || 0; by = +c.dataset.dy || 0;
        c.style.zIndex = ++zTop; h.setPointerCapture(e.pointerId);
        document.body.classList.add('card-dragging');
      });
      h.addEventListener('pointermove', function(e){
        if(!dragging) return;
        var dx = e.clientX - sx, dy = e.clientY - sy;
        if(Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
        if(!moved) return;
        c.dataset.dx = bx + dx; c.dataset.dy = by + dy;
        var tr = 'translate(' + (bx + dx) + 'px,' + (by + dy) + 'px)';
        c.style.setProperty('--drag', tr); c.style.transform = tr; c.classList.add('is-dragged');
      });
      var end = function(){
        if(!dragging) return; dragging = false; document.body.classList.remove('card-dragging');
        if(!moved) glitchCard(c, true);
      };
      h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
      h.addEventListener('dblclick', function(){
        c.dataset.dx = 0; c.dataset.dy = 0; c.style.removeProperty('--drag'); c.style.transform = ''; c.classList.remove('is-dragged'); AU.play('close');
      });
    } else {
      h.addEventListener('click', function(){ glitchCard(c, true); });
    }
  });
}

/* ---------------------------------------------------------------------
   MODALES (notification de titre, visionneuse, aide)
   --------------------------------------------------------------------- */
var openModals = [];
function openModal(html, opts){
  opts = opts || {};
  var prev = document.activeElement;
  var m = document.createElement('div'); m.className = 'modal ' + (opts.cls || '');
  m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
  if(opts.label) m.setAttribute('aria-label', opts.label);
  m.innerHTML = html;
  $('#modalRoot').appendChild(m);
  modalOpen = true;
  $$('[data-reveal]', m).forEach(function(e){ e.classList.add('rv-show'); });
  var c = $('.card', m); if(c && !RM) c.classList.add('modal-in');
  function close(){
    if(!m.isConnected) return;
    openModals = openModals.filter(function(x){ return x !== close; });
    AU.play('close'); document.removeEventListener('keydown', onKey, true);
    if(opts.onClose) opts.onClose();
    m.classList.add('hide');
    setTimeout(function(){ m.remove(); modalOpen = !!$('#modalRoot .modal'); }, RM ? 0 : 280);
    if(prev && prev.focus) prev.focus();
  }
  function onKey(e){
    if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); close(); return; }
    if(opts.onKey && opts.onKey(e)) return;
    if(e.key === 'Tab'){
      var f = $$('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])', m);
      if(!f.length) return;
      var first = f[0], lastF = f[f.length - 1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); lastF.focus(); }
      else if(!e.shiftKey && document.activeElement === lastF){ e.preventDefault(); first.focus(); }
    }
  }
  document.addEventListener('keydown', onKey, true);
  openModals.push(close);
  m.addEventListener('click', function(e){ if(e.target === m) close(); });
  $$('[data-close]', m).forEach(function(b){ b.addEventListener('click', close); });
  AU.play('open');
  setTimeout(function(){ var f = $('[data-autofocus]', m) || $('button', m); if(f) f.focus(); }, 30);
  return { el:m, close:close };
}

function showHelp(){
  openModal(card({ sub:'AIDE // COMMANDES', footer:false, body:
    '<div class="full-section pt"><div class="full-block"><div class="block-label">RACCOURCIS CLAVIER</div><ul class="sig-list">' +
    '<li>1 à 7 : changer d\'onglet (FICHE … ARCHIVES)</li><li>M : activer / couper le son</li><li>Tab / Maj+Tab : parcourir les commandes</li>' +
    '<li>Entrée / Espace : activer</li><li>Échap : fermer une fenêtre</li><li>Flèches : cibles du module PERCEPTION, images des ARCHIVES</li>' +
    '<li>Souris : saisir l\'en-tête d\'une fenêtre pour la déplacer (double-clic : la replacer)</li></ul></div>' +
    '<div style="text-align:right"><button class="sys-btn sm" type="button" data-close data-autofocus>FERMER</button></div></div>' }),
    { label:'Aide' });
}

/* ---------------------------------------------------------------------
   DÉMARRAGE
   --------------------------------------------------------------------- */
var bootSkip = false;
function boot(){
  var bootEl = $('#boot');
  if(sess.get('booted')){ endBoot(true); return; }
  var btns = $$('#bootStandby [data-son]'), chosen = false;
  function choose(v){
    if(chosen) return; chosen = true;
    document.removeEventListener('keydown', onKey);
    AU.setOn(v === '1');
    runBoot();
  }
  function onKey(e){
    if(e.target && e.target.dataset && e.target.dataset.son != null && (e.key === 'Enter' || e.key === ' ')) return;
    if(e.key === 'Enter'){ e.preventDefault(); choose('1'); }
    else if(e.key === 'Escape'){ e.preventDefault(); choose('0'); }
  }
  btns.forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); choose(b.dataset.son); }); });
  document.addEventListener('keydown', onKey);
  setTimeout(function(){ btns[0].focus(); }, 50);
  render(currentRoute());   // la page se construit derrière l'écran de démarrage
  void bootEl;
}

async function runBoot(){
  sess.set('booted', '1');
  $('#bootStandby').hidden = true;
  var run = $('#bootRun'); run.hidden = false;
  var log = $('#bootLog'), fill = $('#bootFill');
  var skipBtn = $('#bootSkip');
  function skip(){ bootSkip = true; }
  skipBtn.addEventListener('click', skip);
  function onKey(e){ if(e.key === 'Escape' || e.key === 'Enter' || e.key === ' '){ e.preventDefault(); skip(); } }
  document.addEventListener('keydown', onKey);
  skipBtn.focus();
  AU.play('boot');
  var lines = [
    { t:'DÉDALE://SYSTÈME — DÉMARRAGE DU TERMINAL', c:'sys' },
    { t:'VÉRIFICATION DES MODULES ........... ', ok:'OK' },
    { t:'LIAISON AU RÉSEAU DU DÉDALE ........ ', ok:'ÉTABLIE' },
    { t:'CHARGEMENT DU REGISTRE DES SUJETS .. ', ok:'OK' },
    { t:'IDENTIFICATION DU SUJET…', c:'sys' }
  ];
  (D.boot || []).forEach(function(b){ lines.push({ t:b, c:/prudence/i.test(b) ? 'warn' : 'sys' }); });
  var abort = function(){ return bootSkip; };
  for(var i = 0; i < lines.length; i++){
    if(bootSkip) break;
    var l = lines[i], el = document.createElement('div'); el.className = 'bl ' + (l.c || '');
    log.appendChild(el);
    await typeInto(el, l.t, 11, { abort:abort, step:2 });
    if(l.ok){ await sleep(120); var s = document.createElement('span'); s.className = 'ok'; s.textContent = l.ok; el.appendChild(s); AU.play('beep'); }
    fill.style.width = Math.round((i + 1) / lines.length * 100) + '%';
    if(l.c === 'warn') AU.play('err');
    await sleep(bootSkip ? 0 : 140);
  }
  if(bootSkip){
    log.innerHTML = '';
    lines.forEach(function(l){ var el = document.createElement('div'); el.className = 'bl ' + (l.c || ''); el.textContent = l.t + (l.ok || ''); log.appendChild(el); });
    fill.style.width = '100%';
  }
  var nameEl = $('#bootName');
  await new Promise(function(r){ if(bootSkip){ nameEl.textContent = NOM; r(); } else scramble(nameEl, NOM, 40, r); });
  AU.play('lock');
  await sleep(bootSkip ? 0 : 250);
  $('#bootGranted').classList.add('show'); AU.play('granted');
  if(fxActive()) flashScreen('rgba(74,255,74,.35)');
  await sleep(bootSkip ? 350 : 900);
  document.removeEventListener('keydown', onKey);
  endBoot(false);
}

function endBoot(quick){
  var bootEl = $('#boot');
  if(quick){
    bootEl.classList.add('gone'); document.body.classList.remove('is-booting');
    render(currentRoute());
    /* le son reprendra au premier geste de l'utilisateur */
    var un = function(){ AU.unlock(); removeEventListener('pointerdown', un); removeEventListener('keydown', un); };
    addEventListener('pointerdown', un); addEventListener('keydown', un);
    return;
  }
  bootEl.classList.add('hide');
  setTimeout(function(){
    bootEl.classList.add('gone'); document.body.classList.remove('is-booting');
    if(!current) render(currentRoute());
    else { initReveal($('#view')); }
    $('#view').focus({ preventScroll:true });
    setTimeout(function(){ notify('SYSTÈME', 'Accès autorisé. Fiche du sujet ' + NOM + ' chargée.'); }, 600);
  }, RM ? 0 : 500);
}

/* ---------------------------------------------------------------------
   ROUTEUR (onglets)
   --------------------------------------------------------------------- */
var ROUTES = {
  fiche:{ label:'FICHE', fn:viewFiche },
  psyche:{ label:'PSYCHÉ', fn:viewPsyche },
  stats:{ label:'STATISTIQUES', fn:viewStats },
  competences:{ label:'COMPÉTENCES', fn:viewSkills },
  titres:{ label:'TITRES', fn:viewTitres },
  relations:{ label:'RELATIONS', fn:viewRelations },
  archives:{ label:'ARCHIVES', fn:viewArchives }
};
var ORDER = Object.keys(ROUTES);
var current = null, cleanups = [], viewGen = 0;
function onCleanup(f){ cleanups.push(f); }
function currentRoute(){ var r = (location.hash || '').replace('#', ''); return ROUTES[r] ? r : 'fiche'; }

function render(r){
  cleanups.forEach(function(f){ try{ f(); }catch(e){} }); cleanups = [];
  openModals.slice().forEach(function(c){ c(); });
  busy = false; $('#redAlert').classList.remove('on');
  viewGen++;
  var v = $('#view');
  v.innerHTML = '';
  ROUTES[r].fn(v);
  current = r;
  $$('#tabs .tab').forEach(function(t){ if(t.dataset.route === r) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); });
  document.title = NOM + ' // ' + ROUTES[r].label;
  bindCards(v); bindRedacted(v);
  if(!document.body.classList.contains('is-booting')) initReveal(v);
  updateReadout();
}

async function go(r){
  if(r === current) return;
  var veil = $('#transVeil');
  if(fxActive() && current){
    AU.play('sweep');
    $('.tv-label', veil).textContent = 'CHARGEMENT : ' + ROUTES[r].label + '…';
    veil.classList.remove('tv-enter'); void veil.offsetWidth; veil.classList.add('tv-exit');
    await sleep(240);
  }
  render(r);
  scrollTo(0, 0);
  $('#view').focus({ preventScroll:true });
  if(fxActive()){
    veil.classList.remove('tv-exit'); veil.classList.add('tv-enter');
    setTimeout(function(){ veil.classList.remove('tv-enter'); }, 420);
  }
}
addEventListener('hashchange', function(){ if(!document.body.classList.contains('is-booting')) go(currentRoute()); });

/* Lecture système sous la barre de navigation */
function updateReadout(){
  var el = $('#readout'); if(!el) return;
  var d = new Date();
  var n = store.get('sessions', 0);
  el.innerHTML = 'SESSION N°<span>' + pad(n) + '</span> · SYNC : <span>' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' — ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) +
    '</span> · SUJET : <span>' + esc(NOM) + '</span> · ID : <span>' + SUBJECT_ID + '</span> · ÉTAT : <span>ACTIF</span> · <span class="rd-red">PRUDENCE RECOMMANDÉE</span>';
}

/* =====================================================================
   VUE : FICHE (carte d'identité générée par le Système)
   ===================================================================== */
function galleryFind(re){ var g = D.galerie || []; for(var i = 0; i < g.length; i++){ if(re.test(g[i].src)) return g[i]; } return g[0] || null; }
function champ(label){ var c = (D.champs || []).find(function(x){ return norm(x.label) === norm(label); }); return c ? c.valeur : null; }

function viewFiche(v){
  var hero = galleryFind(/couloir/), photo = galleryFind(/sourire/);
  var used = ['espece', 'age', 'taille', 'poids'];
  var espece = champ('Espèce'), age = champ('Âge'), taille = champ('Taille'), poids = champ('Poids');
  var stature = [taille, poids].filter(function(x){ return !isUnknown(x); }).join(' · ') || '???';
  var rest = (D.champs || []).filter(function(c){ return used.indexOf(norm(c.label)) === -1; });
  var physique = D.physique || [];
  var muet = physique.some(function(p){ return /muet/i.test(p); }) || /muet/i.test(D.sousTitre || '');
  var psy = D.psycho || [];
  var warnTxt = psy.filter(function(p){ return /prudence/i.test(p); })[0] || psy[psy.length - 1] || '';
  var navBtns = ORDER.filter(function(r){ return r !== 'fiche'; }).map(function(r){ return '<a class="sys-btn sm" href="#' + r + '">' + ROUTES[r].label + '</a>'; }).join('');

  var badges = '';
  if(!isUnknown(espece)) badges += '<span class="badge badge-green">' + esc(String(espece).toUpperCase()) + '</span>';
  if(muet) badges += '<span class="badge">MUET</span>';
  (D.titres || []).forEach(function(t){ badges += '<span class="badge badge-gold">[' + esc(t.nom) + ']</span>'; });
  if(D.frere) badges += '<span class="badge badge-gold">' + esc(String(D.frere).toUpperCase()) + ' : NON-NPC</span>';
  badges += '<span class="badge badge-red">PRUDENCE RECOMMANDÉE</span>';

  v.innerHTML =
  '<section class="hero" aria-label="Présentation du sujet">' +
    (hero ? '<div class="hero-img" style="background-image:url(\'' + esc(hero.src) + '\')"></div>' : '') +
    '<div class="hero-tint"></div>' +
    '<div class="hud-frame" aria-hidden="true"><div class="hc tl"></div><div class="hc tr"></div><div class="hc bl"></div><div class="hc br"></div></div>' +
    '<div class="hud-label top-left" aria-hidden="true">SYSTÈME // DÉDALE<br>FICHE DE SUJET</div>' +
    '<div class="hud-label top-right" aria-hidden="true">ID : ' + SUBJECT_ID + '<br><span class="red">PRUDENCE : RECOMMANDÉE</span></div>' +
    '<div class="hud-label bottom-left" aria-hidden="true"><span class="dot"></span>ACTIF</div>' +
    '<div class="hud-label bottom-right" aria-hidden="true">LES AUTRES : NPC</div>' +
    '<div class="hero-content">' +
      '<div class="hero-eyebrow">Fiche <span>de sujet</span> — lecture en cours</div>' +
      '<h1 class="hero-title" id="heroTitle">' + esc(NOM) + '</h1>' +
      '<div class="hero-sub">' + esc(D.sousTitre || '') + '</div>' +
      '<nav class="btn-row" aria-label="Accès rapide">' + navBtns + '</nav>' +
    '</div>' +
  '</section>' +
  '<div class="page-shell">' +
    '<div class="eyebrow">Carte d\'identité générée par le Système</div>' +
    '<div class="export-row"><button type="button" class="mini-btn" id="exportBtn">EXPORTER EN PNG</button></div>' +
    '<div class="stack">' +
    card({ id:'idCard', sub:'ID : ' + SUBJECT_ID, body:
      '<div class="card-body">' +
        '<div class="photo-wrap">' +
          (photo ? '<img src="' + esc(photo.src) + '" class="photo" alt="' + esc(photo.alt || NOM) + '">' : '') +
          '<div class="photo-scan"></div><div class="photo-sweep"></div>' +
          '<div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div>' +
          '<div class="photo-tag">SUJET IDENTIFIÉ</div>' +
        '</div>' +
        '<div class="info-panel">' +
          '<div class="name-block"><button type="button" class="char-name" id="cardTitle" title="Cliquer : interférence">' + esc(NOM) + '</button>' +
          '<div class="char-alias">' + esc(D.sousTitre || '') + '</div></div>' +
          '<div class="status-row"><div class="status-dot"></div><div class="status-val">ACTIF</div></div>' +
          '<div><div class="field-label">ESPÈCE / RACE</div><div class="field-val">' + fieldVal(espece) + '</div></div>' +
          '<div><div class="field-label">ÂGE</div><div class="field-val">' + fieldVal(age) + '</div></div>' +
          '<div><div class="field-label">STATURE</div><div class="field-val">' + fieldVal(stature) + '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="full-section">' +
        '<div class="full-block affil-grid">' +
          rest.map(function(c){ return '<div><div class="field-label">' + esc(c.label) + '</div><div class="field-val' + (norm(c.label) === 'surnom' ? ' hi' : '') + '">' + fieldVal(c.valeur) + '</div></div>'; }).join('') +
        '</div>' +
        '<div class="full-block"><div class="block-label">SIGNALEMENT PHYSIQUE</div><ul class="sig-list">' +
          physique.map(function(p){ return '<li>' + esc(p) + '</li>'; }).join('') +
        '</ul></div>' +
        '<div class="badges">' + badges + '</div>' +
        (warnTxt ? '<div class="warning-block" role="note"><div class="warn-icon" aria-hidden="true">⚠</div><div class="warn-txt"><b>AVERTISSEMENT DU SYSTÈME</b>' + esc(warnTxt) + '</div></div>' : '') +
      '</div>' })+
    '</div>' +
  '</div>';

  /* titre qui se recompose + parallaxe */
  var ht = $('#heroTitle', v); scramble(ht, NOM, 45);
  var heroEl = $('.hero', v), img = $('.hero-img', v), content = $('.hero-content', v);
  if(!RM && FINE && img){
    heroEl.addEventListener('mousemove', function(e){
      var r = heroEl.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      img.style.transform = 'translate(' + (x * 18) + 'px,' + (y * 18) + 'px)';
      content.style.transform = 'translate(' + (x * -6) + 'px,' + (y * -6) + 'px)';
    });
    heroEl.addEventListener('mouseleave', function(){ img.style.transform = ''; content.style.transform = ''; });
  }
  $('#cardTitle', v).addEventListener('click', function(){ glitchCard($('#idCard'), true); shake(); });
  $('#exportBtn', v).addEventListener('click', exportCard);
}

function exportCard(){
  var btn = $('#exportBtn'); btn.disabled = true;
  var img = $('#idCard .photo');
  var ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  var imgReady = new Promise(function(r){ if(!img || (img.complete && img.naturalWidth)) r(); else { img.onload = r; img.onerror = r; } });
  Promise.all([ready, imgReady]).then(function(){
    var W = 640, H = 400, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var x = cv.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#4aff4a'; x.lineWidth = 4; x.strokeRect(4, 4, W - 8, H - 8);
    x.fillStyle = 'rgb(5,18,5)'; x.fillRect(6, 6, W - 12, 44);
    x.lineWidth = 3; x.beginPath(); x.moveTo(6, 50); x.lineTo(W - 6, 50); x.stroke();
    x.fillStyle = '#4aff4a'; x.font = "16px 'Press Start 2P', monospace"; x.textAlign = 'left'; x.fillText('SYSTÈME', 24, 34);
    x.fillStyle = '#34b334'; x.font = "14px 'Share Tech Mono', monospace"; x.textAlign = 'right'; x.fillText('ID : ' + SUBJECT_ID, W - 24, 34); x.textAlign = 'left';
    if(img && img.naturalWidth){
      var s = Math.max(148 / img.naturalWidth, 189 / img.naturalHeight), sw = 148 / s, sh = 189 / s;
      try{ x.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) * .3, sw, sh, 30, 74, 148, 189); }catch(e){}
    }
    x.strokeStyle = '#4aff4a'; x.lineWidth = 3; x.strokeRect(30, 74, 148, 189);
    var X = 200;
    x.fillStyle = '#4aff4a'; x.font = "22px 'Press Start 2P', monospace"; x.fillText(NOM, X, 110);
    x.fillStyle = '#34b334'; x.font = "14px 'Share Tech Mono', monospace"; x.fillText(D.sousTitre || '', X, 138);
    var yy = 172;
    [['ESPÈCE', champ('Espèce')], ['STATURE', [champ('Taille'), champ('Poids')].filter(Boolean).join(' · ')]].forEach(function(r){
      x.fillStyle = '#3a6a3a'; x.font = "11px 'Share Tech Mono', monospace"; x.fillText(r[0], X, yy);
      x.fillStyle = '#9aaa9a'; x.font = "14px 'Share Tech Mono', monospace"; x.fillText(r[1] || '???', X, yy + 20); yy += 46;
    });
    var t = (D.titres || [])[0];
    if(t){ x.strokeStyle = '#8a6000'; x.lineWidth = 1; x.strokeRect(X, yy - 6, 300, 26); x.fillStyle = '#ffd700'; x.font = "9px 'Press Start 2P', monospace"; x.fillText('[' + t.nom + ']', X + 10, yy + 11); }
    x.strokeStyle = '#4aff4a'; x.lineWidth = 3; x.beginPath(); x.moveTo(6, H - 50); x.lineTo(W - 6, H - 50); x.stroke();
    x.fillStyle = '#34b334'; x.font = "11px 'Share Tech Mono', monospace"; x.textAlign = 'center'; x.fillText('// WELCXME TO THE DEDALE', W / 2, H - 25);
    try{
      cv.toBlob(function(blob){
        btn.disabled = false;
        if(!blob){ notify('SYSTÈME', 'Export impossible.', 'red'); return; }
        var u = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = u; a.download = norm(NOM) + '-carte-systeme.png'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function(){ URL.revokeObjectURL(u); }, 2000);
        notify('SYSTÈME', 'Carte exportée en PNG.');
      });
    }catch(e){
      btn.disabled = false;
      notify('SYSTÈME', 'Export bloqué quand la page est ouverte depuis l\'ordinateur. Il fonctionnera une fois le site en ligne.', 'red', 8000);
    }
  });
}

/* =====================================================================
   VUE : PSYCHÉ — notes du Système + module de perception (NPC)
   ===================================================================== */
function viewPsyche(v){
  var psy = D.psycho || [];
  var frere = D.frere || '';
  v.innerHTML = '<div class="page-shell">' +
    '<div class="eyebrow">Analyse psychologique</div><h1 class="page-title">PSYCHÉ</h1>' +
    '<p class="lead">Notes compilées par le Système. Lecture recommandée avant toute approche du sujet.</p>' +
    '<div class="stack">' +
    card({ sub:'FICHE // PSYCHÉ — NOTES DU SYSTÈME', body:
      '<div class="full-section pt">' +
        '<div class="full-block"><div class="block-label">INDICE ÉMOTIONNEL <span class="r">MESURE EN DIRECT</span></div>' +
          '<div class="monitor"><canvas id="emoCv" aria-hidden="true"></canvas></div>' +
          '<div class="monitor-read"><span>ÉMOTION DÉTECTÉE : <b>AUCUNE</b></span><span>EXPRESSION : <b>NEUTRE</b></span><span>LECTURE : <b>IMPOSSIBLE</b></span></div>' +
        '</div>' +
        '<div class="notes" id="notes">' +
        psy.map(function(p, i){
          var warn = /prudence|mauvais/i.test(p);
          return '<div class="note' + (warn ? ' warn' : '') + '"><div class="note-head"><span>NOTE ' + pad(i + 1) + ' // ' + (warn ? 'AVERTISSEMENT' : 'OBSERVATION') + '</span><span class="st">STATUT : VÉRIFIÉ</span></div>' +
            '<p class="note-txt" data-text="' + esc(p) + '"></p></div>';
        }).join('') +
        '</div>' +
      '</div>' }) +
    card({ id:'percCard', sub:'MODULE // PERCEPTION DU SUJET', body:
      '<div class="full-section pt">' +
        '<p class="desc" style="margin-bottom:12px">Simulation : la foule telle que le sujet la classe. Chaque individu est étiqueté automatiquement. ' +
        'Sélectionne une silhouette (clic, ou flèches au clavier) puis lance l\'évaluation.</p>' +
        '<div class="scan-wrap"><canvas id="crowd" tabindex="0" aria-label="Foule analysée par le Système : chaque silhouette porte une étiquette NPC, sauf ' + esc(frere) + '."></canvas>' +
          '<div class="scan-hud" aria-hidden="true"><span>VUE SUBJECTIVE // ' + esc(NOM) + '</span><span class="rec">ANALYSE</span></div>' +
          '<div class="scan-alert" id="scanAlert" aria-hidden="true"><span>ALTERCATION<br>BAGARRE DE RUE</span></div>' +
        '</div>' +
        '<div class="scan-controls">' +
          '<button type="button" class="mini-btn" id="tPrev">◀ CIBLE</button>' +
          '<button type="button" class="mini-btn" id="tNext">CIBLE ▶</button>' +
          '<button type="button" class="mini-btn" id="tScan">ANALYSER LA FOULE</button>' +
          '<button type="button" class="mini-btn" id="tReset" style="margin-left:auto">RÉINITIALISER</button>' +
        '</div>' +
        '<div class="target-panel" id="tPanel" aria-live="polite"></div>' +
        '<div class="counters">' +
          '<div class="counter" id="cA"><span class="counter-l">ANALYSÉS</span><span class="counter-v">' + S.analyses + '</span></div>' +
          '<div class="counter" id="cB"><span class="counter-l">BONS NPC</span><span class="counter-v">' + S.bons + '</span></div>' +
          '<div class="counter red" id="cM"><span class="counter-l">MAUVAIS NPC</span><span class="counter-v">' + S.mauvais + '</span></div>' +
          '<div class="counter red" id="cC" title="Bagarres de rue provoquées"><span class="counter-l">CHAOS</span><span class="counter-v">' + S.chaos + '</span></div>' +
        '</div>' +
      '</div>' }) +
    '</div></div>';

  /* notes tapées à l'apparition */
  var notesEl = $('#notes', v), gen = viewGen;
  var txts = $$('.note-txt', v);
  txts.forEach(function(t){ if(RM) t.textContent = t.dataset.text; });
  onReveal(notesEl, async function(){
    for(var i = 0; i < txts.length; i++){
      if(gen !== viewGen) return;
      await typeInto(txts[i], txts[i].dataset.text, 12, { step:2, abort:function(){ return gen !== viewGen; } });
      await sleep(120);
    }
  });

  emotionMonitor($('#emoCv', v));
  crowdModule(v);
}

function emotionMonitor(cv){
  var x = cv.getContext('2d'), w, h, dpr = Math.min(devicePixelRatio || 1, 2), pts = [], raf, gen = viewGen;
  function size(){ w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); }
  size();
  var ro = new ResizeObserver(size); ro.observe(cv);
  var t = 0;
  function draw(){
    if(gen !== viewGen) return;
    raf = requestAnimationFrame(draw);
    t++;
    if(t % 2) return;
    pts.push((Math.random() - .5) * 1.4);
    if(pts.length > w / 2) pts.shift();
    x.fillStyle = '#020602'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(74,255,74,.08)'; x.lineWidth = 1;
    for(var gx = 0; gx < w; gx += 20){ x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, h); x.stroke(); }
    for(var gy = 0; gy < h; gy += 20){ x.beginPath(); x.moveTo(0, gy); x.lineTo(w, gy); x.stroke(); }
    x.strokeStyle = '#4aff4a'; x.lineWidth = 1.6; x.shadowColor = '#4aff4a'; x.shadowBlur = 8;
    x.beginPath();
    for(var i = 0; i < pts.length; i++){ var px = w - (pts.length - i) * 2, py = h / 2 + pts[i]; i ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.stroke(); x.shadowBlur = 0;
    x.fillStyle = '#4aff4a'; x.fillRect(w - 3, h / 2 - 2 + pts[pts.length - 1], 3, 4);
    x.fillStyle = 'rgba(74,255,74,.5)'; x.font = '10px "Share Tech Mono", monospace'; x.fillText('Δ 0,00', 8, 14);
  }
  if(RM){ pts = new Array(200).fill(0); t = 1; draw(); cancelAnimationFrame(raf); } else draw();
  onCleanup(function(){ cancelAnimationFrame(raf); ro.disconnect(); });
}

function crowdModule(v){
  var cv = $('#crowd', v), x = cv.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2);
  var W = 640, H = 320, gen = viewGen, raf;
  var people = [], sel = null, hover = null, sweepX = -50, sweepSpeed = 3.2, judging = false, eilynSpawned = false, lastT = performance.now();
  var frereRel = (D.relations || []).find(function(r){ return norm(r.nom) === norm(D.frere); }) || {};
  var eilynImg = frereRel.portrait || null;
  var panel = $('#tPanel', v);
  var buildings = [];
  function size(){
    W = cv.clientWidth || 640; H = cv.clientHeight || 320;
    cv.width = W * dpr; cv.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildings = []; var bx = 0;
    while(bx < W){ var bw = rand(30, 90), bh = rand(.12, .32) * H; buildings.push({ x:bx, w:bw, h:bh, win:Array.from({ length:ri(2, 8) }, function(){ return [rand(.1, .9), rand(.1, .9)]; }) }); bx += bw + rand(2, 10); }
  }
  size();
  var ro = new ResizeObserver(function(){ size(); }); ro.observe(cv);
  var LANES = [{ y:.58, s:.5, sp:.35 }, { y:.75, s:.75, sp:.55 }, { y:.95, s:1.02, sp:.8 }];
  var maxPeople = function(){ return W < 500 ? 6 : 9; };
  function spawn(initial, forceEilyn){
    var lane = ri(0, 2), dir = Math.random() < .5 ? 1 : -1, L = LANES[lane];
    var isE = forceEilyn || (!people.some(function(p){ return p.eilyn; }) && eilynSpawned && Math.random() < .1);
    if(isE) eilynSpawned = true;
    var p = {
      id:'NPC-' + pad(ri(0, 9999), 4), lane:lane, dir:dir, s:L.s * (H / 320) * rand(.92, 1.08),
      x:initial ? rand(20, W - 20) : (dir > 0 ? -30 : W + 30), sp:L.sp * rand(.7, 1.3), ph:rand(0, 6.28),
      hat:Math.random() < .25, bag:Math.random() < .3, wide:rand(.85, 1.2), tagged:false, verdict:null, eilyn:isE, fall:0, frozen:false
    };
    if(isE){ p.id = String(D.frere || '???').toUpperCase(); p.wide = .95; p.hat = false; p.bag = false; p.lane = 1; p.s = LANES[1].s * (H / 320); }
    people.push(p);
    people.sort(function(a, b){ return a.lane - b.lane; });
    return p;
  }
  for(var i = 0; i < maxPeople(); i++) spawn(true);
  var eT = setTimeout(function(){ if(gen === viewGen){ spawn(false, true); } }, RM ? 100 : 5000);

  function bbox(p){ var L = LANES[p.lane], base = L.y * H, h = 84 * p.s; return { x:p.x - 16 * p.s * p.wide, y:base - h - 4, w:32 * p.s * p.wide, h:h + 4, base:base }; }

  function drawPerson(p){
    var b = bbox(p), s = p.s, cx = p.x, base = b.base;
    var col = p.eilyn ? '#ffd700' : p.verdict === 'mauvais' ? '#ff3030' : p.verdict === 'bon' ? '#4aff4a' : p.tagged ? '#2a8a2a' : '#1d4a1d';
    if(p === hover || p === sel) col = p.eilyn ? '#ffe680' : p.verdict === 'mauvais' ? '#ff6060' : '#9aff9a';
    x.save();
    if(p.fall > 0){ x.translate(cx, base); x.rotate(p.fall * 1.4 * (p.dir > 0 ? 1 : -1)); x.translate(-cx, -base); x.globalAlpha = Math.max(0, 1 - p.fall * .9); }
    var walk = p.frozen ? 0 : Math.sin(p.ph) * .45;
    var hipY = base - 34 * s, neckY = base - 66 * s, headR = 7.5 * s;
    x.strokeStyle = col; x.fillStyle = 'rgba(3,18,3,.92)'; x.lineWidth = Math.max(1, 1.4 * s); x.lineCap = 'round';
    if(p.eilyn){ x.shadowColor = '#ffd700'; x.shadowBlur = 10; }
    // jambes
    x.beginPath(); x.moveTo(cx, hipY); x.lineTo(cx + Math.sin(walk) * 22 * s, base); x.moveTo(cx, hipY); x.lineTo(cx - Math.sin(walk) * 22 * s, base); x.stroke();
    // torse
    var sw = 13 * s * p.wide, ww = 8 * s * p.wide;
    x.beginPath(); x.moveTo(cx - sw, neckY + 2 * s); x.lineTo(cx + sw, neckY + 2 * s); x.lineTo(cx + ww, hipY + (p.eilyn ? 14 * s : 0)); x.lineTo(cx - ww, hipY + (p.eilyn ? 14 * s : 0)); x.closePath(); x.fill(); x.stroke();
    // bras
    x.beginPath(); x.moveTo(cx - sw + 1, neckY + 4 * s); x.lineTo(cx - sw - Math.sin(walk) * 10 * s, neckY + 30 * s);
    x.moveTo(cx + sw - 1, neckY + 4 * s); x.lineTo(cx + sw + Math.sin(walk) * 10 * s, neckY + 30 * s); x.stroke();
    // tête
    x.beginPath(); x.arc(cx, neckY - headR, headR, 0, Math.PI * 2); x.fill(); x.stroke();
    if(p.hat){ x.beginPath(); x.moveTo(cx - headR * 1.5, neckY - headR * 1.4); x.lineTo(cx + headR * 1.5, neckY - headR * 1.4); x.stroke(); x.strokeRect(cx - headR * .8, neckY - headR * 2.4, headR * 1.6, headR); }
    if(p.bag){ x.strokeRect(cx + sw - 2, neckY + 18 * s, 8 * s, 10 * s); }
    if(p.eilyn){ x.beginPath(); x.moveTo(cx - headR, neckY - headR * 1.6); x.quadraticCurveTo(cx, neckY - headR * 2.6, cx + headR, neckY - headR * 1.6); x.stroke(); }
    x.shadowBlur = 0;
    x.restore();
    if(p.fall > .6) return;
    // étiquette
    var tag = p.eilyn ? (p.tagged ? 'NON-NPC' : '???') : p.verdict === 'bon' ? 'BON NPC' : p.verdict === 'mauvais' ? 'MAUVAIS NPC' : p.tagged ? 'NPC' : '???';
    var fsz = Math.max(7, Math.round(8 * Math.min(1.1, s + .2)));
    x.font = fsz + 'px "Press Start 2P", monospace';
    var tw = x.measureText(tag).width + 10, ty = b.y - 8 - (p.eilyn ? 4 : 0);
    var tcol = p.eilyn && p.tagged ? '#ffd700' : p.verdict === 'mauvais' ? '#ff3030' : p.tagged ? '#4aff4a' : '#2a5a2a';
    x.fillStyle = 'rgba(0,0,0,.85)'; x.fillRect(cx - tw / 2, ty - fsz - 5, tw, fsz + 8);
    x.strokeStyle = tcol; x.lineWidth = 1; x.strokeRect(cx - tw / 2 + .5, ty - fsz - 4.5, tw - 1, fsz + 7);
    x.fillStyle = tcol; x.textAlign = 'center'; x.fillText(tag, cx, ty);
    if(p.eilyn && p.tagged){ x.font = '9px "Share Tech Mono", monospace'; x.fillStyle = '#ffe680'; x.fillText(String(D.frere || '').toUpperCase() + ' · FRÈRE', cx, ty - fsz - 9); }
    x.textAlign = 'left';
    x.beginPath(); x.moveTo(cx, ty + 3); x.lineTo(cx, b.y + 2); x.strokeStyle = tcol; x.globalAlpha = .5; x.stroke(); x.globalAlpha = 1;
  }

  function drawBrackets(p, t){
    var b = bbox(p), pad2 = 6 + Math.sin(t / 150) * 2, L = 9;
    var col = p.eilyn ? '#ffd700' : judging ? '#ff3030' : '#9aff9a';
    x.strokeStyle = col; x.lineWidth = 2;
    var x0 = b.x - pad2, y0 = b.y - pad2, x1 = b.x + b.w + pad2, y1 = b.y + b.h + pad2;
    x.beginPath();
    x.moveTo(x0, y0 + L); x.lineTo(x0, y0); x.lineTo(x0 + L, y0);
    x.moveTo(x1 - L, y0); x.lineTo(x1, y0); x.lineTo(x1, y0 + L);
    x.moveTo(x1, y1 - L); x.lineTo(x1, y1); x.lineTo(x1 - L, y1);
    x.moveTo(x0 + L, y1); x.lineTo(x0, y1); x.lineTo(x0, y1 - L);
    x.stroke();
    x.font = '9px "Share Tech Mono", monospace'; x.fillStyle = col;
    var lbl = p.eilyn ? 'CIBLE : ' + p.id : 'CIBLE : ' + p.id;
    var lx = Math.min(Math.max(4, x1 + 6), W - x.measureText(lbl).width - 4);
    x.fillText(lbl, lx, Math.min(H - 6, y1));
  }

  function frame(t){
    if(gen !== viewGen) return;
    raf = requestAnimationFrame(frame);
    var dt = Math.min(50, t - lastT) / 16.67; lastT = t;
    if(RM) dt = 0.5;
    // fond
    x.fillStyle = '#010401'; x.fillRect(0, 0, W, H);
    var hz = H * .42;
    x.fillStyle = '#020a02';
    buildings.forEach(function(bd){
      x.fillStyle = '#031003'; x.fillRect(bd.x, hz - bd.h, bd.w, bd.h);
      x.strokeStyle = '#0b2a0b'; x.strokeRect(bd.x + .5, hz - bd.h + .5, bd.w - 1, bd.h);
      x.fillStyle = 'rgba(74,255,74,.25)';
      bd.win.forEach(function(w){ x.fillRect(bd.x + w[0] * bd.w, hz - bd.h + w[1] * bd.h, 2, 2); });
    });
    x.strokeStyle = 'rgba(74,255,74,.12)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(0, hz); x.lineTo(W, hz); x.stroke();
    for(var k = -10; k <= 10; k++){ x.beginPath(); x.moveTo(W / 2 + k * 14, hz); x.lineTo(W / 2 + k * W * .16, H); x.stroke(); }
    for(var r = 1; r < 7; r++){ var yy = hz + (H - hz) * Math.pow(r / 7, 1.8); x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); }
    // balayage
    sweepX += sweepSpeed * dt * (W / 640);
    if(sweepX > W + 60){ sweepX = -60; sweepSpeed = 3.2; if(AU.isOn() && current === 'psyche') AU.play('scan'); }
    var g = x.createLinearGradient(sweepX - 50, 0, sweepX, 0);
    g.addColorStop(0, 'rgba(74,255,74,0)'); g.addColorStop(1, 'rgba(74,255,74,.16)');
    x.fillStyle = g; x.fillRect(sweepX - 50, 0, 50, H);
    x.fillStyle = 'rgba(154,255,154,.55)'; x.fillRect(sweepX, 0, 1.5, H);
    // personnes
    for(var i = people.length - 1; i >= 0; i--){
      var p = people[i];
      if(!p.frozen && p.fall === 0){ p.x += p.dir * p.sp * dt * (W / 640) * 1.1; p.ph += .12 * dt * p.sp * 1.6; }
      if(p.fall > 0){ p.fall += .03 * dt; if(p.fall > 1.2){ if(sel === p) setSel(null, true); people.splice(i, 1); continue; } }
      if(!p.tagged && Math.abs(p.x - sweepX) < 8 * (sweepSpeed / 3.2) + 4){
        p.tagged = true;
        if(!p.eilyn){ S.analyses++; bumpCounter('cA', S.analyses); }
      }
      if(p.x < -50 || p.x > W + 50){ if(sel === p){ setSel(null); panelMsg('[SYSTÈME] Cible perdue de vue.'); } people.splice(i, 1); continue; }
    }
    people.forEach(drawPerson);
    if(sel && people.indexOf(sel) > -1) drawBrackets(sel, t);
    while(people.length < maxPeople()) spawn(false);
    // bruit
    if(fxOn && !RM){ for(var n = 0; n < 30; n++){ x.fillStyle = 'rgba(154,255,154,' + (Math.random() * .06) + ')'; x.fillRect(Math.random() * W, Math.random() * H, 1, 1); } }
  }
  var saveT = 0;
  function bumpCounter(id, val){
    var c = $('#' + id, v); if(!c) return;
    $('.counter-v', c).textContent = val;
    c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
    clearTimeout(saveT); saveT = setTimeout(saveS, 400);
  }

  function panelMsg(m){ var e = $('.tp-msg', panel); if(e) e.textContent = m; }
  function renderPanel(){
    panel.className = 'target-panel';
    if(!sel){
      panel.innerHTML = '<div class="tp-id">AUCUNE CIBLE</div><div class="tp-meta">Sélectionne une silhouette dans la foule.</div><p class="tp-msg">[SYSTÈME] En attente d\'une cible.</p>';
      return;
    }
    if(sel.eilyn){
      panel.classList.add('non-npc');
      panel.innerHTML = '<div class="tp-row">' + (eilynImg ? '<img class="tp-portrait" src="' + esc(eilynImg) + '" alt="' + esc(D.frere) + '">' : '') +
        '<div><div class="tp-id">' + esc(String(D.frere).toUpperCase()) + ' // NON-NPC</div>' +
        '<div class="tp-meta">LIEN : <b>' + esc(frereRel.role || 'Frère') + '</b><br>CLASSE : <b>NON-NPC</b></div></div></div>' +
        '<p class="tp-msg">' + esc(frereRel.note || (D.psycho || [])[2] || '') + '</p>' +
        '<p class="tp-msg">[SYSTÈME] Évaluation impossible : le sujet ne classe pas cet individu comme NPC.</p>';
      return;
    }
    if(sel.verdict){
      panel.classList.add(sel.verdict === 'mauvais' ? 'bad' : 'x');
      panel.innerHTML = '<div class="tp-id">' + sel.id + ' // ' + (sel.verdict === 'bon' ? 'BON NPC' : 'MAUVAIS NPC') + '</div>' +
        '<div class="tp-meta">CLASSE : <b>NPC</b> · JUGEMENT : <b>' + (sel.verdict === 'bon' ? 'BON' : 'MAUVAIS') + '</b></div>' +
        '<p class="tp-msg">' + (sel.verdict === 'bon' ? '[SYSTÈME] Classé : BON NPC. Aucune action.' : '[SYSTÈME] Altercation enregistrée : bagarre de rue.') + '</p>';
      return;
    }
    panel.innerHTML = '<div class="tp-id">' + sel.id + ' // ' + (sel.tagged ? 'NPC' : 'ANALYSE…') + '</div>' +
      '<div class="tp-meta">CLASSE : <b>' + (sel.tagged ? 'NPC (classement automatique)' : '???') + '</b> · STATUT : <b>CIBLE VERROUILLÉE</b></div>' +
      '<div class="judge"><div class="judge-scale" aria-hidden="true"><span class="judge-lbl l">BON NPC</span><span class="judge-lbl r">MAUVAIS NPC</span><div class="judge-needle" id="needle"></div></div>' +
      '<div class="judge-cap"><span>◀ BON</span><span>FRONTIÈRE TRÈS MINCE</span><span>MAUVAIS ▶</span></div>' +
      '<div class="judge-btns"><button type="button" class="sys-btn sm red" id="judgeBtn">ÉVALUER LA CIBLE</button></div></div>' +
      '<p class="tp-msg">[SYSTÈME] Jugement en attente. Prudence.</p>';
    $('#judgeBtn', panel).addEventListener('click', judge);
    idleNeedle();
  }
  var needleRaf = 0;
  function idleNeedle(){
    cancelAnimationFrame(needleRaf);
    var n = $('#needle', panel); if(!n || RM) return;
    (function loop(t){ if(judging || !n.isConnected) return; n.style.left = (50 + Math.sin(t / 220) * 4 + Math.sin(t / 77) * 2) + '%'; needleRaf = requestAnimationFrame(loop); })(performance.now());
  }
  function setSel(p, silent){
    if(judging) return;
    if(sel && sel !== p && !sel.verdict) sel.frozen = false;
    sel = p;
    if(p){ p.frozen = !p.verdict || p.eilyn; if(!silent){ AU.play('lock'); } }
    renderPanel();
  }
  async function judge(){
    if(!sel || sel.eilyn || sel.verdict || judging) return;
    judging = true; busy = true;
    var target = sel, btn = $('#judgeBtn', panel); btn.disabled = true;
    if(!target.tagged){ target.tagged = true; S.analyses++; bumpCounter('cA', S.analyses); }
    panelMsg('[SYSTÈME] Évaluation en cours…');
    var n = $('#needle', panel), fin = Math.random() < .5 ? rand(51, 62) : rand(38, 49.2);
    var steps = RM ? 1 : 26;
    for(var i = 0; i < steps; i++){
      if(gen !== viewGen) return;
      var amp = 30 * (1 - i / steps);
      n.style.left = (i === steps - 1 ? fin : 50 + (Math.random() * 2 - 1) * amp + (fin - 50) * (i / steps)) + '%';
      AU.play('dice'); await sleep(45 + i * 5);
    }
    n.style.left = fin + '%';
    await sleep(300);
    if(gen !== viewGen) return;
    var bad = fin > 50;
    target.verdict = bad ? 'mauvais' : 'bon';
    if(bad){
      S.mauvais++; S.chaos++; bumpCounter('cM', S.mauvais); bumpCounter('cC', S.chaos);
      AU.play('bad'); var al = $('#scanAlert', v); al.classList.add('show');
      shake(true); glitchCard($('#percCard'), false);
      for(var h = 0; h < 3; h++){ setTimeout(function(){ AU.play('hit'); }, h * 180); }
      setTimeout(function(){ al.classList.remove('show'); }, 1600);
      notify('INCIDENT', 'Mauvais NPC détecté. Bagarre de rue enregistrée. CHAOS : ' + S.chaos + '.', 'red');
      target.fall = .01;
    } else {
      S.bons++; bumpCounter('cB', S.bons); AU.play('ok');
      target.frozen = false;
    }
    saveS();
    judging = false; busy = false;
    renderPanel();
  }

  function visibleSorted(){ return people.filter(function(p){ return p.x > 0 && p.x < W && p.fall === 0; }).sort(function(a, b){ return a.x - b.x; }); }
  function cycle(d){
    var list = visibleSorted(); if(!list.length) return;
    var i = sel ? list.indexOf(sel) : -1;
    setSel(list[(i + d + list.length) % list.length]);
  }
  function pointAt(e){
    var r = cv.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * W, py = (e.clientY - r.top) / r.height * H, best = null, bd = 1e9;
    people.forEach(function(p){
      if(p.fall) return;
      var b = bbox(p);
      var inside = px > b.x - 6 && px < b.x + b.w + 6 && py > b.y - 20 && py < b.y + b.h + 4;
      var d = Math.abs(px - p.x) + Math.abs(py - (b.y + b.h / 2)) * .5 - (inside ? 1000 : 0) - p.lane * 5;
      if(d < bd){ bd = d; best = p; }
    });
    return bd < 60 ? best : null;
  }
  cv.addEventListener('click', function(e){ var p = pointAt(e); if(p) setSel(p); });
  cv.addEventListener('mousemove', function(e){ hover = pointAt(e); cv.style.cursor = hover ? 'pointer' : 'crosshair'; });
  cv.addEventListener('mouseleave', function(){ hover = null; });
  cv.addEventListener('keydown', function(e){
    if(e.key === 'ArrowRight'){ e.preventDefault(); cycle(1); }
    else if(e.key === 'ArrowLeft'){ e.preventDefault(); cycle(-1); }
    else if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); if(!sel) cycle(1); else judge(); }
  });
  $('#tPrev', v).addEventListener('click', function(){ cycle(-1); });
  $('#tNext', v).addEventListener('click', function(){ cycle(1); });
  $('#tScan', v).addEventListener('click', function(){ sweepX = -40; sweepSpeed = 9; AU.play('sweep'); notify('SYSTÈME', 'Analyse accélérée de la foule.'); });
  $('#tReset', v).addEventListener('click', function(){
    S.analyses = 0; S.bons = 0; S.mauvais = 0; S.chaos = 0; saveS();
    ['cA', 'cB', 'cM', 'cC'].forEach(function(id){ $('.counter-v', $('#' + id, v)).textContent = 0; });
    AU.play('close');
  });
  renderPanel();
  raf = requestAnimationFrame(frame);
  onCleanup(function(){ cancelAnimationFrame(raf); cancelAnimationFrame(needleRaf); clearTimeout(eT); ro.disconnect(); saveS(); });
}

/* =====================================================================
   VUE : STATISTIQUES
   ===================================================================== */
function viewStats(v){
  var st = D.stats || [], rolls = D.rolls || [];
  var total = st.reduce(function(a, s){ return a + (+s.val || 0); }, 0), totMax = st.reduce(function(a, s){ return a + (+s.max || 20); }, 0);
  function bonusPct(b){ var m = String(b || '').match(/([\d.,]+)/); return m ? parseFloat(m[1].replace(',', '.')) : 0; }
  v.innerHTML = '<div class="page-shell">' +
    '<div class="eyebrow">Relevé du Système</div><h1 class="page-title">STATISTIQUES</h1>' +
    '<p class="lead">Valeurs mesurées sur 20. Les bonus actifs sont signalés en or.</p>' +
    '<div class="stack">' +
    card({ id:'statCard', sub:'FICHE // STATISTIQUES', body:
      '<div class="full-section pt"><div class="full-block"><div class="block-label">ATTRIBUTS <span class="r">ÉCHELLE 0 – 20</span></div><div class="stat-list">' +
      st.map(function(s, i){
        var max = +s.max || 20, val = +s.val || 0, bp = bonusPct(s.bonus);
        var segs = '';
        for(var k = 0; k < max; k++) segs += '<span class="seg" data-i="' + k + '">' + (bp && k === val ? '<i class="bonus" data-w="' + Math.min(100, val * bp) + '"></i>' : '') + '</span>';
        return '<div class="stat-row" data-val="' + val + '"><span class="stat-name">' + esc(s.nom) + '</span>' +
          '<div class="segbar" role="meter" aria-label="' + esc(s.nom) + '" aria-valuemin="0" aria-valuemax="' + max + '" aria-valuenow="' + val + '" style="grid-template-columns:repeat(' + max + ',1fr)">' + segs + '</div>' +
          '<span class="stat-val">' + pad(val) + ' <small>/ ' + max + '</small></span>' +
          (s.bonus ? '<div class="stat-bonus"><span class="badge badge-gold">BONUS ' + esc(s.bonus) + '</span><span>Valeur effective ≈ ' + fr(val * (1 + bp / 100)) + '</span></div>' : '') +
        '</div>';
      }).join('') +
      '</div><div class="stat-sum"><span>TOTAL : <b>' + total + '</b> / ' + totMax + '</span><span>MOYENNE : <b>' + fr(st.length ? total / st.length : 0) + '</b></span><span>BONUS ACTIFS : <b>' + st.filter(function(s){ return s.bonus; }).length + '</b></span></div></div></div>' }) +
    card({ id:'rollCard', sub:'FICHE // ROLLS', body:
      '<div class="full-section pt"><div class="full-block"><div class="block-label">ROLLS <span class="r">ÉCHELLE 0 – 100</span></div><div class="rolls">' +
      rolls.map(function(r){
        var val = Math.max(0, Math.min(100, +r.val || 0)), cls = val <= 10 ? 'low' : val >= 95 ? 'max' : '';
        var verdict = cls === 'low' ? 'VALEUR CRITIQUE' : cls === 'max' ? 'VALEUR MAXIMALE' : 'VALEUR STANDARD';
        var C = 2 * Math.PI * 52;
        return '<div class="roll"><div class="ring ' + cls + '" role="meter" aria-label="' + esc(r.nom) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + val + '">' +
          '<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="trk" cx="60" cy="60" r="52"/><circle class="val" cx="60" cy="60" r="52" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + C.toFixed(2) + '" data-off="' + (C * (1 - val / 100)).toFixed(2) + '"/><circle class="ticks" cx="60" cy="60" r="52"/></svg>' +
          '<div class="ring-num"><span class="rn" data-v="' + val + '">0</span><small>/ 100</small></div></div>' +
          '<div class="roll-name">' + esc(String(r.nom).toUpperCase()) + '</div><div class="roll-verdict ' + cls + '">' + verdict + '</div></div>';
      }).join('') +
      '</div></div></div>' }) +
    '</div></div>';

  var gen = viewGen;
  onReveal($('#statCard', v), async function(){
    var rows = $$('.stat-row', v);
    for(var r = 0; r < rows.length; r++){
      var val = +rows[r].dataset.val, segs = $$('.seg', rows[r]);
      for(var k = 0; k < val && k < segs.length; k++){
        if(gen !== viewGen) return;
        segs[k].classList.add('on', 'lit'); AU.play('seg', k + r);
        await sleep(55);
      }
      var bonus = $('.bonus', rows[r]); if(bonus) bonus.style.width = bonus.dataset.w + '%';
      await sleep(40);
    }
  });
  onReveal($('#rollCard', v), function(){
    $$('.ring .val', v).forEach(function(c){ c.style.strokeDashoffset = c.dataset.off; });
    $$('.rn', v).forEach(function(n){
      var target = +n.dataset.v, t0 = performance.now(), dur = RM ? 1 : 1300;
      (function step(t){ var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); n.textContent = Math.round(target * e); if(k < 1 && gen === viewGen){ if(Math.random() < .3) AU.play('dice'); requestAnimationFrame(step); } })(t0);
    });
  });
}

/* =====================================================================
   VUE : COMPÉTENCES (+ simulations)
   ===================================================================== */
function viewSkills(v){
  var SK = D.competences || [];
  var L = SK.find(function(s){ return s.icone === 'lien'; });
  var C = SK.find(function(s){ return s.icone === 'chaos'; });
  var groups = [];
  SK.forEach(function(s){ var g = s.groupe || 'Classique'; if(groups.indexOf(g) === -1) groups.push(g); });
  groups.sort(function(a, b){ return (norm(a).indexOf('speciale') === 0 ? -1 : 0) - (norm(b).indexOf('speciale') === 0 ? -1 : 0); });

  function lvOf(s){ return s.niveau || 1; }
  function table(s){
    if(!s.niveaux) return '';
    var isL = s === L, isC = s === C;
    var head = isL ? '<th>NIV.</th><th>COÛT</th><th>PRÉAVIS</th><th>CONDITION</th>' : isC ? '<th>NIV.</th><th>COÛT</th><th>RECHARGE</th><th>RENFORT</th><th>CONDITION</th>' : '<th>NIV.</th><th>CONDITION</th>';
    return '<div class="sub-label">PROGRESSION</div><div class="table-scroll"><table class="lv-table" data-sk="' + (isL ? 'lien' : isC ? 'chaos' : '') + '"><thead><tr>' + head + '</tr></thead><tbody>' +
      s.niveaux.map(function(n){
        var sp = n.special ? '<span class="sp">★ ' + esc(n.special) + '</span>' : '';
        var cells = isL ? '<td>' + (n.cout != null ? n.cout + ' % ENE' : '???') + '</td><td>' + (n.preavis != null ? n.preavis + ' s' : '???') + '</td><td>' + esc(n.requis || '???') + sp + '</td>'
          : isC ? '<td>' + (n.cout != null ? n.cout + ' % ENE' : '???') + '</td><td>' + (n.recharge != null ? n.recharge + ' adv.' : '???') + '</td><td>+' + fr(n.bonus || 0) + ' %' + ((n.marques || 1) > 1 ? ' ×' + n.marques : '') + '</td><td>' + esc(n.requis || '???') + sp + '</td>'
          : '<td>' + esc(n.requis || '???') + sp + '</td>';
        return '<tr data-lv="' + n.lv + '"><td>LV.' + n.lv + '</td>' + cells + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  function lvSel(id, cur){
    var b = '';
    for(var i = 1; i <= 5; i++) b += '<button type="button" data-lv="' + i + '" aria-pressed="' + (i === cur) + '">LV.' + i + '</button>';
    return '<div class="lv-sel" id="' + id + '" role="group" aria-label="Niveau simulé"><span>NIVEAU</span>' + b + '</div>';
  }
  function eneBar(){ return '<div class="ene"><span class="ene-l">ENE</span><div class="ene-track"><div class="ene-fill" style="width:100%"></div></div><span class="ene-v">100 %</span></div>'; }
  var rollChance = ((D.rolls || []).find(function(r){ return /chance/i.test(r.nom); }) || {}).val;

  function simLien(){
    return '<div class="sim" id="simLien"><div class="sim-title"><span>SIMULATION // [' + esc(L.nom).toUpperCase() + ']</span><span class="r">ILLUSTRATIVE</span></div>' +
      '<div class="sim-bar">' + lvSel('lvL', 1) + eneBar() + '<span class="sim-count red">CATASTROPHES : <b id="cataN">' + S.cata + '</b></span></div>' +
      '<div class="stage" id="stageL">' +
        '<svg class="links" aria-hidden="true"><line class="chain" id="chainL" x1="20%" y1="50%" x2="80%" y2="50%"/></svg>' +
        '<div class="node left" id="nCroc"><div class="node-ico">' + ICON.figure + '</div><div class="node-name">' + esc(NOM) + '</div><div class="node-sub">UTILISATEUR</div>' +
          '<div class="node-luck" title="Chance"><i id="luckC" style="width:' + (rollChance != null ? Math.max(4, rollChance) : 50) + '%"></i></div></div>' +
        '<div class="node right enemy" id="nTarget"><div class="node-ico">' + ICON.figure + '</div><div class="node-name" id="tName">CIBLE</div><div class="node-sub">MALHEUR</div>' +
          '<div class="node-luck" style="border-color:#4a0000;background:#0d0000"><i id="luckT" style="width:0;background:var(--red);box-shadow:0 0 6px var(--red)"></i></div></div>' +
        '<div class="countdown" id="cdL"><b id="cdN">5</b><span>CATASTROPHE IMMINENTE<br>L\'UTILISATEUR EST COMPTÉ PARMI LES VICTIMES</span></div>' +
        '<div class="dice" id="diceL"><span>DÉ DU SYSTÈME</span><b id="diceN">--</b></div>' +
        '<div class="stage-banner" id="banL"></div><div class="debris" id="debL"></div>' +
      '</div>' +
      '<div class="sim-log" id="logL" aria-live="polite"><p class="dim">[SYSTÈME] Module prêt. Choisis un niveau puis ACTIVER.</p></div>' +
      '<div class="sim-cmds"><button type="button" class="sys-btn sm red" id="goL">ACTIVER</button><button type="button" class="sys-btn sm sys-btn-ghost" data-rest>REPOS</button></div>' +
      '<div class="sim-params" id="parL"></div>' +
      '<p class="sim-note">Simulation illustrative : la catastrophe est tirée au hasard parmi les exemples de data.js. Au LV.5, le dé va de 1 à ' + esc(L.des || 100) + '.</p></div>';
  }
  function simChaos(){
    return '<div class="sim" id="simChaos"><div class="sim-title"><span>SIMULATION // [' + esc(C.nom).toUpperCase() + ']</span><span class="r">ILLUSTRATIVE</span></div>' +
      '<div class="sim-bar">' + lvSel('lvC', 1) + eneBar() + '</div>' +
      '<div class="sim-bar"><div class="recharge"><span class="recharge-l">CHAOS</span><div class="recharge-track"><div class="recharge-fill" id="rcF" style="width:100%"></div></div><span class="recharge-v" id="rcV">PRÊTE</span></div>' +
        '<span class="sim-count red">MARQUES ABSORBÉES : <b id="mkN">' + S.marques + '</b></span></div>' +
      '<div class="stage" id="stageC">' +
        '<div class="node left croc-chaos" id="nCroc2"><div class="node-ico">' + ICON.figure + '</div><div class="node-name">' + esc(NOM) + '</div><div class="node-sub">UTILISATEUR</div>' +
          '<div class="renfort" id="rfN">+' + fr(S.renfort) + ' %</div><div class="renfort-stats" id="rfS">RENFORT CUMULÉ</div></div>' +
        '<div class="foes" id="foes"></div>' +
        '<div class="stage-banner" id="banC"></div>' +
      '</div>' +
      '<div class="sim-log" id="logC" aria-live="polite"><p class="dim">[SYSTÈME] Deux adversaires en approche.</p></div>' +
      '<div class="sim-cmds"><button type="button" class="sys-btn sm red" id="markC">POSER LA MARQUE</button><button type="button" class="sys-btn sm" id="killC">ABATTRE</button><button type="button" class="sys-btn sm sys-btn-ghost" data-rest>REPOS</button></div>' +
      '<div class="sim-params" id="parC"></div>' +
      '<p class="sim-note">Simulation illustrative. ABATTRE frappe l\'adversaire de tête : s\'il est marqué, la marque est absorbée ; sinon il compte pour le rechargement.</p></div>';
  }
  function skillItem(s, open){
    var special = norm(s.groupe).indexOf('speciale') === 0;
    var isL = s === L, isC = s === C, isM = s.icone === 'marteau';
    var tag = isL || isC ? '<span class="skill-tag">SIMULATION</span>' : '';
    var lvTxt = s.niveaux && !s.niveau ? 'LV.1' : 'LV.' + lvOf(s);
    return '<div class="skill-item' + (special ? ' special' : '') + (open ? ' open' : '') + '" id="sk-' + esc(s.icone || '') + '">' +
      '<button type="button" class="skill-head" aria-expanded="' + !!open + '"><span class="skill-name"><span class="br">[</span>' + esc(s.nom) + '<span class="br">]</span></span>' +
      '<span class="skill-meta">' + tag + '<span class="skill-tag g">' + esc(String(s.type || '').toUpperCase()) + '</span><span class="skill-lv">' + lvTxt + '</span><span class="skill-caret" aria-hidden="true">⌄</span></span></button>' +
      '<div class="skill-body-wrap"><div class="skill-body"><div class="skill-inner">' +
        '<div class="skill-type">Compétence ' + esc(String(s.type || '').toLowerCase()) + (special ? ' · spéciale' : '') + '</div>' +
        '<p class="skill-desc hl">' + esc(s.desc || '???') + '</p>' +
        table(s) +
        (isM ? '<div class="sub-label">EFFET</div><p class="skill-desc">Aucun.</p><div class="sim-count">UTILISATIONS (SIMULATIONS) : <b id="coupsN">' + S.coups + '</b></div>' : '') +
        (isL ? simLien() : '') + (isC ? simChaos() : '') +
      '</div></div></div></div>';
  }

  v.innerHTML = '<div class="page-shell wide">' +
    '<div class="eyebrow">Registre des aptitudes</div><h1 class="page-title">COMPÉTENCES</h1>' +
    '<p class="lead">Déplie une compétence pour lire sa fiche. Les compétences actives disposent d\'une simulation du Système.</p>' +
    card({ sub:'FICHE // COMPÉTENCES', body:'<div class="full-section pt"><div class="full-block"><div class="block-label">COMPÉTENCES <span class="r">' + SK.length + ' ENTRÉES</span></div>' +
      groups.map(function(g){
        var label = norm(g).indexOf('speciale') === 0 ? 'COMPÉTENCES SPÉCIALES' : norm(g).indexOf('classique') === 0 ? 'COMPÉTENCES CLASSIQUES' : 'COMPÉTENCES — ' + String(g).toUpperCase();
        return '<div class="skill-subgroup"><div class="skill-subgroup-label">' + esc(label) + '</div>' +
          SK.filter(function(s){ return (s.groupe || 'Classique') === g; }).map(function(s){ return skillItem(s, s === L); }).join('') + '</div>';
      }).join('') + '</div></div>' }) +
    '</div>';

  $$('.skill-head', v).forEach(function(h){
    h.addEventListener('click', function(){
      var it = h.parentElement, o = it.classList.toggle('open');
      h.setAttribute('aria-expanded', o); AU.play(o ? 'open' : 'close');
    });
  });

  var gen = viewGen, alive = function(){ return gen === viewGen; };
  var ene = 100;
  function setEne(val){
    ene = Math.max(0, Math.min(100, val));
    $$('.ene-fill', v).forEach(function(f){ f.style.width = ene + '%'; });
    $$('.ene-v', v).forEach(function(f){ f.textContent = ene + ' %'; });
  }
  async function log(el, txt, cls, fast){
    var p = document.createElement('p'); if(cls) p.className = cls; el.appendChild(p);
    while(el.children.length > 14) el.firstChild.remove();
    el.scrollTop = el.scrollHeight;
    await typeInto(p, txt, fast ? 6 : 12, { step:2, abort:function(){ return !alive(); } });
    el.scrollTop = el.scrollHeight;
    return p;
  }
  $$('[data-rest]', v).forEach(function(b){
    b.addEventListener('click', async function(){
      if(simBusy) return;
      var lg = b.closest('.sim').querySelector('.sim-log');
      setEne(100); AU.play('ok'); await log(lg, '[SYSTÈME] ' + NOM + ' se repose. ENE rétablie : 100 %.', 'cyan', true);
    });
  });
  var simBusy = false;
  function lockAll(on){ simBusy = on; busy = on; $$('.sim button', v).forEach(function(b){ b.disabled = on; }); }
  onCleanup(function(){ $('#redAlert').classList.remove('on'); });

  /* ---------------- [Lien Infortuné] ---------------- */
  if(L){
    var lvL = 1, nivL = L.niveaux || [];
    var dL = function(){ return nivL.find(function(n){ return n.lv === lvL; }) || nivL[0] || { cout:0, preavis:5 }; };
    var parL = function(){
      var d = dL();
      $('#parL', v).innerHTML = '<div><span>COÛT</span>' + (d.cout != null ? d.cout + ' % ENE' : '???') + '</div><div><span>PRÉAVIS</span>' + (d.preavis != null ? d.preavis + ' s' : '???') + '</div>' +
        '<div><span>DÉ</span>' + (d.special ? '1 – ' + esc(L.des || 100) : '—') + '</div><div><span>CONDITION</span>' + esc(d.requis || '???') + '</div>' +
        (d.special ? '<div class="wide"><span>SPÉCIAL LV.' + d.lv + '</span>' + esc(d.special) + '</div>' : '');
      $('#goL', v).textContent = 'ACTIVER — ' + (d.cout != null ? d.cout : '?') + ' % ENE';
      $$('.lv-table[data-sk="lien"] tr[data-lv]', v).forEach(function(tr){ tr.classList.toggle('cur', +tr.dataset.lv === lvL); });
    };
    $('#lvL', v).addEventListener('click', function(e){
      var b = e.target.closest('button'); if(!b || simBusy) return;
      lvL = +b.dataset.lv; $$('#lvL button', v).forEach(function(x){ x.setAttribute('aria-pressed', x === b); }); AU.play('seg', lvL * 2); parL();
    });
    parL();
    var logL = $('#logL', v), stage = $('#stageL', v), nC = $('#nCroc', v), nT = $('#nTarget', v);
    function kindOf(ev){ var s = norm(ev); if(/incendi|feu|flamm/.test(s)) return 'feu'; if(/canalis|eau|inond/.test(s)) return 'eau'; if(/panne|court-circuit|electr/.test(s)) return 'panne'; if(/stampede|ruee|monstre/.test(s)) return 'ruee'; return 'chute'; }
    function pop(node, txt, col){ var p = document.createElement('div'); p.className = 'node-pop'; p.style.color = col; p.textContent = txt; node.appendChild(p); setTimeout(function(){ p.remove(); }, 1900); }
    function debris(kind){
      if(!fxActive()) return;
      var box = $('#debL', v), cols = { feu:['#ff8a00', '#ffd700', '#ff3030'], eau:['#00e5ff', '#5ab0ff', '#fff'], panne:['#fff', '#ffd700'], ruee:['#ff3030', '#aaa'], chute:['#9a9a9a', '#6a6a6a', '#ff3030'] }[kind];
      for(var i = 0; i < 46; i++){
        var d = document.createElement('i'); d.style.left = rand(0, 100) + '%'; d.style.background = pick(cols);
        var s = rand(3, 10); d.style.width = s + 'px'; d.style.height = s + 'px';
        d.style.animationDelay = rand(0, .5) + 's'; d.style.animationDuration = rand(.7, 1.4) + 's';
        if(kind === 'feu'){ d.style.top = 'auto'; d.style.bottom = '-10px'; d.style.animationName = 'none'; d.animate([{ transform:'translateY(0)', opacity:1 }, { transform:'translateY(-220px)', opacity:0 }], { duration:rand(700, 1400), delay:rand(0, 400), fill:'forwards' }); }
        box.appendChild(d);
      }
      setTimeout(function(){ box.innerHTML = ''; }, 2200);
    }
    function banner(el, html, cls){ el.className = 'stage-banner ' + (cls || ''); el.innerHTML = html; void el.offsetWidth; el.classList.add('show'); }
    async function transfer(){
      for(var i = 0; i < (RM ? 0 : 7); i++){
        var o = document.createElement('div'); o.className = 'absorb-orb'; o.style.background = 'var(--gold)'; o.style.boxShadow = '0 0 12px var(--gold)';
        o.style.left = '20%'; o.style.top = '50%'; o.style.width = o.style.height = '8px'; stage.appendChild(o);
        (function(o){ requestAnimationFrame(function(){ requestAnimationFrame(function(){ o.style.left = '80%'; }); }); setTimeout(function(){ o.remove(); }, 900); })(o);
        await sleep(90);
      }
    }
    $('#goL', v).addEventListener('click', async function(){
      if(simBusy) return;
      var d = dL();
      if(ene < (d.cout || 0)){ AU.play('err'); await log(logL, '[SYSTÈME] Énergie insuffisante : ' + ene + ' % (coût ' + d.cout + ' %). Utilise REPOS.', 'red'); return; }
      lockAll(true);
      var tid = 'NPC-' + pad(ri(0, 9999), 4); $('#tName', v).textContent = tid;
      nC.className = 'node left'; nT.className = 'node right enemy'; $('#luckT', v).style.width = '0'; $('#banL', v).classList.remove('show');
      logL.innerHTML = '';
      AU.play('ok');
      await log(logL, '[SYSTÈME] ' + NOM + ' active [' + L.nom + '] LV.' + lvL + ' sur ' + tid + '.');
      if(!alive()) return;
      setEne(ene - (d.cout || 0));
      $('#chainL', v).classList.add('on'); AU.play('link'); shake();
      await sleep(500);
      await log(logL, '[SYSTÈME] Lien établi. La chance de l\'utilisateur est transférée à la cible.', 'gold');
      AU.play('transfer'); await transfer();
      if(!alive()) return;
      await sleep(300);
      /* alerte du Système + préavis */
      var cd = $('#cdL', v), cdn = $('#cdN', v), pre = d.preavis || 5, ra = $('#redAlert');
      cd.classList.add('on'); ra.classList.add('on');
      notify('ALERTE DU SYSTÈME', 'Événement catastrophique imminent. Préavis : ' + pre + ' s. L\'utilisateur est compté parmi les victimes.', 'red', pre * 1000 + 800);
      var line = await log(logL, '[SYSTÈME] ALERTE ! Catastrophe imminente.', 'red', true);
      for(var s = pre; s > 0; s--){
        if(!alive()) return;
        cdn.textContent = s; line.textContent = '[SYSTÈME] ALERTE ! Catastrophe dans ' + s + ' s.';
        $('#luckT', v).style.width = ((pre - s + 1) / pre * 100) + '%';
        AU.play('alarm', s <= 3); if(s <= 3) flashBars($('#simLien').closest('.card'), 2);
        await sleep(1000);
      }
      cd.classList.remove('on'); ra.classList.remove('on');
      /* dé du LV.5 */
      var spared = false, roll = null;
      if(d.special){
        var des = +L.des || 100, dice = $('#diceL', v), dn = $('#diceN', v);
        dice.classList.add('on'); dn.className = '';
        await log(logL, '[SYSTÈME] Lancer du dé (1 – ' + des + ')…', 'gold', true);
        for(var k = 0; k < (RM ? 1 : 22); k++){ dn.textContent = ri(1, des); AU.play('dice'); await sleep(40 + k * 5); }
        roll = ri(1, des); dn.textContent = roll; spared = roll < 20; dn.className = spared ? 'lo' : 'hi';
        AU.play(spared ? 'ok' : 'err');
        await sleep(1000); dice.classList.remove('on');
        if(!alive()) return;
      }
      /* catastrophe */
      var ev = pick((D.catastrophes && D.catastrophes.length) ? D.catastrophes : ['???']), kd = kindOf(ev);
      AU.play('boom');
      if(kd === 'feu') AU.play('fire'); else if(kd === 'eau') AU.play('water'); else if(kd === 'panne') AU.play('zap'); else AU.play('rumble');
      stage.classList.remove('flash-red', 'flash-white', 'blackout'); void stage.offsetWidth;
      stage.classList.add(kd === 'panne' ? 'blackout' : kd === 'eau' ? 'flash-white' : 'flash-red');
      flashScreen(kd === 'eau' ? 'rgba(0,229,255,.35)' : kd === 'feu' ? 'rgba(255,138,0,.4)' : kd === 'panne' ? 'rgba(0,0,0,.9)' : 'rgba(255,48,48,.4)');
      shake(true); debris(kd); glitchCard($('#simLien').closest('.card'), true);
      banner($('#banL', v), esc(String(ev).toUpperCase()) + ' !<small>ÉVÉNEMENT CATASTROPHIQUE</small>');
      await sleep(900);
      if(!alive()) return;
      nT.classList.add('victim', 'hit'); pop(nT, 'VICTIME', 'var(--red)'); AU.play('hit');
      await sleep(400);
      if(spared){ nC.classList.add('spared'); pop(nC, 'ÉPARGNÉ', 'var(--cyan)'); }
      else { nC.classList.add('victim', 'hit'); pop(nC, 'VICTIME', 'var(--red)'); AU.play('hit'); }
      S.cata++; saveS(); $('#cataN', v).textContent = S.cata;
      await sleep(500);
      banner($('#banL', v), esc(String(ev).toUpperCase()) + '<small>VICTIMES : ' + (spared ? 'LA CIBLE' : 'LA CIBLE · ' + esc(NOM)) + '</small>', 'top' + (spared ? ' cyan' : ''));
      await log(logL, '[SYSTÈME] Catastrophe : ' + ev + '.', 'red');
      if(roll != null) await log(logL, spared ? '[SYSTÈME] Dé : ' + roll + ' (< 20). Seule la cible est incluse dans la catastrophe.' : '[SYSTÈME] Dé : ' + roll + ' (≥ 20). L\'utilisateur est compté parmi les victimes.', spared ? 'cyan' : 'red');
      else await log(logL, '[SYSTÈME] Victimes : la cible, l\'utilisateur.', 'red');
      $('#chainL', v).classList.remove('on');
      lockAll(false);
    });
  }

  /* ---------------- [Accumulation du Chaos] ---------------- */
  if(C){
    var lvC = C.niveau || 1, nivC = C.niveaux || [];
    var dC = function(){ return nivC.find(function(n){ return n.lv === lvC; }) || nivC[0] || { cout:10, recharge:5, bonus:.5, marques:1 }; };
    var foes = [], fid = 0, pret = true, abattus = 0;
    var foesEl = $('#foes', v), logC = $('#logC', v), stageC = $('#stageC', v);
    $$('#lvC button', v).forEach(function(b){ b.setAttribute('aria-pressed', +b.dataset.lv === lvC); });
    function newFoe(){
      fid++;
      var el = document.createElement('div'); el.className = 'foe enter';
      el.innerHTML = ICON.mark + '<div class="node-ico">' + ICON.monster + '</div><div class="node-name">ADV. #' + pad(fid) + '</div><div class="node-sub">' + (Math.random() < .5 ? 'MONSTRE' : 'NPC HOSTILE') + '</div>';
      foesEl.appendChild(el);
      requestAnimationFrame(function(){ requestAnimationFrame(function(){ el.classList.remove('enter'); }); });
      var f = { el:el, marked:false }; foes.push(f); return f;
    }
    newFoe(); newFoe();
    function marksOnField(){ return foes.filter(function(f){ return f.marked; }).length; }
    function syncC(){
      var d = dC(), N = d.recharge || 1, mk = marksOnField();
      var rcF = $('#rcF', v), rcV = $('#rcV', v);
      if(mk){ rcF.style.width = '100%'; rcV.textContent = mk > 1 ? mk + ' MARQUES POSÉES' : 'MARQUE POSÉE'; }
      else if(pret){ rcF.style.width = '100%'; rcV.textContent = 'PRÊTE'; }
      else { rcF.style.width = (abattus / N * 100) + '%'; rcV.textContent = 'RECHARGE ' + abattus + ' / ' + N; }
      $('#parC', v).innerHTML = '<div><span>COÛT</span>' + (d.cout != null ? d.cout + ' % ENE' : '???') + '</div><div><span>RECHARGE</span>' + (d.recharge != null ? d.recharge + ' adversaires tués' : '???') + '</div>' +
        '<div><span>RENFORT / MARQUE</span>+' + fr(d.bonus || 0) + ' %</div><div><span>MARQUES / RECHARGE</span>' + (d.marques || 1) + '</div><div><span>CONDITION</span>' + esc(d.requis || '???') + '</div>' +
        (d.special ? '<div class="wide"><span>SPÉCIAL LV.' + d.lv + '</span>' + esc(d.special) + '</div>' : '');
      $('#markC', v).textContent = 'POSER LA MARQUE' + ((d.marques || 1) > 1 ? ' ×' + d.marques : '') + ' — ' + (d.cout != null ? d.cout : '?') + ' % ENE';
      $('#rfS', v).textContent = lvC >= 3 ? 'F. PHYSIQUE · F. MUSCULAIRE · ROBUSTESSE' : 'RENFORT CUMULÉ';
      $$('.lv-table[data-sk="chaos"] tr[data-lv]', v).forEach(function(tr){ tr.classList.toggle('cur', +tr.dataset.lv === lvC); });
    }
    syncC();
    $('#lvC', v).addEventListener('click', function(e){
      var b = e.target.closest('button'); if(!b || simBusy) return;
      lvC = +b.dataset.lv; $$('#lvC button', v).forEach(function(x){ x.setAttribute('aria-pressed', x === b); }); AU.play('seg', lvC * 2); syncC();
    });
    $('#markC', v).addEventListener('click', async function(){
      if(simBusy) return;
      var d = dC();
      if(marksOnField()){ AU.play('err'); await log(logC, '[SYSTÈME] Marque déjà posée. Abats l\'adversaire marqué pour l\'absorber.', 'red', true); return; }
      if(!pret){ AU.play('err'); await log(logC, '[SYSTÈME] [' + C.nom + '] en rechargement : ' + abattus + ' / ' + d.recharge + ' adversaires tués.', 'red', true); return; }
      if(ene < (d.cout || 0)){ AU.play('err'); await log(logC, '[SYSTÈME] Énergie insuffisante : ' + ene + ' % (coût ' + d.cout + ' %). Utilise REPOS.', 'red', true); return; }
      lockAll(true);
      setEne(ene - (d.cout || 0));
      var n = Math.min(d.marques || 1, foes.length);
      for(var i = 0; i < n; i++){ foes[i].marked = true; foes[i].el.classList.add('marked'); }
      pret = false; AU.play('mark'); shake(); flashBars($('#simChaos').closest('.card'), 3);
      syncC();
      await log(logC, n > 1 ? '[SYSTÈME] ' + n + ' marques du Chaos posées simultanément.' : '[SYSTÈME] Marque du Chaos posée sur l\'adversaire.', 'red');
      lockAll(false);
    });
    $('#killC', v).addEventListener('click', async function(){
      if(simBusy) return;
      lockAll(true);
      var f = foes[0], d = dC();
      AU.play('swing'); await sleep(140);
      AU.play('hit'); f.el.classList.add('dead'); shake();
      S.coups++; var cn = $('#coupsN', v); if(cn) cn.textContent = S.coups;
      if(f.marked){
        var o = document.createElement('div'); o.className = 'absorb-orb';
        var sr = stageC.getBoundingClientRect(), fr2 = f.el.getBoundingClientRect(), cr = $('#nCroc2', v).getBoundingClientRect();
        o.style.left = (fr2.left + fr2.width / 2 - sr.left) + 'px'; o.style.top = (fr2.top + fr2.height / 2 - sr.top) + 'px';
        stageC.appendChild(o); AU.play('absorb');
        requestAnimationFrame(function(){ requestAnimationFrame(function(){ o.style.left = (cr.left + cr.width / 2 - sr.left) + 'px'; o.style.top = (cr.top + cr.height / 2 - sr.top) + 'px'; }); });
        await sleep(850); o.remove();
        if(!alive()) return;
        S.marques++; S.renfort = Math.round((S.renfort + (d.bonus || 0)) * 100) / 100; saveS();
        $('#mkN', v).textContent = S.marques; $('#rfN', v).textContent = '+' + fr(S.renfort) + ' %';
        var nc = $('#nCroc2', v); nc.classList.remove('hit'); void nc.offsetWidth; nc.classList.add('hit');
        flashScreen('rgba(255,48,48,.25)');
        foes.shift();
        var left = marksOnField();
        if(!left){ abattus = 0; }
        syncC();
        await log(logC, '[SYSTÈME] Marque absorbée. Statistiques renforcées de +' + fr(d.bonus || 0) + ' %' + (lvC >= 3 ? ' (F. Physique, F. Musculaire, Robustesse)' : '') + '. Total : +' + fr(S.renfort) + ' %.', 'red');
        if(!left) await log(logC, '[SYSTÈME] Rechargement : ' + abattus + ' / ' + d.recharge + ' adversaires.', 'dim', true);
      } else {
        foes.shift();
        if(!pret && !marksOnField()){
          abattus++;
          if(abattus >= (d.recharge || 1)){ pret = true; abattus = 0; AU.play('granted'); syncC(); await log(logC, '[SYSTÈME] [' + C.nom + '] rechargée.', 'gold'); notify('SYSTÈME', '[' + C.nom + '] rechargée.', 'gold'); }
          else { syncC(); await log(logC, '[SYSTÈME] Adversaire abattu. Rechargement : ' + abattus + ' / ' + d.recharge + '.', '', true); }
        } else { syncC(); await log(logC, '[SYSTÈME] Adversaire abattu.', '', true); }
      }
      setTimeout(function(){ f.el.remove(); }, 400);
      newFoe();
      await sleep(300);
      lockAll(false);
    });
  }
}

/* =====================================================================
   VUE : TITRES
   ===================================================================== */
function viewTitres(v){
  var T = D.titres || [];
  v.innerHTML = '<div class="page-shell">' +
    '<div class="eyebrow">Distinctions enregistrées</div><h1 class="page-title">TITRES</h1>' +
    '<p class="lead">Titres attribués au sujet par le Système.</p>' +
    card({ sub:'FICHE // TITRES — ' + T.length + ' OBTENU' + (T.length > 1 ? 'S' : ''), body:'<div class="full-section pt">' +
      (T.length ? T.map(function(t, i){
        return '<div class="title-card"><div class="block-label" style="color:var(--gold)">★ TITRE ' + pad(i + 1) + '</div>' +
          '<div class="title-name">[' + esc(t.nom) + ']</div>' +
          '<div class="title-rows"><div><div class="field-label">CONDITION</div><div class="field-val">' + esc(t.condition || '???') + '</div></div>' +
          '<div><div class="field-label">EFFET</div><div class="field-val eff">' + esc(t.effet || '???') + '</div></div></div>' +
          '<button type="button" class="sys-btn sm gold" data-t="' + i + '">AFFICHER LA NOTIFICATION</button></div>';
      }).join('') : '<p class="desc">Aucun titre.</p>') + '</div>' }) +
    '</div>';
  $$('[data-t]', v).forEach(function(b){ b.addEventListener('click', function(){ titleNotif(T[+b.dataset.t]); }); });
  if(T.length && !sess.get('titre-vu')){
    sess.set('titre-vu', '1');
    var gen = viewGen;
    setTimeout(function(){ if(gen === viewGen && !modalOpen && !document.body.classList.contains('is-booting')) titleNotif(T[0]); }, RM ? 100 : 900);
  }
}

function titleNotif(t){
  var m = openModal(card({ cls:'gold', sub:'NOTIFICATION // ' + SUBJECT_ID, footer:true, seal:'// WELCXME TO THE DEDALE', body:
    '<div class="tn-body"><canvas class="tn-fx" aria-hidden="true"></canvas>' +
      '<div class="tn-star">★ TITRE OBTENU ★</div>' +
      '<div class="tn-name" id="tnName">[' + esc(t.nom) + ']</div>' +
      '<div class="tn-rule"></div>' +
      '<div class="tn-row"><div class="field-label">CONDITION</div><div class="field-val" id="tnCond"></div></div>' +
      '<div class="tn-row eff"><div class="field-label">EFFET</div><div class="field-val" id="tnEff"></div></div>' +
      '<div class="tn-actions"><button type="button" class="sys-btn sm gold" data-close data-autofocus>OK</button></div>' +
    '</div>' }), { label:'Titre obtenu : ' + t.nom });
  var el = m.el;
  AU.play('fanfare');
  scramble($('#tnName', el), '[' + t.nom + ']', 34);
  (async function(){ await sleep(500); await typeInto($('#tnCond', el), t.condition || '???', 12, { step:2 }); await typeInto($('#tnEff', el), t.effet || '???', 14, { step:2 }); })();
  /* éclats dorés */
  if(!fxActive()) return;
  var cv = $('.tn-fx', el), x = cv.getContext('2d'), w = cv.clientWidth, h = cv.clientHeight;
  cv.width = w; cv.height = h;
  var parts = [];
  for(var i = 0; i < 90; i++) parts.push({ x:w / 2, y:h * .3, vx:rand(-4, 4), vy:rand(-5, 1), s:ri(2, 4), c:pick(['#ffd700', '#fff6a0', '#4aff4a', '#ffffff']), life:ri(50, 110) });
  (function step(){
    if(!el.isConnected) return;
    x.clearRect(0, 0, w, h);
    var alive = 0;
    parts.forEach(function(p){ if(p.life-- <= 0) return; alive++; p.vy += .12; p.x += p.vx; p.y += p.vy; x.fillStyle = p.c; x.globalAlpha = Math.min(1, p.life / 40); x.fillRect(p.x | 0, p.y | 0, p.s, p.s); });
    x.globalAlpha = 1;
    if(alive) requestAnimationFrame(step);
  })();
}

/* =====================================================================
   VUE : RELATIONS
   ===================================================================== */
function viewRelations(v){
  var R = D.relations || [];
  var cases = Math.max(+D.relationsCases || 0, R.length);
  function sKey(st){ var s = norm(st); if(!s) return 'nd'; if(s.indexOf('alli') === 0) return 'allie'; if(s.indexOf('neutre') === 0) return 'neutre'; if(s.indexOf('ennemi') === 0) return 'ennemi'; return 'inconnu'; }
  var GL = { allie:'●', neutre:'◆', ennemi:'▲', inconnu:'░', nd:'░' };
  var LBL = { allie:'ALLIÉ', neutre:'NEUTRE', ennemi:'ENNEMI', inconnu:'INCONNU', nd:'NON DÉFINI' };
  var FILTERS = [['tous', 'TOUS'], ['allie', 'ALLIÉS'], ['neutre', 'NEUTRES'], ['ennemi', 'ENNEMIS'], ['inconnu', 'INCONNUS'], ['nonnpc', 'NON-NPC']];
  var filt = 'tous', sort = 0;

  v.innerHTML = '<div class="page-shell">' +
    '<div class="eyebrow">Fiches de contacts</div><h1 class="page-title">RELATIONS</h1>' +
    '<p class="lead">Individus enregistrés autour du sujet. Pour lui, presque tous sont des NPC.</p>' +
    card({ sub:'FICHE // RELATIONS — ' + R.length + ' / ' + cases + ' CASES', body:'<div class="full-section pt">' +
      '<div class="toolbar-row"><div class="filter-row" id="filt" role="group" aria-label="Filtrer par statut"></div><button type="button" class="filter-btn" id="sortB">TRIER PAR AFFINITÉ <span id="sortA">—</span></button></div>' +
      '<div class="contact-grid" id="grid"></div></div>' }) +
    '</div>';

  function count(k){ return k === 'tous' ? R.length : k === 'nonnpc' ? R.filter(function(r){ return r.npc === false; }).length : R.filter(function(r){ return sKey(r.statut) === k || (k === 'inconnu' && sKey(r.statut) === 'nd'); }).length; }
  function renderFilters(){
    $('#filt', v).innerHTML = FILTERS.map(function(f){ return '<button type="button" class="filter-btn" data-f="' + f[0] + '" aria-pressed="' + (filt === f[0]) + '">' + f[1] + ' <span class="filter-count">' + count(f[0]) + '</span></button>'; }).join('');
  }
  function contactHTML(r, i){
    var k = sKey(r.statut), nonNpc = r.npc === false;
    var portrait = r.portrait ? '<img src="' + esc(r.portrait) + '" alt="Portrait de ' + esc(r.nom) + '" loading="lazy">' : esc((String(r.nom).replace(/[^A-Za-zÀ-ÿ]/g, '').charAt(0) || '?').toUpperCase());
    var rows = '';
    if(r.rencontre != null) rows += '<div class="cm-row"><span class="cm-label">Rencontre</span><span>' + esc(r.rencontre) + '</span></div>';
    if(r.derniereMaj != null) rows += '<div class="cm-row"><span class="cm-label">Dernière interaction</span><span>' + esc(r.derniereMaj) + '</span></div>';
    var aff = r.affinite != null
      ? '<div><div class="aff-top"><span>Affinité</span><span>' + (+r.affinite) + ' %</span></div><div class="aff-track"><div class="aff-fill" data-w="' + Math.max(0, Math.min(100, +r.affinite)) + '"></div></div></div>'
      : '<div><div class="aff-top"><span>Affinité</span><span>Non évaluée</span></div><div class="aff-track"><div class="aff-fill unknown"></div></div></div>';
    return '<article class="contact-card' + (nonNpc ? ' non-npc' : '') + '">' +
      '<button type="button" class="contact-head" aria-expanded="false" aria-controls="cb' + i + '">' +
        '<span class="contact-portrait ' + (k === 'nd' ? 'inconnu' : k) + '">' + portrait + '</span>' +
        '<span class="contact-id"><span class="contact-name" style="display:block">' + esc(r.nom) + '</span><span class="contact-role" style="display:block">' + esc(r.role || '???') + '</span>' +
          '<span class="contact-tags"><span class="ctag ' + (k === 'nd' ? 'inconnu' : k) + '"><span class="status-icon ' + (k === 'nd' || k === 'inconnu' ? 'inconnu' : '') + '">' + GL[k] + '</span> ' + LBL[k] + '</span>' +
          '<span class="ctag ' + (nonNpc ? 'nonnpc' : 'npc') + '">' + (nonNpc ? '★ NON-NPC' : 'NPC') + '</span></span></span>' +
        '<span class="contact-caret" aria-hidden="true">⌄</span>' +
      '</button>' +
      '<div class="contact-body-wrap" id="cb' + i + '"><div><div class="contact-body">' +
        (r.portrait ? '<div class="contact-photo"><img src="' + esc(r.portrait) + '" alt="" loading="lazy"><span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span><span class="photo-tag">' + (nonNpc ? 'NON-NPC CONFIRMÉ' : 'IDENTIFIÉ') + '</span></div>' : '') +
        (r.citation ? '<div class="contact-quote">' + esc(r.citation) + '</div>' : '') +
        aff + (rows ? '<div class="contact-meta">' + rows + '</div>' : '') +
        '<div class="contact-meta"><div class="cm-row"><span class="cm-label">Classement</span><span>' + (nonNpc ? 'NON-NPC — le sujet ne le voit pas comme un NPC' : 'NPC (classement automatique du sujet)') + '</span></div></div>' +
        (r.note ? '<div class="cm-note">' + esc(r.note) + '</div>' : '') +
      '</div></div></div></article>';
  }
  function renderGrid(){
    var list = R.map(function(r, i){ return { r:r, i:i }; }).filter(function(o){
      if(filt === 'tous') return true;
      if(filt === 'nonnpc') return o.r.npc === false;
      var k = sKey(o.r.statut); return k === filt || (filt === 'inconnu' && k === 'nd');
    });
    if(sort){
      var kn = list.filter(function(o){ return o.r.affinite != null; }), un = list.filter(function(o){ return o.r.affinite == null; });
      kn.sort(function(a, b){ return sort === 1 ? b.r.affinite - a.r.affinite : a.r.affinite - b.r.affinite; });
      list = kn.concat(un);
    }
    var html = list.map(function(o){ return contactHTML(o.r, o.i); }).join('');
    if(filt === 'tous'){
      for(var e = R.length; e < cases; e++) html += '<div class="contact-empty" aria-hidden="true"><span class="contact-portrait">?</span><span class="ce-txt">CASE ' + pad(e + 1) + ' // VIDE<br>AUCUNE DONNÉE</span></div>';
    }
    if(!list.length && filt !== 'tous') html = '<p class="no-result">[SYSTÈME] Aucun contact dans cette catégorie.</p>';
    $('#grid', v).innerHTML = html;
    $$('.contact-head', v).forEach(function(h){
      h.addEventListener('click', function(){
        var c = h.parentElement, o = c.classList.toggle('open'); h.setAttribute('aria-expanded', o);
        AU.play(o ? 'open' : 'close');
        if(o){ var f = $('.aff-fill[data-w]', c); if(f) setTimeout(function(){ f.style.width = f.dataset.w + '%'; }, 120); glitchCard(c.closest('.card'), false); }
      });
    });
  }
  renderFilters(); renderGrid();
  $('#filt', v).addEventListener('click', function(e){ var b = e.target.closest('[data-f]'); if(!b) return; filt = b.dataset.f; renderFilters(); renderGrid(); });
  $('#sortB', v).addEventListener('click', function(){
    sort = (sort + 1) % 3; $('#sortA', v).textContent = ['—', '↓', '↑'][sort];
    $('#sortB', v).setAttribute('aria-pressed', sort ? 'true' : 'false'); renderGrid();
  });
}

/* =====================================================================
   VUE : ARCHIVES (galerie)
   ===================================================================== */
function viewArchives(v){
  var G = D.galerie || [];
  v.innerHTML = '<div class="page-shell wide">' +
    '<div class="eyebrow">Fichiers image rattachés au sujet</div><h1 class="page-title">ARCHIVES</h1>' +
    '<p class="lead">Ouvre un fichier pour le déchiffrer. Illustrations : fan arts, droits réservés à leurs auteurs.</p>' +
    card({ sub:'ARCHIVES // ' + G.length + ' FICHIER' + (G.length > 1 ? 'S' : ''), body:'<div class="full-section pt"><div class="files">' +
      G.map(function(g, i){
        var name = 'FICHIER_' + pad(i + 1) + '.' + (String(g.src).split('.').pop() || 'jpg').toUpperCase();
        return '<button type="button" class="file" data-i="' + i + '" aria-label="Ouvrir ' + name + ' : ' + esc(g.alt) + '">' +
          '<span class="file-head"><span>' + name + '</span><span>▣</span></span>' +
          '<span class="file-thumb"><img src="' + esc(g.src) + '" alt="" loading="lazy" data-res="' + i + '"></span>' +
          '<span class="file-meta">RÉSOLUTION : <span class="res" id="res' + i + '">…</span> · <span class="ok">ACCÈS AUTORISÉ</span><span class="cap">' + esc(g.alt) + '</span></span>' +
        '</button>';
      }).join('') + '</div></div>' }) +
    '</div>';
  $$('img[data-res]', v).forEach(function(im){
    var setR = function(){ var r = $('#res' + im.dataset.res, v); if(r && im.naturalWidth) r.textContent = im.naturalWidth + '×' + im.naturalHeight; };
    if(im.complete) setR(); else im.addEventListener('load', setR);
  });
  $$('.file', v).forEach(function(b){ b.addEventListener('click', function(){ lightbox(+b.dataset.i); }); });
}

function lightbox(i){
  var G = D.galerie || []; if(!G.length) return;
  var idx = i, token = 0;
  var m = openModal('<div class="lb" style="width:100%;display:flex;justify-content:center">' + card({ sub:'VISIONNEUSE // <span id="lbName"></span>', aria:'Visionneuse', footer:false, body:
    '<div class="lb-stage" id="lbStage"><img id="lbImg" alt=""><canvas id="lbCv" aria-hidden="true"></canvas><div class="lb-decrypt" id="lbDec">DÉCHIFFREMENT…</div></div>' +
    '<div class="lb-bar"><p class="lb-cap" id="lbCap"></p><div class="lb-nav">' +
      '<button type="button" class="close-x" id="lbPrev" aria-label="Fichier précédent">◀</button><button type="button" class="close-x" id="lbNext" aria-label="Fichier suivant">▶</button>' +
      '<button type="button" class="close-x" data-close data-autofocus aria-label="Fermer la visionneuse">✕ FERMER</button></div></div>' }) + '</div>',
    { label:'Visionneuse des archives', onKey:function(e){
      if(e.key === 'ArrowRight'){ e.preventDefault(); show(idx + 1); return true; }
      if(e.key === 'ArrowLeft'){ e.preventDefault(); show(idx - 1); return true; }
    } });
  var el = m.el, img = $('#lbImg', el), cv = $('#lbCv', el), dec = $('#lbDec', el);
  $('#lbPrev', el).addEventListener('click', function(){ show(idx - 1); });
  $('#lbNext', el).addEventListener('click', function(){ show(idx + 1); });
  function show(n){
    idx = (n + G.length) % G.length; var g = G[idx], my = ++token;
    $('#lbName', el).textContent = 'FICHIER_' + pad(idx + 1);
    $('#lbCap', el).textContent = g.alt || '';
    img.style.visibility = 'hidden'; cv.style.display = 'none'; dec.style.display = 'block'; dec.textContent = 'DÉCHIFFREMENT… 0 %';
    AU.play('glitch');
    img.onload = async function(){
      if(my !== token) return;
      var w = img.clientWidth, h = img.clientHeight;
      if(RM || !w){ img.style.visibility = 'visible'; dec.style.display = 'none'; return; }
      cv.width = w; cv.height = h; cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.style.display = 'block';
      var x = cv.getContext('2d'), off = document.createElement('canvas'), ox = off.getContext('2d');
      var steps = [48, 32, 22, 14, 9, 6, 4, 2];
      for(var s = 0; s < steps.length; s++){
        if(my !== token || !el.isConnected) return;
        var bs = steps[s], sw = Math.max(1, Math.ceil(w / bs)), sh = Math.max(1, Math.ceil(h / bs));
        off.width = sw; off.height = sh; ox.drawImage(img, 0, 0, sw, sh);
        x.imageSmoothingEnabled = false; x.clearRect(0, 0, w, h); x.drawImage(off, 0, 0, sw, sh, 0, 0, w, h);
        x.fillStyle = 'rgba(74,255,74,' + (0.25 - s * .03) + ')'; x.globalCompositeOperation = 'source-atop'; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over';
        dec.textContent = 'DÉCHIFFREMENT… ' + Math.round((s + 1) / steps.length * 100) + ' %';
        AU.play('key');
        await sleep(70);
      }
      if(my !== token) return;
      img.style.visibility = 'visible'; cv.style.display = 'none'; dec.textContent = 'ACCÈS AUTORISÉ'; AU.play('beep');
      setTimeout(function(){ if(my === token) dec.style.display = 'none'; }, 900);
    };
    img.alt = g.alt || ''; img.src = g.src;
    if(img.complete && img.naturalWidth) img.onload();
  }
  show(idx);
}

/* ---------------------------------------------------------------------
   COMMANDES GLOBALES
   --------------------------------------------------------------------- */
function bindGlobal(){
  $('#soundToggle').addEventListener('click', function(){ AU.setOn(!AU.isOn()); if(AU.isOn()){ AU.play('ok'); } notify('SYSTÈME', AU.isOn() ? 'Son activé.' : 'Son coupé.'); });
  $('#fxToggle').addEventListener('click', function(){ setFx(!fxOn); notify('SYSTÈME', fxOn ? 'Effets d\'écran activés.' : 'Effets d\'écran désactivés.'); });
  document.addEventListener('keydown', function(e){
    if(document.body.classList.contains('is-booting') || modalOpen) return;
    if(e.ctrlKey || e.metaKey || e.altKey) return;
    var tg = e.target; if(tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
    if(/^[1-7]$/.test(e.key)){ location.hash = ORDER[+e.key - 1]; }
    else if(e.key === 'm' || e.key === 'M'){ $('#soundToggle').click(); }
    else if(e.key === '?'){ showHelp(); }
  });
  $$('#tabs .tab, .brand').forEach(function(t){
    t.addEventListener('mouseenter', function(){
      if(RM || t._busy || !t.dataset.route) return; t._busy = true;
      var txt = t.textContent; scramble(t, txt, 14, function(){ t._busy = false; });
    });
  });
  setInterval(updateReadout, 30000);
}

/* ---------------------------------------------------------------------
   LANCEMENT
   --------------------------------------------------------------------- */
function start(){
  if(!sess.get('counted')){ store.set('sessions', (store.get('sessions', 0) || 0) + 1); sess.set('counted', '1'); }
  setFx(fxOn);
  var sb = $('#soundToggle'); sb.setAttribute('aria-pressed', AU.isOn() ? 'true' : 'false');
  bindGlobal();
  initRain(); initCursorFx(); initClickRipple(); scheduleAmbient();
  updateReadout();
  boot();
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

})();
