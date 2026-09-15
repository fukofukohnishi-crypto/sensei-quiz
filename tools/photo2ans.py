# -*- coding: utf-8 -*-
"""写真を、答えの絵（ansFig）用のWebPにする。切り抜きはしない。
   形（まるめ・高さ）は october.html の CSS がやる。
   使い方: python3 tools/photo2ans.py <入力> <名前> [x0 y0 x1 y1]
   切り抜きの範囲は省略してよい。被写体が小さくて余白ばかりのときだけ指定する。"""
import sys, os
from PIL import Image

MAXW, MAXH = 720, 540     # 表示は高さ170px。2倍以上あれば足りる

def build(src, out, box=None):
    im = Image.open(src)
    if box: im = im.crop(box)
    im = im.convert('RGBA') if im.mode in ('RGBA','LA','P') else im.convert('RGB')
    im.thumbnail((MAXW, MAXH), Image.LANCZOS)
    im.save(out, 'WEBP', quality=85, method=6)
    return im.size, os.path.getsize(out)

if __name__ == '__main__':
    src, name = sys.argv[1], sys.argv[2]
    box = tuple(int(v) for v in sys.argv[3:7]) if len(sys.argv) > 6 else None
    out = '/home/user/sensei-quiz/img/figures/ans/%s.webp' % name
    print(name, *build(src, out, box))
