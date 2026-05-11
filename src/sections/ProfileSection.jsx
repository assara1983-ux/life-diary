// src/sections/ProfileSection.jsx
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { T } from '../utils/theme';
import { getTCMFullProfile } from '../core/calculations/tcm';
import {
  getHealthWarning, getMeridianInfo,
  getEnergyLevel, getEnergyStructures,
  getPersonalYearDetail, getInfoVortex,
  getLifeWheelAnalysis, getBreathingPractice,
  getChronotypePeaks,
} from '../data/profileKnowledge';

// ─── КОНСТАНТЫ ────────────────────────────────────────────────────────────
const ZODIAC_DESC = {
  "Овен":"Лидер, первопроходец. Смелость, энергия, нетерпеливость. Стихия: Огонь · Марс",
  "Телец":"Надёжность, упорство, любовь к комфорту. Стихия: Земля · Венера",
  "Близнецы":"Гибкость ума, коммуникабельность, двойственность. Стихия: Воздух · Меркурий",
  "Рак":"Интуиция, глубокая забота, эмоциональность. Стихия: Вода · Луна",
  "Лев":"Харизма, щедрость, лидерство. Стихия: Огонь · Солнце",
  "Дева":"Аналитический ум, порядок, перфекционизм. Стихия: Земля · Меркурий",
  "Весы":"Гармония, дипломатия, справедливость. Стихия: Воздух · Венера",
  "Скорпион":"Глубина, трансформация, страстность. Стихия: Вода · Плутон",
  "Стрелец":"Свобода, оптимизм, философия. Стихия: Огонь · Юпитер",
  "Козерог":"Амбиции, дисциплина, ответственность. Стихия: Земля · Сатурн",
  "Водолей":"Оригинальность, гуманизм, независимость. Стихия: Воздух · Уран",
  "Рыбы":"Интуиция, сострадание, духовность. Стихия: Вода · Нептун",
};
const EASTERN_DESC = {
  "Крыса":"Ум, адаптивность, предприимчивость. Притягивает удачу в деньгах.",
  "Бык":"Терпение, трудолюбие, надёжность. Верный и последовательный.",
  "Тигр":"Смелость, обаяние, харизма. Природный лидер.",
  "Кролик":"Мягкость, дипломатия, творчество. Символ удачи.",
  "Дракон":"Магнетизм, мощь, удача. Самый сильный знак.",
  "Змея":"Мудрость, интуиция, загадочность. Дальновидность.",
  "Лошадь":"Свобода, энергия, скорость. Жажда новых впечатлений.",
  "Коза":"Творчество, мягкость, артистизм. Ценит красоту.",
  "Обезьяна":"Интеллект, изобретательность, юмор. Находчивость.",
  "Петух":"Наблюдательность, пунктуальность, прямолинейность.",
  "Собака":"Верность, честность, защита. Надёжный друг.",
  "Свинья":"Щедрость, искренность, трудолюбие.",
};
const DEG_DESC = {
  1:"Лидерство, начало путей",2:"Дипломатия, партнёрство",3:"Творчество, самовыражение",
  4:"Стабильность, дисциплина",5:"Свобода, перемены",6:"Забота, гармония",
  7:"Духовность, аналитика",8:"Власть, материальный успех",9:"Гуманизм, завершение цикла",
  10:"Карьера, достижение целей",11:"Интуиция, нестандартное мышление",12:"Жертвенность, духовность",
  13:"Трансформация",14:"Равновесие",15:"Мудрость",16:"Неожиданные повороты",
  17:"Победа через усилие",18:"Иллюзии vs реальность",19:"Успех и признание",20:"Суд и карма",
  21:"Завершение большого цикла",22:"Мастер-число: строитель",23:"Королевский градус — успех",
  24:"Любовь и творчество",25:"Духовный поиск",26:"Карма денег",27:"Высшая мудрость",
  28:"Независимость",29:"Критический градус — испытания и прорыв",30:"Полнота цикла",
};

// ─── ХЕЛПЕРЫ ──────────────────────────────────────────────────────────────
function calcAge(dob) {
  if (!dob) return null;
  const today = new Date(), birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const passed = today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!passed) age--;
  return age;
}
function ageWord(age) {
  if (!age) return "";
  const r = age % 100, r1 = age % 10;
  if (r >= 11 && r <= 19) return "лет";
  if (r1 === 1) return "год";
  if (r1 >= 2 && r1 <= 4) return "года";
  return "лет";
}
function getZodiac(dob) {
  if (!dob) return { name:"—", emoji:"⭐" };
  const d = new Date(dob), m = d.getMonth()+1, day = d.getDate();
  const z = [["Козерог","♑",12,22,1,19],["Водолей","♒",1,20,2,18],["Рыбы","♓",2,19,3,20],
    ["Овен","♈",3,21,4,19],["Телец","♉",4,20,5,20],["Близнецы","♊",5,21,6,20],
    ["Рак","♋",6,21,7,22],["Лев","♌",7,23,8,22],["Дева","♍",8,23,9,22],
    ["Весы","⚖️",9,23,10,22],["Скорпион","♏",10,23,11,21],["Стрелец","♐",11,22,12,21]];
  for (const [name,emoji,sm,sd,em,ed] of z)
    if ((m===sm&&day>=sd)||(m===em&&day<=ed)) return {name,emoji};
  return {name:"Козерог",emoji:"♑"};
}
function getEastern(dob) {
  if (!dob) return "—";
  return ["Крыса","Бык","Тигр","Кролик","Дракон","Змея","Лошадь","Коза","Обезьяна","Петух","Собака","Свинья"][(new Date(dob).getFullYear()-4)%12];
}
function calcDegree(name) {
  if (!name) return null;
  const ru = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
  let s = 0;
  for (const c of name.toLowerCase()) { const i = ru.indexOf(c); if (i>=0) s+=i+1; }
  return s%360||360;
}
function getPersonalYear(dob) {
  if (!dob) return null;
  const bd = new Date(dob);
  const sum = d => { let s=d; while(s>9&&s!==11&&s!==22&&s!==33) s=String(s).split("").reduce((a,b)=>a+parseInt(b),0); return s; };
  const py = sum(sum(bd.getDate())+sum(bd.getMonth()+1)+sum(String(new Date().getFullYear()).split("").reduce((a,b)=>a+parseInt(b),0)));
  const themes = {1:"Год новых начал",2:"Год партнёрства",3:"Год творчества",4:"Год труда",
    5:"Год перемен",6:"Год ответственности",7:"Год рефлексии",8:"Год достижений",
    9:"Год завершения",11:"Год интуиции",22:"Год мастера",33:"Год учителя"};
  return { py, theme: themes[py]||"" };
}
function getMoon(dt=new Date()) {
  const p=((dt-new Date("2024-01-11"))/86400000%29.53+29.53)%29.53;
  if(p<1.85) return {n:"Новолуние",e:"🌑",t:"Начало"};
  if(p<7.38)  return {n:"Растущая",e:"🌒",t:"Рост"};
  if(p<14.76) return {n:"Полнолуние",e:"🌕",t:"Пик"};
  return {n:"Убывающая",e:"🌖",t:"Итоги"};
}
function getStrengths(dob) {
  if (!dob) return null;
  const z = getZodiac(dob).name, east = getEastern(dob);
  const zSW = {
    "Овен":{s:["Инициативность","Смелость","Энергия","Лидерство"],w:["Нетерпеливость","Импульсивность","Не доводит до конца"]},
    "Телец":{s:["Надёжность","Упорство","Практичность","Верность"],w:["Упрямство","Медленная адаптация","Материализм"]},
    "Близнецы":{s:["Гибкость ума","Коммуникабельность","Адаптивность"],w:["Непостоянство","Поверхностность","Тревожность"]},
    "Рак":{s:["Интуиция","Забота","Эмпатия","Память"],w:["Обидчивость","Зависимость от настроения","Закрытость"]},
    "Лев":{s:["Харизма","Щедрость","Творчество","Лидерство"],w:["Гордость","Зависимость от признания","Расточительность"]},
    "Дева":{s:["Аналитика","Трудолюбие","Точность","Надёжность"],w:["Перфекционизм","Самокритика","Тревожность"]},
    "Весы":{s:["Дипломатия","Справедливость","Чувство красоты"],w:["Нерешительность","Зависимость от мнения","Избегание конфликтов"]},
    "Скорпион":{s:["Глубина","Интуиция","Трансформация","Страсть"],w:["Ревность","Подозрительность","Мстительность"]},
    "Стрелец":{s:["Оптимизм","Широкий кругозор","Философский ум"],w:["Безответственность","Прямолинейность до грубости","Непоследовательность"]},
    "Козерог":{s:["Дисциплина","Амбиции","Ответственность","Терпение"],w:["Холодность","Пессимизм","Трудоголизм"]},
    "Водолей":{s:["Оригинальность","Гуманизм","Независимость"],w:["Отстранённость","Упрямство в идеях","Непрактичность"]},
    "Рыбы":{s:["Интуиция","Сострадание","Творчество","Духовность"],w:["Избегание реальности","Жертвенность","Неопределённость"]},
  };
  const eSW = {
    "Крыса":{s:["Находчивость","Острый ум"],w:["Тревожность","Критичность"]},
    "Бык":{s:["Терпение","Выносливость"],w:["Упрямство","Консерватизм"]},
    "Тигр":{s:["Смелость","Щедрость"],w:["Импульсивность","Самонадеянность"]},
    "Кролик":{s:["Дипломатия","Интуиция"],w:["Нерешительность","Пессимизм"]},
    "Дракон":{s:["Энергия","Магнетизм"],w:["Гордость","Нетерпимость"]},
    "Змея":{s:["Мудрость","Дальновидность"],w:["Подозрительность","Замкнутость"]},
    "Лошадь":{s:["Энергия","Харизма"],w:["Непостоянство","Нетерпеливость"]},
    "Коза":{s:["Творчество","Сострадание"],w:["Нерешительность","Зависимость"]},
    "Обезьяна":{s:["Интеллект","Находчивость"],w:["Непостоянство","Тщеславие"]},
    "Петух":{s:["Точность","Честность"],w:["Педантизм","Хвастовство"]},
    "Собака":{s:["Верность","Справедливость"],w:["Тревожность","Цинизм"]},
    "Свинья":{s:["Щедрость","Оптимизм"],w:["Доверчивость","Самопотакание"]},
  };
  const zs = zSW[z]||{s:[],w:[]}, es = eSW[east]||{s:[],w:[]};
  return {
    strengths:[...new Set([...zs.s,...es.s])].slice(0,6),
    weaknesses:[...new Set([...zs.w,...es.w])].slice(0,5),
  };
}

// ─── ВСПОМОГАТЕЛЬНЫЕ UI КОМПОНЕНТЫ ──────────────────────────────────────
function InfoCard({ emoji, title, badge, children, accent }) {
  return (
    <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 14px",
      background: accent ? "rgba(200,164,90,0.08)" : "rgba(45,32,16,0.05)",
      borderRadius:12, border: accent ? "1px solid rgba(200,164,90,0.2)" : "none"}}>
      <span style={{fontSize:30,flexShrink:0,lineHeight:1}}>{emoji}</span>
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
          <span style={{fontFamily:"'Cormorant Infant',serif",fontSize:17,color:T.gold}}>{title}</span>
          {badge && <span style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>{badge}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div className="sec-lbl" style={{marginBottom:8,marginTop:16}}>{children}</div>;
}

function PeakRow({ label, hours, tip, color="#c8a45a" }) {
  const currentH = new Date().getHours();
  const [startH] = hours.split("–")[0].split(":").map(Number);
  const [endH] = (hours.split("–")[1]||"23:00").split(":").map(Number);
  const isNow = currentH >= startH && currentH < endH;
  return (
    <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"7px 0",
      borderBottom:`1px solid ${T.bdrS}`}}>
      <div style={{minWidth:90,flexShrink:0}}>
        <div style={{fontSize:12,color: isNow ? T.gold : T.text2,fontFamily:"'JetBrains Mono'",fontWeight: isNow?700:400}}>
          {hours} {isNow && <span style={{fontSize:9,color:T.gold}}>●</span>}
        </div>
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:12,color:T.text1,fontWeight:500,marginBottom:2}}>{label}</div>
        <div style={{fontSize:11,color:T.text3,lineHeight:1.4}}>{tip}</div>
      </div>
    </div>
  );
}

// ─── ГЛАВНЫЙ КОМПОНЕНТ ────────────────────────────────────────────────────
export function ProfileSection() {
  const { profile, setProfile, sections, setSections } = useApp();
  const [view, setView] = useState("me");
  const [openBlock, setOpenBlock] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  if (!profile) return null;

  const z = getZodiac(profile.dob);
  const east = getEastern(profile.dob);
  const deg = calcDegree(profile.fullName || profile.name);
  const moon = getMoon();
  const age = calcAge(profile.dob);
  const pyData = getPersonalYear(profile.dob);
  const tcm = getTCMFullProfile(profile);
  const sw = getStrengths(profile.dob);

  // Все 8 блоков из базы знаний
  const healthWarning = profile.dob ? getHealthWarning(z.name) : null;
  const meridian = getMeridianInfo(z.name);
  const energyLevel = getEnergyLevel(profile.sleepQuality, profile.chronotype);
  const energyStructures = getEnergyStructures(profile);
  const pyDetail = pyData ? getPersonalYearDetail(pyData.py) : null;
  const vortex = getInfoVortex(profile);
  const wheel = getLifeWheelAnalysis(profile.goalAreas || []);
  const breathing = tcm?.cn ? getBreathingPractice(tcm.cn.type) : null;
  const peaks = getChronotypePeaks(profile.chronotype);

  // Режим дня
  const regime = [
    {label:"☀️ Подъём",  value:profile.wake},
    {label:"🌙 Отбой",   value:profile.sleep},
    {label:"💼 Работа",  value:(profile.workStart&&profile.workEnd)?`${profile.workStart}–${profile.workEnd}`:null},
    {label:"🛣️ Дорога",  value:profile.commuteTime!=="Дома"?profile.commuteTime:null},
  ].filter(r=>r.value);

  // Психопортрет
  const intro = (profile.energySource||"").toLowerCase().includes("один") || (profile.energySource||"").toLowerCase().includes("тишин");
  const analyst = (profile.decisionStyle||"").toLowerCase().includes("логик") || (profile.decisionStyle||"").toLowerCase().includes("анализ") || (profile.decisionStyle||"").toLowerCase().includes("факт");
  const planner = (profile.planningStyle||"").toLowerCase().includes("план") || (profile.planningStyle||"").toLowerCase().includes("список");

  const toggle = (id) => setOpenBlock(openBlock === id ? null : id);

  return (
    <div>
      {/* Tabs */}
      <div className="tabs" style={{marginBottom:14}}>
        {["me","sections"].map(v=>(
          <div key={v} className={`tab${view===v?" on":""}`} onClick={()=>setView(v)}>
            {v==="me"?"Мой профиль":"⚙️ Разделы"}
          </div>
        ))}
      </div>

      {view==="me" && (
        <div>
          {/* ── Шапка ── */}
          <div className="card card-accent" style={{marginBottom:12}}>
            <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${T.gold}66,${T.goldD})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                {profile.gender==="Женский"?"👩":"👤"}
              </div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:24,color:T.gold,marginBottom:4}}>{profile.name||"—"}</div>
                {profile.fullName&&profile.fullName!==profile.name&&<div style={{fontSize:13,color:T.text3,marginBottom:4}}>{profile.fullName}</div>}
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {profile.dob&&<span className="badge bg">🎂 {new Date(profile.dob).toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"})}</span>}
                  {age!==null&&<span className="badge bm">{age} {ageWord(age)}</span>}
                  {profile.gender&&<span className="badge bm">{profile.gender}</span>}
                  {profile.city&&<span className="badge bm">📍 {profile.city}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* ── БЛОК 1+2: Астро-портрет + Меридиан + Карта здоровья ── */}
          {profile.dob && (
            <>
              <SectionLabel>Астрологический портрет</SectionLabel>
              <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:12}}>
                <InfoCard emoji={z.emoji} title={z.name} badge="ЗОДИАК">
                  <div style={{fontSize:12,color:T.text2,lineHeight:1.5}}>{ZODIAC_DESC[z.name]}</div>
                </InfoCard>

                <InfoCard emoji="🐉" title={east} badge="ВОСТОЧНЫЙ ЗНАК">
                  <div style={{fontSize:12,color:T.text2,lineHeight:1.5}}>{EASTERN_DESC[east]}</div>
                </InfoCard>

                {/* БЛОК 2: Меридиан знака */}
                <InfoCard emoji={meridian.emoji} title={`Меридиан ${meridian.meridian}`} badge="ТКМ · ДАВЫДОВ">
                  <div style={{fontSize:12,color:T.text2,lineHeight:1.5,marginBottom:6}}>{meridian.tip}</div>
                </InfoCard>

                {/* БЛОК 1: Карта здоровья — текущий месяц */}
                {healthWarning && (
                  <div style={{padding:"10px 14px",background:"rgba(217,4,41,0.06)",borderRadius:12,border:"1px solid rgba(217,4,41,0.15)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <span style={{fontSize:16}}>⚠️</span>
                      <span style={{fontSize:9,color:T.error,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>ЗОНА ВНИМАНИЯ · {healthWarning.easternMonth.toUpperCase()} · ДАВЫДОВ</span>
                    </div>
                    <div style={{fontSize:13,color:T.text1,lineHeight:1.6}}>{healthWarning.organ}</div>
                    <div style={{fontSize:11,color:T.text3,marginTop:4}}>Уязвимая зона в текущем восточном месяце</div>
                  </div>
                )}

                {tcm?.el && (
                  <InfoCard emoji={tcm.el.emoji} title={`${tcm.el.name} ${tcm.el.yin?"(Инь)":"(Ян)"}`} badge="ТКМ-СТИХИЯ">
                    <div style={{fontSize:12,color:T.text2,lineHeight:1.5}}>Органы: {tcm.el.organ} · Сезон: {tcm.el.season} · Вкус: {tcm.el.taste}</div>
                    {tcm.syndromes?.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:6}}>{tcm.syndromes.map(s=><span key={s} className="badge bw" style={{fontSize:10}}>{s}</span>)}</div>}
                    {tcm.foodRecs&&<div style={{fontSize:11,color:T.success,fontStyle:"italic",lineHeight:1.5,marginTop:6}}>{tcm.foodRecs}</div>}
                  </InfoCard>
                )}

                <InfoCard emoji={moon.e} title={moon.n} badge="ЛУНА СЕГОДНЯ">
                  <div style={{fontSize:12,color:T.text2}}>{moon.t}</div>
                </InfoCard>

                {deg&&(
                  <InfoCard emoji="✦" title={`${deg}° · Градус судьбы`} badge="НУМЕРОЛОГИЯ · АМРИТА" accent>
                    <div style={{fontSize:12,color:T.text2,lineHeight:1.5}}>{DEG_DESC[deg%30||30]||"Уникальный путь"}</div>
                  </InfoCard>
                )}
              </div>
            </>
          )}

          {/* ── Сильные стороны ── */}
          {sw&&(
            <>
              <SectionLabel>Сильные и слабые стороны</SectionLabel>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                <div style={{padding:"10px 12px",background:"rgba(45,106,79,0.07)",borderRadius:12}}>
                  <div style={{fontSize:10,color:T.success,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:8}}>✦ СИЛЬНЫЕ</div>
                  {sw.strengths.map((s,i)=><div key={i} style={{fontSize:12,color:T.text1,padding:"4px 0",borderBottom:`1px solid rgba(45,106,79,0.1)`,lineHeight:1.3}}>{s}</div>)}
                </div>
                <div style={{padding:"10px 12px",background:"rgba(139,32,32,0.05)",borderRadius:12}}>
                  <div style={{fontSize:10,color:T.error,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:8}}>✗ ЗОНЫ РОСТА</div>
                  {sw.weaknesses.map((w,i)=><div key={i} style={{fontSize:12,color:T.text2,padding:"4px 0",borderBottom:`1px solid rgba(139,32,32,0.08)`,lineHeight:1.3}}>{w}</div>)}
                </div>
              </div>
            </>
          )}

          {/* ── БЛОК 4: Личный год ── */}
          {pyData&&pyDetail&&(
            <>
              <SectionLabel>Нумерология года</SectionLabel>
              <div style={{padding:"12px 14px",background:"rgba(200,164,90,0.08)",borderRadius:12,border:"1px solid rgba(200,164,90,0.2)",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:24,color:T.gold,minWidth:36,textAlign:"center"}}>{pyData.py}</span>
                  <div>
                    <div style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>ЛИЧНЫЙ ГОД · {new Date().getFullYear()}</div>
                    <div style={{fontSize:15,color:T.gold,fontWeight:500}}>{pyData.theme}</div>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:7}}>
                  <div style={{padding:"7px 10px",background:"rgba(45,106,79,0.08)",borderRadius:8,borderLeft:`2px solid ${T.success}`}}>
                    <div style={{fontSize:10,color:T.success,fontFamily:"'JetBrains Mono'",marginBottom:2}}>ФОКУС</div>
                    <div style={{fontSize:13,color:T.text1,lineHeight:1.5}}>{pyDetail.focus}</div>
                  </div>
                  <div style={{padding:"7px 10px",background:"rgba(217,4,41,0.05)",borderRadius:8,borderLeft:`2px solid ${T.error}44`}}>
                    <div style={{fontSize:10,color:T.error,fontFamily:"'JetBrains Mono'",marginBottom:2}}>ИЗБЕГАЙ</div>
                    <div style={{fontSize:13,color:T.text2,lineHeight:1.5}}>{pyDetail.avoid}</div>
                  </div>
                  <div style={{padding:"7px 10px",background:"rgba(200,164,90,0.06)",borderRadius:8,borderLeft:`2px solid ${T.gold}66`}}>
                    <div style={{fontSize:10,color:T.gold,fontFamily:"'JetBrains Mono'",marginBottom:2}}>ПРАКТИКА</div>
                    <div style={{fontSize:13,color:T.text2,lineHeight:1.5}}>{pyDetail.practice}</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Психопортрет ── */}
          <SectionLabel>Психопортрет</SectionLabel>
          <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:12}}>
            {[
              intro ? "🔋 Интроверт — черпает энергию в уединении" : "⚡ Экстраверт — заряжается от общения",
              analyst ? "🧠 Аналитик — решения через логику и факты" : "💡 Интуит — решения через ощущения",
              planner ? "📋 Планировщик — любит структуру и порядок" : "🌊 Адаптивный — действует по ситуации",
            ].map((t,i)=>(
              <div key={i} style={{fontSize:13,color:T.text1,padding:"6px 12px",background:"rgba(45,32,16,0.04)",borderRadius:9}}>{t}</div>
            ))}
          </div>

          {/* ── БЛОК 5: Информационная Воронка ── */}
          {profile.coreValue && (
            <>
              <SectionLabel>Информационная Воронка · Азнауров</SectionLabel>
              <div style={{padding:"12px 14px",background:"rgba(184,130,232,0.08)",borderRadius:12,border:"1px solid rgba(184,130,232,0.2)",marginBottom:12}}>
                <div style={{fontSize:11,color:"#B882E8",fontFamily:"'JetBrains Mono'",marginBottom:8,letterSpacing:1}}>
                  ТК · {profile.coreValue?.toUpperCase()}
                </div>
                <div style={{marginBottom:6}}>
                  <span style={{fontSize:11,color:T.text3}}>Точка концентрации: </span>
                  <span style={{fontSize:13,color:T.text0}}>{vortex.tk}</span>
                </div>
                <div style={{marginBottom:6}}>
                  <span style={{fontSize:11,color:T.error}}>Риск воронки: </span>
                  <span style={{fontSize:13,color:T.text2}}>{vortex.risk}</span>
                </div>
                <div style={{padding:"7px 10px",background:"rgba(200,164,90,0.06)",borderRadius:8,borderLeft:`2px solid ${T.gold}66`,marginTop:8}}>
                  <div style={{fontSize:11,color:T.gold,fontFamily:"'JetBrains Mono'",marginBottom:2}}>АНТИДОТ</div>
                  <div style={{fontSize:13,color:T.text1,lineHeight:1.5}}>{vortex.antidote}</div>
                </div>
              </div>
            </>
          )}

          {/* ── БЛОК 6: Колесо жизни ── */}
          {(profile.goalAreas||[]).length > 0 && (
            <>
              <SectionLabel>Колесо жизни · Баланс сфер</SectionLabel>
              <div style={{padding:"12px 14px",background:"rgba(45,32,16,0.04)",borderRadius:12,marginBottom:12}}>
                <div style={{fontSize:12,color:T.text3,marginBottom:10}}>
                  Баланс: <span style={{color: wheel.balance==="хороший"?T.success:wheel.balance==="частичный"?T.gold:T.error, fontWeight:600}}>{wheel.balance}</span>
                </div>
                {wheel.active.length>0&&(
                  <>
                    <div style={{fontSize:10,color:T.success,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:6}}>ПРИОРИТЕТНЫЕ СФЕРЫ</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                      {wheel.active.map(s=>(
                        <span key={s.id} style={{fontSize:12,padding:"4px 10px",borderRadius:20,background:`${s.color}22`,border:`1px solid ${s.color}44`,color:T.text1}}>
                          {s.emoji} {s.id}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                {wheel.missing.length>0&&(
                  <>
                    <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:6}}>МОГУТ ПРОВИСАТЬ</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {wheel.missing.map(s=>(
                        <span key={s.id} style={{fontSize:12,padding:"4px 10px",borderRadius:20,background:"rgba(45,32,16,0.06)",border:`1px solid ${T.bdrS}`,color:T.text3}}>
                          {s.emoji} {s.id}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* ── Работа и жизнь ── */}
          <SectionLabel>Работа и жизнь</SectionLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
            <div style={{padding:"8px 12px",background:"rgba(45,32,16,0.04)",borderRadius:10}}>
              <div style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:2}}>РАБОТА</div>
              <div style={{fontSize:13,color:T.text0}}>{profile.profession||"—"}</div>
              {profile.workType&&<div style={{marginTop:3,display:"inline-block",padding:"1px 7px",borderRadius:8,background:"rgba(200,164,90,0.12)",border:"1px solid rgba(200,164,90,0.25)",fontSize:10,color:T.gold}}>{profile.workType}</div>}
            </div>
            <div style={{padding:"8px 12px",background:"rgba(45,32,16,0.04)",borderRadius:10}}>
              <div style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:2}}>ХРОНОТИП</div>
              <div style={{fontSize:13,color:T.text0}}>{peaks.emoji} {peaks.type}</div>
              <div style={{fontSize:11,color:T.text3}}>Сон: {profile.sleepQuality||"—"}</div>
            </div>
          </div>
          {regime.length>0&&(
            <div style={{padding:"8px 12px",background:"rgba(45,32,16,0.04)",borderRadius:10,marginBottom:12}}>
              <div style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:8}}>РЕЖИМ ДНЯ</div>
              <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                {regime.map(({label,value})=>(
                  <div key={label}><div style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'"}}>{label}</div><div style={{fontSize:14,color:T.text0,fontWeight:500}}>{value}</div></div>
                ))}
              </div>
            </div>
          )}

          {/* ── БЛОК 3: Энергетический профиль ── */}
          <SectionLabel>Энергетический профиль · Источник Энергии</SectionLabel>
          <div style={{padding:"12px 14px",background:"rgba(45,32,16,0.04)",borderRadius:12,marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <span style={{fontSize:28}}>{energyLevel.emoji}</span>
              <div>
                <div style={{fontSize:15,color:T.text0,fontWeight:600}}>{energyLevel.name}</div>
                <div style={{fontSize:12,color:T.text3}}>{energyLevel.desc}</div>
              </div>
            </div>
            {/* Шкала */}
            <div style={{display:"flex",gap:4,marginBottom:12}}>
              {["🔴","🟠","🟡","🟢","✨"].map((e,i)=>(
                <div key={i} style={{flex:1,height:6,borderRadius:3,background: i<energyLevel.level ? ["#ff4444","#ff8c42","#ffd700","#7bcca0","#c8a45a"][i] : "rgba(45,32,16,0.1)"}}/>
              ))}
            </div>
            <div style={{fontSize:10,color:T.text3,fontFamily:"'JetBrains Mono'",marginBottom:8,letterSpacing:1}}>4 СТРУКТУРЫ ДЛЯ РОСТА</div>
            {energyStructures.map((s,i)=>(
              <div key={i} style={{padding:"6px 10px",background:"rgba(200,164,90,0.05)",borderRadius:8,marginBottom:5,borderLeft:`2px solid ${T.gold}44`}}>
                <div style={{fontSize:12,color:T.gold,fontWeight:500,marginBottom:2}}>{s.element}</div>
                <div style={{fontSize:12,color:T.text2,lineHeight:1.5}}>{s.tip}</div>
              </div>
            ))}
          </div>

          {/* ── БЛОК 7: Дыхание по конституции ── */}
          {breathing&&(
            <>
              <SectionLabel>Дыхательная практика · Дорошенко</SectionLabel>
              <div style={{padding:"12px 14px",background:"rgba(45,106,79,0.07)",borderRadius:12,border:`1px solid ${T.success}33`,marginBottom:12}}>
                <div style={{fontSize:15,color:T.success,fontWeight:600,marginBottom:6}}>🫁 {breathing.practice}</div>
                <div style={{fontSize:11,color:T.text3,marginBottom:8}}>📅 {breathing.schedule}</div>
                <div style={{padding:"7px 10px",background:"rgba(45,106,79,0.08)",borderRadius:8,marginBottom:8}}>
                  <div style={{fontSize:10,color:T.success,fontFamily:"'JetBrains Mono'",marginBottom:3}}>ТЕХНИКА</div>
                  <div style={{fontSize:13,color:T.text1,lineHeight:1.6}}>{breathing.technique}</div>
                </div>
                <div style={{fontSize:11,color:T.error,fontStyle:"italic"}}>{breathing.avoid}</div>
              </div>
            </>
          )}

          {/* ── БЛОК 8: Суточные пики ── */}
          <SectionLabel>Суточные пики · {peaks.emoji} {peaks.type}</SectionLabel>
          <div style={{background:"rgba(45,32,16,0.03)",borderRadius:12,padding:"10px 14px",marginBottom:12}}>
            <div style={{fontSize:11,color:T.text3,marginBottom:8,fontFamily:"'JetBrains Mono'",letterSpacing:1}}>ТКМ: {peaks.meridian_peak}</div>
            {[
              peaks.focus, peaks.physical, peaks.creative,
              peaks.rest,  peaks.evening, peaks.sleep,
            ].filter(Boolean).map((p,i)=>(
              <PeakRow key={i} label={p.label} hours={p.hours} tip={p.tip}/>
            ))}
          </div>

          {/* ── Питомцы ── */}
          {(profile.pets||[]).length>0&&(
            <div style={{marginBottom:12,padding:"8px 12px",background:"rgba(45,32,16,0.04)",borderRadius:10}}>
              <div style={{fontSize:9,color:T.text3,fontFamily:"'JetBrains Mono'",letterSpacing:1,marginBottom:6}}>ПИТОМЦЫ</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                {profile.pets.map(p=>(
                  <span key={p.id} style={{fontSize:15}}>
                    {p.type==="Кошка"?"🐱":p.type==="Собака"?"🐶":p.type==="Попугай"?"🦜":p.type==="Кролик"?"🐰":p.type==="Хомяк"?"🐹":"🐾"} {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── График жизненных циклов ── */}
          {profile.dob&&(()=>{
            const by=new Date(profile.dob).getFullYear(), ca=age||0;
            const spheres=[
              {name:"Карьера",color:"#82AADD",emoji:"💼",points:[{a:0,s:3},{a:21,s:4},{a:29,s:3},{a:42,s:8},{a:58,s:8},{a:70,s:6}]},
              {name:"Отношения",color:"#E8556D",emoji:"❤️",points:[{a:0,s:5},{a:18,s:6},{a:29,s:4},{a:42,s:5},{a:58,s:9}]},
              {name:"Здоровье",color:"#7BCCA0",emoji:"💚",points:[{a:0,s:9},{a:18,s:8},{a:36,s:5},{a:49,s:5},{a:70,s:5}]},
              {name:"Финансы",color:"#E5C87A",emoji:"💰",points:[{a:0,s:3},{a:29,s:5},{a:42,s:8},{a:70,s:7}]},
              {name:"Духовность",color:"#B882E8",emoji:"🌟",points:[{a:0,s:7},{a:29,s:6},{a:49,s:9},{a:70,s:9}]},
            ];
            const W=340,H=160,PAD=28,maxAge=75;
            const gx=a=>PAD+(a/maxAge)*(W-PAD*2);
            const gy=s=>H-PAD-((s-1)/9)*(H-PAD*2);
            return (
              <>
                <SectionLabel>📈 Жизненные циклы</SectionLabel>
                <div style={{background:"rgba(45,32,16,0.03)",borderRadius:12,padding:10,overflowX:"auto",marginBottom:12}}>
                  <svg width={340} height={184} style={{display:"block",minWidth:340}}>
                    {[3,5,7,9].map(n=><line key={n} x1={PAD} y1={gy(n)} x2={W-PAD} y2={gy(n)} stroke="rgba(45,32,16,0.06)" strokeWidth="1"/>)}
                    <line x1={gx(ca)} y1={PAD/2} x2={gx(ca)} y2={H-PAD} stroke={T.gold} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.7"/>
                    <text x={gx(ca)} y={H+14} textAnchor="middle" fontSize="9" fill={T.gold} fontWeight="600">сейчас</text>
                    {[0,10,20,30,40,50,60,70].map(a=>(
                      <g key={a}>
                        <text x={gx(a)} y={H+12} textAnchor="middle" fontSize="9" fill="rgba(45,32,16,0.5)">{a}</text>
                        <text x={gx(a)} y={H+22} textAnchor="middle" fontSize="7" fill="rgba(45,32,16,0.25)">{by+a}</text>
                      </g>
                    ))}
                    {spheres.map(sp=>{
                      const pd=sp.points.map((p,i)=>`${i===0?"M":"L"} ${gx(p.a)} ${gy(p.s)}`).join(" ");
                      return (
                        <g key={sp.name}>
                          <path d={pd} fill="none" stroke={sp.color} strokeWidth="1.8" strokeLinejoin="round" opacity="0.8"/>
                          {sp.points.map((p,i)=>(
                            <circle key={i} cx={gx(p.a)} cy={gy(p.s)} r={Math.abs(p.a-ca)<3?"5":"3.5"}
                              fill={p.a<=ca?sp.color:"rgba(255,255,255,0.6)"} stroke={sp.color} strokeWidth="1.5"
                              style={{cursor:"pointer"}}
                              onClick={()=>setTooltip(tooltip?.sphere===sp.name&&tooltip?.a===p.a?null:{sphere:sp.name,emoji:sp.emoji,color:sp.color,a:p.a,year:by+p.a,s:p.s})}/>
                          ))}
                        </g>
                      );
                    })}
                  </svg>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
                    {spheres.map(s=>(
                      <div key={s.name} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:T.text2}}>
                        <div style={{width:16,height:2,background:s.color,borderRadius:1}}/>
                        <span>{s.emoji} {s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}

          {/* Тултип графика */}
          {tooltip&&(
            <>
              <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:200,background:T.bg0,borderRadius:"16px 16px 0 0",boxShadow:"0 -4px 24px rgba(45,32,16,0.18)",padding:"20px 20px 32px",borderTop:"3px solid "+tooltip.color}}>
                <div style={{width:36,height:4,background:"rgba(45,32,16,0.2)",borderRadius:2,margin:"0 auto 16px"}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:18,color:tooltip.color,fontWeight:600}}>{tooltip.emoji} {tooltip.sphere}</span>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:13,color:T.text3}}>{tooltip.year} · {tooltip.a} лет</span>
                    <button onClick={()=>setTooltip(null)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:T.text3}}>✕</button>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:10}}>
                  {[1,2,3,4,5,6,7,8,9].map(n=><div key={n} style={{height:6,flex:1,borderRadius:3,background:n<=tooltip.s?tooltip.color:"rgba(45,32,16,0.1)"}}/>)}
                  <span style={{fontSize:12,color:tooltip.color,fontWeight:700,minWidth:24}}>{tooltip.s}/9</span>
                </div>
              </div>
              <div style={{position:"fixed",inset:0,zIndex:199,background:"rgba(45,32,16,0.3)"}} onClick={()=>setTooltip(null)}/>
            </>
          )}

          {/* Кнопки */}
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <button className="btn btn-ghost" style={{flex:1,fontSize:13}} onClick={()=>{if(window.confirm("Обновить профиль? Откроется опросник."))setProfile(null);}}>⟳ Обновить</button>
            <button className="btn btn-danger" style={{fontSize:13}} onClick={()=>{if(window.confirm("Сбросить весь профиль?"))setProfile(null);}}>⚠ Сбросить</button>
          </div>
        </div>
      )}

      {/* Управление разделами */}
      {view==="sections"&&(
        <div>
          <div style={{fontSize:14,color:T.text2,marginBottom:12,lineHeight:1.5}}>Управляй видимостью разделов в навигации</div>
          {sections.map(s=>(
            <div key={s.id} className="vis-row">
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:20}}>{s.emoji}</span>
                <span style={{fontSize:15,color:T.text0}}>{s.name}</span>
              </div>
              <div className={`tog${s.vis?" on":""}`} onClick={()=>setSections(p=>p.map(x=>x.id===s.id?{...x,vis:!x.vis}:x))}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
