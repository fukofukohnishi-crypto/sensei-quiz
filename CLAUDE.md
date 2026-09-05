# sensei-quiz（オリジナル先生）

早稲アカ小3向けのテスト対策クイズアプリ。子供が実際に使う。

## 構成

ビルドツールなしの**静的HTML＋Vercelサーバーレス関数**。
各HTMLは1ファイル完結（CSSもJSも内包）で、共有ライブラリはない。

```
index.html        ホーム。各アプリへの導線 ＋ 全アプリ共通のカードコレクション画面
chizu.html        ニッポン制覇（都道府県マップ→クイズ→メダル→守護神カード）
                  通年で使う。テストとは独立
natsuyasumi.html  夏休み理科特訓（2026年夏）。いま一番機能が多い
rikashakai.html   7月マンスリー。★終了・凍結
may.html          5月マンスリー。★終了・凍結
api/generate.js   Claude API 呼び出し。教材写真→クイズ生成／漫画構成案
Cards.json        カード63枚のマスタデータ
card-images/      カード絵（WebP。q85 で変換済み）
chars/            守護神の立ち絵（portraits/）とメダル画像（medals/地方名/）
img/              HTMLから外出しした画像
                    kv.jpg      理科☆社会特訓のキービジュアル
                    hero.jpg    ホームのヒーロー画像
                    teachers/   先生の立ち絵（natsuyasumi / rikashakai）
                    manga/      佐賀県の読み物 cover / p1〜p8 / summary
                    reactions/  may.html のクイズ中の先生の表情
                                <先生>_<start|ganbaro|correct|wrong>.webp
```

**画像をHTMLに base64 で埋め込まないこと。** 以前は4ファイルに計4.7MBが
埋まっていてHTMLが1.8MBになっていた。`img/` に置いてパスで参照する。

## テストごとに1ファイル、終わったら凍結

`may.html`（5月）→ `rikashakai.html`（7月）→ `natsuyasumi.html`（夏休み）
というように、**テストや講習ごとに独立したHTMLを1本作る**のがこのプロジェクトの
やり方。そのテストが終わったらそのファイルは**凍結**し、以後さわらない。
過去のテストの成績や記録がそのまま残るようにするため。

だから「古いから統合する」「共通化してリファクタする」はしない。
次は10月マンスリー用に新しいファイルを作る予定。

### 新しいテストのアプリを作るとき

そのときいちばん機能が多いファイル（今なら `natsuyasumi.html`）をコピーして
土台にする。そのうえで **保存領域を必ず見直すこと。**

`natsuyasumi.html` と `rikashakai.html` は、下記をすべて**共有**している:

- IndexedDB `senseiZukan` の `entries`（読み物）、`materials`（教材写真）、
  `quizbank`（問題ストック）
- localStorage の `sz_review_v1`（復習リスト）

つまり夏休みアプリに入れた読み物が7月アプリにもそのまま出る。単純にコピーすると
10月アプリもこの2つと中身を共有してしまう。テストごとに内容を分けたいなら、
新しいファイルでは IndexedDB のDB名かキー名、および `sz_review_v1` を
別の名前にする（例: `senseiZukan_oct` / `oct_review_v1`）。

一方 **カードの保存先 `sz_cards_v1` は共有のままでよい。** カードは
テストをまたいで1つのコレクションにまとまる設計で、`index.html` が
`sensei-gacha-v1` と合わせて合算表示している。新しいキーを作った場合は
`index.html` の `sources()` に追加すること。

デプロイは Vercel。`api/` 配下が自動的に関数になり、それ以外は静的配信される。
`vercel.json` はない（デフォルト動作に任せている）。

## 一番大事な前提：サーバーDBがない

**成績もカードも全部ユーザーの端末のなか**にある。ログインもアカウントもない。
つまり **端末を変えるとデータは消える**。この制約を壊さないこと。

### localStorage キー一覧

| キー | 中身 | 書く人 | 読む人 |
|---|---|---|---|
| `sensei-gacha-v1` | マンスリー系のカード＋チケット | may, chizu | index |
| `sz_cards_v1` | 理科☆社会・夏休み特訓のカード | natsuyasumi, rikashakai | index |
| `sensei-quiz-v15` | 5月テストの成績 | may | natsuyasumi |
| `sensei_collection_v2` | 都道府県メダルの進捗 | chizu | chizu |
| `sz_challenge_v1` | 50問チャレンジの連続正解記録 | natsuyasumi | natsuyasumi |
| `sz_review_v1` | まちがえた問題の復習リスト | natsuyasumi, rikashakai（**共有**） | 同左 |
| `cards_reset_v2` / `sz_cards_reset_v2` | 1回だけリセットを走らせるフラグ | index, natsuyasumi | 同左 |

`index.html` はこの**複数のキーを横断して合算**し、1つのコレクション画面として見せている。
カードの保存先を増やしたら `index.html` の `sources()` にも足すこと。忘れると
「取ったのにコレクションに出てこない」というバグになる。

### IndexedDB

DB名 `senseiZukan` / ストア `kv`。natsuyasumi と rikashakai が**同じDB・同じキーを
共用している**（片方に入れた読み物がもう片方にも出る）。新しいテストのアプリを
作るときの注意は上の「テストごとに1ファイル」を参照。
キーは `entries`（読み物）、`materials`（教材写真）、`quizbank`（問題ストック）。
写真データが入るので重い。natsuyasumi にはJSONの書き出し／読み込み機能があり、
端末を移すときはこれを使う。

## カードの仕組み

`Cards.json` が唯一のマスタ。63枚。1件はこの形:

```json
{ "id": "sr001", "char": "zanpanman", "rarity": 2,
  "name": "ザンパンマン先生", "power": "必殺技の説明…",
  "imgUrl": "/card-images/sr01_zanpanman.webp" }
```

画像は **WebP**（品質85）。元絵がPNGやJPEGで来たら必ず変換してから入れる。
PNGのまま置くと1枚2.5〜3MBになり、子供の端末で表示が重くなる。

レアリティは **1始まりの配列インデックス**で、0番は空文字のダミー:

```js
RNAME = ['','N','SR','SSR','R','伝説','神覚者','四天王'];  // 1..7
RCOL  = ['','#aaa','#44ccff','#ff8800','#dd44ff','#ff2288','#ffd700','#66ffee'];
```

`rarity` の数字が大きい＝レア、ではない。**R(4) は SSR(3) より上**という並びなので、
ソートや比較を書くときは必ずこの配列を基準にすること。

### カードの入手経路

| アプリ | 条件 | もらえるもの |
|---|---|---|
| 夏休み理科特訓 | 10問こたえるごと | ランダム1枚 |
| 夏休み理科特訓 | 50問連続正解 | 専用の神覚者カード（`sp01`/`sp02`）。2枚そろうと四天王 `sp03` に融合 |
| ニッポン制覇 | 1県のメダル10個コンプ | その県の守護神Rカード（`PREF_CARD_MAP` 参照） |
| マンスリーテスト | 5問正解ごとにチケット1枚 | チケットでガチャ |

## 都道府県データ（chizu.html）

`PREF_DATA` に県コード（`"31"`〜`"47"`）をキーとして持つ。**現在17県のみ実装**
（中国・四国・九州沖縄）。北海道〜近畿の30府県は未実装で、タップすると
「じゅんびちゅう！」と出る。

1県 = メダル10個、メダル1個 = 4択クイズ1問。県を足すときは:

1. `PREF_DATA` に県を追加（守護神＋メダル10個＋クイズ10問）
2. `chars/portraits/<県名ローマ字>.png` に守護神の立ち絵
3. `chars/medals/<地方名>/<キーワード>.png` にメダル画像10枚
4. `Cards.json` に守護神Rカードを追加し、`PREF_CARD_MAP` で県コードと紐づけ
5. SVGマップ側の `.prefecture` に対応する `data-code` があるか確認

クイズの `answer` は選択肢配列のインデックス。データ上はすべて `answer:0`（正解が先頭）で、
表示時に `shuffleArray` でシャッフルされる。**この規約を崩さないこと。**

## api/generate.js

Claude API を生fetchで叩く（SDKは入れていない）。モードは3つ:

- `yomimono` … 漫画のコマ画像 → コマごとの解説＋4択クイズ
- `compose` … テキストと問題集の写真 → 漫画の構成案＋画像生成プロンプト
- legacy … 教材写真 → 4択クイズだけ

`JUKEN_POLICY` という共通の方針文字列を全プロンプトに差し込んでいる。
中学受験を見すえた内容にするための指示なので、プロンプトを触るときは消さないこと。

モデルは `claude-sonnet-5`。`thinking: {type:'disabled'}` を明示している
（sonnet-5 は省略すると思考がONになり、思考トークンが `max_tokens` を食って
JSONが途中で切れるため）。品質を上げたくなったら `{type:'adaptive'}` にして
`max_tokens` を増やす。

`ANTHROPIC_API_KEY` は Vercel の環境変数。レスポンスは末尾が切れることがあるので
`parseJSON()` が閉じカッコを補って復旧を試みる作りになっている。

## 書くときの約束

- **フレームワークを持ち込まない。** React も npm パッケージも入れない。素のJS。
- **ファイルをまたぐ共通化をしない。** 各HTMLは単体で開いても動く状態を保つ。
  重複はあるが、それを承知でこの構成にしている。
- **UIの文言はぜんぶ日本語。** 小3が読むので、むずかしい漢字にはふりがなを添える。
- **既存のセーブデータを壊さない。** localStorage のキー名を変えるときは
  移行コードを書くか、`*_reset_*` フラグ方式で1回だけ変換する。
- 画像は必ず `onerror` フォールバックを付ける（絵文字などに落とす）。
  素材が欠けても画面が壊れないようにするため。

## 検証

テストランナーはない。変更したら最低限これを通す:

```bash
# インラインJSの構文チェック
node -e "const fs=require('fs'),vm=require('vm');
for(const f of ['index.html','chizu.html','may.html','natsuyasumi.html','rikashakai.html']){
  const s=fs.readFileSync(f,'utf8');let m,i=0;
  const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  while((m=re.exec(s))){i++;try{new vm.Script(m[1]);}catch(e){console.log('NG',f,i,e.message);}}
  console.log('ok',f,i);}"

node --check api/generate.js

# Cards.json の画像参照が全部実在するか
python3 -c "
import json,os
for c in json.load(open('Cards.json')):
    p=(c.get('imgUrl') or '').lstrip('/')
    if not p or not os.path.exists(p): print('missing:', c['id'], c.get('imgUrl'))
"
```

## 既知の課題

- 端末間のデータ移行手段が natsuyasumi のJSON書き出ししかない。
- `img/manga/` と `img/teachers/` はJPEGのまま。WebP化すればさらに3割ほど減る。
- `chars/`（守護神の立ち絵・メダル画像）が53MBのPNGのまま。カード画像と同じ手順で
  WebP化できる。ただし参照が `chizu.html` の `PREF_DATA` 内に187件散らばっている。
