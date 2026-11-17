/* QUEDA LIVRE — personagem (feito por código): roupas, arma na mão, queda com prancha e paraquedas. */
(function () {
  'use strict';
  var BO = window.BONECO = {};
  function mat(cor, rough, extra) { return new THREE.MeshStandardMaterial(Object.assign({ color: cor, roughness: rough === undefined ? 0.75 : rough }, extra || {})); }
  function cil(r1, r2, h, m, seg) { var g = new THREE.CylinderGeometry(r1, r2, h, seg || 10); g.translate(0, -h / 2, 0); var o = new THREE.Mesh(g, m); o.castShadow = true; return o; }
  function esf(r, m, sx, sy, sz) { var o = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m); o.scale.set(sx || 1, sy || 1, sz || 1); o.castShadow = true; return o; }
  function caixa(w, h, d, m) { var o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.castShadow = true; return o; }
  function junta(pai, x, y, z) { var g = new THREE.Group(); g.position.set(x, y, z); pai.add(g); return g; }

  // roupas (originais): jaqueta, calça, cabelo, pele, acessório
  BO.ROUPAS = [
    { nome: 'Kai', jaq: 0x3f8f3a, cal: 0x2b2f36, cab: 0x1a120c, pele: 0xc68c64, ext: 'bone', det: 0xffd23f },
    { nome: 'Luna', fem: 1, jaq: 0xff7a3d, cal: 0x5b3fd0, cab: 0x9b5cff, pele: 0xf0c8a8, ext: 'rabo', det: 0xffffff },
    { nome: 'Bia', fem: 1, jaq: 0xfff2d0, cal: 0x1f6fd1, cab: 0x2a1610, pele: 0x8d5a3b, ext: 'bandana', det: 0xe53935 },
    { nome: 'Rex', jaq: 0x26262c, cal: 0x18181a, cab: 0x0d0d0d, pele: 0xe0b08a, ext: 'capuz', det: 0x00e5ff },
    { nome: 'Nina', fem: 1, jaq: 0x2ec4b6, cal: 0x222233, cab: 0xf5f5f5, pele: 0xe0b08a, ext: 'oculos', det: 0xff4fa3 },
    { nome: 'Zeca', jaq: 0xf2a33a, cal: 0x2f5f8f, cab: 0x5a3a1c, pele: 0x5e3a26, ext: 'bandana', det: 0xffffff }
  ];
  var CACHE = {};
  function mats(r) {
    if (CACHE[r]) return CACHE[r]; var R = BO.ROUPAS[r] || BO.ROUPAS[0];
    return (CACHE[r] = { jaq: mat(R.jaq, 0.7), cal: mat(R.cal, 0.85), cab: mat(R.cab, 0.8), pele: mat(R.pele, 0.6), det: mat(R.det, 0.4, { emissive: R.ext === 'oculos' && r === 1 ? R.det : 0x000000, emissiveIntensity: 0.6 }), bota: mat(0x1a1714, 0.6), cin: mat(0x2a2420, 0.5), mochila: mat(0x4a4436, 0.85), preto: mat(0x0e0e10, 0.3), camisa: mat(0xe8e4dc, 0.9), colete: mat(0x55603f, 0.8), capacete: mat(0x47503a, 0.5) });
  }
  BO.criar = function (roupa) {
    var M = mats(roupa | 0), R = BO.ROUPAS[roupa | 0] || BO.ROUPAS[0];
    var raiz = new THREE.Group(), o = { raiz: raiz, fase: Math.random() * 6, armaId: null };
    var corpo = o.corpo = junta(raiz, 0, 0, 0); // gira o corpo todo (queda livre)
    var quad = o.quad = junta(corpo, 0, 0.97, 0);
    var tronco = o.tronco = junta(quad, 0, 0.03, 0);
    var peito = esf(0.21, M.jaq, R.fem ? 0.88 : 1, 1.42, R.fem ? 0.72 : 0.7); peito.position.y = 0.28; tronco.add(peito);
    var camisa = esf(0.12, M.camisa, 1, 1.5, 0.5); camisa.position.set(0, 0.3, 0.085); tronco.add(camisa);
    var cint = cil(R.fem ? 0.18 : 0.17, R.fem ? 0.18 : 0.17, 0.08, M.cin); cint.position.y = 0.05; tronco.add(cint);
    var fivela = caixa(0.06, 0.045, 0.02, M.det); fivela.position.set(0, 0.01, 0.17); tronco.add(fivela);
    var gola = cil(0.1, 0.12, 0.07, M.jaq); gola.position.y = 0.6; tronco.add(gola);
    // mochila
    var moch = caixa(0.3, 0.38, 0.16, M.mochila); moch.position.set(0, 0.32, -0.2); tronco.add(moch);
    var moch2 = caixa(0.26, 0.12, 0.08, M.mochila); moch2.position.set(0, 0.18, -0.3); tronco.add(moch2);
    var rolo = cil(0.055, 0.055, 0.26, M.mochila); rolo.rotation.z = Math.PI / 2; rolo.position.set(0.15, 0.55, -0.2); tronco.add(rolo);
    // colete (aparece quando tem)
    o.colete = esf(0.225, M.colete, 1.02, 1.1, 0.75); o.colete.position.y = 0.3; tronco.add(o.colete); o.colete.visible = false;
    var pesc = junta(tronco, 0, 0.6, 0), cab = o.cab = junta(pesc, 0, 0.04, 0);
    var cabeca = esf(0.115, M.pele, 0.92, 1.1, 1); cabeca.position.y = 0.13; cab.add(cabeca);
    var cabelo = esf(0.122, M.cab, 0.96, 0.75, 1.02); cabelo.position.set(0, 0.19, -0.02); cab.add(cabelo);
    var franja = esf(0.08, M.cab, 1.3, 0.4, 0.6); franja.position.set(0.02, 0.22, 0.07); franja.rotation.z = -0.3; cab.add(franja);
    [-0.04, 0.04].forEach(function (x) { var ol = esf(0.014, M.preto); ol.position.set(x, 0.14, 0.1); cab.add(ol); });
    var nariz = esf(0.017, M.pele, 1, 1.3, 1); nariz.position.set(0, 0.115, 0.112); cab.add(nariz);
    if (R.fem) { var lat = esf(0.1, M.cab, 1.25, 1.3, 0.9); lat.position.set(0, 0.1, -0.05); cab.add(lat); }
    if (R.ext === 'rabo' || R.fem) { var rabo = cil(0.05, 0.02, 0.32, M.cab); rabo.position.set(0, 0.24, -0.11); rabo.rotation.x = 0.5; cab.add(rabo); o.rabo = rabo; var lac = cil(0.035, 0.035, 0.03, M.det); lac.position.set(0, 0.25, -0.12); lac.rotation.x = 0.5; cab.add(lac); }
    if (R.ext === 'bone') { var bone = esf(0.125, M.jaq, 1, 0.55, 1.05); bone.position.y = 0.21; cab.add(bone); var aba = caixa(0.2, 0.02, 0.13, M.jaq); aba.position.set(0, 0.2, 0.13); cab.add(aba); var logo = caixa(0.05, 0.03, 0.01, M.det); logo.position.set(0, 0.25, 0.12); cab.add(logo); }
    if (R.ext === 'oculos') { var oc = caixa(0.2, 0.045, 0.03, M.det); oc.position.set(0, 0.145, 0.105); cab.add(oc); }
    if (R.ext === 'bandana') { var bd = cil(0.125, 0.125, 0.05, M.det); bd.position.y = 0.23; cab.add(bd); }
    if (R.ext === 'capuz') { var cp = esf(0.15, M.jaq, 1, 1.05, 1.1); cp.position.set(0, 0.16, -0.03); cab.add(cp); var ms = caixa(0.16, 0.08, 0.04, M.det); ms.position.set(0, 0.08, 0.1); cab.add(ms); }
    o.capacete = esf(0.135, M.capacete, 1, 0.75, 1.08); o.capacete.position.y = 0.2; cab.add(o.capacete); o.capacete.visible = false;
    function braco(l) {
      var omb = junta(tronco, l * (R.fem ? 0.21 : 0.24), 0.48, 0); omb.add(esf(0.075, M.jaq));
      omb.add(cil(0.064, 0.054, 0.3, M.jaq)); var cot = junta(omb, 0, -0.3, 0); cot.add(cil(0.05, 0.042, 0.26, l > 0 ? M.jaq : M.jaq));
      var punho = cil(0.046, 0.046, 0.04, M.det); punho.position.y = -0.22; cot.add(punho);
      var mao = junta(cot, 0, -0.28, 0); mao.add(esf(0.046, M.pele, 0.85, 1.1, 0.7)); return { omb: omb, cot: cot, mao: mao };
    }
    function perna(l) {
      var q = junta(quad, l * 0.1, -0.02, 0); q.add(cil(0.088, 0.07, 0.46, M.cal));
      var bolso = caixa(0.05, 0.1, 0.1, M.cal); bolso.position.set(l * 0.08, -0.25, 0); q.add(bolso);
      var j = junta(q, 0, -0.46, 0); j.add(cil(0.066, 0.052, 0.42, M.cal));
      var p = junta(j, 0, -0.43, 0); var pe = caixa(0.11, 0.09, 0.26, M.bota); pe.position.set(0, -0.04, 0.05); p.add(pe); var cano = cil(0.065, 0.06, 0.12, M.bota); cano.position.y = 0.06; p.add(cano); return { q: q, j: j, p: p };
    }
    o.be = braco(-1); o.bd = braco(1); o.pe = perna(-1); o.pd = perna(1);
    // arma presa no peito, apontando pra frente
    o.arma = junta(tronco, 0.16, 0.36, 0.3);
    // prancha voadora (queda livre)
    var pr = o.prancha = new THREE.Group(); raiz.add(pr); pr.visible = false;
    var tabua = caixa(0.42, 0.05, 1.3, mat(0xe9e2d0, 0.5)); pr.add(tabua);
    var faixa = caixa(0.43, 0.052, 0.3, mat(R.det, 0.3, { emissive: R.det, emissiveIntensity: 0.5 })); pr.add(faixa);
    [-0.45, 0.45].forEach(function (z) { var bico = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.05, 16, 1, false, 0, Math.PI), tabua.material); bico.rotation.set(0, z > 0 ? 0 : Math.PI, 0); bico.position.z = z * 1.44; pr.add(bico); });
    [-1, 1].forEach(function (s) { var jato = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 8), mat(0x333333, 0.3, { metalness: 0.8 })); jato.rotation.x = Math.PI / 2; jato.position.set(s * 0.12, -0.06, -0.62); pr.add(jato); });
    o.fogo = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.6, 8), new THREE.MeshBasicMaterial({ color: 0x66e0ff, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })); o.fogo.rotation.x = -Math.PI / 2; o.fogo.position.set(0, -0.06, -0.95); pr.add(o.fogo);
    return o;
  };
  BO.arma = function (o, id) {
    if (o.armaId === id) return; o.armaId = id;
    while (o.arma.children.length) o.arma.remove(o.arma.children[0]);
    if (id && window.ARMAS3D) { var m = window.ARMAS3D.modelo(id); m.rotation.y = Math.PI; m.scale.setScalar(1.25); if (id === 'p9') m.position.set(-0.05, 0.05, 0.05); o.arma.add(m); }
  };
  BO.protecao = function (o, colete, capacete) { o.colete.visible = colete > 0; o.capacete.visible = capacete > 0; };

  function lerp(a, b, k) { return a + (b - a) * k; }
  function rot(obj, x, y, z, k) { obj.rotation.x = lerp(obj.rotation.x, x, k); obj.rotation.y = lerp(obj.rotation.y, y || 0, k); obj.rotation.z = lerp(obj.rotation.z, z || 0, k); }
  // est: cabine trem ar para chao morto | f: 1 anda, 4 agacha, 8 cura, 16 recarrega, 32 mira, 64 soco
  BO.animar = function (o, est, f, vel, pitch, dt) {
    var k = Math.min(1, dt * 12), t = performance.now() / 1000, anda = f & 1 && vel > 0.4, ag = f & 4, armado = !!o.armaId;
    o.fase += dt * (anda ? (ag ? 6 : 10) : 1.5);
    var s = Math.sin(o.fase), c = Math.cos(o.fase);
    var hY = 0.97, tx = 0, ty = 0, cRx = 0, cRz = 0, bE = [0, 0, 0.1], bD = [0, 0, -0.1], cE = -0.2, cD = -0.2, pE = 0, pD = 0, jE = 0, jD = 0, cab = 0;
    o.prancha.visible = est === 'ar'; o.arma.visible = est === 'chao' || est === 'cabine' || est === 'morto';
    if (est === 'ar') {
      cRx = 0; cRz = 0; hY = 0.85; tx = 0.25; bE = [-0.4, 0, 1.0 + Math.sin(t * 5) * 0.08]; bD = [0.2, 0, -0.9 - Math.sin(t * 5.3) * 0.08]; cE = -0.4; cD = -0.3; pE = -0.55; pD = 0.35; jE = 0.8; jD = 0.5; cab = 0.1;
      o.prancha.position.set(0, 0.04, 0); o.prancha.rotation.set(0, Math.PI / 2, Math.sin(t * 3) * 0.06); o.fogo.scale.y = 0.8 + Math.random() * 0.5; ty = -1.2;
    } else if (est === 'para') {
      bE = [0.1, 0, 2.6]; bD = [0.1, 0, -2.6]; cE = -0.6; cD = -0.6; pE = Math.sin(t * 2) * 0.2; pD = -Math.sin(t * 2) * 0.2; jE = 0.3; jD = 0.4; cab = 0.15;
    } else if (est === 'morto') {
      cRx = -Math.PI / 2; hY = 0.2; bE = [-0.3, 0, 1.2]; bD = [-0.2, 0, -1.0]; pE = 0.1; pD = -0.2;
    } else {
      if (ag) { hY = 0.62; tx = 0.35; pE = -1.3 + s * 0.3 * (anda ? 1 : 0); pD = -1.3 - s * 0.3 * (anda ? 1 : 0); jE = 1.9; jD = 1.9; }
      else if (anda) { tx = 0.12; pE = s * 0.85; pD = -s * 0.85; jE = Math.max(0, -c) * 1.3 + 0.1; jD = Math.max(0, c) * 1.3 + 0.1; hY = 0.97 + Math.abs(c) * 0.05; }
      else { tx = Math.sin(t * 1.5) * 0.015; }
      if (armado) { // segura a arma
        var p = Math.max(-0.8, Math.min(0.8, pitch || 0));
        ty = 0; bD = [-1.45 + p, 0, -0.1]; cD = -0.25; bE = [-1.35 + p, 0.75, 0.25]; cE = -0.9; tx += p * 0.45;
        o.arma.rotation.x = p * 0.55;
        if (f & 16) { bE = [-0.9, 0.4, 0.3]; cE = -1.8 + Math.sin(t * 9) * 0.3; }
      } else if (!anda) { bE = [0, 0, 0.1]; bD = [0, 0, -0.1]; }
      else { bE = [-s * 0.8, 0, 0.1]; bD = [s * 0.8, 0, -0.1]; cE = -1.0; cD = -1.0; }
      if (f & 8) { bE = [-1.2, 0.3, 0.3]; cE = -1.6; bD = [-1.0, -0.3, -0.3]; cD = -1.4; cab = 0.4; } // cura
      if (f & 64) { bD = [-1.6, 0, -0.1]; cD = 0; } // soco
    }
    o.quad.position.y = lerp(o.quad.position.y, hY, k);
    rot(o.corpo, cRx, est === 'ar' ? 1.2 : 0, cRz, k); rot(o.tronco, tx, est === 'ar' ? 0 : ty, 0, k); rot(o.cab, cab, 0, 0, k);
    rot(o.be.omb, bE[0], bE[1], bE[2], k); rot(o.bd.omb, bD[0], bD[1], bD[2], k); rot(o.be.cot, cE, 0, 0, k); rot(o.bd.cot, cD, 0, 0, k);
    rot(o.pe.q, pE, 0, 0, k); rot(o.pd.q, pD, 0, 0, k); rot(o.pe.j, jE, 0, 0, k); rot(o.pd.j, jD, 0, 0, k);
  };
  // paraquedas
  BO.paraquedas = function (cor) {
    var g = new THREE.Group(), segs = 8, m1 = mat(cor || 0xe8572a, 0.6, { side: THREE.DoubleSide }), m2 = mat(0xf5f0e6, 0.6, { side: THREE.DoubleSide });
    for (var i = 0; i < segs; i++) { var geo = new THREE.SphereGeometry(2.6, 6, 6, i / segs * Math.PI * 2, Math.PI * 2 / segs, 0, Math.PI * 0.38); var p = new THREE.Mesh(geo, i % 2 ? m1 : m2); p.scale.set(1.25, 0.55, 0.8); g.add(p); }
    var lm = new THREE.LineBasicMaterial({ color: 0x222222 }), pts = [];
    for (var k = 0; k < 8; k++) { var a = k / 8 * Math.PI * 2; pts.push(new THREE.Vector3(0, -2.25, 0), new THREE.Vector3(Math.cos(a) * 2.1, -0.35, Math.sin(a) * 1.3)); }
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lm));
    return g;
  };
})();
