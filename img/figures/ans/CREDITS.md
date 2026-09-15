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
| `naumanzo.webp` | ナウマンゾウ | Wikimedia Commons<br>`Palaeoloxodon naumanni life restoration.jpg`（復元図） | **CC BY 4.0**<br>→ **画面に表示ずみ** | Kohei Futaka（絵）<br>Takahiro Segawa, Takahiro Yonezawa,<br>Hiroshi Mori, Ayumi Akiyoshi,<br>Asier Larramendi, Naoki Kohno（論文著者） |
| `shironagasukujira.webp` | シロナガスクジラ | Wikimedia Commons | **PD**（パブリックドメイン） | 表示不要 |
| `azarashi.webp` | アザラシ | Wikimedia Commons | **PD**（パブリックドメイン） | 表示不要 |
| `cheetah.webp` | チーター | Wikimedia Commons | **PD**（パブリックドメイン） | 表示不要 |
| `tsukutsukuboshi.webp` | ツクツクボウシ | Wikimedia Commons | **PD**（パブリックドメイン） | 表示不要 |
| `sphynx.webp` | スフィンクス（ネコの品種） | Wikimedia Commons | **PD**（パブリックドメイン） | 表示不要 |
| `biwakoonamazu.webp` | ビワコオオナマズ | Wikimedia Commons | **PD**（パブリックドメイン） | 表示不要 |
| `sankakusu.webp` | 三角州（レナ川の三角州・衛星写真） | Wikimedia Commons | **PD**（パブリックドメイン） | 表示不要。**疑似カラー**の衛星写真 |
| `riasukaigan.webp` | リアス海岸（対馬・浅茅湾の空撮） | Wikimedia Commons<br>`Asou-Bay ria coast aerial photograph.JPG` | **CC BY**<br>→ **画面に表示ずみ** | 国土交通省 |
| `karudera.webp` | カルデラ（阿蘇山） | Wikimedia Commons<br>`Mount Aso lifeless panorama (49648240197).jpg` | **CC BY 2.0**<br>→ **画面に表示ずみ** | Raita Futo |
| `karuderako.webp` | カルデラ湖（摩周湖・ランドサット） | Wikimedia Commons<br>`Lake masyu landsat.jpg` | **CC BY-SA 3.0**<br>→ **画面に表示ずみ** | Tdk（日本語版Wikipedia） |
| `biwako.webp` | 琵琶湖（ランドサット画像） | 日本語版Wikipedia 経由 | **CC BY-SA 3.0**<br>→ **画面に表示ずみ** | Global Land Cover Facility（GLCF） |
| `nikukyu.webp` | 肉球 | Wikimedia Commons<br>`Kittens paw.JPG` | **CC BY-SA 4.0**<br>→ **画面に表示ずみ** | Rooow Ly |
| `ashika.webp` | アシカ | Wikimedia Commons | **PD**（パブリックドメイン） | José Lodos Benavente<br>（写真に署名が写りこんでいる。PDなので画面の表示は不要） |

## 白地の絵は背景を抜く

`smilodon.webp` のように**白地に切りぬかれた絵**（復元図など）は、そのまま置くと
暗い画面のなかで白い四角に見える。`--nobg` を付けて白を透明にする。

```bash
python3 tools/photo2ans.py <絵> <名前> --nobg
```

白からの距離でアルファを決めているので、毛の縁が硬くならない。
**白っぽい部分が被写体にあるときは、抜けていないか必ず確かめること。**
スミロドンは牙が白いので心配したが、少し灰色がかっていたので残った。

