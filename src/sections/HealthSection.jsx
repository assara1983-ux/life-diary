// src/sections/HealthSection.jsx
import React, { useState, useMemo } from "react";
import { useApp } from "../store/AppContext";
import { calculateHealthProfile, getTimeRecommendation } from "../utils/healthCalculator";
import { AnatomyViewer } from "../components/AnatomyViewer";
import { ModalDetail } from "../components/ModalDetail";
import { ANATOMY_DATA } from "../data/anatomyKnowledge";

const BREATHING_TECHNIQUES = {
  sam_chon_do: { title: "Сам Чон До (Базовое)", desc: "Вдох носом 3с → Выдох ртом 6с → Пауза 2с. 3–9 циклов.", rules: "Ментально: вдох «в-д-о-о-х», выдох «в-ы-д-о-о-х». Завершение: фиксация 1 мин.", benefit: "Гармонизация, подготовка, снятие зажимов." },
  norbekov: { title: "Настрой Норбекова + ОМЗ", desc: "4 этапа: Образ → Палец → Рука → Сплетеие → 13 центров.", benefit: "Омоложение, ресурс.", warning: "⛔ ЖЁСТКИЙ ЗАПРЕТ: НИКОГДА не направлять поток в ❤️ Сердце и 🧠 Мозг!" },
  physical_form: { title: "Дыхание для коррекции фигуры", desc: "Поза 'Всадник'. Вдох носом, активный выдох 'ба-ба-х', втягивание живота на 10 счетов.", benefit: "Сжигание жира, тонус мышц.", rules: "Только утром натощак. 5-20 мин." },
  mood_shift: { title: "Смена настроения", desc: "Сам Чон До → Образ человека в нужном настроении → Дыхание через образ.", benefit: "Быстрая эмоциональная перестройка." },
  wilunas: { title: "Рыдающее дыхание (Сброс)", desc: "Вдох ртом → выдох со звуком 'с-с-с' → пауза. 3 мин.", benefit: "Мгновенное снятие острого стресса (>7), снижение давления.", warning: "Не применять при острых сердечных патологиях!" }
};

const MERIDIAN_TO_ID = {
  "Печень": "liver", "Лёгкие": "lungs", "Толстый кишечник": "intestines",
  "Желудок": "stomach", "Селезенка": "spleen", "Сердце": "heart",
  "Тонкий кишечник": "intestines", "Мочевой пузырь": "bladder",
  "Почки": "kidneys", "Перикард": "heart", "Сань Цзяо": "spleen", "Желчный пузырь": "liver"
};

export function HealthSection() {
  const { profile } = useApp();
  const [activeTab, setActiveTab] = useState("anatomy");
  const [modalContent, setModalContent] = useState(null);

  const healthData = useMemo(() => calculateHealthProfile(profile), [profile]);
  const timeData = useMemo(() => getTimeRecommendation(), []);
  const currentActiveOrganId = MERIDIAN_TO_ID[timeData.currentMeridian.name] || null;

  const handleAnatomyClick = (data) => {
    const source = data.type === 'organ' ? ANATOMY_DATA[data.id] : ANATOMY_DATA[data.id];
    if (source) setModalContent(source);
  };

  return (
    <div className="health-wrapper">
      <style>{`
        .health-wrapper { padding: 20px; background: var(--bg-paper); min-height: 100%; font-family: var(--font-main); color: var(--text-main); }
        .h-tabs { display: flex; gap: 10px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 4px; }
        .h-tab { padding: 8px 16px; background: transparent; border: 1px solid var(--blue); color: var(--blue); border-radius: 4px; cursor: pointer; font-family: var(--font-mono); text-transform: uppercase; font-size: 12px; transition: 0.2s; flex-shrink: 0; }
        .h-tab.active { background: var(--blue); color: #fff; }
        .h-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; }
        .h-card { background: #fff; border: 1px solid var(--blue); padding: 15px; position: relative; cursor: pointer; box-shadow: 0 4px 0 rgba(0,112,192,0.1); transition: transform 0.1s; }
        .h-card:hover { transform: translateY(-2px); box-shadow: 0 6px 0 rgba(0,112,192,0.15); }
        .h-card h3 { font-family: var(--font-head); color: var(--blue); margin: 0 0 8px 0; font-size: 14px; }
        .h-card p { margin: 0; font-size: 13px; line-height: 1.4; color: #444; }
        .h-badge { display: inline-block; font-size: 10px; background: var(--blue); color: #fff; padding: 2px 6px; border-radius: 2px; margin-top: 8px; font-family: var(--font-mono); }        .h-badge.warning { background: #d32f2f; }
        .section-title { font-family: var(--font-head); color: var(--text-main); border-bottom: 2px solid var(--blue); padding-bottom: 5px; margin-bottom: 15px; font-size: 18px; }
        .active-organ-info { background: rgba(0,112,192,0.05); padding: 10px; border-left: 3px solid var(--blue); margin-bottom: 15px; font-family: var(--font-mono); font-size: 12px; }
      `}</style>

      <div className="h-tabs">
        <button className={`h-tab ${activeTab === 'anatomy' ? 'active' : ''}`} onClick={() => setActiveTab('anatomy')}>Анатомия</button>
        <button className={`h-tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Досье</button>
        <button className={`h-tab ${activeTab === 'breathing' ? 'active' : ''}`} onClick={() => setActiveTab('breathing')}>Дыхание</button>
        <button className={`h-tab ${activeTab === 'mental' ? 'active' : ''}`} onClick={() => setActiveTab('mental')}>Сфера</button>
      </div>

      <div className="h-content">
        {activeTab === 'anatomy' && (
          <div>
            <h2 className="section-title">Интерактивная Анатомия</h2>
            <div className="active-organ-info">
              <strong>СЕЙЧАС АКТИВЕН:</strong> {timeData.currentMeridian.name} ({timeData.currentMeridian.h})
              <br/><span style={{opacity: 0.7}}>Подсвечен на схеме красным. Клик для деталей.</span>
            </div>
            <AnatomyViewer activeOrganId={currentActiveOrganId} onSelect={handleAnatomyClick} />
          </div>
        )}

        {activeTab === 'profile' && (
          <div>
            <h2 className="section-title">Био-Энергетический Профиль</h2>
            <div className="h-grid">
              <div className="h-card" onClick={() => setModalContent({ title: "ТКМ Конституция", desc: `Стихия: ${healthData.element}. Баланс: ${healthData.yinyang}.`, rules: "Рекомендации по питанию зависят от стихии." })}>
                <h3>🧬 ТКМ Конституция</h3><p>Стихия: <strong>{healthData.element}</strong></p><span className="h-badge">Клик для деталей</span>
              </div>
              <div className="h-card" onClick={() => setModalContent({ title: "Стресс-профиль", desc: `Уровень: ${healthData.stress}/10.`, rules: healthData.stress > 7 ? "Протокол: Рыдающее дыхание → Светотерапия → Аэробика." : "Поддержание ритма." })}>
                <h3>⚡ Стресс</h3><p>Уровень: <strong>{healthData.stress}/10</strong></p>{healthData.stress > 7 && <span className="h-badge warning">Требуется сброс</span>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'breathing' && (
          <div>
            <h2 className="section-title">Дыхательные протоколы</h2>
            <div className="h-grid">
              <div className="h-card" onClick={() => setModalContent(BREATHING_TECHNIQUES.sam_chon_do)}><h3>Базовое: Сам Чон До</h3><p>3-6-2. Подготовка.</p><span className="h-badge">Универсально</span></div>
              <div className="h-card" onClick={() => setModalContent(BREATHING_TECHNIQUES.physical_form)}><h3>Коррекция фигуры</h3><p>Утро, натощак. 'Ба-ха'.</p><span className="h-badge">Метаболизм</span></div>
              <div className="h-card" onClick={() => setModalContent(BREATHING_TECHNIQUES.norbekov)}><h3>ОМЗ (Норбеков)</h3><p>Омоложение, 13 центров.</p><span className="h-badge">Вечер</span></div>
              <div className="h-card" onClick={() => setModalContent(BREATHING_TECHNIQUES.mood_shift)}><h3>Смена настроения</h3><p>Дыхание через образ-эталон.</p><span className="h-badge">Эмоции</span></div>
              {healthData.stress > 7 && (
                <div className="h-card" style={{borderColor:'#d32f2f'}} onClick={() => setModalContent(BREATHING_TECHNIQUES.wilunas)}>
                  <h3 style={{color:'#d32f2f'}}>Экстренный сброс</h3><p>Рыдающее дыхание.</p><span className="h-badge warning">Стресс {'>'} 7</span>
                </div>              )}
            </div>
          </div>
        )}

        {activeTab === 'mental' && (
          <div>
            <h2 className="section-title">Ментальное поле</h2>
            <div className="h-card"><h3>Паттерн коммуникации: {healthData.uxinPattern.toUpperCase()}</h3><p style={{fontSize:'12px',color:'#666'}}>У-Син анализ.</p></div>
          </div>
        )}
      </div>

      {modalContent && <ModalDetail isOpen={!!modalContent} onClose={() => setModalContent(null)} title={modalContent.title} description={modalContent.desc} warning={modalContent.warning} rules={modalContent.rules} benefit={modalContent.benefit} />}
    </div>
  );
}
