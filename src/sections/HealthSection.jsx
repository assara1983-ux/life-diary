// src/sections/HealthSection.jsx
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { TaskModal } from '../components/TaskModal';
import { T } from '../utils/theme';

export function HealthSection() {
  const { profile, tasks, setTasks, setShopList, notify } = useApp();
  const [modal, setModal] = useState(null);
  const [healthTab, setHealthTab] = useState('today');
  const [adviceOpen, setAdviceOpen] = useState(true);
  const [habitsOpen, setHabitsOpen] = useState(true);
  const [weekMenu, setWeekMenu] = useState(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [openDay, setOpenDay] = useState(0);
  const [openMeal, setOpenMeal] = useState(null);

  const today = new Date().toISOString().split('T')[0];
  const healthTasks = tasks.filter(t => t.section === 'health');
  const due = healthTasks.filter(t => isDue(t, today));

  // Есть ли цель связанная с весом/здоровьем?
  const hasWeightGoal = (profile.mainGoal || '').toLowerCase().match(/похуде|вес|фигур|набрать|сбросить|стройн/);
  const hasHealthGoal = (profile.goalAreas || []).some(a => ['Здоровье', 'Внешность'].includes(a));

  const season = (() => {
    const m = new Date().getMonth();
    return m < 2 || m > 10 ? 'зима' : m < 5 ? 'весна' : m < 8 ? 'лето' : 'осень';
  })();

  // Генерация недельного меню
  const generateMenu = async () => {
    setMenuLoading(true);
    // Здесь должен быть вызов AI для генерации меню
    // Для примера создадим заглушку
    setTimeout(() => {
      setWeekMenu({
        days: [
          {
            day: 'Понедельник',
            meals: [
              { type: 'Завтрак', name: 'Овсянка с ягодами', ingredients: [{ name: 'Овсянка', amount: '50г' }, { name: 'Ягоды', amount: '100г' }], why: 'Медленные углеводы для энергии', calories: 350 },
              { type: 'Обед', name: 'Куриный суп', ingredients: [{ name: 'Курица', amount: '150г' }, { name: 'Овощи', amount: '200г' }], why: 'Белок и витамины', calories: 400 },
              { type: 'Ужин', name: 'Рыба с овощами', ingredients: [{ name: 'Рыба', amount: '150г' }, { name: 'Брокколи', amount: '150г' }], why: 'Лёгкий белок на ужин', calories: 300 }
            ]
          }
        ]
      });
      setMenuLoading(false);      notify('Меню на неделю составлено ✦');
    }, 1500);
  };

  const addIngredientsToShop = (meal) => {
    if (!meal.ingredients?.length) return;
    setShopList(p => {
      const existing = p.map(i => i.name.toLowerCase());
      const newItems = meal.ingredients
        .filter(ing => !existing.includes(ing.name.toLowerCase()))
        .map(ing => ({ id: Date.now() + Math.random(), name: ing.name + ' (' + ing.amount + ')', done: false, cat: 'Продукты' }));
      notify(newItems.length > 0 ? 'Добавлено ' + newItems.length + ' продуктов' : 'Все продукты уже в списке');
      return [...p, ...newItems];
    });
  };

  const autoHealth = () => {
    const items = [];
    if ((profile.sport || []).length > 0) items.push({ title: profile.sport[0], freq: 'weekly:1,3,5', priority: 'm' });
    if ((profile.practices || []).includes('Медитация')) items.push({ title: 'Медитация 10–15 мин', freq: 'daily', priority: 'm', preferredTime: profile.wake });
    if ((profile.practices || []).includes('Цигун')) items.push({ title: 'Практика цигун', freq: 'daily', priority: 'm' });
    items.push({ title: '8 стаканов воды', freq: 'daily', priority: 'l' });
    if ((profile.healthFocus || []).includes('Суставы и спина')) items.push({ title: 'Зарядка для спины', freq: 'daily', priority: 'm' });
    return items.map(t => ({ ...t, id: Date.now() + Math.random(), section: 'health', lastDone: '', doneDate: '', notes: '' }));
  };

  const DAYS_RU = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const MEAL_ICONS = { 'Завтрак': '🌅', 'Обед': '☀️', 'Ужин': '🌙' };

  return (
    <div>
      {/* Шапка */}
      <div className="card card-accent">
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 }}>
          {(profile.healthFocus || []).map(h => <span key={h} className="badge bgr">{h}</span>)}
          {profile.chronic && <span className="badge bw">⚠ {profile.chronic}</span>}
        </div>
        <div style={{ fontSize: 13, color: T.text3 }}>Цель: {profile.healthGoal || '—'} · Питание: {profile.nutrition || '—'}</div>
      </div>

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { id: 'today', label: '💚 Сегодня' },
          { id: 'menu', label: '🍽 Меню на неделю' },
          ...(hasWeightGoal || hasHealthGoal ? [{ id: 'goal', label: '🎯 Цель' }] : []),
        ].map(tab => (
          <button key={tab.id} onClick={() => setHealthTab(tab.id)}
            style={{ flex: 1, padding: '7px 6px', borderRadius: 10, border: '1px solid ' + (healthTab === tab.id ? T.success + '88' : 'rgba(255,255,255,0.08)'),
              background: healthTab === tab.id ? 'rgba(123,204,160,0.12)' : 'rgba(255,255,255,0.02)',              color: healthTab === tab.id ? T.success : T.text2, fontSize: 12, cursor: 'pointer', fontFamily: "'Crimson Pro',serif", transition: 'all .15s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ВКЛАДКА: СЕГОДНЯ */}
      {healthTab === 'today' && (
        <div>
          <AiBox
            kb={JSON.stringify(profile)}
            prompt={`Дай рекомендации по здоровью. Профиль: ${profile.name || '—'}. Зоны здоровья: ${(profile.healthFocus || []).join(', ') || '—'}. Хронические: ${profile.chronic || 'нет'}. Цель: ${profile.healthGoal || '—'}. Питание: ${profile.nutrition || 'обычное'}. Свободное время: с ${profile.workEnd || '18:00'} до ${profile.sleep || '23:00'}.`}
            label="Здоровье на сегодня"
            btnText="Советы по здоровью"
            placeholder="Анализирую профиль и даю конкретные советы..."
          />
          
          <div className="card">
            <div className="card-hd">
              <div className="card-title">Здоровые привычки</div>
              <div className="btn-row">
                {healthTasks.length === 0 && <button className="btn btn-ghost btn-sm" onClick={() => { const ts = autoHealth(); setTasks(p => [...p, ...ts]); notify('Добавлено'); }}>✦ Авто</button>}
                <button className="btn btn-ghost btn-sm" onClick={() => setModal({})}>+ Своя</button>
              </div>
            </div>
            {due.length === 0 && <div className="empty"><span className="empty-ico">🌿</span><p>Здоровых задач на сегодня нет</p></div>}
            {due.map(task => (
              <div key={task.id} className="task-row">
                <div className={`chk${task.doneDate === today ? ' done' : ''}`} onClick={() => setTasks(p => p.map(t => t.id === task.id ? { ...t, doneDate: t.doneDate === today ? null : today, lastDone: t.doneDate === today ? t.lastDone : today } : t))}>
                  {task.doneDate === today ? '✓' : ' '}
                </div>
                <div className="task-body">
                  <div className={`task-name${task.doneDate === today ? ' done' : ''}`}>{task.title}</div>
                  <div className="task-meta"><span className="badge bt">{freqLabel(task.freq)}</span></div>
                </div>
                <div className="ico-btn" onClick={() => setModal(task)} style={{ color: T.teal, opacity: .7 }}>✏️</div>
                <div className="ico-btn danger" onClick={() => setTasks(p => p.filter(t => t.id !== task.id))}>✕</div>
              </div>
            ))}
          </div>
          {modal !== null && <TaskModal task={modal.id ? modal : null} defaultSection="health" onSave={t => { setTasks(p => modal.id ? p.map(x => x.id === t.id ? t : x) : [...p, t]); notify('Добавлено'); }} onClose={() => setModal(null)} />}
        </div>
      )}

      {/* ВКЛАДКА: МЕНЮ НА НЕДЕЛЮ */}
      {healthTab === 'menu' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <div style={{ flex: 1, fontSize: 13, color: T.text3, fontStyle: 'italic' }}>
              {weekMenu ? 'Меню составлено с учётом ТКМ и профиля' : 'Нажми чтобы составить меню на 7 дней'}            </div>
            <button className="btn btn-primary btn-sm" onClick={generateMenu} disabled={menuLoading}>
              {menuLoading ? '⏳...' : '✦ ' + (weekMenu ? 'Обновить' : 'Составить меню')}
            </button>
          </div>
          {menuLoading && <div style={{ textAlign: 'center', padding: 30, color: T.text3 }}><div style={{ fontSize: 28, marginBottom: 8 }}>🍽</div><div style={{ fontSize: 13, fontStyle: 'italic' }}>Составляю персональное меню...</div></div>}
          {weekMenu && weekMenu.days && (
            <div>
              {/* Дни недели — горизонтальные таблетки */}
              <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 6, marginBottom: 12 }}>
                {weekMenu.days.map((d, i) => (
                  <button key={i} onClick={() => setOpenDay(i)}
                    style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                      background: openDay === i ? 'rgba(200,164,90,0.2)' : 'rgba(255,255,255,0.04)',
                      border: '1px solid ' + (openDay === i ? T.gold + '88' : 'transparent'),
                      color: openDay === i ? T.gold : T.text2, transition: 'all .15s', fontFamily: "'JetBrains Mono'" }}>
                    {d.day.slice(0, 2).toUpperCase()}
                  </button>
                ))}
              </div>
              {/* Блюда выбранного дня */}
              {weekMenu.days[openDay] && (
                <div>
                  <div style={{ fontSize: 14, color: T.gold, fontFamily: "'Crimson Pro',serif", marginBottom: 10, fontWeight: 500 }}>
                    {weekMenu.days[openDay].day}
                  </div>
                  {(weekMenu.days[openDay].meals || []).map((meal, mi) => {
                    const mKey = openDay + '-' + mi;
                    const isOpen = openMeal === mKey;
                    return (
                      <div key={mi} style={{ marginBottom: 8, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {/* Заголовок блюда */}
                        <div onClick={() => setOpenMeal(isOpen ? null : mKey)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer',
                            background: isOpen ? 'rgba(200,164,90,0.08)' : 'rgba(255,255,255,0.02)' }}>
                          <span style={{ fontSize: 20, flexShrink: 0 }}>{MEAL_ICONS[meal.type] || '🍴'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1 }}>{meal.type.toUpperCase()}</div>
                            <div style={{ fontSize: 15, color: T.text0, fontFamily: "'Crimson Pro',serif", fontWeight: 500, marginTop: 1 }}>{meal.name}</div>
                          </div>
                          {meal.calories && <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'", flexShrink: 0 }}>{meal.calories} ккал</span>}
                          <span style={{ fontSize: 12, color: T.text3 }}>{isOpen ? '▲' : '▼'}</span>
                        </div>
                        {/* Детали блюда */}
                        {isOpen && (
                          <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            {/* Почему полезно */}
                            {meal.why && (
                              <div style={{ marginBottom: 10, padding: '8px 10px', background: 'rgba(123,204,160,0.08)', borderRadius: 8, borderLeft: '2px solid ' + T.success }}>
                                <div style={{ fontSize: 10, color: T.success, fontFamily: "'JetBrains Mono'", marginBottom: 3 }}>ПОЧЕМУ ПОЛЕЗНО</div>                                <div style={{ fontSize: 13, color: T.text1, lineHeight: 1.5 }}>{meal.why}</div>
                              </div>
                            )}
                            {/* Состав */}
                            {(meal.ingredients || []).length > 0 && (
                              <div style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1, marginBottom: 6 }}>СОСТАВ</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                  {meal.ingredients.map((ing, ii) => (
                                    <span key={ii} style={{ fontSize: 12, padding: '3px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: T.text2 }}>
                                      {ing.name} <span style={{ color: T.text3 }}>{ing.amount}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Кнопка в список покупок */}
                            <button className="btn btn-ghost btn-sm" style={{ width: '100%', fontSize: 12, border: '1px solid rgba(200,164,90,0.3)' }}
                              onClick={() => addIngredientsToShop(meal)}>
                              🛒 Добавить продукты в список покупок
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ВКЛАДКА: ЦЕЛЬ */}
      {healthTab === 'goal' && (hasWeightGoal || hasHealthGoal) && (
        <div>
          <div style={{ padding: '12px 14px', background: 'rgba(232,120,120,0.08)', borderRadius: 12, marginBottom: 12, borderLeft: '3px solid #E87878' }}>
            <div style={{ fontSize: 10, color: '#E87878', fontFamily: "'JetBrains Mono'", letterSpacing: 1, marginBottom: 4 }}>АКТИВНАЯ ЦЕЛЬ</div>
            <div style={{ fontSize: 15, color: T.text0, fontFamily: "'Crimson Pro',serif" }}>{profile.mainGoal || profile.healthGoal}</div>
          </div>
          <AiBox
            kb={JSON.stringify(profile)}
            prompt={`Дай рекомендации для достижения цели: ${profile.mainGoal || profile.healthGoal}. Зоны: ${(profile.goalAreas || []).join(', ') || '—'}. Питание: ${profile.nutrition || 'обычное'}. Зоны здоровья: ${(profile.healthFocus || []).join(', ') || '—'}. Хронические: ${profile.chronic || 'нет'}.`}
            label="Как достичь цели"
            btnText="Получить план"
            placeholder="Составляю персональный план достижения цели..."
          />
        </div>
      )}
    </div>  );
}

function isDue(task, today) {
  const last = task.lastDone;
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);
  if (!task.freq) return false;
  if (task.doneDate === today) return false;
  if (task.freq === 'daily') return last !== today;
  if (task.freq === 'workdays') { const dn = d.getDay(); return dn >= 1 && dn <= 5 && last !== today; }
  if (task.freq.startsWith('weekly:')) { return task.freq.split(':')[1].split(',').map(Number).includes(d.getDay()) && last !== today; }
  if (task.freq.startsWith('every:')) {
    const n = parseInt(task.freq.split(':')[1]);
    if (!last) return true;
    return Math.floor((d - new Date(last)) / 86400000) >= n;
  }
  return false;
}

function freqLabel(f) {
  if (!f || f === 'once') return 'разово';
  if (f === 'daily') return 'ежедневно';
  if (f === 'workdays') return 'пн–пт';
  if (f.startsWith('weekly:')) { const m = { 0: 'вс', 1: 'пн', 2: 'вт', 3: 'ср', 4: 'чт', 5: 'пт', 6: 'сб' }; return f.split(':')[1].split(',').map(n => m[n]).join(', '); }
  if (f.startsWith('every:')) return `каждые ${f.split(':')[1]} дн.`;
  return f;
                        }
