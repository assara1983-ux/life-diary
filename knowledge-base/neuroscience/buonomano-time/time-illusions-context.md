# Контекстные подсказки на основе временных иллюзий

## Контекст (главы 4, 6, 12)
Мозг систематически искажает восприятие времени. Знание этих паттернов позволяет ИИ давать контекстно-зависимые подсказки.

## Таблица: Иллюзия → Детекция → Реакция ИИ

| Иллюзия | Признаки в данных | Алгоритм детекции | Рекомендация ИИ |
|---------|------------------|-------------------|----------------|
| **Хроностазис** (остановка времени при скуке) | • Задачи с низкой новизной <br> • Высокая повторяемость <br> • Пользователь отмечает «день тянется» | `if (task.novelty < 0.3 && userMood.boredom > 7) → trigger` | «Попробуйте добавить микро-вызов: сделайте задачу чуть сложнее или установите таймер на 25 мин (техника Помодоро)» |
| **Сжатие при потоке** (время «пролетает») | • Высокий focusLevel <br> • Задача завершена быстрее плана <br> • Пользователь удивлён: «уже вечер?» | `if (actualDuration < 0.7 * planned && userReflection.includes("быстро")) → trigger` | «Вы были в потоке — это отлично! Зафиксируйте условия: что помогло? (окружение, время суток, подготовка)» |
| **Растяжение при стрессе** | • Высокий stressLevel <br> • Пользователь переоценивает длительность <br> • Частые переключения между задачами | `if (userState.stress > 8 && timeEstimateError > +40%) → trigger` | «Стресс искажает восприятие времени. Сделайте паузу на 3 минуты дыхания, затем переоцените задачу» |
| **Эффект новизны** (неожиданное кажется длиннее) | • Первая задача нового типа <br> • Пользователь отмечает «казалось, долго» при объективно короткой длительности | `if (task.isNewType && userPerception > actual * 1.5) → trigger` | «Новые задачи всегда кажутся длиннее. Запишите фактическое время — в следующий раз оценка будет точнее» |

## Алгоритм контекстного вмешательства
```javascript
function contextualTimeHint(currentUserState, currentTask, historicalPatterns) {
  const illusions = detectActiveIllusions(currentUserState, currentTask, historicalPatterns);
  
  if (illusions.length === 0) return null;
  
  // Приоритизация: стресс > новизна > поток > скука
  const priorityOrder = ['stress_expansion', 'novelty_expansion', 'flow_compression', 'boredom_stasis'];
  const topIllusion = illusions.sort((a,b) => 
    priorityOrder.indexOf(a.type) - priorityOrder.indexOf(b.type)
  )[0];
  
  return {
    type: 'gentle_nudge', // не прерывать, а предложить опцию
    message: generateEmpatheticMessage(topIllusion),
    action_options: [
      { label: "Принять подсказку", action: applyRecommendation(topIllusion) },
      { label: "Отложить", action: 'dismiss_with_reminder_later' },
      { label: "Объясните, почему это важно", action: 'show_brief_rationale' }
    ],
    learning: {
      track_response: true,
      update_user_model: true,
      respect_opt_out: true
    }
  };
}
```

## Интеграция с Life Diary TMA
| Триггер | Место показа | Формат |
|---------|-------------|--------|
| Начало задачи с высоким риском иллюзии | Всплывающая подсказка в `Today` | Коротко, с эмодзи, одна кнопка действия |
| Завершение задачи с расхождением оценки | В форме рефлексии в `Journal` | Вопрос: «Что помогло/помешало в оценке времени?» |
| Еженедельный обзор | Секция «Инсайты недели» в `Dashboard` | Визуализация: «Ваша точность оценок: 78% → 85%» |

## Настройка чувствительности
```javascript
// Пользователь может настроить, насколько активно ИИ вмешивается
const userPreferences = {
  time_hints_frequency: 'minimal' | 'moderate' | 'proactive',
  preferred_tone: 'direct' | 'gentle' | 'playful',
  opt_out_illusions: ['boredom_stasis'], // какие подсказки отключить
  review_schedule: 'daily' | 'weekly' | 'monthly' // когда показывать сводку по точности оценок
};
```

## Измерение эффективности
```javascript
const successMetrics = {
  primary: [
    'improvement_in_time_estimation_accuracy',
    'user_satisfaction_with_hints (1-5 scale)',
    'reduction_in_stress_related_time_distortion'
  ],
  secondary: [
    'adoption_rate_of_suggested_strategies',
    'retention_of_learning (применяет ли пользователь инсайты через 2 недели)'
  ],
  ethical: [
    'opt_out_rate (если высокий — пересмотреть подход)',
    'user_feedback_on_autonomy ("чувствую контроль" vs "мне навязывают")'
  ]
};
```
