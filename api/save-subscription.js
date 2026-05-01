// api/save-subscription.js
// Сохраняет push subscription пользователя
// В продакшне нужна БД — здесь используем Vercel KV или простой файл

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { subscription, userId } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    // Сохраняем в Vercel KV если доступен, иначе логируем
    // В минимальной версии — просто подтверждаем получение
    // Для полноценной работы нужен Vercel KV: https://vercel.com/storage/kv
    console.log('Push subscription saved for user:', userId || 'anonymous');
    console.log('Endpoint:', subscription.endpoint.slice(0, 50) + '...');

    // Если есть Vercel KV — раскомментировать:
    // const { kv } = await import('@vercel/kv');
    // await kv.set('push_sub_' + (userId || subscription.endpoint.slice(-20)), JSON.stringify(subscription));

    return res.status(200).json({ ok: true, message: 'Subscription saved' });
  } catch (e) {
    console.error('save-subscription error:', e);
    return res.status(500).json({ error: e.message });
  }
}
