// src/sections/HealthMentalSection.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights, getCurrentMeridian, getMoonDay, getCurrentSeason } from "../utils/knowledgeEngine";
import { getHealthWarning, getChronotypePeaks, getBreathingPractice } from "../data/profileKnowledge";
import { MeridianClock } from "../components/MeridianClock";
import { MeridianModal } from "../components/MeridianModal";
import { useHealthProfile } from "../hooks/useHealthProfile";

const TABS = [
  { id: "profile", label: "⚡ Профиль & Энергия" },
  { id: "timing", label: "🕰️ Ритмы & Запреты" },
  { id: "meridians", label: "🫁 Часы Меридианов" },
  { id: "breathing", label: "🌬️ Дыхание & Пранаяма" },
  { id: "mental", label: "🧠 Ментальное & У-Син" },
  { id: "practices", label: "👐 Практики & Точки" }
];

export function HealthMentalSection() {
  const { profile, notify } = useApp();
  const [activeTab, setActiveTab] = useState("profile");
  const [modal, setModal] = useState(null);

  const healthData = useHealthProfile(profile);
  const insights = getProfileInsights(profile) || {};
  const moonDay = getMoonDay();
  const meridian = getCurrentMeridian();
  const season = getCurrentSeason();
  const healthWarn = getHealthWarning(insights.zodiac);

  const openModal = useCallback((data) => setModal(data), []);
  const closeModal = useCallback(() => setModal(null), []);

  // Управление закрытием по Esc
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [closeModal]);

  return (
    <div className="page hm-section">
      <style>{`
        .hm-section { position: relative; z-index: 1; padding-bottom: 20px; }
        .hm-tabs { display: flex; gap: 6px; overflow-x: auto; padding: 0 4px 12px; margin-bottom: 16px; scrollbar-width: none; }
        .hm-tabs::-webkit-scrollbar { display: none; }
        .hm-tab { flex-shrink: 0; padding: 10px 14px; border-radius: 20px; background: rgba(0,112,192,0.06); border: 1.5px solid transparent; cursor: pointer; font-family: var(--font-head); font-size: 12px; color: var(--text2); transition: all 0.2s; white-space: nowrap; }
        .hm-tab:hover { background: rgba(0,112,192,0.12); }
        .hm-tab.on { background: var(--blue); color: #fff; border-color: var(--gold); box-shadow: 0 2px 8px rgba(0,112,192,0.25); }
        .hm-card { background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 14px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }        .hm-card h3 { margin: 0 0 8px; font-size: 14px; color: var(--text1); font-family: var(--font-head); }
        .hm-card p { margin: 0; font-size: 13px; color: var(--text2); line-height: 1.5; }
        .hm-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
        .hm-badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-family: var(--font-mono); background: rgba(0,112,192,0.08); color: var(--blue); }
        .hm-badge.warn { background: rgba(232,85,109,0.08); color: var(--error); }
        .hm-badge.success { background: rgba(45,106,79,0.08); color: var(--success); }
        .hm-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
        @keyframes hm-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .hm-animate { animation: hm-fade 0.3s ease-out; }
      `}</style>

      {/* Навигация по табами */}
      <div className="hm-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`hm-tab ${activeTab === t.id ? "on" : ""}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Контент вкладок */}
      <div className="hm-animate">
        {activeTab === "profile" && (
          <div className="hm-grid">
            <div className="hm-card">
              <h3> Генетический профиль</h3>
              <p><strong>Знак:</strong> {insights.zodiac} · <strong>Восточный:</strong> {insights.eastern}</p>
              <p><strong>Хронотип:</strong> {healthData.chrono.emoji} {healthData.chrono.type}</p>
              <div className="hm-badges">
                <span className="hm-badge">{insights.zodiacElement}</span>
                <span className="hm-badge">{insights.easternElement}</span>
                <span className="hm-badge">{healthData.lifeCycle}</span>
              </div>
            </div>
            <div className="hm-card">
              <h3>⚠️ Уязвимости месяца</h3>
              <p>{healthWarn.organ}</p>
              <div className="hm-badges"><span className="hm-badge warn">Вост. мес: {healthWarn.easternMonth}</span></div>
            </div>
            <div className="hm-card">
              <h3>📊 Энергия & Стресс</h3>
              <p>Уровень: {healthData.energyLevel}/5 · Стресс: {profile?.stressLevel ?? 5}/10</p>
              <p style={{marginTop:6, fontStyle:'italic', fontSize:12, color:'var(--text3)'}}>
                {healthData.energyLevel > 3 ? "Ресурс стабилен. Поддерживайте ритм." : "Рекомендован восстановительный блок + дыхание Сам Чон До."}
              </p>
            </div>
          </div>
        )}

        {activeTab === "timing" && (          <>
            <div className="hm-card">
              <h3>🌙 Лунный день: {moonDay}</h3>
              <p>Запрет локального воздействия на: <strong style={{color:'var(--error)'}}>{insights.moonRestriction?.forbidden || "Нет данных"}</strong></p>
            </div>
            <div className="hm-card">
              <h3>🌍 Сезон: {season}</h3>
              <p>{season.includes("Весна") ? "Активация Дерева. Печень/Желчный. Избегайте гнева и алкоголя." : 
                 season.includes("Лето") ? "Активация Огня. Сердце/Тонкий кишечник. Больше охлаждения и спокойствия." :
                 season.includes("Осень") ? "Активация Металла. Лёгкие/Толстый кишечник. Увлажнение и дыхание." :
                 "Активация Воды. Почки/Мочевой пузырь. Тепло, покой, согревающий чай."}</p>
            </div>
            <div className="hm-card">
              <h3>🔄 Фаза Цзяцзы</h3>
              <p>Текущая стадия жизненного цикла: <strong>{healthData.jiaziPhase}</strong></p>
              <p style={{marginTop:4, fontSize:12, color:'var(--text3)'}}>Рекомендовано: {healthData.jiaziAdvice}</p>
            </div>
          </>
        )}

        {activeTab === "meridians" && (
          <div className="hm-card" style={{textAlign:'center'}}>
            <h3>🫁 Интерактивная карта 12 меридианов</h3>
            <p style={{marginBottom:16, fontSize:12}}>Клик по органу или часу → детальный разбор, рекомендации по дыханию и профилю Анны</p>
            <MeridianClock current={meridian} profile={healthData} onOpen={openModal} />
          </div>
        )}

        {activeTab === "breathing" && (
          <div className="hm-grid">
            <div className="hm-card">
              <h3>🌬️ Базовое: Сам Чон До</h3>
              <p>Вдох носом 3с → Выдох ртом 6с. База для всех техник. 3–9 циклов.</p>
              <div className="hm-badges"><span className="hm-badge success">Универсально</span></div>
            </div>
            <div className="hm-card">
              <h3>🔊 6 Целительных звуков</h3>
              <p>С-С-С (лёгкие) → Ч-У-Э-Й (почки) → Ш-Ш-Ш (печень) → Х-А-У (сердце) → Х-У (селезёнка) → Х-Э (3 обогревателя)</p>
              <div className="hm-badges"><span className="hm-badge">Вибрационная терапия</span></div>
            </div>
            <div className="hm-card" onClick={() => openModal({type:'practice', id:'norbeikov'})} style={{cursor:'pointer'}}>
              <h3>✨ Настрой Норбекова + ОМЗ</h3>
              <p>Визуализация Образ Молодости и Здоровья. Включение внутренних резервов.</p>
              <div className="hm-badges"><span className="hm-badge warn">⚠️ Не направлять в ❤️/🧠</span></div>
            </div>
          </div>
        )}

        {activeTab === "mental" && (
          <>            <div className="hm-card">
              <h3>🔄 Энергообмен (У-Син)</h3>
              <p>Текущий паттерн: <strong>{healthData.commPattern}</strong></p>
              <p style={{marginTop:6, fontSize:12}}>Защита границ: вход в нейтральную позицию через 3 цикла дыхания + фиксация взгляда на носу собеседника.</p>
            </div>
            <div className="hm-card">
              <h3>🧠 Нейроинструменты</h3>
              <p>При стрессе >7: Рыдающее дыхание (Вилунас) → светотерапия утром 30 мин → аэробика для PGC-1α.</p>
              <div className="hm-badges"><span className="hm-badge success">Научно подтверждено</span></div>
            </div>
          </>
        )}

        {activeTab === "practices" && (
          <div className="hm-card">
            <h3>👐 Вспомогательные упражнения</h3>
            <p>Глаза (печень): фокус на палец 15–20 см, не моргать до слёз → растирание ладонями.</p>
            <p style={{marginTop:8}}>Язык (сердце): круговые движения 9↔6 раз → сглатывание слюны с визуализацией пути.</p>
            <p style={{marginTop:8}}>Дёсны (селезёнка): щёлканье зубами 18×2 + постукивание пальцами вокруг губ.</p>
            <div className="hm-badges" style={{marginTop:12}}>
              <span className="hm-badge">ТКМ рефлексология</span>
              <span className="hm-badge">Без противопоказаний</span>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно */}
      {modal && <MeridianModal data={modal} onClose={closeModal} />}
    </div>
  );
}
