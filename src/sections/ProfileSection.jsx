// src/sections/ProfileSection.jsx
import React, { useState, useMemo } from "react";
import { useApp } from "../store/AppContext";
import { getProfileInsights } from "../utils/knowledgeEngine";
import { getMeridianInfo, getChronotypePeaks } from "../data/profileKnowledge";
import { MaleAvatar, FemaleAvatar } from "../components/BlueprintAvatars";

// в”Ђв”Ђв”Ђ Р‘РђР—Рђ Р”РђРќРќР«РҐ Р¦РЇР¦Р—Р« (12 РЎРўРђР”РР™) в”Ђв”Ђв”Ђ
const JIAZI_STAGES = [
  { name: 'Р РѕР¶РґРµРЅРёРµ', spheres: { health: 'РРјРјСѓРЅРёС‚РµС‚, РєРѕРЅСЃС‚РёС‚СѓС†РёСЏ', career: 'РћР±СѓС‡РµРЅРёРµ, Р°РґР°РїС‚Р°С†РёСЏ', relations: 'РЎРµРјСЊСЏ, РєРѕСЂРЅРё', spirit: 'РџРѕРёСЃРє СЃРјС‹СЃР»Р°', finance: 'РќР°РєРѕРїР»РµРЅРёРµ' }, tips: 'Р—Р°РєР»Р°РґРєР° С„СѓРЅРґР°РјРµРЅС‚Р°. РР·Р±РµРіР°Р№ РїРµСЂРµРіСЂСѓР·РѕРє.', critical: 'Р¤РѕСЂРјРёСЂРѕРІР°РЅРёРµ Р±Р°Р·РѕРІС‹С… СЂРµР°РєС†РёР№.' },
  { name: 'РљСѓРїР°РЅРёРµ', spheres: { health: 'РќРµСЂРІРЅР°СЏ СЃРёСЃС‚РµРјР°, Р°РґР°РїС‚Р°С†РёСЏ', career: 'РџРѕРёСЃРє РїСѓС‚Рё', relations: 'РџРµСЂРІС‹Рµ СЃРІСЏР·Рё', spirit: 'Р”СѓС…РѕРІРЅС‹Р№ РІС‹Р±РѕСЂ', finance: 'Р—Р°РІРёСЃРёРјРѕСЃС‚СЊ в†’ СЃР°РјРѕСЃС‚РѕСЏС‚РµР»СЊРЅРѕСЃС‚СЊ' }, tips: 'Р¤РѕСЂРјРёСЂРѕРІР°РЅРёРµ СЂРµР°РєС†РёР№. РЈС‡РёС‚РµСЃСЊ РіРѕРІРѕСЂРёС‚СЊ "РЅРµС‚".', critical: 'Р­РјРѕС†РёРѕРЅР°Р»СЊРЅС‹Рµ С‚РµСЃС‚С‹, СЃРѕР·РґР°РЅРёРµ РєРѕРјРїР»РµРєСЃРѕРІ.' },
  { name: 'РћР±Р»Р°С‡РµРЅРёРµ', spheres: { health: 'Р“РѕСЂРјРѕРЅС‹, РєРѕР¶Р°', career: 'РљР°СЂСЊРµСЂРЅС‹Р№ СЃС‚Р°СЂС‚', relations: 'РџР°СЂС‚РЅС‘СЂСЃС‚РІРѕ', spirit: 'РЎР°РјРѕРёРґРµРЅС‚РёС„РёРєР°С†РёСЏ', finance: 'РџРµСЂРІС‹Рµ РґРѕС…РѕРґС‹' }, tips: 'РџСѓР±Р»РёС‡РЅС‹Р№ РІС‹С…РѕРґ. Р¤РѕСЂРјРёСЂСѓР№С‚Рµ РёРјРёРґР¶ РѕСЃРѕР·РЅР°РЅРЅРѕ.', critical: 'Р РёСЃРє С‡СѓР¶РёС… РѕР±С‘СЂС‚РѕРє Рё РЅРµРїСЂРѕРґСѓРјР°РЅРЅС‹С… СЃРІСЏР·РµР№.' },
  { name: 'Р’Р·СЂРѕСЃР»РµРЅРёРµ', spheres: { health: 'Р­РЅРµСЂРіРёСЏ, РІС‹РЅРѕСЃР»РёРІРѕСЃС‚СЊ', career: 'РџСЂРѕС„. СЂРѕСЃС‚', relations: 'РЎС‚Р°Р±РёР»СЊРЅС‹Рµ СЃРѕСЋР·С‹', spirit: 'Р¤РёР»РѕСЃРѕС„РёСЏ Р¶РёР·РЅРё', finance: 'РРЅРІРµСЃС‚РёС†РёРё' }, tips: 'РЎС‚Р°Р±РёР»РёР·Р°С†РёСЏ. Р”РѕР»РіРѕСЃСЂРѕС‡РЅС‹Рµ РїСЂРѕРµРєС‚С‹ РїСЂРёРЅРѕСЃСЏС‚ РїР»РѕРґС‹.', critical: 'РџРµСЂРµС…РѕРґ РѕС‚ СЌРєСЃРїРµСЂРёРјРµРЅС‚РѕРІ Рє РѕС‚РІРµС‚СЃС‚РІРµРЅРЅРѕСЃС‚Рё.' },
  { name: 'Р Р°СЃС†РІРµС‚', spheres: { health: 'РџРёРє С‚РѕРЅСѓСЃР°', career: 'Р›РёРґРµСЂСЃС‚РІРѕ', relations: 'Р“Р»СѓР±РѕРєРёРµ СЃРІСЏР·Рё', spirit: 'Р”СѓС…РѕРІРЅС‹Р№ Р°РІС‚РѕСЂРёС‚РµС‚', finance: 'РљР°РїРёС‚Р°Р»' }, tips: 'РџРёРє СЃРёР». Р РµР°Р»РёР·СѓР№ РіР»Р°РІРЅС‹Рµ С†РµР»Рё, РЅРѕ Р±РµСЂРµРіРё РЅРµСЂРІРЅСѓСЋ СЃРёСЃС‚РµРјСѓ.', critical: 'Р РёСЃРє РІС‹РіРѕСЂР°РЅРёСЏ РїСЂРё РёРіРЅРѕСЂРёСЂРѕРІР°РЅРёРё РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёСЏ.' },
  { name: 'РЎС‚Р°СЂРµРЅРёРµ', spheres: { health: 'Р’РѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёРµ', career: 'РќР°СЃС‚Р°РІРЅРёС‡РµСЃС‚РІРѕ', relations: 'РџРµСЂРµРґР°С‡Р° РѕРїС‹С‚Р°', spirit: 'РРЅС‚РµРіСЂР°С†РёСЏ', finance: 'РЎРѕС…СЂР°РЅРµРЅРёРµ' }, tips: 'РџРµСЂРµС…РѕРґ. РњСѓРґСЂРѕСЃС‚СЊ РІР°Р¶РЅРµРµ СЃРєРѕСЂРѕСЃС‚Рё.', critical: 'РќР°С‡Р°Р»Рѕ СѓРїР°РґРєР° СЌРЅРµСЂРіРёРё Р¦Рё. Р”РµР»РµРіРёСЂСѓР№.' },
  { name: 'Р‘РѕР»РµР·РЅСЊ', spheres: { health: 'РўРµСЂР°РїРёСЏ, Р±Р°Р»Р°РЅСЃ', career: 'РЎРјРµРЅР° С„РѕСЂРјР°С‚Р°', relations: 'РљР°С‡РµСЃС‚РІРѕ СЃРІСЏР·РµР№', spirit: 'РћС‡РёС‰РµРЅРёРµ', finance: 'РћРїС‚РёРјРёР·Р°С†РёСЏ' }, tips: 'РџРµСЂРµСЃРјРѕС‚СЂ РїСЂРёРѕСЂРёС‚РµС‚РѕРІ. РџСЂРѕС„РёР»Р°РєС‚РёРєР° РєСЂРёС‚РёС‡РЅР°.', critical: 'РџРµСЂРёРѕРґ СЃР»Р°Р±РѕСЃС‚Рё. РћСЃС‚РѕСЂРѕР¶РЅРѕСЃС‚СЊ РІ РґРµР№СЃС‚РІРёСЏС….' },
  { name: 'РЎРјРµСЂС‚СЊ', spheres: { health: 'Р“Р»СѓР±РѕРєР°СЏ С‚РµСЂР°РїРёСЏ', career: 'РЈС…РѕРґ СЃ РїРѕР·РёС†РёР№', relations: 'РџСЂРѕС‰РµРЅРёРµ', spirit: 'РџСЂРёРЅСЏС‚РёРµ', finance: 'Р Р°СЃРїСЂРµРґРµР»РµРЅРёРµ' }, tips: 'Р—Р°РІРµСЂС€РµРЅРёРµ С†РёРєР»Р°. РћС‚РїСѓСЃРєР°Р№ СЃС‚Р°СЂРѕРµ.', critical: 'РљСЂРёР·РёСЃ РёРґРµРЅС‚РёС‡РЅРѕСЃС‚Рё РїСЂРё С†РµРїР»СЏРЅРёРё Р·Р° РїСЂРѕС€Р»РѕРµ.' },
  { name: 'РҐСЂР°РЅРёР»РёС‰Рµ', spheres: { health: 'РџРѕРєРѕР№, РјРµРґРёС‚Р°С†РёСЏ', career: 'РўРІРѕСЂС‡РµСЃС‚РІРѕ РІ С‚РµРЅРё', relations: 'РўРёС…РёРµ СЃРІСЏР·Рё', spirit: 'Р’РЅСѓС‚СЂРµРЅРЅРёР№ РґРёР°Р»РѕРі', finance: 'РџР°СЃСЃРёРІ' }, tips: 'РЎРѕС…СЂР°РЅРµРЅРёРµ Р¦Рё. РќР°РєР°РїР»РёРІР°Р№ СЂРµСЃСѓСЂСЃС‹ РґР»СЏ РЅРѕРІРѕРіРѕ С†РёРєР»Р°.', critical: 'Р¤Р°Р·Р° РЅР°РєРѕРїР»РµРЅРёСЏ. Р”РµР№СЃС‚РІСѓР№ С‚РёС…Рѕ Рё РіР»СѓР±РѕРєРѕ.' },
  { name: 'РћС‚РґС‹С…', spheres: { health: 'Р РµРіРµРЅРµСЂР°С†РёСЏ', career: 'РџРµСЂРµСЂС‹РІ', relations: 'РћРґРёРЅРѕС‡РµСЃС‚РІРѕ', spirit: 'РњРµРґРёС‚Р°С†РёСЏ', finance: 'Р­РєРѕРЅРѕРјРёСЏ' }, tips: 'РџРѕР»РЅРѕРµ РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёРµ. РќРµ С„РѕСЂСЃРёСЂСѓР№ СЃРѕР±С‹С‚РёСЏ.', critical: 'РџСЂРёРЅСѓРґРёС‚РµР»СЊРЅС‹Р№ РїРµСЂРµСЂС‹РІ РґР»СЏ РёР·Р±РµР¶Р°РЅРёСЏ СЃР±РѕРµРІ.' },
  { name: 'Р—Р°С‡Р°С‚РёРµ', spheres: { health: 'РџРѕРґРіРѕС‚РѕРІРєР°', career: 'РРґРµРё', relations: 'РќРѕРІС‹Рµ Р·РЅР°РєРѕРјСЃС‚РІР°', spirit: 'РќР°РјРµСЂРµРЅРёРµ', finance: 'РџР»Р°РЅРёСЂРѕРІР°РЅРёРµ' }, tips: 'РЎРєСЂС‹С‚С‹Р№ СЂРѕСЃС‚РѕРє. Р—Р°РґР°РІР°Р№ РІРµРєС‚РѕСЂ Р±СѓРґСѓС‰РµРіРѕ С†РёРєР»Р°.', critical: 'Р¤РѕСЂРјСѓР»РёСЂРѕРІР°РЅРёРµ РЅР°РјРµСЂРµРЅРёР№. Р РµС€РµРЅРёРµ Рѕ Р·Р°РїСѓСЃРєРµ.' },
  { name: 'РЎРѕР·СЂРµРІР°РЅРёРµ', spheres: { health: 'РђРєС‚РёРІР°С†РёСЏ', career: 'Р—Р°РїСѓСЃРє', relations: 'РџРµСЂРµРіРѕРІРѕСЂС‹', spirit: 'Р¤РѕРєСѓСЃ', finance: 'РЎС‚Р°СЂС‚РѕРІС‹Р№ РєР°РїРёС‚Р°Р»' }, tips: 'РџРѕРґРіРѕС‚РѕРІРєР° Рє РЅРѕРІРѕРјСѓ СЂРѕР¶РґРµРЅРёСЋ. Р”РµР№СЃС‚РІСѓР№ СЂРµС€РёС‚РµР»СЊРЅРѕ.', critical: 'РњРѕРјРµРЅС‚ РёСЃС‚РёРЅС‹ РґР»СЏ СЂРµР°Р»РёР·Р°С†РёРё Р·Р°РґСѓРјР°РЅРЅРѕРіРѕ.' }
];

// в”Ђв”Ђв”Ђ РќРђР”РЃР–РќРђРЇ Р¤РЈРќРљР¦РРЇ РџРћР›РЈР§Р•РќРРЇ РџРЈРўР Рљ РР›Р›Р®РЎРўР РђР¦РР в”Ђв”Ђв”Ђ
const getFrontImage = (category, value) => {
  if (!value && category !== 'destiny') return null;
  const raw = String(value).trim().toLowerCase();
  if (category === 'chrono') {
    const map = { 'Р¶Р°РІРѕСЂРѕРЅРѕРє': 'front-chrono-lark.png', 'РіРѕР»СѓР±СЊ': 'front-chrono-pigeon.png', 'СЃРѕРІР°': 'front-chrono-owl.png' };
    for (const [k, v] of Object.entries(map)) { if (raw.includes(k)) return `/assets/avatars-icons/${v}`; }
    return '/assets/avatars-icons/front-chrono-pigeon.png';
  }
  if (category === 'destiny') return '/assets/avatars-icons/front-destiny.png';
  const paths = {
    western: { 'РѕРІРµРЅ':'front-zodiac-aries.png','С‚РµР»РµС†':'front-zodiac-taurus.png','Р±Р»РёР·РЅРµС†С‹':'front-zodiac-gemini.png','СЂР°Рє':'front-zodiac-cancer.png','Р»РµРІ':'front-zodiac-leo.png','РґРµРІР°':'front-zodiac-virgo.png','РІРµСЃС‹':'front-zodiac-libra.png','СЃРєРѕСЂРїРёРѕРЅ':'front-zodiac-scorpio.png','СЃС‚СЂРµР»РµС†':'front-zodiac-sagittarius.png','РєРѕР·РµСЂРѕРі':'front-zodiac-capricorn.png','РІРѕРґРѕР»РµР№':'front-zodiac-aquarius.png','СЂС‹Р±С‹':'front-zodiac-pisces.png' },
    eastern: { 'РєСЂС‹СЃР°':'front-eastern-rat.png','Р±С‹Рє':'front-eastern-ox.png','С‚РёРіСЂ':'front-eastern-tiger.png','РєСЂРѕР»РёРє':'front-eastern-rabbit.png','РґСЂР°РєРѕРЅ':'front-eastern-dragon.png','Р·РјРµСЏ':'front-eastern-snake.png','Р»РѕС€Р°РґСЊ':'front-eastern-horse.png','РєРѕР·Р°':'front-eastern-goat.png','РѕР±РµР·СЊСЏРЅР°':'front-eastern-monkey.png','РїРµС‚СѓС…':'front-eastern-rooster.png','СЃРѕР±Р°РєР°':'front-eastern-dog.png','СЃРІРёРЅСЊСЏ':'front-eastern-pig.png' }
  };
  const list = paths[category];
  return list?.[raw] ? `/assets/avatars-icons/${list[raw]}` : null;
};

// в”Ђв”Ђв”Ђ Р’РљР›РђР”РљР в”Ђв”Ђв”Ђ
function ProfileTabs({ activeTab, setActiveTab }) {
  const tabs = [{ id: 'main', label: 'РћРЎРќРћР’РќРћР™' }, { id: 'deep', label: 'Р“Р›РЈР‘РћРљРР™ РђРќРђР›РР—' }];
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 24, background: "rgba(0,112,192,0.06)", borderRadius: 8, padding: 4, border: "1px solid var(--line)" }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
          flex: 1, padding: "10px 0", border: "none", borderRadius: 6, cursor: "pointer",
          fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1,          background: activeTab === tab.id ? "var(--blue)" : "transparent",
          color: activeTab === tab.id ? "#fff" : "var(--text2)",
          transition: "all 0.2s", boxShadow: activeTab === tab.id ? "0 2px 6px rgba(0,112,192,0.2)" : "none"
        }}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// в”Ђв”Ђв”Ђ РђРљРљРћР Р”Р•РћРќ в”Ђв”Ђв”Ђ
function InnerAccordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 10, background: "rgba(0,112,192,0.04)", borderRadius: 8, border: "1px solid rgba(0,112,192,0.15)" }}>
      <div onClick={(e) => { e.stopPropagation(); setOpen(!open); }} style={{ padding: "10px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--blue)", letterSpacing: 0.5 }}>{title}</span>
        <span style={{ fontSize: 12, color: "var(--gold)", transform: open ? "rotate(180deg)" : "rotate(0)", transition: "0.2s" }}>в–ј</span>
      </div>
      {open && <div style={{ padding: "0 12px 12px", fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>{children}</div>}
    </div>
  );
}

// в”Ђв”Ђв”Ђ РљРђР РўРћР§РљРђ (РњРћР”РР¤РР¦РР РћР’РђРќРђ: frontContent) в”Ђв”Ђв”Ђ
function FlipCardBlock({ title, frontImage, accentColor = "var(--blue)", children, minHeight = 340, frontContent }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div style={{ perspective: "1200px", marginBottom: 28 }}>
      <div onClick={() => setFlipped(!flipped)} style={{ position: "relative", width: "100%", minHeight, transformStyle: "preserve-3d", transition: "transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)", transform: flipped ? "rotateY(180deg)" : "none", cursor: "pointer", borderRadius: 12 }}>
        
        {/* Р›РР¦Р•Р’РђРЇ РЎРўРћР РћРќРђ */}
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", borderRadius: 12, overflow: "hidden", background: "linear-gradient(135deg, #f8f4e8 0%, #e8d8c0 100%)", border: "2px solid var(--gold)", boxShadow: "0 6px 20px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: "translateZ(0)" }}>
          {frontImage ? <img src={frontImage} alt={title} style={{ maxHeight: "70%", maxWidth: "90%", objectFit: "contain", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.15))" }} onError={(e) => e.target.style.display = "none"} /> : <div style={{ width: "80%", height: "60%", background: "rgba(0,112,192,0.05)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", fontSize: 12 }}>РР»Р»СЋСЃС‚СЂР°С†РёСЏ</div>}
          
          {frontContent ? (
            <div style={{ padding: "0 20px 20px", width: "100%", textAlign: "center" }}>{frontContent}</div>
          ) : (
            <>
              <div style={{ marginTop: 14, fontFamily: "var(--font-head)", fontSize: 15, color: "var(--blue)", letterSpacing: "1px", fontWeight: 500 }}>{title}</div>
              <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4, fontFamily: "var(--font-mono)" }}>РќР°Р¶РјРёС‚Рµ РґР»СЏ РґРµС‚Р°Р»РµР№</div>
            </>
          )}
        </div>

        {/* РћР‘РћР РћРўРќРђРЇ РЎРўРћР РћРќРђ */}
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg) translateZ(0)", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.98)", border: "1.5px solid rgba(0,112,192,0.25)", boxShadow: "0 4px 16px rgba(0,112,192,0.12)", padding: 18, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
            <div style={{ width: 4, height: 24, background: accentColor, borderRadius: 2, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />            <h3 style={{ fontFamily: "var(--font-head)", fontSize: 15, color: "var(--blue)", margin: 0, letterSpacing: "0.6px", fontWeight: 600 }}>{title}</h3>
          </div>
          <div style={{ overflowY: "auto", flex: 1, maxHeight: "65vh", fontSize: 14, lineHeight: 1.7, color: "var(--text2)", paddingRight: 4 }}>{children}</div>
        </div>

      </div>
    </div>
  );
}

// в”Ђв”Ђв”Ђ РњРћР”РђР›Р¬РќРћР• РћРљРќРћ РџР•Р РРћР”Рђ в”Ђв”Ђв”Ђ
function YearModal({ year, currentAge, onClose }) {
  const stageIndex = Math.floor((year % 60) / 5) % 12;
  const stage = JIAZI_STAGES[stageIndex];
  const isCurrent = year === currentAge;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease" }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "90%", maxWidth: 620, maxHeight: "85vh", overflowY: "auto",
        background: "rgba(255,255,255,0.98)", borderRadius: 12, padding: 24,
        border: "1.5px solid rgba(0,112,192,0.25)", boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
        position: "relative"
      }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text3)" }}>вњ•</button>
        <h2 style={{ fontFamily: "var(--font-head)", fontSize: 22, color: "var(--blue)", margin: "0 0 16px 0", letterSpacing: "1px" }}>
          РџРµСЂРёРѕРґ {year} {year <= currentAge ? '(РїСЂРѕС€Р»С‹Р№)' : year === currentAge ? '(С‚РµРєСѓС‰РёР№)' : '(Р±СѓРґСѓС‰РёР№)'} Р»РµС‚
        </h2>
        <InnerAccordion title="Р¤Р°Р·Р° Р¦Р·СЏС†Р·С‹ Рё Р·РЅР°С‡РµРЅРёРµ РїРµСЂРёРѕРґР°" defaultOpen={true}>
          <strong style={{ color: "var(--blue)", fontSize: 15 }}>{stage.name}</strong>
          <p style={{ margin: "8px 0 0", fontSize: 14 }}>{stage.tips}</p>
          <div style={{ marginTop: 10, padding: 10, background: "rgba(139,32,32,0.06)", borderRadius: 6, borderLeft: "3px solid var(--error)" }}>
            <strong style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--error)", letterSpacing: 1 }}>вљ пёЏ РљР РРўРР§Р•РЎРљРђРЇ РўРћР§РљРђ</strong>
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>{stage.critical}</p>
          </div>
        </InnerAccordion>

        <InnerAccordion title="Р Р°Р·Р±РѕСЂ РїРѕ СЃС„РµСЂР°Рј Р¶РёР·РЅРё">
          <div style={{ display: "grid", gap: 8 }}>
            {Object.entries(stage.spheres).map(([k, v]) => (
              <div key={k} style={{ display: "flex", gap: 8, fontSize: 13 }}>
                <span style={{ color: "var(--gold-dark)", fontWeight: 600, minWidth: 90 }}>{k.toUpperCase()}: </span> <span>{v}</span>
              </div>
            ))}
          </div>
        </InnerAccordion>

        <InnerAccordion title="Р’РµРґРёС‡РµСЃРєРёР№ С„РѕРЅ Рё СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ">
          <p style={{ marginBottom: 8 }}>Р’ РїРµСЂРёРѕРґ {year} Р»РµС‚ СЌРЅРµСЂРіРµС‚РёС‡РµСЃРєРёР№ С„РѕРЅ С‚СЂРµР±СѓРµС‚ {year % 5 === 0 ? 'РїРµСЂРµС…РѕРґРЅРѕР№ РѕСЃС‚РѕСЂРѕР¶РЅРѕСЃС‚Рё' : year % 2 === 0 ? 'СЃС‚Р°Р±РёР»РёР·Р°С†РёРё Рё Р·Р°Р·РµРјР»РµРЅРёСЏ' : 'Р°РєС‚РёРІРЅРѕСЃС‚Рё Рё РґРІРёР¶РµРЅРёСЏ'}.</p>
          <p>РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ СЃ Р±РёРѕСЂРёС‚РјР°РјРё Рё Р»СѓРЅРЅС‹РјРё С†РёРєР»Р°РјРё РІ СЌС‚РѕС‚ РїРµСЂРёРѕРґ СѓСЃРёР»РёРІР°РµС‚ РІР»РёСЏРЅРёРµ {stage.name === 'Р Р°СЃС†РІРµС‚' ? 'РЇРЅ-Р¦Рё (СЂР°СЃС€РёСЂРµРЅРёРµ)' : 'РРЅСЊ-Р¦Рё (РІРЅСѓС‚СЂРµРЅРЅСЏСЏ СЂР°Р±РѕС‚Р°)'}. Р РµРєРѕРјРµРЅРґРѕРІР°РЅС‹ РїСЂР°РєС‚РёРєРё {stage.name === 'РЎС‚Р°СЂРµРЅРёРµ' ? 'СЃРѕС…СЂР°РЅРµРЅРёСЏ Рё РЅР°СЃС‚Р°РІРЅРёС‡РµСЃС‚РІР°' : 'СЂРµР°Р»РёР·Р°С†РёРё Рё РѕР±РјРµРЅР° СЌРЅРµСЂРіРёРµР№'}.</p>
        </InnerAccordion>
        {isCurrent && (
          <div style={{ marginTop: 12, padding: 12, background: "rgba(0,112,192,0.06)", borderRadius: 8, borderLeft: "3px solid var(--blue)" }}>
            <strong style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--blue)", letterSpacing: 1 }}>рџ§­ Р’РђРЁ РўР•РљРЈР©РР™ РџРЈРўР¬</strong>
            <p style={{ margin: "6px 0 0", fontSize: 13 }}>Р’С‹ СЃРµР№С‡Р°СЃ РІ С„Р°Р·Рµ {stage.name}. РСЃРїРѕР»СЊР·СѓР№С‚Рµ СЌС‚РѕС‚ РїРµСЂРёРѕРґ РґР»СЏ {stage.spheres.career} Рё СѓРєСЂРµРїР»РµРЅРёСЏ {stage.spheres.health}. РљСЂРёС‚РёС‡РµСЃРєРёРµ С‚РѕС‡РєРё РјРѕР¶РЅРѕ РЅРёРІРµР»РёСЂРѕРІР°С‚СЊ РѕСЃРѕР·РЅР°РЅРЅРѕСЃС‚СЊСЋ Рё СЂРµРіСѓР»СЏСЂРЅРѕР№ РїСЂР°РєС‚РёРєРѕР№.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// в”Ђв”Ђв”Ђ Р“Р РђР¤РР§Р•РЎРљРР™ РўРђР™РњР›РђР™Рќ (Р¦РРЇР¦Р—Р«) в”Ђв”Ђв”Ђ
function CycleTimeline({ dob, onYearSelect }) {
  // вњ… РўРћР§РќР«Р™ Р РђРЎР§Р•Рў Р’РћР—Р РђРЎРўРђ (useMemo)
  const age = useMemo(() => {
    if (!dob) return 0;
    const today = new Date();
    const birthDate = new Date(dob);
    let ageVal = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      ageVal--;
    }
    return ageVal;
  }, [dob]);

  const years = useMemo(() => Array.from({ length: 21 }, (_, i) => i * 5), []);
  const [hoverYear, setHoverYear] = useState(null);

  // Р”Р°РЅРЅС‹Рµ РґР»СЏ 5 Р»РёРЅРёР№ (Р—РґРѕСЂРѕРІСЊРµ, РљР°СЂСЊРµСЂР°, РћС‚РЅРѕС€РµРЅРёСЏ, Р”СѓС…РѕРІРЅРѕСЃС‚СЊ, Р¤РёРЅР°РЅСЃС‹)
  // Р—РЅР°С‡РµРЅРёСЏ СЌРЅРµСЂРіРёРё (0-100) РґР»СЏ 12 СЃС‚Р°РґРёР№ Р¦СЏС†Р·С‹
  const stagePower = {
    health: [30, 40, 55, 70, 90, 80, 60, 40, 35, 45, 55, 65],
    career: [20, 35, 50, 70, 90, 75, 55, 35, 40, 55, 70, 80],
    relations: [40, 50, 60, 70, 80, 90, 70, 50, 60, 70, 80, 90],
    spirit: [90, 80, 70, 60, 50, 60, 80, 95, 85, 75, 65, 55],
    finance: [10, 30, 50, 70, 80, 70, 50, 30, 40, 60, 80, 95]
  };

  // РРЅС‚РµСЂРїРѕР»СЏС†РёСЏ РґР»СЏ 20 С‚РѕС‡РµРє (0-100 Р»РµС‚)
  const getChartData = (sphere) => {
    const data = stagePower[sphere];
    const points = [];
    for (let i = 0; i < 20; i++) {
      const idx = (i / 20) * 12;
      const lower = Math.floor(idx);
      const upper = Math.ceil(idx) % 12;
      const frac = idx - lower;
      const val = data[lower] + (data[upper] - data[lower]) * frac;      points.push({ x: i, y: val });
    }
    return points;
  };

  const width = 800;
  const height = 200;
  const paddingX = 40;
  const paddingY = 20;
  const graphWidth = width - 2 * paddingX;
  const graphHeight = height - 2 * paddingY;

  const getScaledY = (val) => graphHeight - (val / 100) * graphHeight + paddingY;

  const spheres = ['health', 'career', 'relations', 'spirit', 'finance'];

  return (
    <div style={{ position: "relative", padding: "20px 0", overflow: "hidden", borderRadius: 12, background: "rgba(255,255,255,0.8)", border: "1px solid var(--line)", marginBottom: 24 }}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.6 }} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <style>{"@keyframes flow-bg { 0%{stroke-dashoffset:0} 100%{stroke-dashoffset:-40} } "}</style>
        </defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,112,192,0.08)" strokeWidth="0.5" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {[0, 25, 50, 75, 100].map(pct => (
           <line key={pct} x1={paddingX} y1={getScaledY(pct)} x2={width - paddingX} y2={getScaledY(pct)} stroke="rgba(0,112,192,0.1)" strokeWidth="1" />
        ))}

        {spheres.map(sphere => {
          const data = getChartData(sphere);
          const d = data.map((pt, i) => {
            const x = paddingX + (i / 19) * graphWidth;
            const y = getScaledY(pt.y);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ');
          return (
            <path key={sphere} d={d} fill="none" stroke={getSphereColor(sphere)} strokeWidth="2" opacity="0.8" />
          );
        })}

        {years.map((y, i) => {
          const x = paddingX + (i / 19) * graphWidth;
          return (
            <g key={y} onMouseEnter={() => setHoverYear(y)} onMouseLeave={() => setHoverYear(null)} style={{ cursor: 'pointer' }}>
              <rect x={x - 15} y={0} width={30} height={height} fill="transparent" />
              {spheres.map(sphere => {
                const data = getChartData(sphere);                const py = getScaledY(data[i].y);
                return <circle key={sphere} cx={x} cy={py} r={hoverYear === y ? 5 : 3} fill={getSphereColor(sphere)} opacity={hoverYear === y ? 1 : 0} />;
              })}
              <text x={x} y={height - 5} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill={hoverYear === y ? "var(--blue)" : "var(--text3)"}>{y}</text>
            </g>
          );
        })}
      </svg>

      <div style={{ position: "relative", zIndex: 1, padding: "0 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
           <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: "var(--blue)", margin: 0, letterSpacing: 1 }}>рџЊЉ Р–РёР·РЅРµРЅРЅС‹Р№ С†РёРєР» (Р¦СЏС†Р·С‹)</h3>
           <span className="badge bgr" style={{ fontSize: 11, padding: "4px 10px" }}>РўРµРєСѓС‰РёР№: {age} Р»РµС‚</span>
        </div>
        
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
           {spheres.map(s => (
             <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
               <span style={{ width: 8, height: 8, borderRadius: "50%", background: getSphereColor(s) }}></span>
               <span style={{ textTransform: "capitalize", color: "var(--text2)" }}>{s}</span>
             </div>
           ))}
        </div>
      </div>

      {hoverYear !== null && (
        <div style={{
          position: "absolute", bottom: 20, left: 20, right: 20,
          background: "rgba(255,255,255,0.95)", border: "1px solid var(--line)",
          borderRadius: 8, padding: 12, zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}>
          <div style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--blue)", marginBottom: 8 }}>Р’РѕР·СЂР°СЃС‚: {hoverYear} Р»РµС‚</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
            {spheres.map(s => {
              const data = getChartData(s);
              const idx = Math.round((hoverYear / 100) * 19);
              const val = data[idx] ? Math.round(data[idx].y) : "вЂ”";
              return (
                <div key={s} style={{ fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text3)" }}>{s}:</span>
                  <strong style={{ color: getSphereColor(s) }}>{val}%</strong>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", fontSize: 11, color: "var(--text3)", marginTop: 12 }}>
         РќР°Р¶РјРёС‚Рµ РЅР° РіРѕРґ РґР»СЏ РґРµС‚Р°Р»РёР·Р°С†РёРё. РќР°РІРµРґРёС‚Рµ РґР»СЏ РїСЂРѕСЃРјРѕС‚СЂР° Р±Р°Р»Р°РЅСЃР° СЃС„РµСЂ.      </div>
    </div>
  );
}

const getSphereColor = (sphere) => {
  switch(sphere) {
    case 'health': return '#2d6a4f';
    case 'career': return '#0070c0';
    case 'relations': return '#e8556d';
    case 'spirit': return '#b882e8';
    case 'finance': return '#c8a45a';
    default: return '#ccc';
  }
};

// в”Ђв”Ђв”Ђ РћРЎРќРћР’РќРћР™ РљРћРњРџРћРќР•РќРў в”Ђв”Ђв”Ђ
export function ProfileSection() {
  const { profile, setProfile, notify } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('main');
  const [selectedYear, setSelectedYear] = useState(null);

  if (!profile) return <div style={{ padding: 40, textAlign: "center", color: "var(--text2)" }}>Р—Р°РіСЂСѓР·РєР° РїСЂРѕС„РёР»СЏ...</div>;

  const insights = getProfileInsights(profile);
  
  // вњ… РўРћР§РќР«Р™ Р РђРЎР§Р•Рў Р’РћР—Р РђРЎРўРђ (РґСѓР±Р»РёСЂСѓРµРј РґР»СЏ РЅР°РґРµР¶РЅРѕСЃС‚Рё РІ РѕСЃРЅРѕРІРЅРѕРј РєРѕРјРїРѕРЅРµРЅС‚Рµ)
  const age = useMemo(() => {
    if (!profile.dob) return null;
    const today = new Date();
    const birthDate = new Date(profile.dob);
    let ageVal = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      ageVal--;
    }
    return ageVal;
  }, [profile.dob]);

  const genderStr = String(profile.gender || "").trim();
  const isMale = genderStr.toLowerCase().includes("РјСѓР¶") || genderStr.toLowerCase() === "male";
  const meridianInfo = getMeridianInfo(insights.zodiac);
  const chronoPeaks = getChronotypePeaks(profile.chronotype);
  const destiny = insights.destiny || { degree: 241, interpretation: "РРЅС‚РµРіСЂР°С†РёСЏ РѕРїС‹С‚Р°" };
  const currentJiaziIndex = age ? Math.floor((age % 60) / 5) % 12 : 0;
  const currentJiaziStage = JIAZI_STAGES[currentJiaziIndex];

  const handleRefresh = () => { setIsRefreshing(true); setTimeout(() => { setIsRefreshing(false); notify?.("вњ… Р”Р°РЅРЅС‹Рµ РѕР±РЅРѕРІР»РµРЅС‹"); }, 800); };
  const handleReset = () => { if (window.confirm("Р’С‹ СѓРІРµСЂРµРЅС‹? Р­С‚Рѕ СѓРґР°Р»РёС‚ РІР°С€ РїСЂРѕС„РёР»СЊ Рё РІРµСЂРЅРµС‚ Рє РЅР°С‡Р°Р»Сѓ РЅР°СЃС‚СЂРѕР№РєРё.")) { setProfile(null); notify?.("рџ—‘пёЏ РџСЂРѕС„РёР»СЊ СЃР±СЂРѕС€РµРЅ"); } };  const handleYearSelect = (y) => setSelectedYear(y);

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {activeTab === 'main' && (
        <>
          <FlipCardBlock title="РџСЂРѕС„РёР»СЊ" frontImage={isMale ? '/assets/avatars-icons/male-avatar.png' : '/assets/avatars-icons/female-avatar.png'} accentColor="var(--blue)" minHeight={360}
            frontContent={
              <div style={{ textAlign: "center", marginTop: 10 }}>
                 <h2 style={{ fontFamily: "var(--font-head)", fontSize: 22, color: "var(--text1)", margin: "0 0 8px 0", letterSpacing: "1.2px", fontWeight: 600 }}>{profile.name || "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ"}</h2>
                 <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 8 }}>
                    <span className="badge bgr" style={{ fontSize: 12, padding: "4px 10px" }}>рџЋ‚ {age ?? "вЂ”"} Р»РµС‚</span>
                    {profile.chronotype && <span className="badge bt" style={{ fontSize: 12, padding: "4px 10px" }}>вЏ± {profile.chronotype}</span>}
                    {insights.zodiac && <span className="badge bm" style={{ fontSize: 12, padding: "4px 10px" }}>в™€ {insights.zodiac}</span>}
                 </div>
                 <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5, padding: "8px 12px", background: "rgba(0,112,192,0.05)", borderRadius: 8, borderLeft: "3px solid var(--gold)", textAlign: "left" }}>
                    <strong style={{ color: "var(--gold-dark)" }}>РЎРІРѕРґРєР°:</strong> {insights.zodiac || "вЂ”"} ({insights.zodiacElement || "Р’РѕР·РґСѓС…"}) В· {insights.eastern || "вЂ”"} ({insights.easternElement || "Р’РѕРґР°"}) В· Р“СЂР°РґСѓСЃ: <strong style={{ color: "var(--gold)" }}>{destiny.degree}В°</strong>
                 </div>
              </div>
            }
          >
            <div style={{ textAlign: "center", color: "var(--text3)", marginTop: 40, fontSize: 12 }}>
               <p>РџРѕРґСЂРѕР±РЅР°СЏ РёРЅС„РѕСЂРјР°С†РёСЏ РґРѕСЃС‚СѓРїРЅР° РІ РЅР°СЃС‚СЂРѕР№РєР°С… РїСЂРёР»РѕР¶РµРЅРёСЏ.</p>
            </div>
          </FlipCardBlock>

          <FlipCardBlock title="Р—Р°РїР°РґРЅС‹Р№ Р—РѕРґРёР°Рє" frontImage={getFrontImage("western", insights.zodiac)} accentColor="var(--blue)"
            frontContent={
               <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)", padding: "0 10px" }}>
                  <p style={{ marginBottom: 8, fontWeight: 500 }}>
                     <strong style={{ color: "var(--blue)", fontSize: 15 }}>{insights.zodiac || "вЂ”"}</strong> <span>({insights.zodiacElement || "Р’РѕР·РґСѓС…"}) РїРѕРґ СѓРїСЂР°РІР»РµРЅРёРµРј {insights.rulingPlanet || "РњРµСЂРєСѓСЂРёСЏ"}.</span>
                  </p>
                  <InnerAccordion title="РЎРёР»СЊРЅС‹Рµ СЃС‚РѕСЂРѕРЅС‹" defaultOpen={true}>
                     {insights.zodiacStrengths || "РљРѕРјРјСѓРЅРёРєР°С†РёСЏ, Р°РґР°РїС‚РёРІРЅРѕСЃС‚СЊ, РёРЅС‚РµР»Р»РµРєС‚"}
                  </InnerAccordion>
               </div>
             }
          >
             <InnerAccordion title="РЈСЏР·РІРёРјС‹Рµ Р·РѕРЅС‹">
                {insights.zodiacWeaknesses || "Р›С‘РіРєРёРµ, Р±СЂРѕРЅС…Рё, РїР»РµС‡Рё, РЅРµСЂРІРЅР°СЏ СЃРёСЃС‚РµРјР°"}
             </InnerAccordion>
             <InnerAccordion title="РљР°Рє РёСЃРїРѕР»СЊР·РѕРІР°С‚СЊ">
                <ul style={{ margin: "0 0 0 18px", lineHeight: 1.7 }}>
                   <li>РџР»Р°РЅРёСЂСѓР№ РІР°Р¶РЅС‹Рµ РґРµР»Р° РЅР° {chronoPeaks.focus?.hours || "СѓС‚СЂРѕ"}</li>
                   <li>РР·Р±РµРіР°Р№ РјРЅРѕРіРѕР·Р°РґР°С‡РЅРѕСЃС‚Рё</li>
                   <li>Р”С‹С…Р°С‚РµР»СЊРЅС‹Рµ РїСЂР°РєС‚РёРєРё СѓРєСЂРµРїР»СЏСЋС‚ СЃР»Р°Р±С‹Рµ Р·РѕРЅС‹</li>
                </ul>
             </InnerAccordion>          </FlipCardBlock>

          <FlipCardBlock title="Р’РѕСЃС‚РѕС‡РЅС‹Р№ Р—РЅР°Рє" frontImage={getFrontImage("eastern", insights.eastern)} accentColor="var(--gold)"
            frontContent={
               <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)", padding: "0 10px" }}>
                  <p style={{ marginBottom: 8, fontWeight: 500 }}>
                     <strong style={{ color: "var(--gold-dark)", fontSize: 15 }}>{insights.eastern || "вЂ”"}</strong> <span>({insights.easternElement || "Р’РѕРґР°"}).</span>
                  </p>
                  <InnerAccordion title="Р­РЅРµСЂРіРµС‚РёС‡РµСЃРєРёР№ РїРѕСЂС‚СЂРµС‚" defaultOpen={true}>
                     {insights.easternTraits || "Р§РµСЃС‚РЅРѕСЃС‚СЊ Рё С‚РµСЂРїРёРјРѕСЃС‚СЊ"}. РўРІРѕСЏ СЃС‚РёС…РёСЏ РЅР°РґРµР»СЏРµС‚ С‚РµР±СЏ РіР»СѓР±РѕРєРѕР№ РёРЅС‚СѓРёС†РёРµР№.
                  </InnerAccordion>
               </div>
             }
          >
             <InnerAccordion title="РљР°СЂРјРёС‡РµСЃРєР°СЏ Р·Р°РґР°С‡Р°">
                {insights.easternKarma || "РќР°СѓС‡РёС‚СЊСЃСЏ РіРѕРІРѕСЂРёС‚СЊ 'РЅРµС‚' Р±РµР· С‡СѓРІСЃС‚РІР° РІРёРЅС‹"}. Р’С‹СЃС‚СЂР°РёРІР°Р№ РіСЂР°РЅРёС†С‹, РЅРµ С‚РµСЂСЏСЏ СЌРјРїР°С‚РёРё.
             </InnerAccordion>
             <InnerAccordion title="Р РµРєРѕРјРµРЅРґР°С†РёРё">
                <ul style={{ margin: "0 0 0 18px", lineHeight: 1.7 }}>
                   <li>РСЃРїРѕР»СЊР·СѓР№ СЃРїР°РґС‹ СЌРЅРµСЂРіРёРё РґР»СЏ РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёСЏ</li>
                   <li>Р”РѕРІРµСЂСЏР№ РёРЅС‚СѓРёС†РёРё РІ С„РёРЅР°РЅСЃРѕРІС‹С… РІРѕРїСЂРѕСЃР°С…</li>
                   <li>РР·Р±РµРіР°Р№ С‚РѕРєСЃРёС‡РЅС‹С… СЃРІСЏР·РµР№</li>
                </ul>
             </InnerAccordion>
          </FlipCardBlock>

          <FlipCardBlock title="Р“СЂР°РґСѓСЃ РЎСѓРґСЊР±С‹" frontImage={getFrontImage("destiny")} accentColor="var(--gold)"
            frontContent={
               <div style={{ textAlign: "center", padding: "0 10px" }}>
                  <div style={{ fontFamily: "var(--font-head)", fontSize: 28, color: "var(--gold)", fontWeight: 600, letterSpacing: "2.5px" }}>{destiny.degree || 241}В°</div>
                  <div style={{ fontFamily: "var(--font-italic)", fontSize: 14, color: "var(--text2)", marginTop: 4, fontStyle: "italic" }}>{destiny.interpretation || "РРЅС‚РµРіСЂР°С†РёСЏ РѕРїС‹С‚Р°"}</div>
                  <InnerAccordion title="РћРїРёСЃР°РЅРёРµ" defaultOpen={true} style={{ marginTop: 12, textAlign: "left" }}>
                     РўРІРѕР№ РіСЂР°РґСѓСЃ {destiny.degree}В° СѓРєР°Р·С‹РІР°РµС‚ РЅР° С‚РµРєСѓС‰СѓСЋ С„Р°Р·Сѓ Р¶РёР·РЅРµРЅРЅРѕРіРѕ С†РёРєР»Р°. {destiny.degree < 120 ? "РђРєС‚РёРІРЅРѕРµ СЃРѕР·РёРґР°РЅРёРµ. " : destiny.degree < 240 ? "РЎС‚СЂСѓРєС‚СѓСЂРёСЂРѕРІР°РЅРёРµ СЂРѕСЃС‚Р°. " : "РРЅС‚РµРіСЂР°С†РёСЏ РѕРїС‹С‚Р°. "}
                  </InnerAccordion>
               </div>
             }
          >
             <InnerAccordion title="РљР°Рє РёСЃРїРѕР»СЊР·РѕРІР°С‚СЊ">
                <ul style={{ margin: "0 0 0 18px", lineHeight: 1.7 }}>
                   <li>Р”РѕРІРµСЂСЏР№ РёРЅС‚СѓРёС†РёРё, РїСЂРѕРІРµСЂСЏР№ С„Р°РєС‚Р°РјРё</li>
                   <li>Р’РµРґРё РґРЅРµРІРЅРёРє РЅР°Р±Р»СЋРґРµРЅРёР№</li>
                </ul>
             </InnerAccordion>
          </FlipCardBlock>

          <FlipCardBlock title="РҐСЂРѕРЅРѕ-С‚РёРї" frontImage={getFrontImage("chrono", profile.chronotype)} accentColor="var(--blue)"
            frontContent={
               <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)", padding: "0 10px" }}>
                  <p style={{ marginBottom: 10, fontWeight: 500 }}>
                     <strong style={{ color: "var(--blue)", fontSize: 15 }}>{profile.chronotype || "рџ•ЉпёЏ Р“РѕР»СѓР±СЊ"}</strong>                  </p>
                  <div style={{ padding: 10, background: "rgba(45,106,79,0.08)", borderRadius: 8, borderLeft: "3px solid var(--success)", marginBottom: 10 }}>
                     <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--success)", letterSpacing: 1, marginBottom: 4 }}>рџ§  РџРРљ РљРћРќР¦Р•РќРўР РђР¦РР</div>
                     <p style={{ margin: 0, fontSize: 12 }}>{chronoPeaks.focus?.tip || "РЎР°РјС‹Рµ СЃР»РѕР¶РЅС‹Рµ Р·Р°РґР°С‡Рё вЂ” РІ СЌС‚Рѕ РІСЂРµРјСЏ."}</p>
                  </div>
               </div>
             }
          >
             <div style={{ padding: 10, background: "rgba(139,32,32,0.06)", borderRadius: 8, borderLeft: "3px solid var(--error)", marginBottom: 12 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--error)", letterSpacing: 1, marginBottom: 4 }}>вљЎ РџР РћР’РђР› Р­РќР•Р Р“РР</div>
                <p style={{ margin: 0, fontSize: 12 }}>{chronoPeaks.rest?.tip || "РРґРµР°Р»СЊРЅРѕ РґР»СЏ СЂСѓС‚РёРЅС‹."}</p>
             </div>
             <InnerAccordion title="РљР°Рє РёСЃРїРѕР»СЊР·РѕРІР°С‚СЊ" defaultOpen={true}>
                <ul style={{ margin: "0 0 0 18px", lineHeight: 1.7 }}>
                   <li>РЎРёРЅС…СЂРѕРЅРёР·РёСЂСѓР№ СЂР°СЃРїРёСЃР°РЅРёРµ СЃ Р±РёРѕСЂРёС‚РјР°РјРё вЂ” РљРџР” +30вЂ“40%</li>
                   <li>РЎР»РѕР¶РЅС‹Рµ СЂРµС€РµРЅРёСЏ вЂ” С‚РѕР»СЊРєРѕ РІ РїРёРєРѕРІС‹Рµ С‡Р°СЃС‹</li>
                   <li>РЎРѕР±Р»СЋРґР°Р№ СЂРµР¶РёРј СЃРЅР°: {chronoPeaks.sleep?.hours || "22:30вЂ“23:30"}</li>
                </ul>
             </InnerAccordion>
          </FlipCardBlock>
        </>
      )}

      {activeTab === 'deep' && (
        <>
          {/* 1. Р“Р›РЈР‘РћРљРР™ РђРќРђР›РР— (РЎР•РўРљРђ 2x2) */}
           <div style={{ background: "rgba(0,112,192,0.03)", borderRadius: 10, padding: 18, border: "1px solid var(--line)", marginBottom: 24 }}>
             <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
               <div style={{ width: 4, height: 24, background: "var(--blue)", borderRadius: 2 }} />
               <h3 style={{ fontFamily: "var(--font-head)", fontSize: 16, color: "var(--blue)", margin: 0, letterSpacing: 1 }}>рџ”Ќ Р“Р»СѓР±РѕРєРёР№ Р°РЅР°Р»РёР· РїСЂРѕС„РёР»СЏ</h3>
             </div>
             
             <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                {/* РњРµС‚РѕРґРѕР»РѕРіРёСЏ */}
                <div style={{ background: "#fff", padding: 16, borderRadius: 8, border: "1px solid var(--line)", borderTop: "3px solid var(--blue)" }}>
                   <h4 style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--blue)", margin: "0 0 8px 0" }}>РњРµС‚РѕРґРѕР»РѕРіРёСЏ</h4>
                   <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                      <div style={{ marginBottom: 6 }}><strong style={{ color: "var(--blue)" }}>Р¦Р·СЏС†Р·С‹:</strong> Р’РѕР·СЂР°СЃС‚ СЂРµРґСѓС†РёСЂСѓРµС‚СЃСЏ РїРѕ РјРѕРґСѓР»СЋ 60 в†’ РѕРїСЂРµРґРµР»СЏРµС‚СЃСЏ СЃС‚Р°РґРёСЏ (0вЂ“5, 5вЂ“10вЂ¦ 55вЂ“60 Р»РµС‚). РљР°Р¶РґР°СЏ СЃС‚Р°РґРёСЏ Р·Р°РґР°С‘С‚ РІРµРєС‚РѕСЂ Р¦Рё РґР»СЏ 5 СЃС„РµСЂ.</div>
                      <div style={{ marginBottom: 6 }}><strong style={{ color: "var(--gold-dark)" }}>Р’РµРґРёС‡РµСЃРєРёР№ РєР°Р»РµРЅРґР°СЂСЊ:</strong> РћРїСЂРµРґРµР»СЏРµС‚СЃСЏ СЃРµР·РѕРЅРЅС‹Р№ С„РѕРЅ (РЇРЅ/РРЅСЊ Р¦Рё), Р»СѓРЅРЅС‹Рµ РѕРіСЂР°РЅРёС‡РµРЅРёСЏ РїРѕ РґРµРєР°РґР°Рј, РєРѕРЅС„Р»РёРєС‚ РґРЅРµР№ СЃ РјРµСЃСЏС†РµРј, Р±Р»Р°РіРѕРїСЂРёСЏС‚РЅС‹Рµ/РЅРµР±Р»Р°РіРѕРїСЂРёСЏС‚РЅС‹Рµ С‡Р°СЃС‹.</div>
                      <div><strong style={{ color: "var(--success)" }}>Р Р°Рѕ (Р™РѕРіРё/РњР°СЂР°РєРё):</strong> РЈРїСЂР°РІРёС‚РµР»Рё 1,5,9 РґРѕРјРѕРІ в†’ Р±Р»Р°РіРѕС‚РІРѕСЂРЅС‹Рµ; 3,6,11 в†’ Р·Р»РѕС‚РІРѕСЂРЅС‹Рµ; 2,8,12 в†’ РїР°РіСѓР±РЅРѕ-РЅРµР№С‚СЂР°Р»СЊРЅС‹Рµ. РњР°СЂР°РєРё (2+7) РїРѕРєР°Р·С‹РІР°СЋС‚ Р·РѕРЅС‹ СЂРёСЃРєР°.</div>
                   </div>
                </div>

                {/* РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ */}
                <div style={{ background: "#fff", padding: 16, borderRadius: 8, border: "1px solid var(--line)", borderTop: "3px solid var(--gold)" }}>
                   <h4 style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--gold)", margin: "0 0 8px 0" }}>РЎРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ</h4>
                   <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                      <p style={{ marginBottom: 6 }}>Р’Р°С€Р° С‚РµРєСѓС‰Р°СЏ С„Р°Р·Р° Р¦Р·СЏС†Р·С‹ С‚СЂРµР±СѓРµС‚ {currentJiaziStage.name === 'Р Р°СЃС†РІРµС‚' ? 'СЂРµР°Р»РёР·Р°С†РёРё Рё Р»РёРґРµСЂСЃС‚РІР°' : currentJiaziStage.name === 'Р’Р·СЂРѕСЃР»РµРЅРёРµ' ? 'СЃС‚Р°Р±РёР»РёР·Р°С†РёРё Рё РґРѕР»РіРѕСЃСЂРѕС‡РЅС‹С… РїСЂРѕРµРєС‚РѕРІ' : 'РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёСЏ Рё Р°РєРєСѓРјСѓР»РёСЂРѕРІР°РЅРёСЏ СЂРµСЃСѓСЂСЃРѕРІ'}.</p>
                      <p style={{ marginBottom: 6 }}>Р’РµРґРёС‡РµСЃРєРёР№ С„РѕРЅ СѓРєР°Р·С‹РІР°РµС‚ РЅР° РЅРµРѕР±С…РѕРґРёРјРѕСЃС‚СЊ {insights.zodiac === 'Р‘Р»РёР·РЅРµС†С‹' ? 'Р±Р°Р»Р°РЅСЃР° СЂРµС‡Рё Рё РґС‹С…Р°С‚РµР»СЊРЅС‹С… РїСЂР°РєС‚РёРє' : 'РіР°СЂРјРѕРЅРёР·Р°С†РёРё РРЅСЊ-РЇРЅ С‡РµСЂРµР· СЂРµР¶РёРј СЃРЅР° Рё РїРёС‚Р°РЅРёРµ'}.</p>
                      <p>РџРµСЂРµСЃРµС‡РµРЅРёРµ РїРѕРєР°Р·С‹РІР°РµС‚: Р±Р»Р°РіРѕРїСЂРёСЏС‚РЅРѕ РґРµР№СЃС‚РІРѕРІР°С‚СЊ РІ РїРёРєРѕРІС‹Рµ С‡Р°СЃС‹ Р±РёРѕСЂРёС‚РјРѕРІ, РёР·Р±РµРіР°С‚СЊ Р°РіСЂРµСЃСЃРёРІРЅРѕР№ С‚РµСЂР°РїРёРё РІ Р»СѓРЅРЅС‹Рµ Р·Р°РїСЂРµС‰С‘РЅРЅС‹Рµ РґРµРєР°РґС‹, РёСЃРїРѕР»СЊР·РѕРІР°С‚СЊ РїРµСЂРёРѕРґ РґР»СЏ {insights.zodiacStrengths ? 'СЂР°Р·РІРёС‚РёСЏ СЃРёР»СЊРЅС‹С… Р·РѕРЅ' : 'СѓРєСЂРµРїР»РµРЅРёСЏ Р±Р°Р·С‹'}.</p>                   </div>
                </div>

                {/* Р РµРєРѕРјРµРЅРґР°С†РёРё */}
                <div style={{ background: "#fff", padding: 16, borderRadius: 8, border: "1px solid var(--line)", borderTop: "3px solid var(--success)" }}>
                   <h4 style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--success)", margin: "0 0 8px 0" }}>Р РµРєРѕРјРµРЅРґР°С†РёРё</h4>
                   <ul style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)", margin: "0 0 0 16px", padding: 0 }}>
                      <li>РџР»Р°РЅРёСЂСѓР№С‚Рµ РІР°Р¶РЅС‹Рµ СЂРµС€РµРЅРёСЏ РЅР° С‡Р°СЃС‹, СЃРѕРІРїР°РґР°СЋС‰РёРµ СЃ РїРёРєРѕРј РІР°С€РµР№ СЌРЅРµСЂРіРёРё Рё Р±Р»Р°РіРѕРїСЂРёСЏС‚РЅС‹РјРё Р·РІС‘Р·РґР°РјРё С‡Р°СЃР°</li>
                      <li>Р’ СЃС‚Р°РґРёРё {currentJiaziStage.name} С„РѕРєСѓСЃРёСЂСѓР№С‚РµСЃСЊ РЅР° {currentJiaziStage.spheres.career || 'СЂР°Р·РІРёС‚РёРё'} Рё {currentJiaziStage.spheres.health || 'Р·РґРѕСЂРѕРІСЊРµ'}</li>
                      <li>РР·Р±РµРіР°Р№С‚Рµ РєСѓСЂСЃРѕРІ Р»РµС‡РµРЅРёСЏ РІ РґРЅРё СѓРіР°СЃР°РЅРёСЏ Р¦Рё Рё СЂР°Р·РґРµР»РёС‚РµР»РµР№ СЃРµР·РѕРЅРЅРѕР№ СЌРЅРµСЂРіРёРё</li>
                      <li>Р”Р»СЏ СѓРјРёСЂРѕС‚РІРѕСЂРµРЅРёСЏ РјР°СЂР°РєРѕРІС‹С… РїРµСЂРёРѕРґРѕРІ: С‡С‚РµРЅРёРµ СЃС‚РѕС‚СЂ 108Г—, Р±Р»Р°РіРѕС‚РІРѕСЂРёС‚РµР»СЊРЅРѕСЃС‚СЊ, РѕСЃРѕР·РЅР°РЅРЅРѕРµ РїРёС‚Р°РЅРёРµ</li>
                      <li>РћС‚СЃР»РµР¶РёРІР°Р№С‚Рµ РєРѕРЅС„Р»РёРєС‚ РґРЅРµР№ СЃ РјРµСЃСЏС‡РЅС‹Рј Р·РЅР°РєРѕРј в†’ РІ СЌС‚Рё РґРЅРё РЅРµ РЅР°С‡РёРЅР°Р№С‚Рµ РЅРѕРІРѕРіРѕ</li>
                   </ul>
                </div>

                {/* Р—РѕРЅС‹ РІРЅРёРјР°РЅРёСЏ */}
                <div style={{ background: "#fff", padding: 16, borderRadius: 8, border: "1px solid var(--line)", borderTop: "3px solid var(--error)" }}>
                   <h4 style={{ fontFamily: "var(--font-head)", fontSize: 14, color: "var(--error)", margin: "0 0 8px 0" }}>Р—РѕРЅС‹ РІРЅРёРјР°РЅРёСЏ</h4>
                   <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                      <p style={{ marginBottom: 6 }}>РЈС‡РёС‚С‹РІР°СЏ Р·РЅР°Рє {insights.zodiac || 'вЂ”'} Рё Р»СѓРЅРЅС‹Рµ СѓР·Р»С‹, РѕСЃРѕР±РѕРµ РІРЅРёРјР°РЅРёРµ СѓРґРµР»РёС‚Рµ: {meridianInfo.tip || 'СЂРµРіСѓР»СЏСЂРЅРѕСЃС‚Рё РїРёС‚Р°РЅРёСЏ Рё СЂРµР¶РёРјСѓ'}. Р’ СЃРµР·РѕРЅС‹ РїРµСЂРµС…РѕРґР° (СЂР°РІРЅРѕРґРµРЅСЃС‚РІРёСЏ/СЃРѕР»РЅС†РµСЃС‚РѕСЏРЅРёСЏ) РїСЂРѕРІРѕРґРёС‚СЃСЏ РјСЏРіРєР°СЏ РєРѕСЂСЂРµРєС†РёСЏ Р¦Рё.</p>
                      <p>РџСЂРё РЅР°Р»РёС‡РёРё РјР°СЂР°РєРѕРІС‹С… РїР»Р°РЅРµС‚ РІ Р°РєС‚РёРІРЅС‹Рµ РїРµСЂРёРѕРґС‹: РјРёРЅРёРјРёР·РёСЂСѓР№С‚Рµ СЂРёСЃРєРё, РґРµР»Р°Р№С‚Рµ С‡РµРєР°РїС‹, РїСЂР°РєС‚РёРєСѓР№С‚Рµ РґС‹С…Р°С‚РµР»СЊРЅС‹Рµ Рё Р·Р°Р·РµРјР»СЏСЋС‰РёРµ С‚РµС…РЅРёРєРё. РЎСѓРґСЊР±Р° = СЃРµРјСЏ, РІРѕР»СЏ = РїРѕС‡РІР°. Р’С‹ СѓРїСЂР°РІР»СЏРµС‚Рµ СѓСЂРѕР¶Р°РµРј.</p>
                   </div>
                </div>
             </div>
           </div>

          {/* 2. Р’Р•Р”РР§Р•РЎРљРР™ РљРђР›Р•РќР”РђР Р¬ (РљРђР РўРћР§РљР) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
             <FlipCardBlock 
                title="РЎРѕР»РЅРµС‡РЅС‹Р№ СЃРµР·РѕРЅ" 
                frontImage="/assets/avatars-icons/vedic-sun.png" 
                accentColor="var(--success)"
                frontContent={
                   <div style={{ fontSize: 13, lineHeight: 1.6, padding: "0 10px" }}>
                      <strong style={{ color: "var(--blue)", fontSize: 15 }}>РЎРµР·РѕРЅ & Р¦Рё</strong>
                      <p style={{ marginTop: 4 }}>{insights.zodiac === 'Р‘Р»РёР·РЅРµС†С‹' ? 'Р’РµСЃРЅР°/Р›РµС‚Рѕ: СЂРѕСЃС‚ РЇРЅ-Р¦Рё' : 'РЎРµР·РѕРЅРЅС‹Р№ С„РѕРЅ: РіР°СЂРјРѕРЅРёР·Р°С†РёСЏ РРЅСЊ-РЇРЅ'}</p>
                   </div>
                }
             >
                <p>Р­РЅРµСЂРіРёСЏ РїР°СЂРёС‚, Р±РѕР»РµР·РЅРё РїРѕРґРЅРёРјР°СЋС‚СЃСЏ РЅР° РїРѕРІРµСЂС…РЅРѕСЃС‚СЊ. РџСЂРёРјРµРЅСЏР№С‚Рµ РјРµС‚РѕРґС‹ СЂР°СЃСЃРµРёРІР°РЅРёСЏ Р¦Рё Рё Р»С‘РіРєРёРµ РїСЂР°РєС‚РёРєРё.</p>
             </FlipCardBlock>

             <FlipCardBlock 
                title="Р›СѓРЅРЅС‹Р№ С„РѕРЅ" 
                frontImage="/assets/avatars-icons/vedic-moon.png" 
                accentColor="var(--error)"
                frontContent={
                   <div style={{ fontSize: 13, lineHeight: 1.6, padding: "0 10px" }}>
                      <strong style={{ color: "var(--text1)", fontSize: 15 }}>Р—Р°РїСЂРµС‚С‹</strong>
                      <p style={{ marginTop: 4 }}>Р’ РґРЅРё РЅРѕРІРѕР»СѓРЅРёСЏ/РїРѕР»РЅРѕР»СѓРЅРёСЏ РѕСЂРіР°РЅРёР·Рј РѕСЃР»Р°Р±Р»РµРЅ.</p>                   </div>
                }
             >
                <p>РР·Р±РµРіР°Р№С‚Рµ РјР°Р»РѕР№ С…РёСЂСѓСЂРіРёРё, РёРіР»РѕС‚РµСЂР°РїРёРё Рё Р°РіСЂРµСЃСЃРёРІРЅС‹С… РїСЂРѕС†РµРґСѓСЂ РЅР° РєРѕР¶Рµ.</p>
             </FlipCardBlock>
          </div>

          {/* 3. Р“Р РђР¤РРљ Р–РР—РќР•РќРќРћР“Рћ Р¦РРљР›Рђ */}
           <CycleTimeline dob={profile.dob} onYearSelect={handleYearSelect} />
        </>
      )}

       <div style={{ display: "flex", gap: 14, marginTop: 28 }}>
         <button className="btn btn-primary" onClick={handleRefresh} disabled={isRefreshing} style={{ flex: 1, opacity: isRefreshing ? 0.7 : 1, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1.2, padding: "12px 16px", borderRadius: 8 }}>
          {isRefreshing ? "вЏі РћР±РЅРѕРІР»РµРЅРёРµ..." : "рџ”„ РћР±РЅРѕРІРёС‚СЊ РґР°РЅРЅС‹Рµ"}
         </button>
         <button className="btn btn-ghost" onClick={handleReset} style={{ flex: 1, borderColor: "rgba(139,32,32,0.4)", color: "var(--error)", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1.2, padding: "12px 16px", borderRadius: 8 }}>
          рџ—‘пёЏ РЎР±СЂРѕСЃ РїСЂРѕС„РёР»СЏ
         </button>
       </div>

      {selectedYear !== null && <YearModal year={selectedYear} currentAge={age} onClose={() => setSelectedYear(null)} />}
    </div>
  );
      }
