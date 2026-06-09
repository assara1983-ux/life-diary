// src/sections/HomeSection.jsx
import { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';

const C = {
  navy:'#0A2540', navyMid:'#1E3A5F',
  gold:'#D4AF37', goldDeep:'#B8941E', goldPale:'#F0DC90',
  green:'#1A4D2E', teal:'#1D4E5F',
  bg:'#F5E8C7', bgCard:'#FAF3E0', bgCard2:'#F2E8CE',
  text1:'#0A2540', text2:'#1E3A5F', text3:'#4A6480',
  success:'#1A4D2E', error:'#6B1010', warn:'#C49B2A',
  line:'rgba(10,37,64,0.22)', lineS:'rgba(10,37,64,0.10)',
};

// Цвета карточек
const CARD_COLORS = {
  daily:  { accent:'#2D6A4F', bg:'rgba(45,106,79,0.10)',  emoji:'☀️' },
  weekly: { accent:'#1E3A5F', bg:'rgba(30,58,95,0.10)',   emoji:'📅' },
  deep:   { accent:'#6B1010', bg:'rgba(107,16,16,0.08)',  emoji:'🧹' },
  tools:  { accent:'#8B6914', bg:'rgba(139,105,20,0.10)', emoji:'🛠️' },
  plants: { accent:'#2D5A3D', bg:'rgba(45,90,61,0.09)',   emoji:'🌿' },
  ai:     { accent:'#1E3A5F', bg:'rgba(30,58,95,0.08)',   emoji:'✨' },
};

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function freqLabel(f) {
  if (!f||f==='once') return 'разово';
  if (f==='daily') return 'ежедневно';
  if (f==='workdays') return 'пн–пт';
  if (f.startsWith('weekly:')) { const m={0:'вс',1:'пн',2:'вт',3:'ср',4:'чт',5:'пт',6:'сб'}; return 'каждый '+m[f.split(':')[1]]; }
  if (f.startsWith('every:')) { const n=parseInt(f.split(':')[1]); if(n===7) return 'раз в неделю'; if(n===14) return 'раз в 2 нед.'; if(n===30) return 'раз в месяц'; if(n===90) return 'раз в квартал'; return `каждые ${n} дн.`; }
  return f;
}

function isDue(task, today) {
  if (!task.freq||task.doneDate===today) return false;
  const d=new Date(today); d.setHours(0,0,0,0);
  if (task.freq==='daily') return task.lastDone!==today;
  if (task.freq==='workdays') { const dn=d.getDay(); return dn>=1&&dn<=5&&task.lastDone!==today; }
  if (task.freq==='once') return !task.doneDate;
  if (task.freq.startsWith('every:')) {
    const n=parseInt(task.freq.split(':')[1]);
    if (!task.lastDone) return true;
    return Math.floor((d-new Date(task.lastDone))/86400000)>=n;
  }
  if (task.freq.startsWith('weekly:')) return new Date(today).getDay()===parseInt(task.freq.split(':')[1])&&task.lastDone!==today;
  return false;
}

// ─── FLIP CARD ───
function FlipCard({ title, image, badge, children, accentColor='#1E3A5F' }) {
  const [flipped,setFlipped]=useState(false);
  const [imgOk,setImgOk]=useState(true);
  return (
    <div style={{marginBottom:16}}>
      {!flipped&&(
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
        <div style={{position:'relative',borderRadius:16,overflow:'hidden',border:`2px solid ${accentColor}55`,background:`linear-gradient(160deg,${C.bgCard} 0%,${C.bgCard2} 100%)`,boxShadow:`0 6px 24px rgba(10,37,64,0.16)`}}>
          {imgOk&&<img src={image} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:0.07,filter:'blur(4px)',pointerEvents:'none'}}/>}
          <div style={{position:'absolute',inset:0,background:`linear-gradient(160deg,rgba(250,243,224,0.97) 0%,rgba(240,230,205,0.96) 100%)`,backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(10,37,64,0.04) 28px)`}}/>
          <div style={{position:'absolute',top:8,left:8,width:13,height:13,borderTop:`2px solid ${C.gold}`,borderLeft:`2px solid ${C.gold}`}}/>
          <div style={{position:'absolute',bottom:8,right:8,width:13,height:13,borderBottom:`2px solid ${C.gold}`,borderRight:`2px solid ${C.gold}`}}/>
          <div style={{position:'relative',zIndex:1,padding:'16px 20px 14px',borderBottom:`2px solid rgba(10,37,64,0.12)`,display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(10,37,64,0.04)'}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,color:accentColor,letterSpacing:2,textTransform:'uppercase'}}>{title}</div>
            <button onClick={()=>setFlipped(false)} style={{background:`linear-gradient(135deg,${C.navyMid},${C.navy})`,border:'none',borderRadius:8,cursor:'pointer',padding:'9px 18px',fontFamily:"'Cinzel',serif",fontSize:12,color:C.goldPale,letterSpacing:2,textTransform:'uppercase'}}>← Назад</button>
          </div>
          <div style={{position:'relative',zIndex:1,padding:'20px 20px 24px'}} onClick={e=>e.stopPropagation()}>{children}</div>
        </div>
      )}
    </div>
  );
}

// ─── ЗАДАЧА СТРОКА ───
function TaskRow({ task, today, onToggle, onDelete, onEdit }) {
  const done=task.doneDate===today;
  const due=isDue(task,today);
  return (
    <div style={{display:'flex',alignItems:'flex-start',gap:12,padding:'13px 0',borderBottom:'1px solid rgba(10,37,64,0.07)',opacity:done?0.6:1}}>
      <div onClick={onToggle} style={{width:24,height:24,borderRadius:6,flexShrink:0,marginTop:2,
        border:`2px solid ${done?C.success:'rgba(10,37,64,0.28)'}`,
        background:done?'rgba(26,77,46,0.15)':'rgba(255,255,255,0.7)',
        display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 0.15s'}}>
        {done&&<span style={{fontSize:14,color:C.success,fontWeight:700}}>✓</span>}
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:17,color:done?C.text3:C.text1,fontFamily:"'Crimson Pro',serif",fontWeight:500,textDecoration:done?'line-through':'none',lineHeight:1.3}}>{task.title}</div>
        <div style={{display:'flex',gap:8,marginTop:4,flexWrap:'wrap',alignItems:'center'}}>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:due?C.navyMid:C.text3,letterSpacing:0.5}}>{freqLabel(task.freq)}</span>
          {task.notes&&<span style={{fontFamily:"'Crimson Pro',serif",fontSize:13,color:C.text3,fontStyle:'italic'}}>{task.notes.slice(0,40)}</span>}
        </div>
      </div>
      <div style={{display:'flex',gap:6,flexShrink:0}}>
        <button onClick={onEdit} style={{background:'none',border:'none',fontSize:16,cursor:'pointer',color:C.text3,padding:'2px 4px'}}>✏️</button>
        <button onClick={onDelete} style={{background:'none',border:'none',fontSize:16,cursor:'pointer',color:C.error,padding:'2px 4px',opacity:0.6}}>✕</button>
      </div>
    </div>
  );
}

// ─── ПРОСТАЯ МОДАЛКА ЗАДАЧИ ───
function SimpleTaskModal({ task, defaultFreq='daily', onSave, onClose }) {
  const [form,setForm]=useState({
    title: task?.title||'', freq: task?.freq||defaultFreq,
    priority: task?.priority||'m', preferredTime: task?.preferredTime||'',
    notes: task?.notes||'',
  });
  const FREQS=[['daily','Ежедневно'],['every:2','Каждые 2 дня'],['every:7','Раз в неделю'],['every:14','Раз в 2 нед.'],['every:30','Раз в месяц'],['every:90','Раз в квартал'],['once','Разово']];
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(10,25,45,0.65)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(4px)'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.bgCard,borderRadius:14,padding:26,width:'100%',maxWidth:460,border:`2px solid ${C.navyMid}`,boxShadow:`0 20px 60px rgba(10,37,64,0.28)`,position:'relative',backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(10,37,64,0.04) 28px)`}}>
        <div style={{position:'absolute',top:8,left:8,width:12,height:12,borderTop:`2px solid ${C.gold}`,borderLeft:`2px solid ${C.gold}`}}/>
        <div style={{position:'absolute',bottom:8,right:8,width:12,height:12,borderBottom:`2px solid ${C.gold}`,borderRight:`2px solid ${C.gold}`}}/>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,color:C.navy,letterSpacing:2,textTransform:'uppercase',marginBottom:20,paddingBottom:12,borderBottom:`1.5px solid ${C.line}`}}>
          {task?.id?'Изменить задачу':'Новая задача'}
        </div>
        {[['Название','title','text','Название задачи...'],['Время','preferredTime','time',''],['Заметка','notes','text','Подсказка...']].map(([lbl,key,type,ph])=>(
          <div key={key} style={{marginBottom:14}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:2,color:C.navyMid,textTransform:'uppercase',marginBottom:6}}>{lbl}</div>
            <input type={type} value={form[key]||''} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph}
              style={{width:'100%',padding:'11px 14px',border:`1.5px solid ${C.line}`,borderRadius:8,fontFamily:"'Crimson Pro',serif",fontSize:16,color:C.text1,outline:'none',background:'rgba(250,243,224,0.8)'}}/>
          </div>
        ))}
        <div style={{marginBottom:18}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:2,color:C.navyMid,textTransform:'uppercase',marginBottom:8}}>Периодичность</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {FREQS.map(([v,l])=>(
              <button key={v} onClick={()=>setForm(p=>({...p,freq:v}))}
                style={{padding:'8px 14px',borderRadius:8,cursor:'pointer',fontFamily:"'Crimson Pro',serif",fontSize:14,
                  border:`1.5px solid ${form.freq===v?C.navyMid:C.lineS}`,
                  background:form.freq===v?`rgba(30,58,95,0.12)`:'transparent',
                  color:form.freq===v?C.navyMid:C.text2,fontWeight:form.freq===v?600:400}}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>{ if(!form.title.trim()) return; onSave({...task,...form,id:task?.id||Date.now()+Math.random(),section:'home',lastDone:task?.lastDone||'',doneDate:task?.doneDate||''}); }} style={{flex:2,padding:'13px 0',borderRadius:8,fontFamily:"'Cinzel',serif",fontSize:13,fontWeight:700,letterSpacing:2,textTransform:'uppercase',cursor:'pointer',background:`linear-gradient(135deg,${C.navyMid},${C.navy})`,color:C.goldPale,border:'none',boxShadow:`0 3px 10px rgba(10,37,64,0.22)`}}>💾 Сохранить</button>
          <button onClick={onClose} style={{flex:1,padding:'13px 0',borderRadius:8,fontFamily:"'Cinzel',serif",fontSize:13,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',cursor:'pointer',background:'transparent',color:C.text3,border:`1.5px dashed ${C.lineS}`}}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

// ─── БЛОК ЗАДАЧ ───
function TaskBlock({ title, tasks, today, accentColor, onToggle, onDelete, onEdit, onAdd, autoLabel, onAuto }) {
  const dueCount=tasks.filter(t=>isDue(t,today)).length;
  const doneCount=tasks.filter(t=>t.doneDate===today).length;
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,letterSpacing:2.5,color:accentColor,textTransform:'uppercase',display:'flex',alignItems:'center',gap:8}}>
          <span style={{color:C.gold}}>▸</span>{title}
          {tasks.length>0&&<span style={{fontSize:11,color:C.text3,fontFamily:"'JetBrains Mono',monospace"}}>· {doneCount}/{tasks.length}</span>}
        </div>
        <div style={{display:'flex',gap:8}}>
          {onAuto&&<button onClick={onAuto} style={{padding:'7px 14px',borderRadius:8,fontFamily:"'Cinzel',serif",fontSize:11,letterSpacing:1.5,fontWeight:600,textTransform:'uppercase',cursor:'pointer',background:`rgba(212,175,55,0.12)`,color:C.goldDeep,border:`1.5px solid rgba(212,175,55,0.35)`}}>{autoLabel||'Авто'}</button>}
          <button onClick={onAdd} style={{padding:'7px 14px',borderRadius:8,fontFamily:"'Cinzel',serif",fontSize:11,letterSpacing:1.5,fontWeight:600,textTransform:'uppercase',cursor:'pointer',background:`linear-gradient(135deg,${C.navyMid},${C.navy})`,color:C.goldPale,border:'none'}}>+ Добавить</button>
        </div>
      </div>

      {tasks.length===0?(
        <div style={{textAlign:'center',padding:'24px 0',fontFamily:"'Cormorant Infant',serif",fontSize:16,fontStyle:'italic',color:C.text3}}>
          Нет задач. Нажмите «+ Добавить» или «Авто»
        </div>
      ):(
        tasks.map(task=>(
          <TaskRow key={task.id} task={task} today={today}
            onToggle={()=>onToggle(task.id)}
            onDelete={()=>onDelete(task.id)}
            onEdit={()=>onEdit(task)}/>
        ))
      )}
    </div>
  );
}

// ─── ИНВЕНТАРЬ ───
const EQUIPMENT_LIST = [
  { id:'vacuum',      name:'Пылесос',             icon:'🧹', tip:'Основа. Раз в 5-7 дней.' },
  { id:'robot',       name:'Робот-пылесос',        icon:'🤖', tip:'Поддерживает чистоту ежедневно пока вы спите или работаете. ТОП покупка.' },
  { id:'mop',         name:'Швабра/МОП',           icon:'🫧', tip:'Для мытья полов. Паровая МОП убивает 99% бактерий без химии.' },
  { id:'steam',       name:'Паровая МОП / отпариватель', icon:'♨️', tip:'Дезинфекция без химии. Отлично для плитки, стекла, матрасов.' },
  { id:'washer',      name:'Стиральная машина',    icon:'👕', tip:'Стирка в 30°C экономит энергию и бережёт вещи.' },
  { id:'dryer',       name:'Сушилка',              icon:'🌬️', tip:'Сушит за 40-60 мин. Бельё мягче без глажки.' },
  { id:'airpurifier', name:'Очиститель воздуха',   icon:'💨', tip:'Снижает пыль на 80%. Обязателен при аллергии или животных.' },
  { id:'window',      name:'Робот для окон',       icon:'🪟', tip:'Моет окна за 10 мин вместо часа. Окупается за 1 сезон.' },
  { id:'cloth',       name:'Микрофибра',           icon:'🧻', tip:'Заменяет 90% химии. Собирает пыль электростатикой.' },
  { id:'organizer',   name:'Органайзеры/корзины',  icon:'📦', tip:'Порядок без уборки — всё на своём месте.' },
];

function ToolsCard({ profile, setProfile, notify }) {
  const equipment = profile.homeEquipment || [];
  const toggle = (id) => {
    const next = equipment.includes(id) ? equipment.filter(e=>e!==id) : [...equipment, id];
    setProfile(p=>({...p, homeEquipment: next}));
    notify?.('✅ Инвентарь обновлён');
  };
  const recommended = EQUIPMENT_LIST.filter(e=>!equipment.includes(e.id));
  return (
    <div>
      {/* Мой инвентарь */}
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,letterSpacing:2.5,color:C.success,textTransform:'uppercase',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
        <span style={{color:C.gold}}>▸</span>Мой инвентарь
      </div>
      {equipment.length===0&&(
        <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:16,fontStyle:'italic',color:C.text3,marginBottom:16,textAlign:'center',padding:'16px 0'}}>
          Отметьте что у вас есть
        </div>
      )}
      <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
        {EQUIPMENT_LIST.map(item=>{
          const has=equipment.includes(item.id);
          return (
            <div key={item.id} onClick={()=>toggle(item.id)}
              style={{display:'flex',alignItems:'flex-start',gap:12,padding:'13px 14px',borderRadius:10,cursor:'pointer',
                background:has?'rgba(26,77,46,0.08)':'rgba(10,37,64,0.03)',
                border:`1.5px solid ${has?'rgba(26,77,46,0.30)':C.lineS}`,
                borderLeft:`4px solid ${has?C.success:'rgba(10,37,64,0.15)'}`,
                transition:'all 0.2s'}}>
              <span style={{fontSize:24,flexShrink:0}}>{item.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:17,color:has?C.success:C.text1,fontFamily:"'Crimson Pro',serif",fontWeight:has?700:500,lineHeight:1.3}}>{item.name}</div>
                <div style={{fontSize:14,color:C.text3,fontFamily:"'Crimson Pro',serif",lineHeight:1.5,marginTop:2}}>{item.tip}</div>
              </div>
              <div style={{width:24,height:24,borderRadius:6,border:`2px solid ${has?C.success:C.lineS}`,background:has?'rgba(26,77,46,0.15)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2}}>
                {has&&<span style={{fontSize:13,color:C.success,fontWeight:700}}>✓</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Что стоит купить */}
      {recommended.length>0&&(
        <>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,letterSpacing:2.5,color:C.goldDeep,textTransform:'uppercase',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
            <span style={{color:C.gold}}>▸</span>Стоит добавить
          </div>
          <div style={{padding:'14px 16px',borderRadius:12,background:'rgba(212,175,55,0.07)',border:'1px solid rgba(212,175,55,0.25)',borderLeft:`3px solid ${C.gold}`}}>
            {recommended.slice(0,3).map((item,i)=>(
              <div key={item.id} style={{display:'flex',gap:10,padding:'8px 0',borderBottom:i<2?'1px solid rgba(212,175,55,0.12)':'none'}}>
                <span style={{fontSize:20,flexShrink:0}}>{item.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,color:C.goldDeep,fontFamily:"'Crimson Pro',serif",fontWeight:600}}>{item.name}</div>
                  <div style={{fontSize:14,color:C.text2,fontFamily:"'Crimson Pro',serif",lineHeight:1.5}}>{item.tip}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── ЛАЙФХАКИ ───
const LIFEHACKS = [
  { cat:'Система «1 вход — 1 выход»', icon:'🔄', color:'#1E3A5F', tips:[
    'Принесли новую вещь — уберите одну старую. Вещей не прибывает, хаоса нет.',
    'Работает для одежды, посуды, косметики, бытовой техники.',
  ]},
  { cat:'Правило 2 минут', icon:'⏱️', color:'#2D6A4F', tips:[
    'Если задача занимает менее 2 минут — делайте сразу. Вымыть чашку, протереть плиту, поднять упавшее.',
    'Это предотвращает накопление мелкого беспорядка.',
  ]},
  { cat:'Зонирование уборки', icon:'🗺️', color:'#8B6914', tips:[
    'Разделите квартиру на зоны и убирайте по одной зоне в день. 15 минут в день = чистота без стресса.',
    'Пн: кухня, Вт: ванная, Ср: спальня, Чт: гостиная, Пт: коридор.',
  ]},
  { cat:'Химия нового поколения', icon:'🧪', color:'#6B1010', tips:[
    'Концентраты: 1 бутылка = 30+ применений. Экономия 80% пластика и денег.',
    'Сода + уксус + лимон заменяют 5 средств. Абсолютно безопасны для детей и животных.',
    'Таблетки для посудомойки с активным кислородом отбеливают без хлора.',
  ]},
  { cat:'Скорость и эффект', icon:'⚡', color:'#1D4E5F', tips:[
    'Убирайте сверху вниз: сначала пыль с полок, потом пол. Иначе придётся повторять.',
    'Спрей + 30 сек выдержки = грязь сама отходит. Не трите сразу.',
    'Микрофибра влажная: убирает 99% бактерий. Без химии.',
  ]},
  { cat:'Уборка с животными', icon:'🐾', color:'#4A2D6A', tips:[
    'Силиконовая щётка-скребок убирает шерсть с дивана за 30 секунд.',
    'Очиститель воздуха с HEPA-фильтром снижает шерсть в воздухе на 80%.',
    'Регулярная вычёска животного = меньше шерсти на всём.',
  ]},
];

function LifehacksCard() {
  const [open,setOpen]=useState({});
  return (
    <div>
      {LIFEHACKS.map((sec,i)=>{
        const isOpen=open[i];
        return (
          <div key={i} style={{marginBottom:10,borderRadius:12,overflow:'hidden',border:'1.5px solid rgba(10,37,64,0.12)',background:'rgba(255,255,255,0.4)'}}>
            <div onClick={()=>setOpen(p=>({...p,[i]:!p[i]}))}
              style={{padding:'14px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:12,
                background:isOpen?`${sec.color}12`:'transparent',
                borderLeft:`4px solid ${sec.color}`}}>
              <span style={{fontSize:22,flexShrink:0}}>{sec.icon}</span>
              <span style={{flex:1,fontFamily:"'Cinzel',serif",fontSize:16,color:sec.color,fontWeight:700,letterSpacing:1}}>{sec.cat}</span>
              <span style={{fontSize:14,color:sec.color,transform:isOpen?'rotate(180deg)':'rotate(0)',transition:'0.25s',display:'inline-block'}}>▼</span>
            </div>
            {isOpen&&(
              <div style={{padding:'4px 16px 16px'}}>
                {sec.tips.map((tip,j)=>(
                  <div key={j} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:j<sec.tips.length-1?'1px solid rgba(10,37,64,0.07)':'none'}}>
                    <span style={{color:sec.color,fontWeight:700,flexShrink:0,marginTop:3,fontSize:18}}>·</span>
                    <span style={{fontFamily:"'Crimson Pro',serif",fontSize:17,color:C.text1,lineHeight:1.65}}>{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── ИИ СОВЕТЫ ───
function AiHomeCard({ profile, notify }) {
  const [result,setResult]=useState(()=>{ try{return JSON.parse(localStorage.getItem('ld_home_ai')||'null')}catch{return null} });
  const [loading,setLoading]=useState(false);
  const [open,setOpen]=useState({});

  const fetch_ai=async()=>{
    setLoading(true);
    try {
      const equipment=(profile.homeEquipment||[]).map(id=>EQUIPMENT_LIST.find(e=>e.id===id)?.name).filter(Boolean).join(', ')||'не указано';
      const prompt=`Составь персональный план оптимизации уборки для ${profile.name||'пользователя'}.
Жильё: ${profile.homeType||'квартира'}, ${profile.homeArea||'—'} м². Спальни: ${profile.bedrooms||1}, санузлы: ${profile.bathrooms||1}.
Живут: ${(profile.livesWith||[]).join(', ')||'один'}. Есть животные: ${profile.hasPets==='Да'?'да':'нет'}.
Дни уборки: ${(profile.cleanDays||[]).join(', ')||'не указаны'}.
Оборудование: ${equipment}.
Свободное время: после ${profile.workEnd||'18:00'}.

Ответь ТОЛЬКО JSON (без markdown):
{
  "summary": "2-3 предложения персональной оценки",
  "schedule": [{"day":"Понедельник","tasks":["задача 1","задача 2"]}],
  "priority_tips": ["самый важный совет 1","совет 2","совет 3"],
  "time_savers": ["лайфхак для экономии времени 1","лайфхак 2","лайфхак 3"],
  "products": ["рекомендованное средство 1 с описанием","средство 2"],
  "upgrade": ["что стоит купить с объяснением пользы 1","покупка 2"]
}`;
      const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system:'Ты эксперт по организации быта. Отвечай ТОЛЬКО валидным JSON.',user:prompt,maxTokens:1200})});
      const d=await r.json();
      const parsed=JSON.parse(d.text.replace(/```json|```/g,'').trim());
      setResult(parsed);
      try{localStorage.setItem('ld_home_ai',JSON.stringify(parsed))}catch{}
      notify?.('✅ Рекомендации готовы');
    } catch { notify?.('❌ Ошибка ИИ'); }
    finally { setLoading(false); }
  };

  const SECTIONS=[
    {key:'priority_tips',label:'🎯 Приоритеты',color:'#1E3A5F'},
    {key:'time_savers',  label:'⚡ Экономия времени',color:'#2D6A4F'},
    {key:'products',     label:'🧪 Средства',color:'#8B6914'},
    {key:'upgrade',      label:'🛒 Что докупить',color:'#6B1010'},
  ];

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,gap:12}}>
        <div style={{fontFamily:"'Crimson Pro',serif",fontSize:16,color:C.text2,lineHeight:1.6,flex:1}}>
          Персональный план уборки с учётом жилья, состава семьи и оборудования
        </div>
        <button onClick={fetch_ai} disabled={loading}
          style={{padding:'10px 18px',borderRadius:10,fontFamily:"'Cinzel',serif",fontSize:12,letterSpacing:1.5,fontWeight:700,textTransform:'uppercase',cursor:loading?'not-allowed':'pointer',
            background:loading?'rgba(10,37,64,0.08)':`linear-gradient(135deg,${C.navyMid},${C.navy})`,
            color:loading?C.text3:C.goldPale,border:`1.5px solid ${loading?C.lineS:C.navy}`,flexShrink:0}}>
          {loading?'⏳..':result?'🔄':'✨ ИИ'}
        </button>
      </div>

      {loading&&<div style={{textAlign:'center',padding:'32px 0',fontFamily:"'Cormorant Infant',serif",fontSize:18,fontStyle:'italic',color:C.text3}}>Составляю персональный план уборки...</div>}

      {result&&!loading&&(
        <div>
          {result.summary&&(
            <div style={{padding:'14px 18px',borderRadius:12,background:'rgba(10,37,64,0.06)',border:'1px solid rgba(10,37,64,0.15)',borderLeft:`4px solid ${C.navyMid}`,marginBottom:16,fontFamily:"'Crimson Pro',serif",fontSize:17,color:C.text1,lineHeight:1.75}}>
              {result.summary}
            </div>
          )}

          {/* Расписание */}
          {result.schedule?.length>0&&(
            <div style={{marginBottom:16}}>
              <div onClick={()=>setOpen(p=>({...p,schedule:!p.schedule}))}
                style={{display:'flex',alignItems:'center',gap:10,padding:'13px 16px',cursor:'pointer',borderRadius:12,background:'rgba(212,175,55,0.08)',border:'1.5px solid rgba(212,175,55,0.25)',borderLeft:`4px solid ${C.gold}`}}>
                <span style={{flex:1,fontFamily:"'Cinzel',serif",fontSize:16,color:C.goldDeep,fontWeight:700,letterSpacing:1}}>📅 Расписание уборки</span>
                <span style={{fontSize:14,color:C.gold,transform:open.schedule?'rotate(180deg)':'rotate(0)',transition:'0.25s',display:'inline-block'}}>▼</span>
              </div>
              {open.schedule&&(
                <div style={{border:'1.5px solid rgba(212,175,55,0.20)',borderTop:'none',borderRadius:'0 0 12px 12px',padding:'8px 16px 16px'}}>
                  {result.schedule.map((day,i)=>(
                    <div key={i} style={{padding:'10px 0',borderBottom:i<result.schedule.length-1?'1px solid rgba(212,175,55,0.10)':'none'}}>
                      <div style={{fontFamily:"'Cinzel',serif",fontSize:15,color:C.goldDeep,fontWeight:600,marginBottom:6}}>{day.day}</div>
                      {(day.tasks||[]).map((t,j)=>(
                        <div key={j} style={{fontFamily:"'Crimson Pro',serif",fontSize:16,color:C.text2,padding:'3px 0',paddingLeft:12,borderLeft:`2px solid rgba(212,175,55,0.25)`}}>· {t}</div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Остальные секции */}
          {SECTIONS.map(sec=>{
            const items=result[sec.key]||[];
            if (!items.length) return null;
            const isOpen=open[sec.key];
            return (
              <div key={sec.key} style={{marginBottom:10,borderRadius:12,overflow:'hidden',border:'1.5px solid rgba(10,37,64,0.12)',background:'rgba(255,255,255,0.4)'}}>
                <div onClick={()=>setOpen(p=>({...p,[sec.key]:!p[sec.key]}))}
                  style={{padding:'13px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,background:isOpen?`${sec.color}10`:'transparent',borderLeft:`4px solid ${sec.color}`}}>
                  <span style={{flex:1,fontFamily:"'Cinzel',serif",fontSize:16,color:sec.color,fontWeight:700,letterSpacing:1}}>{sec.label}</span>
                  <span style={{fontSize:14,color:sec.color,transform:isOpen?'rotate(180deg)':'rotate(0)',transition:'0.25s',display:'inline-block'}}>▼</span>
                </div>
                {isOpen&&(
                  <div style={{padding:'4px 16px 16px'}}>
                    {items.map((item,j)=>(
                      <div key={j} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:j<items.length-1?'1px solid rgba(10,37,64,0.07)':'none'}}>
                        <span style={{color:sec.color,fontWeight:700,flexShrink:0,marginTop:3,fontSize:18}}>·</span>
                        <span style={{fontFamily:"'Crimson Pro',serif",fontSize:17,color:C.text1,lineHeight:1.65}}>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!result&&!loading&&(
        <div style={{textAlign:'center',padding:'28px 0',fontFamily:"'Cormorant Infant',serif",fontSize:18,fontStyle:'italic',color:C.text3}}>
          ИИ составит персональный план уборки с расписанием и советами
        </div>
      )}
    </div>
  );
}

// ─── ГЛАВНЫЙ КОМПОНЕНТ ───
export function HomeSection() {
  const { profile, setProfile, tasks, setTasks, notify } = useApp();
  const [modal,setModal]=useState(null);
  const today=localDateStr(new Date());

  const homeTasks=tasks.filter(t=>t.section==='home');

  // Группировка задач по типу
  const daily  =homeTasks.filter(t=>t.freq==='daily'||t.freq==='workdays');
  const weekly =homeTasks.filter(t=>t.freq?.startsWith('every:7')||t.freq?.startsWith('weekly:'));
  const deep   =homeTasks.filter(t=>t.freq?.startsWith('every:14')||t.freq?.startsWith('every:30')||t.freq?.startsWith('every:90')||t.freq==='once');

  const toggleTask=(id)=>setTasks(p=>p.map(t=>t.id===id?{...t,doneDate:t.doneDate===today?null:today,lastDone:t.doneDate===today?t.lastDone:today}:t));
  const deleteTask=(id)=>setTasks(p=>p.filter(t=>t.id!==id));
  const saveTask=(task)=>{
    setTasks(p=>p.find(t=>t.id===task.id)?p.map(t=>t.id===task.id?task:t):[...p,task]);
    notify?.(task.id&&tasks.find(t=>t.id===task.id)?'✅ Обновлено':'✅ Добавлено');
    setModal(null);
  };

  // Авто-генерация ежедневных задач
  const autoDaily=()=>{
    const beds=parseInt(profile.bedrooms)||1;
    const items=[
      {title:'Помыть посуду',freq:'daily',priority:'m'},
      {title:'Вынести мусор',freq:'daily',priority:'m'},
      {title:'Вытереть пыль с поверхностей',freq:'daily',priority:'l'},
      {title:'Протереть плиту',freq:'daily',priority:'l'},
      {title:'Проветрить квартиру',freq:'daily',priority:'l'},
    ];
    if (profile.plants&&profile.plants!=='Нет')
      items.push({title:'Полить цветы',freq:'every:2',priority:'m'});
    addUnique(items,'daily');
  };

  const autoWeekly=()=>{
    const beds=parseInt(profile.bedrooms)||1;
    const baths=parseInt(profile.bathrooms)||1;
    const items=[];
    for(let i=1;i<=beds;i++) {
      const l=beds>1?` (спальня ${i})`:'';
      items.push({title:`Пылесос в спальне${l}`,freq:'every:7',priority:'m'});
      items.push({title:`Смена постельного белья${l}`,freq:'every:7',priority:'m'});
    }
    for(let i=1;i<=baths;i++) {
      const l=baths>1?` (санузел ${i})`:'';
      items.push({title:`Уборка ванной${l}`,freq:'every:7',priority:'h'});
      items.push({title:`Унитаз и раковина${l}`,freq:'every:7',priority:'m'});
    }
    items.push({title:'Мытьё полов',freq:'every:7',priority:'m'});
    items.push({title:'Пылесос во всей квартире',freq:'every:7',priority:'m'});
    items.push({title:'Зеркала и стёкла',freq:'every:7',priority:'l'});
    if(profile.hasPets==='Да') items.push({title:'Чистка мебели от шерсти',freq:'every:7',priority:'m'});
    addUnique(items,'weekly');
  };

  const autoDeep=()=>{
    const month=new Date().getMonth()+1;
    const items=[
      {title:'Мытьё окон',freq:'every:30',priority:'l'},
      {title:'Чистка холодильника',freq:'every:30',priority:'m'},
      {title:'Чистка духовки',freq:'every:30',priority:'l'},
      {title:'Мытьё вытяжки',freq:'every:30',priority:'m'},
      {title:'Генеральная уборка',freq:'every:90',priority:'h'},
      {title:'Стирка штор и покрывал',freq:'every:90',priority:'m'},
    ];
    if(month===3||month===4) items.push({title:'🌸 Весенняя генуборка',freq:'once',priority:'h',notes:'Убрать зимние вещи, вымыть всё'});
    if(month===10||month===11) items.push({title:'🍂 Осенняя генуборка',freq:'once',priority:'h',notes:'Достать зимние вещи'});
    addUnique(items,'deep');
  };

  const addUnique=(items,type)=>{
    setTasks(p=>{
      const exist=new Set(p.filter(x=>x.section==='home').map(x=>x.title.toLowerCase()));
      const filtered=items.filter(t=>!exist.has(t.title.toLowerCase()));
      if(!filtered.length) { notify?.('Все задачи уже добавлены'); return p; }
      notify?.(`✅ Добавлено ${filtered.length} задач`);
      return [...p,...filtered.map(t=>({...t,id:Date.now()+Math.random(),section:'home',lastDone:'',doneDate:'',notes:t.notes||''}))];
    });
  };

  const doneToday=homeTasks.filter(t=>t.doneDate===today).length;
  const totalDue=homeTasks.filter(t=>isDue(t,today)).length;

  return (
    <div style={{paddingBottom:80,padding:'0 16px 80px'}}>

      {/* Инфо профиля */}
      {(profile.homeType||profile.homeArea)&&(
        <div style={{marginBottom:16,padding:'12px 16px',borderRadius:12,background:'rgba(10,37,64,0.04)',border:'1px solid rgba(10,37,64,0.10)',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <span style={{fontSize:22}}>🏠</span>
          <div style={{fontFamily:"'Crimson Pro',serif",fontSize:16,color:C.text2,lineHeight:1.5,flex:1}}>
            {profile.homeType}{profile.homeArea?` · ${profile.homeArea} м²`:''}{(profile.livesWith||[]).length?` · ${profile.livesWith.join(', ')}`:''}{totalDue>0&&<span style={{marginLeft:10,fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.navyMid}}>{doneToday}/{totalDue} выполнено</span>}
          </div>
        </div>
      )}

      {/* [1] Ежедневная уборка */}
      <FlipCard title="Ежедневная уборка" image="/home/home-daily.jpg" accentColor={CARD_COLORS.daily.accent}
        badge={daily.filter(t=>t.doneDate===today).length>0&&(
          <div style={{padding:'5px 12px',borderRadius:20,background:'rgba(26,77,46,0.85)',fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:'#fff',letterSpacing:1,fontWeight:600}}>
            ✓ {daily.filter(t=>t.doneDate===today).length} выполнено
          </div>
        )}>
        <TaskBlock title="Ежедневные задачи" tasks={daily} today={today} accentColor={CARD_COLORS.daily.accent}
          onToggle={toggleTask} onDelete={deleteTask} onEdit={setModal}
          onAdd={()=>setModal({freq:'daily'})}
          autoLabel="Авто-заполнить" onAuto={autoDaily}/>
      </FlipCard>

      {/* [2] Еженедельная уборка */}
      <FlipCard title="Уборка по неделям" image="/home/home-weekly.jpg" accentColor={CARD_COLORS.weekly.accent}
        badge={weekly.filter(t=>isDue(t,today)).length>0&&(
          <div style={{padding:'5px 12px',borderRadius:20,background:'rgba(10,37,64,0.80)',fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.goldPale,letterSpacing:1,fontWeight:600}}>
            {weekly.filter(t=>isDue(t,today)).length} на сегодня
          </div>
        )}>
        <TaskBlock title="Еженедельные задачи" tasks={weekly} today={today} accentColor={CARD_COLORS.weekly.accent}
          onToggle={toggleTask} onDelete={deleteTask} onEdit={setModal}
          onAdd={()=>setModal({freq:'every:7'})}
          autoLabel="Авто-заполнить" onAuto={autoWeekly}/>
      </FlipCard>

      {/* [3] Генеральная и редкая */}
      <FlipCard title="Генеральная уборка" image="/home/home-deep.jpg" accentColor={CARD_COLORS.deep.accent}>
        <TaskBlock title="Редкие и генеральные" tasks={deep} today={today} accentColor={CARD_COLORS.deep.accent}
          onToggle={toggleTask} onDelete={deleteTask} onEdit={setModal}
          onAdd={()=>setModal({freq:'every:30'})}
          autoLabel="Авто-заполнить" onAuto={autoDeep}/>
      </FlipCard>

      {/* [4] Инвентарь */}
      <FlipCard title="Инвентарь и техника" image="/home/home-tools.jpg" accentColor={CARD_COLORS.tools.accent}>
        <ToolsCard profile={profile} setProfile={setProfile} notify={notify}/>
      </FlipCard>

      {/* [5] Лайфхаки */}
      <FlipCard title="Лайфхаки уборки" image="/home/home-weekly.jpg" accentColor={CARD_COLORS.weekly.accent}>
        <LifehacksCard/>
      </FlipCard>

      {/* [6] ИИ советы */}
      <FlipCard title="ИИ советы по быту" image="/home/home-ai.jpg" accentColor={CARD_COLORS.ai.accent}>
        <AiHomeCard profile={profile} notify={notify}/>
      </FlipCard>

      {/* Модалка */}
      {modal!==null&&(
        <SimpleTaskModal task={modal?.id?modal:null} defaultFreq={modal?.freq||'daily'}
          onSave={saveTask} onClose={()=>setModal(null)}/>
      )}
    </div>
  );
      }
