// src/sections/WorkSection.jsx
import { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { KGD_CATALOG, BNS_CATALOG } from '../data/reportsCatalog';
import { AiBox } from '../components/AiBox';
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

// --- КОМПОНЕНТ АККОРДЕОНА (запоминает состояние) ---
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
    workTools, addWorkTool,
    collapsedSections, toggleSection 
  } = useApp();

  const [workTab, setWorkTab] = useState('reports');
  const [modal, setModal] = useState(null);
  
  // Состояния модальных окон
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogTab, setCatalogTab] = useState('kgd'); // 'kgd' | 'bns'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customForm, setCustomForm] = useState({ name: '', frequency: 'quarterly', deadline: '' });

  const today = toDay();
  const kb = JSON.stringify(profile);

  // --- ЛОГИКА КАТАЛОГА ---
  const fullCatalog = catalogTab === 'kgd' ? KGD_CATALOG : BNS_CATALOG;
  const filteredCatalog = fullCatalog.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Фильтруем выбранные отчеты для отображения в списках
  const selectedKgd = useMemo(() => KGD_CATALOG.filter(r => selectedReports.includes(r.id)), [selectedReports]);
  const selectedBns = useMemo(() => BNS_CATALOG.filter(r => selectedReports.includes(r.id)), [selectedReports]);

  // Создание инструмента из AI-рекомендации
  const handleCreateToolFromAI = (toolName, description) => {
    addWorkTool({
      title: toolName,
      description: description || 'Инструмент создан по рекомендации AI',
      steps: ['Шаг 1: Подготовка данных', 'Шаг 2: Проверка корректности', 'Шаг 3: Отправка / Сохранение']
    });
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
          {/* 1. Мои отчёты (Пользовательские) */}
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

          {/* 2. КГД (Только выбранные) */}
          <Accordion id="kgd-reports" title="🏛 КГД" icon="🏛" count={selectedKgd.length} onAdd={() => { setCatalogTab('kgd'); setShowCatalog(true); }}>
            {selectedKgd.length === 0 ? (
              <div style={{ fontSize: 12, color: T.text3, textAlign: 'center', padding: '10px 0' }}>Нет выбранных форм. Нажмите «Добавить форму».</div>
            ) : selectedKgd.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.text0 }}>{r.name}</div>
                  <div style={{ fontSize: 10, color: T.text3 }}>{r.id} • {freqLabel(r.frequency)}</div>
                </div>
                <button onClick={() => toggleReport(r.id)} style={{ color: T.error, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
            ))}          </Accordion>

          {/* 3. БНС (Только выбранные) */}
          <Accordion id="bns-reports" title="📊 БНС" icon="📊" count={selectedBns.length} onAdd={() => { setCatalogTab('bns'); setShowCatalog(true); }}>
            {selectedBns.length === 0 ? (
              <div style={{ fontSize: 12, color: T.text3, textAlign: 'center', padding: '10px 0' }}>Нет выбранных форм. Нажмите «Добавить форму».</div>
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

          {/* Задачи (обычные) */}
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
            <div style={{ border: `1px solid ${T.gold}22`, borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden', padding: 14 }}>
              <p style={{ fontSize: 13, color: T.text1, margin: '0 0 12px' }}>
                Получите рекомендации по оптимизации работы. Понравившуюся рекомендацию можно превратить в инструмент.
              </p>
              <AiBox 
                kb={kb} 
                prompt="Дай 3 конкретных рекомендации для бухгалтера по оптимизации работы с отчетностью. Формат: JSON массив объектов {title, summary, details}."                 label="Получить рекомендации"
                btnText="Спросить AI"
                placeholder="Генерирую..."
                onResult={() => handleCreateToolFromAI("Новый инструмент AI", "Создан на основе рекомендации")}
              />
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
              <div>Инструментов пока нет. Создайте их через AI рекомендации.</div>
            </div>
          ) : workTools.map(tool => (
            <div key={tool.id} style={{ marginBottom: 10, padding: 14, borderRadius: 12, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text0, marginBottom: 6 }}>{tool.title}</div>
              <div style={{ fontSize: 12, color: T.text1, marginBottom: 8 }}>{tool.description}</div>
              {tool.steps && tool.steps.map((step, idx) => (
                <div key={idx} style={{ fontSize: 12, color: T.text3, marginBottom: 2 }}>• {step}</div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* --- МОДАЛЬНЫЕ ОКНА --- */}

      {/* 1. Модалка Каталога (Выбор КГД/БНС) */}
      {showCatalog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowCatalog(false)}>
          <div style={{ background: T.bg, width: '100%', maxWidth: 500, maxHeight: '85vh', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: T.text0 }}>Каталог форм</h3>
              <button onClick={() => setShowCatalog(false)} style={{ background: 'none', border: 'none', color: T.text3, fontSize: 20 }}>✕</button>
            </div>
            
            {/* Табы */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={() => setCatalogTab('kgd')} style={{ flex: 1, padding: 8, borderRadius: 8, border: `1px solid ${catalogTab === 'kgd' ? T.accent : T.border}`, background: catalogTab === 'kgd' ? T.accent : 'transparent', color: catalogTab === 'kgd' ? '#000' : T.text2, cursor: 'pointer' }}>🏛 КГД</button>
              <button onClick={() => setCatalogTab('bns')} style={{ flex: 1, padding: 8, borderRadius: 8, border: `1px solid ${catalogTab === 'bns' ? T.accent : T.border}`, background: catalogTab === 'bns' ? T.accent : 'transparent', color: catalogTab === 'bns' ? '#000' : T.text2, cursor: 'pointer' }}>📊 БНС</button>
            </div>

            {/* Поиск */}
            <input 
              placeholder="Поиск..."               value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 8, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.05)', color: T.text0 }}
            />

            {/* Список */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredCatalog.map(r => {
                const isSelected = selectedReports.includes(r.id);
                return (
                  <div key={r.id} onClick={() => toggleReport(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${T.border}`, cursor: 'pointer' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSelected ? T.accent : T.text3}`, background: isSelected ? T.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: 12 }}>
                      {isSelected && '✓'}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: T.text0, fontWeight: 500 }}>{r.name}</div>
                      <div style={{ fontSize: 10, color: T.text3 }}>{r.id}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. Модалка создания пользовательского отчета */}
      {showCustomModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowCustomModal(false)}>
          <div style={{ background: T.bg, width: '100%', maxWidth: 400, borderRadius: 16, padding: 20 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', color: T.text0 }}>Добавить отчет</h3>
            <input placeholder="Название формы" value={customForm.name} onChange={e => setCustomForm(p => ({...p, name: e.target.value}))} style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.05)', color: T.text0 }} />
            <select value={customForm.frequency} onChange={e => setCustomForm(p => ({...p, frequency: e.target.value}))} style={{ width: '100%', padding: 10, marginBottom: 10, borderRadius: 8, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.05)', color: T.text0 }}>
              <option value="monthly">Ежемесячно</option>
              <option value="quarterly">Ежеквартально</option>
              <option value="annual">Ежегодно</option>
            </select>
            <input type="date" value={customForm.deadline} onChange={e => setCustomForm(p => ({...p, deadline: e.target.value}))} style={{ width: '100%', padding: 10, marginBottom: 16, borderRadius: 8, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.05)', color: T.text0 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowCustomModal(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', color: T.text2 }}>Отмена</button>
              <button onClick={() => {
                if(!customForm.name || !customForm.deadline) return;
                const groupId = 'custom-default'; 
                addCustomGroup('Мои отчеты');
                addCustomReport(groupId, { name: customForm.name, frequency: customForm.frequency, deadline: customForm.deadline });
                setShowCustomModal(false);
                setCustomForm({ name: '', frequency: 'quarterly', deadline: '' });
              }} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: T.accent, color: '#000', fontWeight: 600 }}>Сохранить</button>
            </div>
          </div>        </div>
      )}

      {/* 3. Модалка задач */}
      {modal !== null && <TaskModal task={modal?.id ? modal : null} defaultSection="work" onSave={(t) => { setTasks(p => modal?.id ? p.map(x => x.id === t.id ? t : x) : [...p, t]); setModal(null); }} onClose={() => setModal(null)} />}
    </div>
  );
}
