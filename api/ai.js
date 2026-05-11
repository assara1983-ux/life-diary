// api/ai.js — Vercel Serverless Function
// Google Gemini API — gemini-1.5-flash
// ✅ ИСПРАВЛЕНО: используется GEMINI_API_KEY (без VITE_ префикса — он только для клиента)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ✅ ИСПРАВЛЕНО: на сервере нет VITE_ переменных, используем GEMINI_API_KEY
  // В Vercel добавить переменную: GEMINI_API_KEY = ваш ключ AIzaSy...
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('GEMINI_API_KEY не найден в переменных окружения Vercel');
    return res.status(200).json({ 
      text: 'AI временно недоступен. Проверьте GEMINI_API_KEY в настройках Vercel.' 
    });
  }

  const { system, user, maxTokens = 1024 } = req.body;
  if (!user) return res.status(400).json({ error: 'Missing user message' });

  try {
    // Подготовка сообщения с системным промптом
    const contents = [];
    if (system) {
      contents.push({ role: 'user', parts: [{ text: `Инструкции: ${system}` }] });
      contents.push({ role: 'model', parts: [{ text: 'Понял задачу. Отвечаю строго по базе знаний.' }] });
    }
    contents.push({ role: 'user', parts: [{ text: user }] });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.1  // ✅ Минимальная "фантазия" — только факты из базы знаний
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
