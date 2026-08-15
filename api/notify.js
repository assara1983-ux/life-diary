// api/notify.js
// Vercel Cron Job — запускается ежедневно (см. vercel.json).
// Читает все сохранённые push-подписки из Redis (api/save-subscription.js
// кладёт их туда) и для каждой проверяет реальные дедлайны пользователя,
// присылая Web Push с конкретным названием задачи/отчёта.

export const config = {
  maxDuration: 30,
};

const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Договорённость: напоминания за 3 дня, за 2 дня, в день дедлайна,
// и затем каждый день, пока задача не будет отмечена выполненной
// (просроченные пункты сами перестают приходить с сервера, когда
// клиент помечает задачу done и убирает её из списка дедлайнов).
function shouldNotify(daysAhead) {
  return daysAhead === 3 || daysAhead === 2 || daysAhead <= 0;
}

async function redis(command, args) {
  const res = await fetch(
    `${UPSTASH_URL}/${command}/${args.map(a => encodeURIComponent(a)).join('/')}`,
    { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } }
  );
  return res.json();
}

async function scanAllKeys(pattern) {
  let cursor = '0';
  const keys = [];
  do {
    const result = await redis('scan', [cursor, 'match', pattern, 'count', '200']);
    if (!result.result) break;
    cursor = result.result[0];
    keys.push(...(result.result[1] || []));
  } while (cursor !== '0');
  return keys;
}

async function sendPush(subscription, payload) {
  try {
    const webpush = await import('web-push').catch(() => null);
    if (!webpush) return { ok: false, reason: 'web-push module missing' };

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@lifediary.app',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message, statusCode: e.statusCode };
  }
}

function daysUntil(dateStr, today) {
  const d = new Date(dateStr + 'T00:00:00');
  const t = new Date(today + 'T00:00:00');
  return Math.round((d - t) / 86400000);
}

export default async function handler(req, res) {
  const authHeader = req.headers['authorization'];
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return res.status(200).json({ ok: false, message: 'Upstash не настроен' });
  }

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const keys = await scanAllKeys('push:*');

    let sent = 0;
    let checked = 0;

    for (const key of keys) {
      const result = await redis('get', [key]);
      if (!result.result) continue;

      let record;
      try { record = JSON.parse(result.result); } catch { continue; }

      const { subscription, deadlines = [] } = record;
      let notified = new Set(record.notified || []);
      let changed = false;

      for (const item of deadlines) {
        checked++;
        if (!item.date) continue;
        const daysAhead = daysUntil(item.date, todayStr);
        if (!shouldNotify(daysAhead)) continue;

        const notifyKey = `${item.id}:${daysAhead}`;
        if (notified.has(notifyKey)) continue;

        const label = daysAhead === 0 ? 'СЕГОДНЯ' : daysAhead > 0 ? `через ${daysAhead} дн.` : `просрочено на ${-daysAhead} дн.`;
        const emoji = daysAhead <= 0 ? '🚨' : '⚠️';

        const payload = {
          title: `${emoji} Life Diary — дедлайн ${label}`,
          body: item.title || 'Задача',
          tag: `deadline-${item.id}-${daysAhead}`,
          url: item.url || '/',
        };

        const result2 = await sendPush(subscription, payload);
        if (result2.ok) {
          sent++;
          notified.add(notifyKey);
          changed = true;
        } else if (result2.statusCode === 410) {
          // Подписка устарела — удаляем запись целиком
          await redis('del', [key]);
          changed = false;
          break;
        }
      }

      if (changed) {
        record.notified = Array.from(notified);
        await redis('set', [key, JSON.stringify(record)]);
        await redis('expire', [key, '5184000']);
      }
    }

    return res.status(200).json({ ok: true, clients: keys.length, checked, sent });
  } catch (e) {
    console.error('notify error:', e);
    return res.status(500).json({ error: e.message });
  }
}
