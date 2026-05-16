// src/sections/HealthMentalSection.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights, getCurrentMeridian, getMoonDay, getCurrentSeason } from "../utils/knowledgeEngine";
import { getBreathingProtocol, DAOIST_SOUNDS, ANCILLARY_EXERCISES, getUxSinCommFilter } from "../data/profileKnowledge";
import { MeridianClock } from "../components/MeridianClock";
import { MeridianModal } from "../components/MeridianModal";

const TABS = [
  { id: "profile", label: "⚡ Профиль & Энергия" },
  { id: "timing", label: "🕰️ Ритмы & Запреты" },
  { id: "meridians", label: "🫁 Часы Меридианов" },
  { id: "breathing", label: "🌬️ Дыхание & Пранаяма" },
  { id: "mental", label: "🧠 Ментальное & У-Син" },
  { id: "practices", label: "👐 Практики & Точки" }
];

export function HealthMentalSection() {
  const { profile } = useApp();
  const [activeTab, setActiveTab] = useState("profile");
  const [modal, setModal] = useState(null);

  const insights = useMemo(() => getProfileInsights(profile) || {}, [profile]);
  const moonDay = useMemo(() => getMoonDay(), []);
  const currentMeridian = useMemo(() => getCurrentMeridian(), []);
  const season = useMemo(() => getCurrentSeason(), []);
  const breathingProto = useMemo(() => getBreathingProtocol(season, profile?.stressLevel), [season, profile?.stressLevel]);
  const commFilter = useMemo(() => getUxSinCommFilter(profile?.coreValue, profile?.stressLevel), [profile?.coreValue, profile?.stressLevel]);

  const openModal = useCallback((data) => setModal(data), []);
  const closeModal = useCallback(() => setModal(null), []);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [closeModal]);

  return (
    <div className="page hm-section">
      <style>{`
        .hm-section { position: relative; z-index: 1; padding-bottom: 24px; }
        .hm-tabs { display: flex; gap: 6px; overflow-x: auto; padding: 0 4px 12px; margin-bottom: 16px; scrollbar-width: none; }
        .hm-tabs::-webkit-scrollbar { display: none; }
        .hm-tab { flex-shrink: 0; padding: 10px 14px; border-radius: 20px; background: rgba(0,112,192,0.06); border: 1.5px solid transparent; cursor: pointer; font-family: var(--font-head); font-size: 12px; color: var(--text2); transition: all 0.2s; white-space: nowrap; }
        .hm-tab:hover { background: rgba(0,112,192,0.12); }
        .hm-tab.on { background: var(--blue); color: #fff; border-color: var(--gold); box-shadow: 0 2px 8px rgba(0,112,192,0.25); }
        .hm-card { background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 14px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .hm-card h3 { margin: 0 0 8px; font-size: 14px; color: var(--text1); font-family: var(--font-head); }
        .hm-card p { margin: 0; font-size: 13px; color: var(--text2); line-height: 1.5; }        .hm-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
        .hm-badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-family: var(--font-mono); background: rgba(0,112,192,0.08); color: var(--blue); }
        .hm-badge.warn { background: rgba(232,85,109,0.08); color: var(--error); }
        .hm-badge.success { background: rgba(45,106,79,0.08); color: var(--success); }
        .hm-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
        .hm-step-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
        .hm-step { display: flex; gap: 8px; align-items: flex-start; }
        .hm-step-num { flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; background: var(--blue); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; }
        .hm-step-text { font-size: 12px; color: var(--text2); line-height: 1.4; }
        @keyframes hm-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .hm-animate { animation: hm-fade 0.3s ease-out; }
      `}</style>

      <div className="hm-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`hm-tab ${activeTab === t.id ? "on" : ""}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="hm-animate">
        {activeTab === "profile" && (
          <div className="hm-grid">
            <div className="hm-card">
              <h3>🧬 Генетический профиль</h3>
              <p><strong>Знак:</strong> {insights?.zodiac || "—"} · <strong>Восточный:</strong> {insights?.eastern || "—"}</p>
              <p><strong>Возраст:</strong> {insights?.age ?? "—"}</p>
              <div className="hm-badges"><span className="hm-badge">{insights?.season?.split(' ')[0] || "—"}</span></div>
            </div>
            <div className="hm-card">
              <h3>📊 Энергия & Стресс</h3>
              <p>Стресс: {profile?.stressLevel ?? 5}/10</p>
              <p style={{ marginTop: 6, fontStyle: 'italic', fontSize: 12, color: 'var(--text3)' }}>
                {(profile?.stressLevel > 7) ? "Рекомендован срочный сброс: Рыдающее дыхание → Светотерапия → Аэробика." : "Ресурс стабилен. Поддерживайте ритм Сам Чон До."}
              </p>
            </div>
          </div>
        )}

        {activeTab === "timing" && (
          <>
            <div className="hm-card">
              <h3>🌙 Лунный день: {moonDay}</h3>
              <p>Локальные ограничения по Давыдову активны. Проверьте календарь перед процедурами.</p>
            </div>
            <div className="hm-card">
              <h3>🌍 Сезон: {season}</h3>
              <p>
                {season.includes("Весна") ? "Активация Дерева. Печень/Желчный. Избегайте гнева и алкоголя." :                 season.includes("Лето") ? "Активация Огня. Сердце/Тонкий кишечник. Больше охлаждения и спокойствия." :
                 season.includes("Осень") ? "Активация Металла. Лёгкие/Толстый кишечник. Увлажнение и дыхание." :
                 "Активация Воды. Почки/Мочевой пузырь. Тепло, покой, согревающий чай."}
              </p>
            </div>
          </>
        )}

        {activeTab === "meridians" && (
          <div className="hm-card" style={{ textAlign: 'center' }}>
            <h3>🫁 Интерактивная карта 12 меридианов</h3>
            <p style={{ marginBottom: 16, fontSize: 12 }}>Клик по органу или часу → детальный разбор, рекомендации по дыханию и профилю</p>
            <MeridianClock current={currentMeridian} profile={insights} onOpen={openModal} />
          </div>
        )}

        {activeTab === "breathing" && (
          <div className="hm-grid">
            <div className="hm-card">
              <h3>🌬️ Базовое: Сам Чон До</h3>
              <p>Вдох носом 3с → Выдох ртом 6с → Пауза 2с. 3–9 циклов. Мысленно: «в-д-о-о-х» → «в-ы-д-о-о-х».</p>
              <div className="hm-badges"><span className="hm-badge success">Универсально</span></div>
            </div>
            <div className="hm-card">
              <h3>🔊 6 Целительных звуков (Даосская система)</h3>
              <p>Строгий порядок: Лёгкие → Почки → Печень → Сердце → Селезёнка → 3 Обогревателя.</p>
              <div className="hm-step-list">
                {DAOIST_SOUNDS.slice(0, 3).map(s => (
                  <div key={s.id} className="hm-step">
                    <div className="hm-step-num">{s.id}</div>
                    <div className="hm-step-text"><strong>{s.organ}:</strong> {s.sound} · {s.emotion}</div>
                  </div>
                ))}
              </div>
              <div className="hm-badges" style={{ marginTop: 8 }}><span className="hm-badge">Вибрационная терапия</span></div>
            </div>
            <div className="hm-card" onClick={() => openModal({ type: 'practice', id: 'norbeikov' })} style={{ cursor: 'pointer' }}>
              <h3>✨ Настрой Норбекова + ОМЗ</h3>
              <p>Палец → Рука → Солнечное сплетение → 13 центров. Подключение Образ Молодости и Здоровья.</p>
              <div className="hm-badges"><span className="hm-badge warn">⚠️ ЗАПРЕТ: Не направлять в ❤️ и 🧠</span></div>
            </div>
            {breathingProto?.urgent && (
              <div className="hm-card" style={{ borderLeft: '3px solid var(--error)' }}>
                <h3>🚨 Экстренный сброс (стресс {'>'} 7)</h3>
                <p>{breathingProto.urgent.title}: {breathingProto.urgent.desc}</p>
                <div className="hm-badges"><span className="hm-badge warn">При острой тревоге/гневе</span></div>
              </div>
            )}
          </div>
        )}
        {activeTab === "mental" && (
          <>
            <div className="hm-card">
              <h3>🔄 Энергообмен (У-Син)</h3>
              <p>Текущий паттерн: <strong>{commFilter?.name || "Равноценный"}</strong></p>
              <p style={{ marginTop: 6, fontSize: 12, color: 'var(--text3)' }}>{commFilter?.desc}</p>
              <div className="hm-badges" style={{ marginTop: 8 }}><span className="hm-badge">Защита границ: 3 цикла дыхания → фиксация взгляда на носу собеседника</span></div>
            </div>
            <div className="hm-card">
              <h3>🧠 Нейропротокол</h3>
              <p>При стрессе {'>'} 7: Рыдающее дыхание → светотерапия утром 30 мин → аэробика для PGC-1α.</p>
              <div className="hm-badges"><span className="hm-badge success">Научно подтверждено (Яо Найлинь)</span></div>
            </div>
          </>
        )}

        {activeTab === "practices" && (
          <div className="hm-card">
            <h3>👐 Вспомогательные упражнения (ТКМ/Хван)</h3>
            <div className="hm-step-list">
              {ANCILLARY_EXERCISES.eyes && (
                <div className="hm-step">
                  <div className="hm-step-num">👁️</div>
                  <div className="hm-step-text"><strong>Глаза (Печень):</strong> {ANCILLARY_EXERCISES.eyes.steps}</div>
                </div>
              )}
              {ANCILLARY_EXERCISES.tongue && (
                <div className="hm-step">
                  <div className="hm-step-num">👅</div>
                  <div className="hm-step-text"><strong>Язык (Сердце):</strong> {ANCILLARY_EXERCISES.tongue.steps}</div>
                </div>
              )}
              {ANCILLARY_EXERCISES.gums && (
                <div className="hm-step">
                  <div className="hm-step-num">🦷</div>
                  <div className="hm-step-text"><strong>Дёсны (Селезёнка/ПЖЖ):</strong> {ANCILLARY_EXERCISES.gums.steps}</div>
                </div>
              )}
            </div>
            <div className="hm-badges" style={{ marginTop: 12 }}>
              <span className="hm-badge">ТКМ рефлексология</span>
              <span className="hm-badge">Без противопоказаний</span>
              <span className="hm-badge">Усилители 6 звуков</span>
            </div>
          </div>
        )}
      </div>

      {modal && <MeridianModal data={modal} onClose={closeModal} />}    </div>
  );
}
