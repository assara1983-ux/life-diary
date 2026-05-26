// api/ai.js — Vercel Serverless Function
// Основной провайдер: Groq (llama-3.3-70b) — 14400 req/день бесплатно
// Фолбэк: Gemini 2.0 Flash

async function askGroq(system, user, maxTokens, apiKey) {
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: user });

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: maxTokens,
      temperature: 0.1
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Groq error ${response.status}`);
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Пустой ответ от Groq');
  return text.trim();
}

async function askGemini(system, user, maxTokens, apiKey) {
  const contents = [];
  if (system) {
    contents.push({ role: 'user', parts: [{ text: `Инструкции: ${system}` }] });
    contents.push({ role: 'model', parts: [{ text: 'Понял. Отвечаю строго по базе знаний.' }] });
  }
  contents.push({ role: 'user', parts: [{ text: user }] });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.1 }
      })
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `Gemini error ${response.status}`);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Пустой ответ от Gemini');
  return text.trim();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { system, user, maxTokens = 1024 } = req.body;
  if (!user) return res.status(400).json({ error: 'Missing user message' });

  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  // Нет ни одного ключа
  if (!groqKey && !geminiKey) {
    return res.status(200).json({
      text: 'AI недоступен. Добавьте GROQ_API_KEY в настройках Vercel.'
    });
  }

  // Пробуем Groq первым
  if (groqKey) {
    try {
      const text = await askGroq(system, user, maxTokens, groqKey);
      return res.status(200).json({ text, provider: 'groq' });
    } catch (err) {
      console.warn('Groq failed, falling back to Gemini:', err.message);
      // Если Groq упал и Gemini нет — вернуть ошибку
      if (!geminiKey) {
        return res.status(200).json({ text: `Ошибка AI: ${err.message}` });
      }
    }
  }

  // Фолбэк на Gemini
  try {
    const text = await askGemini(system, user, maxTokens, geminiKey);
    return res.status(200).json({ text, provider: 'gemini' });
  } catch (err) {
    console.error('Gemini fallback also failed:', err.message);
    return res.status(200).json({ text: `Ошибка AI: ${err.message}` });
  }
}
