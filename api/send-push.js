// api/send-push.js
import webpush from 'web-push';

// Настройка VAPID ключей из переменных окружения
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  // Разрешаем только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
    }

  try {
    const { subscription, title, body, tag } = req.body;

    if (!subscription || !title || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const payload = JSON.stringify({ title, body, tag });

    // Отправка пуш-уведомления
    await webpush.sendNotification(subscription, payload);

    return res.status(200).json({ success: true, message: 'Push sent' });
  } catch (error) {
    console.error('Push error:', error);
    // Если подписка устарела (410 Gone), клиент должен её удалить
    if (error.statusCode === 410) {
      return res.status(410).json({ error: 'Subscription expired' });
    }
    return res.status(500).json({ error: error.message });
  }
}
