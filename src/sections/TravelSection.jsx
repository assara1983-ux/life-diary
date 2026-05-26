// src/sections/TravelSection.jsx
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { T } from '../utils/theme';
import { SectionHero } from '../components/SectionHero';

// ─── ХЕЛПЕР: Google Calendar ───
function openGCal(title, date, desc = '') {
  const s = new Date(date), e = new Date(s.getTime() + 3600000);
  const f = d => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  window.open(
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${f(s)}/${f(e)}` +
    `&details=${encodeURIComponent(desc)}`,
    '_blank'
  );
}

// ─── ХЕЛПЕР: Сезон по дате поездки ───
function getSeason(targetDate) {
  if (!targetDate) return 'лето';
  const month = new Date(targetDate + '-01').getMonth() + 1;
  if (month >= 3 && month <= 5) return 'весна';
  if (month >= 6 && month <= 8) return 'лето';
  if (month >= 9 && month <= 11) return 'осень';
  return 'зима';
}

// ─── ХЕЛПЕР: Месяцев до поездки ───
function monthsUntil(targetDate) {
  if (!targetDate) return null;
  const now = new Date();
  const target = new Date(targetDate + '-01');
  const diff = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return Math.max(1, diff);
}

// ─── ХЕЛПЕР: Определить заграница или нет ───
const CIS_KEYWORDS = ['алма', 'астан', 'ташкент', 'бишкек', 'тбилис', 'ереван', 'баку', 'минск', 'москва', 'питер', 'санкт', 'россия', 'казахстан', 'узбекистан', 'кыргызстан', 'грузия', 'армения', 'азербайджан', 'беларусь'];
function isAbroad(destination) {
  if (!destination) return false;
  const d = destination.toLowerCase();
  return !CIS_KEYWORDS.some(k => d.includes(k));
}

// ─── ДАННЫЕ: Чек-листы ───
const CHECKLIST_DATA = {
  documents: {
    base: ['Паспорт', 'Копия паспорта (в телефоне)', 'Деньги / карта', 'Медстраховка'],
    abroad: ['Загранпаспорт', 'Виза (если нужна)', 'Копия визы', 'Авиабилеты (распечатать)', 'Бронь отеля', 'Медстраховка (международная)'],
    cis: ['Паспорт', 'ИИН / СНИЛС', 'Билеты', 'Бронь жилья'],
  },
  medicine: {
    base: ['Обезболивающее', 'Жаропонижающее', 'Антигистаминное', 'Пластырь', 'Бинт', 'Антисептик'],
    abroad: ['Средство от диареи', 'Регидрон', 'Противорвотное', 'Репеллент от насекомых'],
    winter: ['Средство от простуды', 'Капли в нос', 'Леденцы для горла'],
    summer: ['Солнцезащитный крем SPF 50+', 'Средство после загара', 'Репеллент'],
  },
  things: {
    base: ['Зарядники / power bank', 'Наушники', 'Адаптер для розеток', 'Туалетные принадлежности', 'Полотенце'],
    spring: ['Лёгкая куртка', 'Зонт', 'Слои одежды'],
    summer: ['Купальник / плавки', 'Солнечные очки', 'Панама / кепка', 'Лёгкая одежда'],
    autumn: ['Тёплая куртка', 'Зонт', 'Водонепроницаемая обувь', 'Тёплый свитер'],
    winter: ['Тёплая куртка', 'Термобельё', 'Шапка, шарф, перчатки', 'Тёплая обувь', 'Крем от обморожения'],
  },
  lifehacks: {
    base: [
      '📱 Скачай офлайн-карты в Google Maps до выезда',
      '💳 Сообщи банку о поездке, чтобы не заблокировали карту',
      '📸 Сфотографируй все документы и храни в облаке',
      '🔋 Зарядка телефона — в приоритете перед посадкой',
    ],
    abroad: [
      '💱 Обменяй небольшую сумму наличными до отъезда',
      '📶 Купи местную SIM или включи роуминг заранее',
      '🏥 Запиши адрес ближайшей больницы и посольства',
      '🛃 Не пакуй в ручную кладь жидкости > 100 мл',
    ],
    winter: [
      '🧊 Проверь прогноз погоды за 2 дня до выезда',
      '✈️ Рейсы зимой могут задержать — заложи запас времени',
    ],
    summer: [
      '🌊 Проверь сезон штормов / дождей в регионе',
      '☀️ Первые дни не злоупотребляй солнцем',
    ],
  }
};

function buildChecklist(trip) {
  const season = getSeason(trip.targetDate);
  const abroad = isAbroad(trip.destination);
  const docs = [
    ...CHECKLIST_DATA.documents.base,
    ...(abroad ? CHECKLIST_DATA.documents.abroad : CHECKLIST_DATA.documents.cis),
  ];
  const medicine = [
    ...CHECKLIST_DATA.medicine.base,
    ...(abroad ? CHECKLIST_DATA.medicine.abroad : []),
    ...(CHECKLIST_DATA.medicine[season] || []),
  ];
  const things = [
    ...CHECKLIST_DATA.things.base,
    ...(CHECKLIST_DATA.things[season] || []),
  ];
  const lifehacks = [
    ...CHECKLIST_DATA.lifehacks.base,
    ...(abroad ? CHECKLIST_DATA.lifehacks.abroad : []),
    ...(CHECKLIST_DATA.lifehacks[season] || []),
  ];
  return { docs, medicine, things, lifehacks };
}

// ─── КОМПОНЕНТ: Визуальная копилка ───
function PiggyBank({ trip, onUpdate }) {
  const budget = parseInt(trip.budget) || 0;
  const saved = parseInt(trip.saved) || 0;
  const pct = budget > 0 ? Math.min(100, Math.round(saved / budget * 100)) : 0;
  const months = monthsUntil(trip.targetDate);
  const remaining = Math.max(0, budget - saved);
  const perMonth = months && remaining > 0 ? Math.ceil(remaining / months) : 0;

  const filledSegments = Math.round(pct / 10);

  return (
    <div style={{ background: 'rgba(200,164,90,0.06)', border: '1px solid rgba(200,164,90,0.25)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: T.gold, letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase' }}>
        💰 Копилка
      </div>

      {/* Визуальные сегменты */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} style={{
            flex: 1, height: 20, borderRadius: 4,
            background: i < filledSegments
              ? `linear-gradient(135deg, ${T.gold}, #e8c56a)`
              : 'rgba(200,164,90,0.12)',
            border: `1px solid rgba(200,164,90,${i < filledSegments ? '0.6' : '0.2'})`,
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* Прогресс-бар */}
      <div style={{ height: 6, background: 'rgba(200,164,90,0.15)', borderRadius: 4, marginBottom: 10, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${T.gold}, #e8c56a)`, borderRadius: 4, transition: 'width 0.5s ease' }} />
      </div>

      {/* Цифры */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.text2, marginBottom: 10 }}>
        <span>Отложено: <strong style={{ color: T.gold }}>{saved.toLocaleString()}₸</strong></span>
        <span>Цель: <strong>{budget.toLocaleString()}₸</strong></span>
        <span style={{ color: T.gold, fontWeight: 700 }}>{pct}%</span>
      </div>

      {/* Ввод суммы */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: perMonth > 0 ? 10 : 0 }}>
        <input
          style={{ flex: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(200,164,90,0.3)`, borderRadius: 8, color: T.text0, fontFamily: "'Crimson Pro',serif", fontSize: 15, outline: 'none' }}
          placeholder="Введи сумму накоплений ₸"
          value={trip.saved || ''}
          onChange={e => onUpdate('saved', e.target.value)}
        />
        {remaining > 0 && (
          <span style={{ fontSize: 12, color: T.text3, whiteSpace: 'nowrap' }}>осталось: {remaining.toLocaleString()}₸</span>
        )}
      </div>

      {/* Подсказка по накоплению */}
      {perMonth > 0 && months && (
        <div style={{ padding: '8px 12px', background: 'rgba(0,112,192,0.06)', borderRadius: 8, borderLeft: '3px solid rgba(0,112,192,0.4)', fontSize: 12, color: T.text2 }}>
          💡 Чтобы накопить за <strong>{months} мес.</strong>, откладывай <strong style={{ color: T.gold }}>{perMonth.toLocaleString()}₸/мес</strong>
        </div>
      )}
      {pct >= 100 && (
        <div style={{ padding: '8px 12px', background: 'rgba(45,106,79,0.08)', borderRadius: 8, borderLeft: '3px solid #2d6a4f', fontSize: 12, color: '#2d6a4f', fontWeight: 600 }}>
          🎉 Цель достигнута! Поездка обеспечена.
        </div>
      )}
    </div>
  );
}

// ─── КОМПОНЕНТ: Чек-лист с галочками ───
function TripChecklist({ trip }) {
  const { docs, medicine, things, lifehacks } = buildChecklist(trip);
  const [checked, setChecked] = useState({});
  const [open, setOpen] = useState({ docs: false, medicine: false, things: false, lifehacks: false });

  const toggle = (key, item) => setChecked(p => ({ ...p, [`${key}_${item}`]: !p[`${key}_${item}`] }));
  const toggleSection = (key) => setOpen(p => ({ ...p, [key]: !p[key] }));

  const renderGroup = (key, label, icon, items) => {
    const doneCount = items.filter(item => checked[`${key}_${item}`]).length;
    return (
      <div style={{ marginBottom: 8 }}>
        <div
          onClick={() => toggleSection(key)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: open[key] ? '8px 8px 0 0' : 8, cursor: 'pointer' }}
        >
          <span>{icon}</span>
          <span style={{ flex: 1, fontSize: 13, color: T.text1, fontFamily: "'Crimson Pro',serif", fontWeight: 500 }}>{label}</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: doneCount === items.length ? '#2d6a4f' : T.text3 }}>
            {doneCount}/{items.length}
          </span>
          <span style={{ fontSize: 10, color: T.text3 }}>{open[key] ? '▲' : '▼'}</span>
        </div>
        {open[key] && (
          <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '8px 12px' }}>
            {items.map(item => (
              <div
                key={item}
                onClick={() => toggle(key, item)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  border: `1.5px solid ${checked[`${key}_${item}`] ? '#2d6a4f' : 'rgba(255,255,255,0.2)'}`,
                  background: checked[`${key}_${item}`] ? '#2d6a4f' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                }}>
                  {checked[`${key}_${item}`] && <span style={{ fontSize: 11, color: '#fff' }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, color: checked[`${key}_${item}`] ? T.text3 : T.text1, textDecoration: checked[`${key}_${item}`] ? 'line-through' : 'none', transition: 'all 0.2s' }}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.info || '#0070c0', letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>
        📋 Чек-лист подготовки
      </div>
      {renderGroup('docs', 'Документы', '📄', docs)}
      {renderGroup('medicine', 'Аптечка', '💊', medicine)}
      {renderGroup('things', 'Вещи', '🎒', things)}
      {renderGroup('lifehacks', 'Лайфхаки', '💡', lifehacks)}
    </div>
  );
}

// ─── ОСНОВНОЙ КОМПОНЕНТ ───
export function TravelSection() {
  const { profile, trips, setTrips, notify } = useApp();

  const [modal, setModal] = useState(false);
  const [adviceOpen, setAdviceOpen] = useState(true);
  const [tripsOpen, setTripsOpen] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [aiOpen, setAiOpen] = useState({});
  const [nt, setNt] = useState({ destination: '', targetDate: '', budget: '', saved: '', stage: '💭 Мечта', notes: '' });
  const mergedRef = useRef(false);

  const stages = ['💭 Мечта', '🗺️ Планирую', '💰 Коплю', '🎫 Билеты куплены', '🏨 Забронировано', '🧳 Собираю вещи', '✅ Всё готово'];
  const stagePct = s => Math.round((stages.indexOf(s) + 1) / stages.length * 100);

  // ─── СЛИЯНИЕ: данные онбординга → trips (один раз) ───
  useEffect(() => {
    if (mergedRef.current) return;
    if (!profile?.trips?.length) return;
    mergedRef.current = true;

    const existingIds = new Set(trips.map(t => String(t.id)));
    const newFromOnboarding = profile.trips.filter(t => !existingIds.has(String(t.id)));
    if (newFromOnboarding.length > 0) {
      setTrips(prev => [...prev, ...newFromOnboarding]);
      notify(`✈️ Добавлено ${newFromOnboarding.length} поездок из профиля`);
    }
  }, [profile]);

  const upd = (id, k, v) => setTrips(p => p.map(t => t.id === id ? { ...t, [k]: v } : t));

  const toggleAi = (id) => setAiOpen(p => ({ ...p, [id]: !p[id] }));

  return (
    <div>
      {/* ─── СОВЕТЫ ПО ПОЕЗДКАМ (AiBox) ─── */}
      <div style={{ marginBottom: 12 }}>
        <div
          onClick={() => setAdviceOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: adviceOpen ? '12px 12px 0 0' : '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <span style={{ fontSize: 16 }}>✈️</span>
          <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.info || '#0070c0', fontWeight: 500 }}>Советы по поездкам</span>
          <span style={{ fontSize: 11, color: T.text3 }}>{adviceOpen ? '▲' : '▼'}</span>
        </div>
        {adviceOpen && (
          <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
            <AiBox
              kb={JSON.stringify(profile)}
              prompt={`ПОЕЗДКИ:\n${trips.length > 0 ? trips.map(t => `- ${t.destination}: стадия ${t.stage}${t.budget ? `, бюджет ${t.budget}₸` : ''}${t.saved ? `, отложено ${t.saved}₸` : ''}${t.targetDate ? `, дата ${t.targetDate}` : ''}`).join('\n') : 'Поездок пока нет'}\n\nПРОФИЛЬ: город ${profile?.city || 'Алматы'}, доход/финансы — ${profile?.income || '—'}, отпуск ${profile?.vacationDays || '?'} дней в год\n\nДай конкретный план:\n1. [Накопления] Конкретная сумма в месяц для откладывания под каждую поездку\n2. [Следующий шаг] Одно конкретное действие для продвижения по каждой поездке\n3. [Логистика] Рекомендации по оптимальному времени поездки и маршруту из Казахстана`}
              label="Путешествия"
              btnText="Советы по путешествиям"
              placeholder="Анализирую поездки и составляю конкретный план..."
            />
          </div>
        )}
      </div>

      {/* ─── МОИ ПОЕЗДКИ ─── */}
      <div
        onClick={() => setTripsOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: tripsOpen ? '12px 12px 0 0' : '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: tripsOpen ? 0 : 8 }}
      >
        <span style={{ fontSize: 16 }}>✈️</span>
        <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.info || '#0070c0', fontWeight: 500 }}>Мои поездки</span>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={e => { e.stopPropagation(); setModal(true); }}>+ Добавить</button>
        <span style={{ fontSize: 11, color: T.text3 }}>{tripsOpen ? '▲' : '▼'}</span>
      </div>

      {tripsOpen && (
        <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: 12 }}>
          {trips.length === 0 && (
            <div className="empty">
              <span className="empty-ico">✈️</span>
              <p>Поездок нет. Добавь мечту!</p>
            </div>
          )}

          {trips.map(trip => {
            const progress = stagePct(trip.stage || '💭 Мечта');
            const season = getSeason(trip.targetDate);
            const abroad = isAbroad(trip.destination);
            const isExpanded = expandedId === trip.id;

            return (
              <div key={trip.id} className="trip-card" style={{ marginBottom: 16 }}>
                <SectionHero sectionId="travel" />

                {/* ─── ШАПКА КАРТОЧКИ ─── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : trip.id)}
                    style={{ fontFamily: "'Cormorant Infant',serif", fontSize: 22, color: T.text0, cursor: 'pointer', flex: 1 }}
                  >
                    ✈ {trip.destination || 'Новая поездка'}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono',monospace" }}>
                      {abroad ? '🌍 Загран.' : '🏠 СНГ'} · {season}
                    </span>
                    <div className="ico-btn danger" onClick={() => setTrips(p => p.filter(t => t.id !== trip.id))}>✕</div>
                  </div>
                </div>

                {/* ─── БЕЙДЖИ ─── */}
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
                  <span className="badge bi">{trip.stage}</span>
                  {trip.targetDate && <span className="badge bm">📅 {trip.targetDate}</span>}
                  {trip.budget && <span className="badge bg">💰 {parseInt(trip.budget).toLocaleString()}₸</span>}
                </div>

                {/* ─── ПРОГРЕСС ПОДГОТОВКИ ─── */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.text3, letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase' }}>
                    Подготовка {progress}%
                  </div>
                  <div className="prog">
                    <div className="prog-fill" style={{ width: progress + '%', background: `linear-gradient(90deg,${T.info || '#0070c0'}, #00b8d4)` }} />
                  </div>
                  <div style={{ display: 'flex', gap: 2, marginTop: 6 }}>
                    {stages.map((s, i) => (
                      <div
                        key={s}
                        title={s}
                        style={{ flex: 1, height: 3, borderRadius: 2, background: stages.indexOf(trip.stage) >= i ? (T.info || '#0070c0') : T.bdr, cursor: 'pointer', transition: 'background .2s' }}
                        onClick={() => upd(trip.id, 'stage', s)}
                      />
                    ))}
                  </div>
                </div>

                {/* ─── КОПИЛКА ─── */}
                {trip.budget && (
                  <PiggyBank trip={trip} onUpdate={(k, v) => upd(trip.id, k, v)} />
                )}
                {!trip.budget && (
                  <div style={{ marginBottom: 12 }}>
                    <input
                      style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(200,164,90,0.3)`, borderRadius: 8, color: T.text0, fontFamily: "'Crimson Pro',serif", fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                      placeholder="Укажи бюджет поездки ₸"
                      type="number"
                      onChange={e => upd(trip.id, 'budget', e.target.value)}
                    />
                  </div>
                )}

                {/* ─── РАСКРЫТЫЙ БЛОК: ЧЕКЛИСТ + ИИ ─── */}
                {isExpanded && (
                  <div style={{ marginTop: 4 }}>
                    <TripChecklist trip={trip} />

                    {/* ─── ИИ-МОДУЛЬ ПО МЕСТУ ─── */}
                    <div style={{ marginTop: 14 }}>
                      <div
                        onClick={() => toggleAi(trip.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(0,112,192,0.06)', border: '1px solid rgba(0,112,192,0.2)', borderRadius: aiOpen[trip.id] ? '8px 8px 0 0' : 8, cursor: 'pointer' }}
                      >
                        <span>🤖</span>
                        <span style={{ flex: 1, fontSize: 13, color: T.info || '#0070c0', fontFamily: "'Crimson Pro',serif", fontWeight: 500 }}>
                          ИИ-гид по {trip.destination || 'месту'}
                        </span>
                        <span style={{ fontSize: 10, color: T.text3 }}>{aiOpen[trip.id] ? '▲' : '▼'}</span>
                      </div>
                      {aiOpen[trip.id] && (
                        <div style={{ border: '1px solid rgba(0,112,192,0.15)', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                          <AiBox
                            kb={`Пользователь из ${profile?.city || 'Алматы'}, Казахстан.`}
                            prompt={`Направление: ${trip.destination}. Дата: ${trip.targetDate || 'не указана'}. Сезон: ${season}. ${abroad ? 'Это международная поездка.' : 'Это поездка по СНГ.'}\n\nДай:\n1. 🏛️ ТОП-5 мест что посмотреть\n2. 🍜 Что обязательно попробовать из еды\n3. 🚗 Как добраться из Алматы (самолёт, поезд, авто — сравни варианты)\n4. 💡 3 главных лайфхака для этого направления\n5. ⚠️ Чего избегать`}
                            label={`Гид по ${trip.destination}`}
                            btnText={`Узнать всё о ${trip.destination}`}
                            placeholder={`Собираю информацию о ${trip.destination}...`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ─── КНОПКИ ─── */}
                <div style={{ display: 'flex', gap: 7, marginTop: 12, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setExpandedId(isExpanded ? null : trip.id)}
                  >
                    {isExpanded ? '▲ Свернуть' : '▼ Чек-лист и гид'}
                  </button>
                  {trip.targetDate && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openGCal(`✈ ${trip.destination}`, new Date(trip.targetDate + '-01').toISOString(), `Поездка: ${trip.destination}`)}
                    >
                      📅 В календарь
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {trips.length > 0 && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 4 }} onClick={() => setModal(true)}>
              + Добавить поездку
            </button>
          )}
        </div>
      )}

      {/* ─── МОДАЛКА ДОБАВЛЕНИЯ ПОЕЗДКИ ─── */}
      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <span className="modal-x" onClick={() => setModal(false)}>✕</span>
            <div className="modal-title">Новая поездка</div>
            <div className="fld">
              <label>Куда?</label>
              <input placeholder="Стамбул, Бали, Байкал..." value={nt.destination} onChange={e => setNt(p => ({ ...p, destination: e.target.value }))} />
            </div>
            <div className="fld-row">
              <div className="fld">
                <label>Дата (мес/год)</label>
                <input type="month" value={nt.targetDate} onChange={e => setNt(p => ({ ...p, targetDate: e.target.value }))} />
              </div>
              <div className="fld">
                <label>Бюджет ₸</label>
                <input type="number" value={nt.budget} onChange={e => setNt(p => ({ ...p, budget: e.target.value }))} />
              </div>
            </div>
            <div className="fld">
              <label>Уже отложено ₸</label>
              <input type="number" placeholder="0" value={nt.saved} onChange={e => setNt(p => ({ ...p, saved: e.target.value }))} />
            </div>
            <div className="fld">
              <label>Стадия</label>
              <div className="chips">
                {stages.map(s => (
                  <div key={s} className={`chip${nt.stage === s ? ' on' : ''}`} onClick={() => setNt(p => ({ ...p, stage: s }))}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Отмена</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!nt.destination.trim()) return;
                  setTrips(p => [...p, { ...nt, id: Date.now() }]);
                  setModal(false);
                  setNt({ destination: '', targetDate: '', budget: '', saved: '', stage: '💭 Мечта', notes: '' });
                  notify('Поездка добавлена ✈');
                }}
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
