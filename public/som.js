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
    try { prepararSons(); } catch (e) {}
    carregarVoz('headshot', 'sons/headshot.mp3'); carregarVoz('promocao', 'sons/promocao.mp3'); carregarVoz('bomba', 'sons/bomba.mp3');
  };
  S.ambiente = function (fechado) { if (ecoG) ecoG.gain.value = fechado ? 0.42 : 0.2; };
  S.ouvinte = function (x, y, z, fx, fz) {
    ouv.x = x; ouv.y = y; ouv.z = z; if (!ctx) return; var L = ctx.listener;
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
  /* ---------- tiros realistas: sintetizados em camadas e guardados em buffers ----------
     estalo (onda de choque) + grave (boca do cano) + estouro (gás) + mecânica (ferrolho) + cauda (reflexões) */
  // perfil: estalo, grave(τ s), f0 do soco, estouro(τ s), brilho(Hz), mecânica, cauda(τ s), volume
  var PERFIL = {
    ar9:  { estalo: 1.0, grave: 0.075, f0: 135, estouro: 0.03, brilho: 2232, mec: 0.22, cauda: 0.49, vol: 1.0 },
    b3:   { estalo: 0.95, grave: 0.08, f0: 120, estouro: 0.032, brilho: 1984, mec: 0.22, cauda: 0.52, vol: 1.0 },
    vx45: { estalo: 0.7, grave: 0.05, f0: 175, estouro: 0.022, brilho: 2604, mec: 0.3, cauda: 0.35, vol: 0.8 },
    vb:   { estalo: 1.6, grave: 0.15, f0: 75, estouro: 0.055, brilho: 1488, mec: 0, cauda: 1.59, vol: 1.35 },
    arara: { estalo: 1.45, grave: 0.12, f0: 90, estouro: 0.05, brilho: 1700, mec: 0, cauda: 1.35, vol: 1.22 },
    l7:   { estalo: 1.4, grave: 0.13, f0: 85, estouro: 0.05, brilho: 1612, mec: 0, cauda: 1.38, vol: 1.25 },
    t12:  { estalo: 0.9, grave: 0.15, f0: 75, estouro: 0.06, brilho: 1364, mec: 0, cauda: 1.09, vol: 1.25 },
    p9:   { estalo: 0.85, grave: 0.045, f0: 185, estouro: 0.02, brilho: 2852, mec: 0.25, cauda: 0.38, vol: 0.75 }
  };
  var BUF = {}, ouv = { x: 0, y: 0, z: 0 };
  function fazerTiro(p) {
    var sr = ctx.sampleRate, dur = 0.25 + p.cauda * 2.2, n = Math.floor(sr * dur), b = ctx.createBuffer(2, n, sr);
    var aLow = 1 - Math.exp(-2 * Math.PI * 260 / sr), aMid = 1 - Math.exp(-2 * Math.PI * p.brilho / sr), aHp = 1 - Math.exp(-2 * Math.PI * 700 / sr), aTail = 1 - Math.exp(-2 * Math.PI * 900 / sr);
    var mecT = 0.022 + Math.random() * 0.01, mecF = [1900 + Math.random() * 300, 3300 + Math.random() * 400, 5200 + Math.random() * 500, 7600];
    for (var c = 0; c < 2; c++) {
      var d = b.getChannelData(c), lo = 0, mid = 0, hp = 0, tl = 0, tl2 = 0, fase = 0, pico = 0, est = 0;
      for (var i = 0; i < n; i++) {
        var t = i / sr, r = Math.random() * 2 - 1, x = 0;
        // estalo: 3 ms, banda larga e muito forte
        if (t < 0.004) { est += 0.35 * (r - est); x += est * p.estalo * Math.pow(1 - t / 0.004, 2) * 2.2; } // estalo mais encorpado (menos chiado)
        // grave: ruído abafado + soco que cai de tom
        lo += aLow * (r - lo);
        x += lo * 5.5 * Math.exp(-t / p.grave);
        fase += 2 * Math.PI * (p.f0 * (0.45 + 0.55 * Math.exp(-t / 0.04))) / sr;
        x += Math.sin(fase) * 0.9 * Math.exp(-t / (p.grave * 1.2)) * (t < 0.002 ? t / 0.002 : 1);
        // estouro: médios/agudos do gás
        mid += aMid * (r - mid); hp += aHp * (mid - hp);
        x += (mid - hp) * 2.6 * Math.exp(-t / p.estouro);
        // mecânica: ferrolho batendo (ressonâncias metálicas curtas)
        if (p.mec && t > mecT) { var tm = t - mecT, e = Math.exp(-tm / 0.012); if (e > 0.001) { var m = 0; for (var k = 0; k < 4; k++) m += Math.sin(2 * Math.PI * mecF[k] * tm + k) / (k + 1); x += (m * 0.6 + mid * 0.8) * p.mec * e; } }
        // cauda: reflexões que chegam depois, abafadas e diferentes em cada ouvido
        tl += aTail * (r - tl); tl2 += aLow * (tl - tl2);
        var at = t < 0.03 ? t / 0.03 : 1; x += (tl * 0.9 + tl2 * 2.2) * 0.55 * at * Math.exp(-t / p.cauda) * (1 + 0.25 * Math.sin(t * 37 + c * 2));
        d[i] = x; if (Math.abs(x) > pico) pico = Math.abs(x);
      }
      // saturação suave: dá peso e volume sem estourar
      var lpF = 0, aF = 1 - Math.exp(-2 * Math.PI * 5200 / sr); for (var j = 0; j < n; j++) { lpF += aF * (d[j] - lpF); d[j] = Math.tanh(lpF / pico * 1.9) / Math.tanh(1.9) * 0.95; } // tira o chiado de cima e dá peso
    }
    return b;
  }
  function metal(freqs, dur, ruidoV) {
    var sr = ctx.sampleRate, n = Math.floor(sr * dur), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0), hp = 0, a = 1 - Math.exp(-2 * Math.PI * 2500 / sr);
    for (var i = 0; i < n; i++) { var t = i / sr, r = Math.random() * 2 - 1, x = 0; hp += a * (r - hp);
      for (var k = 0; k < freqs.length; k++) x += Math.sin(2 * Math.PI * freqs[k] * t) * Math.exp(-t / (dur * (0.25 + 0.1 * k))) / (k + 1);
      x += (r - hp) * (ruidoV || 0.5) * Math.exp(-t / (dur * 0.12)); d[i] = x * 0.5; }
    return b;
  }
  function prepararSons() {
    Object.keys(PERFIL).forEach(function (k) { BUF[k] = [fazerTiro(PERFIL[k]), fazerTiro(PERFIL[k]), fazerTiro(PERFIL[k])]; });
    BUF.capsula = [metal([4200, 6900, 9800], 0.18, 0.2), metal([3800, 6100, 8800], 0.16, 0.2), metal([4600, 7300, 10400], 0.2, 0.2)];
    BUF.click = metal([2600, 4100, 6300], 0.05, 0.9);
    BUF.pentesai = metal([900, 1700, 2900], 0.12, 0.8);
    BUF.pententra = metal([700, 1400, 2300, 3500], 0.14, 1);
    BUF.puxa = metal([1500, 2600, 4400], 0.09, 1.2);
    BUF.solta = metal([1100, 2100, 3300, 5200], 0.16, 1);
  }
  function tocar(buf, destino, vol, taxa, quando) {
    if (!buf) return; var s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; s.playbackRate.value = taxa || 1; g.gain.value = vol; s.connect(g); g.connect(destino); s.start(quando || ctx.currentTime); return g;
  }
  function mec(nome, vol, atraso, pos) { if (!ctx) return; var d = saida(pos); tocar(BUF[nome], d, vol, 0.95 + Math.random() * 0.1, ctx.currentTime + (atraso || 0)); }
  S.tiro = function (arma, pos) {
    var A0 = window.REGRAS && window.REGRAS.ARMAS[arma]; if (!PERFIL[arma] && A0 && A0.base) arma = A0.base;
    if (!ctx) return; var p = PERFIL[arma]; if (!p) return; if (!BUF.ar9) prepararSons();
    var lista = BUF[arma], buf = lista[(Math.random() * lista.length) | 0], t = ctx.currentTime, d = saida(pos), v = p.vol * (0.9 + Math.random() * 0.15);
    if (pos) { // longe fica abafado e com mais eco
      var dist = Math.hypot(pos.x - ouv.x, pos.y - ouv.y, pos.z - ouv.z), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(900, 16000 / (1 + dist / 9)); lp.connect(d); d = lp;
      var g = tocar(buf, d, v, 0.97 + Math.random() * 0.06, t); var ge = ctx.createGain(); ge.gain.value = Math.min(0.9, 0.25 + dist / 60) * p.vol; g.connect(ge); ge.connect(eco);
    } else {
      var g2 = tocar(buf, d, v * 1.05, 0.98 + Math.random() * 0.04, t); var ge2 = ctx.createGain(); ge2.gain.value = 0.35 * p.vol; g2.connect(ge2); ge2.connect(eco);
      // cápsula caindo no chão
      if (arma !== 't12' && arma !== 'l7' && arma !== 'vb' && arma !== 'arara') { var cb = BUF.capsula; tocar(cb[(Math.random() * 3) | 0], mestre, 0.09, 1, t + 0.35 + Math.random() * 0.15); tocar(cb[(Math.random() * 3) | 0], mestre, 0.05, 1.1, t + 0.5 + Math.random() * 0.15); }
      if (arma === 'l7' || arma === 'vb' || arma === 'arara') { setTimeout(function () { S.ferrolho(); }, 480); }
      if (arma === 't12') { mec('puxa', 0.5, 0.38); mec('solta', 0.6, 0.55); }
    }
  };
  S.clique = function (f, v) { if (!ctx) return; var t = ctx.currentTime; estouro(mestre, t, v || 0.2, f || 3000, 4, 0.04, 0); };
  S.vazio = function () { if (!ctx) return; if (!BUF.click) prepararSons(); mec('click', 0.45); };
  S.ferrolho = function () { if (!ctx) return; if (!BUF.puxa) prepararSons(); mec('puxa', 0.55, 0); mec('solta', 0.6, 0.22); };
  S.recarga = function (arma, dur) {
    if (!ctx) return; if (!BUF.click) prepararSons(); dur = dur || 2;
    if (arma === 't12') { [0.2, 0.55, 0.9, 1.25, 1.6].forEach(function (tt) { mec('pententra', 0.35, tt); }); mec('puxa', 0.5, 2.0); mec('solta', 0.55, 2.2); return; }
    mec('pentesai', 0.45, 0.12); mec('pententra', 0.6, dur * 0.5); mec('click', 0.3, dur * 0.5 + 0.06);
    if (arma !== 'p9') { mec('puxa', 0.5, dur * 0.78); mec('solta', 0.6, dur * 0.78 + 0.16); } else mec('solta', 0.5, dur * 0.8);
  };
  S.troca = function () { if (!ctx) return; if (!BUF.click) prepararSons(); mec('pentesai', 0.25, 0); mec('click', 0.25, 0.12); };
  S.faca = function (pos) { if (!ctx) return; var t = ctx.currentTime, b = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); b.buffer = ruidoB; f.type = 'bandpass'; f.frequency.setValueAtTime(800, t); f.frequency.exponentialRampToValueAtTime(4000, t + 0.15); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); b.connect(f); f.connect(g); g.connect(saida(pos)); b.start(t); b.stop(t + 0.25); };
  S.passo = function (pos, vol) { if (!ctx) return; var t = ctx.currentTime, d = saida(pos); estouro(d, t, (vol || 0.18), 900 + Math.random() * 600, 1, 0.07, 0.1); };
  S.acerto = function () { if (!ctx) return; var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = 1900; g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06); o.connect(g); g.connect(mestre); o.start(t); o.stop(t + 0.07); };
  /* ---------- voz do locutor ("HEADSHOT!") ----------
     Se existir public/sons/headshot.mp3 usa o arquivo; senão usa a voz do próprio aparelho. */
  var VOZ = {};
  function carregarVoz(nome, arq) {
    fetch(arq).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(function (a) {
      ctx.decodeAudioData(a, function (b) { VOZ[nome] = b; }, function () {});
    }).catch(function () {});
  }
  var vozFala = null;
  function escolherVoz() {
    if (!window.speechSynthesis) return null; var vs = speechSynthesis.getVoices(); if (!vs.length) return null;
    return vs.filter(function (v) { return /^en(-|_)US/i.test(v.lang) && /male|david|guy|daniel/i.test(v.name); })[0] || vs.filter(function (v) { return /^en/i.test(v.lang); })[0] || vs[0];
  }
  if (window.speechSynthesis) { try { speechSynthesis.onvoiceschanged = function () { vozFala = escolherVoz(); }; vozFala = escolherVoz(); } catch (e) {} }
  S.locutor = function (nome, texto) {
    if (!ctx || mestre.gain.value === 0) return;
    if (VOZ[nome]) { var g = tocar(VOZ[nome], mestre, 1.25, 1, ctx.currentTime + 0.1); var ge = ctx.createGain(); ge.gain.value = 0.25; g.connect(ge); ge.connect(eco); return; }
    if (!window.speechSynthesis) return;
    try { var u = new SpeechSynthesisUtterance(texto); u.lang = 'en-US'; if (vozFala) u.voice = vozFala; u.rate = 1.15; u.pitch = 0.55; u.volume = 1; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
  };
  // acerto na cabeça: "ting" metálico de capacete
  S.capacete = function () { if (!ctx) return; if (!BUF.ting) BUF.ting = metal([2350, 3720, 5480, 8100], 0.45, 0.6); var t = ctx.currentTime; tocar(BUF.ting, mestre, 0.55, 0.97 + Math.random() * 0.06, t); soco(mestre, t, 0.35, 160, 0.08); };
  // HEAD SHOT (morte): impacto seco + ting forte + acorde brilhante subindo, com eco
  S.headshot = function () {
    if (!ctx) return; var t = ctx.currentTime; if (!BUF.ting) BUF.ting = metal([2350, 3720, 5480, 8100], 0.45, 0.6);
    soco(mestre, t, 0.9, 110, 0.18); estouro(mestre, t, 0.5, 6000, 1, 0.06, 0.3); S.locutor('headshot', 'Head shot!');
    var g = tocar(BUF.ting, mestre, 0.8, 1, t); var ge = ctx.createGain(); ge.gain.value = 0.5; g.connect(ge); ge.connect(eco);
    [[1046, 0.06], [1568, 0.12], [2093, 0.19]].forEach(function (n) {
      var o = ctx.createOscillator(), o2 = ctx.createOscillator(), gg = ctx.createGain(), q = t + n[1];
      o.type = 'triangle'; o.frequency.setValueAtTime(n[0] * 0.98, q); o.frequency.exponentialRampToValueAtTime(n[0], q + 0.04); o2.type = 'sine'; o2.frequency.value = n[0] * 2.01;
      gg.gain.setValueAtTime(0.0001, q); gg.gain.exponentialRampToValueAtTime(0.13, q + 0.012); gg.gain.exponentialRampToValueAtTime(0.0001, q + 0.6);
      o.connect(gg); o2.connect(gg); gg.connect(mestre); var e2 = ctx.createGain(); e2.gain.value = 0.4; gg.connect(e2); e2.connect(eco);
      o.start(q); o2.start(q); o.stop(q + 0.65); o2.stop(q + 0.65);
    });
  };
  S.kill = function (n) { if (!ctx) return; var t = ctx.currentTime, base = 523 * Math.pow(1.12, Math.min(5, n || 0)); [1, 1.5].forEach(function (k, i) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = base * k; var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2500; g.gain.setValueAtTime(0.0001, t + i * 0.09); g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.09 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.3); o.connect(f); f.connect(g); g.connect(mestre); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.35); }); };
  S.dor = function () { if (!ctx) return; var t = ctx.currentTime; soco(mestre, t, 0.5, 90, 0.2); estouro(mestre, t, 0.25, 1500, 1, 0.12, 0); };
  S.explosao = function (pos) { if (!ctx) return; var t = ctx.currentTime, d = saida(pos); estouro(d, t, 1.6, 2500, 0.5, 1.4, 1.5); soco(d, t, 1.4, 60, 0.9); };
  S.pino = function () { S.clique(3200, 0.2); };
  S.morte = function () { if (!ctx) return; var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(400, t); o.frequency.exponentialRampToValueAtTime(90, t + 1.2); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3); o.connect(g); g.connect(mestre); o.start(t); o.stop(t + 1.35); };
  // promoção: fanfarra de metais + voz
  S.promocao = function () {
    if (!ctx) return; var t = ctx.currentTime;
    [[523, 0, 0.18], [659, 0.14, 0.18], [784, 0.28, 0.18], [1046, 0.42, 0.9]].forEach(function (n) {
      [1, 1.5, 2].forEach(function (h, i) {
        var o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), q = t + n[1];
        o.type = 'sawtooth'; o.frequency.value = n[0] * h * (i === 1 ? 1.003 : 1); f.type = 'lowpass'; f.frequency.setValueAtTime(900, q); f.frequency.exponentialRampToValueAtTime(3200, q + 0.08);
        g.gain.setValueAtTime(0.0001, q); g.gain.exponentialRampToValueAtTime(0.09 / (i + 1), q + 0.03); g.gain.setValueAtTime(0.09 / (i + 1), q + n[2] * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, q + n[2] + 0.25);
        o.connect(f); f.connect(g); g.connect(mestre); var e = ctx.createGain(); e.gain.value = 0.35; g.connect(e); e.connect(eco); o.start(q); o.stop(q + n[2] + 0.3);
      });
    });
    soco(mestre, t + 0.42, 0.6, 90, 0.4);
    setTimeout(function () { S.locutor('promocao', 'Promoted!'); }, 700);
  };
  S.bip = function (pos, rapido) { if (!ctx) return; var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = rapido ? 2400 : 1900; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); o.connect(g); g.connect(saida(pos)); o.start(t); o.stop(t + 0.1); };
  S.clicar = function () { S.clique(2400, 0.12); };
  S.mudo = function (sim) { if (mestre) mestre.gain.value = sim ? 0 : 0.8; };
})();
