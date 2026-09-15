# -*- coding: utf-8 -*-
"""写真を、答えの絵（ansFig）用のWebPにする。切り抜きはしない。
   形（まるめ・高さ）は october.html の CSS がやる。
   使い方: python3 tools/photo2ans.py <入力> <名前> [x0 y0 x1 y1] [--nobg]
   切り抜きの範囲は省略してよい。被写体が小さくて余白ばかりのときだけ指定する。
   --nobg は、白地に切りぬかれた絵（復元図など）の白を透明にする。
   アプリの背景が暗いので、白いままだと四角い白い箱に見えるため。"""
import sys, os
from PIL import Image

MAXW, MAXH = 720, 540     # 表示は高さ170px。2倍以上あれば足りる

def drop_white(im):
    """白い背景を透明にする。白からの距離でアルファを決めるので、毛の縁が硬くならない"""
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            d = 255 - min(r, g, b)          # 白からの距離
            if d < 12:   px[x, y] = (r, g, b, 0)
            elif d < 40: px[x, y] = (r, g, b, int(255 * (d - 12) / 28.0))
    return im

def build(src, out, box=None, nobg=False):
    im = Image.open(src)
    if box: im = im.crop(box)
    if nobg: im = drop_white(im)
    if im.mode not in ('RGBA','RGB'):
        im = im.convert('RGBA') if im.mode in ('LA','P') else im.convert('RGB')
    im.thumbnail((MAXW, MAXH), Image.LANCZOS)
    im.save(out, 'WEBP', quality=85, method=6)
    return im.size, os.path.getsize(out)

if __name__ == '__main__':
    src, name = sys.argv[1], sys.argv[2]
    args = [a for a in sys.argv[3:] if a != '--nobg']
    nobg = '--nobg' in sys.argv
    box = tuple(int(v) for v in args[:4]) if len(args) >= 4 else None
    out = '/home/user/sensei-quiz/img/figures/ans/%s.webp' % name
    print(name, *build(src, out, box, nobg))
