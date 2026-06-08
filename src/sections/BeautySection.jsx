// src/sections/BeautySection.jsx
import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../store/AppContext';

// ─── ПАЛИТРА ───
const C = {
  navy:'#0A2540', navyMid:'#1E3A5F',
  gold:'#D4AF37', goldDeep:'#B8941E', goldPale:'#F0DC90',
  rose:'rgba(184,107,93,1)', roseDim:'rgba(184,107,93,0.15)',
  bg:'#F5E8C7', bgCard:'#FAF3E0', bgCard2:'#F2E8CE',
  text1:'#0A2540', text2:'#1E3A5F', text3:'#4A6480',
  success:'#1A4D2E', error:'#6B1010',
  line:'rgba(10,37,64,0.22)', lineS:'rgba(10,37,64,0.10)',
};

// ─── УТИЛИТЫ ───
function isDue(task, today) {
  if (!task.freq) return false;
  if (task.doneDate === today) return false;
  const last = task.lastDone;
  const d = new Date(today); d.setHours(0,0,0,0);
  if (task.freq === 'daily') return last !== today;
  if (task.freq === 'workdays') { const dn=d.getDay(); return dn>=1&&dn<=5&&last!==today; }
  if (task.freq.startsWith('weekly:')) return task.freq.split(':')[1].split(',').map(Number).includes(d.getDay())&&last!==today;
  if (task.freq.startsWith('every:')) {
    const n=parseInt(task.freq.split(':')[1]);
    if (!last) { return task.beautyStartDate ? today>=task.beautyStartDate : true; }
    return Math.floor((d-new Date(last))/86400000)>=n;
  }
  if (task.freq.startsWith('monthly:')) return task.freq.split(':')[1].split(',').map(Number).includes(d.getDate())&&last!==today;
  return false;
}

function freqLabel(f) {
  if (!f||f==='once') return 'разово';
  if (f==='daily') return 'ежедневно';
  if (f==='workdays') return 'пн–пт';
  if (f.startsWith('weekly:')) { const m={0:'вс',1:'пн',2:'вт',3:'ср',4:'чт',5:'пт',6:'сб'}; return f.split(':')[1].split(',').map(n=>m[n]).join(', '); }
  if (f.startsWith('every:')) return `каждые ${f.split(':')[1]} дн.`;
  if (f.startsWith('monthly:')) return `${f.split(':')[1]} числа`;
  return f;
}

function timeSlot(time) {
  if (!time) return 'вечер';
  const h=parseInt(time.split(':')[0]);
  if (h<12) return 'утро';
  if (h<17) return 'день';
  return 'вечер';
}

const SLOT_LABELS = { утро:'🌅 Утро', день:'☀️ День', вечер:'🌙 Вечер' };

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ─── FLIP CARD ───
function FlipCard({ title, image, frontExtra, children, minHeight=260, defaultOpen=false }) {
  const [flipped, setFlipped] = useState(defaultOpen);
  const [imgOk, setImgOk] = useState(true);

  return (
    <div style={{ marginBottom:14 }}>
      {/* ЛИЦЕВАЯ */}
      {!flipped && (
        <div onClick={()=>setFlipped(true)} style={{
          position:'relative', width:'100%', aspectRatio:'4/3',
          borderRadius:14, overflow:'hidden', cursor:'pointer',
          background:C.navyMid,
          boxShadow:`0 5px 20px rgba(10,37,64,0.20), 0 0 0 1.5px ${C.line}`,
        }}>
          {imgOk && <img src={image} alt={title}
            style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}
            onError={()=>setImgOk(false)}/>}
          {!imgOk && <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:80,opacity:0.2,color:'#fff'}}>✨</div>}
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(10,25,45,0.90) 0%,rgba(10,25,45,0.20) 55%,transparent 100%)'}}/>
          <div style={{position:'absolute',top:8,left:8,width:13,height:13,borderTop:`2px solid ${C.gold}`,borderLeft:`2px solid ${C.gold}`,opacity:0.9}}/>
          <div style={{position:'absolute',bottom:8,right:8,width:13,height:13,borderBottom:`2px solid ${C.gold}`,borderRight:`2px solid ${C.gold}`,opacity:0.9}}/>
          <div style={{position:'absolute',top:10,right:12,fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:'rgba(212,175,55,0.75)',letterSpacing:1.5,textTransform:'uppercase'}}>нажмите →</div>
          {frontExtra && <div style={{position:'absolute',top:12,left:12}}>{frontExtra}</div>}
          <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'12px 16px 16px'}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,color:'#fff',letterSpacing:2.5,textTransform:'uppercase',textShadow:'0 2px 8px rgba(0,0,0,0.8)',lineHeight:1.2}}>{title}</div>
          </div>
        </div>
      )}

      {/* ОБОРОТ */}
      {flipped && (
        <div style={{position:'relative',borderRadius:14,overflow:'hidden',border:`2px solid ${C.goldDeep}`,background:`linear-gradient(160deg,${C.bgCard} 0%,${C.bgCard2} 100%)`,boxShadow:`0 5px 20px rgba(10,37,64,0.14)`}}>
          {imgOk && <img src={image} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:0.07,filter:'blur(4px)',pointerEvents:'none'}}/>}
          <div style={{position:'absolute',inset:0,background:`linear-gradient(160deg,rgba(250,243,224,0.97) 0%,rgba(240,230,205,0.96) 100%)`,backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(10,37,64,0.04) 28px)`}}/>
          <div style={{position:'absolute',top:7,left:7,width:12,height:12,borderTop:`2px solid ${C.gold}`,borderLeft:`2px solid ${C.gold}`}}/>
          <div style={{position:'absolute',bottom:7,right:7,width:12,height:12,borderBottom:`2px solid ${C.gold}`,borderRight:`2px solid ${C.gold}`}}/>
          <div style={{position:'relative',zIndex:1,padding:'16px 18px 12px',borderBottom:`2px solid rgba(10,37,64,0.14)`,display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(10,37,64,0.04)'}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:17,fontWeight:700,color:C.navy,letterSpacing:2,textTransform:'uppercase'}}>{title}</div>
            <button onClick={()=>setFlipped(false)} style={{background:`linear-gradient(135deg,${C.navyMid},${C.navy})`,border:'none',borderRadius:8,cursor:'pointer',padding:'8px 16px',fontFamily:"'Cinzel',serif",fontSize:11,color:C.goldPale,letterSpacing:2,textTransform:'uppercase'}}>← Свернуть</button>
          </div>
          <div style={{position:'relative',zIndex:1,padding:'18px 18px 22px'}} onClick={e=>e.stopPropagation()}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── АНИМИРОВАННЫЙ ЛОТОС ───
function LotusAnim({ isOpen }) {
  return (
    <svg viewBox="0 0 360 160" style={{position:'absolute',inset:0,width:'100%',height:'100%'}} xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="lglow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <ellipse cx="180" cy="80" rx="150" ry="65" fill="none" stroke="rgba(200,164,90,0.5)" strokeWidth="1" strokeDasharray="6,4" opacity={isOpen?1:0} style={{transition:'opacity 0.6s ease'}}>
        {isOpen && <animateTransform attributeName="transform" type="rotate" from="0 180 80" to="360 180 80" dur="30s" repeatCount="indefinite"/>}
      </ellipse>
      <ellipse cx="180" cy="80" rx="100" ry="44" fill="none" stroke="rgba(200,164,90,0.35)" strokeWidth="1" strokeDasharray="4,5" opacity={isOpen?1:0} style={{transition:'opacity 0.5s ease 0.1s'}}>
        {isOpen && <animateTransform attributeName="transform" type="rotate" from="360 180 80" to="0 180 80" dur="20s" repeatCount="indefinite"/>}
      </ellipse>
      {[0,36,72,108,144,180,216,252,288,324].map((angle,i)=>{
        const rad=(angle*Math.PI)/180;
        const r=isOpen?55:20;
        const cx=180+r*Math.cos(rad); const cy=80+(r*0.45)*Math.sin(rad);
        const size=isOpen?14:5;
        return <ellipse key={i} cx={cx} cy={cy} rx={size*0.6} ry={size} fill="rgba(200,164,90,0.25)" stroke="rgba(200,164,90,0.6)" strokeWidth="0.8" filter="url(#lglow)" transform={`rotate(${angle} ${cx} ${cy})`} style={{transition:`cx 0.6s ease ${i*0.04}s,cy 0.6s ease ${i*0.04}s,rx 0.6s ease ${i*0.04}s,ry 0.6s ease ${i*0.04}s`}} opacity={isOpen?0.9:0.3}/>;
      })}
      <circle cx="180" cy="80" r={isOpen?18:10} fill="rgba(200,164,90,0.15)" stroke="rgba(200,164,90,0.7)" strokeWidth="1.5" filter="url(#lglow)" style={{transition:'r 0.5s ease'}}>
        {isOpen && <animate attributeName="r" values="17;20;17" dur="3s" repeatCount="indefinite"/>}
      </circle>
      {isOpen && [30,90,150,210,270,330].map((a,i)=>{
        const rad=(a*Math.PI)/180;
        return <circle key={i} cx={180+130*Math.cos(rad)} cy={80+58*Math.sin(rad)} r="2.5" fill="rgba(200,164,90,0.7)"><animate attributeName="opacity" values="0;1;0" dur={`${1.4+i*0.25}s`} begin={`${i*0.2}s`} repeatCount="indefinite"/></circle>;
      })}
    </svg>
  );
}

// ─── ФОРМА НАСТРОЙКИ ПРОЦЕДУРЫ ───
function ProcSettingsForm({ item, value, onChange }) {
  const isSliding = item.freq?.startsWith('every:') && parseInt(item.freq.split(':')[1])>0;
  const isWeekly  = item.freq?.startsWith('weekly:');
  const weekDays = [['1','Пн'],['2','Вт'],['3','Ср'],['4','Чт'],['5','Пт'],['6','Сб'],['0','Вс']];
  return (
    <div style={{padding:'12px 14px',background:'rgba(184,107,93,0.05)',borderRadius:8,marginTop:8,display:'flex',flexDirection:'column',gap:10,border:'1px solid rgba(184,107,93,0.15)'}}>
      <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end'}}>
        <div>
          <div style={{fontSize:10,color:C.text3,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:4}}>ВРЕМЯ</div>
          <input type="time" value={value.time||item.time||''} onChange={e=>onChange({...value,time:e.target.value})}
            style={{padding:'8px 10px',border:`1.5px solid rgba(184,107,93,0.30)`,borderRadius:7,fontFamily:"'JetBrains Mono',monospace",fontSize:14,outline:'none',background:'rgba(255,255,255,0.7)',color:C.text1,width:110}}/>
        </div>
        <div>
          <div style={{fontSize:10,color:C.text3,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:4}}>ДЛИТ. (МИН)</div>
          <input type="number" value={value.duration||item.dur||''} onChange={e=>onChange({...value,duration:e.target.value})}
            style={{padding:'8px 10px',border:`1.5px solid rgba(184,107,93,0.30)`,borderRadius:7,fontFamily:"'JetBrains Mono',monospace",fontSize:14,outline:'none',background:'rgba(255,255,255,0.7)',color:C.text1,width:90}}/>
        </div>
      </div>
      {isWeekly && (
        <div>
          <div style={{fontSize:10,color:C.text3,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:6}}>ДЕНЬ НЕДЕЛИ</div>
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            {weekDays.map(([v,l])=>(
              <div key={v} onClick={()=>onChange({...value,weekDay:v})}
                style={{padding:'6px 12px',borderRadius:16,fontSize:13,cursor:'pointer',border:`1.5px solid ${value.weekDay===v?'rgba(184,107,93,0.7)':'rgba(10,37,64,0.15)'}`,background:value.weekDay===v?'rgba(184,107,93,0.15)':'transparent',color:value.weekDay===v?C.rose:C.text2}}>
                {l}
              </div>
            ))}
          </div>
        </div>
      )}
      {isSliding && (
        <div>
          <div style={{fontSize:10,color:C.text3,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1,marginBottom:4}}>ДАТА НАЧАЛА</div>
          <input type="date" value={value.startDate||localDateStr(new Date())} onChange={e=>onChange({...value,startDate:e.target.value})}
            style={{padding:'8px 10px',border:`1.5px solid rgba(184,107,93,0.30)`,borderRadius:7,fontFamily:"'JetBrains Mono',monospace",fontSize:14,outline:'none',background:'rgba(255,255,255,0.7)',color:C.text1}}/>
        </div>
      )}
    </div>
  );
}

// ─── ПРОГРЕСС-КОЛЬЦО ───
function ProgressRing({ done, total, size=56 }) {
  const r=22, c=2*Math.PI*r, pct=total>0?done/total:0;
  return (
    <svg width={size} height={size} viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(184,107,93,0.15)" strokeWidth="4"/>
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(184,107,93,0.7)" strokeWidth="4"
        strokeDasharray={c} strokeDashoffset={c*(1-pct)} strokeLinecap="round" transform="rotate(-90 28 28)"
        style={{transition:'stroke-dashoffset 0.5s ease'}}/>
      <text x="28" y="33" textAnchor="middle" fontSize="11" fill="rgba(184,107,93,0.9)" fontFamily="'JetBrains Mono',monospace">{done}/{total}</text>
    </svg>
  );
}

// ─── ОСНОВНОЙ КОМПОНЕНТ ───
export function BeautySection() {
  const { profile={}, tasks=[], setTasks=()=>{}, beautyProcs={}, setBeautyProcs=()=>{}, beautyTopics=[], setBeautyTopics=()=>{}, notify } = useApp();

  const beautyTasks = tasks.filter(t=>t.section==='beauty');
  const today = localDateStr(new Date());
  const due = beautyTasks.filter(t=>isDue(t,today));
  const doneToday = beautyTasks.filter(t=>t.doneDate===today).length;
  const isMale = profile.gender==='Мужской';

  const [openCats, setOpenCats] = useState({});
  const [settingsOpen, setSettingsOpen] = useState({});
  const [pendingSettings, setPendingSettings] = useState({});
  const [aiRec, setAiRec] = useState(()=>{ try { return JSON.parse(localStorage.getItem('ld_beauty_ai_rec')||'null'); } catch { return null; } });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaved, setAiSaved] = useState(()=>{ try { return JSON.parse(localStorage.getItem('ld_beauty_ai_saved')||'[]'); } catch { return []; } });
  const [openAiSections, setOpenAiSections] = useState({});

  // ── Список процедур ──
  const TOPICS = isMale ? [
    { cat:'Лицо', items:[
      { id:'face_morning', name:'Умывание утром',  freq:'daily',    time:'07:00', icon:'💧', dur:10 },
      { id:'face_evening', name:'Умывание вечером',freq:'daily',    time:'21:00', icon:'🌙', dur:10 },
      { id:'face_scrub',   name:'Скраб для лица',  freq:'every:7',  time:'19:00', icon:'🫧', dur:10 },
      { id:'face_mask',    name:'Маска для лица',   freq:'every:7',  time:'20:00', icon:'🎭', dur:20 },
    ]},
    { cat:'Тело', items:[
      { id:'body_cream',   name:'Крем для тела',    freq:'daily',    time:'20:00', icon:'🧴', dur:5  },
      { id:'body_scrub',   name:'Скраб для тела',   freq:'every:7',  time:'20:00', icon:'🫧', dur:15 },
    ]},
    { cat:'Борода и волосы', items:[
      { id:'beard_care',   name:'Уход за бородой',  freq:'every:2',  time:'08:00', icon:'🧔', dur:10 },
      { id:'hair_wash',    name:'Мытьё волос',       freq:'every:2',  time:'20:00', icon:'🚿', dur:20 },
      { id:'haircut',      name:'Стрижка / барбер',  freq:'every:30', time:'',      icon:'✂️', dur:60 },
    ]},
    { cat:'Руки и ногти', items:[
      { id:'hand_cream',   name:'Крем для рук',     freq:'daily',    time:'21:00', icon:'🤲', dur:3  },
      { id:'nails_m',      name:'Стрижка ногтей',   freq:'every:10', time:'',      icon:'💅', dur:10 },
    ]},
  ] : [
    { cat:'Уход за лицом', items:[
      { id:'face_morning', name:'Утренний уход',     freq:'daily',    time:'07:00', icon:'☀️', dur:10, note:'Очищение → тоник → крем' },
      { id:'face_evening', name:'Вечерний уход',     freq:'daily',    time:'21:00', icon:'🌙', dur:15, note:'Снятие макияжа → очищение → сыворотка → крем' },
      { id:'face_mask',    name:'Маска для лица',    freq:'every:3',  time:'20:00', icon:'🎭', dur:20 },
      { id:'face_scrub',   name:'Скраб / пилинг',   freq:'every:7',  time:'20:00', icon:'🫧', dur:10 },
      { id:'eye_care',     name:'Крем для глаз',     freq:'daily',    time:'21:00', icon:'👁', dur:3  },
    ]},
    { cat:'Уход за телом', items:[
      { id:'body_cream',   name:'Крем для тела',     freq:'daily',    time:'20:00', icon:'🧴', dur:5  },
      { id:'body_scrub',   name:'Скраб для тела',    freq:'every:4',  time:'20:00', icon:'🫧', dur:15 },
      { id:'depo',         name:'Депиляция',          freq:'every:14', time:'',      icon:'✨', dur:30 },
      { id:'tan',          name:'Автозагар',           freq:'every:7',  time:'',      icon:'🌅', dur:10 },
    ]},
    { cat:'Уход за волосами', items:[
      { id:'hair_wash',    name:'Мытьё волос',        freq:'every:2',  time:'20:00', icon:'🚿', dur:20 },
      { id:'hair_mask',    name:'Маска для волос',    freq:'every:7',  time:'20:00', icon:'💆', dur:40 },
      { id:'hair_oil',     name:'Масло для волос',    freq:'every:7',  time:'',      icon:'🫙', dur:10 },
      { id:'haircut',      name:'Стрижка',             freq:'every:30', time:'',      icon:'✂️', dur:60 },
      { id:'coloring',     name:'Окрашивание',         freq:'every:42', time:'',      icon:'🎨', dur:120},
    ]},
    { cat:'Маникюр и ногти', items:[
      { id:'nails',        name:'Маникюр',             freq:'every:21', time:'',      icon:'💅', dur:60 },
      { id:'ped',          name:'Педикюр',              freq:'every:30', time:'',      icon:'🦶', dur:60 },
      { id:'nail_care',    name:'Уход за кутикулой',   freq:'every:3',  time:'21:00', icon:'🤲', dur:5  },
    ]},
    { cat:'Брови и ресницы', items:[
      { id:'brows',        name:'Коррекция бровей',    freq:'every:14', time:'',      icon:'🪞', dur:20 },
      { id:'lash',         name:'Наращивание ресниц',  freq:'every:21', time:'',      icon:'✨', dur:90 },
    ]},
    { cat:'Массаж и релакс', items:[
      { id:'massage',      name:'Массаж лица',         freq:'every:3',  time:'21:00', icon:'💆', dur:15 },
      { id:'lymph',        name:'Лимфодренажный массаж',freq:'every:7', time:'',      icon:'🫀', dur:30 },
      { id:'bath',         name:'Ванна с солью / пеной',freq:'every:7', time:'21:00', icon:'🛁', dur:30 },
    ]},
  ];

  const allItems = TOPICS.flatMap(t=>t.items);

  // ── Добавление пользовательской процедуры ──
  const [customForm, setCustomForm] = useState(null); // {catIdx}
  const addCustomProc = (catIdx) => {
    setCustomForm({ catIdx, name:'', freq:'daily', time:'', dur:10 });
  };
  const confirmCustom = () => {
    if (!customForm?.name) return;
    const id = `custom_${Date.now()}`;
    const item = { id, name:customForm.name, freq:customForm.freq, time:customForm.time, icon:'⭐', dur:customForm.dur };
    setTasks(p=>[...p, {
      id:Date.now()+Math.random(), beautyId:id, title:item.name, section:'beauty',
      freq:item.freq, priority:'m', preferredTime:item.time,
      beautyDuration:parseInt(item.dur), beautyStartDate:today,
      notes:'', lastDone:'', doneDate:'',
    }]);
    setBeautyProcs(p=>({...p,[id]:{time:item.time,duration:item.dur,confirmed:true}}));
    setBeautyTopics(p=>p.includes(id)?p:[...p,id]);
    setCustomForm(null);
    notify?.('✅ Процедура добавлена');
  };

  const confirmProc = (item) => {
    const s=pendingSettings[item.id]||{};
    const time=s.time||item.time||'';
    const duration=s.duration||item.dur||10;
    const startDate=s.startDate||today;
    const weekDay=s.weekDay||'';
    const freq=weekDay&&item.freq.startsWith('weekly:')?`weekly:${weekDay}`:item.freq;
    setTasks(p=>{
      const without=p.filter(t=>!(t.section==='beauty'&&t.beautyId===item.id));
      return [...without,{
        id:Date.now()+Math.random(), beautyId:item.id, title:item.name,
        section:'beauty', freq, priority:'m', preferredTime:time,
        beautyDuration:parseInt(duration), beautyStartDate:startDate,
        notes:item.note||'', lastDone:'', doneDate:'',
      }];
    });
    setBeautyProcs(p=>({...p,[item.id]:{time,duration,startDate,weekDay,confirmed:true}}));
    setBeautyTopics(p=>p.includes(item.id)?p:[...p,item.id]);
    setSettingsOpen(p=>({...p,[item.id]:false}));
    notify?.(`✅ ${item.name} добавлена в ритуалы`);
  };

  const removeProc = (beautyId) => {
    setTasks(p=>p.filter(t=>!(t.section==='beauty'&&t.beautyId===beautyId)));
    setBeautyProcs(p=>{ const n={...p}; delete n[beautyId]; return n; });
    setBeautyTopics(p=>p.filter(id=>id!==beautyId));
  };

  const updateProcField = (taskId, beautyId, field, value) => {
    setTasks(p=>p.map(t=>t.id===taskId?{...t,[field]:value}:t));
    if (beautyId&&field==='preferredTime') {
      setBeautyProcs(p=>({...p,[beautyId]:{...(p[beautyId]||{}),time:value}}));
    }
    if (beautyId&&field==='beautyDuration') {
      setBeautyProcs(p=>({...p,[beautyId]:{...(p[beautyId]||{}),duration:value}}));
    }
  };

  const toggleDone = (taskId) => {
    setTasks(p=>p.map(t=>t.id===taskId?{...t,doneDate:t.doneDate===today?null:today,lastDone:t.doneDate===today?t.lastDone:today}:t));
  };

  const groupedBySlot = useMemo(()=>{
    const groups={утро:[],день:[],вечер:[]};
    beautyTasks.forEach(t=>{ const s=timeSlot(t.preferredTime); groups[s].push(t); });
    Object.keys(groups).forEach(k=>{ groups[k].sort((a,b)=>(a.preferredTime||'').localeCompare(b.preferredTime||'')); });
    return groups;
  },[beautyTasks]);

  // ── ИИ рекомендации ──
  const fetchAiRec = async () => {
    setAiLoading(true);
    try {
      const procs = beautyTasks.map(t=>t.title).join(', ')||'не выбраны';
      const prompt = `Составь персональные рекомендации по уходу.
Профиль: ${profile.name||'—'}, ${profile.gender||'—'}, ${profile.age||'—'} лет.
Тип кожи: ${profile.skinType||'—'}. Тип волос: ${profile.hairType||'—'}.
Приоритет ухода: ${profile.beautyPriority||'—'}.
ТКМ: температура ${profile.tcmTemp||'—'}, влажность ${profile.tcmMoisture||'—'}.
Текущие процедуры: ${procs}.
Сезон: ${['зима','зима','весна','весна','весна','лето','лето','лето','осень','осень','осень','зима'][new Date().getMonth()]}.

Ответь ТОЛЬКО JSON (без markdown):
{
  "sections": [
    { "title": "💧 Базовый уход",       "items": ["конкретный совет 1", "совет 2", "совет 3"] },
    { "title": "✨ Усиление эффекта",   "items": ["..."] },
    { "title": "🌿 ТКМ и сезон",        "items": ["..."] },
    { "title": "⚠️ Чего избегать",       "items": ["..."] },
    { "title": "🎯 Приоритеты на месяц","items": ["..."] }
  ],
  "summary": "2-3 предложения персонального вывода"
}`;

      const response = await fetch('/api/ai', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ system:'Ты косметолог-эксперт. Отвечай ТОЛЬКО валидным JSON.', user:prompt, maxTokens:1200 }),
      });
      const data = await response.json();
      const parsed = JSON.parse(data.text.replace(/```json|```/g,'').trim());
      setAiRec(parsed);
      try { localStorage.setItem('ld_beauty_ai_rec', JSON.stringify(parsed)); } catch {}
      notify?.('✅ Рекомендации готовы');
    } catch(e) {
      notify?.('❌ Ошибка ИИ');
    } finally { setAiLoading(false); }
  };

  const saveAiSection = (title) => {
    const next = aiSaved.includes(title) ? aiSaved.filter(t=>t!==title) : [...aiSaved, title];
    setAiSaved(next);
    try { localStorage.setItem('ld_beauty_ai_saved', JSON.stringify(next)); } catch {}
    notify?.(aiSaved.includes(title) ? '📌 Убрано из сохранённых' : '📌 Раздел сохранён');
  };

  const skinTips = {
    'Сухая':'Увлажнение — приоритет. Избегай спиртосодержащих средств.',
    'Жирная':'Лёгкие некомедогенные текстуры. Кислотное очищение 2×/нед.',
    'Комбинированная':'Раздельный уход для Т-зоны и щёк.',
    'Чувствительная':'Минимализм в составах. Без отдушек и агрессивных кислот.',
    'Нормальная':'Поддерживающий уход. Профилактика — лучшее лечение.',
  };

  // ── [1] КАТАЛОГ ПРОЦЕДУР — лицевая с лотосом, оборот: раскрывающийся список ──
  const CatalogFront = () => {
    const [lotusOpen, setLotusOpen] = useState(false);
    return (
      <div>
        {/* Анимированный лотос — кнопка раскрытия списка */}
        <div onClick={()=>setLotusOpen(o=>!o)}
          style={{position:'relative',width:'100%',height:140,cursor:'pointer',overflow:'hidden',
            borderRadius:lotusOpen?'12px 12px 0 0':12,border:`1.5px solid rgba(184,107,93,0.20)`,
            marginBottom:0, background:'rgba(244,236,216,0.5)'}}>
          <img src="/sections/beauty.jpg" alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:0.25}} onError={e=>e.target.style.display='none'}/>
          <LotusAnim isOpen={lotusOpen}/>
          <div style={{position:'absolute',bottom:12,left:0,right:0,display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
            <span style={{fontFamily:"'Cormorant Infant',serif",fontSize:17,color:'#3d2817',fontWeight:600,letterSpacing:1}}>Каталог процедур</span>
            <span style={{fontSize:13,color:'#5d4a3a',transform:lotusOpen?'rotate(180deg)':'rotate(0)',transition:'transform 0.4s',display:'inline-block'}}>▼</span>
          </div>
        </div>

        {/* Список категорий — раскрывается при лотосе */}
        {lotusOpen && (
          <div style={{border:'1px solid rgba(184,107,93,0.20)',borderTop:'none',borderRadius:'0 0 12px 12px',padding:12,background:'rgba(244,236,216,0.4)'}}>
            {TOPICS.map((cat,catIdx)=>{
              const isCatOpen=openCats[cat.cat];
              const confirmedInCat=cat.items.filter(i=>beautyProcs[i.id]?.confirmed).length;
              return (
                <div key={cat.cat} style={{marginBottom:8}}>
                  <div onClick={()=>setOpenCats(p=>({...p,[cat.cat]:!p[cat.cat]}))}
                    style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',
                      background:isCatOpen?'rgba(184,107,93,0.12)':'rgba(184,107,93,0.06)',
                      borderRadius:isCatOpen?'8px 8px 0 0':8,cursor:'pointer',
                      border:'1px solid rgba(184,107,93,0.18)'}}>
                    <span style={{flex:1,fontSize:15,color:'rgba(184,107,93,0.95)',fontFamily:"'Crimson Pro',serif",fontWeight:600}}>{cat.cat}</span>
                    {confirmedInCat>0 && <span style={{fontSize:11,color:C.success,fontFamily:"'JetBrains Mono',monospace",background:'rgba(26,77,46,0.10)',padding:'2px 8px',borderRadius:10}}>✓ {confirmedInCat}</span>}
                    <span style={{fontSize:12,color:C.text3,transform:isCatOpen?'rotate(180deg)':'rotate(0)',transition:'transform 0.25s',display:'inline-block'}}>▼</span>
                  </div>

                  {isCatOpen && (
                    <div style={{border:'1px solid rgba(184,107,93,0.15)',borderTop:'none',borderRadius:'0 0 8px 8px',padding:'8px 12px',background:'rgba(255,255,255,0.4)'}}>
                      {cat.items.map(item=>{
                        const confirmed=!!beautyProcs[item.id]?.confirmed;
                        const isSettOpen=settingsOpen[item.id];
                        return (
                          <div key={item.id} style={{padding:'10px 0',borderBottom:'1px solid rgba(184,107,93,0.08)'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <span style={{fontSize:18,flexShrink:0}}>{item.icon}</span>
                              <div style={{flex:1}}>
                                <div style={{fontSize:15,color:confirmed?C.success:C.text1,fontFamily:"'Crimson Pro',serif",fontWeight:confirmed?600:400}}>{item.name}</div>
                                <div style={{fontSize:11,color:C.text3,fontFamily:"'JetBrains Mono',monospace"}}>{freqLabel(item.freq)} · {item.dur} мин</div>
                              </div>
                              {confirmed ? (
                                <button onClick={()=>removeProc(item.id)}
                                  style={{padding:'5px 12px',borderRadius:8,border:'1px solid rgba(107,16,16,0.25)',background:'transparent',color:C.error,cursor:'pointer',fontSize:12}}>
                                  Убрать
                                </button>
                              ) : (
                                <button onClick={()=>setSettingsOpen(p=>({...p,[item.id]:!p[item.id]}))}
                                  style={{padding:'5px 12px',borderRadius:8,border:'1px solid rgba(184,107,93,0.4)',background:isSettOpen?'rgba(184,107,93,0.15)':'transparent',color:'rgba(184,107,93,0.9)',cursor:'pointer',fontSize:12}}>
                                  {isSettOpen?'Скрыть':'+ Добавить'}
                                </button>
                              )}
                            </div>
                            {isSettOpen && !confirmed && (
                              <>
                                <ProcSettingsForm item={item} value={pendingSettings[item.id]||{}} onChange={v=>setPendingSettings(p=>({...p,[item.id]:v}))}/>
                                <button onClick={()=>confirmProc(item)}
                                  style={{marginTop:10,padding:'8px 20px',borderRadius:8,border:'none',background:'rgba(184,107,93,0.8)',color:'#fff',cursor:'pointer',fontSize:14,fontFamily:"'Crimson Pro',serif"}}>
                                  ✓ Подтвердить
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}
                      {/* Добавить свою процедуру */}
                      {customForm?.catIdx===catIdx ? (
                        <div style={{padding:'12px 0',borderTop:'1px solid rgba(184,107,93,0.10)',marginTop:8}}>
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.navyMid,letterSpacing:2,textTransform:'uppercase',marginBottom:10}}>Своя процедура</div>
                          <div style={{display:'flex',flexDirection:'column',gap:8}}>
                            <input value={customForm.name} onChange={e=>setCustomForm(p=>({...p,name:e.target.value}))} placeholder="Название процедуры"
                              style={{padding:'10px 12px',border:`1.5px solid rgba(184,107,93,0.30)`,borderRadius:8,fontFamily:"'Crimson Pro',serif",fontSize:15,outline:'none',background:'rgba(255,255,255,0.8)',color:C.text1}}/>
                            <div style={{display:'flex',gap:10}}>
                              <input type="time" value={customForm.time} onChange={e=>setCustomForm(p=>({...p,time:e.target.value}))}
                                style={{flex:1,padding:'10px 12px',border:`1.5px solid rgba(184,107,93,0.30)`,borderRadius:8,fontFamily:"'JetBrains Mono',monospace",fontSize:13,outline:'none',background:'rgba(255,255,255,0.8)',color:C.text1}}/>
                              <input type="number" value={customForm.dur} onChange={e=>setCustomForm(p=>({...p,dur:e.target.value}))} placeholder="мин"
                                style={{width:80,padding:'10px 12px',border:`1.5px solid rgba(184,107,93,0.30)`,borderRadius:8,fontFamily:"'JetBrains Mono',monospace",fontSize:13,outline:'none',background:'rgba(255,255,255,0.8)',color:C.text1}}/>
                            </div>
                            <div style={{display:'flex',gap:8}}>
                              <button onClick={confirmCustom} style={{flex:2,padding:'10px 0',borderRadius:8,border:'none',background:'rgba(184,107,93,0.8)',color:'#fff',cursor:'pointer',fontSize:14,fontFamily:"'Crimson Pro',serif"}}>✓ Добавить</button>
                              <button onClick={()=>setCustomForm(null)} style={{flex:1,padding:'10px 0',borderRadius:8,border:'1px solid rgba(10,37,64,0.15)',background:'transparent',color:C.text3,cursor:'pointer',fontSize:13}}>Отмена</button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button onClick={()=>addCustomProc(catIdx)}
                          style={{width:'100%',marginTop:10,padding:'9px 0',border:`1.5px dashed rgba(184,107,93,0.30)`,borderRadius:8,background:'transparent',fontFamily:"'Cinzel',serif",fontSize:11,letterSpacing:2,color:'rgba(184,107,93,0.7)',cursor:'pointer',textTransform:'uppercase'}}>
                          + Своя процедура
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
  };

  // ── [2] МОИ РИТУАЛЫ — список по слотам, аккордеон ──
  const RitualsContent = () => (
    <div>
      {beautyTasks.length===0 && (
        <div style={{textAlign:'center',padding:'24px 0',fontFamily:"'Cormorant Infant',serif",fontSize:16,fontStyle:'italic',color:C.text3}}>
          Откройте каталог и выберите процедуры
        </div>
      )}
      {Object.entries(SLOT_LABELS).map(([slot,label])=>{
        const items=groupedBySlot[slot];
        if (!items?.length) return null;
        return (
          <div key={slot} style={{marginBottom:18}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:'rgba(184,107,93,0.9)',letterSpacing:2,marginBottom:10,paddingBottom:6,borderBottom:'1px solid rgba(184,107,93,0.15)'}}>{label}</div>
            {items.map(task=>{
              const itemDef=allItems.find(i=>i.id===task.beautyId);
              const isDueToday=isDue(task,today);
              const done=task.doneDate===today;
              const cat=TOPICS.find(c=>c.items.some(i=>i.id===task.beautyId))?.cat||'';
              return (
                <div key={task.id} style={{
                  padding:'14px 14px',marginBottom:8,borderRadius:10,
                  background:done?'rgba(26,77,46,0.07)':'rgba(255,255,255,0.5)',
                  border:`1.5px solid ${done?'rgba(26,77,46,0.25)':'rgba(184,107,93,0.15)'}`,
                  borderLeft:`3px solid ${done?C.success:'rgba(184,107,93,0.5)'}`,
                }}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                    {/* Чекбокс */}
                    <div onClick={()=>toggleDone(task.id)}
                      style={{width:22,height:22,borderRadius:'50%',border:`2px solid ${done?C.success:'rgba(184,107,93,0.4)'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',background:done?'rgba(26,77,46,0.15)':'transparent',flexShrink:0}}>
                      {done && <span style={{fontSize:12,color:C.success}}>✓</span>}
                    </div>
                    <span style={{fontSize:20,flexShrink:0}}>{itemDef?.icon||'✨'}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:16,color:done?C.text3:C.text1,fontFamily:"'Crimson Pro',serif",fontWeight:500,textDecoration:done?'line-through':'none'}}>{task.title}</div>
                      {cat && <div style={{fontSize:11,color:'rgba(184,107,93,0.6)',fontFamily:"'JetBrains Mono',monospace",letterSpacing:0.5}}>{cat}</div>}
                    </div>
                    <button onClick={()=>removeProc(task.beautyId)}
                      style={{background:'none',border:'none',color:C.text3,fontSize:16,cursor:'pointer',padding:'0 4px',opacity:0.6}}>✕</button>
                  </div>
                  {/* Редактирование времени и длительности */}
                  <div style={{display:'flex',gap:10,alignItems:'center',paddingTop:8,borderTop:'1px solid rgba(184,107,93,0.10)'}}>
                    <div style={{display:'flex',flexDirection:'column',gap:3}}>
                      <span style={{fontSize:9,color:C.text3,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1}}>ВРЕМЯ</span>
                      <input type="time" value={task.preferredTime||''} onChange={e=>updateProcField(task.id,task.beautyId,'preferredTime',e.target.value)}
                        style={{padding:'6px 8px',border:'1.5px solid rgba(184,107,93,0.25)',borderRadius:7,fontFamily:"'JetBrains Mono',monospace",fontSize:13,outline:'none',background:'rgba(255,255,255,0.7)',color:C.text1,width:100}}/>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:3}}>
                      <span style={{fontSize:9,color:C.text3,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1}}>МИН</span>
                      <input type="number" value={task.beautyDuration||''} onChange={e=>updateProcField(task.id,task.beautyId,'beautyDuration',parseInt(e.target.value))}
                        style={{padding:'6px 8px',border:'1.5px solid rgba(184,107,93,0.25)',borderRadius:7,fontFamily:"'JetBrains Mono',monospace",fontSize:13,outline:'none',background:'rgba(255,255,255,0.7)',color:C.text1,width:70}}/>
                    </div>
                    <div style={{flex:1,textAlign:'right'}}>
                      <div style={{fontSize:12,color:isDueToday?'rgba(184,107,93,0.8)':C.text3,fontFamily:"'JetBrains Mono',monospace"}}>
                        {freqLabel(task.freq)}
                        {!isDueToday && <span style={{display:'block',fontSize:10,color:C.text3,opacity:0.6}}>не сегодня</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  // ── [3] ИИ РЕКОМЕНДАЦИИ — аккордеон по секциям ──
  const AiRecContent = () => (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{fontFamily:"'Crimson Pro',serif",fontSize:15,color:C.text2,lineHeight:1.5}}>
          Персональные рекомендации на основе профиля и выбранных процедур
        </div>
        <button onClick={fetchAiRec} disabled={aiLoading}
          style={{padding:'9px 16px',borderRadius:8,fontFamily:"'Cinzel',serif",fontSize:11,letterSpacing:1.5,fontWeight:700,textTransform:'uppercase',cursor:aiLoading?'not-allowed':'pointer',
            background:aiLoading?'rgba(10,37,64,0.08)':`linear-gradient(135deg,${C.navyMid},${C.navy})`,
            color:aiLoading?C.text3:C.goldPale,border:`1.5px solid ${aiLoading?C.lineS:C.navy}`,
            opacity:aiLoading?0.7:1,flexShrink:0}}>
          {aiLoading?'⏳..':aiRec?'🔄':'✨ ИИ'}
        </button>
      </div>

      {aiLoading && (
        <div style={{textAlign:'center',padding:'28px 0',fontFamily:"'Cormorant Infant',serif",fontSize:16,fontStyle:'italic',color:C.text3}}>
          Анализирую профиль и составляю план ухода...
        </div>
      )}

      {aiRec && !aiLoading && (
        <div>
          {/* Сводка */}
          {aiRec.summary && (
            <div style={{padding:'12px 16px',borderRadius:10,background:`rgba(184,107,93,0.07)`,border:`1px solid rgba(184,107,93,0.20)`,borderLeft:`3px solid rgba(184,107,93,0.6)`,marginBottom:14,fontFamily:"'Crimson Pro',serif",fontSize:16,color:C.text1,lineHeight:1.7}}>
              {aiRec.summary}
            </div>
          )}

          {/* Секции аккордеоном */}
          {(aiRec.sections||[]).map((sec,i)=>{
            const isOpen=openAiSections[i];
            const isSaved=aiSaved.includes(sec.title);
            return (
              <div key={i} style={{marginBottom:8,borderRadius:10,overflow:'hidden',border:`1.5px solid rgba(184,107,93,0.15)`,background:'rgba(255,255,255,0.4)'}}>
                <div onClick={()=>setOpenAiSections(p=>({...p,[i]:!p[i]}))}
                  style={{padding:'12px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,
                    background:isOpen?'rgba(184,107,93,0.08)':'transparent'}}>
                  <span style={{flex:1,fontFamily:"'Cinzel',serif",fontSize:14,color:C.navy,fontWeight:700,letterSpacing:1,textTransform:'uppercase'}}>{sec.title}</span>
                  <button onClick={e=>{e.stopPropagation();saveAiSection(sec.title);}}
                    style={{background:'none',border:'none',fontSize:16,cursor:'pointer',color:isSaved?C.gold:C.text3,padding:'0 4px'}}>
                    {isSaved?'📌':'🔖'}
                  </button>
                  <span style={{fontSize:13,color:C.gold,transform:isOpen?'rotate(180deg)':'rotate(0)',transition:'transform 0.25s',display:'inline-block'}}>▼</span>
                </div>
                {isOpen && (
                  <div style={{padding:'4px 14px 14px'}}>
                    {(sec.items||[]).map((item,j)=>(
                      <div key={j} style={{display:'flex',gap:10,padding:'9px 0',borderBottom:`1px solid rgba(184,107,93,0.08)`}}>
                        <span style={{color:'rgba(184,107,93,0.7)',fontWeight:700,flexShrink:0,marginTop:2}}>·</span>
                        <span style={{fontFamily:"'Crimson Pro',serif",fontSize:16,color:C.text1,lineHeight:1.6}}>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Сохранённые секции */}
          {aiSaved.length>0 && (
            <div style={{marginTop:16,padding:'12px 14px',borderRadius:10,background:`rgba(212,175,55,0.08)`,border:`1px solid rgba(212,175,55,0.25)`,borderLeft:`3px solid ${C.gold}`}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.goldDeep,letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>📌 Сохранённые разделы</div>
              {aiSaved.map((t,i)=>(
                <div key={i} style={{fontFamily:"'Crimson Pro',serif",fontSize:14,color:C.text2,padding:'4px 0',borderBottom:`1px solid rgba(212,175,55,0.12)`}}>· {t}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {!aiRec && !aiLoading && (
        <div style={{textAlign:'center',padding:'24px 0',fontFamily:"'Cormorant Infant',serif",fontSize:16,fontStyle:'italic',color:C.text3}}>
          ИИ составит персональный план ухода с учётом типа кожи, ТКМ и сезона
        </div>
      )}
    </div>
  );

  return (
    <div style={{paddingBottom:80}}>

      {/* ── Шапка: прогресс ── */}
      <div style={{padding:'0 16px'}}>
        <div style={{display:'flex',gap:12,marginBottom:18,alignItems:'center',padding:'14px',borderRadius:12,background:`linear-gradient(160deg,${C.bgCard} 0%,${C.bgCard2} 100%)`,border:`1.5px solid ${C.line}`,boxShadow:`0 3px 12px rgba(10,37,64,0.08)`}}>
          <ProgressRing done={doneToday} total={due.length+doneToday}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:19,color:C.text1,marginBottom:4,fontStyle:'italic'}}>Beauty Journal</div>
            {profile.skinType && (
              <div style={{fontSize:14,color:C.text2,lineHeight:1.5,padding:'7px 10px',background:'rgba(184,107,93,0.06)',borderRadius:8,borderLeft:'2px solid rgba(184,107,93,0.4)'}}>
                💆 <strong>{profile.skinType} кожа:</strong> {skinTips[profile.skinType]||'Регулярный уход — основа здоровья кожи.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 3 карточки ── */}
      <div style={{padding:'0 16px'}}>

        {/* [1] Каталог процедур */}
        <FlipCard
          title="Каталог процедур"
          image="/beauty/beauty-catalog.jpg"
          frontExtra={beautyTasks.length>0 && (
            <div style={{padding:'4px 10px',borderRadius:20,background:'rgba(26,77,46,0.80)',fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'#fff',letterSpacing:1}}>
              ✓ {beautyTasks.length} процедур
            </div>
          )}>
          <CatalogFront/>
        </FlipCard>

        {/* [2] Мои ритуалы */}
        <FlipCard
          title="Мои ритуалы"
          image="/beauty/beauty-rituals.jpg"
          frontExtra={beautyTasks.length>0 && (
            <div style={{padding:'4px 10px',borderRadius:20,background:'rgba(26,77,46,0.80)',fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'#fff',letterSpacing:1}}>
              {doneToday}/{due.length+doneToday} сегодня
            </div>
          )}>
          <RitualsContent/>
        </FlipCard>

        {/* [3] ИИ рекомендации */}
        <FlipCard
          title="Рекомендации ИИ"
          image="/beauty/beauty-ai.jpg">
          <AiRecContent/>
        </FlipCard>

      </div>
    </div>
  );
                                }
