// src/components/AiRecommendations.jsx
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { T } from '../utils/theme';

export function AiRecommendations() {
  const { profile, addWorkTool } = useApp();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');
    setRecommendations([]);
    try {
      const systemPrompt = `Ты строгий AI-консультант для бухгалтера/ИП в РК.
ПРАВИЛА ОТВЕТА:
1. Отвечай ТОЛЬКО валидным JSON массивом объектов. Никакого текста до или после JSON.
2. Формат каждого объекта строго: 
   {
     "id": "rec_1",
     "title": "Краткое название метода/инструмента",
     "summary": "Суть и конкретная польза (1-2 предложения)",
     "details": "Подробное пошаговое описание метода",
     "source": "Нормативный акт РК / ТКМ-справочник / Официальный источник",
     "tool": {
       "title": "Готовое название инструмента",
       "description": "Краткое назначение",
       "steps": ["Шаг 1", "Шаг 2", "Шаг 3"]
     }
   }
3. Уровень фантазии: минимальный. Только проверенные методы, актуальные на 2026 год.
4. Без воды, только четкие инструкции. Если данных недостаточно — верни пустой массив [].`;

      const prof = profile?.profession || 'Бухгалтер';
      const sphere = profile?.jobSphere || 'Учет и отчетность';
      const userPrompt = `Профиль: ${prof}, сфера: ${sphere}. Дай 3 конкретные рекомендации по оптимизации работы с отчетностью или автоматизации рутины.`;

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, maxTokens: 2048 })
      });

      const data = await res.json();
      if (data?.text) {
        // Очистка от markdown-блоков
        let clean = data.text.replace(/```json/g, '').replace(/```/g, '').trim();        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed)) {
          setRecommendations(parsed);
        } else {
          throw new Error('Неверная структура ответа');
        }
      } else {
        throw new Error(data?.error || 'Пустой ответ');
      }
    } catch (e) {
      console.error(e);
      setError('⚠️ Не удалось загрузить рекомендации. Проверьте соединение или попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTool = (rec) => {
    if (rec.tool) {
      addWorkTool(rec.tool);
      setExpandedId(null); // Сворачиваем после создания
    }
  };

  return (
    <div style={{ border: `1px solid ${T.gold}22`, borderRadius: '0 0 12px 12px', overflow: 'hidden', background: 'rgba(255,255,255,0.01)' }}>
      <div style={{ padding: 14 }}>
        <p style={{ fontSize: 13, color: T.text1, margin: '0 0 12px', lineHeight: 1.5 }}>
          Получите рекомендации по оптимизации работы. Понравившуюся можно сохранить как готовый инструмент.
        </p>
        
        <button 
          onClick={fetchRecommendations} 
          disabled={loading}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: 'none', background: loading ? T.text3 : T.gold, color: '#000', fontWeight: 600, cursor: loading ? 'wait' : 'pointer', transition: 'all 0.2s' }}
        >
          {loading ? '⏳ Генерация...' : '💡 Получить AI-рекомендации'}
        </button>

        {error && <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(255,80,80,0.1)', color: T.error, fontSize: 12, textAlign: 'center' }}>{error}</div>}
      </div>

      {recommendations.length > 0 && (
        <div style={{ borderTop: `1px solid ${T.border}` }}>
          {recommendations.map(rec => {
            const isExpanded = expandedId === rec.id;
            return (
              <div key={rec.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <div 
                  onClick={() => setExpandedId(isExpanded ? null : rec.id)}                  style={{ padding: '12px 14px', cursor: 'pointer', background: isExpanded ? 'rgba(200,164,90,0.05)' : 'transparent', transition: 'background 0.2s' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.text0, marginBottom: 4 }}>{rec.title}</div>
                      <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.4 }}>{rec.summary}</div>
                    </div>
                    <span style={{ fontSize: 12, color: T.text3, flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 14px 14px', fontSize: 13, color: T.text1, lineHeight: 1.5 }}>
                    <div style={{ marginBottom: 8, padding: 8, borderRadius: 6, background: 'rgba(255,255,255,0.03)', borderLeft: `2px solid ${T.accent}` }}>
                      <strong>📖 Подробно:</strong> {rec.details}
                    </div>
                    {rec.source && <div style={{ fontSize: 11, color: T.text3, marginBottom: 10, fontStyle: 'italic' }}>📚 Источник: {rec.source}</div>}
                    
                    {rec.tool && (
                      <button 
                        onClick={() => handleCreateTool(rec)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${T.accent}`, background: 'transparent', color: T.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        ✦ Создать инструмент: {rec.tool.title}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
