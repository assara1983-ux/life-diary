import { useState } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights } from "../utils/knowledgeEngine";
import { Icon } from "../components/Icon";
import { T } from "../utils/theme";

// Компонент Аккордеона (для чистоты кода)
function Accordion({ title, icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="accordion">
      <div 
        className="accordion-header" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18, color: T.blue }}>{icon}</span>
          <span style={{ fontFamily: "var(--font-head)", fontSize: 13, letterSpacing: 1 }}>{title}</span>
        </div>
        <span style={{ color: T.gold, transition: 'transform 0.3s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
      </div>
      <div 
        className={`accordion-content ${isOpen ? 'open' : ''}`}
        style={{ transition: 'max-height 0.3s ease', overflow: 'hidden' }}
      >
        <div style={{ padding: '10px 0', borderTop: '1px solid var(--line-s)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function ProfileSection() {
  const { profile } = useApp();
  
  // Получаем персонализированные данные из Базы Знаний
  const insights = getProfileInsights(profile);

  if (!profile) return <div>Загрузка профиля...</div>;

  return (
    <div className="page">
      {/* HEADER: Основная инфо-панель */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #fff 0%, #f0f5ff 100%)', borderLeft: '4px solid var(--blue)' }}>
        <div className="card-hd">
          <div className="card-title" style={{ fontSize: 20, fontFamily: 'var(--font-head)' }}>
            {profile.name || 'Гость'}          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: T.text3 }}>ГРАДУС СУДЬБЫ</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: T.gold }}>{insights.destiny.degree}°</div>
          </div>
        </div>
        
        {/* Сетка метрик */}
        <div className="g3" style={{ marginTop: 12 }}>
          <div className="badge bg" style={{ justifyContent: 'center' }}>
            <span style={{ fontSize: 12 }}>♈</span> {insights.zodiac}
          </div>
          <div className="badge bm" style={{ justifyContent: 'center' }}>
            <span style={{ fontSize: 12 }}>🐗</span> Свинья
          </div>
          <div className="badge bt" style={{ justifyContent: 'center' }}>
            <span style={{ fontSize: 12 }}>🌊</span> Вода
          </div>
        </div>
        <p style={{ 
          fontFamily: 'var(--font-italic)', 
          fontSize: 13, 
          color: T.text2, 
          marginTop: 12, 
          fontStyle: 'italic',
          borderLeft: '2px solid rgba(0,112,192,0.2)',
          paddingLeft: 8
        }}>
          «{insights.destiny.interpretation}»
        </p>
      </div>

      {/* АККОРДЕОНЫ (Детальная расшифровка) */}
      
      {/* 1. Body Blueprint (Здоровье) */}
      <Accordion title="BODY BLUEPRINT" icon="🫁" defaultOpen={true}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'rgba(232,85,109,0.08)', padding: 10, borderRadius: 6 }}>
            <div className="sec-lbl" style={{ fontSize: 8, marginTop: 0 }}>⚠️ СЛАБЫЕ ЗОНЫ</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: T.text1 }}>{insights.health.area}</div>
            <div style={{ fontSize: 12, color: T.text2, marginTop: 4 }}>{insights.health.organs}</div>
          </div>
          <div style={{ background: 'rgba(45,106,79,0.08)', padding: 10, borderRadius: 6 }}>
            <div className="sec-lbl" style={{ fontSize: 8, marginTop: 0 }}>💡 РЕКОМЕНДАЦИЯ</div>
            <div style={{ fontSize: 13, color: T.text1 }}>{insights.health.advice}</div>
          </div>
        </div>
      </Accordion>

      {/* 2. Beauty & Cycles (Красота и Лунные фазы) */}      <Accordion title="BEAUTY & CYCLES" icon="✨">
        <div style={{ padding: '8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: T.text3 }}>ЛУННЫЙ ДЕНЬ {insights.moonDay}</span>
            <span style={{ fontSize: 18 }}>{insights.moonRestriction.icon}</span>
          </div>
          <div style={{ background: 'rgba(193,154,90,0.1)', border: '1px dashed var(--gold-dark)', padding: 10, borderRadius: 4 }}>
            <span style={{ fontSize: 13, color: T.text1 }}>
              Сегодня не рекомендуется воздействовать на: <br/>
              <strong style={{ color: T.error }}>{insights.moonRestriction.forbidden}</strong>
            </span>
          </div>
        </div>
      </Accordion>

      {/* 3. TCM & Energy (ТКМ и Энергия) */}
      <Accordion title="TCM & ENERGY" icon="⚡">
        <div className="g2">
          <div>
            <div className="sec-lbl" style={{ fontSize: 8, marginTop: 0 }}>ХРОНОТИП</div>
            <div style={{ fontSize: 14, color: T.text1 }}>{insights.chronotype}</div>
          </div>
          <div>
            <div className="sec-lbl" style={{ fontSize: 8, marginTop: 0 }}>КОНСТИТУЦИЯ</div>
            <div style={{ fontSize: 14, color: T.text1 }}>{insights.tcmType}</div>
          </div>
        </div>
      </Accordion>

      {/* 4. Karmic Tasks (Карма и Цели) */}
      <Accordion title="KARMIC TASKS" icon="🔮">
        <div style={{ padding: '8px 0', fontSize: 13, color: T.text2, lineHeight: 1.6 }}>
          <p><strong>🌱 Задача жизни:</strong> {profile.goalAreas ? `Развитие в сферах: ${profile.goalAreas.join(', ')}` : 'Определите свои цели в настройках.'}</p>
          <p><strong>🚧 Блок:</strong> {profile.goalBlocks ? profile.goalBlocks.join(', ') : 'Нет данных.'}</p>
        </div>
      </Accordion>

      {/* Кнопки действий */}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" style={{ flex: 1 }}>📝 Редактировать</button>
        <button className="btn btn-ghost">📊 Анализ</button>
      </div>
    </div>
  );
}
