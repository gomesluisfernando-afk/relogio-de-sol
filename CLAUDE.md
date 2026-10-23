# Relógio de Sol — guia para quem for mexer no projeto

Jogo educativo em pixel art sobre a história do Brasil (do pau-brasil à Inconfidência e a Tiradentes de hoje), feito
para um guia de turismo de Tiradentes (MG) aprender e usar a história no celular. Responder sempre em português.

## Como o projeto funciona
- Sem build: `index.html` carrega `content.data.js`, `assets.data.js`, `maps/hoje.js`, `maps/eras.js`, `cutscenes.js`, `world.js`, `game.js`, `minis.js`.
- `world.js` = conteúdo do mundo aberto (só dados e desenhos): NPCs de curiosidade, folclore, itens, comidas, pousos,
  missões paralelas, coleções e eventos. O verificador confere tudo e lista os `conferir` dele.
- Conteúdo histórico fica em `data/*.json` (cards = "relatórios", quizzes, eras, quests). Depois de editar: `node tools/build_content.mjs`.
- Verificador: `node tools/check.mjs` (tem que terminar em "tudo ok").
- Publicação: push no `main` → GitHub Pages (https://gomesluisfernando-afk.github.io/relogio-de-sol/). O branch `v2-arthur` anda junto com o `main`.
- A cada mudança publicada, subir a versão do cache em `sw.js` (`relogio-v2-N`), senão o celular fica com a versão velha.
- Testar no navegador: `python -m http.server 8090` e abrir `/?test=1` (laço por timer). Extras: `&era=<id>`, `&mini=<id>`, `&touch=1` (força controles de celular), `&intro=1` (revê a intro).

## Regras de jogo já decididas
- Eras em ordem cronológica: um portal só abre quando o anterior foi concluído. Dá para sair de uma era incompleta.
- Concluir uma era = todos os relatórios do chão → todas as perguntas da era → vencer o minigame da era.
- Sabatina da era (NPC de perguntas): todas as perguntas em ordem cronológica, sem "quer outra?". Errou: −5 e volta para a
  primeira (pode recomeçar já ou depois). Na volta, as já acertadas são respondidas de novo, mas só as novas valem ouro
  (+5 certa, −5 errada). As opções mudam de lugar a cada volta. Minigame vencido: +10.
- Cada relatório novo paga +20 de ouro ao ser fechado (aberto e lido); reler no caderno não paga. Constantes `OURO_RELATORIO` e `PRECO_BOTAS` em `game.js`.
- Loja (Venda do Tropeiro): ★ Botas $400 (+40% velocidade, item principal; meta: comprar por volta do 3º/4º portal), Lampião $150 (abre a vista do mapa),
  Rapadura $5 (vai para o inventário; ao comer, +80% por 40 s). Inventário na mochila do HUD (tecla I).
- Diálogos não têm X: tem que passar por todos.

## Mundo aberto (world.js + game.js)
- Duas moedas: **ouro ($)** compra; **brilho (✦)** vem de olhar, aprender, ajudar e doar, e nunca se compra.
  Ganha ✦: relatório lido +1, parada do tour +1, NPC de curiosidade ouvido +2, bestiário +3, sabatina sem erro +5,
  Pergunta do Sineiro +3, missões extras, coleções no museu, doação ($10 = ✦1 na Matriz de Tiradentes e no Rosário de Vila Rica).
  Final verdadeiro com ✦ ≥ 150 (`BRILHO_FINAL`). Ouro só vira brilho doando; brilho nunca vira ouro.
- NPCs de curiosidade: 3–4 falas com formas no lugar da imagem e a última sempre "➜ Isso viria a ser: …" (ligação com hoje).
- Itens com raridade (Coisa, Achado, Documento, Relíquia, Brilho) e tipo: util, comida (efeito por tempo), colecao,
  antiguidade, chapeu. Inventário com abas Bolsa / Coleção / Saber.
- Missões extras em passos: fetch (pegar N coisas), route (pontos em ordem, com prazo opcional), count, ask. No fim, volta ao NPC.
- Regra ética: engenho, senzala e Palmares não dão item nem piada; dão Memória e brilho. Nada de cocar como chapéu.
- Folclore: Curupira, Saci (um mapa por dia), Iara, Boitatá (à noite), Lobisomem (lua cheia), Boto, Mapinguari,
  Mãe-do-Ouro (com 20+ de pó) e a Dona Mula. 22/8 aparecem todos; 31/10 o Saci aparece em todo canto.
- Pousos de tropeiro no Hoje: visitar libera; viajar custa $10–40 (ferradura dourada: metade). Amazônia pede a canoa.
- Pergunta do Sineiro: erros da sabatina voltam em 1, 3 e 7 dias. Sequência de dias: 3 dias = 2 rapaduras, 7 = chapéu de palha.
- Parceiros reais (ex.: Sorveteria do Amado) têm `partner: true`. Usar nome, rosto ou marca só com autorização por escrito.

## Controles (nada de tocar no mundo)
- Celular: joystick virtual à esquerda + botão A à direita. A faz o que estiver perto (falar, pegar, entrar).
- Com diálogo, pergunta ou janela (relatório, caderno, dossiê, inventário) na tela, joystick e A somem.
- Diálogo só avança no botão ▶ dele; janela só fecha no botão FECHAR. Tocar fora não passa nem fecha nada.
  No teclado: Espaço/Enter passa o diálogo, Esc fecha a janela.
- Visual de celular moderno (não mais 16 bits): fontes Lilita One (títulos e botões: `ttl`, `plain`) e Nunito 800
  (textos: `txt`), offline em `assets/fonts/`. Tamanhos seguem a escala antiga; `FK` converte. Letra sem sombra.
  No celular, toda letra 15% maior, menos nos diálogos. Caixas `box()` arredondadas; botões `pill()`; `rr()` para cantos.
- Tela HD: o canvas acompanha os pixels reais (`DPR`), o jogo pensa em 960×540. Zoom do mundo com ＋/－ no HUD
  (`ZOOMS`, padrão 1,25; o nível mais aberto só com lampião). Bonecos e objetos do mundo escalam com `Z`.
- Teclado: setas/WASD + Espaço/Enter/E. Toque só em botões de interface (SAIR, opções, som, tela cheia, mochila).

## Arte nova (estratégia em `docs/ESTRATEGIA_GRAFICA.md`, lotes em `docs/LOTES_ARTE.md`)
- Nuvem = código e encaixe; local = gerar no Nano Banana / Flow. Lista oficial: `assets/manifest.json` (215 imagens, lotes L0–L9).
- Pastas: `assets/ui` (painel 9 fatias, botões), `assets/icons` (itens e HUD), `assets/sprites` (folhas 3×4 dos
  personagens, Dona Mula, folclore), `assets/props` (portais, pouso, relatório), `assets/maps` (mapa pintado,
  `_top` e `_colisao`). O jogo só carrega o que está em `assets.data.js` (`node tools/build_assets.mjs`); sem arquivo,
  vale o desenho antigo. Tratar imagens com `python tools/arte.py <tipo> <arquivo> <nome> [--fundo]`.
- Mapas pintados partem dos guias em `docs/guias/` (planta, colisão e anotado), para o caminho bater com a colisão.
- Minigames: `A.spr(nome, cx, cy, w, h, flip)` e `A.fundo()` usam `assets/minis/<mini>_<nome>.webp` quando existe;
  senão desenham como antes; `A.arte(nome)` dá a textura crua. Lotes: L0–L2 prontos e aprovados; L3–L9 com a sessão local.
- Testemunhas sem ficha usam 4 tipos genéricos (`gen_marinheiro`, `gen_soldado`, `gen_sertanejo`, `gen_cidadao`), com sprite e retrato.
  Objetos das missões extras usam `assets/icons/missao_<nome>.webp`; o Buck usa `buck_<chapéu>` quando existe.

## Diretriz dos minigames (`minis.js`)
- Cada um é a releitura de um clássico de fliperama/Atari (referência: games.wotai.co), com o tema da era:
  Escambo = Frogger, Fogueiras = Doodle Jump, Carta = Snake, Ponte = Tetris, Turmalina = Space Invaders,
  Moenda = Space Invaders (cana e pães de açúcar, fagulhas, bagaço), Garimpo = Pac-Man, Balança = Kaboom!,
  Sinos = Simon; Régua e Profetas com mecânica própria.
- Tempo calibrado com um robô que joga (`dbg()` do minigame expõe o estado): o tempo-limite fica ~10% acima da
  mediana do robô (Moenda: robô 88–135 s, mediana 108 s → TEMPO 120).
- No canto de cima à direita ficam som, tela cheia e SAIR (y 62–104, x > W−230): avisos e caixas não entram ali.
  Embaixo ficam joystick (esquerda) e A (direita): caixas de escolha entre x 190 e W−190.
- Jogados só com joystick e A: usar `action()` para o A e `key(seta)` / `A.keys` para direção.
- Dificuldade média/difícil, meta "consiga X" e constantes de ajuste (TEMPO, META...) no topo de cada um.
- Perdeu: `A.lose(motivo)` gasta uma de 3 tentativas; esgotou, volta ao mapa (sem expulsão nem reinício da era).

## Tom e conteúdo
- Imagem acima de texto: uma ideia por tela, frases curtas. Conteúdo correto vale mais que acabamento visual.
- Humor sempre contra o poder, nunca contra as vítimas. Açúcar (engenho) e Palmares têm tom sério: sem piada, sem confete.
- Fatos incertos vão no campo `conferir` do card. Relatórios têm a seção "Imagine…" para provocar reflexão.
- Não copiar texto, imagens ou vídeos de outros jogos: só a ideia de mecânica.

## Fora do repositório (de propósito)
- `SUPER_MD_relogio_de_sol.md` (especificação original) e a pasta `hota/` ficam só no computador do autor; não versionar.
- Imagens e vídeos foram gerados no Google Flow; narração e efeitos no ElevenLabs (já estão em `img/`, `video/`, `audio/`).
