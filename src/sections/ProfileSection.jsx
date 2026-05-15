// src/sections/ProfileSection.jsx
import React, { useState } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights } from "../utils/knowledgeEngine";
import { getMeridianInfo, getChronotypePeaks } from "../data/profileKnowledge";
import { MaleAvatar, FemaleAvatar } from "../components/BlueprintAvatars";

// ─── БАЗА ДАННЫХ ВЕДИЧЕСКОЙ АСТРОЛОГИИ (К.Н. Рао) ───
const VEDIC_DATA = {
  'Овен': { marakas: ['Венера', 'Марс'], benefics: ['Марс', 'Солнце', 'Юпитер'] },
  'Телец': { marakas: ['Меркурий', 'Луна'], benefics: ['Венера', 'Меркурий', 'Сатурн'] },
  'Близнецы': { marakas: ['Луна', 'Юпитер'], benefics: ['Меркурий', 'Венера', 'Сатурн'] },
  'Рак': { marakas: ['Солнце', 'Сатурн'], benefics: ['Луна', 'Марс', 'Юпитер'] },
  'Лев': { marakas: ['Меркурий', 'Сатурн'], benefics: ['Солнце', 'Юпитер', 'Марс'] },
  'Дева': { marakas: ['Венера', 'Юпитер'], benefics: ['Меркурий', 'Сатурн', 'Венера'] },
  'Весы': { marakas: ['Марс', 'Марс'], benefics: ['Венера', 'Сатурн', 'Меркурий'] },
  'Скорпион': { marakas: ['Юпитер', 'Венера'], benefics: ['Марс', 'Юпитер', 'Луна'] },
  'Стрелец': { marakas: ['Сатурн', 'Меркурий'], benefics: ['Юпитер', 'Марс', 'Солнце'] },
  'Козерог': { marakas: ['Сатурн', 'Луна'], benefics: ['Сатурн', 'Венера', 'Меркурий'] },
  'Водолей': { marakas: ['Юпитер', 'Солнце'], benefics: ['Сатурн', 'Меркурий', 'Венера'] },
  'Рыбы': { marakas: ['Марс', 'Меркурий'], benefics: ['Юпитер', 'Луна', 'Марс'] },
};

// ─── БАЗА ДАННЫХ СТАДИЙ ЦЯЦЗЫ (12 ФАЗ ЖИЗНИ) ───
const JIAZI_STAGES = [
  { name: 'Рождение', desc: 'Новое начало, надежды, созидание', spheres: { health: 'Иммунитет, конституция', career: 'Обучение', relations: 'Семья, корни', spirit: 'Поиск смысла', finance: 'Накопление' } },
  { name: 'Купание', desc: 'Формирование реакций, эмоциональные тесты', spheres: { health: 'Нервная система', career: 'Поиск пути', relations: 'Первые связи', spirit: 'Духовный выбор', finance: 'Зависимость → самостоятельность' } },
  { name: 'Облачение', desc: 'Публичный выход, формирование имиджа', spheres: { health: 'Гормоны, кожа', career: 'Карьерный старт', relations: 'Партнёрство', spirit: 'Самоидентификация', finance: 'Первые доходы' } },
  { name: 'Взросление', desc: 'Стабилизация, долгосрочные проекты', spheres: { health: 'Энергия, выносливость', career: 'Проф. рост', relations: 'Стабильные союзы', spirit: 'Философия жизни', finance: 'Инвестиции' } },
  { name: 'Расцвет', desc: 'Пик сил, максимальное проявление', spheres: { health: 'Пик тонуса', career: 'Лидерство', relations: 'Глубокие связи', spirit: 'Духовный авторитет', finance: 'Капитал' } },
  { name: 'Старение', desc: 'Начало перехода, мудрость', spheres: { health: 'Восстановление', career: 'Наставничество', relations: 'Передача опыта', spirit: 'Интеграция', finance: 'Сохранение' } },
  { name: 'Болезнь', desc: 'Пересмотр приоритетов', spheres: { health: 'Терапия, баланс', career: 'Смена формата', relations: 'Качество связей', spirit: 'Очищение', finance: 'Оптимизация' } },
  { name: 'Смерть', desc: 'Завершение цикла, отпускание', spheres: { health: 'Глубокая терапия', career: 'Уход с позиций', relations: 'Прощение', spirit: 'Принятие', finance: 'Распределение' } },
  { name: 'Могила', desc: 'Хранение Ци, накопление', spheres: { health: 'Покой', career: 'Творчество в тени', relations: 'Тихие связи', spirit: 'Внутренний диалог', finance: 'Пассив' } },
  { name: 'Отдых', desc: 'Полное восстановление', spheres: { health: 'Регенерация', career: 'Перерыв', relations: 'Одиночество', spirit: 'Медитация', finance: 'Экономия' } },
  { name: 'Зачатие', desc: 'Скрытый росток нового цикла', spheres: { health: 'Подготовка', career: 'Идеи', relations: 'Новые знакомства', spirit: 'Намерение', finance: 'Планирование' } },
  { name: 'Созревание', desc: 'Подготовка к новому рождению', spheres: { health: 'Активация', career: 'Запуск', relations: 'Переговоры', spirit: 'Фокус', finance: 'Стартовый капитал' } }
];

// ─── ПОЛУЧЕНИЕ ПУТИ К ИЛЛЮСТРАЦИИ ───
const getFrontImage = (category, value) => {
  if (!value && category !== 'destiny' && category !== 'jiazi' && category !== 'vedic') return null;
  const raw = String(value).trim().toLowerCase();

  // 1. Специфические категории (SVG)
  if (category === 'jiazi') return '/assets/avatars-icons/front-jiazi-cycle.svg';
  if (category === 'vedic') return '/assets/avatars-icons/front-vedic-focus.svg';

  // 2. Хроно-тип
  if (category === 'chrono') {    const map = { 'жаворонок': 'front-chrono-lark.png', 'голубь': 'front-chrono-pigeon.png', 'сова': 'front-chrono-owl.png' };
    for (const [k, v] of Object.entries(map)) { if (raw.includes(k)) return `/assets/avatars-icons/${v}`; }
    return '/assets/avatars-icons/front-chrono-pigeon.png';
  }
  
  // 3. Градус Судьбы
  if (category === 'destiny') return '/assets/avatars-icons/front-destiny.png';

  // 4. Зодиак
  const paths = {
    western: { 'овен':'front-zodiac-aries.png','телец':'front-zodiac-taurus.png','близнецы':'front-zodiac-gemini.png','рак':'front-zodiac-cancer.png','лев':'front-zodiac-leo.png','дева':'front-zodiac-virgo.png','весы':'front-zodiac-libra.png','скорпион':'front-zodiac-scorpio.png','стрелец':'front-zodiac-sagittarius.png','козерог':'front-zodiac-capricorn.png','водолей':'front-zodiac-aquarius.png','рыбы':'front-zodiac-pisces.png' },
    eastern: { 'крыса':'front-eastern-rat.png','бык':'front-eastern-ox.png','тигр':'front-eastern-tiger.png','кролик':'front-eastern-rabbit.png','дракон':'front-eastern-dragon.png','змея':'front-eastern-snake.png','лошадь':'front-eastern-horse.png','коза':'front-eastern-goat.png','обезьяна':'front-eastern-monkey.png','петух':'front-eastern-rooster.png','собака':'front-eastern-dog.png','свинья':'front-eastern-pig.png' }
  };
  const list = paths[category];
  return list?.[raw] ? `/assets/avatars-icons/${list[raw]}` : null;
};

// ─── КОМПОНЕНТ ВКЛАДОК ───
function ProfileTabs({ activeTab, setActiveTab }) {
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 24, background: "rgba(0,112,192,0.06)", borderRadius: 8, padding: 4, border: "1px solid var(--line)" }}>
      {['main', 'deep'].map(tab => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          style={{
            flex: 1, padding: "10px 0", border: "none", borderRadius: 6, cursor: "pointer",
            fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1,
            background: activeTab === tab ? "var(--blue)" : "transparent",
            color: activeTab === tab ? "#fff" : "var(--text2)",
            transition: "all 0.2s",
            boxShadow: activeTab === tab ? "0 2px 6px rgba(0,112,192,0.2)" : "none"
          }}
        >
          {tab === 'main' ? 'ОСНОВНОЙ ПРОФИЛЬ' : 'ГЛУБОКИЙ АНАЛИЗ'}
        </button>
      ))}
    </div>
  );
}

// ─── ВНУТРЕННИЙ АККОРДЕОН ───
function InnerAccordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 10, background: "rgba(0,112,192,0.04)", borderRadius: 8, border: "1px solid rgba(0,112,192,0.15)" }}>
      <div
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{ padding: "10px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none" }}
      >        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--blue)", letterSpacing: 0.5 }}>{title}</span>
        <span style={{ fontSize: 12, color: "var(--gold)", transform: open ? "rotate(180deg)" : "rotate(0)", transition: "0.2s" }}>▼</span>
      </div>
      {open && (
        <div style={{ padding: "0 12px 12px", fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── ПЕРЕВОРАЧИВАЮЩАЯСЯ КАРТОЧКА (Основной профиль) ───
function FlipCardBlock({ title, frontImage, accentColor = "var(--blue)", children, minHeight = 340 }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div style={{ perspective: "1200px", marginBottom: 28 }}>
      <div
        onClick={() => setFlipped(!flipped)}
        style={{
          position: "relative", width: "100%", minHeight: minHeight,
          transformStyle: "preserve-3d", transition: "transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)",
          transform: flipped ? "rotateY(180deg)" : "none", cursor: "pointer", borderRadius: 12
        }}
      >
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: 12, overflow: "hidden",
          background: "linear-gradient(135deg, #f8f4e8 0%, #e8d8c0 100%)", border: "2px solid var(--gold)",
          boxShadow: "0 6px 20px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", transform: "translateZ(0)"
        }}>
          {frontImage ? (
            <img src={frontImage} alt={title} style={{ maxHeight: "70%", maxWidth: "90%", objectFit: "contain", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.15))" }} onError={(e) => { e.target.style.display = "none"; }} />
          ) : (
            <div style={{ width: "80%", height: "60%", background: "rgba(0,112,192,0.05)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 12 }}>Иллюстрация</div>
          )}
          <div style={{ marginTop: 14, fontFamily: "var(--font-head)", fontSize: 15, color: "var(--blue)", letterSpacing: "1px", fontWeight: 500 }}>{title}</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4, fontFamily: "var(--font-mono)" }}>Нажмите для деталей</div>
        </div>
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(0)",
          borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.98)", border: "1.5px solid rgba(0,112,192,0.25)",
          boxShadow: "0 4px 16px rgba(0,112,192,0.12)", padding: 18, display: "flex", flexDirection: "column"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
            <div style={{ width: 4, height: 24, background: accentColor, borderRadius: 2, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />
            <h3 style={{ fontFamily: "var(--font-head)", fontSize: 15, color: "var(--blue)", margin: 0, letterSpacing: "0.6px", fontWeight: 600 }}>{title}</h3>
          </div>
          <div style={{ overflowY: "auto", flex: 1, maxHeight: "65vh", fontSize: 14, lineHeight: 1.7, color: "var(--text2)", paddingRight: 4 }}>{children}</div>
        </div>      </div>
    </div>
  );
}

// ─── ИНТЕРАКТИВНЫЙ ГРАФИК ЦЯЦЗЫ ───
function JiaziTimeline({ dob }) {
  const [selectedStage, setSelectedStage] = useState(null);
  const age = dob ? Math.floor((new Date() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
  const currentStageIndex = Math.floor((age % 60) / 5);

  return (
    <div style={{ background: "rgba(0,112,192,0.03)", borderRadius: 10, padding: 16, marginBottom: 24, border: "1px solid var(--line)", position: "relative" }}>
      {/* Фоновое изображение */}
      <div style={{ height: 120, marginBottom: 16, borderRadius: 8, overflow: "hidden", position: "relative", background: "rgba(255,255,255,0.5)" }}>
        <img src="/assets/avatars-icons/front-jiazi-cycle.svg" alt="Цикл Цзяцзы" style={{ width: "100%", height: "100%", objectFit: "contain", opacity: 0.9 }} onError={(e) => { e.target.style.display = "none"; }} />
        <div style={{ position: "absolute", bottom: 0, right: 10, fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--text3)" }}>front-jiazi-cycle.svg</div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--blue)", margin: 0, letterSpacing: 1 }}>Цикл Цзяцзы: 12 стадий жизни</h3>
        <span className="badge bgr" style={{ fontSize: 10, padding: "3px 8px" }}>Текущая: {JIAZI_STAGES[currentStageIndex].name} ({age} лет)</span>
      </div>

      {/* Интерактивная шкала */}
      <div style={{ overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
        <div style={{ display: "flex", minWidth: "600px", gap: 4, position: "relative" }}>
          {/* Линия соединения */}
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: "var(--line)", transform: "translateY(-50%)" }} />
          
          {JIAZI_STAGES.map((s, i) => {
            const isActive = i === currentStageIndex;
            const isPast = i < currentStageIndex;
            return (
              <div
                key={i}
                onClick={() => setSelectedStage(selectedStage === i ? null : i)}
                style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", zIndex: 1
                }}
              >
                <div style={{
                  width: isActive ? 16 : 12, height: isActive ? 16 : 12, borderRadius: "50%",
                  background: isActive ? "var(--gold)" : isPast ? "var(--blue)" : "#fff",
                  border: `2px solid ${isActive ? "var(--gold)" : "var(--blue)"}`,
                  transition: "all 0.2s",
                  boxShadow: isActive ? "0 0 8px var(--gold)" : "none"
                }} />
                <div style={{ fontSize: 9, color: isActive ? "var(--blue)" : "var(--text3)", marginTop: 6, fontFamily: "var(--font-mono)", fontWeight: isActive ? 600 : 400 }}>
                  {i * 5}–{i * 5 + 5}                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Детали выбранной стадии */}
      {selectedStage !== null && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 16, border: "1px solid var(--line)", animation: "fadeIn 0.3s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--line)" }}>
            <strong style={{ fontFamily: "var(--font-head)", color: "var(--blue)", fontSize: 14 }}>{JIAZI_STAGES[selectedStage].name}</strong>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text3)" }}>Возраст: {selectedStage * 5}–{(selectedStage + 1) * 5} лет</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14, fontStyle: "italic" }}>{JIAZI_STAGES[selectedStage].desc}</p>
          <div style={{ display: "grid", gap: 8 }}>
            {Object.entries(JIAZI_STAGES[selectedStage].spheres).map(([key, val]) => (
              <div key={key} style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--text2)" }}>
                <span style={{ color: "var(--gold-dark)", fontWeight: 600, minWidth: 90 }}>{key.toUpperCase()}:</span>
                <span>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ВЕДИЧЕСКИЙ ПАСПОРТ ───
function VedicDossier({ zodiac }) {
  const data = VEDIC_DATA[zodiac] || { marakas: ['—'], benefics: ['—'] };
  
  return (
    <div style={{ background: "rgba(0,112,192,0.03)", borderRadius: 10, padding: 16, border: "1px solid var(--line)", position: "relative" }}>
       {/* Фоновое изображение */}
       <div style={{ height: 120, marginBottom: 16, borderRadius: 8, overflow: "hidden", position: "relative", background: "rgba(255,255,255,0.5)" }}>
        <img src="/assets/avatars-icons/front-vedic-focus.svg" alt="Ведический фокус" style={{ width: "100%", height: "100%", objectFit: "contain", opacity: 0.9 }} onError={(e) => { e.target.style.display = "none"; }} />
        <div style={{ position: "absolute", bottom: 0, right: 10, fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--text3)" }}>front-vedic-focus.svg</div>
      </div>

      <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: "var(--blue)", margin: "0 0 12px 0", letterSpacing: 1 }}>Ведический Паспорт</h3>
      <p style={{ fontSize: 12, color: "var(--text3)", margin: "0 0 16px 0" }}>Анализ по Солнечной Лагне ({zodiac || '—'})</p>

      <div style={{ display: "grid", gap: 14 }}>
        {/* Раджайоги */}
        <div style={{ padding: 14, background: "rgba(200,164,90,0.08)", borderRadius: 8, borderLeft: "3px solid var(--gold)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gold-dark)", letterSpacing: 1.2, marginBottom: 8 }}>◈ РАДЖАЙОГИ (ВОЗВЫШЕНИЕ)</div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text2)" }}>Комбинации управителей Кендр (1, 4, 7, 10) и Трикун (1, 5, 9). Для вашей Лагны потенциал успеха реализуется через соединение или аспект этих управителей.</p>
        </div>
        {/* Планетарный фокус (Благотворные) */}
        <div style={{ padding: 14, background: "rgba(45,106,79,0.08)", borderRadius: 8, borderLeft: "3px solid var(--success)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--success)", letterSpacing: 1.2, marginBottom: 8 }}>◈ ПЛАНЕТАРНЫЙ ФОКУС (ДРУЖЕСКИЕ)</div>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text2)" }}>Планеты, дающие поддержку и рост: <strong>{data.benefics.join(', ')}</strong>.</p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text3)" }}>Рекомендация: Развивайте сферы, управляемые этими планетами для карьерного роста.</p>
        </div>

        {/* Кармические вызовы (Мараки) */}
        <div style={{ padding: 14, background: "rgba(139,32,32,0.06)", borderRadius: 8, borderLeft: "3px solid var(--error)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--error)", letterSpacing: 1.2, marginBottom: 8 }}>◈ КАРМИЧЕСКИЕ ВЫЗОВЫ (МАРАКИ)</div>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text2)" }}>Планеты-мараки (управители 2 и 7 домов): <strong>{data.marakas.join(', ')}</strong>.</p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text3)" }}>Практика умиротворения: Мритьюнджая-мантра (108×), благотворительность, осознанность в периоды транзитов этих планет.</p>
        </div>
      </div>
    </div>
  );
}

// ─── ОСНОВНОЙ КОМПОНЕНТ ───
export function ProfileSection() {
  const { profile, setProfile, notify } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('main');

  if (!profile) return <div style={{ padding: 40, textAlign: "center", color: "var(--text2)" }}>Загрузка профиля...</div>;

  const insights = getProfileInsights(profile);
  const age = profile?.dob ? Math.floor((new Date() - new Date(profile.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  const genderStr = String(profile.gender || "").trim();
  const isMale = genderStr.toLowerCase().includes("муж") || genderStr.toLowerCase() === "male";

  const meridianInfo = getMeridianInfo(insights.zodiac);
  const chronoPeaks = getChronotypePeaks(profile.chronotype);
  const destiny = insights.destiny || { degree: 241, interpretation: "Интеграция опыта" };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => { setIsRefreshing(false); notify?.("✅ Данные обновлены"); }, 800);
  };

  const handleReset = () => {
    if (window.confirm("Вы уверены? Это удалит ваш профиль и вернет к началу настройки.")) {
      setProfile(null);
      notify?.("🗑️ Профиль сброшен");
    }
  };

  return (
    <div className="page" style={{ paddingBottom: 100 }}>      {/* ВКЛАДКИ */}
      <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* ВКЛАДКА: ОСНОВНОЙ ПРОФИЛЬ */}
      {activeTab === 'main' && (
        <>
          {/* АВАТАР → ПРОФИЛЬ */}
          <FlipCardBlock title="Профиль" frontImage={isMale ? '/assets/avatars-icons/male-avatar.png' : '/assets/avatars-icons/female-avatar.png'} accentColor="var(--blue)" minHeight={360}>
            <div style={{ textAlign: "center", marginTop: 10, marginBottom: 16 }}>
              <h2 style={{ fontFamily: "var(--font-head)", fontSize: 22, color: "var(--text1)", margin: "0 0 8px 0", letterSpacing: "1.2px", fontWeight: 600 }}>{profile.name || "Пользователь"}</h2>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
                <span className="badge bgr" style={{ fontSize: 12, padding: "4px 10px" }}>🎂 {age ?? "—"} лет</span>
                {profile.chronotype && <span className="badge bt" style={{ fontSize: 12, padding: "4px 10px" }}>⏱ {profile.chronotype}</span>}
                {insights.zodiac && <span className="badge bm" style={{ fontSize: 12, padding: "4px 10px" }}>♈ {insights.zodiac}</span>}
              </div>
              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, padding: "12px 14px", background: "rgba(0,112,192,0.05)", borderRadius: 8, borderLeft: "3px solid var(--gold)", textAlign: "left" }}>
                <strong style={{ color: "var(--gold-dark)" }}>Сводка:</strong> {insights.zodiac || "—"} ({insights.zodiacElement || "Воздух"}) · {insights.eastern || "—"} ({insights.easternElement || "Вода"}) · Градус: <strong style={{ color: "var(--gold)" }}>{destiny.degree}°</strong>
              </div>
            </div>
            <InnerAccordion title="Данные аккаунта" defaultOpen={true}>
              <div>ФИО: {profile.fullName || "—"}<br/>Дата рождения: {profile.dob || "—"}<br/>Пол: {profile.gender || "—"}<br/>Хроно-тип: {profile.chronotype || "—"}</div>
            </InnerAccordion>
          </FlipCardBlock>

          {/* ЗАПАДНЫЙ ЗОДИАК */}
          <FlipCardBlock title="Западный Зодиак" frontImage={getFrontImage("western", insights.zodiac)} accentColor="var(--blue)">
            <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
              <p style={{ marginBottom: 12, fontWeight: 500 }}><strong style={{ color: "var(--blue)", fontSize: 16 }}>{insights.zodiac || "—"}</strong> <span>({insights.zodiacElement || "Воздух"}) под управлением {insights.rulingPlanet || "Меркурия"}.</span></p>
              <InnerAccordion title="Сильные стороны" defaultOpen={true}>{insights.zodiacStrengths || "Коммуникация, адаптивность, интеллект"}</InnerAccordion>
              <InnerAccordion title="Уязвимые зоны">{insights.zodiacWeaknesses || "Лёгкие, бронхи, плечи, нервная система"}</InnerAccordion>
              <InnerAccordion title="Как использовать">
                <ul style={{ margin: "0 0 0 18px", lineHeight: 1.7 }}>
                  <li>Планируй важные дела на {chronoPeaks.focus?.hours || "утро"}</li>
                  <li>Избегай многозадачности</li>
                  <li>Дыхательные практики укрепляют слабые зоны</li>
                </ul>
              </InnerAccordion>
            </div>
          </FlipCardBlock>

          {/* ВОСТОЧНЫЙ ЗНАК */}
          <FlipCardBlock title="Восточный Знак" frontImage={getFrontImage("eastern", insights.eastern)} accentColor="var(--gold)">
            <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
              <p style={{ marginBottom: 12, fontWeight: 500 }}><strong style={{ color: "var(--gold-dark)", fontSize: 16 }}>{insights.eastern || "—"}</strong> <span>({insights.easternElement || "Вода"}).</span></p>
              <InnerAccordion title="Энергетический портрет" defaultOpen={true}>{insights.easternTraits || "Честность и терпимость"}. Твоя стихия наделяет тебя глубокой интуицией.</InnerAccordion>
              <InnerAccordion title="Кармическая задача">{insights.easternKarma || "Научиться говорить 'нет' без чувства вины"}. Выстраивай границы, не теряя эмпатии.</InnerAccordion>
              <InnerAccordion title="Рекомендации">
                <ul style={{ margin: "0 0 0 18px", lineHeight: 1.7 }}>
                  <li>Используй спады энергии для восстановления</li>
                  <li>Доверяй интуиции в финансовых вопросах</li>                  <li>Избегай токсичных связей</li>
                </ul>
              </InnerAccordion>
            </div>
          </FlipCardBlock>

          {/* ГРАДУС СУДЬБЫ */}
          <FlipCardBlock title="Градус Судьбы" frontImage={getFrontImage("destiny")} accentColor="var(--gold)">
            <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 38, color: "var(--gold)", fontWeight: 600, letterSpacing: "2.5px" }}>{destiny.degree || 241}°</div>
              <div style={{ fontFamily: "var(--font-italic)", fontSize: 15, color: "var(--text2)", marginTop: 6, fontStyle: "italic" }}>{destiny.interpretation || "Интеграция опыта"}</div>
            </div>
            <InnerAccordion title="Зона развития" defaultOpen={true}>Твой градус {destiny.degree}° указывает на текущую фазу жизненного цикла. {destiny.degree < 120 ? "Активное созидание." : destiny.degree < 240 ? "Структурирование роста." : "Интеграция опыта."}</InnerAccordion>
            <InnerAccordion title="Как использовать">
              <ul style={{ margin: "0 0 0 18px", lineHeight: 1.7 }}>
                <li>Доверяй интуиции, проверяй фактами</li>
                <li>Веди дневник наблюдений</li>
              </ul>
            </InnerAccordion>
          </FlipCardBlock>

          {/* ХРОНО-ТИП */}
          <FlipCardBlock title="Хроно-тип" frontImage={getFrontImage("chrono", profile.chronotype)} accentColor="var(--blue)">
            <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text2)" }}>
              <p style={{ marginBottom: 14, fontWeight: 500 }}><strong style={{ color: "var(--blue)", fontSize: 16 }}>{profile.chronotype || "🕊️ Голубь"}</strong></p>
              <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                <div style={{ padding: 12, background: "rgba(45,106,79,0.08)", borderRadius: 8, borderLeft: "3px solid var(--success)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--success)", letterSpacing: 1, marginBottom: 6 }}>🧠 ПИК КОНЦЕНТРАЦИИ</div>
                  <p style={{ margin: 0, fontSize: 13 }}>{chronoPeaks.focus?.tip || "Самые сложные задачи — в это время."}</p>
                </div>
                <div style={{ padding: 12, background: "rgba(139,32,32,0.06)", borderRadius: 8, borderLeft: "3px solid var(--error)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--error)", letterSpacing: 1, marginBottom: 6 }}>⚡ ПРОВАЛ ЭНЕРГИИ</div>
                  <p style={{ margin: 0, fontSize: 13 }}>Идеально для рутины и делегирования.</p>
                </div>
              </div>
              <InnerAccordion title="Как использовать" defaultOpen={true}>
                <ul style={{ margin: "0 0 0 18px", lineHeight: 1.7 }}>
                  <li>Синхронизируй расписание с биоритмами — КПД +30–40%</li>
                  <li>Сложные решения — только в пиковые часы</li>
                  <li>Соблюдай режим сна: {chronoPeaks.sleep?.hours || "22:30–23:30"}</li>
                </ul>
              </InnerAccordion>
            </div>
          </FlipCardBlock>
        </>
      )}

      {/* ВКЛАДКА: ГЛУБОКИЙ АНАЛИЗ */}
      {activeTab === 'deep' && (
        <>          <JiaziTimeline dob={profile.dob} />
          <VedicDossier zodiac={insights.zodiac} />
        </>
      )}

      {/* КНОПКИ УПРАВЛЕНИЯ */}
      <div style={{ display: "flex", gap: 14, marginTop: 28 }}>
        <button className="btn btn-primary" onClick={handleRefresh} disabled={isRefreshing} style={{ flex: 1, opacity: isRefreshing ? 0.7 : 1, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1.2, padding: "12px 16px", borderRadius: 8 }}>
          {isRefreshing ? "⏳ Обновление..." : "🔄 Обновить данные"}
        </button>
        <button className="btn btn-ghost" onClick={handleReset} style={{ flex: 1, borderColor: "rgba(139,32,32,0.4)", color: "var(--error)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1.2, padding: "12px 16px", borderRadius: 8 }}>
          🗑️ Сброс профиля
        </button>
      </div>
    </div>
  );
                }
