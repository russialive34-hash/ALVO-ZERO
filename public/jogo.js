/* ALVO ZERO — cliente: telas, rede, controles, tiro, armas na mão, HUD. */
(function () {
  'use strict';
  var G = window.REGRAS, R = G.R, A = G.ARMAS, S = window.SOM, AR = window.ARMAS3D, MU = window.MUNDO;
  var $ = function (id) { return document.getElementById(id); };
  function ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function gravar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function aviso(t) { var e = $('aviso'); e.textContent = t; e.classList.add('on'); clearTimeout(aviso.h); aviso.h = setTimeout(function () { e.classList.remove('on'); }, 2500); }
  var celular = matchMedia('(pointer: coarse)').matches;
  var cod = ler('az_cod'); if (!cod) { cod = Math.random().toString(36).slice(2) + Date.now().toString(36); gravar('az_cod', cod); }

  /* ---------- 3D ---------- */
  /* ---------- opções de gráfico (salvas no aparelho) ---------- */
  var NIVEIS = {
    baixo: { nome: 'BAIXO', res: 0.75, sombra: 0, aniso: 1, dica: 'Mais FPS. Sem sombras, imagem mais simples.' },
    medio: { nome: 'MÉDIO', res: 1, sombra: 1, aniso: 2, dica: 'Equilibrado: sombras e boa imagem.' },
    alto: { nome: 'ALTO', res: 1.5, sombra: 2, aniso: 4, dica: 'Sombras nítidas e imagem mais definida.' },
    ultra: { nome: 'ULTRA', res: 2, sombra: 2, aniso: 8, suave: true, dica: 'Máximo detalhe e bordas lisas (celular forte). Bordas lisas valem ao reabrir o jogo.' }
  };
  var graf = { nivel: ler('az_graf') || (celular ? 'medio' : 'alto'), brilho: +(ler('az_brilho') || 1.05), cheia: ler('az_cheia') ? ler('az_cheia') === '1' : celular };
  if (!NIVEIS[graf.nivel]) graf.nivel = 'medio';
  // mira: PRECISÃO (manual), ASSISTIDA (gruda um pouco no inimigo) e AUTOMÁTICA (segue o inimigo e atira sozinha)
  var MODOS_MIRA = {
    precisao: { nome: 'PRECISÃO', cone: 0, puxa: 0, freio: 1, auto: false, dica: 'Tudo no seu dedo. Sem ajuda nenhuma.' },
    assistida: { nome: 'ASSISTIDA', cone: 0.11, puxa: 3.5, freio: 0.6, auto: false, dica: 'A mira fica mais lenta perto do inimigo e puxa um pouco para ele.' },
    automatica: { nome: 'AUTOMÁTICA', cone: 0.26, puxa: 9, freio: 0.5, auto: true, dica: 'A mira segue o inimigo sozinha e atira quando ele estiver na mira.' }
  };
  var ctrl = { mira: ler('az_mira') || (celular ? 'assistida' : 'precisao'), sens: +(ler('az_sens') || 1) };
  if (!MODOS_MIRA[ctrl.mira]) ctrl.mira = 'assistida';
  var freioMira = 1, alvoAuto = null;
  var renderer = new THREE.WebGLRenderer({ antialias: !celular || graf.nivel === 'ultra', powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, NIVEIS[graf.nivel].res)); renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = false;
  $('tres').appendChild(renderer.domElement);
  var cena = new THREE.Scene(), cam = new THREE.PerspectiveCamera(75, 1, 0.05, 220);
  // cena das armas na mão (desenhada por cima, sem atravessar paredes)
  var cenaMao = new THREE.Scene(), camMao = new THREE.PerspectiveCamera(60, 1, 0.01, 10);
  cenaMao.add(new THREE.HemisphereLight(0xffffff, 0x404040, 0.9)); var luzMao = new THREE.DirectionalLight(0xffffff, 0.9); luzMao.position.set(1, 2, 1); cenaMao.add(luzMao);
  function ajustar() { var w = innerWidth, h = innerHeight; renderer.setSize(w, h); cam.aspect = camMao.aspect = w / h; cam.updateProjectionMatrix(); camMao.updateProjectionMatrix(); }
  addEventListener('resize', ajustar); ajustar();
  var qualidade = NIVEIS[graf.nivel].sombra;
  function aplicarGraficos() {
    var n = NIVEIS[graf.nivel]; qualidade = n.sombra;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, n.res));
    renderer.shadowMap.enabled = n.sombra > 0; renderer.shadowMap.type = n.suave ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; renderer.shadowMap.needsUpdate = true;
    renderer.toneMappingExposure = graf.brilho;
    AR.anisotropia = Math.min(n.aniso, renderer.capabilities.getMaxAnisotropy());
    [cena, cenaMao].forEach(function (c) { c.traverse(function (o) {
      if (o.isDirectionalLight && o.shadow && o.parent === c) {
        o.castShadow = n.sombra > 0; var t = n.sombra > 1 ? 2048 : 1024;
        if (o.shadow.mapSize.x !== t) { o.shadow.mapSize.set(t, t); if (o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; } }
      }
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
        m.needsUpdate = true; var t = m.map; if (t && t.anisotropy !== AR.anisotropia) { t.anisotropy = AR.anisotropia; if (t.image && t.image.complete !== false) t.needsUpdate = true; }
      });
    }); });
    ajustar();
  }
  // tela cheia de verdade (navegador): no primeiro toque esconde barras e trava deitado
  function telaCheia() {
    if (!graf.cheia || document.fullscreenElement || document.webkitFullscreenElement) return;
    var d = document.documentElement, f = d.requestFullscreen || d.webkitRequestFullscreen; if (!f) return;
    try { var p = f.call(d, { navigationUI: 'hide' }); if (p && p.then) p.then(function () { try { screen.orientation.lock('landscape').catch(function () {}); } catch (e) {} }).catch(function () {}); } catch (e) {}
  }
  addEventListener('pointerup', telaCheia, true);
  document.addEventListener('fullscreenchange', function () { setTimeout(ajustar, 120); });
  if (window.visualViewport) visualViewport.addEventListener('resize', ajustar);

  /* ---------- fundo do menu: mapa girando devagar ---------- */
  var mundoAtual = null, mapaAtual = null;
  function carregarMapa(id) {
    if (mapaAtual && mapaAtual.id === id) return;
    while (cena.children.length) cena.remove(cena.children[0]);
    mapaAtual = G.MAPAS[id]; mundoAtual = MU.montar(cena, mapaAtual, qualidade); S.ambiente(!mapaAtual.ceu);
    efeitos = []; marcas = [];
  }
  carregarMapa('biblioteca'); aplicarGraficos();

  /* ---------- rede ---------- */
  var ws = null, meuId = 0, perfil = null, salaInfo = null, salasLista = [], salaSel = null, estado = 'nick';
  function conectar() {
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    ws.onopen = function () { if (pendente) { mandar(pendente); pendente = null; } else if (ler('az_token')) { estado = 'entrando'; mandar({ t: 'token', token: ler('az_token') }); } };
    ws.onmessage = function (e) { var m; try { m = JSON.parse(e.data); } catch (x) { return; } receber(m); };
    ws.onclose = function () { aviso('Conexão perdida… reconectando'); setTimeout(conectar, 2000); if (estado === 'jogo') sairPartida(); mostrar('tNick'); estado = 'nick'; };
  }
  function mandar(m) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); }
  function mostrar(id) { ['tNick', 'tLobby', 'tSala', 'tJogo'].forEach(function (t) { $(t).hidden = t !== id; }); }

  function receber(m) {
    switch (m.t) {
      case 'bemvindo': meuId = m.id; perfil = m.perfil; salasLista = m.salas; if (estado === 'entrando') { estado = 'lobby'; mostrar('tLobby'); desenharPerfil(); desenharSalas(); if (minhasArmas().indexOf(minhaArma) < 0) minhaArma = 'ar9'; mandar({ t: 'arma', arma: minhaArma }); } break;
      case 'perfil': var antes = perfil; perfil = m.perfil; desenharPerfil(); if (antes && m.perfil.patente > antes.patente && antes.nome === m.perfil.nome) mostrarPromocao(antes, m.perfil); break;
      case 'salas': salasLista = m.salas; desenharSalas(); break;
      case 'sala': salaInfo = m.sala; if (estado !== 'jogo') { estado = 'sala'; mostrar('tSala'); } desenharSala(); break;
      case 'erro': aviso(m.txt); break;
      case 'conta': contaOk(m); break;
      case 'conta_erro': contaErro(m); break;
      case 'saiuConta': break;
      case 'aviso': aviso(m.txt); break;
      case 'ranking': janelaRanking(m); break;
      case 'amigos': amigosInfo = m; $('aBadge').hidden = !m.pedidos.length; $('aBadge').textContent = m.pedidos.length; if (!$('janela').hidden && $('janela').dataset.tipo === 'amigos') janelaAmigos(); break;
      case 'cla': janelaCla(m); break;
      case 'convite': janela('<h3>CONVITE</h3><p><b>' + esc(m.de) + '</b> chamou você para a sala <b>' + esc(m.nomeSala) + '</b><br><small style="color:#9fb0c0">' + esc((G.MAPAS[m.mapa] || {}).nome || '') + ' · ' + esc(G.MODOS[m.modo] || '') + '</small></p><div class="linha"><button class="bt" id="jNao">RECUSAR</button><button class="bt bt-ouro" id="jSim">ENTRAR</button></div>', function () { $('jNao').onclick = fecharJanela; $('jSim').onclick = function () { if (estado === 'jogo') return aviso('Termine a partida primeiro'); mandar({ t: 'entrar', id: m.sala }); fecharJanela(); }; }); S.troca(); break;
      case 'premio': S.promocao(); aviso('+' + m.moedas + ' moedas · ' + m.txt); break;
      case 'comprou': if (perfil && perfil.armas && perfil.armas.indexOf(m.arma) < 0) perfil.armas.push(m.arma); S.promocao(); aviso('Você comprou ' + G.item(m.arma).nome + '!'); lojaSel = m.arma; if (G.COLETES[m.arma]) { if (perfil) perfil.colete = m.arma; } else if (G.SKINS[m.arma]) { if (perfil) perfil.skin = m.arma; } else equipar(m.arma); desenharArmasSala(); if (!$('loja').hidden) desenharLoja(); break;
      case 'chat': { var l = $('sChat'), p = document.createElement('p'); p.innerHTML = '<b class="' + m.time + '">' + esc(m.nome) + ':</b> ' + esc(m.txt); l.appendChild(p); l.scrollTop = 1e6; break; }
      case 'inicio': iniciarPartida(m); break;
      case 'rodada': limparCorpos(); rodada = m; partida.placar = m.placar; atualizarPlacar(); bombaMundo(null); $('morto').hidden = true; banner('RODADA ' + m.n, partida.modo === 'bomba' ? (eu.time === 'r' ? 'ATAQUE: plante a bomba no local A ou B' : 'DEFESA: proteja os locais A e B') : 'Elimine o time inimigo', 'e'); S.troca(); break;
      case 'fimRodada': partida.placar = m.placar; atualizarPlacar(); if (rodada) rodada.fase = 'pausa'; acaoAtual = null;
        banner(m.vencedor === eu.time ? 'RODADA VENCIDA' : 'RODADA PERDIDA', { explodiu: 'A bomba explodiu', desarmada: 'A bomba foi desarmada', eliminados: (m.vencedor === 'r' ? 'Vermelho' : 'Azul') + ' eliminou o time inimigo', tempo: 'O tempo acabou' }[m.motivo] || '', m.vencedor === eu.time ? 'v' : 'd'); m.vencedor === eu.time ? S.kill(2) : S.morte(); break;
      case 'bomba': eventoBomba(m); break;
      case 'acao': if (m.estado === 'comecou') acaoAtual = { tipo: m.tipo, fim: performance.now() + m.dur, dur: m.dur }; else acaoAtual = null; break;
      case 'q': atualizarJogadores(m.j); break;
      case 'tiro': if (m.id !== meuId) tiroDeOutro(m); else impacto(m); break;
      case 'acerto': $('marca').className = 'marca'; void $('marca').offsetWidth; $('marca').className = 'marca on' + (m.cab ? ' cab' : ''); if (m.cab) S.capacete(); else S.acerto(); break;
      case 'dano': eu.vida = m.vida; levarDano(m); break;
      case 'morte': morte(m); break;
      case 'nasceu': nasceu(m); break;
      case 'mun': eu.mun = m.mun; eu.granadas = m.granadas; if (partida && partida.modo !== 'faca') { var pk = Object.keys(m.mun).filter(function (k) { return k !== 'p9'; })[0]; if (pk) eu.primaria = pk; } trocarArma(m.arma, true); break;
      case 'drop': novoDrop(m.d); break;
      case 'dropSome': tirarDrop(m.id); break;
      case 'drops': limparDrops(); (m.lista || []).forEach(novoDrop); break;
      case 'pegou': if (m.jid === meuId) { aviso('VOCÊ PEGOU: ' + (A[m.arma] ? A[m.arma].nome : m.arma)); S.troca && S.troca(); } break;
      case 'corrigir': eu.x = m.x; eu.y = m.y; eu.z = m.z; break;
      case 'granada': granadaVisual(m.g); break;
      case 'explosao': explosao(m); break;
      case 'saiu': removerJog(m.id); break;
      case 'entrou': if (estado === 'jogo' && !jogs[m.j.id]) jogs[m.j.id] = novoJog(m.j); break;
      case 'fim': fimPartida(m); break;
    }
  }

  /* ---------- telas: entrada ---------- */
  var modoAuth = 'entrar', pendente = null;
  function abaAuth(m) {
    modoAuth = m; $('abaEntrar').classList.toggle('on', m === 'entrar'); $('abaCriar').classList.toggle('on', m === 'criar');
    $('campoSenha2').hidden = m !== 'criar'; $('btEntrar').textContent = m === 'criar' ? 'CRIAR CONTA' : 'ENTRAR';
    $('inSenha').autocomplete = m === 'criar' ? 'new-password' : 'current-password'; msgAuth('');
  }
  function msgAuth(t, ok) { var e = $('authMsg'); e.textContent = t || ''; e.className = 'auth-msg' + (ok ? ' ok' : ''); }
  $('abaEntrar').onclick = function () { abaAuth('entrar'); }; $('abaCriar').onclick = function () { abaAuth('criar'); };
  $('btOlho').onclick = function () { var i = $('inSenha'), v = i.type === 'password'; i.type = v ? 'text' : 'password'; $('inSenha2').type = i.type; };
  $('inUser').value = ler('az_user') || '';
  $('fAuth').onsubmit = function (e) {
    if (e) e.preventDefault();
    var u = $('inUser').value.trim(), s = $('inSenha').value;
    if (!/^[\p{L}\p{N}_.\-]{3,14}$/u.test(u)) { msgAuth('Usuário: 3 a 14 letras ou números'); return false; }
    if (s.length < 4) { msgAuth('A senha precisa ter pelo menos 4 caracteres'); return false; }
    if (modoAuth === 'criar' && s !== $('inSenha2').value) { msgAuth('As senhas não são iguais'); return false; }
    S.iniciar(); estado = 'entrando'; $('btEntrar').disabled = true; msgAuth('Conectando…', true);
    pendente = { t: modoAuth === 'criar' ? 'registrar' : 'login', usuario: u, senha: s, lembrar: $('inLembrar').checked, cod: cod };
    if (ws && ws.readyState === 1) { mandar(pendente); pendente = null; } else conectar();
    return false;
  };
  function contaOk(m) {
    $('btEntrar').disabled = false; $('inSenha').value = ''; $('inSenha2').value = ''; msgAuth('');
    gravar('az_user', m.nome); if (m.token) gravar('az_token', m.token);
  }
  function contaErro(m) {
    $('btEntrar').disabled = false; estado = 'nick'; mostrar('tNick');
    if (m.token) { try { localStorage.removeItem('az_token'); } catch (e) {} }
    msgAuth(m.txt); if (m.token) aviso(m.txt);
  }
  $('btSairConta').onclick = function () {
    if (!confirmarSair()) return;
    mandar({ t: 'sairConta', token: ler('az_token') }); try { localStorage.removeItem('az_token'); } catch (e) {}
    perfil = null; estado = 'nick'; mostrar('tNick'); abaAuth('entrar');
  };
  function confirmarSair() { return true; }
  // entrar sozinho se o aparelho lembra a conta
  if (ler('az_token')) { estado = 'entrando'; msgAuth('Entrando…', true); conectar(); }

  /* ---------- lobby ---------- */
  function desenharPerfil() {
    if (!perfil) return; $('lNick').textContent = comTag(perfil.nome, perfil.tag); $('lPatNome').textContent = perfil.nomePatente; $('lPat').innerHTML = G.insignia(perfil.patente);
    var prontas = (perfil.missoes || []).filter(function (x) { return x.prog >= x.alvo && !x.pego; }).length; $('mBadge').hidden = !prontas && !perfil.bonus; $('mBadge').textContent = prontas + (perfil.bonus ? 1 : 0);
    if (perfil.bonus && !bonusMostrado && estado === 'lobby') { bonusMostrado = true; setTimeout(janelaBonus, 600); }
    if (!$('janela').hidden && $('janela').dataset.tipo === 'missoes') janelaMissoes();
    $('lMoedas').textContent = (perfil.moedas || 0).toLocaleString('pt-BR'); $('jMoedas').textContent = $('lMoedas').textContent; desenharArmasSala(); if (!$('loja').hidden) desenharLoja();
    $('lXpTxt').textContent = perfil.patente >= G.PATENTES.length - 1 ? perfil.xp + ' XP · patente máxima' : perfil.xp + ' / ' + perfil.prox + ' XP · próxima: ' + G.PATENTES[perfil.patente + 1];
    $('lXp').style.width = Math.min(100, (perfil.xp - perfil.base) / Math.max(1, perfil.prox - perfil.base) * 100) + '%';
    $('lK').textContent = perfil.kills; $('lD').textContent = perfil.mortes; $('lHs').textContent = perfil.hs; $('lV').textContent = perfil.vitorias;
  }
  function desenharSalas() {
    var el = $('listaSalas');
    if (!salasLista.length) { el.innerHTML = '<div class="vazio">Nenhuma sala aberta. Crie uma ou use PARTIDA RÁPIDA.</div>'; return; }
    el.innerHTML = salasLista.map(function (s) {
      return '<div class="linha-sala' + (salaSel === s.id ? ' sel' : '') + '" data-id="' + s.id + '"><span>' + String(s.id).padStart(3, '0') + '</span><span>' + (s.senha ? '🔒 ' : '') + esc(s.nome) + '</span><span>' + G.MODOS[s.modo] + '</span><span>' + G.MAPAS[s.mapa].nome + '</span><span>' + s.n + '/' + s.max + '</span><span class="' + (s.estado === 'jogo' ? 'jogando">Jogando' : 'esperando">Esperando') + '</span></div>';
    }).join('');
    [].forEach.call(el.querySelectorAll('.linha-sala'), function (d) {
      d.onclick = function () { S.clicar(); salaSel = +d.dataset.id; desenharSalas(); };
      d.ondblclick = function () { entrarSel(); };
    });
  }
  function entrarSel() {
    var s = salasLista.find(function (x) { return x.id === salaSel; }); if (!s) return aviso('Escolha uma sala na lista');
    if (s.senha) janela('<h3>SENHA DA SALA</h3><label>SENHA<input id="jSenha" maxlength="12"></label><div class="linha"><button class="bt" id="jNao">CANCELAR</button><button class="bt bt-ouro" id="jSim">ENTRAR</button></div>', function () { $('jNao').onclick = fecharJanela; $('jSim').onclick = function () { mandar({ t: 'entrar', id: s.id, senha: $('jSenha').value }); fecharJanela(); }; });
    else mandar({ t: 'entrar', id: s.id });
  }
  $('btEntrarSala').onclick = entrarSel; $('btAtualizar').onclick = function () { mandar({ t: 'salas' }); };
  $('btRapida').onclick = function () { S.clicar(); mandar({ t: 'rapida' }); };
  $('btCriar').onclick = function () {
    janela('<h3>CRIAR SALA</h3><label>NOME<input id="jNome" maxlength="24" value="Sala de ' + esc(perfil ? perfil.nome : '') + '"></label><label>MAPA<select id="jMapa">' + opcoesMapa() + '</select></label><label>MODO<select id="jModo">' + opcoesModo() + '</select></label><label>BOTS<select id="jBots">' + opcoesBots(6) + '</select></label><label>SENHA (opcional)<input id="jSenha" maxlength="12"></label><div class="linha"><button class="bt" id="jNao">CANCELAR</button><button class="bt bt-ouro" id="jSim">CRIAR</button></div>', function () {
      $('jNao').onclick = fecharJanela;
      $('jSim').onclick = function () { mandar({ t: 'criar', nome: $('jNome').value, mapa: $('jMapa').value, modo: $('jModo').value, bots: +$('jBots').value, senha: $('jSenha').value }); fecharJanela(); };
    });
  };
  function opcoesMapa(sel) { return Object.keys(G.MAPAS).map(function (k) { return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + G.MAPAS[k].nome + '</option>'; }).join(''); }
  function opcoesModo(sel) { return Object.keys(G.MODOS).map(function (k) { return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + G.MODOS[k] + '</option>'; }).join(''); }
  function opcoesBots(sel) { var o = ''; for (var i = 0; i <= 14; i++) o += '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + i + '</option>'; return o; }
  function janelaGraficos() {
    janela('<h3>CONFIGURAÇÕES</h3><h5>GRÁFICOS</h5><div class="niveis">' + Object.keys(NIVEIS).map(function (k) { return '<button class="bt' + (k === graf.nivel ? ' bt-ouro' : '') + '" data-n="' + k + '">' + NIVEIS[k].nome + '</button>'; }).join('') + '</div>' +
      '<p class="g-dica" id="gDica">' + NIVEIS[graf.nivel].dica + '</p>' +
      '<label>BRILHO<input type="range" id="gBrilho" min="0.6" max="1.6" step="0.05" value="' + graf.brilho + '"></label>' +
      '<label class="chk"><input type="checkbox" id="gCheia"' + (graf.cheia ? ' checked' : '') + '> TELA CHEIA</label>' +
      '<h5>MIRA</h5><div class="niveis tres">' + Object.keys(MODOS_MIRA).map(function (k) { return '<button class="bt' + (k === ctrl.mira ? ' bt-ouro' : '') + '" data-m="' + k + '">' + MODOS_MIRA[k].nome + '</button>'; }).join('') + '</div>' +
      '<p class="g-dica" id="mDica">' + MODOS_MIRA[ctrl.mira].dica + '</p>' +
      '<label>SENSIBILIDADE <b id="sVal">' + ctrl.sens.toFixed(2) + 'x</b><input type="range" id="gSens" min="0.3" max="2.5" step="0.05" value="' + ctrl.sens + '"></label>' +
      '<div class="linha"><button class="bt bt-ouro" id="jOk">PRONTO</button></div>', function () {
      document.querySelectorAll('.niveis .bt[data-m]').forEach(function (b) { b.onclick = function () {
        ctrl.mira = b.dataset.m; gravar('az_mira', ctrl.mira);
        document.querySelectorAll('.niveis .bt[data-m]').forEach(function (x) { x.classList.toggle('bt-ouro', x === b); }); $('mDica').textContent = MODOS_MIRA[ctrl.mira].dica;
      }; });
      $('gSens').oninput = function () { ctrl.sens = +this.value; gravar('az_sens', ctrl.sens); $('sVal').textContent = ctrl.sens.toFixed(2) + 'x'; };
      document.querySelectorAll('.niveis .bt[data-n]').forEach(function (b) { b.onclick = function () {
        graf.nivel = b.dataset.n; gravar('az_graf', graf.nivel); aplicarGraficos();
        document.querySelectorAll('.niveis .bt[data-n]').forEach(function (x) { x.classList.toggle('bt-ouro', x === b); }); $('gDica').textContent = NIVEIS[graf.nivel].dica;
      }; });
      $('gBrilho').oninput = function () { graf.brilho = +this.value; gravar('az_brilho', graf.brilho); renderer.toneMappingExposure = graf.brilho; };
      $('gCheia').onchange = function () { graf.cheia = this.checked; gravar('az_cheia', graf.cheia ? '1' : '0'); if (graf.cheia) telaCheia(); else if (document.fullscreenElement) document.exitFullscreen().catch(function () {}); };
      $('jOk').onclick = fecharJanela;
    });
  }
  $('btGraf').onclick = janelaGraficos;
  botao('bGraf', function () { janelaGraficos(); });
  $('btCreditos').onclick = function () { janela('<h3>CRÉDITOS</h3><p style="font-size:13px;line-height:1.5">Modelo 3D <b>"AUG A3 4th Point Blank"</b> por <b>Shiro</b><br>sketchfab.com/3d-models/aug-a3-4th-point-blank-ee88972b66c8490e82dd3886419fbb8c<br>Licença: Creative Commons Attribution 4.0 (CC BY 4.0)<br><br>Sniper <b>Vermilion Bird</b> por <b>Ziky Andeska</b> · Coletes por <b>00amza</b> (Sketchfab) — CC BY 4.0<br><br>Personagens <b>"Tarantula - Point Blank"</b> e <b>"Judy Chou - Point Blank"</b> por <b>madarahadian</b> (Sketchfab) — CC BY 4.0</p><div class="linha"><button class="bt" id="jOk">FECHAR</button></div>', function () { $('jOk').onclick = fecharJanela; }); };
  var mudo = false; $('btSomL').onclick = function () { mudo = !mudo; S.mudo(mudo); $('btSomL').textContent = mudo ? '🔇' : '🔊'; };

  /* ---------- sala ---------- */
  $('cMapa').innerHTML = opcoesMapa(); $('cModo').innerHTML = opcoesModo(); $('cBots').innerHTML = opcoesBots(0);
  var minhaArma = ler('az_arma') || 'ar9';
  function minhasArmas() { return G.PRIMARIAS.filter(function (k) { return k === 'ar9' || (perfil && perfil.armas && perfil.armas.indexOf(k) >= 0); }); }
  function desenharArmasSala() {
    $('sArmas').innerHTML = minhasArmas().map(function (k) { return '<button data-a="' + k + '">' + A[k].nome + '</button>'; }).join('');
    [].forEach.call($('sArmas').children, function (b) { b.onclick = function () { equipar(b.dataset.a); S.troca(); }; });
    marcarArma();
  }
  function equipar(k) { if (minhasArmas().indexOf(k) < 0) return; minhaArma = k; gravar('az_arma', k); mandar({ t: 'arma', arma: k }); marcarArma(); }
  desenharArmasSala();
  function marcarArma() { [].forEach.call($('sArmas').children, function (b) { b.classList.toggle('on', b.dataset.a === minhaArma); }); }
  function desenharSala() {
    var s = salaInfo; if (!s) return; var souDono = s.dono === meuId;
    $('sNome').textContent = String(s.id).padStart(3, '0') + ' · ' + s.nome; $('sInfo').textContent = G.MODOS[s.modo] + ' · ' + G.MAPAS[s.mapa].nome + ' · meta ' + s.meta + ' · ' + s.tempo + ' min' + (s.estado === 'jogo' ? ' · EM JOGO' : '');
    function vagas(time) {
      var l = s.jogs.filter(function (j) { return s.modo === 'todos' || j.time === time; }), html = '';
      for (var i = 0; i < 8; i++) { var j = l[i]; html += j ? '<div class="vaga' + (j.id === meuId ? ' eu' : '') + (j.id === s.dono ? ' dono' : '') + '"><i class="pat">' + G.insignia(j.pat) + '</i>' + esc((j.tag ? '[' + j.tag + '] ' : '') + j.nome) + '<span class="ok">' + (j.id === s.dono ? 'DONO' : j.pronto ? 'PRONTO' : '') + '</span></div>' : '<div class="vaga vazia">—</div>'; }
      return html;
    }
    $('sVerm').innerHTML = vagas('r'); $('sAzul').innerHTML = vagas('b');
    ['cMapa', 'cModo', 'cMeta', 'cTempo', 'cBots'].forEach(function (id) { $(id).disabled = !souDono || s.estado !== 'espera'; });
    $('cMapa').value = s.mapa; $('cModo').value = s.modo; $('cMeta').value = s.meta; $('cTempo').value = s.tempo; $('cBots').value = s.bots;
    var eu2 = s.jogs.find(function (j) { return j.id === meuId; });
    $('btPronto').textContent = souDono ? 'INICIAR' : (eu2 && eu2.pronto ? 'PRONTO ✓' : 'PRONTO'); $('btPronto').classList.toggle('ativo', !!(eu2 && eu2.pronto && !souDono));
    marcarArma(); desenharMiniMapa($('sMapa'), G.MAPAS[s.mapa]); carregarMapa(s.mapa);
  }
  ['cMapa', 'cModo', 'cMeta', 'cTempo', 'cBots'].forEach(function (id) { $(id).onchange = function () { mandar({ t: 'config', mapa: $('cMapa').value, modo: $('cModo').value, meta: +$('cMeta').value, tempo: +$('cTempo').value, bots: +$('cBots').value }); }; });
  $('btPronto').onclick = function () { S.clicar(); if (salaInfo && salaInfo.dono === meuId) mandar({ t: 'iniciar' }); else mandar({ t: 'pronto' }); };
  $('btTrocarTime').onclick = function () { var e2 = salaInfo && salaInfo.jogs.find(function (j) { return j.id === meuId; }); if (e2) mandar({ t: 'time', time: e2.time === 'r' ? 'b' : 'r' }); };
  $('btSairSala').onclick = function () { mandar({ t: 'sair' }); salaInfo = null; estado = 'lobby'; mostrar('tLobby'); };
  $('fChat').onsubmit = function (e) { e.preventDefault(); var t = $('inChat').value.trim(); if (t) mandar({ t: 'chat', txt: t }); $('inChat').value = ''; };
  function desenharMiniMapa(cv, mapa, jogs) {
    var g = cv.getContext('2d'), W = cv.width, H = cv.height, L = mapa.lim, es = Math.min(W / (L[0] * 2 + 2), H / (L[1] * 2 + 2));
    g.fillStyle = '#0a0f15'; g.fillRect(0, 0, W, H);
    g.save(); g.translate(W / 2, H / 2); g.scale(es, es);
    g.fillStyle = '#26323e'; g.fillRect(-L[0], -L[1], L[0] * 2, L[1] * 2);
    mapa.caixas.forEach(function (b) { if (b[1] < 0 || b[6] === 'teto' || b[6] === 'piso' || b[6] === 'asfalto') return; g.fillStyle = b[1] > 2 ? '#3a4a5a' : b[4] > 2 ? '#7d8c99' : '#56636e'; g.fillRect(b[0] - b[3] / 2, b[2] - b[5] / 2, b[3], b[5]); });
    g.fillStyle = 'rgba(220,60,50,.5)'; mapa.nasc.r.forEach(function (p) { g.fillRect(p[0] - 0.5, p[1] - 0.5, 1, 1); });
    g.fillStyle = 'rgba(60,120,230,.5)'; mapa.nasc.b.forEach(function (p) { g.fillRect(p[0] - 0.5, p[1] - 0.5, 1, 1); });
    g.restore();
  }

  /* ---------- loja: arma em 3D girando, atributos, preço ---------- */
  var lojaSel = 'vb', loja3d = null;
  function barra(nome, v) { v = Math.max(0.04, Math.min(1, v)); return '<div class="st"><span>' + nome + '</span><div><i style="width:' + (v * 100).toFixed(0) + '%"></i></div></div>'; }
  function rarClasse(r) { return r === 'LENDÁRIA' ? 'lend' : r === 'ÉPICA' ? 'epica' : r === 'RARA' ? 'rara' : 'pad'; }
  function temItem(k) { return k === 'ar9' || !!(perfil && perfil.armas && perfil.armas.indexOf(k) >= 0); }
  function usando(k) { return G.COLETES[k] ? !!(perfil && perfil.colete === k) : G.SKINS[k] ? !!(perfil && perfil.skin === k) : k === minhaArma; }
  function categoria(k) { return G.COLETES[k] ? 'colete' : G.SKINS[k] ? 'personagem' : 'arma'; }
  var lojaAba = 'arma', ABAS = { arma: 'ARMAS', colete: 'COLETES', personagem: 'PERSONAGENS' };
  function desenharLoja() {
    var moedas = perfil ? perfil.moedas || 0 : 0, cat = '';
    lojaAba = categoria(lojaSel);
    $('lojaLista').innerHTML = '<div class="loja-abas">' + Object.keys(ABAS).map(function (k) { return '<button data-aba="' + k + '"' + (k === lojaAba ? ' class="on"' : '') + '>' + ABAS[k] + '</button>'; }).join('') + '</div>' +
      G.LOJA.filter(function (k) { return categoria(k) === lojaAba; }).map(function (k) {
      var a = G.item(k), tem = temItem(k);
      return '<button class="item r-' + rarClasse(a.raridade) + (k === lojaSel ? ' on' : '') + '" data-k="' + k + '"><span class="i-rar">' + a.raridade + '</span><b>' + a.nome + '</b><small>' + (G.COLETES[k] ? '-' + Math.round(a.protecao * 100) + '% DANO NO CORPO' : a.tipo.toUpperCase()) + '</small>' +
        '<span class="i-preco">' + (tem ? (usando(k) ? (G.COLETES[k] ? '✔ VESTIDO' : '✔ EQUIPADA') : 'ADQUIRIDO') : '<i class="moeda"></i>' + a.preco.toLocaleString('pt-BR')) + '</span></button>';
    }).join('');
    [].forEach.call($('lojaLista').querySelectorAll('.loja-abas button'), function (b) { b.onclick = function () { if (b.dataset.aba === lojaAba) return; lojaSel = G.LOJA.filter(function (k) { return categoria(k) === b.dataset.aba; })[0]; S.clicar(); desenharLoja(); mostrarArmaLoja(); }; });
    [].forEach.call($('lojaLista').querySelectorAll('.item'), function (b) { b.onclick = function () { lojaSel = b.dataset.k; S.clicar(); desenharLoja(); mostrarArmaLoja(); }; });
    var a = G.item(lojaSel), tem = temItem(lojaSel), col = !!G.COLETES[lojaSel], skn = !!G.SKINS[lojaSel];
    $('vNome').textContent = a.nome; $('vTipo').textContent = skn ? 'PERSONAGEM · SÓ VISUAL (NÃO MUDA DANO)' : col ? 'COLETE · REDUZ ' + Math.round(a.protecao * 100) + '% DO DANO NO CORPO' : a.tipo.toUpperCase() + ' · PENTE ' + a.pente + ' · RESERVA ' + a.reserva;
    $('vRar').textContent = a.raridade; $('vRar').className = 'raridade ' + rarClasse(a.raridade); $('vDesc').textContent = a.desc || '';
    $('vStats').innerHTML = skn ? '<p class="v-obs">Substitui a Tarantula/Judy só para você. Os outros jogadores veem você com ela; o time aparece na cor do nome.</p>' : col ? barra('PROTEÇÃO', a.protecao / 0.35) + barra('COBERTURA', lojaSel === 'colete3' ? 1 : lojaSel === 'colete2' ? 0.75 : 0.55) + '<p class="v-obs">Headshot continua dano cheio.</p>'
      : barra('DANO', a.dano / 125) + barra('PRECISÃO', 1 - (a.dispMira != null ? a.dispMira * 200 : a.disp * 20)) + barra('CADÊNCIA', 0.1 / a.cadencia) + barra('ALCANCE', a.alcance / 280) + barra('MOBILIDADE', a.tipo === 'sniper' ? 0.45 : 0.85);
    $('vPreco').textContent = a.preco ? a.preco.toLocaleString('pt-BR') : 'GRÁTIS';
    var bt = $('vBotao'); bt.disabled = false; $('vFalta').textContent = '';
    if (tem && skn) { var usa = usando(lojaSel); bt.textContent = usa ? 'USAR PADRÃO DO TIME' : 'USAR PERSONAGEM'; bt.onclick = function () { mandar({ t: 'skin', id: usa ? null : lojaSel }); S.troca(); }; }
    else if (tem && col) { var veste = usando(lojaSel); bt.textContent = veste ? 'TIRAR COLETE' : 'VESTIR'; bt.onclick = function () { mandar({ t: 'colete', id: veste ? null : lojaSel }); S.troca(); }; }
    else if (tem) { bt.textContent = usando(lojaSel) ? '✔ EQUIPADA' : 'EQUIPAR'; bt.disabled = usando(lojaSel); bt.onclick = function () { equipar(lojaSel); S.troca(); desenharLoja(); }; }
    else { bt.textContent = 'COMPRAR'; if (moedas < a.preco) { bt.disabled = true; $('vFalta').textContent = 'Faltam ' + (a.preco - moedas).toLocaleString('pt-BR') + ' moedas · ganhe jogando partidas'; }
      bt.onclick = function () { if (confirm('Comprar ' + a.nome + ' por ' + a.preco.toLocaleString('pt-BR') + ' moedas?')) mandar({ t: 'comprar', arma: lojaSel }); }; }
  }
  function mostrarArmaLoja() {
    if (!loja3d) {
      var cv3 = $('lojaCanvas'), r = new THREE.WebGLRenderer({ canvas: cv3, antialias: true, alpha: true }); r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
      var sc = new THREE.Scene(), cm = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
      sc.add(new THREE.HemisphereLight(0xffffff, 0x302018, 1.0)); var l1 = new THREE.DirectionalLight(0xffffff, 1.3); l1.position.set(2, 3, 2); sc.add(l1); var l2 = new THREE.DirectionalLight(0xffb070, 0.8); l2.position.set(-3, 1, -2); sc.add(l2);
      var base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.04, 48), new THREE.MeshStandardMaterial({ color: 0x1a222c, metalness: 0.6, roughness: 0.35 })); base.position.y = -0.32; sc.add(base);
      var anel = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.008, 8, 64), new THREE.MeshBasicMaterial({ color: 0xf2b53a })); anel.rotation.x = Math.PI / 2; anel.position.y = -0.3; sc.add(anel);
      var piv = new THREE.Group(); sc.add(piv);
      loja3d = { r: r, sc: sc, cm: cm, piv: piv, giro: 0.6, arr: null, anel: anel };
      cv3.addEventListener('pointerdown', function (e) { loja3d.arr = e.clientX; try { cv3.setPointerCapture(e.pointerId); } catch (x) {} });
      cv3.addEventListener('pointermove', function (e) { if (loja3d.arr != null) { loja3d.piv.rotation.y += (e.clientX - loja3d.arr) * 0.012; loja3d.arr = e.clientX; } });
      cv3.addEventListener('pointerup', function () { loja3d.arr = null; }); cv3.addEventListener('pointercancel', function () { loja3d.arr = null; });
    }
    var L = loja3d, sel = lojaSel; while (L.piv.children.length) L.piv.remove(L.piv.children[0]);
    var cores = { lend: 0xff5a2a, epica: 0xb05cff, rara: 0x4aa8ff, pad: 0xf2b53a }; L.anel.material.color.set(cores[rarClasse(G.item(sel).raridade)]);
    function por(m, girar, alvo, dy) {
      if (sel !== lojaSel) return;
      var caixa = new THREE.Box3().setFromObject(m), cen = caixa.getCenter(new THREE.Vector3()), tam = caixa.getSize(new THREE.Vector3());
      var k = alvo / Math.max(tam.x, tam.y, tam.z); m.scale.multiplyScalar(k); m.position.sub(cen.multiplyScalar(k)); m.position.y += dy == null ? 0.02 : dy;
      var g = new THREE.Group(); g.add(m); g.rotation.y = girar; L.piv.add(g);
    }
    if (G.COLETES[sel]) AR.modeloColete(sel, function (m) { por(m, Math.PI, 0.62); });
    else if (G.SKINS[sel]) AR.carregarSkin(sel, function () { var s = AR.soldado(null, 0, sel); AR.armaSoldado(s, minhaArma); AR.animarSoldado(s, 0, false, 0, 0.016); AR.animarSoldado(s, 0, false, 0, 0.016); s.updateMatrixWorld(true); por(s, Math.PI, 0.7, 0.05); });
    else por(AR.modelo(sel), Math.PI / 2, 1.05);
  }
  function quadroLoja() {
    if ($('loja').hidden || !loja3d) return; requestAnimationFrame(quadroLoja);
    var L = loja3d, cv3 = L.r.domElement, w = cv3.clientWidth, h = cv3.clientHeight;
    if (cv3.width !== Math.floor(w * Math.min(2, devicePixelRatio)) || cv3.height !== Math.floor(h * Math.min(2, devicePixelRatio))) { L.r.setPixelRatio(Math.min(2, devicePixelRatio)); L.r.setSize(w, h, false); L.cm.aspect = w / Math.max(1, h); L.cm.updateProjectionMatrix(); }
    L.cm.position.set(0, 0.32, 1.75); L.cm.lookAt(0, -0.04, 0);
    if (L.arr == null) L.piv.rotation.y += 0.008;
    L.r.render(L.sc, L.cm);
  }
  function abrirLoja() { S.iniciar(); $('loja').hidden = false; desenharLoja(); mostrarArmaLoja(); requestAnimationFrame(quadroLoja); }
  $('btLoja').onclick = abrirLoja; $('btFecharLoja').onclick = function () { $('loja').hidden = true; };

  /* ---------- ranking, amigos e clã ---------- */
  var amigosInfo = { amigos: [], pedidos: [] };
  function janelaRanking(m) {
    janela('<h3>🏆 RANKING</h3><p class="j-sub">Sua posição: <b style="color:#ffd257">' + (m.pos ? m.pos + 'º' : '—') + '</b> de ' + m.total + ' jogadores</p><div class="rank">' +
      m.lista.map(function (x, i) { return '<div class="r-lin' + (x.eu ? ' eu' : '') + (i < 3 ? ' top' + (i + 1) : '') + '"><span class="r-pos">' + (i + 1) + '</span><i class="pat">' + G.insignia(x.pat) + '</i><b>' + esc(comTag(x.nome, x.tag)) + '</b><small>' + x.kills + ' K · ' + x.hs + ' HS</small><em>' + x.xp.toLocaleString('pt-BR') + ' XP</em></div>'; }).join('') +
      '</div><div class="linha"><button class="bt" id="jOk">FECHAR</button></div>', function () { $('jOk').onclick = fecharJanela; });
    $('janela').dataset.tipo = 'ranking';
  }
  function janelaAmigos() {
    var m = amigosInfo;
    janela('<h3>👥 AMIGOS</h3><form id="fAmigo" class="add-amigo" onsubmit="return false"><input id="inAmigo" maxlength="14" placeholder="Nome do jogador" autocomplete="off"><button class="bt bt-ouro bt-pq">ADICIONAR</button></form>' +
      (m.pedidos.length ? '<h5>PEDIDOS DE AMIZADE</h5>' + m.pedidos.map(function (x) { return '<div class="amg"><i class="pat">' + G.insignia(x.pat) + '</i><b>' + esc(x.nome) + '</b><button class="bt bt-ouro bt-pq" data-ac="' + x.k + '">ACEITAR</button><button class="bt bt-pq" data-rc="' + x.k + '">✕</button></div>'; }).join('') : '') +
      '<h5>AMIGOS (' + m.amigos.length + ')</h5>' + (m.amigos.length ? m.amigos.map(function (x) { return '<div class="amg' + (x.online ? ' on' : '') + '"><span class="dot"></span><i class="pat">' + G.insignia(x.pat) + '</i><b>' + esc(x.nome) + '<small>' + x.status + '</small></b>' +
        (x.online && salaInfo ? '<button class="bt bt-ouro bt-pq" data-cv="' + x.k + '">CONVIDAR</button>' : '') + (x.online && x.sala && (!salaInfo || salaInfo.id !== x.sala) ? '<button class="bt bt-pq" data-ir="' + x.sala + '">IR</button>' : '') + '<button class="bt bt-pq" data-rm="' + x.k + '" title="Remover">🗑</button></div>'; }).join('') : '<p class="j-sub">Adicione amigos pelo nome de usuário.</p>') +
      '<div class="linha"><button class="bt" id="jOk">FECHAR</button></div>', function () {
      $('fAmigo').onsubmit = function () { var n = $('inAmigo').value.trim(); if (n) mandar({ t: 'amigoAdd', nome: n }); return false; };
      document.querySelectorAll('[data-ac]').forEach(function (b) { b.onclick = function () { mandar({ t: 'amigoAceitar', k: b.dataset.ac }); }; });
      document.querySelectorAll('[data-rc]').forEach(function (b) { b.onclick = function () { mandar({ t: 'amigoRecusar', k: b.dataset.rc }); }; });
      document.querySelectorAll('[data-cv]').forEach(function (b) { b.onclick = function () { mandar({ t: 'convidar', k: b.dataset.cv }); }; });
      document.querySelectorAll('[data-ir]').forEach(function (b) { b.onclick = function () { mandar({ t: 'entrar', id: +b.dataset.ir }); fecharJanela(); }; });
      document.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { if (confirm('Remover esse amigo?')) mandar({ t: 'amigoRemover', k: b.dataset.rm }); }; });
      $('jOk').onclick = fecharJanela;
    });
    $('janela').dataset.tipo = 'amigos';
  }
  function janelaCla(m) {
    var html = '<h3>🛡️ CLÃ</h3>';
    if (m.cla) {
      html += '<div class="cla-cab"><span class="cla-tag">[' + esc(m.cla.tag) + ']</span><div><b>' + esc(m.cla.nome) + '</b><small>Líder: ' + esc(m.cla.dono) + ' · ' + m.cla.membros.length + '/30 membros</small></div></div>' +
        m.cla.membros.map(function (x) { return '<div class="amg' + (x.online ? ' on' : '') + '"><span class="dot"></span><i class="pat">' + G.insignia(x.pat) + '</i><b>' + esc(x.nome) + '<small>' + x.xp.toLocaleString('pt-BR') + ' XP</small></b></div>'; }).join('') +
        '<div class="linha"><button class="bt" id="jSairCla">SAIR DO CLÃ</button><button class="bt bt-ouro" id="jOk">FECHAR</button></div>';
    } else {
      html += '<h5>CRIAR CLÃ · <i class="moeda"></i>2.000</h5><form id="fCla" class="add-amigo" onsubmit="return false"><input id="inClaTag" maxlength="4" placeholder="TAG" style="width:70px;text-transform:uppercase"><input id="inClaNome" maxlength="20" placeholder="Nome do clã"><button class="bt bt-ouro bt-pq">CRIAR</button></form>' +
        '<h5>ENTRAR EM UM CLÃ</h5>' + (m.lista.length ? m.lista.map(function (x) { return '<div class="amg"><span class="cla-tag pq">[' + esc(x.tag) + ']</span><b>' + esc(x.nome) + '<small>' + x.n + ' membros · ' + x.xp.toLocaleString('pt-BR') + ' XP</small></b><button class="bt bt-ouro bt-pq" data-cla="' + esc(x.tag) + '">ENTRAR</button></div>'; }).join('') : '<p class="j-sub">Nenhum clã ainda. Seja o primeiro!</p>') +
        '<div class="linha"><button class="bt" id="jOk">FECHAR</button></div>';
    }
    janela(html, function () {
      $('jOk').onclick = fecharJanela;
      if ($('jSairCla')) $('jSairCla').onclick = function () { if (confirm('Sair do clã?')) mandar({ t: 'claSair' }); };
      if ($('fCla')) $('fCla').onsubmit = function () { mandar({ t: 'claCriar', tag: $('inClaTag').value, nome: $('inClaNome').value }); return false; };
      document.querySelectorAll('[data-cla]').forEach(function (b) { b.onclick = function () { mandar({ t: 'claEntrar', tag: b.dataset.cla }); }; });
    });
    $('janela').dataset.tipo = 'cla';
  }
  $('btRanking').onclick = function () { mandar({ t: 'ranking' }); };
  $('btAmigos').onclick = function () { janelaAmigos(); mandar({ t: 'amigos' }); };
  $('btCla').onclick = function () { mandar({ t: 'cla' }); };
  var btAmSala = document.createElement('button'); btAmSala.className = 'bt bt-pq'; btAmSala.textContent = '👥 CONVIDAR'; btAmSala.onclick = function () { janelaAmigos(); mandar({ t: 'amigos' }); };
  if ($('btSairSala')) $('btSairSala').parentNode.insertBefore(btAmSala, $('btSairSala'));

  /* ---------- missões e bônus diário ---------- */
  var bonusMostrado = false;
  function janelaBonus() {
    if (!perfil || !perfil.bonus) return;
    var b = perfil.bonus, dias = [100, 150, 200, 250, 300, 400, 700];
    janela('<h3>BÔNUS DIÁRIO</h3><p class="j-sub">Entre todo dia para ganhar mais. Se pular um dia, volta para o dia 1.</p><div class="dias">' + dias.map(function (v, i) { return '<div class="dia' + (i + 1 < b.seq ? ' feito' : i + 1 === b.seq ? ' hoje' : '') + '"><small>DIA ' + (i + 1) + '</small><i class="moeda"></i><b>' + v + '</b></div>'; }).join('') + '</div>' +
      '<div class="linha"><button class="bt bt-ouro" id="jBonus">RECEBER +' + b.premio + '</button></div>', function () { $('jBonus').onclick = function () { mandar({ t: 'bonusPegar' }); fecharJanela(); }; });
    $('janela').dataset.tipo = 'bonus';
  }
  function janelaMissoes() {
    var l = (perfil && perfil.missoes) || [];
    janela('<h3>MISSÕES DE HOJE</h3><p class="j-sub">Novas missões todo dia à meia-noite (horário de Brasília).</p>' + l.map(function (x) {
      var f = Math.min(1, x.prog / x.alvo), pronta = x.prog >= x.alvo;
      return '<div class="missao' + (x.pego ? ' pega' : pronta ? ' pronta' : '') + '"><div class="m-txt"><b>' + esc(x.txt) + '</b><div class="m-barra"><i style="width:' + (f * 100) + '%"></i></div><small>' + x.prog + ' / ' + x.alvo + '</small></div>' +
        '<div class="m-premio"><span><i class="moeda"></i>' + x.premio + '</span>' + (x.pego ? '<em>✔ RECEBIDO</em>' : pronta ? '<button class="bt bt-ouro bt-pq" data-m="' + x.id + '">RECEBER</button>' : '') + '</div></div>';
    }).join('') + (perfil && perfil.bonus ? '<button class="bt bt-ouro" id="jAbrirBonus" style="width:100%;margin-top:8px">🎁 BÔNUS DIÁRIO DISPONÍVEL</button>' : '') + '<div class="linha"><button class="bt" id="jOk">FECHAR</button></div>', function () {
      document.querySelectorAll('.missao [data-m]').forEach(function (b) { b.onclick = function () { mandar({ t: 'missaoPegar', id: b.dataset.m }); }; });
      if ($('jAbrirBonus')) $('jAbrirBonus').onclick = janelaBonus; $('jOk').onclick = fecharJanela;
    });
    $('janela').dataset.tipo = 'missoes';
  }
  $('btMissoes').onclick = janelaMissoes;

  /* ---------- promoção de patente ---------- */
  function mostrarPromocao(antes, depois) {
    var el = $('promo');
    el.innerHTML = '<div class="promo-raios"></div><div class="promo-caixa"><p class="promo-tit">PROMOÇÃO!</p><div class="promo-ins">' + G.insignia(depois.patente) + '</div>' +
      '<h2>' + esc(depois.nomePatente) + '</h2><p class="promo-de">' + esc(antes.nomePatente) + ' → <b>' + esc(depois.nomePatente) + '</b></p>' +
      '<div class="promo-xp"><i style="width:' + Math.min(100, (depois.xp - depois.base) / Math.max(1, depois.prox - depois.base) * 100) + '%"></i></div><small>' + depois.xp + ' XP</small>' +
      '<button class="bt bt-ouro" id="promoOk">CONTINUAR</button></div>';
    var mostra = function () { el.hidden = false; S.promocao(); $('promoOk').onclick = function () { el.hidden = true; }; };
    if (!$('fim').hidden) setTimeout(mostra, 2500); else mostra();
  }

  /* ---------- janelas ---------- */
  function janela(html, ini) { $('janela').innerHTML = html; $('janela').hidden = false; if (ini) ini(); }
  function fecharJanela() { $('janela').hidden = true; }

  /* ---------- partida ---------- */
  var eu = { x: 0, y: 0, z: 0, vy: 0, noChao: true, agachado: false, yaw: 0, pitch: 0, vida: 100, vivo: true, arma: 'ar9', primaria: 'ar9', mun: {}, granadas: 1, mira: false, recarregandoAte: 0, ultTiro: 0, recuo: 0, disp: 0, sequencia: 0 };
  var jogs = {}, partida = null, partidaPendente = null, mao = null, armaMao = null, efeitos = [], marcas = [], granadas = {};
  function iniciarPartida(m) {
    var cl = perfil && perfil.colete && G.COLETES[perfil.colete]; $('hColete').hidden = !cl; if (cl) $('hColete').textContent = '-' + Math.round(cl.protecao * 100) + '%';
    if (!AR.personagensProntos) { partidaPendente = m; aviso('CARREGANDO PERSONAGENS...'); return; }
    estado = 'jogo'; fecharJanela(); $('fim').hidden = true; mostrar('tJogo'); carregarMapa(m.mapa);
    partida = { modo: m.modo, meta: m.meta, fim: m.fim, placar: m.placar, kills: 0, sequencia: 0 };
    Object.keys(jogs).forEach(removerJog); jogs = {}; limparCorpos(); limparDrops(); (m.drops || []).forEach(novoDrop);
    var minha = m.jogs.filter(function (j) { return j.id === (m.eu || meuId); })[0]; if (minha) { eu.x = minha.x; eu.y = minha.y; eu.z = minha.z; eu.time = minha.time; }
    m.jogs.forEach(function (j) { jogs[j.id] = novoJog(j); });
    eu.vivo = true; eu.vida = 100; eu.mun = m.mun || eu.mun; eu.granadas = 1; eu.primaria = minhaArma; eu.yaw = eu.time === 'r' ? -Math.PI / 2 : Math.PI / 2; eu.pitch = 0;
    if (!eu.mun[eu.primaria]) eu.primaria = Object.keys(eu.mun).filter(function (k) { return k !== 'p9'; })[0] || 'ar9';
    if (m.modo === 'faca') eu.primaria = 'faca';
    rodada = m.rodada || null; bombaMundo(null); montarLocais(m.mapa); $('hRodada').hidden = !rodada; $('banner').className = 'banner';
    trocarArma(eu.primaria, true); $('morto').hidden = true; $('feed').innerHTML = ''; $('estrelas').innerHTML = '';
    atualizarPlacar(); minimapaBase = null; S.iniciar();
    if (!celular && renderer.domElement.requestPointerLock) aviso('Clique na tela para mirar com o mouse');
  }
  function sairPartida() { estado = 'sala'; Object.keys(jogs).forEach(removerJog); jogs = {}; if (document.pointerLockElement) document.exitPointerLock(); }
  function novoJog(j) {
    var o = { id: j.id, tag: j.tag || null, nome: j.nome, time: j.time, bot: j.bot, x: j.x, y: j.y, z: j.z, tx: j.x, ty: j.y, tz: j.z, yaw: 0, pitch: 0, vivo: j.vivo !== false, ag: false, arma: j.arma || 'ar9', kills: 0, mortes: 0, vida: 100 };
    if (j.id !== meuId) {
      o.colete = j.colete || null; o.skin = j.skin || null; o.m = AR.soldado(partida && partida.modo === 'todos' ? null : j.time, o.id, o.skin); AR.armaSoldado(o.m, o.arma); AR.coleteSoldado(o.m, o.colete); cena.add(o.m);
      if (o.skin && !AR.temSkin(o.skin)) AR.carregarSkin(o.skin, function () { if (jogs[o.id] === o) trocarModelo(o); });
      o.etq = etiqueta(comTag(j.nome, j.tag), j.time === eu.time && partida.modo !== 'todos'); o.m.add(o.etq);
    }
    return o;
  }
  function removerJog(id) { var o = jogs[id]; if (!o) return; if (o.m) cena.remove(o.m); delete jogs[id]; }
  function etiqueta(nome, amigo) {
    var c = document.createElement('canvas'); c.width = 256; c.height = 48; var g = c.getContext('2d'); g.font = 'bold 26px system-ui'; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = '#000'; g.strokeText(nome, 128, 34); g.fillStyle = amigo ? '#7ee787' : '#ff7b72'; g.fillText(nome, 128, 34);
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: amigo ? false : true, transparent: true })); s.scale.set(1.6, 0.3, 1); s.position.y = 2.15; s.visible = amigo; return s;
  }
  function atualizarJogadores(lista) {
    lista.forEach(function (j) {
      var o = jogs[j[0]]; if (!o) { o = jogs[j[0]] = novoJog({ id: j[0], nome: 'Jogador', time: 'r', x: j[1], y: j[2], z: j[3] }); }
      o.tx = j[1]; o.ty = j[2]; o.tz = j[3]; o.tyaw = j[4]; o.pitch = j[5]; o.vivo = !!j[6]; o.ag = !!j[7]; o.kills = j[10]; o.mortes = j[11];
      if (o.m && o.arma !== j[8]) { o.arma = j[8]; AR.armaSoldado(o.m, o.arma); }
      if (j[0] === meuId) { o.vida = j[9]; }
    });
  }

  /* ---------- arma na mão ---------- */
  function permitida(id) { if (!partida) return true; if (partida.modo === 'faca') return id === 'faca'; if (partida.modo === 'sniper') return id === eu.primaria || id === 'faca'; return true; }
  function trocarArma(id, sem) {
    if (!sem && !permitida(id)) return;
    if (!A[id]) return; if (eu.arma === id && armaMao && !sem) return;
    eu.arma = id; eu.mira = false; eu.recarregandoAte = 0; if (!sem) S.troca(); mandar({ t: 'trocar', arma: id });
    if (mao) camMao.remove(mao);
    mao = new THREE.Group(); armaMao = AR.modelo(id, true); mao.add(armaMao);
    var br = AR.bracos(), pos = AR.maos[id] || AR.maos.ar9; mao.add(br);
    br.userData.dir.position.set(pos[0][0], pos[0][1], pos[0][2]); br.userData.dir.rotation.set(pos[0][3], pos[0][4], 0);
    br.userData.esq.position.set(pos[1][0], pos[1][1], pos[1][2]); br.userData.esq.rotation.set(pos[1][3], pos[1][4], 0);
    mao.userData.esq = br.userData.esq; mao.userData.esq0 = br.userData.esq.position.clone(); mao.userData.esqR0 = br.userData.esq.rotation.clone();
    mao.scale.setScalar(0.55); camMao.add(mao); cenaMao.add(camMao); mao.userData.troca = 0.35;
    $('hArma').textContent = A[id].nome; atualizarMunicao();
  }
  function atualizarMunicao() {
    var a = A[eu.arma], m = eu.mun[eu.arma];
    if (a.tipo === 'faca') { $('hPente').textContent = '∞'; $('hReserva').textContent = ''; }
    else if (a.tipo === 'granada') { $('hPente').textContent = eu.granadas; $('hReserva').textContent = ''; }
    else if (m) { $('hPente').textContent = String(m.pente).padStart(3, '0'); $('hReserva').textContent = '/' + String(m.reserva).padStart(3, '0'); }
    if ($('hGr')) $('hGr').textContent = eu.granadas || 0; document.querySelector('.municao').classList.toggle('vazia', !!(m && m.pente === 0));
    $('hVida').textContent = Math.max(0, Math.round(eu.vida)); $('hBarra').style.width = Math.max(0, eu.vida) + '%'; document.querySelector('.vida').classList.toggle('baixa', eu.vida < 35);
  }
  function proximaArma() { var ordem = [eu.primaria, 'p9', 'faca'].concat(eu.granadas > 0 ? ['gr'] : []).filter(permitida), i = ordem.indexOf(eu.arma); trocarArma(ordem[(i + 1) % ordem.length]); }
  function recarregar() {
    var a = A[eu.arma], m = eu.mun[eu.arma]; if (!m || !a.pente || m.pente >= a.pente || m.reserva <= 0 || performance.now() < eu.recarregandoAte) return;
    eu.recarregandoAte = performance.now() + a.recarga * 1000; eu.mira = false; S.recarga(eu.arma, a.recarga); mandar({ t: 'recarregar' });
    setTimeout(function () { var q = Math.min(a.pente - m.pente, m.reserva); m.pente += q; m.reserva -= q; atualizarMunicao(); }, a.recarga * 1000 - 50);
  }

  /* ---------- tiro ---------- */
  var atirando = false, tiroLiberado = true;
  function tentarAtirar() {
    if (!eu.vivo || estado !== 'jogo') return;
    var a = A[eu.arma], t = performance.now();
    if (t - eu.ultTiro < a.cadencia * 1000 || t < eu.recarregandoAte || (mao && mao.userData.troca > 0)) return;
    if (!a.auto && !tiroLiberado) return; tiroLiberado = false;
    if (a.tipo === 'granada') {
      if (eu.granadas <= 0) return; eu.granadas--; eu.ultTiro = t; S.pino(); mandar({ t: 'granada', d: G.dirDe(eu.yaw, eu.pitch + 0.1) }); mao.userData.chute = 0.4;
      setTimeout(function () { trocarArma(eu.primaria); }, 450); return;
    }
    var m = eu.mun[eu.arma];
    if (a.tipo !== 'faca' && (!m || m.pente <= 0)) { S.vazio(); eu.ultTiro = t; if (m && m.reserva > 0) recarregar(); return; }
    eu.ultTiro = t; if (m) m.pente--;
    // dispersão: andando, pulando, mirando
    var anda = Math.hypot(velX, velZ) > 0.5 || !eu.noChao, disp = (eu.mira && a.dispMira != null ? a.dispMira : a.disp * (eu.mira ? 0.45 : 1)) + (anda ? a.dispAnda : 0) + eu.disp + (eu.agachado ? -a.disp * 0.3 : 0);
    disp = Math.max(0, disp);
    function dir() { var r = Math.random() * disp, ang = Math.random() * Math.PI * 2; return G.dirDe(eu.yaw + Math.cos(ang) * r, eu.pitch + Math.sin(ang) * r); }
    if (a.tipo === 'faca') { mandar({ t: 'tiro', d: G.dirDe(eu.yaw, eu.pitch), yaw: eu.yaw }); S.faca(); mao.userData.facada = 0.3; return; }
    var d = dir(), chumbos = a.chumbos ? Array.from({ length: a.chumbos }, dir) : null;
    mandar({ t: 'tiro', d: d, c: chumbos, yaw: eu.yaw });
    S.tiro(eu.arma); clarao(); mao.userData.chute = 1;
    // recuo: sobe a mira
    eu.pitch = Math.min(1.45, eu.pitch + a.recuo * (eu.mira ? 0.6 : 1) * (0.8 + Math.random() * 0.4)); eu.yaw += (Math.random() - 0.5) * a.recuo * 0.5;
    eu.disp = Math.min(0.06, eu.disp + a.recuo * 0.35); eu.recuoVis = 1;
    atualizarMunicao();
    if (m.pente === 0 && m.reserva > 0) setTimeout(recarregar, 250);
    if (a.luneta && eu.mira) { eu.mira = false; setTimeout(function () { if (atirando === false) {} }, 0); }
  }
  // clarão na boca da arma
  var luzClarao = new THREE.PointLight(0xffc070, 0, 6); cena.add(luzClarao);
  var spriteClarao = new THREE.Sprite(new THREE.SpriteMaterial({ map: (function () { var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,220,1)'); gr.addColorStop(0.3, 'rgba(255,190,80,.9)'); gr.addColorStop(1, 'rgba(255,120,0,0)'); g.fillStyle = gr; g.beginPath(); for (var i = 0; i < 10; i++) { var a = i / 10 * Math.PI * 2, r = i % 2 ? 12 : 31; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } g.fill(); return new THREE.CanvasTexture(c); })(), blending: THREE.AdditiveBlending, depthTest: false, transparent: true }));
  spriteClarao.visible = false; cenaMao.add(spriteClarao);
  var claraoT = 0;
  function clarao() { claraoT = 0.05; if (armaMao && armaMao.userData.boca) { var p = armaMao.userData.boca.clone(); armaMao.localToWorld(p); spriteClarao.position.copy(p); spriteClarao.material.rotation = Math.random() * 6; spriteClarao.scale.setScalar(A[eu.arma].tipo === 'pistola' ? 0.07 : 0.13); } cartucho(); }
  // cápsula voando
  var matCapsula = new THREE.MeshStandardMaterial({ color: 0xd4a53a, metalness: 0.9, roughness: 0.3 }), geoCapsula = new THREE.CylinderGeometry(0.006, 0.006, 0.025, 6), capsulas = [];
  function cartucho() {
    if (!armaMao || A[eu.arma].tipo === 'escopeta') return;
    var c = new THREE.Mesh(geoCapsula, matCapsula), p = new THREE.Vector3(0.07, 0.035, -0.06);
    armaMao.localToWorld(p); c.position.copy(p); c.rotation.z = Math.PI / 2; cena.add(c);
    var v = new THREE.Vector3(0.75 + Math.random() * 0.35, 0.9 + Math.random() * 0.45, 0.15 + Math.random() * 0.2);
    v.applyQuaternion(cam.quaternion);
    capsulas.push({ m: c, v: v, t: 0 });
  }
  // marcas de bala e faíscas
  var geoFurinho = new THREE.PlaneGeometry(0.09, 0.09), matFurinho = new THREE.MeshBasicMaterial({ map: (function () { var c = document.createElement('canvas'); c.width = c.height = 32; var g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 1, 16, 16, 15); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.35, 'rgba(20,20,20,.9)'); gr.addColorStop(1, 'rgba(40,40,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  var geoFaisca = new THREE.BoxGeometry(0.025, 0.025, 0.025), matFaisca = new THREE.MeshBasicMaterial({ color: 0xffd28a }), matSangue = new THREE.MeshBasicMaterial({ color: 0x7a0008 }), matPoeira = new THREE.MeshBasicMaterial({ color: 0x9a948a, transparent: true, opacity: 0.8 });
  function particulas(x, y, z, n, mat, forca) { for (var i = 0; i < n; i++) { var p = new THREE.Mesh(geoFaisca, mat); p.position.set(x, y, z); cena.add(p); efeitos.push({ m: p, v: new THREE.Vector3((Math.random() - 0.5) * forca, Math.random() * forca, (Math.random() - 0.5) * forca), t: 0, vida: 0.4 + Math.random() * 0.3, grav: true }); } }
  // sangue: névoa vermelha + gotas + mancha no chão
  var killcam = null, espiar = 0;
  var marcaKill = new THREE.Sprite(new THREE.SpriteMaterial({ map: (function () { var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'); g.fillStyle = '#ff3a2a'; g.beginPath(); g.moveTo(32, 60); g.lineTo(10, 18); g.lineTo(54, 18); g.closePath(); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); var t = new THREE.CanvasTexture(c); return t; })(), depthTest: false, transparent: true }));
  marcaKill.scale.setScalar(0.5); marcaKill.visible = false; marcaKill.renderOrder = 10; cena.add(marcaKill);
  var matNevoa = new THREE.SpriteMaterial({ map: (function () { var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(150,0,8,.85)'); gr.addColorStop(1, 'rgba(120,0,8,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })(), transparent: true, depthWrite: false });
  var matMancha = new THREE.MeshBasicMaterial({ map: (function () { var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'); g.fillStyle = 'rgba(90,0,6,.85)'; for (var i = 0; i < 14; i++) { g.beginPath(); g.arc(32 + (Math.random() - 0.5) * 34, 32 + (Math.random() - 0.5) * 34, 3 + Math.random() * 9, 0, 7); g.fill(); } return new THREE.CanvasTexture(c); })(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  function sangue(x, y, z, forte) {
    particulas(x, y, z, forte ? 18 : 10, matSangue, forte ? 3.2 : 2.5);
    var n = new THREE.Sprite(matNevoa); n.position.set(x, y, z); n.scale.setScalar(forte ? 0.7 : 0.45); cena.add(n); efeitos.push({ m: n, t: 0, vida: 0.35, nevoa: true, s0: n.scale.x });
    var ch = G.chaoEm(mapaAtual, x, z); if (y - ch < 2.2) { var mc = new THREE.Mesh(new THREE.PlaneGeometry(forte ? 0.8 : 0.5, forte ? 0.8 : 0.5), matMancha); mc.rotation.x = -Math.PI / 2; mc.rotation.z = Math.random() * 6; mc.position.set(x + (Math.random() - 0.5) * 0.4, ch + 0.02, z + (Math.random() - 0.5) * 0.4); cena.add(mc); marcas.push(mc); if (marcas.length > 80) cena.remove(marcas.shift()); }
  }
  function tracante(x, y, z, ex, ey, ez) {
    var g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, y, z), new THREE.Vector3(ex, ey, ez)]);
    var l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.7 })); cena.add(l); efeitos.push({ m: l, t: 0, vida: 0.06, linha: true });
  }
  function impacto(m) {
    if (m.carne) { sangue(m.ex, m.ey, m.ez, m.cab); return; }
    // faíscas + furinho na parede (normal aproximada: volta um pouco no sentido do tiro)
    var d = new THREE.Vector3(m.ex - m.x, m.ey - m.y, m.ez - m.z); if (d.length() > 200) return; d.normalize();
    particulas(m.ex - d.x * 0.05, m.ey - d.y * 0.05, m.ez - d.z * 0.05, 5, Math.random() < 0.5 ? matFaisca : matPoeira, 2);
    var f = new THREE.Mesh(geoFurinho, matFurinho), p = new THREE.Vector3(m.ex - d.x * 0.01, m.ey - d.y * 0.01, m.ez - d.z * 0.01); f.position.copy(p);
    // orienta pela face mais provável (eixo dominante do tiro)
    var ax = Math.abs(d.x), ay = Math.abs(d.y), az = Math.abs(d.z);
    if (ay > ax && ay > az) f.rotation.x = d.y > 0 ? Math.PI / 2 : -Math.PI / 2; else if (ax > az) f.rotation.y = d.x > 0 ? -Math.PI / 2 : Math.PI / 2; else f.rotation.y = d.z > 0 ? Math.PI : 0;
    cena.add(f); marcas.push(f); if (marcas.length > 80) cena.remove(marcas.shift());
  }
  function tiroDeOutro(m) {
    var o = jogs[m.id]; S.tiro(m.arma, { x: m.x, y: m.y, z: m.z });
    if (A[m.arma] && A[m.arma].tipo === 'faca') { S.faca({ x: m.x, y: m.y, z: m.z }); return; }
    tracante(m.x, m.y - 0.1, m.z, m.ex, m.ey, m.ez); impacto(m);
    if (o && o.m) { luzClarao.position.set(m.x, m.y, m.z); luzClarao.intensity = 2; setTimeout(function () { luzClarao.intensity = 0; }, 50); }
  }

  /* ---------- dano, mortes, kill feed ---------- */
  function levarDano(m) {
    S.dor(); atualizarMunicao();
    var ang = Math.atan2(m.x - eu.x, m.z - eu.z), rel = ang - (eu.yaw + Math.PI); var el = $('danoDir'); el.style.transform = 'rotate(' + (-rel) + 'rad)'; el.style.opacity = 1; clearTimeout(levarDano.h); levarDano.h = setTimeout(function () { el.style.opacity = 0; }, 500);
    tremor = 0.25;
  }
  var tremor = 0;
  function comTag(nome, tag) { return (tag ? '[' + tag + '] ' : '') + nome; }
  function nomeDe(id) { if (id === 0) return 'BOMBA'; var o = jogs[id]; return o ? comTag(o.nome, o.tag) : '?'; }
  function timeDe(id) { var o = jogs[id]; return o ? (partida.modo === 'todos' ? 'x' : o.time) : 'x'; }
  function morte(m) {
    partida.placar = m.placar || partida.placar; atualizarPlacar();
    var f = document.createElement('div'); f.innerHTML = '<span class="' + timeDe(m.por) + '">' + esc(nomeDe(m.por)) + '</span> [' + (A[m.arma] ? A[m.arma].nome.split(' ')[0] : '?') + (m.hs ? ' <span class="hsx">✦HS</span>' : '') + '] <span class="' + timeDe(m.id) + '">' + esc(nomeDe(m.id)) + '</span>';
    $('feed').appendChild(f); setTimeout(function () { f.remove(); }, 6000); while ($('feed').children.length > 6) $('feed').firstChild.remove();
    var o = jogs[m.id]; if (o) { o.vivo = false; if (o.m) cair(o); }
    if (m.id === meuId) {
      eu.vivo = false; eu.mira = false; partida.sequencia = 0; killcam = m.por && m.por !== meuId && jogs[m.por] ? { id: m.por, ini: Date.now(), ate: Date.now() + (rodada ? 3000 : 2600) } : null; espiar = 0; $('estrelas').innerHTML = ''; S.morte();
      $('morto').hidden = false; $('mPor').innerHTML = 'Morto por <b>' + esc(nomeDe(m.por)) + '</b> com ' + (A[m.arma] ? A[m.arma].nome : '') + (m.hs ? ' (HEAD SHOT)' : '');
      if (rodada) { $('morto').querySelector('.cont').innerHTML = 'Aguardando a próxima rodada…'; clearInterval(morte.h); } else { $('morto').querySelector('.cont').innerHTML = 'Renascendo em <b id="mCont">3</b>'; }
      var n = R.RENASCER; if (!rodada) $('mCont').textContent = n; clearInterval(morte.h); if (!rodada) morte.h = setInterval(function () { n--; if ($('mCont')) $('mCont').textContent = Math.max(0, n); if (n <= 0) clearInterval(morte.h); }, 1000);
    }
    if (m.por === meuId && m.id !== meuId) {
      partida.sequencia++; var est = document.createElement('i'); if (m.hs) est.className = 'ouro'; $('estrelas').appendChild(est); while ($('estrelas').children.length > 5) $('estrelas').firstChild.remove();
      S.kill(partida.sequencia);
      if (m.hs) { S.headshot(); var h = $('hs'); h.className = 'hs'; void h.offsetWidth; h.className = 'hs on'; }
    }
  }
  function cair(o) { o.caindo = 0; if (o.m && o.m.userData.arma && partida && partida.modo !== 'faca') o.m.userData.arma.visible = false; }
  /* ---------- corpos ficam no chão e armas largadas podem ser pegas ---------- */
  var corpos = [], drops = {};
  function virarCorpo(o) { // o modelo caído vira corpo e o jogador ganha um modelo novo
    var corpo = o.m; corpo.rotation.x = -Math.PI / 2; corpo.position.y = o.y + 0.2; if (o.etq) corpo.remove(o.etq);
    corpos.push({ m: corpo, ate: Date.now() + 30000 }); while (corpos.length > 12) cena.remove(corpos.shift().m);
    var novo = AR.soldado(partida && partida.modo === 'todos' ? null : o.time, o.id, o.skin); AR.armaSoldado(novo, o.arma); AR.coleteSoldado(novo, o.colete); if (o.etq) novo.add(o.etq); cena.add(novo); o.m = novo;
  }
  function limparCorpos() { corpos.forEach(function (c) { cena.remove(c.m); }); corpos = []; }
  function novoDrop(d) {
    if (!d || drops[d.id] || !A[d.arma]) return; var g = new THREE.Group(), mo = AR.modelo(d.arma); mo.scale.setScalar(1.15); mo.rotation.z = Math.PI / 2; g.add(mo);
    // anel de brilho para achar a arma no chão
    var anel = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.45, 24), new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide })); anel.rotation.x = -Math.PI / 2; anel.position.y = -0.03; g.add(anel);
    g.position.set(d.x, d.y + 0.06, d.z); g.rotation.y = d.rot || 0; cena.add(g); drops[d.id] = { d: d, m: g, anel: anel };
  }
  function tirarDrop(id) { var x = drops[id]; if (!x) return; cena.remove(x.m); delete drops[id]; }
  function limparDrops() { Object.keys(drops).forEach(tirarDrop); }
  function dropPerto() {
    if (!eu.vivo || !partida || partida.modo === 'faca') return null; var melhor = null, md = 2.2;
    Object.keys(drops).forEach(function (k) { var d = drops[k].d; if (partida.modo === 'sniper' && A[d.arma].tipo !== 'sniper') return; var dist = Math.hypot(d.x - eu.x, d.z - eu.z); if (dist < md && Math.abs(d.y - eu.y) < 1.6) { md = dist; melhor = d; } });
    return melhor;
  }
  function pegarPerto() { var d = dropPerto(); if (d) mandar({ t: 'pegar', id: d.id }); }
  function passoDrops(agora) {
    var d = dropPerto(), bt = $('bPegar'); bt.hidden = !d; if (d) bt.textContent = 'PEGAR ' + A[d.arma].nome.toUpperCase();
    Object.keys(drops).forEach(function (k) { var x = drops[k]; x.anel.material.opacity = 0.25 + 0.2 * Math.sin(agora / 250); });
    if (corpos.length && corpos[0].ate < Date.now()) cena.remove(corpos.shift().m);
  }
  function nasceu(m) {
    var o = jogs[m.id]; if (o) { if (o.m && o.caindo != null && !rodada) virarCorpo(o); o.vivo = true; o.x = o.tx = m.x; o.y = o.ty = m.y; o.z = o.tz = m.z; o.caindo = null; if (o.m) { o.m.rotation.x = 0; o.m.position.y = m.y; if (o.m.userData.arma) o.m.userData.arma.visible = true; } }
    if (m.id === meuId) { eu.vivo = true; eu.vida = 100; eu.x = m.x; eu.y = m.y; eu.z = m.z; eu.vy = 0; eu.yaw = eu.time === 'r' ? -Math.PI / 2 : Math.PI / 2; eu.pitch = 0; $('morto').hidden = true; atualizarMunicao(); }
  }
  function atualizarPlacar() {
    if (!partida) return;
    if (partida.modo === 'todos') { var meu = jogs[meuId], top = 0; Object.keys(jogs).forEach(function (k) { top = Math.max(top, jogs[k].kills || 0); }); $('pR').textContent = String(meu ? meu.kills || 0 : 0).padStart(3, '0'); $('pB').textContent = String(top).padStart(3, '0'); }
    else { $('pR').textContent = String(partida.placar.r).padStart(3, '0'); $('pB').textContent = String(partida.placar.b).padStart(3, '0'); }
    $('pMeta').textContent = partida.modo === 'todos' ? Math.min(partida.meta, 40) : partida.meta;
  }
  function tabela() {
    var lista = Object.keys(jogs).map(function (k) { return jogs[k]; }).sort(function (a, b) { return (b.kills || 0) - (a.kills || 0); });
    function t(time, cls, nome) { var l = lista.filter(function (j) { return partida.modo === 'todos' || j.time === time; }); return '<div class="' + cls + '"><h4>' + nome + '</h4><table><tr><th>NOME</th><th>K</th><th>D</th></tr>' + l.map(function (j) { return '<tr class="' + (j.id === meuId ? 'eu' : '') + (j.vivo ? '' : ' morto2') + '"><td>' + esc(j.nome) + '</td><td>' + (j.kills || 0) + '</td><td>' + (j.mortes || 0) + '</td></tr>'; }).join('') + '</table></div>'; }
    $('tabela').innerHTML = partida.modo === 'todos' ? t(null, 'tr', 'TODOS CONTRA TODOS') : t('r', 'tr', 'VERMELHO ' + partida.placar.r) + t('b', 'tb4', 'AZUL ' + partida.placar.b);
  }
  function fimPartida(m) {
    if (document.pointerLockElement) document.exitPointerLock();
    var titulo = partida.modo === 'todos' ? (m.mvp === meuId ? '<h1 class="r">VOCÊ VENCEU!</h1>' : '<h1 class="e">FIM DE JOGO</h1>') : m.vencedor === 'empate' ? '<h1 class="e">EMPATE</h1>' : '<h1 class="' + m.vencedor + '">' + (m.vencedor === eu.time ? 'VITÓRIA' : 'DERROTA') + '</h1>';
    var linhas = m.res.sort(function (a, b) { return b.kills - a.kills; }).map(function (r) { return '<tr class="' + (r.id === meuId ? 'eu' : '') + '"><td>' + (r.id === m.mvp ? '<span class="mvp">MVP</span> ' : '') + esc(r.nome) + '</td><td>' + (partida.modo === 'todos' ? '' : r.time === 'r' ? '🔴' : '🔵') + '</td><td>' + r.kills + '</td><td>' + r.mortes + '</td><td>' + r.hs + '</td><td>+' + r.xp + '</td><td class="m">+' + (r.moedas || 0) + '</td></tr>'; }).join('');
    $('fim').innerHTML = titulo + '<p>Vermelho ' + m.placar.r + ' × ' + m.placar.b + ' Azul</p><table><tr><th>JOGADOR</th><th></th><th>K</th><th>D</th><th>HS</th><th>XP</th><th>MOEDAS</th></tr>' + linhas + '</table>' + (function () { var eu2 = m.res.filter(function (r) { return r.id === meuId; })[0]; return eu2 ? '<p class="ganho">Você ganhou <b>+' + eu2.xp + ' XP</b> e <b class="m"><i class="moeda"></i>' + (eu2.moedas || 0) + ' moedas</b></p>' : ''; })() + '<p>Voltando para a sala…</p>';
    $('fim').hidden = false; S.kill(3);
    setTimeout(function () { $('fim').hidden = true; sairPartida(); mostrar('tSala'); desenharSala(); }, 7500);
  }

  /* ---------- modos por rodada: locais A/B, bomba, plantar/desarmar ---------- */
  var rodada = null, acaoAtual = null, locaisG = null, bombaG = null, bipT = 0;
  function banner(tit, sub, cls) { var b = $('banner'); b.innerHTML = '<b>' + tit + '</b>' + (sub ? '<small>' + sub + '</small>' : ''); b.className = 'banner ' + (cls || ''); void b.offsetWidth; b.className = 'banner on ' + (cls || ''); }
  function montarLocais(idMapa) {
    if (locaisG) { cena.remove(locaisG); locaisG = null; }
    var mp = G.MAPAS[idMapa]; if (!mp.locais || (partida && partida.modo !== 'bomba')) return;
    locaisG = new THREE.Group();
    Object.keys(mp.locais).forEach(function (k) {
      var l = mp.locais[k], y = G.chaoEm(mp, l[0], l[1]) + 0.03;
      var t = new THREE.CanvasTexture((function () { var c = document.createElement('canvas'); c.width = c.height = 256; var g = c.getContext('2d'); g.strokeStyle = 'rgba(255,70,50,.85)'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 118, 0, 7); g.stroke(); g.setLineDash([18, 14]); g.lineWidth = 5; g.beginPath(); g.arc(128, 128, 96, 0, 7); g.stroke(); g.fillStyle = 'rgba(255,70,50,.9)'; g.font = '900 120px Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(k, 128, 136); return c; })());
      var m = new THREE.Mesh(new THREE.PlaneGeometry(G.BOMBA.raioLocal * 2, G.BOMBA.raioLocal * 2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.rotation.x = -Math.PI / 2; m.position.set(l[0], y, l[1]); locaisG.add(m);
    });
    cena.add(locaisG);
  }
  function bombaMundo(b) {
    if (bombaG) { cena.remove(bombaG); bombaG = null; }
    if (!b || (b.estado !== 'plantada' && b.estado !== 'caiu')) return;
    var g = new THREE.Group(), corpo = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.24), new THREE.MeshStandardMaterial({ color: 0x3a3f36, roughness: 0.6 }));
    corpo.position.y = 0.08; g.add(corpo);
    var tela = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.1), new THREE.MeshBasicMaterial({ color: 0x113311 })); tela.position.set(0.04, 0.17, 0); g.add(tela);
    [-0.1, -0.05].forEach(function (x) { var fio = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.26, 6), new THREE.MeshStandardMaterial({ color: x < -0.07 ? 0xd22 : 0x23d })); fio.rotation.x = Math.PI / 2; fio.position.set(x, 0.17, 0); g.add(fio); });
    var luz = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2010 })); luz.position.set(0.12, 0.19, 0.06); g.add(luz); g.userData.luz = luz;
    g.position.set(b.x, b.y, b.z); cena.add(g); bombaG = g;
  }
  function eventoBomba(m) {
    if (!rodada) return;
    if (m.estado === 'plantada') { rodada.bomba = m; rodada.portador = null; bombaMundo(m); banner('BOMBA PLANTADA', 'Local ' + m.local + (eu.time === 'b' ? ' · desarme!' : ' · proteja a bomba!'), 'd'); S.locutor('bomba', 'The bomb has been planted'); }
    else if (m.estado === 'caiu') { rodada.bomba = m; rodada.portador = null; bombaMundo(m); if (eu.time === 'r') aviso('A bomba caiu! Pegue ela'); }
    else if (m.estado === 'pegou') { rodada.bomba = null; rodada.portador = m.quem; bombaMundo(null); if (m.quem === meuId) aviso('Você pegou a bomba'); }
    else if (m.estado === 'desarmada') { rodada.bomba = m; bombaMundo(null); }
    else if (m.estado === 'explodiu') { rodada.bomba = m; bombaMundo(null); tremor = 1.2; }
  }
  function localPerto() { var mp = mapaAtual; if (!mp || !mp.locais) return null; for (var k in mp.locais) if (Math.hypot(eu.x - mp.locais[k][0], eu.z - mp.locais[k][1]) <= G.BOMBA.raioLocal) return k; return null; }
  function acaoPossivel() {
    if (!rodada || partida.modo !== 'bomba' || rodada.fase === 'pausa' || !eu.vivo) return null;
    if (eu.time === 'r' && rodada.portador === meuId && localPerto()) return 'plantar';
    var b = rodada.bomba; if (eu.time === 'b' && b && b.estado === 'plantada' && Math.hypot(eu.x - b.x, eu.z - b.z) <= G.BOMBA.raioDesarmar) return 'desarmar';
    return null;
  }
  var segurando = null;
  function comecarAcao() { var a = acaoPossivel(); if (!a) return; segurando = a; mandar({ t: 'acao', tipo: a, on: true }); }
  function pararAcao() { if (!segurando) return; mandar({ t: 'acao', tipo: segurando, on: false }); segurando = null; acaoAtual = null; }
  function passoBomba(dt, agora) {
    var a = acaoPossivel(), bt = $('bBomba');
    bt.hidden = !a; if (a) { bt.textContent = a === 'plantar' ? 'PLANTAR' : 'DESARMAR'; bt.classList.toggle('desarmar', a === 'desarmar'); }
    if (!a && segurando) pararAcao();
    var pg = $('progBomba');
    if (acaoAtual) { pg.hidden = false; var f = 1 - Math.max(0, acaoAtual.fim - agora) / acaoAtual.dur; pg.querySelector('i').style.width = (f * 100).toFixed(1) + '%'; pg.querySelector('span').textContent = acaoAtual.tipo === 'plantar' ? 'PLANTANDO…' : 'DESARMANDO…'; }
    else pg.hidden = true;
    // luz piscando e bip cada vez mais rápido
    var b = rodada.bomba;
    if (bombaG && b && b.estado === 'plantada') {
      var falta = Math.max(0.05, (b.explodeEm - Date.now()) / 1000), intervalo = Math.max(0.12, Math.min(1, falta / 30));
      bipT -= dt; if (bipT <= 0) { bipT = intervalo; S.bip({ x: b.x, y: b.y, z: b.z }, falta < 5); bombaG.userData.luz.visible = true; setTimeout(function () { if (bombaG) bombaG.userData.luz.visible = false; }, 90); }
    }
  }

  /* ---------- granadas ---------- */
  var geoGr = new THREE.SphereGeometry(0.06, 8, 6), matGr = new THREE.MeshStandardMaterial({ color: 0x4f5a3a });
  function granadaVisual(g) { var me = new THREE.Mesh(geoGr, matGr); me.position.set(g.x, g.y, g.z); cena.add(me); granadas[g.id] = { m: me, v: new THREE.Vector3(g.vx, g.vy, g.vz) }; }
  function explosao(m) {
    var g = granadas[m.id]; if (g) { cena.remove(g.m); delete granadas[m.id]; }
    S.explosao({ x: m.x, y: m.y, z: m.z }); if (m.grande) { S.explosao({ x: m.x, y: m.y, z: m.z }); particulas(m.x, m.y + 0.5, m.z, 60, matFaisca, 14); } particulas(m.x, m.y + 0.2, m.z, 30, matFaisca, 9); particulas(m.x, m.y + 0.2, m.z, 20, matPoeira, 5);
    var bola = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9 })); bola.position.set(m.x, m.y, m.z); if (m.grande) bola.scale.setScalar(3); cena.add(bola); efeitos.push({ m: bola, t: 0, vida: m.grande ? 0.9 : 0.45, bola: true, grande: m.grande });
    luzClarao.position.set(m.x, m.y + 1, m.z); luzClarao.intensity = 8; luzClarao.distance = 14; setTimeout(function () { luzClarao.intensity = 0; luzClarao.distance = 6; }, 120);
    var d = Math.hypot(m.x - eu.x, m.z - eu.z); if (d < 14) tremor = Math.max(tremor, (14 - d) / 14 * 0.8);
  }

  /* ---------- controles ---------- */
  var teclas = {}, joy = { x: 0, y: 0 };
  addEventListener('keydown', function (e) {
    if (estado !== 'jogo' || document.activeElement.tagName === 'INPUT') return; teclas[e.code] = true;
    if (e.code === 'KeyF') pegarPerto(); if (e.code === 'KeyR') recarregar(); if (e.code === 'Digit1') trocarArma(eu.primaria); if (e.code === 'Digit2') trocarArma('p9'); if (e.code === 'Digit3') trocarArma('faca'); if (e.code === 'Digit4' && eu.granadas > 0) trocarArma('gr'); if (e.code === 'KeyQ') proximaArma();
    if (e.code === 'KeyG' && eu.granadas > 0) { trocarArma('gr'); setTimeout(function () { tiroLiberado = true; tentarAtirar(); }, 380); }
    if (e.code === 'KeyE' && !e.repeat) comecarAcao();
    if (e.code === 'Tab') { e.preventDefault(); tabela(); $('tabela').hidden = false; }
    if (e.code === 'Space') e.preventDefault();
  });
  addEventListener('keyup', function (e) { teclas[e.code] = false; if (e.code === 'KeyE') pararAcao(); if (e.code === 'Tab') $('tabela').hidden = true; });
  var cv = renderer.domElement;
  cv.addEventListener('pointerdown', function () { if (estado === 'jogo' && !eu.vivo && rodada && !(killcam && Date.now() < killcam.ate)) espiar++; });
  cv.addEventListener('mousedown', function (e) {
    if (estado !== 'jogo') return; if (document.pointerLockElement !== cv) { cv.requestPointerLock(); return; }
    if (e.button === 0) { atirando = true; tiroLiberado = true; tentarAtirar(); } if (e.button === 2) alternarMira();
  });
  addEventListener('mouseup', function (e) { if (e.button === 0) { atirando = false; tiroLiberado = true; } });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  addEventListener('wheel', function (e) { if (estado === 'jogo') proximaArma(); });
  var sens = 0.0024;
  addEventListener('mousemove', function (e) { if (document.pointerLockElement !== cv || !eu.vivo) return; var k = (eu.mira ? 1 / A[eu.arma].zoom : 1) * ctrl.sens * freioMira; eu.yaw -= e.movementX * sens * k; eu.pitch = Math.max(-1.45, Math.min(1.45, eu.pitch - e.movementY * sens * k)); });
  function alternarMira() { var a = A[eu.arma]; if (a.tipo === 'faca' || a.tipo === 'granada' || performance.now() < eu.recarregandoAte) return; eu.mira = !eu.mira; S.clique(1500, 0.12); }
  // celular: joystick + arrastar em qualquer lugar livre para mirar + botões
  var jEl = $('joy'), jId = null;
  function joyMover(e) { var r = jEl.getBoundingClientRect(), x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2), d = Math.hypot(x, y), mx = r.width / 2 - 8; if (d > mx) { x = x / d * mx; y = y / d * mx; } joy.x = x / mx; joy.y = y / mx; $('joyP').style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
  jEl.addEventListener('pointerdown', function (e) { jId = e.pointerId; try { jEl.setPointerCapture(jId); } catch (x) {} joyMover(e); });
  jEl.addEventListener('pointermove', function (e) { if (e.pointerId === jId) joyMover(e); });
  function joySolta(e) { if (e.pointerId !== jId) return; jId = null; joy.x = joy.y = 0; $('joyP').style.transform = ''; }
  jEl.addEventListener('pointerup', joySolta); jEl.addEventListener('pointercancel', joySolta);
  var olhar = {};
  cv.addEventListener('pointerdown', function (e) { if (estado === 'jogo' && e.pointerType === 'touch') olhar[e.pointerId] = { x: e.clientX, y: e.clientY }; });
  function arrastarMira(e) { var o = olhar[e.pointerId]; if (!o || !eu.vivo) return; var k = (eu.mira ? 1 / A[eu.arma].zoom : 1) * 0.0055 * ctrl.sens * freioMira; eu.yaw -= (e.clientX - o.x) * k; eu.pitch = Math.max(-1.45, Math.min(1.45, eu.pitch - (e.clientY - o.y) * k)); o.x = e.clientX; o.y = e.clientY; }
  addEventListener('pointermove', arrastarMira);
  addEventListener('pointerup', function (e) { delete olhar[e.pointerId]; }); addEventListener('pointercancel', function (e) { delete olhar[e.pointerId]; });
  // botão de tiro também mira enquanto arrasta (como nos jogos de celular)
  ['bTiro', 'bTiro2'].forEach(function (id) {
    var b = $(id);
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) {} olhar[e.pointerId] = { x: e.clientX, y: e.clientY }; atirando = true; tiroLiberado = true; tentarAtirar(); b.classList.add('on'); });
    b.addEventListener('pointermove', arrastarMira);
    function solta(e) { delete olhar[e.pointerId]; atirando = false; tiroLiberado = true; b.classList.remove('on'); }
    b.addEventListener('pointerup', solta); b.addEventListener('pointercancel', solta);
  });
  $('bPegar').addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); pegarPerto(); });
  (function () { var b = $('bBomba'); b.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); try { b.setPointerCapture(e.pointerId); } catch (x) {} comecarAcao(); }); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { b.addEventListener(ev, pararAcao); }); })();
  function botao(id, f) { $(id).addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); f(); }); }
  botao('bMira', alternarMira); botao('bPulo', function () { pular = true; }); botao('bAg', function () { eu.agachadoT = !eu.agachadoT; $('bAg').classList.toggle('on', eu.agachadoT); });
  botao('bRec', recarregar); botao('bTroca', proximaArma); botao('bGr', function () { if (eu.granadas > 0) { trocarArma('gr'); setTimeout(function () { tiroLiberado = true; tentarAtirar(); }, 380); } });
  botao('bTab', function () { var t = $('tabela'); if (t.hidden) { tabela(); t.hidden = false; } else t.hidden = true; });
  var pular = false;

  /* ---------- minimapa (canto) ---------- */
  var mini = document.createElement('canvas'); mini.width = 150; mini.height = 110; mini.className = 'minimapa'; mini.style.cssText = 'position:absolute;left:max(8px,env(safe-area-inset-left));top:max(8px,env(safe-area-inset-top));width:150px;height:110px;border:1px solid rgba(255,255,255,.25);background:#0a0f15;opacity:.85'; $('tJogo').appendChild(mini);
  var minimapaBase = null;
  function minimapa() {
    if (!mapaAtual) return; var g = mini.getContext('2d');
    if (!minimapaBase) { minimapaBase = document.createElement('canvas'); minimapaBase.width = 150; minimapaBase.height = 110; desenharMiniMapa(minimapaBase, mapaAtual); }
    g.drawImage(minimapaBase, 0, 0);
    var L = mapaAtual.lim, es = Math.min(150 / (L[0] * 2 + 2), 110 / (L[1] * 2 + 2));
    function px(x, z) { return [75 + x * es, 55 + z * es]; }
    Object.keys(jogs).forEach(function (k) { var o = jogs[k]; if (!o.vivo || k == meuId) return; var amigo = partida.modo !== 'todos' && o.time === eu.time; if (!amigo && !o.visto) return; var p = px(o.x, o.z); g.fillStyle = amigo ? '#7ee787' : '#ff5a4e'; g.beginPath(); g.arc(p[0], p[1], 2.6, 0, 7); g.fill(); });
    if (rodada && partida.modo === 'bomba' && mapaAtual.locais) { g.font = '900 10px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; Object.keys(mapaAtual.locais).forEach(function (k) { var q = px(mapaAtual.locais[k][0], mapaAtual.locais[k][1]); g.strokeStyle = 'rgba(255,80,60,.9)'; g.beginPath(); g.arc(q[0], q[1], 6, 0, 7); g.stroke(); g.fillStyle = '#ff6a5a'; g.fillText(k, q[0], q[1] + 0.5); });
      var bb = rodada.bomba; if (bb && (bb.estado === 'plantada' || (bb.estado === 'caiu' && eu.time === 'r'))) { var q2 = px(bb.x, bb.z); g.fillStyle = (Date.now() % 600) < 300 ? '#ff2a1a' : '#ffd257'; g.fillRect(q2[0] - 2.5, q2[1] - 2.5, 5, 5); } }
    var p = px(eu.x, eu.z); g.save(); g.translate(p[0], p[1]); g.rotate(-eu.yaw); g.fillStyle = '#f2b53a'; g.beginPath(); g.moveTo(0, -5); g.lineTo(3.5, 3.5); g.lineTo(-3.5, 3.5); g.fill(); g.restore();
  }

  /* ---------- laço ---------- */
  var velX = 0, velZ = 0, ultT = performance.now(), envioT = 0, passoT = 0, mostrado = 0;
  function quadro(agora) {
    requestAnimationFrame(quadro);
    var dt = Math.min(0.05, (agora - ultT) / 1000); ultT = agora; var t = agora / 1000;
    if (estado !== 'jogo') {
      // fundo do menu: câmera passeando pelo mapa
      cam.fov = 70; cam.updateProjectionMatrix(); var L = mapaAtual.lim;
      cam.position.set(Math.sin(t * 0.06) * L[0] * 0.6, 3.2, Math.cos(t * 0.06) * L[1] * 0.5); cam.lookAt(0, 1.5, 0);
      renderer.clear(); renderer.render(cena, cam); return;
    }
    // movimento
    eu.agachado = !!(teclas.ControlLeft || teclas.KeyC || eu.agachadoT);
    var fx = 0, fz = 0; if (teclas.KeyW) fz += 1; if (teclas.KeyS) fz -= 1; if (teclas.KeyA) fx -= 1; if (teclas.KeyD) fx += 1; fx += joy.x; fz -= joy.y;
    var mag = Math.min(1, Math.hypot(fx, fz)), vel = eu.agachado ? R.VEL_AGACHADO : eu.mira ? R.VEL_MIRA : R.VEL; if (teclas.ShiftLeft) vel = R.VEL_AGACHADO;
    var sx = Math.sin(eu.yaw), cx = Math.cos(eu.yaw);
    var alvoX = eu.vivo ? (-sx * fz + cx * fx) / (Math.hypot(fx, fz) || 1) * mag * vel : 0, alvoZ = eu.vivo ? (-cx * fz - sx * fx) / (Math.hypot(fx, fz) || 1) * mag * vel : 0;
    var acel = eu.noChao ? 12 : 3; velX += (alvoX - velX) * Math.min(1, dt * acel); velZ += (alvoZ - velZ) * Math.min(1, dt * acel);
    if ((teclas.Space || pular) && eu.noChao && eu.vivo) { eu.vy = R.PULO; eu.noChao = false; } pular = false;
    if (eu.vivo) G.mover(mapaAtual, eu, velX * dt, velZ * dt, dt);
    var andando = Math.hypot(velX, velZ) > 0.5 && eu.noChao;
    if (andando && !eu.agachado && !teclas.ShiftLeft) { passoT -= dt * Math.hypot(velX, velZ) / R.VEL; if (passoT <= 0) { passoT = 0.36; S.passo(null, 0.12); } }
    eu.disp = Math.max(0, eu.disp - dt * 0.12);
    // tiro automático
    if (atirando && A[eu.arma].auto) tentarAtirar();
    // câmera
    var olhoY = eu.y + (eu.agachado ? R.OLHO_AGACHADO : R.OLHO);
    eu.olhoY = eu.olhoY == null ? olhoY : eu.olhoY + (olhoY - eu.olhoY) * Math.min(1, dt * 14);
    cam.position.set(eu.x, eu.olhoY, eu.z);
    if (tremor > 0) { tremor -= dt; cam.position.x += (Math.random() - 0.5) * tremor * 0.15; cam.position.y += (Math.random() - 0.5) * tremor * 0.15; }
    cam.rotation.order = 'YXZ'; cam.rotation.set(eu.pitch, eu.yaw, 0);
    var a = A[eu.arma], fovAlvo = eu.mira ? 75 / a.zoom : 75;
    if (!eu.vivo) {
      var kc = killcam && Date.now() < killcam.ate ? jogs[killcam.id] : null;
      if (kc && kc.m) { // câmera da morte: vira e aproxima de quem te matou
        var alvoK = new THREE.Vector3(kc.x, kc.y + 1.4, kc.z), olhoK = new THREE.Vector3(eu.x, eu.olhoY - 0.6, eu.z);
        cam.position.copy(olhoK); var q0 = cam.quaternion.clone(); cam.lookAt(alvoK); var q1 = cam.quaternion.clone(); cam.quaternion.copy(q0).slerp(q1, Math.min(1, (Date.now() - killcam.ini) / 600));
        fovAlvo = Math.max(18, Math.min(55, 1400 / Math.max(8, alvoK.distanceTo(olhoK)) + 10)); marcaKill.visible = true; marcaKill.position.set(kc.x, kc.y + 2.35, kc.z);
      } else {
        marcaKill.visible = false;
        var vivos = rodada ? Object.keys(jogs).map(function (k) { return jogs[k]; }).filter(function (o) { return o.vivo && o.m && o.time === eu.time && o.id !== meuId; }) : [];
        if (vivos.length) { // espectador: assiste um colega vivo
          espiar = espiar % vivos.length; var oe = vivos[espiar];
          cam.position.set(oe.x, oe.y + (oe.ag ? 1.15 : 1.6), oe.z); cam.rotation.order = 'YXZ'; cam.rotation.set(oe.pitch || 0, oe.yaw || 0, 0); fovAlvo = 75;
          $('espiando').hidden = false; $('espiando').innerHTML = '👁 ASSISTINDO <b>' + esc(nomeDe(oe.id)) + '</b><small>toque para trocar</small>';
        } else $('espiando').hidden = true;
      }
    } else { marcaKill.visible = false; $('espiando').hidden = true; }
    cam.fov += (fovAlvo - cam.fov) * Math.min(1, dt * (eu.vivo ? 14 : 4)); cam.updateProjectionMatrix();
    var luneta = eu.mira && a.luneta && cam.fov < 30; $('luneta').hidden = !luneta; var holo = eu.vivo && eu.mira && a.holo && cam.fov < 50; $('holo').hidden = !holo; if (holo) luneta = true; var m15 = eu.vivo && eu.mira && a.mira15 && cam.fov < 60; $('mira15').hidden = !m15; if (m15) luneta = true; $('mira').style.display = !eu.vivo || luneta ? 'none' : ''; $('mira').classList.toggle('ads', !!eu.mira);
    var abertura = 8 + (Math.hypot(velX, velZ) > 0.5 ? a.dispAnda * 300 : 0) + eu.disp * 400 + (eu.noChao ? 0 : 14); $('mira').style.setProperty('--a', Math.min(40, abertura) + 'px');
    S.ouvinte(eu.x, olhoY, eu.z, -sx, -cx);
    // arma na mão: balanço, mira, recuo, recarga, troca
    if (mao) {
      var u = mao.userData; u.chute = Math.max(0, (u.chute || 0) - dt * 9); u.troca = Math.max(0, (u.troca || 0) - dt); u.facada = Math.max(0, (u.facada || 0) - dt);
      var bob = andando ? Math.sin(t * 11) * 0.012 : Math.sin(t * 1.6) * 0.003, bobX = andando ? Math.cos(t * 5.5) * 0.012 : 0;
      var mirando = eu.mira && !luneta, base = mirando ? new THREE.Vector3(0, -(armaMao.userData.mira.y) * 0.55 + (armaMao.userData.longe ? 0.008 : -0.014), armaMao.userData.longe ? -0.24 : -0.3) : new THREE.Vector3(0.14, -0.15, -0.3);
      var recarga = performance.now() < eu.recarregandoAte ? Math.sin(Math.min(1, (eu.recarregandoAte - performance.now()) / (a.recarga * 1000)) * Math.PI) : 0;
      u.pos = u.pos || base.clone(); u.pos.lerp(base, Math.min(1, dt * 16));
      mao.position.set(u.pos.x + bobX * (mirando ? 0.2 : 0.6), u.pos.y + bob * (mirando ? 0.2 : 0.6) - recarga * 0.07 - u.troca * 0.3, u.pos.z + u.chute * 0.035);
      mao.rotation.set(u.chute * 0.12 + recarga * 0.6 - u.facada * 1.2, recarga * 0.3 + u.facada * 0.8, recarga * 0.4);
      // recarga: a mão esquerda desce até o pente, puxa e coloca de volta
      if (u.esq && armaMao.userData.pente) { var pp = armaMao.userData.pente, alvoE = new THREE.Vector3(pp.position.x - 0.02, pp.position.y - 0.06, pp.position.z + 0.06).add(armaMao.position);
        u.esq.position.copy(u.esq0).lerp(alvoE, Math.min(1, recarga * 1.4)); u.esq.rotation.set(u.esqR0.x + recarga * 0.9, u.esqR0.y, u.esqR0.z); }
      mao.visible = eu.vivo && !luneta;
      if (armaMao.userData.pente) armaMao.userData.pente.position.y = (armaMao.userData.pente.userData.y0 == null ? (armaMao.userData.pente.userData.y0 = armaMao.userData.pente.position.y) : armaMao.userData.pente.userData.y0) - recarga * 0.15;
    }
    claraoT -= dt; spriteClarao.visible = claraoT > 0 && !luneta;
    capsulas = capsulas.filter(function (c) {
      c.t += dt; c.v.y -= 5.5 * dt; c.m.position.addScaledVector(c.v, dt); c.m.rotation.x += dt * 20; c.m.rotation.z += dt * 13;
      if (c.m.position.y < 0.025) { c.m.position.y = 0.025; c.v.y = Math.abs(c.v.y) * 0.28; c.v.x *= 0.72; c.v.z *= 0.72; }
      if (c.t > 1.5) { cena.remove(c.m); return false; } return true;
    });
    // outros jogadores
    Object.keys(jogs).forEach(function (k) {
      var o = jogs[k]; if (!o.m) return; var kk = Math.min(1, dt * 12);
      var ax = o.x, az = o.z; o.x += (o.tx - o.x) * kk; o.y += (o.ty - o.y) * kk; o.z += (o.tz - o.z) * kk;
      var dy = (o.tyaw || 0) - o.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; o.yaw += dy * kk;
      o.m.position.set(o.x, o.y, o.z); o.m.rotation.y = o.yaw;
      if (o.caindo != null) { o.caindo = Math.min(1, o.caindo + dt * 3); o.m.rotation.x = -o.caindo * Math.PI / 2; o.m.position.y = o.y + 0.2 * o.caindo; o.m.visible = true; }
      else { o.m.rotation.x = 0; o.m.visible = o.vivo; }
      AR.animarSoldado(o.m, Math.hypot(o.x - ax, o.z - az) / Math.max(dt, 0.001), o.ag, o.pitch || 0, dt);
      // inimigo na mira mostra o nome; e aparece no minimapa por um tempo
      if (o.etq && !(partida.modo !== 'todos' && o.time === eu.time)) o.etq.visible = false;
      if (o.vivo && o.time !== eu.time || partida.modo === 'todos') { o.visto = o.vivo && (o.vistoAte || 0) > agora; }
      if (o.vivo) { o.passoT = (o.passoT || 0) - dt; if (Math.hypot(o.x - ax, o.z - az) / Math.max(dt, 0.001) > 3 && o.passoT <= 0) { o.passoT = 0.38; S.passo({ x: o.x, y: o.y, z: o.z }, 0.25); } }
    });
    // nome do inimigo no centro da mira
    if (eu.vivo) {
      var d = G.dirDe(eu.yaw, eu.pitch), o0 = { x: eu.x, y: olhoY, z: eu.z }, parede = G.raioMapa(mapaAtual, o0, d, 80);
      Object.keys(jogs).forEach(function (k) { var o = jogs[k]; if (!o.m || !o.vivo) return; var hb = G.hitbox({ x: o.x, y: o.y, z: o.z, agachado: o.ag }), tt = G.raioCaixa(o0, d, hb.corpo); if (tt >= 0 && tt < parede) { if (o.etq) o.etq.visible = true; o.vistoAte = agora + 3000; } });
      // ajuda de mira
      var MM = MODOS_MIRA[ctrl.mira], naMira = false, melhor = null, melhorAng = MM.cone;
      Object.keys(jogs).forEach(function (k) {
        var o = jogs[k]; if (!o.m || !o.vivo || k == meuId || (partida.modo !== 'todos' && o.time === eu.time)) return;
        var hb = G.hitbox({ x: o.x, y: o.y, z: o.z, agachado: o.ag }), tt = G.raioCaixa(o0, d, hb.corpo), tc = G.raioEsfera(o0, d, hb.cabeca, hb.rCab);
        if ((tt >= 0 && tt < parede) || (tc >= 0 && tc < parede)) naMira = true;
        if (!MM.cone) return;
        var alvo = { x: o.x, y: o.y + (o.ag ? 0.95 : 1.3), z: o.z }, dx = alvo.x - o0.x, dy = alvo.y - o0.y, dz = alvo.z - o0.z, dist = Math.hypot(dx, dy, dz);
        if (dist > 55 || dist < 0.5) return;
        var dirA = { x: dx / dist, y: dy / dist, z: dz / dist }, ang = Math.acos(Math.max(-1, Math.min(1, dirA.x * d.x + dirA.y * d.y + dirA.z * d.z)));
        var cone = MM.cone * Math.min(1.6, 1 + 4 / dist); // perto o cone é maior
        if (ang < cone && ang < melhorAng + (cone - MM.cone) && G.raioMapa(mapaAtual, o0, dirA, dist) >= dist - 0.3) { melhorAng = ang; melhor = { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) }; }
      });
      freioMira = melhor || naMira ? MM.freio : 1;
      if (melhor && MM.puxa) {
        var dyaw = melhor.yaw - eu.yaw; dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
        var f = Math.min(1, dt * MM.puxa * (eu.mira ? 1.3 : 1));
        eu.yaw += dyaw * f; eu.pitch = Math.max(-1.45, Math.min(1.45, eu.pitch + (melhor.pitch - eu.pitch) * f));
      }
      var at = A[eu.arma];
      if (MM.auto && naMira && at.tipo !== 'granada' && at.tipo !== 'faca') { alvoAuto = true; tiroLiberado = true; tentarAtirar(); }
      else if (alvoAuto) { alvoAuto = null; }
    }
    // efeitos
    efeitos = efeitos.filter(function (e) {
      e.t += dt; if (e.v) { if (e.grav) e.v.y -= 9 * dt; e.m.position.addScaledVector(e.v, dt); }
      if (e.bola) { e.m.scale.setScalar(1 + e.t * 9); e.m.material.opacity = Math.max(0, 0.9 - e.t * 2); }
      if (e.linha) e.m.material.opacity = Math.max(0, 0.7 - e.t * 12);
      if (e.nevoa) { e.m.scale.setScalar(e.s0 * (1 + e.t * 5)); e.m.material.opacity = Math.max(0, 1 - e.t / e.vida); }
      if (e.t > e.vida) { cena.remove(e.m); if (e.bola || e.linha) { e.m.geometry.dispose(); e.m.material.dispose(); } return false; } return true;
    });
    Object.keys(granadas).forEach(function (k) { var g = granadas[k]; g.v.y -= R.GRAV * dt; g.m.position.addScaledVector(g.v, dt); if (g.m.position.y < 0.06) { g.m.position.y = 0.06; g.v.y *= -0.4; g.v.x *= 0.7; g.v.z *= 0.7; } });
    // HUD
    var bombaP = rodada && rodada.bomba && rodada.bomba.estado === 'plantada';
    var resta = Math.max(0, (bombaP ? rodada.bomba.explodeEm : rodada ? rodada.fim : partida.fim) - Date.now()), mm = Math.floor(resta / 60000), ss = Math.floor(resta / 1000) % 60; $('pTempo').textContent = (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
    $('pTempo').classList.toggle('bomba', !!bombaP);
    if (rodada) { $('hRodada').textContent = 'RODADA ' + rodada.n + (partida.modo === 'bomba' && rodada.portador === meuId ? ' · 💣 VOCÊ ESTÁ COM A BOMBA' : ''); passoBomba(dt, agora); }
    passoDrops(agora);
    if (agora - mostrado > 120) { mostrado = agora; minimapa(); if (!$('tabela').hidden) tabela(); }
    // envia posição
    envioT -= dt; if (envioT <= 0 && eu.vivo) { envioT = 1 / R.ENVIO; mandar({ t: 'pos', x: +eu.x.toFixed(2), y: +eu.y.toFixed(2), z: +eu.z.toFixed(2), yaw: +eu.yaw.toFixed(3), pitch: +eu.pitch.toFixed(3), ag: eu.agachado ? 1 : 0 }); }
    // desenha: mundo e depois a arma por cima
    sol(); renderer.clear(); renderer.render(cena, cam); renderer.clearDepth(); camMao.fov = eu.mira ? 50 : 60; camMao.updateProjectionMatrix(); renderer.render(cenaMao, camMao);
  }
  function sol() { if (mundoAtual && mundoAtual.sol) { /* sombra cobre o mapa todo */ } }
  AR.carregarExtras(function (id) { if (estado === 'jogo' && eu.arma === id) trocarArma(id, true); if (!$('loja').hidden && id === lojaSel) mostrarArmaLoja(); });
  AR.carregarPersonagem(function () {
    Object.keys(jogs).forEach(function (k) { trocarModelo(jogs[k]); });
    if (partidaPendente) { var pend = partidaPendente; partidaPendente = null; iniciarPartida(pend); }
  });
  function trocarModelo(o) {
    if (!o || !o.m) return;
    var antigo = o.m, novo = AR.soldado(partida && partida.modo === 'todos' ? null : o.time, o.id, o.skin);
    novo.position.copy(antigo.position); novo.rotation.copy(antigo.rotation); novo.visible = antigo.visible;
    AR.armaSoldado(novo, o.arma); AR.coleteSoldado(novo, o.colete); if (o.etq) novo.add(o.etq); cena.remove(antigo); cena.add(novo); o.m = novo;
  }
  requestAnimationFrame(quadro);
  window.__az = { eu: eu, jogs: jogs, mandar: mandar, receber: receber, estado: function () { return estado; } };
})();
