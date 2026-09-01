// src/components/work/tools/TaxRegimesComparison.jsx
import { useState, useMemo } from 'react';

// ⚠️ Обновить при изменении МРП
const MRP_2026 = 4325;

const REGIMES = [
  {
    id: 'our',
    name: 'Общеустановленный режим',
    short: 'ОУР',
    rate: 'ИПН 10% с прибыли',
    desc: 'Полный бухгалтерский учёт. НДС при превышении оборота 20 000 МРП.',
    calc: (income, expenses) => Math.max(0, (income - expenses) * 0.10),
    icon: '📋',
  },
  {
    id: 'upd',
    name: 'Упрощённая декларация',
    short: 'УД',
    rate: '3% от оборота (1.5% ИПН + 1.5% СН)',
    desc: 'Самый популярный режим для малого бизнеса. До 24 038 МРП оборота.',
    calc: (income) => income * 0.03,
    icon: '⚡',
  },
  {
    id: 'patent',
    name: 'Патент',
    short: 'ПАТ',
    rate: '1% от дохода',
    desc: 'Только для ИП без сотрудников. До 3 528 МРП дохода в год.',
    calc: (income) => income * 0.01,
    icon: '📜',
    disclaimer: 'Только для отдельных видов деятельности без сотрудников',
  },
  {
    id: 'esn',
    name: 'Единый совокупный платёж',
    short: 'ЕСП',
    rate: 'Фиксированный ежемесячный платёж',
    desc: 'Для физлиц без регистрации ИП. Фиксированный платёж ~1 МРП/мес.',
    calc: () => MRP_2026 * 12,
    icon: '🔒',
    disclaimer: 'Для физлиц, оказывающих услуги без образования ИП',
  },
];

export function TaxRegimesComparison() {
  const [income,    setIncome]    = useState(15000000);
  const [expenses,  setExpenses]  = useState(6000000);
  const [employees, setEmployees] = useState(0);

  const results = useMemo(() =>
    REGIMES.map(r => ({
      ...r,
      tax: Math.round(r.calc(income, expenses, employees)),
    })).sort((a, b) => a.tax - b.tax),
    [income, expenses, employees]
  );

  const best = results[0];
  const profit = Math.max(0, income - expenses);

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
          Налоговые режимы РК 2026 · МРП = {fmt(MRP_2026)} ₸
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
          const isBest = r.id === best.id;
          return (
            <div key={r.id} style={{
              position: 'relative',
              padding: '18px 16px',
              background: isBest
                ? 'linear-gradient(135deg, rgba(200,164,90,0.12), rgba(200,164,90,0.04))'
                : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${isBest ? 'rgba(200,164,90,0.6)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 12,
            }}>
              {/* Бейдж позиции */}
              <div style={{
                position: 'absolute', top: -10, left: 14,
                padding: '2px 10px', borderRadius: 10, fontSize: 12,
                fontFamily: "'JetBrains Mono',monospace",
                background: isBest ? 'rgba(200,164,90,0.9)' : 'rgba(255,255,255,0.1)',
                color: isBest ? '#000' : 'rgba(255,255,255,0.5)',
              }}>
                {isBest ? '✦ РЕКОМЕНДУЕМ' : `#${idx + 1}`}
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

              <div style={{ fontSize: 15, color: 'var(--text3)', lineHeight: 1.5, marginBottom: r.disclaimer ? 8 : 0 }}>
                {r.desc}
              </div>

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
                  width: `${Math.round((r.tax / results[results.length - 1].tax) * 100)}%`,
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
        ℹ Расчёты приблизительные. Для точного выбора режима проконсультируйтесь с налоговым специалистом.
      </div>
    </div>
  );
}
