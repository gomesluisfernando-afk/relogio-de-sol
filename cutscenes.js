// Vídeos da intro e do desfecho (add-on 2.1 e 3.2). Sem este arquivo, o jogo usa o plano B em falas.
// subs: [início s, fim s, texto, 'lum'?] — title: [quando aparece, subtítulo, título?]
window.INTRO_CLIPS = [
  { src: 'video/k01.mp4', subs: [[0.5, 7.5, 'Antes de haver Brasil, já havia a terra. E já havia quem olhasse para ela.']] },
  { src: 'video/k02.mp4', subs: [[0.5, 7.5, 'Milhões de pessoas. Mil línguas. Nenhuma palavra para "ouro" como a gente conhece.']] },
  { src: 'video/k03.mp4', subs: [[0.5, 7.5, 'Em 1494, dois reis dividiram um mundo que nunca tinham visto. Com uma régua.']] },
  { src: 'video/k04.mp4', subs: [[1, 7, 'E as expedições começaram.']] },
  { src: 'video/k05.mp4', subs: [[1, 7.5, 'Observação iniciada. Espécie: humana. Interesse: brilho.', 'lum']] },
  { src: 'video/k06.mp4', subs: [[0.5, 4, 'Eles fazem o ouro brilhar como nenhuma outra espécie.', 'lum'], [4.2, 7.8, 'Mas o brilho está acabando.', 'lum']] },
  { src: 'video/k07.mp4', subs: [[0.5, 7.5, 'Enviar um observador. Corpo selecionado: o humano que mais perseguiu brilho.', 'lum']] },
  { src: 'video/k08.mp4', subs: [[0.8, 3.8, 'BUCK: ...Nashville? This ain\'t Nashville.'], [4, 6.2, 'MULA: Não. Mas o imposto é parecido.']], title: [6.4, 'um relatório sobre o brilho'] },
];
window.INTRO_CLIPS.music = 'cosmos';

window.END_CLIPS = [
  { src: 'video/k09.mp4', subs: [[1, 7, 'BUCK: Final report.']] },
  { src: 'video/k10.mp4', subs: [[0.5, 7.5, 'BUCK: The gold\'s gone. Been gone two hundred years.']] },
  { src: 'video/k11.mp4', subs: [[0.3, 3, 'BUCK: But they\'re still looking. And it still shines.'], [3.1, 5.6, 'Relatório aceito. Fonte: ...desconhecida.', 'lum'], [5.7, 7.9, 'BUCK: It\'s called a story.']] },
  { src: 'video/k12.mp4', subs: [[0.3, 5.5, 'BUCK: Folks, like Columbus, I never ask for directions. Good thing I don\'t need \'em anymore.']], title: [5.8, 'Relógio de Sol — fim do relatório.', 'Ele ficou.'] },
];
window.END_CLIPS.music = 'cosmos';
