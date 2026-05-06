// src/components/TaskModal.jsx
import { useState } from 'react';
import { T } from '../utils/theme';

export function TaskModal({ task, onSave, onClose, defaultSection = 'tasks' }) {
  const [t, setT] = useState(task || {
    title: '',
    section: defaultSection,
    freq: 'once',
    priority: 'm',
    deadline: '',
    notes: '',
    preferredTime: '',
    lastDone: '',
  });

  const u = (k, v) => setT(p => ({ ...p, [k]: v }));

  const freqs = [
    ['once', 'разово'],
    ['daily', 'ежедневно'],
    ['workdays', 'пн–пт'],
    ['every:2', 'кажд. 2 дня'],
    ['every:3', 'кажд. 3 дня'],
    ['every:7', 'раз в нед.'],
    ['every:14', 'раз в 2 нед.'],
    ['every:30', 'раз в месяц'],
    ['monthly:1', '1-го числа'],
    ['monthly:15', '15-го числа'],
    ['weekly:6,0', 'выходные'],
  ];

  const openGCal = (title, date, desc = '') => {
    const s = new Date(date),
      e = new Date(s.getTime() + 3600000),
      f = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    window.open(
      `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${f(s)}/${f(e)}&details=${encodeURIComponent(desc)}`,
      '_blank'
    );
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <span className="modal-x" onClick={onClose}>✕</span>
        <div className="modal-title">{task ? 'Редактировать задачу' : 'Новая задача'}</div>
        
        <div className="fld">
          <label>Название</label>          <input
            autoFocus
            placeholder="Что нужно сделать?"
            value={t.title}
            onChange={(e) => u('title', e.target.value)}
          />
        </div>

        <div className="fld-row">
          <div className="fld">
            <label>Раздел</label>
            <select value={t.section} onChange={(e) => u('section', e.target.value)}>
              {[
                ['tasks', 'Общие'],
                ['work', 'Работа'],
                ['home', 'Дом'],
                ['health', 'Здоровье'],
                ['beauty', 'Уход'],
                ['pets', 'Питомцы'],
                ['shopping', 'Покупки'],
                ['hobbies', 'Хобби'],
                ['travel', 'Поездки'],
              ].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="fld">
            <label>Приоритет</label>
            <div className="chips">
              {[
                ['h', 'Высокий'],
                ['m', 'Средний'],
                ['l', 'Низкий'],
              ].map(([v, l]) => (
                <div
                  key={v}
                  className={`chip ${t.priority === v ? 'on' : ''}`}
                  onClick={() => u('priority', v)}
                >
                  {l}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="fld">
          <label>Повторение</label>
          <div className="chips">            {freqs.map(([v, l]) => (
              <div
                key={v}
                className={`chip ${t.freq === v ? 'on' : ''}`}
                onClick={() => u('freq', v)}
              >
                {l}
              </div>
            ))}
          </div>
        </div>

        <div className="fld-row">
          <div className="fld">
            <label>Дедлайн</label>
            <input type="datetime-local" value={t.deadline} onChange={(e) => u('deadline', e.target.value)} />
          </div>
          <div className="fld">
            <label>Удобное время</label>
            <input type="time" value={t.preferredTime} onChange={(e) => u('preferredTime', e.target.value)} />
          </div>
        </div>

        <div className="fld">
          <label>Заметка</label>
          <textarea value={t.notes} onChange={(e) => u('notes', e.target.value)} />
        </div>

        <div className="modal-foot">
          {t.deadline && (
            <button className="btn btn-ghost btn-sm" onClick={() => openGCal(t.title, t.deadline, t.notes)}>
              📅 Google Cal
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (!t.title.trim()) return;
              onSave({ ...t, id: t.id || Date.now() });
              onClose();
            }}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
