/* Armas 3D (feitas por código) + braços com luva. O cano aponta para -Z. */
(function () {
  'use strict';
  var AR = window.ARMAS3D = {};
  function cv(w, h, f) { var c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
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
      araraBranco: { color: 0xf3f1ec, metalness: 0.1, roughness: 0.28 },
      araraVermelho: { color: 0xd4141c, metalness: 0.2, roughness: 0.3 },
      araraAmarelo: { color: 0xf2c014, metalness: 0.35, roughness: 0.3 },
      araraAzul: { color: 0x1f6fe0, metalness: 0.55, roughness: 0.25 },
      pulseira: { color: 0xe07a20, roughness: 0.6 },
      aco: { color: 0x2c3036, metalness: 0.8, roughness: 0.35 },
      madeiraEsc: { color: 0x3a2412, roughness: 0.8 },
      olivaEsc: { color: 0x37402a, roughness: 0.7 },
      preto: { color: 0x050505, roughness: 0.9 },
      fio: { color: 0xdfe4e8, metalness: 0.95, roughness: 0.12 },
      vidro: { color: 0x9fd8ff, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.25 },
      ponto: { color: 0xff2a1a, emissive: 0xff2a1a, emissiveIntensity: 1 }
    }[nome];
    return (M[nome] = new THREE.MeshStandardMaterial(d));
  }
  function caixa(w, h, d, mt, x, y, z, pai) { var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(mt)); b.position.set(x, y, z); pai.add(b); return b; }
  function cil(r1, r2, comp, mt, x, y, z, pai, seg) { var c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, comp, seg || 12), m(mt)); c.rotation.x = Math.PI / 2; c.position.set(x, y, z); pai.add(c); return c; }

  // perfil lateral (pontos [z, y], z positivo = para trás) extrudado na largura: dá a silhueta de arma de verdade
  function perfil(pts, larg, mt, pai, x, bisel) {
    var s = new THREE.Shape(); s.moveTo(-pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) s.lineTo(-pts[i][0], pts[i][1]); s.closePath();
    var b = bisel == null ? Math.min(0.006, larg * 0.18) : bisel;
    var geo = new THREE.ExtrudeGeometry(s, { depth: larg - b * 2, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 4 });
    geo.translate(0, 0, -(larg - b * 2) / 2); geo.rotateY(Math.PI / 2); geo.computeVertexNormals();
    var me = new THREE.Mesh(geo, m(mt)); me.position.x = x || 0; pai.add(me); return me;
  }
  function anel(r, tubo, mt, z, y, pai) { var t = new THREE.Mesh(new THREE.TorusGeometry(r, tubo, 6, 16), m(mt)); t.position.set(0, y, z); pai.add(t); return t; }
  function trilho(z0, z1, y, pai, mt) { caixa(0.024, 0.008, z1 - z0, mt || 'metal', 0, y, (z0 + z1) / 2, pai); for (var z = z0 + 0.01; z < z1; z += 0.018) caixa(0.03, 0.007, 0.008, mt || 'metal', 0, y + 0.007, z, pai); }
  function miraHolo(z, y, pai) { // mira holográfica pequena
    caixa(0.034, 0.012, 0.06, 'metal', 0, y, z, pai); caixa(0.006, 0.04, 0.05, 'metal', 0.017, y + 0.024, z, pai); caixa(0.006, 0.04, 0.05, 'metal', -0.017, y + 0.024, z, pai); caixa(0.034, 0.006, 0.05, 'metal', 0, y + 0.046, z, pai);
    var v = new THREE.Mesh(new THREE.PlaneGeometry(0.028, 0.034), m('vidro')); v.position.set(0, y + 0.026, z - 0.02); pai.add(v);
    var pt = new THREE.Mesh(new THREE.CircleGeometry(0.002, 8), m('ponto')); pt.position.set(0, y + 0.026, z - 0.019); pai.add(pt);
  }
  function luneta(z, y, comp, r, pai, mt) { // luneta com torres de ajuste
    cil(r, r, comp, mt || 'metal', 0, y, z, pai, 16); cil(r * 1.35, r, comp * 0.18, mt || 'metal', 0, y, z - comp * 0.55, pai, 16); cil(r * 1.25, r, comp * 0.14, mt || 'metal', 0, y, z + comp * 0.55, pai, 16);
    var t1 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, r * 0.9, 10), m('metalClaro')); t1.position.set(0, y + r * 1.1, z); pai.add(t1);
    var t2 = t1.clone(); t2.rotation.z = Math.PI / 2; t2.position.set(r * 1.1, y, z); pai.add(t2);
    var len = new THREE.Mesh(new THREE.CircleGeometry(r * 1.25, 16), m('lente')); len.position.set(0, y, z - comp * 0.64); len.rotation.y = Math.PI; pai.add(len);
    caixa(0.022, 0.035, 0.025, 'metal', 0, y - r - 0.015, z - comp * 0.28, pai); caixa(0.022, 0.035, 0.025, 'metal', 0, y - r - 0.015, z + comp * 0.28, pai);
  }

  // cada arma: grupo com 'boca' (onde sai o tiro), 'pente' (para animar recarga) e 'mira' (ponto da mira). Cano para -Z.
  var CONSTRUIR = {
    ar9: function (g) {
      perfil([[-0.2, 0.05], [0.18, 0.05], [0.34, 0.02], [0.34, -0.08], [0.2, -0.06], [0.06, -0.05], [-0.2, -0.04]], 0.07, 'areia', g);
      cil(0.013, 0.013, 0.36, 'metal', 0, 0.01, -0.38, g); cil(0.02, 0.02, 0.06, 'metal', 0, 0.01, -0.58, g);
      var p = perfil([[-0.16, -0.04], [-0.1, -0.04], [-0.08, -0.2], [-0.15, -0.21]], 0.038, 'metal', g); g.userData.pente = p;
      perfil([[0.03, -0.05], [0.07, -0.05], [0.1, -0.15], [0.06, -0.16]], 0.034, 'polimero', g);
      trilho(-0.14, 0.12, 0.058, g); miraHolo(0.0, 0.065, g);
      g.userData.boca = new THREE.Vector3(0, 0.01, -0.62); g.userData.mira = new THREE.Vector3(0, 0.091, 0);
    },
    vx45: function (g) { // submetralhadora compacta (estilo Vector): polímero preto com detalhes areia
      perfil([[-0.2, 0.045], [0.12, 0.045], [0.14, 0.03], [0.14, -0.04], [0.04, -0.05], [-0.06, -0.12], [-0.12, -0.12], [-0.14, -0.05], [-0.2, -0.04]], 0.062, 'polimero', g);
      perfil([[-0.19, 0.028], [0.1, 0.028], [0.1, 0.012], [-0.19, 0.012]], 0.066, 'areia', g, 0, 0.002);
      cil(0.016, 0.016, 0.12, 'metal', 0, 0.01, -0.26, g); cil(0.026, 0.024, 0.08, 'polimero', 0, 0.01, -0.33, g);
      for (var k = 0; k < 4; k++) caixa(0.054, 0.004, 0.006, 'metal', 0, 0.01 + 0.012 * (k - 1.5), -0.36, g);
      var p = perfil([[-0.105, -0.05], [-0.07, -0.05], [-0.065, -0.3], [-0.1, -0.3]], 0.034, 'metal', g); g.userData.pente = p;
      perfil([[0.02, -0.04], [0.055, -0.045], [0.08, -0.15], [0.045, -0.155]], 0.034, 'polimero', g); // empunhadura
      perfil([[-0.04, -0.05], [-0.005, -0.05], [0.0, -0.08], [-0.04, -0.08]], 0.01, 'metal', g); // guarda-mato
      perfil([[0.14, 0.02], [0.32, 0.03], [0.34, -0.06], [0.31, -0.07], [0.29, -0.02], [0.14, -0.01]], 0.03, 'polimero', g); // coronha dobrável
      trilho(-0.17, 0.08, 0.052, g); miraHolo(-0.03, 0.06, g);
      g.userData.boca = new THREE.Vector3(0, 0.01, -0.38); g.userData.mira = new THREE.Vector3(0, 0.086, 0);
    },
    t12: function (g) { // escopeta pump de madeira e aço azulado
      perfil([[-0.12, 0.045], [0.08, 0.045], [0.1, 0.03], [0.1, -0.04], [-0.12, -0.04]], 0.06, 'aco', g);
      cil(0.02, 0.02, 0.62, 'aco', 0, 0.022, -0.42, g); cil(0.016, 0.016, 0.5, 'aco', 0, -0.022, -0.37, g);
      var bomba = perfil([[-0.44, 0.0], [-0.24, 0.0], [-0.24, -0.048], [-0.44, -0.048]], 0.058, 'madeira', g, 0, 0.01); g.userData.bomba = bomba;
      for (var k = 0; k < 6; k++) caixa(0.062, 0.004, 0.006, 'madeiraEsc', 0, -0.046, -0.42 + k * 0.032, g);
      perfil([[0.08, 0.035], [0.16, 0.02], [0.44, 0.01], [0.46, -0.11], [0.4, -0.12], [0.22, -0.07], [0.15, -0.1], [0.1, -0.1], [0.1, -0.03]], 0.05, 'madeira', g, 0, 0.008);
      caixa(0.052, 0.12, 0.012, 'polimero', 0, -0.055, 0.455, g); // soleira de borracha
      perfil([[0.0, -0.04], [0.05, -0.04], [0.055, -0.08], [-0.005, -0.08]], 0.01, 'aco', g); caixa(0.004, 0.03, 0.006, 'metalClaro', 0, -0.06, 0.025, g);
      var conta = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), m('ouro')); conta.position.set(0, 0.046, -0.72); g.add(conta);
      g.userData.pente = bomba; g.userData.boca = new THREE.Vector3(0, 0.022, -0.74); g.userData.mira = new THREE.Vector3(0, 0.07, 0);
    },
    b3: function (g) { // fuzil bullpup branco e dourado com luneta 1.5x
      perfil([[-0.26, 0.05], [0.4, 0.05], [0.42, -0.02], [0.42, -0.1], [0.3, -0.11], [0.24, -0.05], [0.0, -0.05], [-0.26, -0.03]], 0.074, 'branco', g);
      perfil([[-0.24, 0.054], [0.38, 0.054], [0.38, 0.044], [-0.24, 0.044]], 0.078, 'ouro', g, 0, 0.002);
      perfil([[0.12, -0.03], [0.4, -0.03], [0.4, -0.04], [0.12, -0.04]], 0.078, 'ouro', g, 0, 0.002);
      cil(0.017, 0.017, 0.26, 'metal', 0, 0.01, -0.38, g); cil(0.026, 0.026, 0.07, 'ouro', 0, 0.01, -0.53, g); cil(0.03, 0.022, 0.04, 'metal', 0, 0.01, -0.58, g);
      perfil([[-0.12, -0.04], [-0.07, -0.04], [-0.05, -0.17], [-0.1, -0.17]], 0.034, 'polimero', g); // empunhadura frontal
      perfil([[-0.02, -0.05], [0.02, -0.05], [0.05, -0.16], [0.01, -0.165]], 0.034, 'polimero', g); // empunhadura com gatilho
      var pente = perfil([[0.1, -0.05], [0.15, -0.05], [0.17, -0.22], [0.12, -0.22]], 0.04, 'metal', g); g.userData.pente = pente;
      luneta(0.02, 0.1, 0.18, 0.026, g, 'branco'); caixa(0.03, 0.03, 0.14, 'branco', 0, 0.067, 0.02, g);
      g.userData.boca = new THREE.Vector3(0, 0.01, -0.6); g.userData.mira = new THREE.Vector3(0, 0.1, 0);
    },
    l7: function (g) { // sniper de ferrolho (estilo AWM) com pintura azul/roxa de chamas
      perfil([[-0.3, 0.04], [0.12, 0.045], [0.16, 0.02], [0.5, 0.03], [0.52, -0.1], [0.44, -0.12], [0.38, -0.05], [0.24, -0.05], [0.2, -0.14], [0.13, -0.14], [0.1, -0.05], [-0.3, -0.035]], 0.072, 'chamas', g);
      perfil([[0.42, -0.02], [0.47, -0.02], [0.47, -0.08], [0.42, -0.08]], 0.074, 'polimero', g, 0, 0.003); // apoio de rosto
      caixa(0.07, 0.14, 0.014, 'polimero', 0, -0.035, 0.525, g);
      cil(0.016, 0.013, 0.66, 'metal', 0, 0.015, -0.62, g);
      var freio = cil(0.024, 0.024, 0.09, 'metal', 0, 0.015, -0.98, g); for (var k = 0; k < 3; k++) caixa(0.052, 0.008, 0.012, 'polimero', 0, 0.015, -0.955 - k * 0.022, g);
      luneta(-0.02, 0.115, 0.34, 0.032, g); caixa(0.03, 0.05, 0.3, 'metal', 0, 0.065, -0.02, g);
      var ferrolho = cil(0.008, 0.008, 0.07, 'metalClaro', 0.05, 0.03, 0.08, g); ferrolho.rotation.set(0, 0, Math.PI / 2); var bola = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), m('metalClaro')); bola.position.set(0.085, 0.03, 0.08); g.add(bola);
      var p = perfil([[-0.08, -0.03], [0.0, -0.03], [0.0, -0.1], [-0.08, -0.1]], 0.05, 'metal', g); g.userData.pente = p;
      perfil([[0.115, -0.05], [0.16, -0.05], [0.16, -0.085], [0.115, -0.085]], 0.012, 'metal', g);
      // bipé dobrado
      [-1, 1].forEach(function (s) { var pe = caixa(0.008, 0.008, 0.2, 'metal', s * 0.025, -0.045, -0.35, g); pe.rotation.y = s * 0.04; });
      g.userData.boca = new THREE.Vector3(0, 0.015, -1.03); g.userData.mira = new THREE.Vector3(0, 0.115, 0); g.userData.luneta = true;
    },
    arara: function (g) { // Arara SR: sniper original nas cores da arara (corpo branco, coronha vermelha, frisos amarelos, cano e luneta azuis)
      perfil([[-0.24, 0.045], [0.14, 0.048], [0.17, 0.025], [0.17, -0.05], [0.1, -0.06], [-0.24, -0.04]], 0.07, 'araraBranco', g); // caixa da culatra
      perfil([[-0.42, 0.02], [-0.24, 0.03], [-0.24, -0.04], [-0.42, -0.03]], 0.064, 'araraBranco', g); // guarda-mão
      caixa(0.074, 0.012, 0.6, 'araraAmarelo', 0, 0.0, -0.14, g); // friso amarelo lateral
      perfil([[0.17, 0.03], [0.5, 0.035], [0.53, -0.11], [0.45, -0.13], [0.38, -0.06], [0.24, -0.06], [0.2, -0.15], [0.13, -0.15], [0.11, -0.05], [0.17, -0.05]], 0.074, 'araraVermelho', g); // coronha vermelha com empunhadura
      perfil([[0.42, 0.06], [0.48, 0.06], [0.48, 0.02], [0.42, 0.02]], 0.06, 'araraAmarelo', g); // apoio de rosto amarelo
      caixa(0.078, 0.15, 0.016, 'araraAmarelo', 0, -0.04, 0.535, g); // soleira
      cil(0.018, 0.015, 0.62, 'araraAzul', 0, 0.012, -0.72, g); // cano azul
      cil(0.027, 0.027, 0.1, 'araraAmarelo', 0, 0.012, -1.06, g); cil(0.022, 0.022, 0.03, 'araraAzul', 0, 0.012, -1.12, g); // freio de boca
      luneta(-0.02, 0.12, 0.36, 0.034, g, 'araraAzul'); caixa(0.032, 0.05, 0.3, 'araraAmarelo', 0, 0.07, -0.02, g); // luneta azul + trilho amarelo
      var aneis = [0.12, -0.16]; aneis.forEach(function (z) { cil(0.04, 0.04, 0.02, 'araraAmarelo', 0, 0.12, z - 0.02, g); });
      var fe = cil(0.008, 0.008, 0.08, 'araraAmarelo', 0.05, 0.03, 0.09, g); fe.rotation.set(0, 0, Math.PI / 2); var bola = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), m('araraVermelho')); bola.position.set(0.09, 0.03, 0.09); g.add(bola);
      var p = perfil([[-0.08, -0.04], [0.02, -0.04], [0.02, -0.12], [-0.08, -0.12]], 0.05, 'araraVermelho', g); g.userData.pente = p;
      perfil([[0.115, -0.06], [0.16, -0.06], [0.16, -0.095], [0.115, -0.095]], 0.012, 'araraAmarelo', g); // guarda-mato
      g.userData.boca = new THREE.Vector3(0, 0.012, -1.14); g.userData.mira = new THREE.Vector3(0, 0.12, 0); g.userData.luneta = true;
    },
    p9: function (g) { // pistola: ferrolho prateado, armação preta
      perfil([[-0.16, 0.045], [0.07, 0.045], [0.075, 0.0], [-0.16, 0.0]], 0.042, 'metalClaro', g, 0, 0.004);
      for (var k = 0; k < 6; k++) caixa(0.044, 0.03, 0.004, 'metal', 0, 0.025, 0.035 + k * 0.007, g);
      perfil([[-0.15, 0.002], [0.06, 0.002], [0.08, -0.02], [0.1, -0.15], [0.05, -0.16], [0.02, -0.04], [-0.04, -0.035], [-0.15, -0.02]], 0.038, 'polimero', g);
      perfil([[-0.035, -0.035], [0.015, -0.035], [0.02, -0.07], [-0.035, -0.065]], 0.01, 'polimero', g);
      var p = caixa(0.03, 0.02, 0.04, 'metal', 0, -0.155, 0.075, g); g.userData.pente = p;
      caixa(0.006, 0.012, 0.008, 'metal', 0, 0.052, -0.15, g); caixa(0.026, 0.012, 0.008, 'metal', 0, 0.052, 0.06, g);
      var furo = new THREE.Mesh(new THREE.CircleGeometry(0.007, 10), m('preto')); furo.position.set(0, 0.024, -0.161); furo.rotation.y = Math.PI; g.add(furo);
      g.userData.boca = new THREE.Vector3(0, 0.024, -0.17); g.userData.mira = new THREE.Vector3(0, 0.06, 0);
    },
    faca: function (g) { // faca de combate (lâmina com ponta clip, guarda e cabo emborrachado)
      perfil([[-0.3, 0.012], [-0.24, 0.03], [-0.04, 0.03], [-0.04, -0.02], [-0.2, -0.02], [-0.27, -0.008]], 0.008, 'metalClaro', g, 0, 0.001);
      perfil([[-0.28, 0.0], [-0.04, 0.0], [-0.04, -0.018], [-0.2, -0.018], [-0.26, -0.007]], 0.009, 'fio', g, 0, 0.0005);
      caixa(0.04, 0.07, 0.012, 'metal', 0, 0.005, -0.035, g);
      perfil([[-0.03, 0.022], [0.09, 0.02], [0.1, 0.0], [0.09, -0.02], [-0.03, -0.022]], 0.03, 'polimero', g, 0, 0.006);
      for (var k = 0; k < 5; k++) caixa(0.032, 0.046, 0.005, 'metal', 0, 0, -0.01 + k * 0.022, g);
      g.userData.boca = new THREE.Vector3(0, 0, -0.3); g.userData.mira = new THREE.Vector3(0, 0.05, 0);
    },
    gr: function (g) { // granada de fragmentação
      var e = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 12), m('oliva')); e.scale.set(1, 1.18, 1); g.add(e);
      for (var k = 0; k < 4; k++) { var r = new THREE.Mesh(new THREE.TorusGeometry(0.0425 - Math.abs(k - 1.5) * 0.004, 0.0025, 4, 20), m('olivaEsc')); r.rotation.x = Math.PI / 2; r.position.y = -0.03 + k * 0.02; g.add(r); }
      cil(0.014, 0.016, 0.03, 'metal', 0, 0.055, 0, g).rotation.x = 0;
      var alav = caixa(0.012, 0.075, 0.008, 'metalClaro', 0.018, 0.035, 0, g); alav.rotation.z = -0.12;
      var argola = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0025, 6, 14), m('metalClaro')); argola.position.set(-0.022, 0.07, 0); argola.rotation.y = Math.PI / 2; g.add(argola);
      g.userData.boca = new THREE.Vector3(0, 0, 0); g.userData.mira = new THREE.Vector3(0, 0.05, 0);
    }
  };

  /* ---------- skins das coleções (pinturas feitas no código) ---------- */
  var SKIN_TEX = {};
  function texSkin(nome) {
    if (SKIN_TEX[nome]) return SKIN_TEX[nome];
    var c = document.createElement('canvas'); c.width = 256; c.height = 128; var g = c.getContext('2d'), w = 256, h = 128, i;
    if (nome === 'cupido') { var gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#ff7eb6'); gr.addColorStop(1, '#ffffff'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (i = 0; i < 22; i++) { var x = Math.random() * w, y = Math.random() * h, r = 5 + Math.random() * 9; g.fillStyle = i % 3 ? '#e1137b' : '#ff2d6f'; g.beginPath(); g.moveTo(x, y + r * 0.9); g.bezierCurveTo(x - r * 1.4, y, x - r * 0.6, y - r * 1.1, x, y - r * 0.3); g.bezierCurveTo(x + r * 0.6, y - r * 1.1, x + r * 1.4, y, x, y + r * 0.9); g.fill(); } }
    else if (nome === 'neon') { g.fillStyle = '#0d0f14'; g.fillRect(0, 0, w, h); for (i = 0; i < 9; i++) { g.strokeStyle = i % 2 ? '#25f4ff' : '#ff2bd6'; g.lineWidth = 3; g.shadowColor = g.strokeStyle; g.shadowBlur = 8; g.beginPath(); g.moveTo(-20 + i * 34, h); g.lineTo(20 + i * 34, 0); g.stroke(); } g.shadowBlur = 0; }
    else if (nome === 'punk') { g.fillStyle = '#111'; g.fillRect(0, 0, w, h); var cores = ['#ffe600', '#ff2bd6', '#25d0ff', '#ff5a1f', '#7cff3a', '#ffffff'];
      for (i = 0; i < 40; i++) { g.fillStyle = cores[i % cores.length]; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 20, 4 + Math.random() * 12, Math.random() * 3, 0, 7); g.fill(); }
      for (i = 0; i < 12; i++) { g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(Math.random() * w, Math.random() * h); g.bezierCurveTo(Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h); g.stroke(); } }
    else if (nome === 'brasa') { g.fillStyle = '#1a0d05'; g.fillRect(0, 0, w, h); for (i = 0; i < 14; i++) { var x0 = i * 20; g.fillStyle = i % 2 ? '#ff6a00' : '#ffb020'; g.beginPath(); g.moveTo(x0, h); g.quadraticCurveTo(x0 + 8, h * 0.45, x0 + 22, h * 0.05); g.quadraticCurveTo(x0 + 12, h * 0.5, x0 + 30, h); g.fill(); } }
    else { g.fillStyle = '#888'; g.fillRect(0, 0, w, h); }
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return (SKIN_TEX[nome] = new THREE.MeshStandardMaterial({ map: t, metalness: 0.35, roughness: 0.4, emissive: nome === 'neon' ? 0x222244 : 0x000000 }));
  }
  function pintar(g, skin) { var m = texSkin(skin); g.traverse(function (o) { if (o.isMesh && o.material && !(o.material.color && o.material.color.getHex() === 0x3fd0ff)) { var cor = o.material.color ? o.material.color.getHSL({}) : { l: 0.5 }; if (!o.material.map || o.material.map) o.material = m; } }); return g; }
  AR.modelo = function (id) { var A0 = window.REGRAS && window.REGRAS.ARMAS[id], base = A0 && A0.base; var g = new THREE.Group(); (CONSTRUIR[base || id] || CONSTRUIR.ar9)(g); if (base && A0.skin) pintar(g, A0.skin); g.traverse(function (o) { if (o.isMesh) o.castShadow = true; }); return g; };


  /* ---------- modelos de fora (convertidos de .glb) ---------- */
  var EXTRA = {}, EXTRA_CFG = {
    // AUG A3 4th Point Blank — Shiro (CC-BY 4.0). Modelo convertido do GLB enviado.
    // boca/mira em coordenadas do próprio modelo (antes de girar e escalar)
    // Vermilion Bird — Ziky Andeska (CC-BY 4.0): sniper lendária da loja
    vb: { arq: 'modelos/vermilion.json', esc: 0.6, off: [0, -0.09, -0.132], rot: [0, 0, 0], longe: true, boca: [0, 0.197, -0.843], mira: [0, 0.27, -0.1] },
    ar9: { arq: 'modelos/aug_a3.json', esc: 0.11, off: [0.027, -0.066, 0], rot: [0, Math.PI / 2, 0], longe: true, boca: [3.55, 0.84, 0.06], mira: [0.25, 1.585, -0.235] }
  };
  AR.carregarExtras = function (pronto) {
    Object.keys(EXTRA_CFG).forEach(function (id) {
      var cfg = EXTRA_CFG[id];
      fetch(cfg.arq).then(function (r) { return r.json(); }).then(function (d) {
        var base = cfg.arq.replace(/[^\/]+$/, ''), g = new THREE.Group();
        d.partes.forEach(function (p) {
          var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p.pos, 3));
          if (p.nor) geo.setAttribute('normal', new THREE.Float32BufferAttribute(p.nor, 3)); else geo.computeVertexNormals();
          if (p.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(p.uv, 2)); geo.setIndex(p.idx);
          var t = null; if (p.tex) { t = new THREE.TextureLoader().load(/^data:/.test(p.tex) ? p.tex : base + p.tex); t.encoding = THREE.sRGBEncoding; t.flipY = false; t.anisotropy = AR.anisotropia; t.wrapS = t.wrapT = THREE.RepeatWrapping; }
          g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, color: 0xffffff, roughness: 0.48, metalness: 0.18, side: THREE.DoubleSide })));
        });
        EXTRA[id] = g; if (pronto) pronto(id);
      }).catch(function () {});
    });
  };
  var _modeloProc = AR.modelo;
  AR.modelo = function (id, naMao) {
    var cfg = EXTRA_CFG[id];
    if (!EXTRA[id]) return _modeloProc(id);
    var g = new THREE.Group(), m = EXTRA[id].clone(); m.scale.setScalar(cfg.esc); m.position.set(cfg.off[0], cfg.off[1], cfg.off[2]); if (cfg.rot) m.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]); g.add(m);
    function pt(v) { return new THREE.Vector3(v[0], v[1], v[2]).applyEuler(m.rotation).multiplyScalar(cfg.esc).add(m.position); }
    g.userData.boca = pt(cfg.boca); g.userData.mira = pt(cfg.mira); g.userData.mira.x = 0; g.userData.longe = cfg.longe;
    return g;
  };
  // braços em primeira pessoa: manga tática camuflada, punho dobrado, luva com dedos e protetor
  var MAT_BRACO = null;
  function matsBraco() {
    if (MAT_BRACO) return MAT_BRACO;
    var camu = cv(128, 128, function (g, w, h) { g.fillStyle = '#5b6145'; g.fillRect(0, 0, w, h); var cs = ['#3d4330', '#7a7552', '#4a3e2c', '#6b7350']; for (var i = 0; i < 70; i++) { g.fillStyle = cs[i % 4]; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 16, 4 + Math.random() * 9, Math.random() * 3, 0, 7); g.fill(); } for (var k = 0; k < 400; k++) { g.fillStyle = 'rgba(0,0,0,' + Math.random() * 0.15 + ')'; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); } });
    camu.wrapS = camu.wrapT = THREE.RepeatWrapping; camu.repeat.set(2, 2);
    var luva = cv(64, 64, function (g, w, h) { g.fillStyle = '#2b2a28'; g.fillRect(0, 0, w, h); for (var i = 0; i < 400; i++) { g.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.05 + ')'; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); } });
    MAT_BRACO = {
      manga: new THREE.MeshStandardMaterial({ map: camu, roughness: 0.95 }),
      punho: new THREE.MeshStandardMaterial({ color: 0x40452f, roughness: 0.95 }),
      luva: new THREE.MeshStandardMaterial({ map: luva, roughness: 0.8 }),
      pad: new THREE.MeshStandardMaterial({ color: 0x1a1a19, roughness: 0.5, metalness: 0.1 }),
      relogio: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.4 }),
      tela: new THREE.MeshBasicMaterial({ color: 0x4fd06a })
    };
    return MAT_BRACO;
  }
  AR.bracos = function () {
    var g = new THREE.Group(), MB = matsBraco();
    function mesh(geo, mt, x, y, z, pai) { var me = new THREE.Mesh(geo, mt); me.position.set(x, y, z); pai.add(me); return me; }
    function braco(lado) {
      var b = new THREE.Group();
      // antebraço: manga mais grossa perto do cotovelo, dobra no punho
      var manga = mesh(new THREE.CylinderGeometry(0.036, 0.047, 0.34, 14), MB.manga, 0, 0, 0.2, b); manga.rotation.x = Math.PI / 2;
      for (var k = 0; k < 3; k++) { var dobra = mesh(new THREE.TorusGeometry(0.041 + k * 0.002, 0.006, 6, 14), MB.manga, 0, 0, 0.1 + k * 0.07, b); dobra.scale.set(1, 0.95, 1); }
      mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.035, 14), MB.punho, 0, 0, 0.038, b).rotation.x = Math.PI / 2;
      if (lado < 0) { // relógio tático no braço esquerdo
        mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.018, 14), MB.relogio, 0, 0, 0.068, b).rotation.x = Math.PI / 2;
        var vis = mesh(new THREE.BoxGeometry(0.028, 0.006, 0.024), MB.relogio, 0, 0.037, 0.068, b); mesh(new THREE.PlaneGeometry(0.02, 0.016), MB.tela, 0, 0.0405, 0.068, b).rotation.x = -Math.PI / 2;
      }
      // mão: palma, protetor de dedos, quatro dedos dobrados e polegar
      var mao = new THREE.Group(); mao.position.z = -0.03; b.add(mao);
      mesh(new THREE.BoxGeometry(0.078, 0.034, 0.085), MB.luva, 0, 0, -0.035, mao);
      mesh(new THREE.BoxGeometry(0.06, 0.012, 0.05), MB.pad, 0, 0.022, -0.04, mao);
      for (var d = 0; d < 4; d++) {
        var x = -0.027 + d * 0.018, compr = d === 1 || d === 2 ? 0.046 : 0.04;
        var f1 = mesh(new THREE.CylinderGeometry(0.0085, 0.009, compr, 8), MB.luva, x, -0.002, -0.078 - compr / 2 + 0.006, mao); f1.rotation.x = Math.PI / 2 + 0.25;
        var f2 = mesh(new THREE.CylinderGeometry(0.0078, 0.0085, compr * 0.8, 8), MB.luva, x, -0.022, -0.1 - compr * 0.5, mao); f2.rotation.x = 0.35;
        mesh(new THREE.BoxGeometry(0.014, 0.007, 0.012), MB.pad, x, 0.008, -0.083, mao);
      }
      var pol = mesh(new THREE.CylinderGeometry(0.0095, 0.01, 0.055, 8), MB.luva, -lado * 0.042, -0.012, -0.06, mao); pol.rotation.set(Math.PI / 2 - 0.2, 0, lado * 0.55);
      g.add(b); return b;
    }
    g.userData.dir = braco(1); g.userData.esq = braco(-1);
    return g;
  };
  // onde as mãos ficam em cada arma [direita(x,y,z,rx,ry), esquerda]
  AR.maos = {
    ar9: [[0.007, -0.13, 0.10, 0.7, 0.25], [0.011, -0.10, -0.115, 0.9, -0.45]],
    b3: [[0.02, -0.08, -0.02, -0.2, 0.25], [-0.02, -0.12, -0.2, 0.6, -0.3]],
    vx45: [[0.02, -0.08, 0.08, -0.2, 0.25], [-0.02, -0.12, -0.12, 0.6, -0.3]],
    l7: [[0.02, -0.08, 0.15, -0.25, 0.25], [-0.03, -0.05, -0.32, 0.15, -0.4]],
    arara: [[0.02, -0.08, 0.15, -0.25, 0.25], [-0.03, -0.05, -0.34, 0.15, -0.4]],
    vb: [[0.005, -0.11, 0.07, 0.7, 0.25], [0.01, -0.09, -0.2, 0.9, -0.45]],
    t12: [[0.02, -0.08, 0.1, -0.2, 0.25], [-0.03, -0.05, -0.38, 0.15, -0.4]],
    p9: [[0.01, -0.09, 0.05, -0.2, 0.15], [-0.04, -0.1, 0.07, -0.1, -0.5]],
    faca: [[0.01, -0.02, 0.06, -0.1, 0.1], [-0.25, -0.15, 0.2, 0, -0.3]],
    gr: [[0.01, -0.04, 0.05, -0.1, 0.1], [-0.25, -0.15, 0.2, 0, -0.3]]
  };

  /* ---------- personagens de equipe em terceira pessoa (com esqueleto) ---------- */
  // Os modelos vêm sem ossos; o conversor criou um esqueleto (quadril, coluna, peito, cabeça,
  // braços, pernas) e os pesos de cada vértice. Aqui montamos o SkinnedMesh e animamos os ossos.
  var PERSONAGENS = { r: null, b: null }; AR.personagensProntos = false; AR.anisotropia = 4;
  var ONDE_ARMA = new THREE.Vector3(0.09, 1.13, -0.18);           // onde a arma fica (corpo em pé, olhando -Z)
  var MAO_D = new THREE.Vector3(0.11, 1.11, -0.15), MAO_E = new THREE.Vector3(0.03, 1.12, -0.40);
  function prepararPersonagem(d, base) {
    var texs = {}, pos = {};
    d.ossos.forEach(function (o) { pos[o.n] = new THREE.Vector3(o.p[0], o.p[1], o.p[2]); });
    var partes = d.partes.map(function (p) {
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(p.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(p.nor, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(p.uv, 2)); geo.setIndex(p.idx);
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(p.si, 4));
      geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(p.sw, 4));
      var t = texs[p.tex];
      if (!t) { t = texs[p.tex] = new THREE.TextureLoader().load(base + p.tex); t.encoding = THREE.sRGBEncoding; t.flipY = false; t.anisotropy = AR.anisotropia; t.wrapS = t.wrapT = THREE.RepeatWrapping; }
      return { geo: geo, mat: new THREE.MeshLambertMaterial({ map: t, skinning: true, side: THREE.DoubleSide, alphaTest: p.alfa ? 0.5 : 0 }) };
    });
    // pose de mira calculada uma vez (IK de 2 ossos para cada braço)
    var mira = {};
    [['D', MAO_D, new THREE.Vector3(0.6, -1, 0.3)], ['E', MAO_E, new THREE.Vector3(-0.8, -1, 0)]].forEach(function (b) {
      var S = pos['ombro' + b[0]], C = pos['cotovelo' + b[0]], P = pos['pulso' + b[0]];
      var la = S.distanceTo(C), lb = C.distanceTo(P), T = b[1];
      var d0 = Math.min(S.distanceTo(T), la + lb - 0.005), dir = T.clone().sub(S).normalize();
      var x = (la * la - lb * lb + d0 * d0) / (2 * d0), h = Math.sqrt(Math.max(0, la * la - x * x));
      var polo = b[2].clone().normalize(); polo.sub(dir.clone().multiplyScalar(polo.dot(dir))).normalize();
      var E = S.clone().add(dir.clone().multiplyScalar(x)).add(polo.multiplyScalar(h));
      var qa = new THREE.Quaternion().setFromUnitVectors(C.clone().sub(S).normalize(), E.clone().sub(S).normalize());
      var qw = new THREE.Quaternion().setFromUnitVectors(P.clone().sub(C).normalize(), S.clone().add(dir.clone().multiplyScalar(d0)).sub(E).normalize());
      mira['ombro' + b[0]] = qa; mira['cotovelo' + b[0]] = qa.clone().invert().multiply(qw);
    });
    return { ossos: d.ossos, pos: pos, partes: partes, mira: mira };
  }
  function montarPersonagem(M) {
    var raiz = new THREE.Group(), ossos = {}, lista = [];
    M.ossos.forEach(function (o) {
      var b = new THREE.Bone(); b.name = o.n; var p = M.pos[o.n], pai = o.pai ? M.pos[o.pai] : new THREE.Vector3();
      b.position.copy(p).sub(pai); (o.pai ? ossos[o.pai] : raiz).add(b); ossos[o.n] = b; lista.push(b);
    });
    raiz.updateMatrixWorld(true);
    var esq = new THREE.Skeleton(lista);
    M.partes.forEach(function (pt) { if (!pt.geo.boundingSphere || !pt.geo.userData.esfera) { pt.geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.95, 0), 1.6); pt.geo.userData.esfera = true; } var m = new THREE.SkinnedMesh(pt.geo, pt.mat); m.castShadow = AR.sombraPersonagens !== false; m.frustumCulled = true; raiz.add(m); });
    raiz.updateMatrixWorld(true);
    raiz.children.forEach(function (m) { if (m.isSkinnedMesh) m.bind(esq); });
    Object.keys(M.mira).forEach(function (k) { ossos[k].quaternion.copy(M.mira[k]); });
    return { raiz: raiz, ossos: ossos };
  }
  AR.carregarPersonagem = function (pronto) {
    var pend = 2;
    function carregar(time, arq) {
      fetch(arq).then(function (r) { return r.json(); }).then(function (d) {
        PERSONAGENS[time] = prepararPersonagem(d, arq.replace(/[^\/]+$/, ''));
        if (!--pend) { AR.personagensProntos = true; if (pronto) pronto(); }
      }).catch(function (e) { console.warn('personagem não carregou', arq, e); setTimeout(function () { carregar(time, arq); }, 1500); });
    }
    carregar('r', 'modelos/tarantula.json');
    carregar('b', 'modelos/judy_chou.json');
  };

  // só existem os dois personagens enviados: Tarantula (vermelho) e Judy Chou (azul).
  // No modo todos-contra-todos cada jogador pega um dos dois pelo id.
  var SKIN_ESPERA = {};
  AR.carregarSkin = function (id, pronto) {
    if (PERSONAGENS[id]) return pronto && pronto();
    if (SKIN_ESPERA[id]) { if (pronto) SKIN_ESPERA[id].push(pronto); return; }
    SKIN_ESPERA[id] = pronto ? [pronto] : [];
    fetch('modelos/' + id + '.json').then(function (r) { return r.json(); }).then(function (d) {
      PERSONAGENS[id] = prepararPersonagem(d, 'modelos/'); var l = SKIN_ESPERA[id]; SKIN_ESPERA[id] = null; l.forEach(function (f) { f(); });
    }).catch(function () { SKIN_ESPERA[id] = null; });
  };
  AR.temSkin = function (id) { return !!PERSONAGENS[id]; };
  AR.soldado = function (time, id, skin) {
    var lado = time === 'b' ? 'b' : time === 'r' ? 'r' : ((id || 0) % 2 ? 'b' : 'r');
    if (skin && PERSONAGENS[skin]) lado = skin;
    var modelo = PERSONAGENS[lado];
    var g = new THREE.Group(), arma = new THREE.Group();
    if (!modelo) { g.userData = { vazio: true, arma: arma, armaId: null }; return g; } // ainda carregando: troca sozinho quando chegar
    var p = montarPersonagem(modelo), o = p.ossos; g.add(p.raiz);
    arma.position.copy(ONDE_ARMA).sub(modelo.pos.peito); o.peito.add(arma);
    g.userData = { personagem: true, ossos: o, quadrilY: o.quadril.position.y, arma: arma, f: 0, ag: 0, armaId: null, larguraPeito: lado === 'r' ? 0.37 : 0.33, skin: skin || null, coleteY: lado === 'r' ? -0.05 : -0.07, coleteZ: lado === 'r' ? -0.02 : 0.0 };
    return g;
  };
  /* ---------- coletes (loja): carregados só quando alguém usa ---------- */
  var COLETE = {}, COLETE_ESPERA = {};
  AR.carregarColete = function (id, pronto) {
    if (COLETE[id]) return pronto && pronto(COLETE[id]);
    if (COLETE_ESPERA[id]) { if (pronto) COLETE_ESPERA[id].push(pronto); return; }
    COLETE_ESPERA[id] = pronto ? [pronto] : [];
    fetch('modelos/' + id + '.json').then(function (r) { return r.json(); }).then(function (d) {
      var g = new THREE.Group();
      d.partes.forEach(function (p) {
        var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p.pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(p.nor, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(p.uv, 2)); geo.setIndex(p.idx);
        var t = new THREE.TextureLoader().load('modelos/' + p.tex); t.encoding = THREE.sRGBEncoding; t.flipY = false; t.anisotropy = AR.anisotropia; t.wrapS = t.wrapT = THREE.RepeatWrapping;
        var m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide })); m.castShadow = true; g.add(m);
      });
      COLETE[id] = g; var l = COLETE_ESPERA[id]; COLETE_ESPERA[id] = null; l.forEach(function (f) { f(g); });
    }).catch(function () { COLETE_ESPERA[id] = null; });
  };
  AR.modeloColete = function (id, pronto) { AR.carregarColete(id, function (g) { pronto(g.clone()); }); };
  // O colete NÃO aparece no corpo (fica invisível para não bugar a roupa); só protege. Ligue COLETE_VISIVEL para mostrar.
  var COLETE_VISIVEL = false;
  AR.coleteSoldado = function (s, id) {
    var u = s.userData; if (!u || !u.personagem) return; u.coleteId = id; if (!COLETE_VISIVEL) return;
    if (u.coleteM) { u.coleteM.parent.remove(u.coleteM); u.coleteM = null; } u.coleteId = id;
    if (!id) return;
    AR.carregarColete(id, function (g) {
      if (u.coleteId !== id || u.coleteM) return;
      var m = g.clone(), larg = id === 'colete3' ? 0.81 : 0.44, k = (u.larguraPeito || 0.36) * 1.12 / Math.min(larg, 0.46);
      m.scale.setScalar(k); m.position.set(0, u.coleteY || -0.06, u.coleteZ || 0); u.ossos.peito.add(m); u.coleteM = m;
    });
  };
  AR.armaSoldado = function (s, id) {
    var u = s.userData; if (u.armaId === id) return; u.armaId = id;
    while (u.arma.children.length) u.arma.remove(u.arma.children[0]);
    var mo = AR.modelo(id); mo.scale.setScalar(1.15); u.arma.add(mo);
  };
  AR.animarSoldado = function (s, vel, agachado, pitch, dt) {
    var u = s.userData; if (!u.personagem) return; u.f += dt * (vel > 0.3 ? 9 : 1.5);
    if (u.personagem) {
      var o = u.ossos, anda = vel > 0.3, sn = anda ? Math.sin(u.f) : 0, cs = anda ? Math.cos(u.f) : 0;
      u.ag += ((agachado ? 1 : 0) - u.ag) * Math.min(1, dt * 10); var ag = u.ag, amp = 0.55 * (1 - ag * 0.6);
      o.quadril.position.y = u.quadrilY - ag * 0.27 + (anda ? Math.abs(cs) * 0.03 - 0.015 : 0);
      o.coxaD.rotation.x = sn * amp + ag * 0.95; o.coxaE.rotation.x = -sn * amp + ag * 0.95;
      o.joelhoD.rotation.x = -ag * 1.6 - Math.max(0, cs) * 0.9 * (1 - ag * 0.6);
      o.joelhoE.rotation.x = -ag * 1.6 - Math.max(0, -cs) * 0.9 * (1 - ag * 0.6);
      // corpo solto: respiração parada, gingado andando, mira suavizada
      var resp = Math.sin(u.t = (u.t || Math.random() * 9) + dt * 2.2);
      if (!(u.pt === u.pt) || u.pt == null) u.pt = pitch; u.pt += (pitch - u.pt) * Math.min(1, dt * 12);
      o.quadril.rotation.y = sn * 0.1; o.quadril.rotation.z = sn * 0.04;
      o.coluna.rotation.y = -sn * 0.1; o.coluna.rotation.z = -sn * 0.03 + resp * 0.006;
      o.coluna.rotation.x = -ag * 0.3 + (anda ? -0.08 : 0);
      o.peito.rotation.x = u.pt * 0.85 + ag * 0.3 + resp * 0.015 + (anda ? 0.08 + Math.abs(cs) * 0.03 : 0);
      o.peito.rotation.y = cs * 0.05;
      o.cabeca.rotation.x = u.pt * 0.15 - resp * 0.01; o.cabeca.rotation.y = -cs * 0.06;
      return;
    }
  };
})();
