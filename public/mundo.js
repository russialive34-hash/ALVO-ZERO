/* Visual dos mapas: texturas feitas na hora, luzes, claraboias, trem, contêineres. */
(function () {
  'use strict';
  var W = window.MUNDO = {};
  var cache = {};
  function canvas(w, h, f) { var c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); return c; }
  function textura(nome, w, h, f, rep) {
    if (cache[nome]) return cache[nome];
    var t = new THREE.CanvasTexture(canvas(w, h, f)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; t.userData = { rep: rep || 2 };
    return (cache[nome] = t);
  }
  function sujeira(g, w, h, n, cor, a) { for (var i = 0; i < n; i++) { g.fillStyle = 'rgba(' + cor + ',' + (Math.random() * a) + ')'; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 30, 0, 7); g.fill(); } }
  function ruido(g, w, h, a) { var d = g.getImageData(0, 0, w, h); for (var i = 0; i < d.data.length; i += 4) { var v = (Math.random() - 0.5) * a; d.data[i] += v; d.data[i + 1] += v; d.data[i + 2] += v; } g.putImageData(d, 0, 0); }
  // cada textura: [desenho, metros que um ladrilho da textura cobre]
  var TEX = {
    piso: function () { return textura('piso', 256, 256, function (g, w, h) { g.fillStyle = '#8f8a80'; g.fillRect(0, 0, w, h); for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) { var v = (Math.random() * 16 - 8) | 0; g.fillStyle = 'rgb(' + (150 + v) + ',' + (144 + v) + ',' + (132 + v) + ')'; g.fillRect(i * 128 + 2, j * 128 + 2, 124, 124); } sujeira(g, w, h, 70, '70,60,50', 0.1); ruido(g, w, h, 14); }, 2); },
    parede: function () { return textura('parede', 256, 256, function (g, w, h) { // azulejo bege com faixa marrom
      g.fillStyle = '#9d968a'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 4; i++) for (var j = 0; j < 8; j++) { var v = (Math.random() * 10 - 5) | 0; g.fillStyle = 'rgb(' + (201 + v) + ',' + (194 + v) + ',' + (178 + v) + ')'; g.fillRect(i * 64 + 1, j * 32 + 1, 62, 30); }
      g.fillStyle = '#6b5136'; g.fillRect(0, 150, w, 22); g.fillStyle = '#8a6a48'; g.fillRect(0, 150, w, 4);
      sujeira(g, w, h, 40, '90,80,60', 0.08); ruido(g, w, h, 10); }, 4); },
    pilar: function () { return textura('pilar', 128, 256, function (g, w, h) { g.fillStyle = '#b9b2a4'; g.fillRect(0, 0, w, h); g.fillStyle = '#6b5136'; g.fillRect(0, 150, w, 22); sujeira(g, w, h, 30, '80,70,60', 0.1); ruido(g, w, h, 12); }, 4); },
    concreto: function () { return textura('concreto', 256, 256, function (g, w, h) { g.fillStyle = '#a19c93'; g.fillRect(0, 0, w, h); sujeira(g, w, h, 90, '70,70,70', 0.08); ruido(g, w, h, 18); }, 3); },
    caixa: function () { return textura('caixa', 256, 256, function (g, w, h) { g.fillStyle = '#8a6239'; g.fillRect(0, 0, w, h); for (var i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#7b5530' : '#946b40'; g.fillRect(0, i * 32, w, 30); } g.strokeStyle = '#4e3418'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14); g.beginPath(); g.moveTo(10, 10); g.lineTo(w - 10, h - 10); g.stroke(); ruido(g, w, h, 16); }, 1.2); },
    barreira: function () { return textura('barreira', 256, 128, function (g, w, h) { g.fillStyle = '#9a978f'; g.fillRect(0, 0, w, h); for (var i = -2; i < 10; i++) { g.fillStyle = i % 2 ? '#e2b400' : '#222'; g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 32, 0); g.lineTo(i * 32 + 8, 34); g.lineTo(i * 32 - 24, 34); g.fill(); } ruido(g, w, h, 14); }, 2.4); },
    escada: function () { return textura('escada', 128, 128, function (g, w, h) { g.fillStyle = '#9b958a'; g.fillRect(0, 0, w, h); g.fillStyle = '#d6a300'; g.fillRect(0, 0, w, 10); ruido(g, w, h, 14); }, 0.6); },
    asfalto: function () { return textura('asfalto', 256, 256, function (g, w, h) { g.fillStyle = '#3c3d3f'; g.fillRect(0, 0, w, h); ruido(g, w, h, 30); sujeira(g, w, h, 40, '20,20,20', 0.2); g.fillStyle = 'rgba(220,180,40,.75)'; g.fillRect(0, 124, w, 6); }, 8); },
    muro: function () { return textura('muro', 256, 128, function (g, w, h) { g.fillStyle = '#8c8a84'; g.fillRect(0, 0, w, h); for (var i = 0; i < 4; i++) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(i * 64, 0, 2, h); } sujeira(g, w, h, 40, '60,50,40', 0.15); ruido(g, w, h, 16); }, 4); },
    galpao: function () { return textura('galpao', 128, 128, function (g, w, h) { for (var i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#6d7479' : '#838a8f'; g.fillRect(i * 8, 0, 8, h); } sujeira(g, w, h, 40, '120,70,30', 0.15); }, 2); },
    // ---- Luxville ----
    marmore: function () { return textura('marmore', 256, 256, function (g, w, h) { // xadrez marrom/preto com medalhões dourados (chão do salão, como no vídeo)
      function medalhao(cx, cy, cl) { var ou = cl ? 'rgba(176,142,78,' : 'rgba(150,118,62,';
        g.strokeStyle = ou + '.85)'; g.lineWidth = 2; [52, 40, 22, 9].forEach(function (r) { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); });
        g.fillStyle = ou + '.75)'; for (var a = 0; a < 16; a++) { var an = a * Math.PI / 8; g.beginPath(); g.ellipse(cx + Math.cos(an) * 31, cy + Math.sin(an) * 31, 7, 2.6, an, 0, 7); g.fill(); }
        for (var a2 = 0; a2 < 8; a2++) { var b = a2 * Math.PI / 4 + 0.2; g.beginPath(); g.arc(cx + Math.cos(b) * 15, cy + Math.sin(b) * 15, 2.4, 0, 7); g.fill(); }
        for (var t = 0; t < 120; t++) { var an3 = Math.random() * 7, rr = 44 + Math.random() * 16; g.fillStyle = ou + (Math.random() * 0.5) + ')'; g.fillRect(cx + Math.cos(an3) * rr, cy + Math.sin(an3) * rr, 2, 2); } }
      for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) { var cl = (i + j) % 2; g.fillStyle = cl ? '#4a3c2c' : '#241e1a'; g.fillRect(i * 128, j * 128, 128, 128);
        for (var t = 0; t < 500; t++) { g.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '255,230,190' : '0,0,0') + ',' + Math.random() * 0.07 + ')'; g.fillRect(i * 128 + Math.random() * 128, j * 128 + Math.random() * 128, 2, 2); }
        if (cl) medalhao(i * 128 + 64, j * 128 + 64, 1); }
      g.strokeStyle = 'rgba(10,8,6,.55)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke(); g.strokeRect(0, 0, 256, 256);
      ruido(g, w, h, 8); }, 2.2); },
    xadrezclaro: function () { return textura('xadrezclaro', 256, 256, function (g, w, h) { // xadrez claro creme/cinza das galerias com claraboia
      for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) { var cl = (i + j) % 2, cx = i * 64 + 32, cy = j * 64 + 32; g.fillStyle = cl ? '#c9c7c4' : '#eeebe4'; g.fillRect(i * 64, j * 64, 64, 64);
        g.strokeStyle = cl ? 'rgba(120,118,126,.6)' : 'rgba(170,160,150,.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, cy - 22); g.lineTo(cx + 22, cy); g.lineTo(cx, cy + 22); g.lineTo(cx - 22, cy); g.closePath(); g.stroke(); g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.stroke(); }
      g.strokeStyle = 'rgba(90,90,96,.5)'; g.lineWidth = 1; for (var k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64, 256); g.moveTo(0, k * 64); g.lineTo(256, k * 64); g.stroke(); }
      sujeira(g, w, h, 30, '80,70,60', 0.05); ruido(g, w, h, 8); }, 2.6); },
    painel: function () { return textura('painel', 256, 512, function (g, w, h) { // parede lilás-acinzentada: painéis altos com moldura branca, arabescos dourados, rodapé (cobre 9 m)
      g.fillStyle = '#9b97a6'; g.fillRect(0, 0, w, h); sujeira(g, w, h, 20, '60,50,80', 0.05);
      function arabesco(cx, cy, s) { g.strokeStyle = '#d2ac58'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 7 * s, 0, 7); g.stroke();
        [-1, 1].forEach(function (d) { g.beginPath(); g.moveTo(cx + d * 7 * s, cy); g.bezierCurveTo(cx + d * 16 * s, cy - 10 * s, cx + d * 22 * s, cy + 6 * s, cx + d * 13 * s, cy + 8 * s); g.stroke(); }); }
      for (var i = 0; i < 2; i++) { var x = i * 128 + 10, wd = 108;
        g.fillStyle = '#e8e5ec'; g.fillRect(x - 4, 20, wd + 8, 330); g.fillStyle = '#6e6880'; g.fillRect(x + 4, 28, wd - 8, 314); // moldura branca + painel escuro
        g.strokeStyle = '#d2ac58'; g.lineWidth = 2.5; g.strokeRect(x + 14, 40, wd - 28, 290); g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1; g.strokeRect(x + 20, 46, wd - 40, 278);
        arabesco(x + wd / 2, 56, 1.2); arabesco(x + wd / 2, 314, 1.2); g.fillStyle = '#d2ac58'; [[x + 14, 40], [x + wd - 14, 40], [x + 14, 330], [x + wd - 14, 330]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 4, 0, 7); g.fill(); });
        g.fillStyle = '#e8e5ec'; g.fillRect(x - 4, 370, wd + 8, 100); g.fillStyle = '#a8a4b4'; g.fillRect(x + 6, 380, wd - 12, 80); g.strokeStyle = '#d2ac58'; g.lineWidth = 2; g.strokeRect(x + 14, 388, wd - 28, 64); }
      g.fillStyle = '#f4f2f6'; g.fillRect(0, 0, w, 8); g.fillRect(0, 356, w, 8); g.fillStyle = '#d2ac58'; g.fillRect(0, 362, w, 2);
      g.fillStyle = '#2a2630'; g.fillRect(0, h - 22, w, 22); g.fillStyle = '#d2ac58'; g.fillRect(0, h - 24, w, 2); g.fillStyle = '#f4f2f6'; g.fillRect(0, h - 38, w, 14);
      ruido(g, w, h, 7); }, 4.75); },
    lateralbranca: function () { return textura('lateralbranca', 128, 128, function (g, w, h) { g.fillStyle = '#ece9f0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c8c2d2'; g.lineWidth = 3; g.strokeRect(10, 10, w - 20, h - 20); g.fillStyle = '#d2ac58'; g.fillRect(0, 0, w, 3); ruido(g, w, h, 6); }, 1.2); },
    degraulux: function () { return textura('degraulux', 128, 128, function (g, w, h) { // escada de carpete lilás com friso branco (vídeo)
      g.fillStyle = '#8f88b0'; g.fillRect(0, 0, w, h); for (var i = 0; i < 1200; i++) { g.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '255,255,255' : '40,30,70') + ',' + Math.random() * 0.08 + ')'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      g.fillStyle = '#ece8f2'; g.fillRect(0, 0, 6, h); g.fillRect(w - 6, 0, 6, h); ruido(g, w, h, 6); }, 3); },
    painelroxo: function () { return textura('painelroxo', 128, 256, function (g, w, h) { // painel roxo escuro com medalhão dourado
      g.fillStyle = '#3a2a3e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9a24a'; g.lineWidth = 3; g.strokeRect(8, 8, w - 16, h - 16); g.lineWidth = 1; g.strokeRect(14, 14, w - 28, h - 28);
      g.beginPath(); g.arc(w / 2, h / 2, 26, 0, 7); g.stroke(); g.beginPath(); g.arc(w / 2, h / 2, 18, 0, 7); g.fillStyle = '#7a6230'; g.fill(); g.beginPath(); g.arc(w / 2, h / 2, 10, 0, 7); g.fillStyle = '#d8b660'; g.fill();
      ruido(g, w, h, 10); }, 4.6); },
    coluna: function () { return textura('coluna', 64, 128, function (g, w, h) { g.fillStyle = '#5e2f18'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.18)'; for (var i = 0; i < 4; i++) g.fillRect(i * 16 + 6, 0, 4, h); g.fillStyle = '#c9a24a'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6); ruido(g, w, h, 8); }, 3.6); },
    balaustre: function () { return textura('balaustre', 128, 64, function (g, w, h) { g.fillStyle = '#d9d4ca'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2eee6'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 8, w, 8);
      for (var i = 0; i < 8; i++) { g.fillStyle = '#ece6da'; g.beginPath(); g.ellipse(i * 16 + 8, 34, 4, 14, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(i * 16 + 10, 20, 2, 28); } ruido(g, w, h, 8); }, 1); },
    vitrine: function () { return textura('vitrine', 128, 128, function (g, w, h) { // vitrine de madeira clara com papéis antigos
      g.fillStyle = '#e7dcc6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b08a3e'; g.lineWidth = 3; g.strokeRect(4, 4, w - 8, h - 8);
      g.fillStyle = '#1e2a3a'; g.fillRect(14, 14, w - 28, h * 0.45); g.fillStyle = '#d9c9a0'; g.fillRect(24, 22, 30, 38); g.fillRect(64, 26, 36, 30); g.fillStyle = 'rgba(80,60,30,.6)'; for (var i = 0; i < 6; i++) { g.fillRect(28, 28 + i * 5, 22, 1); g.fillRect(68, 31 + i * 4, 28, 1); }
      g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(14, 14, w - 28, 8); ruido(g, w, h, 8); }, 1.1); },
    lona: function () { return textura('lona', 128, 128, function (g, w, h) { g.fillStyle = '#a9bbb7'; g.fillRect(0, 0, w, h); for (var i = 0; i < 40; i++) { g.strokeStyle = 'rgba(60,80,80,' + Math.random() * 0.25 + ')'; g.lineWidth = 2 + Math.random() * 4; g.beginPath(); g.moveTo(Math.random() * w, 0); g.quadraticCurveTo(Math.random() * w, h / 2, Math.random() * w, h); g.stroke(); } ruido(g, w, h, 14); }, 1.4); },
    degrauazul: function () { return textura('degrauazul', 128, 128, function (g, w, h) { g.fillStyle = '#6b3a20'; g.fillRect(0, 0, w, h); g.fillStyle = '#34488a'; g.fillRect(14, 0, w - 28, h); g.fillStyle = '#c9a24a'; g.fillRect(14, 0, 3, h); g.fillRect(w - 17, 0, 3, h); ruido(g, w, h, 10); }, 3); },
    piso_alto: function () { return TEX.madeirab(); },
    base_lux: function () { return TEX.painel(); },
    estantebranca: function () { return textura('estantebranca', 256, 256, function (g, w, h) { // estante branca com livros
      g.fillStyle = '#efeae0'; g.fillRect(0, 0, w, h); var cores = ['#5a2a2a', '#2a3a5a', '#3a4a2a', '#7a6a3a', '#4a2a4a', '#8a8070'];
      for (var r = 0; r < 4; r++) { var y0 = r * 64 + 10, x = 12; g.fillStyle = '#c9c2b4'; g.fillRect(10, y0, w - 20, 54);
        while (x < w - 14) { var bw = 6 + (Math.random() * 8) | 0, bh = 36 + (Math.random() * 14) | 0; if (Math.random() < 0.08) { x += 9; continue; } g.fillStyle = cores[(Math.random() * cores.length) | 0]; g.fillRect(x, y0 + 52 - bh, bw, bh); x += bw + 1; }
        g.fillStyle = '#fbf8f2'; g.fillRect(0, y0 + 52, w, 10); g.fillStyle = '#b08a3e'; g.fillRect(0, y0 + 52, w, 2); }
      g.fillStyle = '#fbf8f2'; g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h); g.fillRect(0, 0, w, 10); ruido(g, w, h, 8); }, 1.9); },
    // ---- Biblioteca ----
    degrau: function () { return textura('degrau', 128, 128, function (g, w, h) { g.fillStyle = '#7a4a2c'; g.fillRect(0, 0, w, h); for (var j = 0; j < 25; j++) { g.strokeStyle = 'rgba(40,20,8,' + Math.random() * 0.3 + ')'; g.beginPath(); var y = Math.random() * h; g.moveTo(0, y); g.lineTo(w, y + 3); g.stroke(); } g.fillStyle = '#8c1d1a'; g.fillRect(16, 0, w - 32, h); g.fillStyle = '#c9a24a'; g.fillRect(16, 0, 3, h); g.fillRect(w - 19, 0, 3, h); ruido(g, w, h, 10); }, 2.4); },
    ladrilho: function () { return textura('ladrilho', 256, 256, function (g, w, h) { // xadrez de mármore cinza-esverdeado com rosetas
      for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) { var cl = (i + j) % 2; g.fillStyle = cl ? '#8b8f84' : '#4d544c'; g.fillRect(i * 128, j * 128, 128, 128);
        g.strokeStyle = cl ? 'rgba(60,64,58,.55)' : 'rgba(150,156,146,.45)'; g.lineWidth = 2; g.beginPath(); g.arc(i * 128 + 64, j * 128 + 64, 26, 0, 7); g.stroke(); g.beginPath(); g.arc(i * 128 + 64, j * 128 + 64, 10, 0, 7); g.stroke();
        for (var a = 0; a < 8; a++) { var an = a * Math.PI / 4; g.beginPath(); g.moveTo(i * 128 + 64 + Math.cos(an) * 12, j * 128 + 64 + Math.sin(an) * 12); g.lineTo(i * 128 + 64 + Math.cos(an) * 24, j * 128 + 64 + Math.sin(an) * 24); g.stroke(); }
        for (var k = 0; k < 8; k++) { g.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.05 + ')'; g.fillRect(i * 128 + Math.random() * 128, j * 128 + Math.random() * 128, 2 + Math.random() * 8, 1); } }
      g.strokeStyle = 'rgba(30,30,26,.5)'; g.lineWidth = 2; g.strokeRect(1, 1, 254, 254); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke();
      sujeira(g, w, h, 30, '40,40,30', 0.07); ruido(g, w, h, 10); }, 3); },
    reboco: function () { return textura('reboco', 256, 256, function (g, w, h) { // parede bege com rodapé de madeira e pilastras (cobre 10 m)
      g.fillStyle = '#d9c6a3'; g.fillRect(0, 0, w, h); sujeira(g, w, h, 40, '150,120,80', 0.08);
      g.fillStyle = '#c7b089'; for (var i = 0; i < 4; i++) g.fillRect(i * 64 + 2, 0, 9, h);
      g.fillStyle = '#5a3420'; g.fillRect(0, h - 32, w, 32); g.fillStyle = '#6e4129'; for (var k = 0; k < 8; k++) g.fillRect(k * 32 + 3, h - 28, 26, 22);
      g.fillStyle = '#4a2a18'; g.fillRect(0, h - 34, w, 4); g.fillRect(0, h - 120, w, 5); g.fillStyle = '#7a5235'; g.fillRect(0, h - 118, w, 2);
      ruido(g, w, h, 10); }, 10); },
    madeirab: function () { return textura('madeirab', 256, 256, function (g, w, h) { // tábuas escuras
      for (var i = 0; i < 8; i++) { var v = (Math.random() * 18 - 9) | 0; g.fillStyle = 'rgb(' + (104 + v) + ',' + (62 + v) + ',' + (38 + v) + ')'; g.fillRect(0, i * 32, w, 31); g.fillStyle = 'rgba(40,20,8,.6)'; g.fillRect(0, i * 32 + 31, w, 1); g.fillRect((Math.random() * w) | 0, i * 32, 2, 31); }
      for (var j = 0; j < 60; j++) { g.strokeStyle = 'rgba(50,25,10,' + Math.random() * 0.3 + ')'; g.beginPath(); var y = Math.random() * h; g.moveTo(0, y); g.bezierCurveTo(80, y + 4, 160, y - 4, w, y + 2); g.stroke(); }
      ruido(g, w, h, 10); }, 2); },
    corrimao: function () { return textura('corrimao', 128, 64, function (g, w, h) { // balaústre: corrimão em cima, colunas finas
      g.fillStyle = '#4b2b18'; g.fillRect(0, 0, w, h); g.fillStyle = '#6f4228'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 8, w, 8);
      for (var i = 0; i < 8; i++) { g.fillStyle = '#7b4c2e'; g.fillRect(i * 16 + 5, 10, 6, h - 18); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(i * 16 + 10, 10, 2, h - 18); } ruido(g, w, h, 10); }, 1); },
    mesa: function () { return textura('mesa', 128, 128, function (g, w, h) { g.fillStyle = '#5e3520'; g.fillRect(0, 0, w, h); for (var j = 0; j < 30; j++) { g.strokeStyle = 'rgba(30,14,5,' + Math.random() * 0.35 + ')'; g.beginPath(); var y = Math.random() * h; g.moveTo(0, y); g.lineTo(w, y + Math.random() * 6 - 3); g.stroke(); } g.fillStyle = '#7a4a2c'; g.fillRect(0, 0, w, 6); ruido(g, w, h, 10); }, 1.5); },
    estante: function () { return textura('estante', 256, 256, function (g, w, h) { // estante cheia de livros (cobre 1,2 m)
      g.fillStyle = '#3e2314'; g.fillRect(0, 0, w, h); var cores = ['#7a1f1a', '#1f3f6b', '#2f5a2a', '#8a6a2a', '#5a2a5a', '#6b3a1a', '#b8a888', '#23383a', '#9a3a20'];
      for (var r = 0; r < 4; r++) { var y0 = r * 64 + 8, x = 8;
        while (x < w - 10) { var bw = 6 + (Math.random() * 9) | 0, bh = 40 + (Math.random() * 14) | 0; if (Math.random() < 0.06) { x += 10; continue; }
          g.fillStyle = cores[(Math.random() * cores.length) | 0]; g.fillRect(x, y0 + 56 - bh, bw, bh); g.fillStyle = 'rgba(255,220,150,.35)'; g.fillRect(x + 1, y0 + 60 - bh, bw - 2, 2); g.fillRect(x + 1, y0 + 48 - (bh >> 2), bw - 2, 2); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + bw - 1, y0 + 56 - bh, 1, bh); x += bw + 1; }
        g.fillStyle = '#6b3d22'; g.fillRect(0, y0 + 56, w, 8); g.fillStyle = '#86512e'; g.fillRect(0, y0 + 56, w, 2); }
      g.fillStyle = '#5a321c'; g.fillRect(0, 0, 8, h); g.fillRect(w - 8, 0, 8, h); g.fillRect(0, 0, w, 8); ruido(g, w, h, 12); }, 1.2); },
    guindaste: function () { return textura('guindaste', 64, 64, function (g, w, h) { g.fillStyle = '#d9a514'; g.fillRect(0, 0, w, h); sujeira(g, w, h, 20, '90,50,10', 0.25); ruido(g, w, h, 18); }, 2); }
  };
  function texConteiner(cor) {
    return textura('cont_' + cor, 256, 128, function (g, w, h) { g.fillStyle = cor; g.fillRect(0, 0, w, h); for (var i = 0; i < 32; i++) { g.fillStyle = i % 2 ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.07)'; g.fillRect(i * 8, 0, 8, h); } g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6); sujeira(g, w, h, 30, '110,60,20', 0.25); ruido(g, w, h, 14); }, 3);
  }
  var CORES_CONT = { cont_vermelho: '#8e2a22', cont_azul: '#25507a', cont_verde: '#2f6b3c', cont_laranja: '#c0631d' };
  var MAT = {};
  function mat(tipo) {
    if (MAT[tipo]) return MAT[tipo];
    var t, extra = {};
    if (CORES_CONT[tipo]) t = texConteiner(CORES_CONT[tipo]);
    else if (tipo === 'piso' || tipo === 'plataforma' || tipo === 'laje') t = TEX[tipo === 'piso' ? 'piso' : 'concreto']();
    else if (tipo === 'banco') t = TEX.concreto();
    else if (tipo === 'trem' || tipo === 'teto') { t = TEX.concreto(); extra.color = 0x666666; }
    else t = (TEX[tipo] || TEX.concreto)();
    if (tipo === 'guindaste') extra.metalness = 0.4;
    if (tipo === 'grade') { t = null; extra.color = 0x444444; extra.metalness = 0.6; }
    return (MAT[tipo] = new THREE.MeshStandardMaterial(Object.assign({ map: t, roughness: 0.85 }, extra)));
  }
  // caixa com UV em metros
  function bloco(b) {
    var g = new THREE.BoxGeometry(b[3], b[4], b[5]), uv = g.attributes.uv, m = mat(b[6]), rep = m.map ? m.map.userData.rep : 1;
    var esc = [[b[5], b[4]], [b[5], b[4]], [b[3], b[5]], [b[3], b[5]], [b[3], b[4]], [b[3], b[4]]];
    for (var f = 0; f < 6; f++) for (var v = 0; v < 4; v++) { var i = f * 4 + v; uv.setXY(i, uv.getX(i) * esc[f][0] / rep, uv.getY(i) * esc[f][1] / rep); }
    if (b[6] === 'degraulux') { // degrau: piso e espelho de carpete lilás, laterais em lambri branco
      var lat = mat('lateralbranca'), xLado = b[3] > b[5]; m = xLado ? [lat, lat, m, m, m, m] : [m, m, m, m, lat, lat]; }
    var me = new THREE.Mesh(g, m); me.position.set(b[0], b[1] + b[4] / 2, b[2]); me.castShadow = b[6] !== 'teto'; me.receiveShadow = true; return me;
  }

  /* ---------- trem ---------- */
  function trem(b) {
    var grupo = new THREE.Group(), comp = b[3], vagoes = Math.round(comp / 13), lv = comp / vagoes;
    var tex = textura('trem', 512, 256, function (g, w, h) {
      var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9aa3ab'); gr.addColorStop(1, '#6d757c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2d5d8f'; g.fillRect(0, 150, w, 26); // faixa azul
      for (var i = 0; i < 6; i++) { g.fillStyle = '#1b2228'; g.fillRect(20 + i * 82, 50, 62, 70); g.fillStyle = 'rgba(160,200,230,.25)'; g.fillRect(24 + i * 82, 54, 30, 30); }
      g.fillStyle = '#4a5157'; g.fillRect(230, 40, 50, 160); g.fillStyle = '#1b2228'; g.fillRect(238, 52, 34, 60); // porta
      sujeira(g, w, h, 60, '60,50,40', 0.15); ruido(g, w, h, 10);
    }, 1);
    var mt = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.35 });
    var teto = new THREE.MeshStandardMaterial({ color: 0x7c848b, roughness: 0.6, metalness: 0.3 }), baixo = new THREE.MeshStandardMaterial({ color: 0x222426, roughness: 0.9 });
    for (var i = 0; i < vagoes; i++) {
      var x = b[0] - comp / 2 + lv * (i + 0.5);
      var corpo = new THREE.Mesh(new THREE.BoxGeometry(lv - 0.5, 2.8, b[5]), mt); corpo.position.set(x, b[1] + 0.6 + 1.4, b[2]); corpo.castShadow = corpo.receiveShadow = true; grupo.add(corpo);
      var t = new THREE.Mesh(new THREE.CylinderGeometry(b[5] / 2, b[5] / 2, lv - 0.5, 20, 1, false, 0, Math.PI), teto); t.rotation.z = Math.PI / 2; t.rotation.y = Math.PI / 2; t.scale.set(1, 1, 0.25); t.position.set(x, b[1] + 3.4, b[2]); grupo.add(t);
      var sob = new THREE.Mesh(new THREE.BoxGeometry(lv - 1.5, 0.6, b[5] - 0.6), baixo); sob.position.set(x, b[1] + 0.3, b[2]); grupo.add(sob);
    }
    return grupo;
  }

  /* ---------- montar ---------- */

  /* ---------- Biblioteca: carpete cinza no alto, janelas em arco, arandelas, quadros, papéis ---------- */
  function decorarBiblioteca(g, mapa, yTeto) {
    var L = mapa.lim, N = mapa.chao || 0, HX = 13, HZ = 13;
    function tex(w, h, desenho) { var t = new THREE.CanvasTexture(canvas(w, h, desenho)); t.encoding = THREE.sRGBEncoding; return t; }
    var carp = tex(128, 128, function (gg, w, h) { gg.fillStyle = '#5d6168'; gg.fillRect(0, 0, w, h); for (var i = 0; i < 1400; i++) { gg.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '255,255,255' : '0,0,0') + ',' + Math.random() * 0.07 + ')'; gg.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
    carp.wrapS = carp.wrapT = THREE.RepeatWrapping;
    function chao(x0, x1, z0, z1, mapaTex, rep, y, rx, rz) { var t = mapaTex.clone(); t.needsUpdate = true; t.repeat.set(rx || (x1 - x0) / rep, rz || (z1 - z0) / rep); var me = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 })); me.rotation.x = -Math.PI / 2; me.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); me.receiveShadow = true; g.add(me); return me; }
    // carpete cinza em todo o andar de cima e em cima da ponte
    chao(-16, 16, -L[1], -HZ, carp, 3, N + 0.01); chao(-16, 16, HZ, L[1], carp, 3, N + 0.01);
    [-1, 1].forEach(function (s) { chao(s > 0 ? HX : -16, s > 0 ? 16 : -HX, -HZ, HZ, carp, 3, N + 0.01); chao(s > 0 ? 16 : -19, s > 0 ? 19 : -16, -3, 3, carp, 3, N + 0.01); chao(s > 0 ? 19 : -L[0], s > 0 ? L[0] : -19, -7, 7, carp, 3, N + 0.01); });
    chao(-HX, HX, -1.5, 1.5, carp, 3, N + 0.01);
    // passadeira azul com borda dourada nos corredores e na ponte
    var pas = tex(32, 128, function (gg, w, h) { gg.fillStyle = '#34416a'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#c9a24a'; gg.fillRect(2, 0, 2, h); gg.fillRect(w - 4, 0, 2, h); gg.fillStyle = 'rgba(0,0,0,.15)'; for (var i = 0; i < 80; i++) gg.fillRect(Math.random() * w, Math.random() * h, 1, 1); });
    pas.wrapS = pas.wrapT = THREE.RepeatWrapping;
    [-1, 1].forEach(function (s) { var p = chao(s * 14.5 - 0.6, s * 14.5 + 0.6, -HZ - 1.5, HZ + 1.5, pas, 1, N + 0.02, 1, 10); });
    var pt = pas.clone(); pt.needsUpdate = true; pt.repeat.set(1, 10); var pp = new THREE.Mesh(new THREE.PlaneGeometry(1.2, HX * 2), new THREE.MeshStandardMaterial({ map: pt, roughness: 1 })); pp.rotation.x = -Math.PI / 2; pp.rotation.z = Math.PI / 2; pp.position.set(0, N + 0.02, 0); g.add(pp);
    // janelas em arco nas paredes de cima (norte e sul)
    var janTex = tex(128, 256, function (gg, w, h) { gg.clearRect(0, 0, w, h); gg.fillStyle = '#4a2a18'; gg.beginPath(); gg.moveTo(0, h); gg.lineTo(0, 64); gg.arc(64, 64, 64, Math.PI, 0); gg.lineTo(w, h); gg.fill();
      var gr = gg.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fff3d6'); gr.addColorStop(1, '#e2c58f'); gg.fillStyle = gr; gg.beginPath(); gg.moveTo(10, h - 10); gg.lineTo(10, 64); gg.arc(64, 64, 54, Math.PI, 0); gg.lineTo(w - 10, h - 10); gg.fill();
      gg.fillStyle = '#4a2a18'; gg.fillRect(61, 10, 6, h - 20); for (var i = 1; i < 7; i++) gg.fillRect(10, 64 + i * 26, w - 20, 4); });
    var janMat = new THREE.MeshBasicMaterial({ map: janTex, transparent: true, fog: false });
    [-1, 1].forEach(function (s) { for (var i = 0; i < 4; i++) { var j = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 3.8), janMat); j.position.set(-6.6 + i * 4.4, N + 3.2, s * (L[1] - 0.02)); j.rotation.y = s > 0 ? Math.PI : 0; g.add(j); } });
    // arandelas: no salão (paredes de baixo) e no andar de cima
    var brilho = new THREE.SpriteMaterial({ map: tex(64, 64, function (gg) { var gr = gg.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.4, 'rgba(255,200,120,.5)'); gr.addColorStop(1, 'rgba(255,170,80,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64); }), blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    var lamp = new THREE.MeshBasicMaterial({ color: 0xffe2a8 });
    function arandela(x, y, z, nx, nz) { var b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.22, 8), lamp); b.position.set(x, y, z); g.add(b); var sp = new THREE.Sprite(brilho); sp.scale.setScalar(1); sp.position.set(x + nx * 0.12, y, z + nz * 0.12); g.add(sp); }
    [-9, -3, 3, 9].forEach(function (x) { arandela(x, 2.5, -HZ + 0.06, 0, 1); arandela(x, 2.5, HZ - 0.06, 0, -1); });
    [-10, -5, 5, 10].forEach(function (z) { arandela(-HX + 0.06, 2.5, z, 1, 0); arandela(HX - 0.06, 2.5, z, -1, 0); });
    [-13, 13].forEach(function (x) { arandela(x, N + 2.3, -L[1] + 0.06, 0, 1); arandela(x, N + 2.3, L[1] - 0.06, 0, -1); });
    // quadros com moldura nas paredes do salão
    var cores = ['#5a3a2a', '#2a3a5a', '#3a5a3a', '#6a5a3a'];
    [[-6, -1], [6, -1], [-6, 1], [6, 1]].forEach(function (q, i) {
      var t = tex(96, 128, function (gg, w, h) { gg.fillStyle = '#8a6a2e'; gg.fillRect(0, 0, w, h); gg.fillStyle = cores[i % 4]; gg.fillRect(8, 8, w - 16, h - 16); gg.fillStyle = 'rgba(255,230,180,.35)'; gg.beginPath(); gg.arc(w / 2, h * 0.42, 18, 0, 7); gg.fill(); gg.fillStyle = 'rgba(0,0,0,.25)'; gg.fillRect(16, h - 40, w - 32, 18); });
      var p = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 })); p.position.set(q[0] + (q[0] > 0 ? 1.5 : -1.5), 2.3, q[1] * (HZ - 0.02)); p.rotation.y = q[1] > 0 ? Math.PI : 0; g.add(p);
    });
    // papéis espalhados (no salão e no alto)
    var papel = new THREE.MeshStandardMaterial({ map: tex(64, 64, function (gg, w, h) { gg.fillStyle = '#ece4d0'; gg.fillRect(0, 0, w, h); gg.fillStyle = 'rgba(60,50,40,.55)'; for (var i = 0; i < 9; i++) gg.fillRect(8, 8 + i * 5, 30 + Math.random() * 18, 1.5); }), roughness: 1, side: THREE.DoubleSide });
    [[-2, 2.2, 0], [3, -3, 0], [-9.5, 6, 0], [9.5, -1, 0], [14.5, -6, N], [-14.5, 9, N], [0, -14.5, N], [5, 0, N]].forEach(function (c, k) {
      for (var i = 0; i < 9; i++) { var p = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.42), papel); p.rotation.x = -Math.PI / 2; p.rotation.z = Math.random() * 6; p.position.set(c[0] + (Math.random() - 0.5) * 1.6, c[2] + 0.025 + i * 0.0005, c[1] + (Math.random() - 0.5) * 1.6); g.add(p); }
    });
    g.add(new THREE.HemisphereLight(0xffd9a0, 0x3a2416, 0.25));
  }
  /* ---------- Luxville: carpete azul-marinho no andar de cima, mármore nas galerias, arandelas, quadros, papéis ---------- */
  function decorarLuxville(g, mapa, yTeto) {
    var L = mapa.lim, N = mapa.chao || 0, HX = 11, HZ = 8;
    function tex(w, h, desenho) { var t = new THREE.CanvasTexture(canvas(w, h, desenho)); t.encoding = THREE.sRGBEncoding; return t; }
    var carp = tex(128, 128, function (gg, w, h) { gg.fillStyle = '#353a4e'; gg.fillRect(0, 0, w, h); for (var i = 0; i < 900; i++) { gg.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '255,255,255' : '0,0,0') + ',' + Math.random() * 0.08 + ')'; gg.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
    carp.wrapS = carp.wrapT = THREE.RepeatWrapping;
    function chao(x0, x1, z0, z1, mapaTex, rep, y) { var t = mapaTex.clone(); t.needsUpdate = true; t.repeat.set((x1 - x0) / rep, (z1 - z0) / rep); var m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 })); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; g.add(m); }
    // carpete em todo o andar de cima (menos o buraco do salão)
    chao(-L[0], L[0], -L[1], -HZ, carp, 3, N + 0.01); chao(-L[0], L[0], HZ, L[1], carp, 3, N + 0.01); chao(-L[0], -HX, -HZ, HZ, carp, 3, N + 0.01); chao(HX, L[0], -HZ, HZ, carp, 3, N + 0.01);
    // mármore nas galerias norte e sul (com faixa de luz das claraboias)
    var marm = mat('xadrezclaro').map; chao(-22, 22, -L[1], -12.3, marm, 2.6, N + 0.02); chao(-22, 22, 12.3, L[1], marm, 2.6, N + 0.02);
    // tapete vermelho com bordas douradas nas alas das bases
    var tv = tex(64, 256, function (gg, w, h) { gg.fillStyle = '#6f6890'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#d2ac58'; gg.fillRect(4, 0, 3, h); gg.fillRect(w - 7, 0, 3, h); gg.fillStyle = 'rgba(0,0,0,.12)'; for (var i = 0; i < 200; i++) gg.fillRect(Math.random() * w, Math.random() * h, 2, 2); });
    tv.wrapT = THREE.RepeatWrapping;
    [-1, 1].forEach(function (s) { var t = tv.clone(); t.needsUpdate = true; t.repeat.set(1, 5); var m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 26), new THREE.MeshStandardMaterial({ map: t, roughness: 1 })); m.rotation.x = -Math.PI / 2; m.position.set(s * 25, N + 0.03, 0); g.add(m); });
    // arandelas com brilho nas paredes
    var brilho = new THREE.SpriteMaterial({ map: tex(64, 64, function (gg) { var gr = gg.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,240,210,1)'); gr.addColorStop(0.4, 'rgba(255,210,140,.5)'); gr.addColorStop(1, 'rgba(255,180,90,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64); }), blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    var lampMat = new THREE.MeshBasicMaterial({ color: 0xfff0c8 });
    function arandela(x, y, z, nx, nz) { var b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.24, 8), lampMat); b.position.set(x, y, z); g.add(b); var sp = new THREE.Sprite(brilho); sp.scale.setScalar(1.1); sp.position.set(x + nx * 0.12, y, z + nz * 0.12); g.add(sp); }
    [-24, -15, -7, 7, 15, 24].forEach(function (x) { arandela(x, N + 2.6, -L[1] + 0.55, 0, 1); arandela(x, N + 2.6, L[1] - 0.55, 0, -1); });
    [-6, 0, 6].forEach(function (z) { arandela(-HX + 0.05, 2.4, z, 1, 0); arandela(HX - 0.05, 2.4, z, -1, 0); });
    // quadros com moldura dourada no salão rebaixado
    var cores = ['#5a3a2a', '#2a3a5a', '#3a5a3a', '#6a5a3a'];
    [[-3, -1], [3, 1], [-8, 1], [8, -1]].forEach(function (q, i) {
      var t = tex(96, 128, function (gg, w, h) { gg.fillStyle = '#b08a3e'; gg.fillRect(0, 0, w, h); gg.fillStyle = cores[i % 4]; gg.fillRect(8, 8, w - 16, h - 16); gg.fillStyle = 'rgba(255,230,180,.35)'; gg.beginPath(); gg.arc(w / 2, h * 0.42, 18, 0, 7); gg.fill(); });
      var p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.6), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 })); p.position.set(q[0], 2.2, q[1] * (HZ - 0.02)); p.rotation.y = q[1] > 0 ? Math.PI : 0; g.add(p);
    });
    // papéis espalhados no chão do salão
    var papel = new THREE.MeshStandardMaterial({ map: tex(64, 64, function (gg, w, h) { gg.fillStyle = '#ece4d0'; gg.fillRect(0, 0, w, h); gg.fillStyle = 'rgba(60,50,40,.55)'; for (var i = 0; i < 9; i++) gg.fillRect(8, 8 + i * 5, 30 + Math.random() * 18, 1.5); }), roughness: 1, side: THREE.DoubleSide });
    for (var i = 0; i < 36; i++) { var pp = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.42), papel); pp.rotation.x = -Math.PI / 2; pp.rotation.z = Math.random() * 6; var c = [[-1, 3], [4, -2], [-6, -1], [8.5, 5]][i % 4]; pp.position.set(c[0] + (Math.random() - 0.5) * 2.4, 0.015 + i * 0.0004, c[1] + (Math.random() - 0.5) * 2.4); g.add(pp); }
    g.add(new THREE.HemisphereLight(0xfff0d8, 0x40362a, 0.22));
  }
  W.montar = function (cena, mapa, qualidade) {
    var g = new THREE.Group(); cena.add(g);
    mapa.caixas.forEach(function (b) {
      if (b[6] === 'trem') { g.add(trem(b)); return; }
      if (b[6] === 'teto') return; // teto é feito com claraboias
      g.add(bloco(b));
    });
    var L = mapa.lim;
    // luzes
    cena.background = new THREE.Color(mapa.fundo || (mapa.ceu ? 0xb9c6cf : 0x5d6266));
    cena.fog = new THREE.Fog(mapa.nevoa, mapa.ceu ? 40 : 30, mapa.ceu ? 110 : 80);
    var hemi = new THREE.HemisphereLight(mapa.ceu ? 0xdde8f0 : 0xe8e6df, 0x5c574e, mapa.ceu ? 0.75 : 0.62); cena.add(hemi);
    var sol = new THREE.DirectionalLight(mapa.luz, mapa.ceu ? 1.2 : 1.05); sol.position.set(14, 30, 10); sol.castShadow = qualidade > 0;
    var tam = qualidade > 1 ? 2048 : 1024; sol.shadow.mapSize.set(tam, tam); sol.shadow.bias = -0.0006; sol.shadow.normalBias = 0.02;
    var c = sol.shadow.camera; c.left = -L[0] - 4; c.right = L[0] + 4; c.top = L[1] + 4; c.bottom = -L[1] - 4; c.near = 1; c.far = 80; c.updateProjectionMatrix();
    cena.add(sol);
    if (!mapa.ceu) {
      // teto com claraboias: vigas fazem as faixas de luz e sombra no chão
      var H = mapa.caixas.filter(function (b) { return b[6] === 'teto'; })[0], y = H ? H[1] : 9;
      var bib = !!mapa.claraboia;
      var vidro = bib ? new THREE.MeshBasicMaterial({ map: (function () { var t = new THREE.CanvasTexture(canvas(512, 256, function (gg, w, h) { // céu com nuvens visto pelo vidro
          var gr = gg.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#7fb2e0'); gr.addColorStop(1, '#cfe3f2'); gg.fillStyle = gr; gg.fillRect(0, 0, w, h);
          for (var i = 0; i < 40; i++) { gg.fillStyle = 'rgba(255,255,255,' + (0.15 + Math.random() * 0.35) + ')'; gg.beginPath(); gg.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 60, 8 + Math.random() * 18, 0, 0, 7); gg.fill(); } })); t.encoding = THREE.sRGBEncoding; return t; })(), fog: false })
        : new THREE.MeshBasicMaterial({ color: 0xf4f6f2 });
      var viga = mapa.vigas === 'branca' ? new THREE.MeshStandardMaterial({ color: 0xf0ebe0, roughness: 0.6 }) : bib ? mat('madeirab') : new THREE.MeshStandardMaterial({ color: 0x6c6a64, roughness: 0.8 });
      var painel = new THREE.Mesh(new THREE.PlaneGeometry(L[0] * 2, L[1] * 2), vidro); painel.rotation.x = Math.PI / 2; painel.position.y = y + 0.3; g.add(painel);
      for (var x = -L[0]; x <= L[0]; x += 3.2) { var v = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, L[1] * 2), viga); v.position.set(x, y - 0.2, 0); v.castShadow = true; g.add(v); }
      for (var z = -L[1]; z <= L[1]; z += 4.2) { var v2 = new THREE.Mesh(new THREE.BoxGeometry(L[0] * 2, 0.5, 0.5), viga); v2.position.set(0, y - 0.2, z); v2.castShadow = true; g.add(v2); }
      if (bib) { // forro em caixotões com a claraboia só no miolo de cada caixotão (como nas fotos)
        var branco = mapa.vigas === 'branca', ct = new THREE.CanvasTexture(canvas(128, 168, function (gg, w, h) {
          gg.fillStyle = branco ? '#eeeae2' : '#5a2e1a'; gg.fillRect(0, 0, w, h);
          gg.strokeStyle = branco ? '#c9c2b4' : '#3a1c10'; gg.lineWidth = 4; gg.strokeRect(14, 14, w - 28, h - 28);
          if (branco) { gg.fillStyle = '#d2ac58'; gg.fillRect(20, 20, w - 40, 2); gg.fillRect(20, h - 22, w - 40, 2); }
          else for (var i = 0; i < 40; i++) { gg.strokeStyle = 'rgba(20,8,2,' + Math.random() * 0.3 + ')'; gg.beginPath(); var yy = Math.random() * h; gg.moveTo(0, yy); gg.lineTo(w, yy + 4); gg.stroke(); }
          var bx = branco ? 0.2 : 0.27, by = branco ? 0.2 : 0.27; gg.clearRect(w * bx, h * by, w * (1 - 2 * bx), h * (1 - 2 * by)); }));
        ct.encoding = THREE.sRGBEncoding; ct.wrapS = ct.wrapT = THREE.RepeatWrapping; ct.repeat.set(L[0] * 2 / 3.2, L[1] * 2 / 4.2); ct.offset.set(-0.5 * 0 + ((-L[0]) / 3.2) % 1 * -1, ((-L[1]) / 4.2) % 1 * -1);
        var forro = new THREE.Mesh(new THREE.PlaneGeometry(L[0] * 2, L[1] * 2), new THREE.MeshStandardMaterial({ map: ct, alphaTest: 0.5, transparent: false, side: THREE.DoubleSide, roughness: 0.8 }));
        forro.rotation.x = Math.PI / 2; forro.position.y = y + 0.04; forro.receiveShadow = true;
        forro.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: ct, alphaTest: 0.5 }); forro.castShadow = true; g.add(forro); }
      if (mapa.id === 'biblioteca') decorarBiblioteca(g, mapa, y); else if (mapa.id === 'luxville') decorarLuxville(g, mapa, y);
      // quadros nas paredes
      if (mapa.id === 'estacao') { var cores = ['#2e4b5f', '#5f3b2e', '#3e5f2e', '#4a3a5f'];
      [[-10, -16.95, 0], [10, -16.95, 0], [-20, 16.95, Math.PI], [-25.95, 0, Math.PI / 2], [25.95, 0, -Math.PI / 2]].forEach(function (q, i) {
        var t = new THREE.CanvasTexture(canvas(128, 96, function (gg, w, h) { gg.fillStyle = '#d9d2c0'; gg.fillRect(0, 0, w, h); gg.fillStyle = cores[i % 4]; gg.fillRect(8, 8, w - 16, h - 16); gg.fillStyle = 'rgba(255,255,255,.25)'; gg.beginPath(); gg.arc(w * 0.6, h * 0.45, 22, 0, 7); gg.fill(); gg.fillStyle = 'rgba(0,0,0,.3)'; gg.fillRect(20, h - 34, 60, 8); })); t.encoding = THREE.sRGBEncoding;
        var p = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 })); p.position.set(q[0], 2.4, q[1]); p.rotation.y = q[2]; g.add(p);
      }); }
      // faixa amarela na beira da plataforma do trem
      var trem0 = mapa.caixas.filter(function (b) { return b[6] === 'trem'; })[0];
      if (trem0) { var faixa = new THREE.Mesh(new THREE.PlaneGeometry(L[0] * 2, 0.5), new THREE.MeshStandardMaterial({ color: 0xd8b000, roughness: 0.7 })); faixa.rotation.x = -Math.PI / 2; faixa.position.set(0, 0.01, trem0[2] - trem0[5] / 2 - 0.4); faixa.receiveShadow = true; g.add(faixa); }
      sol.position.set(6, 30, 4);
    } else {
      // céu com degradê
      var ceu = new THREE.Mesh(new THREE.SphereGeometry(140, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
        vertexShader: 'varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
        fragmentShader: 'varying vec3 p; void main(){ float h = normalize(p).y; vec3 c = mix(vec3(.85,.78,.66), vec3(.42,.58,.75), clamp(h*1.6,0.,1.)); gl_FragColor = vec4(c,1.); }' }));
      g.add(ceu);
      // mar atrás do muro
      var mar = new THREE.Mesh(new THREE.PlaneGeometry(300, 120), new THREE.MeshStandardMaterial({ color: 0x2d5568, roughness: 0.2, metalness: 0.3 })); mar.rotation.x = -Math.PI / 2; mar.position.set(0, -0.6, L[1] + 62); g.add(mar);
    }
    return { grupo: g, sol: sol };
  };
})();
