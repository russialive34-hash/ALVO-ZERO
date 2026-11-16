/* Teste do servidor: lobby, salas, partida com bots, tiros validados, headshot e fim. */
'use strict';
const assert = require('assert');
const WebSocket = require('ws');
const G = require('../public/shared/regras.js');
const { iniciar, carregamento, _perfil } = require('../server/server.js');

// física e mapas
for (const k in G.MAPAS) {
  const m = G.MAPAS[k];
  for (const t of ['r', 'b']) for (const p of m.nasc[t]) assert(!G.colide(m, p[0], G.chaoEm(m, p[0], p[1]) + 0.01, p[1], G.R.ALTURA), 'nascimento livre ' + k);
  const h0 = G.chaoEm(m, m.nasc.r[0][0], m.nasc.r[0][1]), p = { x: m.nasc.r[0][0], y: h0, z: m.nasc.r[0][1], vy: 0, noChao: true };
  for (let i = 0; i < 60; i++) G.mover(m, p, 0, 0, 1 / 30); assert(Math.abs(p.y - h0) < 0.01 && p.noChao, 'fica no chão ' + k);
}
const bib = G.MAPAS.biblioteca, sobe = { x: 0, y: 0, z: -6.5, vy: 0, noChao: true };
for (let i = 0; i < 300; i++) G.mover(bib, sobe, 0, -0.05, 1 / 60); assert(sobe.y > 3.5, 'sobe a escadaria até o balcão');
const hb = G.hitbox({ x: 0, y: 0, z: -5 }), o = { x: 0, y: 1.6, z: 0 };
assert(G.raioEsfera(o, { x: 0, y: 0.01, z: -1 }, hb.cabeca, hb.rCab) > 0, 'raio acerta cabeça');

const porta = 3991, srv = iniciar(porta);
function cliente(nome) {
  return new Promise(ok => {
    const ws = new WebSocket('ws://localhost:' + porta), msgs = [];
    ws.on('message', d => msgs.push(JSON.parse(d)));
    const c = { ws, msgs, m: t => msgs.filter(x => x.t === t), ult: t => msgs.filter(x => x.t === t).pop(), env: o => ws.send(JSON.stringify(o)) };
    ws.on('open', () => { c.env({ t: 'ola', cod: 'teste-' + nome, nome }); setTimeout(() => ok(c), 200); });
  });
}
const espera = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await carregamento;
  const a = await cliente('Izaque'), b = await cliente('Bia');
  assert(a.ult('bemvindo').perfil.nomePatente === G.PATENTES[0], 'perfil novo');
  _perfil('teste-Izaque').armas.push('l7'); // a L-7 agora é vendida na loja
  a.env({ t: 'arma', arma: 'l7' });
  a.env({ t: 'criar', nome: 'Teste <b>', mapa: 'biblioteca', modo: 'time', bots: 4, senha: '' }); await espera(200);
  const sala = a.ult('sala').sala; assert(sala.nome === 'Teste b', 'nome limpo: ' + sala.nome); assert(sala.dono === a.ult('bemvindo').id);
  assert(b.ult('salas').salas.some(s => s.id === sala.id), 'lobby vê a sala');
  b.env({ t: 'entrar', id: sala.id }); await espera(200);
  const s2 = a.ult('sala').sala; assert(s2.jogs.length === 2 && s2.jogs[0].time !== s2.jogs[1].time, 'times equilibrados');
  b.env({ t: 'iniciar' }); await espera(150); assert(!b.m('inicio').length, 'só o dono inicia');
  a.env({ t: 'iniciar' }); await espera(300);
  const ini = a.ult('inicio'); assert(ini && ini.jogs.length === 6, 'partida com 2 pessoas + 4 bots');
  assert(ini.mun.l7 && ini.mun.l7.pente === 5, 'recebe a arma escolhida');
  // bots se mexem
  const q1 = a.ult('q'); await espera(2500); const q2 = a.ult('q');
  const bot1 = q1.j.find(j => ini.jogs.find(x => x.id === j[0] && x.bot)), bot2 = q2.j.find(j => j[0] === bot1[0]);
  assert(Math.hypot(bot2[1] - bot1[1], bot2[3] - bot1[3]) > 0.5, 'bots andam');
  // tiro validado: B fica parado na frente de A e leva headshot de sniper
  const ida = a.ult('bemvindo').id, idb = b.ult('bemvindo').id;
  const pa = { x: -12, y: 0, z: 3 }, pb = { x: -2.5, y: 0, z: 3 };
  await espera(2200); // passa a proteção de nascimento
  for (let i = 0; i < 4; i++) { a.env({ t: 'pos', x: pa.x, y: 0, z: pa.z, yaw: -Math.PI / 2, pitch: 0 }); b.env({ t: 'pos', x: pb.x, y: 0, z: pb.z, yaw: Math.PI / 2, pitch: 0 }); await espera(60); }
  // tiro sem munição não vale; cadência é respeitada
  a.env({ t: 'trocar', arma: 'l7' }); await espera(50);
  const olho = 1.6, cab = { x: pb.x - pa.x, y: 1.65 - olho, z: 0 }, n = Math.hypot(cab.x, cab.y, cab.z);
  a.env({ t: 'tiro', d: { x: cab.x / n, y: cab.y / n, z: cab.z / n } }); await espera(300);
  const ac = a.ult('acerto'), mt = a.msgs.find(m => m.t === 'morte' && m.id === idb);
  assert(ac && ac.cab, 'headshot confirmado pelo servidor');
  assert(mt && mt.hs && mt.por === ida, 'kill com HS no feed (pode ter morrido antes por bot)');
  // tiro atrás da parede não acerta: atira para trás (parede do mapa)
  const tirosAntes = a.m('acerto').length; await espera(1300);
  a.env({ t: 'tiro', d: { x: 1, y: 0, z: 0 } }); await espera(200); assert(a.m('acerto').length === tirosAntes, 'não acerta através do nada');
  // posição impossível é corrigida
  // (só dá para testar se A estiver vivo: os bots podem ter matado ele)
  const ultMorte = a.msgs.map((m, i) => m.t === 'morte' && m.id === ida ? i : -1).reduce((x, y) => Math.max(x, y), -1), ultNasc = a.msgs.map((m, i) => m.t === 'nasceu' && m.id === ida ? i : -1).reduce((x, y) => Math.max(x, y), -1);
  if (ultMorte <= ultNasc) { a.env({ t: 'pos', x: 20, y: 0, z: 3, yaw: 0, pitch: 0 }); await espera(150); assert(a.m('corrigir').length, 'teleporte corrigido'); }
  // granada
  const vivoA = () => { const m1 = a.msgs.map((m, i) => m.t === 'morte' && m.id === ida ? i : -1).reduce((x, y) => Math.max(x, y), -1), n1 = a.msgs.map((m, i) => m.t === 'nasceu' && m.id === ida ? i : -1).reduce((x, y) => Math.max(x, y), -1); return m1 <= n1; };
  for (let k = 0; k < 10 && !vivoA(); k++) await espera(500);
  if (vivoA()) { a.env({ t: 'granada', d: { x: 1, y: 0.2, z: 0 } }); await espera(2600); assert(a.m('explosao').length >= 1 || !vivoA(), 'granada explode'); }
  // bots atiram e matam com o tempo
  await espera(6000); assert(a.m('tiro').filter(t => t.id !== ida && t.id !== idb).length > 3, 'bots atiram');
  a.ws.close(); b.ws.close();
  // contas, loja e colete
  const ws2 = () => new Promise(ok => { const ws = new WebSocket('ws://localhost:' + porta), msgs = []; ws.on('message', d => msgs.push(JSON.parse(d))); const c = { ws, msgs, ult: t => msgs.filter(x => x.t === t).pop(), env: o => ws.send(JSON.stringify(o)) }; ws.on('open', () => ok(c)); });
  const u = 'teste' + Date.now() % 100000, c1 = await ws2();
  c1.env({ t: 'criar', nome: 'x' }); await espera(150); assert(!c1.ult('sala'), 'sem login não cria sala');
  c1.env({ t: 'registrar', usuario: u, senha: 'abc123', lembrar: true }); await espera(400);
  const tk = c1.ult('conta').token; assert(c1.ult('bemvindo') && tk, 'conta criada com token');
  c1.env({ t: 'comprar', arma: 'vb' }); await espera(150); assert(/insuficientes/.test(c1.ult('erro').txt), 'sem moedas não compra');
  c1.env({ t: 'arma', arma: 'vb' }); await espera(100);
  const c2 = await ws2(); c2.env({ t: 'login', usuario: u.toUpperCase(), senha: 'errada' }); await espera(300); assert(c2.ult('conta_erro'), 'senha errada recusada');
  c2.env({ t: 'token', token: tk }); await espera(300); assert(c2.ult('bemvindo'), 'entra pelo token');
  assert(G.COLETES.colete3.protecao === 0.35 && G.item('vb').preco === 20000, 'preços e proteção');
  // bônus diário, missões, ranking, amigos, clã
  const bem = c2.ult('bemvindo').perfil; assert(bem.bonus && bem.bonus.premio === 100 && bem.missoes.length === 3, 'bônus do dia 1 e 3 missões');
  c2.env({ t: 'bonusPegar' }); await espera(200); assert(c2.ult('premio') && c2.ult('perfil').perfil.moedas === 100 && !c2.ult('perfil').perfil.bonus, 'recebe bônus uma vez');
  c2.env({ t: 'bonusPegar' }); await espera(150); assert(c2.msgs.filter(x => x.t === 'premio').length === 1, 'não recebe bônus duas vezes');
  c2.env({ t: 'ranking' }); await espera(150); assert(c2.ult('ranking') && c2.ult('ranking').pos >= 1, 'ranking com minha posição');
  c2.env({ t: 'claCriar', tag: 'TS', nome: 'Teste' }); await espera(150); assert(/2.000/.test(c2.ult('erro').txt), 'clã custa 2000');
  const u2 = 'amg' + Date.now() % 100000, c3 = await ws2(); c3.env({ t: 'registrar', usuario: u2, senha: 'abc123' }); await espera(400);
  c2.env({ t: 'amigoAdd', nome: u2 }); await espera(200); assert(c3.ult('amigos') && c3.ult('amigos').pedidos.length === 1, 'pedido de amizade chega');
  c3.env({ t: 'amigoAceitar', k: c3.ult('amigos').pedidos[0].k }); await espera(200); assert(c2.ult('amigos').amigos.some(x => x.online), 'amigos online dos dois lados');
  c3.ws.close();
  c1.ws.close(); c2.ws.close(); srv.close();
  console.log('servidor: OK'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
