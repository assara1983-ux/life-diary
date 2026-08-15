// src/sections/ScheduleSection.jsx
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { TaskModal } from '../components/TaskModal';

const C = {
  navy:'#0A2540', navyMid:'#1E3A5F',
  gold:'#D4AF37', goldDeep:'#B8941E', goldPale:'#F0DC90',
  bg:'#F5E8C7', bgCard:'#FAF3E0', bgCard2:'#F2E8CE',
  text1:'#0A2540', text2:'#1E3A5F', text3:'#4A6480',
  success:'#1A4D2E', error:'#6B1010',
  line:'rgba(10,37,64,0.22)', lineS:'rgba(10,37,64,0.10)',
};

function localDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function isDueOnDay(task, dStr) {
  const d = new Date(dStr+'T00:00:00');
  if (task.dueDate && dStr < task.dueDate) return false;
  if (!task.freq) return !!task.dueDate && dStr === task.dueDate;
  if (task.freq === 'once') return task.dueDate === dStr;
  if (task.freq === 'daily') return true;
  if (task.freq === 'workdays') { const dn=d.getDay(); return dn>=1&&dn<=5; }
  if (task.freq.startsWith('weekly:')) return task.freq.split(':')[1].split(',').map(Number).includes(d.getDay());
  if (task.freq.startsWith('every:')) {
    const n=parseInt(task.freq.split(':')[1]);
    const start=task.dueDate||task.beautyStartDate||task.createdAt?.split('T')[0]||'2024-01-01';
    if (dStr<start) return false;
    return Math.floor((new Date(dStr+'T00:00:00')-new Date(start+'T00:00:00'))/86400000)%n===0;
  }
  if (task.freq.startsWith('monthly:')) return task.freq.split(':')[1].split(',').map(Number).includes(d.getDate());
  return false;
}

function addMinutes(time, mins) {
  if (!time) return '';
  const [h,m]=time.split(':').map(Number);
  const t=h*60+m+(mins||0);
  return `${String(Math.floor(t/60)%24).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
}

function timeToMinutes(time) {
  if (!time) return 9999;
  const [h,m]=time.split(':').map(Number);
  return h*60+m;
}

// Иконка раздела
function sectionIcon(section) {
  return { home:'🏠', beauty:'✨', car:'🚗', travel:'✈️', work:'💼', shopping:'🛒', pets:'🐾', health:'❤️' }[section] || '📋';
}
function sectionColor(section) {
  return { home:'#2D6A4F', beauty:'rgba(184,107,93,1)', car:'#8B6914', travel:'#1E3A5F', work:'#1D4E5F', shopping:'#6B1010', pets:'#4A2D6A', health:'#c0392b' }[section] || C.navyMid;
}

export function ScheduleSection() {
  const { profile, tasks, setTasks, notify } = useApp();
  const [view,setView]=useState('week');
  const [offset,setOffset]=useState(0);
  const [selectedDay,setSelectedDay]=useState(null);
  const [taskModal,setTaskModal]=useState(null);

  const todayStr=localDateStr(new Date());
  const now=new Date();
  const startOfWeek=new Date(now);
  const dayOfWeek=now.getDay()===0?6:now.getDay()-1;
  startOfWeek.setDate(now.getDate()-dayOfWeek+offset*7);
  startOfWeek.setHours(0,0,0,0);
  const weekDays=Array.from({length:7},(_,i)=>{ const d=new Date(startOfWeek); d.setDate(startOfWeek.getDate()+i); return d; });
  const DAY_RU=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  const MONTH_RU=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

  const toggleTask=(id,dStr)=>setTasks(p=>p.map(t=>t.id===id?{...t,doneDate:t.doneDate===dStr?null:dStr,lastDone:t.doneDate===dStr?t.lastDone:dStr}:t));
  const toggleBeautyBlock=(bTasks,dStr)=>{
    const allDone=bTasks.every(t=>t.doneDate===dStr);
    setTasks(p=>p.map(t=>bTasks.find(b=>b.id===t.id)?{...t,doneDate:allDone?null:dStr,lastDone:allDone?t.lastDone:dStr}:t));
  };

  // Собираем события для дня
  function getDayEvents(dStr) {
    const anchors=[];
    if (profile?.wake)  anchors.push({type:'anchor',time:profile.wake,  label:'☀️ Подъём'});
    if (profile?.sleep) anchors.push({type:'anchor',time:profile.sleep, label:'🌙 Отбой'});
    const isWork=(profile?.workDaysList||[1,2,3,4,5]).includes(new Date(dStr+'T00:00:00').getDay());
    if (isWork&&profile?.workStart) anchors.push({type:'anchor',time:profile.workStart,label:'💼 Работа'});
    if (isWork&&profile?.workEnd)   anchors.push({type:'anchor',time:profile.workEnd,  label:'💼 Конец'});

    const regular=tasks
      .filter(t=>t.section!=='beauty'&&(t.preferredTime||t.dueDate===dStr)&&(isDueOnDay(t,dStr)||t.doneDate===dStr))
      .map(t=>({type:'task',time:t.preferredTime||'00:00',task:t}));

    const beautyDue=tasks.filter(t=>t.section==='beauty'&&t.preferredTime&&(isDueOnDay(t,dStr)||t.doneDate===dStr));
    const beautyBlocks=[];
    if (beautyDue.length>0) {
      const sorted=[...beautyDue].sort((a,b)=>(a.preferredTime||'').localeCompare(b.preferredTime||''));
      let cur=[sorted[0]];
      for (let j=1;j<sorted.length;j++) {
        const prev=cur[cur.length-1];
        const gap=timeToMinutes(sorted[j].preferredTime)-timeToMinutes(addMinutes(prev.preferredTime,prev.beautyDuration||10));
        if (gap<=15) cur.push(sorted[j]); else { beautyBlocks.push(cur); cur=[sorted[j]]; }
      }
      beautyBlocks.push(cur);
    }
    const beauty=beautyBlocks.map(block=>({type:'beauty',time:block[0].preferredTime,endTime:addMinutes(block[block.length-1].preferredTime,block[block.length-1].beautyDuration||10),block,allDone:block.every(t=>t.doneDate===dStr)}));
    return [...anchors,...regular,...beauty].sort((a,b)=>timeToMinutes(a.time)-timeToMinutes(b.time));
  }

  return (
    <div style={{paddingBottom:80}}>

      {/* ── Маленькая шапка ── */}
      <div style={{position:'relative',height:100,borderRadius:14,overflow:'hidden',
        marginBottom:20,boxShadow:`0 4px 16px rgba(10,37,64,0.18)`}}>
        <img src="/sections/schedule.jpg" alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}
          onError={e=>e.target.style.display='none'}/>
        <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(10,25,45,0.85) 0%,rgba(10,25,45,0.30) 100%)'}}/>
        <div style={{position:'absolute',top:8,left:10,width:12,height:12,borderTop:`2px solid ${C.gold}`,borderLeft:`2px solid ${C.gold}`,opacity:0.9}}/>
        <div style={{position:'absolute',bottom:8,right:10,width:12,height:12,borderBottom:`2px solid ${C.gold}`,borderRight:`2px solid ${C.gold}`,opacity:0.9}}/>
        <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'10px 16px 12px'}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:3,color:C.goldPale,textTransform:'uppercase',marginBottom:3,opacity:0.85}}>
            {weekDays[0].getDate()} – {weekDays[6].getDate()} {MONTH_RU[weekDays[6].getMonth()]} {weekDays[6].getFullYear()}
          </div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:20,fontWeight:700,color:'#fff',letterSpacing:3,textTransform:'uppercase',textShadow:'0 2px 8px rgba(0,0,0,0.6)'}}>
            Расписание
          </div>
        </div>
      </div>

      {/* ── Вкладки ── */}
      <div style={{display:'flex',gap:4,marginBottom:20,
        background:`rgba(10,37,64,0.05)`,border:`1.5px solid ${C.line}`,borderRadius:8,padding:4}}>
        {[['week','🗓️ Неделя'],['ai','✨ ИИ-план']].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)} style={{flex:1,padding:'12px 0',border:'none',borderRadius:6,cursor:'pointer',
            fontFamily:"'Cinzel',serif",fontSize:14,letterSpacing:2,textTransform:'uppercase',
            background:view===v?C.navy:'transparent',
            color:view===v?C.goldPale:C.text3,
            fontWeight:view===v?700:400,
            boxShadow:view===v?`0 2px 8px rgba(10,37,64,0.22)`:'none',
            transition:'all 0.2s'}}>
            {l}
          </button>
        ))}
      </div>

      {view==='week' && (
        <div>
          {/* ── Навигация ── */}
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
            <button onClick={()=>{setOffset(o=>o-1);setSelectedDay(null);}} style={{
              padding:'10px 16px',borderRadius:8,border:`1.5px solid ${C.line}`,
              background:'transparent',cursor:'pointer',fontSize:16,color:C.navyMid}}>←</button>
            <div style={{flex:1,textAlign:'center'}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:15,color:C.navy,fontWeight:700,letterSpacing:1.5}}>
                {offset===0?'Эта неделя':`${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${MONTH_RU[weekDays[6].getMonth()]}`}
              </div>
            </div>
            <button onClick={()=>{setOffset(o=>o+1);setSelectedDay(null);}} style={{
              padding:'10px 16px',borderRadius:8,border:`1.5px solid ${C.line}`,
              background:'transparent',cursor:'pointer',fontSize:16,color:C.navyMid}}>→</button>
            {offset!==0&&<button onClick={()=>{setOffset(0);setSelectedDay(null);}} style={{
              padding:'10px 14px',borderRadius:8,border:'none',cursor:'pointer',
              fontFamily:"'JetBrains Mono',monospace",fontSize:11,letterSpacing:1,
              background:`rgba(10,37,64,0.08)`,color:C.navyMid}}>◉</button>}
          </div>

          {/* ── Сетка дней ── */}
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {weekDays.map((d,i)=>{
              const dStr=localDateStr(d);
              const isToday=dStr===todayStr;
              const isSelected=selectedDay===dStr;
              const events=getDayEvents(dStr);
              const taskEvents=events.filter(e=>e.type==='task'||e.type==='beauty');
              const doneCount=taskEvents.filter(e=>e.type==='task'?e.task.doneDate===dStr:e.allDone).length;
              const totalCount=taskEvents.length;
              const isWeekend=i>=5;
              const pct=totalCount>0?Math.round(doneCount/totalCount*100):0;

              return (
                <div key={dStr}>
                  {/* ── Карточка дня ── */}
                  <div
                    onClick={()=>setSelectedDay(isSelected?null:dStr)}
                    style={{
                      borderRadius:14, overflow:'hidden',
                      border:`2px solid ${isToday?C.gold:isSelected?C.navyMid:C.lineS}`,
                      boxShadow:isToday?`0 4px 16px rgba(212,175,55,0.20)`:isSelected?`0 4px 14px rgba(10,37,64,0.14)`:'none',
                      cursor:'pointer', transition:'all 0.2s',
                      position:'relative',
                    }}>

                    {/* Фон картинки */}
                    <img src="/schedule/schedule-bg.jpg" alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:0.06,pointerEvents:'none'}}
                      onError={e=>e.target.style.display='none'}/>

                    {/* Пергаментный фон */}
                    <div style={{position:'absolute',inset:0,
                      background:isToday?`linear-gradient(135deg,rgba(245,232,190,0.98) 0%,rgba(235,220,175,0.97) 100%)`:
                                isSelected?`linear-gradient(135deg,rgba(240,243,250,0.98) 0%,rgba(230,235,245,0.97) 100%)`:
                                `linear-gradient(135deg,rgba(250,243,224,0.98) 0%,rgba(242,232,206,0.97) 100%)`,
                    }}/>

                    {/* Левая цветная полоска */}
                    <div style={{position:'absolute',top:0,left:0,bottom:0,width:5,
                      background:isToday?`linear-gradient(180deg,${C.gold},${C.goldDeep})`:
                                isSelected?`linear-gradient(180deg,${C.navyMid},${C.navy})`:
                                isWeekend?'rgba(107,16,16,0.35)':'rgba(10,37,64,0.18)'}}/>

                    <div style={{position:'relative',zIndex:1,padding:'14px 16px 14px 18px'}}>
                      {/* ── Шапка дня ── */}
                      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom: events.length>0?12:0}}>
                        {/* Число */}
                        <div style={{flexShrink:0,textAlign:'center',minWidth:48}}>
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:600,
                            color:isToday?C.goldDeep:isWeekend?C.error:C.text3,
                            letterSpacing:1,textTransform:'uppercase',lineHeight:1}}>
                            {DAY_RU[i]}
                          </div>
                          <div style={{fontFamily:"'Cormorant Infant',serif",
                            fontSize:isToday?34:30,fontWeight:isToday?700:500,
                            color:isToday?C.goldDeep:isWeekend?C.error:C.text1,
                            lineHeight:1.1}}>
                            {d.getDate()}
                          </div>
                          {isToday&&<div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,fontWeight:600,
                            color:C.goldDeep,letterSpacing:1,marginTop:2}}>СЕГОДНЯ</div>}
                        </div>

                        {/* Разделитель */}
                        <div style={{width:1,height:40,background:`rgba(10,37,64,0.12)`,flexShrink:0}}/>

                        {/* Прогресс и краткое превью */}
                        <div style={{flex:1,minWidth:0}}>
                          {totalCount>0?(
                            <>
                              {/* Прогресс бар */}
                              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                                <div style={{flex:1,height:5,background:`rgba(10,37,64,0.08)`,borderRadius:3,overflow:'hidden'}}>
                                  <div style={{height:'100%',borderRadius:3,transition:'width 0.4s',
                                    width:`${pct}%`,
                                    background:pct===100?`linear-gradient(90deg,${C.success},#2D8A4F)`:
                                              `linear-gradient(90deg,${C.navyMid},${C.gold})`}}/>
                                </div>
                                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,
                                  color:pct===100?C.success:C.text3,fontWeight:600,flexShrink:0}}>
                                  {doneCount}/{totalCount}
                                </span>
                              </div>
                              {/* Первые 2 задачи превью */}
                              {events.slice(0,2).map((ev,ei)=>{
                                if (ev.type==='anchor') return (
                                  <div key={ei} style={{display:'flex',gap:6,alignItems:'center'}}>
                                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12.5,fontWeight:600,color:C.text3,flexShrink:0}}>{ev.time}</span>
                                    <span style={{fontSize:14.5,color:C.text3,fontFamily:"'Crimson Pro',serif"}}>{ev.label}</span>
                                  </div>
                                );
                                if (ev.type==='task') {
                                  const done=ev.task.doneDate===dStr;
                                  const sc=sectionColor(ev.task.section);
                                  return (
                                    <div key={ei} style={{display:'flex',gap:6,alignItems:'center',marginBottom:2}}>
                                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12.5,fontWeight:600,color:C.text3,flexShrink:0,minWidth:38}}>{ev.time==='00:00'?'—':ev.time}</span>
                                      <div style={{width:3,height:14,borderRadius:2,background:sc,flexShrink:0}}/>
                                      <span style={{fontSize:15,color:done?C.text3:C.text1,fontFamily:"'Crimson Pro',serif",
                                        textDecoration:done?'line-through':'none',
                                        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>
                                        {ev.task.title}
                                      </span>
                                    </div>
                                  );
                                }
                                if (ev.type==='beauty') return (
                                  <div key={ei} style={{display:'flex',gap:6,alignItems:'center',marginBottom:2}}>
                                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12.5,fontWeight:600,color:C.text3,flexShrink:0,minWidth:38}}>{ev.time}</span>
                                    <div style={{width:3,height:14,borderRadius:2,background:'rgba(184,107,93,0.8)',flexShrink:0}}/>
                                    <span style={{fontSize:15,color:ev.allDone?C.text3:C.text1,fontFamily:"'Crimson Pro',serif",
                                      textDecoration:ev.allDone?'line-through':'none'}}>
                                      ✨ Уход {ev.block.length>1?`(${ev.block.length})`:''}
                                    </span>
                                  </div>
                                );
                                return null;
                              })}
                              {events.length>2&&(
                                <div style={{fontSize:13.5,color:C.text3,fontFamily:"'JetBrains Mono',monospace",letterSpacing:0.5,marginTop:2}}>
                                  + ещё {events.length-2}
                                </div>
                              )}
                            </>
                          ):(
                            <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:15,
                              color:C.text3,fontStyle:'italic'}}>
                              Нет задач
                            </div>
                          )}
                        </div>

                        {/* Стрелка */}
                        <span style={{color:C.text3,fontSize:14,flexShrink:0,
                          transform:isSelected?'rotate(180deg)':'rotate(0)',transition:'0.25s'}}>▾</span>
                      </div>

                      {/* ── РАЗВЁРНУТЫЙ ДЕНЬ ── */}
                      {isSelected&&(
                        <div style={{borderTop:`1.5px solid rgba(10,37,64,0.10)`,paddingTop:14,marginTop:2}}>
                          {/* Заголовок */}
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                            <div style={{fontFamily:"'Cinzel',serif",fontSize:16,color:C.navy,fontWeight:700,letterSpacing:2}}>
                              {d.getDate()} {MONTH_RU[d.getMonth()]}
                            </div>
                            <button onClick={e=>{e.stopPropagation();setTaskModal({});}}
                              style={{padding:'8px 16px',borderRadius:8,border:'none',cursor:'pointer',
                                fontFamily:"'Cinzel',serif",fontSize:11,letterSpacing:2,
                                fontWeight:700,textTransform:'uppercase',
                                background:`linear-gradient(135deg,${C.navyMid},${C.navy})`,
                                color:C.goldPale}}>
                              + Добавить
                            </button>
                          </div>

                          {/* Полный список событий */}
                          {events.length===0&&(
                            <div style={{textAlign:'center',padding:'16px 0',fontFamily:"'Cormorant Infant',serif",
                              fontSize:16,fontStyle:'italic',color:C.text3}}>
                              Свободный день
                            </div>
                          )}

                          {events.map((ev,ei)=>{
                            if (ev.type==='anchor') return (
                              <div key={`a${ei}`} style={{display:'flex',gap:12,alignItems:'center',
                                padding:'10px 12px',marginBottom:6,borderRadius:10,
                                background:'rgba(10,37,64,0.04)',border:`1px solid ${C.lineS}`}}>
                                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,
                                  color:C.gold,fontWeight:600,minWidth:42,flexShrink:0}}>{ev.time}</span>
                                <div style={{width:3,height:20,borderRadius:2,background:`rgba(212,175,55,0.6)`,flexShrink:0}}/>
                                <span style={{fontFamily:"'Crimson Pro',serif",fontSize:16,color:C.text2}}>{ev.label}</span>
                              </div>
                            );

                            if (ev.type==='task') {
                              const t=ev.task; const done=t.doneDate===dStr;
                              const sc=sectionColor(t.section);
                              return (
                                <div key={t.id} style={{display:'flex',gap:12,alignItems:'flex-start',
                                  padding:'11px 12px',marginBottom:6,borderRadius:10,
                                  background:done?'rgba(26,77,46,0.07)':'rgba(255,255,255,0.55)',
                                  border:`1.5px solid ${done?'rgba(26,77,46,0.22)':C.lineS}`,
                                  borderLeft:`4px solid ${done?C.success:sc}`,
                                  opacity:done?0.7:1,transition:'all 0.15s'}}>
                                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,
                                    color:C.text3,fontWeight:500,minWidth:42,flexShrink:0,paddingTop:2}}>
                                    {t.preferredTime&&t.preferredTime!=='00:00'?t.preferredTime:'—'}
                                  </span>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontFamily:"'Crimson Pro',serif",fontSize:17,
                                      color:done?C.text3:C.text1,fontWeight:done?400:600,
                                      textDecoration:done?'line-through':'none',lineHeight:1.3}}>
                                      {t.title}
                                    </div>
                                    <div style={{display:'flex',gap:8,marginTop:4,flexWrap:'wrap'}}>
                                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                                        color:sc,letterSpacing:0.5}}>
                                        {sectionIcon(t.section)} {t.section}
                                      </span>
                                      {t.notes&&<span style={{fontFamily:"'Crimson Pro',serif",fontSize:13,
                                        color:C.text3,fontStyle:'italic'}}>{t.notes.slice(0,35)}</span>}
                                    </div>
                                  </div>
                                  <div
                                    onClick={e=>{e.stopPropagation();toggleTask(t.id,dStr);}}
                                    style={{width:24,height:24,borderRadius:6,flexShrink:0,
                                      border:`2px solid ${done?C.success:'rgba(10,37,64,0.25)'}`,
                                      background:done?'rgba(26,77,46,0.15)':'rgba(255,255,255,0.8)',
                                      display:'flex',alignItems:'center',justifyContent:'center',
                                      cursor:'pointer',fontSize:13,color:C.success,fontWeight:700,
                                      transition:'all 0.15s'}}>
                                    {done?'✓':''}
                                  </div>
                                </div>
                              );
                            }

                            if (ev.type==='beauty') {
                              const done=ev.allDone;
                              return (
                                <div key={`b${ei}`} style={{display:'flex',gap:12,alignItems:'flex-start',
                                  padding:'11px 12px',marginBottom:6,borderRadius:10,
                                  background:done?'rgba(26,77,46,0.07)':'rgba(255,245,242,0.7)',
                                  border:`1.5px solid ${done?'rgba(26,77,46,0.22)':'rgba(184,107,93,0.22)'}`,
                                  borderLeft:`4px solid ${done?C.success:'rgba(184,107,93,0.7)'}`,
                                  opacity:done?0.7:1}}>
                                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,
                                    color:C.text3,minWidth:42,flexShrink:0,paddingTop:2}}>{ev.time}</span>
                                  <div style={{flex:1}}>
                                    <div style={{fontFamily:"'Crimson Pro',serif",fontSize:17,
                                      color:done?C.text3:'rgba(184,107,93,0.9)',fontWeight:600,
                                      textDecoration:done?'line-through':'none'}}>
                                      ✨ Уход{ev.block.length>1?` — ${ev.endTime}`:''}
                                    </div>
                                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                                      color:'rgba(184,107,93,0.6)',marginTop:3}}>
                                      {ev.block.map(b=>b.title).join(' · ')}
                                    </div>
                                  </div>
                                  <div onClick={e=>{e.stopPropagation();toggleBeautyBlock(ev.block,dStr);}}
                                    style={{width:24,height:24,borderRadius:6,flexShrink:0,
                                      border:`2px solid ${done?C.success:'rgba(184,107,93,0.4)'}`,
                                      background:done?'rgba(26,77,46,0.15)':'rgba(255,255,255,0.8)',
                                      display:'flex',alignItems:'center',justifyContent:'center',
                                      cursor:'pointer',fontSize:13,color:C.success,fontWeight:700}}>
                                    {done?'✓':''}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view==='ai'&&(
        <AiBox profile={profile}
          label="ИИ-Расписание"
          prompt={`Составь оптимальное расписание на неделю с учетом хронотипа (${profile?.chronotype||'—'}) и рабочего графика (${profile?.workStart||'09:00'}–${profile?.workEnd||'18:00'}).`}
          btnText="Составить расписание"/>
      )}

      {taskModal&&(
        <TaskModal task={taskModal.id?taskModal:null} defaultSection="tasks"
          onSave={t=>{ setTasks(p=>taskModal.id?p.map(x=>x.id===t.id?t:x):[...p,t]); notify('Сохранено'); setTaskModal(null); }}
          onClose={()=>setTaskModal(null)}/>
      )}
    </div>
  );
                                         }
