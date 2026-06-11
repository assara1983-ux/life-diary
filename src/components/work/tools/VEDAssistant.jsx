// src/components/work/tools/VEDAssistant.jsx
import { useState } from 'react';
import { useApp } from '../../../store/AppContext';

const INCOTERMS = [
  { code: 'EXW', name: 'Франко завод',                      type: 'any',  desc: 'Минимальная ответственность продавца — товар передаётся на его складе. Все расходы и риски на покупателе.' },
  { code: 'FCA', name: 'Франко перевозчик',                 type: 'any',  desc: 'Товар передаётся перевозчику в указанном месте. Гибкий термин для любого вида транспорта.' },
  { code: 'CPT', name: 'Перевозка оплачена до',             type: 'any',  desc: 'Продавец оплачивает доставку до указанного места, но риск переходит при передаче перевозчику.' },
  { code: 'CIP', name: 'Перевозка и страхование оплачены',  type: 'any',  desc: 'Как CPT, но продавец также обязан оформить страхование груза. Минимальное покрытие — 110% стоимости.' },
  { code: 'DAP', name: 'Поставка в место назначения',       type: 'any',  desc: 'Продавец несёт все расходы и риски до места назначения. Разгрузка — за счёт покупателя.' },
  { code: 'DPU', name: 'Поставка с разгрузкой',             type: 'any',  desc: 'Как DAP, но продавец также обязан разгрузить товар в месте назначения.' },
  { code: 'DDP', name: 'Поставка с оплатой пошлин',         type: 'any',  desc: 'Максимальная ответственность продавца — включая таможенное оформление и уплату пошлин.' },
  { code: 'FAS', name: 'Франко вдоль борта судна',          type: 'sea',  desc: 'Только для морских перевозок. Продавец доставляет товар к борту судна в порту отгрузки.' },
  { code: 'FOB', name: 'Франко борт',                       type: 'sea',  desc: 'Классика морских поставок. Риск переходит когда товар на борту судна.' },
  { code: 'CFR', name: 'Стоимость и фрахт',                 type: 'sea',  desc: 'Продавец оплачивает фрахт до порта назначения, но риск переходит при погрузке.' },
  { code: 'CIF', name: 'Стоимость, страхование и фрахт',    type: 'sea',  desc: 'CFR + страхование. Самый распространённый термин в морской торговле.' },
];

const EXPORT_CHECKLIST = [
  { item: 'Внешнеторговый договор / контракт', done: false },
  { item: 'Коммерческий инвойс (Invoice)', done: false },
  { item: 'Упаковочный лист (Packing List)', done: false },
  { item: 'Сертификат происхождения (СТ-1 / Form A)', done: false },
  { item: 'Фитосанитарный / ветеринарный сертификат (при необходимости)', done: false },
  { item: 'Разрешение на экспорт (для лицензируемых товаров)', done: false },
  { item: 'Паспорт сделки / регистрация в банке', done: false },
  { item: 'Декларация на товары (ДТ)', done: false },
  { item: 'Подтверждение экспорта для возврата НДС', done: false },
];

const IMPORT_CHECKLIST = [
  { item: 'Внешнеторговый договор / контракт', done: false },
  { item: 'Коммерческий инвойс', done: false },
  { item: 'Транспортные документы (CMR, коносамент, авианакладная)', done: false },
  { item: 'Упаковочный лист', done: false },
  { item: 'Декларация на товары (ДТ)', done: false },
  { item: 'Оплата таможенных платежей (пошлина + НДС)', done: false },
  { item: 'Сертификаты соответствия / декларации о соответствии', done: false },
  { item: 'Санитарно-эпидемиологическое заключение (при необходимости)', done: false },
  { item: 'Валютный контроль через банк', done: false },
];

const SYSTEM_TNVED = `Ты — эксперт по ВЭД и таможенному законодательству Казахстана и ЕАЭС.
Дай чёткую структурированную информацию по запрошенному коду ТН ВЭД.
Включи: описание товара, базовую ставку ввозной пошлины ЕАЭС, НДС (12% РК), акцизы если есть, разрешительные документы, рекомендации.
Отвечай на русском языке.`;

export function VEDAssistant() {
  const { notify } = useApp();

  const [activeTab,    setActiveTab]    = useState('incoterms');
  const [tnvedCode,    setTnvedCode]    = useState('');
  const [tnvedResult,  setTnvedResult]  = useState('');
  const [loading,      setLoading]      = useState(false);
  const [filter,       setFilter]       = useState('all');
  const [exportChecks, setExportChecks] = useState(EXPORT_CHECKLIST.map(i => ({ ...i })));
  const [importChecks, setImportChecks] = useState(IMPORT_CHECKLIST.map(i => ({ ...i })));

  const searchTnved = async () => {
    if (!tnvedCode.trim()) { notify('Введите код ТН ВЭД'); return; }
    setLoading(true);
    setTnvedResult('');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: SYSTEM_TNVED,
          user: `Код ТН ВЭД: ${tnvedCode}. Дай полную информацию для импорта/экспорта в 2026 году.`,
          maxTokens: 1024,
        }),
      });
      const data = await res.json();
      setTnvedResult(data.text || 'Информация не найдена.');
    } catch {
      setTnvedResult('Ошибка соединения. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (list, setList, i) => {
    setList(prev => prev.map((item, idx) =>
      idx === i ? { ...item, done: !item.done } : item
    ));
  };

  const resetChecklist = (setList, source) => {
    setList(source.map(i => ({ ...i })));
    notify('Чек-лист сброшен');
  };

  const filteredIncoterms = filter === 'all'
    ? INCOTERMS
    : INCOTERMS.filter(i => i.type === filter || i.type === 'any');

  const TABS = [
    { id: 'incoterms', label: '📦 Incoterms 2020' },
    { id: 'tnved',     label: '🔍 ТН ВЭД' },
    { id: 'export',    label: '✈️ Экспорт' },
    { id: 'import',    label: '🚢 Импорт' },
  ];

  return (
    <div style={{ color: 'var(--text0)', paddingBottom: 24 }}>
      {/* Заголовок */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 14, fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: 3, color: 'rgba(200,164,90,0.7)', marginBottom: 4,
        }}>ВЭД АССИСТЕНТ</div>
        <div style={{ fontSize: 18, fontFamily: "'Cormorant Infant',serif" }}>
          Incoterms · ТН ВЭД · Экспорт и Импорт
        </div>
      </div>

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '8px 16px', borderRadius: 16, fontSize: 15, cursor: 'pointer',
            background: activeTab === t.id ? 'rgba(200,164,90,0.15)' : 'transparent',
            border: `1px solid ${activeTab === t.id ? 'rgba(200,164,90,0.5)' : 'rgba(255,255,255,0.1)'}`,
            color: activeTab === t.id ? 'rgba(200,164,90,0.9)' : 'var(--text3)',
            transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ════ INCOTERMS ════ */}
      {activeTab === 'incoterms' && (
        <div>
          {/* Фильтр */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[['all','Все'],['any','Любой транспорт'],['sea','Морские']].map(([v,l]) => (
              <div key={v} onClick={() => setFilter(v)}
                style={{
                  padding: '5px 14px', borderRadius: 12, cursor: 'pointer', fontSize: 14,
                  border: `1px solid ${filter === v ? 'rgba(200,164,90,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  background: filter === v ? 'rgba(200,164,90,0.1)' : 'transparent',
                  color: filter === v ? 'rgba(200,164,90,0.9)' : 'var(--text3)',
                  fontFamily: "'JetBrains Mono',monospace",
                }}
              >{l}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {filteredIncoterms.map(item => (
              <div key={item.code} style={{
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${item.type === 'sea' ? 'rgba(0,112,192,0.3)' : 'rgba(200,164,90,0.2)'}`,
                borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{
                    fontSize: 18, fontWeight: 700, color: 'rgba(200,164,90,0.9)',
                    fontFamily: "'JetBrains Mono',monospace",
                  }}>{item.code}</div>
                  {item.type === 'sea' && (
                    <span style={{
                      fontSize: 12, padding: '2px 8px', borderRadius: 8,
                      background: 'rgba(0,112,192,0.15)',
                      border: '1px solid rgba(0,112,192,0.3)',
                      color: 'rgba(100,180,255,0.8)',
                      fontFamily: "'JetBrains Mono',monospace",
                    }}>МОРЕ</span>
                  )}
                </div>
                <div style={{ fontSize: 16, color: 'var(--text1)', marginBottom: 6, fontWeight: 500 }}>
                  {item.name}
                </div>
                <div style={{ fontSize: 15, color: 'var(--text3)', lineHeight: 1.5 }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════ ТН ВЭД ════ */}
      {activeTab === 'tnved' && (
        <div style={{ maxWidth: 700 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: 1, color: 'rgba(200,164,90,0.6)', marginBottom: 8,
            }}>КОД ТН ВЭД</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                value={tnvedCode}
                onChange={e => setTnvedCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchTnved()}
                placeholder="Например: 1001 90 900 0"
                style={{
                  flex: 1, padding: '12px 16px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(200,164,90,0.25)',
                  borderRadius: 10, color: 'var(--text0)', fontSize: 17,
                  outline: 'none', fontFamily: "'JetBrains Mono',monospace",
                }}
              />
              <button onClick={searchTnved} disabled={loading} style={{
                padding: '0 20px', borderRadius: 10,
                background: 'rgba(200,164,90,0.1)',
                border: '1px solid rgba(200,164,90,0.4)',
                color: 'rgba(200,164,90,0.9)',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 16, opacity: loading ? 0.7 : 1,
                fontFamily: "'JetBrains Mono',monospace",
              }}>
                {loading ? '✦' : '→'}
              </button>
            </div>
          </div>

          {tnvedResult && (
            <div style={{
              padding: '16px 18px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(200,164,90,0.25)',
              borderRadius: 12, fontSize: 16, lineHeight: 1.7,
              color: 'var(--text1)', whiteSpace: 'pre-wrap',
            }}>
              <div style={{
                fontSize: 12, fontFamily: "'JetBrains Mono',monospace",
                letterSpacing: 2, color: 'rgba(200,164,90,0.5)', marginBottom: 8,
              }}>РЕЗУЛЬТАТ ДЛЯ КОДА {tnvedCode}</div>
              {tnvedResult}
            </div>
          )}
        </div>
      )}

      {/* ════ ЭКСПОРТ ════ */}
      {activeTab === 'export' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{
              fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: 2, color: 'rgba(200,164,90,0.7)',
            }}>
              ЧЕК-ЛИСТ ЭКСПОРТА · {exportChecks.filter(i => i.done).length}/{exportChecks.length}
            </div>
            <button onClick={() => resetChecklist(setExportChecks, EXPORT_CHECKLIST)} style={{
              padding: '4px 12px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
              background: 'transparent', border: `1px solid ${BT.bdrS}`,
              color: 'var(--text3)', fontFamily: "'JetBrains Mono',monospace",
            }}>Сбросить</button>
          </div>

          {/* Прогресс */}
          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 3, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.round(exportChecks.filter(i => i.done).length / exportChecks.length * 100)}%`,
              background: 'linear-gradient(90deg, rgba(200,164,90,0.8), rgba(34,197,94,0.6))',
              borderRadius: 3, transition: 'width 0.3s',
            }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {exportChecks.map((item, i) => (
              <div key={i} onClick={() => toggleCheck(exportChecks, setExportChecks, i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  background: item.done ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${item.done ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.07)'}`,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  border: `1.5px solid ${item.done ? 'rgba(34,197,94,0.8)' : 'rgba(200,164,90,0.3)'}`,
                  background: item.done ? 'rgba(34,197,94,0.2)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, color: 'rgba(34,197,94,0.9)',
                }}>
                  {item.done ? '✓' : ''}
                </div>
                <span style={{
                  fontSize: 16, color: item.done ? 'var(--text3)' : 'var(--text1)',
                  textDecoration: item.done ? 'line-through' : 'none',
                  lineHeight: 1.4,
                }}>{item.item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════ ИМПОРТ ════ */}
      {activeTab === 'import' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{
              fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: 2, color: 'rgba(200,164,90,0.7)',
            }}>
              ЧЕК-ЛИСТ ИМПОРТА · {importChecks.filter(i => i.done).length}/{importChecks.length}
            </div>
            <button onClick={() => resetChecklist(setImportChecks, IMPORT_CHECKLIST)} style={{
              padding: '4px 12px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
              background: 'transparent', border: `1px solid ${BT.bdrS}`,
              color: 'var(--text3)', fontFamily: "'JetBrains Mono',monospace",
            }}>Сбросить</button>
          </div>

          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 3, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.round(importChecks.filter(i => i.done).length / importChecks.length * 100)}%`,
              background: 'linear-gradient(90deg, rgba(0,112,192,0.8), rgba(168,85,247,0.6))',
              borderRadius: 3, transition: 'width 0.3s',
            }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {importChecks.map((item, i) => (
              <div key={i} onClick={() => toggleCheck(importChecks, setImportChecks, i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  background: item.done ? 'rgba(0,112,192,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${item.done ? 'rgba(0,112,192,0.3)' : 'rgba(255,255,255,0.07)'}`,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  border: `1.5px solid ${item.done ? 'rgba(0,112,192,0.8)' : 'rgba(200,164,90,0.3)'}`,
                  background: item.done ? 'rgba(0,112,192,0.2)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, color: 'rgba(100,180,255,0.9)',
                }}>
                  {item.done ? '✓' : ''}
                </div>
                <span style={{
                  fontSize: 16, color: item.done ? 'var(--text3)' : 'var(--text1)',
                  textDecoration: item.done ? 'line-through' : 'none',
                  lineHeight: 1.4,
                }}>{item.item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
                  }
