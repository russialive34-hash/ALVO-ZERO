/* ALVO ZERO — onde as contas e o progresso ficam guardados.
   Com as variáveis SUPABASE_URL e SUPABASE_KEY: guarda no Supabase (sobrevive a deploy e reinício do Render).
   Sem elas: guarda em arquivos na pasta DADOS (bom para testar no PC; no Render grátis é apagado a cada deploy).
   Tabela no Supabase (rode uma vez no SQL Editor):
     create table if not exists alvo_dados (chave text primary key, valor jsonb not null, atualizado timestamptz default now());
*/
'use strict';
const fs = require('fs');
const path = require('path');

const URL_SB = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const KEY_SB = process.env.SUPABASE_KEY || '';
const DADOS = process.env.DADOS || path.join(__dirname, '..', 'data');
const usaSupabase = !!(URL_SB && KEY_SB);

function cab() { return { apikey: KEY_SB, Authorization: 'Bearer ' + KEY_SB, 'Content-Type': 'application/json' }; }

async function carregar(nome) {
  if (usaSupabase) {
    for (let tent = 1; tent <= 4; tent++) {
      try {
        const r = await fetch(URL_SB + '/rest/v1/alvo_dados?chave=eq.' + encodeURIComponent(nome) + '&select=valor', { headers: cab() });
        if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
        const l = await r.json();
        return l.length ? l[0].valor : {};
      } catch (e) {
        console.error('[armazem] não leu "' + nome + '" do Supabase (tentativa ' + tent + '):', e.message);
        if (tent === 4) throw e; // não começa com dados vazios por cima dos verdadeiros
        await new Promise(r => setTimeout(r, 1500 * tent));
      }
    }
  }
  try { return JSON.parse(fs.readFileSync(path.join(DADOS, nome + '.json'), 'utf8')); } catch (e) { return {}; }
}

const fila = {}, gravando = {};
async function gravarAgora(nome, obj) {
  if (usaSupabase) {
    const r = await fetch(URL_SB + '/rest/v1/alvo_dados?on_conflict=chave', {
      method: 'POST', headers: Object.assign(cab(), { Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ chave: nome, valor: obj, atualizado: new Date().toISOString() })
    });
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
    return;
  }
  fs.mkdirSync(DADOS, { recursive: true });
  const arq = path.join(DADOS, nome + '.json');
  fs.writeFileSync(arq + '.tmp', JSON.stringify(obj)); fs.renameSync(arq + '.tmp', arq); // troca de uma vez: nunca fica arquivo pela metade
}
// guarda com um pequeno atraso, juntando várias mudanças numa gravação só
function salvar(nome, obj, atraso) {
  fila[nome] = obj;
  if (gravando[nome]) return;
  gravando[nome] = setTimeout(async function vai() {
    const o = fila[nome]; delete fila[nome];
    try { await gravarAgora(nome, o); } catch (e) { console.error('[armazem] não salvou "' + nome + '":', e.message); if (!fila[nome]) fila[nome] = o; }
    if (fila[nome]) gravando[nome] = setTimeout(vai, 3000); else gravando[nome] = null;
  }, atraso == null ? 1500 : atraso);
}
// grava tudo que estiver pendente (usado ao desligar o servidor)
async function descarregar() {
  const nomes = Object.keys(fila);
  for (const n of nomes) { clearTimeout(gravando[n]); gravando[n] = null; const o = fila[n]; delete fila[n]; try { await gravarAgora(n, o); } catch (e) { console.error('[armazem] falhou ao desligar:', e.message); } }
}

module.exports = { carregar, salvar, descarregar, usaSupabase, onde: usaSupabase ? 'Supabase' : 'arquivos em ' + DADOS };
