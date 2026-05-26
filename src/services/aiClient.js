// src/services/aiClient.js

// ─── Через серверный эндпоинт /api/ai ───
// Основной провайдер: Groq. Фолбэк: Gemini.
export async function askViaServer(systemPrompt, userPrompt, maxTokens = 1024) {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system: systemPrompt, user: userPrompt, maxTokens })
  });
  if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);
  const data = await response.json();
  if (!data.text) throw new Error('Пустой ответ от AI');
  return data.text;
}

// ─── Прямой вызов Groq (для ChatView — история диалога) ───
export async function sendToGroq(messages, options = {}) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error('VITE_GROQ_API_KEY не настроен');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : m.role, content: m.content })),
      max_tokens: options.maxTokens || 2048,
      temperature: options.temperature ?? 0.1
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Groq API error ${response.status}: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Пустой ответ от Groq');
  return content.trim();
}

// ─── Прямой вызов Gemini (запасной, для ChatView) ───
export async function sendToGemini(messages, options = {}) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY не настроен');

  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const systemMsg = messages.find(m => m.role === 'system');
  const payload = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.1,
      maxOutputTokens: options.maxTokens || 2048,
    }
  };
  if (systemMsg) {
    payload.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error ${response.status}: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('Пустой ответ от Gemini');
  return content.trim();
}

export async function quickAsk(prompt, systemPrompt = '') {
  return askViaServer(systemPrompt, prompt);
}

export async function askClaude(profile, prompt) {
  return askViaServer('', prompt);
}
