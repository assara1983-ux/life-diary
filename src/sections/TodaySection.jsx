// src/sections/TodaySection.jsx
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { T } from '../utils/theme';

// --- Вспомогательные функции (перенесены из App.jsx) ---
function getMoon() {
    const p = ((new Date() - new Date("2024-01-11"))/86400000%29.53+29.53)%29.53;
    if(p < 1.85) return {n:"Новолуние", e:"🌑", t:"Начало"};
    if(p < 7.38) return {n:"Растущая", e:"🌒", t:"Рост"};
    if(p < 14.76) return {n:"Полнолуние", e:"🌕", t:"Пик"};
    return {n:"Убывающая", e:"🌖", t:"Итоги"};
}

function getTCMDayInfo(date) {
    const dow = date.getDay();
    const days = [
        {name:"Воскресенье", element:"Земля", emoji:"🌍", color:"#B8860B"},
        {name:"Понедельник", element:"Металл", emoji:"⚙️", color:"#708090"},
        {name:"Вторник", element:"Огонь", emoji:"🔥", color:"#DC143C"},
        {name:"Среда", element:"Вода", emoji:"💧", color:"#1E3A5F"},
        {name:"Четверг", element:"Дерево", emoji:"🌿", color:"#228B22"},
        {name:"Пятница", element:"Земля", emoji:"🌍", color:"#DAA520"},
        {name:"Суббота", element:"Металл", emoji:"⚙️", color:"#C0C0C0"},
    ];
    return days[dow];
}

function getZodiac(dob) {
    if(!dob) return {name:"—", emoji:"⭐"};
    const d = new Date(dob), m = d.getMonth()+1, day = d.getDate();
    const z = [["Козерог","♑",12,22,1,19],["Водолей","♒",1,20,2,18],["Рыбы","♓",2,19,3,20],
               ["Овен","♈",3,21,4,19],["Телец","♉",4,20,5,20],["Близнецы","♊",5,21,6,20],
               ["Рак","♋",6,21,7,22],["Лев","♌",7,23,8,22],["Дева","♍",8,23,9,22],
               ["Весы","⚖️",9,23,10,22],["Скорпион","♏",10,23,11,21],["Стрелец","♐",11,22,12,21]];
    for(const [name,emoji,sm,sd,em,ed] of z) { if((m===sm && day>=sd)||(m===em && day<=ed)) return {name,emoji}; }
    return {name:"Козерог",emoji:"♑"};
}

export function TodaySection() {
    // Забираем все данные из Контекста
    const { profile, setProfile, tasks, setTasks, journal, setJournal, petLog, setPetLog } = useApp();
    const [modal, setModal] = useState(null);
    const [addModal, setAddModal] = useState(false);
    const [plannerOpen, setPlannerOpen] = useState(true);
    const [moodOpen, setMoodOpen] = useState(false);
    const [commuteOpen, setCommuteOpen] = useState(false);
    const [commuteRecs, setCommuteRecs] = useState({});
    const [commuteLoading, setCommuteLoading] = useState(false);    
    // Состояние для кормлений (локальное для секции)
    const [feedTimesOverride, setFeedTimesOverride] = useState({});

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const currentH = now.getHours();
    const todayE = journal[today] || {};
    const moon = getMoon();
    const dayInfo = getTCMDayInfo(now);
    const zodiac = getZodiac(now);
    const isWorkDay = (profile.workDaysList || [1,2,3,4,5]).includes(now.getDay());

    const saveJ = (u) => setJournal(p => ({...p, [today]: {...todayE, ...u}}));

    // --- Планировщик ---
    const plannerEvents = useMemo(() => {
        const events = [];
        if(profile.wake) events.push({id:"wake", type:"anchor", emoji:"☀️", title:"Подъём", time:profile.wake, timeH:parseInt(profile.wake.split(':')[0]), timeM:0, done:false, fixed:true});
        
        // Задачи на сегодня
        tasks.filter(t => t.preferredTime && t.doneDate !== today).forEach(t => {
            const [h,m] = t.preferredTime.split(':').map(Number);
            events.push({
                id: "task-"+t.id, type: "task", 
                emoji: t.section==="home"?"🏠":t.section==="health"?"💚":"📌",
                title: t.title, time: t.preferredTime, timeH: h, timeM: m||0,
                done: t.doneDate === today,
                taskId: t.id
            });
        });
        events.sort((a,b) => (a.timeH*60+a.timeM) - (b.timeH*60+b.timeM));
        return events;
    }, [tasks, profile, today]);

    // --- Действия ---
    const toggleTask = (taskId) => {
        setTasks(p => p.map(t => t.id === taskId ? {...t, doneDate: t.doneDate === today ? null : today} : t));
    };

    return (
        <div>
            {/* Шапка: Луна, Знак, Стихия */}
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12}}>
                <div style={{display:"flex", alignItems:"center", gap:8, padding:"10px 12px", background:"rgba(45,32,16,0.05)", borderRadius:12}}>
                    <span style={{fontSize:22}}>{moon.e}</span>
                    <div><div style={{fontSize:13, fontWeight:600}}>{moon.n}</div><div style={{fontSize:10, color:T.text3}}>{moon.t}</div></div>
                </div>
                <div style={{display:"flex", alignItems:"center", gap:8, padding:"10px 12px", background:"rgba(45,32,16,0.05)", borderRadius:12}}>
                    <span style={{fontSize:22}}>{zodiac.emoji}</span>                    <div><div style={{fontSize:13, fontWeight:600}}>{zodiac.name}</div><div style={{fontSize:10, color:T.text3}}>Солнце</div></div>
                </div>
                <div style={{display:"flex", alignItems:"center", gap:8, padding:"10px 12px", background:"rgba(45,32,16,0.05)", borderRadius:12}}>
                    <span style={{fontSize:22}}>{dayInfo.emoji}</span>
                    <div><div style={{fontSize:13, fontWeight:600, color:dayInfo.color}}>{dayInfo.element}</div><div style={{fontSize:10, color:T.text3}}>Стихия дня</div></div>
                </div>
                <div style={{gridColumn:"1/-1", display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background: isWorkDay ? "rgba(29,78,107,0.08)" : "rgba(45,106,79,0.1)", borderRadius:12}}>
                    <span style={{fontSize:16}}>{isWorkDay?"💼":"🌿"}</span>
                    <span style={{fontSize:13, color:T.text1, fontWeight:500}}>
                        {isWorkDay ? `Рабочий день · ${profile.workStart||"9:00"}–${profile.workEnd||"18:00"}` : "Выходной день — время для себя"}
                    </span>
                </div>
            </div>

            {/* Блок Настроения */}
            <div className="card" style={{marginBottom:12}}>
                <div className="card-hd" style={{cursor:"pointer"}} onClick={()=>setMoodOpen(o=>!o)}>
                    <div className="card-title">Как ты сейчас?</div>
                    <div style={{display:"flex", alignItems:"center", gap:8}}>
                        {todayE.mood && <span style={{fontSize:16}}>{todayE.mood}</span>}
                        <span style={{color:T.text3, fontSize:14}}>{moodOpen?"▲":"▼"}</span>
                    </div>
                </div>
                {moodOpen && (
                    <div style={{marginTop:8}}>
                        <div className="sec-lbl">Настроение</div>
                        <div style={{display:"flex", gap:8, marginBottom:14}}>
                            {["😔","😕","😐","🙂","😊","🤩"].map(m => (
                                <span key={m} className={`mood-btn${todayE.mood===m?" on":""}`} onClick={()=>saveJ({mood:m})}>{m}</span>
                            ))}
                        </div>
                        <div className="sec-lbl">Энергия</div>
                        <div style={{display:"flex", gap:8, marginBottom:14}}>
                            {[1,2,3,4,5].map(n => (
                                <div key={n} className={`en-dot${(todayE.energy||0)>=n?" on":""}`} onClick={()=>saveJ({energy:n})}>{n}</div>
                            ))}
                        </div>
                        <div className="fld">
                            <label>Главная мысль дня</label>
                            <textarea style={{minHeight:48}} placeholder="Что важно сегодня?" value={todayE.thought||""} onChange={e=>saveJ({thought:e.target.value})}/>
                        </div>
                    </div>
                )}
            </div>

            {/* Планировщик */}
            <div className="card" style={{marginBottom:12}}>
                <div className="card-hd" style={{cursor:"pointer"}} onClick={()=>setPlannerOpen(o=>!o)}>
                    <div style={{display:"flex", alignItems:"center", gap:8}}>
                        <span style={{fontSize:16}}>📅</span>                        <div className="card-title">Планировщик дня</div>
                    </div>
                    <span style={{color:T.text3, fontSize:14}}>{plannerOpen?"▲":"▼"}</span>
                </div>
                
                {plannerOpen && (
                    <div style={{marginTop:8}}>
                        {plannerEvents.map((ev, idx) => {
                            const evMin = ev.timeH*60 + ev.timeM;
                            const nextMin = plannerEvents[idx+1] ? plannerEvents[idx+1].timeH*60 + plannerEvents[idx+1].timeM : 24*60;
                            const nowMin = currentH*60 + now.getMinutes();
                            const isNow = evMin <= nowMin && nowMin < nextMin;
                            const isPast = evMin < nowMin && !isNow;

                            return (
                                <div key={ev.id} style={{display:"flex", alignItems:"flex-start", gap:8, padding:"6px 0", borderBottom:`1px solid ${T.bdrS}`, opacity: isPast && ev.done ? 0.6 : 1}}>
                                    <div style={{minWidth:44, textAlign:"right", paddingTop:2, flexShrink:0}}>
                                        <span style={{fontSize:12, color: isNow ? T.gold : (isPast ? T.text3 : T.text2), fontFamily:"JetBrains Mono", fontWeight: isNow?700:400}}>{ev.time}</span>
                                    </div>
                                    <div style={{width:2, alignSelf:"stretch", minHeight:18, background: isNow ? T.gold : (isPast ? T.bdrS : T.bdr), borderRadius:1, flexShrink:0}}/>
                                    
                                    {!ev.fixed ? (
                                        <div onClick={() => toggleTask(ev.taskId)} style={{width:18, height:18, borderRadius:4, flexShrink:0, marginTop:1, cursor:"pointer", border:`1.5px solid ${ev.done?T.success:T.bdr}`, background: ev.done?"rgba(45,106,79,0.2)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:T.success}}>
                                            {ev.done?"✓":" "}
                                        </div>
                                    ) : <div style={{width:18, flexShrink:0}}/>}
                                    
                                    <div style={{flex:1, minWidth:0}}>
                                        <div style={{display:"flex", alignItems:"center", gap:5, flexWrap:"wrap"}}>
                                            <span style={{fontSize:14}}>{ev.emoji}</span>
                                            <span style={{fontSize:14, color: ev.done ? T.text3 : T.text1, textDecoration: ev.done ? "line-through" : "none", lineHeight:1.3, flex:1}}>{ev.title}</span>
                                            {isNow && <span style={{fontSize:9, color:T.gold, fontFamily:"JetBrains Mono", background:"rgba(45,106,79,0.15)", padding:"1px 5px", borderRadius:3, flexShrink:0}}>СЕЙЧАС</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <button className="btn btn-ghost btn-sm" style={{width:"100%", marginTop:10, fontSize:11, border:`1px dashed rgba(200,164,90,0.3)`}} onClick={()=>setAddModal(true)}>+ Добавить событие</button>
                    </div>
                )}
            </div>

            {/* AI Совет по дороге */}
            {isWorkDay && profile.commuteTime && profile.commuteTime !== "Дома" && (
                <div style={{marginBottom:12}}>
                    <div onClick={()=>setCommuteOpen(o=>!o)} style={{display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"10px 14px", borderRadius: commuteOpen ? "12px 12px 0 0" : "12px", background: "rgba(29,78,107,0.06)", border:`1px solid ${T.teal}33`}}>
                        <span style={{fontSize:16}}>🚌</span>
                        <span style={{flex:1, fontSize:14, color:T.teal, fontWeight:500}}>В дороге ({profile.commuteTime})</span>
                        <span style={{fontSize:11, color:T.text3}}>{commuteOpen?"▲":"▼"}</span>
                    </div>                    {commuteOpen && (
                        <div style={{padding:"10px 14px", background:"rgba(29,78,107,0.03)", border:`1px solid ${T.teal}33`, borderTop:"none", borderRadius:"0 0 12px 12px"}}>
                             <AiBox 
                                profile={profile} 
                                label="🚌 СОВЕТЫ В ДОРОГЕ"
                                prompt={`Я еду на работу (${profile.commuteTime}). Дай 3 рекомендации: подкаст, музыка или мысль для продуктивного старта дня. Учитывай мою профессию: ${profile.profession||'—'} и хронотип: ${profile.chronotype||'—'}.`}
                                btnText="Совет по дороге"
                                placeholder="Анализирую маршрут и настроение..."
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Модальные окна */}
            {addModal && (
                <div className="overlay" onClick={()=>setAddModal(false)}>
                    <div className="modal" onClick={e=>e.stopPropagation()}>
                        <span className="modal-x" onClick={()=>setAddModal(false)}>✕</span>
                        <div className="modal-title">Новое событие</div>
                        <div className="fld"><label>Название</label><input autoFocus id="new-task-title" placeholder="Что нужно сделать?"/></div>
                        <div className="fld-row">
                            <div className="fld"><label>Время</label><input type="time" id="new-task-time" defaultValue="12:00"/></div>
                            <div className="fld"><label>Раздел</label>
                                <select id="new-task-section"><option value="tasks">Общее</option><option value="home">Дом</option><option value="health">Здоровье</option></select>
                            </div>
                        </div>
                        <div className="modal-foot">
                            <button className="btn btn-ghost" onClick={()=>setAddModal(false)}>Отмена</button>
                            <button className="btn btn-primary" onClick={()=>{
                                const title = document.getElementById('new-task-title').value;
                                const time = document.getElementById('new-task-time').value;
                                const section = document.getElementById('new-task-section').value;
                                if(title) {
                                    setTasks(p => [...p, {id:Date.now()+Math.random(), title, section, freq:'once', priority:'m', preferredTime:time, lastDone:'', doneDate:'', notes:''}]);
                                    setAddModal(false);
                                }
                            }}>Добавить</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
                                                 }
