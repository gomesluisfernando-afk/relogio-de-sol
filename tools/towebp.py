# python tools/towebp.py <entrada> <saida.webp>  → converte e reduz a qualidade até caber em ~200 KB.
import sys
from io import BytesIO
from PIL import Image

LIMIT = 200_000
src, dst = sys.argv[1], sys.argv[2]
img = Image.open(src).convert('RGB')
for q in range(85, 30, -5):
    buf = BytesIO()
    img.save(buf, 'WEBP', quality=q, method=6)
    if buf.tell() <= LIMIT:
        break
open(dst, 'wb').write(buf.getvalue())
print(f'{dst}: {img.width}x{img.height} q={q} {buf.tell() // 1024} KB')
