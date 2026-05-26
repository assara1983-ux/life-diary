// src/sections/WorkSection.jsx
import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { KGD_CATALOG, BNS_CATALOG } from '../data/reportsCatalog';
import { TaskModal } from '../components/TaskModal';
import { SectionHero } from '../components/SectionHero';
import { AiBox } from '../components/AiBox';
import { T } from '../utils/theme';
import { requestPermission, subscribeUser, sendPush } from '../utils/pushManager';

// ─── УТИЛИТЫ ───
function localDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function freqLabel(f) {
  if (!f || f === 'once') return 'разово';
  if (f === 'daily') return 'ежедневно';
  if (f === 'workdays') return 'пн–пт';
  if (f.startsWith('weekly:')) {
    const m = { 0:'вс',1:'пн',2:'вт',3:'ср',4:'чт',5:'пт',6:'сб' };
    return f.split(':')[1].split(',').map(n => m[n]).join(', ');
  }
  if (f.startsWith('every:')) return `каждые ${f.split(':')[1]} дн.`;
  if (f.startsWith('monthly:')) return `${f.split(':')[1]} числа`;
  return f;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target - today) / 86400000);
}

// ─── Вычисление дедлайна: конец периода + N дней ───
function calcDeadline(frequency, daysAfter) {
  const n = parseInt(daysAfter);
  if (!n || n <= 0) return '';
  const now = new Date();
  let periodEnd;
  if (frequency === 'monthly') {
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (frequency === 'quarterly') {
    const qEndMonths = [2, 5, 8, 11];
    const currentMonth = now.getMonth();
    const qEndMonth = qEndMonths.find(m => m >= currentMonth) ?? 11;
    periodEnd = new Date(now.getFullYear(), qEndMonth + 1, 0);
  } else if (frequency === 'annual') {
    periodEnd = new Date(now.getFullYear(), 11, 31);
  } else {
    return '';
  }
  const deadline = new Date(periodEnd);
  deadline.setDate(deadline.getDate() + n);
  return localDateStr(deadline);
}

// ─── SVG ИЛЛЮСТРАЦИЯ ───
function WorkIllustration() {
  return (
    <svg viewBox="0 0 360 120" style={{ width: '100%', height: 'auto', display: 'block', marginBottom: 20 }}>
      <defs>
        <radialGradient id="wbg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="rgba(0,112,192,0.12)" />
          <stop offset="100%" stopColor="rgba(0,112,192,0)" />
        </radialGradient>
      </defs>
      <ellipse cx="180" cy="60" rx="160" ry="50" fill="url(#wbg)" />
      <rect x="152" y="42" width="56" height="40" rx="6" fill="none" stroke="rgba(0,112,192,0.5)" strokeWidth="2" />
      <rect x="163" y="36" width="34" height="10" rx="4" fill="none" stroke="rgba(0,112,192,0.5)" strokeWidth="1.5" />
      <line x1="152" y1="58" x2="208" y2="58" stroke="rgba(0,112,192,0.4)" strokeWidth="1.5" />
      <line x1="180" y1="42" x2="180" y2="82" stroke="rgba(0,112,192,0.3)" strokeWidth="1" />
      {[[60,25],[270,28],[80,75],[280,72]].map(([x,y],i) => (
        <g key={i}>
          <rect x={x} y={y} width="28" height="36" rx="3" fill="none" stroke="rgba(200,164,90,0.4)" strokeWidth="1.2" />
          <line x1={x+5} y1={y+10} x2={x+23} y2={y+10} stroke="rgba(200,164,90,0.3)" strokeWidth="1" />
          <line x1={x+5} y1={y+16} x2={x+23} y2={y+16} stroke="rgba(200,164,90,0.3)" strokeWidth="1" />
          <line x1={x+5} y1={y+22} x2={x+18} y2={y+22} stroke="rgba(200,164,90,0.3)" strokeWidth="1" />
        </g>
      ))}
      {[[130,20],[230,18],[110,90],[250,88]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="2" fill="rgba(0,112,192,0.6)">
          <animate attributeName="opacity" values="0;1;0" dur={`${1.5+i*0.3}s`} begin={`${i*0.2}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <text x="180" y="108" textAnchor="middle" fontSize="10" fill="rgba(0,112,192,0.5)" fontFamily="'JetBrains Mono',monospace" letterSpacing="2">РАБОЧЕЕ ПРОСТРАНСТВО</text>
    </svg>
  );
}

// ─── ОСНОВНОЙ КОМПОНЕНТ ───
export function WorkSection() {
  const {
    profile, tasks, setTasks,
    selectedReports, toggleReport,
    customReportGroups,
    // ✅ ИСПРАВЛЕНО: используем новую атомарную функцию
    addReportToMyGroup,
    workTools, addWorkTool, updateWorkToolStep,
    aiRecommendations, setAiRecommendations,
    notify,
  } = useApp();

  const [workTab, setWorkTab] = useState('tasks');
  const [modal, setModal] = useState(null);
  const [catalogTab, setCatalogTab] = useState('kgd');
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [myReportsOpen, setMyReportsOpen] = useState(true);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customForm, setCustomForm] = useState({ name: '', frequency: 'quarterly', deadline: '', daysAfter: '' });
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedRecId, setExpandedRecId] = useState(null);
  const [savedRecs, setSavedRecs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('work_saved_recs') || '[]'); } catch { return []; }
  });
  const [pushStatus, setPushStatus] = useState('unknown');
  const [addToolModal, setAddToolModal] = useState(false);
  const [newTool, setNewTool] = useState({ title: '', description: '', steps: [''] });

  const today = localDateStr();

  useEffect(() => {
    if (!('Notification' in window)) { setPushStatus('unsupported'); return; }
    setPushStatus(Notification.permission);
  }, []);

  const fullCatalog = catalogTab === 'kgd' ? KGD_CATALOG : BNS_CATALOG;
  const filteredCatalog = fullCatalog.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.id.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedKgd = useMemo(() => KGD_CATALOG.filter(r => selectedReports.includes(r.id)), [selectedReports]);
  const selectedBns = useMemo(() => BNS_CATALOG.filter(r => selectedReports.includes(r.id)), [selectedReports]);

  const workTasks = tasks.filter(t => t.section === 'work');
  const todayWorkTasks = workTasks.filter(t => {
    if (t.doneDate === today) return true;
    if (!t.freq || !t.preferredTime) return false;
    const d = new Date(today + 'T00:00:00');
    if (t.freq === 'daily') return true;
    if (t.freq === 'workdays') { const dn = d.getDay(); return dn >= 1 && dn <= 5; }
    if (t.freq.startsWith('weekly:')) return t.freq.split(':')[1].split(',').map(Number).includes(d.getDay());
    return false;
  });

  const upcomingDeadlines = useMemo(() => {
    const result = [];
    const allSelected = [...selectedKgd, ...selectedBns];
    allSelected.forEach(r => {
      (r.deadlines2026 || []).forEach(dl => {
        const days = daysUntil(dl);
        if (days !== null && days >= 0 && days <= 14) {
          result.push({ name: r.name, deadline: dl, days, id: r.id });
        }
      });
    });
    return result.sort((a, b) => a.days - b.days);
  }, [selectedKgd, selectedBns]);

  const handleGetAI = async () => {
    setAiLoading(true);
    setAiRecommendations([]);
    try {
      const systemPrompt = `Ты строгий AI-консультант для бухгалтера/ИП в РК.
ПРАВИЛА:
1. Отвечай ТОЛЬКО валидным JSON массивом. Никакого текста до или после.
2. Формат объекта:
   {"id":"rec_1","title":"Название","summary":"Суть (1-2 предл.)","details":"Подробно","source":"Источник","tool":{"title":"Инструмент","description":"Назначение","steps":["Шаг 1","Шаг 2"]}}
3. Верни ровно 3 рекомендации по сферам:
   • Бухгалтерия/Налоги РК
   • 1С 8.3 / Excel / Автоматизация
   • Тайм-менеджмент / Продуктивность`;
      const userPrompt = `Профиль: ${profile?.profession || 'Бухгалтер'}. Сгенерируй 3 рекомендации.`;
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, maxTokens: 2048 })
      });
      const data = await res.json();
      if (data?.text) {
        const clean = data.text.replace(/```json/g,'').replace(/```/g,'').trim();
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed)) setAiRecommendations(parsed);
      }
    } catch (e) {
      notify('Ошибка загрузки рекомендаций');
    }
    setAiLoading(false);
  };

  const saveRec = (rec) => {
    const updated = savedRecs.find(r => r.id === rec.id)
      ? savedRecs.filter(r => r.id !== rec.id)
      : [...savedRecs, rec];
    setSavedRecs(updated);
    localStorage.setItem('work_saved_recs', JSON.stringify(updated));
    notify(savedRecs.find(r => r.id === rec.id) ? '🗑 Удалено из сохранённых' : '✅ Сохранено');
  };

  const addToolFromRec = (tool) => {
    if (!tool) return;
    addWorkTool({ title: tool.title, description: tool.description, steps: tool.steps.map(s => ({ text: s, completed: false })) });
    notify(`🔧 Инструмент «${tool.title}» добавлен`);
  };

  const handleEnablePush = async () => {
    const granted = await requestPermission();
    if (!granted) { notify('❌ Разрешение отклонено'); setPushStatus('denied'); return; }
    const sub = await subscribeUser();
    if (sub) {
      setPushStatus('granted');
      notify('🔔 Уведомления включены');
      await sendPush('Life Diary', 'Уведомления успешно подключены! ✅', 'setup');
    } else {
      notify('❌ Ошибка подписки');
    }
  };

  const handleTestPush = async () => {
    await sendPush('Life Diary · Работа', 'Тестовое уведомление работает! 🎉', 'test');
    notify('📨 Тест отправлен');
  };

  const TABS = [
    { id: 'tasks', label: '📋 Задачи' },
    { id: 'reports', label: '📊 Отчёты' },
    { id: 'tools', label: '🔧 Инструменты' },
    { id: 'ai', label: '✨ ИИ' },
  ];

  const FREQ_OPTIONS = [
    { v: 'monthly',   l: 'Ежемесячно',    hint: 'Конец месяца + N дней' },
    { v: 'quarterly', l: 'Ежеквартально', hint: 'Конец квартала + N дней' },
    { v: 'annual',    l: 'Ежегодно',       hint: '31 декабря + N дней' },
  ];

  return (
    <div>
      <SectionHero sectionId="work" />
      <WorkIllustration />

      {/* ─── Вкладки ─── */}
      <div style={{ display: 'flex', gap: 2, background: 'rgba(0,112,192,0.05)', border: `1px solid ${T.bdr}`, borderRadius: 12, padding: 4, marginBottom: 20 }}>
        {TABS.map(tab => (
          <div key={tab.id} onClick={() => setWorkTab(tab.id)}
            style={{ flex: 1, padding: '7px 4px', borderRadius: 9, cursor: 'pointer', textAlign: 'center', fontSize: 12, background: workTab === tab.id ? 'rgba(0,112,192,0.15)' : 'transparent', color: workTab === tab.id ? T.gold : T.text2, transition: 'all .18s', fontFamily: "'JetBrains Mono',monospace", letterSpacing: 0.3 }}
          >{tab.label}</div>
        ))}
      </div>

      {/* ════ ВКЛАДКА: ЗАДАЧИ ════ */}
      {workTab === 'tasks' && (
        <div>
          {todayWorkTasks.length > 0 && (
            <div style={{ padding: '12px 14px', background: 'rgba(0,112,192,0.05)', border: `1px solid rgba(0,112,192,0.2)`, borderRadius: 10, marginBottom: 14 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.info || '#0070c0', letterSpacing: 2, marginBottom: 8 }}>СЕГОДНЯ · РАБОТА</div>
              {todayWorkTasks.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div onClick={() => setTasks(p => p.map(x => x.id === t.id ? { ...x, doneDate: x.doneDate === today ? null : today } : x))}
                    style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${t.doneDate === today ? T.success : T.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: t.doneDate === today ? 'rgba(45,106,79,0.15)' : 'transparent', flexShrink: 0 }}>
                    {t.doneDate === today && <span style={{ fontSize: 11, color: '#2d6a4f' }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, color: t.doneDate === today ? T.text3 : T.text1, textDecoration: t.doneDate === today ? 'line-through' : 'none' }}>{t.title}</span>
                    {t.preferredTime && <span style={{ marginLeft: 8, fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono',monospace" }}>{t.preferredTime}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {upcomingDeadlines.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: 'var(--error)', letterSpacing: 2, marginBottom: 8 }}>⚠ БЛИЖАЙШИЕ ДЕДЛАЙНЫ</div>
              {upcomingDeadlines.map((dl, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 6, background: dl.days <= 3 ? 'rgba(139,32,32,0.06)' : 'rgba(0,112,192,0.04)', border: `1px solid ${dl.days <= 3 ? 'rgba(139,32,32,0.3)' : 'rgba(0,112,192,0.15)'}`, borderRadius: 8 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: dl.days <= 3 ? 'var(--error)' : T.text3, minWidth: 50 }}>
                    {dl.days === 0 ? 'СЕГОДНЯ' : dl.days === 1 ? 'ЗАВТРА' : `${dl.days} дн.`}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, color: T.text1 }}>{dl.name}</div>
                  <span className="badge bm">{dl.deadline}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.text3, letterSpacing: 2 }}>ВСЕ ЗАДАЧИ · {workTasks.length}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal({})}>+ Добавить</button>
            </div>
            {workTasks.length === 0 && (
              <div className="empty"><span className="empty-ico">💼</span><p>Нет рабочих задач</p></div>
            )}
            {workTasks.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', marginBottom: 6, background: 'rgba(0,112,192,0.03)', border: `1px solid ${T.bdr}`, borderRadius: 8 }}>
                <div onClick={() => setTasks(p => p.map(x => x.id === t.id ? { ...x, doneDate: x.doneDate === today ? null : today } : x))}
                  style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${t.doneDate === today ? T.success : T.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: t.doneDate === today ? 'rgba(45,106,79,0.15)' : 'transparent', flexShrink: 0 }}>
                  {t.doneDate === today && <span style={{ fontSize: 11, color: '#2d6a4f' }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: t.doneDate === today ? T.text3 : T.text1, textDecoration: t.doneDate === today ? 'line-through' : 'none' }}>{t.title}</div>
                  <div style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono',monospace" }}>
                    {freqLabel(t.freq)}{t.preferredTime ? ` · ${t.preferredTime}` : ''}{t.deadline ? ` · до ${t.deadline.split('T')[0]}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span onClick={() => setModal(t)} style={{ fontSize: 13, color: T.text3, cursor: 'pointer', opacity: 0.6 }}>✏️</span>
                  <span onClick={() => setTasks(p => p.filter(x => x.id !== t.id))} style={{ fontSize: 13, color: T.text3, cursor: 'pointer', opacity: 0.5 }}>✕</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '12px 14px', background: 'rgba(0,112,192,0.04)', border: `1px solid rgba(0,112,192,0.15)`, borderRadius: 10 }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.info || '#0070c0', letterSpacing: 2, marginBottom: 10 }}>🔔 PUSH-УВЕДОМЛЕНИЯ</div>
            <div style={{ fontSize: 12, color: T.text2, marginBottom: 10 }}>
              Статус: <strong style={{ color: pushStatus === 'granted' ? '#2d6a4f' : pushStatus === 'denied' ? 'var(--error)' : T.gold }}>
                {pushStatus === 'granted' ? '✅ Включены' : pushStatus === 'denied' ? '❌ Заблокированы' : pushStatus === 'unsupported' ? '⚠️ Не поддерживается' : '⏳ Не настроены'}
              </strong>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {pushStatus !== 'granted' && pushStatus !== 'denied' && pushStatus !== 'unsupported' && (
                <button className="btn btn-ghost btn-sm" onClick={handleEnablePush}>🔔 Включить уведомления</button>
              )}
              {pushStatus === 'granted' && (
                <button className="btn btn-ghost btn-sm" onClick={handleTestPush}>📨 Тест</button>
              )}
              {pushStatus === 'denied' && (
                <div style={{ fontSize: 12, color: 'var(--error)', lineHeight: 1.5 }}>
                  Разрешите уведомления вручную в настройках браузера для этого сайта.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════ ВКЛАДКА: ОТЧЁТЫ ════ */}
      {workTab === 'reports' && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <div onClick={() => setMyReportsOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: myReportsOpen ? '12px 12px 0 0' : 12, cursor: 'pointer', background: 'rgba(0,112,192,0.05)', border: `1px solid rgba(0,112,192,0.2)` }}>
              <span style={{ fontSize: 16 }}>📋</span>
              <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.info || '#0070c0', fontWeight: 500 }}>
                Мои отчёты ({selectedKgd.length + selectedBns.length + customReportGroups.reduce((acc, g) => acc + g.reports.length, 0)})
              </span>
              <span style={{ fontSize: 11, color: T.text3 }}>{myReportsOpen ? '▲' : '▼'}</span>
            </div>
            {myReportsOpen && (
              <div style={{ border: `1px solid rgba(0,112,192,0.15)`, borderTop: 'none', borderRadius: '0 0 12px 12px', padding: 12 }}>
                {selectedKgd.length === 0 && selectedBns.length === 0 && customReportGroups.every(g => g.reports.length === 0) && (
                  <div className="empty"><span className="empty-ico">📊</span><p>Выберите отчёты из каталога</p></div>
                )}
                {selectedKgd.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.text3, letterSpacing: 2, marginBottom: 8 }}>КГД</div>
                    {selectedKgd.map(r => {
                      const nearest = (r.deadlines2026 || []).find(dl => daysUntil(dl) >= 0);
                      const days = nearest ? daysUntil(nearest) : null;
                      return (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 4, background: 'rgba(0,112,192,0.03)', border: `1px solid ${T.bdr}`, borderRadius: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, color: T.text1 }}>{r.name}</div>
                            <div style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono',monospace" }}>{r.id}</div>
                          </div>
                          {days !== null && (
                            <span className={`badge ${days <= 3 ? 'bgr' : 'bm'}`}>{days === 0 ? 'Сегодня' : `${days} дн.`}</span>
                          )}
                          <span onClick={() => toggleReport(r.id)} style={{ fontSize: 12, color: T.text3, cursor: 'pointer', opacity: 0.5 }}>✕</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {selectedBns.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.text3, letterSpacing: 2, marginBottom: 8 }}>БНС</div>
                    {selectedBns.map(r => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 4, background: 'rgba(0,112,192,0.03)', border: `1px solid ${T.bdr}`, borderRadius: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: T.text1 }}>{r.name}</div>
                          <div style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono',monospace" }}>{r.id}</div>
                        </div>
                        <span onClick={() => toggleReport(r.id)} style={{ fontSize: 12, color: T.text3, cursor: 'pointer', opacity: 0.5 }}>✕</span>
                      </div>
                    ))}
                  </div>
                )}
                {customReportGroups.map(g => g.reports.length > 0 && (
                  <div key={g.id} style={{ marginBottom: 8 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.text3, letterSpacing: 2, marginBottom: 8 }}>МОИ ОТЧЁТЫ</div>
                    {g.reports.map(r => (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', marginBottom: 4, background: 'rgba(200,164,90,0.04)', border: `1px solid rgba(200,164,90,0.2)`, borderRadius: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: T.text1 }}>{r.name}</div>
                          <div style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono',monospace" }}>
                            {freqLabel(r.frequency)} · до {r.deadline}
                            {r.daysAfter && <span style={{ marginLeft: 4 }}>({r.daysAfter} дн. после периода)</span>}
                            {daysUntil(r.deadline) !== null && (
                              <span style={{ marginLeft: 6, color: daysUntil(r.deadline) <= 3 ? 'var(--error)' : T.text3 }}>
                                · {daysUntil(r.deadline) <= 0 ? '⚠ просрочен' : `${daysUntil(r.deadline)} дн.`}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="badge bt">{freqLabel(r.frequency)}</span>
                      </div>
                    ))}
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setShowCustomModal(true)}>+ Добавить свой отчёт</button>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <div onClick={() => setCatalogOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: catalogOpen ? '12px 12px 0 0' : 12, cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.bdr}` }}>
              <span style={{ fontSize: 16 }}>🏛</span>
              <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.text1, fontWeight: 500 }}>Каталог форм КГД / БНС</span>
              <span style={{ fontSize: 11, color: T.text3 }}>{catalogOpen ? '▲' : '▼'}</span>
            </div>
            {catalogOpen && (
              <div style={{ border: `1px solid ${T.bdr}`, borderTop: 'none', borderRadius: '0 0 12px 12px', padding: 12 }}>
                <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.04)', borderRadius: 8, padding: 3, marginBottom: 10 }}>
                  {[['kgd','🏛 КГД'],['bns','📊 БНС']].map(([v,l]) => (
                    <div key={v} onClick={() => setCatalogTab(v)}
                      style={{ flex: 1, padding: '6px', borderRadius: 6, cursor: 'pointer', textAlign: 'center', fontSize: 13, background: catalogTab === v ? 'rgba(0,112,192,0.15)' : 'transparent', color: catalogTab === v ? T.gold : T.text2, transition: 'all .15s' }}>
                      {l}
                    </div>
                  ))}
                </div>
                <input
                  placeholder="Поиск по названию или коду..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', marginBottom: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.bdr}`, borderRadius: 8, color: T.text0, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {filteredCatalog.map(r => {
                    const isSelected = selectedReports.includes(r.id);
                    return (
                      <div key={r.id} onClick={() => toggleReport(r.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid rgba(255,255,255,0.04)`, cursor: 'pointer' }}>
                        <div style={{ width: 16, height: 16, borderRadius: 3, border: `1.5px solid ${isSelected ? T.success : T.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: T.success, flexShrink: 0, background: isSelected ? 'rgba(45,106,79,0.15)' : 'transparent' }}>
                          {isSelected ? '✓' : ''}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: T.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                          <div style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono',monospace" }}>{r.id}</div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredCatalog.length === 0 && (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: T.text3, fontSize: 13 }}>Ничего не найдено</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════ ВКЛАДКА: ИНСТРУМЕНТЫ ════ */}
      {workTab === 'tools' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.text3, letterSpacing: 2 }}>АКТИВНЫЕ ИНСТРУМЕНТЫ · {workTools.length}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setAddToolModal(true)}>+ Добавить</button>
          </div>
          {workTools.length === 0 && (
            <div className="empty"><span className="empty-ico">🔧</span><p>Нет инструментов. Добавьте вручную или из ИИ-рекомендаций.</p></div>
          )}
          {workTools.map(tool => {
            const doneSteps = (tool.steps || []).filter(s => s.completed).length;
            const totalSteps = (tool.steps || []).length;
            const pct = totalSteps > 0 ? Math.round(doneSteps / totalSteps * 100) : 0;
            return (
              <div key={tool.id} style={{ padding: '12px 14px', marginBottom: 10, background: 'rgba(0,112,192,0.04)', border: `1px solid rgba(0,112,192,0.15)`, borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 16, color: T.text0 }}>🔧 {tool.title}</div>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: pct === 100 ? '#2d6a4f' : T.gold }}>{pct}%</span>
                </div>
                {tool.description && (
                  <div style={{ fontSize: 12, color: T.text2, marginBottom: 8, lineHeight: 1.5 }}>{tool.description}</div>
                )}
                {totalSteps > 0 && (
                  <>
                    <div style={{ height: 4, background: 'rgba(0,112,192,0.1)', borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, #0070c0, ${T.gold})`, borderRadius: 3, transition: 'width 0.4s' }} />
                    </div>
                    {(tool.steps || []).map((step, si) => (
                      <div key={si} onClick={() => updateWorkToolStep(tool.id, si, !step.completed)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer', borderBottom: si < tool.steps.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none' }}>
                        <div style={{ width: 15, height: 15, borderRadius: 3, border: `1.5px solid ${step.completed ? T.success : T.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: T.success, flexShrink: 0, background: step.completed ? 'rgba(45,106,79,0.15)' : 'transparent' }}>
                          {step.completed ? '✓' : ''}
                        </div>
                        <span style={{ fontSize: 12, color: step.completed ? T.text3 : T.text2, textDecoration: step.completed ? 'line-through' : 'none' }}>
                          {typeof step === 'string' ? step : step.text}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })}
          {savedRecs.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.text3, letterSpacing: 2, marginBottom: 10 }}>💾 СОХРАНЁННЫЕ РЕКОМЕНДАЦИИ · {savedRecs.length}</div>
              {savedRecs.map(rec => (
                <div key={rec.id} style={{ padding: '10px 12px', marginBottom: 8, background: 'rgba(200,164,90,0.05)', border: `1px solid rgba(200,164,90,0.2)`, borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, color: T.text1, fontWeight: 500 }}>{rec.title}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {rec.tool && <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }} onClick={() => addToolFromRec(rec.tool)}>+ В инструменты</button>}
                      <span onClick={() => saveRec(rec)} style={{ fontSize: 12, color: T.text3, cursor: 'pointer', opacity: 0.5 }}>✕</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5 }}>{rec.summary}</div>
                  <div style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono',monospace", marginTop: 4 }}>{rec.source}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════ ВКЛАДКА: ИИ ════ */}
      {workTab === 'ai' && (
        <div>
          <button className="btn btn-primary" onClick={handleGetAI} disabled={aiLoading}
            style={{ width: '100%', marginBottom: 16, opacity: aiLoading ? 0.7 : 1 }}>
            {aiLoading ? '✦ Генерирую рекомендации...' : '✨ Получить рекомендации'}
          </button>
          {aiRecommendations.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.text3, letterSpacing: 2, marginBottom: 10 }}>РЕКОМЕНДАЦИИ ИИ</div>
              {aiRecommendations.map(rec => {
                const isExpanded = expandedRecId === rec.id;
                const isSaved = savedRecs.find(r => r.id === rec.id);
                return (
                  <div key={rec.id} style={{ marginBottom: 10, padding: '12px 14px', background: 'rgba(0,112,192,0.04)', border: `1px solid rgba(0,112,192,0.15)`, borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 15, color: T.text0, flex: 1, paddingRight: 8 }}>{rec.title}</div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => saveRec(rec)}
                          style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid ${isSaved ? T.gold : T.bdr}`, background: isSaved ? 'rgba(200,164,90,0.15)' : 'transparent', color: isSaved ? T.gold : T.text3, cursor: 'pointer', fontSize: 11 }}>
                          {isSaved ? '✅' : '💾'}
                        </button>
                        {rec.tool && (
                          <button onClick={() => addToolFromRec(rec.tool)}
                            style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid rgba(0,112,192,0.3)`, background: 'rgba(0,112,192,0.08)', color: T.info || '#0070c0', cursor: 'pointer', fontSize: 11 }}>
                            🔧
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5, marginBottom: 6 }}>{rec.summary}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono',monospace" }}>{rec.source}</span>
                      <span onClick={() => setExpandedRecId(isExpanded ? null : rec.id)} style={{ fontSize: 11, color: T.gold, cursor: 'pointer' }}>
                        {isExpanded ? '▲ Скрыть' : '▼ Подробнее'}
                      </span>
                    </div>
                    {isExpanded && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid rgba(255,255,255,0.06)` }}>
                        <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.6, marginBottom: rec.tool ? 10 : 0 }}>{rec.details}</div>
                        {rec.tool && (
                          <div style={{ padding: '8px 10px', background: 'rgba(0,112,192,0.06)', borderRadius: 8, borderLeft: `3px solid rgba(0,112,192,0.4)` }}>
                            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.info || '#0070c0', letterSpacing: 1, marginBottom: 4 }}>🔧 {rec.tool.title}</div>
                            <div style={{ fontSize: 12, color: T.text2, marginBottom: 6 }}>{rec.tool.description}</div>
                            {(rec.tool.steps || []).map((step, si) => (
                              <div key={si} style={{ fontSize: 12, color: T.text2, marginBottom: 3, paddingLeft: 8 }}>
                                <span style={{ color: T.gold, marginRight: 6 }}>{si + 1}.</span>{step}
                              </div>
                            ))}
                            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => addToolFromRec(rec.tool)}>
                              + Добавить в инструменты
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <AiBox
            kb={`Профессия: ${profile?.profession || 'Бухгалтер'}. РК, 2026 год.`}
            prompt={`Профессия: ${profile?.profession || 'Бухгалтер'}. Задай мне вопрос по рабочим процессам или ответь на мой запрос.`}
            label="Спросить ИИ"
            btnText="Задать вопрос"
            placeholder="Анализирую рабочий профиль..."
          />
        </div>
      )}

      {/* ─── Модалка добавления инструмента ─── */}
      {addToolModal && (
        <div className="overlay" onClick={() => setAddToolModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <span className="modal-x" onClick={() => setAddToolModal(false)}>✕</span>
            <div className="modal-title">Новый инструмент</div>
            <div className="fld">
              <label>Название</label>
              <input placeholder="Шаблон сверки, чек-лист..." value={newTool.title} onChange={e => setNewTool(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="fld">
              <label>Описание</label>
              <textarea value={newTool.description} onChange={e => setNewTool(p => ({ ...p, description: e.target.value }))} placeholder="Для чего этот инструмент..." />
            </div>
            <div className="fld">
              <label>Шаги</label>
              {newTool.steps.map((step, si) => (
                <div key={si} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input value={step} onChange={e => setNewTool(p => ({ ...p, steps: p.steps.map((s, i) => i === si ? e.target.value : s) }))} placeholder={`Шаг ${si + 1}`} style={{ flex: 1 }} />
                  {newTool.steps.length > 1 && <span onClick={() => setNewTool(p => ({ ...p, steps: p.steps.filter((_, i) => i !== si) }))} style={{ cursor: 'pointer', color: T.text3, alignSelf: 'center' }}>✕</span>}
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={() => setNewTool(p => ({ ...p, steps: [...p.steps, ''] }))}>+ Добавить шаг</button>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setAddToolModal(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={() => {
                if (!newTool.title.trim()) return;
                addWorkTool({ title: newTool.title, description: newTool.description, steps: newTool.steps.filter(s => s.trim()).map(s => ({ text: s, completed: false })) });
                setAddToolModal(false);
                setNewTool({ title: '', description: '', steps: [''] });
                notify('🔧 Инструмент добавлен');
              }}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Модалка добавления своего отчёта ─── */}
      {showCustomModal && (
        <div className="overlay" onClick={() => setShowCustomModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <span className="modal-x" onClick={() => setShowCustomModal(false)}>✕</span>
            <div className="modal-title">Добавить отчёт</div>

            <div className="fld">
              <label>Название формы</label>
              <input
                placeholder="Название отчёта..."
                value={customForm.name}
                onChange={e => setCustomForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="fld">
              <label>Периодичность</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                {FREQ_OPTIONS.map(({ v, l, hint }) => {
                  const isActive = customForm.frequency === v;
                  return (
                    <div
                      key={v}
                      onClick={() => setCustomForm(p => ({
                        ...p,
                        frequency: v,
                        deadline: calcDeadline(v, p.daysAfter),
                      }))}
                      style={{
                        padding: '8px 14px', borderRadius: 10, cursor: 'pointer', userSelect: 'none',
                        border: `1.5px solid ${isActive ? '#0070c0' : T.bdr}`,
                        background: isActive ? 'rgba(0,112,192,0.1)' : 'rgba(255,255,255,0.02)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? '#0070c0' : T.text1 }}>{l}</div>
                      <div style={{ fontSize: 10, color: isActive ? '#0070c0' : T.text3, marginTop: 2, opacity: 0.8 }}>{hint}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="fld">
              <label>Дней после окончания периода</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="number"
                  min="1"
                  max="365"
                  placeholder="Например: 15"
                  value={customForm.daysAfter}
                  onChange={e => {
                    const daysAfter = e.target.value;
                    const deadline = calcDeadline(customForm.frequency, daysAfter);
                    setCustomForm(p => ({ ...p, daysAfter, deadline }));
                  }}
                  style={{ width: 120 }}
                />
                {[15, 30, 60, 90].map(n => (
                  <div
                    key={n}
                    onClick={() => {
                      const daysAfter = String(n);
                      const deadline = calcDeadline(customForm.frequency, daysAfter);
                      setCustomForm(p => ({ ...p, daysAfter, deadline }));
                    }}
                    style={{
                      padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, userSelect: 'none',
                      border: `1px solid ${customForm.daysAfter === String(n) ? '#0070c0' : T.bdr}`,
                      background: customForm.daysAfter === String(n) ? 'rgba(0,112,192,0.1)' : 'transparent',
                      color: customForm.daysAfter === String(n) ? '#0070c0' : T.text2,
                      transition: 'all 0.15s',
                    }}
                  >
                    {n}
                  </div>
                ))}
              </div>

              {customForm.deadline && customForm.daysAfter && (
                <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(0,112,192,0.06)', borderRadius: 8, borderLeft: '3px solid rgba(0,112,192,0.4)' }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.text3, marginBottom: 4, letterSpacing: 1 }}>СРОК СДАЧИ</div>
                  <div style={{ fontSize: 16, color: '#0070c0', fontWeight: 700 }}>{customForm.deadline}</div>
                  <div style={{ fontSize: 11, color: T.text3, marginTop: 3 }}>
                    {(() => {
                      const days = daysUntil(customForm.deadline);
                      if (days === null) return '';
                      if (days < 0) return '⚠ Срок уже прошёл';
                      if (days === 0) return '⚠ Сегодня!';
                      return `До срока: ${days} дн.`;
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setShowCustomModal(false)}>Отмена</button>
              <button
                className="btn btn-primary"
                disabled={!customForm.name.trim() || !customForm.deadline || !customForm.daysAfter}
                onClick={() => {
                  if (!customForm.name.trim() || !customForm.deadline) return;
                  // ✅ ИСПРАВЛЕНО: атомарное добавление через новую функцию
                  addReportToMyGroup({
                    name: customForm.name,
                    frequency: customForm.frequency,
                    deadline: customForm.deadline,
                    daysAfter: customForm.daysAfter,
                  });
                  setShowCustomModal(false);
                  setCustomForm({ name: '', frequency: 'quarterly', deadline: '', daysAfter: '' });
                  notify('📋 Отчёт добавлен');
                }}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {modal !== null && (
        <TaskModal
          task={modal?.id ? modal : null}
          defaultSection="work"
          onSave={t => { setTasks(p => modal?.id ? p.map(x => x.id === t.id ? t : x) : [...p, t]); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
