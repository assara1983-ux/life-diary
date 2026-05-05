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
