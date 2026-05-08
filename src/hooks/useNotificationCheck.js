// src/hooks/useNotificationCheck.js
import { useEffect } from 'react';
import { useApp } from '../store/AppContext';

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 минут
const REMINDER_DAYS = [5, 3, 1, 0];

export function useNotificationCheck() {
  const { selectedReports = [] } = useApp();

  const checkDeadlines = () => {
    if (!selectedReports || selectedReports.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    selectedReports.forEach(report => {
      try {
        // 🔹 Валидация даты
        if (!report.deadline) return;
        const deadlineDate = new Date(report.deadline);
        if (isNaN(deadlineDate.getTime())) {
          console.warn(`Invalid deadline for report ${report.id}: ${report.deadline}`);
          return;
        }
        deadlineDate.setHours(0, 0, 0, 0);

        const diffTime = deadlineDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // 🔹 Проверка на попадание в интервал напоминания
        if (!REMINDER_DAYS.includes(diffDays)) return;

        // 🔹 Проверка разрешения на уведомления
        if (Notification.permission !== 'granted') return;

        // 🔹 Формирование текста
        let bodyText = '';
        if (diffDays === 0) {
          bodyText = `⚠️ СЕГОДНЯ дедлайн: ${report.name}`;
        } else if (diffDays === 1) {
          bodyText = `⏰ ЗАВТРА: ${report.name}`;
        } else {
          bodyText = `📅 Через ${diffDays} дн.: ${report.name}`;
        }

        // 🔹 Отправка уведомления
        const tag = `deadline-${report.id}-${report.deadline}`;
        
        new Notification('Life Diary: Отчётность', {
          body: bodyText,
          icon: '/icon.png',
          tag,
          renotify: true,
          requireInteraction: diffDays === 0,
          vibrate: diffDays === 0 ? [200, 100, 200] : [100],
          data: {
            url: '/work',
            reportId: report.id,
            deadline: report.deadline
          }
        });

        console.log(`Notification sent for ${report.name}: ${diffDays} days left`);

      } catch (err) {
        console.error(`Error checking deadline for report ${report?.id}:`, err);
      }
    });
  };

  useEffect(() => {
    // 🔹 Запрос разрешения при первом запуске
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
        if (permission === 'granted') {
          checkDeadlines();
        }
      }).catch(err => {
        console.error('Failed to request notification permission:', err);
      });
    } else if (Notification.permission === 'granted') {
      checkDeadlines();
    }

    // 🔹 Периодическая проверка (каждые 30 минут)
    const intervalId = setInterval(() => {
      if (Notification.permission === 'granted') {
        checkDeadlines();
      }
    }, CHECK_INTERVAL_MS);

    // 🔹 Очистка интервала при размонтировании
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [selectedReports]);
}
