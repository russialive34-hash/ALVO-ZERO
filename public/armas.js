/* Armas 3D (feitas por código) + braços com luva. O cano aponta para -Z. */
(function () {
  'use strict';
  var AR = window.ARMAS3D = {};
  function cv(w, h, f) { var c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); var t = new THREE.CanvasTexture(c); return t; }
  var M = {};
  function m(nome) {
    if (M[nome]) return M[nome];
    var d = {
      metal: { color: 0x2a2d31, metalness: 0.85, roughness: 0.32 },
      metalClaro: { color: 0x8c9196, metalness: 0.9, roughness: 0.25 },
      polimero: { color: 0x1b1d20, metalness: 0.1, roughness: 0.6 },
      areia: { color: 0xb8a27a, metalness: 0.1, roughness: 0.65 },
      oliva: { color: 0x4f5a3a, metalness: 0.1, roughness: 0.65 },
      madeira: { map: cv(128, 32, function (g, w, h) { g.fillStyle = '#6b3f1f'; g.fillRect(0, 0, w, h); for (var i = 0; i < 30; i++) { g.strokeStyle = 'rgba(40,20,5,' + Math.random() * 0.5 + ')'; g.beginPath(); g.moveTo(0, Math.random() * h); g.bezierCurveTo(40, Math.random() * h, 80, Math.random() * h, w, Math.random() * h); g.stroke(); } }), roughness: 0.5 },
      // pintura da sniper: azul/roxo com chamas laranja
      chamas: { map: cv(256, 64, function (g, w, h) { var gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#2a3fb0'); gr.addColorStop(0.5, '#5b2fb5'); gr.addColorStop(1, '#2a7fd6'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 9; i++) { var x = 20 + i * 26; g.fillStyle = i % 2 ? '#ff9a1f' : '#ffd23f'; g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + 6, h * 0.4, x + 18, h * 0.1); g.quadraticCurveTo(x + 10, h * 0.5, x + 24, h); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, 6, w, 4); }), metalness: 0.5, roughness: 0.3 },
      lente: { color: 0x3fd0ff, metalness: 0.2, roughness: 0.05, emissive: 0x0a4050 },
      luva: { map: cv(64, 64, function (g, w, h) { g.fillStyle = '#5a5248'; g.fillRect(0, 0, w, h); for (var i = 0; i < 300; i++) { g.fillStyle = 'rgba(0,0,0,' + Math.random() * 0.2 + ')'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }), roughness: 0.9 },
      manga: { color: 0x3b4a32, roughness: 0.9 },
      pele: { color: 0xc89474, roughness: 0.7 },
      branco: { color: 0xe9e6df, metalness: 0.15, roughness: 0.35 },
      ouro: { color: 0xd4a236, metalness: 0.9, roughness: 0.25 },
      pulseira: { color: 0xe07a20, roughness: 0.6 }
    }[nome];
    return (M[nome] = new THREE.MeshStandardMaterial(d));
  }
  function caixa(w, h, d, mt, x, y, z, pai) { var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(mt)); b.position.set(x, y, z); pai.add(b); return b; }
  function cil(r1, r2, comp, mt, x, y, z, pai, seg) { var c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, comp, seg || 12), m(mt)); c.rotation.x = Math.PI / 2; c.position.set(x, y, z); pai.add(c); return c; }

  // cada arma: grupo com 'boca' (onde sai o tiro), 'pente' (para animar recarga) e 'mira' (ponto da mira)
  var CONSTRUIR = {
    ar9: function (g) { // fuzil de assalto areia e preto
      caixa(0.07, 0.09, 0.42, 'areia', 0, 0, -0.05, g); caixa(0.06, 0.05, 0.3, 'polimero', 0, 0.06, -0.08, g);
      caixa(0.075, 0.07, 0.26, 'polimero', 0, -0.005, -0.38, g); cil(0.013, 0.013, 0.32, 'metal', 0, 0.01, -0.62, g);
      cil(0.022, 0.022, 0.06, 'metal', 0, 0.01, -0.8, g); caixa(0.05, 0.08, 0.22, 'areia', 0, -0.02, 0.25, g); caixa(0.05, 0.12, 0.06, 'polimero', 0, -0.05, 0.36, g);
      caixa(0.035, 0.1, 0.05, 'polimero', 0, -0.09, 0.07, g).rotation.x = 0.25;
      var p = caixa(0.04, 0.16, 0.07, 'metal', 0, -0.12, -0.12, g); p.rotation.x = 0.18; g.userData.pente = p;
      caixa(0.03, 0.03, 0.05, 'metal', 0, 0.1, -0.02, g); caixa(0.018, 0.04, 0.02, 'metal', 0, 0.09, -0.46, g);
      g.userData.boca = new THREE.Vector3(0, 0.01, -0.84); g.userData.mira = new THREE.Vector3(0, 0.115, 0);
    },
    b3: function (g) { // fuzil bullpup branco e dourado com luneta 1.5x embutida
      // corpo comprido com o pente atrás do gatilho
      caixa(0.075, 0.11, 0.5, 'branco', 0, -0.01, 0.12, g); caixa(0.08, 0.05, 0.42, 'branco', 0, -0.075, 0.14, g);
      caixa(0.08, 0.012, 0.5, 'ouro', 0, 0.048, 0.12, g); caixa(0.082, 0.012, 0.3, 'ouro', 0, -0.03, 0.2, g);
      cil(0.02, 0.02, 0.36, 'metal', 0, 0.01, -0.3, g); cil(0.026, 0.026, 0.07, 'ouro', 0, 0.01, -0.5, g); cil(0.03, 0.022, 0.05, 'metal', 0, 0.01, -0.555, g);
      // guarda-mão com empunhadura vertical
      caixa(0.07, 0.085, 0.2, 'branco', 0, -0.005, -0.18, g); var emp = caixa(0.035, 0.12, 0.045, 'polimero', 0, -0.1, -0.18, g); emp.rotation.x = -0.15;
      // gatilho na frente do pente, pente transparente atrás
      caixa(0.035, 0.11, 0.05, 'polimero', 0, -0.1, -0.03, g).rotation.x = 0.2; var pente = caixa(0.04, 0.17, 0.07, 'metal', 0, -0.14, 0.2, g); pente.rotation.x = 0.12; g.userData.pente = pente;
      caixa(0.06, 0.13, 0.06, 'branco', 0, -0.03, 0.39, g); // coronha
      // luneta embutida
      cil(0.03, 0.03, 0.2, 'branco', 0, 0.105, 0.05, g); cil(0.038, 0.03, 0.05, 'ouro', 0, 0.105, -0.07, g); cil(0.034, 0.03, 0.04, 'branco', 0, 0.105, 0.16, g);
      caixa(0.03, 0.05, 0.12, 'branco', 0, 0.07, 0.05, g);
      var lente = new THREE.Mesh(new THREE.CircleGeometry(0.034, 16), m('lente')); lente.position.set(0, 0.105, -0.096); lente.rotation.y = Math.PI; g.add(lente);
      g.userData.boca = new THREE.Vector3(0, 0.01, -0.58); g.userData.mira = new THREE.Vector3(0, 0.105, 0);
    },
    vx45: function (g) { // submetralhadora compacta
      caixa(0.065, 0.1, 0.32, 'polimero', 0, 0, -0.02, g); caixa(0.07, 0.04, 0.2, 'oliva', 0, 0.065, -0.05, g);
      cil(0.025, 0.025, 0.22, 'metal', 0, 0.01, -0.29, g); cil(0.03, 0.03, 0.1, 'polimero', 0, 0.01, -0.44, g);
      caixa(0.035, 0.1, 0.05, 'polimero', 0, -0.1, 0.06, g).rotation.x = 0.25;
      var p = caixa(0.035, 0.22, 0.045, 'metal', 0, -0.15, -0.1, g); g.userData.pente = p;
      caixa(0.025, 0.025, 0.25, 'metal', 0, 0.02, 0.22, g); caixa(0.04, 0.07, 0.03, 'polimero', 0, -0.01, 0.34, g);
      caixa(0.05, 0.04, 0.07, 'metal', 0, 0.105, -0.04, g); caixa(0.035, 0.03, 0.01, 'lente', 0, 0.105, -0.075, g);
      g.userData.boca = new THREE.Vector3(0, 0.01, -0.5); g.userData.mira = new THREE.Vector3(0, 0.12, 0);
    },
    l7: function (g) { // sniper azul/roxa com chamas
      caixa(0.07, 0.1, 0.6, 'chamas', 0, 0, -0.05, g); caixa(0.065, 0.13, 0.28, 'chamas', 0, -0.02, 0.33, g); caixa(0.06, 0.06, 0.06, 'polimero', 0, -0.04, 0.48, g);
      cil(0.016, 0.014, 0.6, 'metal', 0, 0.02, -0.64, g); cil(0.026, 0.026, 0.09, 'metal', 0, 0.02, -0.96, g);
      // luneta
      cil(0.032, 0.032, 0.3, 'metal', 0, 0.12, -0.06, g); cil(0.045, 0.032, 0.08, 'metal', 0, 0.12, -0.25, g); cil(0.04, 0.032, 0.06, 'metal', 0, 0.12, 0.11, g);
      var lente = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), m('lente')); lente.position.set(0, 0.12, -0.291); lente.rotation.y = Math.PI; g.add(lente);
      caixa(0.02, 0.05, 0.02, 'metal', 0, 0.075, -0.15, g); caixa(0.02, 0.05, 0.02, 'metal', 0, 0.075, 0.03, g);
      caixa(0.035, 0.1, 0.05, 'polimero', 0, -0.1, 0.12, g).rotation.x = 0.3;
      var p = caixa(0.045, 0.08, 0.1, 'metal', 0, -0.08, -0.08, g); g.userData.pente = p;
      cil(0.008, 0.008, 0.06, 'metalClaro', 0.05, 0.03, 0.06, g).rotation.set(0, 0, Math.PI / 2); // ferrolho
      g.userData.boca = new THREE.Vector3(0, 0.02, -1.0); g.userData.mira = new THREE.Vector3(0, 0.12, 0); g.userData.luneta = true;
    },
    t12: function (g) { // escopeta de madeira
      caixa(0.07, 0.09, 0.3, 'metal', 0, 0, -0.02, g); cil(0.022, 0.022, 0.6, 'metal', 0, 0.025, -0.45, g); cil(0.018, 0.018, 0.5, 'metal', 0, -0.02, -0.4, g);
      var bomba = cil(0.032, 0.032, 0.2, 'madeira', 0, -0.02, -0.38, g); g.userData.bomba = bomba;
      caixa(0.06, 0.1, 0.32, 'madeira', 0, -0.03, 0.28, g).rotation.x = 0.08; caixa(0.04, 0.1, 0.05, 'madeira', 0, -0.09, 0.08, g).rotation.x = 0.3;
      g.userData.pente = bomba; g.userData.boca = new THREE.Vector3(0, 0.025, -0.76); g.userData.mira = new THREE.Vector3(0, 0.08, 0);
    },
    p9: function (g) { // pistola prateada
      caixa(0.045, 0.05, 0.22, 'metalClaro', 0, 0.02, -0.06, g); caixa(0.04, 0.035, 0.18, 'polimero', 0, -0.02, -0.05, g);
      var p = caixa(0.038, 0.13, 0.05, 'polimero', 0, -0.09, 0.02, g); p.rotation.x = 0.22; g.userData.pente = p;
      caixa(0.01, 0.015, 0.01, 'metal', 0, 0.052, -0.16, g); caixa(0.025, 0.015, 0.01, 'metal', 0, 0.052, 0.04, g);
      g.userData.boca = new THREE.Vector3(0, 0.02, -0.18); g.userData.mira = new THREE.Vector3(0, 0.06, 0);
    },
    faca: function (g) {
      var lam = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.045, 0.22), m('metalClaro')); lam.position.set(0, 0.01, -0.14); g.add(lam);
      var ponta = new THREE.Mesh(new THREE.ConeGeometry(0.023, 0.06, 4), m('metalClaro')); ponta.rotation.x = -Math.PI / 2; ponta.scale.set(0.5, 1, 1); ponta.position.set(0, 0.01, -0.28); g.add(ponta);
      caixa(0.03, 0.035, 0.12, 'polimero', 0, 0, 0.03, g); caixa(0.05, 0.05, 0.015, 'metal', 0, 0.005, -0.03, g);
      g.userData.boca = new THREE.Vector3(0, 0, -0.3); g.userData.mira = new THREE.Vector3(0, 0.05, 0);
    },
    gr: function (g) {
      var e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), m('oliva')); e.scale.set(1, 1.2, 1); g.add(e);
      caixa(0.02, 0.03, 0.02, 'metal', 0, 0.06, 0, g); var anel = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.003, 6, 12), m('metalClaro')); anel.position.set(0.025, 0.07, 0); g.add(anel);
      g.userData.boca = new THREE.Vector3(0, 0, 0); g.userData.mira = new THREE.Vector3(0, 0.05, 0);
    }
  };
  AR.modeloProc = function (id) { var g = new THREE.Group(); (CONSTRUIR[id] || CONSTRUIR.ar9)(g); g.traverse(function (o) { if (o.isMesh) o.castShadow = true; }); return g; };
  // modelos 3D do pacote "Low Poly Weapons" (cano aponta para +z)
  var LP = null, GEO = {}, ESC = { ar9: 0.21, b3: 0.2, vx45: 0.13, t12: 0.2, l7: 0.25, p9: 0.07, mun_leve: 0.16, mun_media: 0.13, mun_cartucho: 0.15, mun_pesada: 0.13 };
  AR.carregar = function (cb) { fetch('modelos/armas_lp.json').then(function (r) { return r.json(); }).then(function (d) { LP = d; cb && cb(); }).catch(function () { cb && cb(); }); };
  function lp(id) {
    if (!LP || !LP[id]) return null;
    if (!GEO[id]) GEO[id] = LP[id].map(function (p) { var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p.pos, 3)); if (p.nor) g.setAttribute('normal', new THREE.Float32BufferAttribute(p.nor, 3)); g.setIndex(p.idx); if (!p.nor) g.computeVertexNormals(); return [g, new THREE.MeshLambertMaterial({ color: new THREE.Color(p.cor[0], p.cor[1], p.cor[2]) })]; });
    var gr = new THREE.Group(), dentro = new THREE.Group(); gr.add(dentro); dentro.scale.setScalar(ESC[id] || 0.2);
    GEO[id].forEach(function (gm) { var m = new THREE.Mesh(gm[0], gm[1]); m.castShadow = true; dentro.add(m); });
    gr.userData.lp = true; gr.userData.boca = new THREE.Vector3(0, 0.05, 2.2 * (ESC[id] || 0.2) / 0.2 * 0.45 + 0.4); return gr;
  }
  AR.modelo = function (id) { return lp(id) || AR.modeloProc(id); };
  AR.municao = function (tipo) { return lp('mun_' + tipo); };
})();
