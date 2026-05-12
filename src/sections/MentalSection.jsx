// src/sections/MentalSection.jsx
import { useState } from 'react';
import { useApp } from '../store/AppContext';
// ✅ ИСПРАВЛЕНО: askClaude заменён на askViaServer
import { askViaServer } from '../services/aiClient';
import { T } from '../utils/theme';
import { getMoon } from '../utils/helpers';
import { parseAiResponse } from '../components/AiBox';
import { SectionHero } from '../components/SectionHero';

export function MentalSection() {
  const { 
    profile,
    mentalMood, setMentalMood,
    mentalStress, setMentalStress,
    mentalLog, setMentalLog,
    mentalRecoveryPlan, setMentalRecoveryPlan, // ✅ ИСПРАВЛЕНО: было setRecoveryPlan
    customPractices, setCustomPractices,
    notify
  } = useApp();

  const [mood, setMood] = useState(mentalMood || 3);
  const [stress, setStress] = useState(mentalStress || 5);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [openPractice, setOpenPractice] = useState(null);
  const [addingCustom, setAddingCustom] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [aiPlanText, setAiPlanText] = useState(mentalRecoveryPlan || '');

  const moon = getMoon();
  const freeFrom = profile.workEnd || '18:00';
  const currentHour = new Date().getHours();
  const stressors = (profile.stressors || []).join(', ');
  const recovery = (profile.recovery || []).join(', ');
  const isSedentary = (profile.workType || ' ').includes('офис') || (profile.workType || ' ').includes('удалённо');

  const saveMoodLog = () => {
    const logEntry = {
      date: new Date().toISOString(),
      mood,
      stress,
      note
    };
    setMentalLog([logEntry, ...(mentalLog || [])]);
    setMentalMood(mood);
    setMentalStress(stress);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ✅ ИСПРАВЛЕНО: используем askViaServer с промптом из базы знаний
  const generateRecoveryPlan = async () => {
    setLoadingPlan(true);
    try {
      const systemPrompt = `Ты ментальный советник в приложении Life Diary.

СТРОГИЕ ПРАВИЛА:
1. Используй ТОЛЬКО данные из базы знаний: Принцип Легкости Азнаурова, Источник Энергии (МИФ), дыхательные практики Дорошенко.
2. Температура = 0.1. Никаких домыслов.
3. Только практические техники, которые есть в базе знаний.
4. Указывай источник каждой рекомендации.

ПОЛЬЗОВАТЕЛЬ:
- Имя: ${profile?.name || 'не указано'}
- Хронотип: ${profile?.chronotype || 'не указан'}
- Стрессоры: ${stressors || 'не указаны'}
- Восстановление: ${recovery || 'не указано'}`;

      const userPrompt = `Настроение: ${mood}/5, Стресс: ${stress}/10.
Заметка: "${note || 'нет'}".
Фаза луны: ${moon.n}.
Время: ${currentHour}:00, свободен с ${freeFrom}.

Составь конкретный план восстановления на сегодняшний вечер:
1. Дыхательная практика из базы знаний (название + схема дыхания)
2. Техника из Принципа Легкости
3. Рекомендация по энергии из "Источника Энергии"`;

      const result = await askViaServer(systemPrompt, userPrompt, 800);
      setAiPlanText(result);
      setMentalRecoveryPlan(result); // ✅ ИСПРАВЛЕНО: правильное имя сеттера
      notify('План восстановления составлен ✦');
    } catch (e) {
      console.error('Mental AI error:', e);
      notify('Ошибка генерации плана');
    }
    setLoadingPlan(false);
  };

  const PRACTICES = [
    { id: 'breath', title: 'Дыхание 4-7-8', icon: '🫁', desc: 'Вдох 4 сек → задержка 7 → выдох 8. Снимает тревогу за 2 минуты.', duration: '5 мин', source: 'Дорошенко' },
    { id: 'box', title: 'Квадрат дыхания', icon: '⬜', desc: 'Вдох 4 → задержка 4 → выдох 4 → задержка 4. Для концентрации.', duration: '5 мин', source: 'Самавритти-пранаяма' },
    { id: 'nadi', title: 'Нади-шодхана', icon: '🌗', desc: 'Попеременное дыхание через ноздри. Балансирует левое/правое полушарие.', duration: '10 мин', source: 'Дорошенко' },
    { id: 'vilun', title: 'Рыдающее дыхание', icon: '💧', desc: 'Широко открыть рот → вдох → медленный выдох "с-с-с". Помогает при стрессе, диабете, астме.', duration: '5 мин', source: 'Вилунас' },
    { id: 'buteyko', title: 'Дыхание Бутейко', icon: '🔬', desc: 'Поверхностное дыхание через нос. Уменьшить объём вдоха. При тревоге и астме.', duration: '10 мин', source: 'Бутейко' },
    { id: 'voronka', title: 'Сменить Воронку', icon: '🌀', desc: 'Техника Азнаурова: определи свою Точку Концентрации. Переключись на положительный антипод.', duration: '3 мин', source: 'Принцип Легкости' },
    { id: 'energy', title: 'Энергетический старт', icon: '⚡', desc: 'Из "Источника Энергии": 3 глубоких вдоха → определи одно намерение на вечер → запиши.', duration: '5 мин', source: 'Источник Энергии (МИФ)' },
  ];

  const parsedPlan = parseAiResponse(aiPlanText);

  return (
    <div>
      <SectionHero sectionId="mental" />
      {/* Шапка */}
      <div className="card card-accent" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 28 }}>{moon.e || '🌙'}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text0 }}>Ментальное здоровье</div>
            <div style={{ fontSize: 12, color: T.text3 }}>{moon.n} · {new Date().toLocaleDateString('ru-RU', { weekday: 'long' })}</div>
          </div>
        </div>
      </div>

      {/* Фиксация состояния */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-title" style={{ marginBottom: 12 }}>Как сейчас?</div>
        
        <div style={{ marginBottom: 12 }}>
          <div className="sec-lbl">Настроение {mood}/5</div>
          <input type="range" min={1} max={5} value={mood} onChange={e => setMood(+e.target.value)}
            style={{ width: '100%', accentColor: T.gold }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.text3 }}>
            <span>Очень плохо</span><span>Отлично</span>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div className="sec-lbl">Стресс {stress}/10</div>
          <input type="range" min={1} max={10} value={stress} onChange={e => setStress(+e.target.value)}
            style={{ width: '100%', accentColor: stress > 7 ? T.error : T.gold }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.text3 }}>
            <span>Спокойно</span><span>Критический</span>
          </div>
        </div>

        <div className="fld">
          <label>Заметка</label>
          <textarea placeholder="Что беспокоит или радует сегодня?" value={note}
            onChange={e => setNote(e.target.value)} style={{ minHeight: 60 }} />
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveMoodLog}>
          {saved ? '✓ Записано' : 'Записать состояние'}
        </button>
      </div>

      {/* Практики из базы знаний */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-title" style={{ marginBottom: 12 }}>Практики из базы знаний</div>
        {PRACTICES.map(p => (
          <div key={p.id} onClick={() => setOpenPractice(openPractice === p.id ? null : p.id)}
            style={{ padding: '10px 0', borderBottom: `1px solid ${T.bdrS}`, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{p.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: T.text1, fontWeight: 500 }}>{p.title}</div>
                <div style={{ fontSize: 11, color: T.text3 }}>{p.duration} · {p.source}</div>
              </div>
              <span style={{ fontSize: 12, color: T.text3 }}>{openPractice === p.id ? '▲' : '▼'}</span>
            </div>
            {openPractice === p.id && (
              <div style={{ marginTop: 8, fontSize: 13, color: T.text2, lineHeight: 1.6,
                padding: '8px 12px', background: 'rgba(200,164,90,0.06)', borderRadius: 8 }}>
                {p.desc}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ИИ-план восстановления */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-title" style={{ marginBottom: 8 }}>✦ ИИ-план восстановления</div>
        <div style={{ fontSize: 12, color: T.text3, marginBottom: 12 }}>
          На основе базы знаний: Принцип Легкости, Дыхательные практики, Источник Энергии
        </div>
        
        <button className="btn btn-primary" style={{ width: '100%', marginBottom: 12 }}
          onClick={generateRecoveryPlan} disabled={loadingPlan}>
          {loadingPlan ? '✦ Составляю план...' : '✦ Составить план на вечер'}
        </button>

        {aiPlanText && (
          <div style={{ marginTop: 8 }}>
            {parsedPlan.map((block, i) => {
              if (block.type === 'header') return (
                <div key={i} style={{ fontSize: 15, fontWeight: 600, color: T.gold, marginTop: 12, marginBottom: 6 }}>
                  {block.content}
                </div>
              );
              if (block.type === 'list') return (
                <div key={i} style={{ paddingLeft: 12, borderLeft: `2px solid ${T.gold}`, marginBottom: 8 }}>
                  {block.items.map((item, j) => (
                    <div key={j} style={{ fontSize: 13, color: T.text2, lineHeight: 1.6, marginBottom: 4 }}>
                      {item.body || item}
                    </div>
                  ))}
                </div>
              );
              return <div key={i} style={{ fontSize: 13, color: T.text2, lineHeight: 1.7, marginBottom: 8 }}>{block.content}</div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
