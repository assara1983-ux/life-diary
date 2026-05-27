// src/components/work/tools/EnhancedKanban.jsx
import { useState, useMemo } from 'react';
import { useApp } from '../../../store/AppContext';
import { TaskModal } from '../../TaskModal';

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const COLUMNS = [
  { id: 'todo',       title: 'К выполнению', color: 'rgba(0,112,192,0.3)' },
  { id: 'inprogress', title: 'В работе',     color: 'rgba(200,164,90,0.3)' },
  { id: 'review',     title: 'На проверке',  color: 'rgba(168,85,247,0.3)' },
  { id: 'done',       title: 'Выполнено',    color: 'rgba(34,197,94,0.3)'  },
];

export function EnhancedKanban() {
  const { tasks, setTasks, notify } = useApp();
  const [taskModal, setTaskModal] = useState(null);
  const [draggedId, setDraggedId] = useState(null);

  const today = localDateStr();

  // Инициализация status для work-задач без него
  useMemo(() => {
    const needsUpdate = tasks.some(t => t.section === 'work' && !t.status);
    if (needsUpdate) {
      setTasks(prev => prev.map(t =>
        t.section === 'work' && !t.status ? { ...t, status: 'todo' } : t
      ));
    }
  }, []); // eslint-disable-line

  const workTasks = useMemo(() =>
    tasks.filter(t => t.section === 'work'),
    [tasks]
  );

  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    if (!id) return;
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, status: targetStatus } : t
    ));
    const col = COLUMNS.find(c => c.id === targetStatus);
    notify(`Перемещено → ${col?.title}`);
    setDraggedId(null);
  };

  const toggleSubtask = (taskId, si) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId || !Array.isArray(t.subtasks)) return t;
      const subtasks = t.subtasks.map((s, i) =>
        i === si ? { ...s, completed: !s.completed } : s
      );
      return { ...t, subtasks };
    }));
  };

  const toggleDone = (taskId) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const isDone = t.doneDate === today;
      return { ...t, doneDate: isDone ? null : today, status: isDone ? 'todo' : 'done' };
    }));
  };

  return (
    <div style={{ color: 'var(--text0)', paddingBottom: 24 }}>
      {/* Заголовок */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20, flexWrap: 'wrap', gap: 10,
      }}>
        <div>
          <div style={{
            fontSize: 11, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: 3, color: 'rgba(200,164,90,0.7)', marginBottom: 4,
          }}>КАНБАН ЭХО</div>
          <div style={{ fontSize: 18, fontFamily: "'Cormorant Infant',serif", color: 'var(--text0)' }}>
            Сакральная организация задач
          </div>
        </div>
        <button
          onClick={() => setTaskModal({})}
          style={{
            padding: '10px 20px', borderRadius: 20, border: '1px solid rgba(200,164,90,0.5)',
            background: 'rgba(200,164,90,0.1)', color: 'rgba(200,164,90,0.9)',
            cursor: 'pointer', fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
          }}
        >
          + Новая задача
        </button>
      </div>

      {/* Колонки — горизонтальный скролл на мобильном */}
      <div style={{
        display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8,
      }}>
        {COLUMNS.map(col => {
          const colTasks = workTasks.filter(t => (t.status || 'todo') === col.id);
          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, col.id)}
              style={{
                flex: '0 0 260px', minHeight: 400,
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${col.color}`,
                borderRadius: 14, padding: 14,
              }}
            >
              {/* Заголовок колонки */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 14,
              }}>
                <div style={{
                  fontSize: 12, fontFamily: "'JetBrains Mono',monospace",
                  letterSpacing: 1, color: 'rgba(200,164,90,0.8)',
                }}>{col.title.toUpperCase()}</div>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: col.color, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: 'rgba(255,255,255,0.7)',
                }}>{colTasks.length}</div>
              </div>

              {/* Задачи */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {colTasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('text/plain', task.id);
                      handleDragStart(e, task.id);
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: `1px solid ${task.doneDate === today ? 'rgba(34,197,94,0.4)' : 'rgba(200,164,90,0.2)'}`,
                      borderRadius: 10, padding: 12, cursor: 'grab',
                      transition: 'all 0.15s',
                      opacity: task.doneDate === today ? 0.7 : 1,
                    }}
                  >
                    {/* Чекбокс + название */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div
                        onClick={() => toggleDone(task.id)}
                        style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 2,
                          border: `1.5px solid ${task.doneDate === today ? 'rgba(34,197,94,0.8)' : 'rgba(200,164,90,0.4)'}`,
                          background: task.doneDate === today ? 'rgba(34,197,94,0.2)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', fontSize: 9, color: 'rgba(34,197,94,0.9)',
                        }}
                      >
                        {task.doneDate === today ? '✓' : ''}
                      </div>
                      <div style={{
                        fontSize: 13, color: 'var(--text1)', lineHeight: 1.4,
                        textDecoration: task.doneDate === today ? 'line-through' : 'none',
                        flex: 1,
                      }}>
                        {task.title}
                      </div>
                    </div>

                    {/* Дедлайн */}
                    {task.deadline && (
                      <div style={{
                        marginTop: 6, fontSize: 10,
                        fontFamily: "'JetBrains Mono',monospace",
                        color: 'rgba(200,164,90,0.6)',
                      }}>
                        до {task.deadline.split('T')[0]}
                      </div>
                    )}

                    {/* Подзадачи */}
                    {Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        {task.subtasks.map((sub, si) => (
                          <div
                            key={si}
                            onClick={() => toggleSubtask(task.id, si)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '3px 0', cursor: 'pointer', fontSize: 12,
                              color: sub.completed ? 'rgba(255,255,255,0.4)' : 'var(--text2)',
                            }}
                          >
                            <input
                              type="checkbox" checked={!!sub.completed} readOnly
                              style={{ accentColor: 'rgba(200,164,90,0.8)', width: 12, height: 12 }}
                            />
                            <span style={{ textDecoration: sub.completed ? 'line-through' : 'none' }}>
                              {sub.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <div style={{
                    padding: '30px 0', textAlign: 'center',
                    fontSize: 11, color: 'rgba(255,255,255,0.2)',
                    fontFamily: "'JetBrains Mono',monospace",
                  }}>
                    пусто
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* TaskModal */}
      {taskModal !== null && (
        <TaskModal
          task={taskModal?.id ? taskModal : null}
          defaultSection="work"
          onSave={t => {
            setTasks(prev =>
              taskModal?.id
                ? prev.map(x => x.id === t.id ? { ...t, status: t.status || 'todo' } : x)
                : [...prev, { ...t, status: 'todo' }]
            );
            setTaskModal(null);
          }}
          onClose={() => setTaskModal(null)}
        />
      )}
    </div>
  );
                              }
