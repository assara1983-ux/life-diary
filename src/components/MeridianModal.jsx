// src/components/MeridianModal.jsx
import React, { useEffect, useState, useMemo } from "react";
// Источник: healing-sounds-daoist.md, norbekov-breathing-technique.md, omz-youth-health-image.md, meridian-diseases.md

const MERIDIAN_DB = {
  gallbladder: { diseases: "Сосуды, иннервация кожи, вестибулярный аппарат, горло, дыхательные пути, ЖКТ.", sound: 3, zone: "side" },
  liver: { diseases: "Печень, желчный пузырь, лимфа, иммунитет, эндокринная система, суставы ног.", sound: 3, zone: "side" },
  lungs: { diseases: "Голова, лицо, надпочечники, верхние дыхательные пути, гайморовы пазухи. Лихорадка, аллергии.", sound: 1, zone: "head" },
  large_intestine: { diseases: "Горло, шея, щитовидная железа, лимфоузлы, толстый кишечник, шейный отдел позвоночника.", sound: 1, zone: "throat" },
  stomach: { diseases: "ЖКТ, пищевод, ротовая полость, зубы, дёсны, желудок.", sound: 5, zone: "center" },
  spleen: { diseases: "Соединительная ткань, селезёнка, ПЖЖ, жидкости организма, молочные железы, кожа.", sound: 5, zone: "center" },
  heart: { diseases: "Сердце, сосуды, позвоночник, вегетатика, кровь, головной мозг.", sound: 4, zone: "heart" },
  small_intestine: { diseases: "Тонкий кишечник, усвоение питательных веществ, координация, пищеварение.", sound: 4, zone: "center" },
  bladder: { diseases: "Венозный кровоток ног, мочеполовая система, почки, позвоночник, уши, головные боли.", sound: 2, zone: "back" },
  kidneys: { diseases: "Почки, мочевыводящие пути, репродуктивная система, кости, уши, слух.", sound: 2, zone: "back" },
  pericardium: { diseases: "Головной мозг, тазобедренные суставы, жировой обмен, ЖКТ, нервная система.", sound: 4, zone: "heart" },
  triple_burner: { diseases: "Эндокринная система, ЖКТ, камни в органах, минеральный обмен, суставы.", sound: 6, zone: "triple" },
};

const DAOIST_SOUNDS = {
  1: { organ: "Лёгкие", sound: "С-С-С-С-С", emotion: "Печаль, горе", color: "Белый с металлическим оттенком", exercise: "Постукивание ладонями над лёгкими 15–20 сек" },
  2: { organ: "Почки", sound: "Ч-У-Э-Э-Э-Й", emotion: "Страх, переживания, боль", color: "Сапфировый, чистый синий", exercise: "Постукивание тыльной стороной кулаков по почкам 5–10 раз" },
  3: { organ: "Печень", sound: "Ш-Ш-Ш-Ш-Ш", emotion: "Злость, гнев", color: "Изумрудно-зелёный", exercise: "Фокус на палец 15–20 см, задержка дыхания до слёз" },
  4: { organ: "Сердце/Перикард", sound: "Х-А-У-У-У-У-У", emotion: "Нетерпимость, высокомерие", color: "Чистый красный", exercise: "Круговые движения языка 9↔6 раз, сглатывание слюны" },
  5: { organ: "Селезёнка/ПЖЖ", sound: "Х-У-У-У-У-У", emotion: "Беспокойство, жалость к себе", color: "Жёлтый / золотистый", exercise: "Щёлканье зубами 18×2 + постукивание вокруг губ" },
  6: { organ: "Тройной обогреватель", sound: "Х-Э-Э-Э-Э-Э-Э", emotion: "Стресс, дисбаланс", color: "— (регулирует поток)", exercise: "Дыхание позвоночником 9 циклов" },
};

export function MeridianModal({ data, onClose }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);

  const info = useMemo(() => {
    const db = MERIDIAN_DB[data?.id] || MERIDIAN_DB.lungs;
    const snd = DAOIST_SOUNDS[db.sound] || DAOIST_SOUNDS[1];
    const isHeart = ["heart", "pericardium"].includes(data?.id);
    const isHead = ["lungs", "gallbladder", "bladder"].includes(data?.id);
    return { ...db, ...snd, isHeart, isHead, name: data?.name || "—", emoji: data?.emoji || "☯️", time: data?.time || "—", element: data?.element || "—" };
  }, [data]);

  if (!mounted) return null;

  return (
    <div className="mm-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <style>{`
        .mm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 16px; animation: mm-fade 0.2s ease-out; }
        .mm-card { background: #fff; border: 1px solid var(--line); border-radius: 12px; max-width: 520px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 12px 40px rgba(0,0,0,0.15); position: relative; }
        .mm-hd { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--line); background: rgba(0,112,192,0.03); }
        .mm-icon { font-size: 28px; }
        .mm-title { font-family: var(--font-head); font-size: 18px; color: var(--text1); }
        .mm-meta { font-size: 12px; color: var(--text3); margin-top: 2px; font-family: var(--font-mono); }
        .mm-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .mm-section h4 { margin: 0 0 6px; font-size: 13px; color: var(--blue); font-family: var(--font-head); display: flex; align-items: center; gap: 6px; }
        .mm-section p { margin: 0; font-size: 13px; color: var(--text2); line-height: 1.5; }
        .mm-warn { background: rgba(232,85,109,0.08); border-left: 3px solid var(--error); padding: 10px 12px; border-radius: 6px; }
        .mm-warn p { color: var(--error); font-size: 12px; font-weight: 500; margin: 0; }
        .mm-step-list { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
        .mm-step { display: flex; gap: 8px; align-items: flex-start; }
        .mm-step-num { flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; background: var(--blue); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; }
        .mm-step-text { font-size: 12px; color: var(--text2); line-height: 1.4; }
        .mm-footer { padding: 12px 20px; border-top: 1px solid var(--line); text-align: right; }
        .mm-close { background: var(--blue); color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-family: var(--font-head); font-size: 13px; transition: opacity 0.2s; }
        .mm-close:hover { opacity: 0.85; }
        @keyframes mm-fade { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      <div className="mm-card" onClick={e => e.stopPropagation()}>
        <div className="mm-hd">
          <span className="mm-icon">{info.emoji}</span>
          <div><div className="mm-title">{info.name}</div><div className="mm-meta">{info.time} · {info.element} · {data?.sign || "—"}</div></div>
        </div>
        <div className="mm-body">
          {(info.isHeart || info.isHead) && (<div className="mm-warn"><p>⛔ ЗАПРЕТ: Дыхание по системе Норбекова НИКОГДА не направлять в область {info.isHeart ? "сердца и головного мозга" : "головного мозга и сердца"}!</p></div>)}
          <div className="mm-section"><h4>🔍 Уязвимости & Профилактика</h4><p>{info.diseases}</p></div>
          <div className="mm-section"><h4>🔊 Целительный звук (Даосская система)</h4><p><strong>{info.sound}</strong> · {info.emotion}</p><p style={{fontSize:11, color:'var(--text3)', marginTop:4}}>Визуализация: {info.color} · Усилитель: {info.exercise}</p></div>
          <div className="mm-section"><h4>🌬️ Рекомендуемый протокол</h4><div className="mm-step-list"><div className="mm-step"><div className="mm-step-num">1</div><div className="mm-step-text"><strong>Сам Чон До:</strong> Вдох 3с → Выдох 6с → Пауза 2с. 3–9 циклов для настройки.</div></div><div className="mm-step"><div className="mm-step-num">2</div><div className="mm-step-text"><strong>Звук:</strong> Произнести на выдохе. Едва слышно, с визуализацией цвета и изгнанием эмоции.</div></div><div className="mm-step"><div className="mm-step-num">3</div><div className="mm-step-text"><strong>Норбеков «около»:</strong> Дышать не В орган, а РЯДОМ с ним. 5–6 циклов. Вдох=прохлада, выдох=тепло.</div></div><div className="mm-step"><div className="mm-step-num">4</div><div className="mm-step-text"><strong>ОМЗ:</strong> Подключить Образ Молодости и Здоровья в районе солнечного сплетения. Удерживать 1–2 мин.</div></div></div></div>
        </div>
        <div className="mm-footer"><button className="mm-close" onClick={onClose}>Закрыть</button></div>
      </div>
    </div>
  );
}
