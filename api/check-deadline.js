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
  // ═══════════════════════════════════════════════════════════════════
  // КГД — Налоговый кодекс РК, 2026
  // Источник: kgd.gov.kz, cabinet.salyk.kz
  // ═══════════════════════════════════════════════════════════════════

  // ФНО 910 — упрощённая декларация (полугодовая)
  // Сдача: до 15 числа 2-го месяца после отчётного периода
  // 1 п/г (янв-июн) → до 15 августа; 2 п/г (июл-дек) → до 15 февраля
  "910": { semi_1:"08-15", semi_2:"02-15",
           note:"ст.688 НК РК — до 15 числа 2-го месяца после отчётного периода",
           source:"kgd.gov.kz", sourceUrl:"https://kgd.gov.kz/ru/services/taxpayer_calendar" },

  // ФНО 200 — ИПН/СН у источника выплаты (квартальная)
  "200": { q1:"05-15", q2:"08-17", q3:"11-16",
           note:"ст.424 НК РК",
           source:"kgd.gov.kz", sourceUrl:"https://kgd.gov.kz/ru/services/taxpayer_calendar" },

  // ФНО 300 — НДС (квартальная, до 15-го 2-го месяца после квартала)
  "300": { q1:"05-15", q2:"08-17", q3:"11-16",
           note:"ст.424 НК РК (НДС)",
           source:"kgd.gov.kz", sourceUrl:"https://kgd.gov.kz/ru/services/taxpayer_calendar" },

  // ФНО 100 — КПН (годовая, до 31 марта)
  "100": { annual:true, deadline_day:"31-03",
           note:"ст.315 НК РК (КПН)",
           source:"kgd.gov.kz", sourceUrl:"https://kgd.gov.kz/ru/services/taxpayer_calendar" },

  // ФНО 101.01 — авансы КПН (ежемесячно, до 25-го)
  "101.01": { monthly:true, deadline_day:"25",
              note:"ст.305 НК РК (авансы КПН)",
              source:"kgd.gov.kz", sourceUrl:"https://kgd.gov.kz/ru/services/taxpayer_calendar" },

  // ФНО 101.02 — окончательный расчёт авансов КПН (до 20 апреля)
  "101.02": { annual:true, deadline_day:"20-04",
              note:"НК РК 2026 — до 20 апреля отчётного года",
              source:"kgd.gov.kz", sourceUrl:"https://mybuh.kz/useful/fno-i-sroki-sdachi-nalogovykh-otchetov-v-2026-godu.html" },

  // ФНО 101.04 — КПН с нерезидентов (годовая, до 15 числа 2-го месяца года)
  "101.04": { annual:true, deadline_day:"15-02",
              note:"НК РК 2026 — до 15 числа второго месяца, следующего за отчётным годом",
              source:"kgd.gov.kz", sourceUrl:"https://mybuh.kz/useful/fno-i-sroki-sdachi-nalogovykh-otchetov-v-2026-godu.html" },

  // ФНО 220 — ИПН для ИП на ОУР (годовая)
  "220": { annual:true, deadline_day:"31-03",
           note:"ст.209 НК РК",
           source:"kgd.gov.kz", sourceUrl:"https://kgd.gov.kz/ru/services/taxpayer_calendar" },

  // ФНО 240 — ИПН прочие доходы (годовая)
  "240": { annual:true, deadline_day:"31-03",
           note:"ст.209 НК РК",
           source:"kgd.gov.kz", sourceUrl:"https://kgd.gov.kz/ru/services/taxpayer_calendar" },

  // ФНО 700 — имущество+земля+транспорт (годовая)
  "700": { annual:true, deadline_day:"31-03",
           note:"ст.521,584,697 НК РК",
           source:"kgd.gov.kz", sourceUrl:"https://kgd.gov.kz/ru/services/taxpayer_calendar" },

  // ФНО 701.01 — текущие платежи земельный (квартально, до 25-го)
  "701.01": { q1:"04-25", q2:"07-25", q3:"10-25",
              note:"ст.512 НК РК",
              source:"kgd.gov.kz", sourceUrl:"https://kgd.gov.kz/ru/services/taxpayer_calendar" },

  // ФНО 851 — текущие платежи транспорт (квартально, до 25-го)
  "851": { q1:"04-25", q2:"07-25", q3:"10-25",
           note:"ст.496 НК РК",
           source:"kgd.gov.kz", sourceUrl:"https://kgd.gov.kz/ru/services/taxpayer_calendar" },

  // ФНО 328 — НДС при импорте ЕАЭС (квартальная, до 20 числа следующего месяца)
  "328": { q1:"05-20", q2:"08-20", q3:"11-20",
           note:"НК РК 2026 — до 20 числа месяца, следующего за отчётным кварталом",
           source:"kgd.gov.kz", sourceUrl:"https://mybuh.kz/useful/fno-i-sroki-sdachi-nalogovykh-otchetov-v-2026-godu.html" },

  // ФНО 400 — зачёт НДС при экспорте (квартальная)
  "400": { q1:"05-15", q2:"08-17", q3:"11-16",
           note:"ст.434 НК РК",
           source:"kgd.gov.kz", sourceUrl:"https://kgd.gov.kz/ru/services/taxpayer_calendar" },

  // ФНО 590 — роялти нерезиденты (годовая)
  "590": { annual:true, deadline_day:"31-03",
           note:"ст.666 НК РК",
           source:"kgd.gov.kz", sourceUrl:"https://kgd.gov.kz/ru/services/taxpayer_calendar" },

  // ФНО 870 — трансфертное ценообразование (годовая, до 31 мая)
  "870": { annual:true, deadline_day:"31-05",
           note:"ст.230 НК РК",
           source:"kgd.gov.kz", sourceUrl:"https://kgd.gov.kz/ru/services/taxpayer_calendar" },

  // ФНО 912 — розничный налог (квартальная)
  "912": { q1:"05-15", q2:"08-17", q3:"11-16",
           note:"ст.696-3 НК РК",
           source:"kgd.gov.kz", sourceUrl:"https://kgd.gov.kz/ru/services/taxpayer_calendar" },

  // Уплата ОПВ+ИПН+ОСМС+СО (ежемесячно, до 25-го)
  // Платежи — ключи соответствуют реальным названиям в приложении
  "опв": { monthly:true, deadline_day:"25",
           note:"Закон об ОПВ, ст.24 — до 25-го числа следующего месяца",
           source:"kgd.gov.kz", sourceUrl:"https://kgd.gov.kz/ru/services/taxpayer_calendar" },
  "уплата опв": { monthly:true, deadline_day:"25",
                  note:"ОПВ+ИПН+ОСМС+СО — до 25-го числа следующего месяца",
                  source:"kgd.gov.kz", sourceUrl:"https://kgd.gov.kz/ru/services/taxpayer_calendar" },
  "осмс": { monthly:true, deadline_day:"25",
             note:"ОСМС — до 25-го числа следующего месяца",
             source:"kgd.gov.kz" },
  "уплата ндс": { q1:"05-25", q2:"08-25", q3:"11-25",
                  note:"НДС — до 25-го числа 2-го месяца после квартала",
                  source:"kgd.gov.kz" },
  "аванс по кпн": { monthly:true, deadline_day:"25",
                    note:"Авансы КПН — до 25-го числа следующего месяца",
                    source:"kgd.gov.kz" },
  "аванс кпн": { monthly:true, deadline_day:"25",
                 note:"Авансы КПН — до 25-го числа",
                 source:"kgd.gov.kz" },

  // ═══════════════════════════════════════════════════════════════════
  // БНС — Приказ №209 от 12.12.2024 (ред. №191 от 29.08.2025, с 01.01.2026)
  // Источник: zakon.mybuh.kz/rus/docs/g24nza00209 (полный текст приказа)
  // ═══════════════════════════════════════════════════════════════════

  // ── Статистика промышленного производства ────────────────────────
  // 1-П месячная — до 1 числа (строка 19 таблицы Приказа №209)
  "1-п": { monthly:true, deadline_day:"1",
            note:"Приказ БНС №209 (ред. №191 от 29.08.2025), строка 19 — до 1 числа включительно",
            source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 1-П квартальная — до 25 числа (строка 20)
  "1-п кварт": { quarter:true, deadline_day:"25",
                 note:"Приказ БНС №209, строка 20 — до 25 числа включительно",
                 source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 1-П годовая (2026) — до 14 марта (строка 23, вместо старой 1-П + БМ)
  "1-п год": { annual:true, deadline_day:"14-03",
               note:"Приказ БНС №209, строка 23 — до 14 марта включительно (с 2026г. включает данные БМ)",
               source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // БМ — с 2026 года исключена, вошла в 1-П годовая (строка 22 — только для 2025г.)
  "бм": { annual:true, deadline_day:"14-03",
           note:"С 2026г. форма БМ исключена и включена в 1-П годовая (до 14 марта). В 2025г. — до 25 марта.",
           source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 01-ИП (пром) годовая — до 20 февраля (строка 24, введена с 2026г.)
  "01-ип": { annual:true, deadline_day:"20-02",
              note:"Приказ БНС №209, строка 24 — до 20 февраля включительно (введена с 2026г.)",
              source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 1-отходы годовая — до 1 февраля (строка 25)
  "1-отходы": { annual:true, deadline_day:"01-02",
                note:"Приказ БНС №209, строка 25 — до 1 февраля включительно",
                source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 2-отходы годовая — до 1 февраля (строка 26)
  "2-отходы": { annual:true, deadline_day:"01-02",
                note:"Приказ БНС №209, строка 26 — до 1 февраля включительно",
                source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 2-ТП (воздух) годовая — до 10 апреля (строка 27)
  "2-тп": { annual:true, deadline_day:"10-04",
             note:"Приказ БНС №209, строка 27 — до 10 апреля включительно",
             source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 4-ОС годовая — до 15 апреля (строка 28) — ИСПРАВЛЕНО (было 15-02!)
  "4-ос": { annual:true, deadline_day:"15-04",
             note:"Приказ БНС №209, строка 28 — до 15 апреля включительно",
             source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // ── Статистика энергетики ─────────────────────────────────────────
  // 1-КПЭ годовая — до 25 марта (строка 35) — ИСПРАВЛЕНО (было 30-03!)
  "1-кпэ": { annual:true, deadline_day:"25-03",
              note:"Приказ БНС №209, строка 35 — до 25 марта включительно",
              source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 6-ТП годовая — до 18 марта (строка 33)
  "6-тп": { annual:true, deadline_day:"18-03",
             note:"Приказ БНС №209, строка 33 — до 18 марта включительно",
             source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 1-ЭЛЕКТРОЭНЕРГИЯ годовая — до 18 марта (строка 34)
  "1-электроэнергия": { annual:true, deadline_day:"18-03",
                         note:"Приказ БНС №209, строка 34 — до 18 марта включительно",
                         source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 1-НЕФТЬ годовая — до 26 февраля (строка 31)
  "1-нефть": { annual:true, deadline_day:"26-02",
                note:"Приказ БНС №209, строка 31 — до 26 февраля включительно",
                source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 1-УГОЛЬ годовая — до 26 февраля (строка 32)
  "1-уголь": { annual:true, deadline_day:"26-02",
                note:"Приказ БНС №209, строка 32 — до 26 февраля включительно",
                source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // ── Статистика инвестиций и строительства ─────────────────────────
  // 1-инвест месячная — до 2 числа (строка 36)
  "1-инвест": { monthly:true, deadline_day:"2",
                note:"Приказ БНС №209, строка 36 — до 2 числа включительно",
                source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 1-инвест годовая — до 15 апреля (строка 37)
  "1-инвест год": { annual:true, deadline_day:"15-04",
                    note:"Приказ БНС №209, строка 37 — до 15 апреля включительно",
                    source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 1-ИС месячная — до 2 числа (строка 38)
  "1-ис": { monthly:true, deadline_day:"2",
             note:"Приказ БНС №209, строка 38 — до 2 числа включительно",
             source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 2-КС месячная — до 2 числа (строка 40) — ИСПРАВЛЕНО (было 4!)
  "2-кс": { monthly:true, deadline_day:"2",
             note:"Приказ БНС №209, строка 40 — до 2 числа включительно",
             source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 2-КС годовая — до 1 марта (строка 41) — ИСПРАВЛЕНО (было 15-02!)
  "2-кс год": { annual:true, deadline_day:"01-03",
                note:"Приказ БНС №209, строка 41 — до 1 марта включительно",
                source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 1-КС месячная (>100 чел) — до 4 числа (строка 42) ✓
  "1-кс": { monthly:true, deadline_day:"4",
             note:"Приказ БНС №209, строка 42 — до 4 числа включительно (орг. >100 чел.)",
             source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 1-КС малые квартальная — до 4 числа (строка 43) — ИСПРАВЛЕНО (было 10!)
  "1-кс (малые)": { quarter:true, deadline_day:"4",
                    note:"Приказ БНС №209, строка 43 — до 4 числа включительно (орг. до 100 чел.)",
                    source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 1-КС годовая — до 31 марта (строка 44)
  "1-кс год": { annual:true, deadline_day:"31-03",
                note:"Приказ БНС №209, строка 44 — до 31 марта включительно",
                source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // ── Прочие формы БНС ─────────────────────────────────────────────
  // 1-ЦП месячная — до 15 числа
  "1-цп": { monthly:true, deadline_day:"15",
             note:"Приказ БНС №209 — до 15 числа включительно",
             source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 1-ЦСМ месячная — до 15 числа
  "1-цсм": { monthly:true, deadline_day:"15",
              note:"Приказ БНС №209 — до 15 числа включительно",
              source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 2-торговля месячная — до 15 числа
  "2-торговля": { monthly:true, deadline_day:"15",
                  note:"Приказ БНС №209 — до 15 числа включительно",
                  source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 1-транспорт месячная — до 15 числа
  "1-транспорт": { monthly:true, deadline_day:"15",
                   note:"Приказ БНС №209 — до 15 числа включительно",
                   source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 1-ТС месячная — до 20 числа (ЕАЭС взаимная торговля)
  "1-тс": { monthly:true, deadline_day:"20",
             note:"Приказ БНС №209 — до 20 числа включительно",
             source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 1-Т квартальная — до 12 числа (изменён с 10 на 12 с 2026г.)
  "1-т": { quarter:true, deadline_day:"12",
            note:"Приказ БНС №209 (ред. №191) — с 2026г. срок изменён с 10 на 12 числа",
            source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 1-Т годовая — до 15 февраля
  "1-т год": { annual:true, deadline_day:"15-02",
               note:"Приказ БНС №209 — до 15 февраля включительно",
               source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 1-ПФ квартальная — до 25 числа
  "1-пф": { quarter:true, deadline_day:"25",
             note:"Приказ БНС №209 — до 25 числа включительно",
             source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 1-ПФ годовая — до 15 апреля
  "1-пф год": { annual:true, deadline_day:"15-04",
                note:"Приказ БНС №209 — до 15 апреля включительно",
                source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 2-МП квартальная — до 20 числа
  "2-мп": { quarter:true, deadline_day:"20",
             note:"Приказ БНС №209 — до 20 числа включительно",
             source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 2-МП годовая — до 10 апреля
  "2-мп год": { annual:true, deadline_day:"10-04",
                note:"Приказ БНС №209 — до 10 апреля включительно",
                source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 7-ТПЗ годовая — до 25 января
  "7-тпз": { annual:true, deadline_day:"25-01",
              note:"Приказ БНС №209 — до 25 января включительно",
              source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // КС-002 квартальная — до 10 числа (конъюнктурное обследование строит.)
  "кс-002": { quarter:true, deadline_day:"10",
              note:"Приказ БНС №209 — до 10 числа включительно",
              source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // КП-001 квартальная — до 10 числа (конъюнктурное обследование пром.)
  "кп-001": { quarter:true, deadline_day:"10",
              note:"Приказ БНС №209 — до 10 числа включительно",
              source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 1-наука годовая — до 15 апреля
  "1-наука": { annual:true, deadline_day:"15-04",
               note:"Приказ БНС №209 — до 15 апреля включительно",
               source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 1-лизинг годовая — до 31 марта
  "1-лизинг": { annual:true, deadline_day:"31-03",
                note:"Приказ БНС №209 — до 31 марта включительно",
                source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // 3-информ годовая — до 15 апреля (изменён срок с 2026г.)
  "3-информ": { annual:true, deadline_day:"15-04",
                note:"Приказ БНС №209 (ред. №191) — срок изменён с 2026г., до 15 апреля",
                source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },

  // Э-коммерция годовая — до 15 апреля
  "э-коммерция": { annual:true, deadline_day:"15-04",
                   note:"Приказ БНС №209 — до 15 апреля включительно",
                   source:"stat.gov.kz", sourceUrl:"https://zakon.mybuh.kz/rus/docs/g24nza00209/" },
};

// Функция вычисления ближайшего дедлайна
function calcDeadline(ref, period, year, month, currentDay) {
  const pad = n => String(n).padStart(2,"0");
  const todayDay = currentDay || new Date().getDate();

  // Прошла ли уже дата y-m-d?
  const isPast = (y, m, d) => {
    const now = new Date(year, month-1, todayDay);
    const dl  = new Date(y, m-1, d);
    return now > dl;
  };

  // Ежемесячные
  if (ref.monthly && ref.deadline_day) {
    const dd = parseInt(ref.deadline_day);
    if (!isPast(year, month, dd)) return year+"-"+pad(month)+"-"+pad(dd);
    let dlM = month+1, dlY = year;
    if (dlM > 12) { dlM = 1; dlY++; }
    return dlY+"-"+pad(dlM)+"-"+pad(dd);
  }

  // Полугодовые
  if (ref.semi_1 || ref.semi) {
    const [d1m, d1d] = (ref.semi_1||"08-17").split("-").map(Number);
    if (!isPast(year, d1m, d1d)) return year+"-"+pad(d1m)+"-"+pad(d1d);
    const [d2m, d2d] = (ref.semi_2||"02-17").split("-").map(Number);
    if (!isPast(year+1, d2m, d2d)) return (year+1)+"-"+pad(d2m)+"-"+pad(d2d);
    return (year+1)+"-"+pad(d1m)+"-"+pad(d1d);
  }

  // Квартальные с точными датами q1/q2/q3
  if (ref.q1 || ref.q2) {
    const quarters = [ref.q1||"05-15", ref.q2||"08-17", ref.q3||"11-16"];
    for (const q of quarters) {
      const [qm, qd] = q.split("-").map(Number);
      if (!isPast(year, qm, qd)) return year+"-"+pad(qm)+"-"+pad(qd);
    }
    const [qm, qd] = quarters[0].split("-").map(Number);
    return (year+1)+"-"+pad(qm)+"-"+pad(qd);
  }

  // Квартальные с одним deadline_day (КГД стандартные даты)
  if (ref.quarter && ref.deadline_day) {
    const qDates = [[5,15],[8,17],[11,16]];
    for (const [qm, qd] of qDates) {
      if (!isPast(year, qm, qd)) return year+"-"+pad(qm)+"-"+pad(qd);
    }
    return (year+1)+"-03-31";
  }

  // Годовые
  if (ref.annual && ref.deadline_day) {
    const parts = ref.deadline_day.split("-");
    let dlDay, dlMonth;
    if (parts.length === 2) { dlDay=parseInt(parts[0]); dlMonth=parseInt(parts[1]); }
    else { dlDay=parseInt(parts[0]); dlMonth=3; }
    if (!isPast(year, dlMonth, dlDay)) return year+"-"+pad(dlMonth)+"-"+pad(dlDay);
    return (year+1)+"-"+pad(dlMonth)+"-"+pad(dlDay);
  }

  return null;
}

// Поиск в справочнике по названию формы
function lookupReference(name) {
  const nameLower = name.toLowerCase();
  
  // Сначала точное совпадение (ключ = название)
  for (const [key, ref] of Object.entries(DEADLINE_REFERENCE)) {
    if (nameLower === key.toLowerCase()) return { key, ref };
  }
  
  // Затем частичное — ключ содержится в названии
  // Сортируем по длине ключа (длиннее = точнее)
  const sorted = Object.entries(DEADLINE_REFERENCE)
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [key, ref] of sorted) {
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
  const day = new Date().getDate();

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
    const deadline = calcDeadline(ref, period, year, month, day);
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
