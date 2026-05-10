# Алгоритмы работы с восприятием времени

## Контекст (главы 4, 5, 6)
Субъективное время ≠ часовое время. Мозг искажает оценку длительности под влиянием:
- Эмоционального состояния (стресс → растяжение)
- Когнитивной нагрузки (сложная задача → сжатие проспективной оценки)
- Новизны стимулов (неожиданное → удлинение)

## Алгоритм 1: Коррекция оценки длительности задачи
```javascript
function adjustTimeEstimate(userEstimate, taskContext, userState) {
  // userEstimate: минуты, которые пользователь считает нужными
  // taskContext: { novelty: 0-1, complexity: 0-1, emotionalValence: -1 to +1 }
  // userState: { stressLevel: 0-10, focusLevel: 0-10 }
  
  let correctionFactor = 1.0;
  
  // Эмпирические коэффициенты (настраиваются по данным пользователя)
  if (userState.stressLevel >= 7) correctionFactor *= 1.4; // стресс растягивает восприятие
  if (taskContext.complexity >= 0.8 && userState.focusLevel < 5) correctionFactor *= 1.3;
  if (taskContext.novelty >= 0.7) correctionFactor *= 1.2;
  
  const adjustedMinutes = Math.round(userEstimate * correctionFactor);
  
  return {
    original: userEstimate,
    adjusted: adjustedMinutes,
    rationale: `Учитывая ${getReasons(userState, taskContext)}, рекомендуем заложить ${adjustedMinutes} мин вместо ${userEstimate}.`,
    confidence: 0.5 // растёт с накоплением исторических данных
  };
}
```

## Алгоритм 2: Детекция «временной иллюзии» в ретроспективе
```javascript
function detectRetrospectiveDistortion(taskLog, userMoodLog) {
  // taskLog: { plannedDuration, actualDuration, timestamp }
  // userMoodLog: { timestamp, valence, arousal }
  
  const distortion = taskLog.actualDuration / taskLog.plannedDuration;
  
  if (distortion > 2.0 || distortion < 0.5) {
    // Поиск корреляции с эмоциональным состоянием
    const moodAtTime = getClosestMood(taskLog.timestamp, userMoodLog);
    
    if (moodAtTime.arousal >= 8 && distortion > 2.0) {
      return {
        type: 'stress_expansion',
        message: "Вы оценили задачу как более длительную, вероятно, из-за высокого уровня активации. Это нормальная реакция — в будущем можно скорректировать оценку.",
        learning: true
      };
    }
    // ... другие паттерны
  }
  return null;
}
```

## Алгоритм 3: Проспективное планирование с учётом «каппа-эффекта»
> Каппа-эффект: увеличение расстояния (физического или концептуального) между событиями приводит к переоценке временного интервала.

```javascript
function planWithKappaEffect(tasks, spatialOrConceptualDistance) {
  // tasks: массив { id, estimatedDuration, dependencies }
  // distance: метрика «близости» задач (0 = одинаковый контекст, 1 = полностью разные)
  
  return tasks.map(task => {
    const baseEstimate = task.estimatedDuration;
    // Эмпирическая формула: +15% на каждые 0.3 единицы дистанции
    const kappaAdjustment = 1 + (distance * 0.5);
    
    return {
      ...task,
      adjustedDuration: Math.round(baseEstimate * kappaAdjustment),
      note: distance > 0.6 ? "Между задачами — смена контекста. Заложите буфер на переключение." : null
    };
  });
}
```

## Интеграция с Life Diary TMA
| Сценарий | Применение |
|----------|-----------|
| Пользователь недооценивает время задачи | Алгоритм 1 предлагает скорректированную оценку с объяснением |
| Пользователь жалуется «день пролетел, а я ничего не сделал» | Алгоритм 2 анализирует ретроспективные искажения, предлагает рефрейминг |
| Планирование дня с разнородными задачами | Алгоритм 3 добавляет буферы на переключение контекста |

## Обучение модели
```javascript
// После завершения дня — микро-опрос
const dailyCalibration = {
  questions: [
    "Насколько точно вы оценили время сегодня? (1-5)",
    "Какие задачи заняли больше/меньше времени, чем ожидали?"
  ],
  action: "Обновить персональные коэффициенты коррекции в userProfile.timePerceptionModel"
};
```
