// src/components/work/tools/FocusMode.jsx
import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../store/AppContext';

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function FocusMode() {
  const { tasks, setTasks, notify } = useApp();

  const [isActive, setIsActive]         = useState(false);
  const [timeLeft, setTimeLeft]         = useState(25 * 60);
  const [selectedTask, setSelectedTask] = useState(null);
  const [customMinutes, setCustomMinutes] = useState(25);
  const [sessionsToday, setSessionsToday] = useState(() => {
    try { return parseInt(localStorage.getItem('ld_focus_sessions_today') || '0'); }
    catch { return 0; }
  });

  const workTasks = useMemo(() =>
    tasks.filter(t => t.section === 'work' && !t.doneDate),
    [tasks]
  );

  // Сохранение сессий
  useEffect(() => {
    localStorage.setItem('ld_focus_sessions_today', sessionsToday.toString());
  }, [sessionsToday]);

  // Таймер
  useEffect(() => {
    if (!isActive) return;
    if (timeLeft === 0) { finishSession(); return; }
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [isActive, timeLeft]); // eslint-disable-line

  // Cleanup при размонтировании
  useEffect(() => {
    return () => setIsActive(false);
  }, []);

  const finishSession = () => {
    setIsActive(false);
    setSessionsToday(s => s + 1);
    const today = localDateStr();
    if (selectedTask) {
      setTasks(prev => prev.map(t =>
        t.id === selectedTask.id
          ? { ...t, doneDate: today, status: 'done' }
          : t
      ));
      notify(`✨ Сессия завершена! «${selectedTask.title}» выполнена`);
      setSelectedTask(null);
    } else {
      notify('✨ Сессия фокуса завершена! Отличная работа');
    }
    setTimeLeft(customMinutes * 60);
  };

  const startTimer = () => {
    if (!selectedTask) { notify('Выберите задачу для фокуса'); return; }
    setTimeLeft(customMinutes * 60);
    setIsActive(true);
  };

  const pauseTimer = () => setIsActive(false);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(customMinutes * 60);
  };

  const changeDuration = (n) => {
    setCustomMinutes(n);
    if (!isActive) setTimeLeft(n * 60);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const progress = 1 - timeLeft / (customMinutes * 60);
  const circumference = 2 * Math.PI * 110;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div style={{ color: 'var(--text0)', paddingBottom: 24 }}>
      {/* Заголовок */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 11, fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: 3, color: 'rgba(200,164,90,0.7)', marginBottom: 4,
        }}>FOCUS MODE</div>
        <div style={{ fontSize: 18, fontFamily: "'Cormorant Infant',serif", color: 'var(--text0)' }}>
          Глубокая концентрация · Энергия потока
        </div>
      </div>

      {/* Выбор задачи */}
      <div style={{
        marginBottom: 24, padding: 14,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(200,164,90,0.2)',
        borderRadius: 12,
      }}>
        <div style={{
          fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: 2, color: 'rgba(200,164,90,0.6)', marginBottom: 10,
        }}>ВЫБЕРИТЕ ЗАДАЧУ</div>
        {workTasks.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: '12px 0' }}>
            Нет активных рабочих задач
          </div>
        ) : (
          <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {workTasks.map(task => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                style={{
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                  background: selectedTask?.id === task.id ? 'rgba(200,164,90,0.12)' : 'transparent',
                  border: `1px solid ${selectedTask?.id === task.id ? 'rgba(200,164,90,0.5)' : 'transparent'}`,
                  color: selectedTask?.id === task.id ? 'rgba(200,164,90,0.9)' : 'var(--text2)',
                  transition: 'all 0.15s',
                }}
              >
                {task.title}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Круговой таймер SVG */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <div style={{ position: 'relative', width: 260, height: 260 }}>
          <svg width="260" height="260" style={{ transform: 'rotate(-90deg)' }}>
            {/* Фоновый круг */}
            <circle cx="130" cy="130" r="110"
              fill="none" stroke="rgba(200,164,90,0.1)" strokeWidth="12" />
            {/* Прогресс */}
            <circle cx="130" cy="130" r="110"
              fill="none"
              stroke={isActive ? 'rgba(200,164,90,0.8)' : 'rgba(200,164,90,0.4)'}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
            />
            {/* Свечение */}
            {isActive && (
              <circle cx="130" cy="130" r="110"
                fill="none" stroke="rgba(200,164,90,0.15)" strokeWidth="24"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              />
            )}
          </svg>

          {/* Время в центре */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)', textAlign: 'center',
          }}>
            <div style={{
              fontSize: 48, fontWeight: 700,
              fontFamily: "'JetBrains Mono',monospace",
              color: isActive ? 'rgba(200,164,90,0.95)' : 'var(--text1)',
              letterSpacing: 2,
              textShadow: isActive ? '0 0 30px rgba(200,164,90,0.4)' : 'none',
            }}>
              {formatTime(timeLeft)}
            </div>
            <div style={{
              fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: 2, color: 'rgba(255,255,255,0.3)', marginTop: 4,
            }}>
              {isActive ? 'В ПОТОКЕ' : 'ГОТОВ'}
            </div>
          </div>
        </div>
      </div>

      {/* Кнопки управления */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        {!isActive ? (
          <button onClick={startTimer} style={{
            padding: '12px 32px', borderRadius: 24,
            background: 'linear-gradient(135deg, rgba(200,164,90,0.3), rgba(200,164,90,0.1))',
            border: '1px solid rgba(200,164,90,0.6)',
            color: 'rgba(200,164,90,0.95)', fontSize: 15,
            fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, cursor: 'pointer',
          }}>
            ▶ НАЧАТЬ
          </button>
        ) : (
          <button onClick={pauseTimer} style={{
            padding: '12px 32px', borderRadius: 24,
            background: 'rgba(153,27,27,0.3)', border: '1px solid rgba(239,68,68,0.5)',
            color: 'rgba(239,68,68,0.9)', fontSize: 15,
            fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, cursor: 'pointer',
          }}>
            ⏸ ПАУЗА
          </button>
        )}
        <button onClick={resetTimer} style={{
          padding: '12px 24px', borderRadius: 24,
          background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
          color: 'var(--text3)', fontSize: 13, cursor: 'pointer',
        }}>
          Сброс
        </button>
      </div>

      {/* Слайдер длительности */}
      <div style={{
        padding: '14px 16px', background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, marginBottom: 16,
      }}>
        <div style={{
          fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: 2, color: 'rgba(200,164,90,0.6)', marginBottom: 10,
        }}>ДЛИТЕЛЬНОСТЬ · {customMinutes} МИН</div>
        <input
          type="range" min="5" max="90" step="5"
          value={customMinutes}
          onChange={e => changeDuration(Number(e.target.value))}
          disabled={isActive}
          style={{ width: '100%', accentColor: 'rgba(200,164,90,0.8)' }}
        />
        {/* Быстрые варианты */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {[15, 25, 45, 60, 90].map(n => (
            <div key={n} onClick={() => !isActive && changeDuration(n)}
              style={{
                padding: '4px 12px', borderRadius: 12, fontSize: 11,
                fontFamily: "'JetBrains Mono',monospace",
                border: `1px solid ${customMinutes === n ? 'rgba(200,164,90,0.6)' : 'rgba(255,255,255,0.1)'}`,
                background: customMinutes === n ? 'rgba(200,164,90,0.1)' : 'transparent',
                color: customMinutes === n ? 'rgba(200,164,90,0.9)' : 'var(--text3)',
                cursor: isActive ? 'not-allowed' : 'pointer',
                opacity: isActive ? 0.5 : 1,
              }}
            >{n}</div>
          ))}
        </div>
      </div>

      {/* Статистика */}
      <div style={{
        display: 'flex', gap: 12,
      }}>
        <div style={{
          flex: 1, padding: '12px 14px', textAlign: 'center',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'rgba(200,164,90,0.9)' }}>
            {sessionsToday}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>
            СЕССИЙ СЕГОДНЯ
          </div>
        </div>
        {selectedTask && (
          <div style={{
            flex: 2, padding: '12px 14px',
            background: 'rgba(200,164,90,0.06)', border: '1px solid rgba(200,164,90,0.2)',
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 10, color: 'rgba(200,164,90,0.6)', fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, marginBottom: 4 }}>
              ЗАДАЧА В ФОКУСЕ
            </div>
            <div style={{ fontSize: 13, color: 'var(--text1)', lineHeight: 1.4 }}>
              {selectedTask.title}
            </div>
          </div>
        )}
      </div>
    </div>
  );
            }
