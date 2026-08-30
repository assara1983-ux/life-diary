// src/sections/HealthSection.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../store/AppContext';
import { calculateHealthProfile, getTimeRecommendation } from '../utils/healthCalculator';
import { AnatomyViewer } from '../components/AnatomyViewer';
import { ModalDetail } from '../components/ModalDetail';
import { ANATOMY_DATA } from '../data/anatomyKnowledge';
import { BreathingTimer } from '../components/BreathingTimer';
import { HealthTracker } from '../components/HealthTracker';
import { TaskModal } from '../components/TaskModal';
import { openGoogleCalendar } from '../utils/googleCalendar';
import { PoseIllustration } from '../components/health/PoseIllustration';
import { BreathingDiagram } from '../components/health/BreathingDiagram';
import { ELEMENT_NUTRITION, CHRONO_ADVICE, ACTIVITY_ADVICE, ENERGY_RECOVERY } from '../data/healthRecommendations';

// ─── УТИЛИТЫ ───
function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function localDateRu(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${d}.${m}.${y}`;
}
function parseLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ─── ХЕЛПЕРЫ ───
const getZodiac = (date) => {
  if (!date) return '—';
  const day = date.getDate(), month = date.getMonth() + 1;
  const zodiac = [
    { sign: '♑ Козерог', end: [1,19] }, { sign: '♒ Водолей', end: [2,18] },
    { sign: '♓ Рыбы',    end: [3,20] }, { sign: '♈ Овен',    end: [4,19] },
    { sign: '♉ Телец',   end: [5,20] }, { sign: '♊ Близнецы', end: [6,20] },
    { sign: '♋ Рак',     end: [7,22] }, { sign: '♌ Лев',     end: [8,22] },
    { sign: '♍ Дева',    end: [9,22] }, { sign: '⚖️ Весы',   end: [10,22] },
    { sign: '♏ Скорпион',end: [11,21] },{ sign: '♐ Стрелец', end: [12,21] },
    { sign: '♑ Козерог', end: [12,31] },
  ];
  return zodiac.find(z => month === z.end[0] && day <= z.end[1])?.sign || '—';
};
const getAge = (dob) => {
  if (!dob) return '—';
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25*24*60*60*1000));
};
const getEasternYear = (y) =>
  ['Крыса','Бык','Тигр','Кролик','Дракон','Змея','Лошадь','Коза','Обезьяна','Петух','Собака','Свинья'][(y-4)%12];

// ─── ДАННЫЕ ───
const BREATHING_TECHNIQUES = [
  { id:'wilunas',  title:'Экстренный сброс (Рыдающее)', short:'Снижение давления и паники',  purpose:'Мгновенное снятие острого стресса (>7)', effect:'Снижение кортизола, нормализация пульса', rules:'Вдох ртом → выдох со звуком "с-с-с" → пауза. 3 мин.', technique:{inhale:1,exhale:3,hold:0,cycles:3},
    steps:[
      'Сядьте прямо или лягте, плечи расслаблены, не поднимайте их на вдохе.',
      'Короткий бесшумный вдох через приоткрытый рот — 1 секунда, будто хватаете воздух.',
      'Медленный выдох через рот со звуком «с-с-с», как сдувающийся шарик — 3 секунды.',
      'Пауза 1–2 секунды на пустых лёгких, не форсируйте следующий вдох.',
      'Повторяйте 3 минуты. Если закружилась голова — сделайте паузу и дышите обычно.' ] },
  { id:'physical', title:'Коррекция фигуры',            short:'Активация метаболизма',        purpose:'Сжигание жира, тонус мышц пресса',      effect:'Ускорение обмена веществ',               rules:'Только утром натощак. Поза "Всадник". Активный выдох "Ба-ха".', technique:{inhale:2,exhale:5,hold:2,cycles:10},
    steps:[
      'Только натощак утром, через 20–30 минут после пробуждения.',
      'Поза «Всадник»: ноги на ширине плеч, слегка присядьте, руки на бёдрах, спина прямая.',
      'Вдох носом 2 секунды, живот мягко надувается.',
      'Задержка 2 секунды, лёгкое напряжение мышц пресса.',
      'Резкий выдох ртом со звуком «ба-ха», втягивая живот к позвоночнику — 5 секунд.',
      '10 циклов подряд, затем отдых 30 секунд, всего 3 подхода.' ] },
  { id:'samchon',  title:'Сам Чон До (Базовое)',         short:'Гармонизация состояния',       purpose:'Подготовка, снятие зажимов',            effect:'Баланс Инь/Ян, спокойствие',             rules:'Вдох носом 3с → Выдох ртом 6с → Пауза 2с.', technique:{inhale:3,exhale:6,hold:2,cycles:5},
    steps:[
      'Сядьте с прямой спиной, руки свободно на коленях ладонями вверх.',
      'Закройте глаза, расслабьте лицо и плечи.',
      'Вдох через нос 3 секунды — воздух наполняет сначала живот, потом грудь.',
      'Плавный выдох через рот 6 секунд, будто выдуваете воздух через трубочку.',
      'Пауза на пустом выдохе 2 секунды.',
      'Повторить 5 циклов, наблюдая за ощущениями в теле без оценки.' ] },
  { id:'norbekov', title:'Настрой Норбекова + ОМЗ',      short:'Омоложение и ресурс',          purpose:'Настройка 13 центров, омоложение',       effect:'Прилив энергии, ясность ума',             rules:'4 этапа: Образ → Палец → Рука → Сплетение. НЕ направлять в Сердце/Мозг!', technique:{inhale:4,exhale:8,hold:2,cycles:4},
    steps:[
      'Этап 1 «Образ»: закройте глаза, представьте яркий тёплый образ (солнце, огонёк).',
      'Этап 2 «Палец»: направьте внимание в кончик указательного пальца, ощутите тепло/покалывание.',
      'Этап 3 «Рука»: распространите это ощущение на всю ладонь и предплечье на вдохе (4с).',
      'Этап 4 «Сплетение»: на выдохе (8с) направьте тепло к солнечному сплетению — область живота.',
      '⚠️ Никогда не направляйте поток в область сердца или головы — только конечности и живот.',
      'Задержка 2 секунды между этапами, 4 полных цикла.' ] },
  { id:'mood',     title:'Смена настроения',             short:'Эмоциональная перезагрузка',   purpose:'Быстрая смена негатива на позитив',     effect:'Выработка дофамина',                     rules:'Сам Чон До → Образ человека в нужном настроении → Дыхание через образ.', technique:{inhale:3,exhale:5,hold:0,cycles:6},
    steps:[
      'Начните с 1–2 циклов «Сам Чон До» (вдох носом 3с, выдох ртом 6с), чтобы успокоиться.',
      'Вспомните конкретного человека, который излучает нужное вам сейчас настроение.',
      'Мысленно «наденьте» его выражение лица и осанку на вдохе (3с).',
      'На выдохе (5с) мысленно скажите себе фразу этого настроения («я спокоен», «я уверен»).',
      'Повторяйте 6 циклов, позволяя настроению закрепиться в теле.' ] },
];

// У-Син данные по стихиям
const UXIN_DATA = {
  'Дерево': {
    organ: 'Печень / Желчный пузырь', emotion: 'Гнев, раздражение',
    color: '#2d6a4f', colorBg: 'rgba(45,106,79,0.08)',
    foods: 'Зелёные овощи, проростки, кислые продукты, листовые салаты, лимон',
    avoid: 'Алкоголь, жареное, переедание вечером, пропускать завтрак',
    must: 'Горячий завтрак до 09:00, зелёные овощи ежедневно, прогулки на свежем воздухе',
    yoga: 'Позы скрутки, наклоны вперёд (Пашчимоттанасана, Бхарадваджасана)',
    breath: 'Дыхание с усиленным выдохом — очищение Печени',
    exercise: 'Растяжка, йога, пилатес — мягко, без резких нагрузок',
    research: 'Исследования 2023–2024: расторопша поддерживает Печень; хлорофилл из зелени детоксицирует',
  },
  'Огонь': {
    organ: 'Сердце / Тонкий кишечник', emotion: 'Тревога, перевозбуждение',
    color: '#c0392b', colorBg: 'rgba(192,57,43,0.08)',
    foods: 'Красные и горькие продукты: помидоры, свёкла, горький шоколад, куркума',
    avoid: 'Кофе, энергетики, переизбыток острого, поздние ужины',
    must: 'Отдых в полдень 20 мин, травяной чай вечером, медитация',
    yoga: 'Раскрытие груди (Устрасана, Дханурасана), сердечные позы',
    breath: '4-7-8: вдох 4с, задержка 7с, выдох 8с — успокоение Сердца',
    exercise: 'Плавание, танцы, умеренный бег — без перегрева',
    research: 'Мета-анализ 2024: ресвератрол из красного винограда снижает воспаление сосудов',
  },
  'Земля': {
    organ: 'Селезёнка / Желудок', emotion: 'Беспокойство, навязчивые мысли',
    color: '#c8a45a', colorBg: 'rgba(200,164,90,0.08)',
    foods: 'Сладковатое и жёлтое: тыква, морковь, батат, просо, мёд',
    avoid: 'Холодная пища, сырые овощи натощак, избыток молочного, сахар',
    must: 'Завтрак в одно время, тёплая пища, есть медленно без отвлечений',
    yoga: 'Позы на баланс (Врикшасана, Гарудасана), скрутки для ЖКТ',
    breath: 'Диафрагмальное дыхание — массаж органов пищеварения',
    exercise: 'Ходьба после еды, тай-чи, цигун',
    research: 'Исследования 2024: пробиотики + пребиотики восстанавливают микробиом за 4–6 недель',
  },
  'Металл': {
    organ: 'Лёгкие / Толстый кишечник', emotion: 'Печаль, отпускание',
    color: '#7f8c8d', colorBg: 'rgba(127,140,141,0.08)',
    foods: 'Белые и острые: дайкон, груша, капуста, белая рыба, чеснок',
    avoid: 'Молочные при слизи, пшеница при воспалении, холодные напитки',
    must: 'Проветривание комнаты, глубокое дыхание утром, клетчатка',
    yoga: 'Позы раскрытия плеч и груди (Гомукхасана, Матсьясана)',
    breath: 'Очистительное дыхание через нос — дренаж Лёгких',
    exercise: 'Ходьба на свежем воздухе, бег, дыхательная гимнастика',
    research: 'Исследования 2023: N-ацетилцистеин улучшает функцию лёгких; бронхоальвеолярный дренаж',
  },
  'Вода': {
    organ: 'Почки / Мочевой пузырь', emotion: 'Страх, неуверенность',
    color: '#2980b9', colorBg: 'rgba(41,128,185,0.08)',
    foods: 'Солёное и тёмное: морская капуста, чёрная фасоль, кунжут, орехи, рыба',
    avoid: 'Кофе, алкоголь, избыток соли, холодные напитки, сырые продукты зимой',
    must: 'Стакан тёплой воды утром, тепло в области поясницы, ранний сон до 23:00',
    yoga: 'Позы на поясницу (Баласана, Шалабхасана, Супта Баддха Конасана)',
    breath: 'Дыхание в нижний живот — питание Почек через практику',
    exercise: 'Плавание, йога, медитация, цигун — восстановление Цзин',
    research: 'Исследования 2024: адаптогены (ашваганда, родиола) восстанавливают надпочечники',
  },
};

// Гормональная йога
const HORMONAL_YOGA = [
  { name: 'Баддха Конасана', sanskrit: 'Baddha Konasana', pose: 'baddhaKonasana', benefit: 'Стимуляция яичников, улучшение кровотока в малом тазу', time: '3–5 мин', phase: 'Фолликулярная и овуляция',
    steps: [
      'Сядьте на пол, спина прямая, можно опереться на стену или подушку под таз.',
      'Согните колени и сведите стопы подошва к подошве, подтяните пятки ближе к паху.',
      'Мягко разведите колени в стороны и вниз — не давите руками, дайте бёдрам раскрыться самим.',
      'Дыхание: медленный вдох носом 4 секунды, выдох через нос 6 секунд, живот свободен.',
      'Держите 3–5 минут, если тянет в паху — подложите под колени валики.' ] },
  { name: 'Вирасана', sanskrit: 'Virasana', pose: 'virasana',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Virasana%20Yoga-Asana%20Nina-Mel.jpg',
    imageCredit: 'Nina-Mel, CC BY 3.0, Wikimedia Commons',
    benefit: 'Снятие напряжения в пояснице, баланс гормонов', time: '2–3 мин', phase: 'Любая',
    steps: [
      'Встаньте на колени, стопы разведите чуть шире таза, носки назад.',
      'Опуститесь ягодицами на пол между стоп (или на блок/подушку, если некомфортно).',
      'Спина прямая, ладони на бёдрах, плечи опущены от ушей.',
      'Дыхание: ровный вдох-выдох по 4 секунды через нос, направляя выдох в поясницу.',
      'Держите 2–3 минуты, при онемении стоп мягко выйдите из позы.' ] },
  { name: 'Супта Баддха Конасана', sanskrit: 'Supta Baddha Konasana', pose: 'suptaBaddhaKonasana', benefit: 'Глубокое расслабление репродуктивной системы', time: '5–10 мин', phase: 'Лютеиновая и менструация',
    steps: [
      'Лягте на спину, сведите стопы подошва к подошве, колени раскройте в стороны.',
      'Под каждое колено подложите подушку или валик для опоры — это важно для расслабления.',
      'Руки свободно вдоль тела ладонями вверх, плечи прижаты к полу.',
      'Дыхание: диафрагмальное — вдох 4 секунды (живот поднимается), выдох 6 секунд (живот опускается).',
      'Оставайтесь 5–10 минут, выходите через поворот на бок.' ] },
  { name: 'Сарвангасана', sanskrit: 'Sarvangasana', pose: 'sarvangasana',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sarvangasana.jpg',
    imageCredit: 'CC BY-SA 2.5, Wikimedia Commons',
    benefit: 'Стимуляция щитовидной железы, баланс ФСГ/ЛГ', time: '2–5 мин', phase: 'Фолликулярная',
    steps: [
      'Лягте на спину, руками помогите поднять таз и ноги вертикально вверх.',
      'Поддержите поясницу ладонями, локти на полу близко к телу.',
      'Вес тела — на плечах и верхней части рук, НЕ на шее.',
      'Дыхание: спокойное, через нос, без задержек, 4–5 секунд на вдох и выдох.',
      '⚠️ Не выполняйте при проблемах с шеей/давлением или во время менструации.',
      'Держите 2–5 минут, выходите медленно, без рывков.' ] },
  { name: 'Пашчимоттанасана', sanskrit: 'Paschimottanasana', pose: 'paschimottanasana',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Paschimotanasana%20Yoga-Asana%20Nina-Mel.jpg',
    imageCredit: 'Nina-Mel, CC BY 3.0, Wikimedia Commons',
    benefit: 'Массаж яичников, снятие ПМС', time: '3 мин', phase: 'Лютеиновая',
    steps: [
      'Сядьте с прямыми вытянутыми вперёд ногами, стопы на себя.',
      'На вдохе вытяните позвоночник вверх, руки поднимите над головой.',
      'На выдохе наклонитесь вперёд от таза (не от поясницы), тянитесь к стопам.',
      'Если не достаёте до стоп — держите голени, спина может быть слегка округлой.',
      'Дыхание в позе: вдох 4 секунды на вытяжение, выдох 6 секунд — мягче уходите глубже.',
      'Держите 1–3 минуты, выходите на вдохе.' ] },
  { name: 'Шавасана с пранаямой', sanskrit: 'Savasana', pose: 'savasana',
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Shavasana.jpg',
    imageCredit: 'CC BY-SA 2.5, Wikimedia Commons',
    benefit: 'Интеграция практики, снижение кортизола', time: '10 мин', phase: 'Любая — в конце',
    steps: [
      'Лягте на спину, ноги немного шире таза, руки вдоль тела ладонями вверх.',
      'Прикройте глаза, дайте телу полностью расслабиться, проверьте — не сжаты ли челюсти.',
      'Дыхание: естественное, без управления, просто наблюдайте вдох и выдох.',
      'Через 2–3 минуты можно добавить счёт: вдох на 4, выдох на 6 — без напряжения.',
      'Оставайтесь 10 минут, выходите медленно через поворот на бок и сидя.' ] },
];


// Фазы цикла
const CYCLE_PHASES = [
  { name: 'Менструация',   days: [1,5],   color: '#c0392b', colorBg: 'rgba(192,57,43,0.1)',   emoji: '🌑', advice: 'Отдых и тепло. Лёгкая йога, никаких интенсивных тренировок. Тёплое питание, меньше сырого. Баддха Конасана, Шавасана.' },
  { name: 'Фолликулярная', days: [6,13],  color: '#27ae60', colorBg: 'rgba(39,174,96,0.1)',   emoji: '🌒', advice: 'Пик активности и планирования. Кардио, силовые, новые проекты. Включите белок и зелёные овощи в рацион.' },
  { name: 'Овуляция',      days: [14,16], color: '#f39c12', colorBg: 'rgba(243,156,18,0.1)',  emoji: '🌕', advice: 'Максимальная энергия. Интенсивные тренировки, общение, переговоры. Антиоксиданты: ягоды, орехи, авокадо.' },
  { name: 'Лютеиновая',    days: [17,28], color: '#8e44ad', colorBg: 'rgba(142,68,173,0.1)',  emoji: '🌖', advice: 'Замедление. Йога, прогулки, уход за собой. Магний (тёмный шоколад, орехи) снижает ПМС. Ложитесь раньше.' },
];

const getCyclePhase = (dayNum) => CYCLE_PHASES.find(p => dayNum >= p.days[0] && dayNum <= p.days[1]) || CYCLE_PHASES[3];

// Дефолтные пункты трекера по профилю
const getDefaultTrackerItems = (profile, element) => {
  const items = [
    { id: 'water',     text: 'Стакан воды утром',            category: 'питание' },
    { id: 'breakfast', text: 'Горячий завтрак',               category: 'питание' },
    { id: 'walk',      text: 'Прогулка / 8000 шагов',        category: 'движение' },
    { id: 'noevening', text: 'Без еды после 19:00',           category: 'питание' },
    { id: 'sleep',     text: 'Сон до 23:00',                  category: 'режим' },
    { id: 'breath',    text: 'Дыхательная практика (5 мин)', category: 'практика' },
  ];
  if (element === 'Дерево' || element === 'Огонь') {
    items.push({ id: 'yoga', text: 'Йога / растяжка (20 мин)', category: 'движение' });
  }
  if (profile?.gender === 'Женский') {
    items.push({ id: 'horyoga', text: 'Гормональная йога (15 мин)', category: 'практика' });
  }
  if (profile?.healthFocus?.includes('Вес')) {
    items.push({ id: 'deficit', text: 'Калорийный дефицит соблюдён', category: 'питание' });
  }
  return items;
};

// ─── МИНИ SVG ГРАФИК ВЕСА ───
function WeightChart({ logs }) {
  if (!logs || logs.length < 2) return (
    <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: 12 }}>
      Добавьте минимум 2 записи для графика
    </div>
  );
  const last30 = logs.slice(-30);
  const values = last30.map(l => parseFloat(l.value)).filter(v => !isNaN(v));
  if (values.length < 2) return null;
  const min = Math.min(...values) - 0.5;
  const max = Math.max(...values) + 0.5;
  const W = 300, H = 80;
  const toX = (i) => (i / (last30.length - 1)) * W;
  const toY = (v) => H - ((v - min) / (max - min)) * H;
  const points = last30.map((l, i) => `${toX(i)},${toY(parseFloat(l.value))}`).join(' ');
  const trend = values[values.length - 1] - values[0];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#888', fontFamily: "'JetBrains Mono',monospace" }}>
          {last30.length} записей
        </span>
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: trend <= 0 ? '#2d6a4f' : '#c0392b',
        }}>
          {trend <= 0 ? '↓' : '↑'} {Math.abs(trend).toFixed(1)} кг за период
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 80, overflow: 'visible' }}>
        <polyline
          points={points}
          fill="none"
          stroke="rgba(0,112,192,0.3)"
          strokeWidth="1.5"
        />
        <polygon
          points={last30.map((l,i) => `${toX(i)},${toY(parseFloat(l.value))}`).join(' ') + ` ${W},${H} 0,${H}`}
          fill="rgba(0,112,192,0.08)"
          stroke="none"
        />
        {last30.map((l, i) => (
          <circle
            key={i} cx={toX(i)} cy={toY(parseFloat(l.value))} r="3"
            fill="#0070c0" stroke="#fff" strokeWidth="1.5"
          />
        ))}
        {/* Метки оси Y */}
        <text x="0" y={H} fontSize="9" fill="#aaa">{min.toFixed(1)}</text>
        <text x="0" y="10" fontSize="9" fill="#aaa">{max.toFixed(1)}</text>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#aaa', fontFamily: "'JetBrains Mono',monospace" }}>
        <span>{localDateRu(last30[0]?.date)}</span>
        <span>{localDateRu(last30[last30.length-1]?.date)}</span>
      </div>
    </div>
  );
}

// ─── АККОРДЕОН ───
function AccordionItem({ title, children, isOpen, toggle, accent }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${isOpen ? (accent || 'var(--gold)') : 'var(--blue)'}`,
      borderRadius: 6, overflow: 'hidden', marginBottom: 0,
    }}>
      <div onClick={toggle} style={{
        padding: '12px 15px', cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: isOpen ? 'rgba(0,112,192,0.04)' : '#fff',
      }}>
        <span style={{ fontWeight: 600, color: 'var(--blue)', fontSize: 13 }}>{title}</span>
        <span style={{ fontSize: 16, color: 'var(--blue)' }}>{isOpen ? '−' : '+'}</span>
      </div>
      {isOpen && (
        <div style={{ padding: '14px 15px', borderTop: '1px solid #eee', background: '#fff', fontSize: 13, lineHeight: 1.6 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── ГЛАВНЫЙ КОМПОНЕНТ ───
export function HealthSection() {
  const { profile, tasks, setTasks, notify } = useApp();
  const today = localDateStr();

  const healthTasks = useMemo(() => tasks.filter(t=>t.section==='health'), [tasks]);

  const saveHealthTask = (t) => {
    setTasks(p => p.some(x=>x.id===t.id) ? p.map(x=>x.id===t.id?t:x) : [...p, t]);
    notify?.(t.id ? '✅ Задача сохранена' : '✅ Задача добавлена');
  };
  const deleteHealthTask = (id) => {
    if (!window.confirm('Удалить задачу?')) return;
    setTasks(p => p.filter(x=>x.id!==id));
  };
  const toggleHealthTaskDone = (t) => {
    const isDone = t.doneDate === today;
    setTasks(p => p.map(x=>x.id===t.id?{...x, doneDate: isDone?null:today, lastDone: isDone?x.lastDone:today}:x));
  };

  // Вкладки
  const [activeTab,     setActiveTab]     = useState('anatomy');
  const [breathSearch,  setBreathSearch]  = useState('');
  const [yogaSearch,    setYogaSearch]    = useState('');
  const [modalContent,  setModalContent]  = useState(null);
  const [expandedRec,   setExpandedRec]   = useState(null);
  const [healthTaskModal, setHealthTaskModal] = useState(null); // null | 'new' | task-объект
  const [expandedBreath,setExpandedBreath]= useState(null);
  const [expandedPose,  setExpandedPose]   = useState(null);

  const healthData = useMemo(() => calculateHealthProfile(profile), [profile]);
  const timeData   = useMemo(() => getTimeRecommendation(), []);

  const p       = profile || {};
  const dob     = p.dob ? new Date(p.dob) : new Date();
  const age     = getAge(p.dob);
  const element = healthData.element?.trim() || 'Земля';
  const stress  = p.stressLevel ?? 5;
  const isWoman = p.gender === 'Женский';
  const isWeightGoal = p.goalAreas?.includes('Внешность') || /похудение|вес|форма/i.test(p.mainGoal || '');
  const hasHealthGoal = p.goalAreas?.includes('Здоровье') || isWeightGoal;
  const uxin = UXIN_DATA[element] || UXIN_DATA['Земля'];

  // ─── ВЕС ───
  const [weightStart,  setWeightStart]  = useState(() => parseLS('ld_weight_start', ''));
  const [weightGoal,   setWeightGoal]   = useState(() => parseLS('ld_weight_goal', ''));
  const [weightToday,  setWeightToday]  = useState('');
  const [weightLog,    setWeightLog]    = useState(() => parseLS('ld_weight_log', []));
  const [weightInput,  setWeightInput]  = useState('');
  const [editingStart, setEditingStart] = useState(!parseLS('ld_weight_start', ''));
  const [editingGoal,  setEditingGoal]  = useState(!parseLS('ld_weight_goal', ''));

  const currentWeight = weightLog.length > 0
    ? parseFloat(weightLog[weightLog.length-1].value)
    : (parseFloat(weightStart) || 0);

  const saveWeight = () => {
    const val = parseFloat(weightInput);
    if (isNaN(val) || val < 20 || val > 300) return;
    const newLog = [...weightLog.filter(l => l.date !== today), { date: today, value: val }]
      .sort((a,b) => a.date.localeCompare(b.date));
    setWeightLog(newLog);
    saveLS('ld_weight_log', newLog);
    setWeightInput('');
  };

  const saveWeightStart = (v) => { setWeightStart(v); saveLS('ld_weight_start', v); };
  const saveWeightGoal  = (v) => { setWeightGoal(v);  saveLS('ld_weight_goal', v);  };

  const progressPct = useMemo(() => {
    const s = parseFloat(weightStart), g = parseFloat(weightGoal);
    if (!s || !g || s === g) return 0;
    const total = Math.abs(s - g);
    const done  = Math.abs(currentWeight - s);
    return Math.min(100, Math.round((done / total) * 100));
  }, [weightStart, weightGoal, currentWeight]);

  // ─── ЦИКЛ (только женщины) ───
  const [cycleLog,   setCycleLog]   = useState(() => parseLS('ld_cycle_log', []));
  const [cycleMood,  setCycleMood]  = useState('');
  const [cycleLen,   setCycleLen]   = useState(() => parseLS('ld_cycle_len', 28));

  const lastStart = useMemo(() =>
    [...cycleLog].filter(l => l.type === 'start').sort((a,b) => b.date.localeCompare(a.date))[0],
    [cycleLog]
  );
  const lastEnd = useMemo(() =>
    [...cycleLog].filter(l => l.type === 'end').sort((a,b) => b.date.localeCompare(a.date))[0],
    [cycleLog]
  );

  const cycleDay = useMemo(() => {
    if (!lastStart) return null;
    const diff = Math.ceil((new Date(today) - new Date(lastStart.date)) / 86400000) + 1;
    return diff > 0 ? diff : null;
  }, [lastStart, today]);

  const currentPhase = cycleDay ? getCyclePhase(cycleDay) : null;

  const markCycle = (type) => {
    const mood = cycleMood;
    const entry = { date: today, type, mood };
    const newLog = [...cycleLog.filter(l => !(l.date === today && l.type === type)), entry];
    setCycleLog(newLog);
    saveLS('ld_cycle_log', newLog);
    setCycleMood('');
  };

  // ─── ТРЕКЕР ───
  const defaultItems = useMemo(() => getDefaultTrackerItems(profile, element), [profile, element]);
  const [customItems,    setCustomItems]    = useState(() => parseLS('ld_health_tracker_custom', []));
  const [checkedItems,   setCheckedItems]   = useState(() => parseLS(`ld_health_tracker_${today}`, {}));
  const [newItemText,    setNewItemText]     = useState('');
  const [editingItemId,  setEditingItemId]   = useState(null);
  const [editingItemText,setEditingItemText] = useState('');

  const allItems = useMemo(() => [
    ...defaultItems,
    ...customItems,
  ], [defaultItems, customItems]);

  const toggleCheck = (id) => {
    const next = { ...checkedItems, [id]: !checkedItems[id] };
    setCheckedItems(next);
    saveLS(`ld_health_tracker_${today}`, next);
  };

  const addCustomItem = () => {
    if (!newItemText.trim()) return;
    const item = { id: `custom_${Date.now()}`, text: newItemText.trim(), category: 'личное' };
    const next = [...customItems, item];
    setCustomItems(next);
    saveLS('ld_health_tracker_custom', next);
    setNewItemText('');
  };

  const deleteItem = (id) => {
    const next = customItems.filter(i => i.id !== id);
    setCustomItems(next);
    saveLS('ld_health_tracker_custom', next);
  };

  const saveEdit = (id) => {
    const next = customItems.map(i => i.id === id ? { ...i, text: editingItemText } : i);
    setCustomItems(next);
    saveLS('ld_health_tracker_custom', next);
    setEditingItemId(null);
  };

  const doneCount  = allItems.filter(i => checkedItems[i.id]).length;
  const totalCount = allItems.length;

  // ─── ЖУРНАЛ РЕКОМЕНДАЦИЙ ───
  const [journal,     setJournal]     = useState(() => parseLS('ld_health_journal', []));
  const [journalNote, setJournalNote] = useState('');
  const [showJournal, setShowJournal] = useState(false);

  const addToJournal = useCallback((text, type = 'заметка') => {
    const entry = {
      id:   `j_${Date.now()}`,
      date: today,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      type,
      text,
    };
    const next = [entry, ...journal];
    setJournal(next);
    saveLS('ld_health_journal', next);
  }, [journal, today]);

  const deleteJournalEntry = (id) => {
    const next = journal.filter(e => e.id !== id);
    setJournal(next);
    saveLS('ld_health_journal', next);
  };

  // ─── ИИ МЕНЮ ───
  const [products,   setProducts]   = useState('');
  const [aiMenu,     setAiMenu]     = useState('');
  const [aiLoading,  setAiLoading]  = useState(false);

  const generateMenu = async () => {
    if (!products.trim()) return;
    setAiLoading(true);
    setAiMenu('');
    const system = `Ты — нутрициолог и специалист по ТКМ. Составь меню дня по принципам У-Син для стихии ${element}.
Учти:
- Стихия: ${element}, орган: ${uxin.organ}
- Нельзя: ${uxin.avoid}
- Необходимо: ${uxin.must}
- Тип питания: ${p.nutrition || 'обычное'}
- Цель: ${isWeightGoal ? 'снижение веса, калорийный дефицит ~300 ккал' : 'поддержание здоровья'}
- Пол: ${p.gender || 'не указан'}
Отвечай строго по структуре:
🌅 ЗАВТРАК: [блюдо] — [ккал] ккал. [1 предложение пользы]
☀️ ОБЕД: [блюдо] — [ккал] ккал. [1 предложение пользы]  
🌙 УЖИН: [блюдо] — [ккал] ккал. [1 предложение пользы]
🍎 ПЕРЕКУС: [вариант]
📊 ИТОГО: ~[сумма] ккал
💡 СОВЕТ по стихии ${element}: [1 предложение]`;
    try {
      const res  = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, user: `Продукты которые есть дома: ${products}`, maxTokens: 600 }),
      });
      const data = await res.json();
      const text = data.text || 'Не удалось составить меню.';
      setAiMenu(text);
      addToJournal(`МЕНЮ НА ДЕНЬ (продукты: ${products})\n\n${text}`, 'меню');
    } catch {
      setAiMenu('Ошибка соединения с ИИ.');
    }
    setAiLoading(false);
  };

  // ─── ПРОТОКОЛЫ — аккордеон ───
  const [expandedProto, setExpandedProto] = useState(null);

  const MERIDIAN_MAP = {
    'Печень': 'liver', 'Лёгкие': 'lungs', 'Толстый кишечник': 'intestines',
    'Желудок': 'stomach', 'Селезенка': 'spleen', 'Сердце': 'heart',
    'Тонкий кишечник': 'intestines', 'Мочевой пузырь': 'bladder',
    'Почки': 'kidneys', 'Перикард': 'heart', 'Сань Цзяо': 'spleen',
    'Желчный пузырь': 'liver',
  };

  const sortedBreathing = useMemo(() => {
    const list = [...BREATHING_TECHNIQUES];
    const filtered = breathSearch.trim()
      ? list.filter(t => (t.title+' '+t.short+' '+t.purpose).toLowerCase().includes(breathSearch.trim().toLowerCase()))
      : list;
    return filtered.sort((a,b) => {
      if (stress > 7 && a.id === 'wilunas') return -1;
      if (isWeightGoal && a.id === 'physical') return a.id === 'wilunas' ? 1 : -1;
      return 0;
    });
  }, [stress, isWeightGoal, breathSearch]);

  const filteredHormonalYoga = useMemo(() => {
    if (!yogaSearch.trim()) return HORMONAL_YOGA;
    const q = yogaSearch.trim().toLowerCase();
    return HORMONAL_YOGA.filter(p => (p.name+' '+p.sanskrit+' '+p.benefit+' '+p.phase).toLowerCase().includes(q));
  }, [yogaSearch]);

  // ─── ВКЛАДКИ ───
  const TABS = [
    { id: 'anatomy',         label: 'Анатомия' },
    { id: 'profile',         label: 'Досье' },
    { id: 'weight',          label: '⚖️ Вес и здоровье' },
    { id: 'recommendations', label: 'Рекомендации' },
    { id: 'breathing',       label: 'Дыхание' },
    { id: 'mental',          label: 'Mental' },
  ];

  const CATEGORY_COLORS = {
    питание:  '#0070c0',
    движение: '#2d6a4f',
    практика: '#c8a45a',
    режим:    '#8e44ad',
    личное:   '#7f8c8d',
  };

  return (
    <div style={{ padding: 20, background: 'var(--bg-paper)', minHeight: '100%', fontFamily: 'var(--font-main)', color: 'var(--text-main)' }}>
      <style>{`
        .h-tabs { display: flex; gap: 6px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 4px; }
        .h-tab { padding: 7px 13px; background: transparent; border: 1px solid var(--blue); color: var(--blue); border-radius: 4px; cursor: pointer; font-family: var(--font-mono); text-transform: uppercase; font-size: 10px; transition: 0.2s; flex-shrink: 0; }
        .h-tab.active { background: var(--blue); color: #fff; }
        .h-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px; }
        .h-card { background: #fff; border: 1px solid var(--blue); padding: 14px; border-radius: 6px; box-shadow: 0 2px 0 rgba(0,112,192,0.08); }
        .h-card h3 { font-family: 'Cinzel', serif; color: var(--gold); margin: 0 0 6px 0; font-size: 13px; }
        .h-card p { margin: 0; font-size: 12px; line-height: 1.4; color: #444; }
        .h-label { font-family: var(--font-mono); font-size: 9px; letter-spacing: 2px; color: var(--blue); text-transform: uppercase; margin-bottom: 8px; }
        .badge { display: inline-block; font-size: 9px; background: var(--blue); color: #fff; padding: 2px 5px; border-radius: 2px; }
        .badge.red { background: #d32f2f; } .badge.gold { background: var(--gold); color: #000; }
        .disclaimer { font-size: 10px; color: #888; margin-top: 6px; font-style: italic; }
        @media (max-width: 600px) { .h-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* Вкладки */}
      <div className="h-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`h-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ════ АНАТОМИЯ ════ */}
      {activeTab === 'anatomy' && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-head)', borderBottom: '2px solid var(--blue)', paddingBottom: 5, marginBottom: 14 }}>
            Интерактивная Анатомия
          </h2>
          <div style={{ background: 'rgba(0,112,192,0.05)', padding: 10, borderLeft: '3px solid var(--blue)', marginBottom: 15, fontSize: 12 }}>
            <strong>СЕЙЧАС АКТИВЕН:</strong> {timeData.currentMeridian.name} ({timeData.currentMeridian.h})
          </div>
          <AnatomyViewer
            activeOrganId={MERIDIAN_MAP[timeData.currentMeridian.name] || null}
            onSelect={d => setModalContent(ANATOMY_DATA[d.id] || {})}
          />
        </div>
      )}

      {/* ════ ДОСЬЕ ════ */}
      {activeTab === 'profile' && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-head)', borderBottom: '2px solid var(--blue)', paddingBottom: 5, marginBottom: 14 }}>
            Био-Энергетический Профиль
          </h2>
          <div className="h-grid">
            <div className="h-card">
              <h3>👤 Биокарта</h3>
              <p><b>{p.name || 'Пользователь'}</b></p>
              <p style={{ marginTop: 2 }}>Возраст: {age} лет {isWoman ? '· ♀' : '· ♂'}</p>
              <p style={{ marginTop: 2 }}>{getZodiac(dob)} · {getEasternYear(dob.getFullYear())}</p>
            </div>
            <div className="h-card">
              <h3>☯️ ТКМ Профиль</h3>
              <p>Стихия: <b>{element}</b></p>
              <p style={{ marginTop: 2 }}>Орган: <b>{uxin.organ}</b></p>
              <p style={{ marginTop: 2 }}>Баланс: <b>{healthData.yinyang}</b></p>
            </div>
            <div className="h-card">
              <h3>⏰ Хронотип</h3>
              <p>Тип: <b>{p.chronotype || 'Голубь'}</b></p>
              <p style={{ marginTop: 2 }}>Подъём: {p.wake || '08:00'} · Отбой: {p.sleep || '23:00'}</p>
            </div>
            <div className="h-card">
              <h3>⚡ Стресс</h3>
              <p>Уровень: <b style={{ color: stress > 7 ? '#d32f2f' : stress > 4 ? '#e6a800' : '#2e7d32' }}>{stress}/10</b></p>
              <button
                style={{ marginTop: 6, padding: '4px 10px', fontSize: 11, background: 'transparent', border: '1px solid var(--blue)', color: 'var(--blue)', borderRadius: 4, cursor: 'pointer' }}
                onClick={() => setActiveTab('breathing')}>
                Перейти в Дыхание →
              </button>
            </div>
            {p.chronic && (
              <div className="h-card">
                <h3>🏥 Хронические</h3>
                <p>{p.chronic}</p>
                <div className="disclaimer">⚠️ Только для информации</div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 16 }}>
            <div className="h-label">📊 Ежедневный Трекер</div>
            <HealthTracker compact={true} />
          </div>
        </div>
      )}

      {/* ════ ВЕС И ЗДОРОВЬЕ ════ */}
      {activeTab === 'weight' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontFamily: 'var(--font-head)', borderBottom: '2px solid var(--blue)', paddingBottom: 5, marginBottom: 4 }}>
            Вес и здоровье
          </h2>

          {/* БЛОК 1 — Цель и прогресс */}
          <div className="h-card">
            <div className="h-label">🎯 Моя цель</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
              {/* Стартовый вес */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>СТАРТОВЫЙ</div>
                {editingStart ? (
                  <div>
                    <input
                      type="number" placeholder="70.0" step="0.1"
                      style={{ width: '100%', padding: '6px', border: '1px solid #0070c0', borderRadius: 4, textAlign: 'center', fontSize: 16 }}
                      onBlur={e => { saveWeightStart(e.target.value); setEditingStart(false); }}
                      onChange={e => saveWeightStart(e.target.value)}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => setEditingStart(true)}
                    style={{ fontSize: 22, fontWeight: 700, color: '#0070c0', cursor: 'pointer' }}>
                    {weightStart || '—'} <span style={{ fontSize: 12 }}>кг</span>
                  </div>
                )}
              </div>

              {/* Текущий вес */}
              <div style={{ textAlign: 'center', borderLeft: '1px solid #eee', borderRight: '1px solid #eee' }}>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>СЕЙЧАС</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#2c241b' }}>
                  {currentWeight || '—'} <span style={{ fontSize: 12 }}>кг</span>
                </div>
              </div>

              {/* Целевой вес */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>ЦЕЛЬ</div>
                {editingGoal ? (
                  <input
                    type="number" placeholder="60.0" step="0.1"
                    style={{ width: '100%', padding: '6px', border: '1px solid #c8a45a', borderRadius: 4, textAlign: 'center', fontSize: 16 }}
                    onBlur={e => { saveWeightGoal(e.target.value); setEditingGoal(false); }}
                    onChange={e => saveWeightGoal(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <div
                    onClick={() => setEditingGoal(true)}
                    style={{ fontSize: 22, fontWeight: 700, color: '#c8a45a', cursor: 'pointer' }}>
                    {weightGoal || '—'} <span style={{ fontSize: 12 }}>кг</span>
                  </div>
                )}
              </div>
            </div>

            {/* Прогресс бар */}
            {weightStart && weightGoal && (
              <div>
                <div style={{ height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{
                    height: '100%', width: `${progressPct}%`,
                    background: 'linear-gradient(90deg, #0070c0, #c8a45a)',
                    borderRadius: 4, transition: 'width 0.5s',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888' }}>
                  <span>Прогресс: {progressPct}%</span>
                  <span>
                    Осталось: {Math.abs(currentWeight - parseFloat(weightGoal)).toFixed(1)} кг
                  </span>
                </div>
                {weightStart && weightGoal && currentWeight && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#0070c0', fontStyle: 'italic' }}>
                    💡 При дефиците 300 ккал/день цель достижима за ~{Math.round(Math.abs(currentWeight - parseFloat(weightGoal)) * 7700 / 300 / 7)} недель
                  </div>
                )}
              </div>
            )}
          </div>

          {/* БЛОК 2 — Трекер веса */}
          <div className="h-card">
            <div className="h-label">📈 Трекер веса</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input
                type="number" placeholder="Вес сегодня, кг" step="0.1"
                value={weightInput}
                onChange={e => setWeightInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveWeight()}
                style={{ flex: 1, padding: '8px 12px', border: '1px solid rgba(0,112,192,0.3)', borderRadius: 6, fontSize: 14 }}
              />
              <button
                onClick={saveWeight}
                style={{ padding: '8px 16px', background: '#0070c0', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Записать
              </button>
            </div>
            <WeightChart logs={weightLog} />
            {weightLog.length > 0 && (
              <div style={{ marginTop: 10, maxHeight: 120, overflowY: 'auto' }}>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 6, fontFamily: "'JetBrains Mono',monospace" }}>
                  ИСТОРИЯ
                </div>
                {[...weightLog].reverse().slice(0, 10).map((l, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '4px 0', borderBottom: '1px solid #f0f0f0', fontSize: 12,
                  }}>
                    <span style={{ color: '#888' }}>{localDateRu(l.date)}</span>
                    <span style={{ fontWeight: 600, color: '#0070c0' }}>{l.value} кг</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* БЛОК 3 — Месячный цикл (только женщины) */}
          {isWoman && (
            <div className="h-card" style={{ borderColor: '#e91e8c' }}>
              <div className="h-label" style={{ color: '#e91e8c' }}>🌸 Месячный цикл</div>

              {/* Длина цикла */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: '#888' }}>Длина цикла:</span>
                {[26,27,28,29,30,31,32].map(n => (
                  <div key={n}
                    onClick={() => { setCycleLen(n); saveLS('ld_cycle_len', n); }}
                    style={{
                      padding: '3px 8px', borderRadius: 10, cursor: 'pointer', fontSize: 11,
                      background: cycleLen === n ? '#e91e8c' : '#f5f5f5',
                      color: cycleLen === n ? '#fff' : '#888',
                    }}>{n}</div>
                ))}
              </div>

              {/* Текущий день и фаза */}
              {cycleDay && currentPhase && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8, marginBottom: 12,
                  background: currentPhase.colorBg,
                  border: `1px solid ${currentPhase.color}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: currentPhase.color, fontSize: 14 }}>
                      {currentPhase.emoji} {currentPhase.name}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#888' }}>
                      День {cycleDay} из {cycleLen}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#444', margin: 0, lineHeight: 1.5 }}>
                    {currentPhase.advice}
                  </p>
                </div>
              )}

              {/* Полоска дней */}
              <div style={{ display: 'flex', gap: 2, marginBottom: 12, flexWrap: 'wrap' }}>
                {Array.from({ length: cycleLen }, (_, i) => {
                  const d = i + 1;
                  const phase = getCyclePhase(d);
                  const isToday = d === cycleDay;
                  return (
                    <div key={d} style={{
                      width: 20, height: 20, borderRadius: 3,
                      background: isToday ? '#e91e8c' : phase.colorBg,
                      border: `1px solid ${isToday ? '#e91e8c' : phase.color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 7, color: isToday ? '#fff' : phase.color,
                    }}>{d}</div>
                  );
                })}
              </div>

              {/* Самочувствие */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>Самочувствие сегодня:</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[['😔','Плохо'],['😐','Норм'],['🙂','Хорошо'],['😄','Отлично'],['😴','Устала'],['😤','Раздражение'],['🥵','ПМС']].map(([emoji, label]) => (
                    <div key={label}
                      onClick={() => setCycleMood(cycleMood === label ? '' : label)}
                      style={{
                        padding: '5px 10px', borderRadius: 16, cursor: 'pointer', fontSize: 12,
                        background: cycleMood === label ? '#fce4ec' : '#f5f5f5',
                        border: `1px solid ${cycleMood === label ? '#e91e8c' : '#ddd'}`,
                      }}>
                      {emoji} {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Кнопки отметки */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => markCycle('start')}
                  style={{ flex: 1, padding: '8px', background: '#e91e8c', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  🔴 Начало цикла
                </button>
                <button
                  onClick={() => markCycle('end')}
                  style={{ flex: 1, padding: '8px', background: '#fff', color: '#e91e8c', border: '1px solid #e91e8c', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  ⬜ Конец цикла
                </button>
              </div>

              {/* История цикла */}
              {cycleLog.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 11, color: '#888' }}>
                  {lastStart && <div>Последнее начало: {localDateRu(lastStart.date)}{lastStart.mood ? ` · ${lastStart.mood}` : ''}</div>}
                  {lastEnd   && <div>Последний конец: {localDateRu(lastEnd.date)}</div>}
                </div>
              )}
            </div>
          )}

          {/* БЛОК 4 — План У-Син */}
          <div className="h-card" style={{ borderColor: uxin.color }}>
            <div className="h-label" style={{ color: uxin.color }}>
              🌿 ПЛАН КОРРЕКЦИИ — СТИХИЯ {element.toUpperCase()}
            </div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>
              Орган: <b>{uxin.organ}</b> · Эмоция-триггер: <b>{uxin.emotion}</b>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ padding: '8px 12px', background: '#fff8f8', border: '1px solid #ffcdd2', borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: '#c0392b', fontWeight: 700, marginBottom: 4 }}>🚫 ЧТО НЕЛЬЗЯ</div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>{uxin.avoid}</div>
              </div>
              <div style={{ padding: '8px 12px', background: '#f1f8e9', border: '1px solid #c5e1a5', borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: '#2d6a4f', fontWeight: 700, marginBottom: 4 }}>✅ ЧТО НЕОБХОДИМО</div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>{uxin.must}</div>
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(0,112,192,0.04)', border: '1px solid rgba(0,112,192,0.2)', borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: '#0070c0', fontWeight: 700, marginBottom: 4 }}>🥗 ПИТАНИЕ ПО СТИХИИ</div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>{uxin.foods}</div>
              </div>
              <div style={{ padding: '8px 12px', background: '#fafafa', border: '1px solid #eee', borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: '#8e44ad', fontWeight: 700, marginBottom: 4 }}>🔬 НОВЕЙШИЕ ИССЛЕДОВАНИЯ</div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>{uxin.research}</div>
              </div>
            </div>
          </div>

          {/* БЛОК 5 — ИИ-Меню */}
          <div className="h-card">
            <div className="h-label">🤖 ИИ-МЕНЮ НА ДЕНЬ</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
              Введите продукты, которые есть дома — ИИ составит меню по принципам стихии {element}
            </div>
            <textarea
              value={products}
              onChange={e => setProducts(e.target.value)}
              placeholder="Например: гречка, яйца, огурцы, курица, кефир, морковь, яблоко..."
              rows={3}
              style={{
                width: '100%', padding: '10px', border: '1px solid rgba(0,112,192,0.2)',
                borderRadius: 6, fontSize: 13, resize: 'vertical',
                outline: 'none', boxSizing: 'border-box', marginBottom: 10,
              }}
            />
            <button
              onClick={generateMenu}
              disabled={aiLoading || !products.trim()}
              style={{
                width: '100%', padding: '10px', background: aiLoading ? '#ccc' : '#0070c0',
                color: '#fff', border: 'none', borderRadius: 6, cursor: aiLoading ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 600,
              }}>
              {aiLoading ? '✦ Составляю меню...' : '✨ Составить меню'}
            </button>
            {aiMenu && (
              <div style={{
                marginTop: 14, padding: '12px 14px', background: 'rgba(0,112,192,0.03)',
                border: '1px solid rgba(0,112,192,0.15)', borderRadius: 8,
                fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap',
              }}>
                {aiMenu}
              </div>
            )}
          </div>

          {/* БЛОК 6 — Трекер рекомендаций */}
          <div className="h-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="h-label" style={{ margin: 0 }}>✅ ТРЕКЕР НА {today}</div>
              <div style={{ fontSize: 12, color: doneCount === totalCount ? '#2d6a4f' : '#888', fontWeight: 600 }}>
                {doneCount}/{totalCount}
              </div>
            </div>

            {/* Прогресс бар */}
            <div style={{ height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{
                height: '100%',
                width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%`,
                background: doneCount === totalCount ? '#2d6a4f' : '#0070c0',
                borderRadius: 3, transition: 'width 0.3s',
              }} />
            </div>

            {/* Пункты */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {allItems.map(item => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 6,
                  background: checkedItems[item.id] ? 'rgba(45,106,79,0.06)' : '#fafafa',
                  border: `1px solid ${checkedItems[item.id] ? '#c5e1a5' : '#eee'}`,
                }}>
                  {/* Чекбокс */}
                  <div onClick={() => toggleCheck(item.id)}
                    style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
                      border: `1.5px solid ${checkedItems[item.id] ? '#2d6a4f' : '#ccc'}`,
                      background: checkedItems[item.id] ? '#2d6a4f' : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    {checkedItems[item.id] && <span style={{ color: '#fff', fontSize: 11 }}>✓</span>}
                  </div>

                  {/* Текст */}
                  {editingItemId === item.id ? (
                    <input
                      value={editingItemText}
                      onChange={e => setEditingItemText(e.target.value)}
                      onBlur={() => saveEdit(item.id)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(item.id)}
                      autoFocus
                      style={{ flex: 1, border: '1px solid #0070c0', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}
                    />
                  ) : (
                    <span style={{
                      flex: 1, fontSize: 12,
                      textDecoration: checkedItems[item.id] ? 'line-through' : 'none',
                      color: checkedItems[item.id] ? '#aaa' : '#333',
                    }}>{item.text}</span>
                  )}

                  {/* Категория */}
                  <span style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 8,
                    background: `${CATEGORY_COLORS[item.category] || '#888'}15`,
                    color: CATEGORY_COLORS[item.category] || '#888',
                    border: `1px solid ${CATEGORY_COLORS[item.category] || '#888'}33`,
                    fontFamily: "'JetBrains Mono',monospace",
                  }}>{item.category}</span>

                  {/* Редактировать/удалить (только для кастомных) */}
                  {customItems.find(c => c.id === item.id) && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <span onClick={() => { setEditingItemId(item.id); setEditingItemText(item.text); }}
                        style={{ fontSize: 11, cursor: 'pointer', color: '#aaa' }}>✏️</span>
                      <span onClick={() => deleteItem(item.id)}
                        style={{ fontSize: 11, cursor: 'pointer', color: '#aaa' }}>✕</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Добавить пункт */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomItem()}
                placeholder="+ Добавить свой пункт..."
                style={{ flex: 1, padding: '7px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 12 }}
              />
              <button onClick={addCustomItem}
                style={{ padding: '7px 14px', background: '#0070c0', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                +
              </button>
            </div>
          </div>

          {/* БЛОК 7 — Протоколы */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="h-label">📚 ПРОТОКОЛЫ ДЛЯ ВАШЕГО ПРОФИЛЯ</div>

            <AccordionItem
              title="🫁 Дыхание для коррекции веса"
              isOpen={expandedProto === 'breath'}
              toggle={() => setExpandedProto(expandedProto === 'breath' ? null : 'breath')}
            >
              <p style={{ marginBottom: 8 }}><b>Рекомендовано для стихии {element}:</b> {uxin.breath}</p>
              <p style={{ marginBottom: 8 }}>Техника «Физическое дыхание» (Коррекция фигуры):</p>
              <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
                <li>Утром натощак, поза «Всадник»</li>
                <li>Вдох 2с → Задержка 2с → Выдох «Ба-ха» 5с</li>
                <li>10 циклов × 3 подхода</li>
                <li>Активирует метаболизм, массирует органы</li>
              </ul>
            </AccordionItem>

            <AccordionItem
              title={`🧘 Йога для стихии ${element}`}
              isOpen={expandedProto === 'yoga'}
              toggle={() => setExpandedProto(expandedProto === 'yoga' ? null : 'yoga')}
            >
              <p style={{ marginBottom: 8 }}><b>Рекомендованные позы:</b> {uxin.yoga}</p>
              <p style={{ marginBottom: 8 }}><b>Тип тренировки:</b> {uxin.exercise}</p>
              <p>Практикуйте 20–30 минут утром. Начните с разогрева (Сурья Намаскар × 3), затем специфические позы для вашей стихии, завершите Шавасаной.</p>
            </AccordionItem>

            {isWoman && (
              <AccordionItem
                title="🌸 Гормональная йога"
                isOpen={expandedProto === 'hormonal'}
                toggle={() => setExpandedProto(expandedProto === 'hormonal' ? null : 'hormonal')}
              >
                <p style={{ marginBottom: 10, color: '#8e44ad' }}>
                  Практика балансирует ФСГ/ЛГ, поддерживает щитовидную железу и надпочечники. 3–4 раза в неделю, 20–30 минут.
                </p>
                <input
                  type="text" value={yogaSearch} onChange={e=>setYogaSearch(e.target.value)}
                  placeholder="🔍 Поиск позы по названию или эффекту..."
                  style={{ width:'100%', boxSizing:'border-box', padding:'9px 11px', marginBottom:10,
                    border:'1.5px solid #f8bbd0', borderRadius:8, fontSize:12,
                    outline:'none', fontFamily:"'Crimson Pro',serif" }} />
                {filteredHormonalYoga.length===0 && (
                  <div style={{textAlign:'center',padding:'14px 0',color:'#999',fontStyle:'italic',fontSize:12}}>Ничего не найдено</div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredHormonalYoga.map((pose, i) => {
                    const isOpen = expandedPose === pose.name;
                    return (
                    <div key={i} onClick={()=>setExpandedPose(isOpen?null:pose.name)}
                      style={{ padding: '8px 10px', background: '#fce4ec', border: '1px solid #f8bbd0', borderRadius: 6, cursor:'pointer' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: '#880e4f', marginBottom: 2 }}>
                          {pose.name} <span style={{ fontStyle: 'italic', fontWeight: 400, color: '#c2185b', fontSize: 11 }}>({pose.sanskrit})</span>
                        </div>
                        <span style={{fontSize:13,color:'#880e4f'}}>{isOpen?'−':'+'}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#555', marginBottom: 2 }}>{pose.benefit}</div>
                      <div style={{ fontSize: 10, color: '#888' }}>⏱ {pose.time} · {pose.phase}</div>
                      {isOpen && (
                        <div onClick={e=>e.stopPropagation()} style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #f8bbd0' }}>
                          {(pose.image || pose.pose) && (
                            <div style={{ maxWidth: 220, margin: '0 auto 6px' }}>
                              {pose.image ? (
                                <img
                                  src={pose.image}
                                  alt={pose.name}
                                  loading="lazy"
                                  style={{ width:'100%', height:'auto', borderRadius:10, display:'block',
                                    border:'1px solid #f8bbd0' }}
                                  onError={(e)=>{ e.currentTarget.style.display='none'; const fb=e.currentTarget.nextSibling; if(fb) fb.style.display='block'; }}
                                />
                              ) : null}
                              <div style={{ display: pose.image ? 'none' : 'block' }}>
                                {pose.pose && <PoseIllustration pose={pose.pose} />}
                              </div>
                              {pose.image && pose.imageCredit && (
                                <div style={{ fontSize:9.5, color:'#aaa', textAlign:'center', marginTop:3 }}>
                                  Фото: {pose.imageCredit}
                                </div>
                              )}
                            </div>
                          )}
                          {pose.steps && (
                            <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, fontSize: 11.5, color: '#4a2030' }}>
                              {pose.steps.map((s,si) => <li key={si}>{s}</li>)}
                            </ol>
                          )}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </AccordionItem>
            )}

            <AccordionItem
              title="💪 Тренировки для коррекции веса"
              isOpen={expandedProto === 'training'}
              toggle={() => setExpandedProto(expandedProto === 'training' ? null : 'training')}
            >
              <p style={{ marginBottom: 8 }}><b>По вашему профилю ({element}):</b> {uxin.exercise}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  ['Пн / Чт', 'Силовая (45 мин)', 'Базовые упражнения, 3×12, умеренный вес'],
                  ['Вт / Пт', 'Кардио (30 мин)', 'Ходьба, плавание или велосипед — без перегрева'],
                  ['Ср', 'Йога + растяжка (40 мин)', 'Специфично для вашей стихии'],
                  ['Сб', 'Активный отдых', 'Прогулка в природе, подвижные игры'],
                  ['Вс', 'Полный отдых', 'Медитация, дыхательные практики'],
                ].map(([day, type, detail]) => (
                  <div key={day} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                    <span style={{ minWidth: 70, color: '#0070c0', fontFamily: "'JetBrains Mono',monospace", fontSize: 11 }}>{day}</span>
                    <span><b>{type}</b> — {detail}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, padding: '8px', background: '#fff3e0', borderRadius: 6, fontSize: 12, color: '#e65100' }}>
                ⚠️ Важно: при стрессе {'>'}7 исключите интенсивные тренировки — кортизол блокирует жиросжигание
              </div>
            </AccordionItem>

            <AccordionItem
              title="🔬 Новейшие исследования 2024–2025"
              isOpen={expandedProto === 'research'}
              toggle={() => setExpandedProto(expandedProto === 'research' ? null : 'research')}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { year: '2024', source: 'Nature Metabolism', finding: 'Интервальное голодание 16:8 снижает воспаление и улучшает метаболизм глюкозы у женщин среднего возраста', womenOnly: true },
                  { year: '2024', source: 'JAMA', finding: 'Силовые тренировки 2×/нед эффективнее кардио для долгосрочного снижения веса на 12+ месяцев' },
                  { year: '2024', source: 'Cell', finding: 'Микробиом кишечника напрямую влияет на аппетит — пробиотики Lactobacillus gasseri снижают висцеральный жир' },
                  { year: '2025', source: 'Frontiers in Endocrinology', finding: 'Магний (400 мг/день) снижает кортизол и ПМС у женщин с лютеиновым дефицитом', womenOnly: true },
                  { year: '2025', source: 'European Journal of Applied Physiology', finding: 'Силовые тренировки повышают уровень тестостерона и мышечную массу у мужчин старше 35 при дефиците сна', menOnly: true },
                  { year: '2025', source: 'ТКМ + современная наука', finding: `Стихия ${element}: ${uxin.research}` },
                ].filter(r => (isWoman ? !r.menOnly : !r.womenOnly)).map((r, i) => (
                  <div key={i} style={{ padding: '8px 10px', background: '#f9f9f9', border: '1px solid #eee', borderRadius: 6 }}>
                    <div style={{ fontSize: 10, color: '#0070c0', fontFamily: "'JetBrains Mono',monospace", marginBottom: 3 }}>
                      {r.year} · {r.source}
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.5 }}>{r.finding}</div>
                  </div>
                ))}
              </div>
            </AccordionItem>
          </div>

          {/* БЛОК 8 — Журнал рекомендаций */}
          <div className="h-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="h-label" style={{ margin: 0 }}>📓 ЖУРНАЛ РЕКОМЕНДАЦИЙ</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#888' }}>{journal.length} записей</span>
                <button
                  onClick={() => setShowJournal(v => !v)}
                  style={{ padding: '4px 10px', fontSize: 11, background: 'transparent', border: '1px solid var(--blue)', color: 'var(--blue)', borderRadius: 4, cursor: 'pointer' }}>
                  {showJournal ? 'Свернуть' : 'Показать'}
                </button>
              </div>
            </div>

            {/* Добавить заметку вручную */}
            <div style={{ display: 'flex', gap: 8, marginBottom: showJournal ? 14 : 0 }}>
              <input
                value={journalNote}
                onChange={e => setJournalNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && journalNote.trim() && (addToJournal(journalNote, 'заметка'), setJournalNote(''))}
                placeholder="Добавить заметку в журнал..."
                style={{ flex: 1, padding: '7px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 12 }}
              />
              <button
                onClick={() => { if (journalNote.trim()) { addToJournal(journalNote, 'заметка'); setJournalNote(''); } }}
                style={{ padding: '7px 14px', background: '#0070c0', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                +
              </button>
            </div>

            {/* Записи журнала */}
            {showJournal && (
              <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {journal.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#aaa', fontSize: 12, padding: '20px 0' }}>
                    Журнал пуст. Меню и заметки сохраняются автоматически.
                  </div>
                )}
                {journal.map(entry => {
                  const typeColors = {
                    'меню':    { bg: 'rgba(0,112,192,0.05)', border: 'rgba(0,112,192,0.2)', label: '🍽 МЕНЮ', color: '#0070c0' },
                    'заметка': { bg: 'rgba(200,164,90,0.05)', border: 'rgba(200,164,90,0.25)', label: '📝 ЗАМЕТКА', color: '#c8a45a' },
                    'план':    { bg: 'rgba(45,106,79,0.05)', border: 'rgba(45,106,79,0.2)', label: '📋 ПЛАН', color: '#2d6a4f' },
                  };
                  const tc = typeColors[entry.type] || typeColors['заметка'];
                  return (
                    <div key={entry.id} style={{
                      padding: '10px 12px',
                      background: tc.bg,
                      border: `1px solid ${tc.border}`,
                      borderRadius: 8,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{
                            fontSize: 9, padding: '2px 6px', borderRadius: 4,
                            background: tc.border, color: tc.color,
                            fontFamily: "'JetBrains Mono',monospace", fontWeight: 700,
                          }}>{tc.label}</span>
                          <span style={{ fontSize: 11, color: '#888', fontFamily: "'JetBrains Mono',monospace" }}>
                            {localDateRu(entry.date)} · {entry.time}
                          </span>
                        </div>
                        <span onClick={() => deleteJournalEntry(entry.id)}
                          style={{ fontSize: 12, color: '#ccc', cursor: 'pointer' }}>✕</span>
                      </div>
                      <div style={{
                        fontSize: 12, lineHeight: 1.6, color: '#333',
                        whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto',
                      }}>
                        {entry.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════ РЕКОМЕНДАЦИИ ════ */}
      {activeTab === 'recommendations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 style={{ fontFamily: 'var(--font-head)', borderBottom: '2px solid var(--blue)', paddingBottom: 5 }}>
            Персональные Рекомендации
          </h2>

          {/* ── Мои задачи по здоровью ── */}
          <div style={{ background:'#fff', border:'1px solid var(--blue)', borderRadius:8, padding:'12px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: healthTasks.length?10:0 }}>
              <span style={{ fontWeight:600, color:'var(--blue)', fontSize:14 }}>📋 Мои задачи по здоровью</span>
              <button onClick={()=>setHealthTaskModal('new')}
                style={{ padding:'6px 12px', borderRadius:8, cursor:'pointer',
                  border:'1px solid var(--blue)', background:'transparent', color:'var(--blue)',
                  fontSize:12, fontWeight:600 }}>
                + Добавить
              </button>
            </div>
            {healthTasks.length===0 && (
              <div style={{ fontSize:12.5, color:'#888', fontStyle:'italic' }}>
                Нет задач. Добавь — попадёт в Расписание и Сегодня, с датой/временем и напоминанием.
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {healthTasks.map(t => {
                const done = t.doneDate === today;
                const dateLabel = t.dueDate || (t.deadline ? t.deadline.split('T')[0] : null);
                return (
                  <div key={t.id} style={{ display:'flex', alignItems:'center', gap:8,
                    padding:'8px 10px', borderRadius:8, background:'rgba(0,112,192,0.04)' }}>
                    <div onClick={()=>toggleHealthTaskDone(t)} style={{ cursor:'pointer', fontSize:16,
                      color: done?'#2d6a4f':'#bbb', flexShrink:0 }}>
                      {done?'✅':'⬜'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }} onClick={()=>setHealthTaskModal(t)}>
                      <div style={{ fontSize:13.5, color: done?'#999':'#222', textDecoration: done?'line-through':'none',
                        cursor:'pointer', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {t.title}
                      </div>
                      <div style={{ fontSize:10.5, color:'#888' }}>
                        {t.preferredTime && `🕒 ${t.preferredTime} `}
                        {dateLabel && `📅 ${dateLabel} `}
                        {t.freq && t.freq!=='once' && `🔁 ${t.freq}`}
                      </div>
                    </div>
                    {!done && (dateLabel || t.preferredTime) && (
                      <button onClick={()=>openGoogleCalendar(t.title, dateLabel||today, t.preferredTime, t.notes||'')}
                        title="Добавить в Google Calendar"
                        style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, flexShrink:0, opacity:0.65 }}>
                        📆
                      </button>
                    )}
                    <button onClick={()=>deleteHealthTask(t.id)} title="Удалить"
                      style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, flexShrink:0, opacity:0.4 }}>
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <AccordionItem title="🥗 Питание по стихии" isOpen={expandedRec === 'diet'} toggle={() => setExpandedRec(expandedRec === 'diet' ? null : 'diet')}>
            <p><b>Рекомендуемые продукты:</b> {ELEMENT_NUTRITION[element]?.foods}</p>
            <p style={{ marginTop: 6 }}><b>Ограничить:</b> {ELEMENT_NUTRITION[element]?.avoid}</p>
            {isWeightGoal && <p style={{ marginTop: 8, color: '#d32f2f' }}>🔥 Цель коррекции веса: исключите сладкое после 16:00</p>}
          </AccordionItem>
          <AccordionItem title="🕒 Режим дня" isOpen={expandedRec === 'chrono'} toggle={() => setExpandedRec(expandedRec === 'chrono' ? null : 'chrono')}>
            {CHRONO_ADVICE[p.chronotype] && Object.entries(CHRONO_ADVICE[p.chronotype]).map(([k,v]) => (
              <p key={k}><b>{k}:</b> {v}</p>
            ))}
          </AccordionItem>
          <AccordionItem title="🏃 Физическая активность" isOpen={expandedRec === 'activity'} toggle={() => setExpandedRec(expandedRec === 'activity' ? null : 'activity')}>
            <p>{ACTIVITY_ADVICE[p.activityLevel] || 'Рекомендуется умеренная активность.'}</p>
          </AccordionItem>
          <AccordionItem title="⚡ Источник энергии" isOpen={expandedRec === 'energy'} toggle={() => setExpandedRec(expandedRec === 'energy' ? null : 'energy')}>
            <p><b>Источник:</b> {p.energySource || 'Баланс'}</p>
            <p style={{ marginTop: 4 }}>{ENERGY_RECOVERY[p.energySource] || 'Чередуйте активность и покой.'}</p>
          </AccordionItem>
        </div>
      )}

      {/* ════ ДЫХАНИЕ ════ */}
      {activeTab === 'breathing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 style={{ fontFamily: 'var(--font-head)', borderBottom: '2px solid var(--blue)', paddingBottom: 5 }}>
            Дыхательные Протоколы
          </h2>
          <input
            type="text" value={breathSearch} onChange={e=>setBreathSearch(e.target.value)}
            placeholder="🔍 Поиск по названию или цели..."
            style={{ padding:'10px 12px', border:'1.5px solid var(--blue)', borderRadius:8,
              fontSize:13, outline:'none', fontFamily:"'Crimson Pro',serif" }} />
          {sortedBreathing.length===0 && (
            <div style={{textAlign:'center',padding:'20px 0',color:'#888',fontStyle:'italic'}}>Ничего не найдено</div>
          )}
          {sortedBreathing.map(tech => {
            const isEmergency   = stress > 7 && tech.id === 'wilunas';
            const isRecommended = isWeightGoal && tech.id === 'physical';
            const isOpen        = expandedBreath === tech.id;
            return (
              <div key={tech.id} style={{ background: '#fff', border: `1px solid ${isEmergency ? '#d32f2f' : 'var(--blue)'}`, borderRadius: 6, overflow: 'hidden' }}>
                <div onClick={() => setExpandedBreath(isOpen ? null : tech.id)}
                  style={{ padding: '12px 15px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isOpen ? 'rgba(0,112,192,0.04)' : '#fff' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--blue)', display: 'block', fontSize: 13 }}>{tech.title}</span>
                    <span style={{ fontSize: 11, color: '#666' }}>{tech.short}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isEmergency   && <span className="badge red">Экстренно</span>}
                    {isRecommended && <span className="badge gold">Рекомендовано</span>}
                    <span style={{ fontSize: 16, color: 'var(--blue)' }}>{isOpen ? '−' : '+'}</span>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ padding: 15, borderTop: '1px solid #eee', background: '#fff', fontSize: 13, lineHeight: 1.6 }}>
                    <div><b>Для чего:</b> {tech.purpose}</div>
                    <div><b>Что даёт:</b> {tech.effect}</div>
                    <div style={{ margin: '10px 0' }}>
                      <BreathingDiagram technique={tech.technique} />
                    </div>
                    {tech.steps && (
                      <div style={{ marginTop: 8 }}>
                        <b>Пошагово:</b>
                        <ol style={{ margin: '6px 0 0', paddingLeft: 20, lineHeight: 1.7 }}>
                          {tech.steps.map((s,i) => <li key={i}>{s}</li>)}
                        </ol>
                      </div>
                    )}
                    <div style={{ marginTop: 10 }}>
                      <BreathingTimer technique={tech.technique} onFinish={() => setExpandedBreath(null)} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ════ MENTAL ════ */}
      {activeTab === 'mental' && (
        <div className="h-grid">
          <div className="h-card">
            <h3>🌀 У-Син Паттерн</h3>
            <p style={{ fontWeight: 700, color: 'var(--blue)', fontSize: 13 }}>{healthData.uxinPattern?.toUpperCase()}</p>
            <p>Доминанта: {element}. {uxin.emotion}</p>
          </div>
          <div className="h-card">
            <h3>🤝 Стихии и отношения</h3>
            <p><b>Порождение:</b> комфорт в диалоге</p>
            <p style={{ marginTop: 4 }}><b>Контроль:</b> требует границ</p>
          </div>
          <div className="h-card">
            <h3>📅 Эмоциональный календарь</h3>
            {Object.values(ANATOMY_DATA).slice(0,3).map(o => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ddd', padding: '4px 0', fontSize: 11 }}>
                <span>{o.name}</span><span>→ {o.emotion || 'Напряжение'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {modalContent && (
        <ModalDetail
          isOpen={!!modalContent} onClose={() => setModalContent(null)}
          title={modalContent.title} description={modalContent.desc}
          warning={modalContent.warning} rules={modalContent.rules} benefit={modalContent.benefit}
        />
      )}

      {healthTaskModal && (
        <TaskModal
          task={healthTaskModal==='new' ? null : healthTaskModal}
          defaultSection="health"
          onSave={saveHealthTask}
          onClose={()=>setHealthTaskModal(null)}
        />
      )}
    </div>
  );
                    }
