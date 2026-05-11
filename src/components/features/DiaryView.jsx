// src/components/features/DiaryView.jsx
// ✅ ИСПРАВЛЕНО: useAppContext → useApp (useAppContext не существует в AppContext)
import { useState, useCallback } from 'react';
import { useApp } from '../../store/AppContext';

export function DiaryView() {
  // ✅ Используем journal из AppContext вместо несуществующих diaryEntries
  const { journal, setJournal, notify } = useApp();
  const [newEntryText, setNewEntryText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  // Преобразуем journal (объект по датам) в массив записей
  const diaryEntries = Object.entries(journal || {})
    .filter(([, v]) => v.text)
    .map(([date, v]) => ({ id: date, text: v.text, createdAt: date, ...v }))
    .sort((a, b) => b.id.localeCompare(a.id));

  const handleAddEntry = useCallback(() => {
    if (!newEntryText.trim()) return;
    const today = new Date().toISOString().split('T')[0];
    setJournal(prev => ({
      ...prev,
      [today]: { ...(prev[today] || {}), text: newEntryText.trim() }
    }));
    setNewEntryText('');
    notify && notify('Запись добавлена ✦');
  }, [newEntryText, setJournal, notify]);

  const handleSaveEdit = useCallback(() => {
    if (!editingId || !editText.trim()) return;
    setJournal(prev => ({
      ...prev,
      [editingId]: { ...(prev[editingId] || {}), text: editText.trim() }
    }));
    setEditingId(null);
    setEditText('');
  }, [editingId, editText, setJournal]);

  const handleDelete = useCallback((id) => {
    if (window.confirm('Удалить эту запись?')) {
      setJournal(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, [setJournal]);

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
    } catch { return dateStr; }
  };

  return (
    <section style={{ padding: 0 }}>
      <h2 style={{ marginBottom: 16, fontSize: 18 }}>📔 Дневник</h2>
      <div style={{ marginBottom: 20, padding: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
        <textarea
          value={newEntryText}
          onChange={e => setNewEntryText(e.target.value)}
          placeholder="Что произошло сегодня?"
          style={{ width: '100%', minHeight: 100, padding: 12, marginBottom: 10,
            borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.06)', color: 'inherit',
            fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
        />
        <button onClick={handleAddEntry} disabled={!newEntryText.trim()}
          style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none',
            background: newEntryText.trim() ? '#c8a45a' : '#555', color: '#1a1208',
            fontWeight: 600, cursor: newEntryText.trim() ? 'pointer' : 'not-allowed' }}>
          Добавить запись
        </button>
      </div>

      {diaryEntries.length === 0
        ? <p style={{ textAlign: 'center', opacity: 0.5, padding: 40 }}>Пока нет записей ✨</p>
        : diaryEntries.map(entry => (
          <div key={entry.id} style={{ padding: 14, marginBottom: 12,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
            {editingId === entry.id ? (
              <>
                <textarea value={editText} onChange={e => setEditText(e.target.value)}
                  style={{ width: '100%', minHeight: 80, padding: 10, marginBottom: 10,
                    borderRadius: 6, border: '1px solid #c8a45a', background: 'rgba(255,255,255,0.06)',
                    color: 'inherit', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleSaveEdit}
                    style={{ flex: 1, padding: 10, background: '#c8a45a', color: '#1a1208', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
                    Сохранить
                  </button>
                  <button onClick={() => setEditingId(null)}
                    style={{ flex: 1, padding: 10, background: 'rgba(255,255,255,0.08)', color: 'inherit', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                    Отмена
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 8 }}>{formatDate(entry.id)}</div>
                <div style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 10, whiteSpace: 'pre-wrap' }}>{entry.text}</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setEditingId(entry.id); setEditText(entry.text); }}
                    style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: 'inherit' }}>
                    ✏️ Изменить
                  </button>
                  <button onClick={() => handleDelete(entry.id)}
                    style={{ padding: '6px 12px', background: 'rgba(217,4,41,0.12)', color: '#E87878', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                    🗑️ Удалить
                  </button>
                </div>
              </>
            )}
          </div>
        ))
      }
    </section>
  );
                  }
