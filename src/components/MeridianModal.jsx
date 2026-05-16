// src/components/MeridianModal.jsx
import React, { useEffect } from "react";

export function MeridianModal({ data, onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const isCurrent = data.type === "meridian" && data.current?.name === data.data?.label;
  const elementColor = {
    "Печень": "var(--success)", "Лёгкие": "var(--blue)", "Сердце": "var(--error)",
    "Почки": "var(--blue)", "Селёз": "var(--gold)", "Желудок": "var(--gold)"
  }[data.data?.label] || "var(--text2)";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={handleBackdrop}>
      <div style={{ background: "#fff", borderRadius: 14, maxWidth: 520, width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 30px rgba(0,0,0,0.15)", position: "relative" }}>
        <style>{`
          .hm-modal-hd { padding: 16px 18px 12px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; }
          .hm-modal-hd h2 { margin: 0; font-size: 16px; color: var(--text1); font-family: var(--font-head); }
          .hm-modal-body { padding: 18px; }
          .hm-modal-body p { margin: 0 0 10px; font-size: 13px; color: var(--text2); line-height: 1.5; }
          .hm-modal-badge { display: inline-block; padding: 4px 10px; border-radius: 10px; font-size: 11px; font-family: var(--font-mono); margin-right: 6px; margin-bottom: 6px; }
          .hm-modal-close { background: none; border: none; font-size: 22px; cursor: pointer; color: var(--text3); line-height: 1; }
          .hm-modal-close:hover { color: var(--text1); }
          .hm-modal-section { margin-bottom: 14px; padding: 10px; background: rgba(0,112,192,0.04); border-radius: 8px; }
          .hm-modal-section strong { color: var(--text1); }
        `}</style>

        <div className="hm-modal-hd">
          <h2>🫁 {data.data?.label} {isCurrent ? "(Сейчас)" : ""}</h2>
          <button className="hm-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="hm-modal-body">
          <div className="hm-modal-section">
            <strong>⏱ Пик активности:</strong> {data.data?.hour} ч<br/>
            <strong>🌍 Стихия У-Син:</strong> <span style={{color: elementColor}}>{data.data?.label === "Печень" ? "Дерево" : data.data?.label === "Лёгкие" ? "Металл" : data.data?.label === "Сердце" ? "Огонь" : data.data?.label === "Почки" ? "Вода" : "Земля"}</span><br/>
            <strong>🧠 Эмоция:</strong> {data.data?.label === "Печень" ? "Гнев/Нетерпение" : data.data?.label === "Лёгкие" ? "Печаль/Ностальгия" : data.data?.label === "Сердце" ? "Радость/Нетерпение" : "Страх/Покой"}
          </div>

          <div className="hm-modal-section">
            <strong>🌬️ Рекомендованное дыхание:</strong>
            <p style={{marginTop:4}}>
              {data.data?.label === "Печень" ? "Ш-Ш-Ш (на выдохе) + упражнение для глаз. Избегайте Бхастрики." :
               data.data?.label === "Лёгкие" ? "С-С-С + Уджайи. Тёплые напитки, увлажнение." :
               data.data?.label === "Сердце" ? "Х-А-У + Настрой Норбекова (не направлять в область сердца!)." :
               data.data?.label === "Почки" ? "Ч-У-Э-Й + Кумбхака. Согревание поясницы, соль умеренно." :
               "Полное йогическое дыхание. Акцент на диафрагме и межрёберном пространстве."}
            </p>
          </div>

          <div className="hm-modal-section">
            <strong>👤 Привязка к профилю Анны:</strong>
            <p style={{marginTop:4, fontSize:12}}>
              {data.profile?.chrono?.type === "Жаворонок" && data.data?.hour === "03-05" ? "Ваш пик пробуждения. Добавьте 3 мин свежего воздуха + лёгкую растяжку." :
               data.profile?.chrono?.type === "Сова" && data.data?.hour === "21-23" ? "Ваш вечерний пик. Идеально для рефлексии и подготовки ко сну. Отказ от экранов." :
               `Хронотип: ${data.profile?.chrono?.type}. Хронотип влияет на восприятие энергии меридиана.}`
              <br/>
              {data.data?.label === "Печень" && "Твой восточный месяц усиливает нагрузку на печень. Соблюдай постельный режим до 01:00."}
              {data.data?.label === "Почки" && "Фаза Цзяцзы указывает на накопление. Не перегружай почки солью и кофеином."}
            </p>
          </div>

          <div className="hm-modal-section" style={{background:'rgba(232,85,109,0.06)'}}>
            <strong>⚠️ Противопоказания:</strong>
            <p style={{marginTop:4, fontSize:12}}>
              Не выполнять глубокую проработку при лунном дне {data.current?.time === "11-13" ? "12" : "15"} (запрет на {data.current?.forbidden || "сердце/перикард"}).<br/>
              При стрессе >8: только статика + дыхание Сам Чон До.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
