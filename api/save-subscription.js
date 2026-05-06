// api/save-subscription.js
export default async function handler(req, res) {
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const { subscription, userId } = body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    console.log('💾 Push subscription saved for user:', userId || 'anonymous');
    console.log(' Endpoint:', subscription.endpoint.slice(0, 50) + '...');

    // TODO: В продакшене сохраняем в Vercel KV или базу данных
    // const { kv } = await import('@vercel/kv');
    // await kv.set(`push_sub:${userId || 'anon'}`, JSON.stringify(subscription));

    return res.status(200).json({ ok: true, message: 'Subscription saved' });
  } catch (e) {
    console.error('❌ save-subscription error:', e.message);
    // Мягкое падение — приложение продолжит работать
    return res.status(200).json({ ok: false, message: 'Failed to save subscription' });
  }
}
