# 写真の出どころ

`img/figures/ans/` の **写真（.webp）** の出どころとライセンスを記録する。
自作SVG（`.svg`）は自分で描いたものなので、ここには書かない。

**CC BY / CC BY-SA の写真を入れたときは、ここに書くだけでなく、
画面にも撮影者名とライセンスを出すこと**（`october.html` 側の対応が必要）。
PD / CC0 の写真は、画面表示は不要。

| ファイル | 被写体 | 出どころ | ライセンス | 撮影者 |
|---|---|---|---|---|
| `hadakadebanezumi.webp` | ハダカデバネズミ | Wikimedia Commons | **PD**（パブリックドメイン） | 表示不要 |
| `senzanko.webp` | センザンコウ | Wikimedia Commons<br>`Manis crassicaudata (29600051791).jpg` | **CC BY 2.0**<br>→ **画面に表示ずみ** | Ajit Huilgol<br>／U.S. Fish and Wildlife Service |
| `ratel.webp` | ラーテル | Wikimedia Commons | **PD**（パブリックドメイン） | 表示不要 |
| `ikkaku.webp` | イッカク | Wikimedia Commons<br>`Нарвал в российской Арктике.jpg` | **CC BY-SA 4.0**<br>→ **画面に表示ずみ** | пресс-служба ПАО «Газпром нефть»<br>（ガスプロム・ネフチ広報部） |
| `kamonohashi.webp` | カモノハシ | Wikimedia Commons<br>`Duck-billed platypus (Ornithorhynchus anatinus) Scottsdale.jpg` | **CC BY-SA 4.0**<br>→ **画面に表示ずみ** | Charles J. Sharp |
| `harimogura.webp` | ハリモグラ | Wikimedia Commons | **PD**（パブリックドメイン） | 表示不要 |
| `smilodon.webp` | スミロドン | Wikimedia Commons<br>`Smilodon fatalis.jpg`（復元図） | **CC BY 3.0**<br>→ **画面に表示ずみ** | Dantheman9758<br>（英語版Wikipedia） |

## 白地の絵は背景を抜く

`smilodon.webp` のように**白地に切りぬかれた絵**（復元図など）は、そのまま置くと
暗い画面のなかで白い四角に見える。`--nobg` を付けて白を透明にする。

```bash
python3 tools/photo2ans.py <絵> <名前> --nobg
```

白からの距離でアルファを決めているので、毛の縁が硬くならない。
**白っぽい部分が被写体にあるときは、抜けていないか必ず確かめること。**
スミロドンは牙が白いので心配したが、少し灰色がかっていたので残った。

