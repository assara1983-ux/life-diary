// src/sections/HealthSection.jsx
import React, { useState, useMemo } from "react";
import { useApp } from "../store/AppContext";
import { calculateHealthProfile, getTimeRecommendation } from "../utils/healthCalculator";
import { MeridianClock } from "../components/MeridianClock";
import { ModalDetail } from "../components/ModalDetail";

const BREATHING_TECHNIQUES = {
  sam_chon_do: {
    title: "Сам Чон До (Базовое настроечное)",
    desc: "Вдох носом 3с → Выдох ртом 6с → Пауза 2с. 3–9 циклов.",
    rules: "1. Поза: сидя/стоя, спина прямая.\n2. Ментально: вдох «в-д-о-о-х», выдох «в-ы-д-о-о-х».\n3. После 3-9 циклов — переход к крику или основной практике.\n4. Пауза фиксации: 1 мин, записать ощущения.",
    benefit: "Гармонизация ритма организма, снятие зажимов, подготовка к любой практике. Дыхание — витальный центр здоровья.",
    warning: "Выполнять в проветренном помещении. Не задерживать дыхание."
  },
  norbekov: {
    title: "Настрой Норбекова + ОМЗ",
    desc: "4 этапа: Образ Молодости/Здоровья → Палец → Рука → Солнечное сплетение → 13 центров → Распространение энергии.",
    rules: "1. ОМЗ искать в памяти реальных состояний (не выдумывать).\n2. Подключать в районе солнечного сплетения.\n3. Визуализация: энергия как аквариум/ракета, растекается по телу.\n4. Время: вечер/ночь перед сном.",
    benefit: "Глубокое восстановление, омоложение, мобилизация ресурсов, снятие хронической усталости.",
    warning: "⛔ ЖЁСТКИЙ ЗАПРЕТ: НИКОГДА не направлять дыхательный поток в ❤️ Сердце и 🧠 Головной мозг. Дышать только «около» или в тело."
  },
  sounds: {
    title: "6 Даосских целительных звуков",
    desc: "Вибрационная терапия органов. Строгий порядок: Лёгкие → Почки → Печень → Сердце → Селезёнка → 3 Обогревателя.",
    rules: "1. Только на выдохе! Едва слышно.\n2. Лёгкие (С-С-С) → Почки (Ч-У-Э-Й) → Печень (Ш-Ш-Ш) → Сердце (Х-А-У) → Селезёнка (Х-У) → 3Об (Х-Э).\n3. Визуализировать цвет органа и изгнание негативной эмоции.\n4. Усилители: постукивание по зоне, брюшное дыхание.",
    benefit: "Очищение органов, восстановление энергетического баланса, снятие эмоциональных блоков, улучшение функций ЦНС.",
    warning: "Не выполнять натощак или сразу после плотной еды. При острых воспалениях — уменьшить интенсивность."
  },
  wilunas: {
    title: "Рыдающее дыхание (Экстренный сброс)",
    desc: "Вдох ртом → выдох со звуком «с-с-с» → пауза. 3 минуты.",
    rules: "1. Только при стрессе >7 или остром напряжении/гневе.\n2. Ритм быстрый, дыхание поверхностно-глубокое.\n3. После сброса: 3 цикла Сам Чон До для стабилизации.\n4. Фиксация состояния через 10 минут.",
    benefit: "Мгновенное снятие острого стресса, снижение артериального давления, освобождение от психосоматических зажимов.",
    warning: "⛔ Не применять при острых сердечных/сосудистых патологиях, глаукоме, беременности. Только в безопасной обстановке."
  },
  physical_form: {
    title: "Дыхание для коррекции фигуры",
    desc: "Утро, натощак. 5–20 мин. Поза «всадник/вратарь».",
    rules: "1. Медленный выдох (удалить воздух).\n2. Быстрый шумный вдох носом (максимум воздуха).\n3. Губы сжаты, подготовить диафрагму.\n4. Внезапный активный выдох со звуком «ба-ба-х» (сокращение диафрагмы).\n5. Голова вниз, живот максимально втянуть к позвоночнику, держать 8–10 счётов.\n6. Расслабить, повторить.",
    benefit: "Насыщение кислородом, активизация метаболизма, «пережигание» жировых излишков, повышение мышечного тонуса.",
    warning: "Не выполнять при грыжах, острой боли в животе, гипертонии. Сочетать с лёгкой растяжкой."
  },
  mood_shift: {
    title: "Дыхание для смены настроения",
    desc: "Связка: Сам Чон До → Образ → Норбеков.",
    rules: "1. 2-3 цикла Сам Чон До (подготовка).\n2. Выбрать целевое настроение (радость, спокойствие, уверенность).\n3. Вспомнить человека (реального/себя в прошлом) в этом состоянии.\n4. Начать дыхание Норбекова, «дышать через образ».\n5. Удерживать образ-образец в поле внимания до смены состояния.",
    benefit: "Быстрое изменение эмоционального строя, управление мышлением, снятие апатии/раздражения через физиологический ритм.",
    warning: "Если образ не вызывает отклика — сменить на более яркий или выполнить технику «Тренируем ум» (визуализация цвета воздуха)."
  }};

const UXIN_PATTERNS = {
  equal: { title: "Равноценный", text: "Оба наполняются силой, не устают. Поддерживайте естественный ритм общения." },
  vampire: { title: "Вампиризм", text: "Алгоритм защиты: 3 цикла Сам Чон До → фиксация взгляда на носу собеседника → внутреннее «закрытие» без агрессии." },
  donor: { title: "Донорство", text: "Вы истощаетесь. Остановите отдачу. Если отдача вредит вам → включите режим «Нейтральный»." },
  neutral: { title: "Нейтральный", text: "Экономия энергии. Мозг работает как при медитации. Входить при стрессе >7 или перед сложными переговорами." }
};

export function HealthSection() {
  const { profile } = useApp();
  const [activeTab, setActiveTab] = useState("profile");
  const [modalContent, setModalContent] = useState(null);

  const healthData = useMemo(() => calculateHealthProfile(profile), [profile]);
  const timeData = useMemo(() => getTimeRecommendation(), []);

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
        .h-badge { display: inline-block; font-size: 10px; background: var(--blue); color: #fff; padding: 2px 6px; border-radius: 2px; margin-top: 8px; font-family: var(--font-mono); }
        .h-badge.warning { background: #d32f2f; }
        .section-title { font-family: var(--font-head); color: var(--text-main); border-bottom: 2px solid var(--blue); padding-bottom: 5px; margin-bottom: 15px; font-size: 18px; }
        .data-row { display: flex; justify-content: space-between; font-size: 13px; border-bottom: 1px solid #eee; padding: 6px 0; }
        .data-label { color: #666; }
        .data-val { font-weight: bold; color: var(--blue); font-family: var(--font-mono); }
      `}</style>

      <div className="h-tabs">
        <button className={`h-tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Досье</button>
        <button className={`h-tab ${activeTab === 'rhythm' ? 'active' : ''}`} onClick={() => setActiveTab('rhythm')}>Ритм & Часы</button>
        <button className={`h-tab ${activeTab === 'breathing' ? 'active' : ''}`} onClick={() => setActiveTab('breathing')}>Дыхание</button>
        <button className={`h-tab ${activeTab === 'mental' ? 'active' : ''}`} onClick={() => setActiveTab('mental')}>Сфера</button>
      </div>

      <div className="h-content">
        {activeTab === 'profile' && (
          <div>
            <h2 className="section-title">Био-Энергетический Профиль</h2>
            <div className="h-grid">
              <div className="h-card" onClick={() => setModalContent({ title: "ТКМ Конституция", desc: `Стихия: ${healthData.element}. Баланс: ${healthData.yinyang}.`, rules: "Рекомендации по питанию и эмоциям зависят от доминирующей стихии. Избегайте продуктов, разрушающих вашу стихию.", benefit: "Регуляция внутренних циклов, профилактика дисбаланса." })}>                <h3>🧬 ТКМ Конституция</h3>
                <p>Стихия: <strong>{healthData.element}</strong></p>
                <p>Баланс: {healthData.yinyang}</p>
                <span className="h-badge">Клик для деталей</span>
              </div>
              <div className="h-card" onClick={() => setModalContent({ title: "Хронотип", desc: `Тип: ${healthData.chronotype}.`, rules: `Пик работы: ${healthData.workTime}. Время отдыха: ${healthData.restTime}.`, benefit: "Синхронизация с циркадными ритмами повышает продуктивность и снижает износ ЦНС." })}>
                <h3>⏳ Хронотип</h3>
                <p>Тип: <strong>{healthData.chronotype}</strong></p>
                <p>Пик энергии: {healthData.workTime}</p>
                <span className="h-badge">Управление ритмами</span>
              </div>
              <div className="h-card" onClick={() => setModalContent({ title: "Стресс-профиль", desc: `Уровень: ${healthData.stress}/10.`, rules: healthData.stress > 7 ? "Протокол: Рыдающее дыхание → Светотерапия 30мин → Аэробика." : "Протокол: Поддержание ритма Сам Чон До + регулярный сон.", benefit: "Предотвращение перераста в хроническую усталость и психосоматику." })}>
                <h3>⚡ Стресс</h3>
                <p>Уровень: <strong>{healthData.stress}/10</strong></p>
                <p>Фокус: {profile?.focusZones || "Общий"}</p>
                {healthData.stress > 7 && <span className="h-badge warning">Требуется сброс</span>}
              </div>
            </div>
            <div style={{ marginTop: '20px', padding: '10px', border: '1px dashed var(--blue)', color: '#666', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
              <strong>Анна Бортник:</strong> Знак {healthData.zodiac} · Фаза {healthData.jiaziPhase} · Узлы {healthData.lunarNodes}
            </div>
          </div>
        )}

        {activeTab === 'rhythm' && (
          <div>
            <h2 className="section-title">Меридианные Часы (У-Син)</h2>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px' }}>
                <MeridianClock activeMeridian={timeData.currentMeridian} onSelect={setModalContent} />
              </div>
              <div style={{ flex: '1 1 300px' }}>
                <h3 style={{ color: 'var(--blue)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>СЕЙЧАС: {timeData.hourSlot}</h3>
                <div className="h-card" onClick={() => setModalContent({ title: timeData.currentMeridian.name, desc: timeData.currentMeridian.desc, warning: timeData.currentMeridian.warning, benefit: timeData.currentMeridian.benefit })}>
                  <h3>Активный: {timeData.currentMeridian.name}</h3>
                  <p>{timeData.currentMeridian.desc}</p>
                  <span className="h-badge">Подробнее</span>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <strong style={{ fontSize: '12px', color: '#888', fontFamily: 'var(--font-mono)' }}>РЕКОМЕНДАЦИЯ ЧАСА:</strong>
                  <p style={{ fontSize: '13px', marginTop: 4 }}>{timeData.recommendation}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'breathing' && (
          <div>
            <h2 className="section-title">Дыхательные протоколы</h2>            <div className="h-grid">
              <div className="h-card" onClick={() => setModalContent(BREATHING_TECHNIQUES.sam_chon_do)}>
                <h3>Базовое: Сам Чон До</h3>
                <p>3-6-2. Подготовка организма.</p>
                <span className="h-badge">Универсально</span>
              </div>
              <div className="h-card" onClick={() => setModalContent(BREATHING_TECHNIQUES.norbekov)}>
                <h3>ОМЗ (Норбеков)</h3>
                <p>Омоложение, энергия, 13 центров.</p>
                <span className="h-badge">Вечер</span>
              </div>
              <div className="h-card" onClick={() => setModalContent(BREATHING_TECHNIQUES.sounds)}>
                <h3>6 Звуков (ТКМ)</h3>
                <p>Очищение органов, вибрация.</p>
                <span className="h-badge">Утро</span>
              </div>
              <div className="h-card" onClick={() => setModalContent(BREATHING_TECHNIQUES.physical_form)}>
                <h3>Коррекция фигуры</h3>
                <p>Метаболизм, утренняя практика.</p>
                <span className="h-badge">Натощак</span>
              </div>
              <div className="h-card" onClick={() => setModalContent(BREATHING_TECHNIQUES.mood_shift)}>
                <h3>Смена настроения</h3>
                <p>Дыхание через образ-эталон.</p>
                <span className="h-badge">Эмоции</span>
              </div>
              {(healthData.stress > 7) && (
                <div className="h-card" style={{ borderColor: '#d32f2f' }} onClick={() => setModalContent(BREATHING_TECHNIQUES.wilunas)}>
                  <h3 style={{ color: '#d32f2f' }}>Экстренный сброс</h3>
                  <p>Рыдающее дыхание (Вилунас).</p>
                  <span className="h-badge warning">Стресс {'>'} 7</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'mental' && (
          <div>
            <h2 className="section-title">Ментальное поле & У-Син</h2>
            <div className="h-card" onClick={() => setModalContent({ title: "Паттерн коммуникации", desc: `Сейчас вы в позиции: ${UXIN_PATTERNS[healthData.uxinPattern]?.title || 'Равноценный'}.`, rules: UXIN_PATTERNS[healthData.uxinPattern]?.text, benefit: "Защита энергетических границ, экономия ресурсов, предотвращение эмоционального выгорания." })}>
              <h3>Ваш паттерн коммуникации</h3>
              <p>Текущий режим: <strong>{healthData.uxinPattern.toUpperCase()}</strong></p>
              <p style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>Зависит от стресса и CoreValue.</p>
              <span className="h-badge">Узнать алгоритм защиты</span>
            </div>
          </div>
        )}
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
