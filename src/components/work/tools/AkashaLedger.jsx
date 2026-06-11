// src/components/work/tools/AccountantNewsFeed.jsx
import { useState, useMemo } from 'react';
import { useApp } from '../../../store/AppContext';

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const SYSTEM_NEWS = `Ты — бухгалтерский ассистент Казахстана. 
Дай 4 актуальные новости или изменения по бухгалтерии, налогам и отчётности РК на 2026 год.
Отвечай ТОЛЬКО валидным JSON массивом без пreamble. Формат:
[{"date":"ДД.ММ.ГГГГ","title":"Заголовок","summary":"Краткое описание (1-2 предложения)","tag":"НДС|ИПН|МРП|Отчётность|ЕАЭС"}]`;

const SYSTEM_REPORT = `Ты — профессиональный бухгалтер-аналитик в РК.
Сгенерируй краткий структурированный отчёт для бухгалтера.
Используй маркированные списки, конкретные цифры и рекомендации.
Отвечай на русском языке (200–350 слов).`;

const REPORT_TYPES = [
  { id: 'debtor',   icon: '📈', title: 'Анализ дебиторской задолженности' },
  { id: 'close',    icon: '📅', title: 'Чек-лист закрытия месяца' },
  { id: 'regimes',  icon: '⚖️', title: 'Сравнение налоговых режимов' },
  { id: 'expenses', icon: '💰', title: 'Анализ расходов за период' },
  { id: 'nds',      icon: '🧾', title: 'Контроль НДС — проверка' },
];

const TAG_COLORS = {
  НДС:        'rgba(0,112,192,0.3)',
  ИПН:        'rgba(168,85,247,0.3)',
  МРП:        'rgba(200,164,90,0.3)',
  Отчётность: 'rgba(34,197,94,0.3)',
  ЕАЭС:       'rgba(249,115,22,0.3)',
};

export function AccountantNewsFeed() {
  const { tasks, notify } = useApp();

  const [activeTab,       setActiveTab]       = useState('dashboard');
  const [news,            setNews]            = useState([]);
  const [loadingNews,     setLoadingNews]     = useState(false);
  const [generatedReport, setGeneratedReport] = useState('');
  const [loadingReport,   setLoadingReport]   = useState(false);
  const [activeReport,    setActiveReport]    = useState(null);

  // Реальные данные из tasks
  const workTasks    = tasks.filter(t => t.section === 'work');
  const activeTasks  = workTasks.filter(t => !t.doneDate).length;
  const doneTasks    = workTasks.filter(t => !!t.doneDate).length;
  const totalTasks   = workTasks.length;
  const readiness    = totalTasks > 0 ? Math.round(doneTasks / totalTasks * 100) : 0;

  const todayStr = localDateStr();
  const todayTasks = workTasks.filter(t => {
    const d = new Date(todayStr + 'T00:00:00');
    if (t.freq === 'daily') return true;
    if (t.freq === 'workdays') { const dn = d.getDay(); return dn >= 1 && dn <= 5; }
    return false;
  }).length;

  // Дедлайны в ближайшие 7 дней
  const urgentTasks = useMemo(() =>
    workTasks.filter(t => {
      if (!t.deadline) return false;
      const days = Math.ceil((new Date(t.deadline.split('T')[0] + 'T00:00:00') - new Date()) / 86400000);
      return days >= 0 && days <= 7;
    }).length,
    [workTasks]
  );

  const loadNews = async () => {
    setLoadingNews(true);
    setNews([]);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: SYSTEM_NEWS,
          user: 'Дай 4 актуальные новости по бухгалтерии и налогам РК 2026.',
          maxTokens: 1024,
        }),
      });
      const data = await res.json();
      const clean = (data.text || '').replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) setNews(parsed);
      else setNews([]);
    } catch {
      notify('Не удалось загрузить новости');
    } finally {
      setLoadingNews(false);
    }
  };

  const generateReport = async (type) => {
    setLoadingReport(true);
    setActiveReport(type.id);
    setGeneratedReport('');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: SYSTEM_REPORT,
          user: `Сгенерируй отчёт: "${type.title}". Дата: ${localDateStr()}. Активных задач: ${activeTasks}, выполнено: ${doneTasks}.`,
          maxTokens: 768,
        }),
      });
      const data = await res.json();
      setGeneratedReport(data.text || 'Не удалось сгенерировать отчёт.');
      notify(`✅ Отчёт «${type.title}» готов`);
    } catch {
      notify('Ошибка генерации отчёта');
    } finally {
      setLoadingReport(false);
    }
  };

  const TABS = [
    { id: 'dashboard', label: '📊 Дашборд' },
    { id: 'news',      label: '📰 Новости' },
    { id: 'reports',   label: '📋 Отчёты' },
  ];

  return (
    <div style={{ color: 'var(--text0)', paddingBottom: 24 }}>
      {/* Заголовок */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 14, fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: 3, color: 'rgba(200,164,90,0.7)', marginBottom: 4,
        }}>БУХГАЛТЕРСКИЙ ДАШБОРД</div>
        <div style={{ fontSize: 18, fontFamily: "'Cormorant Infant',serif" }}>
          Аналитика · Новости · Быстрые отчёты
        </div>
      </div>

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, padding: '9px 0', borderRadius: 16, fontSize: 15, cursor: 'pointer',
            background: activeTab === t.id ? 'rgba(200,164,90,0.15)' : 'transparent',
            border: `1px solid ${activeTab === t.id ? 'rgba(200,164,90,0.5)' : 'rgba(255,255,255,0.1)'}`,
            color: activeTab === t.id ? 'rgba(200,164,90,0.9)' : 'var(--text3)',
            transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ════ ДАШБОРД ════ */}
      {activeTab === 'dashboard' && (
        <div>
          {/* KPI карточки */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 10, marginBottom: 20,
          }}>
            {[
              { label: 'Активных задач',    value: activeTasks,  color: 'rgba(200,164,90,0.9)',  icon: '📋' },
              { label: 'Выполнено',         value: doneTasks,    color: 'rgba(34,197,94,0.8)',   icon: '✅' },
              { label: 'Сегодня',           value: todayTasks,   color: BT.navyMid,   icon: '☀️' },
              { label: 'Срочных (7 дней)',  value: urgentTasks,  color: urgentTasks > 0 ? 'rgba(239,68,68,0.8)' : 'rgba(255,255,255,0.3)', icon: '⚠️' },
            ].map(({ label, value, color, icon }) => (
              <div key={label} style={{
                padding: '14px 12px', textAlign: 'center',
                background: 'rgba(255,255,255,0.70)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
              }}>
                <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>
                  {value}
                </div>
                <div style={{
                  fontSize: 12, color: BT.text3,
                  fontFamily: "'JetBrains Mono',monospace",
                  letterSpacing: 1, marginTop: 4,
                }}>
                  {label.toUpperCase()}
                </div>
              </div>
            ))}
          </div>

          {/* Готовность к закрытию */}
          <div style={{
            padding: '16px 14px',
            background: 'rgba(255,255,255,0.70)',
            border: '1px solid rgba(200,164,90,0.2)',
            borderRadius: 12, marginBottom: 16,
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 10,
            }}>
              <div style={{
                fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
                letterSpacing: 2, color: 'rgba(200,164,90,0.7)',
              }}>ГОТОВНОСТЬ К ЗАКРЫТИЮ ПЕРИОДА</div>
              <div style={{
                fontSize: 20, fontWeight: 700,
                color: readiness >= 80 ? 'rgba(34,197,94,0.8)' : readiness >= 50 ? 'rgba(200,164,90,0.8)' : 'rgba(239,68,68,0.8)',
              }}>{readiness}%</div>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${readiness}%`,
                background: readiness >= 80
                  ? 'linear-gradient(90deg, rgba(34,197,94,0.7), rgba(34,197,94,0.4))'
                  : readiness >= 50
                    ? 'linear-gradient(90deg, rgba(200,164,90,0.8), rgba(200,164,90,0.4))'
                    : 'linear-gradient(90deg, rgba(239,68,68,0.7), rgba(239,68,68,0.4))',
                borderRadius: 4, transition: 'width 0.5s',
              }} />
            </div>
          </div>

          {/* Ближайшие дедлайны */}
          {urgentTasks > 0 && (
            <div style={{
              padding: '14px', background: 'rgba(239,68,68,0.05)',
              border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10,
            }}>
              <div style={{
                fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
                letterSpacing: 2, color: 'rgba(239,68,68,0.7)', marginBottom: 8,
              }}>⚠ ДЕДЛАЙНЫ В БЛИЖАЙШИЕ 7 ДНЕЙ</div>
              {workTasks
                .filter(t => {
                  if (!t.deadline) return false;
                  const days = Math.ceil((new Date(t.deadline.split('T')[0] + 'T00:00:00') - new Date()) / 86400000);
                  return days >= 0 && days <= 7;
                })
                .slice(0, 5)
                .map(t => {
                  const days = Math.ceil((new Date(t.deadline.split('T')[0] + 'T00:00:00') - new Date()) / 86400000);
                  return (
                    <div key={t.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      <span style={{
                        fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
                        color: days <= 2 ? 'rgba(239,68,68,0.8)' : 'rgba(200,164,90,0.7)',
                        minWidth: 50,
                      }}>
                        {days === 0 ? 'СЕГОДНЯ' : days === 1 ? 'ЗАВТРА' : `${days} дн.`}
                      </span>
                      <span style={{ fontSize: 15, color: 'var(--text2)', flex: 1 }}>
                        {t.title}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ════ НОВОСТИ ════ */}
      {activeTab === 'news' && (
        <div>
          <button
            onClick={loadNews} disabled={loadingNews}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 16, marginBottom: 16,
              background: 'linear-gradient(135deg, rgba(200,164,90,0.15), rgba(200,164,90,0.05))',
              border: '1px solid rgba(200,164,90,0.4)',
              color: 'rgba(200,164,90,0.9)', fontSize: 16, cursor: loadingNews ? 'not-allowed' : 'pointer',
              opacity: loadingNews ? 0.7 : 1,
              fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1,
            }}
          >
            {loadingNews ? '✦ Загружаю новости...' : '↻ Обновить новости РК 2026'}
          </button>

          {news.length === 0 && !loadingNews && (
            <div style={{
              padding: '60px 20px', textAlign: 'center',
              color: 'var(--text3)', fontFamily: "'Cormorant Infant',serif",
              fontSize: 17, lineHeight: 1.8,
            }}>
              Нажмите кнопку для загрузки<br/>актуальных новостей
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {news.map((item, i) => (
              <div key={i} style={{
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
                  <div style={{
                    fontSize: 17, color: 'var(--text1)', fontWeight: 500,
                    fontFamily: "'Cormorant Infant',serif", lineHeight: 1.4, flex: 1,
                  }}>
                    {item.title}
                  </div>
                  {item.tag && (
                    <span style={{
                      flexShrink: 0, padding: '2px 8px', borderRadius: 8,
                      fontSize: 12, fontFamily: "'JetBrains Mono',monospace",
                      background: TAG_COLORS[item.tag] || 'rgba(255,255,255,0.1)',
                      color: BT.text2, border: `1px solid ${BT.bdrS}`,
                    }}>{item.tag}</span>
                  )}
                </div>
                {item.date && (
                  <div style={{
                    fontSize: 13, color: 'rgba(200,164,90,0.6)',
                    fontFamily: "'JetBrains Mono',monospace", marginBottom: 6,
                  }}>{item.date}</div>
                )}
                <div style={{ fontSize: 15, color: 'var(--text3)', lineHeight: 1.5 }}>
                  {item.summary}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════ ОТЧЁТЫ ════ */}
      {activeTab === 'reports' && (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 10, marginBottom: 16,
          }}>
            {REPORT_TYPES.map(r => (
              <div key={r.id}
                onClick={() => generateReport(r)}
                style={{
                  padding: '16px 14px', borderRadius: 10, cursor: 'pointer',
                  background: activeReport === r.id ? 'rgba(200,164,90,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${activeReport === r.id ? 'rgba(200,164,90,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  transition: 'all 0.15s', textAlign: 'center',
                  opacity: loadingReport && activeReport !== r.id ? 0.5 : 1,
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>{r.icon}</div>
                <div style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.4 }}>
                  {r.title}
                </div>
                {activeReport === r.id && loadingReport && (
                  <div style={{
                    marginTop: 8, fontSize: 13,
                    color: 'rgba(200,164,90,0.7)',
                    fontFamily: "'JetBrains Mono',monospace",
                  }}>✦ генерирую...</div>
                )}
              </div>
            ))}
          </div>

          {generatedReport && (
            <div style={{
              padding: '16px 18px',
              background: 'rgba(255,255,255,0.70)',
              border: '1px solid rgba(200,164,90,0.2)',
              borderRadius: 12, fontSize: 16, lineHeight: 1.7,
              color: 'var(--text1)', whiteSpace: 'pre-wrap',
            }}>
              <div style={{
                fontSize: 12, fontFamily: "'JetBrains Mono',monospace",
                letterSpacing: 2, color: 'rgba(200,164,90,0.5)', marginBottom: 10,
              }}>
                {REPORT_TYPES.find(r => r.id === activeReport)?.icon}{' '}
                {REPORT_TYPES.find(r => r.id === activeReport)?.title?.toUpperCase()}
              </div>
              {generatedReport}
            </div>
          )}
        </div>
      )}
    </div>
  );
          }
