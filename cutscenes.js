// Vídeos da intro e do desfecho (add-on 2.1 e 3.2), com narração e ambiente já mixados no áudio do vídeo.
// Sem este arquivo, o jogo usa o plano B em falas.
// subs: [início s, fim s, texto, 'lum'?] — title: [quando aparece, subtítulo, título?]
window.INTRO_CLIPS = [
  { src: 'video/k01.mp4', subs: [[0.6, 6.8, 'Antes de haver Brasil, já havia a terra. E já havia quem olhasse para ela.']] },
  { src: 'video/k02.mp4', subs: [[0.6, 7.8, 'Milhões de pessoas. Mil línguas. Nenhuma palavra para "ouro"... como a gente conhece.']] },
  { src: 'video/k03.mp4', subs: [[0.6, 8, 'Em 1494, dois reis dividiram um mundo que nunca tinham visto. Com uma régua.']] },
  { src: 'video/k04.mp4', subs: [[1.2, 4.5, 'E as expedições começaram.']] },
  { src: 'video/k05.mp4', subs: [[1, 7, 'Observação iniciada. Espécie: humana. Interesse: brilho.', 'lum']] },
  { src: 'video/k06.mp4', subs: [[0.5, 4.4, 'Eles fazem o ouro brilhar como nenhuma outra espécie.', 'lum'], [4.4, 7.6, 'Mas o brilho está acabando.', 'lum']] },
  { src: 'video/k07.mp4', subs: [[0.6, 6.8, 'Enviar um observador. Corpo selecionado: o humano que mais perseguiu brilho.', 'lum']] },
  { src: 'video/k08.mp4', subs: [[0.8, 4.5, 'BUCK: ...Nashville? This ain\'t Nashville.'], [4.7, 8.4, 'DONA MULA: Não. Mas o imposto é parecido.']], title: [8.5, 'um relatório sobre o brilho'] },
];

window.END_CLIPS = [
  { src: 'video/k09.mp4', subs: [[1.5, 5, 'BUCK: Final report. (Relatório final.)']] },
  { src: 'video/k10.mp4', subs: [[0.8, 7.6, 'O ouro acabou há duzentos anos. Mas as pessoas continuam olhando.']] },
  { src: 'video/k11.mp4', subs: [[0.3, 2.2, 'E ainda brilha.'], [2.3, 6.7, 'Relatório aceito. Fonte... desconhecida.', 'lum'], [6.8, 9.5, 'BUCK: It\'s called a story. (Chama-se história.)']] },
  { src: 'video/k12.mp4', subs: [[0.5, 6.4, 'Como Colombo, ele nunca pediu direções. Agora, já não precisa.']], title: [6.6, 'Relógio de Sol — fim do relatório.', 'Ele ficou.'] },
];
