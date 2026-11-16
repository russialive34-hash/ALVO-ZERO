/* ALVO ZERO — servidor: lobby, salas, partidas, validação de tiros e bots. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const G = require('../public/shared/regras.js');
const ARM = require('./armazem.js');
const R = G.R, A = G.ARMAS;

const PUB = path.join(__dirname, '..', 'public'), DADOS = process.env.DADOS || path.join(__dirname, '..', 'data');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const GZ = new Map(); // arquivos já comprimidos
const LIBERADOS = new Set(['/index.html', '/style.css', '/jogo.js', '/armas.js', '/mundo.js', '/som.js', '/shared/regras.js', '/vendor/three.min.js', '/icone.svg', '/offline.html', '/modelos/aug_a3.json', '/modelos/aug_a3_0.png', '/modelos/aug_a3_1.png', '/modelos/tarantula.json', '/modelos/judy_chou.json', '/modelos/vermilion.json', '/modelos/scifi.json', '/modelos/scifi_0.png', '/modelos/scifi_1.png', '/modelos/scifi_2.png', '/modelos/scifi_3.png', '/modelos/scifi_4.jpg', '/modelos/scifi_5.png', '/modelos/scifi_6.jpg', '/modelos/scifi_7.jpg', '/modelos/colete1.json', '/modelos/colete1.jpg', '/modelos/colete2.json', '/modelos/colete2.jpg', '/modelos/colete3.json', '/modelos/colete3.jpg', '/modelos/vermilion_0.jpg', '/modelos/vermilion_1.jpg', '/sons/headshot.mp3', '/sons/promocao.mp3', '/sons/bomba.mp3', '/modelos/judy_chou_0.jpg', '/modelos/judy_chou_1.jpg', '/modelos/judy_chou_2.jpg', '/modelos/judy_chou_3.jpg', '/modelos/tarantula_0.jpg', '/modelos/tarantula_1.jpg', '/modelos/tarantula_2.jpg', '/modelos/tarantula_3.jpg', '/modelos/tarantula_4.jpg', '/modelos/tarantula_5.jpg', '/modelos/tarantula_6.jpg', '/modelos/tarantula_7.jpg', '/modelos/tarantula_8.jpg']);

/* ---------- perfis (XP e estatísticas por código do aparelho) ---------- */
let perfis = {}, contas = {}, social = { clas: {} }, dadosProntos = false;
function salvar() { ARM.salvar('perfis', perfis); }
function perfil(cod) { if (!perfis[cod]) perfis[cod] = { xp: 0, kills: 0, mortes: 0, hs: 0, vitorias: 0, partidas: 0 }; const p = perfis[cod]; if (p.moedas == null) p.moedas = 0; if (!Array.isArray(p.armas)) p.armas = ['ar9']; return p; }
function coleteDe(j) { if (j.bot) return j.colete || null; const id = j.cod ? perfil(j.cod).colete : null; return id && perfil(j.cod).armas.includes(id) ? id : null; }
function skinDe(j) { if (j.bot) return j.skin || null; const id = j.cod ? perfil(j.cod).skin : null; return id && perfil(j.cod).armas.includes(id) ? id : null; }
function temArma(c, id) { const it = G.item(id); return !it || !it.preco || (c.cod && perfil(c.cod).armas.includes(id)); } // itens grátis (fora da loja) valem para todos
/* ---------- contas (usuário + senha). A senha nunca é guardada: só o "hash" scrypt com sal. ---------- */
function salvarContas() { ARM.salvar('contas', contas, 300); }
function salvarSocial() { ARM.salvar('social', social); }
// carrega tudo antes de aceitar login
const carregamento = Promise.all([ARM.carregar('perfis'), ARM.carregar('contas'), ARM.carregar('social')]).then(([p, c, so]) => {
  perfis = p || {}; contas = c || {}; social = Object.assign({ clas: {} }, so || {}); dadosProntos = true;
  console.log('[armazem] dados carregados de ' + ARM.onde + ': ' + Object.keys(contas).length + ' contas');
}).catch(e => { console.error('[armazem] ERRO ao carregar, o servidor não vai aceitar login para não apagar dados:', e.message); });
function hashSenha(senha, sal) { return crypto.scryptSync(String(senha), sal, 32).toString('hex'); }
function hashToken(t) { return crypto.createHash('sha256').update(String(t)).digest('hex'); }
function usuarioValido(u) { return /^[\p{L}\p{N}_.\-]{3,14}$/u.test(u); }
function contaPorToken(token) { if (!token || typeof token !== 'string') return null; const h = hashToken(token); for (const k in contas) if ((contas[k].tokens || []).includes(h)) return k; return null; }
function novoToken(conta) { const t = crypto.randomBytes(24).toString('hex'); conta.tokens = (conta.tokens || []).concat(hashToken(t)).slice(-5); salvarContas(); return t; }
function tentativaDemais(c) { const t = agora(); c.tent = (c.tent || []).filter(x => t - x < 60000); if (c.tent.length >= 6) return true; c.tent.push(t); return false; }
function entrarConta(c, chave, token) {
  const conta = contas[chave];
  for (const o of clientes.values()) if (o !== c && o.conta === chave) { env(o, { t: 'erro', txt: 'Sua conta entrou em outro aparelho' }); sairSala(o); o.conta = null; o.nome = null; try { o.ws.close(); } catch (e) {} }
  c.conta = chave; c.cod = conta.cod; c.nome = conta.nome;
  env(c, { t: 'conta', nome: conta.nome, token: token || null }); setTimeout(() => avisarAmigos(chave), 200);
  env(c, { t: 'bemvindo', id: c.id, perfil: perfilPublico(c), salas: listaSalas() });
}
function limpaNome(n) { n = String(n || '').replace(/[^\p{L}\p{N} _.\-]/gu, '').trim().slice(0, 14); return n.length >= 2 ? n : 'Soldado' + Math.floor(Math.random() * 900 + 100); }
function limpaTexto(t, max) { return String(t || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max); }

/* ---------- estado ---------- */
const clientes = new Map(); // id -> cliente
const salas = new Map(); let nSala = 1, nId = 1;
const agora = () => Date.now();
function env(c, m) { if (c.ws && c.ws.readyState === 1) c.ws.send(JSON.stringify(m)); }
function paraSala(s, m) { const t = JSON.stringify(m); for (const j of s.jogs.values()) if (j.ws && j.ws.readyState === 1) j.ws.send(t); }
function resumoSala(s) { return { id: s.id, nome: s.nome, modo: s.modo, mapa: s.mapa, n: s.jogs.size, max: s.max, estado: s.estado, senha: !!s.senha, bots: s.bots }; }
function listaSalas() { return [...salas.values()].map(resumoSala); }
function avisarLobby() { const m = JSON.stringify({ t: 'salas', salas: listaSalas() }); for (const c of clientes.values()) if (!c.sala && c.ws.readyState === 1) c.ws.send(m); }
function infoSala(s) {
  return { t: 'sala', sala: Object.assign(resumoSala(s), { dono: s.dono, meta: s.meta, tempo: s.tempo,
    jogs: [...s.jogs.values()].map(j => ({ id: j.id, nome: j.nome, time: j.time, pronto: j.pronto, bot: !!j.bot, pat: j.bot ? j.pat : G.patente(perfil(j.cod).xp).n, tag: tagDe(j), arma: j.primaria })) }) };
}
function atualizarSala(s) { paraSala(s, infoSala(s)); avisarLobby(); }

function criarSala(dono, op) {
  const s = { id: nSala++, nome: limpaTexto(op.nome, 24) || ('Sala de ' + dono.nome), modo: G.MODOS[op.modo] ? op.modo : 'time', mapa: G.MAPAS[op.mapa] ? op.mapa : 'biblioteca',
    max: Math.max(2, Math.min(R.MAX_SALA, op.max | 0 || 16)), meta: [30, 50, 80, 100, 160].includes(op.meta | 0) ? op.meta | 0 : 50, tempo: [5, 10, 15, 20].includes(op.tempo | 0) ? op.tempo | 0 : 10,
    senha: limpaTexto(op.senha, 12), bots: Math.max(0, Math.min(14, op.bots | 0)), dono: dono.id, jogs: new Map(), estado: 'espera', partida: null, chat: [] };
  salas.set(s.id, s); return s;
}
function timeComMenos(s) { let r = 0, b = 0; for (const j of s.jogs.values()) { if (j.time === 'r') r++; else if (j.time === 'b') b++; } return r <= b ? 'r' : 'b'; }
function entrarSala(c, s) {
  if (c.sala) sairSala(c);
  c.sala = s; c.time = timeComMenos(s); c.pronto = false; s.jogs.set(c.id, c);
  if (s.estado === 'jogo') { prepararJogador(s, c); env(c, Object.assign(inicioPartida(s), { eu: c.id, mun: c.mun })); paraSala(s, { t: 'entrou', j: { id: c.id, nome: c.nome, time: c.time, x: c.x, y: c.y, z: c.z, arma: c.arma, colete: coleteDe(c), skin: skinDe(c), tag: tagDe(c) } }); }
  atualizarSala(s);
}
function sairSala(c) {
  const s = c.sala; if (!s) return; s.jogs.delete(c.id); c.sala = null;
  if (s.estado === 'jogo' && s.partida) paraSala(s, { t: 'saiu', id: c.id });
  const humanos = [...s.jogs.values()].filter(j => !j.bot);
  if (!humanos.length) { salas.delete(s.id); avisarLobby(); return; }
  if (s.dono === c.id) s.dono = humanos[0].id;
  atualizarSala(s);
}

/* ---------- partida ---------- */
const NOMES_BOT = ['Falcão', 'Trovão', 'Sombra', 'Raio', 'Lobo', 'Cobra', 'Tigre', 'Coruja', 'Fantasma', 'Brasa', 'Gelo', 'Pantera', 'Viper', 'Tornado'];
function encherBots(s) {
  for (const [id, j] of s.jogs) if (j.bot) s.jogs.delete(id);
  for (let i = 0; i < s.bots && s.jogs.size < s.max; i++) {
    const b = { id: nId++, bot: true, nome: 'BOT ' + NOMES_BOT[i % NOMES_BOT.length], time: timeComMenos(s), pronto: true, primaria: (function (r) { return r < 0.1 ? 'vb' : r < 0.2 ? 'arara' : 'ar9'; })(Math.random()), skin: Math.random() < 0.12 ? 'scifi' : null, colete: Math.random() < 0.35 ? ['colete1', 'colete2', 'colete3'][Math.floor(Math.random() * 3)] : null, pat: Math.floor(Math.random() * 28) };
    s.jogs.set(b.id, b);
  }
}
function pontoNasc(s, j) {
  const m = G.MAPAS[s.mapa], lista = s.modo === 'todos' ? m.nasc.r.concat(m.nasc.b) : m.nasc[j.time];
  let melhor = lista[0], md = -1;
  for (const p of lista) { // longe dos inimigos
    let d = 1e9; for (const o of s.jogs.values()) if (o.vivo && o !== j && (s.modo === 'todos' || o.time !== j.time)) d = Math.min(d, Math.hypot(o.x - p[0], o.z - p[1]));
    d += Math.random() * 4; if (d > md) { md = d; melhor = p; }
  }
  return melhor;
}
function prepararJogador(s, j) {
  j.kills = j.kills || 0; j.mortesP = j.mortesP || 0; j.hs = j.hs || 0; j.assist = 0;
  if (!G.ARMAS[j.primaria] || G.ARMAS[j.primaria].slot !== 1 || (!j.bot && !temArma(j, j.primaria))) j.primaria = 'ar9';
  j.primariaModo = s.modo === 'sniper' ? (G.ARMAS[j.primaria] && G.ARMAS[j.primaria].tipo === 'sniper' ? j.primaria : 'l7') : j.primaria;
  renascer(s, j);
}
function renascer(s, j) {
  const p = pontoNasc(s, j);
  Object.assign(j, { vivo: true, vida: R.VIDA, x: p[0], y: G.chaoEm(G.MAPAS[s.mapa], p[0], p[1]), z: p[1], yaw: j.time === 'r' ? -Math.PI / 2 : Math.PI / 2, pitch: 0, vy: 0, noChao: true, agachado: false,
    arma: j.primariaModo || j.primaria, protegidoAte: agora() + R.PROTECAO * 1000, ultTiro: 0, recarregandoAte: 0, granadas: 1, acao: null, renasceEm: null });
  j.armaPega = null;
  const pr = j.primariaModo || j.primaria;
  if (s.modo === 'faca') { j.arma = 'faca'; j.mun = {}; j.granadas = 0; }
  else if (s.modo === 'sniper') { j.mun = { [pr]: { pente: A[pr].pente, reserva: A[pr].reserva } }; j.granadas = 0; }
  else j.mun = { [pr]: { pente: A[pr].pente, reserva: A[pr].reserva }, p9: { pente: A.p9.pente, reserva: A.p9.reserva } };
  if (j.bot) { j.caminho = null; j.alvoId = null; j.reacao = 0; j.botT = 0; j.objetivo = null; }
}
function inicioPartida(s) {
  const P = s.partida;
  return { t: 'inicio', mapa: s.mapa, modo: s.modo, meta: G.porRodada(s.modo) ? G.RODADA[s.modo].vencer : s.meta, fim: P.fim, placar: P.placar, drops: P.drops || [], eu: null, rodada: G.porRodada(s.modo) ? estadoRodada(s) : null,
    jogs: [...s.jogs.values()].map(j => ({ id: j.id, nome: j.nome, time: j.time, bot: !!j.bot, x: j.x, y: j.y, z: j.z, arma: j.arma, vivo: j.vivo, colete: coleteDe(j), skin: skinDe(j), tag: tagDe(j) })) };
}
function iniciarPartida(s) {
  encherBots(s);
  s.estado = 'jogo'; s.partida = { placar: { r: 0, b: 0 }, fim: agora() + (G.porRodada(s.modo) ? 40 : s.tempo) * 60000, granadas: [], grade: G.grade(G.MAPAS[s.mapa]), terminou: false, n: 0, fase: 'jogo', bomba: null, portador: null, drops: [] };
  for (const j of s.jogs.values()) { j.kills = 0; j.mortesP = 0; j.hs = 0; prepararJogador(s, j); }
  const ini = inicioPartida(s);
  for (const j of s.jogs.values()) if (!j.bot) env(j, Object.assign({}, ini, { eu: j.id, mun: j.mun }));
  atualizarSala(s);
  if (G.porRodada(s.modo)) iniciarRodada(s);
}
function terminarPartida(s, motivo) {
  const P = s.partida; if (!P || P.terminou) return; P.terminou = true;
  const lista = [...s.jogs.values()];
  let vencedor = null;
  if (s.modo !== 'todos') vencedor = P.placar.r > P.placar.b ? 'r' : P.placar.b > P.placar.r ? 'b' : 'empate';
  const mvp = lista.slice().sort((a, b) => b.kills - a.kills || a.mortesP - b.mortesP)[0];
  const res = lista.map(j => {
    let xp = j.kills * 10 + j.hs * 5 + 20;
    if (s.modo !== 'todos' && j.time === vencedor) xp += 60;
    if (s.modo === 'todos' && j === mvp) xp += 60;
    const venceu = j.time === vencedor || (s.modo === 'todos' && j === mvp), moedas = G.moedasPartida(j.kills, j.hs, venceu);
    if (!j.bot) { missao(j, 'partida', 1); if (venceu) missao(j, 'vitoria', 1); }
    if (!j.bot) { const p = perfil(j.cod); p.moedas += moedas; p.xp += xp; p.kills += j.kills; p.mortes += j.mortesP; p.hs += j.hs; p.partidas++; if (j.time === vencedor || (s.modo === 'todos' && j === mvp)) p.vitorias++; }
    return { id: j.id, nome: j.nome, time: j.time, kills: j.kills, mortes: j.mortesP, hs: j.hs, xp, moedas, bot: !!j.bot };
  });
  salvar();
  paraSala(s, { t: 'fim', motivo, vencedor, mvp: mvp && mvp.id, placar: P.placar, res });
  for (const j of s.jogs.values()) if (!j.bot) env(j, { t: 'perfil', perfil: perfilPublico(j) });
  setTimeout(() => { if (!salas.has(s.id)) return; s.estado = 'espera'; s.partida = null; for (const [id, j] of s.jogs) { if (j.bot) s.jogs.delete(id); else j.pronto = false; } atualizarSala(s); }, 8000);
}
/* ---------- missões diárias e bônus de login ---------- */
const MISSOES = [
  { id: 'kill10', tipo: 'kill', alvo: 10, premio: 150, txt: 'Faça 10 abates' }, { id: 'kill25', tipo: 'kill', alvo: 25, premio: 350, txt: 'Faça 25 abates' },
  { id: 'hs5', tipo: 'hs', alvo: 5, premio: 250, txt: 'Acerte 5 headshots que matam' }, { id: 'part3', tipo: 'partida', alvo: 3, premio: 200, txt: 'Jogue 3 partidas até o fim' },
  { id: 'vit2', tipo: 'vitoria', alvo: 2, premio: 300, txt: 'Vença 2 partidas' }, { id: 'faca3', tipo: 'faca', alvo: 3, premio: 300, txt: 'Faça 3 abates com faca' },
  { id: 'snp5', tipo: 'sniper', alvo: 5, premio: 300, txt: 'Faça 5 abates com sniper' }, { id: 'rod5', tipo: 'rodada', alvo: 5, premio: 250, txt: 'Vença 5 rodadas (Bomba ou Eliminação)' },
  { id: 'bmb2', tipo: 'bomba', alvo: 2, premio: 300, txt: 'Plante ou desarme 2 bombas' }
];
const BONUS = [100, 150, 200, 250, 300, 400, 700];
function hoje(desloc) { return new Date(Date.now() - 3 * 3600e3 + (desloc || 0) * 86400e3).toISOString().slice(0, 10); } // horário de Brasília
function missoesDe(p, cod) {
  const d = hoje();
  if (!p.missoes || p.missoes.dia !== d) {
    let h = 0; for (const ch of d + cod) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const ids = MISSOES.map(m => m.id), esc = []; while (esc.length < 3) { h = (h * 1103515245 + 12345) >>> 0; const id = ids[h % ids.length]; if (!esc.includes(id)) esc.push(id); }
    p.missoes = { dia: d, lista: esc.map(id => ({ id, prog: 0, pego: false })) };
  }
  return p.missoes;
}
function registrarMissao(j, tipo, qtd, extra) {
  const p = perfil(j.cod), ms = missoesDe(p, j.cod), tipos = [tipo];
  if (tipo === 'kill') { if (extra.hs) tipos.push('hs'); if (extra.arma === 'faca') tipos.push('faca'); if (A[extra.arma] && A[extra.arma].tipo === 'sniper') tipos.push('sniper'); }
  if (tipo === 'plantar' || tipo === 'desarmar') tipos.push('bomba');
  let mudou = false;
  for (const m of ms.lista) { const def = MISSOES.find(x => x.id === m.id); if (def && tipos.includes(def.tipo) && m.prog < def.alvo) { m.prog = Math.min(def.alvo, m.prog + qtd); mudou = true; if (m.prog >= def.alvo) env(j, { t: 'aviso', txt: '🎯 Missão completa: ' + def.txt + ' (+' + def.premio + ' moedas)' }); } }
  if (mudou) salvar();
}
function bonusDe(p) { const b = p.bonus || { ultimo: null, seq: 0 }; if (b.ultimo === hoje()) return null; const seq = b.ultimo === hoje(-1) ? (b.seq % 7) + 1 : 1; return { seq, premio: BONUS[seq - 1] }; }
/* ---------- ranking, amigos e clãs ---------- */
function onlineDe(chave) { for (const o of clientes.values()) if (o.conta === chave) return o; return null; }
function tagDe(c) { if (!c || c.bot || !c.cod) return null; const k = perfil(c.cod).cla; return k && social.clas[k] ? social.clas[k].tag : null; }
let rankCache = null, rankT = 0;
function ranking() {
  if (rankCache && agora() - rankT < 20000) return rankCache;
  rankCache = Object.keys(contas).map(k => { const p = perfis[contas[k].cod] || { xp: 0, kills: 0, hs: 0, vitorias: 0 }, pt = G.patente(p.xp || 0), cl = p.cla && social.clas[p.cla];
    return { k, nome: contas[k].nome, xp: p.xp || 0, pat: pt.n, kills: p.kills || 0, hs: p.hs || 0, vit: p.vitorias || 0, tag: cl ? cl.tag : null }; })
    .sort((a, b) => b.xp - a.xp || b.kills - a.kills);
  rankT = agora(); return rankCache;
}
function infoAmigos(c) {
  const p = perfil(c.cod), st = k => { const o = onlineDe(k); return !o ? 'offline' : o.sala ? (o.sala.estado === 'jogo' ? 'em partida' : 'na sala ' + o.sala.nome) : 'no lobby'; };
  const pf = k => { const ct = contas[k]; if (!ct) return null; const pp = perfis[ct.cod] || {}; return { k, nome: ct.nome, pat: G.patente(pp.xp || 0).n, status: st(k), online: !!onlineDe(k), sala: (onlineDe(k) || {}).sala ? onlineDe(k).sala.id : null }; };
  return { t: 'amigos', amigos: (p.amigos || []).map(pf).filter(Boolean).sort((a, b) => b.online - a.online), pedidos: (p.pedidos || []).map(pf).filter(Boolean) };
}
function avisarAmigos(chave) { const ct = contas[chave]; if (!ct) return; const p = perfis[ct.cod]; for (const k of (p && p.amigos) || []) { const o = onlineDe(k); if (o) env(o, infoAmigos(o)); } }
function infoCla(c) {
  const k = perfil(c.cod).cla, cl = k && social.clas[k];
  const lista = Object.keys(social.clas).map(t => { const x = social.clas[t]; let xp = 0; for (const m of x.membros) { const ct = contas[m]; if (ct && perfis[ct.cod]) xp += perfis[ct.cod].xp || 0; } return { tag: x.tag, nome: x.nome, n: x.membros.length, xp }; }).sort((a, b) => b.xp - a.xp).slice(0, 30);
  if (!cl) return { t: 'cla', cla: null, lista };
  return { t: 'cla', lista, cla: { tag: cl.tag, nome: cl.nome, dono: contas[cl.dono] ? contas[cl.dono].nome : '?', souDono: cl.dono === c.conta,
    membros: cl.membros.map(m => { const ct = contas[m]; if (!ct) return null; const pp = perfis[ct.cod] || {}; return { nome: ct.nome, pat: G.patente(pp.xp || 0).n, xp: pp.xp || 0, online: !!onlineDe(m) }; }).filter(Boolean).sort((a, b) => b.xp - a.xp) } };
}
function social_(c, m) {
  if (!c.conta) return env(c, { t: 'erro', txt: 'Entre na sua conta primeiro' });
  const p = perfil(c.cod);
  switch (m.t) {
    case 'ranking': { const r = ranking(), pos = r.findIndex(x => x.k === c.conta); env(c, { t: 'ranking', lista: r.slice(0, 100).map(x => Object.assign({}, x, { k: undefined, eu: x.k === c.conta })), pos: pos + 1, total: r.length }); break; }
    case 'amigos': env(c, infoAmigos(c)); break;
    case 'amigoAdd': {
      const k = String(m.nome || '').trim().toLowerCase(), alvo = contas[k];
      if (!alvo) return env(c, { t: 'erro', txt: 'Não existe jogador com esse nome' }); if (k === c.conta) return env(c, { t: 'erro', txt: 'Esse é você 😅' });
      p.amigos = p.amigos || []; if (p.amigos.includes(k)) return env(c, { t: 'erro', txt: 'Vocês já são amigos' });
      const pa = perfil(alvo.cod); pa.pedidos = pa.pedidos || [];
      if ((p.pedidos || []).includes(k)) { p.pedidos = p.pedidos.filter(x => x !== k); p.amigos.push(k); pa.amigos = pa.amigos || []; if (!pa.amigos.includes(c.conta)) pa.amigos.push(c.conta); }
      else if (!pa.pedidos.includes(c.conta)) pa.pedidos.push(c.conta);
      salvar(); env(c, { t: 'aviso', txt: 'Pedido de amizade enviado para ' + alvo.nome }); env(c, infoAmigos(c));
      const o = onlineDe(k); if (o) { env(o, infoAmigos(o)); env(o, { t: 'aviso', txt: '👥 ' + c.nome + ' quer ser seu amigo' }); } break;
    }
    case 'amigoAceitar': case 'amigoRecusar': {
      const k = String(m.k || ''); p.pedidos = (p.pedidos || []).filter(x => x !== k); if (!contas[k]) return;
      if (m.t === 'amigoAceitar') { p.amigos = p.amigos || []; if (!p.amigos.includes(k)) p.amigos.push(k); const pa = perfil(contas[k].cod); pa.amigos = pa.amigos || []; if (!pa.amigos.includes(c.conta)) pa.amigos.push(c.conta); const o = onlineDe(k); if (o) env(o, infoAmigos(o)); }
      salvar(); env(c, infoAmigos(c)); break;
    }
    case 'amigoRemover': { const k = String(m.k || ''); p.amigos = (p.amigos || []).filter(x => x !== k); if (contas[k]) { const pa = perfil(contas[k].cod); pa.amigos = (pa.amigos || []).filter(x => x !== c.conta); const o = onlineDe(k); if (o) env(o, infoAmigos(o)); } salvar(); env(c, infoAmigos(c)); break; }
    case 'convidar': {
      const k = String(m.k || ''), o = onlineDe(k); if (!c.sala) return env(c, { t: 'erro', txt: 'Entre ou crie uma sala para convidar' });
      if (!(p.amigos || []).includes(k) || !o) return env(c, { t: 'erro', txt: 'Esse amigo não está online' });
      c.sala.convidados = c.sala.convidados || new Set(); c.sala.convidados.add(k);
      env(o, { t: 'convite', de: c.nome, sala: c.sala.id, nomeSala: c.sala.nome, mapa: c.sala.mapa, modo: c.sala.modo }); env(c, { t: 'aviso', txt: 'Convite enviado para ' + contas[k].nome }); break;
    }
    case 'cla': env(c, infoCla(c)); break;
    case 'claCriar': {
      if (p.cla && social.clas[p.cla]) return env(c, { t: 'erro', txt: 'Saia do seu clã primeiro' });
      const nome = limpaTexto(m.nome, 20), tag = String(m.tag || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
      if (nome.length < 3 || tag.length < 2) return env(c, { t: 'erro', txt: 'Nome com 3+ letras e TAG com 2 a 4 letras/números' });
      if (social.clas[tag]) return env(c, { t: 'erro', txt: 'Essa TAG já existe' });
      if (p.moedas < 2000) return env(c, { t: 'erro', txt: 'Criar clã custa 2.000 moedas' });
      p.moedas -= 2000; social.clas[tag] = { tag, nome, dono: c.conta, membros: [c.conta], criado: agora() }; p.cla = tag; rankCache = null;
      salvar(); salvarSocial(); env(c, infoCla(c)); env(c, { t: 'perfil', perfil: perfilPublico(c) }); env(c, { t: 'aviso', txt: 'Clã [' + tag + '] criado!' }); break;
    }
    case 'claEntrar': {
      const tag = String(m.tag || '').toUpperCase(), cl = social.clas[tag]; if (!cl) return env(c, { t: 'erro', txt: 'Clã não encontrado' });
      if (p.cla && social.clas[p.cla]) return env(c, { t: 'erro', txt: 'Saia do seu clã primeiro' }); if (cl.membros.length >= 30) return env(c, { t: 'erro', txt: 'Clã cheio (30)' });
      cl.membros.push(c.conta); p.cla = tag; rankCache = null; salvar(); salvarSocial(); env(c, infoCla(c)); env(c, { t: 'perfil', perfil: perfilPublico(c) });
      for (const mm of cl.membros) { const o = onlineDe(mm); if (o && o !== c) env(o, { t: 'aviso', txt: '🛡️ ' + c.nome + ' entrou no clã' }); } break;
    }
    case 'claSair': {
      const cl = p.cla && social.clas[p.cla]; p.cla = null; if (!cl) return;
      cl.membros = cl.membros.filter(x => x !== c.conta); if (!cl.membros.length) delete social.clas[cl.tag]; else if (cl.dono === c.conta) cl.dono = cl.membros[0];
      rankCache = null; salvar(); salvarSocial(); env(c, infoCla(c)); env(c, { t: 'perfil', perfil: perfilPublico(c) }); break;
    }
  }
}
function missao(j, tipo, qtd, extra) { if (!j || j.bot || !j.cod || typeof registrarMissao !== 'function') return; registrarMissao(j, tipo, qtd, extra || {}); }
function perfilPublico(c) { const p = perfil(c.cod), pt = G.patente(p.xp); const ms = missoesDe(p, c.cod), bn = bonusDe(p); return { tag: tagDe(c), missoes: ms.lista.map(m => Object.assign({}, MISSOES.find(x => x.id === m.id), m)), bonus: bn, bonusSeq: (p.bonus && p.bonus.seq) || 0, moedas: p.moedas, armas: p.armas.slice(), colete: p.colete || null, skin: p.skin || null, nome: c.nome, xp: p.xp, patente: pt.n, nomePatente: pt.nome, base: pt.base, prox: pt.prox, kills: p.kills, mortes: p.mortes, hs: p.hs, vitorias: p.vitorias, partidas: p.partidas }; }


/* ---------- rodadas: Missão Bomba e Eliminação ---------- */
function estadoRodada(s) { const P = s.partida; return { n: P.n, fim: P.rodadaFim, portador: P.portador, bomba: P.bomba, fase: P.fase, vencer: G.RODADA[s.modo].vencer }; }
function iniciarRodada(s) {
  const P = s.partida, t = agora(), cfg = G.RODADA[s.modo];
  P.n++; P.fase = 'jogo'; P.bomba = null; P.portador = null; P.proxima = null; P.rodadaFim = t + cfg.tempo * 1000; P.granadas = [];
  P.localAtaque = Math.random() < 0.5 ? 'A' : 'B';
  for (const j of s.jogs.values()) renascer(s, j);
  P.drops = []; paraSala(s, { t: 'drops', lista: [] });
  if (s.modo === 'bomba') { const ver = [...s.jogs.values()].filter(j => j.time === 'r'); if (ver.length) { const hum = ver.filter(j => !j.bot), l = hum.length && Math.random() < 0.6 ? hum : ver; P.portador = l[Math.floor(Math.random() * l.length)].id; } }
  paraSala(s, Object.assign({ t: 'rodada' }, estadoRodada(s), { placar: P.placar }));
  for (const j of s.jogs.values()) { paraSala(s, { t: 'nasceu', id: j.id, x: j.x, y: j.y, z: j.z }); if (!j.bot) env(j, { t: 'mun', mun: j.mun, arma: j.arma, granadas: j.granadas }); }
}
function vivosDo(s, time) { let n = 0; for (const j of s.jogs.values()) if (j.vivo && j.time === time) n++; return n; }
function verificarRodada(s) {
  const P = s.partida; if (!P || P.fase !== 'jogo') return;
  const r = vivosDo(s, 'r'), b = vivosDo(s, 'b'), plantada = P.bomba && P.bomba.estado === 'plantada';
  if (s.modo === 'bomba') { if (b === 0) fimRodada(s, 'r', 'eliminados'); else if (r === 0 && !plantada) fimRodada(s, 'b', 'eliminados'); }
  else { if (r === 0 && b === 0) fimRodada(s, 'b', 'eliminados'); else if (r === 0) fimRodada(s, 'b', 'eliminados'); else if (b === 0) fimRodada(s, 'r', 'eliminados'); }
}
function fimRodada(s, vencedor, motivo) {
  const P = s.partida; if (P.fase !== 'jogo') return;
  P.fase = 'pausa'; P.placar[vencedor]++;
  for (const j of s.jogs.values()) j.acao = null;
  for (const j of s.jogs.values()) if (j.time === vencedor) missao(j, 'rodada', 1);
  paraSala(s, { t: 'fimRodada', vencedor, motivo, placar: P.placar, n: P.n });
  if (P.placar[vencedor] >= G.RODADA[s.modo].vencer) setTimeout(() => { if (s.partida === P) terminarPartida(s, 'meta'); }, 3500);
  else P.proxima = agora() + 5000;
}
function soltarBomba(s, j) {
  const P = s.partida; P.portador = null; P.bomba = { estado: 'caiu', x: j.x, y: j.y, z: j.z };
  paraSala(s, { t: 'bomba', estado: 'caiu', x: j.x, y: j.y, z: j.z, quem: j.id });
}
function localEm(s, x, z) { const L = G.MAPAS[s.mapa].locais || {}; for (const k in L) if (Math.hypot(x - L[k][0], z - L[k][1]) <= G.BOMBA.raioLocal) return k; return null; }
function acaoBomba(s, c, tipo, on) {
  const P = s.partida; if (!P || s.modo !== 'bomba' || P.fase !== 'jogo' || !c.vivo) return;
  if (!on) { if (c.acao && c.acao.tipo === tipo) { c.acao = null; if (!c.bot) env(c, { t: 'acao', tipo, estado: 'cancelou' }); } return; }
  const t = agora();
  if (tipo === 'plantar' && c.time === 'r' && P.portador === c.id && localEm(s, c.x, c.z)) c.acao = { tipo, fim: t + G.BOMBA.plantar * 1000, x: c.x, z: c.z };
  else if (tipo === 'desarmar' && c.time === 'b' && P.bomba && P.bomba.estado === 'plantada' && Math.hypot(c.x - P.bomba.x, c.z - P.bomba.z) <= G.BOMBA.raioDesarmar && Math.abs(c.y - P.bomba.y) < 1.5) c.acao = { tipo, fim: t + G.BOMBA.desarmar * 1000, x: c.x, z: c.z };
  else return;
  if (!c.bot) env(c, { t: 'acao', tipo, estado: 'comecou', fim: c.acao.fim, dur: (c.acao.fim - t) });
  paraSala(s, { t: 'bomba', estado: tipo === 'plantar' ? 'plantando' : 'desarmando', quem: c.id });
}
function passoRodada(s, t) {
  const P = s.partida;
  if (P.fase === 'pausa') { if (P.proxima && t >= P.proxima) iniciarRodada(s); return; }
  // ações em andamento (plantar / desarmar)
  for (const j of s.jogs.values()) {
    const a = j.acao; if (!a) continue;
    if (!j.vivo || Math.hypot(j.x - a.x, j.z - a.z) > 0.7) { j.acao = null; if (!j.bot) env(j, { t: 'acao', tipo: a.tipo, estado: 'cancelou' }); continue; }
    if (t < a.fim) continue;
    j.acao = null;
    if (a.tipo === 'plantar' && P.portador === j.id) {
      P.portador = null; P.bomba = { estado: 'plantada', x: j.x, y: j.y, z: j.z, local: localEm(s, j.x, j.z) || '?', explodeEm: t + G.BOMBA.explode * 1000 };
      j.kills += 0; missao(j, 'plantar', 1);
      paraSala(s, Object.assign({ t: 'bomba', quem: j.id }, P.bomba));
    } else if (a.tipo === 'desarmar' && P.bomba && P.bomba.estado === 'plantada') {
      P.bomba.estado = 'desarmada'; missao(j, 'desarmar', 1);
      paraSala(s, Object.assign({ t: 'bomba', quem: j.id }, P.bomba)); fimRodada(s, 'b', 'desarmada'); return;
    }
  }
  // bomba caída: um vermelho perto pega
  if (s.modo === 'bomba' && P.bomba && P.bomba.estado === 'caiu') {
    for (const j of s.jogs.values()) if (j.vivo && j.time === 'r' && Math.hypot(j.x - P.bomba.x, j.z - P.bomba.z) < 1.3 && Math.abs(j.y - P.bomba.y) < 1.5) { P.portador = j.id; P.bomba = null; paraSala(s, { t: 'bomba', estado: 'pegou', quem: j.id }); break; }
  }
  // explosão
  if (P.bomba && P.bomba.estado === 'plantada' && t >= P.bomba.explodeEm) {
    const b = P.bomba; b.estado = 'explodiu';
    paraSala(s, Object.assign({ t: 'bomba' }, b)); paraSala(s, { t: 'explosao', id: 0, x: b.x, y: b.y + 0.3, z: b.z, grande: true });
    const dono = { id: 0, kills: 0, hs: 0, time: 'r', x: b.x, z: b.z };
    for (const j of s.jogs.values()) if (j.vivo && Math.hypot(j.x - b.x, j.z - b.z) < G.BOMBA.raioExplosao) { j.protegidoAte = 0; dano(s, j, dono, 500, 'bomba', false); }
    if (P.fase === 'jogo') fimRodada(s, 'r', 'explodiu');
    return;
  }
  // tempo da rodada
  if (t >= P.rodadaFim && !(P.bomba && P.bomba.estado === 'plantada')) {
    if (s.modo === 'bomba') fimRodada(s, 'b', 'tempo');
    else { const r = vivosDo(s, 'r'), b = vivosDo(s, 'b'); fimRodada(s, r > b ? 'r' : 'b', 'tempo'); }
  }
}

/* ---------- armas no chão (quem morre larga a arma principal; outro pode pegar) ---------- */
let nDrop = 1;
function principal(j) { return j.armaPega || j.primariaModo || j.primaria; }
function largarArma(s, j, x, z) {
  const P = s.partida; if (!P || s.modo === 'faca') return null;
  const id = principal(j), mu = j.mun && j.mun[id]; if (!A[id] || A[id].slot !== 1 || !mu || mu.pente + mu.reserva <= 0) return null;
  const px = x != null ? x : j.x, pz = z != null ? z : j.z;
  const d = { id: nDrop++, arma: id, x: +px.toFixed(2), y: +G.chaoEm(G.MAPAS[s.mapa], px, pz).toFixed(2), z: +pz.toFixed(2), rot: +(Math.random() * 6.28).toFixed(2), pente: mu.pente, reserva: mu.reserva, ate: agora() + 45000 };
  P.drops = P.drops || []; P.drops.push(d); delete j.mun[id];
  while (P.drops.length > 16) { const v = P.drops.shift(); paraSala(s, { t: 'dropSome', id: v.id }); }
  paraSala(s, { t: 'drop', d }); return d;
}
function pegarArma(s, c, idDrop) {
  const P = s.partida; if (!P || !c.vivo || !P.drops) return;
  const d = P.drops.find(x => x.id === idDrop); if (!d) return;
  if (Math.hypot(d.x - c.x, d.z - c.z) > 2.4 || Math.abs(d.y - c.y) > 1.6) return;
  if (s.modo === 'sniper' && A[d.arma].tipo !== 'sniper') return;
  P.drops = P.drops.filter(x => x !== d); paraSala(s, { t: 'dropSome', id: d.id });
  const minha = principal(c); if (minha !== d.arma) largarArma(s, c, c.x + Math.sin(c.yaw) * 0.6, c.z + Math.cos(c.yaw) * 0.6); // troca: larga a sua
  c.armaPega = d.arma; c.mun[d.arma] = { pente: d.pente, reserva: d.reserva }; c.arma = d.arma; c.recarregandoAte = 0;
  paraSala(s, { t: 'pegou', jid: c.id, arma: d.arma });
  if (!c.bot) env(c, { t: 'mun', mun: c.mun, arma: c.arma, granadas: c.granadas });
}
function vencerDrops(s) { const P = s.partida; if (!P || !P.drops || !P.drops.length) return; const t = agora(); const ficam = []; for (const d of P.drops) { if (d.ate > t) ficam.push(d); else paraSala(s, { t: 'dropSome', id: d.id }); } P.drops = ficam; }

/* ---------- combate ---------- */
function inimigos(s, a, b) { return a !== b && (s.modo === 'todos' || a.time !== b.time); }
function dano(s, alvo, quem, qtd, arma, cabeca) {
  const col = G.COLETES[coleteDe(alvo)]; if (col && !cabeca) qtd *= 1 - col.protecao;
  if (!alvo.vivo || agora() < alvo.protegidoAte) return false;
  if (s.partida && s.partida.fase === 'pausa') return false;
  alvo.vida -= qtd;
  if (!alvo.bot) env(alvo, { t: 'dano', vida: Math.max(0, Math.round(alvo.vida)), de: quem.id, x: quem.x, z: quem.z });
  if (alvo.bot && !alvo.alvoId) { alvo.alvoId = quem.id; alvo.reacao = 0.15; }
  if (alvo.vida <= 0) {
    alvo.vivo = false; alvo.vida = 0; alvo.mortesP++; alvo.acao = null; alvo.renasceEm = G.porRodada(s.modo) ? null : agora() + R.RENASCER * 1000;
    if (quem !== alvo) { quem.kills++; if (cabeca) quem.hs++; if (G.contaKills(s.modo)) s.partida.placar[quem.time]++; missao(quem, 'kill', 1, { hs: !!cabeca, arma }); }
    paraSala(s, { t: 'morte', id: alvo.id, por: quem.id, arma, hs: !!cabeca, placar: s.partida.placar });
    largarArma(s, alvo);
    const P = s.partida;
    if (G.contaKills(s.modo) && (P.placar.r >= s.meta || P.placar.b >= s.meta)) terminarPartida(s, 'meta');
    if (G.porRodada(s.modo)) { if (P.portador === alvo.id) soltarBomba(s, alvo); verificarRodada(s); }
    if (s.modo === 'todos' && quem.kills >= Math.min(s.meta, 40)) terminarPartida(s, 'meta');
    return true;
  }
  return false;
}
// tiro: o servidor confere cadência, munição e refaz o raio contra o mapa e os jogadores
function atirar(s, j, d, chumbos) {
  const arma = A[j.arma], t = agora();
  if (!j.vivo || !arma || arma.tipo === 'granada') return;
  if (t - j.ultTiro < arma.cadencia * 1000 * 0.8 || t < j.recarregandoAte) return;
  if (arma.tipo !== 'faca') { const m = j.mun[j.arma]; if (!m || m.pente <= 0) return; m.pente--; }
  j.ultTiro = t; j.protegidoAte = 0;
  const o = { x: j.x, y: G.olho(j), z: j.z };
  const dirs = (Array.isArray(chumbos) && arma.chumbos ? chumbos.slice(0, arma.chumbos) : [d]).filter(v => v && [v.x, v.y, v.z].every(Number.isFinite));
  const acertos = [];
  for (const dv of dirs) {
    const n = Math.hypot(dv.x, dv.y, dv.z) || 1, dd = { x: dv.x / n, y: dv.y / n, z: dv.z / n };
    const parede = G.raioMapa(G.MAPAS[s.mapa], o, dd, arma.alcance);
    let melhor = null, tm = parede, cab = false;
    for (const alvo of s.jogs.values()) {
      if (!alvo.vivo || !inimigos(s, j, alvo)) continue;
      const hb = G.hitbox(alvo);
      const tc = G.raioEsfera(o, dd, hb.cabeca, hb.rCab + 0.04);
      if (tc >= 0 && tc < tm) { tm = tc; melhor = alvo; cab = true; }
      const tb = G.raioCaixa(o, dd, hb.corpo);
      if (tb >= 0 && tb < tm) { tm = tb; melhor = alvo; cab = false; }
    }
    paraSala(s, { t: 'tiro', id: j.id, arma: j.arma, x: o.x, y: o.y, z: o.z, ex: o.x + dd.x * tm, ey: o.y + dd.y * tm, ez: o.z + dd.z * tm, carne: !!melhor, cab: !!melhor && cab });
    if (melhor) {
      const queda = arma.tipo === 'escopeta' ? Math.max(0.35, 1 - tm / arma.alcance) : arma.tipo === 'smg' ? Math.max(0.6, 1 - tm / 120) : 1;
      acertos.push({ alvo: melhor, dano: arma.dano * (cab ? arma.cabeca : 1) * queda, cab });
    }
  }
  // soma os chumbos no mesmo alvo
  const porAlvo = new Map();
  for (const a of acertos) { const x = porAlvo.get(a.alvo) || { d: 0, cab: false }; x.d += a.dano; x.cab = x.cab || a.cab; porAlvo.set(a.alvo, x); }
  for (const [alvo, x] of porAlvo) {
    const matou = dano(s, alvo, j, x.d, j.arma, x.cab);
    if (!j.bot) env(j, { t: 'acerto', cab: x.cab, matou });
  }
}
function lancarGranada(s, j, d) {
  if (!j.vivo || j.granadas <= 0) return; j.granadas--;
  const n = Math.hypot(d.x, d.y, d.z) || 1, v = 15;
  const g = { id: nId++, dono: j.id, x: j.x, y: G.olho(j), z: j.z, vx: d.x / n * v, vy: d.y / n * v + 2.5, vz: d.z / n * v, t: 0 };
  s.partida.granadas.push(g); paraSala(s, { t: 'granada', g: { id: g.id, x: g.x, y: g.y, z: g.z, vx: g.vx, vy: g.vy, vz: g.vz } });
}
function passoGranadas(s, dt) {
  const P = s.partida, mapa = G.MAPAS[s.mapa];
  P.granadas = P.granadas.filter(g => {
    g.t += dt; g.vy -= R.GRAV * dt;
    ['x', 'y', 'z'].forEach(e => {
      const ant = g[e]; g[e] += g['v' + e] * dt;
      if (mapa.caixas.some(b => g.x > b[0] - b[3] / 2 && g.x < b[0] + b[3] / 2 && g.y > b[1] && g.y < b[1] + b[4] && g.z > b[2] - b[5] / 2 && g.z < b[2] + b[5] / 2)) { g[e] = ant; g['v' + e] *= -0.4; if (e === 'y') { g.vx *= 0.7; g.vz *= 0.7; } }
    });
    if (g.t < A.gr.pavio) return true;
    const dono = s.jogs.get(g.dono) || { id: g.dono, kills: 0, hs: 0, time: null, x: g.x, z: g.z };
    paraSala(s, { t: 'explosao', id: g.id, x: g.x, y: g.y, z: g.z });
    for (const alvo of s.jogs.values()) {
      if (!alvo.vivo) continue; if (alvo !== dono && !inimigos(s, dono, alvo)) continue;
      const c = { x: alvo.x, y: alvo.y + 1, z: alvo.z }, dist = Math.hypot(c.x - g.x, c.y - g.y, c.z - g.z);
      if (dist > A.gr.raio) continue;
      const dir = { x: (c.x - g.x) / dist, y: (c.y - g.y) / dist, z: (c.z - g.z) / dist };
      if (G.raioMapa(mapa, { x: g.x, y: g.y + 0.1, z: g.z }, dir, dist) < dist - 0.3) continue; // atrás da parede
      dano(s, alvo, dono, A.gr.dano * (1 - dist / A.gr.raio) * (alvo === dono ? 0.5 : 1), 'gr', false);
    }
    return false;
  });
}

/* ---------- bots ---------- */
function celula(gr, x, z) { return [Math.max(0, Math.min(gr.nx - 1, Math.floor((x + gr.W) / gr.cel))), Math.max(0, Math.min(gr.nz - 1, Math.floor((z + gr.D) / gr.cel)))]; }
function caminhar(gr, ax, az, bx, bz) { // A* simples na grade
  const [si, sk] = celula(gr, ax, az), [ei, ek] = celula(gr, bx, bz), N = gr.nx * gr.nz, ini = si + sk * gr.nx, fim = ei + ek * gr.nx;
  if (!gr.livre[fim]) return null;
  const g = new Float32Array(N).fill(1e9), de = new Int32Array(N).fill(-1), aberto = [ini], fechado = new Uint8Array(N); g[ini] = 0;
  const h = i => Math.abs(i % gr.nx - ei) + Math.abs(Math.floor(i / gr.nx) - ek);
  let passos = 0;
  while (aberto.length && passos++ < 4000) {
    let bi = 0; for (let i = 1; i < aberto.length; i++) if (g[aberto[i]] + h(aberto[i]) < g[aberto[bi]] + h(aberto[bi])) bi = i;
    const cur = aberto.splice(bi, 1)[0]; if (cur === fim) break; fechado[cur] = 1;
    const ci = cur % gr.nx, ck = Math.floor(cur / gr.nx);
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ni = ci + di, nk = ck + dk; if (ni < 0 || nk < 0 || ni >= gr.nx || nk >= gr.nz) continue;
      const n = ni + nk * gr.nx; if (!gr.livre[n] || fechado[n]) continue;
      if (gr.alt && Math.abs(gr.alt[n] - gr.alt[cur]) > 1.0) continue; // não pula do andar de cima nem sobe parede
      if (di && dk && (!gr.livre[ci + di + ck * gr.nx] || !gr.livre[ci + (ck + dk) * gr.nx])) continue;
      const custo = g[cur] + (di && dk ? 1.414 : 1); if (custo < g[n]) { g[n] = custo; de[n] = cur; if (!aberto.includes(n)) aberto.push(n); }
    }
  }
  if (de[fim] < 0 && fim !== ini) return null;
  const cam = []; for (let c = fim; c !== -1 && c !== ini; c = de[c]) cam.unshift({ x: -gr.W + (c % gr.nx + 0.5) * gr.cel, z: -gr.D + (Math.floor(c / gr.nx) + 0.5) * gr.cel });
  return cam;
}
function vejo(s, a, b) {
  const o = { x: a.x, y: G.olho(a), z: a.z }, alvo = { x: b.x, y: b.y + 1.3, z: b.z }, d = Math.hypot(alvo.x - o.x, alvo.y - o.y, alvo.z - o.z);
  return G.raioMapa(G.MAPAS[s.mapa], o, { x: (alvo.x - o.x) / d, y: (alvo.y - o.y) / d, z: (alvo.z - o.z) / d }, d) >= d - 0.2;
}
function objetivoBot(s, b) {
  const P = s.partida, L = G.MAPAS[s.mapa].locais; if (s.modo !== 'bomba' || !L) return null;
  if (P.bomba && P.bomba.estado === 'plantada') return b.time === 'b' ? { x: P.bomba.x, z: P.bomba.z, bomba: true } : (Math.random() < 0.6 ? { x: P.bomba.x + (Math.random() - 0.5) * 6, z: P.bomba.z + (Math.random() - 0.5) * 6 } : null);
  if (b.time === 'r') {
    if (P.portador === b.id) { const l = L[P.localAtaque]; return { x: l[0], z: l[1], local: true }; }
    if (P.bomba && P.bomba.estado === 'caiu') return { x: P.bomba.x, z: P.bomba.z };
    if (Math.random() < 0.65) { const l = L[P.localAtaque]; return { x: l[0] + (Math.random() - 0.5) * 5, z: l[1] + (Math.random() - 0.5) * 5 }; }
    return null;
  }
  if (Math.random() < 0.55) { b.guarda = b.guarda || (Math.random() < 0.5 ? 'A' : 'B'); const l = L[b.guarda]; return { x: l[0] + (Math.random() - 0.5) * 6, z: l[1] + (Math.random() - 0.5) * 6 }; }
  return null;
}
function pensarBot(s, b, dt) {
  if (!b.vivo) return;
  const P = s.partida, mapa = G.MAPAS[s.mapa];
  if (P.fase === 'pausa') return;
  if (b.acao) { G.mover(mapa, b, 0, 0, dt); return; } // plantando / desarmando: fica parado
  // missão bomba: plantar e desarmar quando estiver no lugar e sem inimigo à vista
  if (s.modo === 'bomba' && !b.alvoId) {
    if (P.portador === b.id && localEm(s, b.x, b.z)) { acaoBomba(s, b, 'plantar', true); if (b.acao) return; }
    if (b.time === 'b' && P.bomba && P.bomba.estado === 'plantada' && Math.hypot(b.x - P.bomba.x, b.z - P.bomba.z) < 1.3) { acaoBomba(s, b, 'desarmar', true); if (b.acao) return; }
  }
  b.botT -= dt;
  // escolhe alvo visível mais perto
  if (b.botT <= 0) {
    b.botT = 0.25; let melhor = null, md = 1e9;
    for (const o of s.jogs.values()) { if (!o.vivo || !inimigos(s, b, o)) continue; const d = Math.hypot(o.x - b.x, o.z - b.z); if (d < md && d < 45 && vejo(s, b, o)) { md = d; melhor = o; } }
    if (melhor && melhor.id !== b.alvoId) { b.alvoId = melhor.id; b.reacao = 0.35 + Math.random() * 0.4; }
    if (!melhor) b.alvoId = null;
    const urg = s.modo === 'bomba' && ((P.bomba && P.bomba.estado === 'plantada' && b.time === 'b' && b.ultObj !== 'plantada') || (P.portador === b.id && b.ultObj !== 'portador'));
    if (urg) { b.caminho = null; b.ultObj = P.portador === b.id ? 'portador' : 'plantada'; }
    if (!b.caminho || !b.caminho.length || Math.random() < 0.02) { // anda até um inimigo (ou ponto aleatório)
      let dest = objetivoBot(s, b); const vivos = [...s.jogs.values()].filter(o => o.vivo && inimigos(s, b, o));
      if (dest) {} else if (vivos.length && Math.random() < 0.7) { const o = vivos[Math.floor(Math.random() * vivos.length)]; dest = { x: o.x, z: o.z }; }
      else dest = { x: (Math.random() * 2 - 1) * mapa.lim[0] * 0.8, z: (Math.random() * 2 - 1) * mapa.lim[1] * 0.8 };
      b.caminho = caminhar(P.grade, b.x, b.z, dest.x, dest.z) || [];
    }
  }
  const alvo = b.alvoId && s.jogs.get(b.alvoId);
  let mx = 0, mz = 0;
  if (alvo && alvo.vivo) {
    const dx = alvo.x - b.x, dz = alvo.z - b.z, dy = (alvo.y + 1.3) - G.olho(b), dist = Math.hypot(dx, dz);
    const yawAlvo = Math.atan2(-dx, -dz), pitchAlvo = Math.atan2(dy, dist);
    let dif = yawAlvo - b.yaw; while (dif > Math.PI) dif -= Math.PI * 2; while (dif < -Math.PI) dif += Math.PI * 2;
    b.yaw += dif * Math.min(1, dt * 7); b.pitch += (pitchAlvo - b.pitch) * Math.min(1, dt * 7);
    b.reacao -= dt;
    // anda de lado enquanto atira
    b.lado = b.lado || 1; if (Math.random() < dt * 0.8) b.lado *= -1;
    mx = Math.cos(b.yaw) * b.lado * 0.6; mz = -Math.sin(b.yaw) * b.lado * 0.6;
    const perto = A[b.arma].tipo === 'faca' ? 1.3 : 18;
    if (dist > perto) { mx += -Math.sin(b.yaw) * (perto < 2 ? 1.1 : 0.8); mz += -Math.cos(b.yaw) * (perto < 2 ? 1.1 : 0.8); if (perto < 2) { mx *= 0.9; } }
    const arma = A[b.arma];
    if (b.reacao <= 0 && Math.abs(dif) < 0.15 && (arma.tipo !== 'faca' || dist < 1.9)) {
      if (arma.tipo !== 'faca' && b.mun[b.arma] && b.mun[b.arma].pente <= 0) { if (agora() > b.recarregandoAte) { const m = b.mun[b.arma], q = Math.min(arma.pente, m.reserva || arma.pente); m.pente = q; m.reserva = Math.max(0, m.reserva - q); b.recarregandoAte = agora() + arma.recarga * 1000; } }
      else if (agora() - b.ultTiro > arma.cadencia * 1000 * (arma.auto ? 1.6 : 1.2)) {
        const erro = 0.035 + dist * 0.0012, d = G.dirDe(b.yaw + (Math.random() - 0.5) * erro, b.pitch + (Math.random() - 0.5) * erro);
        const chumbos = arma.chumbos ? Array.from({ length: arma.chumbos }, () => G.dirDe(b.yaw + (Math.random() - 0.5) * arma.disp * 2, b.pitch + (Math.random() - 0.5) * arma.disp * 2)) : null;
        atirar(s, b, d, chumbos);
      }
    }
  } else if (b.caminho && b.caminho.length) {
    const p = b.caminho[0], dx = p.x - b.x, dz = p.z - b.z, d = Math.hypot(dx, dz);
    if (d < 0.6) b.caminho.shift(); else { mx = dx / d; mz = dz / d; b.yaw += ((Math.atan2(-dx, -dz) - b.yaw + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 6); b.pitch *= 0.9; }
  }
  const vel = R.VEL * 0.9, antX = b.x, antZ = b.z;
  G.mover(mapa, b, mx * vel * dt, mz * vel * dt, dt);
  if (Math.hypot(b.x - antX, b.z - antZ) < 0.001 && (mx || mz)) { b.preso = (b.preso || 0) + dt; if (b.preso > 0.6) { b.caminho = null; b.preso = 0; if (b.noChao) b.vy = R.PULO; } } else b.preso = 0;
}

/* ---------- laço ---------- */
let ultimo = agora(), acum = 0;
setInterval(() => {
  const t = agora(), dt = Math.min(0.1, (t - ultimo) / 1000); ultimo = t; acum += dt;
  for (const s of salas.values()) {
    if (s.estado !== 'jogo' || !s.partida || s.partida.terminou) continue;
    for (const j of s.jogs.values()) {
      if (!j.vivo && j.renasceEm && t >= j.renasceEm) { renascer(s, j); paraSala(s, { t: 'nasceu', id: j.id, x: j.x, y: j.y, z: j.z }); if (!j.bot) env(j, { t: 'mun', mun: j.mun, arma: j.arma, granadas: j.granadas }); }
      if (j.bot) pensarBot(s, j, dt);
    }
    passoGranadas(s, dt);
    vencerDrops(s);
    if (G.porRodada(s.modo)) passoRodada(s, t);
    if (t >= s.partida.fim) terminarPartida(s, 'tempo');
  }
  if (acum >= 1 / R.ENVIO) {
    acum = 0;
    for (const s of salas.values()) {
      if (s.estado !== 'jogo' || !s.partida) continue;
      paraSala(s, { t: 'q', j: [...s.jogs.values()].map(j => [j.id, +j.x.toFixed(2), +j.y.toFixed(2), +j.z.toFixed(2), +j.yaw.toFixed(2), +j.pitch.toFixed(2), j.vivo ? 1 : 0, j.agachado ? 1 : 0, j.arma, Math.round(j.vida), j.kills, j.mortesP]) });
    }
  }
}, 1000 / R.TICK);

/* ---------- mensagens ---------- */
function receber(c, m) {
  const s = c.sala;
  // antes de entrar na conta só valem as mensagens de login
  if (!c.nome && !['registrar', 'login', 'token', 'ola', 'salas'].includes(m.t)) return;
  if (!dadosProntos && ['registrar', 'login', 'token', 'ola'].includes(m.t)) return env(c, { t: 'conta_erro', txt: 'Servidor iniciando… tente em alguns segundos.' });
  switch (m.t) {
    case 'registrar': {
      if (tentativaDemais(c)) return env(c, { t: 'conta_erro', txt: 'Muitas tentativas. Espere um minuto.' });
      const u = String(m.usuario || '').trim(), senha = String(m.senha || ''), k = u.toLowerCase();
      if (!usuarioValido(u)) return env(c, { t: 'conta_erro', txt: 'Usuário: 3 a 14 letras ou números (pode _ . -)' });
      if (senha.length < 4 || senha.length > 40) return env(c, { t: 'conta_erro', txt: 'A senha precisa ter de 4 a 40 caracteres' });
      if (contas[k]) return env(c, { t: 'conta_erro', txt: 'Esse usuário já existe. Escolha outro.' });
      const sal = crypto.randomBytes(16).toString('hex'), conta = { nome: u, sal, hash: hashSenha(senha, sal), cod: 'u_' + k, criada: agora(), tokens: [] };
      // leva o progresso que o aparelho já tinha (XP de antes das contas)
      const antigo = limpaTexto(m.cod, 40);
      if (antigo && perfis[antigo] && !perfis[antigo].conta && !perfis[conta.cod]) { perfis[conta.cod] = Object.assign({}, perfis[antigo]); perfis[antigo].conta = k; salvar(); }
      contas[k] = conta; salvarContas(); perfil(conta.cod); salvar();
      entrarConta(c, k, m.lembrar ? novoToken(conta) : null); break;
    }
    case 'login': {
      if (tentativaDemais(c)) return env(c, { t: 'conta_erro', txt: 'Muitas tentativas. Espere um minuto.' });
      const k = String(m.usuario || '').trim().toLowerCase(), conta = contas[k];
      const ok = conta && crypto.timingSafeEqual(Buffer.from(hashSenha(m.senha || '', conta.sal), 'hex'), Buffer.from(conta.hash, 'hex'));
      if (!ok) return env(c, { t: 'conta_erro', txt: 'Usuário ou senha errados' });
      entrarConta(c, k, m.lembrar ? novoToken(conta) : null); break;
    }
    case 'token': { const k = contaPorToken(m.token); if (!k) return env(c, { t: 'conta_erro', txt: 'Sessão expirada. Entre de novo.', token: true }); entrarConta(c, k, null); break; }
    case 'sairConta': {
      if (c.conta && contas[c.conta] && m.token) { contas[c.conta].tokens = (contas[c.conta].tokens || []).filter(h => h !== hashToken(m.token)); salvarContas(); }
      sairSala(c); c.conta = null; c.nome = null; c.cod = null; env(c, { t: 'saiuConta' }); break;
    }
    case 'ola': c.cod = limpaTexto(m.cod, 40) || ('c' + c.id); c.nome = limpaNome(m.nome); env(c, { t: 'bemvindo', id: c.id, perfil: perfilPublico(c), salas: listaSalas() }); break;
    case 'salas': env(c, { t: 'salas', salas: listaSalas() }); break;
    case 'criar': { if (!c.nome) return; const ns = criarSala(c, m); entrarSala(c, ns); break; }
    case 'entrar': { const ns = salas.get(m.id | 0); if (!ns) return env(c, { t: 'erro', txt: 'Sala não existe mais' }); if (ns.jogs.size >= ns.max) return env(c, { t: 'erro', txt: 'Sala cheia' }); if (ns.senha && ns.senha !== m.senha && !(ns.convidados && ns.convidados.has(c.conta))) return env(c, { t: 'erro', txt: 'Senha errada' }); entrarSala(c, ns); break; }
    case 'rapida': { // partida rápida: entra em sala aberta ou cria uma com bots
      const livre = [...salas.values()].find(x => !x.senha && x.jogs.size < x.max); if (livre) entrarSala(c, livre);
      else { const ns = criarSala(c, { nome: 'Partida Rápida', modo: 'time', mapa: (function () { var k = Object.keys(G.MAPAS); return k[Math.floor(Math.random() * k.length)]; })(), bots: 7, meta: 50, tempo: 10 }); entrarSala(c, ns); iniciarPartida(ns); }
      break; }
    case 'sair': sairSala(c); env(c, { t: 'salas', salas: listaSalas() }); env(c, { t: 'perfil', perfil: perfilPublico(c) }); break;
    case 'time': if (s && s.estado === 'espera' && (m.time === 'r' || m.time === 'b')) { c.time = m.time; atualizarSala(s); } break;
    case 'pronto': if (s && s.estado === 'espera') { c.pronto = !c.pronto; atualizarSala(s); } break;
    case 'arma': if (G.ARMAS[m.arma] && G.ARMAS[m.arma].slot === 1 && temArma(c, m.arma)) { c.primaria = m.arma; if (s) atualizarSala(s); } break;
    case 'colete': { if (!c.cod) return; const p = perfil(c.cod); if (m.id === null || (G.COLETES[m.id] && p.armas.includes(m.id))) { p.colete = m.id; salvar(); env(c, { t: 'perfil', perfil: perfilPublico(c) }); if (s) atualizarSala(s); } break; }
    case 'skin': { if (!c.cod) return; const p = perfil(c.cod); if (m.id === null || (G.SKINS[m.id] && p.armas.includes(m.id))) { p.skin = m.id; salvar(); env(c, { t: 'perfil', perfil: perfilPublico(c) }); if (s) atualizarSala(s); } break; }
    case 'ranking': case 'amigos': case 'amigoAdd': case 'amigoAceitar': case 'amigoRecusar': case 'amigoRemover': case 'convidar': case 'cla': case 'claCriar': case 'claEntrar': case 'claSair': social_(c, m); break;
    case 'missaoPegar': { if (!c.cod) return; const p = perfil(c.cod), ms = missoesDe(p, c.cod), m2 = ms.lista.find(x => x.id === m.id), def = MISSOES.find(x => x.id === m.id);
      if (m2 && def && !m2.pego && m2.prog >= def.alvo) { m2.pego = true; p.moedas += def.premio; salvar(); env(c, { t: 'premio', moedas: def.premio, txt: def.txt }); env(c, { t: 'perfil', perfil: perfilPublico(c) }); } break; }
    case 'bonusPegar': { if (!c.cod) return; const p = perfil(c.cod), bn = bonusDe(p); if (!bn) return; p.bonus = { ultimo: hoje(), seq: bn.seq }; p.moedas += bn.premio; salvar(); env(c, { t: 'premio', moedas: bn.premio, txt: 'Bônus diário · dia ' + bn.seq }); env(c, { t: 'perfil', perfil: perfilPublico(c) }); break; }
    case 'comprar': {
      const a = G.item(m.arma); if (!a || !G.LOJA.includes(m.arma) || !c.cod) return;
      const p = perfil(c.cod);
      if (p.armas.includes(m.arma)) return env(c, { t: 'erro', txt: 'Você já tem esse item' });
      if (p.moedas < a.preco) return env(c, { t: 'erro', txt: 'Moedas insuficientes: faltam ' + (a.preco - p.moedas) });
      p.moedas -= a.preco; p.armas.push(m.arma); if (G.COLETES[m.arma]) p.colete = m.arma; if (G.SKINS[m.arma]) p.skin = m.arma; salvar();
      env(c, { t: 'comprou', arma: m.arma }); env(c, { t: 'perfil', perfil: perfilPublico(c) }); break;
    }
    case 'config': if (s && s.dono === c.id && s.estado === 'espera') {
      if (G.MAPAS[m.mapa]) s.mapa = m.mapa; if (G.MODOS[m.modo]) s.modo = m.modo;
      if ([30, 50, 80, 100, 160].includes(m.meta | 0)) s.meta = m.meta | 0; if ([5, 10, 15, 20].includes(m.tempo | 0)) s.tempo = m.tempo | 0;
      if (m.bots != null) s.bots = Math.max(0, Math.min(14, m.bots | 0)); atualizarSala(s);
    } break;
    case 'iniciar': if (s && s.dono === c.id && s.estado === 'espera') iniciarPartida(s); break;
    case 'chat': if (s) { const txt = limpaTexto(m.txt, 120); if (txt) paraSala(s, { t: 'chat', nome: c.nome, time: c.time, txt }); } break;
    case 'pos': if (s && s.estado === 'jogo' && c.vivo) {
      const x = +m.x, y = +m.y, z = +m.z; if (![x, y, z, +m.yaw, +m.pitch].every(Number.isFinite)) return;
      // anti-trapaça simples: não deixa andar rápido demais nem atravessar parede
      const dist = Math.hypot(x - c.x, z - c.z), dtp = Math.max(0.05, (agora() - (c.tPos || 0)) / 1000); c.tPos = agora();
      if (dist > R.VEL * 1.6 * dtp + 1.2 || G.colide(G.MAPAS[s.mapa], x, y, z, m.ag ? R.ALTURA_AGACHADO : R.ALTURA)) { env(c, { t: 'corrigir', x: c.x, y: c.y, z: c.z }); return; }
      c.x = x; c.y = y; c.z = z; c.yaw = +m.yaw; c.pitch = Math.max(-1.5, Math.min(1.5, +m.pitch)); c.agachado = !!m.ag;
    } break;
    case 'pegar': if (s && s.partida) pegarArma(s, c, m.id); break;
    case 'trocar': if (s && c.vivo && (s.modo === 'faca' ? m.arma === 'faca' : s.modo === 'sniper' ? (m.arma === (c.armaPega || c.primariaModo) || m.arma === 'faca') : (m.arma === (c.armaPega || c.primariaModo || c.primaria) || m.arma === 'p9' || m.arma === 'faca' || m.arma === 'gr'))) { c.arma = m.arma; } break;
    case 'acao': if (s && s.estado === 'jogo') acaoBomba(s, c, m.tipo, !!m.on); break;
    case 'tiro': if (s && s.estado === 'jogo' && m.d) { if (+m.yaw === +m.yaw) c.yaw = +m.yaw; atirar(s, c, m.d, m.c); } break;
    case 'recarregar': if (s && c.vivo) { const a = A[c.arma], mu = c.mun[c.arma]; if (a && mu && mu.pente < a.pente && mu.reserva > 0 && agora() > c.recarregandoAte) { c.recarregandoAte = agora() + a.recarga * 1000; setTimeout(() => { const q = Math.min(a.pente - mu.pente, mu.reserva); mu.pente += q; mu.reserva -= q; }, a.recarga * 1000 - 50); } } break;
    case 'granada': if (s && s.estado === 'jogo' && m.d) lancarGranada(s, c, m.d); break;
    case 'perfil': env(c, { t: 'perfil', perfil: perfilPublico(c) }); break;
  }
}

/* ---------- servidor ---------- */
function iniciar(porta) {
  const server = http.createServer((req, res) => {
    let u = decodeURIComponent((req.url || '/').split('?')[0]); if (u === '/') u = '/index.html';
    if (u === '/saude') { res.writeHead(200); return res.end('ok'); }
    if (!LIBERADOS.has(u)) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('não encontrado'); }
    fs.readFile(path.join(PUB, u), (e, d) => {
      if (e) { res.writeHead(500); return res.end(); }
      const cab = { 'Content-Type': TIPOS[path.extname(u)] || 'application/octet-stream', 'Cache-Control': u.startsWith('/modelos/') ? 'public, max-age=86400' : 'no-cache' };
      if (d.length > 20000 && !/\.(jpg|png|mp3)$/.test(u) && /gzip/.test(req.headers['accept-encoding'] || '')) { cab['Content-Encoding'] = 'gzip'; res.writeHead(200, cab); if (!GZ.has(u)) GZ.set(u, zlib.gzipSync(d)); return res.end(GZ.get(u)); }
      res.writeHead(200, cab); res.end(d);
    });
  });
  const wss = new WebSocketServer({ server, maxPayload: 8192 });
  wss.on('connection', ws => {
    const c = { id: nId++, ws, nome: null, sala: null, primaria: 'ar9', kills: 0, mortesP: 0, hs: 0, msgs: 0, janela: agora() };
    clientes.set(c.id, c);
    ws.on('message', raw => {
      if (agora() - c.janela > 1000) { c.janela = agora(); c.msgs = 0; } if (++c.msgs > 90) return; // limite de mensagens
      let m; try { m = JSON.parse(raw); } catch (e) { return; } if (m && typeof m.t === 'string') { try { receber(c, m); } catch (e) { console.error(e); } }
    });
    ws.on('close', () => { sairSala(c); clientes.delete(c.id); if (c.conta) avisarAmigos(c.conta); });
  });
  server.listen(porta, () => console.log(G.NOME + ' na porta ' + porta));
  return server;
}
// Render manda SIGTERM antes de desligar: grava o que estiver pendente
['SIGTERM', 'SIGINT'].forEach(sig => process.on(sig, () => { ARM.descarregar().finally(() => process.exit(0)); setTimeout(() => process.exit(0), 8000); }));
module.exports = { iniciar, salas, carregamento, _perfil: c => perfil(c), _dano: (s, a, q, n, arma, cab) => dano(s, a, q, n, arma, cab) };
if (require.main === module) iniciar(process.env.PORT || 3000);
