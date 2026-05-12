// src/sections/CarSection.jsx
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { T } from '../utils/theme';
import { SectionHero } from '../components/SectionHero';

export function CarSection() {
  const { profile, setProfile, tasks, setTasks, notify } = useApp();
  const [adviceOpen, setAdviceOpen] = useState(true);
  const [editCar, setEditCar] = useState(false);
  
  // Локальное состояние для формы редактирования
  const [carData, setCarData] = useState({
    model: profile.carModel || "",
    year: profile.carYear || "",
    mileage: profile.carMileage || "",
    lastTO: profile.carLastTO || "",
    tireType: profile.carTireType || "",
    tireDate: profile.carTireDate || "",
    insurance: profile.carInsurance || "",
    techCheck: profile.carTechCheck || ""
  });

  const now = new Date();
  const month = now.getMonth() + 1;
  const isSpring = month >= 3 && month <= 5;
  const isAutumn = month >= 9 && month <= 11;
  const warnings = [];

  if (profile.hasCar === "Да") {
    // Предупреждения
    if (profile.carTireType === "Зимняя" && isSpring) 
      warnings.push({ emoji: "🔄", title: "Меняй на летнюю резину", desc: "Стабильно выше +7°C — пора", color: T.warn });
    if (profile.carTireType === "Летняя" && isAutumn) 
      warnings.push({ emoji: "🔄", title: "Меняй на зимнюю резину", desc: "Не жди первого снега", color: T.warn });
    
    if (profile.carInsurance) {
      const d = Math.ceil((new Date(profile.carInsurance) - now) / 86400000);
      if (d < 30 && d >= 0) warnings.push({ emoji: "📋", title: "Страховка истекает", desc: `Через ${d} дн.`, color: T.danger });
    }
  }

  const saveCar = () => {
    setProfile(p => ({ ...p, ...carData, hasCar: "Да" }));
    setEditCar(false);
    notify("Данные автомобиля сохранены");
  };

  if (profile.hasCar !== "Да") {
    return (      <div style={{ textAlign: "center", padding: "32px 16px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🚗</div>
        <div style={{ fontSize: 16, color: T.text2, marginBottom: 8 }}>Добавь данные автомобиля</div>
        <button className="btn btn-primary" onClick={() => setProfile(p => ({ ...p, hasCar: "Да" }))}>
          🚗 Добавить автомобиль
        </button>
      </div>
    );
  }

  return (
    <div>
      <SectionHero sectionId="car" />
      {/* Карточка авто */}
      <div className="card card-accent" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 2, marginBottom: 4 }}>МОЙ АВТОМОБИЛЬ</div>
            <div style={{ fontFamily: "'Cormorant Infant', serif", fontSize: 20, color: T.text0 }}>
              {profile.carModel || "—"} {profile.carYear && `(${profile.carYear})`}
            </div>
            <div style={{ fontSize: 12, color: T.text3 }}>Пробег: {profile.carMileage ? profile.carMileage + " км" : "не указан"}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditCar(!editCar)}>✏️</button>
        </div>

        {!editCar && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10 }}>
            {[
              ["🔄 Резина", (profile.carTireType || "—")],
              ["🔧 Последнее ТО", profile.carLastTO ? new Date(profile.carLastTO).toLocaleDateString("ru-RU") : "—"],
              ["📋 Страховка до", profile.carInsurance ? new Date(profile.carInsurance).toLocaleDateString("ru-RU") : "—"],
              ["🔍 Техосмотр до", profile.carTechCheck ? new Date(profile.carTechCheck).toLocaleDateString("ru-RU") : "—"]
            ].map(([label, value]) => (
              <div key={label} style={{ padding: '7px 9px', background: 'rgba(45,32,16,0.05)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: T.text3, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 12, color: T.text0 }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {editCar && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="fld"><label>Марка</label><input value={carData.model} onChange={e => setCarData(p => ({...p, model: e.target.value}))}/></div>
              <div className="fld"><label>Год</label><input type="number" value={carData.year} onChange={e => setCarData(p => ({...p, year: e.target.value}))}/></div>
            </div>
            <div className="fld"><label>Пробег (км)</label><input type="number" value={carData.mileage} onChange={e => setCarData(p => ({...p, mileage: e.target.value}))}/></div>
            <div className="fld">
              <label>Тип резины</label>              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {["Летняя", "Зимняя", "Всесезонная"].map(v => (
                  <button key={v} onClick={() => setCarData(p => ({...p, tireType: v}))}
                    style={{ padding: '4px 10px', borderRadius: 12, border: `1px solid ${carData.tireType === v ? T.gold : T.bdr}`, background: carData.tireType === v ? 'rgba(45,106,79,0.12)' : 'transparent', color: carData.tireType === v ? T.gold : T.text1 }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="fld-row">
               <div className="fld"><label>Страховка до</label><input type="date" value={carData.insurance} onChange={e => setCarData(p => ({...p, insurance: e.target.value}))}/></div>
               <div className="fld"><label>Техосмотр до</label><input type="date" value={carData.techCheck} onChange={e => setCarData(p => ({...p, techCheck: e.target.value}))}/></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn btn-ghost" onClick={() => setEditCar(false)}>Отмена</button>
              <button className="btn btn-primary" onClick={saveCar}>Сохранить</button>
            </div>
          </div>
        )}
      </div>

      {/* Предупреждения */}
      {warnings.length > 0 && (
        <div className="card" style={{ marginBottom: 12, borderLeft: `3px solid ${T.danger}` }}>
          <div style={{ fontSize: 10, color: T.danger, fontFamily: "'JetBrains Mono'", letterSpacing: 2, marginBottom: 8 }}>⚠️ ТРЕБУЕТ ВНИМАНИЯ</div>
          {warnings.map((w, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: `1px solid ${T.bdrS}` }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{w.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: w.color, fontWeight: 600 }}>{w.title}</div>
                <div style={{ fontSize: 12, color: T.text3 }}>{w.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Плановое ТО */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: T.text3, fontFamily: "'JetBrains Mono'", letterSpacing: 1.5, marginBottom: 10 }}>ПЛАНОВОЕ ОБСЛУЖИВАНИЕ</div>
        {[
          { e: "🔧", t: "Замена масла", n: "Каждые 10 000 км" },
          { e: "🔄", t: "Проверка тормозов", n: "Каждые 20 000 км" },
          { e: "💧", t: "Уровень жидкостей", n: "Масло, тосол, тормозуха" },
          { e: "🔋", t: "Аккумулятор", n: "Перед зимой обязательно" },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${T.bdrS}` }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{item.e}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: T.text0 }}>{item.t}</div>              <div style={{ fontSize: 11, color: T.text3 }}>{item.n}</div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => {
              setTasks(p => [...p, { id: Date.now(), title: item.t, section: 'work', freq: 'once', priority: 'm', preferredTime: '10:00', lastDone: '', doneDate: '', notes: item.n }]);
              notify("Добавлено в задачи");
            }}>+</button>
          </div>
        ))}
      </div>

      {/* Советы */}
      <div style={{ marginBottom: 12 }}>
        <div onClick={() => setAdviceOpen(!adviceOpen)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: adviceOpen ? '12px 12px 0 0' : '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.07)` }}>
          <span style={{ fontSize: 16 }}>🚗</span>
          <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro', serif", color: T.text2, fontWeight: 500 }}>Советы по авто</span>
          <span style={{ fontSize: 11, color: T.text3 }}>{adviceOpen ? "▲" : "▼"}</span>
        </div>
        {adviceOpen && (
          <div style={{ border: `1px solid rgba(255,255,255,0.06)`, borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
            <AiBox 
              profile={profile}
              label="Советы по авто" 
              prompt={`Марка: ${profile.carModel}, Пробег: ${profile.carMileage}, Сезон: ${isSpring ? 'Весна' : isAutumn ? 'Осень' : 'Зима'}. Дай рекомендации по обслуживанию.`}
              btnText="Получить советы"
            />
          </div>
        )}
      </div>
    </div>
  );
}
