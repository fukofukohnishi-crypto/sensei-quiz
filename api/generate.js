export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
 
  try {
    const { imageBase64, subjects } = req.body;
    if (!imageBase64 || !subjects || subjects.length === 0) {
      return res.status(400).json({ error: 'imageBase64 and subjects are required' });
    }
 
    const CHARS = {
      shakai: '社会', sansu: '算数', kokugo: '国語', rika: '理科'
    };
    const subjList = subjects.map(s => CHARS[s] || s).join('・');
 
    const prompt = `あなたは小学3年生向けの問題を作る先生です。
この画像（教科書・プリント・ノート）の内容から、小学3年生向けの4択問題を3〜6問作ってください。
対象科目：${subjList}
subjectの値は次のいずれか：${subjects.join(', ')}
 
必ずJSONのみで返してください。説明文・マークダウン不要。
形式：
{"questions":[{"q":"問題文","a":"正解の選択肢","choices":["正解","不正解1","不正解2","不正解3"],"subject":"rika"}]}
 
注意：
- choicesは必ず4つ
- choicesの中にaが必ず含まれる
- 小学3年生がわかる言葉を使う
- 画像の内容から問題を作る`;
 
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64
              }
            },
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
    const raw = (data.content || [])
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('');
 
    // JSON抽出
    let jsonStr = raw;
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) jsonStr = match[0];
    jsonStr = jsonStr.replace(/```json|```/g, '').trim();
 
    const parsed = JSON.parse(jsonStr);
    const questions = (parsed.questions || []).filter(q =>
      q.q && q.a && Array.isArray(q.choices) &&
      q.choices.length === 4 &&
      q.choices.includes(q.a)
    );
 
    return res.status(200).json({ questions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
