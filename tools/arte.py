"""Trata as imagens geradas no Nano Banana / Flow e coloca cada uma no lugar e no tamanho certos.
Uso:  python tools/arte.py <tipo> <arquivo_gerado> <nome> [--fundo]
  tipo:   ui | icone | sprite | mula | folk | prop | mapa | topo | colisao | minifundo | miniobj | minitextura | retrato
  nome:   o nome do arquivo final, sem extensão (ex.: panel, rapadura, buck, pouso, tiradentes)
  --fundo tira o fundo liso (branco ou de cor única) a partir das bordas, deixando transparente
Depois de tratar tudo: node tools/build_assets.mjs  e  node tools/check.mjs
Especificações de cada tipo: docs/LOTES_ARTE.md e assets/manifest.json"""
import json, sys
from collections import deque
from PIL import Image

SPEC = {  # tipo: (pasta, tamanho final ou None, formato)
    'ui': ('assets/ui', None, 'webp'),          # tamanho vem do manifesto (painel 192x192, botões 192x96)
    'icone': ('assets/icons', (128, 128), 'webp'),
    'sprite': ('assets/sprites', (384, 768), 'webp'),   # 3 colunas x 4 linhas, quadro 128x192
    'mula': ('assets/sprites', (576, 192), 'webp'),     # 1 linha x 3 quadros, 192x192
    'folk': ('assets/sprites', (256, 256), 'webp'),
    'prop': ('assets/props', (256, 256), 'webp'),
    'mapa': ('assets/maps', 'guia', 'webp'),
    'topo': ('assets/maps', 'guia', 'webp'),
    'colisao': ('assets/maps', 'guia', 'png'),
    'minifundo': ('assets/minis', (1920, 1080), 'webp'),  # nome: <mini>_fundo (ex.: escambo_fundo)
    'miniobj': ('assets/minis', 256, 'webp'),             # nome: <mini>_<objeto> (ex.: ponte_prancha_longa); mantém a proporção
    'minitextura': ('assets/minis', 1024, 'webp'),        # texturas e faixas (pergaminho, tabuleiro, bagaço, serra); mantém a proporção, até 1024
    'retrato': ('assets/sprites', (256, 256), 'webp'),    # rosto das testemunhas genéricas (nome: gen_<tipo>_retrato)
}

def tira_fundo(im, tol=38):
    im = im.convert('RGBA'); w, h = im.size; px = im.load()
    ref = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    perto = lambda c: any(sum(abs(c[i] - r[i]) for i in range(3)) <= tol for r in ref)
    seen = bytearray(w * h); q = deque((x, y) for x in (0, w - 1) for y in range(h))
    q.extend((x, y) for y in (0, h - 1) for x in range(w))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y * w + x]: continue
        seen[y * w + x] = 1
        if not perto(px[x, y]): continue
        px[x, y] = (0, 0, 0, 0); q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return im

def cabe(im, size):  # encaixa sem distorcer, centralizado, fundo transparente
    im = im.convert('RGBA'); bb = im.getbbox() or (0, 0, im.width, im.height); im = im.crop(bb)
    k = min(size[0] / im.width, size[1] / im.height); im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    out = Image.new('RGBA', size, (0, 0, 0, 0)); out.paste(im, ((size[0] - im.width) // 2, size[1] - im.height if size[1] > size[0] else (size[1] - im.height) // 2)); return out

def main():
    if len(sys.argv) < 4 or sys.argv[1] not in SPEC: print(__doc__); sys.exit(1)
    tipo, src, nome = sys.argv[1:4]; fundo = '--fundo' in sys.argv
    pasta, size, fmt = SPEC[tipo]; im = Image.open(src)
    if fundo: im = tira_fundo(im)
    if size == 'guia':
        base = nome.replace('_top', '').replace('_colisao', '')
        g = json.load(open(f'docs/guias/{base}.json', encoding='utf-8')); size = (round(g['mundo'][0] * g['escala']), round(g['mundo'][1] * g['escala']))
        im = im.convert('L' if tipo == 'colisao' else 'RGBA').resize(size, Image.LANCZOS)
        if tipo == 'colisao': im = im.point(lambda v: 255 if v > 128 else 0)
        if tipo == 'mapa': im = im.convert('RGB')
    elif tipo == 'minitextura':
        im = im.convert('RGBA'); k = size / max(im.size); im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    elif tipo == 'retrato':
        im = im.convert('RGB'); sd = min(im.size); im = im.crop(((im.width - sd) // 2, (im.height - sd) // 2, (im.width + sd) // 2, (im.height + sd) // 2)).resize(size, Image.LANCZOS)
    elif tipo == 'miniobj':
        im = im.convert('RGBA'); im = im.crop(im.getbbox() or (0, 0, im.width, im.height)); k = size / max(im.size); im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    elif tipo == 'minifundo':
        im = im.convert('RGB'); k = max(size[0] / im.width, size[1] / im.height); im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        im = im.crop(((im.width - size[0]) // 2, (im.height - size[1]) // 2, (im.width + size[0]) // 2, (im.height + size[1]) // 2))
    elif size: im = cabe(im, size) if tipo in ('icone', 'folk', 'prop') else im.convert('RGBA').resize(size, Image.LANCZOS)
    else: im = im.convert('RGBA')
    sufixo = {'topo': '_top', 'colisao': '_colisao'}.get(tipo, '')
    dest = f'{pasta}/{nome}{sufixo if not nome.endswith(sufixo) else ""}.{fmt}'
    im.save(dest, 'PNG' if fmt == 'png' else 'WEBP', **({} if fmt == 'png' else {'quality': 88, 'method': 6}))
    print(f'{dest}  {im.size[0]}x{im.size[1]}')

if __name__ == '__main__': main()
