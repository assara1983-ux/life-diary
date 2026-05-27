// src/components/work/ToolsHub.jsx
import { useState } from 'react';
import { EnhancedKanban } from './tools/EnhancedKanban';
import { FocusMode } from './tools/FocusMode';
import { TaxAssistant } from './tools/TaxAssistant';
import { TaxRegimesComparison } from './tools/TaxRegimesComparison';
import { LateralThinking } from './tools/LateralThinking';
import { DecisionHub } from './tools/DecisionHub';
import { VEDAssistant } from './tools/VEDAssistant';
import { DocumentTemplates } from './tools/DocumentTemplates';
import { AccountantNewsFeed } from './tools/AccountantNewsFeed';
import { AkashaLedger } from './tools/AkashaLedger';
import { FractalMindAccountant } from './tools/FractalMindAccountant';
import { EchoLedgerNeuralSymphony } from './tools/EchoLedgerNeuralSymphony';
import { RecursiveSoulIndex } from './tools/RecursiveSoulIndex';
import { HotkeysGuide } from './tools/HotkeysGuide';

const TOOLS = [
  {
    id: 'kanban',
    icon: '🗂',
    title: 'Канбан Эхо',
    subtitle: 'Управление задачами',
    category: 'tasks',
    component: EnhancedKanban,
  },
  {
    id: 'focus',
    icon: '⏱',
    title: 'Focus Mode',
    subtitle: 'Таймер глубокой работы',
    category: 'tasks',
    component: FocusMode,
  },
  {
    id: 'tax',
    icon: '🤖',
    title: 'Налоговый ИИ',
    subtitle: 'Консультант по налогам РК',
    category: 'ai',
    component: TaxAssistant,
  },
  {
    id: 'regimes',
    icon: '⚖️',
    title: 'Налоговые режимы',
    subtitle: 'Сравнение и расчёт',
    category: 'analytics',
    component: TaxRegimesComparison,
  },
  {
    id: 'lateral',
    icon: '🌀',
    title: 'Нестандартное мышление',
    subtitle: 'Промпты для новых идей',
    category: 'ai',
    component: LateralThinking,
  },
  {
    id: 'decision',
    icon: '🧭',
    title: 'Хаб решений',
    subtitle: 'Фреймворки принятия решений',
    category: 'ai',
    component: DecisionHub,
  },
  {
    id: 'ved',
    icon: '🌐',
    title: 'ВЭД Ассистент',
    subtitle: 'Incoterms • ТН ВЭД • Экспорт',
    category: 'ai',
    component: VEDAssistant,
  },
  {
    id: 'docs',
    icon: '📄',
    title: 'Шаблоны документов',
    subtitle: 'Акты и приказы',
    category: 'docs',
    component: DocumentTemplates,
  },
  {
    id: 'news',
    icon: '📊',
    title: 'Бухгалтерский дашборд',
    subtitle: 'Новости • Аналитика • Отчёты',
    category: 'analytics',
    component: AccountantNewsFeed,
  },
  {
    id: 'akasha',
    icon: '🗃',
    title: 'Акаша Леджер',
    subtitle: 'Умный архив документов',
    category: 'docs',
    component: AkashaLedger,
  },
  {
    id: 'fractal',
    icon: '🔮',
    title: 'Фрактальный ум',
    subtitle: 'Визуализация финансовых потоков',
    category: 'analytics',
    component: FractalMindAccountant,
  },
  {
    id: 'echo',
    icon: '🎵',
    title: 'Echo Ledger',
    subtitle: 'Neural Symphony • Фокус через звук',
    category: 'focus',
    component: EchoLedgerNeuralSymphony,
  },
  {
    id: 'soul',
    icon: '✨',
    title: 'Recursive Soul Index',
    subtitle: 'Рефлексия и инсайты',
    category: 'focus',
    component: RecursiveSoulIndex,
  },
  {
    id: 'hotkeys',
    icon: '⌨️',
    title: 'Автоматизация',
    subtitle: 'Клавиши • Макросы • 1С • SharePoint',
    category: 'docs',
    component: HotkeysGuide,
  },
];

const CATEGORY_COLORS = {
  tasks:     { bg: 'rgba(0,112,192,0.15)',    border: 'rgba(0,112,192,0.4)',    label: 'Задачи' },
  ai:        { bg: 'rgba(168,85,247,0.12)',   border: 'rgba(168,85,247,0.4)',   label: 'ИИ' },
  analytics: { bg: 'rgba(34,197,94,0.1)',     border: 'rgba(34,197,94,0.35)',   label: 'Аналитика' },
  docs:      { bg: 'rgba(200,164,90,0.12)',   border: 'rgba(200,164,90,0.4)',   label: 'Документы' },
  focus:     { bg: 'rgba(249,115,22,0.1)',    border: 'rgba(249,115,22,0.35)',  label: 'Концентрация' },
};

// Мистический SVG фон
function MysticBackground() {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.18 }} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      {/* Гексагоны */}
      {[[60,60],[340,60],[60,240],[340,240],[200,150]].map(([cx,cy],i) => (
        <polygon key={i}
          points={Array.from({length:6},(_,k)=>`${cx+28*Math.cos(k*Math.PI/3-Math.PI/6)},${cy+28*Math.sin(k*Math.PI/3-Math.PI/6)}`).join(' ')}
          fill="none" stroke="rgba(200,164,90,0.6)" strokeWidth="0.8"
        >
          <animate attributeName="opacity" values="0.3;0.7;0.3" dur={`${3+i*0.7}s`} repeatCount="indefinite" />
        </polygon>
      ))}
      {/* Линии сакральной геометрии */}
      <line x1="60" y1="60" x2="340" y2="240" stroke="rgba(200,164,90,0.3)" strokeWidth="0.5" />
      <line x1="340" y1="60" x2="60" y2="240" stroke="rgba(200,164,90,0.3)" strokeWidth="0.5" />
      <circle cx="200" cy="150" r="80" fill="none" stroke="rgba(0,112,192,0.3)" strokeWidth="0.6" />
      <circle cx="200" cy="150" r="50" fill="none" stroke="rgba(200,164,90,0.2)" strokeWidth="0.5" />
      {/* Частицы */}
      {[[80,40],[320,80],[150,260],[260,30],[100,200]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="2" fill="rgba(200,164,90,0.8)">
          <animate attributeName="opacity" values="0;1;0" dur={`${2+i*0.4}s`} begin={`${i*0.3}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

export function ToolsHub() {
  const [activeTool, setActiveTool] = useState(null);

  const tool = TOOLS.find(t => t.id === activeTool);

  // ─── Полноэкранный режим инструмента ───
  if (tool) {
    const ToolComponent = tool.component;
    return (
      <div style={{ position: 'relative' }}>
        {/* Кнопка Назад */}
        <div
          onClick={() => setActiveTool(null)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            marginBottom: 16,
            background: 'rgba(200,164,90,0.1)',
            border: '1px solid rgba(200,164,90,0.3)',
            borderRadius: 20,
            cursor: 'pointer',
            fontSize: 13,
            color: 'rgba(200,164,90,0.9)',
            fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: 1,
          }}
        >
          ← ИНСТРУМЕНТЫ
        </div>
        <ToolComponent />
      </div>
    );
  }

  // ─── Главная сетка карточек ───
  return (
    <div>
      {/* Заголовок с мистическим фоном */}
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        marginBottom: 20,
        padding: '24px 20px',
        background: 'linear-gradient(135deg, #0a0f1e 0%, #050810 100%)',
        border: '1px solid rgba(200,164,90,0.25)',
        minHeight: 120,
      }}>
        <MysticBackground />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{
            fontSize: 11,
            fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: 4,
            color: 'rgba(200,164,90,0.6)',
            marginBottom: 8,
          }}>РАБОЧЕЕ ПРОСТРАНСТВО</div>
          <div style={{
            fontSize: 22,
            fontFamily: "'Cormorant Infant',serif",
            background: 'linear-gradient(90deg, #c8a45a, #f0d080, #c8a45a)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: 2,
          }}>Инструменты Бухгалтера</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
            {TOOLS.length} инструментов · выберите для открытия
          </div>
        </div>
      </div>

      {/* Сетка карточек */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 12,
      }}>
        {TOOLS.map(tool => {
          const cat = CATEGORY_COLORS[tool.category];
          return (
            <div
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '18px 14px',
                background: `linear-gradient(135deg, ${cat.bg}, rgba(5,8,16,0.8))`,
                border: `1px solid ${cat.border}`,
                borderRadius: 14,
                cursor: 'pointer',
                transition: 'all 0.2s',
                backdropFilter: 'blur(8px)',
                textAlign: 'center',
              }}
            >
              {/* Мини-свечение */}
              <div style={{
                position: 'absolute',
                top: -20, left: '50%',
                transform: 'translateX(-50%)',
                width: 60, height: 60,
                borderRadius: '50%',
                background: cat.border,
                filter: 'blur(20px)',
                opacity: 0.3,
                pointerEvents: 'none',
              }} />

              <div style={{ fontSize: 28, marginBottom: 8, position: 'relative', zIndex: 1 }}>
                {tool.icon}
              </div>
              <div style={{
                fontSize: 13,
                fontFamily: "'Cormorant Infant',serif",
                color: 'rgba(255,255,255,0.9)',
                marginBottom: 4,
                fontWeight: 600,
                lineHeight: 1.3,
                position: 'relative', zIndex: 1,
              }}>
                {tool.title}
              </div>
              <div style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.4,
                position: 'relative', zIndex: 1,
              }}>
                {tool.subtitle}
              </div>

              {/* Категория */}
              <div style={{
                marginTop: 10,
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: 20,
                fontSize: 9,
                fontFamily: "'JetBrains Mono',monospace",
                letterSpacing: 1,
                background: cat.bg,
                color: cat.border,
                border: `1px solid ${cat.border}`,
                position: 'relative', zIndex: 1,
              }}>
                {cat.label.toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
