/* QUEDA LIVRE — o mundo em estilo desenho: ilha, casinhas de madeira com móveis, cercas, árvores, céu, trem voador e o vagão de espera. */
(function () {
  'use strict';
  var MU = window.MUNDO = {}, G = window.REGRAS, R = G.R;
  function tela(w, h, f) { var c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; }
  function M(o) { return new THREE.MeshLambertMaterial(o); }
  function pontos(g, w, h, n, cores, tam) { for (var i = 0; i < n; i++) { g.fillStyle = cores[(Math.random() * cores.length) | 0]; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * tam, 1 + Math.random() * tam); } }

  /* ---------- texturas ---------- */
  var T = {};
  function texturas() {
    if (T.ok) return T; T.ok = 1;
    T.tabuaV = tela(256, 256, function (g, w, h) { var cs = ['#e8a65a', '#f0b56a', '#dd9a4f', '#f4bd73']; for (var x = 0; x < w; x += 32) { g.fillStyle = cs[(x / 32) % 4]; g.fillRect(x, 0, 32, h); g.fillStyle = 'rgba(90,50,20,.55)'; g.fillRect(x, 0, 2, h); g.fillStyle = 'rgba(255,230,190,.18)'; g.fillRect(x + 3, 0, 3, h); for (var k = 0; k < 5; k++) { g.fillStyle = 'rgba(120,70,30,.25)'; g.fillRect(x + 6 + Math.random() * 20, Math.random() * h, 2, 30 + Math.random() * 50); } g.fillStyle = 'rgba(80,45,20,.5)'; g.beginPath(); g.arc(x + 16, 30 + Math.random() * 200, 2, 0, 7); g.fill(); } });
    T.tabua = tela(256, 256, function (g, w, h) { var cs = ['#c9874a', '#d39352', '#bf7d42', '#cd8d4e']; for (var y = 0; y < h; y += 32) { g.fillStyle = cs[(y / 32) % 4]; g.fillRect(0, y, w, 32); g.fillStyle = 'rgba(255,225,180,.25)'; g.fillRect(0, y + 2, w, 4); g.fillStyle = 'rgba(80,40,15,.55)'; g.fillRect(0, y + 29, w, 3); for (var k = 0; k < 6; k++) { g.fillStyle = 'rgba(110,60,25,.22)'; g.fillRect(Math.random() * w, y + 8 + Math.random() * 16, 30 + Math.random() * 60, 2); } } });
    T.pedra = tela(256, 256, function (g, w, h) { g.fillStyle = '#7d828a'; g.fillRect(0, 0, w, h); for (var y = 0; y < h; y += 28) for (var x = (y / 28 % 2) * 22; x < w + 44; x += 44) { var v = 130 + Math.random() * 50 | 0; g.fillStyle = 'rgb(' + v + ',' + (v + 4) + ',' + (v + 10) + ')'; g.fillRect(x - 44 + 3, y + 3, 38, 22); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x - 44 + 3, y + 3, 38, 4); } });
    T.telhaC = tela(256, 256, function (g, w, h) { for (var x = 0; x < w; x += 32) { g.fillStyle = ['#8f9aa8', '#9ba6b3', '#848f9c'][(x / 32) % 3]; g.fillRect(x, 0, 32, h); g.fillStyle = 'rgba(40,45,55,.45)'; g.fillRect(x, 0, 3, h); g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(x + 4, 0, 3, h); } });
    T.tijolo = tela(256, 256, function (g, w, h) { g.fillStyle = '#d9cfc0'; g.fillRect(0, 0, w, h); for (var y = 0; y < h; y += 16) for (var x = (y / 16 % 2) * 16; x < w + 32; x += 32) { var c = ['#b5523b', '#c45e44', '#a84a35', '#bd5840'][(Math.random() * 4) | 0]; g.fillStyle = c; g.fillRect(x - 32 + 2, y + 2, 28, 12); } });
    T.reboco = tela(128, 128, function (g, w, h) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); pontos(g, w, h, 900, ['rgba(0,0,0,.04)', 'rgba(0,0,0,.07)'], 3); });
    T.telha = tela(256, 256, function (g, w, h) { for (var y = 0; y < h; y += 20) { g.fillStyle = y % 40 ? '#4f6ea8' : '#5b7cb8'; g.fillRect(0, y, w, 20); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, y + 17, w, 3); for (var x = 0; x < w; x += 24) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, y, 2, 17); } } });
    T.telhaV = tela(256, 256, function (g, w, h) { for (var y = 0; y < h; y += 18) for (var x = (y / 18 % 2) * 14; x < w + 28; x += 28) { g.fillStyle = ['#c8553d', '#d4613f', '#bd4c36'][(Math.random() * 3) | 0]; g.beginPath(); g.ellipse(x, y + 9, 13, 10, 0, 0, Math.PI); g.fill(); g.fillRect(x - 13, y, 26, 9); } });
    T.metal = tela(128, 128, function (g, w, h) { for (var x = 0; x < w; x += 12) { var gr = g.createLinearGradient(x, 0, x + 12, 0); gr.addColorStop(0, '#9aa3a8'); gr.addColorStop(0.5, '#d8dee2'); gr.addColorStop(1, '#8a9398'); g.fillStyle = gr; g.fillRect(x, 0, 12, h); } });
    T.piso = tela(256, 256, function (g, w, h) { for (var y = 0; y < h; y += 32) { g.fillStyle = ['#a4683a', '#b07444', '#9a5f33'][(y / 32) % 3]; g.fillRect(0, y, w, 32); g.fillStyle = 'rgba(60,30,10,.5)'; g.fillRect(0, y, w, 2); var off = Math.random() * w; g.fillRect(off, y, 2, 32); } });
    T.capim = tela(64, 64, function (g, w, h) { g.clearRect(0, 0, w, h); for (var i = 0; i < 16; i++) { var x = 6 + Math.random() * 52; g.strokeStyle = ['#5fbf3a', '#78d14a', '#4aa82e', '#8fe05a'][i % 4]; g.lineWidth = 3; g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + (Math.random() - 0.5) * 12, h * 0.5, x + (Math.random() - 0.5) * 20, 6 + Math.random() * 20); g.stroke(); } });
    T.folhaC = tela(128, 64, function (g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = '#3fae3a'; g.beginPath(); g.moveTo(0, h / 2); g.quadraticCurveTo(w / 2, -6, w, h / 2); g.quadraticCurveTo(w / 2, h + 6, 0, h / 2); g.fill(); g.strokeStyle = '#2d8a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke(); for (var i = 8; i < w; i += 9) { g.strokeStyle = 'rgba(255,255,255,0)'; g.clearRect(i, 0, 2, h * 0.3 + Math.random() * 6); g.clearRect(i, h * 0.72 - Math.random() * 6, 2, h); } });
    T.detalhe = tela(256, 256, function (g, w, h) { g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, w, h); for (var i = 0; i < 5000; i++) { var v = 200 + Math.random() * 55 | 0; g.strokeStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; var x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 3, y - 3 - Math.random() * 4); g.stroke(); } });
    T.zona = tela(64, 256, function (g, w, h) { var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(60,170,255,0)'); gr.addColorStop(0.7, 'rgba(60,170,255,.35)'); gr.addColorStop(1, 'rgba(120,210,255,.75)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); for (var y = 0; y < h; y += 16) { g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, y, w, 3); } });
    T.fumaca = tela(64, 64, function (g) { var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(240,240,250,.7)'); gr.addColorStop(1, 'rgba(240,240,250,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    T.brilho = tela(64, 64, function (g) { var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(120,220,255,.8)'); gr.addColorStop(1, 'rgba(60,160,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    T.janelaV = tela(64, 64, function (g) { g.fillStyle = '#9fd8ff'; g.fillRect(0, 0, 64, 64); var gr = g.createLinearGradient(0, 0, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,.6)'); gr.addColorStop(0.4, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    return T;
  }

  /* ---------- juntar várias peças num único desenho (muito mais leve) ---------- */
  function Junta() { this.l = {}; this.mats = {}; }
  Junta.prototype.add = function (geo, mat, mx) {
    var g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(mx);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    (this.l[mat.uuid] || (this.l[mat.uuid] = [])).push(g); this.mats[mat.uuid] = mat;
  };
  Junta.prototype.caixa = function (w, h, d, x, y, z, ry, mat, tile) {
    var g = new THREE.BoxGeometry(w, h, d); if (tile) { var uv = g.attributes.uv, e = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; for (var f = 0; f < 6; f++) for (var v = 0; v < 4; v++) { var i = f * 4 + v; uv.setXY(i, uv.getX(i) * e[f][0] / tile, uv.getY(i) * e[f][1] / tile); } }
    var mx = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry || 0, 0)), new THREE.Vector3(1, 1, 1)); this.add(g, mat, mx);
  };
  Junta.prototype.montar = function (pai, sombra) {
    var self = this;
    Object.keys(this.l).forEach(function (k) {
      var lista = self.l[k], n = 0; lista.forEach(function (g) { n += g.attributes.position.count; });
      var pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), o = 0;
      lista.forEach(function (g) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; g.dispose(); });
      var bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); bg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      var m = new THREE.Mesh(bg, self.mats[k]); m.castShadow = m.receiveShadow = !!sombra; pai.add(m);
    });
  };

  /* ---------- céu e nuvens ---------- */
  MU.ceu = function (cena) {
    var geo = new THREE.SphereGeometry(900, 24, 12), mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { topo: { value: new THREE.Color(0x2f86e8) }, meio: { value: new THREE.Color(0x7cc4ff) }, base: { value: new THREE.Color(0xd8f0ff) } },
      vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 topo; uniform vec3 meio; uniform vec3 base; varying vec3 p; void main(){ float h = p.y; vec3 c = h > 0.15 ? mix(meio, topo, smoothstep(0.15, 0.7, h)) : mix(base, meio, smoothstep(-0.05, 0.15, h)); gl_FragColor = vec4(c, 1.0); }' });
    var ceu = new THREE.Mesh(geo, mat); ceu.renderOrder = -10; cena.add(ceu);
    // nuvens fofinhas
    var esf = new THREE.IcosahedronGeometry(1, 2), mN = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x9aa8b8, emissiveIntensity: 0.35 });
    var n = 0, lista = [], rr = Math.random;
    for (var c = 0; c < 46; c++) { var a = rr() * Math.PI * 2, d = 60 + rr() * 520, cx = Math.cos(a) * d, cz = Math.sin(a) * d, cy = 255 + rr() * 80, s = 10 + rr() * 16; for (var b = 0; b < 6; b++) lista.push([cx + (b - 2.5) * s * 0.7, cy + rr() * s * 0.4, cz + (rr() - 0.5) * s, s * (0.6 + rr() * 0.6)]); }
    var inst = new THREE.InstancedMesh(esf, mN, lista.length), mx = new THREE.Matrix4(), q = new THREE.Quaternion();
    lista.forEach(function (l, i) { mx.compose(new THREE.Vector3(l[0], l[1], l[2]), q, new THREE.Vector3(l[3], l[3] * 0.62, l[3] * 0.9)); inst.setMatrixAt(i, mx); });
    inst.frustumCulled = false; cena.add(inst);
    return { ceu: ceu, nuvens: inst };
  };

  /* ---------- ilha ---------- */
  MU.ilha = function (cena, I, opts) {
    texturas(); opts = opts || {};
    var g = new THREE.Group(); cena.add(g);
    var TAM = R.MEIO * 2 + 120, SEG = opts.leve ? 150 : 210;
    var geo = new THREE.PlaneGeometry(TAM, TAM, SEG, SEG); geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position, cores = new Float32Array(pos.count * 3), c = new THREE.Color();
    var estradas = I.estradas.map(function (e) { var a = I.cidades[e[0]], b = I.cidades[e[1]]; return [a.x, a.z, b.x, b.z]; });
    function distSeg(px, pz, s) { var dx = s[2] - s[0], dz = s[3] - s[1], l = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((px - s[0]) * dx + (pz - s[1]) * dz) / l)); return Math.hypot(px - s[0] - dx * t, pz - s[1] - dz * t); }
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), z = pos.getZ(i), h = G.altura(I, x, z); pos.setY(i, Math.max(h, -8));
      var hx = G.altura(I, x + 1.5, z) - h, hz = G.altura(I, x, z + 1.5) - h, incl = Math.hypot(hx, hz) / 1.5, rnd = (Math.sin(x * 0.37) * Math.cos(z * 0.29) + 1) * 0.5;
      if (h < 0.2) c.setHex(0xe9d18e); else if (h < 1.2) c.setHex(0xf3df9e).lerp(new THREE.Color(0x7fd14a), (h - 0.2)); else if (incl > 0.9) c.setHex(0x9b958a); else c.setHex(0x74d14a).lerp(new THREE.Color(0x9be35c), rnd * 0.6).lerp(new THREE.Color(0x4fae3a), Math.max(0, Math.min(1, (h - 14) / 14)));
      for (var k = 0; k < estradas.length; k++) { var dd = distSeg(x, z, estradas[k]); if (dd < 3.2 && h > 0.5) { c.setHex(dd < 0.25 ? 0xf4d03f : 0x6b6b70); break; } else if (dd < 4.2 && h > 0.5) c.lerp(new THREE.Color(0xc9b48a), 0.6); }
      for (var q = 0; q < I.cidades.length; q++) { var ci = I.cidades[q], dc = Math.hypot(ci.x - x, ci.z - z); if (dc < ci.r * 0.35) c.lerp(new THREE.Color(0xd9c9a4), 0.5); }
      if (h < -0.3) c.setHex(0xd8c088);
      cores[i * 3] = c.r; cores[i * 3 + 1] = c.g; cores[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cores, 3)); geo.computeVertexNormals();
    T.detalhe.repeat.set(140, 140); var chao = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, map: T.detalhe })); chao.receiveShadow = true; g.add(chao);
    // mar
    var agua = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshPhongMaterial({ color: 0x29a8e0, shininess: 90, specular: 0xaaddff, transparent: true, opacity: 0.88 }));
    agua.rotation.x = -Math.PI / 2; agua.position.y = R.AGUA - 0.05; g.add(agua);
    var espuma = new THREE.Mesh(new THREE.RingGeometry(R.MEIO * 0.4, R.MEIO * 1.25, 64, 1), new THREE.MeshBasicMaterial({ color: 0x6fd6ff, transparent: true, opacity: 0.25 })); espuma.rotation.x = -Math.PI / 2; espuma.position.y = -0.4; g.add(espuma);

    var Jc = new Junta(), mTabua = M({ map: T.tabua }), mTijolo = M({ map: T.tijolo }), mReb = M({ map: T.reboco, color: 0xf6efe0 }), mPiso = M({ map: T.piso });
    var mTelha = M({ map: T.telhaC }), mTelhaV = M({ map: T.telha }), mPedra = M({ map: T.pedra }), mMetal = M({ map: T.metal }), mVidro = new THREE.MeshPhongMaterial({ map: T.janelaV, shininess: 120, specular: 0xffffff }), mMold = M({ color: 0xffffff }), mMold2 = M({ color: 0x7a4a26 });
    var mMovel = M({ color: 0x8d5a34 }), mSofa = M({ color: 0xd24c4c }), mCama = M({ color: 0x5b8ad8 }), mLencol = M({ color: 0xf5f5f5 }), mCaixa = M({ map: T.tabua, color: 0xe0b27a });
    var mCont = [M({ map: T.metal, color: 0xe5533d }), M({ map: T.metal, color: 0x3b8ed6 }), M({ map: T.metal, color: 0x43a047 }), M({ map: T.metal, color: 0xf4b400 })];
    var CORES_PAREDE = [mTabua, mTabua, mPedra, mReb, mTabua, mTijolo];
    // paredes das casas
    I.paredes.forEach(function (p) {
      if (p.tipo !== undefined && p.casa === undefined) return;
      var casa = I.casas[p.casa], mat = casa.tipo === 'galpao' ? mMetal : CORES_PAREDE[casa.cor];
      Jc.caixa(p.w, p.y1 - p.y0, p.d, p.x, (p.y0 + p.y1) / 2, p.z, 0, mat, 2.2);
    });
    I.casas.forEach(function (c) {
      var y = c.y;
      Jc.caixa(c.w - 0.3, 0.08, c.d - 0.3, c.x, y + 0.04, c.z, 0, mPiso, 2);
      // telhado de duas águas
      var gal = c.tipo === 'galpao', ang = gal ? 0.22 : 0.48, aoLongo = c.w >= c.d, vao = (aoLongo ? c.d : c.w) + 0.9, comp = (aoLongo ? c.w : c.d) + 0.9, alt = Math.tan(ang) * vao / 2, lado = (vao / 2) / Math.cos(ang);
      [-1, 1].forEach(function (s) {
        var bg = new THREE.BoxGeometry(aoLongo ? comp : lado, 0.16, aoLongo ? lado : comp), e = new THREE.Euler(aoLongo ? s * ang : 0, 0, aoLongo ? 0 : -s * ang);
        var uv = bg.attributes.uv; for (var i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * comp / 3, uv.getY(i) * lado / 3);
        var mx = new THREE.Matrix4().compose(new THREE.Vector3(c.x + (aoLongo ? 0 : s * vao / 4), y + c.h + alt / 2, c.z + (aoLongo ? s * vao / 4 : 0)), new THREE.Quaternion().setFromEuler(e), new THREE.Vector3(1, 1, 1));
        Jc.add(bg, gal ? mMetal : c.cor === 5 || c.cor === 3 ? mTelhaV : mTelha, mx);
      });
      var forma = new THREE.Shape(); forma.moveTo(-vao / 2 + 0.45, 0); forma.lineTo(vao / 2 - 0.45, 0); forma.lineTo(0, alt - 0.05); forma.lineTo(-vao / 2 + 0.45, 0);
      [-1, 1].forEach(function (s) { var sg = new THREE.ShapeGeometry(forma), mx = new THREE.Matrix4().compose(new THREE.Vector3(c.x + (aoLongo ? s * (comp / 2 - 0.45) : 0), y + c.h, c.z + (aoLongo ? 0 : s * (comp / 2 - 0.45))), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, aoLongo ? s * Math.PI / 2 : (s > 0 ? 0 : Math.PI), 0)), new THREE.Vector3(1, 1, 1)); Jc.add(sg, gal ? mMetal : CORES_PAREDE[c.cor], mx); });
      // molduras das janelas abertas e dos portais
      (c.janelas || []).forEach(function (jn) { var hor = jn[2], l = jn[3], mol = c.cor % 3 === 0 ? mMold2 : mMold;
        Jc.caixa(hor ? l + 0.3 : 0.42, 0.14, hor ? 0.42 : l + 0.3, jn[0], y + 1.0, jn[1], 0, mol); Jc.caixa(hor ? l + 0.3 : 0.4, 0.14, hor ? 0.4 : l + 0.3, jn[0], y + 2.1, jn[1], 0, mol);
        [-1, 1].forEach(function (s2) { Jc.caixa(hor ? 0.12 : 0.4, 1.1, hor ? 0.4 : 0.12, jn[0] + (hor ? s2 * (l / 2 + 0.06) : 0), y + 1.55, jn[1] + (hor ? 0 : s2 * (l / 2 + 0.06)), 0, mol); }); });
      (c.portas || []).forEach(function (pt) { var hor = pt[2], l = pt[3]; Jc.caixa(hor ? l + 0.3 : 0.42, 0.18, hor ? 0.42 : l + 0.3, pt[0], y + (c.tipo === 'galpao' ? 3.25 : 2.35), pt[1], 0, mMold); });
      // móveis dentro
      if (!gal) {
        var r = G.rng(c.id * 13 + 7), mx2 = c.x + (r() - 0.5) * (c.w - 3), mz2 = c.z + (r() - 0.5) * (c.d - 3);
        Jc.caixa(1.4, 0.08, 0.9, mx2, y + 0.78, mz2, 0, mMovel); [[-0.6, -0.35], [0.6, -0.35], [-0.6, 0.35], [0.6, 0.35]].forEach(function (p) { Jc.caixa(0.08, 0.75, 0.08, mx2 + p[0], y + 0.4, mz2 + p[1], 0, mMovel); });
        [-1, 1].forEach(function (s) { Jc.caixa(0.45, 0.06, 0.45, mx2 + s * 1.05, y + 0.46, mz2, 0, mMovel); Jc.caixa(0.06, 0.5, 0.45, mx2 + s * 1.27, y + 0.73, mz2, 0, mMovel); });
        var cx2 = c.x - c.w / 2 + 1.2, cz2 = c.z + c.d / 2 - 1.4; Jc.caixa(1.0, 0.35, 2, cx2, y + 0.3, cz2, 0, mCama); Jc.caixa(0.95, 0.1, 1.9, cx2, y + 0.52, cz2, 0, mLencol); Jc.caixa(0.7, 0.14, 0.35, cx2, y + 0.62, cz2 - 0.7, 0, mLencol);
        var sx = c.x + c.w / 2 - 0.8, sz = c.z - c.d / 2 + 1.6; Jc.caixa(0.8, 0.45, 1.8, sx, y + 0.25, sz, 0, mSofa); Jc.caixa(0.25, 0.5, 1.8, sx + 0.3, y + 0.7, sz, 0, mSofa);
        Jc.caixa(0.4, 1.8, 1.2, c.x - c.w / 2 + 0.4, y + 0.9, c.z - c.d / 2 + 1.2, 0, mMovel);
      } else { for (var b = 0; b < 4; b++) Jc.caixa(1.2, 1.2, 1.2, c.x + (b - 1.5) * 2.6, y + 0.6, c.z + c.d / 2 - 1.2, 0, mCaixa); }
    });
    // caixas e contêineres
    I.caixas.forEach(function (cx) { if (cx.tipo === 'container') { Jc.caixa(cx.w, cx.h, cx.d, cx.x, cx.y0 + cx.h / 2, cx.z, 0, mCont[cx.cor], 1.5); } else { Jc.caixa(cx.w, cx.h, cx.d, cx.x, cx.y0 + cx.h / 2, cx.z, 0, mCaixa, 1.4); } });
    Jc.montar(g, !opts.leve);
    // cercas de madeira (tábuas pontudas instanciadas)
    var tab = new THREE.BoxGeometry(0.36, 1.5, 0.07, 2, 1, 1); var pp = tab.attributes.position; for (var v = 0; v < pp.count; v++) if (pp.getY(v) > 0.7) { if (Math.abs(pp.getX(v)) < 0.01) pp.setY(v, pp.getY(v) + 0.18); } tab.translate(0, 0.75, 0); tab.computeVertexNormals();
    var cercas = I.paredes.filter(function (p) { return p.tipo === 'cerca'; }), tabuas = [];
    cercas.forEach(function (p) { var hor = p.w > p.d, comp = hor ? p.w : p.d; for (var t = -comp / 2 + 0.2; t <= comp / 2 - 0.1; t += 0.39) tabuas.push([hor ? p.x + t : p.x, p.y0, hor ? p.z : p.z + t, hor ? 0 : Math.PI / 2, 0.9 + Math.random() * 0.2]); });
    var mCerca = new THREE.MeshLambertMaterial({ color: 0xffffff }), inst = new THREE.InstancedMesh(tab, mCerca, Math.max(1, tabuas.length)), m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), cc = new THREE.Color();
    var mxx = new THREE.Matrix4(); tabuas.forEach(function (t, i) { mxx.compose(new THREE.Vector3(t[0], t[1], t[2]), qq.setFromEuler(new THREE.Euler(0, t[3] + (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.05)), new THREE.Vector3(1, t[4], 1)); inst.setMatrixAt(i, mxx); inst.setColorAt(i, cc.setHex([0xf2b366, 0xf7c27a, 0xe8a75a, 0xfacb85][i % 4])); });
    inst.castShadow = !opts.leve; g.add(inst);
    var Jr = new Junta(), mTrilho = M({ color: 0xd9954e }); cercas.forEach(function (p) { var hor = p.w > p.d; [0.35, 1.1].forEach(function (yy) { Jr.caixa(hor ? p.w : 0.1, 0.14, hor ? 0.1 : p.d, p.x + (hor ? 0 : -0.08), p.y0 + yy, p.z + (hor ? -0.08 : 0), 0, mTrilho); }); }); Jr.montar(g, false);
    // árvores: pinheiros desenho, árvores redondas e coqueiros
    var pin = I.arvores.filter(function (a) { return a.tipo === 'arvore'; }), coq = I.arvores.filter(function (a) { return a.tipo === 'coqueiro'; });
    var gT = new THREE.CylinderGeometry(0.22, 0.32, 1, 7); gT.translate(0, 0.5, 0);
    var gCone = new THREE.ConeGeometry(1, 1, 8); gCone.translate(0, 0.5, 0);
    var tron = new THREE.InstancedMesh(gT, M({ color: 0x8a5a33 }), pin.length + coq.length), copa = new THREE.InstancedMesh(gCone, M({ color: 0x2f9e44 }), pin.length * 3);
    var mx3 = new THREE.Matrix4(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), q3 = new THREE.Quaternion(), n = 0;
    pin.forEach(function (a, i) { var e = a.esc * 1.3; mx3.compose(v3.set(a.x, a.y, a.z), q3.set(0, 0, 0, 1), s3.set(e, 2.6 * e, e)); tron.setMatrixAt(n++, mx3); for (var k = 0; k < 3; k++) { var lg = (2.6 - k * 0.65) * e; mx3.compose(v3.set(a.x, a.y + (1.8 + k * 1.5) * e, a.z), q3, s3.set(lg, 2.4 * e, lg)); copa.setMatrixAt(i * 3 + k, mx3); copa.setColorAt(i * 3 + k, cc.setHex([0x2f9e44, 0x37b24d, 0x2b8a3e][k])); } });
    // coqueiros: tronco inclinado + 7 folhas
    var gFolha = new THREE.PlaneGeometry(3.2, 0.9, 4, 1); var fp = gFolha.attributes.position; for (var f2 = 0; f2 < fp.count; f2++) { var fx = fp.getX(f2) + 1.6; fp.setX(f2, fx); fp.setY(f2, fp.getY(f2) - fx * fx * 0.12); } gFolha.rotateX(-Math.PI / 2 + 0.25); gFolha.computeVertexNormals();
    var folhas = new THREE.InstancedMesh(gFolha, new THREE.MeshLambertMaterial({ map: T.folhaC, alphaTest: 0.5, side: THREE.DoubleSide }), coq.length * 7);
    coq.forEach(function (a, i) {
      var e = a.esc, inc = 0.22, alt = 6.5 * e, tq = new THREE.Quaternion().setFromEuler(new THREE.Euler(inc * Math.cos(a.rot), 0, inc * Math.sin(a.rot)));
      mx3.compose(v3.set(a.x, a.y, a.z), tq, s3.set(0.75 * e, alt, 0.75 * e)); tron.setMatrixAt(n++, mx3);
      var topo = new THREE.Vector3(0, alt, 0).applyQuaternion(tq).add(new THREE.Vector3(a.x, a.y, a.z));
      for (var k = 0; k < 7; k++) { mx3.compose(topo, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a.rot + k / 7 * Math.PI * 2, 0)), s3.set(e, e, e)); folhas.setMatrixAt(i * 7 + k, mx3); }
    });
    tron.count = n; tron.castShadow = copa.castShadow = folhas.castShadow = !opts.leve; g.add(tron); g.add(copa); g.add(folhas);
    // moitas e tufos de capim
    var gMoita = new THREE.IcosahedronGeometry(1, 1), moitas = new THREE.InstancedMesh(gMoita, M({ color: 0x4caf50, flatShading: true }), 260), nm = 0, rr = G.rng(I.seed + 77);
    for (var t2 = 0; t2 < 2000 && nm < 260; t2++) { var bx = (rr() * 2 - 1) * R.MEIO, bz = (rr() * 2 - 1) * R.MEIO, bh = G.altura(I, bx, bz); if (bh < 1 || !G.livre(I, bx, bz, 1, bh)) continue; var bs = 0.5 + rr() * 0.7; mx3.compose(v3.set(bx, bh + bs * 0.3, bz), q3.set(0, 0, 0, 1), s3.set(bs, bs * 0.75, bs)); moitas.setMatrixAt(nm, mx3); moitas.setColorAt(nm++, cc.setHex([0x4caf50, 0x66bb6a, 0x43a047][nm % 3])); }
    moitas.count = nm; g.add(moitas);
    var gCap = new THREE.PlaneGeometry(1.1, 0.7); gCap.translate(0, 0.35, 0); var gCap2 = gCap.clone().rotateY(Math.PI / 2);
    var capG = new THREE.BufferGeometry(); [gCap, gCap2].forEach(function () {});
    var tufos = new THREE.InstancedMesh(gCap, new THREE.MeshLambertMaterial({ map: T.capim, alphaTest: 0.4, side: THREE.DoubleSide }), opts.leve ? 3000 : 7000), nt = 0;
    for (var t3 = 0; t3 < 20000 && nt < tufos.count; t3++) { var tx = (rr() * 2 - 1) * R.MEIO, tz = (rr() * 2 - 1) * R.MEIO, th = G.altura(I, tx, tz); if (th < 1.3) continue; mx3.compose(v3.set(tx, th - 0.05, tz), q3.setFromEuler(new THREE.Euler(0, rr() * 3, 0)), s3.set(1.4, 1 + rr() * 0.7, 1.4)); tufos.setMatrixAt(nt++, mx3); }
    tufos.count = nt; g.add(tufos);
    // pedras
    var gPed = new THREE.DodecahedronGeometry(1, 0), ped = new THREE.InstancedMesh(gPed, M({ color: 0xa8a49c, flatShading: true }), I.pedras.length);
    I.pedras.forEach(function (p, i) { mx3.compose(v3.set(p.x, p.y + p.r * 0.2, p.z), q3.setFromEuler(new THREE.Euler(p.rot, p.rot * 2, 0)), s3.set(p.r, p.r * 0.75, p.r * 1.1)); ped.setMatrixAt(i, mx3); });
    ped.castShadow = !opts.leve; g.add(ped);
    // estruturas feitas por código: fábrica, chaminés, silos, máquinas e o moinho
    var Je = new Junta(), mMet = M({ map: T.metal, color: 0xbfd3e6 }), mMetE = M({ map: T.metal, color: 0x8fa6bd }), mTelM = M({ map: T.metal, color: 0x5b7cb8 }), mVermE = M({ color: 0xd84a3a }), mBrancoE = M({ color: 0xf5f5f5 }), mAmar = M({ color: 0xf4c430 }), mCinzaE = M({ color: 0x7d858c }), mPisoF = M({ color: 0x9aa0a6 });
    var moinhos = [];
    (I.estruturas || []).forEach(function (e) {
      if (e.tipo === 'galpaoFab') {
        Je.caixa(e.w, 0.1, e.d, e.x, e.y + 0.05, e.z, 0, mPisoF);
        // paredes já vêm das colisões (abaixo); telhado em dente de serra
        for (var k = 0; k < 4; k++) { var zx = e.x - e.w / 2 + e.w / 8 + k * e.w / 4; var bg = new THREE.BoxGeometry(e.w / 4, 0.25, e.d + 1.2), mx = new THREE.Matrix4().compose(new THREE.Vector3(zx, e.y + e.h + 1.3, e.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.32)), new THREE.Vector3(1, 1, 1)); Je.add(bg, mTelM, mx); Je.caixa(0.3, 2.6, e.d + 1.2, zx + e.w / 8 - 0.2, e.y + e.h + 1.2, e.z, 0, M({ color: 0x9fd8ff })); }
        Je.caixa(e.w + 1, 0.6, 0.6, e.x, e.y + e.h, e.z - e.d / 2, 0, mAmar); Je.caixa(e.w + 1, 0.6, 0.6, e.x, e.y + e.h, e.z + e.d / 2, 0, mAmar);
        // faixas de aviso nos portões
        [-10, 10].forEach(function (px) { [-1, 1].forEach(function (s2) { Je.caixa(5.2, 0.5, 0.5, e.x + px, e.y + 4.4, e.z + s2 * e.d / 2, 0, mAmar); }); });
      } else if (e.tipo === 'maquina') { Je.caixa(e.w, e.h, e.d, e.x, e.y + e.h / 2, e.z, 0, mMetE, 1.5); Je.caixa(e.w * 0.6, 0.3, e.d * 0.6, e.x, e.y + e.h + 0.15, e.z, 0, mAmar); }
      else if (e.tipo === 'chamine') { for (var f = 0; f < 6; f++) { var cg = new THREE.CylinderGeometry(e.r * (1 - f * 0.04), e.r * (1 - (f + 1) * 0.04), e.h / 6, 16); Je.add(cg, f % 2 ? mBrancoE : mVermE, new THREE.Matrix4().makeTranslation(e.x, e.y + e.h / 12 + f * e.h / 6, e.z)); } }
      else if (e.tipo === 'silo') { Je.add(new THREE.CylinderGeometry(e.r, e.r, e.h, 18), mMet, new THREE.Matrix4().makeTranslation(e.x, e.y + e.h / 2, e.z)); var cg2 = new THREE.ConeGeometry(e.r * 1.05, 2, 18); Je.add(cg2, mVermE, new THREE.Matrix4().makeTranslation(e.x, e.y + e.h + 1, e.z)); Je.add(new THREE.CylinderGeometry(e.r + 0.05, e.r + 0.05, 0.4, 18), mAmar, new THREE.Matrix4().makeTranslation(e.x, e.y + e.h * 0.6, e.z)); }
      else if (e.tipo === 'moinho') {
        var tg = new THREE.CylinderGeometry(2.2, 3.4, 13, 8); Je.add(tg, M({ map: T.tabua, color: 0xfff0dc }), new THREE.Matrix4().makeTranslation(e.x, e.y + 6.5, e.z));
        Je.add(new THREE.ConeGeometry(2.8, 3.2, 8), mVermE, new THREE.Matrix4().makeTranslation(e.x, e.y + 14.6, e.z));
        Je.caixa(1.4, 2.2, 0.3, e.x, e.y + 1.1, e.z + 3.25, 0, M({ color: 0x7a4a26 }));
        var pas = new THREE.Group(); pas.position.set(e.x, e.y + 11.5, e.z + 3.2); g.add(pas);
        var mPa = M({ color: 0xfff6e8, side: THREE.DoubleSide }), mBraco = M({ color: 0x6b4423 });
        for (var p2 = 0; p2 < 4; p2++) { var br = new THREE.Group(); br.rotation.z = p2 * Math.PI / 2; pas.add(br); var bb = new THREE.Mesh(new THREE.BoxGeometry(0.25, 7.5, 0.2), mBraco); bb.position.y = 3.8; br.add(bb); var vela = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 6), mPa); vela.position.set(0.9, 4.2, 0); br.add(vela); }
        var eixo = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.8, 10), mBraco); eixo.rotation.x = Math.PI / 2; pas.add(eixo); moinhos.push(pas);
      }
    });
    // paredes da fábrica (galpão de metal com portões)
    I.paredes.forEach(function (p) { if (p.tipo === 'fabrica') Je.caixa(p.w, p.y1 - p.y0, p.d, p.x, (p.y0 + p.y1) / 2, p.z, 0, mMet, 2.5); });
    Je.montar(g, !opts.leve);
    return { grupo: g, agua: agua, atualizar: function (dt) { moinhos.forEach(function (m) { m.rotation.z += dt * 0.6; }); } };
  };

  /* ---------- parede da zona ---------- */
  MU.zona = function (cena) {
    texturas();
    var geo = new THREE.CylinderGeometry(1, 1, 160, 96, 1, true); geo.translate(0, 80, 0);
    var m = new THREE.MeshBasicMaterial({ map: T.zona, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false }); T.zona.repeat.set(60, 1);
    var mesh = new THREE.Mesh(geo, m); mesh.position.y = -10; mesh.frustumCulled = false; cena.add(mesh);
    return { mesh: mesh, atualizar: function (x, z, r, dt) { mesh.position.x = x; mesh.position.z = z; mesh.scale.set(Math.max(1, r), 1, Math.max(1, r)); T.zona.offset.y -= dt * 0.15; } };
  };

  /* ---------- o TREM VOADOR (trem de passageiros moderno) ---------- */
  MU.trem = function (cena) {
    texturas();
    var g = new THREE.Group(), corpo = new THREE.Group(); g.add(corpo); cena.add(g);
    var mBranco = new THREE.MeshPhongMaterial({ color: 0xf4f6f8, shininess: 90, specular: 0x666666 }), mAzul = new THREE.MeshPhongMaterial({ color: 0x1d3fb8, shininess: 80 }), mJan = new THREE.MeshPhongMaterial({ color: 0x0c1a3a, shininess: 140, specular: 0x9fc8ff }),
      mVerde = new THREE.MeshPhongMaterial({ color: 0x8fe05a, shininess: 40 }), mCinza = new THREE.MeshPhongMaterial({ color: 0x8a9096, shininess: 30 }), mEsc = new THREE.MeshPhongMaterial({ color: 0x2b2f36 }), mBrilho = new THREE.MeshBasicMaterial({ color: 0x7fe3ff }), mFarol = new THREE.MeshBasicMaterial({ color: 0xfff6d0 });
    function c(geo, mat, x, y, z, rx, ry, rz) { var o = new THREE.Mesh(geo, mat); o.position.set(x || 0, y || 0, z || 0); o.rotation.set(rx || 0, ry || 0, rz || 0); corpo.add(o); return o; }
    var W = 3.2, H = 3.0, L = 15, N = 5, rodas = [], frente = null;
    function vagao(z0, loc) {
      c(new THREE.BoxGeometry(W, H, L), mBranco, 0, 2.3, z0);
      var teto = c(new THREE.CylinderGeometry(W / 2, W / 2, L, 20, 1, false, 0, Math.PI), mCinza, 0, 3.8, z0, Math.PI / 2, 0, Math.PI / 2); teto.scale.set(1, 1, 0.35);
      [-1, 1].forEach(function (s) {
        c(new THREE.BoxGeometry(0.06, 1.0, L - 0.6), mJan, s * (W / 2 + 0.02), 2.9, z0); // faixa de janelas
        c(new THREE.BoxGeometry(0.07, 0.16, L), mAzul, s * (W / 2 + 0.03), 2.3, z0); c(new THREE.BoxGeometry(0.07, 0.22, L), mVerde, s * (W / 2 + 0.03), 1.35, z0);
        for (var k = -1; k <= 1; k += 2) c(new THREE.BoxGeometry(0.08, 2.2, 1.0), mAzul, s * (W / 2 + 0.04), 2.0, z0 + k * (L / 2 - 1.6));
      });
      c(new THREE.BoxGeometry(W - 0.4, 0.5, L - 1), mEsc, 0, 0.6, z0);
      // truques com anéis de luz (fazem o trem flutuar)
      [-1, 1].forEach(function (k) { var zz = z0 + k * (L / 2 - 2.5); c(new THREE.BoxGeometry(W - 0.6, 0.45, 2.6), mCinza, 0, 0.35, zz); [-1, 1].forEach(function (s) { var r = c(new THREE.TorusGeometry(0.42, 0.1, 8, 18), mBrilho, s * (W / 2 - 0.35), 0.25, zz, 0, Math.PI / 2); rodas.push(r); }); });
      if (z0 > -L) c(new THREE.CylinderGeometry(1.2, 1.2, 1.2, 14), mEsc, 0, 2.3, z0 - L / 2 - 0.4, Math.PI / 2);
    }
    for (var v = 0; v < N; v++) vagao(-v * (L + 0.8), v === 0);
    // frente aerodinâmica
    var nariz = new THREE.Group(); nariz.position.set(0, 0, L / 2); corpo.add(nariz);
    var bico = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mAzul); bico.rotation.x = Math.PI / 2; bico.scale.set(W / 2, 3.2, H / 2 + 0.2); bico.position.y = 2.4; nariz.add(bico);
    var para = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 3.2), mJan); para.rotation.x = Math.PI / 2 - 0.55; para.scale.set(1.25, 1.6, 0.8); para.position.set(0, 3.25, 1.0); nariz.add(para);
    var faixaN = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 8, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.08), mAzul); faixaN.rotation.x = Math.PI / 2; faixaN.scale.set(W / 2 + 0.03, 3.25, H / 2 + 0.23); faixaN.position.y = 2.4; nariz.add(faixaN);
    [-0.9, 0.9].forEach(function (x) { var f = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), mFarol); f.position.set(x, 1.5, 2.3); f.rotation.x = -0.4; nariz.add(f); });
    var cham = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.32, 1.4, 12), mEsc); cham.position.set(0, 4.2, -1.2); nariz.add(cham);
    var anelC = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.08, 6, 14), new THREE.MeshPhongMaterial({ color: 0xf4c430 })); anelC.rotation.x = Math.PI / 2; anelC.position.set(0, 4.85, -1.2); nariz.add(anelC);
    frente = new THREE.Object3D(); frente.position.set(0, 5.1, -1.2); nariz.add(frente);
    var luz = new THREE.PointLight(0x7fe3ff, 0, 30); luz.position.set(0, -1, -20); corpo.add(luz);
    // efeitos: fumaça saindo da frente, faíscas azuis e rastros de luz
    var fumacas = [], mF = new THREE.SpriteMaterial({ map: T.fumaca, transparent: true, depthWrite: false, color: 0xffffff });
    for (var f = 0; f < 34; f++) { var sp = new THREE.Sprite(mF.clone()); sp.visible = false; cena.add(sp); fumacas.push({ s: sp, t: 99, v: new THREE.Vector3() }); }
    var faiscas = [], mFa = new THREE.SpriteMaterial({ map: T.brilho, color: 0x9ff0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    for (var fa = 0; fa < 60; fa++) { var sf = new THREE.Sprite(mFa.clone()); sf.visible = false; sf.scale.setScalar(0.7); cena.add(sf); faiscas.push({ s: sf, t: 99, v: new THREE.Vector3() }); }
    var compT = N * (L + 0.8), rastroGeo = new THREE.PlaneGeometry(0.9, 70); rastroGeo.translate(0, -35, 0); rastroGeo.rotateX(-Math.PI / 2);
    var mR = new THREE.MeshBasicMaterial({ map: tela(16, 128, function (gg, w, h) { var gr = gg.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(140,240,255,.9)'); gr.addColorStop(1, 'rgba(140,240,255,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, w, h); }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    void rastroGeo; void mR;
    var t = 0, fw = new THREE.Vector3(), rw = new THREE.Vector3();
    return {
      grupo: g, corpo: corpo, comprimento: compT,
      atualizar: function (dt, ligado) {
        t += dt; corpo.position.y = Math.sin(t * 1.3) * 0.4; corpo.rotation.z = Math.sin(t * 0.8) * 0.02; corpo.rotation.x = Math.sin(t * 0.6) * 0.01;
        rodas.forEach(function (r, i) { r.rotation.x += dt * 9; r.material.color.setHSL(0.52, 1, 0.6 + Math.sin(t * 8 + i) * 0.12); });
        if (!ligado) return;
        frente.getWorldPosition(fw);
        fumacas.forEach(function (f) { f.t += dt; if (f.t > 3 && Math.random() < dt * 6) { f.t = 0; f.s.position.copy(fw); f.v.set((Math.random() - 0.5) * 1.5, 2.5 + Math.random() * 2, (Math.random() - 0.5) * 1.5); f.s.visible = true; } if (f.t < 3) { f.s.position.addScaledVector(f.v, dt); var k = f.t / 3; f.s.scale.setScalar(1.2 + k * 7); f.s.material.opacity = 0.8 * (1 - k); } else f.s.visible = false; });
        faiscas.forEach(function (f) { f.t += dt; if (f.t > 0.9 && Math.random() < dt * 12) { f.t = 0; rodas[(Math.random() * rodas.length) | 0].getWorldPosition(rw); f.s.position.copy(rw); f.v.set((Math.random() - 0.5) * 3, -2 - Math.random() * 3, (Math.random() - 0.5) * 3); f.s.visible = true; } if (f.t < 0.9) { f.s.position.addScaledVector(f.v, dt); f.s.material.opacity = 1 - f.t / 0.9; } else f.s.visible = false; });
        luz.intensity = 1.2;
      },
      esconderEfeitos: function () { fumacas.forEach(function (f) { f.s.visible = false; f.t = 99; }); faiscas.forEach(function (f) { f.s.visible = false; f.t = 99; }); }
    };
  };

  /* ---------- vagão de espera (por dentro) ---------- */
  MU.vagao = function (cena) {
    texturas();
    var g = new THREE.Group(), J = new Junta(); cena.add(g);
    var L = 30, W = 4.6, H = 3.2;
    var mPiso = M({ map: T.piso }), mParede = new THREE.MeshPhongMaterial({ color: 0xf4efe6 }), mVerm = new THREE.MeshPhongMaterial({ color: 0xc8303c, shininess: 60 }), mOuro = new THREE.MeshPhongMaterial({ color: 0xe8b830, shininess: 90 }), mBanco = new THREE.MeshPhongMaterial({ color: 0x2a5bd7, shininess: 30 }), mTeto = new THREE.MeshPhongMaterial({ color: 0xffffff });
    J.caixa(W, 0.2, L, 0, -0.1, 0, 0, mPiso, 2); J.caixa(W, 0.2, L, 0, H + 0.1, 0, 0, mTeto);
    J.caixa(W, H, 0.2, 0, H / 2, L / 2, 0, mVerm); J.caixa(W, H, 0.2, 0, H / 2, -L / 2, 0, mVerm);
    // paredes com janelas grandes
    [-1, 1].forEach(function (s) {
      J.caixa(0.2, 1.0, L, s * W / 2, 0.5, 0, 0, mVerm); J.caixa(0.2, 0.7, L, s * W / 2, H - 0.35, 0, 0, mParede);
      for (var z = -L / 2; z <= L / 2; z += 3) J.caixa(0.22, H, 0.5, s * W / 2, H / 2, z, 0, mOuro);
      for (var b = -L / 2 + 1.5; b < L / 2 - 1; b += 3) { J.caixa(0.9, 0.5, 1.6, s * (W / 2 - 0.6), 0.25, b, 0, mBanco); J.caixa(0.25, 0.8, 1.6, s * (W / 2 - 0.2), 0.75, b, 0, mBanco); }
    });
    for (var l = -L / 2 + 2; l < L / 2; l += 4) J.caixa(0.5, 0.06, 1.4, 0, H - 0.02, l, 0, new THREE.MeshBasicMaterial({ color: 0xfff6d0 }));
    J.caixa(0.08, 0.08, L, -0.9, H - 0.4, 0, 0, mOuro); J.caixa(0.08, 0.08, L, 0.9, H - 0.4, 0, 0, mOuro);
    J.montar(g, false);
    var vidro = new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.15 });
    [-1, 1].forEach(function (s) { var v = new THREE.Mesh(new THREE.PlaneGeometry(L, H - 1.7), vidro); v.rotation.y = s * Math.PI / 2; v.position.set(s * (W / 2 - 0.02), 1.0 + (H - 1.7) / 2, 0); g.add(v); });
    var placa = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.7), new THREE.MeshBasicMaterial({ map: tela(256, 64, function (gg, w, h) { gg.fillStyle = '#1b1b22'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#ffd23f'; gg.font = 'bold 34px sans-serif'; gg.textAlign = 'center'; gg.fillText('EXPRESSO CÉU', w / 2, 44); }) }));
    placa.position.set(0, H - 0.6, L / 2 - 0.12); placa.rotation.y = Math.PI; g.add(placa);
    var luz = new THREE.PointLight(0xfff0d0, 0.8, 30); luz.position.set(0, H - 0.4, 0); g.add(luz);
    return { grupo: g, L: L, W: W };
  };
})();
