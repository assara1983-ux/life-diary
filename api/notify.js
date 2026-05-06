// api/notify.js
// Vercel Cron Job — отправляет Web Push уведомления о дедлайнах
export const config = {
  maxDuration: 30,
};

// Безопасная отправка пуша с проверками
async function sendPush(subscription, payload) {
  try {
    // Проверяем, установлен ли web-push
    let webpush;
    try {
      webpush = await import('web-push');
    } catch (e) {
      console.log('web-push not available');
      return false;
    }
    
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@lifediary.app';
    
    // Если ключей нет — не отправляем, но и не падаем
    if (!publicKey || !privateKey) {
      console.log('VAPID keys not configured');
      return false;
    }
    
    webpush.setVapidDetails(subject, publicKey, privateKey);
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (e) {
    console.error('Push send error:', e.message);
    return false;
  }
}

export default async function handler(req, res) {
  // Проверка авторизации для крона (в dev режиме — пропускаем)
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    // Безопасный парсинг подписок
    let subscriptions = [];
    try {
      if (process.env.PUSH_SUBSCRIPTIONS) {
        const parsed = JSON.parse(process.env.PUSH_SUBSCRIPTIONS);
        if (Array.isArray(parsed)) {
          subscriptions = parsed;
        }
      }
    } catch (e) {
      console.log('Failed to parse PUSH_SUBSCRIPTIONS:', e.message);
    }

    if (!subscriptions.length) {
      return res.status(200).json({ ok: true, message: 'No subscriptions', sent: 0 });
    }

    // Формируем сообщения
    const today = new Date();
    const messages = [0, 1, 3].map(daysAhead => {
      const dt = new Date(today);
      dt.setDate(today.getDate() + daysAhead);
      const dStr = dt.toISOString().split('T')[0];
      const label = daysAhead === 0 ? 'СЕГОДНЯ' : daysAhead === 1 ? 'ЗАВТРА' : 'через 3 дня';
      const emoji = daysAhead === 0 ? '🚨' : daysAhead === 1 ? '⚠️' : '📅';
      
      return {
        dStr,
        daysAhead,
        title: `${emoji} Life Diary — Дедлайн ${label}`,
        body: `Проверь раздел Работа — есть отчёты или платежи со сроком ${label}`,
        tag: `deadline-${dStr}`,
        url: '/?section=work'
      };
    });

    // Отправка
    let sent = 0;
    for (const sub of subscriptions) {
      for (const msg of messages) {
        const ok = await sendPush(sub, msg);
        if (ok) sent++;
      }
    }

    return res.status(200).json({ ok: true, sent, subscriptions: subscriptions.length });
  } catch (e) {
    console.error('notify error:', e);
    return res.status(500).json({ error: e.message });
  }
}
