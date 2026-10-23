# Camada de cima (telhados, topo das igrejas e das serras) recortada do próprio mapa pintado.
#   python tools/topo.py tiradentes hoje        (ou: python tools/topo.py todos)
# Para cada bloco da colisão que é construção ou serra (não encosta na borda, não é rio comprido):
#   - a metade de cima vira assets/maps/<id>_top.webp (desenhada por cima do Buck: ele passa por trás);
#   - a colisão fica só na metade de baixo (a base da casa), para dar para andar atrás do telhado.
# A colisão original do PC fica guardada em docs/colisao_pc/<id>_colisao.png e é sempre a fonte: rodar de novo dá o mesmo resultado.
import sys, os, shutil
import numpy as np
from PIL import Image, ImageFilter

RAIZ = os.path.join(os.path.dirname(__file__), '..')
CORTE = 0.5      # fração de cima de cada bloco que vira telhado
PASSO = 4        # resolução da busca de blocos (px da imagem)

def blocos(livre):
    """rótulos 4-conectados dos pixels bloqueados (grade reduzida), sem scipy"""
    h, w = livre.shape
    rot = np.zeros((h, w), np.int32); n = 0; info = []
    for y0 in range(h):
        for x0 in range(w):
            if not livre[y0, x0] or rot[y0, x0]: continue
            n += 1; pilha = [(y0, x0)]; rot[y0, x0] = n; xs = []; ys = []
            while pilha:
                y, x = pilha.pop(); xs.append(x); ys.append(y)
                for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= ny < h and 0 <= nx < w and livre[ny, nx] and not rot[ny, nx]:
                        rot[ny, nx] = n; pilha.append((ny, nx))
            info.append((n, min(xs), min(ys), max(xs), max(ys), len(xs)))
    return rot, info

def topo(mid):
    arte = os.path.join(RAIZ, f'assets/maps/{mid}.webp')
    col = os.path.join(RAIZ, f'assets/maps/{mid}_colisao.png')
    orig = os.path.join(RAIZ, f'docs/colisao_pc/{mid}_colisao.png')
    if not os.path.exists(arte) or not os.path.exists(col): print(mid, ': sem mapa pintado ou colisão'); return
    os.makedirs(os.path.dirname(orig), exist_ok=True)
    if not os.path.exists(orig): shutil.copy(col, orig)
    img = Image.open(arte).convert('RGBA'); W, H = img.size
    m = np.array(Image.open(orig).convert('L').resize((W, H))) > 128
    g = m[::PASSO, ::PASSO]; gh, gw = g.shape
    rot, info = blocos(g)
    corte = np.zeros_like(g)
    usados = 0
    for n, x0, y0, x1, y1, area in info:
        bw, bh = x1 - x0 + 1, y1 - y0 + 1
        if x0 == 0 or y0 == 0 or x1 == gw - 1 or y1 == gh - 1: continue      # mar, borda, mata da borda
        if area > 0.04 * gw * gh or bh < 6 or area < 60 or area / (bw * bh) < 0.4 or bw > 3.5 * bh: continue  # rio (comprido), objeto miúdo ou bloco grande demais
        ycut = y0 + int(bh * CORTE)
        sel = (rot[y0:ycut, x0:x1 + 1] == n)
        corte[y0:ycut, x0:x1 + 1] |= sel; usados += 1
    full = np.kron(corte, np.ones((PASSO, PASSO), bool))[:H, :W]
    alpha = Image.fromarray((full * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.5))
    top = img.copy(); top.putalpha(alpha)
    top.save(os.path.join(RAIZ, f'assets/maps/{mid}_top.webp'), 'WEBP', quality=88)
    nova = m & ~full
    Image.fromarray((nova * 255).astype(np.uint8)).save(col)
    print(f'{mid}: {usados} telhados/serras recortados')

ids = sys.argv[1:]
if ids == ['todos']: ids = [f[:-5] for f in os.listdir(os.path.join(RAIZ, 'assets/maps')) if f.endswith('.webp') and '_' not in f]
for i in ids: topo(i)
