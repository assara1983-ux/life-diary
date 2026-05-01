// api/check-deadline.js
// Проверяет срок сдачи отчёта на официальных сайтах КЗ
// Использует GROQ_API_KEY — тот же ключ что и в api/ai.js

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, group, period, currentDeadline } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY не настроен' });

  const sourceMap = {
    kgd:  { url: 'https://kgd.gov.kz/ru/services/taxpayer_calendar', label: 'КГД — Календарь налогоплательщика 2026' },
    pay:  { url: 'https://kgd.gov.kz/ru/services/taxpayer_calendar', label: 'КГД — Налоговый календарь 2026' },
    bns:  { url: 'https://stat.gov.kz/ru/respondents/statistical-forms/', label: 'БНС — Статформы 2026' },
    eaes: { url: 'https://kgd.gov.kz/ru/services/taxpayer_calendar', label: 'КГД — ЕАЭС' },
    pit:  { url: 'https://kgd.gov.kz/ru/services/taxpayer_calendar', label: 'КГД — Налоговый календарь' },
    liz:  { url: 'https://kgd.gov.kz/ru/services/taxpayer_calendar', label: 'КГД — Налоговый календарь' },
  };
  const src = sourceMap[group] || sourceMap.kgd;
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  const monthStr = String(month).padStart(2, '0');

  // Шаг 1: Скачиваем официальную страницу
  let pageText = '';
  try {
    const pageResp = await fetch(src.url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ru-RU,ru;q=0.9' },
      signal: AbortSignal.timeout(8000)
    });
    if (pageResp.ok) {
      const html = await pageResp.text();
      pageText = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ').trim().slice(0, 6000);
    }
  } catch(e) { console.log('Page fetch failed:', e.message); }

  const systemPrompt = `Ты — эксперт по налоговому законодательству Казахстана ${year} года.
Отвечай ТОЛЬКО валидным JSON без markdown и пояснений.
Формат: {"deadline":"${year}-MM-DD","info":"статья НК или приказ","source":"источник","sourceUrl":"url"}`;

  const userPrompt = pageText
    ? `Найди срок сдачи отчёта "${name}" (${period}) в ${year} году.
Текст с ${src.url}:
---
${pageText}
---
Если ежемесячный — срок за месяц ${monthStr}. Только JSON.`
    : `Найди точный срок сдачи "${name}" (${period}) в Казахстане ${year} году.
Источник: ${src.label} ${src.url}
Если ежемесячный — срок за месяц ${monthStr}. Только JSON.`;

  try {
    const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 300,
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(15000)
    });

    const groqData = await groqResp.json();
    const rawText = groqData.choices?.[0]?.message?.content || '';
    const cleaned = rawText.replace(/```json|```/g,'').trim();

    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch {
      const m = cleaned.match(/\{[\s\S]*?\}/);
      if(m) { try { parsed = JSON.parse(m[0]); } catch { return res.status(422).json({error:'Ошибка парсинга: '+cleaned.slice(0,100)}); } }
      else return res.status(422).json({error:'JSON не найден: '+cleaned.slice(0,100)});
    }

    if(!parsed.deadline || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.deadline))
      return res.status(422).json({error:'Некорректная дата: '+parsed.deadline});

    const dlYear = parseInt(parsed.deadline.split('-')[0]);
    if(dlYear < 2026 || dlYear > 2028)
      return res.status(422).json({error:'Год вне диапазона: '+parsed.deadline});

    return res.status(200).json({
      deadline: parsed.deadline,
      info: parsed.info||'',
      source: parsed.source||src.label,
      sourceUrl: parsed.sourceUrl||src.url,
      fetchedFromSite: !!pageText
    });

  } catch(e) {
    return res.status(500).json({error:'Ошибка: '+e.message});
  }
}
