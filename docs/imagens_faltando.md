# Imagens que faltam: roteiro para gerar no Google Flow (sessão local)

Para a sessão do Claude rodando **no computador do Luis** (com o Chrome e o Flow abertos).
Pedido sugerido: *"leia docs/imagens_faltando.md e gere todas as imagens que faltam"*.

Enquanto uma imagem não existe, o jogo desenha o boneco de retângulos no lugar. Nada quebra.
Depois de gerar, rodar `node tools/check.mjs` e subir a versão do cache em `sw.js`.

---

## 1. Retratos dos diálogos: `img/p_<id>.png`

**Formato final:** PNG 136×136, rosto e ombros de frente, centralizado.

**Como obter:**
- Gerar no Flow em 1:1. Se a imagem vier como ficha de corpo inteiro, salvar em `assets/img/chars/ficha_<id>.webp` e rodar `python tools/crop_portraits.py`, que recorta o rosto para `img/p_<id>.png`.
- Se vier só o rosto, reduzir direto para 136×136.

**Texto-base (usar sempre igual, trocando só a descrição):**
> pixel art 16-bit portrait, head and shoulders, front view, same style as the other Relógio de Sol portraits, limited palette, 1px dark outline, plain dark blue background, warm afternoon light — **[descrição]**

**Regras de tom:**
- Engenho, Palmares e Serra da Barriga: retrato digno e sério, sem caricatura.
- Indígenas: sem cocar de enfeite e sem estereótipo.
- Pessoas reais de hoje (ex.: Amado): só depois de autorização por escrito, e de preferência a partir de foto enviada pela própria pessoa.

### Personagens que já estavam no jogo (sem retrato)
| arquivo | quem | descrição |
|---|---|---|
| p_paraguacu.png | Paraguaçu (Catarina), tupinambá, Bahia, séc. XVI | mulher indígena tupinambá, cabelo preto longo, pintura corporal azul discreta, olhar firme e acolhedor |
| p_feitor.png | feitor da Coroa, 1500 | português de gibão azul, chapéu escuro, ar desconfiado |
| p_frans.png | Frans Post, pintor holandês, 1640 | jovem holandês, cabelo claro, gola branca, pincel na mão |
| p_capitao.png | capitão da Companhia das Índias | holandês de casaca laranja, chapéu de três pontas, bigode |
| p_velho.png | velho morador, 1850 | idoso mineiro, barba branca, camisa clara, sorriso cansado |

### NPCs de curiosidade do Brasil de hoje
| arquivo | quem | descrição |
|---|---|---|
| p_carioca.png | Dona Carmem, carioca | mulher negra de meia-idade, blusa rosa, sorriso aberto |
| p_pescador.png | Seu Tião, pescador de Porto Seguro | pescador idoso baiano, chapéu de palha, pele queimada de sol |
| p_frevo.png | Pedro do Frevo, Recife | passista jovem, camisa amarela e vermelha, sombrinha colorida |
| p_ribeirinha.png | Dona Raimunda, ribeirinha | mulher amazônida, cabelo longo preto, blusa verde, rio ao fundo |
| p_guardia.png | Dona Benedita, guardiã da Serra da Barriga | anciã negra de turbante branco, roupa branca, expressão serena e séria |
| p_ouropreto.png | Seu Geraldo, de Ouro Preto | senhor de óculos, cabelo grisalho, camisa roxa |
| p_maquinista.png | Seu Zé, maquinista da Maria Fumaça | maquinista de boné azul-escuro e bigode, rosto com fuligem |
| p_vaqueiro.png | Seu Vicente, vaqueiro do sertão | vaqueiro nordestino de gibão e chapéu de couro |
| p_arrieiro.png | o arrieiro (chefe de tropa) | tropeiro mais velho, barba grisalha, chapéu de couro, lenço |
| p_moncoeiro.png | o monçoeiro | homem de chapéu de palha, camisa clara, remo no ombro |

### NPCs de curiosidade nas eras
| arquivo | quem | descrição |
|---|---|---|
| p_cartografo.png | o cartógrafo, 1494 | homem de óculos, gibão roxo, mapa enrolado |
| p_marinheiro.png | marinheiro de caravela, 1494 | marujo barbudo, camisa listrada, pele castigada pelo mar |
| p_tintureiro.png | o tintureiro europeu, 1500 | artesão de avental vermelho, mãos tingidas |
| p_engenho.png | trabalhador do engenho, 1550 (sério) | homem negro, roupa simples de algodão cru, olhar digno |
| p_marcgrave.png | Georg Marcgrave, naturalista, 1640 | alemão de chapéu de três pontas, livro na mão |
| p_rabino.png | Isaac Aboab da Fonseca, rabino, Recife | rabino de barba escura, barrete preto, roupa escura |
| p_jardineiro.png | jardineiro do parque de Nassau | homem loiro de avental, planta nas mãos |
| p_anciao.png | anciã de Palmares (sério) | anciã negra, cabelo branco, roupa marrom, olhar firme |
| p_faiscador.png | faiscador (garimpeiro), 1700 | homem negro de chapéu de couro, bateia na mão |
| p_contador.png | contador de causos | idoso de barba branca, sorriso maroto |
| p_musico.png | músico da irmandade, 1740 | músico pardo de casaca azul com botões dourados, violino |
| p_irmao.png | irmão do Rosário, 1740 | homem negro de opa branca da irmandade |
| p_poeta.png | Tomás Antônio Gonzaga, 1789 | poeta de cabelo branco empoado, casaca escura, pena |
| p_conspirador.png | um conspirador, 1789 | homem de tricórnio e casaca vermelha, olhar para os lados |
| p_cafeeiro.png | tropeiro do café, 1850 | tropeiro grisalho de chapéu de couro, saca de café |
| p_engenheiro.png | engenheiro inglês, 1854 | inglês ruivo de bigode, cartola, xícara de chá |
| p_restauradora.png | a restauradora, 1972 | mulher de óculos e avental cinza, pincel fino |
| p_cineasta.png | um cineasta, 1972 | homem de óculos e roupa preta, câmera de cinema |

### Tiradentes de hoje
| arquivo | quem | descrição |
|---|---|---|
| p_curadora.png | curadora do Museu Padre Toledo | mulher negra de óculos, blazer vinho |
| p_zelador.png | zelador da Matriz | senhor de batina simples marrom, cabelo branco |
| p_amado.png | Amado, da Sorveteria do Amado (**parceiro real: só com autorização**) | a partir de foto enviada por ele; avental rosa |
| p_antiquario.png | o antiquário | senhor de bigode branco e óculos, colete xadrez |
| p_chapeleiro.png | o chapeleiro | homem de tricórnio vermelho, fita métrica no pescoço |
| p_queijeira.png | quitandeira da praça | mulher de avental branco, tabuleiro de pão de queijo |
| p_guia.png | o guia de Tiradentes | guia de chapéu de couro e camisa verde, crachá |

### Folclore (criatura inteira, de frente, fundo escuro)
| arquivo | criatura | descrição |
|---|---|---|
| p_curupira.png | Curupira | menino da mata de cabelo de fogo, corpo verde-musgo, pés virados para trás |
| p_saci.png | Saci-Pererê | menino negro de uma perna, gorro vermelho, cachimbo, sorriso travesso |
| p_iara.png | Iara | mãe-d'água de cabelo verde longo, cauda de peixe, no rio |
| p_boitata.png | Boitatá | serpente de fogo azul e laranja, olhos brilhantes, noite |
| p_lobisomem.png | Lobisomem | lobo cinza em pé, olhos amarelos, lua cheia ao fundo |
| p_boto.png | Boto | boto-cor-de-rosa saltando do rio |
| p_mapinguari.png | Mapinguari | gigante peludo marrom, um olho só, boca na barriga |
| p_maedoouro.png | Mãe-do-Ouro | bola de fogo dourada flutuando sobre um rio, brilho suave |

---

## 2. Fundo de minigame que falta
| arquivo | uso | descrição |
|---|---|---|
| img/bg_moenda.jpg | fundo da Moenda (Space Invaders do engenho) | interior escuro da casa da moenda, 1570: três cilindros de madeira, fornalha ao fundo, vapor; tom sério, sem pessoas em destaque; 16:9, pixel art |

---

## 3. Depois de gerar
1. Conferir se cada arquivo tem o nome exato da tabela e está em `img/`.
2. `node tools/check.mjs` → "tudo ok".
3. Abrir `/?test=1&era=<mapa>` e falar com o NPC para ver o retrato no diálogo.
4. Subir `relogio-v2-N` em `sw.js`, fazer commit e push no `main` (e no `v2-arthur`).
