# Relógio de Sol — guia para quem for mexer no projeto

Jogo educativo em pixel art sobre a história do Brasil (do pau-brasil à Inconfidência e a Tiradentes de hoje), feito
para um guia de turismo de Tiradentes (MG) aprender e usar a história no celular. Responder sempre em português.

## Como o projeto funciona
- Sem build: `index.html` carrega `content.data.js`, `cutscenes.js`, `maps/hoje.js`, `maps/eras.js`, `game.js`, `minis.js`.
- Conteúdo histórico fica em `data/*.json` (cards = "relatórios", quizzes, eras, quests). Depois de editar: `node tools/build_content.mjs`.
- Verificador: `node tools/check.mjs` (tem que terminar em "tudo ok").
- Publicação: push no `main` → GitHub Pages (https://gomesluisfernando-afk.github.io/relogio-de-sol/). O branch `v2-arthur` anda junto com o `main`.
- A cada mudança publicada, subir a versão do cache em `sw.js` (`relogio-v2-N`), senão o celular fica com a versão velha.
- Testar no navegador: `python -m http.server 8090` e abrir `/?test=1` (laço por timer). Extras: `&era=<id>`, `&mini=<id>`, `&touch=1` (força controles de celular), `&intro=1` (revê a intro).

## Regras de jogo já decididas
- Eras em ordem cronológica: um portal só abre quando o anterior foi concluído. Dá para sair de uma era incompleta.
- Concluir uma era = todos os relatórios do chão → todas as perguntas da era → vencer o minigame da era.
- Perguntas em sequência ("Quer outra pergunta?"): acertou +5 de ouro, errou −5. Minigame vencido: +10.
- Loja (Venda do Tropeiro): ★ Botas $200 (+40% velocidade, item principal), Lampião $150 (abre a vista do mapa),
  Rapadura $5 (vai para o inventário; ao comer, +80% por 40 s). Inventário na mochila do HUD (tecla I).
- Diálogos não têm X: tem que passar por todos.

## Controles (nada de tocar no mundo)
- Celular: joystick virtual à esquerda + botão A à direita. A faz o que estiver perto (falar, pegar, entrar).
- Com diálogo, pergunta ou janela (relatório, caderno, dossiê, inventário) na tela, joystick e A somem.
- Diálogo só avança no botão ▶ dele; janela só fecha no botão FECHAR. Tocar fora não passa nem fecha nada.
  No teclado: Espaço/Enter passa o diálogo, Esc fecha a janela.
- Letra sem sombra em lugar nenhum (`txt` e `plain` só pintam a cor). No celular, toda letra fica 15% maior (`fnt` em `game.js`), menos a dos diálogos.
- Teclado: setas/WASD + Espaço/Enter/E. Toque só em botões de interface (SAIR, opções, som, tela cheia, mochila).

## Diretriz dos minigames (`minis.js`)
- Cada um é a releitura de um clássico de fliperama/Atari (referência: games.wotai.co), com o tema da era:
  Escambo = Frogger, Fogueiras = Doodle Jump, Carta = Snake, Ponte = Tetris, Turmalina = Space Invaders,
  Garimpo = Pac-Man, Balança = Kaboom!, Sinos = Simon; Régua, Moenda e Profetas com mecânica própria.
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
