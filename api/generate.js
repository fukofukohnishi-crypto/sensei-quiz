export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, subjects, checkKanji, correctAnswer } = req.body;

    // ── 漢字判定モード ──
    if (checkKanji) {
      if (!imageBase64 || !correctAnswer) {
        return res.status(400).json({ error: 'imageBase64 and correctAnswer required' });
      }
      let mediaType = 'image/jpeg';
      try {
        const decoded = Buffer.from(imageBase64.slice(0, 16), 'base64');
        if (decoded[0] === 0x89) mediaType = 'image/png';
      } catch (e) {}

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-6',
          max_tokens: 100,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
              { type: 'text', text: `この画像に書かれた漢字・文字を読んでください。正解は「${correctAnswer}」です。書かれた文字が正解と同じか判定してください。多少の字形の乱れは許容してください。JSONのみで返答：{"correct":true}または{"correct":false,"written":"実際に書かれた文字"}` }
            ]
          }]
        })
      });

      const data = await response.json();
      const raw = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
      const match = raw.match(/\{[\s\S]*\}/);
      const result = JSON.parse(match ? match[0] : raw);
      return res.status(200).json(result);
    }

    // ── 問題生成モード ──
    if (!imageBase64 || !subjects || subjects.length === 0) {
      return res.status(400).json({ error: 'imageBase64 and subjects are required' });
    }

    let mediaType = 'image/jpeg';
    try {
      const decoded = Buffer.from(imageBase64.slice(0, 16), 'base64');
      if (decoded[0] === 0x89 && decoded[1] === 0x50) mediaType = 'image/png';
      else if (decoded[0] === 0x47 && decoded[1] === 0x49) mediaType = 'image/gif';
      else if (decoded[0] === 0x52 && decoded[1] === 0x49) mediaType = 'image/webp';
    } catch (e) {}

    const subj = subjects[0];

    // 科目別プロンプト
    let prompt = '';

    if (subj === 'sansu') {
      prompt = `あなたは小学3年生向けの算数問題を作る先生です。
この画像（教科書・プリント）から、小学3年生向けの計算問題・文章題を3〜6問作ってください。

必ずJSONのみで返してください。説明文・マークダウン不要。
形式：
{"questions":[
  {
    "q":"問題文（例：34 × 12 ＝）",
    "a":"答え（数字のみ、例：408）",
    "choices":[],
    "subject":"sansu",
    "type":"calc",
    "explain":"解き方の簡単な説明（1〜2文）"
  }
]}

注意：
- typeは必ず"calc"
- aは数字のみ（単位不要、例：408）
- 小学3年生レベルの計算（たし算・ひき算・かけ算・わり算・文章題）
- 画像の内容から問題を作る`;

    } else if (subj === 'kokugo') {
      prompt = `あなたは小学3年生向けの国語問題を作る先生です。
この画像（教科書・プリント）から、小学3年生向けの問題を3〜6問作ってください。

漢字の読み方問題は type:"kanji_read"、熟語・意味・文法問題は type:"4choice" にしてください。

必ずJSONのみで返してください。説明文・マークダウン不要。
形式：
{"questions":[
  {
    "q":"問題文",
    "a":"正解",
    "choices":["正解","不正解1","不正解2","不正解3"],
    "subject":"kokugo",
    "type":"kanji_read",
    "explain":"解説（1〜2文）"
  }
]}

注意：
- kanji_read: 漢字の読み方問題、choicesは4つ（ひらがな）
- 4choice: 意味・文法・熟語問題、choicesは4つ
- 小学3年生がわかる言葉を使う
- 画像の内容から問題を作る`;

    } else {
      // 理科・社会：4択
      const NAMES = { shakai: '社会', rika: '理科' };
      const subjName = NAMES[subj] || subj;
      prompt = `あなたは小学3年生向けの${subjName}問題を作る先生です。
この画像（教科書・プリント）から、小学3年生向けの4択問題を3〜6問作ってください。

必ずJSONのみで返してください。説明文・マークダウン不要。
形式：
{"questions":[
  {
    "q":"問題文",
    "a":"正解の選択肢",
    "choices":["正解","不正解1","不正解2","不正解3"],
    "subject":"${subj}",
    "type":"4choice",
    "explain":"解説（1〜2文）"
  }
]}

注意：choicesは必ず4つ、choicesの中にaが含まれる、小学3年生がわかる言葉を使う`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Claude API error: ${errText.slice(0, 200)}` });
    }

    const data = await response.json();
    const raw = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    const match = raw.match(/\{[\s\S]*\}/);
    const jsonStr = match ? match[0] : raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    const questions = (parsed.questions || []).filter(q => {
      if (!q.q || !q.a) return false;
      if (q.type === 'calc') return true; // 算数は選択肢不要
      return Array.isArray(q.choices) && q.choices.length === 4;
    });

    return res.status(200).json({ questions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
