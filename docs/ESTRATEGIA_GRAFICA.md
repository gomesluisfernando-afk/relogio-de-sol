# Estratégia gráfica: do "Atari" a um visual de celular moderno, sobre a mesma mecânica

Documento para as duas sessões do Claude: **nuvem** (código) e **local** (imagens no Nano Banana / Flow).
Decisões já tomadas ficam no `CLAUDE.md`; aqui ficam o plano e o porquê.

---

## 1. Diagnóstico: como o jogo desenha hoje

| Peça | Hoje | Limite para um visual moderno |
|---|---|---|
| Tela | canvas fixo de **960×540**, ampliado por CSS para a tela do celular | num celular de 2400×1080 a imagem é esticada ~2,5×: arte detalhada fica borrada |
| Mapa | `paintDraft()` pinta formas (rios, estradas, matas, prédios) em **meia resolução** e gera a **máscara de colisão** | a arte é o rascunho. Mas o gancho `M.image` já existe: uma imagem pintada pode substituir a arte, e a colisão continua vindo da máscara |
| Prédios | `bld()`: 28 tipos desenhados em retângulos | um único ponto de troca: dá para usar imagem por tipo |
| Bonecos | `dude()` e `mula()` em retângulos, tamanho **fixo na tela** (não acompanha o zoom) | com zoom menor, o boneco fica enorme em relação ao mundo |
| Zoom | `Z = 2` (o lampião abre para 1,6): a tela mostra só 480×270 do mundo | apertado no celular: anda-se muito e vê-se pouco |
| Interface | `box()` com gradiente, fonte Press Start 2P | um único ponto de troca (`box`, `txt`, `btn`): dá para trocar por molduras de imagem |
| Fundos de minigame | imagens + `pixelImage()` (pixeliza de propósito) | já usa arte gerada: é o modelo que funciona |
| Peso offline | ~29 MB de mídia no cache | a arte nova precisa carregar **por era**, não tudo de uma vez |

**Conclusão:** a mecânica não precisa mudar. São poucos pontos de troca (`paintDraft`/`M.image`, `bld`, `dude`/`mula`, `box`/`txt`, `drawFolk`, ícones de item) e todos podem aceitar imagem **com o desenho atual como reserva**. Assim nada quebra enquanto a arte chega aos poucos.

---

## 2. O alvo: decidir uma vez, pintar uma vez

Você falou em subir 3 ou 4 "gerações" (SNES → PS1 → Clash of Clans / Android moderno).
**Recomendação: não pintar cada geração.** Repintar 13 mapas, ~70 personagens e ~40 itens três vezes desperdiça trabalho e cria versões inconsistentes.
O certo é:
1. **Escolher já o estilo final:** vista de cima em 3/4, pintado, cores vivas, como Clash of Clans, Stardew ou Pokémon de celular.
2. **Evoluir o motor em gerações**, cada uma liberando um tipo de arte, sempre no mesmo estilo final.

### A "bíblia de estilo" (primeira coisa a gerar, antes de qualquer asset)
Uma folha de referência que acompanha **todo** prompt (imagem de referência + texto-base):
- **Câmera:** vista de cima em 3/4 (~35°), luz da esquerda-alto, sombra curta para a direita-baixo.
- **Escala:** 1 metro = 16 px de mundo; personagem com ~28 px de largura e ~48 px de altura em zoom 1.
- **Paleta:** 32 a 48 cores por era. Ouro e Minas mais quentes; Açúcar e Palmares dessaturados (tom sério); Hoje claro e vivo.
- **Traço:** contorno escuro suave, sem preto puro; sombreado em 2 ou 3 tons.
- **Proibido:** texto dentro da imagem, logotipos, estilo de outro jogo copiado, cocar como enfeite, caricatura de vítimas.

---

## 3. As gerações do motor (o que muda no código, em ordem)

### Geração 0: fundação (nuvem, sem arte nova)
1. **Tela HD:** o canvas passa a ter resolução real do aparelho (`devicePixelRatio`), com o jogo continuando a pensar em 960×540. É o que deixa a arte nítida no celular.
2. **Zoom de mundo:** padrão **Z = 1,25** (mostra ~770×430 do mundo, 2,6× mais área que hoje). Botões **＋ / －** no HUD (nada de pinça, pela regra "nada de tocar no mundo") e o lampião abrindo um pouco mais. **Personagens, prédios e marcas passam a escalar com o zoom.**
3. **Câmera suave:** segue o Buck com atraso leve (lerp), em vez de colar nele.
4. **Manifesto de arte** (`assets/manifest.json`): cada arquivo esperado, com tamanho, âncora, quadros, prompt e status. O verificador mostra o que já existe e o que falta.
5. **Exportar os guias:** para cada mapa, um PNG do rascunho atual em alta resolução e um PNG da máscara de colisão. É a "planta" que o Nano Banana repinta, e é o que garante que o caminho pintado bate com onde se anda.
6. **Carregamento por era:** a arte de uma era só é baixada quando o jogador entra no portal; o cache offline guarda o que já foi visto.

### Geração 1: "SNES" (mapas pintados + prédios + interface)
- **Mapa pintado por era** em `assets/maps/<id>.webp`, gerado a partir do guia. Os mapas grandes (Hoje, 2400×2000) entram em **ladrilhos** de 1024 px, para não estourar a memória do celular.
- **Camada de decoração com profundidade:** árvores, casas e postes como sprites separados, ordenados por Y junto com os personagens. O Buck passa **atrás** da árvore, e não por cima dela.
- **Prédios por imagem** (`assets/bld/<tipo>.webp`, fundo transparente), com o desenho atual como reserva.
- **Interface:** molduras em 9 fatias (painel, botão, diálogo, HUD) e ícones de item desenhados (no lugar dos emojis).
- **Fonte nova** para a interface, mais legível (por exemplo Pixelify Sans ou Silkscreen, licença OFL, guardada offline). O Press Start fica para títulos.

### Geração 2: "PS1 / 2.5D" (vida e luz)
- **Personagens em folhas de sprite:** 4 direções × 3 quadros (parado, passo A, passo B), com animação de respiração por código.
- **Água, fogo e bandeiras animados** (2 a 4 quadros) e partículas (poeira ao andar, brilho no ouro, faíscas).
- **Luz por hora real:** tinta de manhã, tarde e noite sobre o mapa (o Boitatá já aparece à noite) e luzes nas janelas.
- **Sombras projetadas** dos personagens e um leve paralaxe nas bordas (nuvens, serras ao fundo).

### Geração 3: "celular moderno" (sensação de jogo de loja)
- **Interface "suculenta":** botões que afundam e quicam, números que sobem, moedas que voam até o HUD, transições com desfoque.
- **Retratos maiores** nos diálogos (busto pintado, sem pixelização), com expressões (normal, feliz, sério).
- **Mapa do Brasil (Hoje) como tabuleiro:** cidades como ilhas ilustradas, estrada animada, pousos com bandeirinha, ao estilo do mapa de mundo de jogos de celular.
- **Minigames com a mesma arte nova** (hoje cada um tem um fundo; passam a ter sprites próprios).

---

## 4. A dinâmica NUVEM ↔ LOCAL (o ciclo de cada lote)

```
 NUVEM (código)                        GITHUB                        LOCAL (Nano Banana / Flow)
 1. prepara o encaixe ──push──▶ manifest + guias + prompts ──pull──▶ 2. gera as imagens
    (gancho com reserva,                                                (bíblia de estilo + guia)
     guia PNG, tamanho, âncora)                                      3. trata: recorta, tira o fundo,
                                                                        redimensiona, .webp
 5. encaixa e ajusta ◀──pull── assets/<lote>/*.webp ◀──push── 4. confere com o Luis e envia
    (escala, âncora, colisão,
     capturas no celular)
 6. publica (sw.js, Pages) ──▶ Luis testa no celular ──▶ próximo lote
```

**Quem faz o quê:**
- **Nuvem:** os ganchos no motor (sempre com reserva), o manifesto, os guias PNG, os prompts prontos, o encaixe (âncoras, escala, colisão), os testes automáticos com capturas de tela, o verificador e a publicação.
- **Local:** gerar no Nano Banana / Flow com a bíblia de estilo, tratar as imagens com os scripts do repositório (`tools/`: recorte, remoção de fundo, redimensionamento, webp), mostrar ao Luis e fazer o push.
- **O Luis:** aprova a bíblia de estilo e o primeiro item de cada lote, e testa no celular.

**Regras do ciclo:**
- Cada lote é **pequeno e completo** (ex.: "a cidade de Tiradentes inteira"), e não "todas as árvores do jogo".
- **Nunca** aplicar arte sem a reserva funcionando: se a imagem não carregar, o desenho atual aparece.
- O manifesto é a fonte de verdade: a nuvem não inventa nome de arquivo, e a local não inventa tamanho.

---

## 5. Por onde começar: uma "fatia vertical"

**Tiradentes de Hoje** primeiro:
- é a cidade real do tour, onde o jogo vira ferramenta de trabalho do guia;
- dá para usar **fotos reais** das 16 paradas como referência no Nano Banana;
- tem de tudo: ruas, igrejas, chafariz, NPCs, lojas, placas e interface.

**Passos da fatia:**
1. *(nuvem)* Geração 0 completa: tela HD, zoom 1,25 com botões, câmera suave, manifesto, guia de Tiradentes.
2. *(local)* Bíblia de estilo: 3 ou 4 imagens de referência (rua, igreja, personagem, moldura de menu). **O Luis aprova.**
3. *(local)* Mapa pintado de Tiradentes a partir do guia, mais 6 prédios (Matriz, chafariz, sobrados, Museu Padre Toledo), mais o Buck e a Dona Mula em sprite.
4. *(nuvem)* Encaixe, colisão conferida e capturas no celular.
5. *(local)* Molduras da interface e ícones dos itens.
6. *(nuvem)* Interface nova aplicada a todo o jogo; publicação.

Se a fatia ficar boa, as outras 12 áreas viram linha de produção (uma era por lote).

---

## 6. Riscos e como evitar

| Risco | Como evitar |
|---|---|
| Personagem muda de cara entre quadros e direções | gerar a folha inteira de uma vez, a partir da mesma referência; poucos quadros; animação por código (respiração, balanço) |
| Mapa pintado não bate com a colisão | sempre partir do guia PNG; a nuvem compara a imagem com a máscara e marca os desvios |
| Celular pesado ou lento | webp; ladrilhos de 1024 px; carregamento por era; limitar o tamanho por arquivo no verificador |
| Estilos misturados | bíblia de estilo em todo prompt; aprovação do primeiro item de cada lote |
| Fundo branco em sprite | remoção de fundo por script (`tools/`) e o verificador conferindo a transparência |
| Direitos de imagem | só fotos próprias ou com permissão; nenhuma marca; parceiros reais com autorização por escrito |

---

## 7. Números (para dimensionar)
- **Mapas:** 13 (11 eras, Tiradentes, Hoje).
- **Prédios:** 28 tipos.
- **Personagens:** ~70, com retrato e sprite.
- **Folclore:** 8.
- **Itens:** ~45 ícones.
- **Interface:** ~12 peças (painéis, botões, HUD, abas, barra de tempo).
- **Minigames:** 11 fundos e ~5 sprites cada.
- **Total estimado:** 400 a 500 imagens, em ~15 lotes. Com geração ilimitada, o gargalo é **aprovação e consistência**, não quantidade.
