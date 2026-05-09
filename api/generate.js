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
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
              { type: 'text', text: `この画像に書かれた漢字を読んでください。正解は「${correctAnswer}」です。書かれた文字が正解と同じか判定してください。多少の字形の乱れは許容してください。JSONのみで返答：{"correct":true}または{"correct":false,"written":"実際に書かれた文字"}` }
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
    let prompt = '';

    if (subj === 'sansu') {
      prompt = `あなたは小学3年生向けの算数問題を作る先生です。
この画像（教科書・プリント）から、小学3年生向けの計算問題・文章題を3〜6問作ってください。

必ずJSONのみで返してください。説明文・マークダウン不要。
形式：
{"questions":[{"q":"問題文（例：34 × 12 ＝）","a":"408","choices":[],"subject":"sansu","type":"calc","explain":"解き方の説明"}]}

注意：typeは必ず"calc"、aは数字のみ`;

    } else if (subj === 'kokugo') {
      prompt = `あなたは小学3年生向けの国語問題を作る先生です。
この画像（教科書・プリント）を注意深く見て、内容に応じて適切な問題を作ってください。

【画像の内容を判断して問題タイプを選ぶ】

■ 画像に漢字の書き取り練習・漢字ドリルがある場合：
→ 漢字書き取り問題（type:"kanji_write"）を多く作る
→ 例：{"q":"「やま」を漢字で書こう","a":"山","choices":[],"type":"kanji_write","explain":"山は訓読みで「やま」"}

■ 画像に漢字の読み方問題がある場合：
→ 読み方4択問題（type:"kanji_read"）を作る
→ 例：{"q":"「山」の読み方は？","a":"やま","choices":["やま","かわ","うみ","そら"],"type":"kanji_read","explain":"山は「やま」と読みます"}

■ 画像に文法・主語述語・言葉の意味・文章読解問題がある場合：
→ 4択問題（type:"4choice"）を作る
→ 例：{"q":"「きりが晴れる」の述語はどれ？","a":"晴れる","choices":["晴れる","きり","が","晴"],"type":"4choice","explain":"述語は動詞や形容詞です"}

必ずJSONのみで返してください。説明文・マークダウン不要。
形式：
{"questions":[
  {"q":"問題文","a":"正解","choices":["正解","不正解1","不正解2","不正解3"],"subject":"kokugo","type":"4choice","explain":"解説"},
  {"q":"問題文","a":"正解","choices":[],"subject":"kokugo","type":"kanji_write","explain":"解説"}
]}

重要：
- 画像の内容に合ったtypeを選ぶ（文法問題に kanji_write は使わない）
- kanji_writeのchoicesは空配列[]
- kanji_read・4choiceのchoicesは必ず4つ
- 3〜8問作る
- 小学3年生レベルの問題
- 印刷された文字だけを使う（手書きの回答・赤ペンの丸やバツは無視する）
- 問題文が不完全・意味不明な場合は作らない`;

    } else {
      const NAMES = { shakai: '社会', rika: '理科' };
      const subjName = NAMES[subj] || subj;
      prompt = `あなたは小学3年生向けの${subjName}問題を作る先生です。
この画像から小学3年生向けの4択問題を3〜6問作ってください。
JSONのみで返してください。
形式：{"questions":[{"q":"問題文","a":"正解","choices":["正解","不正解1","不正解2","不正解3"],"subject":"${subj}","type":"4choice","explain":"解説"}]}
注意：choicesは必ず4つ、小学3年生がわかる言葉を使う`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
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
      return res.status(response.status).json({ error: `Claude API error: ${errText.slice(0, 500)}` });
    }

    const data = await response.json();
    const raw = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    const match = raw.match(/\{[\s\S]*\}/);
    const jsonStr = match ? match[0] : raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    const questions = (parsed.questions || []).filter(q => {
      if (!q.q || !q.a) return false;
      if (q.type === 'calc' || q.type === 'kanji_write') return true;
      return Array.isArray(q.choices) && q.choices.length === 4;
    });

    return res.status(200).json({ questions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
