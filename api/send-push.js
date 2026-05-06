// api/send-push.js — безопасная заглушка
// Возвращает мягкий ответ, чтобы приложение не падало

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { subscription, title, body, tag } = req.body;
    
    // Если нет данных — мягко отвечаем
    if (!subscription || !title || !body) {
      return res.status(200).json({ ok: false, message: 'Missing data, push skipped' });
    }

    // Проверяем ключи
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    
    if (!publicKey || !privateKey) {
      console.log('VAPID keys not configured — push notifications disabled');
      return res.status(200).json({ ok: false, message: 'Push not configured' });
    }

    // Если ключи есть — пробуем отправить (с защитой)
    try {
      const webpush = await import('web-push').catch(() => null);
      if (!webpush) {
        console.log('web-push package not available');
        return res.status(200).json({ ok: false, message: 'web-push not installed' });
      }
      
      webpush.setVapidDetails('mailto:admin@lifediary.app', publicKey, privateKey);
      await webpush.sendNotification(subscription, JSON.stringify({ title, body, tag }));
      
      return res.status(200).json({ ok: true, message: 'Push sent' });
    } catch (e) {
      console.error('Push send error:', e.message);
      // Не падаем критично
      return res.status(200).json({ ok: false, message: 'Push failed: ' + e.message });
    }
  } catch (e) {
    console.error('send-push handler error:', e);
    return res.status(200).json({ ok: false, message: 'Handler error' });
  }
}
