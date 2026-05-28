// api/sync.js
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return res.status(500).json({ error: 'Upstash не настроен' });
  }

  if (req.method === 'GET') {
    const { key } = req.query;
    if (!key || !key.startsWith('ld-')) {
      return res.status(400).json({ error: 'Неверный ключ' });
    }
    try {
      const result = await redis('get', [key]);
      if (!result.result) {
        return res.status(404).json({ error: 'Данные не найдены' });
      }
      const data = JSON.parse(result.result);
      return res.status(200).json({ ok: true, data });
    } catch (e) {
      return res.status(500).json({ error: 'Ошибка загрузки' });
    }
  }

  if (req.method === 'POST') {
    const { key, data } = req.body;
    if (!key || !key.startsWith('ld-')) {
      return res.status(400).json({ error: 'Неверный ключ' });
    }
    if (!data) {
      return res.status(400).json({ error: 'Нет данных' });
    }
    try {
      await redis('set', [key, JSON.stringify(data)]);
      await redis('expire', [key, '7776000']);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: 'Ошибка сохранения' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
