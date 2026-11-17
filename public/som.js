/* Sons gerados por código: tiros com eco, recarga, passos, acerto, headshot, explosão. Som 3D (direção do tiro). */
(function () {
  'use strict';
  var S = window.SOM = {};
  var ctx = null, mestre = null, eco = null, ecoG = null, ruidoB = null;
  function ruido(seg) { var b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seg), ctx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
  function resposta(seg, dec) { var n = Math.floor(ctx.sampleRate * seg), b = ctx.createBuffer(2, n, ctx.sampleRate); for (var c = 0; c < 2; c++) { var d = b.getChannelData(c); for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, dec); } return b; }
  S.iniciar = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); mestre = ctx.createGain(); mestre.gain.value = 0.8;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; mestre.connect(comp); comp.connect(ctx.destination);
    eco = ctx.createConvolver(); eco.buffer = resposta(1.6, 3); ecoG = ctx.createGain(); ecoG.gain.value = 0.35; eco.connect(ecoG); ecoG.connect(mestre);
    ruidoB = ruido(2);
  };
  S.ambiente = function (fechado) { if (ecoG) ecoG.gain.value = fechado ? 0.42 : 0.2; };
  S.ouvinte = function (x, y, z, fx, fz) {
    if (!ctx) return; var L = ctx.listener;
    if (L.positionX) { L.positionX.value = x; L.positionY.value = y; L.positionZ.value = z; L.forwardX.value = fx; L.forwardY.value = 0; L.forwardZ.value = fz; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
    else { L.setPosition(x, y, z); L.setOrientation(fx, 0, fz, 0, 1, 0); }
  };
  // saída: perto (sem posição) ou 3D (com posição do tiro)
  function saida(pos) {
    if (!pos) return mestre;
    var p = ctx.createPanner(); p.panningModel = 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = 4; p.rolloffFactor = 1.1; p.maxDistance = 150;
    if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
    p.connect(mestre); return p;
  }
  function estouro(destino, t, vol, freq, q, dur, ecoV) {
    var b = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    b.buffer = ruidoB; f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 0.15), t + dur); f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    b.connect(f); f.connect(g); g.connect(destino); if (ecoV) { var ge = ctx.createGain(); ge.gain.value = ecoV; g.connect(ge); ge.connect(eco); }
    b.start(t, Math.random() * 1.5); b.stop(t + dur + 0.05);
  }
  function soco(destino, t, vol, f0, dur) { var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.35, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(destino); o.start(t); o.stop(t + dur + 0.02); }
  // perfil de cada arma: [volume, brilho, duração, grave, eco]
  var TIRO = { ar9: [0.9, 5200, 0.22, 120, 0.9], b3: [0.95, 4600, 0.24, 110, 0.95], vx45: [0.7, 6500, 0.14, 150, 0.6], l7: [1.2, 3800, 0.5, 70, 1.4], t12: [1.2, 3000, 0.35, 80, 1.1], p9: [0.65, 6000, 0.15, 160, 0.6] };
  S.tiro = function (arma, pos) {
    if (!ctx) return; var p = TIRO[arma]; if (!p) return; var t = ctx.currentTime, d = saida(pos), v = p[0] * (0.92 + Math.random() * 0.16);
    estouro(d, t, v, p[1], 0.7, p[2], p[4]); estouro(d, t, v * 0.5, 12000, 0.3, 0.04, 0); soco(d, t, v * 0.9, p[3], p[2] * 0.8);
    if (arma === 'l7' && !pos) { setTimeout(function () { S.ferrolho(); }, 450); }
    if (arma === 't12' && !pos) { setTimeout(function () { S.clique(900, 0.25); setTimeout(function () { S.clique(600, 0.3); }, 140); }, 380); }
  };
  S.clique = function (f, v) { if (!ctx) return; var t = ctx.currentTime; estouro(mestre, t, v || 0.2, f || 3000, 4, 0.04, 0); };
  S.vazio = function () { S.clique(2500, 0.25); };
  S.ferrolho = function () { if (!ctx) return; S.clique(1400, 0.3); setTimeout(function () { S.clique(900, 0.35); }, 160); };
  S.recarga = function (arma, dur) {
    if (!ctx) return; dur = dur || 2; var passos = arma === 't12' ? [0.2, 0.55, 0.9, 1.25, 1.6, 2.1] : [0.15, dur * 0.45, dur * 0.8];
    passos.forEach(function (tt, i) { setTimeout(function () { S.clique(i === passos.length - 1 ? 1200 : 2200 - i * 300, 0.35); }, tt * 1000); });
  };
  S.troca = function () { S.clique(1800, 0.2); setTimeout(function () { S.clique(1100, 0.2); }, 120); };
  S.faca = function (pos) { if (!ctx) return; var t = ctx.currentTime, b = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); b.buffer = ruidoB; f.type = 'bandpass'; f.frequency.setValueAtTime(800, t); f.frequency.exponentialRampToValueAtTime(4000, t + 0.15); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); b.connect(f); f.connect(g); g.connect(saida(pos)); b.start(t); b.stop(t + 0.25); };
  S.passo = function (pos, vol) { if (!ctx) return; var t = ctx.currentTime, d = saida(pos); estouro(d, t, (vol || 0.18), 900 + Math.random() * 600, 1, 0.07, 0.1); };
  S.acerto = function () { if (!ctx) return; var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = 1900; g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06); o.connect(g); g.connect(mestre); o.start(t); o.stop(t + 0.07); };
  S.headshot = function () { if (!ctx) return; var t = ctx.currentTime; [1568, 2349].forEach(function (f, i) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + i * 0.07); g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.07 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.5); o.connect(g); g.connect(mestre); o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.55); }); };
  S.kill = function (n) { if (!ctx) return; var t = ctx.currentTime, base = 523 * Math.pow(1.12, Math.min(5, n || 0)); [1, 1.5].forEach(function (k, i) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = base * k; var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2500; g.gain.setValueAtTime(0.0001, t + i * 0.09); g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.09 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.3); o.connect(f); f.connect(g); g.connect(mestre); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.35); }); };
  S.dor = function () { if (!ctx) return; var t = ctx.currentTime; soco(mestre, t, 0.5, 90, 0.2); estouro(mestre, t, 0.25, 1500, 1, 0.12, 0); };
  S.explosao = function (pos) { if (!ctx) return; var t = ctx.currentTime, d = saida(pos); estouro(d, t, 1.6, 2500, 0.5, 1.4, 1.5); soco(d, t, 1.4, 60, 0.9); };
  S.pino = function () { S.clique(3200, 0.2); };
  S.morte = function () { if (!ctx) return; var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(400, t); o.frequency.exponentialRampToValueAtTime(90, t + 1.2); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3); o.connect(g); g.connect(mestre); o.start(t); o.stop(t + 1.35); };
  S.clicar = function () { S.clique(2400, 0.12); };
  S.mudo = function (sim) { if (mestre) mestre.gain.value = sim ? 0 : 0.8; };

  /* ---------- extras do QUEDA LIVRE ---------- */
  function ruidoLoop(freq, q, vol, tipo) { var b = ctx.createBufferSource(); b.buffer = ruidoB; b.loop = true; var f = ctx.createBiquadFilter(); f.type = tipo || 'bandpass'; f.frequency.value = freq; f.Q.value = q; var g = ctx.createGain(); g.gain.value = 0; b.connect(f); f.connect(g); g.connect(mestre); b.start(); return { b: b, f: f, g: g }; }
  var vento = null, motor = null;
  S.vento = function (v) { if (!ctx) return; if (!vento) vento = ruidoLoop(700, 0.6, 0); vento.g.gain.setTargetAtTime(Math.min(0.5, v * 0.5), ctx.currentTime, 0.15); vento.f.frequency.setTargetAtTime(400 + v * 900, ctx.currentTime, 0.2); };
  S.motorTrem = function (v) {
    if (!ctx) return;
    if (!motor) { motor = ruidoLoop(160, 1.2, 0, 'lowpass'); var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 52; var og = ctx.createGain(); og.gain.value = 0.06; var of = ctx.createBiquadFilter(); of.type = 'lowpass'; of.frequency.value = 260; o.connect(of); of.connect(og); og.connect(motor.g); o.start(); motor.o = o;
      var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 38; lg.gain.value = 0.04; lfo.connect(lg); lg.connect(og.gain); lfo.start(); o.frequency.value = 88; }
    motor.g.gain.setTargetAtTime(v * 0.45, ctx.currentTime, 0.4);
  };
  S.apito = function () { if (!ctx) return; var t = ctx.currentTime; [[659, 0], [523, 0.45]].forEach(function (n) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = n[0]; g.gain.setValueAtTime(0.0001, t + n[1]); g.gain.exponentialRampToValueAtTime(0.18, t + n[1] + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + n[1] + 1.2); o.connect(g); g.connect(mestre); var e = ctx.createGain(); e.gain.value = 0.4; g.connect(e); e.connect(eco); o.start(t + n[1]); o.stop(t + n[1] + 1.3); }); };
  S.buzina = function () { if (!ctx) return; var t = ctx.currentTime; [[311, 0], [370, 0], [466, 0]].forEach(function (n) { var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = n[0]; f.type = 'lowpass'; f.frequency.value = 1800; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.06); g.gain.setValueAtTime(0.12, t + 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75); g.gain.setValueAtTime(0.0001, t + 0.85); g.gain.exponentialRampToValueAtTime(0.12, t + 0.92); g.gain.setValueAtTime(0.12, t + 1.9); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.3); o.connect(f); f.connect(g); g.connect(mestre); var e = ctx.createGain(); e.gain.value = 0.5; g.connect(e); e.connect(eco); o.start(t); o.stop(t + 2.4); }); };
  S.paraquedas = function () { if (!ctx) return; var t = ctx.currentTime; estouro(mestre, t, 0.9, 1200, 0.7, 0.35, 0.2); soco(mestre, t, 0.5, 90, 0.3); };
  S.pouso = function () { if (!ctx) return; var t = ctx.currentTime; soco(mestre, t, 0.5, 70, 0.2); estouro(mestre, t, 0.4, 800, 1, 0.15, 0); };
  S.pegar = function () { if (!ctx) return; var t = ctx.currentTime; estouro(mestre, t, 0.25, 2600, 3, 0.06, 0); setTimeout(function () { S.clique(1500, 0.18); }, 70); };
  S.gelo = function (pos) { if (!ctx) return; var t = ctx.currentTime, d = saida(pos); for (var i = 0; i < 7; i++) estouro(d, t + i * 0.035, 0.5, 5000 + Math.random() * 3000, 6, 0.08, 0.4); soco(d, t, 0.5, 200, 0.3); };
  S.geloQuebra = function (pos) { if (!ctx) return; var t = ctx.currentTime, d = saida(pos); for (var i = 0; i < 10; i++) estouro(d, t + Math.random() * 0.25, 0.4, 6000, 5, 0.06, 0.3); };
  S.cura = function () { if (!ctx) return; var t = ctx.currentTime; [660, 880, 1320].forEach(function (f, i) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + i * 0.1); g.gain.exponentialRampToValueAtTime(0.08, t + i * 0.1 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.1 + 0.4); o.connect(g); g.connect(mestre); o.start(t + i * 0.1); o.stop(t + i * 0.1 + 0.45); }); };
  S.zona = function () { if (!ctx) return; var t = ctx.currentTime; for (var i = 0; i < 3; i++) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.setValueAtTime(880, t + i * 0.35); o.frequency.setValueAtTime(660, t + i * 0.35 + 0.15); g.gain.setValueAtTime(0.0001, t + i * 0.35); g.gain.exponentialRampToValueAtTime(0.06, t + i * 0.35 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.35 + 0.3); o.connect(g); g.connect(mestre); o.start(t + i * 0.35); o.stop(t + i * 0.35 + 0.32); } };
  S.soco = function (pos) { if (!ctx) return; var t = ctx.currentTime, d = saida(pos); soco(d, t, 0.6, 110, 0.12); estouro(d, t, 0.3, 1500, 1, 0.08, 0); };
  S.vitoria = function () { if (!ctx) return; var t = ctx.currentTime; [392, 523, 659, 784, 1046].forEach(function (f, i) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + i * 0.12); g.gain.exponentialRampToValueAtTime(0.15, t + i * 0.12 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 1); o.connect(g); g.connect(mestre); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 1.1); }); };
})();
