// api/ai.js — Vercel Serverless Function
// Google Gemini API — gemini-1.5-flash

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Проверка ключа Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(200).json({ 
      text: 'AI временно недоступен. Добавьте GEMINI_API_KEY в переменные окружения.' 
    });
  }

  const { system, user, maxTokens = 2048 } = req.body;
  
  if (!user) {
    return res.status(400).json({ error: 'Missing "user" field' });
  }

  try {
    // Формируем запрос к Gemini API
    const contents = [];
    if (system) {
      contents.push({ role: 'user', parts: [{ text: system }] });
      contents.push({ role: 'model', parts: [{ text: 'Понял инструкцию.' }] });
    }
    contents.push({ role: 'user', parts: [{ text: user }] });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: contents,
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.1
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini error:', data);
      return res.status(200).json({ 
        text: `⚠️ AI недоступен: ${data.error?.message || 'Ошибка соединения'}` 
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(200).json({ text: 'Пустой ответ от AI' });
    }

    return res.status(200).json({ text });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(200).json({ 
      text: '⚠️ Ошибка соединения с AI. Попробуйте позже.' 
    });
  }
}
