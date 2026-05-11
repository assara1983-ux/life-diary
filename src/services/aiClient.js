// src/services/aiClient.js
// ✅ ИСПРАВЛЕНО: gemini-1.5-flash → gemini-2.0-flash, v1beta → v1

const MODEL_NAME = 'gemini-2.0-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1/models';

// Через серверный эндпоинт /api/ai (безопасно — ключ не в браузере)
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

// Прямой запрос к Gemini (только для ChatView — там нужна история диалога)
export async function sendToGemini(messages, options = {}) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY не настроен');

  const url = `${API_BASE}/${MODEL_NAME}:generateContent?key=${apiKey}`;

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

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error ${response.status}: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('Пустой ответ от Gemini API');
  return content.trim();
}

export async function quickAsk(prompt, systemPrompt = '') {
  return askViaServer(systemPrompt, prompt);
}

export async function askClaude(profile, prompt) {
  return askViaServer('', prompt);
}
