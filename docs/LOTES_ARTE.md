# Lotes de arte: roteiro da sessão LOCAL (Nano Banana / Flow)

Para o Claude que roda **no PC do Luis**. Leia também `docs/ESTRATEGIA_GRAFICA.md` (o porquê) e o `CLAUDE.md`.
A lista oficial de cada imagem, com arquivo, tamanho, descrição e **prompt pronto**, está em **`assets/manifest.json`**.

## 0. Antes de começar (sempre)
1. `git pull origin main`.
2. `node tools/check.mjs`. A linha "arte nova: X de 85 imagens do manifesto prontas" mostra onde paramos.
3. Abra `assets/manifest.json` e escolha o próximo lote, na ordem **L0 → L1 → L2 → L3 → L4 → L5**.

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
