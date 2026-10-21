// Cenários das eras (1200×900) e a cidade de Tiradentes-Hoje. Rascunho vetorial: o motor pinta em pixel
// art e gera a grade. Relatórios (cards) se espalham sozinhos a partir de data/cards_fase1.json.
// NPC com quiz: pergunta saída de quizzes.json da própria era. Falas aqui são roteiro, não fato histórico.
window.MAPS = window.MAPS || {};
(() => {
  const M = window.MAPS;
  const base = (o) => ({ w: 1200, h: 900, cell: 8, start: 'start', need: 3, ...o });

  // ---------- ATO I ----------
  M.mundo = base({
    id: 'mundo', era: 'mundo', title: 'Tordesilhas · 1494', music: 'mundo', needMini: 'regua',
    draft: {
      land: [[0, 0], [560, 0], [620, 180], [560, 380], [640, 560], [580, 740], [620, 900], [0, 900]], ground: '#b8a868',
      biomes: [[200, 300, 250, '#a89858'], [300, 750, 200, '#9aa060']],
      roads: [{ w: 22, pts: [[140, 800], [180, 600], [215, 330]] }, { w: 18, pts: [[180, 600], [400, 620], [560, 640]] }],
      buildings: [['palace', 120, 150, 180, 110], ['church', 360, 470, 40, 50]],
      towns: [[330, 690, 7]], forests: [[70, 460, 40, '#5a7a3a']],
      ships: [[780, 300, 1], [900, 620, -1], [700, 780, 1]],
    },
    pois: { start: [140, 790], portal: [80, 830], mesa: [215, 310], doca: [530, 650], palacio: [270, 300] },
    labels: [[210, 135, 'Tordesilhas'], [380, 560, 'Palos'], [850, 160, 'Mar Oceano']],
    npcs: [
      { id: 'colombo', at: 'doca', quest: 'QST-01', lines: ['Navegador nenhum pede direção. Nem eu. Por isso achei um continente no caminho da Índia.'] },
      { id: 'cortesao', at: 'palacio', quiz: true, lines: ['Sua Majestade só fala com quem sabe das navegações.', 'Responda e eu te deixo ver um papel importante.'] },
    ],
    minis: [{ id: 'regua', at: 'mesa', label: 'A Régua dos Reis', lines: [['cortesao', 'Suas Majestades precisam de uma linha. Qualquer linha. Ninguém sabe o que tem do outro lado mesmo.']] }],
    arrive: [['mula', '1494. Dois reis, uma mesa e um mundo que eles nunca viram.'], ['buck', 'Like splitting a pie you never baked.']],
  });

  M.paubrasil = base({
    id: 'paubrasil', era: 'paubrasil', title: 'Porto Seguro · 1500', music: 'paubrasil', needMini: 'escambo',
    draft: {
      land: [[0, 0], [800, 0], [860, 250], [790, 520], [870, 900], [0, 900]], ground: '#5a8a3a',
      biomes: [[300, 300, 260, '#4a7a34'], [200, 700, 200, '#5a8a3a']],
      forests: [[250, 620, 90, '#2f6a2a'], [470, 230, 80, '#3a7030'], [130, 400, 60, '#2f6a2a'], [520, 760, 60, '#3a6a2a'], [80, 120, 60, '#2f6a2a']],
      walls: [{ kind: 'palisade', pts: [[630, 600], [560, 600], [560, 440], [720, 440], [720, 600], [660, 600]] }],
      buildings: [['oca', 170, 140, 56, 44], ['oca', 250, 100, 56, 44], ['oca', 320, 170, 56, 44], ['oca', 210, 220, 56, 44], ['warehouse', 600, 470, 70, 46], ['cross', 760, 690, 22, 38]],
      roads: [{ w: 20, pts: [[700, 840], [645, 700], [645, 590]] }, { w: 16, pts: [[645, 700], [770, 745]] }, { w: 16, pts: [[645, 610], [420, 420], [270, 290]] }],
      ships: [[990, 640, -1]],
    },
    pois: { start: [700, 845], portal: [640, 870], feitoria: [645, 560], cruz: [765, 755], aldeia: [275, 300], praia: [790, 820] },
    labels: [[640, 425, 'Feitoria'], [270, 85, 'Aldeia tupi'], [1000, 560, 'Caravela']],
    npcs: [
      { id: 'caramuru', at: 'aldeia', quiz: true, lines: ['Naufraguei, aprendi a língua, casei aqui. Os portugueses chamam isso de sorte. Eu chamo de vida.'] },
      { id: 'feitor', pal: 'cortesao', at: 'praia', quest: 'QST-02', lines: ['Feitor da Coroa. Alguém anda sumindo com o pau-brasil.'] },
    ],
    minis: [
      { id: 'escambo', at: 'feitoria', label: 'Escambo na feitoria', lines: [['caramuru', 'Toras de pau-brasil por objetos. Mas escolha bem o que aceita: espelho não derruba árvore.']] },
      { id: 'carta', at: 'cruz', label: 'A carta em pedaços', lines: [['narr', 'O vento espalhou a carta de Caminha pela praia.']] },
    ],
    arrive: [['mula', '22 de abril de 1500. Portugal "descobre" uma terra cheia de gente.'], ['buck', 'Discovered. Sure. Like I discovered your kitchen.']],
  });

  // ---------- ATO II ----------
  M.acucar = base({
    id: 'acucar', era: 'acucar', title: 'Engenho · 1550', music: 'acucar', needMini: 'moenda',
    draft: {
      ground: '#7a9a4a', biomes: [[600, 450, 500, '#86a050']],
      rivers: [{ w: 34, pts: [[1060, 0], [1030, 300], [1060, 600], [1040, 900]] }],
      fields: [[80, 420, 460, 280, '#a8c050'], [640, 560, 300, 240, '#a8c050']],
      buildings: [['casagrande', 230, 110, 210, 90], ['chapel', 520, 100, 60, 80], ['senzala', 100, 760, 380, 60], ['mill', 860, 330, 130, 90], ['smelter', 740, 360, 80, 60]],
      roads: [{ w: 22, pts: [[600, 870], [600, 500], [340, 230]] }, { w: 18, pts: [[600, 500], [900, 440]] }, { w: 14, pts: [[600, 760], [300, 740]] }],
      forests: [[1150, 120, 60], [1150, 700, 70]],
    },
    pois: { start: [600, 860], portal: [540, 880], moenda: [900, 450], capela: [550, 200], senzala: [300, 730] },
    labels: [[335, 95, 'Casa-grande'], [920, 315, 'Moenda'], [290, 845, 'Senzala']],
    npcs: [{ id: 'quitandeira', at: 'senzala', quiz: true, lines: ['Minha avó veio num navio. A cana não para, e quem para é castigado.'], right: 'É isso. Lembre disso quando alguém disser que o açúcar era doce.', wrong: 'Não. Escute de novo.' }],
    minis: [{ id: 'moenda', at: 'moenda', label: 'A Moenda', lines: [['narr', 'A casa da moenda. Aqui ninguém fala alto.']] }],
    arrive: [['narr', 'Um engenho de açúcar. Aqui a Dona Mula não faz piada.']],
  });

  M.invasoes = base({
    id: 'invasoes', era: 'invasoes', title: 'Recife holandês · 1630', music: 'invasoes', needMini: 'ponte',
    draft: {
      land: [[0, 0], [900, 0], [960, 300], [900, 600], [980, 900], [0, 900]], ground: '#7a9a50',
      rivers: [{ w: 40, pts: [[0, 430], [300, 450], [600, 470], [920, 460]] }],
      buildings: [['fort', 690, 90, 150, 150], ['warehouse', 470, 240, 80, 50], ['warehouse', 580, 270, 80, 50], ['church', 380, 600, 40, 50]],
      towns: [[420, 720, 8], [250, 260, 5]],
      roads: [{ w: 22, pts: [[300, 860], [300, 650], [200, 520], [200, 380], [450, 300], [690, 250]] }, { w: 18, pts: [[300, 650], [520, 545]] }],
      ships: [[1060, 380, -1], [1090, 700, -1], [950, 160, -1]],
    },
    pois: { start: [300, 860], portal: [240, 880], capibaribe: [520, 540], forte: [700, 260], armazem: [540, 330] },
    labels: [[765, 75, 'Forte'], [520, 500, 'Capibaribe'], [430, 800, 'Recife']],
    npcs: [
      { id: 'nassau', at: 'capibaribe', mini: 'ponte', lines: ['Maurício de Nassau. Vim governar e fiquei construindo. Esta cidade precisa de uma ponte.'] },
      { id: 'frans', pal: 'yves', at: 'armazem', quest: 'QST-03', lines: ['Sou pintor. Pinto o que vejo, e vejo gente indo embora.'] },
      { id: 'capitao', pal: 'nassau', at: 'forte', quiz: true, lines: ['Capitão da Companhia das Índias. Aqui se fala de açúcar, guerra e lucro. Nessa ordem? Depende do dia.'] },
    ],
    minis: [{ id: 'ponte', label: 'A Ponte de Nassau' }],
    arrive: [['mula', 'Recife holandesa. Canais, pontes, pintores e um forte.'], ['buck', 'Wait, the invaders built stuff? Nobody told me that in school.']],
  });

  M.palmares = base({
    id: 'palmares', era: 'palmares', title: 'Serra da Barriga · 1650', music: 'palmares', needMini: 'fogueiras', need: 1,
    draft: {
      ground: '#4a7a3a', noSnow: true, rock: '#6a7a5a',
      mountains: [[170, 170, 90], [1030, 170, 90], [1030, 680, 80], [170, 680, 80]],
      forests: [[600, 100, 80, '#2a5a2a'], [80, 430, 60, '#2a5a2a'], [1120, 430, 60, '#2a5a2a']],
      walls: [{ kind: 'palisade', pts: [[560, 610], [470, 590], [420, 500], [440, 370], [600, 300], [760, 370], [780, 500], [730, 590], [640, 610]] }],
      buildings: [['hut', 500, 380, 44, 38], ['hut', 610, 360, 44, 38], ['hut', 680, 450, 44, 38], ['hut', 530, 490, 44, 38], ['pyre', 160, 70, 24, 20], ['pyre', 1020, 70, 24, 20], ['pyre', 1020, 590, 24, 20], ['pyre', 160, 590, 24, 20]],
      fields: [[300, 740, 200, 80, '#9ab040'], [700, 740, 200, 80, '#9ab040']],
      roads: [{ w: 18, pts: [[600, 870], [600, 450]] }],
    },
    pois: { start: [600, 860], portal: [540, 880], portao: [600, 650], centro: [600, 440] },
    labels: [[600, 285, 'Palmares']],
    npcs: [
      { id: 'vigia', at: 'portao', mini: 'fogueiras', lines: ['Daqui de cima a gente vê tudo. Quando a fogueira acende num morro, o mocambo inteiro sabe.'] },
      { id: 'zumbi', at: 'centro', cond: 'fogueiras', lines: [['zumbi', 'Palmares não é um esconderijo. É um lugar. Quase cem anos de gente livre.'], ['narr', 'Zumbi não faz perguntas. Só observa você ir embora.']] },
    ],
    minis: [{ id: 'fogueiras', label: 'Fogueiras de Palmares' }],
    arrive: [['narr', 'Serra da Barriga. Aqui ninguém está escondido: está vivendo.']],
  });

  // ---------- ATO III ----------
  M.ouro = base({
    id: 'ouro', era: 'ouro', title: 'Minas do Ouro · 1700', music: 'ouro', needMini: 'garimpo', need: 4,
    draft: {
      ground: '#8a9a4a', biomes: [[700, 600, 300, '#a8784a'], [300, 250, 250, '#7a8a44']],
      rivers: [{ w: 30, pts: [[0, 440], [300, 450], [600, 460], [900, 440], [1200, 450]] }],
      mountains: [[960, 130, 70], [1090, 240, 60], [1130, 90, 50]],
      buildings: [['mine', 880, 180, 90, 70], ['smelter', 180, 170, 110, 80], ['chapel', 490, 110, 60, 80], ['registro', 560, 370, 70, 50], ['hut', 290, 640, 40, 34], ['hut', 360, 690, 40, 34], ['hut', 420, 630, 40, 34], ['hut', 480, 710, 40, 34], ['hut', 960, 680, 46, 36]],
      roads: [{ w: 22, pts: [[150, 850], [300, 700], [600, 560], [600, 330], [300, 230]] }, { w: 18, pts: [[600, 330], [880, 260]] }, { w: 16, pts: [[600, 560], [950, 730]] }],
      forests: [[80, 560, 50], [1150, 600, 60]],
    },
    pois: { start: [150, 850], portal: [90, 875], fundicao: [235, 265], registro: [610, 340], mina: [925, 265], rio: [420, 485], acampamento: [940, 740], capela: [520, 210], barracos: [380, 610], ponte: [600, 500], bateia1: [300, 423], bateia2: [800, 478], bateia3: [1030, 423] },
    labels: [[235, 155, 'Casa de Fundição'], [925, 165, 'Mina'], [600, 360, 'Registro'], [380, 765, 'Arraial']],
    npcs: [
      { id: 'antonil', at: 'capela', quest: 'QST-05', lines: ['Escrevi um livro sobre a riqueza deste lugar. O rei achou rico demais para ser lido.'] },
      { id: 'quitandeira', at: 'barracos', quiz: true, lines: ['Tabuleiro de quitanda: pão, doce, notícia. Notícia é o que mais vende.'] },
      { id: 'fundidor', at: 'fundicao', quest: 'QST-04', lines: [] },
      { id: 'fernao', at: 'acampamento', mini: 'turmalina', lines: ['Sete anos no sertão. Achei esmeraldas! ...Achei, não achei?'] },
      { id: 'tropeiro', at: 'ponte', quest: 'QST-10', lines: ['Atravesso esse rio todo dia. Já ouvi cada história sobre o nome dele...'] },
    ],
    cobrador: { patrol: ['registro', 'fundicao', 'mina', 'rio'] },
    minis: [{ id: 'garimpo', at: 'rio', label: 'Garimpo no rio' }, { id: 'turmalina', label: 'Esmeralda ou Turmalina?' }],
    arrive: [['mula', 'Minas, 1700. Pó de ouro no rio, e o Cobrador de olho em quem carrega.'], ['mula', 'Pegue pó nas bateias (✨) e leve à Casa de Fundição antes que ele te veja.']],
  });

  M.apogeu = base({
    id: 'apogeu', era: 'apogeu', title: 'Vila Rica barroca · 1740', music: 'apogeu', needMini: 'balanca',
    draft: {
      ground: '#8a9a5a', biomes: [[600, 450, 400, '#9aa068']],
      rivers: [{ w: 22, pts: [[0, 800], [600, 790], [1200, 805]] }],
      plazas: [[460, 380, 260, 180, '#c8b890']],
      roads: [{ stone: true, w: 26, pts: [[580, 880], [580, 250]] }, { stone: true, w: 22, pts: [[150, 470], [1050, 470]] }, { stone: true, w: 18, pts: [[580, 250], [180, 190]] }, { stone: true, w: 18, pts: [[580, 250], [990, 190]] }, { stone: true, w: 18, pts: [[300, 470], [180, 640]] }, { stone: true, w: 18, pts: [[880, 470], [990, 640]] }],
      buildings: [['church', 140, 100, 70, 80], ['church', 950, 100, 70, 80], ['church', 140, 640, 70, 80], ['church', 950, 640, 70, 80], ['fountain', 565, 440, 40, 40], ['smelter', 560, 140, 100, 80], ['stall', 760, 400, 50, 30], ['stall', 820, 400, 50, 30], ['sobrado', 330, 520, 70, 50], ['sobrado', 700, 520, 70, 50], ['sobrado', 330, 380, 70, 50], ['sobrado', 420, 300, 60, 50], ['sobrado', 700, 300, 60, 50]],
    },
    pois: { start: [580, 860], portal: [520, 880], chafariz: [585, 500], casafundicao: [610, 250], mercado: [800, 450], fundicao: [560, 250] },
    labels: [[610, 125, 'Casa de Fundição'], [585, 385, 'Largo'], [175, 85, 'Carmo'], [985, 85, 'São Francisco'], [175, 625, 'Rosário'], [985, 625, 'Matriz']],
    npcs: [
      { id: 'tropeiro', at: 'mercado', quiz: true, wander: 30, lines: ['Trouxe sal, tecido e notícia do Rio. Levo ouro, quando a Coroa deixa.'] },
      { id: 'quitandeira', at: 'chafariz', quiz: true, lines: ['Cada irmandade tem sua igreja. A minha é a do Rosário. Adivinha por quê.'] },
    ],
    cobrador: { patrol: ['casafundicao', 'mercado', 'chafariz'] },
    minis: [{ id: 'balanca', at: 'casafundicao', label: 'A Balança do Quinto', lines: [['fundidor', 'Pó na balança. Separe o Quinto da Coroa: nem um grão a menos, que o Cobrador está olhando.']] }],
    arrive: [['mula', 'Vila Rica no auge. Quatro igrejas, quatro morros, e todo mundo pesando ouro.']],
  });

  // ---------- ATO IV ----------
  M.inconfidencia = base({
    id: 'inconfidencia', era: 'inconfidencia', title: 'Vila Rica · 1789', music: 'inconfidencia', need: 4,
    draft: {
      ground: '#7a8a5a', biomes: [[600, 120, 220, '#6a7048']],
      roads: [{ stone: true, w: 24, pts: [[100, 860], [300, 640], [600, 560], [900, 560], [1050, 400]] }, { stone: true, w: 18, pts: [[600, 560], [600, 140]] }, { stone: true, w: 16, pts: [[300, 640], [300, 400]] }, { stone: true, w: 16, pts: [[900, 560], [950, 320]] }],
      buildings: [['gallows', 580, 70, 46, 50], ['sobrado', 220, 420, 70, 50], ['house', 330, 470, 50, 40], ['palace', 680, 440, 120, 80], ['church', 920, 220, 70, 80], ['sobrado', 420, 600, 70, 50], ['sobrado', 760, 600, 70, 50], ['sobrado', 1000, 470, 70, 50], ['fountain', 590, 580, 34, 34]],
      forests: [[150, 150, 80, '#3a5a30'], [1100, 800, 70, '#3a5a30']],
    },
    pois: { start: [100, 850], portal: [50, 875], casa: [300, 520], conspiracao: [740, 540], forca: [600, 140], igreja: [955, 320], largo: [600, 640] },
    labels: [[300, 400, 'Casa do dentista'], [740, 425, 'Casa da conspiração'], [600, 60, 'Morro da forca']],
    npcs: [
      { id: 'tiradentes', at: 'casa', quiz: true, lines: ['Alferes, tropeiro, dentista prático. Falo demais, dizem. Mas alguém tem que falar.'] },
      { id: 'silverio', at: 'largo', quiz: true, wander: 50, lines: ['Eu? Conspirar? Só estou passeando. Olhando para trás é só costume.'], right: 'Hm. Você sabe demais. Vou lembrar disso.', wrong: 'Ótimo. Quanto menos você souber, melhor... para mim.' },
      { id: 'quitandeira', at: 'conspiracao', quest: 'QST-07', lines: ['Eu vendo doce na porta dessa casa. Escuto muita coisa.'] },
      { id: 'aprendiz', at: 'igreja', quest: 'QST-09', lines: ['Estou pintando um retrato de um herói. Me disseram para pôr barba.'] },
    ],
    cobrador: { patrol: ['largo', 'conspiracao', 'igreja'] },
    arrive: [['mula', 'Vila Rica, 1789. A derrama vem aí, e tem gente conspirando de casaca.'], ['buck', 'A revolution? Now we\'re talking. We did one of those.']],
  });

  M.depois = base({
    id: 'depois', era: 'depois', title: 'Depois do ouro · 1850', music: 'depois', needMini: 'profetas',
    draft: {
      ground: '#9a9a6a', biomes: [[600, 450, 500, '#a0a070']],
      roads: [{ w: 20, col: '#c8b890', pts: [[150, 860], [300, 600], [700, 520], [700, 330]] }, { w: 16, col: '#c8b890', pts: [[300, 600], [1000, 640]] }],
      buildings: [['church', 660, 120, 90, 100], ['pedestal', 560, 250, 20, 24], ['pedestal', 600, 270, 20, 24], ['pedestal', 640, 280, 20, 24], ['pedestal', 760, 280, 20, 24], ['pedestal', 800, 270, 20, 24], ['pedestal', 840, 250, 20, 24], ['station', 250, 640, 100, 60], ['rail', 0, 720, 1200, 30], ['sobrado', 420, 560, 70, 50], ['sobrado', 850, 560, 70, 50], ['house', 950, 700, 50, 40], ['house', 520, 680, 50, 40]],
      forests: [[100, 150, 70, '#6a7a4a'], [1100, 200, 80, '#6a7a4a']],
    },
    pois: { start: [150, 850], portal: [90, 875], adro: [700, 330], estacao: [300, 710], praca: [700, 560] },
    labels: [[705, 100, 'Bom Jesus'], [300, 625, 'Estação']],
    npcs: [
      { id: 'aprendiz', at: 'adro', mini: 'profetas', lines: ['O mestre esculpe à noite. Eu falo por ele. Doze profetas, doze pedestais.'] },
      { id: 'velho', pal: 'sineiro', at: 'praca', quiz: true, lines: ['O ouro foi embora. Ficaram as igrejas, a música e a gente. E muito tempo livre.'] },
    ],
    minis: [{ id: 'profetas', label: 'Os Doze Profetas' }],
    arrive: [['narr', '1850. O ouro acabou. A cidade parou. Nada acontece.'], ['mula', 'É exatamente esse o ponto.']],
  });

  M.renascimento = base({
    id: 'renascimento', era: 'renascimento', title: 'Tiradentes · 1972', music: 'renascimento',
    draft: {
      ground: '#7aa24c', biomes: [[600, 450, 400, '#88aa54']],
      roads: [{ stone: true, w: 24, pts: [[150, 860], [400, 600], [600, 500], [900, 520]] }, { stone: true, w: 18, pts: [[600, 500], [600, 260]] }],
      plazas: [[500, 440, 200, 120, '#c8b890']],
      buildings: [['church', 560, 140, 90, 100], ['scaffold', 555, 135, 100, 110], ['car', 760, 470, 50, 30], ['sobrado', 330, 470, 70, 50], ['sobrado', 760, 560, 70, 50], ['house', 440, 640, 50, 40], ['house', 900, 420, 50, 40], ['fountain', 590, 480, 30, 30]],
      forests: [[1050, 150, 90], [100, 200, 70]],
    },
    pois: { start: [150, 850], portal: [90, 875], praca: [600, 540], igreja: [600, 270] },
    labels: [[605, 125, 'Matriz (em obra)'], [600, 425, 'Praça']],
    npcs: [{ id: 'yves', at: 'praca', quiz: true, lines: ['Yves Alves. Cheguei e vi uma cidade dormindo. Pensei: isso aqui precisa acordar devagar.'] }],
    arrive: [['mula', '1972. Um inglês com câmera achou Tiradentes. A cidade acorda.']],
  });

  // ---------- Tiradentes-Hoje: as 16 paradas do tour real ----------
  M.tiradentes = base({
    id: 'tiradentes', era: 'prologo', title: 'Tiradentes · Hoje', music: 'hoje', noCards: true, tour: true, stoneAt: 'T5',
    exit: { map: 'hoje', at: 'door_tiradentes', title: 'Brasil · Hoje' },
    draft: {
      ground: '#7aa24c', biomes: [[600, 450, 450, '#86a856']],
      mountains: [[1100, 80, 70], [980, 60, 50]], noSnow: true,
      rivers: [{ w: 20, pts: [[0, 380], [400, 390], [800, 370], [1200, 380]] }],
      roads: [{ stone: true, w: 22, pts: [[120, 120], [260, 200], [420, 300], [520, 380], [560, 470], [500, 560], [400, 640], [300, 720], [450, 800], [650, 790], [820, 700], [900, 600], [960, 480], [880, 300], [760, 230], [640, 180]] }],
      buildings: [['cross', 110, 80, 22, 38], ['church', 760, 120, 80, 90], ['church', 300, 500, 60, 70], ['statue', 640, 760, 20, 30], ['fountain', 140, 820, 40, 36], ['well', 900, 230, 24, 24], ['sobrado', 600, 600, 70, 50], ['sobrado', 740, 480, 70, 50], ['house', 200, 600, 50, 40], ['house', 1000, 650, 50, 40], ['church', 1040, 420, 60, 70]],
    },
    pois: {
      start: [160, 780], portal: [60, 860],
      T0: [130, 140], T1: [270, 210], T2: [440, 380], T3: [530, 420], T4: [560, 490], T5: [480, 580], T6: [380, 650], T7: [300, 610], T8: [650, 800], T9: [330, 560], T10: [840, 690], T11: [910, 270], T12: [790, 230], T13: [960, 500], T14: [880, 600], T15: [170, 860],
    },
    labels: [[130, 70, 'Mirante'], [800, 105, 'Matriz'], [500, 610, 'Beco da Pedreira'], [530, 395, 'Largo das Forras']],
    npcs: [{ id: 'louie', at: 'T3', lines: [], egg(S, n, E) {
      const k = (E.G.flags.louieN = (E.G.flags.louieN || 0) + 1);
      if (E.G.flags.guia) return E.say([['louie', 'Hey, colleague! How\'s the cowboy-hat thing working with the Texans?'], ['buck', 'Like a charm, partner. They think I\'m one of them.'], ['louie', 'Aren\'t you?'], ['buck', 'Long story. Involves a fountain.']]);
      if (k < 3) return E.say([['louie', k === 1 ? 'Folks, this is the Largo das Forras. "Forras" were freed women who sold food here.' : 'And yes, the cobblestones are original. Your ankles will remember Tiradentes.']]);
      E.secret('louie', [['louie', 'You know, you\'d make a decent guide. Cowboy hat\'s a nice touch.'], ['mula', 'Ouviu isso? Anota.']]);
    } }],
    arrive: [['sineiro', 'Tiradentes de hoje. As paradas do tour estão marcadas (T0 a T15). Ande até elas.']],
  });
})();
