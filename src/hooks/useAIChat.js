import { useState, useCallback, useRef } from 'react';
import { sendToGrok } from '../services/aiClient';

export function useAIChat(initialMessages = []) {
  const [messages, setMessages] = useState(Array.isArray(initialMessages) ? initialMessages : []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const sendMessage = useCallback(async (userContent, options = {}) => {
    if (!userContent?.trim() || isLoading) return;

    // Отменяем предыдущий запрос, если он ещё выполняется
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
      const aiResponse = await sendToGrok(newMessages, { ...options, signal: controller.signal });
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
