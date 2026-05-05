// src/services/aiClient.js

const API_URL = 'https://api.x.ai/v1/chat/completions';
const DEFAULT_MODEL = 'grok-beta';

/**
 * Отправляет сообщения в Grok API (xAI)
 * @param {Array<{role: string, content: string}>} messages - Массив сообщений в формате OpenAI
 * @param {Object} options - Дополнительные параметры
 * @returns {Promise<string>} Текст ответа от модели
 */
export async function sendToGrok(messages, options = {}) {
  const apiKey = import.meta.env.VITE_GROK_API_KEY;

  if (!apiKey) {
    throw new Error('GROK_API_KEY не настроен. Добавьте VITE_GROK_API_KEY в переменные окружения Vercel.');
  }

  const payload = {
    model: options.model || DEFAULT_MODEL,
    messages: messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens || 2048,
    stream: false
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Grok API error ${response.status}: ${errorData.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Пустой ответ от Grok API');
  }

  return content.trim();
}

/**
 * Вспомогательная функция для быстрой отправки одного запроса
 * @param {string} prompt - Текст запроса
 * @param {string} systemPrompt - Системный промпт (опционально)
 * @returns {Promise<string>}
 */
export async function quickAsk(prompt, systemPrompt = '') {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });
  return sendToGrok(messages);
}
