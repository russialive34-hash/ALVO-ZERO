/* QUEDA LIVRE — regras compartilhadas: ilha, cidades, casas, colisão, armas, itens, zona e tiros. */
(function (raiz) {
  'use strict';
  var R = {
    MEIO: 230,           // a ilha vai de -MEIO a +MEIO
    AGUA: 0,
    ANDA: 5.6, AGACHA: 2.4, PULO: 6.2, GRAV: 20,
    QUEDA: 13, MERGULHO: 40, PLANA: 22, ACELERA: 34, PARA_V: 5.5, PARA_H: 9.5, ABRE_PARA: 60,
    TREM_ALT: 210, TREM_VEL: 30,
    VIDA: 200, MAX_JOG: 24,
    ESPERA: 30, GELO_VIDA: 220, GELO_TEMPO: 25
  };

  /* ---------- números aleatórios e ruído ---------- */
  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 1000000) / 1000000; }; }
  function hash(i, j, s) { var h = (i * 374761393 + j * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function suave(t) { return t * t * (3 - 2 * t); }
  function ruido(x, z, s) { var i = Math.floor(x), j = Math.floor(z), fx = suave(x - i), fz = suave(z - j); var a = hash(i, j, s), b = hash(i + 1, j, s), c = hash(i, j + 1, s), d = hash(i + 1, j + 1, s); return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz; }
  function fbm(x, z, s) { return ruido(x, z, s) * 0.55 + ruido(x * 2.1, z * 2.1, s + 1) * 0.28 + ruido(x * 4.3, z * 4.3, s + 2) * 0.17; }

  /* ---------- a ilha ---------- */
  var NOMES = ['Vila Coqueiro', 'Porto Sal', 'Usina Velha', 'Mirante', 'Fazenda Sol', 'Base Aérea', 'Praia Funda', 'Vale Verde'];
  function gerar(seed) {
    var r = rng(seed), I = { seed: seed, cidades: [], casas: [], paredes: [], arvores: [], pedras: [], loot: [], estradas: [], caixas: [] };
    // um lago no meio da ilha e duas ilhotas na beira
    var la = r() * Math.PI * 2, ld = 40 + r() * 60; I.lago = { x: Math.cos(la) * ld, z: Math.sin(la) * ld, r: 16 + r() * 8 };
    I.ilhotas = [0, 1].map(function (k) { var a = la + Math.PI * (0.6 + k * 0.8) + r() * 0.4, d = R.MEIO * (0.86 + r() * 0.08); return { x: Math.cos(a) * d, z: Math.sin(a) * d, r: 18 + r() * 10 }; });
    // cidades espalhadas, longe umas das outras
    for (var t = 0; t < 400 && I.cidades.length < 7; t++) {
      var a = r() * Math.PI * 2, d = 25 + r() * 140, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (I.cidades.some(function (c) { return Math.hypot(c.x - x, c.z - z) < 85; }) || Math.hypot(I.lago.x - x, I.lago.z - z) < I.lago.r + 42) continue;
      I.cidades.push({ id: I.cidades.length, nome: NOMES[I.cidades.length], x: x, z: z, r: 26 + r() * 10, alt: 0 });
    }
    I.cidades.forEach(function (c) { c.alt = Math.max(2.5, alturaBruta(I, c.x, c.z)); });
    // estradas ligando cada cidade à mais perto
    I.cidades.forEach(function (c, i) { var o = I.cidades.filter(function (x, k) { return k !== i; }).sort(function (a, b) { return Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z); }); [o[0], o[1]].forEach(function (p) { if (p && !I.estradas.some(function (e) { return e[0] === p.id && e[1] === c.id; })) I.estradas.push([c.id, p.id]); }); });
    // a Usina Velha vira a fábrica
    var usina = I.cidades.find(function (c) { return c.nome === 'Usina Velha'; });
    I.estruturas = [];
    if (usina) { usina.fabrica = true; usina.r = 44; usina.alt = Math.max(2.5, alturaBruta(I, usina.x, usina.z)); fabrica(I, usina); }
    var faz = I.cidades.find(function (c) { return c.nome === 'Fazenda Sol'; });
    if (faz) { var mx = faz.x + faz.r * 0.55, mz = faz.z - faz.r * 0.3; I.estruturas.push({ tipo: 'moinho', x: mx, z: mz, y: faz.alt }); I.paredes.push({ x: mx, z: mz, w: 6.4, d: 6.4, y0: faz.alt, y1: faz.alt + 14, tipo: 'moinho' }); faz.moinho = [mx, mz]; }
    // casas em cada cidade (paredes com porta e janela)
    I.cidades.forEach(function (c) {
      if (c.fabrica) return;
      var base = c.nome === 'Base Aérea' || c.nome === 'Usina Velha';
      var n = base ? 5 : 6 + (r() * 4 | 0), feitas = [];
      for (var k = 0; k < 80 && feitas.length < n; k++) {
        var w = base ? 14 + r() * 6 : 7 + r() * 4, dd = base ? 10 + r() * 4 : 6 + r() * 3, a2 = r() * Math.PI * 2, rr = 5 + r() * (c.r - 8);
        var hx = c.x + Math.cos(a2) * rr, hz = c.z + Math.sin(a2) * rr;
        if (feitas.some(function (f) { return Math.abs(f.x - hx) < (f.w + w) / 2 + 3.5 && Math.abs(f.z - hz) < (f.d + dd) / 2 + 3.5; })) continue;
        var casa = { id: I.casas.length, x: hx, z: hz, w: w, d: dd, h: base ? 5 : 3.2, cid: c.id, tipo: base ? 'galpao' : 'casa', cor: (r() * 6) | 0, y: c.alt };
        feitas.push(casa); I.casas.push(casa); paredesDaCasa(I, casa, r);
        if (!base && r() < 0.75) cercaDoQuintal(I, casa, r);
        moveis(I, casa);
      }
      // caixas de madeira e contêineres (cobertura)
      for (var q = 0; q < (base ? 10 : 5); q++) {
        var cx = c.x + (r() - 0.5) * c.r * 1.6, cz = c.z + (r() - 0.5) * c.r * 1.6, cont = base && r() < 0.6;
        var cw = cont ? 6 : 1.4, cd = cont ? 2.5 : 1.4, ch = cont ? 2.6 : 1.4;
        if (!livre(I, cx, cz, Math.max(cw, cd) / 2 + 1, 0) || pertoPorta(I, cx, cz, 4)) continue;
        var cx2 = { x: cx, z: cz, w: r() < 0.5 ? cw : cd, d: 0, h: ch, y0: c.alt, tipo: cont ? 'container' : 'caixa', cor: (r() * 4) | 0 }; cx2.d = cx2.w === cw ? cd : cw;
        I.caixas.push(cx2); I.paredes.push({ x: cx, z: cz, w: cx2.w, d: cx2.d, y0: c.alt, y1: c.alt + ch, tipo: cx2.tipo });
      }
    });
    indexar(I);
    // coqueiros, árvores e pedras
    for (var p = 0; p < 2600 && I.arvores.length < 420; p++) {
      var ax = (r() * 2 - 1) * R.MEIO, az = (r() * 2 - 1) * R.MEIO, h = altura(I, ax, az);
      if (h < 0.8) continue; if (I.cidades.some(function (c) { return Math.hypot(c.x - ax, c.z - az) < c.r - 4; }) && r() < 0.85) continue;
      if (!livre(I, ax, az, 2, h)) continue;
      I.arvores.push({ x: ax, z: az, y: h, tipo: h < 5 ? 'coqueiro' : (r() < 0.5 ? 'coqueiro' : 'arvore'), esc: 0.8 + r() * 0.5, rot: r() * 6.28 });
    }
    for (var s2 = 0; s2 < 900 && I.pedras.length < 110; s2++) {
      var px = (r() * 2 - 1) * R.MEIO, pz = (r() * 2 - 1) * R.MEIO, ph = altura(I, px, pz);
      if (ph < 0.5 || !livre(I, px, pz, 2.5, ph) || pertoPorta(I, px, pz, 5)) continue;
      I.pedras.push({ x: px, z: pz, y: ph, r: 0.8 + r() * 1.8, rot: r() * 6 });
    }
    indexar(I);
    // pontos de loot: dentro das casas e alguns pelo mapa
    I.casas.forEach(function (c) {
      var n = c.tipo === 'galpao' ? 5 : 3;
      for (var i = 0; i < n; i++) { var lx = c.x + (r() - 0.5) * (c.w - 2), lz = c.z + (r() - 0.5) * (c.d - 2); if (livre(I, lx, lz, 0.4, c.y) && !pertoPorta(I, lx, lz, 3.6) && !pertoPorta(I, lx - 1, lz, 3.6)) I.loot.push({ x: lx, z: lz, y: c.y, rico: c.tipo === 'galpao' }); }
    });
    if (usina) for (var u = 0; u < 300 && I.loot.filter(function (l) { return l.fab; }).length < 16; u++) { var ux = usina.x + (r() - 0.5) * (r() < 0.6 ? 36 : 70), uz = usina.z + (r() - 0.5) * (r() < 0.6 ? 18 : 50); if (livre(I, ux, uz, 0.6, usina.alt)) I.loot.push({ x: ux, z: uz, y: usina.alt, rico: r() < 0.5, fab: 1 }); }
    var baus = function () { I.loot.forEach(function (l) { I.paredes.push({ x: l.x - 1.0, z: l.z - 0.2, w: 0.9, d: 0.55, y0: l.y, y1: l.y + 0.55, tipo: "bau" }); }); };
    for (var l = 0; l < 500 && I.loot.length < I.casas.length * 3 + 70; l++) { var ox = (r() * 2 - 1) * R.MEIO, oz = (r() * 2 - 1) * R.MEIO, oh = altura(I, ox, oz); if (oh > 0.8 && livre(I, ox, oz, 0.5, oh) && !pertoPorta(I, ox, oz, 4.2) && !pertoPorta(I, ox - 1, oz, 4.2)) I.loot.push({ x: ox, z: oz, y: oh, rico: false }); }
    baus(); indexar(I);
    return I;
  }
  // paredes da casa com porta e JANELAS ABERTAS (dá pra atirar e pular por elas)
  function pertoPorta(I, x, z, folga) { for (var i = 0; i < I.casas.length; i++) { var ps = I.casas[i].portas || []; for (var k = 0; k < ps.length; k++) if (Math.abs(ps[k][0] - x) < folga && Math.abs(ps[k][1] - z) < folga) return true; } return false; }
  function paredesDaCasa(I, c, r) {
    var e = 0.3, PORTA = 1.6, JAN = 1.3, y0 = c.y, y1 = c.y + c.h, gal = c.tipo === 'galpao';
    var portaLado = (r() * 4) | 0, porta2 = (portaLado + 2) % 4;
    c.portas = []; c.janelas = [];
    function lado(ax, az, comp, horiz, temPorta) {
      var aberturas = [];
      if (temPorta) aberturas.push({ m: (r() - 0.5) * (comp - PORTA - 2.4), l: gal ? 3.2 : PORTA, a: 0, b: gal ? 3.2 : 2.3, porta: 1 });
      if (!gal) { var n = Math.max(1, Math.floor(comp / 3.6)); for (var k = 0; k < n; k++) { var m = -comp / 2 + (k + 0.5) * comp / n; if (aberturas.some(function (o) { return Math.abs(o.m - m) < (o.l + JAN) / 2 + 0.5; })) continue; if (Math.abs(m) > comp / 2 - 1) continue; aberturas.push({ m: m, l: JAN, a: 1.0, b: 2.1 }); } }
      aberturas.sort(function (p, q) { return p.m - q.m; });
      function peca(ini, fim, ya, yb, extra) { var t = fim - ini, mm = (ini + fim) / 2; if (t < 0.05 || yb - ya < 0.05) return; var o = horiz ? { x: ax + mm, z: az, w: t, d: e } : { x: ax, z: az + mm, w: e, d: t }; o.y0 = ya; o.y1 = yb; o.casa = c.id; if (extra) o[extra] = 1; I.paredes.push(o); }
      var ini = -comp / 2;
      aberturas.forEach(function (o) {
        peca(ini, o.m - o.l / 2, y0, y1); if (o.a > 0) peca(o.m - o.l / 2, o.m + o.l / 2, y0, y0 + o.a, 'peitoril'); peca(o.m - o.l / 2, o.m + o.l / 2, y0 + o.b, y1, 'topo');
        var px = horiz ? ax + o.m : ax, pz = horiz ? az : az + o.m; (o.porta ? c.portas : c.janelas).push([px, pz, horiz ? 1 : 0, o.l]);
        ini = o.m + o.l / 2;
      });
      peca(ini, comp / 2, y0, y1);
    }
    lado(c.x, c.z - c.d / 2, c.w, true, portaLado === 0 || porta2 === 0);
    lado(c.x, c.z + c.d / 2, c.w, true, portaLado === 2 || porta2 === 2);
    lado(c.x - c.w / 2, c.z, c.d, false, portaLado === 3 || porta2 === 3);
    lado(c.x + c.w / 2, c.z, c.d, false, portaLado === 1 || porta2 === 1);
  }
  // fábrica feita por código: galpão com portões, chaminés, silos e contêineres
  function fabrica(I, c) {
    var x = c.x, z = c.z, y = c.alt, W = 40, D = 22, H = 9, e = 0.4, P = 5;
    I.estruturas.push({ tipo: 'galpaoFab', x: x, z: z, y: y, w: W, d: D, h: H });
    function parede(cx, cz, w, d, y0, y1) { I.paredes.push({ x: cx, z: cz, w: w, d: d, y0: y0, y1: y1, tipo: 'fabrica' }); }
    // paredes compridas com 2 portões cada; laterais com 1 portão
    [-1, 1].forEach(function (s2) {
      var zz = z + s2 * D / 2, cortes = [-W / 2, -10 - P / 2, -10 + P / 2, 10 - P / 2, 10 + P / 2, W / 2];
      parede(x + (cortes[0] + cortes[1]) / 2, zz, cortes[1] - cortes[0], e, y, y + H); parede(x + (cortes[2] + cortes[3]) / 2, zz, cortes[3] - cortes[2], e, y, y + H); parede(x + (cortes[4] + cortes[5]) / 2, zz, cortes[5] - cortes[4], e, y, y + H);
      parede(x - 10, zz, P, e, y + 4.2, y + H); parede(x + 10, zz, P, e, y + 4.2, y + H);
      var xx = x + s2 * W / 2; parede(xx, z - (D / 4 + P / 4), e, D / 2 - P / 2, y, y + H); parede(xx, z + (D / 4 + P / 4), e, D / 2 - P / 2, y, y + H); parede(xx, z, e, P, y + 4.2, y + H);
    });
    // máquinas e caixas dentro (cobertura)
    [[-14, -4, 4, 3, 2.6], [-14, 5, 4, 3, 2.6], [0, 0, 6, 2.5, 3.2], [13, -5, 3, 3, 2], [13, 5, 2, 5, 1.4], [-4, 7, 2.4, 1.4, 1.4], [6, -7, 1.4, 1.4, 1.4]].forEach(function (m) { I.paredes.push({ x: x + m[0], z: z + m[1], w: m[2], d: m[3], y0: y, y1: y + m[4], tipo: 'maquina' }); I.estruturas.push({ tipo: 'maquina', x: x + m[0], z: z + m[1], y: y, w: m[2], d: m[3], h: m[4] }); });
    // chaminés e silos do lado de fora
    [[-14, -D / 2 - 6], [-6, -D / 2 - 6]].forEach(function (p) { I.estruturas.push({ tipo: 'chamine', x: x + p[0], z: z + p[1], y: y, r: 1.8, h: 26 }); I.paredes.push({ x: x + p[0], z: z + p[1], w: 3.6, d: 3.6, y0: y, y1: y + 26, tipo: 'chamine' }); });
    [[W / 2 + 6, -6], [W / 2 + 6, 1], [W / 2 + 6, 8]].forEach(function (p) { I.estruturas.push({ tipo: 'silo', x: x + p[0], z: z + p[1], y: y, r: 2.6, h: 12 }); I.paredes.push({ x: x + p[0], z: z + p[1], w: 5.2, d: 5.2, y0: y, y1: y + 12, tipo: 'silo' }); });
    // contêineres empilhados
    [[-W / 2 - 6, -6, 0, 1], [-W / 2 - 6, 2, 1, 2], [-W / 2 - 6, 2, 0, 0], [8, D / 2 + 7, 0, 3], [14.5, D / 2 + 7, 0, 1], [14.5, D / 2 + 7, 1, 0]].forEach(function (p, i) { var rot = i > 2; I.caixas.push({ x: x + p[0], z: z + p[1], w: rot ? 6 : 2.5, d: rot ? 2.5 : 6, h: 2.6, y0: y + p[2] * 2.6, tipo: 'container', cor: p[3] }); I.paredes.push({ x: x + p[0], z: z + p[1], w: rot ? 6 : 2.5, d: rot ? 2.5 : 6, y0: y + p[2] * 2.6, y1: y + p[2] * 2.6 + 2.6, tipo: 'container' }); });
  }
  // móveis com colisão (as mesmas posições que o desenho usa)
  function moveis(I, c) {
    var y = c.y, add = function (x, z, w, d, h) { if ((c.portas || []).some(function (p) { return Math.abs(p[0] - x) < w / 2 + 2.3 && Math.abs(p[1] - z) < d / 2 + 2.3; })) return; I.paredes.push({ x: x, z: z, w: w, d: d, y0: y, y1: y + h, tipo: 'movel' }); (c.moveis = c.moveis || []).push([x, z]); };
    if (c.tipo === 'galpao') { for (var b = 0; b < 4; b++) add(c.x + (b - 1.5) * 2.6, c.z + c.d / 2 - 1.2, 1.2, 1.2, 1.2); return; }
    var rr = rng(c.id * 13 + 7), mx = c.x + (rr() - 0.5) * (c.w - 3), mz = c.z + (rr() - 0.5) * (c.d - 3);
    add(mx, mz, 1.4, 0.9, 0.8); add(c.x - c.w / 2 + 1.2, c.z + c.d / 2 - 1.4, 1.0, 2.0, 0.55); add(c.x + c.w / 2 - 0.8, c.z - c.d / 2 + 1.6, 0.8, 1.8, 0.95); add(c.x - c.w / 2 + 0.4, c.z - c.d / 2 + 1.2, 0.4, 1.2, 1.8);
  }
  // cerca de madeira em volta do quintal (com portão aberto e alguns buracos)
  function cercaDoQuintal(I, c, r) {
    var m = 2.6 + r() * 1.5, w = c.w + m * 2, d = c.d + m * 2, y0 = c.y, y1 = c.y + 1.5, e = 0.14;
    var lados = [[c.x, c.z - d / 2, w, true], [c.x, c.z + d / 2, w, true], [c.x - w / 2, c.z, d, false], [c.x + w / 2, c.z, d, false]];
    lados.forEach(function (l) {
      var comp = l[2], vaos = [(r() - 0.5) * (comp - 4)]; if (r() < 0.5) vaos.push((r() - 0.5) * (comp - 4));
      (c.portas || []).forEach(function (p) { if (l[3] && p[2] && Math.sign(p[1] - c.z) === Math.sign(l[1] - c.z)) vaos.push(p[0] - c.x); if (!l[3] && !p[2] && Math.sign(p[0] - c.x) === Math.sign(l[0] - c.x)) vaos.push(p[1] - c.z); });
      var cortes = vaos.sort(function (a, b) { return a - b; }), ini = -comp / 2;
      cortes.concat([comp / 2 + 1.4]).forEach(function (cc) {
        var fim = Math.min(comp / 2, cc - 1.4); if (fim - ini > 0.6) { var mm = (ini + fim) / 2, t = fim - ini, seg = l[3] ? { x: l[0] + mm, z: l[1], w: t, d: e, y0: y0, y1: y1, tipo: 'cerca' } : { x: l[0], z: l[1] + mm, w: e, d: t, y0: y0, y1: y1, tipo: 'cerca' };
          var bate = I.casas.some(function (o) { return o !== c && Math.abs(o.x - seg.x) < (o.w + seg.w) / 2 + 1.2 && Math.abs(o.z - seg.z) < (o.d + seg.d) / 2 + 1.2; }) || I.paredes.some(function (p) { return p.tipo === 'cerca' && Math.abs(p.x - seg.x) < (p.w + seg.w) / 2 + 0.6 && Math.abs(p.z - seg.z) < (p.d + seg.d) / 2 + 0.6; }) || I.casas.some(function (o) { return o !== c && (o.portas || []).some(function (pt) { return Math.abs(pt[0] - seg.x) < seg.w / 2 + 2.6 && Math.abs(pt[1] - seg.z) < seg.d / 2 + 2.6; }); });
          if (!bate) I.paredes.push(seg); }
        ini = cc + 1.4;
      });
    });
  }
  // altura do chão: ilha redonda com morros, cidades planas
  function alturaBruta(I, x, z) {
    var s = I.seed % 1000, ang = Math.atan2(z, x), borda = R.MEIO * (0.78 + (fbm(Math.cos(ang) * 1.6 + 7, Math.sin(ang) * 1.6 + 3, s + 9) - 0.5) * 0.45);
    var d = Math.hypot(x, z) / borda, base = (1 - d * d) * 16 - 2.2;
    var morro = Math.pow(fbm(x / 70 + 11, z / 70 + 5, s), 2.2) * 34 * Math.max(0, 1 - d);
    var det = (fbm(x / 14, z / 14, s + 3) - 0.5) * 2.2, h = base + morro + det;
    if (I.lago) { var dl = Math.hypot(x - I.lago.x, z - I.lago.z) / I.lago.r; if (dl < 1.8) { var fundo = -2.5 + Math.max(0, dl - 0.55) * 6; h = Math.min(h, dl < 1 ? fundo : fundo + (h - fundo) * suave(Math.min(1, (dl - 1) / 0.8)) ); } }
    if (I.ilhotas) I.ilhotas.forEach(function (il) { var di = Math.hypot(x - il.x, z - il.z) / il.r; if (di < 1) h = Math.max(h, (1 - di * di) * 5 - 0.8 + (fbm(x / 9, z / 9, s + 5) - 0.5) * 2); });
    return h;
  }
  function altura(I, x, z) {
    var h = alturaBruta(I, x, z);
    for (var i = 0; i < I.cidades.length; i++) { var c = I.cidades[i], d = Math.hypot(c.x - x, c.z - z); if (d < c.r + 22) { var k = d < c.r ? 1 : 1 - suave((d - c.r) / 22); h = h + (c.alt - h) * k; } }
    // estradas um pouco aplainadas
    return h;
  }

  /* ---------- colisão (grade para ficar rápido) ---------- */
  var CEL = 16;
  function indexar(I) {
    var g = {}; function por(k, o) { (g[k] || (g[k] = [])).push(o); }
    I.paredes.forEach(function (p) { for (var i = Math.floor((p.x - p.w / 2) / CEL); i <= Math.floor((p.x + p.w / 2) / CEL); i++) for (var j = Math.floor((p.z - p.d / 2) / CEL); j <= Math.floor((p.z + p.d / 2) / CEL); j++) por(i + ',' + j, p); });
    I.arvores.forEach(function (a) { a.raio = a.tipo === 'arvore' ? 0.45 : 0.3; por(Math.floor(a.x / CEL) + ',' + Math.floor(a.z / CEL), a); });
    I.pedras.forEach(function (p) { p.raio = p.r * 0.85; for (var i = Math.floor((p.x - p.r) / CEL); i <= Math.floor((p.x + p.r) / CEL); i++) for (var j = Math.floor((p.z - p.r) / CEL); j <= Math.floor((p.z + p.r) / CEL); j++) por(i + ',' + j, p); });
    I.grade = g;
  }
  function vizinhos(I, x, z) { var i = Math.floor(x / CEL), j = Math.floor(z / CEL), out = []; for (var a = -1; a <= 1; a++) for (var b = -1; b <= 1; b++) { var l = I.grade[(i + a) + ',' + (j + b)]; if (l) for (var k = 0; k < l.length; k++) out.push(l[k]); } return out; }
  // está livre para um corpo de raio r com os pés na altura y?
  function livre(I, x, z, r, y, extras) {
    if (!I.grade) return true;
    var l = vizinhos(I, x, z);
    for (var i = 0; i < l.length; i++) {
      var o = l[i];
      if (o.w !== undefined) { if (y + 1.6 < o.y0 || y > o.y1 - 0.3) continue; if (Math.abs(x - o.x) < o.w / 2 + r && Math.abs(z - o.z) < o.d / 2 + r) return false; }
      else if (o.raio !== undefined) { if (y > o.y + (o.r ? o.r * 1.2 : 6)) continue; var dx = x - o.x, dz = z - o.z, rr = o.raio + r; if (dx * dx + dz * dz < rr * rr) return false; }
    }
    if (extras) for (var e = 0; e < extras.length; e++) { var g = extras[e]; if (y + 1.6 < g.y || y > g.y + 2.4) continue; if (dentroGelo(g, x, z, r)) return false; }
    return true;
  }
  function dentroGelo(g, x, z, r) { var dx = x - g.x, dz = z - g.z, c = Math.cos(g.ry), s = Math.sin(g.ry), lx = dx * c - dz * s, lz = dx * s + dz * c; return Math.abs(lx) < 1.7 + r && Math.abs(lz) < 0.3 + r; }
  function mover(I, o, dx, dz, r, extras) {
    var y = o.y;
    // se já está dentro de uma parede de gelo (ela nasceu em cima), deixa sair
    if (extras && extras.length) extras = extras.filter(function (g) { return !dentroGelo(g, o.x, o.z, r * 0.9); }); if (livre(I, o.x + dx, o.z, r, y, extras)) o.x += dx; if (livre(I, o.x, o.z + dz, r, y, extras)) o.z += dz;
    var lim = R.MEIO + 40; o.x = Math.max(-lim, Math.min(lim, o.x)); o.z = Math.max(-lim, Math.min(lim, o.z));
  }
  // tiro: distância até a primeira coisa sólida no caminho (paredes, pedras, chão, gelo)
  function raioMundo(I, o, d, max, gelos) {
    var melhor = max, passo = 2;
    // chão (marcha simples)
    for (var t = 1; t < max; t += passo) { var px = o[0] + d[0] * t, py = o[1] + d[1] * t, pz = o[2] + d[2] * t; if (py < Math.max(R.AGUA - 0.5, altura(I, px, pz)) - 0.05) { melhor = Math.max(0, t - passo / 2); break; } }
    // caixas (paredes) — teste de laje 3D
    var vistos = new Set();
    for (var u = 0; u < melhor; u += CEL * 0.8) {
      var l = vizinhos(I, o[0] + d[0] * u, o[2] + d[2] * u);
      for (var i = 0; i < l.length; i++) {
        var b = l[i]; if (vistos.has(b)) continue; vistos.add(b);
        var mn, mx; if (b.w !== undefined) { mn = [b.x - b.w / 2, b.y0, b.z - b.d / 2]; mx = [b.x + b.w / 2, b.y1, b.z + b.d / 2]; }
        else if (b.r) { mn = [b.x - b.raio, b.y - 1, b.z - b.raio]; mx = [b.x + b.raio, b.y + b.r * 1.1, b.z + b.raio]; }
        else { mn = [b.x - b.raio, b.y - 1, b.z - b.raio]; mx = [b.x + b.raio, b.y + 7, b.z + b.raio]; }
        var tt = laje(o, d, mn, mx); if (tt !== null && tt < melhor) melhor = tt;
      }
    }
    if (gelos) gelos.forEach(function (g) {
      var c = Math.cos(g.ry), s = Math.sin(g.ry), ox = o[0] - g.x, oz = o[2] - g.z, lo = [ox * c - oz * s, o[1] - g.y, ox * s + oz * c], ld = [d[0] * c - d[2] * s, d[1], d[0] * s + d[2] * c];
      var tt = laje(lo, ld, [-1.7, 0, -0.3], [1.7, 2.4, 0.3]); if (tt !== null && tt < melhor) { melhor = tt; g._hit = true; }
    });
    return melhor;
  }
  function laje(o, d, mn, mx) {
    var t0 = 0, t1 = 1e9;
    for (var k = 0; k < 3; k++) {
      if (Math.abs(d[k]) < 1e-9) { if (o[k] < mn[k] || o[k] > mx[k]) return null; continue; }
      var a = (mn[k] - o[k]) / d[k], b = (mx[k] - o[k]) / d[k]; if (a > b) { var s = a; a = b; b = s; }
      t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return null;
    }
    return t0 > 0.05 ? t0 : null;
  }
  // corpo do jogador: cabeça (esfera) e corpo (caixa)
  function acertaCorpo(o, d, p, agachado) {
    var hy = agachado ? 1.2 : 1.62, cx = p.x - o[0], cy = p.y + hy - o[1], cz = p.z - o[2];
    var t = cx * d[0] + cy * d[1] + cz * d[2];
    if (t > 0) { var qx = cx - d[0] * t, qy = cy - d[1] * t, qz = cz - d[2] * t; if (qx * qx + qy * qy + qz * qz < 0.2 * 0.2) return { t: t, cabeca: true }; }
    var tt = laje(o, d, [p.x - 0.3, p.y, p.z - 0.3], [p.x + 0.3, p.y + (agachado ? 1.05 : 1.45), p.z + 0.3]);
    return tt !== null ? { t: tt, cabeca: false } : null;
  }

  /* ---------- armas e itens ---------- */
  var ARMAS = {
    soco: { nome: 'Soco', dano: 18, cad: 0.45, pente: 0, mun: null, alc: 2, disp: 0, cls: 'mao' },
    p9: { nome: 'Pistola P9', dano: 26, cad: 0.22, pente: 12, mun: 'leve', alc: 60, disp: 0.012, rec: 0.6, cls: 'pistola', miras: ['2x'] },
    vx45: { nome: 'SMG Vespa', dano: 17, cad: 0.075, pente: 30, mun: 'leve', alc: 70, disp: 0.03, rec: 0.35, cls: 'smg', miras: ['2x'] },
    ar9: { nome: 'Fuzil Falcão', dano: 28, cad: 0.12, pente: 30, mun: 'media', alc: 160, disp: 0.018, rec: 0.55, cls: 'fuzil', miras: ['2x', '4x'] },
    b3: { nome: 'Fuzil Garça', dano: 33, cad: 0.16, pente: 25, mun: 'media', alc: 180, disp: 0.012, rec: 0.6, cls: 'fuzil', miras: ['2x', '4x'] },
    t12: { nome: 'Escopeta Trovão', dano: 16, chumbos: 8, cad: 0.85, pente: 6, mun: 'cartucho', alc: 22, disp: 0.075, rec: 1.6, cls: 'escopeta', miras: [] },
    l7: { nome: 'Sniper Águia', dano: 110, cad: 1.5, pente: 5, mun: 'pesada', alc: 400, disp: 0.002, rec: 2, cls: 'sniper', miras: ['2x', '4x', '8x'] }
  };
  var ITENS = {
    arma: { nome: 'Arma' },
    leve: { nome: 'Munição leve', qtd: 40 }, media: { nome: 'Munição média', qtd: 40 }, cartucho: { nome: 'Cartuchos', qtd: 12 }, pesada: { nome: 'Munição pesada', qtd: 10 },
    colete: { nome: 'Colete' }, capacete: { nome: 'Capacete' },
    kit: { nome: 'Kit médico', qtd: 2 }, gelo: { nome: 'Parede de gelo', qtd: 3 },
    mira2x: { nome: 'Mira 2x' }, mira4x: { nome: 'Mira 4x' }, mira8x: { nome: 'Mira 8x' }, moeda: { nome: 'Moedas', qtd: 10 }
  };
  var PROTECAO = [0, 0.3, 0.42, 0.55], DURAB = [0, 120, 200, 300];
  // sorteia o que aparece num ponto de loot
  function sortearLoot(r, rico) {
    var x = r(), out = [];
    var listaA = rico ? ['ar9', 'b3', 'l7', 't12', 'vx45', 'ar9'] : ['p9', 'p9', 'vx45', 'ar9', 't12', 'vx45', 'b3', 'l7'];
    if (x < 0.42) { var a = listaA[(r() * listaA.length) | 0]; out.push({ tipo: 'arma', arma: a }); out.push({ tipo: ARMAS[a].mun, qtd: ITENS[ARMAS[a].mun].qtd }); }
    else if (x < 0.58) { var m = ['leve', 'media', 'cartucho', 'pesada'][(r() * 4) | 0]; out.push({ tipo: m, qtd: ITENS[m].qtd }); }
    else if (x < 0.68) out.push({ tipo: 'colete', nv: rico ? 2 + (r() < 0.35 ? 1 : 0) : 1 + (r() < 0.3 ? 1 : 0) });
    else if (x < 0.77) out.push({ tipo: 'capacete', nv: rico ? 2 + (r() < 0.35 ? 1 : 0) : 1 + (r() < 0.3 ? 1 : 0) });
    else if (x < 0.87) out.push({ tipo: 'kit', qtd: 2 });
    else if (x < 0.95) out.push({ tipo: 'gelo', qtd: 3 });
    else out.push({ tipo: ['mira2x', 'mira2x', 'mira4x', 'mira8x'][(r() * 4) | 0] });
    if (r() < 0.35) out.push({ tipo: 'moeda', qtd: 5 + ((r() * 16) | 0) });
    return out;
  }
  // zona: fases (espera, fecha, raio)
  var ZONA = [[60, 40, 150], [45, 35, 95], [40, 30, 55], [35, 25, 28], [30, 20, 10], [25, 15, 0]];
  var DANO_ZONA = [2, 4, 7, 10, 15, 25];
  function nomeItem(it) { if (it.tipo === 'arma') return ARMAS[it.arma].nome; if (it.tipo === 'colete' || it.tipo === 'capacete') return ITENS[it.tipo].nome + ' Nv.' + it.nv; return ITENS[it.tipo].nome + (it.qtd ? ' x' + it.qtd : ''); }

  var api = { R: R, rng: rng, gerar: gerar, altura: altura, livre: livre, mover: mover, raioMundo: raioMundo, acertaCorpo: acertaCorpo, vizinhos: vizinhos, dentroGelo: dentroGelo, ARMAS: ARMAS, ITENS: ITENS, PROTECAO: PROTECAO, DURAB: DURAB, sortearLoot: sortearLoot, ZONA: ZONA, DANO_ZONA: DANO_ZONA, nomeItem: nomeItem };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.REGRAS = api;
})(this);
