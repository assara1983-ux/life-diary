// api/notify.js
// Vercel Cron Job — запускается каждый день в 10:00 (UTC+5 = 05:00 UTC)
// Отправляет Web Push уведомления о дедлайнах

export const config = {
  maxDuration: 30,
};

// VAPID ключи — добавить в Vercel Environment Variables:
// VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:your@email.com)

async function sendPush(subscription, payload) {
  // Используем Web Push Protocol без внешних библиотек
  // В продакшне рекомендуется установить web-push: npm install web-push
  try {
    const webpush = await import('web-push').catch(() => null);
    if (!webpush) {
      console.log('web-push not available, skipping push for:', subscription.endpoint.slice(0, 40));
      return false;
    }
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@lifediary.app',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (e) {
    console.error('Push send error:', e.message);
    return false;
  }
}

export default async function handler(req, res) {
  // Проверяем что это запрос от Vercel Cron
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // В dev режиме разрешаем без авторизации
    if (process.env.NODE_ENV !== 'development') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Даты для проверки: сегодня, +1 день, +3 дня
    const dates = [0, 1, 3].map(d => {
      const dt = new Date(today);
      dt.setDate(today.getDate() + d);
      return dt.toISOString().split('T')[0];
    });

    // Получаем подписки из KV (если подключен) или из env
    // В минимальной версии читаем из переменной PUSH_SUBSCRIPTIONS (JSON массив)
    let subscriptions = [];
    try {
      if (process.env.PUSH_SUBSCRIPTIONS) {
        subscriptions = JSON.parse(process.env.PUSH_SUBSCRIPTIONS);
      }
      // Если есть Vercel KV:
      // const { kv } = await import('@vercel/kv');
      // const keys = await kv.keys('push_sub_*');
      // subscriptions = await Promise.all(keys.map(k => kv.get(k).then(v => JSON.parse(v))));
    } catch (e) {
      console.log('No subscriptions found');
    }

    if (!subscriptions.length) {
      return res.status(200).json({ ok: true, message: 'No subscriptions', sent: 0 });
    }

    // Формируем сообщения для каждой даты
    const messages = [];
    for (const daysAhead of [0, 1, 3]) {
      const dt = new Date(today);
      dt.setDate(today.getDate() + daysAhead);
      const dStr = dt.toISOString().split('T')[0];

      // Читаем данные из localStorage на клиенте — на сервере используем переданные данные
      // В реальной версии нужно хранить дедлайны в БД
      // Здесь генерируем напоминание на основе дней

      const label = daysAhead === 0 ? 'СЕГОДНЯ' : daysAhead === 1 ? 'ЗАВТРА' : 'через 3 дня';
      const emoji = daysAhead === 0 ? '🚨' : daysAhead === 1 ? '⚠️' : '📅';

      messages.push({
        dStr,
        daysAhead,
        title: `${emoji} Life Diary — Дедлайн ${label}`,
        body: `Проверь раздел Работа — есть отчёты или платежи со сроком ${label}`,
        tag: `deadline-${dStr}`,
        url: '/?section=work'
      });
    }

    // Отправляем уведомления
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
