// src/services/aiClient.js

// Используем модель gemini-1.5-flash (быстрая и бесплатная)
const MODEL_NAME = 'gemini-1.5-flash';
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Отправляет сообщения в Google Gemini API
 * @param {Array<{role: string, content: string}>} messages - История сообщений
 * @param {Object} options - Дополнительные параметры
 * @returns {Promise<string>} Текст ответа
 */
export async function sendToGemini(messages, options = {}) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY не настроен. Добавьте VITE_GEMINI_API_KEY в переменные окружения Vercel.');
  }

  // Формируем URL с ключом
  const url = `${API_BASE_URL}/${MODEL_NAME}:generateContent?key=${apiKey}`;

  // Преобразуем формат сообщений (OpenAI -> Gemini)
  // Gemini ожидает: role: "user" или "model"
  const contents = messages
    .filter(m => m.role !== 'system') // Системные промпты обрабатываются отдельно или игнорируются в простом режиме
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  // Если первое сообщение было системным, добавим его как instruction (опционально)
  const systemMsg = messages.find(m => m.role === 'system');
  
  const payload = {
    contents: contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens || 2048,
    }
  };

  // Если есть системный промпт, добавляем его
  if (systemMsg) {
    payload.systemInstruction = {
      parts: [{ text: systemMsg.content }]
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // Gemini часто возвращает ошибку в поле error.message
    throw new Error(
      `Gemini API error ${response.status}: ${errorData.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  
  // Извлекаем текст из ответа Gemini
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error('Пустой ответ от Gemini API');
  }

  return content.trim();
}

/**
 * Вспомогательная функция для быстрой отправки одного запроса
 */
export async function quickAsk(prompt, systemPrompt = '') {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });
  return sendToGemini(messages);
}
