// src/components/work/tools/EnhancedKanban.jsx
import { useState, useMemo } from 'react';
import { useApp } from '../../../store/AppContext';
import { TaskModal } from '../../TaskModal';

function localDateStr(d=new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Каждая колонка — своя яркая палитра
const COLUMNS = [
  {
    id:'todo', title:'К выполнению', emoji:'📋',
    headerBg:'linear-gradient(135deg,#1E3A5F 0%,#0A2540 100%)',
    headerColor:'#F0DC90',
    cardBg:'#FAF3E0', cardBorder:'rgba(30,58,95,0.30)',
    cardAccent:'#1E3A5F', dotBg:'rgba(240,220,144,0.25)',
    dotColor:'#F0DC90', emptyColor:'rgba(30,58,95,0.25)',
    colBg:'rgba(30,58,95,0.06)',
  },
  {
    id:'inprogress', title:'В работе', emoji:'⚙️',
    headerBg:'linear-gradient(135deg,#8B6914 0%,#6B4E0E 100%)',
    headerColor:'#FFF8E1',
    cardBg:'#FFFBF0', cardBorder:'rgba(139,105,20,0.35)',
    cardAccent:'#8B6914', dotBg:'rgba(139,105,20,0.20)',
    dotColor:'#8B6914', emptyColor:'rgba(139,105,20,0.25)',
    colBg:'rgba(139,105,20,0.06)',
  },
  {
    id:'review', title:'На проверке', emoji:'🔍',
    headerBg:'linear-gradient(135deg,#5B2D8A 0%,#3D1A6B 100%)',
    headerColor:'#E8D5FF',
    cardBg:'#FAF5FF', cardBorder:'rgba(91,45,138,0.30)',
    cardAccent:'#5B2D8A', dotBg:'rgba(91,45,138,0.15)',
    dotColor:'#E8D5FF', emptyColor:'rgba(91,45,138,0.25)',
    colBg:'rgba(91,45,138,0.05)',
  },
  {
    id:'done', title:'Выполнено', emoji:'✅',
    headerBg:'linear-gradient(135deg,#1A4D2E 0%,#0D3020 100%)',
    headerColor:'#C8F0D8',
    cardBg:'#F0FFF5', cardBorder:'rgba(26,77,46,0.30)',
    cardAccent:'#1A4D2E', dotBg:'rgba(26,77,46,0.15)',
    dotColor:'#C8F0D8', emptyColor:'rgba(26,77,46,0.25)',
    colBg:'rgba(26,77,46,0.05)',
  },
];

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
    notify(`→ ${COLUMNS.find(c=>c.id===targetStatus)?.title}`);
    setDraggedId(null);
  };

  const toggleDone = (taskId) => {
    setTasks(p=>p.map(t=>{
      if (t.id!==taskId) return t;
      const isDone=t.doneDate===today;
      return {...t,doneDate:isDone?null:today,status:isDone?'todo':'done'};
    }));
  };

  const toggleSubtask = (taskId,si) =>
    setTasks(p=>p.map(t=>t.id!==taskId||!Array.isArray(t.subtasks)?t:
      {...t,subtasks:t.subtasks.map((s,i)=>i===si?{...s,completed:!s.completed}:s)}));

  const totalDone = workTasks.filter(t=>t.doneDate===today).length;

  return (
    <div style={{paddingBottom:24}}>

      {/* ── Шапка ── */}
      <div style={{
        padding:'16px 20px', borderRadius:14, marginBottom:20,
        background:'linear-gradient(135deg,#0A2540 0%,#1E3A5F 100%)',
        boxShadow:'0 6px 20px rgba(10,37,64,0.28)',
        display:'flex', justifyContent:'space-between', alignItems:'center',
        position:'relative', overflow:'hidden',
      }}>
        {/* Декор */}
        <div style={{position:'absolute',top:8,left:10,width:12,height:12,
          borderTop:'2px solid #D4AF37',borderLeft:'2px solid #D4AF37',opacity:0.8}}/>
        <div style={{position:'absolute',bottom:8,right:10,width:12,height:12,
          borderBottom:'2px solid #D4AF37',borderRight:'2px solid #D4AF37',opacity:0.8}}/>
        <div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,
            letterSpacing:3,color:'rgba(212,175,55,0.75)',textTransform:'uppercase',marginBottom:4}}>
            Канбан Эхо
          </div>
          <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:22,
            color:'#fff',fontStyle:'italic',fontWeight:600}}>
            Сакральная организация задач
          </div>
          {totalDone>0&&<div style={{marginTop:4,fontFamily:"'JetBrains Mono',monospace",
            fontSize:11,color:'rgba(200,240,200,0.8)',letterSpacing:1}}>
            ✓ выполнено сегодня: {totalDone}
          </div>}
        </div>
        <button onClick={()=>setTaskModal({})}
          style={{padding:'11px 20px',borderRadius:22,cursor:'pointer',flexShrink:0,
            fontFamily:"'Cinzel',serif",fontSize:12,letterSpacing:1.5,
            fontWeight:700,textTransform:'uppercase',
            background:'linear-gradient(135deg,#D4AF37,#B8941E)',
            color:'#0A2540',border:'none',
            boxShadow:'0 3px 10px rgba(212,175,55,0.40)'}}>
          + Задача
        </button>
      </div>

      {/* ── Колонки ── */}
      <div style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:16,alignItems:'flex-start'}}>
        {COLUMNS.map(col=>{
          const colTasks=workTasks.filter(t=>(t.status||'todo')===col.id);
          return (
            <div key={col.id}
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>handleDrop(e,col.id)}
              style={{flex:'0 0 230px',borderRadius:16,overflow:'hidden',
                boxShadow:'0 4px 16px rgba(10,37,64,0.14)',
                border:'none'}}>

              {/* Шапка колонки — яркий градиент */}
              <div style={{
                padding:'13px 16px',
                background:col.headerBg,
                display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:20}}>{col.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:14,fontWeight:700,
                    color:col.headerColor,letterSpacing:1.5,textTransform:'uppercase'}}>
                    {col.title}
                  </div>
                </div>
                <div style={{
                  minWidth:28,height:28,borderRadius:14,
                  background:col.dotBg,
                  border:`1.5px solid ${col.dotColor}40`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontFamily:"'JetBrains Mono',monospace",fontSize:14,
                  color:col.dotColor,fontWeight:700,padding:'0 6px'}}>
                  {colTasks.length}
                </div>
              </div>

              {/* Тело колонки */}
              <div style={{
                padding:'10px 10px',
                minHeight:220,
                background:col.colBg,
                backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(10,37,64,0.04) 28px)`,
              }}>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {colTasks.map(task=>{
                    const done=task.doneDate===today;
                    const dl=task.deadline?.split('T')[0];
                    const daysLeft=dl?Math.ceil((new Date(dl+'T00:00:00')-new Date())/86400000):null;
                    const urgent=daysLeft!==null&&daysLeft<=3&&!done;
                    return (
                      <div key={task.id} draggable
                        onDragStart={e=>{e.dataTransfer.setData('text/plain',String(task.id));setDraggedId(task.id);}}
                        style={{
                          background:done?'rgba(26,77,46,0.08)':task.cardBg||col.cardBg,
                          border:`1.5px solid ${urgent?'rgba(107,16,16,0.40)':done?'rgba(26,77,46,0.30)':col.cardBorder}`,
                          borderLeft:`4px solid ${urgent?'#6B1010':done?'#1A4D2E':col.cardAccent}`,
                          borderRadius:10,padding:'12px 12px',cursor:'grab',
                          transition:'box-shadow 0.15s',
                          opacity:done?0.65:1,
                          boxShadow:urgent?'0 2px 8px rgba(107,16,16,0.15)':'0 2px 6px rgba(10,37,64,0.08)',
                          background:urgent?'rgba(107,16,16,0.06)':done?'rgba(26,77,46,0.06)':col.cardBg,
                        }}>
                        {/* Чекбокс + название */}
                        <div style={{display:'flex',alignItems:'flex-start',gap:10,
                          marginBottom:dl||task.subtasks?.length?8:0}}>
                          <div onClick={()=>toggleDone(task.id)}
                            style={{width:22,height:22,borderRadius:6,flexShrink:0,marginTop:1,
                              border:`2px solid ${done?'#1A4D2E':col.cardAccent+'88'}`,
                              background:done?'rgba(26,77,46,0.20)':'rgba(255,255,255,0.8)',
                              display:'flex',alignItems:'center',justifyContent:'center',
                              cursor:'pointer',fontSize:13,
                              color:done?'#1A4D2E':col.cardAccent,fontWeight:700}}>
                            {done&&'✓'}
                          </div>
                          <div style={{fontFamily:"'Crimson Pro',serif",fontSize:17,
                            color:done?'#4A6480':urgent?'#6B1010':col.cardAccent,
                            fontWeight:done?400:700,lineHeight:1.35,flex:1,
                            textDecoration:done?'line-through':'none'}}>
                            {task.title}
                          </div>
                        </div>

                        {/* Дедлайн-тег */}
                        {dl&&(
                          <div style={{display:'inline-flex',alignItems:'center',gap:5,
                            padding:'3px 10px',borderRadius:20,
                            background:urgent?'rgba(107,16,16,0.12)':done?'rgba(26,77,46,0.10)':'rgba(10,37,64,0.07)',
                            border:`1px solid ${urgent?'rgba(107,16,16,0.30)':done?'rgba(26,77,46,0.25)':'rgba(10,37,64,0.15)'}`,
                            fontFamily:"'JetBrains Mono',monospace",fontSize:12,
                            color:urgent?'#6B1010':done?'#1A4D2E':'rgba(10,37,64,0.55)',
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
                                  opacity:sub.completed?0.45:1}}>
                                <div style={{width:16,height:16,borderRadius:4,flexShrink:0,
                                  border:`1.5px solid ${sub.completed?'#1A4D2E':col.cardAccent+'66'}`,
                                  background:sub.completed?'rgba(26,77,46,0.12)':'transparent',
                                  display:'flex',alignItems:'center',justifyContent:'center',
                                  fontSize:10,color:'#1A4D2E'}}>
                                  {sub.completed&&'✓'}
                                </div>
                                <span style={{fontFamily:"'Crimson Pro',serif",fontSize:14,
                                  color:sub.completed?'#4A6480':col.cardAccent,
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
                    <div style={{padding:'32px 0',textAlign:'center'}}>
                      <div style={{fontSize:28,marginBottom:8,opacity:0.3}}>{col.emoji}</div>
                      <div style={{fontFamily:"'Cormorant Infant',serif",fontSize:15,
                        fontStyle:'italic',color:col.emptyColor}}>пусто</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {taskModal!==null&&(
        <TaskModal task={taskModal?.id?taskModal:null} defaultSection="work"
          onSave={t=>{
            setTasks(p=>taskModal?.id
              ?p.map(x=>x.id===t.id?{...t,status:t.status||'todo'}:x)
              :[...p,{...t,status:'todo'}]);
            setTaskModal(null);
          }}
          onClose={()=>setTaskModal(null)}/>
      )}
    </div>
  );
}
