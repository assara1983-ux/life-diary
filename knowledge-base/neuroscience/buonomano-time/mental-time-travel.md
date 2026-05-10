# Алгоритмы мысленного путешествия во времени

## Контекст (главы 2, 11)
Способность эпизодически вспоминать прошлое и симулировать будущее — ключевая функция префронтальной коры и гиппокампа. Используется для:
- Планирования (симуляция сценариев)
- Обучения на ошибках (ретроспективный анализ)
- Мотивации (визуализация успеха)

## Алгоритм 1: Структурированная симуляция будущего (для постановки целей)
```javascript
function guidedFutureSimulation(goal, timeHorizon) {
  return {
    steps: [
      {
        step: 1,
        instruction: "Опишите конкретный момент в будущем, когда цель достигнута. Где вы? Кто рядом? Что вы делаете?",
        purpose: "Активация эпизодической памяти и сенсорных деталей"
      },
      {
        step: 2,
        instruction: "Какие препятствия вы преодолели на пути? Как вы себя чувствовали в моменты сомнений?",
        purpose: "Подготовка к реалистичным сценариям, снижение эффекта 'planning fallacy'"
      },
      {
        step: 3,
        instruction: "Какой самый маленький, но конкретный шаг вы можете сделать в ближайшие 24 часа?",
        purpose: "Перевод абстрактного будущего в немедленное действие"
      }
    ],
    
    output: {
      format: 'structured_journal_entry',
      fields: ['future_scene', 'obstacles_overcome', 'next_micro_action'],
      auto_save_to: 'Journal',
      tag: '#future_simulation'
    },
    
    follow_up: {
      timing: '24_hours',
      action: 'check_micro_action_completion',
      if_completed: 'reinforce_with_positive_feedback',
      if_not: 'explore_barriers_without_judgment'
    }
  };
}
```

## Алгоритм 2: Ретроспективный анализ с извлечением уроков
```javascript
function extractLessonsFromPastEvent(eventLog, userReflections) {  // eventLog: { task, plannedOutcome, actualOutcome, timestamp }
  // userReflections: свободный текст или структурированные ответы
  
  return {
    analysis: {
      gap_analysis: comparePlannedVsActual(eventLog),
      causal_factors: identifyFactors(userReflections), // NLP-анализ или ручная категоризация
      pattern_detection: checkForRecurringPatterns(eventLog, historicalData)
    },
    
    actionable_insights: [
      {
        type: 'process_adjustment',
        insight: "Вы систематически недооцениваете время задач с высокой новизной. Добавьте +30% к оценкам для новых типов задач.",
        apply_to: 'future_estimates'
      },
      {
        type: 'resource_allocation',
        insight: "Задачи, выполненные в утренние часы, имели на 40% выше качество. Рассмотрите перенос аналогичных задач на утро.",
        apply_to: 'scheduling'
      }
    ],
    
    memory_consolidation: {
      action: 'create_summary_card',
      format: 'one_sentence_lesson + one_actionable_rule',
      storage: 'userProfile.learnedPatterns',
      retrieval_trigger: 'similar_future_task'
    }
  };
}
```

## Алгоритм 3: Связь прошлого опыта с будущим планированием
```javascript
function connectPastToFuture(pastSuccesses, futureGoal) {
  // pastSuccesses: массив { task, strategies_used, outcome, confidence_boost }
  // futureGoal: { title, required_skills, uncertainty_level }
  
  const relevantPatterns = findTransferablePatterns(pastSuccesses, futureGoal);
  
  if (relevantPatterns.length > 0) {
    return {
      confidence_builder: `Вы уже успешно применяли [${relevantPatterns.map(p => p.strategy).join(', ')}] в похожих ситуациях. Это повышает вероятность успеха.`,
      
      strategy_transfer: relevantPatterns.map(pattern => ({
        from: pattern.context,
        to: futureGoal.title,
        adaptation_note: pattern.adaptation_hint
      })),      
      risk_mitigation: {
        based_on: 'past_obstacles',
        preemptive_actions: generatePreemptiveActions(relevantPatterns, futureGoal)
      }
    };
  }
  return {
    message: "Пока не найдено прямых параллелей. Это возможность создать новый успешный паттерн.",
    suggestion: "Начните с малого: какой микро-эксперимент вы можете провести на этой неделе?"
  };
}
```

## Интеграция с Life Diary TMA
| Компонент | Применение |
|-----------|-----------|
| `Goals` | При создании цели — запуск алгоритма 1 для усиления конкретности и мотивации |
| `Journal` | Еженедельный шаблон: «Урок недели» на основе алгоритма 2 |
| `Work` | При планировании сложной задачи — подсказка: «Вы успешно делали Х в прошлом, попробуйте применить тот же подход» |
| `Today` | Утренний промпт: «Какой маленький шаг из прошлого успеха вы можете повторить сегодня?» |

## Технические заметки
```javascript
// Для работы алгоритмов требуется:
const dataRequirements = {
  minimal: [
    'история выполненных задач с оценками',
    'базовые метаданные: время выполнения, субъективная сложность'
  ],
  enhanced: [
    'журнал рефлексий (свободный текст или структурированный)',
    'отслеживание настроения/энергии (опционально)',
    'явные теги успешных стратегий (пользователь может помечать: "сработало", "не сработало")'
  ],
  privacy: {
    local_processing: "Предпочтительно обрабатывать чувствительные данные локально",
    anonymization: "При отправке на сервер — удалять идентифицирующую информацию",
    user_control: "Возможность экспорта и полного удаления всех данных о симуляциях"
  }
};
```
