// src/hooks/useAIChat.js
import { useState, useCallback, useRef } from 'react';
import { sendToGroq, askViaServer } from '../services/aiClient';

export function useAIChat(initialMessages = []) {
  const [messages, setMessages] = useState(Array.isArray(initialMessages) ? initialMessages : []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const sendMessage = useCallback(async (userContent, options = {}) => {
    if (!userContent?.trim() || isLoading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    const newMessages = [...messages, { role: 'user', content: userContent.trim() }];
    setMessages(newMessages);

    try {
      let aiResponse;

      // Пробуем Groq напрямую (если есть VITE_GROQ_API_KEY)
      const groqKey = import.meta.env.VITE_GROQ_API_KEY;
      if (groqKey) {
        try {
          aiResponse = await sendToGroq(newMessages, options);
        } catch (groqErr) {
          console.warn('[useAIChat] Groq failed, falling back to server:', groqErr.message);
          // Фолбэк: последнее сообщение пользователя через сервер
          aiResponse = await askViaServer('', userContent.trim());
        }
      } else {
        // Нет VITE_GROQ_API_KEY — сразу через сервер (там Groq + Gemini фолбэк)
        aiResponse = await askViaServer('', userContent.trim());
      }

      if (controller.signal.aborted) return;
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Не удалось получить ответ от ИИ');
      console.error('[useAIChat] Ошибка:', err);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, isLoading]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const loadMessages = useCallback((newMessages) => {
    setMessages(Array.isArray(newMessages) ? newMessages : []);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    loadMessages,
    setMessages: loadMessages
  };
}
