// api/send-push.js
// Отправка Web Push уведомлений
// Использует переменные окружения из Vercel Dashboard

export default async function handler(req, res) {
  // Разрешаем кросс-доменные запросы (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // ⚠️ ВАЖНО: Имена переменных должны точно совпадать с теми, что в Vercel!
    const publicKey = process.env.VITE_VAPID_PUBLIC_KEY; 
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@lifediary.app';

    const { subscription, title, body, tag } = req.body;

    // Если нет ключей или данных — не падаем, а возвращаем мягкий ответ
    if (!publicKey || !privateKey) {
      return res.status(200).json({ ok: false, message: 'VAPID keys not configured' });
    }
    if (!subscription || !title || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Динамический импорт web-push для безопасности
    const webpush = await import('web-push').catch(() => null);
    if (!webpush) {
      return res.status(200).json({ ok: false, message: 'web-push module missing' });
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    // Отправка
    await webpush.sendNotification(subscription, JSON.stringify({ title, body, tag }));

    return res.status(200).json({ success: true, message: 'Push sent' });
  } catch (error) {
    console.error('Push error:', error);
    // Если подписка устарела (410)
    if (error.statusCode === 410) {
      return res.status(410).json({ error: 'Subscription expired' });
    }
    return res.status(500).json({ error: error.message });
  }
}
