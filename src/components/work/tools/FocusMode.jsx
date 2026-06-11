// src/components/work/tools/FocusMode.jsx
import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../store/AppContext';

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function FocusMode() {
  const { tasks, setTasks, notify } = useApp();

  const [isActive,       setIsActive]       = useState(false);
  const [timeLeft,       setTimeLeft]       = useState(25 * 60);
  const [selectedTask,   setSelectedTask]   = useState(null);
  const [customMinutes,  setCustomMinutes]  = useState(25);
  const [manualTask,     setManualTask]     = useState('');
  const [showManual,     setShowManual]     = useState(false);
  const [sessionsToday,  setSessionsToday]  = useState(() => {
    try { return parseInt(localStorage.getItem('ld_focus_sessions_today') || '0'); }
    catch { return 0; }
  });

  const workTasks = useMemo(() =>
    tasks.filter(t => t.section === 'work' && !t.doneDate),
    [tasks]
  );

  useEffect(() => {
    localStorage.setItem('ld_focus_sessions_today', sessionsToday.toString());
  }, [sessionsToday]);

  useEffect(() => {
    if (!isActive) return;
    if (timeLeft === 0) { finishSession(); return; }
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [isActive, timeLeft]); // eslint-disable-line

  useEffect(() => { return () => setIsActive(false); }, []);

  const activeTaskTitle = selectedTask?.title || (manualTask.trim() || null);

  const finishSession = () => {
    setIsActive(false);
    setSessionsToday(s => s + 1);
    const today = localDateStr();
    if (selectedTask) {
      setTasks(prev => prev.map(t =>
        t.id === selectedTask.id ? { ...t, doneDate: today, status: 'done' } : t
      ));
      notify(`✨ Сессия завершена! «${selectedTask.title}» выполнена`);
      setSelectedTask(null);
    } else if (manualTask.trim()) {
      notify(`✨ Сессия завершена! «${manualTask.trim()}» — отличная работа`);
    } else {
      notify('✨ Сессия фокуса завершена! Отличная работа');
    }
    setTimeLeft(customMinutes * 60);
  };

  const startTimer = () => {
    if (!activeTaskTitle) { notify('Выберите или введите задачу для фокуса'); return; }
    setTimeLeft(customMinutes * 60);
    setIsActive(true);
  };

  const pauseTimer  = () => setIsActive(false);
  const resetTimer  = () => { setIsActive(false); setTimeLeft(customMinutes * 60); };
  const changeDuration = (n) => { setCustomMinutes(n); if (!isActive) setTimeLeft(n * 60); };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const progress         = 1 - timeLeft / (customMinutes * 60);
  const circumference    = 2 * Math.PI * 110;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div style={{ color: 'var(--text0)', paddingBottom: 24 }}>
      {/* Заголовок */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 14, fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: 3, color: 'var(--text3)', marginBottom: 4,
        }}>FOCUS MODE</div>
        <div style={{ fontSize: 18, fontFamily: "'Cormorant Infant',serif", color: 'var(--text0)' }}>
          Глубокая концентрация · Энергия потока
        </div>
      </div>

      {/* Выбор задачи */}
      <div style={{
        marginBottom: 20, padding: '14px 16px',
        background: 'rgba(0,112,192,0.04)',
        border: '1px solid rgba(0,112,192,0.15)',
        borderRadius: 12,
      }}>
        {/* Переключатель режима */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <button
            onClick={() => { setShowManual(false); setManualTask(''); }}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 14,
              fontFamily: "'JetBrains Mono',monospace", cursor: 'pointer',
              background: !showManual ? 'rgba(0,112,192,0.12)' : 'transparent',
              border: `1px solid ${!showManual ? 'rgba(0,112,192,0.4)' : 'rgba(0,0,0,0.1)'}`,
              color: !showManual ? '#0070c0' : 'var(--text3)',
            }}
          >Из списка</button>
          <button
            onClick={() => { setShowManual(true); setSelectedTask(null); }}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 14,
              fontFamily: "'JetBrains Mono',monospace", cursor: 'pointer',
              background: showManual ? 'rgba(0,112,192,0.12)' : 'transparent',
              border: `1px solid ${showManual ? 'rgba(0,112,192,0.4)' : 'rgba(0,0,0,0.1)'}`,
              color: showManual ? '#0070c0' : 'var(--text3)',
            }}
          >Ввести вручную</button>
        </div>

        {/* Список задач */}
        {!showManual && (
          workTasks.length === 0 ? (
            <div style={{
              fontSize: 16, color: 'var(--text3)', textAlign: 'center',
              padding: '12px 0',
            }}>
              Нет активных задач —{' '}
              <span
                onClick={() => setShowManual(true)}
                style={{ color: BT.navyMid, cursor: 'pointer', textDecoration: 'underline' }}
              >введите вручную</span>
            </div>
          ) : (
            <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {workTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                  style={{
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 16,
                    background: selectedTask?.id === task.id ? 'rgba(0,112,192,0.08)' : 'transparent',
                    border: `1px solid ${selectedTask?.id === task.id ? 'rgba(0,112,192,0.3)' : 'rgba(0,0,0,0.06)'}`,
                    color: selectedTask?.id === task.id ? '#0070c0' : 'var(--text1)',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: selectedTask?.id === task.id ? '#0070c0' : 'rgba(0,0,0,0.15)',
                  }} />
                  {task.title}
                </div>
              ))}
            </div>
          )
        )}

        {/* Ручной ввод */}
        {showManual && (
          <div>
            <div style={{
              fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: 1, color: 'var(--text3)', marginBottom: 8,
            }}>НА ЧЁМ СОСРЕДОТОЧИТЬСЯ?</div>
            <input
              value={manualTask}
              onChange={e => setManualTask(e.target.value)}
              placeholder="Напишите задачу или цель сессии..."
              style={{
                width: '100%', padding: '10px 12px',
                background: 'rgba(255,255,255,0.8)',
                border: '1px solid rgba(0,112,192,0.2)',
                borderRadius: 8, color: 'var(--text0)',
                fontSize: 16, outline: 'none', boxSizing: 'border-box',
              }}
            />
            {manualTask.trim() && (
              <div style={{
                marginTop: 8, fontSize: 14, color: BT.navyMid,
                fontFamily: "'JetBrains Mono',monospace",
              }}>
                ✓ Задача установлена
              </div>
            )}
          </div>
        )}
      </div>

      {/* Круговой таймер SVG */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <div style={{ position: 'relative', width: 260, height: 260 }}>
          <svg width="260" height="260" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="130" cy="130" r="110"
              fill="none" stroke="rgba(0,112,192,0.1)" strokeWidth="12" />
            <circle cx="130" cy="130" r="110"
              fill="none"
              stroke={isActive ? '#0070c0' : 'rgba(0,112,192,0.3)'}
              strokeWidth="12" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
            />
            {isActive && (
              <circle cx="130" cy="130" r="110"
                fill="none" stroke="rgba(0,112,192,0.08)" strokeWidth="24"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              />
            )}
          </svg>

          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)', textAlign: 'center',
          }}>
            <div style={{
              fontSize: 48, fontWeight: 700,
              fontFamily: "'JetBrains Mono',monospace",
              color: isActive ? '#0070c0' : 'var(--text1)',
              letterSpacing: 2,
            }}>
              {formatTime(timeLeft)}
            </div>
            <div style={{
              fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: 2, color: 'var(--text3)', marginTop: 4,
            }}>
              {isActive ? 'В ПОТОКЕ' : 'ГОТОВ'}
            </div>
          </div>
        </div>
      </div>

      {/* Кнопки */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        {!isActive ? (
          <button onClick={startTimer} className="btn btn-primary" style={{ padding: '12px 32px', borderRadius: 24, fontSize: 17 }}>
            ▶ НАЧАТЬ
          </button>
        ) : (
          <button onClick={pauseTimer} style={{
            padding: '12px 32px', borderRadius: 24,
            background: 'rgba(139,32,32,0.1)', border: '1px solid rgba(139,32,32,0.3)',
            color: 'var(--error)', fontSize: 17, cursor: 'pointer',
          }}>
            ⏸ ПАУЗА
          </button>
        )}
        <button onClick={resetTimer} className="btn btn-ghost" style={{ padding: '12px 24px', borderRadius: 24 }}>
          Сброс
        </button>
      </div>

      {/* Длительность */}
      <div style={{
        padding: '14px 16px',
        background: 'rgba(0,112,192,0.03)',
        border: '1px solid rgba(0,112,192,0.1)',
        borderRadius: 12, marginBottom: 16,
      }}>
        <div style={{
          fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: 2, color: 'var(--text3)', marginBottom: 10,
        }}>ДЛИТЕЛЬНОСТЬ · {customMinutes} МИН</div>
        <input
          type="range" min="5" max="90" step="5"
          value={customMinutes}
          onChange={e => changeDuration(Number(e.target.value))}
          disabled={isActive}
          style={{ width: '100%', accentColor: '#0070c0' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {[15, 25, 45, 60, 90].map(n => (
            <div key={n} onClick={() => !isActive && changeDuration(n)}
              style={{
                padding: '4px 12px', borderRadius: 10, fontSize: 14,
                fontFamily: "'JetBrains Mono',monospace",
                border: `1px solid ${customMinutes === n ? 'rgba(0,112,192,0.4)' : 'rgba(0,0,0,0.1)'}`,
                background: customMinutes === n ? 'rgba(0,112,192,0.08)' : 'transparent',
                color: customMinutes === n ? '#0070c0' : 'var(--text3)',
                cursor: isActive ? 'not-allowed' : 'pointer',
                opacity: isActive ? 0.5 : 1,
              }}
            >{n}</div>
          ))}
        </div>
      </div>

      {/* Статистика */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{
          flex: 1, padding: '12px 14px', textAlign: 'center',
          background: 'rgba(0,112,192,0.04)',
          border: '1px solid rgba(0,112,192,0.12)',
          borderRadius: 10,
        }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: BT.navyMid }}>
            {sessionsToday}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>
            СЕССИЙ СЕГОДНЯ
          </div>
        </div>
        {activeTaskTitle && (
          <div style={{
            flex: 2, padding: '12px 14px',
            background: 'rgba(0,112,192,0.04)',
            border: '1px solid rgba(0,112,192,0.15)',
            borderRadius: 10,
            borderLeft: '3px solid #0070c0',
          }}>
            <div style={{ fontSize: 13, color: BT.navyMid, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, marginBottom: 4 }}>
              ЗАДАЧА В ФОКУСЕ
            </div>
            <div style={{ fontSize: 16, color: 'var(--text1)', lineHeight: 1.4 }}>
              {activeTaskTitle}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
