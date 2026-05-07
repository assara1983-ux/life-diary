// src/sections/WorkSection.jsx
import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../store/AppContext';
import { KGD_CATALOG, BNS_CATALOG } from '../data/reportsCatalog';
import { AiBox } from '../components/AiBox';
import { TaskModal } from '../components/TaskModal';
import { AccountingBlock } from '../components/AccountingBlock';
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

export function WorkSection() {
  const { 
    profile, tasks, setTasks, 
    selectedReports, toggleReport, 
    collapsedSections, toggleSection, 
    customReportGroups, addCustomGroup, addCustomReport, deleteGroup,
    workTools, addWorkTool, deleteWorkTool,
    accountingReports 
  } = useApp();

  const [workTab, setWorkTab] = useState('reports');
  const [modal, setModal] = useState(null);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogTab, setCatalogTab] = useState('kgd'); // 'kgd' | 'bns'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTool, setActiveTool] = useState(null);
  
  // Состояние для добавления пользовательской группы/отчёта
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({ name: '' });
  const [newReportForm, setNewReportForm] = useState({ groupId: '', name: '', frequency: 'quarterly', deadline: '' });

  const today = toDay();
  const kb = JSON.stringify(profile);
  const notify = useCallback((msg) => { console.log('Notify:', msg); }, []);
  // --- ЛОГИКА КАТАЛОГА ---
  const fullCatalog = catalogTab === 'kgd' ? KGD_CATALOG : BNS_CATALOG;
  const filteredCatalog = fullCatalog.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.id.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedInCatalog = fullCatalog.filter(r => selectedReports.includes(r.id));

  // --- РЕНДЕР АККОРДЕОНА ---
  const AccordionSection = ({ id, title, icon, count, onAdd, children }) => {
    const isCollapsed = collapsedSections[id];
    return (
      <div style={{ marginBottom: 12, borderRadius: 12, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.02)' }}>
        <div 
          onClick={() => toggleSection(id)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', borderBottom: isCollapsed ? 'none' : `1px solid ${T.border}` }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: T.text0 }}>{title}</span>
            {count > 0 && <span style={{ fontSize: 11, background: T.accent, color: '#000', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>{count}</span>}
          </div>
          <span style={{ fontSize: 14, color: T.text3, transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}>▼</span>
        </div>
        {!isCollapsed && (
          <div style={{ padding: '8px 14px 14px' }}>
            {children}
            <button onClick={onAdd} style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 8, border: `1px dashed ${T.accent}`, background: 'transparent', color: T.accent, fontSize: 13, cursor: 'pointer' }}>
              ✚ Добавить форму
            </button>
          </div>
        )}
      </div>
    );
  };

  const ReportItem = ({ item, onRemove }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${T.border}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: T.text0, fontWeight: 500 }}>{item.name}</div>
        <div style={{ fontSize: 11, color: T.text3 }}>{item.id} • {freqLabel(item.frequency || item.deadlineRule)}</div>
      </div>
      <button onClick={onRemove} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: 'rgba(255,80,80,0.1)', color: T.error, fontSize: 12, cursor: 'pointer' }}>✕</button>
    </div>
  );

  // --- МОДАЛЬНОЕ ОКНО КАТАЛОГА ---
  const CatalogModal = () => !showCatalogModal ? null : (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowCatalogModal(false)}>      <div style={{ background: T.bg, width: '100%', maxWidth: 500, borderRadius: 16, padding: 16, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: T.text0 }}>📚 Выбор форм</h3>
          <button onClick={() => setShowCatalogModal(false)} style={{ background: 'none', border: 'none', color: T.text3, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={() => setCatalogTab('kgd')} style={{ flex: 1, padding: 8, borderRadius: 8, border: `1px solid ${catalogTab === 'kgd' ? T.accent : T.border}`, background: catalogTab === 'kgd' ? T.accent : 'transparent', color: catalogTab === 'kgd' ? '#000' : T.text2, cursor: 'pointer', fontWeight: 600 }}>🏛 КГД</button>
          <button onClick={() => setCatalogTab('bns')} style={{ flex: 1, padding: 8, borderRadius: 8, border: `1px solid ${catalogTab === 'bns' ? T.accent : T.border}`, background: catalogTab === 'bns' ? T.accent : 'transparent', color: catalogTab === 'bns' ? '#000' : T.text2, cursor: 'pointer', fontWeight: 600 }}>📊 БНС</button>
        </div>
        <input 
          placeholder="Поиск по названию или коду..." 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: 8, borderRadius: 8, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.05)', color: T.text0, marginBottom: 12 }}
        />
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
          {filteredCatalog.map(r => {
            const isSelected = selectedReports.includes(r.id);
            return (
              <div key={r.id} onClick={() => toggleReport(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${T.border}`, cursor: 'pointer' }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSelected ? T.accent : T.text3}`, background: isSelected ? T.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#000', fontWeight: 700 }}>
                  {isSelected ? '✓' : ''}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: T.text0, fontWeight: 500 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: T.text3 }}>{r.id} • {freqLabel(r.frequency)}</div>
                </div>
              </div>
            );
          })}
          {filteredCatalog.length === 0 && <div style={{ textAlign: 'center', color: T.text3, padding: 20 }}>Ничего не найдено</div>}
        </div>
      </div>
    </div>
  );

  // --- ОСНОВНОЙ РЕНДЕР ---
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
            style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: `1px solid ${workTab === tab.id ? T.accent + '88' : T.border}`, background: workTab === tab.id ? 'rgba(200,164,90,0.12)' : 'transparent', color: workTab === tab.id ? T.gold : T.text2, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>            {tab.label}
          </button>
        ))}
      </div>

      {/* - ВКЛАДКА: ОТЧЁТНОСТЬ - */}
      {workTab === 'reports' && (
        <div>
          {/* 1. Мои отчёты (Пользовательские) */}
          <AccordionSection id="custom" title="Мои отчёты" icon="📝" count={customReportGroups.length} onAdd={() => setShowAddCustomModal(true)}>
            {customReportGroups.length === 0 ? (
              <div style={{ fontSize: 12, color: T.text3, textAlign: 'center', padding: '10px 0' }}>Создайте первую группу отчётов</div>
            ) : customReportGroups.map(g => (
              <div key={g.id} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text0 }}>{g.name}</span>
                  <button onClick={() => deleteGroup(g.id)} style={{ background: 'none', border: 'none', color: T.error, fontSize: 16, cursor: 'pointer' }}>🗑</button>
                </div>
                {g.reports.length === 0 ? (
                  <div style={{ fontSize: 11, color: T.text3, paddingLeft: 8 }}>Пусто</div>
                ) : g.reports.map(r => <ReportItem key={r.id} item={r} onRemove={() => {}} />)}
              </div>
            ))}
          </AccordionSection>

          {/* 2. КГД */}
          <AccordionSection id="kgd" title="🏛 КГД" icon="🏛" count={selectedInCatalog.filter(r => KGD_CATALOG.some(c => c.id === r.id)).length} onAdd={() => { setCatalogTab('kgd'); setShowCatalogModal(true); }}>
            {selectedInCatalog.filter(r => KGD_CATALOG.some(c => c.id === r.id)).length === 0 ? (
              <div style={{ fontSize: 12, color: T.text3, textAlign: 'center', padding: '10px 0' }}>Нет выбранных форм</div>
            ) : selectedInCatalog.filter(r => KGD_CATALOG.some(c => c.id === r.id)).map(r => (
              <ReportItem key={r.id} item={r} onRemove={() => toggleReport(r.id)} />
            ))}
          </AccordionSection>

          {/* 3. БНС */}
          <AccordionSection id="bns" title="📊 БНС" icon="📊" count={selectedInCatalog.filter(r => BNS_CATALOG.some(c => c.id === r.id)).length} onAdd={() => { setCatalogTab('bns'); setShowCatalogModal(true); }}>
            {selectedInCatalog.filter(r => BNS_CATALOG.some(c => c.id === r.id)).length === 0 ? (
              <div style={{ fontSize: 12, color: T.text3, textAlign: 'center', padding: '10px 0' }}>Нет выбранных форм</div>
            ) : selectedInCatalog.filter(r => BNS_CATALOG.some(c => c.id === r.id)).map(r => (
              <ReportItem key={r.id} item={r} onRemove={() => toggleReport(r.id)} />
            ))}
          </AccordionSection>

          {/* Обычные задачи (сохранено из оригинала) */}
          <div style={{ marginBottom: 12, marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, cursor: 'pointer', background: 'rgba(78,201,190,0.06)', border: `1px solid ${T.teal}33` }} onClick={() => setModal({})}>
              <span style={{ fontSize: 16 }}>📋</span>
              <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.teal, fontWeight: 500 }}>Обычные задачи</span>
              <button style={{ fontSize: 12, padding: '2px 8px', color: T.teal, background: 'none', border: 'none', cursor: 'pointer' }}>+</button>
            </div>            <div style={{ background: 'rgba(255,255,255,0.01)', border: `1px solid ${T.teal}22`, borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '4px 0' }}>
              {tasks.filter(t => t.section === 'work' && t.type !== 'report').slice(0, 3).map(task => (
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

          {/* Советы (сохранено из оригинала) */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, cursor: 'pointer', background: 'rgba(200,164,90,0.06)', border: `1px solid ${T.gold}33` }}>
              <span style={{ fontSize: 16 }}>💡</span>
              <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.gold, fontWeight: 500 }}>Советы по работе</span>
            </div>
            <div style={{ border: `1px solid ${T.gold}22`, borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
              <AiBox kb={kb} prompt="Дай 5 конкретных рекомендаций для повышения эффективности рабочего дня." label="Советы по работе" btnText="Получить рекомендации" placeholder="Анализирую профиль..." />
            </div>
          </div>
        </div>
      )}

      {/* - ВКЛАДКА: ИНСТРУМЕНТЫ - */}
      {workTab === 'tools' && (
        <div>
          {workTools.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: T.text3 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🛠</div>
              <div>Инструментов пока нет</div>
            </div>
          )}
          {workTools.map(tool => (
            <div key={tool.id} style={{ marginBottom: 10 }}>
              <div onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, cursor: 'pointer', background: activeTool === tool.id ? 'rgba(200,164,90,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${activeTool === tool.id ? T.gold + '55' : T.border}`, transition: 'all .15s' }}>
                <span style={{ fontSize: 22 }}>🛠</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: T.text0, fontWeight: 500, wordBreak: 'break-word' }}>{tool.title}</div>
                  <div style={{ fontSize: 11, color: T.text3, marginTop: 2, lineHeight: 1.4, wordBreak: 'break-word' }}>{tool.description}</div>
                </div>
                <span style={{ fontSize: 12, color: T.text3 }}>{activeTool === tool.id ? '▲' : '▼'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Модалки */}
      <CatalogModal />
      
      {showAddCustomModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowAddCustomModal(false)}>
          <div style={{ background: T.bg, width: '100%', maxWidth: 400, borderRadius: 16, padding: 16 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', color: T.text0 }}>➕ Создать отчёт</h3>
            <input placeholder="Название группы" value={newGroupForm.name} onChange={e => setNewGroupForm(p => ({...p, name: e.target.value}))} style={{ width: '100%', padding: 8, marginBottom: 12, borderRadius: 8, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.05)', color: T.text0 }} />
            <input placeholder="Название формы" value={newReportForm.name} onChange={e => setNewReportForm(p => ({...p, name: e.target.value}))} style={{ width: '100%', padding: 8, marginBottom: 12, borderRadius: 8, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.05)', color: T.text0 }} />
            <select value={newReportForm.frequency} onChange={e => setNewReportForm(p => ({...p, frequency: e.target.value}))} style={{ width: '100%', padding: 8, marginBottom: 12, borderRadius: 8, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.05)', color: T.text0 }}>
              <option value="monthly">Ежемесячно</option>
              <option value="quarterly">Ежеквартально</option>
              <option value="annual">Ежегодно</option>
            </select>
            <input type="date" value={newReportForm.deadline} onChange={e => setNewReportForm(p => ({...p, deadline: e.target.value}))} style={{ width: '100%', padding: 8, marginBottom: 16, borderRadius: 8, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.05)', color: T.text0 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowAddCustomModal(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', color: T.text2, cursor: 'pointer' }}>Отмена</button>
              <button onClick={() => {
                if(!newGroupForm.name || !newReportForm.name) return;
                const groupId = 'g-' + Date.now();
                addCustomGroup(newGroupForm.name);
                addCustomReport(groupId, { name: newReportForm.name, frequency: newReportForm.frequency, deadline: newReportForm.deadline });
                setShowAddCustomModal(false);
                setNewGroupForm({ name: '' });
                setNewReportForm({ groupId: '', name: '', frequency: 'quarterly', deadline: '' });
              }} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: T.accent, color: '#000', fontWeight: 600, cursor: 'pointer' }}>Создать</button>
            </div>
          </div>
        </div>
      )}

      {modal !== null && <TaskModal task={modal?.id ? modal : null} defaultSection="work" onSave={(t) => { setTasks(p => modal?.id ? p.map(x => x.id === t.id ? t : x) : [...p, t]); setModal(null); }} onClose={() => setModal(null)} />}
    </div>
  );
          }
