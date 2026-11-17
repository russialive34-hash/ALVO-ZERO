/* QUEDA LIVRE — servidor: trem voador, pulo, loot, tiros, parede de gelo, zona e bots. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { WebSocketServer } = require('ws');
const G = require('../public/shared/regras.js');
const R = G.R, A = G.ARMAS;

const PUB = path.join(__dirname, '..', 'public');
const DADOS = path.join(__dirname, '..', 'data');
const TIPOS = { '.jpg': 'image/jpeg', '.json': 'application/json', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const LIBERADOS = new Set(['/index.html', '/style.css', '/jogo.js', '/som.js', '/armas.js', '/boneco.js', '/mundo.js', '/shared/regras.js', '/vendor/three.min.js', '/icone.svg', '/offline.html']);
const TICK = 20, ENVIO = 12, TOTAL = 20;
const EST = ['cabine', 'trem', 'ar', 'para', 'chao', 'morto'];
const MUN_MAX = { leve: 240, media: 240, cartucho: 50, pesada: 40 };
const RECARGA = { pistola: 1.4, smg: 1.8, fuzil: 2.2, escopeta: 2.8, sniper: 2.8, mao: 0 };
const NOMES_BOT = ['Tubarão', 'Kaiju', 'Ninja_BR', 'Faísca', 'Lobo', 'Raio', 'Vulto', 'Corvo', 'Pantera', 'Sombra', 'Trovão', 'Cobra', 'Fênix', 'Gavião', 'Titã', 'Jaguar', 'Zé_Bala', 'Rajada', 'Furacão', 'Neon', 'Brasa', 'Capivara', 'Mamute', 'Tornado'];

/* ---------- ranking ---------- */
let ranking = [];
try { ranking = JSON.parse(fs.readFileSync(path.join(DADOS, 'ranking.json'), 'utf8')); } catch (e) { ranking = []; }
let salvarT = null;
function pontuar(nome, venceu, kills) {
  let r = ranking.find(x => x.nome === nome); if (!r) { r = { nome, vitorias: 0, kills: 0, jogos: 0 }; ranking.push(r); }
  r.jogos++; r.kills += kills; if (venceu) r.vitorias++;
  ranking.sort((a, b) => b.vitorias - a.vitorias || b.kills - a.kills); ranking = ranking.slice(0, 50);
  clearTimeout(salvarT); salvarT = setTimeout(() => { try { fs.mkdirSync(DADOS, { recursive: true }); fs.writeFileSync(path.join(DADOS, 'ranking.json'), JSON.stringify(ranking)); } catch (e) {} }, 1000);
}

/* ---------- grade de caminhos (bots) ---------- */
const CEL = 2;
function criarGrade(I) {
  const N = Math.floor(R.MEIO * 2 / CEL) + 1, livre = new Uint8Array(N * N);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const x = i * CEL - R.MEIO, z = j * CEL - R.MEIO, h = G.altura(I, x, z); livre[j * N + i] = h > -9 && G.livre(I, x, z, 0.45, Math.max(h, -1.1)) ? 1 : 0; }
  return { N, livre };
}
function cel(gr, x, z) { const i = Math.round((x + R.MEIO) / CEL), j = Math.round((z + R.MEIO) / CEL); return i < 0 || j < 0 || i >= gr.N || j >= gr.N ? -1 : j * gr.N + i; }
function perto(gr, c) { if (c >= 0 && gr.livre[c]) return c; if (c < 0) return -1; const N = gr.N, ci = c % N, cj = (c / N) | 0; for (let r = 1; r < 6; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) { const i = ci + a, j = cj + b; if (i >= 0 && j >= 0 && i < N && j < N && gr.livre[j * N + i]) return j * N + i; } return -1; }
function caminho(gr, ax, az, bx, bz) {
  const N = gr.N, ini = perto(gr, cel(gr, ax, az)), fim = perto(gr, cel(gr, bx, bz)); if (ini < 0 || fim < 0) return null; if (ini === fim) return [{ x: bx, z: bz }];
  const g = new Map(), veio = new Map(), fechado = new Set(), heap = [], fi = fim % N, fj = (fim / N) | 0;
  const h = c => { const dx = Math.abs(c % N - fi), dz = Math.abs(((c / N) | 0) - fj); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  const por = (c, f) => { heap.push([f, c]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const tirar = () => { const t = heap[0], u = heap.pop(); if (heap.length) { heap[0] = u; let k = 0; for (;;) { const a = 2 * k + 1, b = a + 1; let m = k; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return t; };
  g.set(ini, 0); por(ini, h(ini)); let n = 0, achou = false;
  while (heap.length && n++ < 30000) {
    const c = tirar()[1]; if (c === fim) { achou = true; break; } if (fechado.has(c)) continue; fechado.add(c);
    const ci = c % N, cj = (c / N) | 0, gc = g.get(c);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      if (!a && !b) continue; const i = ci + a, j = cj + b; if (i < 0 || j < 0 || i >= N || j >= N) continue; const v = j * N + i;
      if (!gr.livre[v] || fechado.has(v)) continue; if (a && b && (!gr.livre[cj * N + i] || !gr.livre[j * N + ci])) continue;
      const ng = gc + (a && b ? 1.414 : 1); if (ng < (g.has(v) ? g.get(v) : 1e9)) { g.set(v, ng); veio.set(v, c); por(v, ng + h(v)); }
    }
  }
  if (!achou) return null;
  const l = []; for (let c = fim; c !== ini && c !== undefined; c = veio.get(c)) l.push({ x: (c % N) * CEL - R.MEIO, z: ((c / N) | 0) * CEL - R.MEIO });
  l.reverse(); if (l.length) l[l.length - 1] = { x: bx, z: bz }; return l;
}

/* ---------- partidas ---------- */
const partidas = new Map(); let nP = 1, nId = 1, nItem = 1, nGelo = 1;
function enviar(j, m) { if (j.ws && j.ws.readyState === 1) j.ws.send(typeof m === 'string' ? m : JSON.stringify(m)); }
function difundir(p, m) { const t = JSON.stringify(m); for (const j of p.js.values()) enviar(j, t); }
function ev(p, e, x) { difundir(p, Object.assign({ t: 'ev', e }, x || {})); }
function novaPartida() { const p = { id: nP++, js: new Map(), estado: 'espera', conta: R.ESPERA, tempo: 0 }; partidas.set(p.id, p); return p; }
function partidaLivre() { for (const p of partidas.values()) if (p.estado === 'espera' && [...p.js.values()].filter(j => !j.bot).length < R.MAX_JOG) return p; return novaPartida(); }
function novoJog(p, ws, nome, roupa, bot) {
  const j = { id: nId++, ws, nome, roupa: roupa | 0, bot: !!bot, partida: p, x: (Math.random() - 0.5) * 3, y: 0, z: (Math.random() - 0.5) * 20, ry: 0, pi: 0, est: 'cabine', hp: R.VIDA, armas: [null, null], ativa: -1, mun: { leve: 0, media: 0, cartucho: 0, pesada: 0 }, colete: { nv: 0, dur: 0 }, capacete: { nv: 0, dur: 0 }, kits: 0, gelos: 0, miras: {}, kills: 0, ag: 0, fl: 0, ultTiro: 0, recarga: 0, cura: 0, tPos: 0, rank: 0, dano: 0 };
  p.js.set(j.id, j); return j;
}
function lista(p) { return [...p.js.values()].map(j => ({ id: j.id, nome: j.nome, roupa: j.roupa, bot: j.bot })); }

function comecar(p) {
  p.estado = 'voo'; p.seed = (Math.random() * 1e9) | 0; p.I = G.gerar(p.seed); p.grade = criarGrade(p.I);
  // completa com bots
  const humanos = [...p.js.values()].filter(j => !j.bot).length;
  for (let k = humanos; k < Math.max(TOTAL, humanos); k++) novoJog(p, null, NOMES_BOT[(k * 7 + p.seed) % NOMES_BOT.length] + (k > 23 ? k : ''), (Math.random() * 6) | 0, true);
  // loot
  const r = G.rng(p.seed + 1); p.itens = new Map();
  p.I.loot.forEach(l => { const its = G.sortearLoot(r, l.rico); its.forEach((it, k) => { const id = nItem++; p.itens.set(id, Object.assign({ id, x: +(l.x + k * 0.6).toFixed(2), y: +l.y.toFixed(2), z: +l.z.toFixed(2) }, it)); }); });
  p.gelos = new Map(); p.dropsCaindo = []; p.nDropFeito = 0;
  // rota do trem: atravessa a ilha
  const a = Math.random() * Math.PI * 2, off = (Math.random() - 0.5) * 120, L = 340;
  const nx = -Math.sin(a), nz = Math.cos(a);
  p.trem = { x0: Math.cos(a) * L + nx * off, z0: Math.sin(a) * L + nz * off, x1: -Math.cos(a) * L + nx * off, z1: -Math.sin(a) * L + nz * off, t: 0 };
  p.trem.dur = Math.hypot(p.trem.x1 - p.trem.x0, p.trem.z1 - p.trem.z0) / R.TREM_VEL; p.trem.ry = Math.atan2(p.trem.x1 - p.trem.x0, p.trem.z1 - p.trem.z0);
  // zona
  p.zona = { fase: -1, est: 'espera', t: 50, c: { x: 0, z: 0, r: 330 }, prox: { x: 0, z: 0, r: 330 }, de: null };
  proximaZona(p); if (process.env.QL_TESTE) p.zona.t = 600;
  for (const j of p.js.values()) {
    Object.assign(j, { est: 'trem', hp: R.VIDA, y: R.TREM_ALT });
    if (j.bot) { const alvo = p.I.loot[(Math.random() * p.I.loot.length) | 0]; const tr = p.trem, dx = tr.x1 - tr.x0, dz = tr.z1 - tr.z0, L2 = dx * dx + dz * dz; let u = ((alvo.x - tr.x0) * dx + (alvo.z - tr.z0) * dz) / L2; u = Math.max(0.15, Math.min(0.85, u + (Math.random() - 0.5) * 0.1)); j.ia = { pular: u * tr.dur, alvo: { x: alvo.x, z: alvo.z }, cam: null, rep: 0, mira: null, vis: 0, prox: 0, erro: 0, estado: 'ar', tVer: 0 }; }
  }
  p.vivosIni = p.js.size;
  difundir(p, { t: 'inicio', seed: p.seed, trem: p.trem, js: lista(p), itens: [...p.itens.values()] });
}
function proximaZona(p) {
  const z = p.zona; z.fase++; if (z.fase >= G.ZONA.length) { z.est = 'fim'; return; }
  const [espera, , raio] = G.ZONA[z.fase], base = z.prox; let cx, cz;
  const folga = Math.max(0, base.r - raio);
  for (let k = 0; k < 30; k++) { const a = Math.random() * Math.PI * 2, d = Math.random() * folga * (z.fase === 0 ? 0.5 : 0.85); cx = base.x + Math.cos(a) * d; cz = base.z + Math.sin(a) * d; if (z.fase > 0 || G.altura(p.I, cx, cz) > 1) break; }
  z.c = { x: base.x, z: base.z, r: base.r }; z.prox = { x: cx, z: cz, r: raio }; z.est = 'espera'; z.t = espera;
  if (z.fase > 0) ev(p, 'zona', { fase: z.fase });
}
function zonaAgora(p) { const z = p.zona; if (z.est !== 'fecha') return z.c; const f = 1 - z.t / G.ZONA[z.fase][1]; return { x: z.c.x + (z.prox.x - z.c.x) * f, z: z.c.z + (z.prox.z - z.c.z) * f, r: z.c.r + (z.prox.r - z.c.r) * f }; }
function posTrem(p) { const tr = p.trem, f = Math.min(1, tr.t / tr.dur); return { x: tr.x0 + (tr.x1 - tr.x0) * f, z: tr.z0 + (tr.z1 - tr.z0) * f }; }

/* ---------- itens ---------- */
function soltar(p, it, x, y, z) { const id = nItem++; const o = Object.assign({ id, x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2) }, it); p.itens.set(id, o); ev(p, 'item+', { it: o }); return o; }
function pegar(p, j, id) {
  const it = p.itens.get(id); if (!it || j.est !== 'chao' || Math.hypot(it.x - j.x, it.z - j.z) > 3.2) return false;
  const usado = aplicar(p, j, it); if (!usado) return false;
  p.itens.delete(id); ev(p, 'item-', { id, por: j.id, tipo: it.tipo });
  return true;
}
function aplicar(p, j, it) {
  if (it.tipo === 'arma') {
    const nova = { a: it.arma, pente: it.pente !== undefined ? it.pente : A[it.arma].pente };
    let s = j.armas[0] === null ? 0 : j.armas[1] === null ? 1 : -1;
    if (s < 0) { s = j.ativa >= 0 ? j.ativa : 0; const velha = j.armas[s]; soltar(p, { tipo: 'arma', arma: velha.a, pente: velha.pente }, j.x + Math.sin(j.ry) * 0.8, j.y, j.z + Math.cos(j.ry) * 0.8); }
    j.armas[s] = nova; if (j.ativa < 0 || j.armas[j.ativa] === null) j.ativa = s; j.recarga = 0; return true;
  }
  if (MUN_MAX[it.tipo] !== undefined) { if (j.mun[it.tipo] >= MUN_MAX[it.tipo]) return false; j.mun[it.tipo] = Math.min(MUN_MAX[it.tipo], j.mun[it.tipo] + it.qtd); return true; }
  if (it.tipo === 'colete' || it.tipo === 'capacete') {
    const atual = j[it.tipo]; if (it.nv < atual.nv || (it.nv === atual.nv && atual.dur > G.DURAB[atual.nv] * 0.6)) return false;
    if (atual.nv > 0 && atual.dur > 10) soltar(p, { tipo: it.tipo, nv: atual.nv, dur: atual.dur }, j.x - Math.sin(j.ry) * 0.8, j.y, j.z - Math.cos(j.ry) * 0.8);
    j[it.tipo] = { nv: it.nv, dur: it.dur || G.DURAB[it.nv] }; return true;
  }
  if (it.tipo === 'kit') { if (j.kits >= 6) return false; j.kits = Math.min(6, j.kits + it.qtd); return true; }
  if (it.tipo === 'gelo') { if (j.gelos >= 10) return false; j.gelos = Math.min(10, j.gelos + it.qtd); return true; }
  if (it.tipo === 'moeda') { j.moedas = (j.moedas || 0) + it.qtd; return true; }
  if (/^mira/.test(it.tipo)) { const m = it.tipo.slice(4); if (j.miras[m]) return false; j.miras[m] = 1; return true; }
  return false;
}

/* ---------- dano e tiros ---------- */
function dano(p, alvo, base, cabeca, por, arma) {
  if (alvo.est === 'morto' || alvo.est === 'trem' || alvo.est === 'cabine') return 0;
  let d = base * (cabeca ? (arma === 'l7' ? 2.5 : 2) : 1);
  const prot = cabeca ? alvo.capacete : alvo.colete;
  if (prot.nv > 0 && prot.dur > 0) { const abs = d * G.PROTECAO[prot.nv]; prot.dur = Math.max(0, prot.dur - abs); d -= abs; if (prot.dur <= 0) prot.nv = 0; }
  d = Math.round(d); alvo.hp -= d; alvo.cura = 0; if (por) por.dano += d;
  if (por && por !== alvo) ev(p, 'dano', { a: alvo.id, por: por.id, v: d, hs: cabeca ? 1 : 0, hp: Math.max(0, alvo.hp) });
  if (alvo.bot && por && por !== alvo) { alvo.ia.atacante = por.id; alvo.ia.tAtaque = p.tempo; }
  if (alvo.hp <= 0) morrer(p, alvo, por, arma, cabeca);
  return d;
}
function morrer(p, j, por, arma, cabeca) {
  j.hp = 0; j.est = 'morto'; const vivos = [...p.js.values()].filter(o => o.est !== 'morto').length; j.rank = vivos + 1;
  if (por && por !== j) por.kills++;
  ev(p, 'morte', { a: j.id, por: por ? por.id : 0, arma: arma || 'zona', hs: cabeca ? 1 : 0, vivos, rank: j.rank });
  // larga tudo numa roda (a "caixa" do morto)
  const its = []; j.armas.forEach(w => { if (w) its.push({ tipo: 'arma', arma: w.a, pente: w.pente }); });
  Object.keys(j.mun).forEach(k => { if (j.mun[k] > 0) its.push({ tipo: k, qtd: j.mun[k] }); });
  if (j.colete.nv) its.push({ tipo: 'colete', nv: j.colete.nv, dur: j.colete.dur }); if (j.capacete.nv) its.push({ tipo: 'capacete', nv: j.capacete.nv, dur: j.capacete.dur });
  if (j.kits) its.push({ tipo: 'kit', qtd: j.kits }); if (j.gelos) its.push({ tipo: 'gelo', qtd: j.gelos });
  its.forEach((it, k) => { const a = k / its.length * Math.PI * 2; soltar(p, it, j.x + Math.cos(a) * 1.1, j.y, j.z + Math.sin(a) * 1.1); });
  ev(p, 'caixa', { x: j.x, y: j.y, z: j.z, nome: j.nome });
  j.armas = [null, null]; j.ativa = -1; j.mun = { leve: 0, media: 0, cartucho: 0, pesada: 0 }; j.kits = 0; j.gelos = 0;
  if (!j.bot) enviar(j, { t: 'morreu', rank: j.rank, kills: j.kills, por: por && por !== j ? por.nome : null, porId: por ? por.id : 0 });
  if (vivos <= 1) setTimeout(() => terminar(p), 1500);
}
// tiro de uma arma: devolve onde parou e quem acertou
function atirar(p, j, o, d, arma) {
  const w = A[arma], gelos = [...p.gelos.values()];
  const parede = G.raioMundo(p.I, o, d, w.alc, gelos);
  let alvo = null, tAlvo = parede, cab = false;
  for (const x of p.js.values()) {
    if (x === j || x.est === 'morto' || x.est === 'trem' || x.est === 'cabine') continue;
    if (Math.abs(x.x - o[0]) > w.alc + 2 || Math.abs(x.z - o[2]) > w.alc + 2) continue;
    const h = G.acertaCorpo(o, d, x, x.ag); if (h && h.t < tAlvo) { tAlvo = h.t; alvo = x; cab = h.cabeca; }
  }
  // parede de gelo levou o tiro
  if (!alvo) gelos.forEach(g => { if (g._hit) { g.hp -= w.dano * (w.chumbos ? 0.6 : 1); if (g.hp <= 0) quebrarGelo(p, g); else ev(p, 'geloDano', { id: g.id, hp: Math.round(g.hp) }); } g._hit = false; }); else gelos.forEach(g => { g._hit = false; });
  let v = 0;
  if (alvo) { const queda = tAlvo > w.alc * 0.5 ? 1 - 0.4 * (tAlvo - w.alc * 0.5) / (w.alc * 0.5) : 1; v = dano(p, alvo, w.dano * queda, cab, j, arma); }
  return { t: Math.min(tAlvo, w.alc), alvo, cab, v };
}
function disparar(p, j, o, d) {
  const w = j.ativa >= 0 && j.armas[j.ativa] ? j.armas[j.ativa] : null, arma = w ? w.a : 'soco', A0 = A[arma];
  if (p.tempo - j.ultTiro < A0.cad * 0.82 || j.recarga > 0 || j.est !== 'chao') return;
  if (w && w.pente <= 0) return;
  j.ultTiro = p.tempo; j.cura = 0; if (w) w.pente--;
  const n = A0.chumbos || 1, pts = [];
  for (let k = 0; k < n; k++) {
    let dd = d;
    if (n > 1) { const s = A0.disp; dd = [d[0] + (Math.random() - 0.5) * s * 2, d[1] + (Math.random() - 0.5) * s * 2, d[2] + (Math.random() - 0.5) * s * 2]; const l = Math.hypot(dd[0], dd[1], dd[2]); dd = dd.map(v => v / l); }
    const r = atirar(p, j, o, dd, arma); pts.push([+(o[0] + dd[0] * r.t).toFixed(2), +(o[1] + dd[1] * r.t).toFixed(2), +(o[2] + dd[2] * r.t).toFixed(2), r.alvo ? 1 : 0]);
  }
  ev(p, 'tiro', { j: j.id, a: arma, o: o.map(v => +v.toFixed(2)), p: pts });
}
// caixa de suprimentos que cai do céu
const DROP_T = [70, 190, 310];
function soltarDrop(p) {
  const z = p.zona.prox; let x = z.x, zz = z.z;
  for (let k = 0; k < 40; k++) { const a = Math.random() * Math.PI * 2, d = Math.random() * Math.max(5, z.r * 0.8); const tx = z.x + Math.cos(a) * d, tz = z.z + Math.sin(a) * d, h = G.altura(p.I, tx, tz); if (h > 1 && G.livre(p.I, tx, tz, 2.5, h)) { x = tx; zz = tz; break; } }
  const y = G.altura(p.I, x, zz), id = (p.nDrop = (p.nDrop || 0) + 1);
  p.dropsCaindo.push({ id, x, y, z: zz, ate: p.tempo + 16 }); ev(p, 'drop', { id, x: +x.toFixed(1), y: +y.toFixed(2), z: +zz.toFixed(1), dur: 16 });
}
function dropNoChao(p, d) {
  const arma = Math.random() < 0.5 ? 'l7' : 'b3', its = [{ tipo: 'arma', arma }, { tipo: A[arma].mun, qtd: G.ITENS[A[arma].mun].qtd * 2 }, { tipo: 'colete', nv: 3 }, { tipo: 'capacete', nv: 3 }, { tipo: Math.random() < 0.5 ? 'mira8x' : 'mira4x' }, { tipo: 'kit', qtd: 3 }, { tipo: 'gelo', qtd: 4 }, { tipo: 'moeda', qtd: 50 }];
  its.forEach((it, k) => { const a = k / its.length * Math.PI * 2; soltar(p, it, d.x + Math.cos(a) * 1.6, d.y, d.z + Math.sin(a) * 1.6); });
  ev(p, 'dropChao', { id: d.id });
}
function quebrarGelo(p, g) { p.gelos.delete(g.id); ev(p, 'gelo-', { id: g.id }); }
function porGelo(p, j, ry) {
  if (j.gelos <= 0 || j.est !== 'chao') return;
  const x = j.x + Math.sin(ry) * 2.3, z = j.z + Math.cos(ry) * 2.3, y = G.altura(p.I, x, z);
  const g = { id: nGelo++, x, y: Math.max(y, j.y - 0.5), z, ry: ry, hp: R.GELO_VIDA, ate: p.tempo + R.GELO_TEMPO };
  j.gelos--; p.gelos.set(g.id, g); ev(p, 'gelo+', { g: { id: g.id, x: +x.toFixed(2), y: +g.y.toFixed(2), z: +z.toFixed(2), ry: +ry.toFixed(3) }, por: j.id });
}

/* ---------- bots ---------- */
function veAlvo(p, b, x) {
  const o = [b.x, b.y + 1.5, b.z], dx = x.x - b.x, dy = x.y + 1.2 - o[1], dz = x.z - b.z, d = Math.hypot(dx, dy, dz);
  if (d < 1) return true; const dir = [dx / d, dy / d, dz / d];
  return G.raioMundo(p.I, o, dir, d, [...p.gelos.values()]) >= d - 0.5;
}
function irPara(p, b, tx, tz, vel, dt) {
  const ia = b.ia; ia.rep -= dt;
  if (!ia.cam || ia.rep <= 0 || !ia.dest || Math.hypot(ia.dest.x - tx, ia.dest.z - tz) > 3) { ia.cam = caminho(p.grade, b.x, b.z, tx, tz); ia.rep = 3; ia.dest = { x: tx, z: tz }; }
  const alvo = ia.cam && ia.cam.length ? ia.cam[0] : { x: tx, z: tz };
  const dx = alvo.x - b.x, dz = alvo.z - b.z, d = Math.hypot(dx, dz);
  if (d < 0.8) { if (ia.cam && ia.cam.length) ia.cam.shift(); return Math.hypot(tx - b.x, tz - b.z) < 1.2; }
  const ax = b.x, az = b.z; G.mover(p.I, b, dx / d * vel * dt, dz / d * vel * dt, 0.4, [...p.gelos.values()]);
  if (Math.hypot(b.x - ax, b.z - az) < vel * dt * 0.2) { ia.preso = (ia.preso || 0) + dt; if (ia.preso > 1) { ia.cam = null; ia.preso = 0; G.mover(p.I, b, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 0.4); } } else ia.preso = 0;
  b.ry = Math.atan2(dx, dz); b.y = Math.max(G.altura(p.I, b.x, b.z), -0.3); b.fl |= 1;
  return false;
}
function pensarBot(p, b, dt) {
  const ia = b.ia; b.fl = 0;
  if (b.est === 'trem') { if (p.trem.t >= ia.pular) { const tp = posTrem(p); b.x = tp.x; b.z = tp.z; b.y = R.TREM_ALT - 4; b.est = 'ar'; } return; }
  if (b.est === 'ar' || b.est === 'para') {
    const dx = ia.alvo.x - b.x, dz = ia.alvo.z - b.z, d = Math.hypot(dx, dz), chao = G.altura(p.I, b.x, b.z);
    const vh = b.est === 'ar' ? R.PLANA : R.PARA_H, vv = b.est === 'ar' ? (d < 30 ? R.MERGULHO : R.QUEDA) : R.PARA_V;
    if (d > 0.5) { b.x += dx / d * Math.min(d, vh * dt); b.z += dz / d * Math.min(d, vh * dt); b.ry = Math.atan2(dx, dz); }
    b.y -= vv * dt; if (b.est === 'ar' && b.y - chao < R.ABRE_PARA) b.est = 'para';
    if (b.y <= chao) { b.y = chao; b.est = 'chao'; ia.estado = 'loot'; }
    return;
  }
  if (b.est !== 'chao') return;
  ia.tVer -= dt; ia.prox -= dt;
  const w = b.ativa >= 0 ? b.armas[b.ativa] : null, A0 = A[w ? w.a : 'soco'];
  // procura inimigo de vez em quando
  if (ia.tVer <= 0) {
    ia.tVer = 0.35 + Math.random() * 0.3; let melhor = null, md = 1e9;
    for (const x of p.js.values()) { if (x === b || x.est !== 'chao' && x.est !== 'para') continue; const d = Math.hypot(x.x - b.x, x.z - b.z); const alc = Math.min(110, Math.max(25, A0.alc)); if (d < alc && d < md && (d < 12 || x.id === ia.atacante || Math.random() < 0.8) && veAlvo(p, b, x)) { md = d; melhor = x; } }
    ia.inimigo = melhor ? melhor.id : (ia.inimigo && p.tempo - (ia.tAtaque || 0) < 4 ? ia.inimigo : 0);
  }
  const ini = ia.inimigo ? p.js.get(ia.inimigo) : null;
  // recarrega e cura
  if (b.recarga > 0) { b.recarga -= dt; if (b.recarga <= 0) recarregar(b, true); }
  if (b.cura > 0) { b.cura -= dt; if (b.cura <= 0) { b.hp = Math.min(R.VIDA, b.hp + 75); b.kits--; } return; }
  if (w && w.pente <= 0 && b.recarga <= 0 && b.mun[A[w.a].mun] > 0) { b.recarga = RECARGA[A0.cls]; }
  if (w && w.pente <= 0 && b.mun[A[w.a].mun] <= 0) { const o = b.armas[1 - b.ativa]; if (o && (o.pente > 0 || b.mun[A[o.a].mun] > 0)) b.ativa = 1 - b.ativa; }
  // zona
  const z = zonaAgora(p), fora = Math.hypot(b.x - z.x, b.z - z.z) > z.r - 4, alvoZ = p.zona.est === 'fecha' || p.zona.t < 20 ? p.zona.prox : z;
  if (ini && ini.est !== 'morto') {
    const dx = ini.x - b.x, dz = ini.z - b.z, d = Math.hypot(dx, dz);
    b.ry = Math.atan2(dx, dz); b.pi = Math.atan2(ini.y - b.y, d);
    if (b.gelos > 0 && b.hp < 110 && d > 6 && Math.random() < dt * 0.6) porGelo(p, b, b.ry);
    if (w && w.pente > 0 && b.recarga <= 0) {
      if (p.tempo - b.ultTiro >= A0.cad * (1.6 + Math.random())) {
        // erro de mira: piora com distância e com o alvo andando
        const err = 0.025 + d * 0.0011 + (ini.fl & 1 ? 0.02 : 0) + (b.dific === 2 ? -0.012 : 0);
        const o = [b.x, b.y + 1.5, b.z], tx = ini.x + (Math.random() - 0.5) * err * d * 2.2, ty = ini.y + (ini.ag ? 0.8 : 1.15) + (Math.random() - 0.5) * err * d * 2.2 + (Math.random() < 0.1 ? 0.45 : 0), tz = ini.z + (Math.random() - 0.5) * err * d * 2.2;
        const dd = [tx - o[0], ty - o[1], tz - o[2]], l = Math.hypot(dd[0], dd[1], dd[2]);
        disparar(p, b, o, dd.map(v => v / l));
      }
      // anda de lado enquanto atira
      ia.lado = ia.lado || 1; if (Math.random() < dt * 0.7) ia.lado = -ia.lado;
      const ox = Math.cos(b.ry) * ia.lado, oz = -Math.sin(b.ry) * ia.lado, vel = R.ANDA * 0.6;
      const perto2 = d < (A0.cls === 'escopeta' || A0.cls === 'smg' ? 6 : 14) ? -1 : d > A0.alc * 0.6 ? 1 : 0;
      G.mover(p.I, b, (ox + Math.sin(b.ry) * perto2) * vel * dt, (oz + Math.cos(b.ry) * perto2) * vel * dt, 0.4, [...p.gelos.values()]); b.y = Math.max(-0.3, G.altura(p.I, b.x, b.z)); b.fl |= 1;
      return;
    }
    if (!w || A0.cls === 'mao') { if (d < 1.8) { if (p.tempo - b.ultTiro > 0.6) { b.ultTiro = p.tempo; dano(p, ini, A.soco.dano, false, b, 'soco'); ev(p, 'soco', { j: b.id }); } } else if (d < 25) { irPara(p, b, ini.x, ini.z, R.ANDA, dt); return; } }
  }
  if (b.hp < 130 && b.kits > 0 && !ini) { b.cura = 3; return; }
  if (fora) { irPara(p, b, alvoZ.x, alvoZ.z, R.ANDA, dt); return; }
  // loot: procura item útil por perto
  if (ia.prox <= 0 || !ia.item || !p.itens.has(ia.item)) {
    ia.prox = 1.5; ia.item = 0; let md = 45;
    for (const it of p.itens.values()) {
      const d = Math.abs(it.x - b.x) + Math.abs(it.z - b.z); if (d > md) continue;
      const zz = zonaAgora(p); if (Math.hypot(it.x - zz.x, it.z - zz.z) > zz.r) continue;
      if (!util(b, it)) continue; md = d; ia.item = it.id;
    }
  }
  const it = ia.item && p.itens.get(ia.item);
  if (it) { if (Math.hypot(it.x - b.x, it.z - b.z) < 2.2) { if (!pegar(p, b, it.id)) ia.item = 0; } else irPara(p, b, it.x, it.z, R.ANDA, dt); return; }
  // vagueia em direção ao centro da próxima zona / outra cidade
  if (!ia.passeio || Math.hypot(ia.passeio.x - b.x, ia.passeio.z - b.z) < 3) { const c = p.I.cidades[(Math.random() * p.I.cidades.length) | 0], zp = p.zona.prox; ia.passeio = Math.hypot(c.x - zp.x, c.z - zp.z) < zp.r ? { x: c.x + (Math.random() - 0.5) * 20, z: c.z + (Math.random() - 0.5) * 20 } : { x: zp.x + (Math.random() - 0.5) * zp.r, z: zp.z + (Math.random() - 0.5) * zp.r }; }
  irPara(p, b, ia.passeio.x, ia.passeio.z, R.ANDA * 0.85, dt);
}
function util(b, it) {
  if (it.tipo === 'arma') { const tem = b.armas.filter(Boolean); if (tem.length < 2 && !tem.some(w => w.a === it.arma)) return true; return false; }
  if (MUN_MAX[it.tipo] !== undefined) return b.armas.some(w => w && A[w.a].mun === it.tipo) && b.mun[it.tipo] < 90;
  if (it.tipo === 'colete' || it.tipo === 'capacete') return it.nv > b[it.tipo].nv;
  if (it.tipo === 'kit') return b.kits < 3; if (it.tipo === 'gelo') return b.gelos < 4;
  return false;
}
function recarregar(j, fim) {
  const w = j.ativa >= 0 ? j.armas[j.ativa] : null; if (!w) return;
  const A0 = A[w.a]; if (!fim) { if (w.pente >= A0.pente || j.mun[A0.mun] <= 0 || j.recarga > 0) return; j.recarga = RECARGA[A0.cls]; return; }
  const precisa = A0.pente - w.pente, tem = Math.min(precisa, j.mun[A0.mun]); w.pente += tem; j.mun[A0.mun] -= tem;
}

/* ---------- laço da partida ---------- */
function passo(p, dt) {
  p.tempo += dt;
  if (p.estado === 'voo' || p.estado === 'jogo') {
    const tr = p.trem; tr.t += dt;
    if (p.estado === 'voo') { const tp = posTrem(p); for (const j of p.js.values()) if (j.est === 'trem') { j.x = tp.x; j.z = tp.z; j.y = R.TREM_ALT; } if (tr.t >= tr.dur) { for (const j of p.js.values()) if (j.est === 'trem') { j.est = 'ar'; j.y = R.TREM_ALT - 4; if (!j.bot) enviar(j, { t: 'empurrado' }); } p.estado = 'jogo'; } }
    // zona
    const z = p.zona; if (z.est !== 'fim' && p.estado === 'jogo' || p.estado === 'voo') { z.t -= dt; if (z.t <= 0) { if (z.est === 'espera') { z.est = 'fecha'; z.t = G.ZONA[z.fase][1]; ev(p, 'fechando'); } else if (z.est === 'fecha') { z.prox = { x: z.prox.x, z: z.prox.z, r: z.prox.r }; proximaZona(p); } } }
    p.danoZona = (p.danoZona || 0) + dt;
    if (p.danoZona >= 1) { p.danoZona = 0; const zc = zonaAgora(p); for (const j of p.js.values()) if ((j.est === 'chao' || j.est === 'para') && Math.hypot(j.x - zc.x, j.z - zc.z) > zc.r) dano(p, j, G.DANO_ZONA[Math.max(0, Math.min(G.DANO_ZONA.length - 1, z.fase))], false, null, 'zona'); }
    // drops
    if (p.estado === 'jogo' && p.nDropFeito < DROP_T.length && p.tempo >= DROP_T[p.nDropFeito]) { p.nDropFeito++; soltarDrop(p); }
    p.dropsCaindo = p.dropsCaindo.filter(d => { if (p.tempo >= d.ate) { dropNoChao(p, d); return false; } return true; });
    // gelos derretem
    for (const g of p.gelos.values()) if (p.tempo > g.ate) quebrarGelo(p, g);
    for (const j of p.js.values()) {
      if (j.est === 'morto') continue;
      if (j.bot) pensarBot(p, j, dt);
      else { if (j.recarga > 0) { j.recarga -= dt; if (j.recarga <= 0) { recarregar(j, true); j.recarga = 0; } } if (j.cura > 0) { j.cura -= dt; if (j.cura <= 0) { j.cura = 0; if (j.kits > 0) { j.kits--; j.hp = Math.min(R.VIDA, j.hp + 75); } } } }
    }
  }
}
function terminar(p) {
  if (p.estado === 'fim') return; p.estado = 'fim';
  const vivo = [...p.js.values()].find(j => j.est !== 'morto'); if (vivo) vivo.rank = 1;
  const res = [...p.js.values()].sort((a, b) => a.rank - b.rank).map(j => ({ id: j.id, nome: j.nome, rank: j.rank, kills: j.kills, bot: j.bot, dano: Math.round(j.dano) }));
  for (const j of p.js.values()) if (!j.bot) pontuar(j.nome, j.rank === 1, j.kills);
  difundir(p, { t: 'fim', vencedor: vivo ? { id: vivo.id, nome: vivo.nome } : null, res: res.slice(0, 10), todos: res });
  setTimeout(() => { partidas.delete(p.id); for (const j of p.js.values()) j.partida = null; }, 1000);
}
function estadoPara(p, eu) {
  const z = p.zona, zc = p.estado === 'espera' ? null : zonaAgora(p), q = { t: 'q', est: p.estado };
  q.j = []; for (const j of p.js.values()) { if (j.est === 'morto' && j !== eu) continue; const w = j.ativa >= 0 && j.armas[j.ativa] ? j.armas[j.ativa].a : ''; q.j.push([j.id, +j.x.toFixed(2), +j.y.toFixed(2), +j.z.toFixed(2), +j.ry.toFixed(2), +(j.pi || 0).toFixed(2), EST.indexOf(j.est), j.fl | (j.ag ? 4 : 0) | (j.cura > 0 ? 8 : 0) | (j.recarga > 0 ? 16 : 0), w, Math.max(0, Math.round(j.hp)), j.colete.nv, j.capacete.nv]); }
  if (p.estado === 'espera') { q.conta = Math.ceil(p.conta); return q; }
  q.z = [+zc.x.toFixed(1), +zc.z.toFixed(1), +zc.r.toFixed(1), +z.prox.x.toFixed(1), +z.prox.z.toFixed(1), +z.prox.r.toFixed(1), z.fase, z.est === 'fecha' ? 1 : 0, Math.ceil(z.t)];
  q.tr = +p.trem.t.toFixed(2); q.vivos = [...p.js.values()].filter(j => j.est !== 'morto').length;
  if (eu) q.eu = { a: eu.armas.map(w => w ? [w.a, w.pente] : null), at: eu.ativa, m: eu.mun, c: [eu.colete.nv, Math.round(eu.colete.dur)], k: [eu.capacete.nv, Math.round(eu.capacete.dur)], kit: eu.kits, g: eu.gelos, mi: Object.keys(eu.miras), kl: eu.kills, mo: eu.moedas || 0, rc: +eu.recarga.toFixed(2), cu: +eu.cura.toFixed(2), hp: Math.max(0, Math.round(eu.hp)) };
  return q;
}

/* ---------- servidor ---------- */
const GZ = new Map();
function limpaNome(n) { n = String(n || '').replace(/[<>&"']/g, '').trim().slice(0, 14); return n || 'Jogador'; }
function iniciar(porta) {
  const server = http.createServer((req, res) => {
    let u = decodeURIComponent((req.url || '/').split('?')[0]); if (u === '/') u = '/index.html';
    if (u === '/saude') { res.writeHead(200); return res.end('ok'); }
    if (u === '/ranking') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(ranking.slice(0, 20))); }
    if (!LIBERADOS.has(u) && !/^\/modelos\/[a-z0-9_]+\.(json|jpg)$/.test(u)) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('não encontrado'); }
    fs.readFile(path.join(PUB, u), (e, d) => {
      if (e) { res.writeHead(500); return res.end(); }
      const cab = { 'Content-Type': TIPOS[path.extname(u)] || 'application/octet-stream', 'Cache-Control': 'no-cache' };
      if (d.length > 20000 && /gzip/.test(req.headers['accept-encoding'] || '')) { let z = GZ.get(u); if (!z || z.n !== d.length || z.m !== +fs.statSync(path.join(PUB, u)).mtimeMs) { z = { n: d.length, m: +fs.statSync(path.join(PUB, u)).mtimeMs, b: zlib.gzipSync(d) }; GZ.set(u, z); } cab['Content-Encoding'] = 'gzip'; res.writeHead(200, cab); return res.end(z.b); }
      res.writeHead(200, cab); res.end(d);
    });
  });
  const wss = new WebSocketServer({ server, maxPayload: 8192 });
  wss.on('connection', ws => {
    let j = null;
    ws.on('message', raw => {
      let m; try { m = JSON.parse(raw); } catch (e) { return; }
      const p = j && j.partida;
      if (m.t === 'jogar') {
        if (j && p) { p.js.delete(j.id); }
        const np = partidaLivre(); j = novoJog(np, ws, limpaNome(m.nome), m.roupa, false);
        enviar(j, { t: 'bemvindo', id: j.id }); difundir(np, { t: 'cabine', js: lista(np), conta: Math.ceil(np.conta) }); return;
      }
      if (!j || !p) return;
      if (m.t === 'comecar' && p.estado === 'espera') { p.conta = Math.min(p.conta, 3); return; }
      if (m.t === 'p') {
        const x = +m.x, y = +m.y, z = +m.z; if (![x, y, z].every(Number.isFinite)) return;
        const agora = Date.now(), dtp = Math.max(0.04, Math.min(0.6, (agora - (j.tPos || agora - 80)) / 1000)); j.tPos = agora;
        j.ry = +m.ry || 0; j.pi = +m.pi || 0; j.ag = m.ag ? 1 : 0; j.fl = m.f | 0;
        if (p.estado === 'espera') { if (j.est === 'cabine') { j.x = x; j.y = y; j.z = z; } return; }
        if (j.est === 'trem' || j.est === 'morto') return;
        const est = EST.indexOf(m.e) >= 2 && EST.indexOf(m.e) <= 4 ? m.e : j.est;
        const max = (j.est === 'chao' && est === 'chao' ? R.ANDA * 1.6 : 42) * dtp + 0.6;
        if (Math.hypot(x - j.x, z - j.z) > max) { enviar(j, { t: 'corrige', x: j.x, y: j.y, z: j.z }); return; }
        // não pode voltar a subir no ar
        if ((j.est === 'para' || j.est === 'chao') && est === 'ar') return;
        j.x = x; j.y = Math.max(y, G.altura(p.I, x, z) - 1.5); j.z = z; j.est = est; return;
      }
      if (p.estado === 'espera') return;
      if (m.t === 'pular' && j.est === 'trem') { const tp = posTrem(p); j.x = tp.x; j.z = tp.z; j.y = R.TREM_ALT - 4; j.est = 'ar'; enviar(j, { t: 'corrige', x: j.x, y: j.y, z: j.z }); return; }
      if (j.est === 'morto') return;
      if (m.t === 'dbg' && process.env.QL_TESTE) { aplicar(p, j, { tipo: 'arma', arma: 'ar9' }); aplicar(p, j, { tipo: 'arma', arma: 'l7' }); j.mun.media = 200; j.mun.pesada = 30; j.miras = { '2x': 1, '4x': 1, '8x': 1 }; j.gelos = 5; j.kits = 3; j.ativa = 0; return; }
      if (m.t === 'tiro' && Array.isArray(m.o) && Array.isArray(m.d)) {
        const o = m.o.map(Number), d = m.d.map(Number); if (![...o, ...d].every(Number.isFinite)) return;
        if (Math.hypot(o[0] - j.x, o[1] - (j.y + 1.5), o[2] - j.z) > 3.5) return;
        const l = Math.hypot(d[0], d[1], d[2]) || 1; disparar(p, j, o, d.map(v => v / l));
      } else if (m.t === 'pegar') pegar(p, j, m.id | 0);
      else if (m.t === 'arma') { const i = m.i | 0; if ((i === -1 || j.armas[i]) && i !== j.ativa) { j.ativa = i; j.recarga = 0; } }
      else if (m.t === 'recarregar') recarregar(j, false);
      else if (m.t === 'curar') { if (j.kits > 0 && j.hp < R.VIDA && j.cura <= 0 && j.est === 'chao') j.cura = 3; }
      else if (m.t === 'gelo') porGelo(p, j, +m.ry || j.ry);
      else if (m.t === 'largar') { const s = m.i | 0; const w = j.armas[s]; if (w) { j.armas[s] = null; soltar(p, { tipo: 'arma', arma: w.a, pente: w.pente }, j.x, j.y, j.z); if (j.ativa === s) j.ativa = j.armas[1 - s] ? 1 - s : -1; } }
    });
    ws.on('close', () => {
      const p = j && j.partida; if (!p) return;
      if (p.estado === 'espera') { p.js.delete(j.id); difundir(p, { t: 'cabine', js: lista(p), conta: Math.ceil(p.conta) }); if (![...p.js.values()].some(x => !x.bot)) partidas.delete(p.id); return; }
      if (j.est !== 'morto') morrer(p, j, null, 'saiu');
      j.ws = null; if (![...p.js.values()].some(x => !x.bot && x.ws)) partidas.delete(p.id);
    });
  });
  let ultimo = Date.now(), acum = 0, acumS = 0;
  setInterval(() => {
    const agora = Date.now(), dt = Math.min(0.1, (agora - ultimo) / 1000); ultimo = agora; acum += dt; acumS += dt;
    for (const p of partidas.values()) {
      if (p.estado === 'espera') { p.conta -= dt; if (p.conta <= 0) comecar(p); }
      else if (p.estado !== 'fim') passo(p, dt);
    }
    if (acum >= 1 / ENVIO) { acum = 0; for (const p of partidas.values()) if (p.estado !== 'fim') for (const j of p.js.values()) if (!j.bot) enviar(j, estadoPara(p, j)); }
    if (acumS >= 1) { acumS = 0; for (const p of partidas.values()) if (p.estado === 'espera') difundir(p, { t: 'cabine', js: lista(p), conta: Math.ceil(p.conta) }); }
  }, 1000 / TICK);
  server.listen(porta, () => console.log('QUEDA LIVRE na porta ' + porta));
  return server;
}
module.exports = { iniciar, novaPartida, novoJog, comecar, passo, partidas, caminho, criarGrade, disparar, pegar };
if (require.main === module) iniciar(process.env.PORT || 3000);
