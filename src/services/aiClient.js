// src/services/aiClient.js

// ✅ ИСПРАВЛЕНО: AiBox теперь ходит через /api/ai (серверный эндпоинт)
// Прямой ключ VITE_GEMINI_API_KEY больше не торчит в браузере

const MODEL_NAME = 'gemini-1.5-flash';
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Отправляет запрос через серверный эндпоинт /api/ai
 * Используется из AiBox и других компонентов
 */
export async function askViaServer(systemPrompt, userPrompt, maxTokens = 1024) {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system: systemPrompt, user: userPrompt, maxTokens })
  });

  if (!response.ok) {
    throw new Error(`Ошибка сервера: ${response.status}`);
  }

  const data = await response.json();
  if (!data.text) throw new Error('Пустой ответ от AI');
  return data.text;
}

/**
 * Отправляет сообщения в Google Gemini API напрямую (только для useAIChat в чате)
 * Используется только в ChatView — там нужна история диалога
 */
export async function sendToGemini(messages, options = {}) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY не настроен. Добавьте VITE_GEMINI_API_KEY в переменные окружения Vercel.');
  }

  const url = `${API_BASE_URL}/${MODEL_NAME}:generateContent?key=${apiKey}`;

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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error ${response.status}: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) throw new Error('Пустой ответ от Gemini API');
  return content.trim();
}

/**
 * Быстрый запрос через сервер (замена quickAsk)
 * ✅ Безопасно: ключ не в браузере
 */
export async function quickAsk(prompt, systemPrompt = '') {
  return askViaServer(systemPrompt, prompt);
}

// Заглушка для совместимости
export async function askClaude(profile, prompt) {
  console.warn('askClaude: используй askViaServer или sendToGemini');
  return await askViaServer('', prompt);
}
