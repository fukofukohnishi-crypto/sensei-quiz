// /api/generate.js
// オリジナル先生 — 理科・社会特化 / 中学受験優先
// モード:
//   1) yomimono : 漫画のコマ画像(順番) → コマごとの「重要解説」＋ 読み物全体の4択クイズ
//   2) topics   : 早稲アカのテキスト写真 → 中学受験で重要なトピック一覧（漫画づくりの材料）
//   3) (legacy) : 理科/社会の教材写真 → 4択クイズ（漫画なしでも使える簡易モード）

// Next.js APIルート構成の場合のボディ上限引き上げ（plain Vercel関数では無害）
export const config = { api: { bodyParser: { sizeLimit: '12mb' } } };

const SUBJ_NAMES = { shakai: '社会', rika: '理科' };

// 中学受験を最優先する共通方針（全プロンプトに差し込む）
const JUKEN_POLICY = `
【最重要方針：中学受験を見すえた小3教材】
- これは将来の中学入試につながる教材です。ただの雑学より、中学入試で「頻出・重要」な事項を最優先で扱う。
- 社会（地理）：地形・気候・川・平野、産業・特産物・伝統的工芸品、世界遺産や遺跡、そして「自然条件や立地と人々のくらしの“つながり（なぜそうなるか）”」を重視。
- 社会（歴史）：その遺跡・建造物・できごとが「いつの時代の何か」、時代区分、重要人物。
- 理科：生き物の分類・特徴・育ち方、季節と自然、もののすがた・しくみを「観察できる実物・ビジュアル」と結びつける。
- 用語は入試で使う正式名称を使う。ただし小3が読めるよう、むずかしい漢字には（ふりがな）をカッコ書きで添える。
- 丸暗記用の説明ではなく、実物・ビジュアル・因果で印象に残る説明にする。`;

// ── 画像のメディアタイプ判定 ──
function detectMedia(b64) {
  try {
    const d = Buffer.from(b64.slice(0, 16), 'base64');
    if (d[0] === 0x89 && d[1] === 0x50) return 'image/png';
    if (d[0] === 0x47 && d[1] === 0x49) return 'image/gif';
    if (d[0] === 0x52 && d[1] === 0x49) return 'image/webp';
  } catch (e) {}
  return 'image/jpeg';
}
function imgBlock(b64) {
  return { type: 'image', source: { type: 'base64', media_type: detectMedia(b64), data: b64 } };
}

// ── Claude 呼び出し ──
async function callClaude(content, maxTokens) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      // 品質を上げたいときは 'claude-sonnet-4-6' などに変更可
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens || 4000,
      messages: [{ role: 'user', content }]
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error: ${errText.slice(0, 500)}`);
  }
  const data = await response.json();
  const raw = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
  return raw;
}
function parseJSON(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : raw.replace(/```json|```/g, '').trim();
  return JSON.parse(jsonStr);
}
function cleanQuiz(arr) {
  return (arr || []).filter(q =>
    q && q.q && q.a && Array.isArray(q.choices) && q.choices.length === 4
  ).map(q => ({
    q: q.q, a: q.a, choices: q.choices,
    explain: q.explain || '', juken: q.juken || '',
    subject: q.subject, type: '4choice'
  }));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const mode = body.mode || (body.panels ? 'yomimono' : 'legacy');
    const subject = body.subject || (Array.isArray(body.subjects) ? body.subjects[0] : 'shakai');
    const subjName = SUBJ_NAMES[subject] || '社会';

    // ===== モード1：読み物（漫画コマ → 解説＋クイズ） =====
    if (mode === 'yomimono') {
      const panels = body.panels || [];
      if (!panels.length) return res.status(400).json({ error: 'panels (コマ画像の配列) が必要です' });
      const title = body.title || 'この読み物';
      const N = panels.length;

      const content = [];
      panels.forEach((b64, i) => {
        content.push({ type: 'text', text: `■コマ${i + 1}` });
        content.push(imgBlock(b64));
      });
      const tbs = body.textbookBase64s || (body.textbookBase64 ? [body.textbookBase64] : []);
      const wbs = body.workbookBase64s || (body.workbookBase64 ? [body.workbookBase64] : []);
      if (tbs.length) {
        content.push({ type: 'text', text: '■参考（早稲アカのテキスト。学習範囲の参考にする）' });
        tbs.forEach(b => content.push(imgBlock(b)));
      }
      if (wbs.length) {
        content.push({ type: 'text', text: '■参考（宿題の問題集。クイズはこの問われ方に寄せる）' });
        wbs.forEach(b => content.push(imgBlock(b)));
      }
      content.push({ type: 'text', text:
`あなたは中学受験の指導もする、小学3年生向け${subjName}の先生です（${subject === 'rika' ? 'カガ先生：ハイテンションの天才科学者' : 'ザンパンマン先生：頭が鍋の熱血よろい武者'}）。
学習まんが「${title}」のテーマのコマを上から順に${N}枚見せました。${tbs.length ? 'コマのあとに早稲アカのテキスト画像があり、学習範囲の参考です。' : ''}${wbs.length ? '続けて宿題の問題集の画像もあります。クイズはこの問われ方に寄せてください。' : ''}
${JUKEN_POLICY}

やること：
1) 各コマ（コマ1〜コマ${N}）について、その題材の「重要解説」を作る。
2) この読み物全体から、4択クイズを5問作る（中学受験で問われやすい切り口で）。

出力はJSONのみ（説明文・マークダウン不要）：
{
 "themes":[
   {"title":"短い見出し(例:有明海)","key":"覚える1語","hook":"先生のノリのいい・ちょっと笑える短いひとこと(1〜2文・つかみ)","kaisetsu":"重要解説(2〜3文。中学受験で問われる切り口で。小3が読める。むずかしい漢字には(ふりがな))"}
 ],
 "quiz":[
   {"q":"問題文","a":"正解","choices":["正解","誤り1","誤り2","誤り3"],"explain":"小3向けの解説","juken":"中学受験での出題ポイントを一言"}
 ]
}

厳守：
- themes は必ず${N}個、順番はコマ1→コマ${N}と同じ。
- hookは笑える明るいノリ、でも kaisetsu の中身（事実）は中学受験向けに正確に。
- quiz は5問。choices は必ず4つ。
- コマの絵から題材が読み取れない場合でも、見出しから推測して中学受験で重要な内容を書く。` });

      const raw = await callClaude(content, 4000);
      const parsed = parseJSON(raw);
      let themes = Array.isArray(parsed.themes) ? parsed.themes : [];
      // コマ数に合わせて整える
      themes = themes.slice(0, N);
      while (themes.length < N) themes.push({ title: '', key: '', hook: '', kaisetsu: '' });
      const quiz = cleanQuiz((parsed.quiz || []).map(q => ({ ...q, subject })));
      return res.status(200).json({ themes, quiz });
    }

    // ===== モード2：compose（テキスト＋問題集 → 漫画の構成案＋ChatGPTプロンプト） =====
    if (mode === 'compose' || mode === 'topics') {
      const tbs = body.textbookBase64s || (body.textbookBase64 ? [body.textbookBase64] : (body.imageBase64 ? [body.imageBase64] : []));
      const wbs = body.workbookBase64s || (body.workbookBase64 ? [body.workbookBase64] : []);
      if (!tbs.length) return res.status(400).json({ error: 'textbook（テキスト写真）が必要です' });
      const title = body.title || 'この単元';
      const content = [];
      content.push({ type: 'text', text: '■早稲アカのテキスト（学習範囲の概要。複数枚は見開き等）' });
      tbs.forEach(b => content.push(imgBlock(b)));
      if (wbs.length) {
        content.push({ type: 'text', text: '■宿題の問題集（実際に問われる内容。最優先で反映する）' });
        wbs.forEach(b => content.push(imgBlock(b)));
      }
      const TEACHER_DESC = {
        shakai: 'ザンパンマン先生（頭が金属の鍋で中に歴史がぐつぐつ煮込まれている、和風のよろい武者、胸に「ザ」の札、熱血でドヤ顔、声がやたらデカい）',
        rika: 'カガ先生（緑のツンツン髪に頭の上のゴーグル、白衣すがた、紫色に光るフラスコを持つ、超ハイテンションの天才科学者）'
      };
      const tdesc = TEACHER_DESC[subject] || TEACHER_DESC.shakai;
      content.push({ type: 'text', text:
`あなたは中学受験にくわしく、しかも子どもを爆笑させるのが大得意な、小学3年生向け${subjName}の先生です。
1〜${tbs.length}枚目は早稲アカのテキスト（学習範囲の概要）${wbs.length ? '、続く画像は宿題の問題集（実際に問われる内容）' : ''}です。
${JUKEN_POLICY}
これらをもとに、小学生が「ギャハハ！」と爆笑しながら覚えられる学習まんが「${title}」の構成案を作ってください。中学入試で重要で、かつ絵にしやすいテーマを【4個】に厳選。${wbs.length ? '問題集で実際に問われている内容を最優先にする。' : ''}

【お笑い方針（重要）】小学3年生が声を出して笑うレベルのギャグを入れる。ただし"事実そのもの"は中学受験向けに正確なまま。笑いは次の手段で出す：
- 先生の超ドヤ顔→直後にズッコケ／自滅のギャップ
- ダジャレ・言葉遊び（例：地名や用語をもじる）
- 子どもの容赦ないツッコミ（「いや多すぎだろ！」等）
- 大げさすぎるリアクションと効果音（ドーン！ズコー！バリーン！）
- ありえない例え・変顔・おおげさな比較
- シモすぎない範囲のおバカ要素（小3が学校で言って笑うレベルまで）
※下品・暴力・こわい表現はNG。あくまで明るいギャグ。

出力はJSONのみ（説明文・マークダウン不要）：
{
 "title":"読み物のタイトル案（ちょっと笑える感じでもOK）",
 "panels":[{"title":"コマ見出し","juken":"中学受験で重要な理由(一言)","draw":"漫画で描く“本物のビジュアル”の例","line":"先生の短いギャグ入りセリフ案","gag":"そのコマの笑いどころ(ツッコミや効果音など)"}],
 "summary":["キーワード","..."],
 "chatgptPrompt":"ChatGPTにそのまま貼れる日本語の作画プロンプト"
}

chatgptPrompt の中身は、次をすべて満たす1つの文章にすること（具体的に書き込む）：
■ 画像サイズ・形式（必ず明記）
- 「縦長1枚の画像。サイズは 幅1024px × 高さ1536px（縦横比2:3）」と明記する
- レイアウトは「1列の縦積み」（横に2列並べない）
- 上から順に：①表紙コマ → ②〜⑤テーマのコマ（1テーマ1コマ・全4コマ）→ ⑥まとめコマ（合計6コマ）
- 各コマは画像の横幅いっぱい。コマとコマの間には「高さ40pxほどの真っ白な横帯」を必ず入れる（あとでアプリで切り分けるための目印）
- 文字は各コマ内におさめ、はみ出さない
■ キャラ
- 先生は ${tdesc}。毎コマ同じ見た目で登場させる
- ツッコミ役の子どもを1〜2人出す
■ 文字ルール
- セリフは短く（1文40字以内）。覚えてほしい言葉だけ目立つ色にする。漢字にはふりがな
■ お笑い
- 上の【お笑い方針】のギャグを各コマに散りばめる。小学生が爆笑する明るいノリ
■ テーマ
- 上で選んだ panels の各テーマ名・描く“本物のビジュアル”・ギャグを、プロンプト本文に具体的に書き込む
■ 絵柄
- 明るい少年ギャグマンガ風。表情は大げさに` });

      const raw = await callClaude(content, 2500);
      const parsed = parseJSON(raw);
      return res.status(200).json({
        title: parsed.title || title,
        panels: parsed.panels || [],
        summary: parsed.summary || [],
        chatgptPrompt: parsed.chatgptPrompt || ''
      });
    }

    // ===== モード3（legacy）：教材写真 → 4択クイズ（漫画なし簡易） =====
    if (!body.imageBase64) return res.status(400).json({ error: 'imageBase64 が必要です' });
    if (subject !== 'rika' && subject !== 'shakai') {
      return res.status(400).json({ error: 'このアプリは理科・社会のみ対応です' });
    }
    const content = [
      imgBlock(body.imageBase64),
      { type: 'text', text:
`あなたは中学受験の指導もする、小学3年生向け${subjName}の先生です。
この教材写真から、小学3年生向けの4択問題を5問作ってください。
${JUKEN_POLICY}
出力はJSONのみ：
{"questions":[{"q":"問題文","a":"正解","choices":["正解","誤り1","誤り2","誤り3"],"explain":"解説","juken":"中学受験での出題ポイント"}]}
注意：choices は必ず4つ。小3がわかる言葉。` }
    ];
    const raw = await callClaude(content, 3000);
    const parsed = parseJSON(raw);
    const questions = cleanQuiz((parsed.questions || []).map(q => ({ ...q, subject })));
    return res.status(200).json({ questions });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
