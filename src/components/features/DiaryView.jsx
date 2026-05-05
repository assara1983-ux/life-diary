// src/components/features/DiaryView.jsx
import { useState, useCallback } from 'react';
import { useAppContext } from '../../store/AppContext';

export function DiaryView() {
  const { diaryEntries, addEntry, updateEntry, deleteEntry } = useAppContext();
  const [newEntryText, setNewEntryText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const handleAddEntry = useCallback(() => {
    if (!newEntryText.trim()) return;
    
    addEntry({
      text: newEntryText.trim(),
      mood: null,
      tags: []
    });
    
    setNewEntryText('');
  }, [newEntryText, addEntry]);

  const handleStartEdit = useCallback((entry) => {
    setEditingId(entry.id);
    setEditText(entry.text);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingId || !editText.trim()) return;
    
    updateEntry(editingId, { text: editText.trim() });
    setEditingId(null);
    setEditText('');
  }, [editingId, editText, updateEntry]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText('');
  }, []);

  const handleDelete = useCallback((id) => {
    if (window.confirm('Удалить эту запись?')) {
      deleteEntry(id);
    }
  }, [deleteEntry]);

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('ru-RU', {        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <section style={{ padding: 0 }}>
      <h2 style={{ marginBottom: 16, fontSize: 18 }}>📔 Дневник</h2>

      {/* Форма добавления новой записи */}
      <div style={{ marginBottom: 20, padding: 12, background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)', borderRadius: 12 }}>
        <textarea
          value={newEntryText}
          onChange={(e) => setNewEntryText(e.target.value)}
          placeholder="Что произошло сегодня? Опишите свои мысли, чувства, события..."
          style={{
            width: '100%',
            minHeight: 100,
            padding: 12,
            marginBottom: 10,
            borderRadius: 8,
            border: '1px solid var(--tg-theme-hint-color, #ccc)',
            background: 'var(--tg-theme-bg-color, #fff)',
            color: 'var(--tg-theme-text-color, #000)',
            fontSize: 14,
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />
        <button
          onClick={handleAddEntry}
          disabled={!newEntryText.trim()}
          style={{
            width: '100%',
            padding: 12,
            background: newEntryText.trim() ? 'var(--tg-theme-button-color, #3390ec)' : '#ccc',
            color: 'var(--tg-theme-button-text-color, #fff)',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 500,
            cursor: newEntryText.trim() ? 'pointer' : 'not-allowed',
            transition: 'opacity 0.2s'
          }}        >
          Добавить запись
          // src/components/features/DiaryView.jsx
import { useState, useCallback } from 'react';
import { useAppContext } from '../../store/AppContext';

export function DiaryView() {
  const { diaryEntries, addEntry, updateEntry, deleteEntry } = useAppContext();
  const [newEntryText, setNewEntryText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const handleAddEntry = useCallback(() => {
    if (!newEntryText.trim()) return;
    
    addEntry({
      text: newEntryText.trim(),
      mood: null,
      tags: []
    });
    
    setNewEntryText('');
  }, [newEntryText, addEntry]);

  const handleStartEdit = useCallback((entry) => {
    setEditingId(entry.id);
    setEditText(entry.text);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingId || !editText.trim()) return;
    
    updateEntry(editingId, { text: editText.trim() });
    setEditingId(null);
    setEditText('');
  }, [editingId, editText, updateEntry]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText('');
  }, []);

  const handleDelete = useCallback((id) => {
    if (window.confirm('Удалить эту запись?')) {
      deleteEntry(id);
    }
  }, [deleteEntry]);

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('ru-RU', {        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <section style={{ padding: 0 }}>
      <h2 style={{ marginBottom: 16, fontSize: 18 }}>📔 Дневник</h2>

      {/* Форма добавления новой записи */}
      <div style={{ marginBottom: 20, padding: 12, background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)', borderRadius: 12 }}>
        <textarea
          value={newEntryText}
          onChange={(e) => setNewEntryText(e.target.value)}
          placeholder="Что произошло сегодня? Опишите свои мысли, чувства, события..."
          style={{
            width: '100%',
            minHeight: 100,
            padding: 12,
            marginBottom: 10,
            borderRadius: 8,
            border: '1px solid var(--tg-theme-hint-color, #ccc)',
            background: 'var(--tg-theme-bg-color, #fff)',
            color: 'var(--tg-theme-text-color, #000)',
            fontSize: 14,
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />
        <button
          onClick={handleAddEntry}
          disabled={!newEntryText.trim()}
          style={{
            width: '100%',
            padding: 12,
            background: newEntryText.trim() ? 'var(--tg-theme-button-color, #3390ec)' : '#ccc',
            color: 'var(--tg-theme-button-text-color, #fff)',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 500,
            cursor: newEntryText.trim() ? 'pointer' : 'not-allowed',
            transition: 'opacity 0.2s'
          }}        >
          Добавить запись
        </button>
      </div>

      {/* Список записей */}
      <div>
        {diaryEntries.length === 0 ? (
          <p style={{ textAlign: 'center', opacity: 0.5, padding: 40 }}>
            Пока нет записей. Начните вести дневник! ✨
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {diaryEntries.slice().reverse().map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: 14,
                  background: 'var(--tg-theme-bg-color, #fff)',
                  border: '1px solid var(--tg-theme-hint-color, #e0e0e0)',
                  borderRadius: 10,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                {editingId === entry.id ? (
                  // Режим редактирования
                  <>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: 80,
                        padding: 10,
                        marginBottom: 10,
                        borderRadius: 6,
                        border: '1px solid var(--tg-theme-button-color, #3390ec)',
                        background: 'var(--tg-theme-bg-color, #fff)',
                        color: 'var(--tg-theme-text-color, #000)',
                        fontSize: 14,
                        resize: 'vertical',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={handleSaveEdit}
                        disabled={!editText.trim()}
                        style={{
                          flex: 1,                          padding: 10,
                          background: editText.trim() ? 'var(--tg-theme-button-color, #3390ec)' : '#ccc',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          cursor: editText.trim() ? 'pointer' : 'not-allowed',
                          fontWeight: 500
                        }}
                      >
                        Сохранить
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        style={{
                          flex: 1,
                          padding: 10,
                          background: 'var(--tg-theme-secondary-bg-color, #f0f0f0)',
                          color: 'var(--tg-theme-text-color, #000)',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                      >
                        Отмена
                      </button>
                    </div>
                  </>
                ) : (
                  // Режим просмотра
                  <>
                    <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #888)', marginBottom: 8 }}>
                      {formatDate(entry.createdAt)}
                    </div>
                    <div style={{ fontSize: 15, lineHeight: 1.5, marginBottom: 10, whiteSpace: 'pre-wrap' }}>
                      {entry.text}
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleStartEdit(entry)}
                        style={{
                          padding: '6px 12px',
                          background: 'var(--tg-theme-secondary-bg-color, #f0f0f0)',
                          color: 'var(--tg-theme-text-color, #000)',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 13
                        }}
                      >                        ✏️ Изменить
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#ffebee',
                          color: '#c62828',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 13
                        }}
                      >
                        🗑️ Удалить
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
          }
