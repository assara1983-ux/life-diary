// src/sections/HealthSection.jsx
import React, { useState, useMemo } from "react";
import { useApp } from "../store/AppContext";
import { calculateHealthProfile, getMeridianData, getTimeRecommendation } from "../utils/healthCalculator";
import { MeridianClock } from "../components/MeridianClock";
import { ModalDetail } from "../components/ModalDetail"; // Предполагаемый компонент модалки

// --- КОНСТАНТЫ ДАННЫХ (База Знаний) ---
const BREATHING_TECHNIQUES = {
  sam_chon_do: {
    title: "Сам Чон До (Базовое)",
    desc: "Вдох носом 3с → Выдох ртом 6с → Пауза 2с. 3-9 циклов.",
    benefit: "Гармонизация организма, настройка на работу, снятие зажимов.",
    rule: "Ментально проговаривать: в-д-о-х / в-ы-д-о-х."
  },
  wilunas: {
    title: "Рыдающее дыхание (Сброс)",
    desc: "Вдох ртом → выдох со звуком 'с-с-с' → пауза. 3 мин.",
    benefit: "Мгновенное снятие острого стресса (>7), снижение давления.",
    warning: "Не применять при острых сердечных патологиях!"
  },
  norbekov: {
    title: "Настрой Норбекова + ОМЗ",
    desc: "4 этапа: Образ → Палец→Рука→Сплетеие → Аквариум.",
    benefit: "Глубокое восстановление, омоложение, ресурс.",
    rule: "⛔ НЕ направлять поток в Сердце и Головной мозг!",
    timing: "Вечер / Ночь"
  },
  sounds: {
    title: "6 Даосских звуков",
    desc: "Лёгкие (С) → Почки (У) → Печень (Ш) → Сердце (Хау) → Селезенка (Ху) → 3Об (Хэ).",
    benefit: "Очищение органов, вибрационная терапия.",
    rule: "Только на выдохе! Едва слышно."
  }
};

const UXIN_PATTERNS = {
  equal: { title: "Равноценный", text: "Оба наполняются. Поддерживайте ритм." },
  vampire: { title: "Вампиризм", text: "Алгоритм защиты: 3 цикла дыхания → взгляд на нос → внутреннее закрытие." },
  donor: { title: "Донорство", text: "Вы истощаетесь. Остановите отдачу, включите режим 'Нейтральный'." },
  neutral: { title: "Нейтральный", text: "Экономия энергии. Воспринимайте без оценки." }
};

export function HealthSection() {
  const { profile } = useApp();
  const [activeTab, setActiveTab] = useState("profile");
  const [modalContent, setModalContent] = useState(null);

  // 1. Расчет профиля (Однажды за сессию или при смене профиля)
  const healthData = useMemo(() => calculateHealthProfile(profile), [profile]);  
  // 2. Текущие рекомендации по времени
  const timeData = useMemo(() => getTimeRecommendation(profile), [profile]);

  return (
    <div className="health-wrapper">
      <style>{`
        .health-wrapper { padding: 20px; background: var(--bg-paper); min-height: 100%; font-family: var(--font-main); color: var(--text-main); }
        .h-tabs { display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto; }
        .h-tab { 
          padding: 8px 16px; background: transparent; border: 1px solid var(--blue); color: var(--blue); 
          border-radius: 4px; cursor: pointer; font-family: var(--font-mono); text-transform: uppercase; font-size: 12px;
          transition: 0.2s;
        }
        .h-tab.active { background: var(--blue); color: #fff; }
        .h-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; }
        .h-card { 
          background: #fff; border: 1px solid var(--blue); padding: 15px; position: relative; cursor: pointer;
          box-shadow: 0 4px 0 rgba(0,112,192,0.1); transition: transform 0.1s;
        }
        .h-card:hover { transform: translateY(-2px); box-shadow: 0 6px 0 rgba(0,112,192,0.15); }
        .h-card h3 { font-family: var(--font-head); color: var(--blue); margin: 0 0 8px 0; font-size: 14px; }
        .h-card p { margin: 0; font-size: 13px; line-height: 1.4; color: #444; }
        .h-badge { 
          display: inline-block; font-size: 10px; background: var(--blue); color: #fff; 
          padding: 2px 6px; border-radius: 2px; margin-top: 8px; font-family: var(--font-mono); 
        }
        .h-badge.warning { background: #d32f2f; }
        .section-title { font-family: var(--font-head); color: var(--text-main); border-bottom: 2px solid var(--blue); padding-bottom: 5px; margin-bottom: 15px; font-size: 18px; }
        .data-row { display: flex; justify-content: space-between; font-size: 13px; border-bottom: 1px solid #eee; padding: 6px 0; }
        .data-label { color: #666; }
        .data-val { font-weight: bold; color: var(--blue); font-family: var(--font-mono); }
      `}</style>

      {/* ТАБЫ */}
      <div className="h-tabs">
        <button className={`h-tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Досье</button>
        <button className={`h-tab ${activeTab === 'rhythm' ? 'active' : ''}`} onClick={() => setActiveTab('rhythm')}>Ритм & Часы</button>
        <button className={`h-tab ${activeTab === 'breathing' ? 'active' : ''}`} onClick={() => setActiveTab('breathing')}>Дыхание</button>
        <button className={`h-tab ${activeTab === 'mental' ? 'active' : ''}`} onClick={() => setActiveTab('mental')}>Сфера</button>
      </div>

      {/* КОНТЕНТ */}
      <div className="h-content">
        
        {/* 1. ДОСЬЕ (ПРОФИЛЬ) */}
        {activeTab === 'profile' && (
          <div>
            <h2 className="section-title">Био-Энергетический Профиль</h2>
            <div className="h-grid">              <div className="h-card" onClick={() => setModalContent({ title: "ТКМ Конституция", desc: `Стихия: ${healthData.element}. Баланс: ${healthData.yinyang}. Рекомендации по питанию и эмоциям.` })}>
                <h3>🧬 ТКМ Конституция</h3>
                <p>Стихия: <strong>{healthData.element}</strong></p>
                <p>Баланс: {healthData.yinyang}</p>
                <span className="h-badge">Клик для деталей</span>
              </div>
              <div className="h-card" onClick={() => setModalContent({ title: "Хронотип", desc: `Тип: ${healthData.chronotype}. Лучшее время для работы: ${healthData.workTime}. Время отдыха: ${healthData.restTime}.` })}>
                <h3>⏳ Хронотип</h3>
                <p>Тип: <strong>{healthData.chronotype}</strong></p>
                <p>Пик энергии: {healthData.workTime}</p>
                <span className="h-badge">Управление ритмами</span>
              </div>
              <div className="h-card" onClick={() => setModalContent({ title: "Стресс-профиль", desc: `Уровень: ${healthData.stress}/10. Протокол: ${healthData.stress > 7 ? 'Аварийный сброс' : 'Поддержание'}.` })}>
                <h3>⚡ Стресс</h3>
                <p>Уровень: <strong>{healthData.stress}/10</strong></p>
                <p>Фокус: {profile?.focusZones || "Общий"}</p>
                {healthData.stress > 7 && <span className="h-badge warning">Требуется сброс</span>}
              </div>
            </div>
            <div style={{marginTop: '20px', padding: '10px', border: '1px dashed var(--blue)', color: '#666', fontSize: '12px'}}>
              <strong>Анна Бортник:</strong> Знак {healthData.zodiac} · Фаза {healthData.jiaziPhase} · Узлы {healthData.lunarNodes}
            </div>
          </div>
        )}

        {/* 2. РИТМ & ЧАСЫ (ИНТЕРАКТИВНАЯ СХЕМА) */}
        {activeTab === 'rhythm' && (
          <div>
            <h2 className="section-title">Меридианные Часы (У-Син)</h2>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px' }}>
                {/* Интерактивная схема */}
                <MeridianClock 
                  activeMeridian={timeData.currentMeridian} 
                  onSelect={setModalContent} 
                />
              </div>
              <div style={{ flex: '1 1 300px' }}>
                <h3 style={{ color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>СЕЙЧАС: {timeData.hourSlot}</h3>
                <div className="h-card" onClick={() => setModalContent({ title: timeData.currentMeridian.name, desc: timeData.currentMeridian.desc, warning: timeData.currentMeridian.warning, benefit: timeData.currentMeridian.benefit })}>
                  <h3>Активный: {timeData.currentMeridian.name}</h3>
                  <p>{timeData.currentMeridian.desc.substring(0, 60)}...</p>
                  <span className="h-badge">Подробнее</span>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <strong style={{fontSize: '12px', color: '#888'}}>РЕКОМЕНДАЦИЯ ЧАСА:</strong>
                  <p style={{ fontSize: '13px' }}>{timeData.recommendation}</p>
                </div>
              </div>
            </div>          </div>
        )}

        {/* 3. ДЫХАНИЕ (КАРТОЧКИ) */}
        {activeTab === 'breathing' && (
          <div>
            <h2 className="section-title">Дыхательные протоколы</h2>
            <div className="h-grid">
              <div className="h-card" onClick={() => setModalContent(BREATHING_TECHNIQUES.sam_chon_do)}>
                <h3>Базовое: Сам Чон До</h3>
                <p>3-6-2. Подготовка.</p>
                <span className="h-badge">Универсально</span>
              </div>
              <div className="h-card" onClick={() => setModalContent(BREATHING_TECHNIQUES.norbekov)}>
                <h3>ОМЗ (Норбеков)</h3>
                <p>Омоложение. Энергия.</p>
                <span className="h-badge">Вечер</span>
              </div>
              <div className="h-card" onClick={() => setModalContent(BREATHING_TECHNIQUES.sounds)}>
                <h3>6 Звуков (ТКМ)</h3>
                <p>Очищение органов.</p>
                <span className="h-badge">Утро</span>
              </div>
              {(healthData.stress > 7) && (
                <div className="h-card" style={{ borderColor: '#d32f2f' }} onClick={() => setModalContent(BREATHING_TECHNIQUES.wilunas)}>
                  <h3 style={{ color: '#d32f2f' }}>Экстренный сброс</h3>
                  <p>Рыдающее дыхание.</p>
                  <span className="h-badge warning">Стресс {'>'} 7</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. МЕНТАЛЬНОЕ (У-СИН) */}
        {activeTab === 'mental' && (
          <div>
            <h2 className="section-title">Ментальное поле & У-Син</h2>
            <div className="h-card" onClick={() => setModalContent({ title: "Паттерн общения", desc: `Сейчас вы в позиции: ${UXIN_PATTERNS[healthData.uxinPattern].title}. ${UXIN_PATTERNS[healthData.uxinPattern].text}` })}>
              <h3>Ваш паттерн коммуникации</h3>
              <p>Текущий режим: <strong>{healthData.uxinPattern.toUpperCase()}</strong></p>
              <p style={{ fontSize: '12px', color: '#666' }}>Зависит от стресса и CoreValue.</p>
              <span className="h-badge">Узнать алгоритм защиты</span>
            </div>
          </div>
        )}

      </div>

      {/* МОДАЛЬНОЕ ОКНО */}      {modalContent && (
        <ModalDetail 
          isOpen={!!modalContent} 
          onClose={() => setModalContent(null)} 
          title={modalContent.title} 
          description={modalContent.desc}
          warning={modalContent.warning}
          rules={modalContent.rule || modalContent.rules} // массив или строка
          benefit={modalContent.benefit}
        />
      )}
    </div>
  );
}
