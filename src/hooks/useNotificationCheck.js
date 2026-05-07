// src/hooks/useNotificationCheck.js
import { useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { KGD_CATALOG, BNS_CATALOG } from '../data/reportsCatalog';

export function useNotificationCheck() {
  const { selectedReports } = useApp();

  useEffect(() => {
    // 1. Запрашиваем разрешение на уведомления
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // 2. Запускаем проверку дедлайнов
    checkDeadlines();
  }, [selectedReports]); // Перепроверяем при изменении списка отчетов

  const checkDeadlines = () => {
    if (Notification.permission !== 'granted') return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Собираем все отчеты из каталогов
    const allReports = [...KGD_CATALOG, ...BNS_CATALOG];
    
    // Фильтруем только выбранные пользователем
    const userReports = allReports.filter(r => selectedReports.includes(r.id));

    userReports.forEach(report => {
      // Проверяем все даты сдачи (deadlines2026)
      report.deadlines2026.forEach(deadlineStr => {
        const deadlineDate = new Date(deadlineStr);
        deadlineDate.setHours(0, 0, 0, 0);

        // Разница в днях
        const diffTime = deadlineDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Логика: Напомнить за 5, 3, 1 день и в сам день (0)
        const alertDays = [5, 3, 1, 0];

        if (alertDays.includes(diffDays)) {
          // Формируем текст
          let timeText = "";
          if (diffDays === 0) timeText = "СЕГОДНЯ!";
          else if (diffDays === 1) timeText = "ЗАВТРА!";
          else timeText = `Через ${diffDays} дней`;

          // Отправляем уведомление
          new Notification(`📋 ${report.name}`, {
            body: `Срок сдачи: ${deadlineStr} (${timeText}). Не забудьте сдать!`,
            icon: '/icon.png',
            tag: `${report.id}-${deadlineStr}`, // Чтобы не дублировать
            requireInteraction: diffDays === 0 // На день сдачи не закрывать само
          });
        }
      });
    });
  };

  return null;
}
