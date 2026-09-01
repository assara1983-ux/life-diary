// src/components/work/tools/TaxRegimesComparison.jsx
import { useState, useMemo } from 'react';

// ⚠️ Обновить при изменении МРП (устанавливается ежегодно Законом РК «О республиканском бюджете»)
const MRP_2026 = 4325;

// Данные сверены на актуальный Налоговый кодекс РК (Закон № 214-VIII, в силе с 1 января 2026).
// С 2026 года налоговая реформа существенно сократила число режимов:
// — Патент, розничный налог и режим с фиксированным вычетом ОТМЕНЕНЫ.
// — Патент заменён новым «СНР для самозанятых» (через приложение E-Salyq Business).
// — «Упрощённая декларация» и бывший розничный налог объединены в один режим со ставкой 4%.
// — ЕСП не действует с 1 января 2024 года (был временным режимом на 2019–2023).
const OUR_THRESHOLD_MRP = 230000; // порог для ИПН 10%/15% для ИП на ОУР
const VAT_THRESHOLD_MRP = 10000;  // порог обязательной постановки на учёт по НДС (ОУР)
const UD_LIMIT_MRP = 600000;      // лимит годового дохода для Упрощённой декларации
const SELF_EMPLOYED_LIMIT_MRP_MONTH = 300; // лимит дохода в месяц для самозанятых

const REGIMES = [
  {
    id: 'our',
    name: 'Общеустановленный режим (ОУР)',
    short: 'ОУР',
    rate: 'ИПН 10% / 15% с прибыли (для ИП)',
    desc: `Налог с прибыли (доходы минус расходы). До ${(OUR_THRESHOLD_MRP*MRP_2026).toLocaleString('ru-RU')} ₸ прибыли в год — 10%, сверх — 15%. НДС 16% при доходе свыше ${(VAT_THRESHOLD_MRP*MRP_2026).toLocaleString('ru-RU')} ₸. Для ТОО — КПН 20% с прибыли.`,
    calc: (income, expenses) => {
      const profit = Math.max(0, income - expenses);
      const threshold = OUR_THRESHOLD_MRP * MRP_2026;
      if (profit <= threshold) return profit * 0.10;
      return threshold * 0.10 + (profit - threshold) * 0.15;
    },
    maxIncome: null, // без ограничений по доходу
    icon: '📋',
  },
  {
    id: 'upd',
    name: 'Упрощённая декларация',
    short: 'УД',
    rate: '4% от оборота (маслихат: 2–6%)',
    desc: `Единый налог с оборота, НДС и соцналога нет. Лимит дохода — ${UD_LIMIT_MRP.toLocaleString('ru-RU')} МРП (${(UD_LIMIT_MRP*MRP_2026).toLocaleString('ru-RU')} ₸/год). Есть запретительный список ~180 кодов ОКЭД (Пост. Правительства №970).`,
    calc: (income) => income * 0.04,
    maxIncome: UD_LIMIT_MRP * MRP_2026,
    icon: '⚡',
  },
  {
    id: 'selfEmployed',
    name: 'СНР для самозанятых',
    short: 'САМОЗАНЯТЫЙ',
    rate: 'ИПН 0% + соцплатежи 4%',
    desc: `Заменил патент с 2026 года. Только для физлиц без ИП, ограниченный список видов деятельности, через приложение E-Salyq Business. Лимит — ${SELF_EMPLOYED_LIMIT_MRP_MONTH} МРП/мес (${(SELF_EMPLOYED_LIMIT_MRP_MONTH*MRP_2026).toLocaleString('ru-RU')} ₸/мес).`,
    calc: (income) => income * 0.04, // ИПН 0% + соцплатежи ОПВ/ОПВР/СО/ОСМС ≈ 4% суммарно
    maxIncome: SELF_EMPLOYED_LIMIT_MRP_MONTH * 12 * MRP_2026,
    icon: '📱',
    disclaimer: 'Только для физлиц без регистрации ИП, по ограниченному перечню видов деятельности',
  },
];

export function TaxRegimesComparison() {
  const [income,    setIncome]    = useState(15000000);
  const [expenses,  setExpenses]  = useState(6000000);
  const [employees, setEmployees] = useState(0);

  const results = useMemo(() => {
    const withTax = REGIMES.map(r => ({
      ...r,
      tax: Math.round(r.calc(income, expenses, employees)),
      eligible: r.maxIncome == null || income <= r.maxIncome,
    }));
    // Сортируем так, чтобы подходящие режимы шли первыми (по возрастанию налога),
    // а недоступные из-за превышения лимита — в конце, не как «рекомендуемые»
    return withTax.sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return a.tax - b.tax;
    });
  }, [income, expenses, employees]);

  const best = results.find(r => r.eligible) || results[0];
  const profit = Math.max(0, income - expenses);
  const maxTaxForBar = Math.max(...results.map(r => r.tax), 1);

  const fmt = n => n.toLocaleString('ru-RU');

  return (
    <div style={{ color: 'var(--text0)', paddingBottom: 24 }}>
      {/* Заголовок */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 14, fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: 3, color: 'rgba(200,164,90,0.7)', marginBottom: 4,
        }}>СРАВНИТЕЛЬ РЕЖИМОВ</div>
        <div style={{ fontSize: 18, fontFamily: "'Cormorant Infant',serif" }}>
          Налоговые режимы РК 2026 · МРП = {fmt(MRP_2026)} ₸ · по Налоговому кодексу (Закон №214-VIII)
        </div>
      </div>

      {/* Поля ввода */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12, marginBottom: 24,
        padding: '16px 14px',
        background: 'rgba(255,255,255,0.70)',
        border: '1px solid rgba(200,164,90,0.2)',
        borderRadius: 12,
      }}>
        {[
          { label: 'Годовой доход (₸)',  value: income,    set: setIncome },
          { label: 'Расходы (₸)',        value: expenses,  set: setExpenses },
          { label: 'Сотрудников',        value: employees, set: setEmployees, min: 0, max: 100, step: 1 },
        ].map(({ label, value, set, min = 0, max, step = 100000 }) => (
          <div key={label}>
            <label style={{
              display: 'block', fontSize: 13,
              fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: 1, color: 'rgba(200,164,90,0.7)', marginBottom: 6,
            }}>{label.toUpperCase()}</label>
            <input
              type="number" value={value} min={min} max={max} step={step}
              onChange={e => set(Number(e.target.value))}
              style={{
                width: '100%', padding: '10px 12px',
                background: 'rgba(255,255,255,0.70)',
                border: '1px solid rgba(200,164,90,0.25)',
                borderRadius: 8, color: 'var(--text0)', fontSize: 17,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        ))}
      </div>

      {/* Итоги */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap',
      }}>
        {[
          { label: 'Доход',   value: fmt(income) + ' ₸',  color: 'rgba(34,197,94,0.8)' },
          { label: 'Расходы', value: fmt(expenses) + ' ₸', color: 'rgba(239,68,68,0.8)' },
          { label: 'Прибыль', value: fmt(profit) + ' ₸',  color: 'rgba(200,164,90,0.9)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            flex: 1, minWidth: 120, padding: '12px 14px', textAlign: 'center',
            background: 'rgba(255,255,255,0.70)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
          }}>
            <div style={{
              fontSize: 12, fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: 1, color: 'var(--text3)', marginBottom: 4,
            }}>{label.toUpperCase()}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Карточки режимов */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 12,
      }}>
        {results.map((r, idx) => {
          const isBest = r.id === best.id && r.eligible;
          return (
            <div key={r.id} style={{
              position: 'relative',
              padding: '18px 16px',
              background: isBest
                ? 'linear-gradient(135deg, rgba(200,164,90,0.12), rgba(200,164,90,0.04))'
                : r.eligible ? 'rgba(255,255,255,0.04)' : 'rgba(239,68,68,0.04)',
              border: `1.5px solid ${isBest ? 'rgba(200,164,90,0.6)' : r.eligible ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.25)'}`,
              borderRadius: 12,
              opacity: r.eligible ? 1 : 0.7,
            }}>
              {/* Бейдж позиции */}
              <div style={{
                position: 'absolute', top: -10, left: 14,
                padding: '2px 10px', borderRadius: 10, fontSize: 12,
                fontFamily: "'JetBrains Mono',monospace",
                background: isBest ? 'rgba(200,164,90,0.9)' : !r.eligible ? 'rgba(239,68,68,0.85)' : 'rgba(255,255,255,0.1)',
                color: isBest ? '#000' : !r.eligible ? '#fff' : 'rgba(255,255,255,0.5)',
              }}>
                {isBest ? '✦ РЕКОМЕНДУЕМ' : !r.eligible ? '⛔ ПРЕВЫШЕН ЛИМИТ' : `#${idx + 1}`}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 6 }}>
                <span style={{ fontSize: 20 }}>{r.icon}</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: isBest ? 'rgba(200,164,90,0.95)' : 'var(--text1)' }}>
                    {r.name}
                  </div>
                  <div style={{
                    fontSize: 12, fontFamily: "'JetBrains Mono',monospace",
                    color: 'var(--text3)', letterSpacing: 1,
                  }}>{r.short}</div>
                </div>
              </div>

              {/* Сумма налога */}
              <div style={{
                fontSize: 28, fontWeight: 700, marginBottom: 4,
                color: isBest ? 'rgba(200,164,90,0.95)' : 'var(--text1)',
              }}>
                {fmt(r.tax)} ₸
              </div>

              <div style={{
                fontSize: 14, color: 'rgba(200,164,90,0.6)',
                marginBottom: 8, fontFamily: "'JetBrains Mono',monospace",
              }}>
                {r.rate}
              </div>

              <div style={{ fontSize: 15, color: 'var(--text3)', lineHeight: 1.5, marginBottom: (r.disclaimer||!r.eligible) ? 8 : 0 }}>
                {r.desc}
              </div>

              {!r.eligible && (
                <div style={{
                  padding: '6px 10px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 6, fontSize: 14,
                  color: 'rgba(239,68,68,0.85)', lineHeight: 1.4,
                }}>
                  ⛔ Ваш доход ({fmt(income)} ₸) превышает лимит режима ({fmt(r.maxIncome)} ₸) — этот режим недоступен
                </div>
              )}

              {r.disclaimer && (
                <div style={{
                  padding: '6px 10px',
                  background: 'rgba(249,115,22,0.08)',
                  border: '1px solid rgba(249,115,22,0.25)',
                  borderRadius: 6, fontSize: 14,
                  color: 'rgba(249,115,22,0.8)', lineHeight: 1.4,
                }}>
                  ⚠ {r.disclaimer}
                </div>
              )}

              {/* Бар сравнения */}
              <div style={{
                marginTop: 12, height: 3,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 2, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.round((r.tax / maxTaxForBar) * 100)}%`,
                  background: isBest
                    ? 'linear-gradient(90deg, rgba(200,164,90,0.8), rgba(200,164,90,0.4))'
                    : 'rgba(255,255,255,0.2)',
                  borderRadius: 2, transition: 'width 0.4s',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Дисклеймер */}
      <div style={{
        marginTop: 16, padding: '10px 14px',
        background: 'rgba(255,255,255,0.60)',
        border: `1px solid rgba(0,0,0,0.12)`,
        borderRadius: 8, fontSize: 14, color: 'var(--text3)', lineHeight: 1.5,
      }}>
        ℹ Расчёты приблизительные и не учитывают региональные корректировки ставок маслихатами, вычеты и льготы. Данные сверены на новый Налоговый кодекс РК (Закон №214-VIII, действует с 01.01.2026) по состоянию на сентябрь 2026. Для точного выбора режима проконсультируйтесь с налоговым специалистом или на kgd.gov.kz.
      </div>
    </div>
  );
}
