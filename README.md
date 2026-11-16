# ALVO ZERO

FPS online em 3D no navegador e no celular (deitado).

- Lobby com lista de salas, partida rápida, criar sala (com senha), patentes por XP
- Sala com times VERMELHO x AZUL, escolha de mapa, modo, meta de kills, tempo e bots
- Armas: AR-9 Falcão (fuzil), VX-45 Vespa (submetralhadora), L-7 Longa (sniper com luneta), T-12 Trovão (escopeta), P-9 Cobra (pistola), faca e granada
- Tiros validados no servidor (cadência, munição, paredes, headshot), anti-teleporte
- Bots com navegação (A*) que procuram, miram e atiram
- Mapas: Biblioteca (madeira, balcões, escadarias) e Luxville (palácio lilás e dourado, salão rebaixado, escadas de carpete)
- Modos: Mata-mata em equipe, Todos contra todos, Missão Bomba, Eliminação, Só Sniper, Só Faca
- Corpos ficam no chão; a arma de quem morre cai e pode ser pega (botão PEGAR ou tecla F)
- HUD: placar, tempo, kill feed, HEAD SHOT, estrelas de kill, minimapa, vida e munição, tabela
- Sons feitos por código com eco e som 3D
- Personagens Tarantula (vermelho) e Judy Chou (azul) com esqueleto: andam, agacham, respiram e miram
- Opção CONFIGURAÇÕES: gráficos (baixo, médio, alto, ultra), brilho, tela cheia, modo de mira (precisão, assistida, automática) e sensibilidade
- Contas com usuário e senha (senha guardada só como hash scrypt), login automático
- 55 patentes no estilo Point Blank com insígnias e tela de PROMOÇÃO
- Moedas ganhas nas partidas e LOJA com arma em 3D: snipers Arara SR (15.000) e Vermilion Bird (20.000), outras armas, personagem Sci-Fi e coletes (3.000 / 8.000 / 15.000)
- Missões diárias, bônus diário, ranking, amigos e clã
- Voz de locutor: HEADSHOT e PROMOTED

## Onde ficam as contas
Sem configurar nada, as contas ficam em arquivos na pasta `data/` (ou na pasta da variável `DADOS`).
No Render grátis essa pasta é apagada a cada deploy/reinício. Para as contas nunca sumirem, use o **Supabase** (grátis):

1. Crie um projeto em supabase.com e abra **SQL Editor**. Rode:
```sql
create table alvo_dados (chave text primary key, valor jsonb not null, atualizado timestamptz default now());
```
2. Em **Project Settings → API** copie a *Project URL* e a chave *service_role*.
3. No Render, em **Environment**, crie `SUPABASE_URL` (a URL) e `SUPABASE_KEY` (a chave service_role). Faça o deploy.

Controles — Computador: WASD, mouse, clique atira, botão direito mira, R recarrega, F pega arma do chão, E planta/desarma, 1-4 armas, Q troca, G granada, C agacha, espaço pula, TAB placar.
Celular: joystick à esquerda, arraste para mirar, botão vermelho atira (arrastando também mira), ◎ mira, R, ⇄, 💣, ⤒ pula, ⤓ agacha, ☰ placar.

## Rodar
```
npm install
npm start
npm test
```
## Render
Build: `npm install` · Start: `npm start`
## APK (Termux)
```
bash apk-termux.sh https://SEU-SITE.onrender.com
```

## Créditos
- "AUG A3 4th Point Blank" por Shiro — https://sketchfab.com/3d-models/aug-a3-4th-point-blank-ee88972b66c8490e82dd3886419fbb8c — CC BY 4.0
- "Tarantula - Point Blank" por madarahadian — CC BY 4.0 (time vermelho)
- "Judy Chou - Point Blank" por madarahadian — CC BY 4.0 (time azul)
- "Vermilion Bird" por Ziky Andeska — https://sketchfab.com/3d-models/vermilion-bird-2cd4f688129e4705ae21ca1e61b9f0bb — CC BY 4.0
- "Vest Armor Holster LowPoly GameReady Pack" por 00amza — https://sketchfab.com/3d-models/vest-armor-holster-lowpoly-gameready-pack-7c41d35e505c4057abe60f89537408bd — CC BY 4.0
- Voz do locutor gerada com Flite (CMU)
