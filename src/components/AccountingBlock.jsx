// src/components/AccountingBlock.jsx
import { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { KGD_REPORTS, BNS_REPORTS } from '../data/kz-reports';
import { T } from '../utils/theme';

export function AccountingBlock() {
  const { accountingReports, setAccountingReports, notify } = useApp();
  
  // View: 'selection' | 'list'
  const [view, setView] = useState(accountingReports?.length > 0 ? 'list' : 'selection');
  
  // Состояния для выбора форм
  const [selectedKGD, setSelectedKGD] = useState([]);
  const [selectedBNS, setSelectedBNS] = useState([]);
  
  // Состояние для создания своей формы
  const [customModal, setCustomModal] = useState(false);
  const [customForm, setCustomForm] = useState({ 
    name: '', 
    frequency: 'monthly', 
    deadline: '', 
    type: 'custom' 
  });

  // Загрузка сохраненных отчетов при монтировании (если нужно синхронизировать чекбоксы)
  useEffect(() => {
    if (accountingReports) {
      // Можно добавить логику предзаполнения чекбоксов, если пользователь хочет редактировать список
    }
  }, [accountingReports]);

  const handleSelectKGD = (id) => {
    setSelectedKGD(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectBNS = (id) => {
    setSelectedBNS(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const saveSelection = () => {
    const newReports = [];

    // Добавляем выбранные КГД
    selectedKGD.forEach(id => {
      const report = KGD_REPORTS.find(r => r.id === id);      if (report && !accountingReports?.some(r => r.id === report.id)) {
        newReports.push({ ...report, status: 'pending' });
      }
    });

    // Добавляем выбранные БНС
    selectedBNS.forEach(id => {
      const report = BNS_REPORTS.find(r => r.id === id);
      if (report && !accountingReports?.some(r => r.id === report.id)) {
        newReports.push({ ...report, status: 'pending' });
      }
    });

    if (newReports.length === 0) {
      notify("Ничего не выбрано");
      return;
    }

    const updated = [...(accountingReports || []), ...newReports];
    setAccountingReports(updated);
    notify(`Добавлено ${newReports.length} отчетов`);
    setView('list');
    setSelectedKGD([]);
    setSelectedBNS([]);
  };

  const addCustomReport = () => {
    if (!customForm.name || !customForm.deadline) {
      notify("Заполните название и срок");
      return;
    }
    const newReport = {
      ...customForm,
      id: `custom-${Date.now()}`,
      code: '—',
      status: 'pending'
    };
    
    const updated = [...(accountingReports || []), newReport];
    setAccountingReports(updated);
    notify("Отчет добавлен");
    setCustomModal(false);
    setCustomForm({ name: '', frequency: 'monthly', deadline: '', type: 'custom' });
  };

  const deleteReport = (id) => {
    setAccountingReports(accountingReports.filter(r => r.id !== id));
    notify("Отчет удален");
  };
  const toggleStatus = (id) => {
    setAccountingReports(accountingReports.map(r => 
      r.id === id ? { ...r, status: r.status === 'done' ? 'pending' : 'done' } : r
    ));
  };

  // --- Рендер: Список отчетов ---
  if (view === 'list') {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ color: T.text0, margin: 0, fontSize: 18 }}>Мои отчеты</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setView('selection')}>+ Добавить</button>
            <button className="btn btn-primary btn-sm" onClick={() => setCustomModal(true)}>✦ Своя форма</button>
          </div>
        </div>

        {!accountingReports || accountingReports.length === 0 ? (
          <div style={{ textAlign: 'center', color: T.text3, padding: '20px 0' }}>
            Список пуст. Нажмите "+ Добавить", чтобы выбрать формы.
          </div>
        ) : (
          <div className="cards-stack">
            {accountingReports.map(report => (
              <div key={report.id} style={{ 
                background: report.status === 'done' ? 'rgba(45,106,79,0.05)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${report.status === 'done' ? T.success : T.bdr}`,
                borderRadius: 12, padding: 12, marginBottom: 8, position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text0 }}>
                      {report.code !== '—' && <span style={{ color: T.gold, marginRight: 6 }}>{report.code}</span>}
                      {report.name}
                    </div>
                    <div style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>
                       {report.deadline}
                    </div>
                    <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>
                      {report.frequency === 'monthly' ? 'Ежемесячно' : 
                       report.frequency === 'quarterly' ? 'Ежеквартально' : 
                       report.frequency === 'annual' ? 'Ежегодно' : report.frequency}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div 
                      onClick={() => toggleStatus(report.id)}
                      style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${report.status === 'done' ? T.success : T.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: report.status === 'done' ? T.success : 'transparent' }}
                    >                      {report.status === 'done' && <span style={{ color: '#fff', fontSize: 14 }}>✓</span>}
                    </div>
                    <span onClick={() => deleteReport(report.id)} style={{ cursor: 'pointer', color: T.text3, fontSize: 18 }}>×</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Модалка создания своей формы */}
        {customModal && (
          <div className="modal-overlay" onClick={() => setCustomModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ background: T.bg0, color: T.text0, padding: 20, borderRadius: 16, maxWidth: 400, width: '90%' }}>
              <h3 style={{ marginTop: 0 }}>Новая форма отчета</h3>
              
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, color: T.text3, marginBottom: 4 }}>Название</label>
                <input 
                  value={customForm.name} 
                  onChange={e => setCustomForm({...customForm, name: e.target.value})}
                  style={{ width: '100%', padding: 8, borderRadius: 8, border: `1px solid ${T.bdr}`, background: T.bg1, color: T.text0 }}
                  placeholder="Например: Отчет в пенсионный"
                />
              </div>

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
                <label style={{ display: 'block', fontSize: 12, color: T.text3, marginBottom: 4 }}>Срок сдачи</label>
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

  // --- Рендер: Выбор форм (КГД и БНС) ---
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ color: T.text0, margin: 0, fontSize: 18 }}>Настройка отчетов</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => setView('list')}>Назад к списку</button>
      </div>

      {/* Блок КГД */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ color: T.gold, marginBottom: 8 }}>️ Налоговая (КГД)</h4>
        <div style={{ maxHeight: 200, overflowY: 'auto', border: `1px solid ${T.bdr}`, borderRadius: 12, padding: 8, background: T.bg1 }}>
          {KGD_REPORTS.map(r => (
            <div key={r.id} 
              onClick={() => handleSelectKGD(r.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.05)', background: selectedKGD.includes(r.id) ? 'rgba(200,164,90,0.1)' : 'transparent' }}
            >
              <div style={{ width: 18, height: 18, border: `1px solid ${T.bdr}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedKGD.includes(r.id) ? T.gold : 'transparent' }}>
                {selectedKGD.includes(r.id) && <span style={{ fontSize: 12 }}>✓</span>}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{r.code} {r.name}</div>
                <div style={{ fontSize: 11, color: T.text3 }}>{r.deadline}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Блок БНС */}
      <div style={{ marginBottom: 20 }}>
        <h4 style={{ color: T.teal, marginBottom: 8 }}>📊 Статистика (БНС)</h4>
        <div style={{ maxHeight: 200, overflowY: 'auto', border: `1px solid ${T.bdr}`, borderRadius: 12, padding: 8, background: T.bg1 }}>
          {BNS_REPORTS.map(r => (
            <div key={r.id} 
              onClick={() => handleSelectBNS(r.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.05)', background: selectedBNS.includes(r.id) ? 'rgba(78,201,190,0.1)' : 'transparent' }}
            >
              <div style={{ width: 18, height: 18, border: `1px solid ${T.bdr}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedBNS.includes(r.id) ? T.teal : 'transparent' }}>                {selectedBNS.includes(r.id) && <span style={{ fontSize: 12 }}>✓</span>}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{r.code} {r.name}</div>
                <div style={{ fontSize: 11, color: T.text3 }}>{r.deadline}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn-primary" onClick={saveSelection} style={{ width: '100%' }}>
        Сохранить выбранные ({selectedKGD.length + selectedBNS.length})
      </button>
    </div>
  );
        }
