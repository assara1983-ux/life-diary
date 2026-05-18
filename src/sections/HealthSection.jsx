// src/sections/HealthSection.jsx
import React, { useState, useMemo } from "react";
import { useApp } from "../store/AppContext";
import { calculateHealthProfile, getTimeRecommendation } from "../utils/healthCalculator";
import { AnatomyViewer } from "../components/AnatomyViewer";
import { ModalDetail } from "../components/ModalDetail";
import { ANATOMY_DATA } from "../data/anatomyKnowledge";
import { BreathingTimer } from "../components/BreathingTimer";
import { HealthTracker } from "../components/HealthTracker";
import { ELEMENT_NUTRITION, CHRONO_SCHEDULE, ACTIVITY_BY_LEVEL, CHRONIC_REC } from "../data/healthRecommendations";

const BREATHING_TECHNIQUES = [
  { id: 'wilunas', title: 'Экстренный сброс', inhale: 1, exhale: 3, hold: 0, cycles: 3, priority: 'stress' },
  { id: 'physical', title: 'Коррекция фигуры', inhale: 2, exhale: 5, hold: 2, cycles: 10, priority: 'goal' },
  { id: 'samchon', title: 'Сам Чон До (Базовое)', inhale: 3, exhale: 6, hold: 2, cycles: 5, priority: 'base' },
  { id: 'norbekov', title: 'Настрой Норбекова', inhale: 4, exhale: 8, hold: 2, cycles: 4, priority: 'base' },
  { id: 'mood', title: 'Смена настроения', inhale: 3, exhale: 5, hold: 0, cycles: 6, priority: 'base' }
];

const getZodiac = (d) => {
  const m = d.getMonth() + 1, dd = d.getDate();
  const signs = ['♑Козерог','♒Водолей','♓Рыбы','♈Овен','♉Телец','♊Близнецы','♋Рак','♌Лев','♍Дева','♎Весы','♏Скорпион','♐Стрелец'];
  const days = [[1,20],[2,19],[3,21],[4,21],[5,21],[6,22],[7,23],[8,23],[9,23],[10,23],[11,22],[12,22],[12,32]];
  const idx = days.findIndex(([dm, ddm]) => (m === dm && dd <= ddm) || (m === (dm % 12) + 1 && dd > (days[dm-1]?.[1] || 0)));
  return signs[(idx + 12) % 12] || '♑Козерог';
};

const getEasternYear = (y) => {
  const animals = ['Крыса','Бык','Тигр','Кролик','Дракон','Змея','Лошадь','Коза','Обезьяна','Петух','Собака','Свинья'];
  return animals[(y - 4) % 12];
};

export function HealthSection() {
  const { profile } = useApp();
  const [activeTab, setActiveTab] = useState("anatomy");
  const [modalContent, setModalContent] = useState(null);
  const healthData = useMemo(() => calculateHealthProfile(profile), [profile]);
  const timeData = useMemo(() => getTimeRecommendation(), []);

  const p = profile || {};
  const dob = p.dob ? new Date(p.dob) : new Date();
  const age = Math.floor((new Date() - dob) / 365.25e9);
  const element = healthData.element?.trim() || "Земля";
  const stress = p.stressLevel ?? 5;
  const isWeightGoal = p.goalAreas?.includes('Похудение') || /похудение|вес|форма/i.test(p.mainGoal || '');
  const hasHealthGoal = p.goalAreas?.includes('Здоровье') || p.goalAreas?.includes('Внешность') || isWeightGoal;

  const sortedBreathing = useMemo(() => {
    const list = [...BREATHING_TECHNIQUES];
    return list.sort((a, b) => {      if (stress > 7 && a.id === 'wilunas') return -1;
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

  const MERIDIAN_MAP = { 
    "Печень": "liver", "Лёгкие": "lungs", "Толстый кишечник": "intestines",
    "Желудок": "stomach", "Селезенка": "spleen", "Сердце": "heart",
    "Тонкий кишечник": "intestines", "Мочевой пузырь": "bladder",
    "Почки": "kidneys", "Перикард": "heart", "Сань Цзяо": "spleen", "Желчный пузырь": "liver" 
  };

  return (
    <div className="health-wrapper">
      <style>{`
        .health-wrapper { padding: 20px; background: var(--bg-paper); min-height: 100%; font-family: var(--font-main); color: var(--text-main); }
        .h-tabs { display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 4px; }
        .h-tab { padding: 8px 16px; background: transparent; border: 1px solid var(--blue); color: var(--blue); border-radius: 4px; cursor: pointer; font-family: var(--font-mono); text-transform: uppercase; font-size: 12px; transition: 0.2s; flex-shrink: 0; }
        .h-tab.active { background: var(--blue); color: #fff; }
        .h-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
        .h-card { background: #fff; border: 1px solid var(--blue); padding: 15px; border-radius: 6px; box-shadow: 0 4px 0 rgba(0,112,192,0.1); }
        .h-card h3 { font-family: 'Cinzel', var(--font-head), serif; color: var(--gold); margin: 0 0 8px 0; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
        .h-card h3.blue { color: var(--blue); }
        .h-card p { margin: 0; font-size: 13px; line-height: 1.4; color: #444; }
        .badge { display: inline-block; font-size: 10px; background: var(--blue); color: #fff; padding: 2px 6px; border-radius: 2px; margin-top: 8px; font-family: var(--font-mono); }
        .badge.red { background: #d32f2f; }
        .badge.gold { background: var(--gold); color: #000; }
        .disclaimer { font-size: 10px; color: #888; margin-top: 8px; font-style: italic; }
        .organ-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #ddd; padding: 4px 0; font-size: 12px; }
      `}</style>

      <div className="h-tabs">
        {['anatomy','profile','breathing','mental','recommendations','tracker'].map(t => (
          <button key={t} className={`h-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t === 'recommendations' ? 'Рекомендации' : t === 'profile' ? 'Досье' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="h-content">
        {activeTab === 'anatomy' && (
          <div>            <h2 className="section-title" style={{ fontFamily: 'var(--font-head)', borderBottom: '2px solid var(--blue)', paddingBottom: 5 }}>Интерактивная Анатомия</h2>
            <div style={{ background: 'rgba(0,112,192,0.05)', padding: 10, borderLeft: '3px solid var(--blue)', marginBottom: 15, fontSize: 12 }}>
              <strong>СЕЙЧАС АКТИВЕН:</strong> {timeData.currentMeridian.name} ({timeData.currentMeridian.h})
            </div>
            <AnatomyViewer activeOrganId={MERIDIAN_MAP[timeData.currentMeridian.name] || null} onSelect={d => setModalContent(ANATOMY_DATA[d.id] || {})} />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="h-grid">
            {renderCard('👤 Биокарта', <>
              <p><b>{p.name || 'Пользователь'}</b> • Возраст: {age}</p>
              <p style={{ marginTop: 4 }}>{getZodiac(dob)} • Восточный год: {getEasternYear(dob.getFullYear())}</p>
            </>)}
            {renderCard('🧬 ТКМ Профиль', <>
              <p>Стихия: <b>{element}</b> • Баланс: <b>{healthData.yinyang}</b></p>
              <p style={{ marginTop: 6, fontSize: 12 }}>Паттерн: {healthData.uxinPattern}. {p.tcmElement ? `Полное описание: характер устойчивый, уязвимы органы, связанные с ${element.toLowerCase()}.` : ''}</p>
            </>)}
            {renderCard('⏰ Хронотип', <>
              <p>Тип: <b>{p.chronotype || 'Голубь'}</b> • Подъём: {p.wake || '08:00'} • Отбой: {p.sleep || '23:00'}</p>
              <p style={{ marginTop: 6, fontSize: 12 }}>Пик продуктивности: утро/день. Спорт: {p.chronotype === 'Сова' ? 'вечер' : 'обед'}. Еда: строго по режиму.</p>
            </>)}
            {p.healthConditions?.length > 0 && renderCard('🏥 Хронические состояния', <>
              {p.healthConditions.map((cond, i) => (
                <div key={i} style={{ marginBottom: 4 }}><b>{cond}</b>: {CHRONIC_REC[cond]?.rec || 'Щадящий режим, избегать перегрузок.'}</div>
              ))}
              <div className="disclaimer">⚠️ Рекомендации носят информационный характер. Консультируйтесь с врачом.</div>
            </>)}
            {hasHealthGoal && renderCard('🎯 Цели и здоровье', <>
              <p>Акцент на: {isWeightGoal ? 'Коррекцию веса и метаболизм' : 'Общее укрепление и ресурс'}.</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>По У-Син оптимально: тренировки в часы активности меридиана {element}. Связка дыхания + активность ускоряет результат.</p>
            </>)}
            {renderCard('⚡ Стресс-профиль', <>
              <p>Уровень: <b style={{ color: stress > 7 ? '#d32f2f' : stress > 4 ? '#e6a800' : '#2e7d32' }}>{stress}/10</b></p>
              <p style={{ marginTop: 4 }}>Протокол: {stress > 7 ? 'Рыдающее дыхание → Светотерапия.' : 'Поддержание ритма, Сам Чон До.'}</p>
              <button className="badge" style={{ background: 'transparent', color: '#0070c0', border: '1px solid var(--blue)', cursor: 'pointer' }} onClick={() => setActiveTab('breathing')}>Перейти в Дыхание →</button>
            </>)}
          </div>
        )}

        {activeTab === 'breathing' && (
          <div className="h-grid">
            {sortedBreathing.map((tech) => {
              const isEmergency = stress > 7 && tech.id === 'wilunas';
              const isRecommended = isWeightGoal && tech.id === 'physical';
              const borderColor = isEmergency ? '#d32f2f' : undefined;
              const badge = isEmergency 
                ? <span className="badge red">Экстренно</span> 
                : isRecommended 
                  ? <span className="badge gold">Рекомендовано</span>                   : null;
              return (
                <div key={tech.id} className="h-card" style={{ borderColor }}>
                  <h3>{tech.title}</h3>
                  {badge}
                  <BreathingTimer technique={{ ...tech }} onFinish={() => {}} />
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'mental' && (
          <div className="h-grid">
            {renderCard('🌀 У-Син Паттерн', <>
              <h3 className="blue">{healthData.uxinPattern.toUpperCase()}</h3>
              <p>Доминанта: {element}. Поведение: ориентация на баланс стихий. Сильные качества: адаптивность. Зоны роста: осознанное переключение фокуса.</p>
            </>)}
            {renderCard('🤝 Стихии и отношения', <>
              <p><b>Порождение:</b> {element} → {Object.keys(ELEMENT_NUTRITION).find((e,i,a) => a[(i+2)%5] === element) || 'Металл'} : комфорт в диалоге.</p>
              <p style={{ marginTop: 4 }}><b>Контроль:</b> {element} → {Object.keys(ELEMENT_NUTRITION).find((e,i,a) => a[(i+3)%5] === element) || 'Земля'} : требует границ.</p>
              <p style={{ marginTop: 4, fontSize: 12 }}>Совет: в работе ищите компенсаторные стихии, в личной жизни — порождающие.</p>
            </>)}
            {renderCard('📅 Эмоциональный календарь', <>
              {Object.values(ANATOMY_DATA).slice(0, 4).map(o => (
                <div key={o.id} className="organ-row">
                  <span>{o.name}</span>
                  <span>→ {o.emotion || 'Напряжение'}</span>
                  <span style={{ color: '#0070c0' }}>{o.sound || 'Звук + растяжка'}</span>
                </div>
              ))}
            </>)}
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="h-grid">
            {ELEMENT_NUTRITION[element] && renderCard('🥗 Питание по стихии', <>
              <p>Вкус: <b>{ELEMENT_NUTRITION[element].flavor}</b>. Продукты: {ELEMENT_NUTRITION[element].foods}.</p>
              <p style={{ marginTop: 4 }}>Ограничить: {ELEMENT_NUTRITION[element].avoid}. Главный приём: {ELEMENT_NUTRITION[element].time}.</p>
              {isWeightGoal && (
                <div style={{ marginTop: 6, background: '#fff8e1', padding: 6, fontSize: 12, borderRadius: 4 }}>
                  🔥 Снижение веса: {ELEMENT_NUTRITION[element].weightLoss}
                </div>
              )}
            </>)}
            {CHRONO_SCHEDULE[p.chronotype] && renderCard('🕒 Режим дня', <>
              {Object.entries(CHRONO_SCHEDULE[p.chronotype]).map(([k,v]) => (
                <div key={k} style={{ fontSize: 12, marginTop: 2 }}><b>{k}:</b> {v}</div>
              ))}            </>)}
            {ACTIVITY_BY_LEVEL[p.activityLevel] && renderCard('🏃 Физическая активность', <>
              <p>Уровень: {p.activityLevel}. {ACTIVITY_BY_LEVEL[p.activityLevel]}</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>
                По стихии {element}: рекомендуется {element === 'Дерево' ? 'йога и растяжка' : element === 'Металл' ? 'дыхательные практики и ходьба' : 'умеренная нагрузка без перегрева'}.
              </p>
            </>)}
            {p.healthConditions?.length > 0 && renderCard('⚕️ Учёт хронических состояний', <>
              {p.healthConditions.map((c, i) => (
                <div key={i} style={{ fontSize: 12, marginBottom: 4 }}><b>{c}:</b> Исключить: {CHRONIC_REC[c]?.avoid || '—'}.</div>
              ))}
              <div className="disclaimer">⚠️ Данные носят ознакомительный характер.</div>
            </>)}
          </div>
        )}

        {activeTab === 'tracker' && <HealthTracker />}
      </div>

      {modalContent && (
        <ModalDetail 
          isOpen={!!modalContent} 
          onClose={() => setModalContent(null)} 
          title={modalContent.title} 
          description={modalContent.desc} 
          warning={modalContent.warning} 
          rules={modalContent.rules} 
          benefit={modalContent.benefit} 
        />
      )}
    </div>
  );
              }
