# sensei-quiz（オリジナル先生）

早稲アカ小3向けのテスト対策クイズアプリ。子供が実際に使う。

## 構成

ビルドツールなしの**静的HTML＋Vercelサーバーレス関数**。
各HTMLは1ファイル完結（CSSもJSも内包）で、共有ライブラリはない。

```
index.html        ホーム。各アプリへの導線 ＋ 全アプリ共通のカードコレクション画面
chizu.html        ニッポン制覇（都道府県マップ→クイズ→メダル→守護神カード）
                  通年で使う。テストとは独立
october.html      10月マンスリー（後期 第1〜5回）。★開発中・いま一番新しい
natsuyasumi.html  夏休み理科特訓（2026年夏）。★終了
rikashakai.html   7月マンスリー。★終了・凍結
may.html          5月マンスリー。★終了・凍結
api/generate.js   Claude API 呼び出し。教材写真→クイズ生成／漫画構成案
Cards.json        カード63枚のマスタデータ
stories.json      学園の読み物。10月版のご褒美（連続正解のベスト更新で1話解放）
quizbank-seed.json  理科 後期第1〜5回の作りおき問題202問。october.html の
                    管理画面から読みこむ（承認まちに入る）
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

そのときいちばん新しいファイル（今なら `october.html`）を土台にする。
そのうえで **保存領域を必ず見直すこと。**

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
- `flashcard` … 教材写真 → **記述式**の問題（10月版・関門1）。source（教材からの引用）必須
- `verify` … 問題＋根拠 → 一意に答えられるかの判定（10月版・関門3）。5問ずつ呼ぶ

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
- **UIの文言はぜんぶ日本語。** ただし**ふりがなは付けない。** 使う子は小3だが
  『Dr.STONE』『NARUTO』を読む読解力があり、ふりがなはむしろ読みにくいとのこと。
  語彙や内容も、小3向けに薄めず、歯ごたえのあるものにしてよい。
- **既存のセーブデータを壊さない。** localStorage のキー名を変えるときは
  移行コードを書くか、`*_reset_*` フラグ方式で1回だけ変換する。
- 画像は必ず `onerror` フォールバックを付ける（絵文字などに落とす）。
  素材が欠けても画面が壊れないようにするため。

## october.html（10月版）

問題は**フラッシュカード一本**。4択は作らない。`choices` フィールドを持たないので
「次のうち正しいものは」型の問題は構造的に作れない。1問はこの形:

```json
{ "id":"q...", "type":"text|map_reverse", "subj":"rika|shakai", "round":1,
  "q":"問題文", "a":"正解（20字以内）", "accept":["表記ゆれ"],
  "source":"教材からの引用（必須・品質保証の要）",
  "explain":"解説", "juken":"入試ポイント",
  "checks":{"auto":"pass","ai":"pass","human":"approved"} }
```

問題が出題プールに入るまでの**4つの関門**。全部通ったものだけが子供の前に出る。

| | どこ | 何をする |
|---|---|---|
| 関門1 | `api/generate.js` の `flashcard` | 生成時にプロンプトで縛る。引用できない問題は作らせない |
| 関門2 | `october.html` の `gate2()` | 禁止語・答えの長さ・答えが問題文にある・引用なし・重複を機械で弾く |
| 関門3 | `api/generate.js` の `verify` | 作った時とは別プロンプトで、白紙から一意性を判定。5問ずつ |
| 関門4 | `october.html` の承認UI | 1問ずつ ⭕採用／✏️直す／🗑️捨てる。採用したものだけ `quizbank` へ |

保存領域（夏休み版とは分ける。カードだけ共有）:

| キー | 中身 |
|---|---|
| IndexedDB `senseiOct` / `kv` | `quizbank`（採用ずみ）、`drafts`（確認まち） |
| `oct_challenge_v1` | 50問連続の記録と自己ベスト |
| `oct_stories_v1` | 解放ずみの小説のid |
| `oct_review_v1` | まちがい直しリスト |
| `sz_cards_v1` | **カードは夏休み版と共有**（`index.html` の変更不要） |

- 50問連続チャレンジの専用カードは `sp04`（理科）/ `sp05`（社会）/ `sp06`（融合）。
  **まだ `Cards.json` に無い。** 無い場合はトーストだけ出して落ちないようにしてある。
  絵ができたら `Cards.json` に足す。
- 連続正解の**自己ベストを更新するたび**に `stories.json` が1話ずつ解放される。
- 画面は**iPad横長**が基準（左に先生、右に問題）。解説文は `1.14rem` / 行間 `2.05`。
- `source`（引用）は**100字以内の該当箇所だけ**にする。長い文章まるごとだと画面を圧迫する。
- `gate2()` の「上の・下の・右の・左の」は、**そのあとに図や表が続くときだけ**弾く。
  そうしないと「地球上の水」のような正しい問題文まで巻きこむ（実際に踏んだ）。

### 手書きの書き込みは信じない

教材の写真は、子供が答えを書き込んだあとの問題集であることが多い。
**その書き込みは答え合わせをしていないので、まちがっていることがある。**
（実際、第1回の海水魚と淡水魚の仕分けは逆に書かれていた。）

- 手書きの文字を正解の根拠にしない。`source` に手書きを写さない。
- **印刷された文から答えが確定できる問題だけ**を作る。
- 選択肢から絞りこむ場合は、あてはまるものが1つしかないと言いきれるときだけ。
- この方針は `api/generate.js` の `flashcard` と `verify` のプロンプトにも書いてある。

問題には `basis` フィールドを持たせている:

| 値 | 意味 |
|---|---|
| `text` | 印刷された地の文から直接作った。信頼度が高い |
| `choice` | 選択肢を手がかりに絞りこんだ。承認画面で**オレンジのバッジ**が出る |

`choice` の問題は、承認するときに人が中身を確かめること。

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
