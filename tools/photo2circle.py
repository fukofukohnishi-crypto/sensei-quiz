# -*- coding: utf-8 -*-
"""写真を、答えの絵（ansFig）用のまるいWebPにする。
   使い方: photo2circle.py <入力> <出力名> [x0 y0 x1 y1]
   SVGの絵と同じ 200x200 相当の見た目にそろえる（まるく切り抜き＋うすい輪郭）。"""
import sys, os
from PIL import Image, ImageDraw, ImageFilter

SIZE = 440          # 出力。表示は170px なので2倍以上あればよい
SS   = 4            # 縁をなめらかにするための倍率

def build(src, out, box=None):
    im = Image.open(src).convert('RGB')
    if box: im = im.crop(box)
    w, h = im.size
    side = max(w, h)
    if w != h:
        # たりない側は、元の絵をぼかして引きのばしたもので埋める（背景がつながって見える）
        bg = im.resize((side, side), Image.LANCZOS).filter(ImageFilter.GaussianBlur(side//18))
        bg.paste(im, ((side-w)//2, (side-h)//2))
        im = bg
    im = im.resize((SIZE*SS, SIZE*SS), Image.LANCZOS)
    mask = Image.new('L', (SIZE*SS, SIZE*SS), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, SIZE*SS-1, SIZE*SS-1), fill=255)
    im.putalpha(mask)
    im = im.resize((SIZE, SIZE), Image.LANCZOS)
    # SVG と同じ、うすい輪郭
    ring = Image.new('RGBA', (SIZE, SIZE), (0,0,0,0))
    ImageDraw.Draw(ring).ellipse((1,1,SIZE-2,SIZE-2), outline=(0,0,0,26), width=3)
    im = Image.alpha_composite(im, ring)
    im.save(out, 'WEBP', quality=85, method=6)
    return os.path.getsize(out)

if __name__ == '__main__':
    src, name = sys.argv[1], sys.argv[2]
    box = tuple(int(v) for v in sys.argv[3:7]) if len(sys.argv) > 6 else None
    out = '/home/user/sensei-quiz/img/figures/ans/%s.webp' % name
    print(name, build(src, out, box), 'bytes')
