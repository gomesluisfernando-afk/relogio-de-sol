"""Recorta o rosto frontal de cada ficha (assets/img/chars/ficha_*.webp) em img/p_<id>.png 136x136.
Caixa padrão = a do Buck em characters.json (face: 560% / 8.5% 9%); ajustes por personagem em BOX.
Uso: python tools/crop_portraits.py"""
from PIL import Image
import os

DEFAULT = (0.07, 0.06, 0.25, 0.38)  # x0, y0, x1, y1 em fração da ficha
BOX = {                              # id -> caixa própria, quando a padrão erra o rosto
    'mula': (0.38, 0.03, 0.62, 0.50),   # sem cabeça: pega a chama e o peito
    'sineiro': (0.20, 0.11, 0.38, 0.43),
    'cobrador': (0.10, 0.03, 0.29, 0.37),
}
SRC, DST = 'assets/img/chars', 'img'

for f in sorted(os.listdir(SRC)):
    if not f.startswith('ficha_'):
        continue
    cid = f[6:-5]
    im = Image.open(os.path.join(SRC, f)).convert('RGB')
    x0, y0, x1, y1 = BOX.get(cid, DEFAULT)
    w, h = im.size
    side = min((x1 - x0) * w, (y1 - y0) * h)
    cx, cy = (x0 + x1) / 2 * w, (y0 + y1) / 2 * h
    crop = im.crop((int(cx - side / 2), int(cy - side / 2), int(cx + side / 2), int(cy + side / 2)))
    crop.resize((136, 136), Image.LANCZOS).save(os.path.join(DST, f'p_{cid}.png'), optimize=True)
    print(cid, im.size)
