// /api/generate.js
// オリジナル先生 — 理科・社会特化 / 中学受験優先
// モード:
//   1) yomimono : 漫画のコマ画像(順番) → コマごとの「重要解説」＋ 読み物全体の4択クイズ
//   2) compose  : テキスト＋問題集 → 漫画の構成案＋ChatGPTプロンプト（前編/後編）
//   3) (legacy) : 理科/社会の教材写真 → 4択クイズ（漫画なしでも使える簡易モード）

const SUBJ_NAMES = { shakai: '社会', rika: '理科' };

// 中学受験を最優先する共通方針（全プロンプトに差し込む）
const JUKEN_POLICY = `
【最重要方針：中学受験を見すえた小3教材】
- これは将来の中学入試につながる教材です。ただの雑学より、中学入試で「頻出・重要」な事項を最優先で扱う。
- 社会（地理）：地形・気候・川・平野、産業・特産物・伝統的工芸品、世界遺産や遺跡、そして「自然条件や立地と人々のくらしの“つながり（なぜそうなるか）”」を重視。
- 社会（歴史）：その遺跡・建造物・できごとが「いつの時代の何か」、時代区分、重要人物。
- 理科：生き物の分類・特徴・育ち方、季節と自然、もののすがた・しくみを「観察できる実物・ビジュアル」と結びつける。
- 用語は入試で使う正式名称を使う。アプリの解説テキストでは、むずかしい漢字に（ふりがな）をカッコ書きで添える。※ただし漫画の画像にはふりがなを入れない（文字を間違えやすいため）。
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
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY が未設定です（Vercelの環境変数を確認）');
  }
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      // 現行モデル（旧 claude-sonnet-4-20250514 は2026/6/15に引退→404のため変更）
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens || 4000,
      messages: [{ role: 'user', content }]
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude APIがエラー応答 (HTTP ${response.status}): ${errText.slice(0, 400)}`);
  }
  const data = await response.json();
  const raw = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
  const stop = data.stop_reason || '';
  if (!raw) throw new Error('Claudeの応答が空でした');
  return { raw, stop };
}

// ── JSON解析（末尾切れにある程度耐える） ──
function parseJSON(raw) {
  let s = raw.replace(/```json|```/g, '').trim();
  const start = s.indexOf('{');
  if (start > 0) s = s.slice(start);
  // まずそのまま
  try { return JSON.parse(s); } catch (e) {}
  // 末尾が途中で切れている場合、最後に閉じカッコを補って再挑戦
  const lastBrace = s.lastIndexOf('}');
  if (lastBrace > 0) {
    let cand = s.slice(0, lastBrace + 1);
    try { return JSON.parse(cand); } catch (e) {}
  }
  // 開いたカッコ/括弧の数を数えて不足分を補う
  try {
    let depthObj = 0, depthArr = 0, inStr = false, esc = false, cut = s.length;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') inStr = !inStr;
      if (inStr) continue;
      if (ch === '{') depthObj++;
      else if (ch === '}') depthObj--;
      else if (ch === '[') depthArr++;
      else if (ch === ']') depthArr--;
    }
    let fixed = s;
    if (inStr) fixed += '"';
    fixed = fixed.replace(/,\s*$/, '');
    while (depthArr-- > 0) fixed += ']';
    while (depthObj-- > 0) fixed += '}';
    return JSON.parse(fixed);
  } catch (e) {}
  // それでもダメなら、生応答の冒頭を添えて投げる（原因が画面で見えるように）
  throw new Error('JSON解析に失敗（応答が途中で切れた可能性）。応答冒頭: ' + raw.slice(0, 180));
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

  let stage = 'init';
  try {
    const body = req.body || {};
    const mode = body.mode || (body.panels ? 'yomimono' : 'legacy');
    const subject = body.subject || (Array.isArray(body.subjects) ? body.subjects[0] : 'shakai');
    const subjName = SUBJ_NAMES[subject] || '社会';

    // ===== モード1：読み物（漫画コマ → 解説＋クイズ） =====
    if (mode === 'yomimono') {
      stage = 'yomimono';
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
1) 各コマ（コマ1〜コマ${N}）について、その題材を中学受験の観点で「深く」解説する。
   重要：漫画の絵を説明するのではない。その題材そのものを、テキスト・問題集から具体的な数値・固有名詞・年代・因果を拾って深掘りする。教材が無くても、中学受験で重要な内容を自分の知識で深く書く。
2) この読み物全体から、4択クイズを5問作る（中学受験で問われやすい切り口・一問は少し難しめでもよい）。

出力はJSONのみ（説明文・マークダウン不要）：
{
 "themes":[
   {"title":"短い見出し(例:有明海)","key":"覚える1語",
    "hook":"先生のノリのいい・ちょっと笑える短いひとこと(1〜2文・つかみ)",
    "kaisetsu":"基本解説(2〜3文。小3が読める。むずかしい漢字には(ふりがな))",
    "deep":"もっとくわしく(3〜4文。中学受験で差がつく深い内容：背景・因果・関連する地名や人物・数値・他単元とのつながり。具体的に)",
    "point":"入試での問われ方・覚えどころを一言"}
 ],
 "quiz":[
   {"q":"問題文","a":"正解","choices":["正解","誤り1","誤り2","誤り3"],"explain":"小3向けの解説","juken":"中学受験での出題ポイントを一言"}
 ]
}

厳守：
- themes は必ず${N}個、順番はコマ1→コマ${N}と同じ。
- hookは笑える明るいノリ。kaisetsu・deep の中身（事実）は中学受験向けに正確に。deepは"浅い言い換え"ではなく必ず一段深い内容にする。
- quiz は5問。choices は必ず4つ。
- 題材が読み取れない場合でも、見出しから推測して中学受験で重要な内容を深く書く。` });

      const { raw } = await callClaude(content, 5000);
      stage = 'yomimono-parse';
      const parsed = parseJSON(raw);
      let themes = Array.isArray(parsed.themes) ? parsed.themes : [];
      themes = themes.slice(0, N);
      while (themes.length < N) themes.push({ title: '', key: '', hook: '', kaisetsu: '', deep: '', point: '' });
      const quiz = cleanQuiz((parsed.quiz || []).map(q => ({ ...q, subject })));
      return res.status(200).json({ themes, quiz });
    }

    // ===== モード2：compose（テキスト＋問題集 → 漫画の構成案＋ChatGPTプロンプト 前編/後編） =====
    if (mode === 'compose' || mode === 'topics') {
      stage = 'compose';
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
これらをもとに、学習まんが「${title}」の構成案を【前編】【後編】の2枚に分けて作ってください。
- 前編 ＝ 地理・自然・産業（位置/地形/平野/川/気候/特産物/工業など）
- 後編 ＝ 歴史・人物・文化（できごと/時代/重要人物/寺社・文化財/伝統など）
各編、中学入試で重要なテーマを【5個】選ぶ（合計10テーマ）。

【内容の濃さ（最重要）】"映え"より中身を優先。${wbs.length ? '問題集に出ている語句・人物・因果を最優先で入れる。' : 'テキストで重要な語句・人物・因果を厚く入れる。'}
- 用語だけでなく「なぜ重要か」「何とつながるか」を入れる（例：石炭がとれる→製鉄所ができた、等の因果）
- 人物・地名・できごとは正確に。あいまいなら入れない（混同しない）

【お笑い方針】小3が声を出して笑う明るいギャグ（ドヤ顔→ズッコケ、ダジャレ、子のツッコミ、効果音ドーン/ズコー、変顔）。ただし"事実"は正確なまま。下品・暴力・こわい表現はNG。

出力はJSONのみ（説明文・マークダウン不要）：
{
 "parts":[
  {"part":"前編","subtitle":"地理・自然・産業",
   "panels":[{"title":"コマ見出し","key":"覚える1語","juken":"中学受験で重要な理由","draw":"描く本物のビジュアル","line":"先生のギャグ入りセリフ","gag":"笑いどころ"}],
   "chatgptPrompt":"ChatGPTにそのまま貼れる作画プロンプト"},
  {"part":"後編","subtitle":"歴史・人物・文化","panels":[...同じ形式...],"chatgptPrompt":"..."}
 ]
}

各 chatgptPrompt は次をすべて満たす1つの文章にする（具体的に書き込む）：
■ 画像サイズ・形式（必ず明記）
- 「縦長1枚の画像。サイズは 幅1024px × 高さ1536px（縦横比2:3）」と明記
- 「1列の縦積み」（横2列にしない）
- 上から：①表紙コマ（${title}・前編/後編の別を表示）→ ②〜⑥テーマ5コマ → ⑦まとめコマ（合計7コマ）
- 各コマは横幅いっぱい。コマ間に「高さ50pxほどの真っ白な横帯」を必ず入れる（切り分け用の目印）
- 文字は各コマ内におさめ、はみ出さない。詰め込みすぎない
■ キャラ
- 進行役（毎コマ登場）は ${tdesc}。毎コマ同じ見た目で
- ツッコミ役の子どもを1〜2人
- ゲスト先生は【この漫画につき1人だけ】下から選び、その1人を最初から最後まで通して登場させる（コマごとに別の先生に変えない。統一感を出す）。選んだゲストは説明どおりの見た目で、相棒・ツッコミ・乱入などで活躍させる：
  ・ヤバイヤツ先生（筋肉ムキムキ、白いタンクトップ、計算・数字が得意）
  ・爆弾魔先生（頭が赤いダイナマイト、体育会系で超熱血）
  ・乾パンマン先生（黒い忍者すがた、額に「乾」の文字、図工・アートの達人）
  ・ツッコミマン先生（黒スーツのハゲ頭、音符を飛ばす、容赦ないツッコミ）
  ・ウザン先生（顔が大きな白い丸に点目、もの知りでクール）
  ・幸腹満腹先生（ピンクのメイド服のかわいい先生、料理上手）
  ・はぁとさん（白いまんまる顔にヒゲと丸メガネ、やさしいスクールカウンセラー）
  ・バクソウ先生（白髪サラサラの優等生風の青年）
  ・氷火羅門先生（赤と青の髪の伝説級の先生、大物感）
  ※前編と後編で別のゲストにしてもよい（ただし各編の中では1人で通す）
■ 文字：セリフは短く(1文40字以内)、覚える言葉だけ目立つ色。ふりがなは振らない（漢字はそのまま。文字は最小限に）
■ お笑い：上の方針のギャグを各コマに散りばめる
■ テーマ：その編の panels の各テーマ名・本物のビジュアル・覚える用語・ギャグを本文に具体的に書き込む
■ 絵柄：明るい少年ギャグマンガ風、表情は大げさに` });

      const { raw } = await callClaude(content, 8000);
      stage = 'compose-parse';
      const parsed = parseJSON(raw);
      return res.status(200).json({
        title: parsed.title || title,
        parts: parsed.parts || [],
        // 後方互換
        panels: parsed.panels || [],
        chatgptPrompt: parsed.chatgptPrompt || ''
      });
    }

    // ===== モード4：factcheck（漫画コマ × 教材 を照合して事実チェック） =====
    if (mode === 'factcheck') {
      stage = 'factcheck';
      const panels = body.panels || [];
      if (!panels.length) return res.status(400).json({ error: 'panels (コマ画像の配列) が必要です' });
      const title = body.title || 'この読み物';
      const N = panels.length;
      const tbs = body.textbookBase64s || (body.textbookBase64 ? [body.textbookBase64] : []);
      const wbs = body.workbookBase64s || (body.workbookBase64 ? [body.workbookBase64] : []);

      const content = [];
      panels.forEach((b64, i) => {
        content.push({ type: 'text', text: `■漫画コマ${i + 1}` });
        content.push(imgBlock(b64));
      });
      if (tbs.length) {
        content.push({ type: 'text', text: '■教材：早稲アカのテキスト（これを正とする）' });
        tbs.forEach(b => content.push(imgBlock(b)));
      }
      if (wbs.length) {
        content.push({ type: 'text', text: '■教材：宿題の問題集（これを正とする）' });
        wbs.forEach(b => content.push(imgBlock(b)));
      }
      content.push({ type: 'text', text:
`あなたは中学受験にくわしい${subjName}の校閲者です。
上の「漫画コマ1〜${N}」は、子ども向け学習まんが「${title}」です（AIが描いたので事実ミスが混ざることがあります）。
${tbs.length || wbs.length ? 'その後ろにある「教材」を“正しい基準”として、' : '中学受験レベルの正確な知識を基準として、'}漫画の文字・内容に事実の誤りがないか校閲してください。

チェックする観点：
- 地名・県名・位置の誤り（例：別の県のものになっている）
- 人物の取り違え（例：別人の業績にしている）
- 年代・時代区分の誤り
- 因果や用語の誤り（例：原因と結果が逆、用語の誤用）
- 中学受験的に「誤解を生む／不正確」な表現
${tbs.length || wbs.length ? '※教材に書かれていないだけ（教材外の正しい補足）は誤りとしない。教材と食い違う・明確に事実誤認のものを指摘する。' : ''}

出力はJSONのみ（説明文・マークダウン不要）：
{
 "verdict":"ok" または "warn" または "ng",
 "summary":"全体所見を1〜2文",
 "issues":[
   {"panel":コマ番号(数字),"level":"重大" または "軽微","quote":"漫画中の問題箇所(短く)","problem":"何がどう誤りか","fix":"正しくはどうか"}
 ]
}
判定基準：重大な事実誤りがあれば "ng"、軽微・紛らわしい程度なら "warn"、問題なければ "ok"（issuesは空配列）。` });

      const { raw } = await callClaude(content, 3000);
      stage = 'factcheck-parse';
      const parsed = parseJSON(raw);
      return res.status(200).json({
        verdict: parsed.verdict || 'warn',
        summary: parsed.summary || '',
        issues: Array.isArray(parsed.issues) ? parsed.issues : []
      });
    }

    // ===== モード3（legacy）：教材写真 → 4択クイズ（漫画なし簡易） =====
    stage = 'legacy';
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
    const { raw } = await callClaude(content, 3000);
    stage = 'legacy-parse';
    const parsed = parseJSON(raw);
    const questions = cleanQuiz((parsed.questions || []).map(q => ({ ...q, subject })));
    return res.status(200).json({ questions });

  } catch (err) {
    // 本当の原因を返す（どの工程で失敗したかも）
    return res.status(500).json({ error: `[${stage}] ${err.message}` });
  }
}
