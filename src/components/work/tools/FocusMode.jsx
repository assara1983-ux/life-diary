// src/components/work/tools/FocusMode.jsx
import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../store/AppContext';

const C = {
  navy:'#0A2540', navyMid:'#1E3A5F',
  gold:'#D4AF37', goldDeep:'#B8941E', goldPale:'#F0DC90',
  bgCard:'#FAF3E0', bgCard2:'#F2E8CE',
  text1:'#0A2540', text2:'#1E3A5F', text3:'#4A6480',
  success:'#1A4D2E', error:'#6B1010',
  line:'rgba(10,37,64,0.22)', lineS:'rgba(10,37,64,0.10)',
};

function localDateStr(d=new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function FocusMode() {
  const { tasks, setTasks, notify } = useApp();

  const [isActive,      setIsActive]      = useState(false);
  const [timeLeft,      setTimeLeft]      = useState(25*60);
  const [selectedTask,  setSelectedTask]  = useState(null);
  const [customMinutes, setCustomMinutes] = useState(25);
  const [manualTask,    setManualTask]    = useState('');
  const [showManual,    setShowManual]    = useState(false);
  const [sessionsToday, setSessionsToday] = useState(() => {
    try { return parseInt(localStorage.getItem('ld_focus_sessions_today')||'0'); }
    catch { return 0; }
  });

  const workTasks = useMemo(()=>tasks.filter(t=>t.section==='work'&&!t.doneDate),[tasks]);

  useEffect(()=>{ localStorage.setItem('ld_focus_sessions_today',sessionsToday.toString()); },[sessionsToday]);
  useEffect(()=>{
    if (!isActive) return;
    if (timeLeft===0) { finishSession(); return; }
    const id=setInterval(()=>setTimeLeft(t=>t-1),1000);
    return ()=>clearInterval(id);
  },[isActive,timeLeft]); // eslint-disable-line
  useEffect(()=>()=>setIsActive(false),[]);

  const activeTaskTitle = selectedTask?.title||(manualTask.trim()||null);

  const finishSession = () => {
    setIsActive(false);
    setSessionsToday(s=>s+1);
    const today=localDateStr();
    if (selectedTask) {
      setTasks(p=>p.map(t=>t.id===selectedTask.id?{...t,doneDate:today,status:'done'}:t));
      notify(`✨ «${selectedTask.title}» выполнена`);
      setSelectedTask(null);
    } else {
      notify('✨ Сессия фокуса завершена!');
    }
    setTimeLeft(customMinutes*60);
  };

  const startTimer  = ()=>{ if (!activeTaskTitle){notify('Выберите задачу');return;} setTimeLeft(customMinutes*60); setIsActive(true); };
  const pauseTimer  = ()=>setIsActive(false);
  const resetTimer  = ()=>{ setIsActive(false); setTimeLeft(customMinutes*60); };
  const changeDuration = n=>{ setCustomMinutes(n); if (!isActive) setTimeLeft(n*60); };
  const formatTime  = s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const progress = 1-timeLeft/(customMinutes*60);
  const R=108, CX=140, CY=140, SIZE=280;
  const circumference=2*Math.PI*R;
  const dashoffset=circumference*(1-progress);
  const pct=Math.round(progress*100);

  // Цвет кольца по прогрессу
  const ringColor = pct<50 ? C.navyMid : pct<80 ? C.gold : C.error;
  const glowColor = pct<50 ? 'rgba(30,58,95,0.35)' : pct<80 ? 'rgba(212,175,55,0.40)' : 'rgba(107,16,16,0.40)';

  return (
    <div style={{paddingBottom:24,color:C.text1}}>

      {/* ── Шапка ── */}
      <div style={{
        marginBottom:20,padding:'16px 20px',borderRadius:14,
        background:`linear-gradient(135deg,${C.navy} 0%,${C.navyMid} 100%)`,
        boxShadow:`0 6px 20px rgba(10,37,64,0.28)`,
        position:'relative',overflow:'hidden',
      }}>
        <div style={{position:'absolute',top:8,left:10,width:12,height:12,
          borderTop:`2px solid ${C.gold}`,borderLeft:`2px solid ${C.gold}`,opacity:0.8}}/>
        <div style={{position:'absolute',bottom:8,right:10,width:12,height:12,
          borderBottom:`2px solid ${C.gold}`,borderRight:`2px solid ${C.gold}`,opacity:0.8}}/>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,
          letterSpacing:3,color:C.goldPale,textTransform:'uppercase',marginBottom:5,opacity:0.85}}>
          Focus Mode · Помодоро
        </div>
        <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:22,
          color:'#fff',fontStyle:'italic',fontWeight:600}}>
          Глубокая концентрация · Энергия потока
        </div>
        {activeTaskTitle&&(
          <div style={{marginTop:10,padding:'8px 12px',borderRadius:8,
            background:'rgba(255,255,255,0.10)',border:'1px solid rgba(255,255,255,0.15)'}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,
              color:C.goldPale,letterSpacing:1.5,marginBottom:3}}>В ФОКУСЕ</div>
            <div style={{fontFamily:"'Crimson Pro',serif",fontSize:17,
              color:'#fff',fontWeight:600,lineHeight:1.3}}>{activeTaskTitle}</div>
          </div>
        )}
      </div>

      {/* ── Выбор задачи ── */}
      <div style={{
        marginBottom:20,padding:'16px 18px',borderRadius:14,
        background:`linear-gradient(160deg,${C.bgCard} 0%,${C.bgCard2} 100%)`,
        border:`1.5px solid ${C.line}`,
        backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(10,37,64,0.04) 28px)`,
        position:'relative',
      }}>
        <div style={{position:'absolute',top:7,left:7,width:11,height:11,
          borderTop:`2px solid ${C.gold}`,borderLeft:`2px solid ${C.gold}`,opacity:0.7}}/>
        <div style={{position:'absolute',bottom:7,right:7,width:11,height:11,
          borderBottom:`2px solid ${C.gold}`,borderRight:`2px solid ${C.gold}`,opacity:0.7}}/>

        {/* Переключатель */}
        <div style={{display:'flex',gap:6,marginBottom:14,
          background:'rgba(10,37,64,0.05)',border:`1.5px solid ${C.line}`,
          borderRadius:8,padding:3}}>
          {[['Из списка',false],['Вручную',true]].map(([label,val])=>(
            <button key={label}
              onClick={()=>{ if(val){setShowManual(true);setSelectedTask(null);}else{setShowManual(false);setManualTask('');} }}
              style={{flex:1,padding:'10px 0',border:'none',borderRadius:6,cursor:'pointer',
                fontFamily:"'Cinzel',serif",fontSize:13,letterSpacing:1.5,textTransform:'uppercase',
                background:showManual===val?C.navy:'transparent',
                color:showManual===val?C.goldPale:C.text3,fontWeight:showManual===val?700:400,
                transition:'all 0.2s'}}>
              {label}
            </button>
          ))}
        </div>

        {/* Список задач */}
        {!showManual&&(
          workTasks.length===0?(
            <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:17,
              color:C.text3,textAlign:'center',padding:'16px 0',fontStyle:'italic'}}>
              Нет задач —{' '}
              <span onClick={()=>setShowManual(true)}
                style={{color:C.navyMid,cursor:'pointer',textDecoration:'underline'}}>
                введите вручную
              </span>
            </div>
          ):(
            <div style={{maxHeight:180,overflowY:'auto',display:'flex',flexDirection:'column',gap:8}}>
              {workTasks.map(task=>{
                const sel=selectedTask?.id===task.id;
                return (
                  <div key={task.id} onClick={()=>setSelectedTask(sel?null:task)}
                    style={{padding:'12px 14px',borderRadius:10,cursor:'pointer',
                      background:sel?`rgba(10,37,64,0.10)`:'rgba(255,255,255,0.6)',
                      border:`1.5px solid ${sel?C.navyMid:C.lineS}`,
                      borderLeft:`4px solid ${sel?C.navy:C.lineS}`,
                      transition:'all 0.15s'}}>
                    <div style={{fontFamily:"'Crimson Pro',serif",fontSize:17,
                      color:sel?C.navy:C.text1,fontWeight:sel?700:500,lineHeight:1.3}}>
                      {task.title}
                    </div>
                    {task.deadline&&<div style={{fontFamily:"'JetBrains Mono',monospace",
                      fontSize:11,color:C.text3,marginTop:3}}>
                      📅 до {task.deadline.split('T')[0]}
                    </div>}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Ручной ввод */}
        {showManual&&(
          <div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,
              letterSpacing:2,color:C.navyMid,marginBottom:8,textTransform:'uppercase'}}>
              На чём сосредоточиться?
            </div>
            <input value={manualTask} onChange={e=>setManualTask(e.target.value)}
              placeholder="Задача или цель сессии..."
              style={{width:'100%',padding:'12px 14px',
                background:'rgba(255,255,255,0.85)',border:`1.5px solid ${C.line}`,
                borderRadius:10,color:C.text1,fontSize:17,outline:'none',
                fontFamily:"'Crimson Pro',serif"}}/>
            {manualTask.trim()&&<div style={{marginTop:8,fontFamily:"'JetBrains Mono',monospace",
              fontSize:12,color:C.success,letterSpacing:1}}>✓ Задача установлена</div>}
          </div>
        )}
      </div>

      {/* ── ТАЙМЕР ── */}
      <div style={{
        marginBottom:20,borderRadius:20,overflow:'hidden',
        background:`linear-gradient(160deg,${C.navy} 0%,${C.navyMid} 100%)`,
        boxShadow:`0 8px 32px rgba(10,37,64,0.35)`,
        padding:'28px 20px',
        position:'relative',
      }}>
        {/* Фоновые декоративные круги */}
        <div style={{position:'absolute',top:-40,right:-40,width:160,height:160,
          borderRadius:'50%',border:`1px solid rgba(212,175,55,0.12)`,pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-30,left:-30,width:120,height:120,
          borderRadius:'50%',border:`1px solid rgba(212,175,55,0.08)`,pointerEvents:'none'}}/>

        {/* SVG таймер */}
        <div style={{display:'flex',justifyContent:'center',marginBottom:24,position:'relative',zIndex:1}}>
          <div style={{position:'relative',width:SIZE,height:SIZE}}>
            <svg width={SIZE} height={SIZE} style={{transform:'rotate(-90deg)'}}>
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                {/* Декоративные окружности */}
              </defs>
              {/* Внешнее декоративное кольцо */}
              <circle cx={CX} cy={CY} r={R+18} fill="none"
                stroke="rgba(212,175,55,0.12)" strokeWidth="1"
                strokeDasharray="4 8"/>
              {/* Внутреннее тонкое кольцо */}
              <circle cx={CX} cy={CY} r={R-18} fill="none"
                stroke="rgba(240,220,144,0.08)" strokeWidth="1"/>
              {/* Фоновая дорожка */}
              <circle cx={CX} cy={CY} r={R} fill="none"
                stroke="rgba(255,255,255,0.08)" strokeWidth="16"/>
              {/* Прогресс — основной */}
              <circle cx={CX} cy={CY} r={R} fill="none"
                stroke={ringColor}
                strokeWidth="16" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashoffset}
                filter="url(#glow)"
                style={{transition:'stroke-dashoffset 1s linear,stroke 0.5s'}}/>
              {/* Прогресс — свечение */}
              {isActive&&<circle cx={CX} cy={CY} r={R} fill="none"
                stroke={glowColor}
                strokeWidth="28" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashoffset}
                style={{transition:'stroke-dashoffset 1s linear'}}/>}
              {/* Точка начала */}
              <circle cx={CX} cy={CY-R} r="8"
                fill={progress>0?ringColor:'rgba(255,255,255,0.20)'}
                style={{transition:'fill 0.5s'}}/>
            </svg>

            {/* Текст внутри */}
            <div style={{position:'absolute',top:'50%',left:'50%',
              transform:'translate(-50%,-50%)',textAlign:'center',userSelect:'none'}}>
              {/* Процент */}
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,
                color:progress>0?ringColor:'rgba(255,255,255,0.30)',
                letterSpacing:2,marginBottom:4}}>
                {pct}%
              </div>
              {/* Время */}
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:52,fontWeight:700,
                color:isActive?ringColor:'rgba(255,255,255,0.90)',
                letterSpacing:4,lineHeight:1,
                textShadow:isActive?`0 0 30px ${glowColor}`:'none',
                transition:'color 0.5s,text-shadow 0.5s'}}>
                {formatTime(timeLeft)}
              </div>
              {/* Статус */}
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,
                letterSpacing:3,color:isActive?ringColor:'rgba(255,255,255,0.40)',
                marginTop:6,textTransform:'uppercase',
                transition:'color 0.5s'}}>
                {isActive?'В ПОТОКЕ':'ГОТОВ'}
              </div>
              {/* Сессии */}
              {sessionsToday>0&&<div style={{marginTop:8,fontFamily:"'JetBrains Mono',monospace",
                fontSize:11,color:'rgba(240,220,144,0.60)',letterSpacing:1}}>
                ✦ {sessionsToday} сессий сегодня
              </div>}
            </div>
          </div>
        </div>

        {/* Кнопки управления */}
        <div style={{display:'flex',gap:12,justifyContent:'center',
          flexWrap:'wrap',position:'relative',zIndex:1}}>
          {!isActive?(
            <button onClick={startTimer}
              style={{padding:'14px 40px',borderRadius:28,cursor:'pointer',
                fontFamily:"'Cinzel',serif",fontSize:16,fontWeight:700,letterSpacing:2,
                textTransform:'uppercase',border:'none',
                background:`linear-gradient(135deg,${C.gold},${C.goldDeep})`,
                color:C.navy,boxShadow:`0 4px 16px rgba(212,175,55,0.40)`}}>
              ▶ Начать
            </button>
          ):(
            <button onClick={pauseTimer}
              style={{padding:'14px 40px',borderRadius:28,cursor:'pointer',
                fontFamily:"'Cinzel',serif",fontSize:16,fontWeight:700,letterSpacing:2,
                textTransform:'uppercase',
                background:'rgba(107,16,16,0.20)',border:'2px solid rgba(107,16,16,0.50)',
                color:'#ff8080',boxShadow:'0 4px 16px rgba(107,16,16,0.20)'}}>
              ⏸ Пауза
            </button>
          )}
          <button onClick={resetTimer}
            style={{padding:'14px 24px',borderRadius:28,cursor:'pointer',
              fontFamily:"'Cinzel',serif",fontSize:14,fontWeight:600,letterSpacing:1.5,
              textTransform:'uppercase',
              background:'rgba(255,255,255,0.07)',
              border:'1.5px solid rgba(255,255,255,0.20)',color:'rgba(255,255,255,0.65)'}}>
            Сброс
          </button>
        </div>
      </div>

      {/* ── Длительность ── */}
      <div style={{
        marginBottom:16,padding:'16px 18px',borderRadius:14,
        background:`linear-gradient(160deg,${C.bgCard} 0%,${C.bgCard2} 100%)`,
        border:`1.5px solid ${C.line}`,position:'relative',
      }}>
        <div style={{position:'absolute',top:7,left:7,width:11,height:11,
          borderTop:`2px solid ${C.gold}`,borderLeft:`2px solid ${C.gold}`,opacity:0.7}}/>

        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,
          letterSpacing:2.5,color:C.navyMid,textTransform:'uppercase',marginBottom:12}}>
          Длительность · {customMinutes} мин
        </div>

        {/* Быстрые кнопки */}
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
          {[15,25,45,60,90].map(n=>(
            <button key={n} onClick={()=>!isActive&&changeDuration(n)}
              style={{padding:'10px 18px',borderRadius:22,cursor:isActive?'not-allowed':'pointer',
                fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:600,border:'none',
                background:customMinutes===n
                  ?`linear-gradient(135deg,${C.navyMid},${C.navy})`
                  :'rgba(10,37,64,0.07)',
                color:customMinutes===n?C.goldPale:C.text3,
                opacity:isActive?0.5:1,
                boxShadow:customMinutes===n?`0 2px 8px rgba(10,37,64,0.22)`:'none',
                transition:'all 0.2s'}}>
              {n} мин
            </button>
          ))}
        </div>

        {/* Слайдер */}
        <input type="range" min="5" max="90" step="5"
          value={customMinutes}
          onChange={e=>changeDuration(Number(e.target.value))}
          disabled={isActive}
          style={{width:'100%',accentColor:C.navyMid,height:4}}/>
      </div>

      {/* ── Статистика / задача в фокусе ── */}
      <div style={{display:'flex',gap:12}}>
        <div style={{
          width:90,padding:'14px 0',textAlign:'center',borderRadius:14,
          background:`linear-gradient(160deg,${C.bgCard} 0%,${C.bgCard2} 100%)`,
          border:`1.5px solid ${C.line}`,flexShrink:0,
        }}>
          <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:42,
            color:C.navy,fontWeight:700,lineHeight:1}}>
            {sessionsToday}
          </div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,
            color:C.text3,letterSpacing:1.5,marginTop:4,textTransform:'uppercase',lineHeight:1.4}}>
            сессий<br/>сегодня
          </div>
        </div>

        {activeTaskTitle&&(
          <div style={{
            flex:1,padding:'14px 16px',borderRadius:14,
            background:`linear-gradient(160deg,${C.bgCard} 0%,${C.bgCard2} 100%)`,
            border:`1.5px solid ${C.navyMid}55`,
            borderLeft:`4px solid ${C.navyMid}`,
          }}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,
              color:C.navyMid,letterSpacing:2,marginBottom:6,textTransform:'uppercase'}}>
              Задача в фокусе
            </div>
            <div style={{fontFamily:"'Crimson Pro',serif",fontSize:17,
              color:C.text1,lineHeight:1.4,fontWeight:600}}>
              {activeTaskTitle}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
