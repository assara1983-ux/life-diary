// src/sections/WorkSection.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { TaskModal } from '../components/TaskModal';
import { AccountingBlock } from '../components/AccountingBlock';
import { T } from '../utils/theme';

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function toDay(d = new Date()) { return d.toISOString().split('T')[0]; }
function isDue(task, today) {
  const last = task.lastDone, d = new Date(today); d.setHours(0, 0, 0, 0);
  if (!task.freq) return false;
  if (task.doneDate === today) return false;
  if (task.section === 'beauty' && task.deadline && task.freq && task.freq.startsWith('every:')) {
    const n = parseInt(task.freq.split(':')[1]);
    if (n >= 14) return task.deadline === today;
  }
  if (task.freq === 'daily') return last !== today;
  if (task.freq === 'workdays') { const dn = d.getDay(); return dn >= 1 && dn <= 5 && last !== today; }
  if (task.freq.startsWith('weekly:')) { return task.freq.split(':')[1].split(',').map(Number).includes(d.getDay()) && last !== today; }
  if (task.freq.startsWith('every:')) {
    const n = parseInt(task.freq.split(':')[1]);
    if (!last) return true;
    return Math.floor((d - new Date(last)) / 86400000) >= n;
  }
  if (task.freq.startsWith('monthly:')) { return task.freq.split(':')[1].split(',').map(Number).includes(d.getDate()) && last !== today; }
  return false;
}
function freqLabel(f) {
  if (!f || f === 'once') return 'разово'; if (f === 'daily') return 'ежедневно'; if (f === 'workdays') return 'пн–пт';
  if (f.startsWith('weekly:')) { const m = { 0: 'вс', 1: 'пн', 2: 'вт', 3: 'ср', 4: 'чт', 5: 'пт', 6: 'сб' }; return f.split(':')[1].split(',').map(n => m[n]).join(', '); }
  if (f.startsWith('every:')) return `каждые ${f.split(':')[1]} дн.`;
  if (f.startsWith('monthly:')) return `${f.split(':')[1]} числа`;
  return f;
}
function openGCal(title, date, desc = '') {
  const s = new Date(date), e = new Date(s.getTime() + 3600000), f = d => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${f(s)}/${f(e)}&details=${encodeURIComponent(desc)}`, '_blank');
}

// --- КАЛЕНДАРИ (оставляем для совместимости) ---
const KGD_CALENDAR = [
  { group: 'kgd', name: 'ФНО 910.00 — 1 полугодие', period: 'semi', deadline: '2026-08-17', cat: 'КГД' },
  { group: 'kgd', name: 'ФНО 910.00 — 2 полугодие', period: 'semi', deadline: '2027-02-17', cat: 'КГД' },
];

export function WorkSection() {
  const { profile, tasks, setTasks, reportGroups, setReportGroups, reports, setReports, checkResults, setCheckResults, workTools, setWorkTools, accountingReports } = useApp();
  const [workTab, setWorkTab] = useState('reports');  const [modal, setModal] = useState(null);
  const [addReportModal, setAddReportModal] = useState(null);
  const [editReport, setEditReport] = useState(null);
  const [newReport, setNewReport] = useState({ name: '', deadline: '', period: 'quarter', amount: '', notes: '' });
  const [checkingId, setCheckingId] = useState(null);
  
  const [activeTool, setActiveTool] = useState(null);
  const [toolLoading, setToolLoading] = useState(false);
  const today = toDay();
  const kb = JSON.stringify(profile);

  const notify = useCallback((msg) => { console.log('Notify:', msg); }, []);

  // Проверка: показывать ли отчетность
  const isAccountant = (() => {
    const prof = (profile.profession || ' ').toLowerCase();
    const sphere = (profile.jobSphere || ' ').toLowerCase();
    return prof.match(/бухгалтер|ип|индивидуальн|предприним/) || sphere.match(/бухгалтер|финансов|учёт|учет|налог/) || profile.isIP === true;
  })();

  const toggleDone = (id) => setReports(p => p.map(r => r.id === id ? { ...r, status: r.status === 'done' ? 'pending' : 'done' } : r));
  const deleteReport = (id) => setReports(p => p.filter(r => r.id !== id));

  const checkDeadline = async (r) => {
    setCheckingId(r.id);
    try {
      setTimeout(() => {
        setReports(p => p.map(rep => rep.id === r.id ? { ...rep, deadline: '2026-12-31' } : rep));
        setCheckResults(p => ({ ...p, [r.id]: { deadline: '2026-12-31', checkedAt: new Date().toISOString() } }));
        notify('Срок обновлен');
        setCheckingId(null);
      }, 1000);
    } catch (e) {
      notify('Ошибка проверки');
      setCheckingId(null);
    }
  };

  const daysLeft = (dl) => { const d = new Date(dl); d.setHours(0, 0, 0, 0); return Math.ceil((d - new Date()) / 86400000); };

  // ✅ Фильтр: только активные отчеты с приближающимися дедлайнами (≤ 14 дней)
  const urgentReports = useMemo(() => {
    return (accountingReports || [])
      .filter(r => r.status !== 'done' && r.nextDeadline)
      .map(r => {
        const days = daysLeft(r.nextDeadline);
        return { ...r, daysLeft: days, isOverdue: days < 0, isSoon: days >= 0 && days <= 5 };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [accountingReports]);
  const ReportRow = ({ r, showGroup = false }) => {
    const isOver = r.isOverdue;
    const isSoon = r.isSoon;
    const isChecking = checkingId === r.id;
    return (
      <div style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0, paddingTop: 2 }}>
            <div title="Выполнено" className={`chk ${r.status === 'done' ? 'done' : ''}`} style={{ width: 18, height: 18, fontSize: 10 }} onClick={() => { /* handled by AccountingBlock */ }}>{r.status === 'done' ? '✓' : ' '}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {showGroup && <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'" }}>📋</span>}
              <span style={{ fontSize: 14, color: r.status === 'done' ? T.text3 : T.text0, textDecoration: r.status === 'done' ? 'line-through' : 'none', lineHeight: 1.4, wordBreak: 'break-word' }}>{r.name}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: isOver ? T.error : isSoon ? T.warning : T.text3, fontFamily: "'JetBrains Mono'", fontWeight: isOver || isSoon ? 700 : 400 }}>
                {isOver ? '⚠ Просрочен' : r.daysLeft === 0 ? '📍 Сегодня' : r.daysLeft === 1 ? '📍 Завтра' : '📅 ' + new Date(r.nextDeadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Шапка */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(45,32,16,0.05)', borderRadius: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        {profile.profession && <span style={{ fontSize: 13, color: T.text1, fontWeight: 500 }}>💼 {profile.profession}</span>}
        <span style={{ fontSize: 12, color: T.gold, marginLeft: 'auto' }}>🕐 {profile.workStart || '09:00'}–{profile.workEnd || '18:00'}</span>
      </div>

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { id: 'reports', label: '📋 Отчётность' },
          { id: 'tools', label: '🛠 Инструменты ' + (workTools.length > 0 ? ` (${workTools.length})` : '') },
        ].map(tab => (
          <button key={tab.id} onClick={() => setWorkTab(tab.id)}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: `1px solid ${workTab === tab.id ? T.gold + '88' : 'rgba(255,255,255,0.08)'}`, background: workTab === tab.id ? 'rgba(200,164,90,0.12)' : 'rgba(255,255,255,0.02)', color: workTab === tab.id ? T.gold : T.text2, fontSize: 13, cursor: 'pointer', fontFamily: "'Crimson Pro',serif", transition: 'all .15s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* - ВКЛАДКА: ОТЧЁТНОСТЬ - */}
      {workTab === 'reports' && (        <div>
          {isAccountant ? (
            <div>
              {/* ✅ БЛОК: Управление отчетами (КГД/БНС) */}
              <div style={{ marginBottom: 20 }}>
                <AccountingBlock />
              </div>

              {/* ✅ СЕКЦИЯ: Срочные отчеты (авто-фильтр ≤ 14 дней) */}
              {urgentReports.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(232,120,120,0.08)', border: '1px solid rgba(232,120,120,0.3)', marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.error, fontWeight: 500 }}>Требуют внимания</span>
                    <span style={{ fontSize: 11, color: T.error, fontFamily: "'JetBrains Mono'", background: 'rgba(232,120,120,0.15)', padding: '1px 8px', borderRadius: 8 }}>{urgentReports.length}</span>
                  </div>
                  <div style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.01)', borderRadius: '0 0 12px 12px', border: '1px solid rgba(255,255,255,0.05)', borderTop: 'none' }}>
                    {urgentReports.slice(0, 5).map(r => (
                      <ReportRow key={r.id} r={r} />
                    ))}
                    {urgentReports.length > 5 && (
                      <div style={{ fontSize: 12, color: T.text3, textAlign: 'center', padding: '8px 0' }}>
                        + ещё {urgentReports.length - 5} отчетов (см. в «Мои отчеты»)
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Задачи (обычные, не отчеты) */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, cursor: 'pointer', background: 'rgba(78,201,190,0.06)', border: '1px solid rgba(78,201,190,0.15)' }}>
                  <span style={{ fontSize: 16 }}>📋</span>
                  <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.teal, fontWeight: 500 }}>Задачи</span>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, padding: '2px 8px', color: T.teal }} onClick={() => setModal({})}>+</button>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(78,201,190,0.1)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '4px 0' }}>
                  {tasks.filter(t => t.section === 'work' && !t.isDeadline && t.type !== 'report').map(task => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <div className={`chk ${task.doneDate === today ? 'done' : ''}`} style={{ width: 18, height: 18, fontSize: 11, flexShrink: 0 }}
                        onClick={() => setTasks(p => p.map(t => t.id === task.id ? { ...t, doneDate: t.doneDate === today ? null : today, lastDone: t.doneDate === today ? t.lastDone : today } : t))}>
                        {task.doneDate === today ? '✓' : ' '}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: task.doneDate === today ? T.text3 : T.text0, textDecoration: task.doneDate === today ? 'line-through' : 'none', lineHeight: 1.4 }}>{task.title}</div>
                      </div>
                      <div className="ico-btn" style={{ fontSize: 11, padding: '2px 4px', flexShrink: 0 }} onClick={() => setModal(task)}>✏️</div>
                      <div className="ico-btn danger" style={{ fontSize: 11, padding: '2px 4px', flexShrink: 0 }} onClick={() => setTasks(p => p.filter(t => t.id !== task.id))}>✕</div>
                    </div>
                  ))}                </div>
              </div>

              {/* Советы */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, cursor: 'pointer', background: 'rgba(200,164,90,0.06)', border: '1px solid rgba(200,164,90,0.15)' }}>
                  <span style={{ fontSize: 16 }}>💡</span>
                  <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.gold, fontWeight: 500 }}>Советы по работе</span>
                </div>
                <div style={{ border: '1px solid rgba(200,164,90,0.12)', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
                  <AiBox
                    kb={kb}
                    prompt="Дай 5 конкретных рекомендаций для повышения эффективности рабочего дня."
                    label="Советы по работе"
                    btnText="Получить рекомендации"
                    placeholder="Анализирую профиль..."
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🚗</div>
              <div style={{ fontSize: 16, color: T.text2, marginBottom: 8 }}>Добавь профессию в профиле, чтобы видеть отчёты</div>
            </div>
          )}
        </div>
      )}

      {/* - ВКЛАДКА: ИНСТРУМЕНТЫ - */}
      {workTab === 'tools' && (
        <div>
          {toolLoading && (
            <div style={{ textAlign: 'center', padding: 30, color: T.text3 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⚙️</div>
              <div style={{ fontSize: 13, fontStyle: 'italic' }}>AI создаёт инструмент под твой профиль...</div>
            </div>
          )}
          {!toolLoading && workTools.length === 0 && (
            <div className="empty">
              <span className="empty-ico">🛠</span>
              <p>Инструментов пока нет.</p>
              <p style={{ fontSize: 13, color: T.text3 }}>Получи советы по работе → нажми «Подробнее» → «✦ Создать помощник»</p>
            </div>
          )}
          {!toolLoading && workTools.map(tool => (
            <div key={tool.id} style={{ marginBottom: 10 }}>
              <div onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, cursor: 'pointer', background: activeTool === tool.id ? 'rgba(200,164,90,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${activeTool === tool.id ? T.gold + '55' : 'rgba(255,255,255,0.06)'}`, transition: 'all .15s' }}>
                <span style={{ fontSize: 22 }}>{'🛠'}</span>                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: T.text0, fontWeight: 500, wordBreak: 'break-word' }}>{tool.title}</div>
                  <div style={{ fontSize: 11, color: T.text3, marginTop: 2, lineHeight: 1.4, wordBreak: 'break-word' }}>{tool.description}</div>
                </div>
                <span style={{ fontSize: 12, color: T.text3 }}>{activeTool === tool.id ? '▲' : '▼'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модалки для старых отчетов (если используются) */}
      {addReportModal && (
        <div className="overlay" onClick={() => { setAddReportModal(null); setNewReport({ name: '', deadline: '', period: 'quarter', amount: '', notes: '' }); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <span className="modal-x" onClick={() => { setAddReportModal(null); setNewReport({ name: '', deadline: '', period: 'quarter', amount: '', notes: '' }); }}>✕</span>
            <div className="modal-title">Добавить отчёт</div>
            <div className="fld"><label>Название отчёта</label><input value={newReport.name} onChange={(e) => setNewReport(p => ({ ...p, name: e.target.value }))} placeholder="Например: ФНО 910.00" /></div>
            <div className="fld"><label>Срок сдачи</label><input type="date" value={newReport.deadline} onChange={(e) => setNewReport(p => ({ ...p, deadline: e.target.value }))} /></div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => { setAddReportModal(null); setNewReport({ name: '', deadline: '', period: 'quarter', amount: '', notes: '' }); }}>Отмена</button>
              <button className="btn btn-primary" onClick={() => {
                if (!newReport.name) { notify('Введи название'); return; }
                setReports(p => [...p, { ...newReport, id: 'u-' + Date.now(), group: addReportModal.groupId, enabled: true, status: 'pending', createdAt: new Date().toISOString() }]);
                setAddReportModal(null);
                setNewReport({ name: '', deadline: '', period: 'quarter', amount: '', notes: '' });
                notify('Добавлено ✦');
              }}>Добавить</button>
            </div>
          </div>
        </div>
      )}

      {editReport && (
        <div className="overlay" onClick={() => setEditReport(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <span className="modal-x" onClick={() => setEditReport(null)}>✕</span>
            <div className="modal-title">Редактировать отчёт</div>
            <div className="fld"><label>Название</label><input value={editReport.name} onChange={(e) => setEditReport(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="fld"><label>Срок сдачи</label><input type="date" value={editReport.deadline} onChange={(e) => setEditReport(p => ({ ...p, deadline: e.target.value }))} /></div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setEditReport(null)}>Отмена</button>
              <button className="btn btn-primary" onClick={() => { setReports(p => p.map(r => r.id === editReport.id ? editReport : r)); setEditReport(null); notify('Сохранено'); }}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {modal !== null && <TaskModal task={modal?.id ? modal : null} defaultSection="work" onSave={(t) => { setTasks(p => modal?.id ? p.map(x => x.id === t.id ? t : x) : [...p, t]); notify(modal?.id ? 'Обновлено' : 'Добавлено'); }} onClose={() => setModal(null)} />}
    </div>  );
}
