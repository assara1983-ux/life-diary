// src/sections/JournalSection.jsx
import { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { T } from '../utils/theme';

export function JournalSection() {
  const { journal, setJournal, profile, notify } = useApp();
  const [view, setView] = useState('today');
  const [showHistory, setShowHistory] = useState(false);
  const [showAi, setShowAi] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const todayEntry = journal[today] || {};

  // Обновление записи за сегодня
  const updateTodayEntry = (updates) => {
    setJournal((prev) => ({
      ...prev,
      [today]: { ...(prev[today] || {}), ...updates },
    }));
  };

  // Удаление записи
  const deleteEntry = (date) => {
    if (window.confirm('Удалить запись за ' + new Date(date).toLocaleDateString('ru-RU') + '?')) {
      setJournal((prev) => {
        const newJournal = { ...prev };
        delete newJournal[date];
        return newJournal;
      });
      notify('Запись удалена');
    }
  };

  // История записей
  const allEntries = useMemo(() => {
    return Object.entries(journal || {})
      .filter(([date]) => date !== today) // Исключаем сегодняшнюю запись
      .sort(([a], [b]) => b.localeCompare(a));
  }, [journal, today]);

  // AI-журнал
  const aiJournal = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('ld_ai_journal') || '[]');
    } catch {
      return [];
    }
  }, []);
  // Эмодзи настроения
  const moodEmojis = ['😔', '😕', '😐', '🙂', '😊', '🤩'];
  const moodLabels = ['Очень плохо', 'Плохо', 'Нормально', 'Хорошо', 'Отлично', 'Превосходно'];

  // Форматирование даты
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.toLocaleString('ru-RU', { month: 'long' });
    const weekday = d.toLocaleString('ru-RU', { weekday: 'short' });
    return `${weekday}, ${day} ${month}`;
  };

  return (
    <div className="journal-section" style={{ fontFamily: 'inherit' }}>
      {/* Заголовок и вкладки */}
      <div style={{ display: 'flex', gap: '2px', background: 'rgba(45,32,16,0.05)', border: `1px solid ${T.bdr}`, borderRadius: 12, padding: 4, marginBottom: 20 }}>
        <div
          onClick={() => setView('today')}
          style={{
            flex: 1, padding: '8px', borderRadius: 9, cursor: 'pointer', textAlign: 'center', fontSize: 14,
            background: view === 'today' ? 'rgba(45,106,79,0.12)' : 'transparent',
            color: view === 'today' ? T.gold : T.text2, transition: 'all .18s',
          }}
        >
          📝 Сегодня
        </div>
        <div
          onClick={() => setView('history')}
          style={{
            flex: 1, padding: '8px', borderRadius: 9, cursor: 'pointer', textAlign: 'center', fontSize: 14,
            background: view === 'history' ? 'rgba(45,106,79,0.12)' : 'transparent',
            color: view === 'history' ? T.gold : T.text2, transition: 'all .18s',
          }}
        >
          📖 История
        </div>
        <div
          onClick={() => setView('ai')}
          style={{
            flex: 1, padding: '8px', borderRadius: 9, cursor: 'pointer', textAlign: 'center', fontSize: 14,
            background: view === 'ai' ? 'rgba(45,106,79,0.12)' : 'transparent',
            color: view === 'ai' ? T.gold : T.text2, transition: 'all .18s',
          }}
        >
          🤖 AI
        </div>
      </div>

      {/* Вкладка: Сегодня */}      {view === 'today' && (
        <div className="today-entry" style={{ background: 'rgba(45,32,16,0.03)', borderRadius: 12, padding: 20, border: `1px solid ${T.bdrS}` }}>
          <h3 style={{ fontFamily: "'Cormorant Infant', serif", fontSize: 22, color: T.gold, marginBottom: 16 }}>
            📝 Запись за сегодня
          </h3>

          {/* Настроение */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }}>
              Настроение
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {moodEmojis.map((emoji, index) => (
                <button
                  key={emoji}
                  onClick={() => updateTodayEntry({ mood: emoji, moodIndex: index })}
                  style={{
                    fontSize: 28, cursor: 'pointer', padding: 8, borderRadius: 10,
                    background: todayEntry.moodIndex === index ? 'rgba(200,164,90,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${todayEntry.moodIndex === index ? T.gold + '88' : 'transparent'}`,
                    transition: 'all .15s',
                  }}
                  title={moodLabels[index]}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Энергия */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }}>
              Энергия: {todayEntry.energy || 0}/5
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => updateTodayEntry({ energy: level })}
                  style={{
                    width: 36, height: 36, borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                    background: todayEntry.energy >= level ? 'rgba(45,106,79,0.2)' : 'rgba(45,32,16,0.05)',
                    border: `1px solid ${todayEntry.energy >= level ? T.success : T.bdr}`,
                    color: todayEntry.energy >= level ? T.success : T.text3,
                    transition: 'all .15s',
                  }}
                >
                  {level}
                </button>              ))}
            </div>
          </div>

          {/* Поля ввода */}
          {[
            { key: 'win', icon: '🏆', label: 'Победа дня', placeholder: 'Что получилось сегодня?' },
            { key: 'insight', icon: '💡', label: 'Открытие', placeholder: 'Что понял(а) сегодня?' },
            { key: 'gratitude', icon: '🙏', label: 'Благодарность', placeholder: 'За что благодарен(а)?' },
            { key: 'notes', icon: '📝', label: 'Заметки', placeholder: 'Любые мысли...' },
          ].map((field) => (
            <div key={field.key} style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1.5, marginBottom: 6, textTransform: 'uppercase' }}>
                {field.icon} {field.label}
              </label>
              <textarea
                value={todayEntry[field.key] || ''}
                onChange={(e) => updateTodayEntry({ [field.key]: e.target.value })}
                placeholder={field.placeholder}
                style={{
                  width: '100%', minHeight: 60, padding: '10px 12px', borderRadius: 10,
                  border: `1px solid ${T.bdr}`, background: 'rgba(45,32,16,0.03)',
                  color: T.text0, fontSize: 15, fontFamily: "'Crimson Pro', serif",
                  resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5,
                }}
              />
            </div>
          ))}

          {/* Кнопка сохранения (опционально, так как данные сохраняются автоматически) */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              onClick={() => notify('Запись сохранена ✨')}
              style={{
                padding: '10px 20px', borderRadius: 10, border: 'none',
                background: `linear-gradient(135deg, ${T.gold}, ${T.goldL})`,
                color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                transition: 'all .15s',
              }}
            >
              💾 Сохранить запись
            </button>
          </div>
        </div>
      )}

      {/* Вкладка: История */}
      {view === 'history' && (
        <div className="history-entries">
          {allEntries.length === 0 ? (            <div style={{ textAlign: 'center', padding: 40, color: T.text3 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📖</div>
              <p style={{ fontSize: 16, fontStyle: 'italic' }}>Записей пока нет. Начни вести дневник сегодня!</p>
            </div>
          ) : (
            allEntries.map(([date, entry]) => (
              <div key={date} style={{ marginBottom: 16, padding: 16, background: 'rgba(45,32,16,0.03)', borderRadius: 12, border: `1px solid ${T.bdrS}` }}>
                {/* Шапка записи */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{entry.mood || '📝'}</span>
                    <div>
                      <div style={{ fontSize: 16, color: T.text0, fontWeight: 500 }}>{formatDate(date)}</div>
                      <div style={{ fontSize: 12, color: T.text3, fontFamily: "'JetBrains Mono'" }}>
                        {entry.energy ? `Энергия: ${entry.energy}/5` : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteEntry(date)}
                    style={{
                      background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: T.text3,
                      padding: 4, borderRadius: 6, transition: 'all .15s',
                    }}
                    onMouseOver={(e) => e.target.style.color = T.danger}
                    onMouseOut={(e) => e.target.style.color = T.text3}
                  >
                    🗑
                  </button>
                </div>

                {/* Содержимое записи */}
                <div style={{ display: 'grid', gap: 8 }}>
                  {entry.win && (
                    <div style={{ padding: '8px 12px', background: 'rgba(45,106,79,0.08)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: T.success, fontFamily: "'JetBrains Mono'", letterSpacing: 1, marginBottom: 4 }}>🏆 ПОБЕДА</div>
                      <div style={{ fontSize: 14, color: T.text1, lineHeight: 1.5 }}>{entry.win}</div>
                    </div>
                  )}
                  {entry.insight && (
                    <div style={{ padding: '8px 12px', background: 'rgba(200,164,90,0.08)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: T.gold, fontFamily: "'JetBrains Mono'", letterSpacing: 1, marginBottom: 4 }}>💡 ОТКРЫТИЕ</div>
                      <div style={{ fontSize: 14, color: T.text1, lineHeight: 1.5 }}>{entry.insight}</div>
                    </div>
                  )}
                  {entry.gratitude && (
                    <div style={{ padding: '8px 12px', background: 'rgba(29,78,107,0.08)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: T.teal, fontFamily: "'JetBrains Mono'", letterSpacing: 1, marginBottom: 4 }}>🙏 БЛАГОДАРНОСТЬ</div>
                      <div style={{ fontSize: 14, color: T.text1, lineHeight: 1.5 }}>{entry.gratitude}</div>
                    </div>                  )}
                  {entry.notes && (
                    <div style={{ padding: '8px 12px', background: 'rgba(45,32,16,0.05)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1, marginBottom: 4 }}>📝 ЗАМЕТКИ</div>
                      <div style={{ fontSize: 14, color: T.text2, lineHeight: 1.5, fontStyle: 'italic' }}>{entry.notes}</div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Вкладка: AI-ответы */}
      {view === 'ai' && (
        <div className="ai-answers">
          {aiJournal.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: T.text3 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
              <p style={{ fontSize: 16, fontStyle: 'italic' }}>AI-ответов пока нет. Используй AI-советника в других разделах!</p>
            </div>
          ) : (
            aiJournal.map((item, index) => (
              <div key={index} style={{ marginBottom: 16, padding: 16, background: 'rgba(78,201,190,0.05)', borderRadius: 12, border: `1px solid ${T.teal}33` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>🤖</span>
                    <div>
                      <div style={{ fontSize: 14, color: T.teal, fontWeight: 500 }}>{item.label || 'AI-совет'}</div>
                      <div style={{ fontSize: 11, color: T.text3, fontFamily: "'JetBrains Mono'" }}>
                        {new Date(item.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 14, color: T.text1, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.text}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
