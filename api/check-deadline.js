// api/check-deadline.js
// Проверяет срок сдачи отчёта.
// Сначала ищет в встроенном справочнике (верифицированные данные из официальных приказов).
// Если не найдено — запрашивает Groq с предупреждением о необходимости ручной проверки.

// ── Справочник сроков — верифицировано по официальным приказам ──────────────
// Источники:
// КГД: НК РК ст.209, 424, 584, 697, 730
// БНС: Приказ БНС №209 от 12.12.2024, Приказ №16 от 04.02.2020 (ред. 11.06.2025)
// cabinet.salyk.kz, stat.gov.kz, mybuh.kz, uchet.kz

const DEADLINE_REFERENCE = {
  // ── КГД: ФНО ────────────────────────────────────────────────────────────────
  "910": { monthly: null, semi: "17 февраля / 17 августа", deadline_day: null,
           semi_1: "17-08", semi_2: "17-02", note: "ст.688 НК РК", source: "kgd.gov.kz" },
  "200": { monthly: null, quarter: true, deadline_day: "15",
           q1:"15-05", q2:"17-08", q3:"16-11", annual:"31-03",
           note: "ст.424 НК РК", source: "kgd.gov.kz" },
  "300": { quarter: true, q1:"15-05", q2:"17-08", q3:"16-11",
           note: "ст.424 НК РК (НДС)", source: "kgd.gov.kz" },
  "100": { annual: true, deadline: "31 марта", deadline_day: "31-03",
           note: "ст.315 НК РК (КПН)", source: "kgd.gov.kz" },
  "101.01": { monthly: true, deadline_day: "25",
              note: "ст.305 НК РК (авансы КПН)", source: "kgd.gov.kz" },
  "101.02": { annual: true, deadline_day: "31-03",
              note: "ст.305 НК РК", source: "kgd.gov.kz" },
  "101.04": { quarter: true, deadline_day: "15",
              note: "ст.648 НК РК (нерезиденты)", source: "kgd.gov.kz" },
  "220": { annual: true, deadline_day: "31-03",
           note: "ст.209 НК РК (ИПН ИП на ОУР)", source: "kgd.gov.kz" },
  "240": { annual: true, deadline_day: "31-03",
           note: "ст.209 НК РК (ИПН прочие доходы)", source: "kgd.gov.kz" },
  "700": { annual: true, deadline_day: "31-03",
           note: "ст.521, 584, 697 НК РК (имущество+земля+транспорт)", source: "kgd.gov.kz" },
  "701.01": { quarter: true, deadline_day: "25",
              note: "ст.512 НК РК (текущие платежи земельный)", source: "kgd.gov.kz" },
  "851": { quarter: true, deadline_day: "25",
           note: "ст.496 НК РК (текущие платежи транспорт)", source: "kgd.gov.kz" },
  "328": { monthly: true, deadline_day: "20",
           note: "ст.276-20 НК РК (НДС при импорте ЕАЭС)", source: "kgd.gov.kz" },
  "400": { quarter: true, deadline_day: "15",
           note: "ст.434 НК РК (зачёт НДС экспорт)", source: "kgd.gov.kz" },
  "590": { annual: true, deadline_day: "31-03",
           note: "ст.666 НК РК (роялти нерезиденты)", source: "kgd.gov.kz" },
  "870": { annual: true, deadline_day: "31-05",
           note: "ст.230 НК РК (трансфертное ценообразование)", source: "kgd.gov.kz" },
  "912": { quarter: true, q1:"15-05", q2:"17-08", q3:"16-11",
           note: "ст.696-3 НК РК (розничный налог)", source: "kgd.gov.kz" },
  // Платежи
  "опв": { monthly: true, deadline_day: "25",
           note: "ОПВ+ИПН+ОСМС+СО — ст.24 Закона об ОПВ", source: "kgd.gov.kz" },
  "ндс уплата": { quarter: true, deadline_day: "25",
                  note: "ст.424 НК РК", source: "kgd.gov.kz" },

  // ── БНС: статформы ──────────────────────────────────────────────────────────
  // Источник: Приказ БНС №209 от 12.12.2024
  "1-инвест": { monthly: true, deadline_day: "2",
                note: "Приказ БНС №16 от 04.02.2020 (ред. 11.06.2025)", source: "stat.gov.kz",
                sourceUrl: "https://adilet.zan.kz/rus/docs/V2000019994" },
  "1-ks": { monthly: true, deadline_day: "10",
            note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "1-кс": { monthly: true, deadline_day: "10",
            note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "2-кс": { monthly: true, deadline_day: "10",
            note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "1-п": { monthly: true, deadline_day: "15",
           note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "1-цп": { monthly: true, deadline_day: "15",
            note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "1-цсм": { monthly: true, deadline_day: "15",
             note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "2-торговля": { monthly: true, deadline_day: "15",
                  note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "1-транспорт": { monthly: true, deadline_day: "15",
                   note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "1-тс": { monthly: true, deadline_day: "20",
            note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "1-т": { quarter: true, deadline_day: "12",
           note: "Приказ БНС №209 от 12.12.2024 (изменён с 10 на 12)", source: "stat.gov.kz" },
  "1-пф": { quarter: true, deadline_day: "25",
            note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "2-мп": { quarter: true, deadline_day: "20",
            note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "кс-002": { quarter: true, deadline_day: "10",
              note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "кп-001": { quarter: true, deadline_day: "10",
              note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "7-тпз": { annual: true, deadline_day: "25-01",
             note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "4-ос": { annual: true, deadline_day: "15-02",
            note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "11": { annual: true, deadline_day: "15-02",
          note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "2-кс год": { annual: true, deadline_day: "15-02",
                note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "1-пф год": { annual: true, deadline_day: "15-04",
                note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "2-мп год": { annual: true, deadline_day: "10-04",
                note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "1-п год": { annual: true, deadline_day: "15-04",
               note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "бм": { annual: true, deadline_day: "10-04",
          note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "3-информ": { annual: true, deadline_day: "15-04",
                note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "э-коммерция": { annual: true, deadline_day: "15-04",
                   note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "1-наука": { annual: true, deadline_day: "15-04",
               note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "1-кпэ": { annual: true, deadline_day: "30-03",
             note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "1-лизинг": { annual: true, deadline_day: "31-03",
                note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
  "1-т год": { annual: true, deadline_day: "15-02",
               note: "Приказ БНС №209 от 12.12.2024", source: "stat.gov.kz" },
};

// Функция вычисления ближайшего дедлайна
function calcDeadline(ref, period, year, month) {
  const pad = n => String(n).padStart(2,'0');

  if (ref.monthly && ref.deadline_day) {
    const day = parseInt(ref.deadline_day);
    // Срок за ТЕКУЩИЙ месяц = до N-го числа СЛЕДУЮЩЕГО месяца
    let dlMonth = month + 1;
    let dlYear = year;
    if (dlMonth > 12) { dlMonth = 1; dlYear++; }
    return `${dlYear}-${pad(dlMonth)}-${pad(day)}`;
  }

  if (ref.semi_1 || ref.semi) {
    // Полугодовые: 1 п/г → 17 августа, 2 п/г → 17 февраля следующего года
    if (month <= 6) return `${year}-${ref.semi_1 || '08-17'}`;
    else return `${year+1}-${ref.semi_2 || '02-17'}`;
  }

  if (ref.quarter && ref.deadline_day) {
    const day = parseInt(ref.deadline_day);
    // Ближайший квартальный срок
    if (month <= 4) return `${year}-05-${pad(day < 15 ? 15 : day)}`;
    if (month <= 7) return `${year}-08-17`;
    if (month <= 10) return `${year}-11-${pad(day < 15 ? 16 : day)}`;
    return `${year+1}-03-31`;
  }

  // Квартальные с точными датами
  if (ref.q1 || ref.q2) {
    if (month <= 4) return `${year}-${ref.q1 || '05-15'}`;
    if (month <= 7) return `${year}-${ref.q2 || '08-17'}`;
    if (month <= 10) return `${year}-${ref.q3 || '11-16'}`;
    return `${year+1}-${ref.q1 || '05-15'}`;
  }

  if (ref.annual && ref.deadline_day) {
    // deadline_day может быть "31-03" или просто "31"
    const parts = ref.deadline_day.split('-');
    if (parts.length === 2) {
      return `${year+1}-${parts[1]}-${parts[0]}`;
    }
    return `${year+1}-03-${pad(parseInt(ref.deadline_day))}`;
  }

  return null;
}

// Поиск в справочнике по названию формы
function lookupReference(name) {
  const nameLower = name.toLowerCase();
  for (const [key, ref] of Object.entries(DEADLINE_REFERENCE)) {
    if (nameLower.includes(key.toLowerCase())) {
      return { key, ref };
    }
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, group, period, currentDeadline } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  const sourceUrlMap = {
    kgd: 'https://kgd.gov.kz/ru/services/taxpayer_calendar',
    pay: 'https://kgd.gov.kz/ru/services/taxpayer_calendar',
    bns: 'https://stat.gov.kz/ru/respondents/statistical-forms/',
    eaes: 'https://kgd.gov.kz/ru/services/taxpayer_calendar',
  };

  // ── Шаг 1: Поиск в справочнике ───────────────────────────────────────────
  const found = lookupReference(name);
  if (found) {
    const { key, ref } = found;
    const deadline = calcDeadline(ref, period, year, month);
    if (deadline) {
      return res.status(200).json({
        deadline,
        info: ref.note || '',
        source: `${ref.source} (справочник — ${key})`,
        sourceUrl: ref.sourceUrl || sourceUrlMap[group] || 'https://stat.gov.kz',
        fromReference: true
      });
    }
  }

  // ── Шаг 2: Groq как резерв для неизвестных форм ──────────────────────────
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY не настроен' });

  const monthStr = String(month).padStart(2,'0');
  const systemPrompt = `Ты — эксперт по законодательству Казахстана ${year} года.
Отвечай ТОЛЬКО валидным JSON без markdown.
Формат: {"deadline":"${year}-MM-DD","info":"статья НК или приказ","source":"источник","sourceUrl":"url"}
ВАЖНО: Если не уверен в точной дате — укажи в поле info "⚠ Требует ручной проверки на stat.gov.kz"`;

  const userPrompt = `Найди точный срок сдачи в Казахстане ${year} году:
ФОРМА: "${name}"
ПЕРИОДИЧНОСТЬ: ${period}
Если ежемесячная — срок за месяц ${monthStr}.
Только JSON.`;

  try {
    const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
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
      if(m) { try { parsed = JSON.parse(m[0]); } catch { return res.status(422).json({error:'Ошибка парсинга'}); } }
      else return res.status(422).json({error:'JSON не найден в ответе Groq'});
    }

    if(!parsed.deadline || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.deadline))
      return res.status(422).json({error:'Некорректная дата: '+parsed.deadline});

    const dlYear = parseInt(parsed.deadline.split('-')[0]);
    if(dlYear < 2026 || dlYear > 2028)
      return res.status(422).json({error:'Год вне диапазона: '+parsed.deadline});

    return res.status(200).json({
      deadline: parsed.deadline,
      info: (parsed.info||'') + ' ⚠ Рекомендуется проверить на stat.gov.kz / kgd.gov.kz',
      source: parsed.source || 'Groq AI (не из справочника)',
      sourceUrl: parsed.sourceUrl || sourceUrlMap[group] || 'https://stat.gov.kz',
      fromReference: false
    });

  } catch(e) {
    return res.status(500).json({error:'Ошибка: '+e.message});
  }
}
