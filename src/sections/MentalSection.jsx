// src/sections/MentalSection.jsx
import { useState } from "react";
import { useApp } from "../store/AppContext";
import { Icon } from "../components/Icon";
import { T } from "../utils/theme";
import { getSectionGraphic } from "../config/sectionGraphics";

export function MentalSection() {
  const { profile } = useApp();
  const [selectedPractice, setSelectedPractice] = useState(null);

  // === ПЕРСОНАЛИЗИРОВАННЫЕ ПРАКТИКИ ===
  const getPersonalizedPractices = () => {
    const practices = [];
    
    // На основе ТКМ-типа
    if (profile?.tcmType === "wood") {
      practices.push({
        id: 1,
        title: "Дыхание для печени",
        type: "breathing",
        duration: 5,
        description: "Целительный звук «Ш-Ш-Ш» для снятия гнева и напряжения",
        icon: "health",
        color: T.success
      });
    }
    
    // На основе уровня стресса
    if (profile?.stressLevel > 7) {
      practices.push({
        id: 2,
        title: "Настрой Норбекова",
        type: "meditation",
        duration: 10,
        description: "Визуализация Образа Молодости и Здоровья",
        icon: "mental",
        color: T.gold
      });
    }
    
    // На основе хронотипа
    if (profile?.chronotype === "owl") {
      practices.push({
        id: 3,
        title: "Утренняя активация",
        type: "energy",
        duration: 7,
        description: "Дыхание «Всадник» для пробуждения энергии",
        icon: "schedule",        color: T.blue
      });
    }
    
    // Базовые практики
    practices.push(
      {
        id: 4,
        title: "6 целительных звуков",
        type: "breathing",
        duration: 15,
        description: "Даосская практика для баланса органов",
        icon: "health",
        color: T.teal
      },
      {
        id: 5,
        title: "Энергетические нити",
        type: "visualization",
        duration: 12,
        description: "Настройка на успех через визуализацию",
        icon: "goals",
        color: T.gold
      }
    );
    
    return practices;
  };

  const practices = getPersonalizedPractices();

  return (
    <div className="page">
      {/* ФОНОВАЯ КАРТИНА — WATERMARK */}
      <div style={{
        position: "fixed",
        top: 120,
        right: 20,
        width: 200,
        height: 200,
        opacity: 0.06,
        backgroundImage: `url(${getSectionGraphic("mental")?.image})`,
        backgroundSize: "contain",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        pointerEvents: "none",
        zIndex: 0,
        mixBlendMode: "multiply"
      }} />
      {/* Заголовок с маленькой иконкой */}
      <div className="sec-lbl" style={{ 
        fontFamily: "'JetBrains Mono'", 
        fontSize: 9,
        display: "flex",
        alignItems: "center",
        gap: 8
      }}>
        <Icon name="mental" size={16} color={T.blue} />
        МЕНТАЛЬНОЕ ЗДОРОВЬЕ
      </div>

      {/* Рекомендации на основе профиля */}
      {profile?.stressLevel > 7 && (
        <div className="ai-box" style={{ marginBottom: 16, borderLeftColor: T.gold }}>
          <div className="ai-label" style={{ fontFamily: "'JetBrains Mono'", fontSize: 8 }}>
            ◈ РЕКОМЕНДАЦИЯ
          </div>
          <div className="ai-text" style={{ fontFamily: "'Cormorant Infant', serif", fontSize: 13 }}>
            У вас высокий уровень стресса. Начните с дыхательной практики 
            «Настрой Норбекова» — 10 минут вечером снимут напряжение.
          </div>
        </div>
      )}

      {/* Список практик */}
      <div className="card">
        <div className="card-hd">
          <div className="card-title" style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: T.blue }}>
            Практики для вас
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {practices.map(practice => (
            <div 
              key={practice.id}
              onClick={() => setSelectedPractice(practice)}
              style={{
                padding: 14,
                border: `1.5px solid rgba(0,112,192,0.15)`,
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.2s",
                background: "rgba(255,255,255,0.5)",
                ":hover": {
                  background: "rgba(0,112,192,0.05)",
                  borderColor: practice.color
                }
              }}            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: `${practice.color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Icon name={practice.icon} size={20} color={practice.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'Crimson Pro', serif",
                    fontSize: 14,
                    color: T.text1,
                    marginBottom: 3
                  }}>
                    {practice.title}
                  </div>
                  <div style={{
                    fontFamily: "'Cormorant Infant', serif",
                    fontSize: 12,
                    color: T.text3,
                    fontStyle: "italic"
                  }}>
                    {practice.description}
                  </div>
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 9,
                  color: T.text3,
                  padding: "3px 8px",
                  background: "rgba(0,112,192,0.08)",
                  borderRadius: 3
                }}>
                  {practice.duration} мин
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Модальное окно практики */}
      {selectedPractice && (
        <div className="overlay" onClick={() => setSelectedPractice(null)}>          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-x" onClick={() => setSelectedPractice(null)}>✕</div>
            <div className="modal-title" style={{ fontFamily: "'Cinzel', serif", fontSize: 14 }}>
              {selectedPractice.title}
            </div>
            
            <div style={{ 
              fontFamily: "'Cormorant Infant', serif", 
              fontSize: 14, 
              color: T.text2,
              lineHeight: 1.7,
              marginBottom: 20
            }}>
              {selectedPractice.description}
            </div>

            <div style={{ 
              padding: 12, 
              background: "rgba(0,112,192,0.05)",
              borderRadius: 6,
              marginBottom: 16
            }}>
              <div style={{ 
                fontFamily: "'JetBrains Mono'", 
                fontSize: 9, 
                color: T.text3,
                marginBottom: 6
              }}>
                ◈ ДЛИТЕЛЬНОСТЬ
              </div>
              <div style={{ 
                fontFamily: "'Crimson Pro', serif", 
                fontSize: 14, 
                color: T.blue
              }}>
                {selectedPractice.duration} минут
              </div>
            </div>

            <div className="modal-foot">
              <button 
                className="btn btn-ghost" 
                onClick={() => setSelectedPractice(null)}
                style={{ fontFamily: "'JetBrains Mono'", fontSize: 10 }}
              >
                Отмена
              </button>
              <button 
                className="btn btn-primary" 
                style={{ fontFamily: "'JetBrains Mono'", fontSize: 10 }}              >
                Начать практику
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
