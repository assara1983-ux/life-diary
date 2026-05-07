// api/notify.js
// Vercel Cron Job — запускается каждый день в 10:00 (UTC+5 = 05:00 UTC)
// Отправляет Web Push уведомления о дедлайнах

export const config = {
  maxDuration: 30,
};

// VAPID ключи — используются из Environment Variables
async function sendPush(subscription, payload) {
  try {
    const webpush = await import('web-push').catch(() => null);
    if (!webpush) {
      console.log('web-push not available');
      return false;
    }

    // ✅ Исправлено имя ключа на VITE_VAPID_PUBLIC_KEY
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@lifediary.app',
      process.env.VITE_VAPID_PUBLIC_KEY, 
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
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const today = new Date();
    const dates = [0, 1, 3].map(d => {
      const dt = new Date(today);
      dt.setDate(today.getDate() + d);
      return dt.toISOString().split('T')[0];
    });

    let subscriptions = [];
    try {
      if (process.env.PUSH_SUBSCRIPTIONS) {
        subscriptions = JSON.parse(process.env.PUSH_SUBSCRIPTIONS);
      }
    } catch (e) {
      console.log('No subscriptions found');
    }

    if (!subscriptions.length) {
      return res.status(200).json({ ok: true, message: 'No subscriptions', sent: 0 });
    }

    const messages = [];
    for (const daysAhead of [0, 1, 3]) {
      const dt = new Date(today);
      dt.setDate(today.getDate() + daysAhead);
      const dStr = dt.toISOString().split('T')[0];
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
