// api/ai.js — Vercel Serverless Function
// ✅ ИСПРАВЛЕНО: gemini-1.5-flash → gemini-2.0-flash, v1beta → v1

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(200).json({
      text: 'AI недоступен. Добавьте GEMINI_API_KEY в настройках Vercel.'
    });
  }

  const { system, user, maxTokens = 1024 } = req.body;
  if (!user) return res.status(400).json({ error: 'Missing user message' });

  try {
    const contents = [];
    if (system) {
      contents.push({ role: 'user', parts: [{ text: `Инструкции: ${system}` }] });
      contents.push({ role: 'model', parts: [{ text: 'Понял. Отвечаю строго по базе знаний.' }] });
    }
    contents.push({ role: 'user', parts: [{ text: user }] });

    // ✅ ИСПРАВЛЕНО: v1 вместо v1beta, gemini-2.0-flash (бесплатная, быстрая)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
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
    return res.status(200).json({ text: 'Ошибка соединения с AI.' });
  }
}
