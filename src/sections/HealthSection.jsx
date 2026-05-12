// src/sections/HealthSection.jsx
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { TaskModal } from '../components/TaskModal';
import { T } from '../utils/theme';
import { askViaServer } from '../services/aiClient';
import { getTCMHourOrgan, getTCMFullProfile, getSeasonalTCM } from '../core/calculations/tcm';
import { SectionHero } from '../components/SectionHero';

export function HealthSection() {
  const { profile, tasks, setTasks, setShopList, notify } = useApp();
  const [modal, setModal] = useState(null);
  const [healthTab, setHealthTab] = useState('today');
  const [weekMenu, setWeekMenu] = useState(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [openDay, setOpenDay] = useState(0);
  const [openMeal, setOpenMeal] = useState(null);

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentHour = now.getHours();

  const healthTasks = tasks.filter(t => t.section === 'health');
  const due = healthTasks.filter(t => isDue(t, today));

  const hasWeightGoal = (profile.mainGoal || '').toLowerCase().match(/похуде|вес|фигур|набрать|сбросить|стройн/);
  const hasHealthGoal = (profile.goalAreas || []).some(a => ['Здоровье', 'Внешность'].includes(a));

  const season = (() => {
    const m = now.getMonth();
    return m < 2 || m > 10 ? 'зима' : m < 5 ? 'весна' : m < 8 ? 'лето' : 'осень';
  })();

  // ТКМ данные
  const tcmProfile = getTCMFullProfile(profile);
  const seasonal = getSeasonalTCM(profile);
  const hourOrgan = getTCMHourOrgan(currentHour);

  // ✅ ИСПРАВЛЕНО: реальная генерация меню через AI
  const generateMenu = async () => {
    setMenuLoading(true);
    try {
      const systemPrompt = `Ты диетолог-советник на основе ТКМ. 
Используй ТОЛЬКО данные из базы знаний: Давыдов «Восточный Зодиак» (ТКМ, питание по стихиям и сезонам).
Температура = 0.1. Никаких домыслов. Только рекомендации из ТКМ.
Отвечай СТРОГО в формате JSON без markdown-блоков, без пояснений вне JSON.

Формат ответа:
{"days":[{"day":"Понедельник","meals":[{"type":"Завтрак","name":"Название","ingredients":[{"name":"Продукт","amount":"100г"}],"why":"Польза по ТКМ","calories":300}]}]}`;

      const userPrompt = `Составь меню на 7 дней.
Профиль ТКМ:
- Стихия: ${tcmProfile?.el?.name || '—'} (${tcmProfile?.el?.yin ? 'Инь' : 'Ян'})
- Конституция: ${tcmProfile?.cn?.type || '—'}
- Слабые органы: ${tcmProfile?.uniqueOrgans?.join(', ') || '—'}
- Синдромы: ${tcmProfile?.syndromes?.join(', ') || 'нет'}
- Сезон: ${season} (${seasonal?.element || '—'})
- Питание: ${profile.nutrition || 'обычное'}
- Хронические: ${profile.chronic || 'нет'}
- Аллергии: ${profile.allergies || 'нет'}
Рекомендованные продукты по ТКМ: ${tcmProfile?.foodRecs || '—'}
Дай по 3 приёма пищи на каждый день недели. JSON только.`;

      const result = await askViaServer(systemPrompt, userPrompt, 2048);

      // Парсим JSON из ответа
      const clean = result.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setWeekMenu(parsed);
      notify('Меню на неделю составлено ✦');
    } catch (e) {
      console.error('Menu generation error:', e);
      notify('Ошибка генерации меню — попробуй ещё раз');
    }
    setMenuLoading(false);
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

  const MEAL_ICONS = { 'Завтрак': '🌅', 'Обед': '☀️', 'Ужин': '🌙' };

  // Промпт для ИИ-советника с данными ТКМ
  const healthAiPrompt = `Профиль здоровья:
- Стихия рождения: ${tcmProfile?.el?.name || '—'} (${tcmProfile?.el?.yin ? 'Инь' : 'Ян'})
- Слабые органы: ${tcmProfile?.uniqueOrgans?.join(', ') || '—'}
- Синдромы ТКМ: ${tcmProfile?.syndromes?.join(', ') || 'нет'}
- Сезон: ${season} (активный орган: ${seasonal?.organ || '—'})
- Текущий час: ${currentHour}:00, активный меридиан: ${hourOrgan?.organ || '—'}
- Зоны здоровья: ${(profile.healthFocus || []).join(', ') || '—'}
- Хронические: ${profile.chronic || 'нет'}
- Питание: ${profile.nutrition || 'обычное'}
- Цель: ${profile.healthGoal || '—'}
Дай 5 конкретных рекомендаций на сегодня: питание, дыхательная практика, режим дня. Указывай источник каждой рекомендации.`;

  return (
    <div>
      {/* Шапка с ТКМ-профилем */}
      <div className="card card-accent" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 }}>
          {(profile.healthFocus || []).map(h => <span key={h} className="badge bgr">{h}</span>)}
          {profile.chronic && <span className="badge bw">⚠ {profile.chronic}</span>}
        </div>
        <div style={{ fontSize: 13, color: T.text3 }}>
          Цель: {profile.healthGoal || '—'} · Питание: {profile.nutrition || '—'}
        </div>

        {/* Активный меридиан */}
        {hourOrgan && (
          <div style={{ marginTop: 10, display: 'flex', gap: 10, padding: '8px 10px',
            background: 'rgba(123,204,160,0.08)', borderRadius: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{hourOrgan.emoji}</span>
            <div>
              <div style={{ fontSize: 12, color: T.success, fontWeight: 600 }}>
                Сейчас {currentHour}:00 — меридиан {hourOrgan.organ}
              </div>
              <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5, marginTop: 2 }}>
                {hourOrgan.tip}
              </div>
            </div>
          </div>
        )}

        {/* Сезонная стихия */}
        {seasonal && (
          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center',
            padding: '6px 10px', background: 'rgba(45,32,16,0.06)', borderRadius: 8 }}>
            <span style={{ fontSize: 18 }}>{seasonal.emoji}</span>
            <div style={{ fontSize: 12, color: T.text2 }}>
              <b style={{ color: T.gold }}>{seasonal.season}</b> · {seasonal.organ}
              {tcmProfile?.el && (
                <span style={{ marginLeft: 6, color: T.text3 }}>· Стихия: {tcmProfile.el.name} {tcmProfile.el.emoji}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { id: 'today', label: '💚 Сегодня' },
          { id: 'menu', label: '🍽 Меню' },
          { id: 'tcm', label: '☯️ ТКМ' },
          ...(hasWeightGoal || hasHealthGoal ? [{ id: 'goal', label: '🎯 Цель' }] : []),
        ].map(tab => (
          <button key={tab.id} onClick={() => setHealthTab(tab.id)}
            style={{ flex: 1, padding: '7px 6px', borderRadius: 10,
              border: '1px solid ' + (healthTab === tab.id ? T.success + '88' : 'rgba(255,255,255,0.08)'),
              background: healthTab === tab.id ? 'rgba(123,204,160,0.12)' : 'rgba(255,255,255,0.02)',
              color: healthTab === tab.id ? T.success : T.text2,
              fontSize: 12, cursor: 'pointer', fontFamily: "'Crimson Pro',serif", transition: 'all .15s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ВКЛАДКА: СЕГОДНЯ */}
      {healthTab === 'today' && (
        <div>
          {/* ИИ-советник по здоровью с базой знаний */}
          <AiBox
            profile={profile}
            domain="health"
            prompt={healthAiPrompt}
            label="✦ СОВЕТНИК ПО ЗДОРОВЬЮ (ТКМ)"
            btnText="Рекомендации на сегодня"
          />

          <div className="card">
            <div className="card-hd">
              <div className="card-title">Здоровые привычки</div>
              <div className="btn-row">
                {healthTasks.length === 0 && (
                  <button className="btn btn-ghost btn-sm"
                    onClick={() => { const ts = autoHealth(); setTasks(p => [...p, ...ts]); notify('Добавлено'); }}>
                    ✦ Авто
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => setModal({})}>+ Своя</button>
              </div>
            </div>
            {due.length === 0 && (
              <div className="empty">
                <span className="empty-ico">🌿</span>
                <p>Здоровых задач на сегодня нет</p>
              </div>
            )}
            {due.map(task => (
              <div key={task.id} className="task-row">
                <div className={`chk${task.doneDate === today ? ' done' : ''}`}
                  onClick={() => setTasks(p => p.map(t => t.id === task.id
                    ? { ...t, doneDate: t.doneDate === today ? null : today, lastDone: t.doneDate === today ? t.lastDone : today }
                    : t))}>
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
          {modal !== null && (
            <TaskModal task={modal.id ? modal : null} defaultSection="health"
              onSave={t => { setTasks(p => modal.id ? p.map(x => x.id === t.id ? t : x) : [...p, t]); notify('Добавлено'); }}
              onClose={() => setModal(null)} />
          )}
        </div>
      )}

      {/* ВКЛАДКА: МЕНЮ */}
      {healthTab === 'menu' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <div style={{ flex: 1, fontSize: 13, color: T.text3, fontStyle: 'italic' }}>
              {weekMenu ? 'Меню составлено по ТКМ и вашему профилю' : 'Меню на 7 дней по принципам ТКМ'}
            </div>
            <button className="btn btn-primary btn-sm" onClick={generateMenu} disabled={menuLoading}>
              {menuLoading ? '⏳...' : '✦ ' + (weekMenu ? 'Обновить' : 'Составить')}
            </button>
          </div>

          {menuLoading && (
            <div style={{ textAlign: 'center', padding: 30, color: T.text3 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🍽</div>
              <div style={{ fontSize: 13, fontStyle: 'italic' }}>Составляю меню по ТКМ...</div>
            </div>
          )}

          {weekMenu?.days && (
            <div>
              <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 6, marginBottom: 12 }}>
                {weekMenu.days.map((d, i) => (
                  <button key={i} onClick={() => setOpenDay(i)}
                    style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                      background: openDay === i ? 'rgba(200,164,90,0.2)' : 'rgba(255,255,255,0.04)',
                      border: '1px solid ' + (openDay === i ? T.gold + '88' : 'transparent'),
                      color: openDay === i ? T.gold : T.text2, transition: 'all .15s', fontFamily: "'JetBrains Mono'" }}>
                    {(d.day || '').slice(0, 2).toUpperCase()}
                  </button>
                ))}
              </div>

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
                        <div onClick={() => setOpenMeal(isOpen ? null : mKey)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer',
                            background: isOpen ? 'rgba(200,164,90,0.08)' : 'rgba(255,255,255,0.02)' }}>
                          <span style={{ fontSize: 20, flexShrink: 0 }}>{MEAL_ICONS[meal.type] || '🍴'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1 }}>{(meal.type || '').toUpperCase()}</div>
                            <div style={{ fontSize: 15, color: T.text0, fontFamily: "'Crimson Pro',serif", fontWeight: 500, marginTop: 1 }}>{meal.name}</div>
                          </div>
                          {meal.calories && <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'", flexShrink: 0 }}>{meal.calories} ккал</span>}
                          <span style={{ fontSize: 12, color: T.text3 }}>{isOpen ? '▲' : '▼'}</span>
                        </div>
                        {isOpen && (
                          <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            {meal.why && (
                              <div style={{ marginBottom: 10, padding: '8px 10px', background: 'rgba(123,204,160,0.08)', borderRadius: 8, borderLeft: '2px solid ' + T.success }}>
                                <div style={{ fontSize: 10, color: T.success, fontFamily: "'JetBrains Mono'", marginBottom: 3 }}>ПОЧЕМУ ПОЛЕЗНО (ТКМ)</div>
                                <div style={{ fontSize: 13, color: T.text1, lineHeight: 1.5 }}>{meal.why}</div>
                              </div>
                            )}
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
                            <button className="btn btn-ghost btn-sm" style={{ width: '100%', fontSize: 12, border: '1px solid rgba(200,164,90,0.3)' }}
                              onClick={() => addIngredientsToShop(meal)}>
                              🛒 Добавить в список покупок
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

      {/* ВКЛАДКА: ТКМ */}
      {healthTab === 'tcm' && (
        <div>
          {/* Суточный цикл меридианов */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-title" style={{ marginBottom: 10 }}>Суточный цикл меридианов</div>
            {[
              { h: [23, 0], organ: 'Желчный пузырь', emoji: '💚', tip: 'Сон. Не принимай важных решений.' },
              { h: [1, 2],  organ: 'Печень', emoji: '🌿', tip: 'Очищение крови. Обязателен сон.' },
              { h: [3, 4],  organ: 'Лёгкие', emoji: '🫁', tip: 'Глубокий сон. Утренние дыхательные практики.' },
              { h: [5, 6],  organ: 'Толстый кишечник', emoji: '🌅', tip: 'Пробуждение. Выпей воду.' },
              { h: [7, 8],  organ: 'Желудок', emoji: '🍵', tip: 'Завтрак. Тёплая еда.' },
              { h: [9, 10], organ: 'Селезёнка', emoji: '🌟', tip: 'Пик умственной активности.' },
              { h: [11, 12],organ: 'Сердце', emoji: '❤️', tip: 'Важные дела и встречи.' },
              { h: [13, 14],organ: 'Тонкий кишечник', emoji: '🍽', tip: 'Переварение. Небольшой отдых.' },
              { h: [15, 16],organ: 'Мочевой пузырь', emoji: '💧', tip: 'Пей воду. Хорошо для учёбы.' },
              { h: [17, 18],organ: 'Почки', emoji: '🌙', tip: 'Восстановление. Лёгкие упражнения.' },
              { h: [19, 20],organ: 'Перикард', emoji: '🕯', tip: 'Общение и отдых.' },
              { h: [21, 22],organ: 'Три обогревателя', emoji: '🌠', tip: 'Подготовка ко сну.' },
            ].map((item, i) => {
              const isActive = item.h.includes(currentHour);
              return (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0',
                  borderBottom: `1px solid ${T.bdrS}`, opacity: isActive ? 1 : 0.6 }}>
      <SectionHero sectionId="health" />
                  <div style={{ minWidth: 44, fontSize: 11, color: isActive ? T.gold : T.text3,
                    fontFamily: "'JetBrains Mono'", fontWeight: isActive ? 700 : 400, paddingTop: 2 }}>
                    {item.h[0]}–{(item.h[1] + 2) % 24}
                  </div>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: isActive ? T.text0 : T.text2, fontWeight: isActive ? 600 : 400 }}>
                      {item.organ} {isActive && <span style={{ fontSize: 10, color: T.gold, marginLeft: 4 }}>● СЕЙЧАС</span>}
                    </div>
                    <div style={{ fontSize: 11, color: T.text3, lineHeight: 1.4 }}>{item.tip}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Сезонные рекомендации */}
          {seasonal && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>
                {seasonal.emoji} Сезон {seasonal.season} — {seasonal.element}
              </div>
              <div style={{ fontSize: 12, color: T.text3, marginBottom: 10 }}>{seasonal.organ}</div>
              {seasonal.interaction && (
                <div style={{ fontSize: 12, color: T.gold, marginBottom: 10, padding: '6px 10px',
                  background: 'rgba(200,164,90,0.08)', borderRadius: 8 }}>
                  {seasonal.interaction}
                </div>
              )}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: T.success, fontFamily: "'JetBrains Mono'", marginBottom: 4 }}>ДЕЛАЙ</div>
                {(seasonal.doList || []).map((item, i) => (
                  <div key={i} style={{ fontSize: 13, color: T.text2, paddingLeft: 12,
                    borderLeft: `2px solid ${T.success}`, marginBottom: 4, lineHeight: 1.4 }}>
                    {item}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, color: T.error, fontFamily: "'JetBrains Mono'", marginBottom: 4 }}>ИЗБЕГАЙ</div>
                {(seasonal.avoidList || []).map((item, i) => (
                  <div key={i} style={{ fontSize: 13, color: T.text2, paddingLeft: 12,
                    borderLeft: `2px solid ${T.error}44`, marginBottom: 4, lineHeight: 1.4 }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ТКМ конституция */}
          {tcmProfile && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title" style={{ marginBottom: 8 }}>Ваша ТКМ-конституция</div>
              {tcmProfile.el && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>{tcmProfile.el.emoji}</span>
                  <span style={{ fontSize: 14, color: T.text0, fontWeight: 600, marginLeft: 8 }}>
                    {tcmProfile.el.name} {tcmProfile.el.yin ? 'Инь' : 'Ян'}
                  </span>
                  <div style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>
                    Орган: {tcmProfile.el.organ} · Сезон: {tcmProfile.el.season}
                  </div>
                </div>
              )}
              {tcmProfile.syndromes?.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: T.text3, fontFamily: "'JetBrains Mono'", marginBottom: 4 }}>СИНДРОМЫ</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {tcmProfile.syndromes.map(s => (
                      <span key={s} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10,
                        background: 'rgba(217,4,41,0.08)', color: T.error, border: `1px solid ${T.error}33` }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {tcmProfile.foodRecs && (
                <div style={{ padding: '8px 10px', background: 'rgba(123,204,160,0.08)', borderRadius: 8,
                  borderLeft: `2px solid ${T.success}` }}>
                  <div style={{ fontSize: 10, color: T.success, fontFamily: "'JetBrains Mono'", marginBottom: 3 }}>ПИТАНИЕ ПО ТКМ</div>
                  <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5 }}>{tcmProfile.foodRecs}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ВКЛАДКА: ЦЕЛЬ */}
      {healthTab === 'goal' && (hasWeightGoal || hasHealthGoal) && (
        <div>
          <div style={{ padding: '12px 14px', background: 'rgba(232,120,120,0.08)', borderRadius: 12,
            marginBottom: 12, borderLeft: '3px solid #E87878' }}>
            <div style={{ fontSize: 10, color: '#E87878', fontFamily: "'JetBrains Mono'", letterSpacing: 1, marginBottom: 4 }}>АКТИВНАЯ ЦЕЛЬ</div>
            <div style={{ fontSize: 15, color: T.text0, fontFamily: "'Crimson Pro',serif" }}>{profile.mainGoal || profile.healthGoal}</div>
          </div>
          <AiBox
            profile={profile}
            domain="health"
            prompt={`Цель: ${profile.mainGoal || profile.healthGoal}. Стихия: ${tcmProfile?.el?.name || '—'}. Конституция: ${tcmProfile?.cn?.type || '—'}. Сезон: ${season}. Зоны здоровья: ${(profile.healthFocus || []).join(', ') || '—'}. Хронические: ${profile.chronic || 'нет'}. Дай конкретный план достижения цели на основе ТКМ и дыхательных практик.`}
            label="КАК ДОСТИЧЬ ЦЕЛИ (ТКМ)"
            btnText="Получить план"
          />
        </div>
      )}
    </div>
  );
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
  if (f.startsWith('weekly:')) {
    const m = { 0: 'вс', 1: 'пн', 2: 'вт', 3: 'ср', 4: 'чт', 5: 'пт', 6: 'сб' };
    return f.split(':')[1].split(',').map(n => m[n]).join(', ');
  }
  if (f.startsWith('every:')) return `каждые ${f.split(':')[1]} дн.`;
  return f;
}
