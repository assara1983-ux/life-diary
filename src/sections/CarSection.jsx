// src/sections/CarSection.jsx
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../store/AppContext';

const C = {
  navy:'#0A2540', navyMid:'#1E3A5F', navyLight:'#2C4F7A',
  gold:'#D4AF37', goldDeep:'#B8941E', goldPale:'#F0DC90',
  bg:'#F5E8C7', bgCard:'#FAF3E0', bgCard2:'#F2E8CE',
  text1:'#0A2540', text2:'#1E3A5F', text3:'#4A6480',
  success:'#1A4D2E', error:'#6B1010', warn:'#C49B2A',
  line:'rgba(10,37,64,0.22)', lineS:'rgba(10,37,64,0.10)',
};

// ─── UI КОМПОНЕНТЫ ───
function Card({ children, style={} }) {
  return (
    <div style={{
      background:`linear-gradient(160deg,${C.bgCard} 0%,${C.bgCard2} 100%)`,
      border:`1.5px solid ${C.line}`, borderRadius:12, padding:18, marginBottom:14,
      position:'relative', overflow:'hidden',
      boxShadow:`0 3px 14px rgba(10,37,64,0.10)`,
      backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(10,37,64,0.03) 28px)`,
      ...style,
    }}>
      <div style={{position:'absolute',top:6,left:6,width:11,height:11,
        borderTop:`2px solid ${C.gold}`,borderLeft:`2px solid ${C.gold}`,opacity:0.7}}/>
      <div style={{position:'absolute',bottom:6,right:6,width:11,height:11,
        borderBottom:`2px solid ${C.gold}`,borderRight:`2px solid ${C.gold}`,opacity:0.7}}/>
      {children}
    </div>
  );
}

function SecLabel({ children, color }) {
  return (
    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:3,
      color:color||C.navyMid,textTransform:'uppercase',marginBottom:12,
      paddingBottom:6,borderBottom:`1px solid ${C.lineS}`,
      display:'flex',alignItems:'center',gap:8}}>
      <span style={{color:C.gold}}>▸</span>{children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{marginBottom:12}}>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,letterSpacing:2,
        color:C.navyMid,textTransform:'uppercase',marginBottom:6,
        display:'flex',alignItems:'center',gap:6}}>
        <span style={{color:C.gold}}>·</span>{label}
      </div>
      {children}
    </div>
  );
}

function Inp({ value, onChange, placeholder, type='text' }) {
  return (
    <input value={value||''} onChange={onChange} placeholder={placeholder} type={type}
      style={{width:'100%',padding:'11px 14px',border:`1.5px solid ${C.line}`,
        borderRadius:8,background:'rgba(250,243,224,0.85)',
        fontFamily:"'Crimson Pro',serif",fontSize:16,color:C.text1,outline:'none'}}/>
  );
}

function Btn({ children, onClick, variant='primary', size='md', disabled=false, style={} }) {
  const base = {
    fontFamily:"'Cinzel',serif",letterSpacing:2,textTransform:'uppercase',
    cursor:disabled?'not-allowed':'pointer',border:'none',borderRadius:8,
    transition:'all .2s',opacity:disabled?0.6:1,...style,
  };
  const variants = {
    primary:{background:`linear-gradient(135deg,${C.navyMid},${C.navy})`,
      color:C.goldPale,padding:size==='sm'?'8px 14px':'13px 20px',
      fontSize:size==='sm'?11:13,boxShadow:`0 3px 10px rgba(10,37,64,0.22)`},
    ghost:{background:'transparent',color:C.text2,
      border:`1.5px dashed rgba(10,37,64,0.28)`,
      padding:size==='sm'?'7px 12px':'12px 18px',fontSize:size==='sm'?11:13},
    gold:{background:`linear-gradient(135deg,${C.gold},${C.goldDeep})`,
      color:'#fff',padding:size==='sm'?'8px 14px':'13px 20px',
      fontSize:size==='sm'?11:13,boxShadow:`0 3px 10px rgba(212,175,55,0.25)`},
    danger:{background:'rgba(107,16,16,0.08)',color:C.error,
      border:`1.5px solid rgba(107,16,16,0.25)`,
      padding:size==='sm'?'7px 12px':'12px 18px',fontSize:size==='sm'?11:13},
  };
  return <button onClick={disabled?undefined:onClick} style={{...base,...variants[variant]}}>{children}</button>;
}

// ─── УТИЛИТЫ ───
function daysLeft(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU');
}

function localDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

// ─── ШАПКА РАЗДЕЛА ───
function CarHero({ profile }) {
  const model = profile.carModel || '';
  const year  = profile.carYear  || '';
  return (
    <div style={{position:'relative',borderRadius:14,overflow:'hidden',
      marginBottom:18,height:150,boxShadow:`0 5px 20px rgba(10,37,64,0.20)`}}>
      <img src="/car/car-hero.jpg" alt="Авто"
        style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}
        onError={e=>{e.target.style.display='none';}}/>
      <div style={{position:'absolute',inset:0,
        background:'linear-gradient(to top,rgba(10,25,45,0.88) 0%,rgba(10,25,45,0.25) 65%,transparent 100%)'}}/>
      <div style={{position:'absolute',top:8,left:8,width:12,height:12,
        borderTop:`2px solid ${C.gold}`,borderLeft:`2px solid ${C.gold}`,opacity:0.85}}/>
      <div style={{position:'absolute',bottom:8,right:8,width:12,height:12,
        borderBottom:`2px solid ${C.gold}`,borderRight:`2px solid ${C.gold}`,opacity:0.85}}/>
      <div style={{position:'absolute',bottom:16,left:18}}>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
          letterSpacing:3,color:C.goldPale,textTransform:'uppercase',marginBottom:4,opacity:0.9}}>
          Мой автомобиль
        </div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:22,fontWeight:700,
          color:'#fff',letterSpacing:2,textShadow:'0 2px 8px rgba(0,0,0,0.5)'}}>
          {model ? `${model}${year?' '+year:''}` : 'Добавьте данные'}
        </div>
      </div>
    </div>
  );
}

// ─── КАРТОЧКА АВТО ───
function CarInfoCard({ profile, setProfile, notify }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    carModel:    profile.carModel    || '',
    carYear:     profile.carYear     || '',
    carMileage:  profile.carMileage  || '',
    carLastTO:   profile.carLastTO   || '',
    carTireType: profile.carTireType || '',
    carTireDate: profile.carTireDate || '',
    carInsurance:profile.carInsurance|| '',
    carTechCheck:profile.carTechCheck|| '',
    carColor:    profile.carColor    || '',
    carVIN:      profile.carVIN      || '',
    carPlate:    profile.carPlate    || '',
    carFuel:     profile.carFuel     || '',
  });

  // Синхронизируем с профилем при открытии
  useEffect(() => {
    if (editing) {
      setForm({
        carModel:    profile.carModel    || '',
        carYear:     profile.carYear     || '',
        carMileage:  profile.carMileage  || '',
        carLastTO:   profile.carLastTO   || '',
        carTireType: profile.carTireType || '',
        carTireDate: profile.carTireDate || '',
        carInsurance:profile.carInsurance|| '',
        carTechCheck:profile.carTechCheck|| '',
        carColor:    profile.carColor    || '',
        carVIN:      profile.carVIN      || '',
        carPlate:    profile.carPlate    || '',
        carFuel:     profile.carFuel     || '',
      });
    }
  }, [editing]);

  const save = () => {
    setProfile(p => ({ ...p, ...form, hasCar:'Да' }));
    setEditing(false);
    notify?.('✅ Данные автомобиля сохранены');
  };

  const now = new Date();
  const month = now.getMonth() + 1;
  const isSpring = month >= 3 && month <= 5;
  const isAutumn = month >= 9 && month <= 11;

  const warnings = [];
  if (profile.carTireType==='Зимняя' && isSpring)
    warnings.push({emoji:'🔄',title:'Смените на летнюю резину',desc:'Стабильно выше +7°C — пора',color:C.warn});
  if (profile.carTireType==='Летняя' && isAutumn)
    warnings.push({emoji:'🔄',title:'Смените на зимнюю резину',desc:'Не ждите первого снега',color:C.warn});
  const insDays = daysLeft(profile.carInsurance);
  if (insDays !== null && insDays >= 0 && insDays < 30)
    warnings.push({emoji:'📋',title:'Страховка истекает',desc:`Через ${insDays} дн.`,color:C.error});
  const tchDays = daysLeft(profile.carTechCheck);
  if (tchDays !== null && tchDays >= 0 && tchDays < 30)
    warnings.push({emoji:'🔍',title:'Техосмотр истекает',desc:`Через ${tchDays} дн.`,color:C.error});

  return (
    <>
      {/* Предупреждения */}
      {warnings.length > 0 && (
        <Card style={{borderLeft:`3px solid ${C.error}`,marginBottom:14}}>
          <SecLabel color={C.error}>⚠ Требует внимания</SecLabel>
          {warnings.map((w,i) => (
            <div key={i} style={{display:'flex',gap:10,padding:'8px 0',
              borderBottom:`1px solid ${C.lineS}`}}>
              <span style={{fontSize:20,flexShrink:0}}>{w.emoji}</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:14,color:w.color,fontWeight:600}}>{w.title}</div>
                <div style={{fontFamily:"'Crimson Pro',serif",fontSize:13,color:C.text3}}>{w.desc}</div>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <SecLabel>Данные автомобиля</SecLabel>
          <Btn onClick={()=>setEditing(!editing)} variant='ghost' size='sm'>
            {editing ? 'Отмена' : '✏️ Изменить'}
          </Btn>
        </div>

        {!editing ? (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[
              ['🚗 Марка/Модель', `${profile.carModel||'—'} ${profile.carYear||''}`.trim()],
              ['📍 Пробег',       profile.carMileage ? profile.carMileage+' км' : '—'],
              ['🎨 Цвет',         profile.carColor||'—'],
              ['⛽ Топливо',       profile.carFuel||'—'],
              ['🔢 Номер',         profile.carPlate||'—'],
              ['🔑 VIN',           profile.carVIN ? profile.carVIN.slice(0,8)+'...' : '—'],
              ['🔄 Резина',        profile.carTireType||'—'],
              ['🔧 Последнее ТО',  fmtDate(profile.carLastTO)],
              ['📋 Страховка до',  fmtDate(profile.carInsurance)],
              ['🔍 Техосмотр до',  fmtDate(profile.carTechCheck)],
            ].map(([label,value]) => (
              <div key={label} style={{padding:'9px 12px',background:'rgba(10,37,64,0.04)',
                borderRadius:8,border:`1px solid ${C.lineS}`}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
                  color:C.text3,marginBottom:3,letterSpacing:0.5}}>{label}</div>
                <div style={{fontFamily:"'Crimson Pro',serif",fontSize:15,color:C.text1,fontWeight:500}}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Field label="Марка и модель"><Inp value={form.carModel} onChange={e=>setForm(p=>({...p,carModel:e.target.value}))} placeholder="Toyota Camry"/></Field>
              <Field label="Год"><Inp value={form.carYear} onChange={e=>setForm(p=>({...p,carYear:e.target.value}))} type="number" placeholder="2020"/></Field>
            </div>
            <Field label="Пробег (км)"><Inp value={form.carMileage} onChange={e=>setForm(p=>({...p,carMileage:e.target.value}))} type="number" placeholder="85000"/></Field>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Field label="Цвет"><Inp value={form.carColor} onChange={e=>setForm(p=>({...p,carColor:e.target.value}))} placeholder="Белый"/></Field>
              <Field label="Топливо">
                <select value={form.carFuel} onChange={e=>setForm(p=>({...p,carFuel:e.target.value}))}
                  style={{width:'100%',padding:'11px 14px',border:`1.5px solid ${C.line}`,
                    borderRadius:8,background:'rgba(250,243,224,0.85)',
                    fontFamily:"'Crimson Pro',serif",fontSize:16,color:C.text1,outline:'none'}}>
                  <option value=''>Выберите</option>
                  {['Бензин','Дизель','Газ (LPG)','Гибрид','Электро'].map(v=><option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Field label="Госномер"><Inp value={form.carPlate} onChange={e=>setForm(p=>({...p,carPlate:e.target.value}))} placeholder="123 ABC 01"/></Field>
              <Field label="VIN"><Inp value={form.carVIN} onChange={e=>setForm(p=>({...p,carVIN:e.target.value}))} placeholder="VIN-номер"/></Field>
            </div>
            <Field label="Тип резины">
              <div style={{display:'flex',gap:8}}>
                {['Летняя','Зимняя','Всесезонная'].map(v => (
                  <button key={v} onClick={()=>setForm(p=>({...p,carTireType:v}))}
                    style={{flex:1,padding:'9px 0',borderRadius:8,cursor:'pointer',
                      fontFamily:"'Crimson Pro',serif",fontSize:14,
                      border:`1.5px solid ${form.carTireType===v?C.gold:C.line}`,
                      background:form.carTireType===v?`rgba(212,175,55,0.12)`:'transparent',
                      color:form.carTireType===v?C.goldDeep:C.text2}}>
                    {v}
                  </button>
                ))}
              </div>
            </Field>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Field label="Страховка до"><Inp value={form.carInsurance} onChange={e=>setForm(p=>({...p,carInsurance:e.target.value}))} type="date"/></Field>
              <Field label="Техосмотр до"><Inp value={form.carTechCheck} onChange={e=>setForm(p=>({...p,carTechCheck:e.target.value}))} type="date"/></Field>
            </div>
            <div style={{marginTop:8}}>
              <Btn onClick={save} variant='primary' style={{width:'100%'}}>💾 Сохранить данные</Btn>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

// ─── СЕРВИСНАЯ КНИЖКА ───
function ServiceBook({ profile, tasks, setTasks, notify }) {
  const STORAGE_KEY = 'ld_car_service_log';
  const [log, setLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); } catch { return []; }
  });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    date:'', type:'', desc:'', mileage:'', cost:'', nextDate:'', nextMileage:''
  });

  const SERVICE_TYPES = [
    { id:'oil',    label:'Замена масла',      emoji:'🔧' },
    { id:'tires',  label:'Шиномонтаж',        emoji:'🔄' },
    { id:'brakes', label:'Тормозная система', emoji:'🛑' },
    { id:'filter', label:'Замена фильтров',   emoji:'🌪️' },
    { id:'battery',label:'Аккумулятор',       emoji:'🔋' },
    { id:'timing', label:'Ремень/цепь ГРМ',  emoji:'⚙️' },
    { id:'fluid',  label:'Жидкости',          emoji:'💧' },
    { id:'diag',   label:'Диагностика',       emoji:'🔍' },
    { id:'body',   label:'Кузовной ремонт',   emoji:'🚗' },
    { id:'other',  label:'Другое',            emoji:'📋' },
  ];

  const saveEntry = () => {
    if (!form.date || !form.type) return;
    const entry = { id:Date.now(), ...form,
      typeLabel: SERVICE_TYPES.find(t=>t.id===form.type)?.label||form.type,
      typeEmoji: SERVICE_TYPES.find(t=>t.id===form.type)?.emoji||'📋',
    };
    const next = [entry, ...log];
    setLog(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}

    // Добавляем следующее ТО в задачи если указана дата
    if (form.nextDate) {
      setTasks(p => [...p, {
        id: Date.now()+1,
        title: `🔧 ${entry.typeLabel}`,
        section:'car', freq:'once',
        priority:'h', preferredTime:'10:00',
        dueDate: form.nextDate,
        doneDate:'', notes:`Следующее: ${entry.typeLabel}`,
        isCarEvent:true,
      }]);
      notify?.('✅ Запись добавлена. Следующее ТО добавлено в задачи.');
    } else {
      notify?.('✅ Запись добавлена в сервисную книжку');
    }
    setForm({date:'',type:'',desc:'',mileage:'',cost:'',nextDate:'',nextMileage:''});
    setAdding(false);
  };

  const removeEntry = (id) => {
    const next = log.filter(e=>e.id!==id);
    setLog(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  return (
    <div style={{position:'relative',borderRadius:14,overflow:'hidden',
      marginBottom:14,border:`1.5px solid ${C.line}`,
      boxShadow:`0 4px 16px rgba(10,37,64,0.12)`}}>
      <img src="/car/car-logbook.jpg" alt=""
        style={{position:'absolute',inset:0,width:'100%',height:'100%',
          objectFit:'cover',opacity:0.12,pointerEvents:'none'}}
        onError={e=>e.target.style.display='none'}/>
      <div style={{position:'absolute',inset:0,
        background:`linear-gradient(160deg,rgba(250,243,224,0.96) 0%,rgba(240,230,205,0.95) 100%)`,
        backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(10,37,64,0.03) 28px)`}}/>
      <div style={{position:'absolute',top:7,left:7,width:12,height:12,
        borderTop:`2px solid ${C.gold}`,borderLeft:`2px solid ${C.gold}`,opacity:0.8}}/>
      <div style={{position:'absolute',bottom:7,right:7,width:12,height:12,
        borderBottom:`2px solid ${C.gold}`,borderRight:`2px solid ${C.gold}`,opacity:0.8}}/>

      <div style={{position:'relative',zIndex:1,padding:18}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
          marginBottom:14,paddingBottom:12,borderBottom:`1.5px solid ${C.line}`}}>
          <div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
              letterSpacing:3,color:C.text3,textTransform:'uppercase',marginBottom:3}}>
              История обслуживания
            </div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,
              color:C.navy,letterSpacing:2,textTransform:'uppercase'}}>
              📔 Сервисная книжка
            </div>
          </div>
          <Btn onClick={()=>setAdding(!adding)} variant={adding?'ghost':'primary'} size='sm'>
            {adding ? 'Отмена' : '+ Запись'}
          </Btn>
        </div>

        {/* Форма добавления */}
        {adding && (
          <div style={{marginBottom:16,padding:14,background:`rgba(10,37,64,0.04)`,
            borderRadius:10,border:`1px solid ${C.lineS}`}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
              letterSpacing:2,color:C.navyMid,textTransform:'uppercase',marginBottom:12}}>
              Новая запись
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <Field label="Дата"><Inp value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} type="date"/></Field>
              <Field label="Пробег (км)"><Inp value={form.mileage} onChange={e=>setForm(p=>({...p,mileage:e.target.value}))} type="number" placeholder="85000"/></Field>
            </div>
            <Field label="Тип работ">
              <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6}}>
                {SERVICE_TYPES.map(t => (
                  <button key={t.id} onClick={()=>setForm(p=>({...p,type:t.id}))}
                    style={{padding:'8px 4px',borderRadius:8,cursor:'pointer',textAlign:'center',
                      border:`1.5px solid ${form.type===t.id?C.gold:C.lineS}`,
                      background:form.type===t.id?`rgba(212,175,55,0.12)`:'rgba(255,255,255,0.5)',
                      transition:'all .15s'}}>
                    <div style={{fontSize:18,marginBottom:2}}>{t.emoji}</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:7,
                      color:form.type===t.id?C.goldDeep:C.text3,letterSpacing:0.3,lineHeight:1.2}}>
                      {t.label}
                    </div>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Описание работ">
              <textarea value={form.desc} onChange={e=>setForm(p=>({...p,desc:e.target.value}))}
                placeholder="Замена масла 5W-30, фильтры..." rows={2}
                style={{width:'100%',padding:'11px 14px',border:`1.5px solid ${C.line}`,
                  borderRadius:8,background:'rgba(250,243,224,0.85)',
                  fontFamily:"'Crimson Pro',serif",fontSize:16,color:C.text1,
                  outline:'none',resize:'vertical'}}/>
            </Field>
            <Field label="Стоимость (₸)">
              <Inp value={form.cost} onChange={e=>setForm(p=>({...p,cost:e.target.value}))} type="number" placeholder="25000"/>
            </Field>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <Field label="Следующее ТО (дата)"><Inp value={form.nextDate} onChange={e=>setForm(p=>({...p,nextDate:e.target.value}))} type="date"/></Field>
              <Field label="Следующее ТО (км)"><Inp value={form.nextMileage} onChange={e=>setForm(p=>({...p,nextMileage:e.target.value}))} type="number" placeholder="95000"/></Field>
            </div>
            <Btn onClick={saveEntry} variant='primary' style={{width:'100%'}}>
              💾 Сохранить запись
            </Btn>
          </div>
        )}

        {/* Список записей */}
        {log.length === 0 && !adding && (
          <div style={{textAlign:'center',padding:'24px 0',
            fontFamily:"'Cormorant Infant',serif",fontSize:16,
            fontStyle:'italic',color:C.text3}}>
            История обслуживания пуста.<br/>Добавьте первую запись.
          </div>
        )}

        {log.map((entry,i) => (
          <div key={entry.id} style={{padding:'12px 0',
            borderBottom:i<log.length-1?`1px solid ${C.lineS}`:'none',
            display:'flex',gap:12,alignItems:'flex-start'}}>
            <span style={{fontSize:22,flexShrink:0}}>{entry.typeEmoji}</span>
            <div style={{flex:1}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:14,color:C.navy,
                  fontWeight:600,letterSpacing:1}}>{entry.typeLabel}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                  color:C.text3}}>{fmtDate(entry.date)}</div>
              </div>
              {entry.desc && (
                <div style={{fontFamily:"'Crimson Pro',serif",fontSize:14,
                  color:C.text2,lineHeight:1.5,marginBottom:4}}>{entry.desc}</div>
              )}
              <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                {entry.mileage && (
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.text3}}>
                    📍 {Number(entry.mileage).toLocaleString('ru')} км
                  </span>
                )}
                {entry.cost && (
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.goldDeep}}>
                    💰 {Number(entry.cost).toLocaleString('ru')} ₸
                  </span>
                )}
                {entry.nextDate && (
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.success}}>
                    🔜 след. {fmtDate(entry.nextDate)}
                  </span>
                )}
              </div>
            </div>
            <button onClick={()=>removeEntry(entry.id)}
              style={{background:'none',border:'none',color:C.text3,
                fontSize:16,cursor:'pointer',padding:'0 4px'}}>×</button>
          </div>
        ))}

        {log.length > 0 && (
          <div style={{marginTop:12,paddingTop:10,borderTop:`1px solid ${C.lineS}`,
            display:'flex',justifyContent:'space-between',
            fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.text3}}>
            <span>Записей: {log.length}</span>
            <span>Итого: {log.reduce((s,e)=>s+Number(e.cost||0),0).toLocaleString('ru')} ₸</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ИИ ПЛАНИРОВАНИЕ ТО ───
function AiMaintenancePlanner({ profile, tasks, setTasks, notify }) {
  const [plan, setPlan] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ld_car_ai_plan')||'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const prompt = `Ты — опытный автомеханик. Составь план техобслуживания.
Автомобиль: ${profile.carModel||'не указан'} ${profile.carYear||''}
Пробег: ${profile.carMileage||'не указан'} км
Последнее ТО: ${profile.carLastTO ? fmtDate(profile.carLastTO) : 'не указано'}
Тип резины: ${profile.carTireType||'не указан'}
Страховка до: ${profile.carInsurance ? fmtDate(profile.carInsurance) : 'не указана'}
Техосмотр до: ${profile.carTechCheck ? fmtDate(profile.carTechCheck) : 'не указан'}
Текущий месяц: ${new Date().getMonth()+1}

Ответь ТОЛЬКО JSON (без markdown):
{
  "urgent": [{"title":"...","desc":"...","emoji":"...","deadline":"..."}],
  "planned": [{"title":"...","desc":"...","emoji":"...","when":"...","mileage":"..."}],
  "seasonal": [{"title":"...","desc":"...","emoji":"..."}],
  "summary": "общий вывод о состоянии авто"
}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,
          messages:[{role:'user',content:prompt}]}),
      });
      const data = await response.json();
      const text = data.content?.find(b=>b.type==='text')?.text||'';
      const parsed = JSON.parse(text.replace(/```json|```/g,'').trim());
      setPlan(parsed);
      try { localStorage.setItem('ld_car_ai_plan', JSON.stringify(parsed)); } catch {}
    } catch(e) {
      notify?.('❌ Ошибка загрузки плана');
    } finally { setLoading(false); }
  };

  const addToTasks = (item, deadline) => {
    setTasks(p => [...p, {
      id:Date.now(), title:item.title, section:'car',
      freq:'once', priority:'h', preferredTime:'10:00',
      dueDate:deadline||'', doneDate:'', notes:item.desc,
      isCarEvent:true,
    }]);
    notify?.(`✅ "${item.title}" добавлено в задачи`);
  };

  return (
    <div style={{position:'relative',borderRadius:14,overflow:'hidden',
      marginBottom:14,border:`1.5px solid ${C.line}`,
      boxShadow:`0 4px 16px rgba(10,37,64,0.12)`}}>
      <img src="/car/car-maintenance.jpg" alt=""
        style={{position:'absolute',inset:0,width:'100%',height:'100%',
          objectFit:'cover',opacity:0.12,pointerEvents:'none'}}
        onError={e=>e.target.style.display='none'}/>
      <div style={{position:'absolute',inset:0,
        background:`linear-gradient(160deg,rgba(250,243,224,0.96) 0%,rgba(240,230,205,0.95) 100%)`,
        backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(10,37,64,0.03) 28px)`}}/>
      <div style={{position:'absolute',top:7,left:7,width:12,height:12,
        borderTop:`2px solid ${C.gold}`,borderLeft:`2px solid ${C.gold}`,opacity:0.8}}/>
      <div style={{position:'absolute',bottom:7,right:7,width:12,height:12,
        borderBottom:`2px solid ${C.gold}`,borderRight:`2px solid ${C.gold}`,opacity:0.8}}/>

      <div style={{position:'relative',zIndex:1,padding:18}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
          marginBottom:14,paddingBottom:12,borderBottom:`1.5px solid ${C.line}`}}>
          <div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
              letterSpacing:3,color:C.text3,textTransform:'uppercase',marginBottom:3}}>
              Искусственный интеллект
            </div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,
              color:C.navy,letterSpacing:2,textTransform:'uppercase'}}>
              🤖 План ТО
            </div>
          </div>
          <Btn onClick={generate} disabled={loading} variant='primary' size='sm'>
            {loading ? '⏳...' : plan ? '🔄 Обновить' : '✨ Составить'}
          </Btn>
        </div>

        {loading && (
          <div style={{textAlign:'center',padding:'24px 0',
            fontFamily:"'Cormorant Infant',serif",fontSize:16,
            fontStyle:'italic',color:C.text3}}>ИИ анализирует данные вашего авто...</div>
        )}

        {plan && !loading && (
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {plan.summary && (
              <div style={{padding:'12px 14px',borderRadius:8,
                background:`rgba(10,37,64,0.04)`,borderLeft:`3px solid ${C.gold}`,
                fontFamily:"'Crimson Pro',serif",fontSize:16,color:C.text2,lineHeight:1.65}}>
                {plan.summary}
              </div>
            )}

            {plan.urgent?.length > 0 && (
              <div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
                  letterSpacing:2,color:C.error,textTransform:'uppercase',marginBottom:10}}>
                  🚨 Срочно
                </div>
                {plan.urgent.map((item,i) => (
                  <div key={i} style={{display:'flex',gap:10,padding:'10px 12px',
                    borderRadius:8,background:'rgba(107,16,16,0.06)',
                    border:`1px solid rgba(107,16,16,0.18)`,marginBottom:8,
                    alignItems:'flex-start'}}>
                    <span style={{fontSize:22,flexShrink:0}}>{item.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"'Cinzel',serif",fontSize:14,color:C.error,fontWeight:600}}>{item.title}</div>
                      <div style={{fontFamily:"'Crimson Pro',serif",fontSize:14,color:C.text2,marginTop:3}}>{item.desc}</div>
                      {item.deadline && <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.error,marginTop:4}}>до {item.deadline}</div>}
                    </div>
                    <Btn onClick={()=>addToTasks(item,item.deadline)} variant='danger' size='sm'>+ Задача</Btn>
                  </div>
                ))}
              </div>
            )}

            {plan.planned?.length > 0 && (
              <div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
                  letterSpacing:2,color:C.navyMid,textTransform:'uppercase',marginBottom:10}}>
                  📋 Плановое ТО
                </div>
                {plan.planned.map((item,i) => (
                  <div key={i} style={{display:'flex',gap:10,padding:'10px 12px',
                    borderRadius:8,background:`rgba(10,37,64,0.04)`,
                    border:`1px solid ${C.lineS}`,marginBottom:8,alignItems:'flex-start'}}>
                    <span style={{fontSize:22,flexShrink:0}}>{item.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"'Cinzel',serif",fontSize:14,color:C.navy,fontWeight:600}}>{item.title}</div>
                      <div style={{fontFamily:"'Crimson Pro',serif",fontSize:14,color:C.text2,marginTop:3}}>{item.desc}</div>
                      <div style={{display:'flex',gap:10,marginTop:4,flexWrap:'wrap'}}>
                        {item.when && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.text3}}>📅 {item.when}</span>}
                        {item.mileage && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.text3}}>📍 {item.mileage}</span>}
                      </div>
                    </div>
                    <Btn onClick={()=>addToTasks(item)} variant='ghost' size='sm'>+ Задача</Btn>
                  </div>
                ))}
              </div>
            )}

            {plan.seasonal?.length > 0 && (
              <div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
                  letterSpacing:2,color:C.warn,textTransform:'uppercase',marginBottom:10}}>
                  🌤️ Сезонное
                </div>
                {plan.seasonal.map((item,i) => (
                  <div key={i} style={{display:'flex',gap:10,padding:'10px 12px',
                    borderRadius:8,background:`rgba(196,155,42,0.06)`,
                    border:`1px solid rgba(196,155,42,0.22)`,marginBottom:8,alignItems:'flex-start'}}>
                    <span style={{fontSize:22,flexShrink:0}}>{item.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"'Cinzel',serif",fontSize:14,color:C.warn,fontWeight:600}}>{item.title}</div>
                      <div style={{fontFamily:"'Crimson Pro',serif",fontSize:14,color:C.text2,marginTop:3}}>{item.desc}</div>
                    </div>
                    <Btn onClick={()=>addToTasks(item)} variant='ghost' size='sm'>+ Задача</Btn>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!plan && !loading && (
          <div style={{textAlign:'center',padding:'24px 0',
            fontFamily:"'Cormorant Infant',serif",fontSize:16,
            fontStyle:'italic',color:C.text3}}>
            ИИ составит персональный план ТО с учётом марки, пробега и сезона
          </div>
        )}
      </div>
    </div>
  );
}

// ─── СОВЕТЫ И ЛАЙФХАКИ ───
function CarTips({ profile, notify }) {
  const STORAGE_KEY = `ld_car_tips_${(profile.carModel||'').replace(/\s/g,'_')}`;
  const [tips, setTips] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY+'_saved')||'[]'); } catch { return []; }
  });

  const generate = async () => {
    setLoading(true);
    try {
      const prompt = `Ты — опытный автоэксперт. Дай советы для владельца ${profile.carModel||'автомобиля'} ${profile.carYear||''}.
Пробег: ${profile.carMileage||'не указан'} км. Топливо: ${profile.carFuel||'бензин'}.

Ответь ТОЛЬКО JSON (без markdown):
{
  "model_tips": ["5 специфичных советов для этой марки/модели"],
  "economy": ["3 совета по экономии топлива"],
  "longevity": ["3 совета для продления ресурса"],
  "common_issues": ["3 типичные проблемы этой модели и как их избежать"],
  "lifehacks": ["5 лайфхаков для автомобилиста"]
}`;
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,
          messages:[{role:'user',content:prompt}]}),
      });
      const data = await response.json();
      const text = data.content?.find(b=>b.type==='text')?.text||'';
      const parsed = JSON.parse(text.replace(/```json|```/g,'').trim());
      setTips(parsed);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed)); } catch {}
    } catch(e) {
      notify?.('❌ Ошибка загрузки советов');
    } finally { setLoading(false); }
  };

  const saveTip = (tip) => {
    if (saved.includes(tip)) return;
    const next = [...saved, tip];
    setSaved(next);
    try { localStorage.setItem(STORAGE_KEY+'_saved', JSON.stringify(next)); } catch {}
    notify?.('📌 Совет сохранён');
  };

  const removeSaved = (tip) => {
    const next = saved.filter(t=>t!==tip);
    setSaved(next);
    try { localStorage.setItem(STORAGE_KEY+'_saved', JSON.stringify(next)); } catch {}
  };

  const SECTIONS_MAP = [
    { key:'model_tips',    label:'Советы по модели',        emoji:'🚗' },
    { key:'economy',       label:'Экономия топлива',         emoji:'⛽' },
    { key:'longevity',     label:'Долголетие авто',          emoji:'🛡️' },
    { key:'common_issues', label:'Типичные проблемы',        emoji:'⚠️' },
    { key:'lifehacks',     label:'Лайфхаки',                 emoji:'💡' },
  ];

  return (
    <div style={{position:'relative',borderRadius:14,overflow:'hidden',
      marginBottom:14,border:`1.5px solid ${C.line}`,
      boxShadow:`0 4px 16px rgba(10,37,64,0.12)`}}>
      <img src="/car/car-tips.jpg" alt=""
        style={{position:'absolute',inset:0,width:'100%',height:'100%',
          objectFit:'cover',opacity:0.12,pointerEvents:'none'}}
        onError={e=>e.target.style.display='none'}/>
      <div style={{position:'absolute',inset:0,
        background:`linear-gradient(160deg,rgba(250,243,224,0.96) 0%,rgba(240,230,205,0.95) 100%)`,
        backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(10,37,64,0.03) 28px)`}}/>
      <div style={{position:'absolute',top:7,left:7,width:12,height:12,
        borderTop:`2px solid ${C.gold}`,borderLeft:`2px solid ${C.gold}`,opacity:0.8}}/>
      <div style={{position:'absolute',bottom:7,right:7,width:12,height:12,
        borderBottom:`2px solid ${C.gold}`,borderRight:`2px solid ${C.gold}`,opacity:0.8}}/>

      <div style={{position:'relative',zIndex:1,padding:18}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
          marginBottom:14,paddingBottom:12,borderBottom:`1.5px solid ${C.line}`}}>
          <div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
              letterSpacing:3,color:C.text3,textTransform:'uppercase',marginBottom:3}}>
              {profile.carModel||'Автомобиль'}
            </div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,
              color:C.navy,letterSpacing:2,textTransform:'uppercase'}}>
              💡 Советы и лайфхаки
            </div>
          </div>
          <Btn onClick={generate} disabled={loading} variant='primary' size='sm'>
            {loading ? '⏳...' : tips ? '🔄' : '✨ ИИ'}
          </Btn>
        </div>

        {/* Сохранённые советы */}
        {saved.length > 0 && (
          <div style={{marginBottom:16,padding:12,background:`rgba(212,175,55,0.08)`,
            borderRadius:10,border:`1px solid rgba(212,175,55,0.25)`,
            borderLeft:`3px solid ${C.gold}`}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
              letterSpacing:2,color:C.goldDeep,textTransform:'uppercase',marginBottom:10}}>
              📌 Сохранённые советы
            </div>
            {saved.map((tip,i) => (
              <div key={i} style={{display:'flex',gap:8,padding:'6px 0',
                borderBottom:`1px solid rgba(212,175,55,0.15)`}}>
                <span style={{fontFamily:"'Crimson Pro',serif",fontSize:14,
                  color:C.text1,flex:1,lineHeight:1.5}}>· {tip}</span>
                <button onClick={()=>removeSaved(tip)}
                  style={{background:'none',border:'none',color:C.text3,
                    fontSize:14,cursor:'pointer',padding:'0 4px'}}>×</button>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div style={{textAlign:'center',padding:'24px 0',
            fontFamily:"'Cormorant Infant',serif",fontSize:16,
            fontStyle:'italic',color:C.text3}}>Собираю советы для вашего авто...</div>
        )}

        {tips && !loading && SECTIONS_MAP.map(sec => {
          const items = tips[sec.key]||[];
          if (!items.length) return null;
          return (
            <div key={sec.key} style={{marginBottom:14}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
                letterSpacing:2,color:C.navyMid,textTransform:'uppercase',
                marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:14}}>{sec.emoji}</span>{sec.label}
              </div>
              {items.map((tip,i) => (
                <div key={i} style={{display:'flex',gap:8,padding:'9px 0',
                  borderBottom:`1px solid ${C.lineS}`,alignItems:'flex-start'}}>
                  <span style={{color:C.gold,fontWeight:700,flexShrink:0,marginTop:1}}>·</span>
                  <span style={{fontFamily:"'Crimson Pro',serif",fontSize:15,
                    color:C.text1,flex:1,lineHeight:1.55}}>{tip}</span>
                  <button onClick={()=>saveTip(tip)}
                    style={{background:'none',border:'none',color:saved.includes(tip)?C.gold:C.text3,
                      fontSize:18,cursor:'pointer',padding:'0 4px',flexShrink:0}}
                    title="Сохранить совет">
                    {saved.includes(tip)?'📌':'🔖'}
                  </button>
                </div>
              ))}
            </div>
          );
        })}

        {!tips && !loading && (
          <div style={{textAlign:'center',padding:'24px 0',
            fontFamily:"'Cormorant Infant',serif",fontSize:16,
            fontStyle:'italic',color:C.text3}}>
            ИИ даст советы специально для вашей марки и модели
          </div>
        )}
      </div>
    </div>
  );
}


// ─── ДОКУМЕНТЫ И СТРАХОВКА ───
function CarDocuments({ profile, setProfile, tasks, setTasks, notify }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    carInsurance:     profile.carInsurance     || '',
    carInsuranceCo:   profile.carInsuranceCo   || '',
    carInsuranceNum:  profile.carInsuranceNum  || '',
    carInsuranceCost: profile.carInsuranceCost || '',
    carTechCheck:     profile.carTechCheck     || '',
    carTechCheckCo:   profile.carTechCheckCo   || '',
    carDriveLicense:  profile.carDriveLicense  || '',
    carRegistration:  profile.carRegistration  || '',
    carKaskoExpiry:   profile.carKaskoExpiry   || '',
    carKasko:         profile.carKasko         || '',
  });

  useEffect(() => {
    if (editing) {
      setForm({
        carInsurance:     profile.carInsurance     || '',
        carInsuranceCo:   profile.carInsuranceCo   || '',
        carInsuranceNum:  profile.carInsuranceNum  || '',
        carInsuranceCost: profile.carInsuranceCost || '',
        carTechCheck:     profile.carTechCheck     || '',
        carTechCheckCo:   profile.carTechCheckCo   || '',
        carDriveLicense:  profile.carDriveLicense  || '',
        carRegistration:  profile.carRegistration  || '',
        carKaskoExpiry:   profile.carKaskoExpiry   || '',
        carKasko:         profile.carKasko         || '',
      });
    }
  }, [editing]);

  const save = () => {
    setProfile(p => ({ ...p, ...form }));
    setEditing(false);
    notify?.('✅ Документы сохранены');
  };

  const addReminderToTasks = (title, dueDate) => {
    if (!dueDate) { notify?.('⚠️ Укажите дату'); return; }
    setTasks(p => [...p, {
      id: Date.now(), title, section: 'car',
      freq: 'once', priority: 'h', preferredTime: '10:00',
      dueDate, doneDate: '', notes: title, isCarEvent: true,
    }]);
    notify?.(`✅ Напоминание добавлено в задачи`);
  };

  // Расчёт дней
  const insDays  = daysLeft(profile.carInsurance);
  const tchDays  = daysLeft(profile.carTechCheck);
  const kaskoDays = daysLeft(profile.carKaskoExpiry);
  const licDays  = daysLeft(profile.carDriveLicense);
  const regDays  = daysLeft(profile.carRegistration);

  const statusColor = (days) => {
    if (days === null) return C.text3;
    if (days < 0)  return C.error;
    if (days < 14) return C.error;
    if (days < 30) return C.warn;
    if (days < 60) return C.goldDeep;
    return C.success;
  };

  const statusText = (days) => {
    if (days === null) return 'не указано';
    if (days < 0)  return `Просрочено на ${Math.abs(days)} дн.`;
    if (days === 0) return 'Истекает сегодня!';
    return `${days} дн.`;
  };

  const docs = [
    { label:'🛡️ ОС страхование (ОС)', expiry:profile.carInsurance,   days:insDays,  reminderTitle:'Продлить ОС страховку' },
    { label:'🚗 КАСКО',               expiry:profile.carKaskoExpiry, days:kaskoDays, reminderTitle:'Продлить КАСКО' },
    { label:'🔍 Техосмотр',           expiry:profile.carTechCheck,   days:tchDays,  reminderTitle:'Пройти техосмотр' },
    { label:'🪪 Водительское удост.', expiry:profile.carDriveLicense, days:licDays,  reminderTitle:'Обновить водительское удостоверение' },
    { label:'📄 Тех. паспорт (рег.)', expiry:profile.carRegistration, days:regDays,  reminderTitle:'Обновить технический паспорт' },
  ];

  return (
    <div style={{position:'relative',borderRadius:14,overflow:'hidden',
      marginBottom:14,border:`1.5px solid ${C.line}`,
      boxShadow:`0 4px 16px rgba(10,37,64,0.12)`}}>
      <img src="/car/car-insurance.jpg" alt=""
        style={{position:'absolute',inset:0,width:'100%',height:'100%',
          objectFit:'cover',opacity:0.14,pointerEvents:'none'}}
        onError={e=>e.target.style.display='none'}/>
      <div style={{position:'absolute',inset:0,
        background:`linear-gradient(160deg,rgba(250,243,224,0.96) 0%,rgba(240,230,205,0.95) 100%)`,
        backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(10,37,64,0.03) 28px)`}}/>
      <div style={{position:'absolute',top:7,left:7,width:12,height:12,
        borderTop:`2px solid ${C.gold}`,borderLeft:`2px solid ${C.gold}`,opacity:0.8}}/>
      <div style={{position:'absolute',bottom:7,right:7,width:12,height:12,
        borderBottom:`2px solid ${C.gold}`,borderRight:`2px solid ${C.gold}`,opacity:0.8}}/>

      <div style={{position:'relative',zIndex:1,padding:18}}>
        {/* Заголовок */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
          marginBottom:14,paddingBottom:12,borderBottom:`1.5px solid ${C.line}`}}>
          <div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
              letterSpacing:3,color:C.text3,textTransform:'uppercase',marginBottom:3}}>
              Сроки действия
            </div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,
              color:C.navy,letterSpacing:2,textTransform:'uppercase'}}>
              📋 Документы
            </div>
          </div>
          <Btn onClick={()=>setEditing(!editing)} variant={editing?'ghost':'primary'} size='sm'>
            {editing ? 'Отмена' : '✏️ Изменить'}
          </Btn>
        </div>

        {/* Дашборд документов */}
        {!editing && (
          <>
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
              {docs.map((doc,i) => {
                const color = statusColor(doc.days);
                const expired = doc.days !== null && doc.days < 0;
                const soon = doc.days !== null && doc.days >= 0 && doc.days < 30;
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,
                    padding:'11px 14px',borderRadius:10,
                    background: expired ? 'rgba(107,16,16,0.07)' :
                                soon    ? 'rgba(196,155,42,0.08)' :
                                          'rgba(10,37,64,0.04)',
                    border:`1px solid ${expired?'rgba(107,16,16,0.25)':soon?'rgba(196,155,42,0.25)':C.lineS}`,
                    borderLeft:`3px solid ${color}`,
                  }}>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"'Crimson Pro',serif",fontSize:15,
                        color:C.text1,fontWeight:600,marginBottom:2}}>{doc.label}</div>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                        color:C.text3,letterSpacing:0.5}}>
                        {doc.expiry ? `до ${fmtDate(doc.expiry)}` : 'не указано'}
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",
                        fontSize:12,color,fontWeight:700}}>
                        {statusText(doc.days)}
                      </div>
                      {doc.expiry && (
                        <button onClick={()=>addReminderToTasks(doc.reminderTitle,
                          doc.expiry ? (() => {
                            const d = new Date(doc.expiry);
                            d.setDate(d.getDate()-14);
                            return d.toISOString().split('T')[0];
                          })() : ''
                        )}
                          style={{background:'none',border:'none',
                            fontFamily:"'JetBrains Mono',monospace",
                            fontSize:9,color:C.navyMid,cursor:'pointer',
                            letterSpacing:1,textDecoration:'underline',marginTop:3}}>
                          + напомнить за 14 дн.
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Детали страховки */}
            {(profile.carInsuranceCo || profile.carInsuranceNum || profile.carInsuranceCost) && (
              <div style={{padding:'12px 14px',borderRadius:10,
                background:`rgba(10,37,64,0.04)`,border:`1px solid ${C.lineS}`,
                borderLeft:`3px solid ${C.gold}`}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
                  letterSpacing:2,color:C.navyMid,textTransform:'uppercase',marginBottom:10}}>
                  🛡️ Детали страховки
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[
                    ['Страховая компания', profile.carInsuranceCo],
                    ['Номер полиса',       profile.carInsuranceNum],
                    ['Стоимость полиса',   profile.carInsuranceCost ? profile.carInsuranceCost+' ₸' : ''],
                    ['Компания техосмотра',profile.carTechCheckCo],
                  ].filter(([,v])=>v).map(([label,value])=>(
                    <div key={label} style={{padding:'8px 10px',
                      background:'rgba(255,255,255,0.6)',borderRadius:8}}>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
                        color:C.text3,marginBottom:3,letterSpacing:0.5}}>{label}</div>
                      <div style={{fontFamily:"'Crimson Pro',serif",fontSize:14,
                        color:C.text1,fontWeight:500}}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ссылки на страховые КЗ */}
            <div style={{marginTop:14,paddingTop:12,borderTop:`1px solid ${C.lineS}`}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
                letterSpacing:2,color:C.text3,textTransform:'uppercase',marginBottom:10}}>
                🔗 Страховые компании Казахстана
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {[
                  {name:'Kolesa.kz — страховка',url:'https://kolesa.kz/strahovka/',emoji:'🚗'},
                  {name:'Jusan Insurance',url:'https://insurance.jysanbank.kz',emoji:'🛡️'},
                  {name:'Nomad Insurance',url:'https://www.nomad.kz',emoji:'⭐'},
                  {name:'Halyk Insurance',url:'https://www.halykinsurance.kz',emoji:'🏦'},
                  {name:'Freedom Finance Insurance',url:'https://ffins.kz',emoji:'💼'},
                ].map(site=>(
                  <a key={site.name} href={site.url} target="_blank" rel="noopener noreferrer"
                    style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',
                      borderRadius:8,background:`rgba(10,37,64,0.04)`,
                      border:`1px solid ${C.lineS}`,textDecoration:'none',transition:'all .2s'}}>
                    <span style={{fontSize:18}}>{site.emoji}</span>
                    <span style={{fontFamily:"'Crimson Pro',serif",fontSize:15,
                      color:C.navy,flex:1}}>{site.name}</span>
                    <span style={{color:C.gold,fontSize:14}}>→</span>
                  </a>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Форма редактирования */}
        {editing && (
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
              letterSpacing:2,color:C.navyMid,textTransform:'uppercase',
              marginBottom:12}}>🛡️ ОС Страхование</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Field label="Действует до"><Inp value={form.carInsurance} onChange={e=>setForm(p=>({...p,carInsurance:e.target.value}))} type="date"/></Field>
              <Field label="Стоимость (₸)"><Inp value={form.carInsuranceCost} onChange={e=>setForm(p=>({...p,carInsuranceCost:e.target.value}))} type="number" placeholder="45000"/></Field>
            </div>
            <Field label="Страховая компания"><Inp value={form.carInsuranceCo} onChange={e=>setForm(p=>({...p,carInsuranceCo:e.target.value}))} placeholder="Nomad Insurance"/></Field>
            <Field label="Номер полиса"><Inp value={form.carInsuranceNum} onChange={e=>setForm(p=>({...p,carInsuranceNum:e.target.value}))} placeholder="ОС-123456"/></Field>

            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
              letterSpacing:2,color:C.navyMid,textTransform:'uppercase',
              margin:'12px 0 8px'}}>🚗 КАСКО</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Field label="КАСКО до"><Inp value={form.carKaskoExpiry} onChange={e=>setForm(p=>({...p,carKaskoExpiry:e.target.value}))} type="date"/></Field>
              <Field label="Компания КАСКО"><Inp value={form.carKasko} onChange={e=>setForm(p=>({...p,carKasko:e.target.value}))} placeholder="Halyk Insurance"/></Field>
            </div>

            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
              letterSpacing:2,color:C.navyMid,textTransform:'uppercase',
              margin:'12px 0 8px'}}>🔍 Техосмотр</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Field label="Техосмотр до"><Inp value={form.carTechCheck} onChange={e=>setForm(p=>({...p,carTechCheck:e.target.value}))} type="date"/></Field>
              <Field label="Станция техосмотра"><Inp value={form.carTechCheckCo} onChange={e=>setForm(p=>({...p,carTechCheckCo:e.target.value}))} placeholder="СТО Алматы"/></Field>
            </div>

            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,
              letterSpacing:2,color:C.navyMid,textTransform:'uppercase',
              margin:'12px 0 8px'}}>📄 Прочие документы</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Field label="Вод. удост. до"><Inp value={form.carDriveLicense} onChange={e=>setForm(p=>({...p,carDriveLicense:e.target.value}))} type="date"/></Field>
              <Field label="Тех. паспорт до"><Inp value={form.carRegistration} onChange={e=>setForm(p=>({...p,carRegistration:e.target.value}))} type="date"/></Field>
            </div>

            <div style={{marginTop:8}}>
              <Btn onClick={save} variant='primary' style={{width:'100%'}}>💾 Сохранить документы</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ГЛАВНЫЙ КОМПОНЕНТ ───
export function CarSection() {
  const { profile, setProfile, tasks, setTasks, notify } = useApp();

  // Если нет авто — показываем кнопку добавления
  if (!profile || profile.hasCar !== 'Да') {
    return (
      <div className="page" style={{textAlign:'center',padding:'40px 16px'}}>
        <div style={{fontSize:64,marginBottom:16}}>🚗</div>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:20,color:C.navy,
          letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>
          Мой автомобиль
        </div>
        <div style={{fontFamily:"'Crimson Pro',serif",fontSize:16,color:C.text3,marginBottom:24}}>
          Добавьте данные вашего автомобиля
        </div>
        <Btn onClick={()=>setProfile(p=>({...p,hasCar:'Да'}))} variant='primary'>
          🚗 Добавить автомобиль
        </Btn>
      </div>
    );
  }

  return (
    <div className="page" style={{paddingBottom:80}}>
      <CarHero profile={profile}/>
      <CarInfoCard profile={profile} setProfile={setProfile} notify={notify}/>
      <CarDocuments profile={profile} setProfile={setProfile} tasks={tasks} setTasks={setTasks} notify={notify}/>
      <ServiceBook profile={profile} tasks={tasks} setTasks={setTasks} notify={notify}/>
      <AiMaintenancePlanner profile={profile} tasks={tasks} setTasks={setTasks} notify={notify}/>
      <CarTips profile={profile} notify={notify}/>
    </div>
  );
                }
