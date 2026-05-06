// api/ai.js — Vercel Serverless Function
// Groq API — llama-3.3-70b-versatile
// Температура 0.1 — минимальная фантазия, максимальная точность

export default async function handler(req, res) {
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Проверка ключа с мягким падением
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    console.warn('GROQ_API_KEY not configured');
    // Возвращаем заглушку, чтобы приложение не падало
    return res.status(200).json({ 
      text: 'AI-функции временно недоступны. Добавьте GROQ_API_KEY в переменные окружения Vercel.' 
    });
  }

  const { system, user, maxTokens = 1200 } = req.body;
  
  if (!user) {
    return res.status(400).json({ error: 'Missing "user" field in request body' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: user }
        ],
        max_tokens: maxTokens,
        temperature: 0.1
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Groq error:', data);
      // Не падаем критично — возвращаем понятное сообщение
      return res.status(200).json({ 
        text: `⚠️ AI-сервис временно недоступен: ${data.error?.message || 'Ошибка соединения'}` 
      });
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) return res.status(200).json({ text: 'Пустой ответ от AI-сервиса' });

    return res.status(200).json({ text });
  } catch (error) {
    console.error('Server error:', error);
    // Мягкое падение — приложение продолжит работать
    return res.status(200).json({ 
      text: '⚠️ Ошибка соединения с AI-сервисом. Попробуйте позже.' 
    });
  }
}
