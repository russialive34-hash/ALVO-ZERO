/* Teste: quem morre larga a arma principal e outro jogador pode pegar. */
'use strict';
const assert = require('assert');
const WebSocket = require('ws');
const { iniciar, carregamento, salas } = require('../server/server.js');
const porta = 3992, srv = iniciar(porta);
const espera = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await carregamento;
  const ws = new WebSocket('ws://localhost:' + porta), msgs = [];
  ws.on('message', d => msgs.push(JSON.parse(d)));
  await new Promise(r => ws.on('open', r));
  const env = o => ws.send(JSON.stringify(o)), ult = t => msgs.filter(x => x.t === t).pop();
  env({ t: 'ola', cod: 'teste-drop', nome: 'Drop' }); await espera(200);
  env({ t: 'criar', nome: 'drop', mapa: 'luxville', modo: 'time', bots: 6, senha: '' }); await espera(200);
  env({ t: 'iniciar' }); await espera(300);
  const meuId = ult('bemvindo').id, s = [...salas.values()][0], eu = s.jogs.get(meuId);
  // força uma morte: um bot inimigo morre com a arma na mão
  const bot = [...s.jogs.values()].find(j => j.bot && j.time !== eu.time && j.vivo);
  const armaBot = bot.armaPega || bot.primariaModo;
  bot.protegidoAte = 0; bot.vida = 1; eu.protegidoAte = 0;
  // simula o dano pelo caminho normal de morte
  const srvMod = require('../server/server.js');
  eu.vivo = true; bot.x = eu.x + 1; bot.z = eu.z; bot.y = eu.y;
  // usa a granada do servidor? mais simples: chama o tiro direto pelo estado (dano) via mensagem interna
  s.partida.drops = s.partida.drops || [];
  const antes = msgs.length;
  // chama dano exposto no módulo de teste
  srvMod._dano(s, bot, eu, 999, 'ar9', false);
  await espera(150);
  const drop = msgs.slice(antes).find(m => m.t === 'drop');
  assert(drop && drop.d.arma === armaBot, 'arma do morto caiu no chão: ' + JSON.stringify(drop));
  // pegar de longe não pode
  eu.x = drop.d.x + 6; env({ t: 'pegar', id: drop.d.id }); await espera(150);
  assert(!msgs.some(m => m.t === 'pegou'), 'não pega de longe');
  eu.x = drop.d.x + 0.5; eu.z = drop.d.z; eu.y = drop.d.y; eu.vivo = true;
  const minha = eu.armaPega || eu.primariaModo;
  env({ t: 'pegar', id: drop.d.id }); await espera(200);
  const pg = ult('pegou'); assert(pg && pg.jid === meuId && pg.arma === armaBot, 'pegou a arma');
  assert(eu.mun[armaBot] && eu.arma === armaBot, 'arma na mão com munição');
  if (minha !== armaBot) assert(s.partida.drops.some(d => d.arma === minha), 'largou a própria arma no lugar');
  env({ t: 'trocar', arma: armaBot }); await espera(80); assert(eu.arma === armaBot, 'troca aceita para a arma pega');
  ws.close(); srv.close(); console.log('drops: OK'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
