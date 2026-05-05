// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Инициализация Telegram WebApp SDK
const tg = window.Telegram?.WebApp;

if (tg) {
  // Сообщаем Telegram, что приложение готово
  tg.ready();
  // Разворачиваем приложение на весь экран
  tg.expand();
  
  // Опционально: настраиваем цвет хедера под тему
  // Это убирает белую/черную полосу сверху в Telegram
  try {
    const isDark = tg.colorScheme === 'dark';
    tg.setHeaderColor(isDark ? '#1c1c1e' : '#ffffff');
    tg.setBackgroundColor(isDark ? '#1c1c1e' : '#ffffff');
  } catch (e) {
    console.warn('Не удалось установить цвет хедера:', e);
  }
}

// Находим корневой элемент
const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Критическая ошибка: Элемент #root не найден в DOM.');
} else {
  // Создаем корень React
  const root = ReactDOM.createRoot(rootElement);
  
  // Рендерим приложение
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
