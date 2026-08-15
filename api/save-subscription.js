// api/save-subscription.js
// Сохраняет push-подписку браузера + список дедлайнов пользователя в Redis,
// чтобы фоновый крон (api/notify.js) мог позже проверить их и прислать push,
// даже если приложение закрыто.

const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(command, args) {
  const res = await fetch(
    `${UPSTASH_URL}/${command}/${args.map(a => encodeURIComponent(a)).join('/')}`,
    { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } }
  );
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return res.status(200).json({ ok: false, message: 'Upstash не настроен' });
  }

  try {
    const body = req.body || {};
    const { subscription, clientId, deadlines } = body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }
    if (!clientId) {
      return res.status(400).json({ error: 'Missing clientId' });
    }

    // Читаем существующую запись, чтобы сохранить историю уже отправленных
    // напоминаний (чтобы не слать одно и то же уведомление повторно)
    let notified = [];
    try {
      const existing = await redis('get', [`push:${clientId}`]);
      if (existing.result) {
        const parsed = JSON.parse(existing.result);
        notified = parsed.notified || [];
      }
    } catch {}

    const record = {
      subscription,
      deadlines: Array.isArray(deadlines) ? deadlines : [],
      notified,
      updatedAt: new Date().toISOString(),
    };

    await redis('set', [`push:${clientId}`, JSON.stringify(record)]);
    // Держим запись максимум 60 дней без обновления
    await redis('expire', [`push:${clientId}`, '5184000']);

    return res.status(200).json({ ok: true, message: 'Subscription saved' });
  } catch (e) {
    console.error('❌ save-subscription error:', e.message);
    return res.status(200).json({ ok: false, message: 'Failed to save subscription' });
  }
}
