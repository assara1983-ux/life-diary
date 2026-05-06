// src/components/AccountingBlock.jsx
import { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { KGD_REPORTS, BNS_REPORTS } from '../data/kz-reports';
import { calculateNextDeadline } from '../store/AppContext';
import { T } from '../utils/theme';

export function AccountingBlock() {
  const { accountingReports, setAccountingReports, notify } = useApp();
  
  // View: 'catalog' | 'active'
  const [view, setView] = useState('active');
  
  // Состояния для сворачивания списков
  const [kgdOpen, setKgdOpen] = useState(false);
  const [bnsOpen, setBnsOpen] = useState(false);
  
  // Состояние для создания своей формы
  const [customModal, setCustomModal] = useState(false);
  const [customForm, setCustomForm] = useState({ 
    name: '', 
    frequency: 'monthly', 
    deadline: '', 
    type: 'custom' 
  });

  // Фильтрация: какие отчеты уже выбраны
  const selectedIds = useMemo(() => 
    new Set(accountingReports.map(r => r.id)), 
    [accountingReports]
  );

  const toggleReport = (report, catalog) => {
    if (selectedIds.has(report.id)) {
      // Удалить отчет
      setAccountingReports(accountingReports.filter(r => r.id !== report.id));
      notify('Отчет удален из списка');
    } else {
      // Добавить отчет с авто-расчетом первого дедлайна
      const firstDeadline = calculateNextDeadline(report.frequency, new Date().toISOString().split('T')[0]);
      const newReport = {
        ...report,
        catalog, // 'kgd' | 'bns' | 'custom'
        nextDeadline: firstDeadline,
        status: 'pending',
        addedAt: new Date().toISOString()
      };
      setAccountingReports([...accountingReports, newReport]);
      notify('Отчет добавлен ✦');
    }  };

  const addCustomReport = () => {
    if (!customForm.name || !customForm.deadline) {
      notify('Заполните название и срок');
      return;
    }
    const firstDeadline = calculateNextDeadline(customForm.frequency, new Date().toISOString().split('T')[0]);
    const newReport = {
      ...customForm,
      id: `custom-${Date.now()}`,
      code: '—',
      catalog: 'custom',
      nextDeadline: firstDeadline,
      status: 'pending',
      addedAt: new Date().toISOString()
    };
    
    setAccountingReports([...accountingReports, newReport]);
    notify('Отчет добавлен ✦');
    setCustomModal(false);
    setCustomForm({ name: '', frequency: 'monthly', deadline: '', type: 'custom' });
  };

  const deleteReport = (id) => {
    setAccountingReports(accountingReports.filter(r => r.id !== id));
    notify('Отчет удален');
  };

  const toggleStatus = (id) => {
    setAccountingReports(accountingReports.map(r => 
      r.id === id ? { ...r, status: r.status === 'done' ? 'pending' : 'done' } : r
    ));
  };

  // --- Рендер: Активные отчеты (только выбранные) ---
  if (view === 'active') {
    const activeReports = accountingReports.filter(r => r.status !== 'done');
    const doneReports = accountingReports.filter(r => r.status === 'done');

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ color: T.text0, margin: 0, fontSize: 18 }}>📋 Мои отчеты</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setView('catalog')}>📚 Каталоги</button>
            <button className="btn btn-primary btn-sm" onClick={() => setCustomModal(true)}>✦ Своя форма</button>
          </div>
        </div>
        {/* Активные (с дедлайнами) */}
        {activeReports.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: T.text3, marginBottom: 8, fontFamily: "'JetBrains Mono'" }}>
              ТРЕБУЮТ ВНИМАНИЯ ({activeReports.length})
            </div>
            {activeReports.map(report => {
              const daysLeft = report.nextDeadline 
                ? Math.ceil((new Date(report.nextDeadline) - new Date()) / (1000 * 60 * 60 * 24))
                : null;
              const isOverdue = daysLeft < 0;
              const isSoon = daysLeft >= 0 && daysLeft <= 5;
              
              return (
                <div key={report.id} style={{ 
                  background: isSoon ? 'rgba(232,120,120,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isOverdue ? T.error : isSoon ? T.warning : T.bdr}`,
                  borderRadius: 12, padding: 12, marginBottom: 8
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.text0 }}>
                        {report.code !== '—' && <span style={{ color: T.gold, marginRight: 6 }}>{report.code}</span>}
                        {report.name}
                      </div>
                      <div style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>
                        📅 {report.deadline}
                      </div>
                      {report.nextDeadline && (
                        <div style={{ fontSize: 11, color: isOverdue ? T.error : isSoon ? T.warning : T.text2, marginTop: 2, fontFamily: "'JetBrains Mono'", fontWeight: isSoon ? 700 : 400 }}>
                          {isOverdue ? '⚠ Просрочено' : daysLeft === 0 ? '📍 Сегодня' : daysLeft === 1 ? '⚠ Завтра' : `Осталось дней: ${daysLeft}`}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div 
                        onClick={() => toggleStatus(report.id)}
                        title={report.status === 'done' ? 'Выполнено' : 'Отметить выполненным'}
                        style={{ 
                          width: 24, height: 24, borderRadius: 6, 
                          border: `1px solid ${report.status === 'done' ? T.success : T.bdr}`, 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          cursor: 'pointer', 
                          background: report.status === 'done' ? T.success : 'transparent' 
                        }}
                      >
                        {report.status === 'done' && <span style={{ color: '#fff', fontSize: 14 }}>✓</span>}
                      </div>
                      <span onClick={() => deleteReport(report.id)} style={{ cursor: 'pointer', color: T.text3, fontSize: 18 }}>×</span>
                    </div>                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Выполненные (свернутые) */}
        {doneReports.length > 0 && (
          <details style={{ marginBottom: 16 }}>
            <summary style={{ fontSize: 11, color: T.text3, cursor: 'pointer', padding: '8px 0' }}>
              ✓ Выполненные ({doneReports.length})
            </summary>
            <div style={{ marginTop: 8 }}>
              {doneReports.map(report => (
                <div key={report.id} style={{ 
                  background: 'rgba(45,106,79,0.05)',
                  border: `1px solid ${T.success}`,
                  borderRadius: 12, padding: 10, marginBottom: 6, opacity: 0.7
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: T.text2 }}>{report.name}</span>
                    <span onClick={() => deleteReport(report.id)} style={{ cursor: 'pointer', color: T.text3 }}>×</span>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        {accountingReports.length === 0 && (
          <div style={{ textAlign: 'center', color: T.text3, padding: '20px 0' }}>
            Список пуст. Нажмите «📚 Каталоги», чтобы выбрать формы.
          </div>
        )}

        {/* Модалка создания своей формы */}
        {customModal && (
          <div className="modal-overlay" onClick={() => setCustomModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ background: T.bg0, color: T.text0, padding: 20, borderRadius: 16, maxWidth: 400, width: '90%' }}>
              <h3 style={{ marginTop: 0 }}>Новая форма отчета</h3>
              
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, color: T.text3, marginBottom: 4 }}>Название</label>
                <input 
                  value={customForm.name} 
                  onChange={e => setCustomForm({...customForm, name: e.target.value})}
                  style={{ width: '100%', padding: 8, borderRadius: 8, border: `1px solid ${T.bdr}`, background: T.bg1, color: T.text0 }}
                  placeholder="Например: Отчет в пенсионный"
                />              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, color: T.text3, marginBottom: 4 }}>Периодичность</label>
                <select 
                  value={customForm.frequency}
                  onChange={e => setCustomForm({...customForm, frequency: e.target.value})}
                  style={{ width: '100%', padding: 8, borderRadius: 8, border: `1px solid ${T.bdr}`, background: T.bg1, color: T.text0 }}
                >
                  <option value="monthly">Ежемесячно</option>
                  <option value="quarterly">Ежеквартально</option>
                  <option value="semiannual">Раз в полгода</option>
                  <option value="annual">Ежегодно</option>
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: T.text3, marginBottom: 4 }}>Срок сдачи (правило)</label>
                <input 
                  value={customForm.deadline} 
                  onChange={e => setCustomForm({...customForm, deadline: e.target.value})}
                  style={{ width: '100%', padding: 8, borderRadius: 8, border: `1px solid ${T.bdr}`, background: T.bg1, color: T.text0 }}
                  placeholder="Например: до 15 числа"
                />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setCustomModal(false)}>Отмена</button>
                <button className="btn btn-primary" onClick={addCustomReport}>Сохранить</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Рендер: Каталоги (выбор форм) ---
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: T.text0, margin: 0, fontSize: 18 }}>📚 Каталоги форм</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => setView('active')}>✅ Мои отчеты</button>
      </div>

      {/* Блок КГД */}
      <div style={{ marginBottom: 16 }}>
        <div 
          onClick={() => setKgdOpen(!kgdOpen)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, cursor: 'pointer', background: 'rgba(200,164,90,0.06)', border: `1px solid ${T.gold}33` }}        >
          <span style={{ fontSize: 16 }}>🏛</span>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: T.gold }}>Налоговая (КГД)</span>
          <span style={{ fontSize: 11, color: T.text3 }}>{kgdOpen ? '▲' : '▼'}</span>
        </div>
        
        {kgdOpen && (
          <div style={{ marginTop: 8, maxHeight: 250, overflowY: 'auto', border: `1px solid ${T.bdr}`, borderRadius: 12, padding: 4, background: T.bg1 }}>
            {KGD_REPORTS.map(r => {
              const isSelected = selectedIds.has(r.id);
              return (
                <div key={r.id} 
                  onClick={() => toggleReport(r, 'kgd')}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.05)', background: isSelected ? 'rgba(200,164,90,0.1)' : 'transparent' }}
                >
                  <div style={{ width: 18, height: 18, border: `1px solid ${T.bdr}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? T.gold : 'transparent' }}>
                    {isSelected && <span style={{ fontSize: 12, color: '#1a1a1a' }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.code} {r.name}</div>
                    <div style={{ fontSize: 11, color: T.text3 }}>{r.deadline}</div>
                  </div>
                  <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'" }}>
                    {r.frequency === 'monthly' ? 'мес' : r.frequency === 'quarterly' ? 'кв' : 'год'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Блок БНС */}
      <div style={{ marginBottom: 16 }}>
        <div 
          onClick={() => setBnsOpen(!bnsOpen)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, cursor: 'pointer', background: 'rgba(78,201,190,0.06)', border: `1px solid ${T.teal}33` }}
        >
          <span style={{ fontSize: 16 }}>📊</span>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: T.teal }}>Статистика (БНС)</span>
          <span style={{ fontSize: 11, color: T.text3 }}>{bnsOpen ? '▲' : '▼'}</span>
        </div>
        
        {bnsOpen && (
          <div style={{ marginTop: 8, maxHeight: 250, overflowY: 'auto', border: `1px solid ${T.bdr}`, borderRadius: 12, padding: 4, background: T.bg1 }}>
            {BNS_REPORTS.map(r => {
              const isSelected = selectedIds.has(r.id);
              return (
                <div key={r.id} 
                  onClick={() => toggleReport(r, 'bns')}                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.05)', background: isSelected ? 'rgba(78,201,190,0.1)' : 'transparent' }}
                >
                  <div style={{ width: 18, height: 18, border: `1px solid ${T.bdr}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? T.teal : 'transparent' }}>
                    {isSelected && <span style={{ fontSize: 12, color: '#1a1a1a' }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.code} {r.name}</div>
                    <div style={{ fontSize: 11, color: T.text3 }}>{r.deadline}</div>
                  </div>
                  <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'" }}>
                    {r.frequency === 'monthly' ? 'мес' : r.frequency === 'quarterly' ? 'кв' : 'год'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button className="btn btn-primary" onClick={() => setView('active')} style={{ width: '100%' }}>
        Готово ({accountingReports.length} выбрано)
      </button>
    </div>
  );
}
