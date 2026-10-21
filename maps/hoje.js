// Mapa do Hoje (Brasil de videogame). Enquanto não existe img/map_hoje.png, o motor pinta este
// rascunho vetorial em pixel art e gera a grade de caminhada a partir dele (água, rio e serra bloqueiam;
// estrada desbloqueia — onde a estrada cruza o rio nasce uma ponte). POIs em px do mundo.
window.MAPS = window.MAPS || {};
window.MAPS.hoje = {
  id: 'hoje', era: 'prologo', title: 'Brasil · Hoje', music: 'hoje',
  w: 2400, h: 2000, cell: 8,
  start: 'chafariz',
  draft: {
    land: [[300, 500], [500, 350], [800, 300], [1000, 210], [1200, 250], [1350, 180], [1500, 300], [1700, 350], [1900, 450], [2100, 500],
      [2300, 600], [2340, 700], [2260, 800], [2160, 950], [2110, 1100], [2060, 1250], [1960, 1400], [1810, 1520], [1650, 1600], [1500, 1700],
      [1350, 1800], [1200, 1900], [1050, 1950], [950, 1850], [1000, 1700], [900, 1550], [750, 1500], [600, 1400], [450, 1300], [350, 1150],
      [250, 1000], [200, 800], [250, 650]],
    // tons por região: [x, y, raio, cor]
    biomes: [[700, 650, 650, '#3f7a34'], [1250, 500, 450, '#4a8a3a'], [1300, 1150, 500, '#b9a75a'], [2000, 850, 380, '#c9a467'],
      [1650, 1350, 350, '#6a9a44'], [1150, 1650, 380, '#7aa24c']],
    rivers: [
      { w: 26, pts: [[200, 720], [500, 700], [800, 640], [1100, 600], [1400, 520], [1600, 440], [1760, 400]] },   // Amazonas
      { w: 18, pts: [[1480, 1260], [1600, 1120], [1760, 1000], [1950, 900], [2160, 880], [2250, 870]] },         // São Francisco
      { w: 12, pts: [[1350, 1420], [1450, 1395], [1560, 1440], [1650, 1470]] },                                // Rio das Mortes
    ],
    mountains: [[1420, 1560, 60], [1500, 1600, 50], [1580, 1560, 55], [1540, 1180, 45], [1560, 1100, 40], [1300, 1480, 45],
      [2140, 820, 30], [1000, 1300, 60], [1080, 1340, 45], [700, 1150, 55]],
    roads: [
      { w: 22, pts: [[1430, 1440], [1500, 1385], [1560, 1330], [1620, 1280], [1680, 1240], [1740, 1230]] },             // Minas: Tiradentes → SJdR → Vila Rica
      { w: 22, dotted: true, pts: [[1500, 1385], [1580, 1420], [1660, 1450], [1760, 1480]] },                          // Estrada Real até o Rio
      { w: 20, pts: [[1680, 1240], [1800, 1130], [1930, 1100], [2000, 1180]] },                                          // Minas → Porto Seguro
      { w: 20, pts: [[1930, 1100], [2030, 960], [2120, 860], [2160, 760], [2220, 700]] },                                // Bahia → Recife
      { w: 18, pts: [[2120, 860], [2140, 790]] },                                                                         // subida da Serra da Barriga
      { w: 18, pts: [[2220, 700], [2250, 640]] },                                                                         // forte holandês
      { w: 20, pts: [[1500, 1385], [1400, 1250], [1300, 1100], [1100, 900], [900, 760], [700, 600]] },                  // interior → Amazônia
      { w: 16, pts: [[1430, 1440], [1400, 1480]] },                                                                       // Tiradentes → mirante
      { w: 18, pts: [[1760, 1480], [1720, 1520]] },                                                                       // Rio → baía
    ],
    towns: [[1440, 1420, 6], [1500, 1370, 8], [1700, 1230, 9], [1770, 1470, 10], [2000, 1200, 4], [2210, 720, 7], [1300, 1090, 5]],
  },
  pois: {
    chafariz: [1418, 1428], mirante: [1398, 1478], sineiro: [1512, 1392], tropeiro: [1600, 1430],
  },
  labels: [
    [1440, 1395, 'Tiradentes'], [1505, 1342, 'São João del-Rei'], [1705, 1200, 'Vila Rica'], [1775, 1445, 'Rio de Janeiro'],
    [2005, 1172, 'Porto Seguro'], [2215, 695, 'Recife'], [2140, 760, 'Serra da Barriga'], [800, 560, 'Amazônia'], [1640, 1462, 'Estrada Real'],
  ],
  // buraco → era (px do mundo)
  holes: {
    ouro: [1545, 1335], apogeu: [1605, 1300], inconfidencia: [1690, 1262], depois: [1745, 1255], renascimento: [1385, 1460],
    mundo: [1730, 1515], paubrasil: [2010, 1205], acucar: [2150, 760], invasoes: [2255, 650], palmares: [2140, 800],
  },
};
