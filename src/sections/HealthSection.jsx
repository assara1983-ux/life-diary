// src/sections/HealthSection.jsx
import React, { useState, useMemo } from "react";
import { useApp } from "../store/AppContext";
import { calculateHealthProfile, getTimeRecommendation } from "../utils/healthCalculator";
import { AnatomyViewer } from "../components/AnatomyViewer";
import { ModalDetail } from "../components/ModalDetail";
import { ANATOMY_DATA } from "../data/anatomyKnowledge";
import { BreathingTimer } from "../components/BreathingTimer";
import { HealthTracker } from "../components/HealthTracker";
import { ELEMENT_NUTRITION, CHRONO_ADVICE, ACTIVITY_ADVICE, ENERGY_RECOVERY } from "../data/healthRecommendations";

// --- HELPER FUNCTIONS (FIXED) ---
const getZodiac = (date) => {
  if (!date) return '—';
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const zodiac = [
    { sign: '♑ Козерог', end: [1, 19] },
    { sign: '♒ Водолей', end: [2, 18] },
    { sign: '♓ Рыбы', end: [3, 20] },
    { sign: '♈ Овен', end: [4, 19] },
    { sign: '♉ Телец', end: [5, 20] },
    { sign: '♊ Близнецы', end: [6, 20] },
    { sign: '♋ Рак', end: [7, 22] },
    { sign: '♌ Лев', end: [8, 22] },
    { sign: '♍ Дева', end: [9, 22] },
    { sign: ' Весы', end: [10, 22] },
    { sign: '♏ Скорпион', end: [11, 21] },
    { sign: '♐ Стрелец', end: [12, 21] },
    { sign: '♑ Козерог', end: [12, 31] }
  ];
  const current = zodiac.find(z => month === z.end[0] && day <= z.end[1]);
  return current?.sign || '—';
};

const getAge = (dob) => {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
};

const getEasternYear = (y) => {
  const animals = ['Крыса','Бык','Тигр','Кролик','Дракон','Змея','Лошадь','Коза','Обезьяна','Петух','Собака','Свинья'];
  return animals[(y - 4) % 12];
};

// --- DATA: BREATHING TECHNIQUES ---
const BREATHING_TECHNIQUES = [
  { id: 'wilunas', title: 'Экстренный сброс (Рыдающее)', short: 'Снижение давления и паники', purpose: 'Мгновенное снятие острого стресса (>7)', effect: 'Снижение кортизола, нормализация пульса', rules: 'Вдох ртом → выдох со звуком "с-с-с" → пауза. 3 мин.', technique: { inhale: 1, exhale: 3, hold: 0, cycles: 3 } },
  { id: 'physical', title: 'Коррекция фигуры', short: 'Активация метаболизма', purpose: 'Сжигание жира, тонус мышц пресса', effect: 'Ускорение обмена веществ, массаж органов', rules: 'Только утром натощак. Поза "Всадник". Активный выдох "Ба-ха".', technique: { inhale: 2, exhale: 5, hold: 2, cycles: 10 } },  { id: 'samchon', title: 'Сам Чон До (Базовое)', short: 'Гармонизация состояния', purpose: 'Подготовка, снятие зажимов', effect: 'Баланс Инь/Ян, спокойствие', rules: 'Вдох носом 3с → Выдох ртом 6с → Пауза 2с.', technique: { inhale: 3, exhale: 6, hold: 2, cycles: 5 } },
  { id: 'norbekov', title: 'Настрой Норбекова + ОМЗ', short: 'Омоложение и ресурс', purpose: 'Настройка 13 центров, омоложение', effect: 'Прилив энергии, ясность ума', rules: '4 этапа: Образ → Палец → Рука → Сплетение. НЕ направлять в Сердце/Мозг!', technique: { inhale: 4, exhale: 8, hold: 2, cycles: 4 } },
  { id: 'mood', title: 'Смена настроения', short: 'Эмоциональная перезагрузка', purpose: 'Быстрая смена негатива на позитив', effect: 'Выработка дофамина', rules: 'Сам Чон До → Образ человека в нужном настроении → Дыхание через образ.', technique: { inhale: 3, exhale: 5, hold: 0, cycles: 6 } }
];

export function HealthSection() {
  const { profile } = useApp();
  const [activeTab, setActiveTab] = useState("anatomy");
  const [modalContent, setModalContent] = useState(null);
  
  // State for Accordion expansion
  const [expandedRec, setExpandedRec] = useState(null);
  const [expandedBreath, setExpandedBreath] = useState(null);

  const healthData = useMemo(() => calculateHealthProfile(profile), [profile]);
  const timeData = useMemo(() => getTimeRecommendation(), []);

  const p = profile || {};
  const dob = p.dob ? new Date(p.dob) : new Date();
  const age = getAge(p.dob);
  const element = healthData.element?.trim() || "Земля";
  const stress = p.stressLevel ?? 5;
  const isWeightGoal = p.goalAreas?.includes('Похудение') || /похудение|вес|форма/i.test(p.mainGoal || '');
  const hasHealthGoal = p.goalAreas?.includes('Здоровье') || p.goalAreas?.includes('Внешность') || isWeightGoal;

  const MERIDIAN_MAP = { 
    "Печень": "liver", "Лёгкие": "lungs", "Толстый кишечник": "intestines",
    "Желудок": "stomach", "Селезенка": "spleen", "Сердце": "heart",
    "Тонкий кишечник": "intestines", "Мочевой пузырь": "bladder",
    "Почки": "kidneys", "Перикард": "heart", "Сань Цзяо": "spleen", "Желчный пузырь": "liver" 
  };

  const sortedBreathing = useMemo(() => {
    const list = [...BREATHING_TECHNIQUES];
    return list.sort((a, b) => {
      if (stress > 7 && a.id === 'wilunas') return -1;
      if (isWeightGoal && a.id === 'physical') return a.id === 'wilunas' ? 1 : -1;
      return 0;
    });
  }, [stress, isWeightGoal]);

  const renderCard = (title, content, extraStyle = {}) => (
    <div className="h-card" style={extraStyle}>
      <h3 className={title.includes('У-Син') || title.includes('Стихии') ? 'blue' : ''}>{title}</h3>
      {content}
    </div>
  );

  const AccordionItem = ({ title, children, isOpen, toggle }) => (
    <div className="h-card" style={{ padding: 0, overflow: 'hidden', borderColor: isOpen ? 'var(--gold)' : 'var(--blue)' }}>      <div 
        onClick={toggle} 
        style={{ padding: '12px 15px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isOpen ? 'rgba(212,175,55,0.05)' : '#fff' }}
      >
        <span style={{ fontWeight: 600, color: 'var(--blue)' }}>{title}</span>
        <span style={{ fontSize: 16, color: 'var(--blue)' }}>{isOpen ? '−' : '+'}</span>
      </div>
      {isOpen && (
        <div style={{ padding: '12px 15px', borderTop: '1px solid #eee', background: '#fff', fontSize: 13, lineHeight: 1.5 }}>
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="health-wrapper">
      <style>{`
        .health-wrapper { padding: 20px; background: var(--bg-paper); min-height: 100%; font-family: var(--font-main); color: var(--text-main); }
        .h-tabs { display: flex; gap: 8px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 4px; }
        .h-tab { padding: 8px 14px; background: transparent; border: 1px solid var(--blue); color: var(--blue); border-radius: 4px; cursor: pointer; font-family: var(--font-mono); text-transform: uppercase; font-size: 11px; transition: 0.2s; flex-shrink: 0; }
        .h-tab.active { background: var(--blue); color: #fff; }
        .h-grid-profile { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
        .h-card { background: #fff; border: 1px solid var(--blue); padding: 15px; border-radius: 6px; box-shadow: 0 2px 0 rgba(0,112,192,0.1); }
        .h-card h3 { font-family: 'Cinzel', var(--font-head), serif; color: var(--gold); margin: 0 0 6px 0; font-size: 14px; }
        .h-card h3.blue { color: var(--blue); }
        .h-card p { margin: 0; font-size: 12px; line-height: 1.3; color: #444; }
        .badge { display: inline-block; font-size: 9px; background: var(--blue); color: #fff; padding: 2px 5px; border-radius: 2px; margin-top: 6px; }
        .badge.red { background: #d32f2f; }
        .badge.gold { background: var(--gold); color: #000; }
        .disclaimer { font-size: 10px; color: #888; margin-top: 8px; font-style: italic; }
        .detail-row { margin-bottom: 6px; }
        .detail-label { font-weight: 600; color: #555; }
        .timer-container { margin-top: 10px; }
        @media (max-width: 768px) { .h-grid-profile { grid-template-columns: 1fr; } }
      `}</style>

      <div className="h-tabs">
        {['anatomy','profile','recommendations','breathing','mental'].map(t => (
          <button key={t} className={`h-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t === 'recommendations' ? 'Рекомендации' : t === 'profile' ? 'Досье' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="h-content">
        {/* TAB 1: ANATOMY */}
        {activeTab === 'anatomy' && (
          <div>
            <h2 className="section-title" style={{ fontFamily: 'var(--font-head)', borderBottom: '2px solid var(--blue)', paddingBottom: 5 }}>Интерактивная Анатомия</h2>            <div style={{ background: 'rgba(0,112,192,0.05)', padding: 10, borderLeft: '3px solid var(--blue)', marginBottom: 15, fontSize: 12 }}>
              <strong>СЕЙЧАС АКТИВЕН:</strong> {timeData.currentMeridian.name} ({timeData.currentMeridian.h})
            </div>
            <AnatomyViewer activeOrganId={MERIDIAN_MAP[timeData.currentMeridian.name] || null} onSelect={d => setModalContent(ANATOMY_DATA[d.id] || {})} />
          </div>
        )}

        {/* TAB 2: PROFILE (DOSIER) */}
        {activeTab === 'profile' && (
          <div>
            <h2 className="section-title" style={{ fontFamily: 'var(--font-head)', borderBottom: '2px solid var(--blue)', paddingBottom: 5 }}>Био-Энергетический Профиль</h2>
            
            <div className="h-grid-profile">
              {renderCard('👤 Биокарта', <>
                <p><b>{p.name || 'Пользователь'}</b></p>
                <p style={{ marginTop: 2 }}>Возраст: {age} лет</p>
                <p style={{ marginTop: 2 }}>{getZodiac(dob)} • {getEasternYear(dob.getFullYear())}</p>
              </>)}
              {renderCard(' ТКМ Профиль', <>
                <p>Стихия: <b>{element}</b></p>
                <p style={{ marginTop: 2 }}>Баланс: <b>{healthData.yinyang}</b></p>
                <p style={{ marginTop: 2, fontSize: 10 }}>Паттерн: {healthData.uxinPattern}</p>
              </>)}
              {renderCard('⏰ Хронотип', <>
                <p>Тип: <b>{p.chronotype || 'Голубь'}</b></p>
                <p style={{ marginTop: 2 }}>Подъём: {p.wake || '08:00'} • Отбой: {p.sleep || '23:00'}</p>
              </>)}
              {renderCard('⚡ Стресс', <>
                <p>Уровень: <b style={{ color: stress > 7 ? '#d32f2f' : stress > 4 ? '#e6a800' : '#2e7d32' }}>{stress}/10</b></p>
                <button className="badge" style={{ marginTop: 6, background: 'transparent', color: '#0070c0', border: '1px solid var(--blue)', cursor: 'pointer' }} onClick={() => setActiveTab('breathing')}>Перейти в Дыхание →</button>
              </>)}
              {p.healthConditions?.length > 0 && renderCard('🏥 Хронические', <>
                {p.healthConditions.map((c, i) => <p key={i}>{c}</p>)}
                <div className="disclaimer">⚠️ Только для информации</div>
              </>)}
              {hasHealthGoal && renderCard(' Цели', <>
                <p>{isWeightGoal ? 'Коррекция веса' : 'Общее укрепление'}</p>
              </>)}
            </div>

            {/* Tracker embedded */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--blue)', marginBottom: 10 }}>📊 Ежедневный Трекер</div>
              <HealthTracker compact={true} />
            </div>
          </div>
        )}

        {/* TAB 3: RECOMMENDATIONS (Moved here) */}
        {activeTab === 'recommendations' && (          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 className="section-title" style={{ fontFamily: 'var(--font-head)', borderBottom: '2px solid var(--blue)', paddingBottom: 5 }}>Персональные Рекомендации</h2>
            
            <AccordionItem title="🥗 Питание по стихии" isOpen={expandedRec === 'diet'} toggle={() => setExpandedRec(expandedRec === 'diet' ? null : 'diet')}>
              <p><span className="detail-label">Рекомендуемый вкус:</span> {ELEMENT_NUTRITION[element]?.flavor}</p>
              <p><span className="detail-label">Продукты:</span> {ELEMENT_NUTRITION[element]?.foods}</p>
              <p><span className="detail-label">Ограничить:</span> {ELEMENT_NUTRITION[element]?.avoid}</p>
              {isWeightGoal && <p style={{ marginTop: 8, color: '#d32f2f' }}>🔥 Цель: Похудение. Исключите сладкое после 16:00.</p>}
            </AccordionItem>

            <AccordionItem title="🕒 Режим дня и Хронотип" isOpen={expandedRec === 'chrono'} toggle={() => setExpandedRec(expandedRec === 'chrono' ? null : 'chrono')}>
              {CHRONO_ADVICE[p.chronotype] && Object.entries(CHRONO_ADVICE[p.chronotype]).map(([k,v]) => (
                <p key={k}><span className="detail-label">{k}:</span> {v}</p>
              ))}
            </AccordionItem>

            <AccordionItem title="🏃 Физическая активность" isOpen={expandedRec === 'activity'} toggle={() => setExpandedRec(expandedRec === 'activity' ? null : 'activity')}>
              <p>{ACTIVITY_ADVICE[p.activityLevel] || "Рекомендуется умеренная активность."}</p>
              <p style={{ marginTop: 6 }}><span className="detail-label">По стихии {element}:</span> {element === 'Дерево' ? 'Йога, растяжка' : element === 'Металл' ? 'Дыхание, ходьба' : 'Плавание, бег'}</p>
            </AccordionItem>

            <AccordionItem title=" Источник энергии и Восстановление" isOpen={expandedRec === 'energy'} toggle={() => setExpandedRec(expandedRec === 'energy' ? null : 'energy')}>
              <p><span className="detail-label">Ваш источник:</span> {p.energySource || 'Баланс'}</p>
              <p style={{ marginTop: 4 }}>{ENERGY_RECOVERY[p.energySource] || "Чередуйте активность и покой."}</p>
            </AccordionItem>
          </div>
        )}

        {/* TAB 4: BREATHING (Accordion + Timer) */}
        {activeTab === 'breathing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 className="section-title" style={{ fontFamily: 'var(--font-head)', borderBottom: '2px solid var(--blue)', paddingBottom: 5 }}>Дыхательные Протоколы</h2>
            {sortedBreathing.map((tech) => {
              const isEmergency = stress > 7 && tech.id === 'wilunas';
              const isRecommended = isWeightGoal && tech.id === 'physical';
              const isOpen = expandedBreath === tech.id;
              
              return (
                <div key={tech.id} className="h-card" style={{ padding: 0, overflow: 'hidden', borderColor: isEmergency ? '#d32f2f' : 'var(--blue)' }}>
                  <div 
                    onClick={() => setExpandedBreath(isOpen ? null : tech.id)}
                    style={{ padding: '12px 15px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isOpen ? 'rgba(0,112,192,0.05)' : '#fff' }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--blue)', display: 'block' }}>{tech.title}</span>
                      <span style={{ fontSize: 11, color: '#666' }}>{tech.short}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isEmergency && <span className="badge red">Экстренно</span>}
                      {isRecommended && <span className="badge gold">Рекомендовано</span>}                      <span style={{ fontSize: 16, color: 'var(--blue)' }}>{isOpen ? '−' : '+'}</span>
                    </div>
                  </div>
                  
                  {isOpen && (
                    <div style={{ padding: '15px', borderTop: '1px solid #eee', background: '#fff' }}>
                      <div className="detail-row"><span className="detail-label">Для чего:</span> {tech.purpose}</div>
                      <div className="detail-row"><span className="detail-label">Что даёт:</span> {tech.effect}</div>
                      <div className="detail-row"><span className="detail-label">Правила:</span> {tech.rules}</div>
                      
                      <div className="timer-container">
                        <BreathingTimer technique={tech.technique} onFinish={() => setExpandedBreath(null)} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 5: SPHERE (MENTAL) */}
        {activeTab === 'mental' && (
          <div className="h-grid-profile">
            {renderCard('🌀 У-Син Паттерн', <>
              <h3 className="blue">{healthData.uxinPattern.toUpperCase()}</h3>
              <p>Доминанта: {element}. Адаптивность и баланс.</p>
            </>)}
            {renderCard('🤝 Стихии и отношения', <>
              <p><b>Порождение:</b> комфорт в диалоге</p>
              <p style={{ marginTop: 4 }}><b>Контроль:</b> требует границ</p>
            </>)}
            {renderCard('📅 Эмоциональный календарь', <>
              {Object.values(ANATOMY_DATA).slice(0, 3).map(o => (
                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ddd', padding: '4px 0', fontSize: 11 }}>
                  <span>{o.name}</span><span>→ {o.emotion || 'Напряжение'}</span>
                </div>
              ))}
            </>)}
          </div>
        )}
      </div>

      {modalContent && (
        <ModalDetail isOpen={!!modalContent} onClose={() => setModalContent(null)} title={modalContent.title} description={modalContent.desc} warning={modalContent.warning} rules={modalContent.rules} benefit={modalContent.benefit} />
      )}
    </div>
  );
                                 }
