// src/sections/BeautySection.jsx
import { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { openGoogleCalendar } from '../utils/googleCalendar';

const C = {
  navy:'#0A2540', navyMid:'#1E3A5F',
  gold:'#D4AF37', goldDeep:'#B8941E', goldPale:'#F0DC90',
  rose:'rgba(184,107,93,1)',
  bg:'#F5E8C7', bgCard:'#FAF3E0', bgCard2:'#F2E8CE',
  text1:'#0A2540', text2:'#1E3A5F', text3:'#4A6480',
  success:'#1A4D2E', error:'#6B1010',
  line:'rgba(10,37,64,0.22)', lineS:'rgba(10,37,64,0.10)',
};

// Цвета категорий
const CAT_COLORS = {
  'Уход за лицом':    { bg:'rgba(184,107,93,0.12)', accent:'#B86B5D', emoji:'🌸' },
  'Уход за телом':    { bg:'rgba(100,149,180,0.12)', accent:'#6495B4', emoji:'🧴' },
  'Уход за волосами': { bg:'rgba(139,107,60,0.12)',  accent:'#8B6B3C', emoji:'💆' },
  'Маникюр и ногти':  { bg:'rgba(160,82,120,0.12)',  accent:'#A05278', emoji:'💅' },
  'Брови и ресницы':  { bg:'rgba(80,120,80,0.12)',   accent:'#507850', emoji:'✨' },
  'Массаж и релакс':  { bg:'rgba(107,93,184,0.12)',  accent:'#6B5DB8', emoji:'🛁' },
  'Лицо':             { bg:'rgba(184,107,93,0.12)',  accent:'#B86B5D', emoji:'🌸' },
  'Тело':             { bg:'rgba(100,149,180,0.12)', accent:'#6495B4', emoji:'🧴' },
  'Борода и волосы':  { bg:'rgba(139,107,60,0.12)',  accent:'#8B6B3C', emoji:'🧔' },
  'Руки и ногти':     { bg:'rgba(160,82,120,0.12)',  accent:'#A05278', emoji:'💅' },
};

function isDue(task, today) {
  if (!task.freq||task.doneDate===today) return false;
  const last=task.lastDone; const d=new Date(today); d.setHours(0,0,0,0);
  if (task.freq==='daily') return last!==today;
  if (task.freq==='workdays') { const dn=d.getDay(); return dn>=1&&dn<=5&&last!==today; }
  if (task.freq.startsWith('weekly:')) return task.freq.split(':')[1].split(',').map(Number).includes(d.getDay())&&last!==today;
  if (task.freq.startsWith('every:')) {
    const n=parseInt(task.freq.split(':')[1]);
    if (!last) return task.beautyStartDate?today>=task.beautyStartDate:true;
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

function timeSlot(t) {
  if (!t) return 'вечер'; const h=parseInt(t.split(':')[0]);
  if (h<12) return 'утро'; if (h<17) return 'день'; return 'вечер';
}

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Ищет ближайшую будущую дату, когда процедура должна выполняться —
// нужно для кнопки «Добавить в Google Calendar» у повторяющихся дел.
function nextOccurrenceDate(task, todayStr) {
  if (isDue(task, todayStr)) return todayStr;
  const d = new Date(todayStr+'T00:00:00');
  for (let i=1;i<=90;i++){
    d.setDate(d.getDate()+1);
    const ds = localDateStr(d);
    if (isDue(task, ds)) return ds;
  }
  return todayStr;
}

const WEEKDAYS = [['1','пн'],['2','вт'],['3','ср'],['4','чт'],['5','пт'],['6','сб'],['0','вс']];

// ─── FLIP CARD ───
function FlipCard({ title, image, badge, children }) {
  const [flipped, setFlipped] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  return (
    <div style={{marginBottom:16}}>
      {!flipped && (
        <div onClick={()=>setFlipped(true)} style={{position:'relative',width:'100%',aspectRatio:'4/3',borderRadius:16,overflow:'hidden',cursor:'pointer',background:C.navyMid,boxShadow:`0 6px 24px rgba(10,37,64,0.22),0 0 0 1.5px ${C.line}`}}>
          {imgOk&&<img src={image} alt={title} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}} onError={()=>setImgOk(false)}/>}
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(10,25,45,0.92) 0%,rgba(10,25,45,0.20) 50%,transparent 100%)'}}/>
          <div style={{position:'absolute',top:10,left:10,width:14,height:14,borderTop:`2.5px solid ${C.gold}`,borderLeft:`2.5px solid ${C.gold}`,opacity:0.9}}/>
          <div style={{position:'absolute',bottom:10,right:10,width:14,height:14,borderBottom:`2.5px solid ${C.gold}`,borderRight:`2.5px solid ${C.gold}`,opacity:0.9}}/>
          <div style={{position:'absolute',top:12,right:14,fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'rgba(212,175,55,0.80)',letterSpacing:2,textTransform:'uppercase'}}>нажмите →</div>
          {badge&&<div style={{position:'absolute',top:12,left:12}}>{badge}</div>}
          <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'14px 18px 18px'}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:22,fontWeight:700,color:'#fff',letterSpacing:3,textTransform:'uppercase',textShadow:'0 2px 10px rgba(0,0,0,0.8)',lineHeight:1.2}}>{title}</div>
          </div>
        </div>
      )}
      {flipped&&(
        <div style={{position:'relative',borderRadius:16,overflow:'hidden',border:`2px solid ${C.goldDeep}`,background:`linear-gradient(160deg,${C.bgCard} 0%,${C.bgCard2} 100%)`,boxShadow:`0 6px 24px rgba(10,37,64,0.16)`}}>
          {imgOk&&<img src={image} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:0.07,filter:'blur(4px)',pointerEvents:'none'}}/>}
          <div style={{position:'absolute',inset:0,background:`linear-gradient(160deg,rgba(250,243,224,0.97) 0%,rgba(240,230,205,0.96) 100%)`,backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(10,37,64,0.04) 28px)`}}/>
          <div style={{position:'absolute',top:8,left:8,width:13,height:13,borderTop:`2px solid ${C.gold}`,borderLeft:`2px solid ${C.gold}`}}/>
          <div style={{position:'absolute',bottom:8,right:8,width:13,height:13,borderBottom:`2px solid ${C.gold}`,borderRight:`2px solid ${C.gold}`}}/>
          <div style={{position:'relative',zIndex:1,padding:'16px 20px 14px',borderBottom:`2px solid rgba(10,37,64,0.12)`,display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(10,37,64,0.04)'}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,color:C.navy,letterSpacing:2.5,textTransform:'uppercase'}}>{title}</div>
            <button onClick={()=>setFlipped(false)} style={{background:`linear-gradient(135deg,${C.navyMid},${C.navy})`,border:'none',borderRadius:8,cursor:'pointer',padding:'9px 18px',fontFamily:"'Cinzel',serif",fontSize:12,color:C.goldPale,letterSpacing:2,textTransform:'uppercase',boxShadow:'0 2px 8px rgba(10,37,64,0.22)'}}>← Назад</button>
          </div>
          <div style={{position:'relative',zIndex:1,padding:'20px 20px 24px'}} onClick={e=>e.stopPropagation()}>{children}</div>
        </div>
      )}
    </div>
  );
}

// ─── ПРОГРЕСС-КОЛЬЦО ───
function Ring({ done, total }) {
  const r=24,c=2*Math.PI*r,pct=total>0?done/total:0;
  return (
    <svg width={64} height={64} viewBox="0 0 64 64">
      <circle cx={32} cy={32} r={r} fill="none" stroke="rgba(184,107,93,0.15)" strokeWidth={5}/>
      <circle cx={32} cy={32} r={r} fill="none" stroke="rgba(184,107,93,0.75)" strokeWidth={5}
        strokeDasharray={c} strokeDashoffset={c*(1-pct)} strokeLinecap="round" transform="rotate(-90 32 32)"
        style={{transition:'stroke-dashoffset 0.5s ease'}}/>
      <text x={32} y={37} textAnchor="middle" fontSize={12} fill="rgba(184,107,93,0.9)" fontFamily="'JetBrains Mono',monospace" fontWeight="600">{done}/{total}</text>
    </svg>
  );
}

// ─── ФОРМА НАСТРОЙКИ ───
function ProcForm({ item, value, onChange }) {
  const isSliding=item.freq?.startsWith('every:')&&parseInt(item.freq.split(':')[1])>0;
  const isWeekly=item.freq?.startsWith('weekly:');
  const days=[['1','Пн'],['2','Вт'],['3','Ср'],['4','Чт'],['5','Пт'],['6','Сб'],['0','Вс']];
  return (
    <div style={{padding:'14px 16px',background:'rgba(184,107,93,0.06)',borderRadius:10,marginTop:10,border:'1px solid rgba(184,107,93,0.18)'}}>
      <div style={{display:'flex',gap:14,flexWrap:'wrap',marginBottom:10}}>
        <div>
          <div style={{fontSize:11,color:C.text3,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1.5,marginBottom:5,textTransform:'uppercase'}}>Время</div>
          <input type="time" value={value.time||item.time||''} onChange={e=>onChange({...value,time:e.target.value})}
            style={{padding:'9px 12px',border:`1.5px solid rgba(184,107,93,0.30)`,borderRadius:8,fontFamily:"'JetBrains Mono',monospace",fontSize:15,outline:'none',background:'rgba(255,255,255,0.8)',color:C.text1,width:115}}/>
        </div>
        <div>
          <div style={{fontSize:11,color:C.text3,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1.5,marginBottom:5,textTransform:'uppercase'}}>Мин</div>
          <input type="number" value={value.duration||item.dur||''} onChange={e=>onChange({...value,duration:e.target.value})}
            style={{padding:'9px 12px',border:`1.5px solid rgba(184,107,93,0.30)`,borderRadius:8,fontFamily:"'JetBrains Mono',monospace",fontSize:15,outline:'none',background:'rgba(255,255,255,0.8)',color:C.text1,width:90}}/>
        </div>
      </div>
      {isWeekly&&(
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:C.text3,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1.5,marginBottom:6,textTransform:'uppercase'}}>День недели</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {days.map(([v,l])=>(
              <div key={v} onClick={()=>onChange({...value,weekDay:v})}
                style={{padding:'7px 13px',borderRadius:18,fontSize:14,cursor:'pointer',
                  border:`1.5px solid ${value.weekDay===v?'rgba(184,107,93,0.7)':'rgba(10,37,64,0.15)'}`,
                  background:value.weekDay===v?'rgba(184,107,93,0.15)':'transparent',
                  color:value.weekDay===v?C.rose:C.text2,fontFamily:"'Crimson Pro',serif"}}>
                {l}
              </div>
            ))}
          </div>
        </div>
      )}
      {isSliding&&(
        <div>
          <div style={{fontSize:11,color:C.text3,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1.5,marginBottom:5,textTransform:'uppercase'}}>Дата начала</div>
          <input type="date" value={value.startDate||localDateStr(new Date())} onChange={e=>onChange({...value,startDate:e.target.value})}
            style={{padding:'9px 12px',border:`1.5px solid rgba(184,107,93,0.30)`,borderRadius:8,fontFamily:"'JetBrains Mono',monospace",fontSize:15,outline:'none',background:'rgba(255,255,255,0.8)',color:C.text1}}/>
        </div>
      )}
    </div>
  );
}

export function BeautySection() {
  const { profile={}, tasks=[], setTasks=()=>{}, beautyProcs={}, setBeautyProcs=()=>{}, beautyTopics=[], setBeautyTopics=()=>{}, notify } = useApp();
  const beautyTasks=tasks.filter(t=>t.section==='beauty');
  const today=localDateStr(new Date());
  const due=beautyTasks.filter(t=>isDue(t,today));
  const doneToday=beautyTasks.filter(t=>t.doneDate===today).length;
  const isMale=profile.gender==='Мужской';

  const [openCats,setOpenCats]=useState({});
  const [settingsOpen,setSettingsOpen]=useState({});
  const [pendingSettings,setPendingSettings]=useState({});
  const [customForm,setCustomForm]=useState(null);
  const [editingId,setEditingId]=useState(null);
  const [aiRec,setAiRec]=useState(()=>{ try{return JSON.parse(localStorage.getItem('ld_beauty_ai_rec')||'null')}catch{return null} });
  const [aiLoading,setAiLoading]=useState(false);
  const [aiSaved,setAiSaved]=useState(()=>{ try{return JSON.parse(localStorage.getItem('ld_beauty_ai_saved')||'[]')}catch{return []} });
  const [openAiSections,setOpenAiSections]=useState({});

  const TOPICS = isMale ? [
    { cat:'Лицо', items:[
      {id:'face_morning',name:'Умывание утром',freq:'daily',time:'07:00',icon:'💧',dur:10},
      {id:'face_evening',name:'Умывание вечером',freq:'daily',time:'21:00',icon:'🌙',dur:10},
      {id:'face_scrub',name:'Скраб для лица',freq:'every:7',time:'19:00',icon:'🫧',dur:10},
      {id:'face_mask',name:'Маска для лица',freq:'every:7',time:'20:00',icon:'🎭',dur:20},
    ]},
    {cat:'Тело',items:[
      {id:'body_cream',name:'Крем для тела',freq:'daily',time:'20:00',icon:'🧴',dur:5},
      {id:'body_scrub',name:'Скраб для тела',freq:'every:7',time:'20:00',icon:'🫧',dur:15},
    ]},
    {cat:'Борода и волосы',items:[
      {id:'beard_care',name:'Уход за бородой',freq:'every:2',time:'08:00',icon:'🧔',dur:10},
      {id:'hair_wash',name:'Мытьё волос',freq:'every:2',time:'20:00',icon:'🚿',dur:20},
      {id:'haircut',name:'Стрижка / барбер',freq:'every:30',time:'',icon:'✂️',dur:60},
    ]},
    {cat:'Руки и ногти',items:[
      {id:'hand_cream',name:'Крем для рук',freq:'daily',time:'21:00',icon:'🤲',dur:3},
      {id:'nails_m',name:'Стрижка ногтей',freq:'every:10',time:'',icon:'💅',dur:10},
    ]},
  ] : [
    {cat:'Уход за лицом',items:[
      {id:'face_morning',name:'Утренний уход',freq:'daily',time:'07:00',icon:'☀️',dur:10,note:'Очищение → тоник → крем'},
      {id:'face_evening',name:'Вечерний уход',freq:'daily',time:'21:00',icon:'🌙',dur:15,note:'Снятие макияжа → очищение → сыворотка → крем'},
      {id:'face_mask',name:'Маска для лица',freq:'every:3',time:'20:00',icon:'🎭',dur:20},
      {id:'face_scrub',name:'Скраб / пилинг',freq:'every:7',time:'20:00',icon:'🫧',dur:10},
      {id:'eye_care',name:'Крем для глаз',freq:'daily',time:'21:00',icon:'👁',dur:3},
    ]},
    {cat:'Уход за телом',items:[
      {id:'body_cream',name:'Крем для тела',freq:'daily',time:'20:00',icon:'🧴',dur:5},
      {id:'body_scrub',name:'Скраб для тела',freq:'every:4',time:'20:00',icon:'🫧',dur:15},
      {id:'depo',name:'Депиляция',freq:'every:14',time:'',icon:'✨',dur:30},
      {id:'tan',name:'Автозагар',freq:'every:7',time:'',icon:'🌅',dur:10},
    ]},
    {cat:'Уход за волосами',items:[
      {id:'hair_wash',name:'Мытьё волос',freq:'every:2',time:'20:00',icon:'🚿',dur:20},
      {id:'hair_mask',name:'Маска для волос',freq:'every:7',time:'20:00',icon:'💆',dur:40},
      {id:'hair_oil',name:'Масло для волос',freq:'every:7',time:'',icon:'🫙',dur:10},
      {id:'haircut',name:'Стрижка',freq:'every:30',time:'',icon:'✂️',dur:60},
      {id:'coloring',name:'Окрашивание',freq:'every:42',time:'',icon:'🎨',dur:120},
    ]},
    {cat:'Маникюр и ногти',items:[
      {id:'nails',name:'Маникюр',freq:'every:21',time:'',icon:'💅',dur:60},
      {id:'ped',name:'Педикюр',freq:'every:30',time:'',icon:'🦶',dur:60},
      {id:'nail_care',name:'Уход за кутикулой',freq:'every:3',time:'21:00',icon:'🤲',dur:5},
    ]},
    {cat:'Брови и ресницы',items:[
      {id:'brows',name:'Коррекция бровей',freq:'every:14',time:'',icon:'🪞',dur:20},
      {id:'lash',name:'Наращивание ресниц',freq:'every:21',time:'',icon:'✨',dur:90},
    ]},
    {cat:'Массаж и релакс',items:[
      {id:'massage',name:'Массаж лица',freq:'every:3',time:'21:00',icon:'💆',dur:15},
      {id:'lymph',name:'Лимфодренажный массаж',freq:'every:7',time:'',icon:'🫀',dur:30},
      {id:'bath',name:'Ванна с солью / пеной',freq:'every:7',time:'21:00',icon:'🛁',dur:30},
    ]},
  ];

  const allItems=TOPICS.flatMap(t=>t.items);

  const confirmProc=(item)=>{
    const s=pendingSettings[item.id]||{};
    const time=s.time||item.time||''; const duration=s.duration||item.dur||10;
    const startDate=s.startDate||today; const weekDay=s.weekDay||'';
    const freq=weekDay&&item.freq.startsWith('weekly:')?`weekly:${weekDay}`:item.freq;
    setTasks(p=>{
      const w=p.filter(t=>!(t.section==='beauty'&&t.beautyId===item.id));
      return [...w,{id:Date.now()+Math.random(),beautyId:item.id,title:item.name,section:'beauty',freq,priority:'m',preferredTime:time,beautyDuration:parseInt(duration),beautyStartDate:startDate,notes:item.note||'',lastDone:'',doneDate:''}];
    });
    setBeautyProcs(p=>({...p,[item.id]:{time,duration,startDate,weekDay,confirmed:true}}));
    setBeautyTopics(p=>p.includes(item.id)?p:[...p,item.id]);
    setSettingsOpen(p=>({...p,[item.id]:false}));
    notify?.(`✅ ${item.name} добавлена`);
  };

  const removeProc=(beautyId)=>{
    setTasks(p=>p.filter(t=>!(t.section==='beauty'&&t.beautyId===beautyId)));
    setBeautyProcs(p=>{const n={...p};delete n[beautyId];return n;});
    setBeautyTopics(p=>p.filter(id=>id!==beautyId));
  };

  const confirmCustom=()=>{
    if (!customForm?.name) return;
    const id=`custom_${Date.now()}`;
    setTasks(p=>[...p,{id:Date.now()+Math.random(),beautyId:id,title:customForm.name,section:'beauty',freq:customForm.freq||'daily',priority:'m',preferredTime:customForm.time||'',beautyDuration:parseInt(customForm.dur||10),beautyStartDate:today,notes:'',lastDone:'',doneDate:''}]);
    setBeautyProcs(p=>({...p,[id]:{time:customForm.time,duration:customForm.dur,confirmed:true}}));
    setBeautyTopics(p=>p.includes(id)?p:[...p,id]);
    setCustomForm(null);
    notify?.('✅ Процедура добавлена');
  };

  const updateField=(taskId,beautyId,field,val)=>{
    setTasks(p=>p.map(t=>t.id===taskId?{...t,[field]:val}:t));
    if(beautyId&&field==='preferredTime') setBeautyProcs(p=>({...p,[beautyId]:{...(p[beautyId]||{}),time:val}}));
    if(beautyId&&field==='beautyDuration') setBeautyProcs(p=>({...p,[beautyId]:{...(p[beautyId]||{}),duration:val}}));
  };

  const updateFreqKind=(taskId,kind)=>{
    const val = kind==='daily'?'daily'
      : kind==='workdays'?'workdays'
      : kind==='every'?'every:7'
      : kind==='weekly'?'weekly:1'
      : kind==='monthly'?'monthly:1'
      : 'daily';
    setTasks(p=>p.map(t=>t.id===taskId?{...t,freq:val}:t));
  };

  const toggleWeeklyDay=(taskId,currentFreq,day)=>{
    const days = currentFreq.startsWith('weekly:') ? currentFreq.split(':')[1].split(',').filter(Boolean) : [];
    const has = days.includes(day);
    const next = has ? days.filter(d=>d!==day) : [...days,day];
    if (next.length===0) return; // хотя бы один день должен остаться
    setTasks(p=>p.map(t=>t.id===taskId?{...t,freq:`weekly:${next.join(',')}`}:t));
  };

  const toggleDone=(id)=>setTasks(p=>p.map(t=>t.id===id?{...t,doneDate:t.doneDate===today?null:today,lastDone:t.doneDate===today?t.lastDone:today}:t));

  const grouped=useMemo(()=>{
    const g={утро:[],день:[],вечер:[]};
    beautyTasks.forEach(t=>g[timeSlot(t.preferredTime)].push(t));
    Object.keys(g).forEach(k=>g[k].sort((a,b)=>(a.preferredTime||'').localeCompare(b.preferredTime||'')));
    return g;
  },[beautyTasks]);

  const fetchAiRec=async()=>{
    setAiLoading(true);
    try {
      const procs=beautyTasks.map(t=>t.title).join(', ')||'не выбраны';
      const season=['зима','зима','весна','весна','весна','лето','лето','лето','осень','осень','осень','зима'][new Date().getMonth()];
      const prompt=`Составь персональные рекомендации по уходу.\nПрофиль: ${profile.name||'—'}, ${profile.gender||'—'}, ${profile.age||'—'} лет.\nТип кожи: ${profile.skinType||'—'}. Тип волос: ${profile.hairType||'—'}.\nТКМ: температура ${profile.tcmTemp||'—'}, влажность ${profile.tcmMoisture||'—'}.\nПроцедуры: ${procs}. Сезон: ${season}.\n\nОтветь ТОЛЬКО JSON (без markdown):\n{"sections":[{"title":"💧 Базовый уход","items":["конкретный совет 1","совет 2","совет 3"]},{"title":"✨ Усиление эффекта","items":["..."]},{"title":"🌿 ТКМ и сезон","items":["..."]},{"title":"⚠️ Чего избегать","items":["..."]},{"title":"🎯 Приоритеты месяца","items":["..."]}],"summary":"2-3 предложения персонального вывода"}`;
      const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system:'Ты косметолог-эксперт. Отвечай ТОЛЬКО валидным JSON.',user:prompt,maxTokens:1200})});
      const d=await r.json();
      const parsed=JSON.parse(d.text.replace(/```json|```/g,'').trim());
      setAiRec(parsed);
      try{localStorage.setItem('ld_beauty_ai_rec',JSON.stringify(parsed))}catch{}
      notify?.('✅ Рекомендации готовы');
    } catch { notify?.('❌ Ошибка ИИ'); }
    finally { setAiLoading(false); }
  };

  const saveAiSection=(title)=>{
    const next=aiSaved.includes(title)?aiSaved.filter(t=>t!==title):[...aiSaved,title];
    setAiSaved(next);
    try{localStorage.setItem('ld_beauty_ai_saved',JSON.stringify(next))}catch{}
  };

  const skinTips={'Сухая':'Увлажнение — приоритет. Избегай спиртосодержащих средств.','Жирная':'Лёгкие некомедогенные текстуры. Кислотное очищение 2×/нед.','Комбинированная':'Раздельный уход для Т-зоны и щёк.','Чувствительная':'Минимализм в составах. Без отдушек и агрессивных кислот.','Нормальная':'Поддерживающий уход. Профилактика — лучшее лечение.'};

  // ── КАТАЛОГ ──
  const CatalogContent = () => (
    <div>
      {TOPICS.map((cat,catIdx)=>{
        const cc=CAT_COLORS[cat.cat]||{bg:'rgba(10,37,64,0.08)',accent:C.navyMid,emoji:'✨'};
        const isCatOpen=openCats[cat.cat];
        const confirmed=cat.items.filter(i=>beautyProcs[i.id]?.confirmed).length;
        return (
          <div key={cat.cat} style={{marginBottom:10}}>
            {/* Заголовок категории */}
            <div onClick={()=>setOpenCats(p=>({...p,[cat.cat]:!p[cat.cat]}))}
              style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',
                background:isCatOpen?cc.bg:`rgba(10,37,64,0.04)`,
                borderRadius:isCatOpen?'12px 12px 0 0':12,cursor:'pointer',
                border:`1.5px solid ${isCatOpen?cc.accent+'55':'rgba(10,37,64,0.10)'}`,
                borderLeft:`4px solid ${cc.accent}`,
                transition:'all 0.2s'}}>
              <span style={{fontSize:22}}>{cc.emoji}</span>
              <span style={{flex:1,fontSize:18,color:cc.accent,fontFamily:"'Cinzel',serif",fontWeight:700,letterSpacing:1}}>{cat.cat}</span>
              {confirmed>0&&<span style={{fontSize:12,color:C.success,fontFamily:"'JetBrains Mono',monospace",background:'rgba(26,77,46,0.12)',padding:'3px 10px',borderRadius:12,fontWeight:600}}>✓ {confirmed}</span>}
              <span style={{fontSize:16,color:cc.accent,transform:isCatOpen?'rotate(180deg)':'rotate(0)',transition:'0.25s',display:'inline-block'}}>▼</span>
            </div>

            {isCatOpen&&(
              <div style={{border:`1.5px solid ${cc.accent}33`,borderTop:'none',borderRadius:'0 0 12px 12px',padding:'8px 14px 14px',background:`linear-gradient(160deg,${C.bgCard} 0%,rgba(255,255,255,0.8) 100%)`}}>
                {cat.items.map(item=>{
                  const conf=!!beautyProcs[item.id]?.confirmed;
                  const isOpen=settingsOpen[item.id];
                  return (
                    <div key={item.id} style={{padding:'12px 0',borderBottom:`1px solid rgba(10,37,64,0.06)`}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{fontSize:22,flexShrink:0}}>{item.icon}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:17,color:conf?C.success:C.text1,fontFamily:"'Crimson Pro',serif",fontWeight:conf?700:500,lineHeight:1.3}}>{item.name}</div>
                          <div style={{fontSize:13,color:C.text3,fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>{freqLabel(item.freq)} · {item.dur} мин</div>
                        </div>
                        {conf?(
                          <button onClick={()=>removeProc(item.id)}
                            style={{padding:'7px 14px',borderRadius:8,border:'1px solid rgba(107,16,16,0.25)',background:'rgba(107,16,16,0.06)',color:C.error,cursor:'pointer',fontSize:14,fontFamily:"'Crimson Pro',serif"}}>
                            Убрать
                          </button>
                        ):(
                          <button onClick={()=>setSettingsOpen(p=>({...p,[item.id]:!p[item.id]}))}
                            style={{padding:'7px 16px',borderRadius:8,border:`1.5px solid ${cc.accent}66`,background:isOpen?cc.bg:'transparent',color:cc.accent,cursor:'pointer',fontSize:14,fontFamily:"'Crimson Pro',serif",fontWeight:600}}>
                            {isOpen?'Скрыть':'+ Добавить'}
                          </button>
                        )}
                      </div>
                      {isOpen&&!conf&&(
                        <>
                          <ProcForm item={item} value={pendingSettings[item.id]||{}} onChange={v=>setPendingSettings(p=>({...p,[item.id]:v}))}/>
                          <button onClick={()=>confirmProc(item)}
                            style={{marginTop:12,padding:'10px 24px',borderRadius:10,border:'none',background:`linear-gradient(135deg,${cc.accent},${cc.accent}CC)`,color:'#fff',cursor:'pointer',fontSize:16,fontFamily:"'Crimson Pro',serif",fontWeight:600}}>
                            ✓ Подтвердить
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Своя процедура */}
                {customForm?.catIdx===catIdx?(
                  <div style={{padding:'14px 0',borderTop:'1px solid rgba(10,37,64,0.08)',marginTop:8}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.navyMid,letterSpacing:2,textTransform:'uppercase',marginBottom:12}}>Своя процедура</div>
                    <div style={{display:'flex',flexDirection:'column',gap:10}}>
                      <input value={customForm.name} onChange={e=>setCustomForm(p=>({...p,name:e.target.value}))} placeholder="Название процедуры"
                        style={{padding:'12px 14px',border:`1.5px solid rgba(184,107,93,0.30)`,borderRadius:10,fontFamily:"'Crimson Pro',serif",fontSize:17,outline:'none',background:'rgba(255,255,255,0.85)',color:C.text1}}/>
                      <div style={{display:'flex',gap:10}}>
                        <input type="time" value={customForm.time} onChange={e=>setCustomForm(p=>({...p,time:e.target.value}))}
                          style={{flex:1,padding:'12px 14px',border:`1.5px solid rgba(184,107,93,0.30)`,borderRadius:10,fontFamily:"'JetBrains Mono',monospace",fontSize:15,outline:'none',background:'rgba(255,255,255,0.85)',color:C.text1}}/>
                        <input type="number" value={customForm.dur} onChange={e=>setCustomForm(p=>({...p,dur:e.target.value}))} placeholder="мин"
                          style={{width:90,padding:'12px 14px',border:`1.5px solid rgba(184,107,93,0.30)`,borderRadius:10,fontFamily:"'JetBrains Mono',monospace",fontSize:15,outline:'none',background:'rgba(255,255,255,0.85)',color:C.text1}}/>
                      </div>
                      <div style={{display:'flex',gap:10}}>
                        <button onClick={confirmCustom} style={{flex:2,padding:'12px 0',borderRadius:10,border:'none',background:'rgba(184,107,93,0.85)',color:'#fff',cursor:'pointer',fontSize:16,fontFamily:"'Crimson Pro',serif",fontWeight:600}}>✓ Добавить</button>
                        <button onClick={()=>setCustomForm(null)} style={{flex:1,padding:'12px 0',borderRadius:10,border:'1px solid rgba(10,37,64,0.15)',background:'transparent',color:C.text3,cursor:'pointer',fontSize:15}}>Отмена</button>
                      </div>
                    </div>
                  </div>
                ):(
                  <button onClick={()=>setCustomForm({catIdx,name:'',freq:'daily',time:'',dur:10})}
                    style={{width:'100%',marginTop:12,padding:'11px 0',border:`1.5px dashed ${cc.accent}55`,borderRadius:10,background:'transparent',fontFamily:"'Cinzel',serif",fontSize:12,letterSpacing:2,color:`${cc.accent}99`,cursor:'pointer',textTransform:'uppercase'}}>
                    + Своя процедура
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── МОИ РИТУАЛЫ ──
  const SLOTS=[['утро','🌅 Утро'],['день','☀️ День'],['вечер','🌙 Вечер']];
  const RitualsContent = () => (
    <div>
      {/* Прогресс */}
      <div style={{display:'flex',gap:14,alignItems:'center',marginBottom:18,padding:'14px 16px',borderRadius:12,background:'rgba(184,107,93,0.06)',border:'1.5px solid rgba(184,107,93,0.18)'}}>
        <Ring done={doneToday} total={due.length+doneToday}/>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:18,color:C.navy,fontWeight:700,letterSpacing:1,marginBottom:4}}>Сегодня</div>
          <div style={{fontFamily:"'Crimson Pro',serif",fontSize:16,color:C.text2,lineHeight:1.5}}>
            {doneToday===0&&due.length===0?'Нет процедур на сегодня':doneToday===due.length+doneToday?'Все процедуры выполнены ✓':`Выполнено ${doneToday} из ${due.length+doneToday}`}
          </div>
        </div>
      </div>

      {beautyTasks.length===0&&(
        <div style={{textAlign:'center',padding:'28px 0',fontFamily:"'Cormorant Infant',serif",fontSize:18,fontStyle:'italic',color:C.text3}}>
          Откройте каталог и выберите процедуры
        </div>
      )}

      {SLOTS.map(([slot,label])=>{
        const items=grouped[slot];
        if (!items?.length) return null;
        return (
          <div key={slot} style={{marginBottom:20}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:15,color:C.navyMid,letterSpacing:2,marginBottom:12,paddingBottom:8,borderBottom:`2px solid rgba(10,37,64,0.12)`,textTransform:'uppercase'}}>{label}</div>
            {items.map(task=>{
              const def=allItems.find(i=>i.id===task.beautyId);
              const cc=CAT_COLORS[TOPICS.find(c=>c.items.some(i=>i.id===task.beautyId))?.cat||'']||{accent:'rgba(184,107,93,1)'};
              const done=task.doneDate===today;
              const dueToday=isDue(task,today);
              return (
                <div key={task.id} style={{padding:'14px 16px',marginBottom:10,borderRadius:12,
                  background:done?'rgba(26,77,46,0.08)':'rgba(255,255,255,0.55)',
                  border:`1.5px solid ${done?'rgba(26,77,46,0.25)':'rgba(10,37,64,0.10)'}`,
                  borderLeft:`4px solid ${done?C.success:cc.accent}`,
                  opacity:done?0.75:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                    <div onClick={()=>toggleDone(task.id)}
                      style={{width:26,height:26,borderRadius:'50%',border:`2px solid ${done?C.success:'rgba(184,107,93,0.45)'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',background:done?'rgba(26,77,46,0.15)':'transparent',flexShrink:0,transition:'all 0.2s'}}>
                      {done&&<span style={{fontSize:14,color:C.success,fontWeight:700}}>✓</span>}
                    </div>
                    <span style={{fontSize:22,flexShrink:0}}>{def?.icon||'✨'}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:17,color:done?C.text3:C.text1,fontFamily:"'Crimson Pro',serif",fontWeight:600,textDecoration:done?'line-through':'none',lineHeight:1.3}}>{task.title}</div>
                      <div style={{fontSize:13,color:C.text3,fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>
                        {freqLabel(task.freq)}{!dueToday&&<span style={{marginLeft:6,color:'rgba(184,107,93,0.45)'}}>· не сегодня</span>}
                      </div>
                    </div>
                    <button onClick={()=>removeProc(task.beautyId)} style={{background:'none',border:'none',color:C.text3,fontSize:18,cursor:'pointer',padding:'0 4px',opacity:0.5}}>✕</button>
                  </div>
                  <div style={{display:'flex',gap:12,paddingTop:10,borderTop:'1px solid rgba(10,37,64,0.07)',flexWrap:'wrap',alignItems:'flex-end'}}>
                    <div>
                      <div style={{fontSize:10,color:C.text3,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1.5,textTransform:'uppercase',marginBottom:4}}>Время</div>
                      <input type="time" value={task.preferredTime||''} onChange={e=>updateField(task.id,task.beautyId,'preferredTime',e.target.value)}
                        style={{padding:'7px 10px',border:'1.5px solid rgba(184,107,93,0.25)',borderRadius:8,fontFamily:"'JetBrains Mono',monospace",fontSize:14,outline:'none',background:'rgba(255,255,255,0.75)',color:C.text1,width:108}}/>
                    </div>
                    <div>
                      <div style={{fontSize:10,color:C.text3,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1.5,textTransform:'uppercase',marginBottom:4}}>Мин</div>
                      <input type="number" value={task.beautyDuration||''} onChange={e=>updateField(task.id,task.beautyId,'beautyDuration',parseInt(e.target.value))}
                        style={{padding:'7px 10px',border:'1.5px solid rgba(184,107,93,0.25)',borderRadius:8,fontFamily:"'JetBrains Mono',monospace",fontSize:14,outline:'none',background:'rgba(255,255,255,0.75)',color:C.text1,width:80}}/>
                    </div>
                    <button onClick={()=>setEditingId(editingId===task.id?null:task.id)}
                      style={{padding:'8px 12px',borderRadius:8,cursor:'pointer',
                        border:`1.5px solid ${editingId===task.id?cc.accent:'rgba(184,107,93,0.25)'}`,
                        background:editingId===task.id?cc.accent:'rgba(255,255,255,0.75)',
                        color:editingId===task.id?'#fff':C.text1,
                        fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:600}}>
                      🔁 Периодичность {editingId===task.id?'▲':'▼'}
                    </button>
                    {!done&&(
                      <button onClick={()=>openGoogleCalendar(task.title,nextOccurrenceDate(task,today),task.preferredTime,task.notes||'')}
                        style={{padding:'8px 12px',borderRadius:8,cursor:'pointer',
                          border:'1px solid rgba(66,133,244,0.35)',background:'rgba(66,133,244,0.10)',
                          color:'#3367D6',fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:600}}>
                        📆 Google Calendar
                      </button>
                    )}
                  </div>

                  {editingId===task.id&&(
                    <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid rgba(10,37,64,0.07)',
                      display:'flex',flexDirection:'column',gap:10}}>

                      <div>
                        <div style={{fontSize:10,color:C.text3,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1.5,textTransform:'uppercase',marginBottom:6}}>Как часто</div>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                          {[['daily','ежедневно'],['workdays','по будням'],['weekly','по дням недели'],['every','раз в N дней'],['monthly','числа месяца']].map(([kind,label])=>{
                            const active = kind==='daily'?task.freq==='daily'
                              : kind==='workdays'?task.freq==='workdays'
                              : kind==='weekly'?task.freq?.startsWith('weekly:')
                              : kind==='every'?task.freq?.startsWith('every:')
                              : kind==='monthly'?task.freq?.startsWith('monthly:')
                              : false;
                            return (
                              <button key={kind} onClick={()=>updateFreqKind(task.id,kind)}
                                style={{padding:'6px 11px',borderRadius:14,cursor:'pointer',
                                  border:`1px solid ${active?cc.accent:'rgba(184,107,93,0.25)'}`,
                                  background:active?cc.accent:'transparent',
                                  color:active?'#fff':C.text2,
                                  fontFamily:"'JetBrains Mono',monospace",fontSize:11.5}}>
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {task.freq?.startsWith('weekly:')&&(
                        <div>
                          <div style={{fontSize:10,color:C.text3,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1.5,textTransform:'uppercase',marginBottom:6}}>В какие дни</div>
                          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                            {WEEKDAYS.map(([val,label])=>{
                              const days=task.freq.split(':')[1].split(',');
                              const active=days.includes(val);
                              return (
                                <button key={val} onClick={()=>toggleWeeklyDay(task.id,task.freq,val)}
                                  style={{width:38,height:34,borderRadius:8,cursor:'pointer',
                                    border:`1px solid ${active?cc.accent:'rgba(184,107,93,0.25)'}`,
                                    background:active?cc.accent:'transparent',
                                    color:active?'#fff':C.text2,
                                    fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {task.freq?.startsWith('every:')&&(
                        <div>
                          <div style={{fontSize:10,color:C.text3,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1.5,textTransform:'uppercase',marginBottom:6}}>Каждые сколько дней</div>
                          <input type="number" min="1" value={task.freq.split(':')[1]}
                            onChange={e=>{const n=Math.max(1,parseInt(e.target.value)||1); setTasks(p=>p.map(t=>t.id===task.id?{...t,freq:`every:${n}`}:t));}}
                            style={{padding:'7px 10px',border:'1.5px solid rgba(184,107,93,0.25)',borderRadius:8,fontFamily:"'JetBrains Mono',monospace",fontSize:14,outline:'none',background:'rgba(255,255,255,0.75)',color:C.text1,width:80}}/>
                        </div>
                      )}

                      {task.freq?.startsWith('monthly:')&&(
                        <div>
                          <div style={{fontSize:10,color:C.text3,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1.5,textTransform:'uppercase',marginBottom:6}}>Числа месяца</div>
                          <input type="number" min="1" max="31" value={task.freq.split(':')[1]}
                            onChange={e=>{const n=Math.min(31,Math.max(1,parseInt(e.target.value)||1)); setTasks(p=>p.map(t=>t.id===task.id?{...t,freq:`monthly:${n}`}:t));}}
                            style={{padding:'7px 10px',border:'1.5px solid rgba(184,107,93,0.25)',borderRadius:8,fontFamily:"'JetBrains Mono',monospace",fontSize:14,outline:'none',background:'rgba(255,255,255,0.75)',color:C.text1,width:80}}/>
                        </div>
                      )}

                      <div>
                        <div style={{fontSize:10,color:C.text3,fontFamily:"'JetBrains Mono',monospace",letterSpacing:1.5,textTransform:'uppercase',marginBottom:6}}>Дата начала отсчёта</div>
                        <input type="date" value={task.beautyStartDate||today}
                          onChange={e=>updateField(task.id,task.beautyId,'beautyStartDate',e.target.value)}
                          style={{padding:'7px 10px',border:'1.5px solid rgba(184,107,93,0.25)',borderRadius:8,fontFamily:"'JetBrains Mono',monospace",fontSize:14,outline:'none',background:'rgba(255,255,255,0.75)',color:C.text1}}/>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  // ── ИИ РЕКОМЕНДАЦИИ ──
  const AiContent = () => (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,gap:12}}>
        <div style={{fontFamily:"'Crimson Pro',serif",fontSize:16,color:C.text2,lineHeight:1.6,flex:1}}>
          Персональные рекомендации на основе профиля, типа кожи и ТКМ
        </div>
        <button onClick={fetchAiRec} disabled={aiLoading}
          style={{padding:'10px 18px',borderRadius:10,fontFamily:"'Cinzel',serif",fontSize:12,letterSpacing:1.5,fontWeight:700,textTransform:'uppercase',cursor:aiLoading?'not-allowed':'pointer',
            background:aiLoading?'rgba(10,37,64,0.08)':`linear-gradient(135deg,${C.navyMid},${C.navy})`,
            color:aiLoading?C.text3:C.goldPale,border:`1.5px solid ${aiLoading?C.lineS:C.navy}`,flexShrink:0}}>
          {aiLoading?'⏳..':aiRec?'🔄 Обновить':'✨ Получить'}
        </button>
      </div>

      {aiLoading&&<div style={{textAlign:'center',padding:'32px 0',fontFamily:"'Cormorant Infant',serif",fontSize:18,fontStyle:'italic',color:C.text3}}>Анализирую профиль и составляю план ухода...</div>}

      {aiRec&&!aiLoading&&(
        <div>
          {aiRec.summary&&(
            <div style={{padding:'14px 18px',borderRadius:12,background:'rgba(184,107,93,0.07)',border:'1px solid rgba(184,107,93,0.22)',borderLeft:'4px solid rgba(184,107,93,0.7)',marginBottom:16,fontFamily:"'Crimson Pro',serif",fontSize:17,color:C.text1,lineHeight:1.75}}>
              {aiRec.summary}
            </div>
          )}
          {(aiRec.sections||[]).map((sec,i)=>{
            const isOpen=openAiSections[i];
            const isSaved=aiSaved.includes(sec.title);
            return (
              <div key={i} style={{marginBottom:10,borderRadius:12,overflow:'hidden',border:'1.5px solid rgba(184,107,93,0.18)',background:'rgba(255,255,255,0.5)'}}>
                <div onClick={()=>setOpenAiSections(p=>({...p,[i]:!p[i]}))}
                  style={{padding:'14px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,background:isOpen?'rgba(184,107,93,0.08)':'transparent'}}>
                  <span style={{flex:1,fontFamily:"'Cinzel',serif",fontSize:16,color:C.navy,fontWeight:700,letterSpacing:1,textTransform:'uppercase'}}>{sec.title}</span>
                  <button onClick={e=>{e.stopPropagation();saveAiSection(sec.title);}}
                    style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:isSaved?C.gold:C.text3,padding:'0 4px'}}>
                    {isSaved?'📌':'🔖'}
                  </button>
                  <span style={{fontSize:14,color:'rgba(184,107,93,0.8)',transform:isOpen?'rotate(180deg)':'rotate(0)',transition:'0.25s',display:'inline-block'}}>▼</span>
                </div>
                {isOpen&&(
                  <div style={{padding:'4px 16px 16px'}}>
                    {(sec.items||[]).map((item,j)=>(
                      <div key={j} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:'1px solid rgba(184,107,93,0.08)'}}>
                        <span style={{color:'rgba(184,107,93,0.7)',fontWeight:700,flexShrink:0,marginTop:3,fontSize:18}}>·</span>
                        <span style={{fontFamily:"'Crimson Pro',serif",fontSize:17,color:C.text1,lineHeight:1.65}}>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {aiSaved.length>0&&(
            <div style={{marginTop:16,padding:'14px 16px',borderRadius:12,background:'rgba(212,175,55,0.08)',border:'1px solid rgba(212,175,55,0.28)',borderLeft:`4px solid ${C.gold}`}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.goldDeep,letterSpacing:2,textTransform:'uppercase',marginBottom:10}}>📌 Сохранённые разделы</div>
              {aiSaved.map((t,i)=><div key={i} style={{fontFamily:"'Crimson Pro',serif",fontSize:16,color:C.text2,padding:'5px 0',borderBottom:'1px solid rgba(212,175,55,0.12)'}}>· {t}</div>)}
            </div>
          )}
        </div>
      )}

      {!aiRec&&!aiLoading&&(
        <div style={{textAlign:'center',padding:'28px 0',fontFamily:"'Cormorant Infant',serif",fontSize:18,fontStyle:'italic',color:C.text3}}>
          ИИ составит персональный план ухода с учётом типа кожи, ТКМ и сезона
        </div>
      )}
    </div>
  );

  const skinInfo=profile.skinType?skinTips[profile.skinType]||'Регулярный уход — основа здоровья.':null;

  const BEAUTY_IMG = isMale
    ? 'https://commons.wikimedia.org/wiki/Special:FilePath/BarberShop.jpg?width=900'
    : '/beauty/beauty-catalog.jpg';
  const RITUALS_IMG = isMale
    ? 'https://commons.wikimedia.org/wiki/Special:FilePath/BarberShop.jpg?width=900'
    : '/beauty/beauty-rituals.jpg';

  return (
    <div style={{paddingBottom:80,padding:'0 16px 80px'}}>

      <FlipCard title="Каталог процедур" image={BEAUTY_IMG}
        badge={beautyTasks.length>0&&(
          <div style={{padding:'5px 12px',borderRadius:20,background:'rgba(26,77,46,0.85)',fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:'#fff',letterSpacing:1,fontWeight:600}}>
            ✓ {beautyTasks.length} процедур
          </div>
        )}>
        <CatalogContent/>
      </FlipCard>

      <FlipCard title="Мои ритуалы" image={RITUALS_IMG}
        badge={beautyTasks.length>0&&(
          <div style={{padding:'5px 12px',borderRadius:20,background:doneToday>0?'rgba(26,77,46,0.85)':'rgba(10,37,64,0.75)',fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:'#fff',letterSpacing:1,fontWeight:600}}>
            {doneToday}/{due.length+doneToday} сегодня
          </div>
        )}>
        <RitualsContent/>
      </FlipCard>

      <FlipCard title="Рекомендации ИИ" image="/beauty/beauty-ai.jpg">
        <AiContent/>
      </FlipCard>

    </div>
  );
    }
