/* ALVO ZERO — regras, armas, mapas e física (iguais no servidor e no navegador). */
(function (raiz, fab) { if (typeof module === 'object' && module.exports) module.exports = fab(); else raiz.REGRAS = fab(); })(this, function () {
  'use strict';
  var NOME = 'ALVO ZERO';
  var R = {
    MAX_SALA: 16, TICK: 30, ENVIO: 20,
    VEL: 5.6, VEL_AGACHADO: 2.6, VEL_MIRA: 3.4, PULO: 6.8, GRAV: 18,
    RAIO: 0.35, ALTURA: 1.75, ALTURA_AGACHADO: 1.2, OLHO: 1.6, OLHO_AGACHADO: 1.12, DEGRAU: 0.5,
    VIDA: 100, RENASCER: 3, PROTECAO: 2
  };
  // armas (nomes próprios do jogo)
  var ARMAS = {
    ar9:    { nome: 'AUG A3', tipo: 'fuzil',     slot: 1, dano: 30, cabeca: 2.6, cadencia: 0.1,  pente: 30, reserva: 120, recarga: 2.1, alcance: 120, disp: 0.012, dispAnda: 0.035, recuo: 0.018, auto: true,  zoom: 2, holo: true },
    b3:     { nome: 'B-3 Touro',     tipo: 'fuzil',     slot: 1, dano: 29, cabeca: 2.6, cadencia: 0.095, pente: 30, reserva: 120, recarga: 2.4, alcance: 120, disp: 0.011, dispAnda: 0.034, recuo: 0.016, auto: true,  zoom: 1.5, mira15: true },
    vx45:   { nome: 'VX-45 Vespa',   tipo: 'smg',       slot: 1, dano: 21, cabeca: 2.2, cadencia: 0.068, pente: 35, reserva: 140, recarga: 1.8, alcance: 70,  disp: 0.02,  dispAnda: 0.03,  recuo: 0.012, auto: true,  zoom: 1.2 },
    l7:     { nome: 'L-7 Longa',     tipo: 'sniper',    slot: 1, dano: 105, cabeca: 2,  cadencia: 1.25, pente: 5,  reserva: 25,  recarga: 2.8, alcance: 250, disp: 0.12,  dispAnda: 0.2,   recuo: 0.07,  auto: false, zoom: 4, luneta: true, dispMira: 0.0005 },
    t12:    { nome: 'T-12 Trovão',   tipo: 'escopeta',  slot: 1, dano: 15, cabeca: 1.6, cadencia: 0.85, pente: 7,  reserva: 28,  recarga: 2.6, alcance: 30,  disp: 0.07,  dispAnda: 0.09,  recuo: 0.06,  auto: false, zoom: 1.15, chumbos: 9 },
    vb:     { nome: 'Vermilion Bird', tipo: 'sniper', slot: 1, dano: 125, cabeca: 2.2, cadencia: 1.05, pente: 7, reserva: 35, recarga: 2.5, alcance: 280, disp: 0.11, dispAnda: 0.18, recuo: 0.06, auto: false, zoom: 5, luneta: true, dispMira: 0.0003, preco: 20000, raridade: 'LENDÁRIA', desc: 'Sniper lendária com asas de fênix. Um tiro no peito derruba; na cabeça, nem se fala.' },
    arara:  { nome: 'Arara SR', tipo: 'sniper', slot: 1, dano: 115, cabeca: 2.2, cadencia: 1.1, pente: 6, reserva: 30, recarga: 2.6, alcance: 260, disp: 0.11, dispAnda: 0.18, recuo: 0.065, auto: false, zoom: 5, luneta: true, dispMira: 0.0004, preco: 15000, raridade: 'ÉPICA', desc: 'Sniper de ferrolho nas cores da arara: branca, vermelha, amarela e azul. Luneta 5x.' },
    p9:     { nome: 'P-9 Cobra',     tipo: 'pistola',   slot: 2, dano: 25, cabeca: 2.4, cadencia: 0.17, pente: 12, reserva: 48,  recarga: 1.4, alcance: 60,  disp: 0.014, dispAnda: 0.03,  recuo: 0.025, auto: false, zoom: 1.2 },
    faca:   { nome: 'Faca Tática',   tipo: 'faca',      slot: 3, dano: 55, cabeca: 1.5, cadencia: 0.5,  pente: 0,  reserva: 0,   recarga: 0,   alcance: 2,   disp: 0, dispAnda: 0, recuo: 0, auto: false, zoom: 1 },
    gr:     { nome: 'Granada HE',    tipo: 'granada',   slot: 4, dano: 110, cabeca: 1,  cadencia: 1,    pente: 1,  reserva: 0,   recarga: 0,   alcance: 0,   disp: 0, dispAnda: 0, recuo: 0, auto: false, zoom: 1, raio: 6, pavio: 2.2 }
  };
  var PRIMARIAS = ['ar9', 'vx45', 't12', 'b3', 'l7', 'arara', 'vb'];
  // loja: armas à venda (preço em moedas; 0 = já vem com a conta)
  // coletes: reduzem o dano no corpo (headshot continua dano cheio)
  var COLETES = {
    colete1: { nome: 'Colete Leve', categoria: 'colete', tipo: 'colete', protecao: 0.15, preco: 3000, raridade: 'COMUM', desc: 'Colete de tecido balístico, leve e discreto. Reduz 15% do dano no corpo.' },
    colete2: { nome: 'Colete Tático', categoria: 'colete', tipo: 'colete', protecao: 0.25, preco: 8000, raridade: 'RARA', desc: 'Porta-placas com placas de cerâmica. Reduz 25% do dano no corpo.' },
    colete3: { nome: 'Colete Premium', categoria: 'colete', tipo: 'colete', protecao: 0.35, preco: 15000, raridade: 'ÉPICA', desc: 'Blindagem pesada com ombreiras. Reduz 35% do dano no corpo.' }
  };
  // personagens à venda (aparecem para todos, nos dois times)
  var SKINS = {
    scifi: { nome: 'Guerreira Sci-Fi', categoria: 'personagem', tipo: 'personagem', preco: 12000, raridade: 'ÉPICA', desc: 'Soldada do futuro com máscara tática e equipamento leve. Todo mundo vê você com ela na partida, nos dois times.' }
  };
  function item(id) { return ARMAS[id] || COLETES[id] || SKINS[id] || null; }
  var LOJA = ['ar9', 'vx45', 't12', 'b3', 'l7', 'arara', 'vb', 'colete1', 'colete2', 'colete3', 'scifi'];
  ARMAS.vx45.preco = 4000; ARMAS.vx45.raridade = 'COMUM'; ARMAS.vx45.desc = 'Submetralhadora leve e rápida. Ótima de perto, cai o dano de longe.';
  ARMAS.t12.preco = 6000; ARMAS.t12.raridade = 'COMUM'; ARMAS.t12.desc = 'Escopeta de 9 chumbos. Um tiro de perto resolve.';
  ARMAS.b3.preco = 9000; ARMAS.b3.raridade = 'RARA'; ARMAS.b3.desc = 'Fuzil com mira 1.5x. Um pouco mais preciso que o AUG.';
  ARMAS.l7.preco = 10000; ARMAS.l7.raridade = 'RARA'; ARMAS.l7.desc = 'Sniper de ferrolho com luneta. No modo Só Sniper ela é de graça.';
  ARMAS.ar9.preco = 0; ARMAS.ar9.raridade = 'PADRÃO'; ARMAS.ar9.desc = 'Fuzil bullpup confiável. Rajada rápida e controle fácil.';
  // moedas ganhas no fim da partida
  function moedasPartida(kills, hs, venceu) { return 30 + kills * 6 + hs * 4 + (venceu ? 60 : 0); }
  var MODOS = { time: 'Mata-mata em equipe', todos: 'Todos contra todos', bomba: 'Missão Bomba', elim: 'Eliminação', sniper: 'Só Sniper', faca: 'Só Faca' };
  // modos por rodada (sem renascer): quem ganhar RODADAS rodadas vence
  var RODADA = { bomba: { vencer: 5, tempo: 120 }, elim: { vencer: 5, tempo: 100 } };
  var BOMBA = { plantar: 3, desarmar: 5, explode: 35, raioLocal: 2.6, raioDesarmar: 1.6, raioExplosao: 9 };
  function porRodada(modo) { return !!RODADA[modo]; }
  function contaKills(modo) { return modo === 'time' || modo === 'sniper' || modo === 'faca'; } // placar = kills do time
  /* ---------- patentes no estilo Point Blank: 55 níveis, cada um com sua insígnia ---------- */
  // [nome, quantos níveis (I, II, III...), tipo da insígnia]
  var GRUPOS = [
    ['Novato', 1, 'novato'], ['Recruta', 1, 'recruta'], ['Soldado', 3, 'v1'], ['Cabo', 3, 'v2'],
    ['3º Sargento', 3, 'v3'], ['2º Sargento', 3, 'v4'], ['1º Sargento', 4, 'v5'], ['Subtenente', 4, 'losango'],
    ['2º Tenente', 4, 'b1'], ['1º Tenente', 4, 'b2'], ['Capitão', 5, 'b3'], ['Major', 5, 'folha'],
    ['Tenente-Coronel', 5, 'folha2'], ['Coronel', 5, 'aguia'],
    ['General de Brigada', 1, 'e1'], ['General de Divisão', 1, 'e2'], ['General de Exército', 1, 'e3'], ['Marechal', 1, 'e4'], ['Herói de Guerra', 1, 'heroi']
  ];
  var ROMANO = ['', 'I', 'II', 'III', 'IV', 'V'];
  var PATENTES = [], PAT_INFO = [];
  GRUPOS.forEach(function (g) { for (var i = 1; i <= g[1]; i++) { PATENTES.push(g[1] > 1 ? g[0] + ' ' + ROMANO[i] : g[0]); PAT_INFO.push({ tipo: g[2], nivel: g[1] > 1 ? i : 0 }); } });
  function xpPara(n) { return n <= 0 ? 0 : Math.round(40 * Math.pow(n, 1.9) / 10) * 10; }
  function patente(xp) { xp = xp || 0; var n = 0; while (n < PATENTES.length - 1 && xp >= xpPara(n + 1)) n++; return { n: n, nome: PATENTES[n], prox: xpPara(Math.min(PATENTES.length - 1, n + 1)), base: xpPara(n), max: n === PATENTES.length - 1 }; }
  // insígnia em SVG (escudo + símbolo); funciona no navegador e no servidor
  function insignia(n) {
    n = Math.max(0, Math.min(PATENTES.length - 1, n | 0)); var p = PAT_INFO[n], t = p.tipo, d = '';
    var fundo = t === 'novato' || t === 'recruta' ? ['#7d8790', '#3c434a'] : t[0] === 'v' || t === 'losango' ? ['#4f6b3a', '#24331a'] : t[0] === 'b' || t.indexOf('folha') === 0 || t === 'aguia' ? ['#2f5f9e', '#14284a'] : t === 'heroi' ? ['#2a2a2a', '#000'] : ['#a3241c', '#4a0b07'];
    var ouro = '#ffd257', prata = '#e9eef2', cor = t.indexOf('folha2') === 0 || t === 'b1' || t === 'b2' ? prata : ouro;
    function chev(y) { return '<path d="M6 ' + (y + 3) + 'L12 ' + y + 'L18 ' + (y + 3) + '" stroke="' + ouro + '" stroke-width="2.2" fill="none" stroke-linejoin="round"/>'; }
    function estrela(x, y, r) { var pts = []; for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; pts.push((x + Math.cos(a) * rr).toFixed(2) + ',' + (y + Math.sin(a) * rr).toFixed(2)); } return '<polygon points="' + pts.join(' ') + '" fill="' + ouro + '"/>'; }
    if (t === 'novato') d = '<circle cx="12" cy="11" r="2.4" fill="' + prata + '"/>';
    else if (t === 'recruta') d = '<path d="M7 12L12 9L17 12" stroke="' + prata + '" stroke-width="2" fill="none"/>';
    else if (t[0] === 'v') { var k = +t[1], q = Math.min(k, 3); for (var i = 0; i < q; i++) d += chev(5.5 + i * 3.4); if (k > 3) { d += '<path d="M6.5 ' + (16.3) + 'Q12 19 17.5 16.3" stroke="' + ouro + '" stroke-width="1.8" fill="none"/>'; } if (k > 4) d += '<path d="M7.5 18.6Q12 21 16.5 18.6" stroke="' + ouro + '" stroke-width="1.6" fill="none"/>'; }
    else if (t === 'losango') d = '<path d="M12 5L16.5 11L12 17L7.5 11Z" fill="' + ouro + '"/><path d="M12 8L14 11L12 14L10 11Z" fill="#24331a"/>';
    else if (t[0] === 'b') { var nb = +t[1], w = 3, gap = 1.6, tot = nb * w + (nb - 1) * gap; for (var j = 0; j < nb; j++) d += '<rect x="' + (12 - tot / 2 + j * (w + gap)).toFixed(2) + '" y="6" width="' + w + '" height="10" rx="0.6" fill="' + cor + '"/>'; }
    else if (t.indexOf('folha') === 0) d = '<path d="M12 4.5C16 7 17 11 12 17C7 11 8 7 12 4.5Z" fill="' + cor + '"/><path d="M12 6V18" stroke="rgba(0,0,0,.35)" stroke-width="0.8"/>';
    else if (t === 'aguia') d = '<path d="M3.5 8.5C6 9 8.5 10 12 12.5C15.5 10 18 9 20.5 8.5C19 11.5 16.5 13.5 13.5 14L12 17L10.5 14C7.5 13.5 5 11.5 3.5 8.5Z" fill="' + prata + '"/><circle cx="12" cy="10" r="1.6" fill="' + prata + '"/>';
    else if (t[0] === 'e') { var ne = +t[1], r = ne > 2 ? 2.4 : 2.9, esp = ne > 2 ? 5 : 6; for (var m = 0; m < ne; m++) d += estrela(12 - (ne - 1) * esp / 2 + m * esp, 11, r); }
    else if (t === 'heroi') d = estrela(12, 10.5, 5) + '<path d="M5 13Q6 19 12 20M19 13Q18 19 12 20" stroke="' + ouro + '" stroke-width="1.3" fill="none"/>';
    var pips = ''; for (var z = 0; z < p.nivel; z++) pips += '<circle cx="' + (12 - (p.nivel - 1) * 1.6 + z * 3.2).toFixed(2) + '" cy="19.6" r="0.95" fill="' + ouro + '"/>';
    return '<svg viewBox="0 0 24 24" class="ins"><defs><linearGradient id="gi' + n + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + fundo[0] + '"/><stop offset="1" stop-color="' + fundo[1] + '"/></linearGradient></defs>' +
      '<path d="M12 1.2L21.5 4.8V11.6C21.5 17 17.4 21.2 12 22.9C6.6 21.2 2.5 17 2.5 11.6V4.8Z" fill="url(#gi' + n + ')" stroke="' + (t === 'heroi' ? ouro : 'rgba(255,255,255,.55)') + '" stroke-width="0.9"/>' + d + pips + '</svg>';
  }

  /* ---------- mapas: caixas [x, y(base), z, largura, altura, profundidade, material] ---------- */
  function espelhar(lista) { var o = []; lista.forEach(function (b) { o.push(b); if (b[0] !== 0) o.push([-b[0], b[1], b[2], b[3], b[4], b[5], b[6]]); }); return o; }
  // Mapa 1: Estação Concreto — prédio de concreto com pilares, claraboias, mezanino e escadas
  // ============ BIBLIOTECA (único mapa) ============
  // Planta: bases nas pontas (andar de cima) → passagem → corredores laterais no alto com corrimão olhando o salão.
  // Uma ponte atravessa o meio do salão (sobre pilares). Escadaria de tapete vermelho ao norte e escadas de tapete azul
  // nas laterais descem para o salão rebaixado, cheio de estantes. Teto de vidro com vigas de madeira.
  function biblioteca() {
    var W = 29, D = 16, H = 10, N = 3.6, HX = 13, HZ = 13, cx = [];
    cx.push([0, -1, 0, W * 2, 1, D * 2, 'ladrilho']);
    cx.push([0, 0, -D - 0.5, W * 2 + 2, H, 1, 'reboco'], [0, 0, D + 0.5, W * 2 + 2, H, 1, 'reboco'], [-W - 0.5, 0, 0, 1, H, D * 2, 'reboco'], [W + 0.5, 0, 0, 1, H, D * 2, 'reboco']);
    cx.push([0, H, 0, W * 2 + 2, 0.6, D * 2 + 2, 'teto']);
    // andar de cima maciço: faixas norte e sul (a lateral delas vira parede do salão)
    cx.push([0, 0, -(HZ + D) / 2, 32, N, D - HZ, 'reboco'], [0, 0, (HZ + D) / 2, 32, N, D - HZ, 'reboco']);
    // ponte no meio do salão, com corrimão dos dois lados, sobre dois pilares
    cx.push([0, N - 0.4, 0, HX * 2, 0.4, 3, 'madeirab'], [0, N, -1.55, HX * 2, 1, 0.12, 'corrimao'], [0, N, 1.55, HX * 2, 1, 0.12, 'corrimao']);
    // escadaria grande (tapete vermelho) do salão até o balcão norte
    for (var k = 0; k < 8; k++) cx.push([0, 0, -8.5 - k * 0.6, 4, 0.45 * (k + 1), 0.6, 'degrau']);
    // balcões norte e sul: corrimão na beira do salão
    cx.push([-7.5, N, -HZ - 0.05, 11, 1, 0.12, 'corrimao'], [7.5, N, -HZ - 0.05, 11, 1, 0.12, 'corrimao'], [0, N, HZ + 0.05, HX * 2, 1, 0.12, 'corrimao']);
    // salão (centro)
    cx.push([0, 0, 5.2, 1.6, 0.8, 2.6, 'mesa'], [0, 0, -5.4, 2.6, 1.2, 0.7, 'estante']);
    var lado = [
      // corredor lateral (no alto) e passagem para a base
      [-(HX + 16) / 2, 0, 0, 16 - HX, N, HZ * 2, 'reboco'], [-17.5, 0, 0, 3, N, 6, 'reboco'], [-24, 0, 0, 10, N, 14, 'reboco'],
      // "fora do mapa": paredes cheias de livros em volta dos corredores e da base
      [-17.5, 0, -9.5, 3, H, 13, 'estante'], [-17.5, 0, 9.5, 3, H, 13, 'estante'], [-24, 0, -11.5, 10, H, 9, 'reboco'], [-24, 0, 11.5, 10, H, 9, 'reboco'],
      // corrimão do corredor lateral (vãos na ponte e na escada azul)
      [-HX - 0.05, N, -7.25, 0.12, 1, 11.5, 'corrimao'], [-HX - 0.05, N, 4, 0.12, 1, 5, 'corrimao'], [-HX - 0.05, N, 11.25, 0.12, 1, 3.5, 'corrimao'],
      // pilares da ponte
      [-4.5, 0, 0, 1, N - 0.4, 1.6, 'coluna'],
      // escada lateral (tapete azul): sobe do salão até o corredor
      // salão norte: estantes altas e baixas, mesas de leitura
      [-8, 0, -9.2, 3.2, 2.2, 0.7, 'estante'], [-8, 0, -5.6, 3.2, 1.2, 0.7, 'estante'], [-4.6, 0, -7.4, 0.7, 2.2, 2.4, 'estante'], [-10.8, 0, -3.6, 1.4, 0.8, 2.6, 'mesa'],
      [-8, 0, -12.7, 6, 2.6, 0.5, 'estante'], [-12.7, 0, -8.5, 0.5, 2.6, 7, 'estante'],
      // salão sul: fileiras de estantes no sentido do comprimento
      [-2.6, 0, 9.4, 0.7, 2.2, 3.6, 'estante'], [-6.4, 0, 10.6, 0.7, 2.2, 3.6, 'estante'], [-4.5, 0, 4.4, 2.4, 1.2, 0.7, 'estante'], [-10, 0, 3.4, 1.4, 0.8, 2.4, 'mesa'],
      [-8, 0, 12.7, 5, 2.6, 0.5, 'estante'],
      // cobertura no corredor de cima e na base
      [-15.45, N, -9.5, 0.5, 1.3, 2.2, 'estante'], [-15.45, N, 11.8, 0.5, 1.3, 2, 'estante'], [-21, N, -4.5, 1.4, 1.4, 1.4, 'lona'], [-21, N, 4.5, 1.4, 1.4, 1.4, 'lona'], [-27.6, N, 0, 0.6, 2.4, 4, 'estante'],
      [-10, N, -14.6, 1.4, 0.8, 2.2, 'mesa'], [-10, N, 14.6, 1.4, 0.8, 2.2, 'mesa']
    ];
    for (var i = 0; i < 8; i++) lado.push([-8.5 - i * 0.6, 0, 8, 0.6, 0.45 * (i + 1), 3, 'degrauazul']);
    cx = cx.concat(espelhar(lado));
    var nasc = { r: [[-26, -5], [-26, -2.5], [-26, 0], [-26, 2.5], [-26, 5], [-23.5, -3], [-23.5, 3], [-23.5, 0]], b: [] };
    nasc.b = nasc.r.map(function (p) { return [-p[0], p[1]]; });
    return { id: 'biblioteca', nome: 'Biblioteca', caixas: cx.filter(function (b) { return b[3] > 0.02; }), nasc: nasc, lim: [W, D], ceu: false, luz: 0xffe6c4, nevoa: 0x8a7a66, fundo: 0x6e6152, claraboia: true, chao: N,
      locais: { A: [6, -10.5], B: [9, 11] } };
  }
  // ============ LUXVILLE ============
  // Palácio-museu lilás e dourado: salão central rebaixado com escadarias de tapete que se cruzam, corredor em volta
  // no alto com balaustrada branca, galerias com claraboias e painéis roxos com medalhão, estantes brancas e vitrines.
  function luxville() {
    var W = 28, D = 20, H = 9.5, N = 3.6, P = 5.6, cx = [];
    var HX = 11, HZ = 8, IX = 15, IZ = 12;
    cx.push([0, -1, 0, W * 2, 1, D * 2, 'marmore']);
    cx.push([0, 0, -D - 0.5, W * 2 + 2, H, 1, 'painel'], [0, 0, D + 0.5, W * 2 + 2, H, 1, 'painel'], [-W - 0.5, 0, 0, 1, H, D * 2, 'painel'], [W + 0.5, 0, 0, 1, H, D * 2, 'painel']);
    cx.push([0, H, 0, W * 2 + 2, 0.6, D * 2 + 2, 'teto']);
    cx.push([0, 0, -(HZ + D) / 2, W * 2, N, D - HZ, 'base_lux'], [0, 0, (HZ + D) / 2, W * 2, N, D - HZ, 'base_lux']);
    var lado = [
      [-(HX + W) / 2, 0, 0, W - HX, N, HZ * 2, 'base_lux'],
      [-IX, N, -7.5, 0.5, P, 9, 'painel'], [-IX, N, 7.5, 0.5, P, 9, 'painel'],
      [-11, N, -IZ, 8, P, 0.5, 'painel'], [-11, N, IZ, 8, P, 0.5, 'painel'], [-2.5, N, -IZ, 5, P, 0.5, 'painel'], [-2.5, N, IZ, 5, P, 0.5, 'painel'],
      [-HX - 0.1, N, -5.25, 0.2, 1, 5.5, 'balaustre'], [-HX - 0.1, N, 5.25, 0.2, 1, 5.5, 'balaustre'],
      [-9.25, N, -HZ - 0.1, 3.5, 1, 0.2, 'balaustre'], [-2.5, N, -HZ - 0.1, 5, 1, 0.2, 'balaustre'], [-9.25, N, HZ + 0.1, 3.5, 1, 0.2, 'balaustre'], [-2.5, N, HZ + 0.1, 5, 1, 0.2, 'balaustre'],
      [-21, N, -D + 0.25, 1.6, P, 0.5, 'painelroxo'], [-17, N, -D + 0.25, 1.6, P, 0.5, 'painelroxo'], [-9, N, -D + 0.25, 1.6, P, 0.5, 'painelroxo'], [-5, N, -D + 0.25, 1.6, P, 0.5, 'painelroxo'], [-13, N, -D + 0.25, 1.6, P, 0.5, 'painelroxo'], [-1, N, -D + 0.25, 1.6, P, 0.5, 'painelroxo'],
      [-12, N, -16, 0.9, 1.1, 1.6, 'vitrine'], [-5, N, -14.5, 1.6, 1.1, 0.9, 'vitrine'], [-19, N, -17.5, 0.7, 1.9, 2.4, 'estantebranca'],
      [-12, N, 16, 0.9, 1.1, 1.6, 'vitrine'], [-5, N, 14.5, 1.6, 1.1, 0.9, 'vitrine'], [-19, N, 17.5, 0.7, 1.9, 2.4, 'estantebranca'], [-8.5, N, 18.6, 2.6, 1.9, 0.6, 'estantebranca'],
      [-21.5, N, -6.5, 0.5, P, 7, 'painel'], [-21.5, N, 6.5, 0.5, P, 7, 'painel'], [-18.2, N, -3, 1.4, 1.4, 1.4, 'lona'], [-18.2, N, 3, 1.4, 1.4, 1.4, 'lona'],
      [-13, N, -10, 0.7, 1.2, 2.2, 'estantebranca'], [-13, N, 10, 0.7, 1.2, 2.2, 'estantebranca'],
      [-8.5, 0, -5.2, 1.4, 1.4, 1.4, 'lona'], [-8.5, 1.4, -5.2, 1.1, 1.1, 1.1, 'lona'], [-7, 0, 5.4, 2.8, 1.4, 1.4, 'lona'], [-3.2, 0, -1.2, 0.7, 1.9, 2.4, 'estantebranca'], [-9.5, 0, 1.6, 0.9, 1.1, 1.6, 'vitrine']
    ];
    for (var i = 0; i < 8; i++) lado.push([-6.5 - i * 0.6 - 0.3 - 0.3, 0, 0, 0.6, 0.45 * (i + 1), 3, 'degraulux']);
    cx = cx.concat(espelhar(lado));
    for (var k = 0; k < 8; k++) cx.push([-6, 0, -3.5 - k * 0.6 - 0.3 + 0.3 - 0.1 - 0.3 + 0.1, 3, 0.45 * (k + 1), 0.6, 'degraulux'], [6, 0, 3.5 + k * 0.6, 3, 0.45 * (k + 1), 0.6, 'degraulux']);
    cx.push([0, 0, 0, 1.4, 1.4, 1.4, 'lona'], [2.5, 0, -5, 0.7, 1.9, 2.4, 'estantebranca']);
    var nasc = { r: [[-25, -7], [-25, -3.5], [-25, 0], [-25, 3.5], [-25, 7], [-24, -15], [-24, 15], [-19, 0]], b: [] };
    nasc.b = nasc.r.map(function (p) { return [-p[0], p[1]]; });
    return { id: 'luxville', nome: 'Luxville', caixas: cx.filter(function (b) { return b[3] > 0.02; }), nasc: nasc, lim: [W, D], ceu: false, luz: 0xfff0e0, nevoa: 0x8a8494, fundo: 0x7e7888, claraboia: true, vigas: 'branca', chao: N,
      locais: { A: [17, -16], B: [7.5, -3] } };
  }
  var MAPAS = { biblioteca: biblioteca(), luxville: luxville() };

  /* ---------- física ---------- */
  function sobrepoe(b, x0, y0, z0, x1, y1, z1) {
    return x1 > b[0] - b[3] / 2 && x0 < b[0] + b[3] / 2 && y1 > b[1] && y0 < b[1] + b[4] && z1 > b[2] - b[5] / 2 && z0 < b[2] + b[5] / 2;
  }
  function colide(mapa, x, y, z, alt) {
    var r = R.RAIO;
    for (var i = 0; i < mapa.caixas.length; i++) if (sobrepoe(mapa.caixas[i], x - r, y + 0.01, z - r, x + r, y + alt, z + r)) return mapa.caixas[i];
    return null;
  }
  // move o jogador com colisão por eixo e subida de degrau. p = {x,y,z,vy,noChao,agachado}
  function mover(mapa, p, dx, dz, dt) {
    var alt = p.agachado ? R.ALTURA_AGACHADO : R.ALTURA;
    [['x', dx], ['z', dz]].forEach(function (e) {
      if (!e[1]) return; var ant = p[e[0]]; p[e[0]] += e[1];
      var b = colide(mapa, p.x, p.y, p.z, alt);
      if (b) {
        var topo = b[1] + b[4];
        if (p.noChao && topo - p.y <= R.DEGRAU && !colide(mapa, p.x, topo, p.z, alt)) p.y = topo; // sobe degrau
        else p[e[0]] = ant;
      }
    });
    p.vy -= R.GRAV * dt; var ny = p.y + p.vy * dt;
    var bate = colide(mapa, p.x, ny, p.z, alt);
    if (bate) {
      if (p.vy <= 0) { p.y = bate[1] + bate[4]; p.noChao = true; } else { p.y = bate[1] - alt - 0.01; }
      p.vy = 0;
    } else { p.y = ny; p.noChao = false; if (p.vy <= 0 && colide(mapa, p.x, ny - 0.05, p.z, alt)) p.noChao = true; }
    if (p.y < -5) { p.y = 0; p.vy = 0; }
    return p;
  }
  // raio contra caixa (slab). Retorna distância ou -1
  function raioCaixa(o, d, b) {
    var mn = [b[0] - b[3] / 2, b[1], b[2] - b[5] / 2], mx = [b[0] + b[3] / 2, b[1] + b[4], b[2] + b[5] / 2], t0 = -1e9, t1 = 1e9, oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
    for (var i = 0; i < 3; i++) {
      if (Math.abs(dd[i]) < 1e-9) { if (oo[i] < mn[i] || oo[i] > mx[i]) return -1; continue; }
      var a = (mn[i] - oo[i]) / dd[i], c = (mx[i] - oo[i]) / dd[i]; if (a > c) { var t = a; a = c; c = t; }
      if (a > t0) t0 = a; if (c < t1) t1 = c; if (t0 > t1 || t1 < 0) return -1;
    }
    return t0 >= 0 ? t0 : t1;
  }
  function raioMapa(mapa, o, d, max) {
    var melhor = max;
    for (var i = 0; i < mapa.caixas.length; i++) { var t = raioCaixa(o, d, mapa.caixas[i]); if (t >= 0 && t < melhor) melhor = t; }
    return melhor;
  }
  function raioEsfera(o, d, c, r) {
    var ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z, b = ox * d.x + oy * d.y + oz * d.z, cc = ox * ox + oy * oy + oz * oz - r * r, h = b * b - cc;
    if (h < 0) return -1; var t = -b - Math.sqrt(h); return t >= 0 ? t : -1;
  }
  // caixas de acerto do jogador: corpo e cabeça
  function hitbox(j) {
    var alt = j.agachado ? R.ALTURA_AGACHADO : R.ALTURA, cab = j.agachado ? 1.05 : 1.55;
    return { corpo: [j.x, j.y, j.z, 0.7, cab - 0.12, 0.7], cabeca: { x: j.x, y: j.y + cab + 0.1, z: j.z }, rCab: 0.22, alt: alt };
  }
  function olho(j) { return j.y + (j.agachado ? R.OLHO_AGACHADO : R.OLHO); }
  function dirDe(yaw, pitch) { var c = Math.cos(pitch); return { x: -Math.sin(yaw) * c, y: Math.sin(pitch), z: -Math.cos(yaw) * c }; }
  // grade de navegação dos bots (no chão, a cada 1 m)
  // altura do chão num ponto (degraus e andares maciços; lajes finas no alto não contam)
  function chaoEm(mapa, x, z) { var h = 0; for (var c = 0; c < mapa.caixas.length; c++) { var b = mapa.caixas[c]; if (b[1] <= 0.05 && b[1] + b[4] <= 4.2 && b[1] + b[4] > h && Math.abs(x - b[0]) < b[3] / 2 && Math.abs(z - b[2]) < b[5] / 2) h = b[1] + b[4]; } return h; }
  function grade(mapa) {
    var W = mapa.lim[0], D = mapa.lim[1], cel = 1, nx = Math.floor(W * 2 / cel), nz = Math.floor(D * 2 / cel), livre = new Uint8Array(nx * nz), alt = new Float32Array(nx * nz);
    for (var i = 0; i < nx; i++) for (var k = 0; k < nz; k++) {
      var x = -W + (i + 0.5) * cel, z = -D + (k + 0.5) * cel, h = 0;
      // chão = topo da caixa que começa no chão e para até 4,2 m (degraus, andar de cima maciço); lajes finas no alto não contam
      for (var c = 0; c < mapa.caixas.length; c++) { var b = mapa.caixas[c]; if (b[1] <= 0.05 && b[1] + b[4] <= 4.2 && b[1] + b[4] > h && Math.abs(x - b[0]) < b[3] / 2 && Math.abs(z - b[2]) < b[5] / 2) h = b[1] + b[4]; }
      alt[i + k * nx] = h; livre[i + k * nx] = colide(mapa, x, h + R.DEGRAU, z, R.ALTURA - R.DEGRAU) ? 0 : 1; // degrau baixo não trava
    }
    return { nx: nx, nz: nz, cel: cel, W: W, D: D, livre: livre, alt: alt };
  }
  return { NOME: NOME, R: R, ARMAS: ARMAS, PRIMARIAS: PRIMARIAS, MODOS: MODOS, RODADA: RODADA, BOMBA: BOMBA, porRodada: porRodada, contaKills: contaKills, MAPAS: MAPAS, PATENTES: PATENTES, LOJA: LOJA, COLETES: COLETES, SKINS: SKINS, item: item, moedasPartida: moedasPartida, patente: patente, insignia: insignia, xpPara: xpPara,
    colide: colide, mover: mover, raioMapa: raioMapa, raioCaixa: raioCaixa, raioEsfera: raioEsfera, hitbox: hitbox, olho: olho, dirDe: dirDe, grade: grade, chaoEm: chaoEm };
});
