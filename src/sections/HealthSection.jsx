// src/sections/HealthSection.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights, getCurrentMeridian, getMoonDay, getCurrentSeason } from "../utils/knowledgeEngine";
import { getBreathingProtocol, DAOIST_SOUNDS, ANCILLARY_EXERCISES, getUxSinCommFilter } from "../data/profileKnowledge";
import { MeridianModal } from "../components/MeridianModal";

const TABS = [
  { id: "profile", label: "⚡ Профиль & Персонализация" },
  { id: "cycles", label: "🕰️ Циклы & Запреты" },
  { id: "meridians", label: "🫁 Часы Меридианов (У-Син)" },
  { id: "breathing", label: "🌬️ Дыхание & Пранаяма" },
  { id: "mental", label: "🧠 Ментальное & У-Син" },
  { id: "practices", label: "👐 Практики & Коррекция" }
];

const MERIDIANS_DATA = [
  { id: 1, time: "03:00-05:00", organ: "Лёгкие", element: "Металл", peak: "03:00", desc: "Глубокое дыхание, обновление. Запрет: сильные физические нагрузки." },
  { id: 2, time: "05:00-07:00", organ: "Толстый кишечник", element: "Металл", peak: "06:00", desc: "Выведение токсинов. Рекомендация: тёплая вода, лёгкая растяжка." },
  { id: 3, time: "07:00-09:00", organ: "Желудок", element: "Земля", peak: "08:00", desc: "Пик пищеварения. Рекомендация: полноценный завтрак, дыхание для метаболизма." },
  { id: 4, time: "09:00-11:00", organ: "Селезёнка", element: "Земля", peak: "10:00", desc: "Обработка информации. Запрет: эмоциональные перегрузки." },
  { id: 5, time: "11:00-13:00", organ: "Сердце", element: "Огонь", peak: "12:00", desc: "Циркуляция, радость. Запрет: Норбеков-дыхание в сердце. Рекомендация: покой." },
  { id: 6, time: "13:00-15:00", organ: "Тонкий кишечник", element: "Огонь", peak: "14:00", desc: "Разделение чистого/нечистого. Рекомендация: лёгкий перекус, дыхание для разума." },
  { id: 7, time: "15:00-17:00", organ: "Мочевой пузырь", element: "Вода", peak: "16:00", desc: "Фиксация памяти, детокс. Рекомендация: работа с данными, звук ҲҲҲ." },
  { id: 8, time: "17:00-19:00", organ: "Почки", element: "Вода", peak: "18:00", desc: "Ресурс, страхи. Запрет: переработка. Рекомендация: тепло, звук УҲҲ." },
  { id: 9, time: "19:00-21:00", organ: "3 Обогревателя", element: "Огонь", peak: "20:00", desc: "Распределение тепла. Рекомендация: подготовка ко сну, звук ШҲҲ." },
  { id: 10, time: "21:00-23:00", organ: "Перикард", element: "Огонь", peak: "22:00", desc: "Защита сердца, романтика. Рекомендация: эмоциональная разгрузка." },
  { id: 11, time: "23:00-01:00", organ: "Тройной обогреватель", element: "Огонь", peak: "00:00", desc: "Сброс ритмов. Запрет: бодрствование, экраны." },
  { id: 12, time: "01:00-03:00", organ: "Печень", element: "Дерево", peak: "02:00", desc: "Очищение крови, сны. Запрет: алкоголь, гнев. Рекомендация: глубокый сон." }
];

function getModalPayload(type, id, profile, insights) {
  if (type === "meridian") {
    const m = MERIDIANS_DATA.find(i => i.id === id) || MERIDIANS_DATA[0];
    return {
      title: `${m.organ} (${m.element})`,
      peakTime: `Пик: ${m.time} | Энергия: ${m.peak}`,
      description: m.desc,
      recommendations: `Хронотип: ${insights?.chronotype || "—"} | Знак: ${insights?.zodiac || "—"}. ${profile?.stressLevel > 7 ? "При стрессе: дыхание Сам Чон До 5 циклов перед сном." : "Поддерживайте естественный ритм."}`,
      contraindications: m.organ === "Сердце" ? "⚠️ ЗАПРЕТ: Не направлять дыхательные техники Норбекова в сердце и головной мозг." : "Избегать перегрузок в часы спада энергии.",
      links: { coreValue: profile?.coreValue, phase: insights?.jiaziPhase }
    };
  }
  if (type === "breathing") {
    return {
      title: "Протокол дыхания",
      description: "Строгое следование рисунку. Дыхание — витальный центр организма.",
      recommendations: id === "samchondo" ? "3с вдох носом → 6с выдох ротом → 2с пауза. 3-9 циклов." : "Криком сбрасываем зажимы. Визуализация: энергия ракеты.",
      contraindications: "⚠️ Норбеков: запрещено направлять поток в ❤️ Сердце и 🧠 Головной мозг. Только тело/вокруг.",
      links: { stress: profile?.stressLevel, season: getCurrentSeason() }    };
  }
  return { title: "Информация", description: "Данные синхронизированы с профилем.", recommendations: "", contraindications: "", links: {} };
}

export function HealthSection() {
  const { profile } = useApp();
  const [activeTab, setActiveTab] = useState("profile");
  const [modal, setModal] = useState(null);

  const insights = useMemo(() => getProfileInsights(profile) || {}, [profile]);
  const moonDay = useMemo(() => getMoonDay(), []);
  const currentMeridian = useMemo(() => getCurrentMeridian(), []);
  const season = useMemo(() => getCurrentSeason(), []);
  const breathingProto = useMemo(() => getBreathingProtocol(season, profile?.stressLevel), [season, profile?.stressLevel]);
  const commFilter = useMemo(() => getUxSinCommFilter(profile?.coreValue, profile?.stressLevel), [profile?.coreValue, profile?.stressLevel]);

  const openModal = useCallback((type, id) => {
    setModal(getModalPayload(type, id, profile, insights));
  }, [profile, insights]);

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
        .hm-card p { margin: 0; font-size: 13px; color: var(--text2); line-height: 1.5; }
        .hm-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
        .hm-badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-family: var(--font-mono); background: rgba(0,112,192,0.08); color: var(--blue); }
        .hm-badge.warn { background: rgba(232,85,109,0.08); color: var(--error); }
        .hm-badge.success { background: rgba(45,106,79,0.08); color: var(--success); }
        .hm-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
        .hm-step-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
        .hm-step { display: flex; gap: 8px; align-items: flex-start; }
        .hm-step-num { flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; background: var(--blue); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; }
        .hm-step-text { font-size: 12px; color: var(--text2); line-height: 1.4; }        .hm-clock-svg { width: 100%; height: auto; cursor: pointer; }
        .hm-clock-node { fill: var(--bg); stroke: var(--blue); stroke-width: 1.5; transition: all 0.2s; }
        .hm-clock-node.active { fill: var(--blue); stroke: var(--gold); stroke-width: 2; }
        .hm-clock-node:hover { fill: rgba(0,112,192,0.15); }
        .hm-silhouette { fill: none; stroke: var(--blue); stroke-width: 1.2; stroke-dasharray: 4 2; }
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
              <h3>👤 Персонализация: Анна Бортник</h3>
              <p><strong>DOB:</strong> {profile?.dob || "—"} · <strong>Хронотип:</strong> {insights?.chronotype || "—"}</p>
              <p><strong>Знак (З/В):</strong> {insights?.zodiac || "—"} / {insights?.eastern || "—"}</p>
              <p><strong>Фаза Цзяцзы:</strong> {insights?.jiaziPhase || "—"} · <strong>Лунные узлы:</strong> {insights?.lunarNodes || "—"}</p>
            </div>
            <div className="hm-card">
              <h3>📊 Энергия & Стресс</h3>
              <p>Стресс: {profile?.stressLevel ?? 5}/10</p>
              <p style={{ marginTop: 6, fontStyle: 'italic', fontSize: 12, color: 'var(--text3)' }}>
                {(profile?.stressLevel > 7) ? "Рекомендован срочный сброс: Рыдающее дыхание → Светотерапия → Аэробика." : "Ресурс стабилен. Поддерживайте ритм Сам Чон До."}
              </p>
              <div className="hm-badges"><span className="hm-badge">{insights?.season?.split(' ')[0] || "—"}</span></div>
            </div>
          </div>
        )}

        {activeTab === "cycles" && (
          <>
            <div className="hm-card">
              <h3>🌙 Лунный день: {moonDay}</h3>
              <p>Локальные ограничения по Давыдову активны. Проверьте календарь перед процедурами.</p>
            </div>
            <div className="hm-card">
              <h3>🌍 Сезон: {season}</h3>
              <p>
                {season.includes("Весна") ? "Активация Дерева. Печень/Желчный. Избегайте гнева и алкоголя." :
                 season.includes("Лето") ? "Активация Огня. Сердце/Тонкий кишечник. Охлаждение и покой." :
                 season.includes("Осень") ? "Активация Металла. Лёгкие/Толстый кишечник. Увлажнение и дыхание." :
                 "Активация Воды. Почки/Мочевой пузырь. Тепло, покой, согревающий чай."}              </p>
            </div>
          </>
        )}

        {activeTab === "meridians" && (
          <div className="hm-card" style={{ textAlign: 'center' }}>
            <h3>🫁 Часы Меридианов (У-Син)</h3>
            <p style={{ marginBottom: 16, fontSize: 12 }}>Клик по узлу → пик энергии, рекомендации, противопоказания, привязка к профилю</p>
            <svg viewBox="0 0 400 400" className="hm-clock-svg">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,112,192,0.1)" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="400" height="400" fill="url(#grid)" />
              {/* Blueprint Silhouette */}
              <path className="hm-silhouette" d="M200,60 C220,60 230,80 230,100 C230,115 220,125 210,130 L215,160 L280,180 L270,210 L210,190 L215,250 L230,320 L200,340 L170,320 L185,250 L190,190 L130,210 L120,180 L185,160 L190,130 C180,125 170,115 170,100 C170,80 180,60 200,60 Z" />
              {/* 12 Hour Nodes */}
              {MERIDIANS_DATA.map((m, i) => {
                const angle = (i * 30 - 90) * (Math.PI / 180);
                const cx = 200 + 150 * Math.cos(angle);
                const cy = 200 + 150 * Math.sin(angle);
                const isActive = currentMeridian?.id === m.id;
                return (
                  <g key={m.id} onClick={() => openModal("meridian", m.id)}>
                    <circle cx={cx} cy={cy} r="12" className={`hm-clock-node ${isActive ? 'active' : ''}`} />
                    <text x={cx} y={cy+4} textAnchor="middle" fontSize="9" fill={isActive ? "#fff" : "var(--blue)"} fontFamily="var(--font-mono)">{m.time.split('-')[0]}</text>
                    <line x1="200" y1="200" x2={cx} y2={cy} stroke="rgba(0,112,192,0.2)" strokeWidth="1" />
                  </g>
                );
              })}
              <text x="200" y="385" textAnchor="middle" fontSize="11" fill="var(--text3)" fontFamily="var(--font-mono)">BLUEPRINT CYCLE SYNC</text>
            </svg>
          </div>
        )}

        {activeTab === "breathing" && (
          <div className="hm-grid">
            <div className="hm-card" onClick={() => openModal("breathing", "samchondo")} style={{ cursor: 'pointer' }}>
              <h3>🌬️ Базовое: Сам Чон До</h3>
              <p>Вдох носом 3с → Выдох ртом 6с → Пауза 2с. 3–9 циклов. Мысленно: «в-д-о-о-х» → «в-ы-д-о-о-х».</p>
              <div className="hm-badges"><span className="hm-badge success">Универсально</span><span className="hm-badge">Катализатор здоровья</span></div>
            </div>
            <div className="hm-card">
              <h3>🔊 6 Целительных звуков</h3>
              <p>Порядок: Лёгкие→Почки→Печень→Сердце→Селезёнка→3Обогрев.</p>
              <div className="hm-step-list">
                {DAOIST_SOUNDS.slice(0, 3).map(s => (
                  <div key={s.id} className="hm-step">                    <div className="hm-step-num">{s.id}</div>
                    <div className="hm-step-text"><strong>{s.organ}:</strong> {s.sound} · {s.emotion}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="hm-card" onClick={() => openModal("breathing", "norbeikov")} style={{ cursor: 'pointer' }}>
              <h3>✨ Настрой Норбекова + ОМЗ</h3>
              <p>Палец → Рука → Солнечное сплетение → 13 центров. Подключение Образ Молодости и Здоровья.</p>
              <div className="hm-badges"><span className="hm-badge warn">⚠️ ЗАПРЕТ: Не направлять в ❤️ и 🧠</span></div>
            </div>
            {breathingProto?.urgent && (
              <div className="hm-card" style={{ borderLeft: '3px solid var(--error)' }}>
                <h3>🚨 Экстренный сброс (стресс {'>'} 7)</h3>
                <p>{breathingProto.urgent.title}: {breathingProto.urgent.desc}</p>
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
              <div className="hm-badges" style={{ marginTop: 8 }}><span className="hm-badge">Защита границ: 3 цикла дыхания → фиксация взгляда</span></div>
            </div>
            <div className="hm-card">
              <h3>🧠 Нейропротокол & Настроение</h3>
              <p>Дыхание ↔ эмоции ↔ мышление. При стрессе {'>'} 7: Рыдающее дыхание → светотерапия 30 мин → аэробика.</p>
              <div className="hm-step-list">
                <div className="hm-step"><div className="hm-step-num">1</div><div className="hm-step-text">Вспомнить образ человека в целевом настроении</div></div>
                <div className="hm-step"><div className="hm-step-num">2</div><div className="hm-step-text">Дышать Норбекова «через образ», удерживая его во внимании</div></div>
              </div>
            </div>
          </>
        )}

        {activeTab === "practices" && (
          <div className="hm-card">
            <h3>👐 Вспомогательные упражнения (ТКМ/Хван)</h3>
            <div className="hm-step-list">
              {ANCILLARY_EXERCISES.eyes && <div className="hm-step"><div className="hm-step-num">👁️</div><div className="hm-step-text"><strong>Глаза (Печень):</strong> {ANCILLARY_EXERCISES.eyes.steps}</div></div>}
              {ANCILLARY_EXERCISES.tongue && <div className="hm-step"><div className="hm-step-num">👅</div><div className="hm-step-text"><strong>Язык (Сердце):</strong> {ANCILLARY_EXERCISES.tongue.steps}</div></div>}
              {ANCILLARY_EXERCISES.gums && <div className="hm-step"><div className="hm-step-num">🦷</div><div className="hm-step-text"><strong>Дёсны (Селезёнка/ПЖЖ):</strong> {ANCILLARY_EXERCISES.gums.steps}</div></div>}
            </div>
            <div className="hm-badges" style={{ marginTop: 12 }}>
              <span className="hm-badge">ТКМ рефлексология</span><span className="hm-badge">Усилители 6 звуков</span>
            </div>          </div>
        )}
      </div>

      {modal && <MeridianModal data={modal} onClose={closeModal} />}
    </div>
  );
}
