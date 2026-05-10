# Циркадные алгоритмы для ИИ-советника

## Базовые правила (на основе глав 3, 7)

### Алгоритм 1: Определение «окна продуктивности»
```javascript
function getCognitiveWindow(userProfile, currentTime) {
  // userProfile.circadianType: 'morning' | 'evening' | 'neutral'
  // userProfile.sleepSchedule: { bedtime, wakeTime }
  
  const wakeTime = userProfile.sleepSchedule.wakeTime;
  const peakOffset = userProfile.circadianType === 'morning' ? 2 : 4; // часов после пробуждения
  
  const peakStart = addHours(wakeTime, peakOffset);
  const peakEnd = addHours(peakStart, 3); // 3-часовое окно пиковой когнитивной функции
  
  return { peakStart, peakEnd, confidence: 0.7 }; // confidence растёт с накоплением данных
}
```

### Алгоритм 2: Рекомендация типа задачи по времени суток
```javascript
function recommendTaskType(timeOfDay, userEnergyLog) {
  // timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  // userEnergyLog: массив { timestamp, energyLevel: 1-10, focusLevel: 1-10 }
  
  const avgFocus = calculateAverageFocus(userEnergyLog, timeOfDay);
  
  if (avgFocus >= 7.5) {
    return { 
      type: 'deep_work', 
      examples: ['анализ', 'написание кода', 'планирование'],
      avoid: ['рутину', 'административные задачи']
    };
  } else if (avgFocus >= 5) {
    return {
      type: 'moderate_work',
      examples: ['встречи', 'коммуникация', 'обучение'],
      avoid: ['критически важные решения']
    };
  } else {
    return {
      type: 'recovery',
      examples: ['прогулка', 'медитация', 'лёгкое чтение'],
      avoid: ['новые сложные задачи']
    };
  }
}
```

### Алгоритм 3: Предупреждение о «циркадном конфликте»
```javascript
function checkCircadianConflict(scheduledTask, userProfile) {
  // scheduledTask: { type: 'deep_work' | 'meeting' | 'creative', time: DateTime }
  
  const window = getCognitiveWindow(userProfile, scheduledTask.time);
  
  if (scheduledTask.type === 'deep_work' && !isWithinWindow(scheduledTask.time, window)) {
    return {
      warning: true,
      message: `Задача "${scheduledTask.type}" запланирована вне вашего окна продуктивности. Рассмотрите перенос на ${formatTime(window.peakStart)}–${formatTime(window.peakEnd)}.`,
      suggestion: 'reschedule',
      confidence: 0.6 // растёт с подтверждением пользователем
    };
  }
  return { warning: false };
}
```

## Интеграция с Life Diary TMA
| Компонент | Применение алгоритма |
|-----------|---------------------|
| `Work` | Авто-планирование сложных задач в пиковые окна |
| `Goals` | Разбивка долгосрочных целей с учётом циркадных паттернов |
| `Today` | Подсказки: «Сейчас хорошее время для Х» / «Лучше отложить Y» |
| `Journal` | Запрос обратной связи: «Насколько точна была рекомендация?» |

## Сбор данных для улучшения точности
```javascript
// После выполнения задачи — запрос микро-фидбека
const feedbackPrompt = {
  question: "Насколько легко далась эта задача?",
  scale: "1 (очень трудно) — 5 (очень легко)",
  optional: "Что помогло/помешало? (одним предложением)"
};
// Ответы обновляют userProfile.circadianModel через байесовское обновление
```
