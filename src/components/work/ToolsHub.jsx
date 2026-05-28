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
import { FractalMindAccountant } from './tools/FractalMindAccountant';
import { EchoLedgerNeuralSymphony } from './tools/EchoLedgerNeuralSymphony';
import { HotkeysGuide } from './tools/HotkeysGuide';

// ✅ Скрытые инструменты: AccountantNewsFeed, AkashaLedger, RecursiveSoulIndex
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
    id: 'hotkeys',
    icon: '⌨️',
    title: 'Автоматизация',
    subtitle: 'Клавиши • Макросы • 1С • SharePoint',
    category: 'docs',
    component: HotkeysGuide,
  },
];

const CATEGORY_COLORS = {
  tasks:     { bg: 'rgba(0,112,192,0.08)',   border: 'rgba(0,112,192,0.25)',   label: 'Задачи',       accent: '#0070c0' },
  ai:        { bg: 'rgba(168,85,247,0.07)',  border: 'rgba(168,85,247,0.25)',  label: 'ИИ',           accent: '#a855f7' },
  analytics: { bg: 'rgba(34,197,94,0.07)',   border: 'rgba(34,197,94,0.25)',   label: 'Аналитика',    accent: '#22c55e' },
  docs:      { bg: 'rgba(200,164,90,0.08)',  border: 'rgba(200,164,90,0.25)',  label: 'Документы',    accent: '#c8a45a' },
  focus:     { bg: 'rgba(249,115,22,0.07)',  border: 'rgba(249,115,22,0.25)', label: 'Концентрация', accent: '#f97316' },
};

export function ToolsHub() {
  const [activeTool, setActiveTool] = useState(null);

  const tool = TOOLS.find(t => t.id === activeTool);

  // ─── Открытый инструмент ───
  if (tool) {
    const ToolComponent = tool.component;
    const cat = CATEGORY_COLORS[tool.category];
    return (
      <div>
        {/* Кнопка Назад */}
        <div
          onClick={() => setActiveTool(null)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '7px 16px', marginBottom: 20,
            background: 'rgba(0,112,192,0.06)',
            border: '1px solid rgba(0,112,192,0.2)',
            borderRadius: 20, cursor: 'pointer',
            fontSize: 12, color: 'var(--text2)',
            fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1,
            transition: 'all 0.15s',
          }}
        >
          ← ИНСТРУМЕНТЫ
        </div>

        {/* Заголовок инструмента */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', marginBottom: 20,
          background: cat.bg,
          border: `1px solid ${cat.border}`,
          borderRadius: 12,
        }}>
          <span style={{ fontSize: 24 }}>{tool.icon}</span>
          <div>
            <div style={{
              fontSize: 16, fontWeight: 600, color: 'var(--text0)',
              fontFamily: "'Cormorant Infant',serif",
            }}>{tool.title}</div>
            <div style={{
              fontSize: 11, color: 'var(--text3)',
              fontFamily: "'JetBrains Mono',monospace",
            }}>{tool.subtitle}</div>
          </div>
          <div style={{
            marginLeft: 'auto',
            padding: '3px 10px', borderRadius: 10,
            fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: 1, background: cat.bg,
            color: cat.accent, border: `1px solid ${cat.border}`,
          }}>
            {cat.label.toUpperCase()}
          </div>
        </div>

        <ToolComponent />
      </div>
    );
  }

  // ─── Сетка карточек — основная стилистика приложения ───
  return (
    <div>
      {/* Заголовок */}
      <div style={{
        padding: '16px 18px', marginBottom: 20,
        background: 'rgba(0,112,192,0.04)',
        border: '1px solid rgba(0,112,192,0.15)',
        borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: 3, color: 'var(--text3)', marginBottom: 4,
          }}>РАБОЧЕЕ ПРОСТРАНСТВО</div>
          <div style={{
            fontSize: 18, fontFamily: "'Cormorant Infant',serif",
            color: 'var(--text0)',
          }}>Инструменты Бухгалтера</div>
        </div>
        <div style={{
          fontSize: 11, color: 'var(--text3)',
          fontFamily: "'JetBrains Mono',monospace",
          background: 'rgba(0,112,192,0.08)',
          border: '1px solid rgba(0,112,192,0.15)',
          borderRadius: 8, padding: '4px 10px',
        }}>
          {TOOLS.length} инструментов
        </div>
      </div>

      {/* Сетка карточек */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
        gap: 10,
      }}>
        {TOOLS.map(t => {
          const cat = CATEGORY_COLORS[t.category];
          return (
            <div
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              style={{
                padding: '16px 12px',
                background: 'var(--bg, rgba(255,255,255,0.98))',
                border: `1px solid ${cat.border}`,
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.18s',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Цветная полоска сверху */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                height: 3, background: cat.accent, borderRadius: '12px 12px 0 0',
                opacity: 0.7,
              }} />

              <div style={{ fontSize: 26, marginBottom: 8, marginTop: 4 }}>
                {t.icon}
              </div>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: 'var(--text0)',
                marginBottom: 4, lineHeight: 1.3,
                fontFamily: "'Cormorant Infant',serif",
              }}>
                {t.title}
              </div>
              <div style={{
                fontSize: 10, color: 'var(--text3)',
                lineHeight: 1.4, marginBottom: 10,
              }}>
                {t.subtitle}
              </div>

              {/* Категория */}
              <div style={{
                display: 'inline-block',
                padding: '2px 8px', borderRadius: 10,
                fontSize: 9, fontFamily: "'JetBrains Mono',monospace",
                letterSpacing: 1,
                background: cat.bg,
                color: cat.accent,
                border: `1px solid ${cat.border}`,
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
