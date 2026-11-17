/* Simula uma partida só com bots: pulam do trem, pegam loot, brigam e a zona fecha até sobrar 1. */
'use strict';
const S = require('../server/server.js'), assert = require('assert');
const p = S.novaPartida(); const h = S.novoJog(p, null, 'Teste', 0, false);
let t0 = Date.now(); S.comecar(p); console.log('início (grade + loot) ms', Date.now() - t0, 'itens', p.itens.size, 'jogadores', p.js.size);
h.est = 'morto';
let t = 0, mortes = 0, pegos = 0, tiros = 0; const orig = p.itens.size;
const pior = []; t0 = Date.now();
while (t < 700 && p.estado !== 'fim') { const a = Date.now(); S.passo(p, 0.05); pior.push(Date.now() - a); t += 0.05; }
const vivos = [...p.js.values()].filter(j => j.est !== 'morto');
const chao = [...p.js.values()].filter(j => j.bot && j.kills > 0).length;
pior.sort((a, b) => b - a);
console.log('tempo simulado', t.toFixed(0) + 's', 'real', Date.now() - t0, 'ms', 'tick pior', pior[0], 'p95', pior[Math.floor(pior.length * 0.05)], 'ms');
console.log('vivos', vivos.length, vivos.map(v => v.nome + ' hp' + Math.round(v.hp) + ' k' + v.kills).join(', '), 'bots com kill', chao, 'fase zona', p.zona.fase);
console.log('kills', [...p.js.values()].map(j => j.kills).reduce((a, b) => a + b, 0), 'armas na mão', [...p.js.values()].filter(j => j.armas.some(Boolean)).length);
assert.ok(vivos.length <= 1 || p.zona.fase >= 4, 'partida andou');
console.log('servidor: OK'); process.exit(0);
