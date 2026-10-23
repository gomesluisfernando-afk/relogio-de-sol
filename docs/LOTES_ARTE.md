# Lotes de arte: roteiro da sessão LOCAL (Nano Banana / Flow)

Para o Claude que roda **no PC do Luis**. Leia também `docs/ESTRATEGIA_GRAFICA.md` (o porquê) e o `CLAUDE.md`.
A lista oficial de cada imagem, com arquivo, tamanho, descrição e **prompt pronto**, está em **`assets/manifest.json`**.

## 0. Antes de começar (sempre)
1. `git pull origin main`.
2. `node tools/check.mjs`. A linha "arte nova: X de 85 imagens do manifesto prontas" mostra onde paramos.
3. Abra `assets/manifest.json` e escolha o próximo lote, na ordem **L0 → L1 → L2 → L3 → L4 → L5 → L6 → L7 → L8 → L9**.
   **O Luis já aprovou o estilo (L0 e L1 prontos): pode seguir os lotes sem parar para aprovação**, mostrando só o resultado de cada lote.

## 1. O estilo (vale para tudo)
- **Alvo:** jogo de celular moderno (Clash of Clans, Royal Match): pintado, cores quentes e vivas, contorno marrom-escuro (nunca preto puro), luz de cima à esquerda, vista de cima em 3/4. Tema: Brasil colonial / Minas barroca.
- **Nunca:** texto ou letras dentro da imagem, logotipos, estilo copiado de outro jogo, cocar como enfeite, caricatura de pessoas escravizadas ou indígenas.
- O campo `estilo` do manifesto é o texto-base. Cada item já traz o `prompt` completo (texto-base + tipo + descrição).
- **A partir do L1:** anexe sempre as imagens aprovadas do L0 como referência de estilo.

## 2. Os lotes
| Lote | O que é | Itens | Observação |
|---|---|---|---|
| **L0** | Bíblia de estilo | 4 | rua de Tiradentes, Buck em 4 vistas, maquete de interface, folha de objetos. **Mostrar ao Luis e esperar o OK** antes do L1. Ficam em `assets/estilo/` (o jogo não carrega). |
| **L1** | Kit de interface | 8 | painel em 9 fatias, 2 botões em pílula, 5 ícones do HUD |
| **L2** | Ícones dos itens | 34 | 128×128, um item por imagem |
| **L3** | **Tiradentes** | 2 (+1 opcional) | mapa pintado sobre o guia + máscara de colisão (+ camada de telhados, opcional) |
| **L4** | Personagens | 28 | folhas de sprite 3×4 do Buck e dos NPCs de Tiradentes e do mapa do Brasil, a Dona Mula, 4 criaturas do folclore. **`amado` só com autorização por escrito.** |
| **L5** | O "lobby" (mapa do Brasil) | 7 (+1 opcional) | mapa pintado sobre o guia + portais, pouso e relatório |
| **L6** | Mapas das 10 eras | 20 | mapa pintado + colisão de cada era, a partir de `docs/guias/<era>_*`. **Açúcar e Palmares: tom sério e digno.** |
| **L7** | Personagens das eras + folclore restante | 41 | folhas 3×4 de cada personagem histórico; Curupira, Saci, Iara e Mãe-do-Ouro. Tiradentes como alferes de 1789 (não a imagem de mártir de cabelo longo). |
| **L8** | Os 11 minigames | 42 | fundo 16:9 e objetos de cada minigame (`assets/minis/<mini>_<nome>.webp`); fundos marcados como opcionais já existem em `img/` |
| **L9** | Acabamento | 27 | Buck com os outros 4 chapéus (mesma grade do `buck`), 4 testemunhas genéricas (sprite + retrato), 10 ícones dos objetos das missões (`missao_*`), pergaminho da Régua, tabuleiro da Carta, bagaço e fagulha da Moenda, serra das Fogueiras (céu transparente). Fechado o L9, não sobra nada do visual antigo. |

## 3. Como gerar cada tipo
- **ui / icone / prop / folk:** um objeto por imagem, **fundo branco liso**.
- **sprite (personagem):** uma imagem só com a grade **3 colunas × 4 linhas**.
  - Linhas: indo para a câmera, para a esquerda, para a direita, de costas.
  - Colunas: parado, pé esquerdo à frente, pé direito à frente.
  - O mesmo personagem em todos os quadros, fundo branco. Comece pelo **Buck**, use-o como referência para os outros e mostre o primeiro ao Luis.
- **mula:** uma tira de 3 quadros (parada, passo, passo), olhando para a direita.
- **mapa:** anexe `docs/guias/<id>_rascunho.webp` (a planta) e `docs/guias/<id>_anotado.webp` (com os nomes) e peça para **pintar por cima mantendo cada rua, rio, ponte e praça no mesmo lugar**. Para Tiradentes, use fotos reais das paradas como referência extra.
- **colisao:** depois do mapa pronto, gere a máscara preto e branco do **mapa pintado**:
  - **branco** = onde não se anda (casas, muros, água, mata fechada);
  - **preto** = ruas, praças, gramado, pontes.
  - Sem ela, o Buck atravessaria as casas novas.

## 4. Tratar e guardar (sempre com a ferramenta)
```
python tools/arte.py <tipo> <arquivo_gerado> <nome> [--fundo]
```
| tipo | exemplo | resultado |
|---|---|---|
| ui | `python tools/arte.py ui painel.png panel` | `assets/ui/panel.webp` |
| icone | `python tools/arte.py icone botas.png botas --fundo` | `assets/icons/botas.webp` (128×128) |
| sprite | `python tools/arte.py sprite buck.png buck --fundo` | `assets/sprites/buck.webp` (384×768) |
| mula | `python tools/arte.py mula mula.png mula --fundo` | `assets/sprites/mula.webp` |
| folk | `python tools/arte.py folk boto.png boto --fundo` | `assets/sprites/boto.webp` |
| prop | `python tools/arte.py prop pouso.png pouso --fundo` | `assets/props/pouso.webp` |
| mapa | `python tools/arte.py mapa tira.png tiradentes` | `assets/maps/tiradentes.webp` (2400×1800) |
| colisao | `python tools/arte.py colisao mascara.png tiradentes` | `assets/maps/tiradentes_colisao.png` |
| topo | `python tools/arte.py topo telhados.png tiradentes` | `assets/maps/tiradentes_top.webp` |
| minifundo | `python tools/arte.py minifundo fundo.png escambo_fundo` | `assets/minis/escambo_fundo.webp` (1920×1080) |
| miniobj | `python tools/arte.py miniobj onca.png escambo_onca --fundo` | `assets/minis/escambo_onca.webp` (até 256, mantém a proporção) |
| minitextura | `python tools/arte.py minitextura serra.png fogueiras_serra --fundo` | `assets/minis/fogueiras_serra.webp` (até 1024, mantém a proporção) |
| retrato | `python tools/arte.py retrato rosto.png gen_marinheiro_retrato` | `assets/sprites/gen_marinheiro_retrato.webp` (256×256) |

- `--fundo` tira o fundo liso a partir das bordas. Confira se não comeu pedaço do desenho.
- O nome final tem que ser **exatamente** o do manifesto.

## 5. Conferir e enviar
1. `node tools/build_assets.mjs`: atualiza a lista do que existe (`assets.data.js`). O jogo só carrega o que está nela.
2. `node tools/check.mjs`: tem que terminar em "tudo ok" e mostrar o novo "X de 85".
3. Veja no navegador: `python -m http.server 8090` e abra `/?test=1&era=tiradentes`, ou `&era=hoje`.
   - Ande pela cidade: o Buck não pode atravessar casa nem ficar preso.
   - Teclas **+ / −** mudam o zoom.
4. Suba o cache em `sw.js` (`relogio-v2-N`), faça o commit (ex.: "Arte L3: Tiradentes pintada e colisão") e envie: `git push origin HEAD:main HEAD:v2-arthur`.
5. Avise o Luis: a nuvem puxa, ajusta o encaixe (escala, âncora, colisão) e publica.

## 6. O que a nuvem já deixou pronto
- O jogo **já usa** cada arquivo assim que ele existe, sem mudar código. Sem o arquivo, vale o desenho antigo.
- Tela em resolução real do celular, zoom com botões ＋/－, câmera suave.
- Fontes novas (Lilita One e Nunito), painéis e botões arredondados.
- Guias: `docs/guias/` (rascunho, colisão e anotado de Tiradentes e do mapa do Brasil, mais o `.json` com as coordenadas).

## 7. Recado da sessão local (2026-10-23): L0 a L9 gerados
- **212 de 215** prontos. Faltam só: `amado` (parceiro real, espera autorização por escrito) e as camadas opcionais `tiradentes_top` / `hoje_top` (telhados e copas recortados do mapa pintado; não dá para gerar alinhado no Flow, melhor recortar a partir do próprio `assets/maps/<id>.webp` com uma máscara).
- **Colisão:** usei a máscara dos guias (`docs/guias/<id>_colisao.png`); os mapas pintados foram conferidos por sobreposição com o `_anotado` e caíram no lugar. Vale andar por cada era e ajustar onde a arte nova pôs casa/árvore fora da máscara.
- **Escala:** no mapa pintado os bonecos ficam pequenos em relação às casas (ver Tiradentes); ajuste de escala/âncora com a nuvem.
- **Sprites:** gerados como 3 tiras (frente, lado, costas) e montados na folha 3×4; a linha "direita" é o espelho da "esquerda".
- **Objetos de minigame** vêm em tamanho próprio (proporção mantida, até 256); texturas `regua_pergaminho`, `carta_tabuleiro`, `fogueiras_serra` ficaram 1024×572/1024×324 (não exatamente o tamanho do manifesto). `moenda_fagulha` 106×256.
- **Ferramentas:** `build_assets.mjs` e `arte.py` passaram a rodar no Windows. `--fundo` usa os 4 cantos como cor de fundo: em imagem com chão escuro embaixo (ex.: serra) come o desenho; a serra foi tratada à parte.
- O campo `prompt` do manifesto repete o texto de estilo duas vezes.
