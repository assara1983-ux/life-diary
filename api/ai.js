// api/ai.js — Vercel Serverless Function
// Google Gemini API — gemini-1.5-flash
// Использует переменную окружения: VITE_GEMINI_API_KEY

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Получаем ключ Gemini (название совпадает с твоим на скриншоте)
  const apiKey = process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('VITE_GEMINI_API_KEY не найден');
    return res.status(200).json({ 
      text: 'AI временно недоступен. Настройка ключа в процессе.' 
    });
  }

  const { system, user, maxTokens = 2048 } = req.body;
  if (!user) return res.status(400).json({ error: 'Missing user message' });

  try {
    // Подготовка сообщения (включаем системный промпт в историю диалога)
    const contents = [];
    if (system) {
      contents.push({ role: 'user', parts: [{ text: `Инструкции: ${system}` }] });
      contents.push({ role: 'model', parts: [{ text: 'Понял задачу. Готов отвечать.' }] });
    }
    contents.push({ role: 'user', parts: [{ text: user }] });

    // Запрос к API Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      console.error('Gemini Error:', data);
      return res.status(200).json({ 
        text: `Ошибка AI: ${data.error?.message || 'Проблема с сервисом.'}` 
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return res.status(200).json({ text: text || '...' });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(200).json({ text: 'Ошибка соединения с AI сервисом.' });
  }
}
