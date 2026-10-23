# Pacote para o servidor: landing (index.html na raiz) + o jogo na pasta jogo/.
#   python tools/landing_zip.py [saida.zip]     (padrão: visitminas.zip na pasta atual)
# Descompacte na raiz do servidor: / = landing, /jogo/ = jogo. O botão JOGAR leva a jogo/?lang=xx.
import os, sys, zipfile
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
saida = sys.argv[1] if len(sys.argv) > 1 else 'visitminas.zip'
# o que o jogo precisa para rodar (o resto do repositório é ferramenta e documentação)
JOGO = ['index.html', 'manifest.webmanifest', 'sw.js', 'game.js', 'minis.js', 'world.js', 'cutscenes.js', 'i18n.js',
        'lang.data.js', 'content.data.js', 'assets.data.js', 'maps', 'data', 'assets', 'img', 'video', 'audio']
FORA = {'assets/estilo', 'assets/manifest.json', 'assets/prompts.md'}
n = 0
with zipfile.ZipFile(saida, 'w', zipfile.ZIP_DEFLATED) as z:
    for base, _, arqs in os.walk(os.path.join(RAIZ, 'landing')):
        for a in arqs:
            p = os.path.join(base, a); z.write(p, os.path.relpath(p, os.path.join(RAIZ, 'landing'))); n += 1
    for item in JOGO:
        alvo = os.path.join(RAIZ, item)
        lista = [alvo] if os.path.isfile(alvo) else [os.path.join(b, a) for b, _, aa in os.walk(alvo) for a in aa]
        for p in lista:
            rel = os.path.relpath(p, RAIZ).replace(os.sep, '/')
            if any(rel == f or rel.startswith(f + '/') for f in FORA): continue
            z.write(p, 'jogo/' + rel); n += 1
print(f'{saida}: {n} arquivos, {os.path.getsize(saida) / 1e6:.1f} MB')
