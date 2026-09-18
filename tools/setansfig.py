#!/usr/bin/env python3
"""quizbank-seed.json の1問に ansFig（と ansFigBy）を入れる。

  python3 tools/setansfig.py <問題のid> <絵のファイル名> ["クレジット"]

ファイル全体を書きなおすと差分が全行になってしまうので、その問題の
かたまりの終わりを見つけて、そこに行を足すだけにしてある。
すでに入っているときは差しかえる（写真を別のものにしたとき用）。
"""
import io, json, os, re, sys

def main(qid, fig, by=None):
    p = 'quizbank-seed.json'
    s = io.open(p, encoding='utf-8').read()
    m = re.search(r'\n  "id": "%s"' % re.escape(qid), s)
    if not m: sys.exit('その id が見つからない: ' + qid)
    end = s.index('\n },', m.end())           # そのかたまりの終わり
    if end < 0: sys.exit('かたまりの終わりが見つからない')
    block = s[m.start():end]
    # すでに入っているぶんを取りのぞく
    block = re.sub(r',\n  "ansFigBy": "[^"]*"', '', block)
    block = re.sub(r',\n  "ansFig": "[^"]*"', '', block)
    add = ',\n  "ansFig": "%s"' % fig
    if by: add += ',\n  "ansFigBy": "%s"' % by
    s = s[:m.start()] + block + add + s[end:]
    io.open(p, 'w', encoding='utf-8').write(s)
    q = [x for x in json.load(io.open(p, encoding='utf-8')) if x['id'] == qid][0]
    if not os.path.exists('img/figures/ans/' + q['ansFig']):
        sys.exit('絵のファイルが無い: ' + q['ansFig'])
    print(qid, q['a'], '->', q['ansFig'], q.get('ansFigBy', ''))

if __name__ == '__main__':
    if len(sys.argv) < 3: sys.exit(__doc__)
    main(*sys.argv[1:4])
