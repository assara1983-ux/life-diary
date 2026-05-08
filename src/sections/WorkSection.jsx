// src/sections/WorkSection.jsx
import { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { KGD_CATALOG, BNS_CATALOG } from '../data/reportsCatalog';
import { TaskModal } from '../components/TaskModal';
import { T } from '../utils/theme';

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function toDay(d = new Date()) { return d.toISOString().split('T')[0]; }

function freqLabel(f) {
  if (!f || f === 'once') return 'разово';
  if (f === 'daily') return 'ежедневно';
  if (f === 'workdays') return 'пн–пт';
  if (f.startsWith('weekly:')) {
    const m = { 0: 'вс', 1: 'пн', 2: 'вт', 3: 'ср', 4: 'чт', 5: 'пт', 6: 'сб' };
    return f.split(':')[1].split(',').map(n => m[n]).join(', ');
  }
  if (f.startsWith('every:')) return `каждые ${f.split(':')[1]} дн.`;
  if (f.startsWith('monthly:')) return `${f.split(':')[1]} числа`;
  return f;
}

// --- КОМПОНЕНТ АККОРДЕОНА ---
const Accordion = ({ id, title, icon, count, children, onAdd }) => {
  const { collapsedSections, toggleSection } = useApp();
  const isOpen = !collapsedSections[id];

  return (
    <div style={{ marginBottom: 12, borderRadius: 12, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.02)' }}>
      <div 
        onClick={() => toggleSection(id)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', cursor: 'pointer', borderBottom: isOpen ? `1px solid ${T.border}` : 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: T.text0 }}>{title}</span>
          {count > 0 && <span style={{ fontSize: 11, background: T.accent, color: '#000', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>{count}</span>}
        </div>
        <span style={{ fontSize: 12, color: T.text3, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </div>
      
      {isOpen && (
        <div style={{ padding: '10px 14px' }}>
          {children}
          {onAdd && (
            <button onClick={(e) => { e.stopPropagation(); onAdd(); }} 
              style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 8, border: `1px dashed ${T.accent}`, background: 'transparent', color: T.accent, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
              ✚ Добавить форму
            </button>          )}
        </div>
      )}
    </div>
  );
};

export function WorkSection() {
  const { 
    profile, tasks, setTasks, 
    selectedReports, toggleReport, 
    customReportGroups, addCustomGroup, addCustomReport,
    workTools, addWorkTool, updateWorkToolStep,
    aiRecommendations, setAiRecommendations
  } = useApp();

  const [workTab, setWorkTab] = useState('reports');
  const [modal, setModal] = useState(null);
  
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogTab, setCatalogTab] = useState('kgd');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customForm, setCustomForm] = useState({ name: '', frequency: 'quarterly', deadline: '' });

  const [aiLoading, setAiLoading] = useState(false);
  const [expandedRecId, setExpandedRecId] = useState(null);

  const today = toDay();

  // --- ЛОГИКА КАТАЛОГА ---
  const fullCatalog = catalogTab === 'kgd' ? KGD_CATALOG : BNS_CATALOG;
  const filteredCatalog = fullCatalog.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedKgd = useMemo(() => KGD_CATALOG.filter(r => selectedReports.includes(r.id)), [selectedReports]);
  const selectedBns = useMemo(() => BNS_CATALOG.filter(r => selectedReports.includes(r.id)), [selectedReports]);

  // --- ЛОГИКА AI ---
  const handleGetAI = async () => {
    setAiLoading(true);
    setAiRecommendations([]);
    try {
      const systemPrompt = `Ты строгий AI-консультант для бухгалтера/ИП в РК.
ПРАВИЛА ОТВЕТА:
1. Отвечай ТОЛЬКО валидным JSON массивом объектов. Никакого текста до или после JSON.
2. Формат каждого объекта строго:   {
     "id": "rec_1",
     "title": "Краткое название",
     "summary": "Суть и польза (1-2 предложения)",
     "details": "Подробное описание",
     "source": "Источник (НК РК, ТКМ, официальный сайт)",
     "tool": { "title": "Название инструмента", "description": "Назначение", "steps": ["Шаг 1", "Шаг 2"] }
   }
3. ТЕМЫ: Бухгалтерия (отчетность, налоги, документы) + ЛИЧНАЯ ЭФФЕКТИВНОСТЬ (тайм-менеджмент, мозговой штурм, техники запоминания, фокус).
4. Минимум фантазии. Только проверенные методы на 2026 год. Без воды.
5. Если данных недостаточно — верни пустой массив [].`;

      const prof = profile?.profession || 'Бухгалтер';
      const userPrompt = `Профиль: ${prof}. Дай 3 рекомендации: можно по бухгалтерии, можно по тайм-менеджменту, мозговому штурму или запоминанию.`;

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, maxTokens: 2048 })
      });

      const data = await res.json();
      if (data?.text) {
        let clean = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed)) {
          setAiRecommendations(parsed);
        } else {
          throw new Error('Неверная структура');
        }
      }
    } catch (e) {
      console.error(e);
      setAiRecommendations([{ id: 'fallback-1', title: 'Ошибка загрузки', summary: 'Попробуйте позже', details: '', source: '', tool: null }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateToolFromAI = (rec) => {
    if (rec.tool) {
      addWorkTool({
        title: rec.tool.title,
        description: rec.tool.description || rec.summary,
        steps: (rec.tool.steps || ['Шаг 1']).map(s => ({ text: s, completed: false }))
      });
      setExpandedRecId(null);
    }
  };
  return (
    <div>
      {/* Шапка */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        {profile.profession && <span style={{ fontSize: 13, color: T.text1, fontWeight: 500 }}>💼 {profile.profession}</span>}
        <span style={{ fontSize: 12, color: T.gold, marginLeft: 'auto' }}>🕐 {profile.workStart || '09:00'}–{profile.workEnd || '18:00'}</span>
      </div>

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[{ id: 'reports', label: '📋 Отчётность' }, { id: 'tools', label: '🛠 Инструменты' }].map(tab => (
          <button key={tab.id} onClick={() => setWorkTab(tab.id)}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: `1px solid ${workTab === tab.id ? T.accent + '88' : T.border}`, background: workTab === tab.id ? 'rgba(200,164,90,0.12)' : 'transparent', color: workTab === tab.id ? T.gold : T.text2, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* - ВКЛАДКА: ОТЧЁТНОСТЬ - */}
      {workTab === 'reports' && (
        <div>
          {/* Мои отчёты */}
          <Accordion id="custom-reports" title="Мои отчёты" icon="📝" count={customReportGroups.length} onAdd={() => setShowCustomModal(true)}>
            {customReportGroups.length === 0 ? (
              <div style={{ fontSize: 12, color: T.text3, textAlign: 'center', padding: '10px 0' }}>Список пуст. Создайте свою группу отчетов.</div>
            ) : customReportGroups.map(group => (
              <div key={group.id} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text0, marginBottom: 4 }}>📂 {group.name}</div>
                {group.reports.map(r => (
                  <div key={r.id} style={{ padding: '6px 0', borderBottom: `1px solid ${T.border}`, fontSize: 13, color: T.text1 }}>
                    • {r.name} <span style={{fontSize: 10, color: T.text3}}>({freqLabel(r.frequency)})</span>
                  </div>
                ))}
              </div>
            ))}
          </Accordion>

          {/* КГД */}
          <Accordion id="kgd-reports" title="🏛 КГД" icon="🏛" count={selectedKgd.length} onAdd={() => { setCatalogTab('kgd'); setShowCatalog(true); }}>
            {selectedKgd.length === 0 ? (
              <div style={{ fontSize: 12, color: T.text3, textAlign: 'center', padding: '10px 0' }}>Нет выбранных форм.</div>
            ) : selectedKgd.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.text0 }}>{r.name}</div>
                  <div style={{ fontSize: 10, color: T.text3 }}>{r.id} • {freqLabel(r.frequency)}</div>
                </div>
                <button onClick={() => toggleReport(r.id)} style={{ color: T.error, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
            ))}          </Accordion>

          {/* БНС */}
          <Accordion id="bns-reports" title="📊 БНС" icon="" count={selectedBns.length} onAdd={() => { setCatalogTab('bns'); setShowCatalog(true); }}>
            {selectedBns.length === 0 ? (
              <div style={{ fontSize: 12, color: T.text3, textAlign: 'center', padding: '10px 0' }}>Нет выбранных форм.</div>
            ) : selectedBns.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.text0 }}>{r.name}</div>
                  <div style={{ fontSize: 10, color: T.text3 }}>{r.id} • {freqLabel(r.frequency)}</div>
                </div>
                <button onClick={() => toggleReport(r.id)} style={{ color: T.error, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
            ))}
          </Accordion>

          {/* Задачи */}
          <div style={{ marginBottom: 12, marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, cursor: 'pointer', background: 'rgba(78,201,190,0.06)', border: `1px solid ${T.teal}33` }} onClick={() => setModal({})}>
              <span style={{ fontSize: 16 }}>📋</span>
              <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.teal, fontWeight: 500 }}>Обычные задачи</span>
              <button style={{ fontSize: 12, padding: '2px 8px', color: T.teal, background: 'none', border: 'none', cursor: 'pointer' }}>+</button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.01)', border: `1px solid ${T.teal}22`, borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '4px 0' }}>
              {tasks.filter(t => t.section === 'work' && t.type !== 'report').slice(0, 5).map(task => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${task.doneDate === today ? T.teal : T.text3}`, background: task.doneDate === today ? T.teal : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#000' }}>
                    {task.doneDate === today ? '✓' : ''}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, color: task.doneDate === today ? T.text3 : T.text0, textDecoration: task.doneDate === today ? 'line-through' : 'none' }}>{task.title}</div>
                </div>
              ))}
              {tasks.filter(t => t.section === 'work' && t.type !== 'report').length === 0 && <div style={{ padding: 10, fontSize: 12, color: T.text3, textAlign: 'center' }}>Задач нет</div>}
            </div>
          </div>

          {/* AI Рекомендации */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'rgba(200,164,90,0.06)', border: `1px solid ${T.gold}33` }}>
              <span style={{ fontSize: 16 }}>💡</span>
              <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.gold, fontWeight: 500 }}>AI Рекомендации</span>
            </div>
            <div style={{ border: `1px solid ${T.gold}22`, borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ padding: 14 }}>
                <p style={{ fontSize: 13, color: T.text1, margin: '0 0 12px', lineHeight: 1.5 }}>
                  Рекомендации сохраняются до нового запроса.
                </p>
                <button 
                  onClick={handleGetAI}                  disabled={aiLoading}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: 'none', background: aiLoading ? T.text3 : T.gold, color: '#000', fontWeight: 600, cursor: aiLoading ? 'wait' : 'pointer' }}
                >
                  {aiLoading ? ' Генерация...' : '✨ Получить рекомендации'}
                </button>
              </div>

              {aiRecommendations?.length > 0 && (
                <div style={{ borderTop: `1px solid ${T.border}` }}>
                  {aiRecommendations.map(rec => {
                    const isExpanded = expandedRecId === rec.id;
                    return (
                      <div key={rec.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <div 
                          onClick={() => setExpandedRecId(isExpanded ? null : rec.id)}
                          style={{ padding: '12px 14px', cursor: 'pointer', background: isExpanded ? 'rgba(200,164,90,0.05)' : 'transparent' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: T.text0, marginBottom: 4 }}>{rec.title}</div>
                              <div style={{ fontSize: 12, color: T.text2 }}>{rec.summary}</div>
                            </div>
                            <span style={{ fontSize: 12, color: T.text3 }}>{isExpanded ? '▲' : '▼'}</span>
                          </div>
                        </div>
                        {isExpanded && (
                          <div style={{ padding: '0 14px 14px', fontSize: 13, color: T.text1, lineHeight: 1.5 }}>
                            <div style={{ marginBottom: 8, padding: 8, borderRadius: 6, background: 'rgba(255,255,255,0.03)', borderLeft: `2px solid ${T.accent}` }}>
                              <strong>📖 Подробно:</strong> {rec.details}
                            </div>
                            {rec.source && <div style={{ fontSize: 11, color: T.text3, marginBottom: 10, fontStyle: 'italic' }}>📚 Источник: {rec.source}</div>}
                            {rec.tool && (
                              <button 
                                onClick={() => handleCreateToolFromAI(rec)}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${T.accent}`, background: 'transparent', color: T.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                              >
                                ✦ Создать инструмент: {rec.tool.title}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* - ВКЛАДКА: ИНСТРУМЕНТЫ - */}
      {workTab === 'tools' && (
        <div>
          {workTools.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: T.text3 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🛠</div>
              <div>Инструментов пока нет.</div>
            </div>
          ) : workTools.map(tool => (
            <div key={tool.id} style={{ marginBottom: 10, padding: 14, borderRadius: 12, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text0, marginBottom: 6 }}>{tool.title}</div>
              <div style={{ fontSize: 12, color: T.text1, marginBottom: 8 }}>{tool.description}</div>
              {tool.steps?.map((step, idx) => (
                <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.text3, marginBottom: 4, cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={step.completed || false} 
                    onChange={(e) => updateWorkToolStep(tool.id, idx, e.target.checked)}
                    style={{ width: 14, height: 14, cursor: 'pointer' }}
                  />
                  <span style={{ textDecoration: step.completed ? 'line-through' : 'none', color: step.completed ? T.text4 : T.text3 }}>
                    {typeof step === 'string' ? step : step.text}
                  </span>
                </label>
              ))}
              {tool.steps?.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 10, color: T.text4 }}>
                  Прогресс: {tool.steps.filter(s => (typeof s === 'string' ? false : s.completed)).length} / {tool.steps.length}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* --- МОДАЛЬНЫЕ ОКНА --- */}
      
      {/* 1. Каталог форм */}
      {showCatalog && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.7)', 
            zIndex: 1000, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: 16           }} 
          onClick={() => setShowCatalog(false)}
        >
          <div 
            style={{ 
              background: T.bg || '#1a1a2e', 
              width: '100%', 
              maxWidth: 500, 
              maxHeight: '85vh', 
              borderRadius: 16, 
              padding: 20, 
              display: 'flex', 
              flexDirection: 'column',
              zIndex: 1001,
              border: `1px solid ${T.border || '#333'}`
            }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#fff', fontWeight: 600 }}>Каталог форм</h3>
              <button onClick={() => setShowCatalog(false)} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={() => setCatalogTab('kgd')} style={{ flex: 1, padding: 8, borderRadius: 8, border: `1px solid ${catalogTab === 'kgd' ? T.accent : '#333'}`, background: catalogTab === 'kgd' ? (T.accent || '#c8a45a') : 'transparent', color: catalogTab === 'kgd' ? '#000' : '#ccc', cursor: 'pointer' }}> КГД</button>
              <button onClick={() => setCatalogTab('bns')} style={{ flex: 1, padding: 8, borderRadius: 8, border: `1px solid ${catalogTab === 'bns' ? T.accent : '#333'}`, background: catalogTab === 'bns' ? (T.accent || '#c8a45a') : 'transparent', color: catalogTab === 'bns' ? '#000' : '#ccc', cursor: 'pointer' }}>📊 БНС</button>
            </div>
            <input 
              placeholder="Поиск..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              style={{ 
                width: '100%', 
                padding: 10, 
                marginBottom: 12, 
                borderRadius: 8, 
                border: `1px solid ${T.border || '#333'}`, 
                background: 'rgba(255,255,255,0.1)', 
                color: '#fff',
                outline: 'none'
              }} 
            />
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
              {filteredCatalog.map(r => {
                const isSelected = selectedReports.includes(r.id);
                return (
                  <div key={r.id} onClick={() => toggleReport(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${T.border || '#333'}`, cursor: 'pointer' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSelected ? (T.accent || '#c8a45a') : '#555'}`, background: isSelected ? (T.accent || '#c8a45a') : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: 12, flexShrink: 0 }}>{isSelected && '✓'}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#fff', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                      <div style={{ fontSize: 10, color: '#aaa' }}>{r.id}</div>                    </div>
                  </div>
                );
              })}
              {filteredCatalog.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: '#aaa', fontSize: 13 }}>
                  Ничего не найдено
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Добавить отчет */}
      {showCustomModal && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.7)', 
            zIndex: 1000, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: 16 
          }} 
          onClick={() => setShowCustomModal(false)}
        >
          <div 
            style={{ 
              background: T.bg || '#1a1a2e', 
              width: '100%', 
              maxWidth: 400, 
              borderRadius: 16, 
              padding: 20, 
              zIndex: 1001, 
              border: `1px solid ${T.border || '#333'}` 
            }} 
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px', color: '#fff', fontWeight: 600 }}>Добавить отчет</h3>
            <input 
              placeholder="Название формы" 
              value={customForm.name} 
              onChange={e => setCustomForm(p => ({...p, name: e.target.value}))} 
              style={{ 
                width: '100%', 
                padding: 10, 
                marginBottom: 10,                 borderRadius: 8, 
                border: `1px solid ${T.border || '#333'}`, 
                background: 'rgba(255,255,255,0.1)', 
                color: '#fff', 
                outline: 'none' 
              }} 
            />
            <select 
              value={customForm.frequency} 
              onChange={e => setCustomForm(p => ({...p, frequency: e.target.value}))} 
              style={{ 
                width: '100%', 
                padding: 10, 
                marginBottom: 10, 
                borderRadius: 8, 
                border: `1px solid ${T.border || '#333'}`, 
                background: 'rgba(255,255,255,0.1)', 
                color: '#fff', 
                outline: 'none',
                colorScheme: 'dark'
              }}
            >
              <option value="monthly" style={{background: '#1a1a2e', color: '#fff'}}>Ежемесячно</option>
              <option value="quarterly" style={{background: '#1a1a2e', color: '#fff'}}>Ежеквартально</option>
              <option value="annual" style={{background: '#1a1a2e', color: '#fff'}}>Ежегодно</option>
            </select>
            <input 
              type="date" 
              value={customForm.deadline} 
              onChange={e => setCustomForm(p => ({...p, deadline: e.target.value}))} 
              style={{ 
                width: '100%', 
                padding: 10, 
                marginBottom: 16, 
                borderRadius: 8, 
                border: `1px solid ${T.border || '#333'}`, 
                background: 'rgba(255,255,255,0.1)', 
                color: '#fff', 
                outline: 'none',
                colorScheme: 'dark'
              }} 
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowCustomModal(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${T.border || '#333'}`, background: 'transparent', color: '#ccc', cursor: 'pointer' }}>Отмена</button>
              <button 
                onClick={() => { 
                  if(!customForm.name || !customForm.deadline) return; 
                  const groupId = 'custom-default'; 
                  addCustomGroup('Мои отчеты'); 
                  addCustomReport(groupId, { name: customForm.name, frequency: customForm.frequency, deadline: customForm.deadline });                   setShowCustomModal(false); 
                  setCustomForm({ name: '', frequency: 'quarterly', deadline: '' }); 
                }} 
                style={{ 
                  flex: 1, 
                  padding: 10, 
                  borderRadius: 8, 
                  border: 'none', 
                  background: T.accent || '#c8a45a', 
                  color: '#000', 
                  fontWeight: 600, 
                  cursor: 'pointer' 
                }}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {modal !== null && <TaskModal task={modal?.id ? modal : null} defaultSection="work" onSave={(t) => { setTasks(p => modal?.id ? p.map(x => x.id === t.id ? t : x) : [...p, t]); setModal(null); }} onClose={() => setModal(null)} />}
    </div>
  );
              }
