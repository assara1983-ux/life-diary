// src/sections/MentalSection.jsx
import React, { useState } from 'react';
import { useApp } from '../store/AppContext';

// Компонент карточки практики с аккордеоном
function PracticeCard({ title, duration, icon, description, details }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="card" style={{ marginBottom: '12px', overflow: 'hidden' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>{icon}</span>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: '14px', color: 'var(--text1)' }}>{title}</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{duration}</div>
          </div>
        </div>
        <span style={{ color: 'var(--gold)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: '0.3s' }}>▼</span>
      </div>

      {/* Раскрывающаяся часть */}
      {isOpen && (
        <div style={{ padding: '12px 0 0 0', borderTop: '1px solid var(--line-s)', marginTop: '12px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.5', marginBottom: '8px' }}>
            {description}
          </div>
          <div style={{ background: 'var(--bg1)', padding: '10px', borderRadius: '6px', fontSize: '12px', color: 'var(--blue)' }}>
            <strong>Что даёт:</strong> {details}
          </div>
        </div>
      )}
    </div>
  );
}

export function MentalSection() {
  const { profile } = useApp();
  
  // Список практик (можно расширять)
  const practices = [
    {
      id: 1,
      title: 'Дыхание Сам Чон До',
      duration: '5 минут',
      icon: '🌬️',
      description: 'Базовая техника гармонизации. Вдох носом (3с) → Выдох ртом (6с). Выполняется с прямой спиной.',
      details: 'Снижает тревожность, выравнивает пульс, подготавливает ум к медитации. Универсальная практика для любого состояния.'
    },
    {
      id: 2,
      title: '6 Целительных Звуков',
      duration: '10 минут',
      icon: '🔊',
      description: 'Тибетская практика очищения органов через звук. Звуки: С-С-С (легкие), Ч-У-Э-Й (почки), Ш-Ш-Ш (печень)...',
      details: 'Вибрационное воздействие на внутренние органы. Снимает застой энергии, улучшает работу иммунитета, эмоциональную разгрузку.'
    },
    {
      id: 3,
      title: 'Настрой Норбекова',
      duration: '7 минут',
      icon: '✨',
      description: 'Психогимнастика. Создание внутреннего образа молодости и здоровья через воображение и мимику.',
      details: 'Мощный выброс эндорфинов. Улучшает настроение, запускает процессы самовосстановления организма на клеточном уровне.'
    },
    {
      id: 4,
      title: 'Рыдающее дыхание (Вилунас)',
      duration: '3 минуты',
      icon: '😤',
      description: 'Экстренная помощь при стрессе. Имитация рыдания: вдох ртом → выдох со звуком "с-с-с" → пауза.',
      details: 'Мгновенное снятие спазмов, снижение давления, вывод токсинов. Рекомендуется при сильном переутомлении или гневе.'
    }
  ];

  return (
    <div className="page">
      <div className="sec-lbl">◈ ПРАКТИКИ ДЛЯ ТЕБЯ</div>
      
      {/* Блок рекомендаций */}
      <div className="ai-box" style={{ marginBottom: '20px' }}>
        <div className="ai-label">💡 СОВЕТ ДНЯ</div>
        <div className="ai-text">
          {profile?.stressLevel > 7 
            ? 'У тебя высокий уровень стресса. Начни с «Рыдающего дыхания» (3 мин), чтобы сбросить напряжение, затем переходи к «Сам Чон До».'
            : 'Твоё состояние стабильно. Идеальное время для «6 Целительных Звуков» — это укрепит здоровье и предотвратит болезни.'}
        </div>
      </div>

      {/* Список практик */}
      {practices.map(p => (
        <PracticeCard key={p.id} {...p} />
      ))}
    </div>
  );
}
