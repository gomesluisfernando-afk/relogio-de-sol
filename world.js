// Mundo aberto: tudo que dá vida ao mapa além da trilha principal. Só dados e desenhos; o motor (game.js) lê daqui.
// - NPCs de curiosidade: contam um fato e o "isso viria a ser" (a ligação com o Brasil de hoje). Formas = lugar de imagem futura.
// - Folclore espalhado pelo mundo, itens com raridade, comidas com efeito, pousos de tropeiro, missões paralelas,
//   coleções do Gabinete de Curiosidades e eventos do calendário real.
// Falas: [quem, texto, 'forma:legenda'] como nos mapas. Fato incerto vai em `conferir` (o verificador avisa).
window.WORLD = (() => {
  const W = {};

  // ---------- pessoas novas (paleta do boneco e nome) ----------
  W.pal = {
    carioca: { skin: '#8a5a3a', hair: '#1a1a1a', shirt: '#e85a8a', pants: '#3a5a8a', boots: '#fff', long: 1 },
    pescador: { skin: '#a8724c', hair: '#ddd', shirt: '#f2efe6', pants: '#4a6a8a', boots: null, hat: 'leather', hatc: '#c8a050' },
    frevo: { skin: '#6a4430', hair: '#111', shirt: '#ffd84a', plaid: '#e84a4a', pants: '#2a6adf', boots: '#111' },
    ribeirinha: { skin: '#a8724c', hair: '#111', shirt: '#4ab07a', pants: '#3a5a3a', boots: null, long: 1 },
    guardia: { skin: '#3a2418', hair: '#ddd', shirt: '#f2efe6', pants: '#f2efe6', boots: null, robe: 1, turban: '#f2efe6' },
    ouropreto: { skin: '#e8c8a8', hair: '#999', shirt: '#6a4a8a', pants: '#3a3a3a', boots: '#2a1a0a', glasses: 1 },
    maquinista: { skin: '#c89070', hair: '#3a2a1a', shirt: '#2a3a6a', pants: '#2a3a6a', boots: '#111', hat: 'leather', hatc: '#1a2a4a', mustache: '#3a2a1a' },
    vaqueiro: { skin: '#b07a52', hair: '#3a2a1a', shirt: '#9a6a3a', plaid: '#7a4a2a', pants: '#7a5a3a', boots: '#3a2212', hat: 'leather', hatc: '#7a4a2a' },
    arrieiro: { skin: '#c89a74', hair: '#555', shirt: '#7a3a2a', plaid: '#e0c080', pants: '#5a4a3a', boots: '#3a2212', hat: 'leather', hatc: '#5a4030', beard: '#555' },
    moncoeiro: { skin: '#c89a74', hair: '#2a1a0a', shirt: '#e8dcc0', pants: '#4a5a6a', boots: null, hat: 'leather', hatc: '#c8a050' },
    cartografo: { skin: '#f0d0b0', hair: '#8a6a4a', shirt: '#5a2a5a', buttons: '#e8c04a', pants: '#2a2a2a', boots: '#111', glasses: 1 },
    marinheiro: { skin: '#e2b48c', hair: '#6b4a2a', shirt: '#f2efe6', plaid: '#2a4a8a', pants: '#2a4a8a', boots: null, beard: '#6b4a2a' },
    tintureiro: { skin: '#f0d0b0', hair: '#3a2a1a', shirt: '#b8302a', pants: '#5a3a2a', boots: '#2a1a0a', apron: '#7a1f14' },
    engenho: { skin: '#3a2418', hair: '#111', shirt: '#c8b890', pants: '#7a6a4a', boots: null },
    marcgrave: { skin: '#f0d8c0', hair: '#c8a878', shirt: '#2a4a3a', buttons: '#fff', pants: '#2a2a3a', boots: '#111', hat: 'tricorne', hatc: '#1a1a1a', book: 1 },
    rabino: { skin: '#e8c8a8', hair: '#2a1a0a', shirt: '#1a1a2a', pants: '#1a1a2a', boots: '#111', robe: 1, beard: '#2a1a0a', hat: 'barrete', hatc: '#111' },
    jardineiro: { skin: '#f0d8c0', hair: '#d8b060', shirt: '#4a7a3a', pants: '#5a4a3a', boots: '#3a2a1a', apron: '#8a6a3a' },
    anciao: { skin: '#3a2418', hair: '#ddd', shirt: '#8a5a2a', pants: '#5a3a1a', boots: null, beard: '#ddd' },
    faiscador: { skin: '#5a3a28', hair: '#111', shirt: '#c8b890', pants: '#6a5a3a', boots: null, hat: 'leather', hatc: '#8a6a3a' },
    contador: { skin: '#8a5a3a', hair: '#ddd', shirt: '#e8dcc0', pants: '#5a4a3a', boots: null, beard: '#ddd' },
    musico: { skin: '#8a5a3a', hair: '#1a1a1a', shirt: '#2a2a5a', buttons: '#e8c04a', pants: '#1a1a2a', boots: '#111' },
    irmao: { skin: '#3a2418', hair: '#111', shirt: '#f2efe6', pants: '#2a2a2a', boots: '#111', robe: 1 },
    poeta: { skin: '#f0d0b0', hair: '#eee', shirt: '#3a2a5a', buttons: '#fff', pants: '#2a2a2a', boots: '#111', long: 1 },
    conspirador: { skin: '#e8c8a8', hair: '#3a2a1a', shirt: '#7a1f14', pants: '#2a2a2a', boots: '#111', hat: 'tricorne', hatc: '#2a1a1a' },
    cafeeiro: { skin: '#c89a74', hair: '#888', shirt: '#6a4a2a', pants: '#4a3a2a', boots: '#2a1a0a', hat: 'leather', hatc: '#4a3a2a', beard: '#888' },
    engenheiro: { skin: '#f0d8c0', hair: '#c88a4a', shirt: '#4a4a4a', buttons: '#ddd', pants: '#2a2a2a', boots: '#111', mustache: '#c88a4a', hat: 'tricorne', hatc: '#111' },
    restauradora: { skin: '#e8c0a0', hair: '#5a3a2a', shirt: '#e8e0c8', pants: '#5a6a8a', boots: '#3a2a1a', apron: '#aaa', glasses: 1 },
    cineasta: { skin: '#c89070', hair: '#111', shirt: '#111', pants: '#3a3a3a', boots: '#111', camera: 1, glasses: 1 },
    curadora: { skin: '#8a5a3a', hair: '#2a1a0a', shirt: '#6a2a3a', pants: '#2a2a2a', boots: '#111', glasses: 1, long: 1 },
    zelador: { skin: '#c89a74', hair: '#ddd', shirt: '#4a3a2a', pants: '#2a2a2a', boots: '#111', robe: 1 },
    amado: { skin: '#e8c0a0', hair: '#3a2a1a', shirt: '#f2efe6', pants: '#4a8ad8', boots: '#fff', apron: '#ff8ab0' },
    antiquario: { skin: '#e8c8a8', hair: '#bbb', shirt: '#5a3a2a', plaid: '#3a2a1a', pants: '#3a2a1a', boots: '#111', glasses: 1, mustache: '#bbb' },
    chapeleiro: { skin: '#c89070', hair: '#3a2a1a', shirt: '#e8dcc0', pants: '#5a4a3a', boots: '#3a2212', hat: 'tricorne', hatc: '#7a1f14' },
    queijeira: { skin: '#e8c8a8', hair: '#8a5a3a', shirt: '#f2c84a', pants: '#8a3a2a', boots: null, robe: 1, apron: '#fff' },
    guia: { skin: '#e2b48c', hair: '#3a2a1a', shirt: '#2a6a3a', pants: '#3a3a3a', boots: '#3a2212', hat: 'leather', hatc: '#5a3a1a', badgeColor: '#ffd84a' },
  };
  W.names = {
    carioca: 'Dona Carmem', pescador: 'Seu Tião, pescador', frevo: 'Pedro do Frevo', ribeirinha: 'Dona Raimunda', guardia: 'Dona Benedita',
    ouropreto: 'Seu Geraldo', maquinista: 'Seu Zé, maquinista', vaqueiro: 'Seu Vicente, vaqueiro', arrieiro: 'O arrieiro', moncoeiro: 'O monçoeiro',
    cartografo: 'O cartógrafo', marinheiro: 'Um marinheiro', tintureiro: 'O tintureiro', engenho: 'Um trabalhador do engenho', marcgrave: 'Georg Marcgrave',
    rabino: 'Isaac Aboab da Fonseca', jardineiro: 'O jardineiro de Nassau', anciao: 'Uma anciã de Palmares', faiscador: 'Um faiscador', contador: 'Um contador de causos',
    musico: 'Um músico', irmao: 'Um irmão do Rosário', poeta: 'Tomás Antônio Gonzaga', conspirador: 'Um conspirador', cafeeiro: 'Um tropeiro do café',
    engenheiro: 'Um engenheiro inglês', restauradora: 'A restauradora', cineasta: 'Um cineasta', curadora: 'A curadora do museu', zelador: 'O zelador da Matriz',
    amado: 'Amado, da sorveteria', antiquario: 'O antiquário', chapeleiro: 'O chapeleiro', queijeira: 'A quitandeira da praça', guia: 'O guia',
    curupira: 'Curupira', saci: 'Saci', iara: 'Iara', boitata: 'Boitatá', lobisomem: 'Lobisomem', boto: 'Boto', mapinguari: 'Mapinguari', maedoouro: 'Mãe-do-Ouro',
  };

  // ---------- raridade (cores do WoW, nomes da época) ----------
  W.rarity = {
    comum: { name: 'Coisa', col: '#b8b8b8' },
    achado: { name: 'Achado', col: '#5ad85a' },
    documento: { name: 'Documento', col: '#5aa8ff' },
    reliquia: { name: 'Relíquia', col: '#c070ff' },
    brilho: { name: 'Brilho', col: '#ffb030' },
  };

  // ---------- itens ----------
  // kind: util (fica com você e muda o jogo) · comida (consome, efeito por tempo) · colecao · antiguidade · chapeu
  W.items = {
    botas: { name: 'Botas de tropeiro', icon: '👢', kind: 'util', rarity: 'reliquia', price: 400, desc: '+40% de velocidade, para sempre. O item que todo viajante quer.' },
    lampiao: { name: 'Lampião', icon: '🏮', kind: 'util', rarity: 'achado', price: 150, desc: 'Você enxerga mais longe: a vista do mapa se abre.' },
    luneta: { name: 'Luneta holandesa', icon: '🔭', kind: 'util', rarity: 'documento', price: 250, desc: 'Mostra no minimapa quem tem algo para contar ou pedir.' },
    pedra: { name: 'Pedra de toque', icon: '🪨', kind: 'util', rarity: 'achado', price: 80, desc: 'Mede a pureza do ouro: a Fundição paga 25% a mais pelo seu pó.' },
    guia: { name: 'Guia de trânsito', icon: '📜', kind: 'util', rarity: 'documento', price: 60, desc: 'Papel em dia: o Cobrador leva só 10% do pó, e não 20%.' },
    canoa: { name: 'Canoa de monção', icon: '🛶', kind: 'util', rarity: 'documento', price: 120, desc: 'Libera o pouso da Amazônia: rio é estrada.' },
    rede: { name: 'Rede de dormir', icon: '🪢', kind: 'util', rarity: 'reliquia', desc: 'Presente de Paraguaçu. Use para descansar: +25% de velocidade por 150 s.' },
    ferradura: { name: 'Ferradura dourada', icon: '🧲', kind: 'util', rarity: 'reliquia', desc: 'Dos tropeiros: viagem nos pousos pela metade do preço.' },
    // comidas: buff.speed = bônus somado à velocidade; stealth = Cobrador não vê; radar = relatórios piscam no minimapa
    rapadura: { name: 'Rapadura', icon: '🍬', kind: 'comida', rarity: 'comum', price: 5, buff: { speed: 0.8, secs: 40 }, desc: '+80% de velocidade por 40 s. Açúcar que aguenta viagem.' },
    farinha: { name: 'Farinha de mandioca', icon: '🌾', kind: 'comida', rarity: 'comum', price: 10, buff: { speed: 0.25, secs: 180 }, desc: '+25% por 3 min. Aprendida com os povos indígenas, sustentou a colônia.' },
    pacoca: { name: 'Paçoca de pilão', icon: '🥩', kind: 'comida', rarity: 'comum', price: 15, buff: { speed: 0.35, secs: 120 }, desc: '+35% por 2 min. Carne-seca socada com farinha: comida de tropa.' },
    angu: { name: 'Prato de angu', icon: '🍲', kind: 'comida', rarity: 'comum', price: 12, buff: { speed: 0.2, secs: 600 }, desc: '+20% por 10 min. Fubá, água e paciência: comida de pouso.' },
    quitanda: { name: 'Quitanda', icon: '🥮', kind: 'comida', rarity: 'achado', price: 8, buff: { radar: 1, secs: 90 }, desc: 'Por 90 s, os relatórios piscam no minimapa. Quitandeira sabe de tudo.' },
    paodequeijo: { name: 'Pão de queijo', icon: '🧀', kind: 'comida', rarity: 'comum', price: 6, buff: { stealth: 1, secs: 60 }, desc: 'Por 60 s o Cobrador não te vê: fica distraído com o cheiro.' },
    sorvete: { name: 'Sorvete do Amado', icon: '🍦', kind: 'comida', rarity: 'achado', price: 10, buff: { speed: 0.5, secs: 90 }, desc: '+50% por 90 s. Refresca até cowboy.' },
    // coleção (os 4 antigos continuam em data/items.json)
    regua: { name: 'Régua dos Reis', icon: '📏', kind: 'colecao', rarity: 'documento', desc: 'Lembrança de Tordesilhas, 1494.' },
    machado: { name: 'Machado de ferro', icon: '🪓', kind: 'colecao', rarity: 'achado', desc: 'O valor de uma coisa depende de quem precisa dela.' },
    boticao: { name: 'Boticão do Tiradentes', icon: '🦷', kind: 'colecao', rarity: 'reliquia', desc: 'A ferramenta do dentista prático que virou herói.' },
    formao: { name: 'Formão do mestre', icon: '🔨', kind: 'colecao', rarity: 'reliquia', desc: 'Pedra-sabão, Congonhas. As mãos doíam; o formão não parava.' },
    gravura: { name: 'Gravura do parque de Nassau', icon: '🖼️', kind: 'colecao', rarity: 'documento', desc: 'Plantas e bichos do Brasil desenhados para a Europa.' },
    pirita: { name: 'Pirita (ouro de tolo)', icon: '🪙', kind: 'colecao', rarity: 'comum', desc: 'Brilha, mas não é ouro. Prêmio de quem vende e compra só pelo lucro.' },
    // antiguidades (Antiquário de Tiradentes)
    oratorio: { name: 'Oratório de viagem', icon: '⛪', kind: 'antiguidade', rarity: 'documento', price: 120, desc: 'Tropeiros levavam um oratório pequeno, de abrir, para rezar na estrada.' },
    bateia: { name: 'Bateia antiga', icon: '🥣', kind: 'antiguidade', rarity: 'achado', price: 60, desc: 'A bacia de madeira do garimpo. Muito da técnica veio de africanos que já mineravam na África.' },
    ferro: { name: 'Ferro de brasa', icon: '🧺', kind: 'antiguidade', rarity: 'achado', price: 50, desc: 'Ferro de passar com brasa dentro. Passar roupa era trabalho pesado e quente.' },
    estanho: { name: 'Prato de estanho', icon: '🍽️', kind: 'antiguidade', rarity: 'documento', price: 80, desc: 'São João del-Rei é conhecida pelo artesanato em estanho.' },
    // chapéus (só aparência)
    stetson: { name: 'Stetson do Buck', icon: '🤠', kind: 'chapeu', rarity: 'comum', hat: 'stetson', hatc: '#6b4a2a', desc: 'O de sempre. Veio de Nashville.' },
    couro: { name: 'Chapéu de couro', icon: '👒', kind: 'chapeu', rarity: 'achado', price: 120, hat: 'leather', hatc: '#7a4a2a', desc: 'Chapéu de tropeiro e de vaqueiro.' },
    palha: { name: 'Chapéu de palha', icon: '👒', kind: 'chapeu', rarity: 'comum', price: 60, hat: 'palha', hatc: '#e8d070', desc: 'Da roça, da festa junina, do sol forte.' },
    tricornio: { name: 'Tricórnio', icon: '🎩', kind: 'chapeu', rarity: 'documento', price: 200, hat: 'tricorne', hatc: '#1a1a1a', desc: 'Moda do século XVIII. Até o Cobrador usa.' },
    barrete: { name: 'Barrete', icon: '🎓', kind: 'chapeu', rarity: 'achado', price: 150, hat: 'barrete', hatc: '#111', desc: 'O chapeuzinho redondo dos padres e estudantes.' },
  };
  W.conferir = [
    'items.bateia: a origem africana de parte da técnica de mineração (ver literatura sobre mineração em Minas)',
    'items.estanho: tradição do estanho em São João del-Rei (data de início)',
  ];

  // ---------- pousos de tropeiro: viagem rápida no mapa Hoje ----------
  W.pousos = [
    { id: 'tiradentes', name: 'Tiradentes', xy: [1380, 1425] },
    { id: 'sjdr', name: 'São João del-Rei', xy: [1470, 1392] },
    { id: 'vilarica', name: 'Vila Rica (Ouro Preto)', xy: [1720, 1215] },
    { id: 'rio', name: 'Rio de Janeiro', xy: [1765, 1470] },
    { id: 'portoseguro', name: 'Porto Seguro', xy: [1975, 1190] },
    { id: 'recife', name: 'Recife', xy: [2205, 735] },
    { id: 'sertao', name: 'Sertão do São Francisco', xy: [1310, 1110] },
    { id: 'amazonia', name: 'Amazônia', xy: [720, 610], need: 'canoa' },
  ];

  // ---------- NPCs de curiosidade por mapa ----------
  // talk: o que contam (dá brilho na 1ª vez) · vendor: o que vendem · donate: aceita doação (ouro → brilho)
  // special: museum | antique | hats
  const V = (s) => `➜ Isso viria a ser: ${s}`;
  W.npcs = {
    hoje: [
      { id: 'carioca', xy: [1790, 1455], talk: [
        ['carioca', '1808. A família real portuguesa fugiu de Napoleão e veio morar aqui no Rio. Uma corte inteira descendo do navio.', 'square:A corte desembarca no Rio'],
        ['carioca', 'De um dia para o outro, a colônia virou sede do império. Tiveram que inventar tudo às pressas.', 'circle:Uma cidade virando capital'],
        ['carioca', 'Em 1808 abriram os portos às nações amigas (o decreto foi assinado ainda em Salvador) e criaram o Banco do Brasil e o Jardim Botânico.', 'diamond:Portos abertos, 1808'],
        ['carioca', V('os livros que a corte trouxe deram origem à Biblioteca Nacional, uma das maiores do mundo.'), 'triangle:A Biblioteca Nacional hoje'],
      ] },
      { id: 'pescador', xy: [2020, 1182], talk: [
        ['pescador', 'Daqui de Porto Seguro se vê o Monte Pascoal. Foi a primeira terra que a frota de Cabral avistou, em 22 de abril de 1500.', 'triangle:O Monte Pascoal'],
        ['pescador', 'Primeiro chamaram de Ilha de Vera Cruz. Depois Terra de Santa Cruz. Brasil veio da árvore que dava tinta vermelha.', 'square:Os três nomes'],
        ['pescador', V('o pau-brasil quase sumiu da mata. Hoje é a árvore nacional, protegida por lei, e a madeira ainda faz arcos de violino de concerto.'), 'circle:O arco do violino'],
      ] },
      { id: 'frevo', xy: [2228, 702], talk: [
        ['frevo', 'Recife! Tá ouvindo? É frevo. Nasceu aqui no fim do século XIX, misturando marcha, maxixe e passos de capoeira.', 'circle:A sombrinha do frevo'],
        ['frevo', 'O nome vem de "ferver". O povo falava "frever". E ferve mesmo.', 'diamond:O passo do frevo'],
        ['frevo', V('em 2012 a UNESCO declarou o frevo Patrimônio Cultural Imaterial da Humanidade.'), 'square:Carnaval de rua no Recife'],
      ] },
      { id: 'ribeirinha', xy: [760, 585], talk: [
        ['ribeirinha', '1542: o espanhol Francisco de Orellana desceu este rio inteiro, dos Andes até o mar.', 'triangle:O bergantim de Orellana'],
        ['ribeirinha', 'Contou que lutou contra mulheres guerreiras. Lembraram das amazonas das lendas gregas, e o rio ganhou o nome.', 'circle:As amazonas da lenda'],
        ['ribeirinha', V('o Amazonas é o rio com mais água do mundo: sozinho, despeja no mar perto de um quinto de toda a água doce que os rios levam ao oceano.'), 'square:A foz do Amazonas'],
        ['ribeirinha', 'E a floresta guarda bicho e planta que nem nome têm ainda. Cuida dela, moço.'],
      ] },
      { id: 'guardia', xy: [2108, 832], serio: true, talk: [
        ['guardia', 'Esta é a Serra da Barriga, em Alagoas. Aqui ficou Palmares, o maior quilombo das Américas.', 'triangle:A Serra da Barriga'],
        ['guardia', 'Zumbi foi morto em 20 de novembro de 1695.', 'circle:Zumbi dos Palmares'],
        ['guardia', V('o 20 de novembro virou o Dia Nacional de Zumbi e da Consciência Negra. Desde 2024 é feriado nacional.'), 'square:20 de novembro'],
        ['guardia', 'Hoje a serra é um parque memorial. Quem sobe aqui, sobe em silêncio.'],
      ] },
      { id: 'ouropreto', xy: [1688, 1212], talk: [
        ['ouropreto', 'Vila Rica era o nome antigo. Em 1823 virou Imperial Cidade de Ouro Preto.', 'square:Vila Rica vira Ouro Preto'],
        ['ouropreto', 'E o nome? O ouro daqui vinha coberto de óxido de ferro, escuro. Ouro preto.', 'circle:A pepita escura'],
        ['ouropreto', 'Foi capital de Minas até 1897, quando inauguraram Belo Horizonte, cidade planejada no papel.', 'diamond:O mapa de Belo Horizonte'],
        ['ouropreto', V('em 1980 Ouro Preto foi a primeira cidade brasileira declarada Patrimônio Mundial pela UNESCO.'), 'triangle:Patrimônio da Humanidade'],
      ] },
      { id: 'maquinista', xy: [1527, 1352], talk: [
        ['maquinista', 'Ouviu o apito? É a Maria Fumaça, que liga São João del-Rei a Tiradentes.', 'circle:A Maria Fumaça'],
        ['maquinista', 'A Estrada de Ferro Oeste de Minas chegou aqui em 1881, com trilho estreito, de 76 centímetros, para subir serra.', 'square:A bitolinha'],
        ['maquinista', V('o trem de passageiros sumiu de quase todo o Brasil. Este trecho sobreviveu e virou passeio: os mesmos trilhos, mais de 140 anos depois.'), 'triangle:O trem turístico hoje'],
      ], conferir: ['maquinista: data e bitola da EFOM (1881; 76 cm / 762 mm)'] },
      { id: 'vaqueiro', xy: [1290, 1080], talk: [
        ['vaqueiro', 'O gado subiu o Rio São Francisco e povoou o sertão. Por isso chamaram o rio de Rio dos Currais.', 'triangle:O gado no sertão'],
        ['vaqueiro', 'O couro servia pra tudo: roupa, porta, cama, mala, corda. O historiador Capistrano de Abreu falou numa "época do couro".', 'square:Tudo de couro'],
        ['vaqueiro', V('o gibão e o chapéu de couro do vaqueiro, que Luiz Gonzaga levou para os palcos do Brasil inteiro.'), 'circle:O Rei do Baião'],
        ['vaqueiro', 'E o Velho Chico, o São Francisco, ainda leva água para milhões de pessoas.'],
      ], conferir: ['vaqueiro: expressão de Capistrano de Abreu ("época do couro" / "civilização do couro")'] },
      { id: 'arrieiro', xy: [1588, 1452], side: ['SQ-pousos'], talk: [
        ['arrieiro', 'Arrieiro é quem manda na tropa. Cada lote tem sete ou oito mulas, e cada mula leva umas oito arrobas.', 'square:A tropa de mulas'],
        ['arrieiro', 'Sem estrada boa, era a mula que levava sal, tecido e ferro para as minas, e trazia ouro e depois café.', 'circle:A carga da mula'],
        ['arrieiro', V('os pousos de tropeiro viraram vilas e cidades. Muita cidade mineira começou como um rancho de beira de estrada.'), 'triangle:Do pouso à cidade'],
      ], conferir: ['arrieiro: tamanho dos lotes e carga por mula'] },
      { id: 'moncoeiro', xy: [1350, 1100], vendor: ['canoa'], talk: [
        ['moncoeiro', 'Monção é viagem de canoa. Saíamos de Porto Feliz, no rio Tietê, até as minas de Cuiabá. Meses de rio.', 'triangle:A canoa de monção'],
        ['moncoeiro', 'Rio é estrada. Quer ir para a Amazônia? Sem canoa, nem pense.'],
        ['moncoeiro', V('os rios ainda são a estrada da Amazônia: lá, muita cidade só se alcança de barco.'), 'circle:O barco de linha na Amazônia'],
      ] },
    ],
    mundo: [
      { id: 'cartografo', xy: [380, 380], talk: [
        ['cartografo', 'Sou cartógrafo. Desenho o que os marinheiros contam. Metade é verdade, metade é monstro marinho.', 'square:O mapa com monstros'],
        ['cartografo', 'Esta linha de Tordesilhas? Ninguém sabe direito onde ela passa em terra. Nem os reis.', 'triangle:A linha no mapa'],
        ['cartografo', 'Em 1502 um mapa português foi levado escondido para a Itália. Já mostrava a linha e um pedaço da costa do Brasil: o Planisfério de Cantino.', 'circle:O mapa de Cantino'],
        ['cartografo', V('os bandeirantes passaram por cima da linha. Em 1750, o Tratado de Madri aceitou: a terra é de quem ocupa. O Brasil ficou muito maior que a linha previa.'), 'diamond:O Brasil depois de 1750'],
      ] },
      { id: 'marinheiro', xy: [470, 700], talk: [
        ['marinheiro', 'Sabe o que mais mata no mar? Não é tempestade. É o escorbuto: a gengiva sangra, o dente cai.', 'circle:O marinheiro doente'],
        ['marinheiro', 'Na viagem de Vasco da Gama à Índia morreu muita gente assim. Ninguém sabia a causa.', 'square:A nau de Vasco da Gama'],
        ['marinheiro', 'Era falta de vitamina C: faltava fruta fresca.', 'triangle:Laranja e limão'],
        ['marinheiro', V('séculos depois, a Marinha inglesa passou a dar suco de limão aos marujos. Por isso os ingleses ganharam o apelido de "limeys".'), 'diamond:O suco de limão a bordo'],
      ] },
    ],
    paubrasil: [
      { id: 'tintureiro', xy: [480, 700], talk: [
        ['tintureiro', 'Lá na Europa eu tinjo tecido. Sabe o que eles mais querem? Vermelho. Panos de rei, de bispo, de rico.', 'square:O tecido vermelho'],
        ['tintureiro', 'O pau-brasil, picado e fervido, solta uma tinta vermelha forte. Quem cortava e carregava as toras eram os indígenas, em troca de objetos.', 'circle:A tora e o machado'],
        ['tintureiro', V('no século XIX a tinta química acabou com o negócio. Mas a madeira continua cobiçada para arcos de violino, e a árvore hoje é protegida.'), 'triangle:O pau-brasil hoje'],
      ] },
    ],
    acucar: [
      { id: 'engenho', xy: [700, 690], serio: true, talk: [
        ['engenho', 'No engenho tudo gira em volta da moenda. A cana tem que ser moída logo depois de cortada, senão azeda.', 'circle:A cana cortada'],
        ['engenho', 'Nos séculos XVI e XVII o Brasil foi o maior produtor de açúcar do mundo. Pernambuco e Bahia mandavam navios cheios para a Europa.', 'square:Os navios do açúcar'],
        ['engenho', 'Esse açúcar saía do trabalho de pessoas escravizadas, trazidas à força da África.', 'triangle:A travessia'],
        ['engenho', V('o Brasil ainda é o maior produtor de cana-de-açúcar do planeta. Da cana sai também o etanol que move carros.'), 'diamond:O canavial de hoje'],
      ] },
    ],
    invasoes: [
      { id: 'marcgrave', xy: [300, 300], talk: [
        ['marcgrave', 'Vim com Nassau para estudar o céu e a natureza daqui. Montei um observatório no alto do palácio.', 'circle:O observatório'],
        ['marcgrave', 'Desenhei tamanduá, preguiça, caju, mandioca. Coisas que nenhum europeu tinha visto.', 'square:O tamanduá desenhado'],
        ['marcgrave', V('em 1648 saiu o livro "Historia Naturalis Brasiliae". Por mais de um século foi a principal obra sobre a natureza do Brasil.'), 'triangle:O livro de 1648'],
        ['marcgrave', 'Nassau também trouxe pintores, como Frans Post e Albert Eckhout. São as primeiras pinturas europeias feitas aqui.'],
      ], conferir: ['marcgrave: observatório em Recife (c. 1639), um dos primeiros das Américas'] },
      { id: 'rabino', xy: [440, 690], talk: [
        ['rabino', 'Sou Isaac Aboab da Fonseca, rabino. No Recife holandês havia liberdade para rezar do nosso jeito.', 'circle:A sinagoga'],
        ['rabino', 'A nossa sinagoga, Kahal Zur Israel, foi a primeira das Américas.', 'square:Kahal Zur Israel'],
        ['rabino', V('depois de 1654 a comunidade se espalhou pelo mundo. A antiga sinagoga foi reaberta como museu, na Rua do Bom Jesus, no Recife.'), 'triangle:O museu hoje'],
      ] },
      { id: 'jardineiro', xy: [820, 620], side: ['SQ-jardim'], talk: [
        ['jardineiro', 'Nassau mandou fazer um parque no palácio: árvores frutíferas, plantas daqui e bichos de toda parte.', 'circle:O parque do palácio'],
        ['jardineiro', V('jardins botânicos e zoológicos viraram lugares de ciência. O Recife holandês foi um dos primeiros a ter um assim nas Américas.'), 'square:O jardim botânico'],
      ], conferir: ['jardineiro: parque de Vrijburg/Friburgo como pioneiro nas Américas'] },
    ],
    palmares: [
      { id: 'anciao', xy: [720, 520], serio: true, talk: [
        ['anciao', 'Palmares não era um esconderijo. Eram vários mocambos na serra, com roça, comércio e governo próprio.', 'triangle:Os mocambos'],
        ['anciao', 'Durou quase um século. Quem fugia dos engenhos encontrava aqui um lugar para viver.', 'circle:A roça de Palmares'],
        ['anciao', 'A palavra quilombo vem do quimbundo, uma língua de Angola: kilombo.', 'square:A palavra kilombo'],
        ['anciao', V('hoje existem milhares de comunidades quilombolas no Brasil. O Censo de 2022 contou mais de 1,3 milhão de quilombolas.'), 'diamond:Comunidades quilombolas hoje'],
      ] },
    ],
    ouro: [
      { id: 'faiscador', xy: [700, 600], talk: [
        ['faiscador', 'Faiscador é quem garimpa com a bateia, no rio, atrás da faísca do ouro.', 'circle:A bateia no rio'],
        ['faiscador', 'A notícia do ouro, lá por 1695, trouxe gente de todo canto: portugueses, paulistas, baianos. E milhares de africanos escravizados.', 'square:A corrida do ouro'],
        ['faiscador', 'Em 1707 paulistas e forasteiros brigaram pelo ouro. Chamaram de Guerra dos Emboabas.', 'triangle:Os emboabas'],
        ['faiscador', V('tanta gente veio que o centro do Brasil mudou de lugar: em 1763 a capital saiu de Salvador e foi para o Rio, mais perto das minas.'), 'diamond:A capital vai para o Rio'],
      ] },
      { id: 'contador', xy: [300, 560], talk: [
        ['contador', 'Quer um causo? Dizem que um rei africano, trazido escravizado, escondia ouro no cabelo e comprou a própria liberdade.', 'circle:O ouro no cabelo'],
        ['contador', 'Depois teria libertado outros e comprado uma mina. Chamam ele de Chico Rei.', 'square:Chico Rei'],
        ['contador', 'Fato ou lenda? Ninguém achou documento. Mas a mina com o nome dele existe em Ouro Preto.', 'triangle:A Mina do Chico Rei'],
        ['contador', V('uma história de liberdade contada há trezentos anos. Às vezes o causo guarda o que o documento esqueceu.')],
      ] },
    ],
    apogeu: [
      { id: 'musico', xy: [400, 400], talk: [
        ['musico', 'Em Minas tem mais músico que em muita cidade da Europa. Toda irmandade quer missa cantada.', 'circle:O coro da igreja'],
        ['musico', 'Muitos de nós somos pardos e negros livres. Daqui a pouco nasce Lobo de Mesquita, pardo, que vai compor missas tocadas por séculos.', 'square:A partitura'],
        ['musico', V('em São João del-Rei, a Lira Sanjoanense e a Orquestra Ribeiro Bastos, do século XVIII, tocam até hoje.'), 'triangle:A orquestra hoje'],
      ], conferir: ['musico: datas de fundação da Lira Sanjoanense e da Ribeiro Bastos'] },
      { id: 'irmao', xy: [210, 700], donate: 'rosario', talk: [
        ['irmao', 'A Irmandade do Rosário é dos pretos. Nós mesmos juntamos ouro, tijolo e trabalho para erguer a nossa igreja.', 'square:A Igreja do Rosário'],
        ['irmao', 'Irmandade cuida do doente, do enterro e da festa. É onde a gente tem voz.', 'circle:A irmandade reunida'],
        ['irmao', V('muitas igrejas do Rosário de Minas estão de pé até hoje, cuidadas pelas comunidades e pelas festas do Congado.'), 'triangle:A festa do Rosário'],
      ] },
    ],
    inconfidencia: [
      { id: 'poeta', xy: [820, 700], talk: [
        ['poeta', 'Sou poeta e ouvidor. Escrevo versos para Marília. O nome dela, na verdade, é Maria Doroteia.', 'circle:Marília'],
        ['poeta', 'Se a conspiração for descoberta, vão me degredar para Moçambique, na África. E foi o que aconteceu: de lá não voltei.', 'square:O degredo'],
        ['poeta', V('"Marília de Dirceu" virou um dos livros de poesia mais lidos da língua portuguesa no século XIX.'), 'triangle:O livro de versos'],
      ] },
      { id: 'conspirador', xy: [450, 560], talk: [
        ['conspirador', 'Precisamos de uma bandeira. Um triângulo e um lema em latim: Libertas quae sera tamen.', 'triangle:O triângulo'],
        ['conspirador', 'Quer dizer: "Liberdade, ainda que tardia". Tirado de um poeta romano, Virgílio.', 'square:O lema'],
        ['conspirador', V('a bandeira de Minas Gerais de hoje tem o mesmo triângulo e o mesmo lema.'), 'circle:A bandeira de Minas'],
      ] },
    ],
    depois: [
      { id: 'cafeeiro', xy: [500, 600], talk: [
        ['cafeeiro', 'O ouro acabou, mas chegou o café. Agora a tropa leva saca de café do Vale do Paraíba para o porto do Rio.', 'square:As sacas de café'],
        ['cafeeiro', 'Em 1850 a Lei Eusébio de Queirós proibiu o tráfico de africanos. A escravidão ainda durou até 1888.', 'circle:A lei de 1850'],
        ['cafeeiro', V('o café pagou ferrovias e atraiu milhões de imigrantes. O Brasil virou o maior produtor de café do mundo, e é até hoje.'), 'triangle:O café hoje'],
      ] },
      { id: 'engenheiro', xy: [380, 700], talk: [
        ['engenheiro', '1854: Mauá inaugura a primeira ferrovia do Brasil, perto do Rio. Catorze quilômetros e meio.', 'square:A primeira locomotiva'],
        ['engenheiro', 'Locomotiva inglesa, engenheiro inglês, chá às cinco. Eu mesmo.'],
        ['engenheiro', V('em 1881 os trilhos chegaram às cidades do ouro. Aquela Maria Fumaça de São João del-Rei é dessa família.'), 'circle:A Maria Fumaça'],
      ] },
    ],
    renascimento: [
      { id: 'restauradora', xy: [300, 600], talk: [
        ['restauradora', 'O conjunto de Tiradentes foi tombado em 1938 pelo SPHAN, que hoje se chama IPHAN.', 'square:O tombamento'],
        ['restauradora', 'Tombar quer dizer proteger: não pode derrubar, não pode descaracterizar.', 'circle:A fachada protegida'],
        ['restauradora', V('a cidade parada no tempo virou o maior tesouro dela. Hoje vive de turismo, de comida, de cinema e de guias como você.'), 'triangle:Tiradentes hoje'],
      ], conferir: ['restauradora: ano do tombamento do conjunto de Tiradentes (1938)'] },
      { id: 'cineasta', xy: [800, 600], talk: [
        ['cineasta', 'Vim filmar porque a luz daqui é antiga. Parece que a câmera grava duzentos anos de uma vez.', 'circle:A câmera na praça'],
        ['cineasta', V('desde 1998 a cidade recebe todo janeiro a Mostra de Cinema de Tiradentes.'), 'square:A Mostra de Cinema'],
      ], conferir: ['cineasta: ano da 1ª Mostra de Cinema de Tiradentes (1998)'] },
    ],
    tiradentes: [
      { id: 'curadora', at: 'T7', special: 'museum', talk: [
        ['curadora', 'Museu Padre Toledo. Era a casa do padre Carlos Correia de Toledo, um dos inconfidentes.', 'square:O Museu Padre Toledo'],
        ['curadora', 'Aqui fica o Gabinete de Curiosidades: traga coleções completas e eu exponho com o seu nome.', 'circle:As vitrines'],
      ] },
      { id: 'zelador', at: 'T12', donate: 'matriz', talk: [
        ['zelador', 'Matriz de Santo Antônio. Começou no início do século XVIII e foi ficando cada vez mais dourada.', 'triangle:A Matriz'],
        ['zelador', 'Igreja assim não se mantém sozinha: telhado, talha, órgão, tudo precisa de restauro.', 'square:O restauro'],
        ['zelador', V('o ouro que um dia foi da Coroa hoje só brilha se alguém cuida. É aqui que ouro vira brilho.'), 'circle:O ouro da talha'],
      ] },
      { id: 'amado', xy: [560, 455], side: ['SQ-gelo'], vendor: ['sorvete'], vendorAfter: 'SQ-gelo', partner: true, talk: [
        ['amado', 'Sorveteria do Amado! Aqui é tradição.', 'circle:A sorveteria'],
      ] },
      { id: 'antiquario', xy: [880, 640], special: 'antique', talk: [
        ['antiquario', 'Tiradentes é terra de antiquário. Cada peça aqui tem uma história, e algumas até são verdadeiras.', 'square:A loja de antiguidades'],
      ] },
      { id: 'chapeleiro', xy: [400, 520], special: 'hats', talk: [
        ['chapeleiro', 'Chapéu é a primeira coisa que se vê de um viajante. Experimenta um.'],
      ] },
      { id: 'queijeira', xy: [720, 560], vendor: ['paodequeijo', 'angu'], talk: [
        ['queijeira', 'Quitanda mineira: pão de queijo, broa, biscoito. Tudo da casa.', 'circle:O tabuleiro da quitanda'],
        ['queijeira', 'O queijo de Minas veio das fazendas e da tradição portuguesa. O pão de queijo como a gente conhece é coisa bem mais nova que o ouro.'],
      ], conferir: ['queijeira: época de surgimento do pão de queijo'] },
      { id: 'guia', xy: [230, 820], talk: [
        ['guia', 'Eu sou guia aqui em Tiradentes. Faço esse percurso todo dia: dezesseis paradas, trezentos anos.', 'circle:O guia e o grupo'],
        ['guia', 'O segredo do guia não é decorar data. É fazer a pessoa olhar. Quem olha de verdade, nunca mais esquece.'],
        ['guia', V('você. Um dia esse caderno de relatórios vira o seu tour.')],
      ] },
    ],
  };
  // NPCs que já existem nos mapas e ganham missão paralela, venda ou doação
  W.attach = {
    'paubrasil:paraguacu': { side: ['SQ-farinha', 'SQ-palavras', 'SQ-franca'], vendor: ['farinha'], vendorAfter: 'SQ-farinha' },
    'invasoes:frans': { side: ['SQ-post'] },
    'apogeu:quitandeira': { side: ['SQ-quitanda'], vendor: ['quitanda'], vendorAfter: 'SQ-quitanda' },
    'inconfidencia:tiradentes': { side: ['SQ-boticao'] },
    'depois:aprendiz': { side: ['SQ-formao'] },
    'hoje:tropeiro': { vendor: ['rapadura', 'pacoca', 'botas', 'lampiao', 'luneta', 'pedra', 'guia'] },
  };

  // ---------- missões paralelas ----------
  // passos: fetch (pegar N coisas no mapa) · route (passar por pontos em ordem, com tempo opcional) · count (condição) · ask (responder)
  // Ao fim dos passos, volta ao NPC e recebe a recompensa. after: só abre depois de outra missão.
  W.side = {
    'SQ-farinha': { title: 'A farinha de Paraguaçu', map: 'paubrasil', giver: 'paraguacu',
      start: [['paraguacu', 'Vai viajar muito? Então precisa de farinha. Traga três raízes de mandioca da roça e eu te ensino.', 'circle:A raiz de mandioca']],
      steps: [{ kind: 'fetch', text: 'Pegue 3 raízes de mandioca', icon: '🥔', label: 'mandioca', pts: [[150, 520], [380, 520], [90, 260]] }],
      done: [['paraguacu', 'Rala, espreme no tipiti para tirar o veneno, torra no forno. A mandioca brava mata se comer crua.', 'square:O tipiti'],
        ['paraguacu', 'A farinha aguenta meses sem estragar. Foi a comida dos navios, das bandeiras e das tropas.', 'triangle:A farinha na viagem']],
      reward: { gold: 20, brilho: 3, items: { farinha: 3 } } },
    'SQ-palavras': { title: 'As palavras de Paraguaçu', map: 'paubrasil', giver: 'paraguacu', after: 'SQ-farinha',
      start: [['paraguacu', 'Você já fala tupi e não sabe. Ande pela aldeia e pela praia: cada coisa que tem nome tupi, eu te ensino.', 'circle:As palavras escondidas']],
      steps: [{ kind: 'fetch', text: 'Ache as 6 palavras tupis', icon: '🗣️', words: true, pts: [
        [760, 800, 'jacaré', 'Jacaré: o bicho do rio. Palavra tupi.'],
        [130, 640, 'capivara', 'Capivara: o maior roedor do mundo. Palavra tupi.'],
        [330, 470, 'abacaxi', 'Abacaxi: a fruta de coroa. Palavra tupi.'],
        [560, 320, 'caju', 'Caju: a fruta e a castanha que o mundo inteiro come. Palavra tupi.'],
        [240, 760, 'tatu', 'Tatu: o bicho de casca. Palavra tupi.'],
        [420, 140, 'pipoca', 'Pipoca: o milho que estoura. Palavra tupi.'],
      ] }],
      done: [['paraguacu', 'Mandioca, jacaré, capivara, pipoca. O tupi virou a língua geral da costa, falada até pelos portugueses.', 'square:A língua geral'],
        ['paraguacu', 'Agora, quando um tupinambá falar, você vai entender um pouco.']],
      reward: { gold: 20, brilho: 6, title: 'o Língua' } },
    'SQ-franca': { title: 'A viagem à França', map: 'paubrasil', giver: 'paraguacu', after: 'SQ-palavras',
      start: [['paraguacu', 'Em 1528 eu atravessei o mar com Diogo até a França. Leve este recado ao navio e volte: tenho um presente.', 'triangle:O navio para a França']],
      steps: [{ kind: 'route', text: 'Leve o recado até a praia, junto do navio', pts: [[800, 830, 'navio']] }],
      done: [['paraguacu', 'Lá me batizaram Catarina. Mas eu voltei. Esta rede é para você: dormir balançando é coisa nossa.', 'circle:A rede'],
        ['narr', 'Os portugueses adotaram a rede dos povos indígenas. Hoje ela está nas varandas do Brasil inteiro.']],
      reward: { brilho: 8, items: { rede: 1 } } },
    'SQ-pousos': { title: 'A rede de pousos', map: 'hoje', giver: 'arrieiro',
      start: [['arrieiro', 'Quer andar o Brasil sem gastar a bota? Conheça cinco pousos de tropeiro. Depois de visitar, é só pagar a viagem.', 'square:O rancho do pouso']],
      steps: [{ kind: 'count', text: 'Visite 5 pousos de tropeiro', need: 5, what: 'pousos' }],
      done: [['arrieiro', 'Agora sim, tropeiro de verdade. Esta ferradura dourada corta pela metade o preço de qualquer pouso.']],
      reward: { brilho: 5, items: { ferradura: 1 }, title: 'Tropeiro de verdade' } },
    'SQ-post': { title: 'Os lugares do quadro', map: 'invasoes', giver: 'frans', afterQuest: 'QST-03',
      start: [['frans', 'Quero pintar o Brasil como ele é. Ache os quatro lugares de onde eu quero pintar: deixei um cavalete em cada um.', 'square:O cavalete']],
      steps: [{ kind: 'fetch', text: 'Ache os 4 cavaletes de Frans Post', icon: '🖌️', label: 'cavalete', pts: [[120, 300], [860, 700], [180, 620], [820, 140]] }],
      done: [['frans', 'De volta à Holanda, passei décadas pintando paisagens do Brasil de memória.', 'circle:A paisagem pintada'],
        ['frans', 'Fique com esta luneta. Quem vê de longe, pinta melhor.']],
      reward: { gold: 30, brilho: 6, items: { luneta: 1 } } },
    'SQ-jardim': { title: 'O parque de Nassau', map: 'invasoes', giver: 'jardineiro',
      start: [['jardineiro', 'O conde quer o parque cheio. Ache um tamanduá, um papagaio, um cajueiro e um mamoeiro e me diga onde estão.', 'circle:O parque']],
      steps: [{ kind: 'fetch', text: 'Ache 4 bichos e plantas para o parque', icon: '🌿', pts: [[100, 820, 'tamanduá'], [700, 380, 'papagaio'], [180, 140, 'cajueiro'], [560, 760, 'mamoeiro']] }],
      done: [['jardineiro', 'Marcgrave vai desenhar todos. Leve esta gravura: é assim que a Europa conheceu o Brasil.']],
      reward: { gold: 40, brilho: 6, items: { gravura: 1 } } },
    'SQ-quitanda': { title: 'O tabuleiro da quitanda', map: 'apogeu', giver: 'quitandeira', serio: true,
      start: [['quitandeira', 'Me ajuda? Leva as quitandas para três fregueses antes que o fiscal da Câmara passe. Tem 75 segundos.', 'square:O tabuleiro']],
      steps: [{ kind: 'route', text: 'Entregue as quitandas (3 fregueses)', secs: 75, pts: [[610, 290, 'Casa de Fundição'], [820, 470, 'mercado'], [180, 600, 'Rosário']] }],
      done: [['quitandeira', 'As negras de tabuleiro vendiam quitanda pelas vilas, e muitas eram forras. A Câmara vivia tentando proibir.', 'circle:As negras de tabuleiro'],
        ['quitandeira', 'Com quitanda, muita mulher juntou ouro e comprou a liberdade de um filho.']],
      reward: { gold: 30, brilho: 8, items: { quitanda: 3 } }, conferir: ['SQ-quitanda: proibições das Câmaras às negras de tabuleiro; compra de alforria'] },
    'SQ-boticao': { title: 'O tira-dentes', map: 'inconfidencia', giver: 'tiradentes', afterQuiz: true,
      start: [['tiradentes', 'Sabe por que me chamam de Tiradentes?']],
      steps: [{ kind: 'ask', text: 'Responda ao Tiradentes', q: 'Por que o apelido "Tiradentes"?', opts: ['Era dentista prático: tirava e punha dentes', 'Mordeu um soldado da Coroa', 'Perdeu todos os dentes na prisão'], ok: 0 }],
      done: [['tiradentes', 'Isso. Eu tirava dente e fazia dente postiço. O governador veio com dor de dente uma vez... e eu estava sem tempo. Muito ocupado conspirando.'],
        ['tiradentes', 'Fique com o meu boticão.']],
      reward: { brilho: 4, items: { boticao: 1 } } },
    'SQ-formao': { title: 'O formão do mestre', map: 'depois', giver: 'aprendiz', afterMini: 'profetas',
      start: [['aprendiz', 'Os doze estão no lugar. O mestre pediu para eu te dar uma coisa.']],
      steps: [],
      done: [['aprendiz', 'Antônio Francisco Lisboa, o Aleijadinho. Uma doença deformou as mãos dele, e mesmo assim ele esculpiu os profetas em pedra-sabão, entre 1800 e 1805.', 'triangle:Os profetas'],
        ['aprendiz', 'Este é o formão dele. Use para lembrar: o que fica não é o ouro, é o que a gente faz com as mãos.']],
      reward: { brilho: 5, items: { formao: 1 } } },
    'SQ-gelo': { title: 'O gelo de Boston', map: 'tiradentes', giver: 'amado', partner: true,
      start: [['amado', 'Sabia que o sorvete chegou ao Brasil com gelo que vinha de navio dos Estados Unidos?', 'circle:O navio do gelo'],
        ['amado', 'Você, que é americano: pega o bloco de gelo no Chafariz de São José e traz até aqui antes que derreta. Tem 30 segundos.']],
      steps: [{ kind: 'route', text: 'Busque o gelo no chafariz e traga à sorveteria', secs: 30, pts: [[170, 860, 'gelo'], [560, 470, 'sorveteria']] }],
      done: [['amado', 'No século XIX navios americanos levavam gelo para o mundo. No Rio, o sorvete virou moda nos cafés.', 'square:O sorvete no Rio'],
        ['amado', 'Toma dois sorvetes por conta da casa. E volta sempre!']],
      reward: { gold: 20, brilho: 5, items: { sorvete: 2 } }, conferir: ['SQ-gelo: chegada do gelo e do sorvete ao Rio (por volta de 1834)'] },
  };

  // ---------- folclore espalhado pelo mundo ----------
  // when: sempre · noite (18h–6h) · lua (lua cheia) · pó (com 20+ de pó) · dia (um mapa por dia, sorteado)
  W.folk = [
    { id: 'curupira', maps: ['paubrasil'], xy: [110, 420], when: 'sempre', lines: [
      ['curupira', '...', 'triangle:Os pés virados para trás'],
      ['narr', 'Curupira: o protetor da mata. Tem os pés virados para trás, e quem segue a pegada vai para o lado errado.'],
      ['narr', 'O padre José de Anchieta já escreveu sobre ele em 1560: era a lenda mais temida pelos tupis do litoral.'],
      ['narr', V('o Curupira virou símbolo de quem defende a floresta.')]] },
    { id: 'saci', maps: ['paubrasil', 'ouro', 'apogeu', 'depois', 'renascimento'], when: 'dia', xy: { paubrasil: [420, 760], ouro: [1000, 560], apogeu: [1000, 300], depois: [1050, 450], renascimento: [950, 300] }, lines: [
      ['saci', 'Hehehe!', 'circle:O gorro vermelho'],
      ['narr', 'Saci-Pererê: menino de uma perna só, gorro vermelho e cachimbo. Esconde coisas, embaraça a crina dos cavalos.'],
      ['narr', 'Mistura de tradições indígenas, africanas e europeias. Monteiro Lobato fez um inquérito sobre ele em 1918.'],
      ['narr', V('o Saci tem até dia: 31 de outubro, o Dia do Saci, que muita gente comemora no lugar do Halloween.')]] },
    { id: 'iara', maps: ['invasoes'], xy: [140, 445], when: 'sempre', lines: [
      ['iara', 'Laaaa...', 'circle:A mãe-d\'água'],
      ['narr', 'Iara, a mãe-d\'água: canta no rio e atrai quem escuta para o fundo.'],
      ['narr', V('a lenda misturou os mitos de água dos povos indígenas com as sereias que os europeus trouxeram nas histórias.')]] },
    { id: 'boitata', maps: ['hoje'], xy: [1250, 1060], when: 'noite', lines: [
      ['boitata', 'Fsssss...', 'triangle:A cobra de fogo'],
      ['narr', 'Boitatá: a cobra de fogo que protege os campos. Anchieta também escreveu sobre ela, em 1560.'],
      ['narr', V('a ciência explica parte do mito: o fogo-fátuo, um brilho que aparece de noite em brejos e cemitérios, por causa de gases.')]] },
    { id: 'lobisomem', maps: ['tiradentes'], xy: [1000, 300], when: 'lua', lines: [
      ['lobisomem', 'Auuuuu!', 'circle:A lua cheia'],
      ['narr', 'Lobisomem: o homem que vira bicho em noite de lua cheia. Diz o povo que é o sétimo filho homem.'],
      ['narr', V('a lenda veio da Europa com os colonizadores e ganhou sotaque mineiro. Só aparece em lua cheia: você está com sorte.')]] },
    { id: 'boto', maps: ['hoje'], xy: [640, 690], when: 'sempre', lines: [
      ['boto', 'Splash!', 'circle:O boto cor-de-rosa'],
      ['narr', 'Boto: dizem que em noite de festa ele vira um moço de branco, de chapéu para esconder o furo na cabeça.'],
      ['narr', V('o boto-cor-de-rosa existe de verdade: é o maior golfinho de rio do mundo, e hoje está ameaçado.')]] },
    { id: 'mapinguari', maps: ['hoje'], xy: [880, 520], when: 'sempre', lines: [
      ['mapinguari', 'GRRRR.', 'square:O gigante da mata'],
      ['narr', 'Mapinguari: o gigante peludo da Amazônia, de um olho só e boca na barriga.'],
      ['narr', V('há pesquisadores que ligam a lenda às preguiças-gigantes, bichos enormes que viveram aqui e foram extintos há milhares de anos.')]] },
    { id: 'maedoouro', maps: ['ouro'], xy: [860, 330], when: 'pó', lines: [
      ['maedoouro', '...', 'circle:A bola de fogo dourada'],
      ['narr', 'Mãe-do-Ouro: uma bola de fogo que muda o ouro de lugar. Dizem que some com o veio de quem é ganancioso.'],
      ['narr', 'Ela fica parada, esperando. Parece que quer alguma coisa sua.']], offer: true },
  ];
  W.conferir.push('folk.maedoouro: versões da lenda da Mãe-do-Ouro em Minas e São Paulo');

  // ---------- coleções do Gabinete de Curiosidades (Museu Padre Toledo) ----------
  W.sets = [
    { id: 'tupi', name: 'As palavras tupis', need: 6, brilho: 10, title: 'Falante de tupi' },
    { id: 'bestiario', name: 'Bestiário do folclore', need: 9, brilho: 10, title: 'Caçador de causos' },
    { id: 'reliquias', name: 'Relíquias da história', list: ['santo', 'turmalina', 'livro-antonil', 'carta-tj', 'boticao', 'formao', 'gravura'], brilho: 10, title: 'Curador' },
    { id: 'antiguidades', name: 'Antiguidades de Tiradentes', list: ['oratorio', 'bateia', 'ferro', 'estanho'], brilho: 5, title: 'Antiquário' },
    { id: 'paladar', name: 'Paladar do Brasil', list: ['rapadura', 'farinha', 'pacoca', 'angu', 'quitanda', 'paodequeijo', 'sorvete'], brilho: 5, title: 'Paladar mineiro' },
    { id: 'pousos', name: 'Os pousos da Estrada', need: 8, brilho: 5, title: 'Rei da Estrada Real' },
    { id: 'ouvinte', name: 'Quem conta um conto', need: 25, brilho: 10, title: 'Bom ouvinte' },
  ];

  // ---------- eventos do calendário real (data do celular) ----------
  const pascoa = (y) => { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), gg = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - gg + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), dd = ((h + l - 7 * m + 114) % 31) + 1; return new Date(y, mo - 1, dd); };
  W.event = (dt) => {
    const md = `${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    if (md === '04-21') return { id: 'tiradentes', name: '21 de abril · Dia de Tiradentes', brilho2: true, text: 'Hoje o brilho vale em dobro. A cidade de Tiradentes está em festa.' };
    if (md === '08-22') return { id: 'folclore', name: '22 de agosto · Dia do Folclore', folkAll: true, text: 'Hoje todas as criaturas do folclore aparecem.' };
    if (md === '10-31') return { id: 'saci', name: '31 de outubro · Dia do Saci', saciAll: true, text: 'Hoje o Saci aparece em todo canto.' };
    if (md === '11-20') return { id: 'consciencia', name: '20 de novembro · Consciência Negra', serio: true, text: 'Dia Nacional de Zumbi e da Consciência Negra.' };
    const p = pascoa(dt.getFullYear()), diff = Math.round((p - new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())) / 864e5);
    if (diff >= 0 && diff <= 7) return { id: 'semanasanta', name: 'Semana Santa', text: 'Em Tiradentes e São João del-Rei, os sinos e as procissões tomam as ruas.' };
    return null;
  };
  // lua cheia: idade da lua entre 13,5 e 16 dias (lua nova de referência: 6 jan 2000, 18:14 UTC)
  W.luaCheia = (dt) => { const age = (((dt.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % 29.530588 + 29.530588) % 29.530588; return age > 13.5 && age < 16; };

  // ---------- desenhos do folclore (pixel art em retângulos, como os bonecos) ----------
  W.drawFolk = (g, id, x, y, t, u = 2) => { // u: escala (2 = tamanho de referência, acompanha o zoom)
    const im = W.sprite && W.sprite(id); if (im) { const h = 30 * u, w = h * im.width / im.height; g.drawImage(im, x - w / 2, y - h, w, h); return; }
    g.save(); g.translate(x, y); g.scale(u / 2, u / 2); g.translate(-x, -y);
    const R = (dx, dy, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x + dx * 2), Math.round(y + dy * 2), Math.ceil(w * 2), Math.ceil(h * 2)); };
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y, 12, 4, 0, 0, 7); g.fill();
    const b = Math.sin(t * 4);
    if (id === 'curupira') { R(-2, -2, 2, 2, '#5a3a1a'); R(1, -2, 2, 2, '#5a3a1a'); R(-3, -12, 6, 10, '#3a7a2a'); R(-3, -18, 6, 6, '#a8724c'); for (let i = 0; i < 4; i++) R(-4 + i * 2, -22 - (i % 2) * 2 + b, 2, 4, i % 2 ? '#ff5a20' : '#ff9a30'); R(-1, -16, 1, 1, '#000'); R(1, -16, 1, 1, '#000'); }
    else if (id === 'saci') { R(-1, -6, 2, 6, '#3a2418'); R(-3, -14, 6, 8, '#d03a2a'); R(-3, -20, 6, 6, '#3a2418'); R(-4, -24, 8, 4, '#e02a2a'); R(-1, -27 + b, 3, 3, '#e02a2a'); R(3, -17, 4, 1, '#8a5a2a'); g.fillStyle = `rgba(220,220,220,${0.4 + 0.3 * b})`; g.beginPath(); g.arc(x + 16, y - 40 - b * 3, 4, 0, 7); g.fill(); }
    else if (id === 'iara') { R(-6, -2, 12, 3, '#2f78c0'); R(-3, -8, 6, 6, '#2a9a7a'); R(3, -6 + b, 4, 3, '#2a9a7a'); R(-3, -16, 6, 8, '#e8c0a0'); R(-4, -22, 8, 7, '#1a6a3a'); R(-4, -15, 2, 8, '#1a6a3a'); }
    else if (id === 'boitata') { for (let i = 0; i < 10; i++) { const px = -18 + i * 4, py = -6 + Math.sin(t * 5 + i * 0.7) * 3; R(px, py, 4, 4, i % 2 ? '#ff7a20' : '#ffc040'); } R(22, -8 + Math.sin(t * 5 + 7) * 3, 5, 5, '#fff2a0'); }
    else if (id === 'lobisomem') { R(-4, -6, 3, 6, '#5a5a5a'); R(1, -6, 3, 6, '#5a5a5a'); R(-5, -16, 10, 10, '#6a6a6a'); R(-4, -24, 8, 8, '#7a7a7a'); R(-4, -27, 2, 3, '#7a7a7a'); R(2, -27, 2, 3, '#7a7a7a'); R(-2, -21, 1, 1, '#ffd84a'); R(1, -21, 1, 1, '#ffd84a'); R(3, -19, 3, 2, '#5a5a5a'); }
    else if (id === 'boto') { const h = Math.max(0, b) * 8; R(-8, -4 - h, 14, 6, '#f0a0b8'); R(5, -3 - h, 5, 2, '#f0a0b8'); R(-10, -6 - h, 3, 3, '#e08098'); R(-2, -7 - h, 3, 3, '#e08098'); R(-10, 0, 20, 2, '#4a94d8'); }
    else if (id === 'mapinguari') { R(-5, -4, 4, 4, '#3a2a1a'); R(1, -4, 4, 4, '#3a2a1a'); R(-8, -26, 16, 22, '#5a3a20'); R(-2, -24, 4, 4, '#ff4a2a'); R(-4, -14, 8, 4, '#2a0a0a'); R(-11, -22, 3, 12, '#5a3a20'); R(8, -22, 3, 12, '#5a3a20'); }
    else if (id === 'maedoouro') { const r = 10 + b * 2; g.fillStyle = 'rgba(255,200,60,.35)'; g.beginPath(); g.arc(x, y - 24, r + 8, 0, 7); g.fill(); g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(x, y - 24, r, 0, 7); g.fill(); g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(x - 3, y - 27, r * 0.4, 0, 7); g.fill(); }
    g.restore();
  };
  return W;
})();
