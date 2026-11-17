/* QUEDA LIVRE — o jogo: lobby, vagão de espera, trem voador, queda livre, loot, tiros, gelo, zona e HUD. */
(function () {
  'use strict';
  var G = window.REGRAS, R = G.R, A = G.ARMAS, S = window.SOM, BO = window.BONECO, MU = window.MUNDO, AR = window.ARMAS3D;
  var $ = function (id) { return document.getElementById(id); };
  function ler(k, p) { try { var v = localStorage.getItem(k); return v === null ? p : v; } catch (e) { return p; } }
  function gravar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var EST = ['cabine', 'trem', 'ar', 'para', 'chao', 'morto'];
  var celular = matchMedia('(pointer: coarse)').matches;
  var cfg = { qual: ler('ql_qual', celular ? 'media' : 'alta'), sens: +ler('ql_sens2', 1.7) };

  /* ---------- 3D ---------- */
  var renderer = new THREE.WebGLRenderer({ antialias: cfg.qual === 'alta', powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = cfg.qual === 'alta'; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  function pixel() { renderer.setPixelRatio(Math.min(devicePixelRatio || 1, cfg.qual === 'alta' ? 2 : cfg.qual === 'media' ? 1.25 : 0.85)); }
  pixel(); $('tres').appendChild(renderer.domElement);
  var cena = new THREE.Scene(), NEB = 0xcfe9ff; cena.fog = new THREE.Fog(NEB, 160, 520);
  var cam = new THREE.PerspectiveCamera(70, 1, 0.1, 2000);
  var sol = new THREE.DirectionalLight(0xfff1d6, 0.95); sol.position.set(80, 140, 50); cena.add(sol); cena.add(sol.target);
  var hemi = new THREE.HemisphereLight(0xdbeeff, 0x6a8a4a, 0.62); cena.add(hemi);
  if (renderer.shadowMap.enabled) { sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); var sc = sol.shadow.camera; sc.left = sc.bottom = -45; sc.right = sc.top = 45; sc.near = 10; sc.far = 320; sol.shadow.bias = -0.0006; }
  function ajustar() { renderer.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
  addEventListener('resize', ajustar); ajustar();
  var CEU = MU.ceu(cena), ZONA = MU.zona(cena), TREM = MU.trem(cena); ZONA.mesh.visible = false;

  /* ---------- estado ---------- */
  var esperandoPartida = false, esperaT = 0, modo = 'lobby', meuId = 0, ilha = null, I = null, P = null; // P = partida atual
  var eu = { x: 0, y: 0, z: 0, vy: 0, ry: 0, est: 'cabine', chao: true, ag: false };
  var inv = { a: [null, null], at: -1, m: {}, c: [0, 0], k: [0, 0], kit: 0, g: 0, mi: [], kl: 0, rc: 0, cu: 0, hp: 200 };
  var ui = { yaw: 0, pitch: 0.02, joy: { x: 0, y: 0 }, tiro: false, ads: false, recuo: 0 };
  var outros = {}, itensMesh = {}, gelos = {}, meuBoneco = null, minhaRoupa = +ler('ql_roupa', 0), meuNome = ler('ql_nome', '');
  var teclas = {};

  /* ---------- LOBBY: sala com janelão ---------- */
  var lobby = null;
  function montarLobby() {
    if (!ilha || P) { trocarIlha(777); }
    var c = I.cidades[0], ang = Math.atan2(c.z, c.x), px = c.x + Math.cos(ang) * (c.r + 34), pz = c.z + Math.sin(ang) * (c.r + 34), py = Math.max(G.altura(I, px, pz), c.alt) + 6;
    if (lobby) cena.remove(lobby.g);
    var g = new THREE.Group(); g.position.set(px, py, pz); g.rotation.y = Math.atan2(c.x - px, c.z - pz) + Math.PI; cena.add(g);
    var mEsc = new THREE.MeshPhongMaterial({ color: 0x1a2a6c, shininess: 60 }), mNeon = new THREE.MeshBasicMaterial({ color: 0x4fe3ff }), mPiso = new THREE.MeshPhongMaterial({ color: 0xe8eef8, shininess: 100, specular: 0x8899aa }), mRoxo = new THREE.MeshBasicMaterial({ color: 0xb24bff });
    var piso = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.3, 48), mPiso); piso.position.y = -0.15; g.add(piso);
    var plat = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.65, 0.22, 48), new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 120 })); plat.position.y = 0.11; g.add(plat);
    var anel = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.05, 8, 64), mNeon); anel.rotation.x = Math.PI / 2; anel.position.y = 0.2; g.add(anel);
    var anel2 = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.04, 8, 80), mRoxo); anel2.rotation.x = Math.PI / 2; anel2.position.y = 0.02; g.add(anel2);
    // parede do fundo com janelão de cantos redondos (a ilha aparece lá fora)
    var forma = new THREE.Shape(); forma.moveTo(-12, -1); forma.lineTo(12, -1); forma.lineTo(12, 9); forma.lineTo(-12, 9); forma.lineTo(-12, -1);
    var buraco = new THREE.Path(), W = 7.5, H = 2.6, rr = 2.2, cy = 3.1; buraco.moveTo(-W + rr, cy - H); buraco.lineTo(W - rr, cy - H); buraco.quadraticCurveTo(W, cy - H, W, cy - H + rr); buraco.lineTo(W, cy + H - rr); buraco.quadraticCurveTo(W, cy + H, W - rr, cy + H); buraco.lineTo(-W + rr, cy + H); buraco.quadraticCurveTo(-W, cy + H, -W, cy + H - rr); buraco.lineTo(-W, cy - H + rr); buraco.quadraticCurveTo(-W, cy - H, -W + rr, cy - H); forma.holes.push(buraco);
    var parede = new THREE.Mesh(new THREE.ExtrudeGeometry(forma, { depth: 0.8, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.25, bevelSegments: 3 }), mEsc); parede.position.set(0, 0, -5.2); g.add(parede);
    var pts = buraco.getPoints(40).map(function (p) { return new THREE.Vector3(p.x, p.y, 0); }); var curva = new THREE.CatmullRomCurve3(pts, true);
    var neon = new THREE.Mesh(new THREE.TubeGeometry(curva, 120, 0.09, 8, true), mNeon); neon.position.set(0, 0, -4.15); g.add(neon);
    var neon2 = neon.clone(); neon2.scale.set(1.04, 1.07, 1); neon2.material = mRoxo; neon2.position.z = -4.2; g.add(neon2);
    // laterais com faixas de luz
    [-1, 1].forEach(function (s) { var lat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 10), mEsc); lat.position.set(s * 8.2, 3, -1); lat.rotation.y = s * -0.5; g.add(lat); for (var k = 0; k < 3; k++) { var f = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 6), k === 1 ? mRoxo : mNeon); f.position.set(s * 7.85, 0.6 + k * 0.5, -1); f.rotation.y = s * -0.5; g.add(f); } });
    var teto = new THREE.Mesh(new THREE.BoxGeometry(24, 0.5, 12), mEsc); teto.position.set(0, 7, -1); g.add(teto);
    var luz = new THREE.PointLight(0x9fdcff, 0.9, 14); luz.position.set(0, 4, 2); g.add(luz);
    if (meuBoneco) g.remove(meuBoneco.raiz);
    meuBoneco = BO.criar(minhaRoupa); g.add(meuBoneco.raiz); meuBoneco.raiz.position.y = 0.22;
    lobby = { g: g, giro: 0, t: 0, trem: 0 };
    $('lBoneco').textContent = 'Soldado'; $('btAnt').hidden = $('btProx').hidden = true;
  }
  function trocarIlha(seed) {
    if (ilha) { cena.remove(ilha.grupo); ilha.grupo.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); }
    I = G.gerar(seed); ilha = MU.ilha(cena, I, { leve: cfg.qual === 'baixa' }); desenharMapaBase();
  }
  function quadroLobby(dt) {
    var L = lobby; L.t += dt; L.giro += (0 - L.giro) * 0.02;
    var g = L.g, base = new THREE.Vector3(0, 1.25, 4.4).applyMatrix4(g.matrixWorld), alvo = new THREE.Vector3(0.0, 1.05, 0).applyMatrix4(g.matrixWorld);
    cam.position.copy(base); cam.lookAt(alvo); cam.fov = 52; cam.updateProjectionMatrix();
    meuBoneco.raiz.rotation.y = L.rotUser || 0; BO.animar(meuBoneco, 'chao', 0, 0, 0, dt);
    // o trem passa voando lá fora de vez em quando
    L.trem += dt; var ciclo = 22, f = (L.trem % ciclo) / ciclo, dir = new THREE.Vector3(1, 0, 0).applyQuaternion(g.quaternion), fundo = new THREE.Vector3(0, 0, -1).applyQuaternion(g.quaternion);
    TREM.grupo.visible = true; TREM.grupo.position.copy(g.position).addScaledVector(fundo, 75).addScaledVector(dir, (f - 0.5) * 260); TREM.grupo.position.y = g.position.y + 26;
    TREM.grupo.rotation.y = Math.atan2(dir.x, dir.z); TREM.atualizar(dt, true);
    if (Math.random() < 0.003) S.apito && S.ok && S.apito();
  }

  /* ---------- telas ---------- */
  function mostrar(id) { ['tLobby', 'tCabine', 'tJogo'].forEach(function (t) { $(t).hidden = t !== id; }); }
  function janela(html) { $('janela').innerHTML = '<div class="cx">' + html + '</div>'; $('janela').hidden = false; var f = $('jFechar'); if (f) f.onclick = function () { $('janela').hidden = true; }; }
  var perfil = { moedas: +ler('ql_moedas', 0), gemas: +ler('ql_gemas', 0), xp: +ler('ql_xp', 0) };
  function nivel() { return 1 + Math.floor(Math.sqrt(perfil.xp / 60)); }
  function pintarPerfil() { $('lNome').textContent = meuNome || 'Jogador'; $('lNivel').textContent = nivel(); $('lMoedas').textContent = perfil.moedas; $('lGemas').textContent = perfil.gemas; $('lAvatar').style.background = '#' + BO.ROUPAS[minhaRoupa].jaq.toString(16).padStart(6, '0'); }
  function pedirNome(depois) {
    janela('<h3>SEU NOME</h3><input id="jNome" maxlength="14" placeholder="Digite seu nome" value="' + esc(meuNome) + '"><div class="bts"><button class="bt-pq" id="jOk">PRONTO</button></div>');
    $('jNome').focus(); $('jOk').onclick = function () { var n = $('jNome').value.trim().slice(0, 14); if (!n) return; meuNome = n; gravar('ql_nome', n); $('janela').hidden = true; pintarPerfil(); depois && depois(); };
  }
  $('btPerfil').onclick = function () { pedirNome(); };
  $('btAnt').onclick = function () { trocaRoupa(-1); }; $('btProx').onclick = function () { trocaRoupa(1); };
  function trocaRoupa(d) { minhaRoupa = (minhaRoupa + d + BO.ROUPAS.length) % BO.ROUPAS.length; gravar('ql_roupa', minhaRoupa); var g = lobby.g; g.remove(meuBoneco.raiz); meuBoneco = BO.criar(minhaRoupa); meuBoneco.raiz.position.y = 0.22; g.add(meuBoneco.raiz); $('lBoneco').textContent = BO.ROUPAS[minhaRoupa].nome; pintarPerfil(); S.iniciar(); S.clicar(); }
  $('btPersonagens').onclick = function () {
    janela('<h3>PERSONAGENS</h3><div class="bts">' + BO.ROUPAS.map(function (r, i) { return '<button class="bt-pq" data-i="' + i + '" style="background:#' + r.jaq.toString(16).padStart(6, '0') + '">' + r.nome + '</button>'; }).join('') + '</div><div class="bts"><button class="bt-pq" id="jFechar">FECHAR</button></div>');
    [].forEach.call(document.querySelectorAll('#janela [data-i]'), function (b) { b.onclick = function () { trocaRoupa(+b.dataset.i - minhaRoupa); $('janela').hidden = true; }; });
  };
  $('btRanking').onclick = function () { fetch('/ranking').then(function (r) { return r.json(); }).catch(function () { return []; }).then(function (l) { janela('<h3>RANKING</h3><table>' + (l.length ? l.map(function (r, i) { return '<tr><td>' + (i + 1) + '</td><td>' + esc(r.nome) + '</td><td>🏆 ' + r.vitorias + '</td><td>💀 ' + r.kills + '</td></tr>'; }).join('') : '<tr><td>Ninguém ainda. Seja o primeiro!</td></tr>') + '</table><div class="bts"><button class="bt-pq" id="jFechar">FECHAR</button></div>'); }); };
  $('btComo').onclick = function () {
    janela('<h3>COMO JOGAR</h3><ul><li>Espere no <b>avião</b>, ele decola e voa sobre a ilha. Aperte <b>PULAR</b> onde quiser cair.</li><li>Na queda você desce na <b>prancha voadora</b>. Empurre pra frente para <b>mergulhar</b> mais rápido. O <b>paraquedas</b> abre sozinho perto do chão.</li><li>Pegue <b>armas, munição, colete, capacete, kit médico, gelo e miras</b> nas casas.</li><li><b>❄ Parede de gelo:</b> levanta uma barreira na sua frente que segura os tiros.</li><li><b>◎ Mira:</b> com mira 2x, 4x ou 8x a visão aproxima.</li><li>Fique dentro da <b>zona segura</b> (fora dela você perde vida). Seja o último vivo para ser <b>CAMPEÃO</b>!</li><li>No PC: WASD, mouse, clique atira, botão direito mira, Espaço pula, C agacha, R recarrega, G gelo, H cura, F pega, 1/2 troca arma, M mapa.</li></ul><div class="bts"><button class="bt-pq" id="jFechar">ENTENDI</button></div>');
  };
  $('btNovidades').onclick = function () { janela('<h3>NOVIDADES</h3><ul><li>🎈 <b>Voo Coral</b>: o dirigível que leva todo mundo pra ilha.</li><li>🛹 <b>Prancha voadora</b> na queda livre.</li><li>❄ <b>Parede de gelo</b> para se proteger.</li><li>🎯 Miras 2x, 4x e 8x.</li><li>🏝 Ilha Coral com 7 cidades, lago e ilhotas.</li><li>🏭 Fábrica com chaminés e silos na Usina Velha.</li><li>🌾 Moinho de vento na Fazenda Sol.</li><li>🪖 Soldado e armas novos.</li></ul><p style="font-size:12px;opacity:.8">Créditos: "Soldier" de Mad Troll Studio, "Parachute" e "Airship" de Poly by Google e "Low Poly Weapons Pack" (Poly Pizza, poly.pizza).</p><div class="bts"><button class="bt-pq" id="jFechar">FECHAR</button></div>'); };
  $('btConfig').onclick = function () {
    janela('<h3>CONFIGURAÇÕES</h3><p>Gráficos:</p><div class="bts">' + ['baixa', 'media', 'alta'].map(function (q) { return '<button class="bt-pq" data-q="' + q + '"' + (cfg.qual === q ? ' style="background:#2a9d3a"' : '') + '>' + q.toUpperCase() + '</button>'; }).join('') + '</div><p>Sensibilidade da câmera: <b id="jSv">' + cfg.sens.toFixed(1) + '</b></p><div class="bts"><button class="bt-pq" id="jSm">−</button><button class="bt-pq" id="jSp">+</button></div><p style="font-size:12px;opacity:.8">Mudar gráficos recarrega o jogo.</p><div class="bts"><button class="bt-pq" id="jFechar">FECHAR</button></div>');
    [].forEach.call(document.querySelectorAll('#janela [data-q]'), function (b) { b.onclick = function () { gravar('ql_qual', b.dataset.q); location.reload(); }; });
    $('jSm').onclick = function () { cfg.sens = Math.max(0.4, cfg.sens - 0.1); gravar('ql_sens2', cfg.sens); $('jSv').textContent = cfg.sens.toFixed(1); };
    $('jSp').onclick = function () { cfg.sens = Math.min(4, cfg.sens + 0.1); gravar('ql_sens2', cfg.sens); $('jSv').textContent = cfg.sens.toFixed(1); };
  };
  var mudo = ler('ql_mudo', '0') === '1'; S.mudo(mudo); $('btSom').textContent = mudo ? '🔇' : '🔊';
  $('btSom').onclick = function () { mudo = !mudo; gravar('ql_mudo', mudo ? '1' : '0'); S.iniciar(); S.mudo(mudo); $('btSom').textContent = mudo ? '🔇' : '🔊'; };
  $('btDecolar').onclick = function () {
    S.iniciar(); S.clicar(); if (!meuNome) return pedirNome(function () { $('btDecolar').click(); });
    if (celular && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
    conectar(function () { mandar({ t: 'jogar', nome: meuNome, roupa: minhaRoupa }); });
    $('btDecolar').textContent = 'ENTRANDO…'; $('btDecolar').disabled = true; esperandoPartida = true;
  };
  $('btComecar').onclick = function () { S.clicar(); mandar({ t: 'comecar' }); };
  // girar o boneco no lobby arrastando
  var arrasto = null;
  renderer.domElement.addEventListener('pointerdown', function (e) { if (modo === 'lobby') arrasto = e.clientX; });
  addEventListener('pointermove', function (e) { if (modo === 'lobby' && arrasto !== null && lobby) { lobby.rotUser = (lobby.rotUser || 0) + (e.clientX - arrasto) * 0.012; arrasto = e.clientX; } });
  addEventListener('pointerup', function () { arrasto = null; });

  /* ---------- rede ---------- */
  var ws = null, fila = [];
  function conectar(cb) {
    if (ws && ws.readyState === 1) return cb && cb();
    if (ws && ws.readyState === 0) { fila.cb = cb; return; }
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    ws.onopen = function () { fila.forEach(function (m) { ws.send(m); }); fila = []; cb && cb(); };
    ws.onmessage = function (e) { var m; try { m = JSON.parse(e.data); } catch (x) { return; } receber(m); };
    ws.onclose = function () { ws = null; if (modo !== 'lobby' && modo !== 'fim') { aviso('Conexão perdida', 3000); setTimeout(voltarLobby, 1500); } };
  }
  function mandar(m) { var t = JSON.stringify(m); if (ws && ws.readyState === 1) ws.send(t); else fila.push(t); }
  function receber(m) {
    switch (m.t) {
      case 'bemvindo': meuId = m.id; break;
      case 'cabine': if (esperandoPartida) $('btDecolar').textContent = 'DECOLANDO ' + m.conta + 's'; $('cConta').textContent = m.conta; $('cJog').textContent = m.js.filter(function (j) { return !j.bot; }).length + ' jogador(es) no avião · completa com bots'; m.js.forEach(function (j) { nomes[j.id] = j.nome; }); break;
      case 'inicio': iniciar(m); break;
      case 'q': estado(m); break;
      case 'corrige': eu.x = m.x; eu.y = m.y; eu.z = m.z; eu.vy = 0; break;
      case 'empurrado': if (eu.est === 'trem') pular(true); break;
      case 'ev': evento(m); break;
      case 'morreu': morri(m); break;
      case 'fim': fimPartida(m); break;
    }
  }

  /* ---------- outros jogadores ---------- */
  var nomes = {};
  function criarOutro(j) { var b = BO.criar(j.roupa); cena.add(b.raiz); nomes[j.id] = j.nome; outros[j.id] = { id: j.id, nome: j.nome, b: b, x: j.x || 0, y: 0, z: j.z || 0, ry: 0, est: 'cabine', fl: 0, arma: '', hp: 200, vel: 0, passo: 0, para: null, ultDano: 0 }; return outros[j.id]; }
  function tirarOutro(id) { var o = outros[id]; if (!o) return; cena.remove(o.b.raiz); if (o.para) cena.remove(o.para); delete outros[id]; }
  function limparOutros() { Object.keys(outros).forEach(function (k) { tirarOutro(+k); }); }

  /* ---------- vagão de espera ---------- */
  function entrarCabine() {
    modo = 'cabine'; mostrar('tCabine'); limparOutros(); P = null;
    eu.est = 'cabine'; eu.x = (Math.random() - 0.5) * 2; eu.z = (Math.random() - 0.5) * 16; eu.y = 0; eu.vy = 0; ui.yaw = Math.PI; ui.pitch = 0.1;
    if (meuBoneco) { meuBoneco.raiz.parent && meuBoneco.raiz.parent.remove(meuBoneco.raiz); }
    meuBoneco = BO.criar(minhaRoupa); cena.add(meuBoneco.raiz); BO.arma(meuBoneco, null); meuBoneco.raiz.visible = false;
    if (lobby) { cena.remove(lobby.g); lobby = null; }
    TREM.grupo.visible = true; S.motorTrem(0.7); S.apito(); ui.yaw = 0.6; ui.pitch = 0.32; esperaT = 0;
  }

  /* ---------- começo da partida ---------- */
  function iniciar(m) {
    esperandoPartida = false; $('btDecolar').textContent = 'DECOLAR'; $('btDecolar').disabled = false;
    if (meuBoneco && meuBoneco.raiz.parent) meuBoneco.raiz.parent.remove(meuBoneco.raiz); meuBoneco = BO.criar(minhaRoupa); cena.add(meuBoneco.raiz); BO.arma(meuBoneco, null);
    setTimeout(function () {
      trocarIlha(m.seed); if (lobby) { cena.remove(lobby.g); lobby = null; }
      P = { seed: m.seed, trem: m.trem, t: 0, itens: {}, zona: null, vivos: m.js.length, inicio: performance.now() };
      m.itens.forEach(function (it) { P.itens[it.id] = it; });
      Object.keys(itensMesh).forEach(function (k) { cena.remove(itensMesh[k]); }); itensMesh = {}; Object.keys(baus).forEach(function (k) { cena.remove(baus[k]); }); baus = {}; Object.keys(drops).forEach(function (k) { cena.remove(drops[k].g); }); drops = {};
      Object.keys(gelos).forEach(function (k) { cena.remove(gelos[k].g); }); gelos = {};
      limparOutros(); m.js.forEach(function (j) { if (j.id !== meuId) { var o = criarOutro(j); o.est = 'trem'; o.b.raiz.visible = false; } });
      eu.est = 'trem'; modo = 'trem'; inv = { a: [null, null], at: -1, m: {}, c: [0, 0], k: [0, 0], kit: 0, g: 0, mi: [], kl: 0, rc: 0, cu: 0, hp: 200 };
      cena.fog = new THREE.Fog(NEB, 160, 520); TREM.grupo.visible = true; ZONA.mesh.visible = true;
      mostrar('tJogo'); $('carregando').hidden = true; $('bPularTrem').hidden = false; $('fim').hidden = true;
      ui.yaw = P.trem.ry; ui.pitch = 0.42; aviso('Escolha onde pular e aperte PULAR do avião', 4000); S.apito();
    }, 60);
  }
  function posTrem() { var tr = P.trem, f = Math.min(1, P.t / tr.dur); return { x: tr.x0 + (tr.x1 - tr.x0) * f, z: tr.z0 + (tr.z1 - tr.z0) * f }; }
  function pular(forcado) {
    if (eu.est !== 'trem') return; var tp = posTrem(); eu.x = tp.x; eu.z = tp.z; eu.y = R.TREM_ALT - 4; eu.vy = 0; eu.est = 'ar'; modo = 'ar';
    if (!forcado) mandar({ t: 'pular' }); $('bPularTrem').hidden = true; S.vento(0.6); ui.pitch = 0.75; S.clicar();
  }
  $('bPularTrem').onclick = function () { pular(false); };
  $('bPara').onclick = function () { abrirPara(); };
  function abrirPara() { if (eu.est !== 'ar') return; eu.est = 'para'; modo = 'para'; S.paraquedas(); }

  /* ---------- estado vindo do servidor ---------- */
  function estado(m) {
    if (m.est === 'espera') return;
    if (!P) return;
    P.zona = m.z; if (Math.abs(P.t - m.tr) > 0.5) P.t = m.tr; P.vivos = m.vivos;
    var vistos = {};
    m.j.forEach(function (a) {
      vistos[a[0]] = 1; var est = EST[a[6]];
      if (a[0] === meuId) { if (est === 'morto' && eu.est !== 'morto') eu.est = 'morto'; return; }
      var o = outros[a[0]] || criarOutro({ id: a[0], nome: nomes[a[0]] || '?', roupa: a[0] % 6 });
      if (o.est !== est && (est === 'ar' || est === 'para' || est === 'chao') && o.est === 'trem') { o.x = a[1]; o.y = a[2]; o.z = a[3]; }
      o.tx = a[1]; o.ty = a[2]; o.tz = a[3]; o.try = a[4]; o.pi = a[5]; o.est = est; o.fl = a[7]; o.arma = a[8]; o.hp = a[9];
      BO.arma(o.b, o.arma || null); BO.protecao(o.b, a[10], a[11]);
    });
    Object.keys(outros).forEach(function (k) { if (!vistos[k] && outros[k].est !== 'cabine') { var o = outros[k]; o.b.raiz.visible = false; if (o.para) { cena.remove(o.para); o.para = null; } o.est = 'morto'; } });
    if (m.eu) { var antes = inv.hp; inv = m.eu; if (inv.hp < antes) $('flash').style.opacity = 0.9; desenharArmas(); }
  }

  /* ---------- eventos ---------- */
  var feedEl = $('feed');
  function feed(html) { var d = document.createElement('div'); d.innerHTML = html; feedEl.appendChild(d); while (feedEl.children.length > 4) feedEl.removeChild(feedEl.firstChild); setTimeout(function () { d.remove(); }, 4200); }
  function posDe(id) { if (id === meuId) return { x: eu.x, y: eu.y, z: eu.z }; var o = outros[id]; return o ? { x: o.x, y: o.y, z: o.z } : null; }
  function evento(m) {
    if (!P) return;
    switch (m.e) {
      case 'tiro': {
        var o = m.o, arma = m.a, meu = m.j === meuId;
        if (!meu) S.tiro(arma, { x: o[0], y: o[1], z: o[2] }), clarao(m.j);
        if (!meu || arma === 't12') m.p.forEach(function (p) { tracer(o, p, arma); impacto(p); });
        break;
      }
      case 'soco': S.soco(posDe(m.j)); break;
      case 'dano': {
        if (m.por === meuId) { marcador(m.hs); numero(m.a, m.v, m.hs); if (m.hs) S.headshot(); else S.acerto(); if (outros[m.a]) outros[m.a].ultDano = performance.now(); }
        if (m.a === meuId) { S.dor(); $('flash').style.opacity = 1; var pa = posDe(m.por); if (pa) direcaoDano(pa); }
        break;
      }
      case 'morte': {
        var por = m.por ? (m.por === meuId ? 'Você' : nomes[m.por] || '?') : null, alvo = m.a === meuId ? 'Você' : nomes[m.a] || '?';
        var armaN = m.arma === 'zona' ? 'zona' : m.arma === 'saiu' ? 'saiu' : (A[m.arma] ? A[m.arma].nome : m.arma);
        feed(por ? '<span class="' + (m.por === meuId ? 'eu' : '') + '">' + esc(por) + '</span><span class="ab">ABATE</span><span class="' + (m.a === meuId ? 'eu' : '') + '">' + esc(alvo) + '</span> (' + esc(armaN) + (m.hs ? ' · CABEÇA' : '') + ')' : esc(alvo) + ' <span class="ab">morreu na zona</span>');
        if (m.por === meuId) { S.kill(inv.kl); }
        P.vivos = m.vivos; break;
      }
      case 'item+': P.itens[m.it.id] = m.it; break;
      case 'item-': delete P.itens[m.id]; if (itensMesh[m.id]) { cena.remove(itensMesh[m.id]); delete itensMesh[m.id]; } if (m.por === meuId) S.pegar(); break;
      case 'gelo+': criarGelo(m.g); S.gelo(m.g); break;
      case 'ganhouGelo': aviso('+1 parede de gelo ❄ (' + m.n + ')', 1500); S.pegar(); break;
      case 'geloDano': var gd = gelos[m.id]; if (gd) { gd.g.children.forEach(function (c) { c.material = c.material.clone(); c.material.opacity = 0.35 + 0.5 * m.hp / R.GELO_VIDA; }); S.geloQuebra({ x: gd.d.x, y: gd.d.y, z: gd.d.z }); gd.g.position.x += (Math.random() - 0.5) * 0.08; } break;
      case 'gelo-': var gg = gelos[m.id]; if (gg) { S.geloQuebra({ x: gg.d.x, y: gg.d.y, z: gg.d.z }); gg.morrer = 0.4; } break;
      case 'zona': aviso('A zona segura vai encolher!', 3500); S.zona(); break;
      case 'fechando': aviso('A zona está fechando! Corra para dentro!', 3500); S.zona(); break;
      case 'caixa': caixaMorte(m); break;
      case 'drop': criarDrop(m); aviso('Um DROP de suprimentos está caindo!', 4000); S.zona(); break;
      case 'dropChao': var dd = drops[m.id]; if (dd) { dd.noChao = true; } break;
    }
  }

  /* ---------- efeitos ---------- */
  var fx = [];
  var mTracer = new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  var geoTracer = new THREE.CylinderGeometry(0.025, 0.025, 1, 5, 1, true); geoTracer.rotateX(Math.PI / 2); geoTracer.translate(0, 0, 0.5);
  function tracer(o, p, arma) {
    var a = new THREE.Vector3(o[0], o[1], o[2]), b = new THREE.Vector3(p[0], p[1], p[2]), d = a.distanceTo(b); if (d < 0.5) return;
    var m = new THREE.Mesh(geoTracer, mTracer.clone()); m.position.copy(a); m.lookAt(b); m.scale.set(arma === 'l7' ? 2.2 : 1, arma === 'l7' ? 2.2 : 1, d); cena.add(m);
    fx.push({ t: 0, dur: arma === 'l7' ? 0.35 : 0.12, f: function (t, dur) { m.material.opacity = 0.95 * (1 - t / dur); }, fim: function () { cena.remove(m); m.material.dispose(); } });
  }
  var texF = (function () { var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,220,1)'); gr.addColorStop(0.35, 'rgba(255,190,60,.9)'); gr.addColorStop(1, 'rgba(255,120,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); var t = new THREE.CanvasTexture(c); return t; })();
  function sprite(cor, tam, pos, dur) { var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texF, color: cor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.position.copy(pos); s.scale.setScalar(tam); cena.add(s); fx.push({ t: 0, dur: dur, f: function (t, d) { s.material.opacity = 1 - t / d; s.scale.setScalar(tam * (1 + t / d)); }, fim: function () { cena.remove(s); s.material.dispose(); } }); }
  function impacto(p) { sprite(p[3] ? 0xff4040 : 0xfff0b0, p[3] ? 0.6 : 0.35, new THREE.Vector3(p[0], p[1], p[2]), 0.2); }
  var _v = new THREE.Vector3();
  function bocaDe(b) { var arma = b.arma.children[0]; if (arma && arma.userData.boca) { _v.copy(arma.userData.boca); arma.localToWorld(_v); return _v.clone(); } b.arma.getWorldPosition(_v); return _v.clone(); }
  function clarao(id) { var o = id === meuId ? { b: meuBoneco } : outros[id]; if (!o || !o.b.armaId) return; sprite(0xffd060, 0.7, bocaDe(o.b), 0.07); }
  function marcador(hs) { var h = $('hit'); h.className = 'hit'; void h.offsetWidth; h.className = 'hit on' + (hs ? ' hs' : ''); }
  function numero(id, v, hs) {
    var o = outros[id]; if (!o) return; _v.set(o.x, o.y + 2.1, o.z).project(cam); if (_v.z > 1) return;
    var d = document.createElement('div'); d.className = hs ? 'hs' : ''; d.textContent = v; d.style.left = ((_v.x * 0.5 + 0.5) * innerWidth + (Math.random() - 0.5) * 30) + 'px'; d.style.top = ((-_v.y * 0.5 + 0.5) * innerHeight) + 'px'; $('numeros').appendChild(d); setTimeout(function () { d.remove(); }, 900);
  }
  function direcaoDano(p) { var a = Math.atan2(p.x - eu.x, p.z - eu.z) - ui.yaw; var i = document.createElement('i'); i.style.transform = 'rotate(' + (-a * 180 / Math.PI) + 'deg)'; $('dirDano').appendChild(i); setTimeout(function () { i.remove(); }, 1200); }
  var avisoT = null; function aviso(t, ms) { var el = $('aviso'); el.textContent = t; el.dataset.fixo = '1'; clearTimeout(avisoT); avisoT = setTimeout(function () { el.dataset.fixo = ''; }, ms || 2500); }
  function caixaMorte(m) {
    var g = new THREE.Group(), mC = new THREE.MeshLambertMaterial({ color: 0x7b3fe4 }), mF = new THREE.MeshBasicMaterial({ color: 0xffd23f });
    var cx = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.6), mC); cx.position.y = 0.3; g.add(cx); var f = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 0.62), mF); f.position.y = 0.45; g.add(f);
    g.position.set(m.x, m.y, m.z); cena.add(g); fx.push({ t: 0, dur: 90, f: function () {}, fim: function () { cena.remove(g); } });
  }
  // parede de gelo
  var mGelo = new THREE.MeshPhongMaterial({ color: 0xaeeaff, emissive: 0x2a8fd0, emissiveIntensity: 0.35, shininess: 120, specular: 0xffffff, transparent: true, opacity: 0.82 });
  function criarGelo(d) {
    var g = new THREE.Group(); g.position.set(d.x, d.y, d.z); g.rotation.y = d.ry;
    for (var i = 0; i < 3; i++) { var b = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.4 - (i === 1 ? 0 : 0.3), 0.55), mGelo); b.position.set((i - 1) * 1.13, 1.2 - (i === 1 ? 0 : 0.15), 0); b.rotation.z = (i - 1) * 0.04; b.castShadow = true; g.add(b); }
    for (var k = 0; k < 7; k++) { var sp = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6 + Math.random() * 0.5, 5), mGelo); sp.position.set((Math.random() - 0.5) * 3.2, 2.3 + Math.random() * 0.2, (Math.random() - 0.5) * 0.3); g.add(sp); }
    g.scale.y = 0.01; cena.add(g); gelos[d.id] = { g: g, d: d, cresce: 0 };
  }
  function geloArr() { return Object.keys(gelos).map(function (k) { return gelos[k].d; }); }

  /* ---------- drop de suprimentos ---------- */
  var drops = {};
  function criarDrop(m) {
    var g = new THREE.Group(), mAz = new THREE.MeshLambertMaterial({ color: 0x2f6fe8 }), mBr = new THREE.MeshLambertMaterial({ color: 0xffffff }), mVe = new THREE.MeshLambertMaterial({ color: 0xe53935 });
    var cx = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 1.8), mAz); cx.position.y = 0.7; g.add(cx);
    var tampa = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.35, 2.0), mVe); tampa.position.y = 1.55; g.add(tampa);
    [-0.5, 0.5].forEach(function (x) { var f = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.37, 2.02), mBr); f.position.set(x, 1.55, 0); g.add(f); });
    for (var k = 0; k < 4; k++) { var r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 1.82), new THREE.MeshLambertMaterial({ color: 0x1f4fb8 })); r.position.set(-0.6 + k * 0.4, 0.7, 0); r.scale.x = 1; g.add(r); }
    var para = BO.paraquedas(0xe53935); para.scale.setScalar(1.6); para.position.y = 1.7 + 3.6; g.add(para);
    g.position.set(m.x, m.y + 90, m.z); cena.add(g);
    drops[m.id] = { g: g, para: para, x: m.x, y: m.y, z: m.z, t: 0, dur: m.dur, noChao: false, fumaca: 0 };
  }
  function atualizarDrops(dt) {
    Object.keys(drops).forEach(function (k) {
      var d = drops[k]; d.t += dt; var f = Math.min(1, d.t / d.dur);
      d.g.position.y = d.y + 90 * (1 - f); d.g.rotation.y += dt * 0.3;
      if (f >= 1 && d.para.parent) { d.g.remove(d.para); S.pouso(); }
      // fumaça vermelha do sinalizador
      d.fumaca -= dt; if (f >= 1 && d.fumaca <= 0 && d.t < d.dur + 120) { d.fumaca = 0.25; var s2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: texF, color: 0xff3a3a, transparent: true, depthWrite: false })); s2.position.set(d.x, d.y + 1.8, d.z); s2.scale.setScalar(1.5); cena.add(s2); fx.push({ t: 0, dur: 5, f: function (t) { s2.position.y += 0.06; s2.scale.setScalar(1.5 + t * 1.6); s2.material.opacity = 0.7 * (1 - t / 5); }, fim: function () { cena.remove(s2); s2.material.dispose(); } }); }
      if (d.t > d.dur + 150) { cena.remove(d.g); delete drops[k]; }
    });
  }
  var pegEl = {};
  function pegadas() {
    var usados = {};
    Object.keys(outros).forEach(function (k) {
      var o = outros[k]; if (o.est !== 'chao' || (o.vel || 0) < 1) return; var d = Math.hypot(o.x - eu.x, o.z - eu.z); if (d > 32 || d < 1) return;
      var a = Math.atan2(o.x - eu.x, o.z - eu.z) - ui.yaw, el = pegEl[k]; if (!el) { el = document.createElement('div'); el.className = 'peg'; el.textContent = '👣'; $('pegadas').appendChild(el); pegEl[k] = el; }
      var r = Math.min(innerHeight * 0.36, 150); el.style.transform = 'translate(' + (-Math.sin(a) * r) + 'px,' + (-Math.cos(a) * r) + 'px) rotate(' + (-a * 180 / Math.PI) + 'deg)'; el.style.opacity = (1 - d / 32) * 0.9 + 0.1; usados[k] = 1;
    });
    Object.keys(pegEl).forEach(function (k) { if (!usados[k]) { pegEl[k].remove(); delete pegEl[k]; } });
  }
  var marcasEl = {};
  function marcas() {
    var usados = {};
    function m(ch, ic, txt, x, y, z) {
      _v.set(x, y, z).project(cam); var atras = _v.z > 1, sx = (_v.x * 0.5 + 0.5) * innerWidth, sy = (-_v.y * 0.5 + 0.5) * innerHeight; if (atras) { sx = innerWidth - sx; sy = innerHeight * 0.85; }
      var el = marcasEl[ch]; if (!el) { el = document.createElement('div'); $('marcas').appendChild(el); marcasEl[ch] = el; }
      el.innerHTML = '<i>' + ic + '</i>' + txt; el.style.left = Math.max(30, Math.min(innerWidth - 30, sx)) + 'px'; el.style.top = Math.max(70, Math.min(innerHeight - 40, sy)) + 'px'; usados[ch] = 1;
    }
    Object.keys(drops).forEach(function (k) { var d = drops[k]; m('d' + k, '📦', Math.round(Math.hypot(d.x - eu.x, d.z - eu.z)) + 'm', d.x, d.g.position.y + 2, d.z); });
    Object.keys(outros).forEach(function (k) { var o = outros[k]; if (o.est === 'chao' && performance.now() - o.ultDano < 3000) m('h' + k, '<span style="display:inline-block;width:46px;height:5px;background:#333;border:1px solid #fff"><span style="display:block;height:100%;width:' + (o.hp / 2) + '%;background:#ff4d4d"></span></span>', '', o.x, o.y + 2.25, o.z); });
    Object.keys(marcasEl).forEach(function (k) { if (!usados[k]) { marcasEl[k].remove(); delete marcasEl[k]; } });
  }
  // baús nos pontos de loot (abrem quando você chega perto)
  var baus = {};
  function modeloBau(i) {
    var g = new THREE.Group(), cor = [0xe53935, 0x2f6fe8, 0x43a047][i % 3];
    var corpo = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.55), new THREE.MeshLambertMaterial({ color: cor })); corpo.position.y = 0.23; g.add(corpo);
    var faixa = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 0.57), new THREE.MeshLambertMaterial({ color: 0xffffff })); faixa.position.y = 0.3; g.add(faixa);
    var tampa = new THREE.Group(); tampa.position.set(0, 0.45, -0.27); g.add(tampa);
    var tp = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.14, 0.57), new THREE.MeshLambertMaterial({ color: cor })); tp.position.set(0, 0.07, 0.28); tampa.add(tp);
    var fecho = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.04), new THREE.MeshLambertMaterial({ color: 0xffd23f })); fecho.position.set(0, 0.3, 0.29); g.add(fecho);
    g.userData.tampa = tampa; return g;
  }
  /* ---------- itens no chão ---------- */
  var COR_RAR = { p9: 1, vx45: 2, t12: 2, ar9: 2, b3: 3, l7: 4 };
  var mItens = { leve: 0xffd23f, media: 0x4caf50, cartucho: 0xe53935, pesada: 0x2f6fe8, colete: 0x6b7d3a, capacete: 0x55603f, kit: 0xffffff, gelo: 0x8fe9ff, mira2x: 0xff7043, mira4x: 0xab47bc, mira8x: 0x26c6da, moeda: 0xffc928 };
  function modeloItem(it) {
    var g = new THREE.Group();
    if (it.tipo === 'arma') { var m = AR.modelo(it.arma); if (m.userData.lp) { m.rotation.set(0, 0, Math.PI / 2); m.position.y = 0.12; } else { m.rotation.set(0, 0, Math.PI / 2); m.rotation.y = Math.PI / 2; m.scale.setScalar(1.4); m.position.y = 0.12; } g.add(m); }
    else if (it.tipo === 'colete') { var c = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.25), new THREE.MeshLambertMaterial({ color: mItens.colete })); c.position.y = 0.3; g.add(c); }
    else if (it.tipo === 'capacete') { var h = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: mItens.capacete })); h.position.y = 0.05; g.add(h); }
    else if (it.tipo === 'kit') { var k = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.3), new THREE.MeshLambertMaterial({ color: 0xffffff })); k.position.y = 0.14; g.add(k); var x1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.31), new THREE.MeshBasicMaterial({ color: 0xe53935 })); x1.position.y = 0.16; g.add(x1); var x2 = x1.clone(); x2.rotation.y = Math.PI / 2; x2.scale.set(1, 1, 0.65); g.add(x2); }
    else if (it.tipo === 'gelo') { var gm = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), mGelo); gm.position.y = 0.3; g.add(gm); }
    else if (it.tipo === 'moeda') { var mo = new THREE.MeshPhongMaterial({ color: 0xffc928, shininess: 100, specular: 0xffffff }); for (var q = 0; q < 4; q++) { var cn = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 16), mo); cn.position.set((q % 2) * 0.12, 0.03 + q * 0.045, (q > 1 ? 0.08 : 0)); g.add(cn); } }
    else if (/^mira/.test(it.tipo)) { var mr = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.35, 10), new THREE.MeshLambertMaterial({ color: 0x222222 })); mr.rotation.z = Math.PI / 2; mr.position.y = 0.1; g.add(mr); var lr = new THREE.Mesh(new THREE.CircleGeometry(0.06, 10), new THREE.MeshBasicMaterial({ color: mItens[it.tipo] })); lr.position.set(0.18, 0.1, 0); lr.rotation.y = Math.PI / 2; g.add(lr); }
    else { var cm = AR.municao && AR.municao(it.tipo); if (cm) { cm.position.y = 0.2; g.add(cm); } else { var b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.24), new THREE.MeshLambertMaterial({ color: mItens[it.tipo] || 0xffffff })); b.position.y = 0.11; g.add(b); } }
    var rar = it.tipo === 'arma' ? COR_RAR[it.arma] : it.nv || 1, anel = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 24), new THREE.MeshBasicMaterial({ color: [0, 0x7de07a, 0x5fb0ff, 0xc77dff, 0xffb43f][rar] || 0xffffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    anel.rotation.x = -Math.PI / 2; anel.position.y = 0.03; g.add(anel);
    var corR = [0, 0x7de07a, 0x5fb0ff, 0xc77dff, 0xffb43f][rar] || 0xffffff, facho = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.32, 3.2, 8, 1, true), new THREE.MeshBasicMaterial({ color: corR, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); facho.position.y = 1.6; g.add(facho);
    g.children.forEach(function (c) { if (c !== anel && c !== facho) c.scale.multiplyScalar(1.5); });
    g.position.set(it.x, it.y, it.z); return g;
  }
  var tItens = 0;
  function atualizarItens(dt) {
    tItens -= dt; if (tItens > 0) return; tItens = 0.4;
    I.loot.forEach(function (l, i) {
      var d = Math.abs(l.x - eu.x) + Math.abs(l.z - eu.z);
      if (d < 55 && !baus[i]) { var b = modeloBau(i); b.position.set(l.x - 1.0, l.y, l.z - 0.2); cena.add(b); baus[i] = b; }
      else if (d > 70 && baus[i]) { cena.remove(baus[i]); delete baus[i]; }
      if (baus[i]) { var aberto = d < 5 || baus[i].userData.aberto; if (d < 5 && !baus[i].userData.aberto) { baus[i].userData.aberto = true; S.pegar(); } baus[i].userData.tampa.rotation.x = aberto ? -1.9 : 0; }
    });
    Object.keys(P.itens).forEach(function (k) {
      var it = P.itens[k], d = Math.abs(it.x - eu.x) + Math.abs(it.z - eu.z);
      if (d < 55 && !itensMesh[k]) { itensMesh[k] = modeloItem(it); cena.add(itensMesh[k]); }
      else if (d > 70 && itensMesh[k]) { cena.remove(itensMesh[k]); delete itensMesh[k]; }
    });
    desenharLoot();
  }
  function iconeItem(it) { return it.tipo === 'arma' ? '🔫' : it.tipo === 'colete' ? '🦺' : it.tipo === 'capacete' ? '⛑' : it.tipo === 'kit' ? '✚' : it.tipo === 'gelo' ? '❄' : it.tipo === 'moeda' ? '🪙' : /^mira/.test(it.tipo) ? '🎯' : ({ leve: '🟨', media: '🟩', cartucho: '🟥', pesada: '🟦' }[it.tipo] || '▮'); }
  var lootHtml = '', pegandoAuto = {};
  function desenharLoot() {
    if (eu.est !== 'chao') { if (lootHtml) { lootHtml = ''; $('loot').innerHTML = ''; } return; }
    var perto = Object.keys(P.itens).map(function (k) { return P.itens[k]; }).filter(function (it) { return Math.hypot(it.x - eu.x, it.z - eu.z) < 3 && Math.abs(it.y - eu.y) < 2.5; }).sort(function (a, b) { return Math.hypot(a.x - eu.x, a.z - eu.z) - Math.hypot(b.x - eu.x, b.z - eu.z); }).slice(0, 6);
    // pega sozinho munição da sua arma, kit e gelo
    perto.forEach(function (it) {
      if (Math.hypot(it.x - eu.x, it.z - eu.z) > 2.6 || pegandoAuto[it.id] > performance.now() || largouAte > performance.now()) return;
      var serve = false, temArma = inv.a.some(function (w) { return w && A[w[0]].mun === it.tipo; });
      if (it.tipo === 'arma') serve = !inv.a[0] || !inv.a[1] && !inv.a.some(function (w) { return w && w[0] === it.arma; });
      else if (it.tipo === 'colete') serve = it.nv > inv.c[0]; else if (it.tipo === 'capacete') serve = it.nv > inv.k[0];
      else if (/^mira/.test(it.tipo)) serve = inv.mi.indexOf(it.tipo.slice(4)) < 0;
      else serve = temArma || it.tipo === 'moeda' || (it.tipo === 'kit' && inv.kit < 6) || (it.tipo === 'gelo' && inv.g < 10) || (!inv.a[0] && !inv.a[1] && ['leve', 'media', 'cartucho', 'pesada'].indexOf(it.tipo) >= 0);
      if (serve) { pegandoAuto[it.id] = performance.now() + 1500; mandar({ t: 'pegar', id: it.id }); }
    });
    var h = perto.map(function (it) { var rar = it.tipo === 'arma' ? COR_RAR[it.arma] : it.nv || 1; return '<button class="r' + rar + '" data-id="' + it.id + '"><i style="background:#' + ((mItens[it.tipo] || 0x334477).toString(16).padStart(6, '0')) + '33">' + iconeItem(it) + '</i>' + esc(G.nomeItem(it)) + '</button>'; }).join('');
    if (h !== lootHtml) { lootHtml = h; $('loot').innerHTML = h; [].forEach.call($('loot').children, function (b) { b.onpointerdown = function (e) { e.stopPropagation(); mandar({ t: 'pegar', id: +b.dataset.id }); }; }); }
  }

  /* ---------- armas (HUD) ---------- */
  var armasHtml = '';
  function svg(d) { return '<svg viewBox="0 0 100 40"><path d="' + d + '" fill="#e9eef3"/></svg>'; }
  var SIL0 = { fuzil: svg('M4 16h52l4-4h24v6h12v4H84l-6 4H54l-4 10h-9l3-10H30l-8 6H8l2-8H4z'), smg: svg('M14 14h46l4-4h12v6h10v4H76v8h-8v-6H50l-4 12h-9l3-12H22l-6 4h-6l2-8z'), pistola: svg('M30 12h40v8H54l-4 14h-10l3-14H30z'), escopeta: svg('M2 18h66l4-4h26v6H70l-4 4H40l-6 6H10l4-8H2z'), sniper: svg('M2 18h40l4-6h20l2 6h30v4H64l-6 4H40l-4 10h-8l2-10H16l-8 6H2zM44 6h22v6H44z'), mao: '' }, SIL = SIL0;
  function desenharArmas() {
    var ativa = inv.at >= 0 && inv.a[inv.at] ? inv.at : -1, ordem = ativa >= 0 ? [ativa, 1 - ativa, -1] : [0, 1, -1];
    var h = ordem.map(function (i, n) {
      var w = i >= 0 ? inv.a[i] : null, cls = n === 0 ? 'grande-c on' : 'peq';
      if (i === -1 || !w) return n === 0 ? '<button data-i="-1" class="grande-c on"><b>👊</b>Soco</button>' : (i === -1 ? '<button data-i="-1" class="peq"><b>👊</b>' + '</button>' : '<button data-i="' + i + '" class="peq"><b>—</b>vazio</button>');
      var a = A[w[0]]; return '<button data-i="' + i + '" class="' + cls + '"><b>' + w[1] + '<small style="color:#fff;font:900 11px Nunito">/' + (inv.m[a.mun] || 0) + '</small></b>' + esc(a.nome) + (SIL[a.cls] || '') + '</button>';
    }).join('');
    if (h !== armasHtml) { armasHtml = h; $('armas').innerHTML = h; [].forEach.call($('armas').children, function (b) { b.onpointerdown = function (e) { e.stopPropagation(); var i = +b.dataset.i; if (i >= 0 && !inv.a[i]) return; if (i === inv.at) return; mandar({ t: 'arma', i: i }); S.troca(); }; }); }
    $('hMoedas').textContent = inv.mo || 0;
    $('nGelo').textContent = inv.g; $('nKit').textContent = inv.kit; $('hKills').textContent = inv.kl;
    $('hCol').textContent = '🦺 ' + (inv.c[0] ? 'Nv.' + inv.c[0] : '—'); $('hCap').textContent = '⛑ ' + (inv.k[0] ? 'Nv.' + inv.k[0] : '—');
    $('hHp').textContent = inv.hp; $('hBar').style.width = (inv.hp / 2) + '%'; $('hBar').className = inv.hp < 60 ? 'baixo' : '';
    var arma = inv.at >= 0 && inv.a[inv.at] ? inv.a[inv.at][0] : null; if (meuBoneco) BO.arma(meuBoneco, arma); if (meuBoneco) BO.protecao(meuBoneco, inv.c[0], inv.k[0]);
  }

  /* ---------- controles ---------- */
  var joy = { id: null, cx: 0, cy: 0 }, olhar = { id: null, x: 0, y: 0 };
  $('joy').addEventListener('pointerdown', function (e) { joy.id = e.pointerId; var r = $('joy').getBoundingClientRect(); joy.cx = r.left + r.width / 2; joy.cy = r.top + r.height / 2; try { $('joy').setPointerCapture(e.pointerId); } catch (x) {} movJoy(e); e.preventDefault(); });
  function movJoy(e) { var dx = e.clientX - joy.cx, dy = e.clientY - joy.cy, d = Math.hypot(dx, dy), mx = 52; if (d > mx) { dx *= mx / d; dy *= mx / d; } ui.joy.x = dx / mx; ui.joy.y = dy / mx; $('joyP').style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; }
  $('joy').addEventListener('pointermove', function (e) { if (e.pointerId === joy.id) movJoy(e); });
  function soltaJoy(e) { if (e.pointerId !== joy.id) return; joy.id = null; ui.joy.x = ui.joy.y = 0; $('joyP').style.transform = ''; }
  $('joy').addEventListener('pointerup', soltaJoy); $('joy').addEventListener('pointercancel', soltaJoy);
  var tela3d = renderer.domElement;
  tela3d.addEventListener('pointerdown', function (e) {
    if (modo === 'lobby') return;
    if (!celular && e.pointerType === 'mouse') { if (document.pointerLockElement !== tela3d) { tela3d.requestPointerLock && tela3d.requestPointerLock(); return; } if (e.button === 0) ui.tiro = true; if (e.button === 2) alternarMira(); return; }
    if (e.pointerType === 'mouse' && olhar.id === null) { olhar.id = e.pointerId; olhar.x = e.clientX; olhar.y = e.clientY; }
  });
  tela3d.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  var toqueOlhar = null;
  document.addEventListener('touchstart', function (e) {
    if (modo === 'lobby') return;
    for (var i = 0; i < e.changedTouches.length; i++) { var t = e.changedTouches[i]; if (toqueOlhar === null && t.target === tela3d && (t.clientX > innerWidth * 0.33 || modo === 'cabine' || modo === 'trem')) { toqueOlhar = { id: t.identifier, x: t.clientX, y: t.clientY }; } }
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (!toqueOlhar) return;
    for (var i = 0; i < e.changedTouches.length; i++) { var t = e.changedTouches[i]; if (t.identifier === toqueOlhar.id) { girar(t.clientX - toqueOlhar.x, t.clientY - toqueOlhar.y, 0.0062); toqueOlhar.x = t.clientX; toqueOlhar.y = t.clientY; } }
  }, { passive: true });
  function fimToque(e) { if (!toqueOlhar) return; for (var i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === toqueOlhar.id) toqueOlhar = null; }
  document.addEventListener('touchend', fimToque); document.addEventListener('touchcancel', fimToque);
  tela3d.addEventListener('pointermove', function (e) { if (e.pointerId !== olhar.id) return; girar(e.clientX - olhar.x, e.clientY - olhar.y, 0.0058); olhar.x = e.clientX; olhar.y = e.clientY; });
  addEventListener('pointerup', function (e) { if (e.pointerId === olhar.id) olhar.id = null; if (e.pointerType === 'mouse' && e.button === 0) ui.tiro = false; });
  document.addEventListener('mousemove', function (e) { if (document.pointerLockElement === tela3d) girar(e.movementX, e.movementY, 0.0024); });
  function girar(dx, dy, k) { var z = ui.ads ? cam.fov / 70 : 1; ui.yaw -= dx * k * cfg.sens * z; ui.pitch = Math.max(-1.2, Math.min(1.2, ui.pitch + dy * k * cfg.sens * z)); }
  // botões de tiro: segurar atira e ainda dá pra girar a câmera arrastando o dedo
  ['bTiro', 'bTiro2'].forEach(function (id) {
    var el = $(id), pid = null, px = 0, py = 0;
    el.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); pid = e.pointerId; px = e.clientX; py = e.clientY; ui.tiro = true; try { el.setPointerCapture(pid); } catch (x) {} });
    el.addEventListener('pointermove', function (e) { if (e.pointerId !== pid) return; girar(e.clientX - px, e.clientY - py, 0.0058); px = e.clientX; py = e.clientY; });
    function solta(e) { if (e.pointerId !== pid) return; pid = null; ui.tiro = false; }
    el.addEventListener('pointerup', solta); el.addEventListener('pointercancel', solta);
  });
  function botao(id, f) { $(id).addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); f(); }); }
  ['bAcel', 'bMerg'].forEach(function (id) { var el = $(id), k = id === 'bAcel' ? 'acel' : 'merg'; el.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); ui[k] = true; el.classList.add('on'); }); ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { el.addEventListener(t, function () { ui[k] = false; el.classList.remove('on'); }); }); });
  botao('bMira', function () { alternarMira(); }); botao('bCorrer', function () { ui.autoCorre = !ui.autoCorre; $('bCorrer').classList.toggle('on', ui.autoCorre); }); botao('bPulo', function () { pulo(); }); botao('bAg', function () { eu.ag = !eu.ag; $('bAg').classList.toggle('on', eu.ag); });
  botao('bRec', function () { mandar({ t: 'recarregar' }); S.recarga(inv.a[inv.at] ? inv.a[inv.at][0] : 'ar9', 2); });
  botao('bGelo', function () { if (inv.g > 0 && eu.est === 'chao') { mandar({ t: 'p', x: +eu.x.toFixed(2), y: +eu.y.toFixed(2), z: +eu.z.toFixed(2), ry: +eu.ry.toFixed(2), pi: +ui.pitch.toFixed(2), ag: eu.ag ? 1 : 0, f: 0, e: eu.est }); mandar({ t: 'gelo', ry: ui.yaw }); } });
  botao('bKit', function () { if (inv.kit > 0 && inv.hp < 200) { mandar({ t: 'curar' }); S.cura(); } });
  // mochila: ver o que tem e jogar fora
  var largouAte = 0;
  function abrirMochila() {
    var l = [];
    inv.a.forEach(function (w, i) { if (w) l.push({ ic: '🔫', nome: A[w[0]].nome, sub: w[1] + ' no pente', acao: function () { mandar({ t: 'largar', i: i }); } }); });
    [['leve', 'Munição leve'], ['media', 'Munição média'], ['cartucho', 'Cartuchos'], ['pesada', 'Munição pesada']].forEach(function (m) { if (inv.m[m[0]] > 0) l.push({ ic: ({ leve: '🟨', media: '🟩', cartucho: '🟥', pesada: '🟦' })[m[0]], nome: m[1], sub: inv.m[m[0]] + ' balas', acao: function () { mandar({ t: 'largarItem', tipo: m[0] }); } }); });
    if (inv.kit) l.push({ ic: '✚', nome: 'Kit médico', sub: inv.kit + ' (larga 1)', acao: function () { mandar({ t: 'largarItem', tipo: 'kit' }); } });
    if (inv.g) l.push({ ic: '❄', nome: 'Parede de gelo', sub: inv.g + ' unidades', acao: function () { mandar({ t: 'largarItem', tipo: 'gelo' }); } });
    if (inv.c[0]) l.push({ ic: '🦺', nome: 'Colete Nv.' + inv.c[0], sub: 'resistência ' + inv.c[1], acao: function () { mandar({ t: 'largarItem', tipo: 'colete' }); } });
    if (inv.k[0]) l.push({ ic: '⛑', nome: 'Capacete Nv.' + inv.k[0], sub: 'resistência ' + inv.k[1], acao: function () { mandar({ t: 'largarItem', tipo: 'capacete' }); } });
    inv.mi.forEach(function (m) { l.push({ ic: '🎯', nome: 'Mira ' + m, sub: 'acessório', acao: function () { mandar({ t: 'largarItem', tipo: 'mira' + m }); } }); });
    $('moLista').innerHTML = l.length ? l.map(function (x, i) { return '<div class="mo-it"><i>' + x.ic + '</i><span>' + esc(x.nome) + '<small>' + esc(x.sub) + '</small></span><button data-i="' + i + '">LARGAR</button></div>'; }).join('') : '<p>A mochila está vazia. Pegue coisas nos baús!</p>';
    [].forEach.call($('moLista').querySelectorAll('button'), function (b) { b.onclick = function () { largouAte = performance.now() + 5000; l[+b.dataset.i].acao(); S.troca(); setTimeout(abrirMochila, 250); }; });
    $('mochila').hidden = false;
  }
  botao('bMochila', abrirMochila); $('moFechar').onclick = function () { $('mochila').hidden = true; };
  $('mini').addEventListener('pointerdown', function (e) { e.stopPropagation(); abrirMapa(); });
  $('btFecharMapa').onclick = function () { $('mapaG').hidden = true; };
  addEventListener('keydown', function (e) {
    if (e.target && e.target.tagName === 'INPUT') return; var k = e.key.toLowerCase(); teclas[k] = true;
    if (modo === 'lobby' || modo === 'cabine' && k !== ' ') return;
    if (k === ' ') { if (modo === 'trem') pular(false); else if (eu.est === 'ar') abrirPara(); else pulo(); e.preventDefault(); }
    if (k === 'c') { eu.ag = !eu.ag; } if (k === 'r') $('bRec').dispatchEvent(new PointerEvent('pointerdown')); if (k === 'g') $('bGelo').dispatchEvent(new PointerEvent('pointerdown')); if (k === 'h') $('bKit').dispatchEvent(new PointerEvent('pointerdown'));
    if (k === '1' || k === '2') { var i = +k - 1; if (inv.a[i]) { mandar({ t: 'arma', i: i }); S.troca(); } }
    if (k === 'f') { var b = $('loot').firstChild; if (b) b.onpointerdown({ stopPropagation: function () {} }); }
    if (k === 'm') { if ($('mapaG').hidden) abrirMapa(); else $('mapaG').hidden = true; }
  });
  addEventListener('keyup', function (e) { teclas[e.key.toLowerCase()] = false; });
  function pulo() {
    if (eu.est !== 'chao' || !eu.noChao || eu.vault) return;
    var dirA = ui.joy.x || ui.joy.y || teclas.w || teclas.a || teclas.s || teclas.d || ui.autoCorre ? eu.ry : ui.yaw;
    if (vault(dirA)) return;
    eu.vy = R.PULO; eu.noChao = false; eu.ag = false; $('bAg').classList.remove('on');
  }
  // tem cerca ou janela na frente? então pula por cima
  function vault(dirA) {
    var fx = Math.sin(dirA), fz = Math.cos(dirA);
    for (var d = 0.5; d <= 1.1; d += 0.3) {
      var px = eu.x + fx * d, pz = eu.z + fz * d, obst = G.vizinhos(I, px, pz).find(function (o) { return o.w !== undefined && Math.abs(px - o.x) < o.w / 2 + 0.25 && Math.abs(pz - o.z) < o.d / 2 + 0.25 && o.y1 - eu.y > 0.4 && o.y1 - eu.y < 1.75 && o.y0 - eu.y < 0.3; });
      if (!obst) continue;
      for (var k = 1.4; k <= 2.4; k += 0.25) { var lx = eu.x + fx * k, lz = eu.z + fz * k, lh = G.altura(I, lx, lz); if (G.livre(I, lx, lz, 0.38, lh, geloArr())) { eu.vault = { x0: eu.x, z0: eu.z, y0: eu.y, x1: lx, z1: lz, y1: lh, t: 0, alto: obst.y1 - eu.y + 0.35 }; eu.ry = dirA; S.pouso(); return true; } }
    }
    return false;
  }
  function miras() {
    var w = inv.at >= 0 && inv.a[inv.at] ? A[inv.a[inv.at][0]] : null; if (!w) return [];
    var tem = (w.miras || []).filter(function (m) { return inv.mi.indexOf(m) >= 0; });
    if (w.cls === 'sniper' && tem.indexOf('4x') < 0) tem.splice(tem.indexOf('8x') >= 0 ? tem.indexOf('8x') : tem.length, 0, '4x');
    return [null].concat(tem.length ? tem : []);
  }
  function miraAtual() { var l = miras(); return l[Math.min(ui.nivelMira || 0, l.length - 1)] || null; }
  function alternarMira() {
    if (eu.est !== 'chao') return; var l = miras();
    if (!ui.ads) { ui.ads = true; ui.nivelMira = l.length > 1 ? 1 : 0; }
    else if ((ui.nivelMira || 0) + 1 < l.length) ui.nivelMira++;
    else { ui.ads = false; ui.nivelMira = 0; }
    $('bMira').classList.toggle('on', ui.ads); S.clicar(); if (ui.ads) aviso('Mira ' + (miraAtual() || 'de ferro'), 900);
  }

  /* ---------- mira automática ---------- */
  function alvoAuto(maxAng) {
    var w = inv.at >= 0 && inv.a[inv.at] ? A[inv.a[inv.at][0]] : A.soco, melhor = null, ma = maxAng;
    cam.getWorldDirection(_d);
    Object.keys(outros).forEach(function (k) {
      var o = outros[k]; if (o.est !== 'chao' && o.est !== 'para') return;
      var hy = o.y + ((o.fl & 4) ? 1.2 : 1.62), dx = o.x - cam.position.x, dy = hy - cam.position.y, dz = o.z - cam.position.z, d = Math.hypot(dx, dy, dz);
      if (d > Math.min(w.alc, 120) || Math.hypot(o.x - eu.x, o.z - eu.z) < 0.6) return;
      var ang = Math.acos(Math.max(-1, Math.min(1, (dx * _d.x + dy * _d.y + dz * _d.z) / d))); if (ang > ma) return;
      var ori = [eu.x, eu.y + 1.5, eu.z], dd = [o.x - ori[0], hy - ori[1], o.z - ori[2]], l = Math.hypot(dd[0], dd[1], dd[2]);
      if (G.raioMundo(I, ori, dd.map(function (v) { return v / l; }), l, geloArr()) < l - 1.2) return;
      ma = ang; melhor = { o: o, x: o.x, y: hy, z: o.z };
    });
    return melhor;
  }
  // segurando o tiro: a câmera gruda no inimigo e sobe pra cabeça
  function grudar(dt) {
    var a = alvoAuto(ui.ads ? 0.45 : 0.32); if (!a) return;
    var dx = a.x - cam.position.x, dz = a.z - cam.position.z, dy = a.y - cam.position.y, yaw = Math.atan2(dx, dz), pitch = -Math.atan2(dy, Math.hypot(dx, dz));
    var dyaw = yaw - ui.yaw; while (dyaw > Math.PI) dyaw -= 2 * Math.PI; while (dyaw < -Math.PI) dyaw += 2 * Math.PI;
    var k = Math.min(1, dt * 9); ui.yaw += dyaw * k; ui.pitch += (pitch - ui.pitch) * k;
  }

  /* ---------- tiro ---------- */
  var ultTiro = 0, _o = new THREE.Vector3(), _d = new THREE.Vector3();
  function atirar(agora) {
    var w = inv.at >= 0 ? inv.a[inv.at] : null, arma = w ? w[0] : 'soco', A0 = A[arma];
    if ((agora - ultTiro) / 1000 < A0.cad || inv.rc > 0 || inv.cu > 0) return;
    if (w && w[1] <= 0) { if ((inv.m[A0.mun] || 0) > 0) { mandar({ t: 'recarregar' }); S.recarga(arma, 2); } else S.vazio(); ultTiro = agora; return; }
    ultTiro = agora;
    // de onde a câmera aponta, achar o ponto mirado
    cam.getWorldDirection(_d); _o.copy(cam.position);
    var o = [_o.x, _o.y, _o.z], d = [_d.x, _d.y, _d.z], t = G.raioMundo(I, o, d, 400, geloArr());
    Object.keys(outros).forEach(function (k) { var x = outros[k]; if (x.est !== 'chao' && x.est !== 'para') return; var h = G.acertaCorpo(o, d, { x: x.x, y: x.y, z: x.z }, x.fl & 4); if (h && h.t < t) t = h.t; });
    var alvo = [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t], ori = [eu.x, eu.y + (eu.ag ? 1.1 : 1.5), eu.z];
    var au = alvoAuto(ui.ads ? 0.45 : 0.32); if (au) { var vo = au.o, lead = 0.12; alvo = [au.x + ((vo.tx || vo.x) - vo.x) * 0.5 + 0 * lead, au.y, au.z + ((vo.tz || vo.z) - vo.z) * 0.5]; }
    var dir = [alvo[0] - ori[0], alvo[1] - ori[1], alvo[2] - ori[2]], l = Math.hypot(dir[0], dir[1], dir[2]) || 1; dir = dir.map(function (v) { return v / l; });
    var mov = Math.hypot(ui.joy.x, ui.joy.y) > 0.2 || !eu.noChao, sp = (au ? 0.45 : 1) * (A0.disp || 0) * (A0.chumbos ? 0 : 1) * (mov ? 1.7 : 1) * (ui.ads ? 0.35 : 1) * (eu.ag ? 0.7 : 1) * (1 + ui.recuo * 0.6);
    dir = [dir[0] + (Math.random() - 0.5) * sp * 2, dir[1] + (Math.random() - 0.5) * sp * 2, dir[2] + (Math.random() - 0.5) * sp * 2];
    mandar({ t: 'tiro', o: ori.map(function (v) { return +v.toFixed(3); }), d: dir.map(function (v) { return +v.toFixed(4); }) });
    if (w) { w[1]--; S.tiro(arma); clarao(meuId); if (!A0.chumbos) { var tt = G.raioMundo(I, ori, dir, A0.alc, geloArr()); var fimP = [ori[0] + dir[0] * Math.min(tt, t + 2), ori[1] + dir[1] * Math.min(tt, t + 2), ori[2] + dir[2] * Math.min(tt, t + 2), 0]; var b = bocaDe(meuBoneco); tracer([b.x, b.y, b.z], fimP, arma); impacto(fimP); } }
    else { S.soco(); meuBoneco.soco = 0.25; }
    ui.recuo = Math.min(1.5, ui.recuo + (A0.rec || 0.3) * 0.35); ui.pitch -= (A0.rec || 0.3) * 0.012; ui.yaw += (Math.random() - 0.5) * (A0.rec || 0.3) * 0.006;
    desenharArmas();
  }

  /* ---------- mapa (mini e grande) ---------- */
  var mapaBase = document.createElement('canvas'); mapaBase.width = mapaBase.height = 512;
  function desenharMapaBase() {
    var g = mapaBase.getContext('2d'), N = 256, img = g.createImageData(N, N), M2 = R.MEIO + 40;
    for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) {
      var x = -M2 + i / N * M2 * 2, z = -M2 + j / N * M2 * 2, h = G.altura(I, x, z), c;
      if (h < -0.2) c = [52 + h * 2, 160 + h * 6, 215 + h * 3]; else if (h < 1) c = [236, 220, 160]; else { var k = Math.min(1, h / 30); c = [100 - k * 30, 190 - k * 40, 70 - k * 10]; }
      var p = (j * N + i) * 4; img.data[p] = c[0]; img.data[p + 1] = c[1]; img.data[p + 2] = c[2]; img.data[p + 3] = 255;
    }
    var tmp = document.createElement('canvas'); tmp.width = tmp.height = N; tmp.getContext('2d').putImageData(img, 0, 0);
    g.imageSmoothingEnabled = true; g.drawImage(tmp, 0, 0, 512, 512);
    function px(v) { return (v + M2) / (M2 * 2) * 512; }
    // estradas
    g.strokeStyle = '#6e6e74'; g.lineWidth = 5; g.lineCap = 'round'; I.estradas.forEach(function (e) { var a = I.cidades[e[0]], b = I.cidades[e[1]]; g.beginPath(); g.moveTo(px(a.x), px(a.z)); g.lineTo(px(b.x), px(b.z)); g.stroke(); });
    g.strokeStyle = '#a5a5ab'; g.lineWidth = 2; I.estradas.forEach(function (e) { var a = I.cidades[e[0]], b = I.cidades[e[1]]; g.beginPath(); g.moveTo(px(a.x), px(a.z)); g.lineTo(px(b.x), px(b.z)); g.stroke(); });
    // árvores (pontinhos) e casas
    I.arvores.forEach(function (a) { g.fillStyle = a.tipo === 'arvore' ? '#2b7a2f' : '#3f9a3a'; g.beginPath(); g.arc(px(a.x), px(a.z), 2.2, 0, 7); g.fill(); });
    I.casas.forEach(function (c) { g.fillStyle = c.tipo === 'galpao' ? '#9aa3a8' : ['#c98a4b', '#c98a4b', '#b5523b', '#f4efe6', '#c98a4b', '#b5523b'][c.cor]; g.fillRect(px(c.x - c.w / 2), px(c.z - c.d / 2), c.w / (M2 * 2) * 512, c.d / (M2 * 2) * 512); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.strokeRect(px(c.x - c.w / 2), px(c.z - c.d / 2), c.w / (M2 * 2) * 512, c.d / (M2 * 2) * 512); });
    mapaBase.px = px;
  }
  function desenharZona(g, px, esc2) {
    if (!P || !P.zona) return; var z = P.zona;
    g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.setLineDash([]); g.beginPath(); g.arc(px(z[3]), px(z[4]), z[5] * esc2, 0, 7); g.stroke();
    g.strokeStyle = '#3fb8ff'; g.lineWidth = 3; g.beginPath(); g.arc(px(z[0]), px(z[1]), z[2] * esc2, 0, 7); g.stroke();
    g.fillStyle = 'rgba(40,120,255,.18)'; g.beginPath(); g.rect(-50, -50, 2000, 2000); g.arc(px(z[0]), px(z[1]), z[2] * esc2, 0, 7, true); g.fill();
  }
  function seta(g, x, y, ang, tam, cor) { g.save(); g.translate(x, y); g.rotate(-ang + Math.PI); g.fillStyle = cor; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -tam); g.lineTo(tam * 0.7, tam); g.lineTo(0, tam * 0.5); g.lineTo(-tam * 0.7, tam); g.closePath(); g.fill(); g.stroke(); g.restore(); }
  function desenharMini() {
    var c = $('mini'), g = c.getContext('2d'), W = c.width, M2 = R.MEIO + 40, janelaM = 150, k = 512 / (M2 * 2);
    var cx = (eu.x + M2) * k, cz = (eu.z + M2) * k, lado = janelaM * k;
    g.fillStyle = '#29a8e0'; g.fillRect(0, 0, W, W);
    g.drawImage(mapaBase, cx - lado / 2, cz - lado / 2, lado, lado, 0, 0, W, W);
    var esc2 = W / janelaM, px = function (v) { return 0; }; void px;
    var pxX = function (v) { return (v - eu.x) * esc2 + W / 2; }, pxZ = function (v) { return (v - eu.z) * esc2 + W / 2; };
    if (P && P.zona) { var z = P.zona; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(pxX(z[3]), pxZ(z[4]), z[5] * esc2, 0, 7); g.stroke(); g.strokeStyle = '#3fb8ff'; g.lineWidth = 3; g.beginPath(); g.arc(pxX(z[0]), pxZ(z[1]), z[2] * esc2, 0, 7); g.stroke(); }
    if (P && modo === 'trem') { g.setLineDash([6, 5]); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(pxX(P.trem.x0), pxZ(P.trem.z0)); g.lineTo(pxX(P.trem.x1), pxZ(P.trem.z1)); g.stroke(); g.setLineDash([]); }
    seta(g, W / 2, W / 2, ui.yaw, 8, '#ffd23f');
  }
  function abrirMapa() {
    if (!I) return; $('mapaG').hidden = false; var c = $('mapaC'), g = c.getContext('2d'), W = c.width, M2 = R.MEIO + 40, k = W / (M2 * 2), px = function (v) { return (v + M2) * k; };
    g.drawImage(mapaBase, 0, 0, W, W);
    // grade de letras
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1; g.fillStyle = '#fff'; g.font = 'bold 13px Nunito, sans-serif';
    for (var i = 0; i <= 8; i++) { var p = i * W / 8; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, W); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(W, p); g.stroke(); if (i < 8) { g.fillText('ABCDEFGH'[i], p + 4, 14); g.fillText('JKLMNOPQ'[i], 4, p + 26); } }
    if (P) { desenharZona(g, px, k); g.setLineDash([10, 8]); g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(px(P.trem.x0), px(P.trem.z0)); g.lineTo(px(P.trem.x1), px(P.trem.z1)); g.stroke(); g.setLineDash([]); }
    I.cidades.forEach(function (c2) { g.font = 'bold 15px Nunito, sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeText(c2.nome, px(c2.x), px(c2.z) - 4); g.fillStyle = '#fff'; g.fillText(c2.nome, px(c2.x), px(c2.z) - 4); });
    g.textAlign = 'left';
    seta(g, px(eu.x), px(eu.z), ui.yaw, 11, '#ffd23f');
  }
  var _bus = '';
  function desenharBussola() {
    var graus = ((-ui.yaw * 180 / Math.PI) % 360 + 360 + 180) % 360, h = '', NOMES = { 0: 'N', 45: 'NE', 90: 'L', 135: 'SE', 180: 'S', 225: 'SO', 270: 'O', 315: 'NO' };
    for (var a = Math.floor((graus - 70) / 15) * 15; a <= graus + 70; a += 15) { var aa = (a + 360) % 360, x = 150 + (a - graus) * 2; h += '<span style="position:absolute;left:' + (x - 12) + 'px;width:24px;text-align:center;' + (NOMES[aa] ? 'color:#ffd23f;font-size:14px' : 'opacity:.8') + '">' + (NOMES[aa] || aa) + '</span>'; }
    if (h !== _bus) { _bus = h; $('bussola').innerHTML = h; } $('hGrau').textContent = Math.round(graus);
  }

  /* ---------- morte e fim ---------- */
  function morri(m) {
    eu.est = 'morto'; modo = 'morto'; ui.tiro = false; S.morte(); S.vento(0);
    $('fim').innerHTML = '<h2>VOCÊ FOI ABATIDO</h2><div class="lin"><div>Posição<b>#' + m.rank + '</b></div><div>Abates<b>' + m.kills + '</b></div></div>' + (m.por ? '<p>por <b>' + esc(m.por) + '</b></p>' : '') + '<div class="bts"><button class="bt-pq" id="fAssistir">ASSISTIR</button><button class="bt-pq" id="fSair" style="background:linear-gradient(180deg,#9be81f,#5ea80f);border-color:#e8ff9a">VOLTAR AO LOBBY</button></div>';
    $('fim').hidden = false; recompensa(m.rank, m.kills);
    $('fAssistir').onclick = function () { $('fim').hidden = true; P.assistir = m.porId || 0; };
    $('fSair').onclick = function () { if (ws) ws.close(); voltarLobby(); };
  }
  function recompensa(rank, kills) { if (P && P.recebeu) return; var moedas = kills * 10 + Math.max(0, 21 - rank) * 4 + (inv.mo || 0), xp = kills * 25 + Math.max(0, 21 - rank) * 8; perfil.moedas += moedas; perfil.xp += xp; if (rank === 1) perfil.gemas += 5; gravar('ql_moedas', perfil.moedas); gravar('ql_xp', perfil.xp); gravar('ql_gemas', perfil.gemas); P && (P.recebeu = 1); }
  function fimPartida(m) {
    var venci = m.vencedor && m.vencedor.id === meuId, eu2 = m.todos.find(function (r) { return r.id === meuId; }) || { rank: '?', kills: 0, dano: 0 };
    modo = 'fim'; ui.tiro = false; S.vento(0);
    if (venci) { S.vitoria(); if (P) P.recebeu = 0; recompensa(1, eu2.kills); } else recompensa(eu2.rank, eu2.kills);
    $('fim').innerHTML = (venci ? '<h1>CAMPEÃO!</h1>' : '<h2>FIM DA PARTIDA</h2><p>Campeão: <b style="color:#ffd23f">' + esc(m.vencedor ? m.vencedor.nome : '—') + '</b></p>') +
      '<div class="lin"><div>Posição<b>#' + eu2.rank + '</b></div><div>Abates<b>' + eu2.kills + '</b></div><div>Dano<b>' + eu2.dano + '</b></div></div>' +
      '<div class="tab">' + m.res.map(function (r) { return '<span class="' + (r.id === meuId ? 'eu' : '') + '">#' + r.rank + '</span><span class="' + (r.id === meuId ? 'eu' : '') + '">' + esc(r.nome) + '</span><span>💀 ' + r.kills + '</span>'; }).join('') + '</div>' +
      '<div class="bts"><button class="bt-pq" id="fSair" style="background:linear-gradient(180deg,#9be81f,#5ea80f);border-color:#e8ff9a;font-size:16px;padding:10px 28px">VOLTAR AO LOBBY</button></div>';
    $('fim').hidden = false; $('fSair').onclick = function () { if (ws) ws.close(); voltarLobby(); };
  }
  function voltarLobby() {
    modo = 'lobby'; P = null; limparOutros(); Object.keys(baus).forEach(function (k) { cena.remove(baus[k]); }); baus = {}; Object.keys(drops).forEach(function (k) { cena.remove(drops[k].g); }); drops = {}; Object.keys(marcasEl).forEach(function (k) { marcasEl[k].remove(); }); marcasEl = {}; Object.keys(itensMesh).forEach(function (k) { cena.remove(itensMesh[k]); }); itensMesh = {}; Object.keys(gelos).forEach(function (k) { cena.remove(gelos[k].g); }); gelos = {};
    if (meuBoneco && meuBoneco.raiz.parent) meuBoneco.raiz.parent.remove(meuBoneco.raiz); if (eu.para) { cena.remove(eu.para); eu.para = null; }
    $('fim').hidden = true; $('mapaG').hidden = true; ZONA.mesh.visible = false; S.motorTrem(0); S.vento(0); cena.fog = new THREE.Fog(NEB, 160, 520);
    mostrar('tLobby'); montarLobby(); pintarPerfil();
  }

  /* ---------- física local ---------- */
  function andar(dt) {
    var jx = ui.joy.x, jy = ui.joy.y; if (ui.autoCorre && Math.hypot(jx, jy) < 0.2) { jx = 0; jy = -1; }
    if (teclas.w) jy = -1; if (teclas.s) jy = 1; if (teclas.a) jx = -1; if (teclas.d) jx = 1;
    var mag = Math.min(1, Math.hypot(jx, jy)), ang = ui.yaw + Math.atan2(-jx, -jy); if (eu.est === 'ar' && !celular) { ui.acel = !!teclas.shift; ui.merg = !!teclas.q; }
    if (eu.est === 'cabine') return false;
    if (eu.est === 'ar' || eu.est === 'para') {
      var chao = Math.max(G.altura(I, eu.x, eu.z), R.AGUA - 0.4), acel = ui.acel && eu.est === 'ar', merg = ui.merg && eu.est === 'ar', vh = eu.est === 'ar' ? (acel ? R.ACELERA : merg ? R.PLANA * 0.6 : R.PLANA) : R.PARA_H, vv = eu.est === 'ar' ? (merg ? R.MERGULHO : acel ? R.QUEDA * 1.4 : R.QUEDA) : R.PARA_V; if (acel && mag < 0.1) { mag = 1; ang = ui.yaw; }
      if (mag > 0.1) { eu.x += Math.sin(ang) * vh * mag * dt; eu.z += Math.cos(ang) * vh * mag * dt; var dr = ang - eu.ry; while (dr > Math.PI) dr -= 2 * Math.PI; while (dr < -Math.PI) dr += 2 * Math.PI; eu.ry += dr * Math.min(1, dt * 4); }
      eu.y -= vv * dt; var lim = R.MEIO + 35; eu.x = Math.max(-lim, Math.min(lim, eu.x)); eu.z = Math.max(-lim, Math.min(lim, eu.z));
      if (eu.est === 'ar' && eu.y - chao < R.ABRE_PARA) abrirPara();
      if (eu.y <= chao + 0.02) { eu.y = chao; eu.est = 'chao'; modo = 'chao'; eu.noChao = true; S.pouso(); S.vento(0); aviso('Pegue armas nas casas!', 2500); }
      S.vento(eu.est === 'ar' ? Math.max(vv / R.MERGULHO, vh / R.ACELERA) : 0.25);
      return mag > 0.1;
    }
    if (eu.est !== 'chao') return false;
    if (eu.vault) { var V = eu.vault; V.t += dt / 0.5; var k2 = Math.min(1, V.t); eu.x = V.x0 + (V.x1 - V.x0) * k2; eu.z = V.z0 + (V.z1 - V.z0) * k2; eu.y = V.y0 + (V.y1 - V.y0) * k2 + Math.sin(k2 * Math.PI) * V.alto; if (V.t >= 1) { eu.vault = null; eu.vy = 0; eu.noChao = true; } return true; }
    var noAgua = G.altura(I, eu.x, eu.z) < R.AGUA - 0.4, vel = (eu.ag ? R.AGACHA : R.ANDA) * (ui.ads ? 0.6 : 1) * (noAgua ? 0.55 : 1) * (inv.cu > 0 ? 0.5 : 1);
    if (mag > 0.1) {
      var ax = eu.x, az = eu.z; G.mover(I, eu, Math.sin(ang) * vel * mag * dt, Math.cos(ang) * vel * mag * dt, 0.38, geloArr());
      // encostou numa janela/cerca andando pra frente: pula sozinho
      if (mag > 0.6 && Math.hypot(eu.x - ax, eu.z - az) < vel * mag * dt * 0.3) { eu.preso = (eu.preso || 0) + dt; if (eu.preso > 0.35 && eu.noChao) { eu.preso = 0; vault(ang); } } else eu.preso = 0;
      var mira = ui.ads || ui.tiro; if (!mira) { var d2 = ang - eu.ry; while (d2 > Math.PI) d2 -= 2 * Math.PI; while (d2 < -Math.PI) d2 += 2 * Math.PI; eu.ry += d2 * Math.min(1, dt * 12); }
      void ax; void az;
    }
    if (ui.ads || ui.tiro || inv.at >= 0 && mag < 0.1) eu.ry = ui.yaw;
    // gravidade e chão
    var h = Math.max(G.altura(I, eu.x, eu.z), R.AGUA - 1.1);
    eu.vy -= R.GRAV * dt; eu.y += eu.vy * dt; if (eu.y <= h) { eu.y = h; eu.vy = 0; eu.noChao = true; } else if (eu.y - h > 0.05) eu.noChao = false;
    return mag > 0.1;
  }

  /* ---------- câmera ---------- */
  var _alvo = new THREE.Vector3(), mirando = null;
  function camera(dt) {
    var e = eu, k = Math.min(1, dt * 14);
    if (modo === 'cabine' || modo === 'trem') { var tp = TREM.grupo.position, dist = modo === 'cabine' ? 62 : 58; cam.position.set(tp.x - Math.sin(ui.yaw) * Math.cos(ui.pitch) * dist, tp.y + 6 + Math.sin(ui.pitch) * dist, tp.z - Math.cos(ui.yaw) * Math.cos(ui.pitch) * dist); var fr = TREM.grupo.rotation.y, adiante = modo === 'cabine' ? -4 : 20; _alvo.set(tp.x + Math.sin(fr) * adiante, tp.y, tp.z + Math.cos(fr) * adiante); cam.lookAt(_alvo); cam.fov = 70; cam.updateProjectionMatrix(); return; }
    if (P && P.assistir && modo === 'morto') { var o2 = outros[P.assistir]; if (!o2 || o2.est === 'morto') { var vivos = Object.keys(outros).filter(function (q) { return outros[q].est === 'chao'; }); P.assistir = vivos.length ? +vivos[0] : 0; } if (o2) { cam.position.lerp(new THREE.Vector3(o2.x - Math.sin(o2.ry) * 4, o2.y + 2.4, o2.z - Math.cos(o2.ry) * 4), k); _alvo.set(o2.x, o2.y + 1.4, o2.z); cam.lookAt(_alvo); } return; }
    var ar = e.est === 'ar' || e.est === 'para', mira = miraAtual(), escopo = ui.ads && (mira === '4x' || mira === '8x');
    var fovAlvo = ui.ads ? (mira === '8x' ? 9 : mira === '4x' ? 18 : mira === '2x' ? 34 : 46) : (ar ? 75 : 70);
    cam.fov += (fovAlvo - cam.fov) * Math.min(1, dt * 16); cam.updateProjectionMatrix();
    $('escopo').hidden = !escopo; $('escopoTxt').textContent = mira || ''; var holo = ui.ads && (mira === '2x' || !mira); $('ponto').hidden = !holo; $('mira').style.display = escopo || holo ? 'none' : '';
    if (meuBoneco) meuBoneco.raiz.visible = !escopo && e.est !== 'morto';
    var yaw = ui.yaw, pitch = ui.pitch, alvoY = e.ag ? 1.2 : 1.55, dist = ar ? 6.5 : ui.ads ? 1.8 : 3.3, lado = ar ? 0 : ui.ads ? 0.45 : 0.75;
    var bx = e.x - Math.cos(yaw) * lado, bz = e.z + Math.sin(yaw) * lado, by = e.y + alvoY;
    if (escopo) { cam.position.set(e.x, e.y + (e.ag ? 1.15 : 1.55), e.z); var d = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)); _alvo.copy(cam.position).add(d); cam.lookAt(_alvo); return; }
    var dx = -Math.sin(yaw) * Math.cos(pitch) * dist, dy = Math.sin(pitch) * dist + (ui.ads ? 0.2 : 0.35), dz = -Math.cos(yaw) * Math.cos(pitch) * dist;
    // câmera não atravessa parede
    if (!ar) { var l = Math.hypot(dx, dy, dz), t = G.raioMundo(I, [bx, by, bz], [dx / l, dy / l, dz / l], l, geloArr()); if (t < l) { var f = Math.max(0.15, (t - 0.25) / l); dx *= f; dy *= f; dz *= f; } }
    var alvoCam = new THREE.Vector3(bx + dx, by + dy, bz + dz); if (ar) cam.position.lerp(alvoCam, k); else cam.position.copy(alvoCam);
    var mh = G.altura(I, cam.position.x, cam.position.z) + 0.3; if (cam.position.y < mh) cam.position.y = mh;
    _alvo.set(bx + Math.sin(yaw) * 6 * Math.cos(pitch), by - Math.sin(pitch) * 6, bz + Math.cos(yaw) * 6 * Math.cos(pitch)); cam.lookAt(_alvo);
  }

  /* ---------- laço principal ---------- */
  var ultimo = performance.now(), ultEnvio = 0, passoT = 0, fpsM = 60;
  function quadro() {
    requestAnimationFrame(quadro);
    var agora = performance.now(), dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora; fpsM = fpsM * 0.95 + (1 / Math.max(dt, 0.001)) * 0.05;
    for (var i = fx.length - 1; i >= 0; i--) { var f = fx[i]; f.t += dt; f.f(f.t, f.dur); if (f.t >= f.dur) { f.fim(); fx.splice(i, 1); } }
    CEU.ceu.position.copy(cam.position); CEU.nuvens.rotation.y += dt * 0.004; if (ilha && ilha.atualizar) ilha.atualizar(dt);
    var fl = parseFloat($('flash').style.opacity || 0); if (fl > 0) $('flash').style.opacity = Math.max(0, fl - dt * 2);
    if (modo === 'lobby') { if (lobby) quadroLobby(dt); renderer.render(cena, cam); return; }
    if (modo === 'ver') { renderer.render(cena, cam); return; }
    var moveu = andar(dt);
    if (P) P.t += dt;
    // o trem
    if (P && P.t < P.trem.dur + 6) { var tp = posTrem(); TREM.grupo.visible = true; TREM.grupo.position.set(tp.x, R.TREM_ALT, tp.z); TREM.grupo.rotation.y = P.trem.ry; TREM.atualizar(dt, true); buzina(dt, modo === 'trem'); S.motorTrem(modo === 'trem' ? 0.9 : Math.max(0, 0.5 - Math.hypot(tp.x - eu.x, tp.z - eu.z) / 300)); }
    else if (P) { TREM.grupo.visible = false; TREM.esconderEfeitos(); S.motorTrem(0); }
    if (modo === 'cabine') { esperaT += dt; var ang0 = esperaT * 0.08, rT = 200; TREM.grupo.position.set(Math.cos(ang0) * rT, 110, Math.sin(ang0) * rT); TREM.grupo.rotation.y = Math.atan2(-Math.sin(ang0), Math.cos(ang0)); TREM.atualizar(dt, true); buzina(dt, true); S.motorTrem(0.9); }
    // meu boneco
    if (meuBoneco) {
      var est = eu.est === 'trem' || eu.est === 'cabine' ? null : eu.est;
      meuBoneco.raiz.visible = !!est && est !== 'morto';
      if (est) {
        var base = { x: 0, y: 0, z: 0 };
        meuBoneco.raiz.position.set(base.x + eu.x, base.y + eu.y, base.z + eu.z); meuBoneco.raiz.rotation.y = eu.ry;
        var fl2 = (moveu ? 1 : 0) | (eu.ag ? 4 : 0) | (inv.cu > 0 ? 8 : 0) | (inv.rc > 0 ? 16 : 0) | (meuBoneco.soco > 0 ? 64 : 0); meuBoneco.soco = (meuBoneco.soco || 0) - dt;
        BO.animar(meuBoneco, est === 'cabine' ? 'chao' : est, fl2, moveu ? 4 : 0, ui.pitch * 0.8, dt);
        paraquedas(eu, meuBoneco, est === 'para');
        if (moveu && est === 'chao' && eu.noChao) { passoT -= dt * (eu.ag ? 1.2 : 2.2); if (passoT <= 0) { passoT = 1; S.passo(null, eu.ag ? 0.08 : 0.16); } }
      }
    }
    // outros
    Object.keys(outros).forEach(function (k) { animarOutro(outros[k], dt); });
    // gelos crescendo/derretendo
    Object.keys(gelos).forEach(function (k) { var g = gelos[k]; if (g.morrer !== undefined) { g.morrer -= dt; g.g.scale.y = Math.max(0.01, g.morrer / 0.4); if (g.morrer <= 0) { cena.remove(g.g); delete gelos[k]; } } else if (g.g.scale.y < 1) g.g.scale.y = Math.min(1, g.g.scale.y + dt * 6); });
    if (P) {
      if (P.zona) { ZONA.atualizar(P.zona[0], P.zona[1], P.zona[2], dt); var fora = Math.hypot(eu.x - P.zona[0], eu.z - P.zona[1]) > P.zona[2]; $('tJogo').style.boxShadow = fora && eu.est === 'chao' ? 'inset 0 0 80px rgba(60,140,255,.7)' : ''; if (!$('aviso').dataset.fixo) $('aviso').textContent = P.zona[6] < 0 ? '' : (P.zona[7] ? 'Zona fechando: ' : 'A zona segura encolhe em ') + fmt(P.zona[8]); }
      atualizarItens(dt); atualizarDrops(dt); marcas(); pegadas();
      // tiro segurando
      if (eu.est === 'chao' && (ui.tiro || ui.ads)) grudar(dt * (ui.tiro ? 1 : 0.5));
      if (ui.tiro && eu.est === 'chao') atirar(agora);
      ui.recuo = Math.max(0, ui.recuo - dt * 2.2);
      // envia posição
      if (agora - ultEnvio > 75 && eu.est !== 'trem' && eu.est !== 'morto') { ultEnvio = agora; mandar({ t: 'p', x: +eu.x.toFixed(2), y: +eu.y.toFixed(2), z: +eu.z.toFixed(2), ry: +eu.ry.toFixed(2), pi: +ui.pitch.toFixed(2), ag: eu.ag ? 1 : 0, f: moveu ? 1 : 0, e: eu.est }); }
      $('hVivos').textContent = P.vivos; $('tJogo').dataset.fase = eu.est;
      $('bPara').hidden = eu.est !== 'ar'; $('bAcel').hidden = $('bMerg').hidden = eu.est !== 'ar'; $('altura').hidden = !(eu.est === 'ar' || eu.est === 'para'); if (eu.est === 'ar' || eu.est === 'para') $('hAlt').textContent = Math.max(0, Math.round(eu.y - G.altura(I, eu.x, eu.z)));
      var ac = inv.cu > 0 ? ['CURANDO', 1 - inv.cu / 3] : inv.rc > 0 ? ['RECARREGANDO', 0.5] : null; $('acao').hidden = !ac; if (ac) { $('acaoTxt').textContent = ac[0]; $('acaoBar').style.width = (ac[1] * 100) + '%'; }
      if (Math.floor(agora / 100) !== Math.floor((agora - dt * 1000) / 100)) { desenharMini(); desenharBussola(); desenharArmas(); }
      S.ouvinte(cam.position.x, cam.position.y, cam.position.z, Math.sin(ui.yaw), Math.cos(ui.yaw));
    }
    // sol segue o jogador (sombras)
    var sx = modo === 'cabine' || modo === 'trem' ? TREM.grupo.position : eu; sol.position.set(sx.x + 80, (sx.y || 0) + 140, sx.z + 50); sol.target.position.set(sx.x, sx.y || 0, sx.z);
    camera(dt);
    renderer.render(cena, cam);
  }
  var buzT = 2; function buzina(dt, perto) { if (!perto) return; buzT -= dt; if (buzT <= 0) { buzT = 7 + Math.random() * 5;  } }
  function fmt(s) { s = Math.max(0, s | 0); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function paraquedas(o, b, ligado) {
    if (ligado && !o.para) { o.para = BO.paraquedas([0xe8572a, 0x2f86e8, 0x9be81f, 0xb24bff][Math.floor(Math.random() * 4)]); cena.add(o.para); }
    if (!ligado && o.para) { cena.remove(o.para); o.para = null; }
    if (o.para) { o.para.position.set(b.raiz.position.x, b.raiz.position.y + (o.para.userData.alt || 3.8), b.raiz.position.z); o.para.rotation.y = b.raiz.rotation.y; o.para.rotation.z = Math.sin(performance.now() / 600) * 0.06; }
  }
  function animarOutro(o, dt) {
    var b = o.b, vis = o.est !== 'trem' && o.est !== 'morto';
    if (o.tx !== undefined) { var k = Math.min(1, dt * 18); o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k; o.z += (o.tz - o.z) * k; var dr = o.try - o.ry; while (dr > Math.PI) dr -= 2 * Math.PI; while (dr < -Math.PI) dr += 2 * Math.PI; o.ry += dr * k; }
    var d = Math.hypot(o.x - eu.x, o.z - eu.z); vis = vis && (modo === 'cabine' || d < 260);
    b.raiz.visible = vis; if (!vis) { paraquedas(o, b, false); return; }
    var base = { x: 0, y: 0, z: 0 };
    b.raiz.position.set(base.x + o.x, base.y + o.y, base.z + o.z); b.raiz.rotation.y = o.ry;
    o.vel = (o.vel || 0) * 0.8 + Math.hypot(o.x - (o.px || o.x), o.z - (o.pz || o.z)) / Math.max(dt, 0.001) * 0.2; o.px = o.x; o.pz = o.z;
    var fl = (o.vel > 0.6 ? 1 : 0) | (o.fl & 4) | (o.fl & 8) | (o.fl & 16);
    if (d < 120 || modo === 'cabine') BO.animar(b, o.est === 'cabine' ? 'chao' : o.est, fl, o.vel, o.pi || 0, dt);
    paraquedas(o, b, o.est === 'para');
    if (o.vel > 1 && o.est === 'chao' && d < 30) { o.passo -= dt * 2.2; if (o.passo <= 0) { o.passo = 1; S.passo({ x: o.x, y: o.y, z: o.z }, 0.25); } }
  }

  /* ---------- começo ---------- */
  pintarPerfil(); quadro();
  BO.carregar(function () { BO.carregarPara(function () { AR.carregar(function () { MU.carregarNave(function (n) { if (n) TREM.trocarModelo(n); trocarIlha(777); montarLobby(); }); }); }); });
  document.addEventListener('pointerdown', function () { S.iniciar(); }, { once: true });
  window.__QL = { contar: function () { return [Object.keys(itensMesh).length, Object.keys(baus).length, P ? Object.keys(P.itens).length : -1, eu.x.toFixed(0), eu.z.toFixed(0)]; }, ver: function (a, b) { modo = 'ver'; cam.position.set(a[0], a[1], a[2]); cam.lookAt(b[0], b[1], b[2]); cam.fov = 60; cam.updateProjectionMatrix(); TREM.grupo.visible = false; return I.cidades.map(function (c) { return [c.nome, Math.round(c.x), Math.round(c.z), Math.round(c.alt), !!c.fabrica]; }); }, equipar: function () { mandar({ t: 'dbg' }); }, eu: eu, inv: function () { return inv; }, ui: ui, P: function () { return P; }, outros: function () { return outros; }, mandar: mandar, modo: function () { return modo; }, fps: function () { return fpsM; }, cam: cam };
})();
