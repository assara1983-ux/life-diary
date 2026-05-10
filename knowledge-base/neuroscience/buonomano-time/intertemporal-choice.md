# Алгоритмы межвременного выбора

## Контекст (главы 11, 12)
Люди систематически переоценивают немедленные вознаграждения и недооценивают отложенные (hyperbolic discounting). Это влияет на:
- Финансовые решения (тратить сейчас / копить)
- Здоровье (удовольствие сейчас / долгосрочное благополучие)
- Продуктивность (прокрастинация)

## Алгоритм 1: Детекция паттерна «временной близорукости»
```javascript
function detectTemporalMyopia(userDecisions, timeHorizon) {
  // userDecisions: массив { choice: 'immediate' | 'delayed', rewardValue, delayDays, timestamp }
  
  // Расчёт индивидуальной ставки дисконтирования
  const discountRate = calculateHyperbolicDiscountRate(userDecisions);
  
  // Сравнение с популяционной нормой (по данным исследований)
  const populationMedian = 0.05; // 5% в день — примерная медиана
  
  if (discountRate > populationMedian * 2) {
    return {
      pattern: 'high_temporal_discounting',
      riskAreas: ['финансы', 'здоровье', 'долгосрочные цели'],
      intervention: 'future_self_visualization',
      confidence: 0.6
    };
  }
  return null;
}
```

## Алгоритм 2: Интервенция «мысленное путешествие в будущее»
> На основе исследований: визуализация конкретного будущего события снижает импульсивность.

```javascript
function generateFutureSelfPrompt(goal, timeHorizon, userDetails) {
  // goal: { title, category, expectedBenefit }
  // timeHorizon: '1 month' | '6 months' | '1 year'
  
  return {
    prompt: `Представьте себя через ${timeHorizon}, когда вы уже достигли "${goal.title}".
    
    1. Что вы чувствуете? (гордость, облегчение, радость?)
    2. Что стало возможным благодаря этому достижению?
    3. Какой один маленький шаг вы можете сделать СЕГОДНЯ, чтобы приблизить это будущее?`,
    
    followUp: {
      type: 'commitment_device',
      action: 'schedule_micro_action',
      message: "Запланируйте этот маленький шаг прямо сейчас — это увеличит вероятность его выполнения на 42% (исследование Gollwitzer, 1999)."    },
    
    tracking: {
      metric: 'follow_through_rate',
      feedback_loop: true
    }
  };
}
```

## Алгоритм 3: Рефрейминг отложенного вознаграждения
```javascript
function reframeDelayedReward(immediateOption, delayedOption, userValues) {
  // userValues: массив приоритетов ['health', 'growth', 'relationships', ...]
  
  // Поиск пересечения delayedOption.benefit с userValues
  const alignedValues = delayedOption.benefits.filter(b => userValues.includes(b.valueType));
  
  if (alignedValues.length > 0) {
    return {
      reframe: `Выбирая "${delayedOption.label}", вы инвестируете в ${alignedValues.map(v => v.label).join(', ')}. 
      Это согласуется с вашим приоритетом: "${userValues[0]}".`,
      
      visualization: {
        type: 'progress_chain',
        description: "Показывать визуальную цепочку: сегодняшнее действие → промежуточные вехи → конечный результат",
        updateFrequency: 'weekly'
      },
      
      commitment: {
        type: 'precommitment',
        example: "Установите автоматическое напоминание о выгоде через ${delayedOption.delay}."
      }
    };
  }
  return null;
}
```

## Интеграция с Life Diary TMA
| Компонент | Применение |
|-----------|-----------|
| `Goals` | При создании долгосрочной цели — запуск алгоритма 2 для усиления мотивации |
| `Today` | Если пользователь откладывает важное — мягкая интервенция с рефреймингом |
| `Journal` | Еженедельный рефлексивный вопрос: «Какое сегодняшнее решение принесёт пользу через 6 месяцев?» |

## Этические ограничения
```javascript
const ethicalGuardrails = {
  no_manipulation: "Не использовать алгоритмы для навязывания решений, только для расширения осознанности",  transparency: "Всегда объяснять, почему даётся та или иная рекомендация",
  user_control: "Пользователь может отключить любую интервенцию в настройках",
  data_minimization: "Не хранить детальные логи выборов без явного согласия"
};
```
