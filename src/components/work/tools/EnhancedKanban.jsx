// src/components/work/tools/EnhancedKanban.jsx
import { useState, useMemo } from 'react';
import { useApp } from '../../../store/AppContext';
import { TaskModal } from '../../TaskModal';

const C = {
  navy:'#0A2540', navyMid:'#1E3A5F',
  gold:'#D4AF37', goldDeep:'#B8941E', goldPale:'#F0DC90',
  bgCard:'#FAF3E0', bgCard2:'#F2E8CE', bg:'#F5E8C7',
  text1:'#0A2540', text2:'#1E3A5F', text3:'#4A6480',
  success:'#1A4D2E', error:'#6B1010',
  line:'rgba(10,37,64,0.22)', lineS:'rgba(10,37,64,0.10)',
};

const COLUMNS = [
  { id:'todo',       title:'К выполнению', emoji:'📋',
    accent:'#1E3A5F', bg:'rgba(30,58,95,0.08)',   border:'rgba(30,58,95,0.28)'  },
  { id:'inprogress', title:'В работе',     emoji:'⚙️',
    accent:'#8B6914', bg:'rgba(139,105,20,0.08)', border:'rgba(139,105,20,0.32)' },
  { id:'review',     title:'На проверке',  emoji:'🔍',
    accent:'#6B3FA0', bg:'rgba(107,63,160,0.08)', border:'rgba(107,63,160,0.28)' },
  { id:'done',       title:'Выполнено',    emoji:'✅',
    accent:'#1A4D2E', bg:'rgba(26,77,46,0.08)',   border:'rgba(26,77,46,0.28)'   },
];

function localDateStr(d=new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function EnhancedKanban() {
  const { tasks, setTasks, notify } = useApp();
  const [taskModal, setTaskModal] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const today = localDateStr();

  useMemo(() => {
    if (tasks.some(t=>t.section==='work'&&!t.status))
      setTasks(p=>p.map(t=>t.section==='work'&&!t.status?{...t,status:'todo'}:t));
  }, []); // eslint-disable-line

  const workTasks = useMemo(()=>tasks.filter(t=>t.section==='work'),[tasks]);

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    if (!id) return;
    setTasks(p=>p.map(t=>String(t.id)===String(id)?{...t,status:targetStatus}:t));
    notify(`Перемещено → ${COLUMNS.find(c=>c.id===targetStatus)?.title}`);
    setDraggedId(null);
  };

  const toggleDone = (taskId) => {
    setTasks(p=>p.map(t=>{
      if (t.id!==taskId) return t;
      const isDone=t.doneDate===today;
      return {...t,doneDate:isDone?null:today,status:isDone?'todo':'done'};
    }));
  };

  const toggleSubtask = (taskId,si) => {
    setTasks(p=>p.map(t=>{
      if (t.id!==taskId||!Array.isArray(t.subtasks)) return t;
      return {...t,subtasks:t.subtasks.map((s,i)=>i===si?{...s,completed:!s.completed}:s)};
    }));
  };

  return (
    <div style={{paddingBottom:24}}>
      {/* Заголовок */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
        marginBottom:20,flexWrap:'wrap',gap:10,
        padding:'14px 18px',borderRadius:12,
        background:`linear-gradient(135deg,${C.bgCard},${C.bgCard2})`,
        border:`1.5px solid ${C.line}`,borderLeft:`4px solid ${C.gold}`,
        boxShadow:`0 3px 10px rgba(10,37,64,0.10)`}}>
        <div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,
            letterSpacing:3,color:C.goldDeep,textTransform:'uppercase',marginBottom:4}}>
            Канбан Эхо
          </div>
          <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:20,
            color:C.navy,fontStyle:'italic'}}>
            Сакральная организация задач
          </div>
        </div>
        <button onClick={()=>setTaskModal({})}
          style={{padding:'10px 20px',borderRadius:20,cursor:'pointer',
            fontFamily:"'Cinzel',serif",fontSize:13,letterSpacing:1.5,
            fontWeight:700,textTransform:'uppercase',
            background:`linear-gradient(135deg,${C.navyMid},${C.navy})`,
            color:C.goldPale,border:'none',
            boxShadow:`0 2px 8px rgba(10,37,64,0.22)`}}>
          + Задача
        </button>
      </div>

      {/* Колонки */}
      <div style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:12,alignItems:'flex-start'}}>
        {COLUMNS.map(col=>{
          const colTasks=workTasks.filter(t=>(t.status||'todo')===col.id);
          return (
            <div key={col.id}
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>handleDrop(e,col.id)}
              style={{flex:'0 0 240px',minHeight:300,borderRadius:14,overflow:'hidden',
                border:`2px solid ${col.border}`,
                boxShadow:`0 3px 12px rgba(10,37,64,0.10)`}}>

              {/* Шапка колонки */}
              <div style={{padding:'12px 14px',
                background:`linear-gradient(135deg,${col.bg},rgba(250,243,224,0.8))`,
                borderBottom:`1.5px solid ${col.border}`,
                display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:18}}>{col.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:13,fontWeight:700,
                    color:col.accent,letterSpacing:1.5,textTransform:'uppercase'}}>
                    {col.title}
                  </div>
                </div>
                <div style={{width:24,height:24,borderRadius:'50%',
                  background:col.bg,border:`1.5px solid ${col.border}`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontFamily:"'JetBrains Mono',monospace",fontSize:13,
                  color:col.accent,fontWeight:700}}>
                  {colTasks.length}
                </div>
              </div>

              {/* Карточки */}
              <div style={{padding:'10px 10px',display:'flex',flexDirection:'column',gap:8,
                background:`linear-gradient(160deg,${C.bgCard} 0%,${C.bgCard2} 100%)`,
                minHeight:200,
                backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(10,37,64,0.03) 28px)`}}>

                {colTasks.map(task=>{
                  const done=task.doneDate===today;
                  const dl=task.deadline?.split('T')[0];
                  const daysLeft=dl?Math.ceil((new Date(dl+'T00:00:00')-new Date())/86400000):null;
                  const urgent=daysLeft!==null&&daysLeft<=3;
                  return (
                    <div key={task.id} draggable
                      onDragStart={e=>{e.dataTransfer.setData('text/plain',String(task.id));setDraggedId(task.id);}}
                      style={{background:done?'rgba(26,77,46,0.07)':urgent?'rgba(107,16,16,0.06)':'rgba(255,255,255,0.75)',
                        border:`1.5px solid ${done?'rgba(26,77,46,0.25)':urgent?'rgba(107,16,16,0.25)':col.border}`,
                        borderLeft:`3px solid ${done?C.success:urgent?C.error:col.accent}`,
                        borderRadius:10,padding:'12px 12px',cursor:'grab',
                        transition:'all 0.15s',opacity:done?0.70:1,
                        boxShadow:`0 2px 6px rgba(10,37,64,0.08)`}}>

                      {/* Чекбокс + название */}
                      <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:dl||task.subtasks?.length?8:0}}>
                        <div onClick={()=>toggleDone(task.id)}
                          style={{width:22,height:22,borderRadius:6,flexShrink:0,marginTop:1,
                            border:`2px solid ${done?C.success:'rgba(10,37,64,0.25)'}`,
                            background:done?'rgba(26,77,46,0.15)':'rgba(255,255,255,0.8)',
                            display:'flex',alignItems:'center',justifyContent:'center',
                            cursor:'pointer',fontSize:13,color:C.success,fontWeight:700}}>
                          {done&&'✓'}
                        </div>
                        <div style={{fontFamily:"'Crimson Pro',serif",fontSize:16,
                          color:done?C.text3:urgent?C.error:C.text1,
                          fontWeight:done?400:600,lineHeight:1.35,flex:1,
                          textDecoration:done?'line-through':'none'}}>
                          {task.title}
                        </div>
                      </div>

                      {/* Дедлайн */}
                      {dl&&(
                        <div style={{display:'inline-flex',alignItems:'center',gap:5,
                          padding:'3px 10px',borderRadius:20,
                          background:urgent?'rgba(107,16,16,0.10)':'rgba(10,37,64,0.07)',
                          border:`1px solid ${urgent?'rgba(107,16,16,0.25)':'rgba(10,37,64,0.12)'}`,
                          fontFamily:"'JetBrains Mono',monospace",fontSize:12,
                          color:urgent?C.error:'rgba(10,37,64,0.55)',
                          fontWeight:urgent?700:400}}>
                          📅 {daysLeft===0?'Сегодня!':daysLeft===1?'Завтра':dl}
                        </div>
                      )}

                      {/* Подзадачи */}
                      {Array.isArray(task.subtasks)&&task.subtasks.length>0&&(
                        <div style={{marginTop:8,paddingTop:8,
                          borderTop:'1px solid rgba(10,37,64,0.08)'}}>
                          {task.subtasks.map((sub,si)=>(
                            <div key={si} onClick={()=>toggleSubtask(task.id,si)}
                              style={{display:'flex',alignItems:'center',gap:8,
                                padding:'5px 0',cursor:'pointer',
                                opacity:sub.completed?0.5:1}}>
                              <div style={{width:16,height:16,borderRadius:4,flexShrink:0,
                                border:`1.5px solid ${sub.completed?C.success:'rgba(10,37,64,0.25)'}`,
                                background:sub.completed?'rgba(26,77,46,0.12)':'transparent',
                                display:'flex',alignItems:'center',justifyContent:'center',
                                fontSize:10,color:C.success}}>
                                {sub.completed&&'✓'}
                              </div>
                              <span style={{fontFamily:"'Crimson Pro',serif",fontSize:14,
                                color:sub.completed?C.text3:C.text2,
                                textDecoration:sub.completed?'line-through':'none',lineHeight:1.3}}>
                                {sub.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {colTasks.length===0&&(
                  <div style={{padding:'30px 0',textAlign:'center',
                    fontFamily:"'Cormorant Infant',serif",fontSize:15,
                    fontStyle:'italic',color:'rgba(10,37,64,0.25)'}}>
                    пусто
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {taskModal!==null&&(
        <TaskModal task={taskModal?.id?taskModal:null} defaultSection="work"
          onSave={t=>{
            setTasks(p=>taskModal?.id?p.map(x=>x.id===t.id?{...t,status:t.status||'todo'}:x):[...p,{...t,status:'todo'}]);
            setTaskModal(null);
          }}
          onClose={()=>setTaskModal(null)}/>
      )}
    </div>
  );
}
