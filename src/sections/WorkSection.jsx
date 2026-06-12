// src/sections/WorkSection.jsx
import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { KGD_CATALOG, BNS_CATALOG } from '../data/reportsCatalog';
import { TaskModal } from '../components/TaskModal';
import { AiBox } from '../components/AiBox';
import { T } from '../utils/theme';
import { requestPermission, subscribeUser, sendPush } from '../utils/pushManager';
import { ToolsHub } from '../components/work/ToolsHub';

// ─── УТИЛИТЫ ───
function localDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function freqLabel(f) {
  if (!f || f === 'once') return 'разово';
  if (f === 'daily') return 'ежедневно';
  if (f === 'workdays') return 'пн–пт';
  if (f.startsWith('weekly:')) {
    const m = { 0:'вс',1:'пн',2:'вт',3:'ср',4:'чт',5:'пт',6:'сб' };
    return f.split(':')[1].split(',').map(n => m[n]).join(', ');
  }
  if (f.startsWith('every:')) return `каждые ${f.split(':')[1]} дн.`;
  if (f.startsWith('monthly:')) return `${f.split(':')[1]} числа`;
  return f;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target - today) / 86400000);
}

function calcDeadline(frequency, daysAfter) {
  const n = parseInt(daysAfter);
  if (!n || n <= 0) return '';
  const now = new Date();
  let periodEnd;
  if (frequency === 'monthly') {
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (frequency === 'quarterly') {
    const qEndMonths = [2, 5, 8, 11];
    const currentMonth = now.getMonth();
    const qEndMonth = qEndMonths.find(m => m >= currentMonth) ?? 11;
    periodEnd = new Date(now.getFullYear(), qEndMonth + 1, 0);
  } else if (frequency === 'annual') {
    periodEnd = new Date(now.getFullYear(), 11, 31);
  } else {
    return '';
  }
  const deadline = new Date(periodEnd);
  deadline.setDate(deadline.getDate() + n);
  return localDateStr(deadline);
}

// ✅ WorkIllustration УДАЛЕНА

// ─── ОСНОВНОЙ КОМПОНЕНТ ───
export function WorkSection() {
  const {
    profile, tasks, setTasks,
    selectedReports, toggleReport,
    customReportGroups,
    addReportToMyGroup,
    workTools, addWorkTool, updateWorkToolStep,
    aiRecommendations, setAiRecommendations,
    notify,
  } = useApp();

  const [workTab, setWorkTab] = useState('tasks');
  const [modal, setModal] = useState(null);
  const [catalogTab, setCatalogTab] = useState('kgd');
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [myReportsOpen, setMyReportsOpen] = useState(true);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const EMPTY_FORM = { name: '', frequency: 'quarterly', deadline: calcDeadline('quarterly', '30'), daysAfter: '30' };
  const [customForm, setCustomForm] = useState(EMPTY_FORM);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedRecId, setExpandedRecId] = useState(null);
  const [savedRecs, setSavedRecs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('work_saved_recs') || '[]'); } catch { return []; }
  });
  const [pushStatus, setPushStatus] = useState('unknown');
  const [addToolModal, setAddToolModal] = useState(false);
  const [newTool, setNewTool] = useState({ title: '', description: '', steps: [''] });

  const today = localDateStr();

  useEffect(() => {
    if (!('Notification' in window)) { setPushStatus('unsupported'); return; }
    setPushStatus(Notification.permission);
  }, []);

  const fullCatalog = catalogTab === 'kgd' ? KGD_CATALOG : BNS_CATALOG;
  const filteredCatalog = fullCatalog.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.id.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedKgd = useMemo(() => KGD_CATALOG.filter(r => selectedReports.includes(r.id)), [selectedReports]);
  const selectedBns = useMemo(() => BNS_CATALOG.filter(r => selectedReports.includes(r.id)), [selectedReports]);

  // Скрываем задачи выполненные не сегодня (с любым непустым doneDate кроме today)
  const workTasks = tasks.filter(t => {
    if (t.section !== 'work') return false;
    if (t.doneDate && t.doneDate !== today && t.doneDate !== '') return false;
    return true;
  });
  const todayWorkTasks = workTasks.filter(t => {
    if (t.doneDate === today) return true;
    if (!t.freq || !t.preferredTime) return false;
    const d = new Date(today + 'T00:00:00');
    if (t.freq === 'daily') return true;
    if (t.freq === 'workdays') { const dn = d.getDay(); return dn >= 1 && dn <= 5; }
    if (t.freq.startsWith('weekly:')) return t.freq.split(':')[1].split(',').map(Number).includes(d.getDay());
    return false;
  });

  const upcomingDeadlines = useMemo(() => {
    const result = [];
    const allSelected = [...selectedKgd, ...selectedBns];
    allSelected.forEach(r => {
      (r.deadlines2026 || []).forEach(dl => {
        const days = daysUntil(dl);
        if (days !== null && days >= 0 && days <= 14) {
          result.push({ name: r.name, deadline: dl, days, id: r.id });
        }
      });
    });
    return result.sort((a, b) => a.days - b.days);
  }, [selectedKgd, selectedBns]);

  const handleGetAI = async () => {
    setAiLoading(true);
    setAiRecommendations([]);
    try {
      const systemPrompt = `Ты строгий AI-консультант для бухгалтера/ИП в РК.
ПРАВИЛА:
1. Отвечай ТОЛЬКО валидным JSON массивом. Никакого текста до или после.
2. Формат объекта:
   {"id":"rec_1","title":"Название","summary":"Суть (1-2 предл.)","details":"Подробно","source":"Источник","tool":{"title":"Инструмент","description":"Назначение","steps":["Шаг 1","Шаг 2"]}}
3. Верни ровно 3 рекомендации по сферам:
   • Бухгалтерия/Налоги РК
   • 1С 8.3 / Excel / Автоматизация
   • Тайм-менеджмент / Продуктивность`;
      const userPrompt = `Профиль: ${profile?.profession || 'Бухгалтер'}. Сгенерируй 3 рекомендации.`;
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: systemPrompt, user: userPrompt, maxTokens: 2048 })
      });
      const data = await res.json();
      if (data?.text) {
        const clean = data.text.replace(/```json/g,'').replace(/```/g,'').trim();
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed)) setAiRecommendations(parsed);
      }
    } catch (e) {
      notify('Ошибка загрузки рекомендаций');
    }
    setAiLoading(false);
  };

  const saveRec = (rec) => {
    const updated = savedRecs.find(r => r.id === rec.id)
      ? savedRecs.filter(r => r.id !== rec.id)
      : [...savedRecs, rec];
    setSavedRecs(updated);
    localStorage.setItem('work_saved_recs', JSON.stringify(updated));
    notify(savedRecs.find(r => r.id === rec.id) ? '🗑 Удалено из сохранённых' : '✅ Сохранено');
  };

  const addToolFromRec = (tool) => {
    if (!tool) return;
    addWorkTool({ title: tool.title, description: tool.description, steps: tool.steps.map(s => ({ text: s, completed: false })) });
    notify(`🔧 Инструмент «${tool.title}» добавлен`);
  };

  const handleEnablePush = async () => {
    const granted = await requestPermission();
    if (!granted) { notify('❌ Разрешение отклонено'); setPushStatus('denied'); return; }
    const sub = await subscribeUser();
    if (sub) {
      setPushStatus('granted');
      notify('🔔 Уведомления включены');
      await sendPush('Life Diary', 'Уведомления успешно подключены! ✅', 'setup');
    } else {
      notify('❌ Ошибка подписки');
    }
  };

  const handleTestPush = async () => {
    await sendPush('Life Diary · Работа', 'Тестовое уведомление работает! 🎉', 'test');
    notify('📨 Тест отправлен');
  };

  const TABS = [
    { id: 'tasks',   label: '📋 Задачи' },
    { id: 'reports', label: '📊 Отчёты' },
    { id: 'tools',   label: '🔧 Инструменты' },
    { id: 'ai',      label: '✨ ИИ' },
  ];

  const FREQ_OPTIONS = [
    { v: 'monthly',   l: 'Ежемесячно',    hint: 'Конец месяца + N дней' },
    { v: 'quarterly', l: 'Ежеквартально', hint: 'Конец квартала + N дней' },
    { v: 'annual',    l: 'Ежегодно',       hint: '31 декабря + N дней' },
  ];

  const CC = {
    navy:'#0A2540', navyMid:'#1E3A5F',
    gold:'#D4AF37', goldDeep:'#B8941E', goldPale:'#F0DC90',
    bgCard:'#FAF3E0', bgCard2:'#F2E8CE',
    text1:'#0A2540', text2:'#1E3A5F', text3:'#4A6480',
    success:'#1A4D2E', error:'#6B1010',
    line:'rgba(10,37,64,0.22)', lineS:'rgba(10,37,64,0.10)',
  };

  return (
    <div style={{paddingBottom:80}}>

      {/* ── Маленькая шапка ── */}
      <div style={{position:'relative',height:90,borderRadius:14,overflow:'hidden',
        marginBottom:20,boxShadow:'0 4px 16px rgba(10,37,64,0.18)'}}>
        <img src="/sections/work.jpg" alt="" style={{position:'absolute',inset:0,
          width:'100%',height:'100%',objectFit:'cover'}}
          onError={e=>e.target.style.display='none'}/>
        <div style={{position:'absolute',inset:0,
          background:'linear-gradient(to top,rgba(10,25,45,0.88) 0%,rgba(10,25,45,0.25) 100%)'}}/>
        <div style={{position:'absolute',top:8,left:10,width:12,height:12,
          borderTop:'2px solid #D4AF37',borderLeft:'2px solid #D4AF37',opacity:0.9}}/>
        <div style={{position:'absolute',bottom:8,right:10,width:12,height:12,
          borderBottom:'2px solid #D4AF37',borderRight:'2px solid #D4AF37',opacity:0.9}}/>
        <div style={{position:'absolute',bottom:12,left:18}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,letterSpacing:3,
            color:'#F0DC90',textTransform:'uppercase',marginBottom:3,opacity:0.85}}>
            {profile?.profession||'Бухгалтер'}
          </div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,
            color:'#fff',letterSpacing:2,textTransform:'uppercase',
            textShadow:'0 2px 8px rgba(0,0,0,0.6)'}}>
            Работа
          </div>
        </div>
      </div>

      {/* ─── Вкладки ─── */}
      <div style={{display:'flex',gap:4,marginBottom:20,
        background:'rgba(10,37,64,0.05)',border:'1.5px solid rgba(10,37,64,0.22)',
        borderRadius:8,padding:4}}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setWorkTab(tab.id)}
            style={{flex:1,padding:'12px 4px',border:'none',borderRadius:6,cursor:'pointer',
              textAlign:'center',
              fontFamily:"'Cinzel',serif",fontSize:12,letterSpacing:1.5,
              textTransform:'uppercase',
              background:workTab===tab.id?'#0A2540':'transparent',
              color:workTab===tab.id?'#F0DC90':'#4A6480',
              fontWeight:workTab===tab.id?700:400,
              transition:'all 0.2s',
              boxShadow:workTab===tab.id?'0 2px 8px rgba(10,37,64,0.22)':'none'}}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════ ВКЛАДКА: ЗАДАЧИ ════ */}
      {workTab === 'tasks' && (
        <div>

          {/* ── Дедлайны — красный блок с акцентом ── */}
          {upcomingDeadlines.length > 0 && (
            <div style={{marginBottom:18,borderRadius:12,overflow:'hidden',
              border:'2px solid rgba(107,16,16,0.30)',
              boxShadow:'0 3px 12px rgba(107,16,16,0.10)'}}>
              <div style={{padding:'12px 16px',
                background:'linear-gradient(135deg,rgba(107,16,16,0.12),rgba(107,16,16,0.06))',
                borderBottom:'1.5px solid rgba(107,16,16,0.20)',
                display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:20}}>⚠️</span>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:14,fontWeight:700,
                  color:'#6B1010',letterSpacing:2,textTransform:'uppercase'}}>
                  Ближайшие дедлайны
                </div>
                <div style={{marginLeft:'auto',fontFamily:"'JetBrains Mono',monospace",
                  fontSize:11,color:'rgba(107,16,16,0.7)',fontWeight:600}}>
                  {upcomingDeadlines.length} шт.
                </div>
              </div>
              {upcomingDeadlines.map((dl,i) => (
                <div key={i} style={{
                  display:'flex',alignItems:'center',gap:14,
                  padding:'14px 16px',
                  borderBottom:i<upcomingDeadlines.length-1?'1px solid rgba(107,16,16,0.10)':'none',
                  background:dl.days<=3?'rgba(107,16,16,0.06)':'rgba(250,243,224,0.6)',
                  transition:'background 0.2s'}}>
                  {/* Счётчик дней */}
                  <div style={{
                    width:56,height:56,borderRadius:10,flexShrink:0,
                    background:dl.days===0?'#6B1010':dl.days<=3?'rgba(107,16,16,0.12)':'rgba(10,37,64,0.08)',
                    border:`2px solid ${dl.days<=3?'rgba(107,16,16,0.35)':'rgba(10,37,64,0.15)'}`,
                    display:'flex',flexDirection:'column',
                    alignItems:'center',justifyContent:'center',
                  }}>
                    <div style={{fontFamily:"'Cinzel',serif",
                      fontSize:dl.days<=9?22:16,fontWeight:700,lineHeight:1,
                      color:dl.days===0?'#fff':dl.days<=3?'#6B1010':'#1E3A5F'}}>
                      {dl.days===0?'!':dl.days}
                    </div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,
                      color:dl.days===0?'rgba(255,255,255,0.8)':dl.days<=3?'rgba(107,16,16,0.6)':'rgba(10,37,64,0.5)',
                      letterSpacing:0.5,marginTop:2}}>
                      {dl.days===0?'сегодня':dl.days===1?'завтра':'дн.'}
                    </div>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Crimson Pro',serif",fontSize:17,
                      color:dl.days<=3?'#6B1010':'#0A2540',fontWeight:600,
                      lineHeight:1.3,marginBottom:4}}>{dl.name}</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                      color:'rgba(10,37,64,0.50)',letterSpacing:0.5}}>
                      📅 {dl.deadline}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Сегодня ── */}
          {todayWorkTasks.length > 0 && (
            <div style={{marginBottom:18,borderRadius:12,overflow:'hidden',
              border:'2px solid rgba(26,77,46,0.30)',
              boxShadow:'0 3px 12px rgba(26,77,46,0.08)'}}>
              <div style={{padding:'12px 16px',
                background:'linear-gradient(135deg,rgba(26,77,46,0.10),rgba(26,77,46,0.05))',
                borderBottom:'1.5px solid rgba(26,77,46,0.18)',
                display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:20}}>☀️</span>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:14,fontWeight:700,
                  color:'#1A4D2E',letterSpacing:2,textTransform:'uppercase'}}>
                  Сегодня
                </div>
                <div style={{marginLeft:'auto',fontFamily:"'JetBrains Mono',monospace",
                  fontSize:11,color:'rgba(26,77,46,0.7)',fontWeight:600}}>
                  {todayWorkTasks.filter(t=>t.doneDate===today).length}/{todayWorkTasks.length}
                </div>
              </div>
              {todayWorkTasks.map((t,i) => {
                const done = t.doneDate===today;
                return (
                  <div key={t.id} style={{
                    display:'flex',alignItems:'center',gap:14,padding:'14px 16px',
                    borderBottom:i<todayWorkTasks.length-1?'1px solid rgba(26,77,46,0.10)':'none',
                    background:done?'rgba(26,77,46,0.06)':'rgba(250,243,224,0.6)',
                    opacity:done?0.7:1}}>
                    <div onClick={()=>setTasks(p=>p.map(x=>x.id===t.id?{...x,doneDate:x.doneDate===today?null:today}:x))}
                      style={{width:26,height:26,borderRadius:8,flexShrink:0,
                        border:`2px solid ${done?'#1A4D2E':'rgba(10,37,64,0.25)'}`,
                        background:done?'rgba(26,77,46,0.15)':'rgba(255,255,255,0.8)',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        cursor:'pointer',fontSize:14,color:'#1A4D2E',fontWeight:700}}>
                      {done&&'✓'}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"'Crimson Pro',serif",fontSize:17,
                        color:done?'#4A6480':'#0A2540',fontWeight:done?400:600,
                        textDecoration:done?'line-through':'none',lineHeight:1.3}}>
                        {t.title}
                      </div>
                      {t.preferredTime&&<div style={{fontFamily:"'JetBrains Mono',monospace",
                        fontSize:12,color:'rgba(26,77,46,0.6)',marginTop:3}}>
                        ⏰ {t.preferredTime}
                      </div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Все задачи ── */}
          <div style={{marginBottom:18,borderRadius:12,overflow:'hidden',
            border:`2px solid rgba(10,37,64,0.18)`,
            boxShadow:'0 3px 12px rgba(10,37,64,0.08)'}}>
            <div style={{padding:'12px 16px',
              background:'linear-gradient(135deg,rgba(10,37,64,0.06),rgba(10,37,64,0.03))',
              borderBottom:'1.5px solid rgba(10,37,64,0.12)',
              display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:20}}>💼</span>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:14,fontWeight:700,
                color:CC.navyMid,letterSpacing:2,textTransform:'uppercase'}}>
                Все задачи
              </div>
              <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                  color:'rgba(10,37,64,0.5)',fontWeight:600}}>{workTasks.length} шт.</span>
                <button onClick={()=>{
                    setTasks(p=>p.map(t=>
                      t.section==='work'&&t.doneDate&&t.doneDate!==today
                        ?{...t,doneDate:'',lastDone:t.doneDate}
                        :t
                    ));
                    notify?.('✅ История очищена');
                  }}
                  style={{padding:'7px 14px',borderRadius:8,cursor:'pointer',
                    fontFamily:"'Cinzel',serif",fontSize:10,letterSpacing:1,
                    fontWeight:600,textTransform:'uppercase',
                    background:'rgba(107,16,16,0.08)',
                    border:'1px solid rgba(107,16,16,0.22)',
                    color:'#6B1010',marginRight:6}}>
                  🗑 Очистить
                </button>
                <button onClick={()=>setModal({})}
                  style={{padding:'7px 16px',borderRadius:8,border:'none',cursor:'pointer',
                    fontFamily:"'Cinzel',serif",fontSize:11,letterSpacing:1.5,
                    fontWeight:700,textTransform:'uppercase',
                    background:`linear-gradient(135deg,${CC.navyMid},${CC.navy})`,
                    color:CC.goldPale}}>
                  + Добавить
                </button>
              </div>
            </div>

            {workTasks.length===0?(
              <div style={{textAlign:'center',padding:'28px 0',
                fontFamily:"'Cormorant Infant',serif",fontSize:17,
                fontStyle:'italic',color:'rgba(10,37,64,0.35)'}}>
                Нет рабочих задач
              </div>
            ):(
              workTasks
                .filter(t => !(t.doneDate === today && t.freq !== 'once'))
                .map((t,i)=>{
                const done=t.doneDate===today;
                const hasDeadline=t.deadline&&daysUntil(t.deadline)!==null;
                const dl=hasDeadline?daysUntil(t.deadline):null;
                const isUrgent=dl!==null&&dl<=3;
                return (
                  <div key={t.id} style={{
                    display:'flex',alignItems:'flex-start',gap:14,padding:'14px 16px',
                    borderBottom:i<workTasks.length-1?'1px solid rgba(10,37,64,0.08)':'none',
                    background:done?'rgba(26,77,46,0.04)':isUrgent?'rgba(107,16,16,0.04)':'rgba(250,243,224,0.4)',
                    borderLeft:`4px solid ${done?'#1A4D2E':isUrgent?'#6B1010':'rgba(10,37,64,0.15)'}`,
                    opacity:done?0.65:1}}>
                    <div onClick={()=>setTasks(p=>p.map(x=>x.id===t.id?{...x,doneDate:x.doneDate===today?null:today}:x))}
                      style={{width:26,height:26,borderRadius:8,flexShrink:0,marginTop:2,
                        border:`2px solid ${done?'#1A4D2E':'rgba(10,37,64,0.25)'}`,
                        background:done?'rgba(26,77,46,0.15)':'rgba(255,255,255,0.8)',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        cursor:'pointer',fontSize:14,color:'#1A4D2E',fontWeight:700}}>
                      {done&&'✓'}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"'Crimson Pro',serif",fontSize:18,
                        color:done?'#4A6480':isUrgent?'#6B1010':'#0A2540',
                        fontWeight:done?400:600,
                        textDecoration:done?'line-through':'none',
                        lineHeight:1.3,marginBottom:5}}>
                        {t.title}
                      </div>
                      <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
                        <span style={{display:'inline-flex',alignItems:'center',gap:4,
                          padding:'3px 10px',borderRadius:20,
                          fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                          background:'rgba(10,37,64,0.07)',
                          border:'1px solid rgba(10,37,64,0.12)',
                          color:'rgba(10,37,64,0.55)'}}>
                          🔄 {freqLabel(t.freq)}
                        </span>
                        {t.preferredTime&&<span style={{display:'inline-flex',alignItems:'center',gap:4,
                          padding:'3px 10px',borderRadius:20,
                          fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                          background:'rgba(212,175,55,0.10)',
                          border:'1px solid rgba(212,175,55,0.25)',
                          color:'rgba(139,105,20,0.8)'}}>
                          ⏰ {t.preferredTime}
                        </span>}
                        {hasDeadline&&<span style={{display:'inline-flex',alignItems:'center',gap:4,
                          padding:'3px 10px',borderRadius:20,
                          fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                          background:isUrgent?'rgba(107,16,16,0.10)':'rgba(10,37,64,0.07)',
                          border:`1px solid ${isUrgent?'rgba(107,16,16,0.30)':'rgba(10,37,64,0.12)'}`,
                          color:isUrgent?'#6B1010':'rgba(10,37,64,0.55)',fontWeight:isUrgent?700:400}}>
                          📅 {dl===0?'Сегодня!':dl===1?'Завтра!':t.deadline?.split('T')[0]}
                        </span>}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:8,flexShrink:0,paddingTop:2}}>
                      <button onClick={()=>setModal(t)}
                        style={{background:'none',border:'none',fontSize:17,cursor:'pointer',
                          color:'rgba(10,37,64,0.40)',padding:'2px 4px'}}>✏️</button>
                      <button onClick={()=>setTasks(p=>p.filter(x=>x.id!==t.id))}
                        style={{background:'none',border:'none',fontSize:17,cursor:'pointer',
                          color:'rgba(107,16,16,0.40)',padding:'2px 4px'}}>✕</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Push-уведомления ── */}
          <div style={{borderRadius:12,overflow:'hidden',
            border:'1.5px solid rgba(10,37,64,0.15)',
            background:'rgba(250,243,224,0.6)'}}>
            <div style={{padding:'12px 16px',
              background:'rgba(10,37,64,0.04)',
              borderBottom:'1.5px solid rgba(10,37,64,0.10)',
              display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:18}}>🔔</span>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:13,fontWeight:700,
                color:CC.navyMid,letterSpacing:2,textTransform:'uppercase'}}>
                Push-уведомления
              </div>
              <div style={{marginLeft:'auto'}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:700,
                  color:pushStatus==='granted'?'#1A4D2E':pushStatus==='denied'?'#6B1010':'rgba(212,175,55,0.9)'}}>
                  {pushStatus==='granted'?'✅ Включены':pushStatus==='denied'?'❌ Заблок.':pushStatus==='unsupported'?'⚠️ Не поддерж.':'⏳ Не настр.'}
                </span>
              </div>
            </div>
            <div style={{padding:'14px 16px',display:'flex',gap:10,flexWrap:'wrap'}}>
              {pushStatus!=='granted'&&pushStatus!=='denied'&&pushStatus!=='unsupported'&&(
                <button onClick={handleEnablePush}
                  style={{padding:'10px 20px',borderRadius:9,border:'none',cursor:'pointer',
                    fontFamily:"'Cinzel',serif",fontSize:12,letterSpacing:1.5,
                    fontWeight:700,textTransform:'uppercase',
                    background:`linear-gradient(135deg,${CC.navyMid},${CC.navy})`,
                    color:CC.goldPale}}>
                  🔔 Включить
                </button>
              )}
              {pushStatus==='granted'&&(
                <button onClick={handleTestPush}
                  style={{padding:'10px 20px',borderRadius:9,
                    border:'1.5px dashed rgba(10,37,64,0.25)',background:'transparent',cursor:'pointer',
                    fontFamily:"'Cinzel',serif",fontSize:12,letterSpacing:1.5,
                    fontWeight:600,textTransform:'uppercase',color:CC.navyMid}}>
                  📨 Тест
                </button>
              )}
              {pushStatus==='denied'&&(
                <div style={{fontFamily:"'Crimson Pro',serif",fontSize:15,
                  color:'#6B1010',lineHeight:1.6}}>
                  Разрешите уведомления вручную в настройках браузера.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════ ВКЛАДКА: ОТЧЁТЫ ════ */}
      {workTab === 'reports' && (
        <div>

          {/* ── Мои отчёты ── */}
          <div style={{marginBottom:18,borderRadius:12,overflow:'hidden',
            border:'2px solid rgba(10,37,64,0.18)',
            boxShadow:'0 3px 12px rgba(10,37,64,0.08)'}}>
            {/* Заголовок */}
            <div onClick={()=>setMyReportsOpen(o=>!o)}
              style={{padding:'14px 16px',cursor:'pointer',
                background:'linear-gradient(135deg,rgba(10,37,64,0.07),rgba(10,37,64,0.03))',
                borderBottom:myReportsOpen?'1.5px solid rgba(10,37,64,0.12)':'none',
                display:'flex',alignItems:'center',gap:12}}>
              <span style={{fontSize:22}}>📋</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:15,fontWeight:700,
                  color:CC.navy,letterSpacing:2,textTransform:'uppercase'}}>
                  Мои отчёты
                </div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                  color:'rgba(10,37,64,0.50)',marginTop:2}}>
                  {selectedKgd.length + selectedBns.length + customReportGroups.reduce((a,g)=>a+g.reports.length,0)} форм выбрано
                </div>
              </div>
              <span style={{fontSize:16,color:CC.gold,
                transform:myReportsOpen?'rotate(180deg)':'rotate(0)',transition:'0.25s'}}>▼</span>
            </div>

            {myReportsOpen && (
              <div style={{padding:'0 0 4px'}}>
                {selectedKgd.length===0&&selectedBns.length===0&&customReportGroups.every(g=>g.reports.length===0)&&(
                  <div style={{textAlign:'center',padding:'24px 0',
                    fontFamily:"'Cormorant Infant',serif",fontSize:17,
                    fontStyle:'italic',color:'rgba(10,37,64,0.35)'}}>
                    Выберите отчёты из каталога ниже
                  </div>
                )}

                {/* КГД */}
                {selectedKgd.length>0&&(
                  <div>
                    <div style={{padding:'10px 16px 6px',
                      fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                      color:'rgba(10,37,64,0.45)',letterSpacing:2,
                      textTransform:'uppercase',
                      borderBottom:'1px solid rgba(10,37,64,0.07)'}}>
                      🏛 КГД · {selectedKgd.length} форм
                    </div>
                    {selectedKgd.map((r,i)=>{
                      const nearest=(r.deadlines2026||[]).find(dl=>daysUntil(dl)>=0);
                      const days=nearest?daysUntil(nearest):null;
                      const urgent=days!==null&&days<=3;
                      return (
                        <div key={r.id} style={{
                          display:'flex',alignItems:'center',gap:14,
                          padding:'13px 16px',
                          borderBottom:i<selectedKgd.length-1?'1px solid rgba(10,37,64,0.07)':'none',
                          background:urgent?'rgba(107,16,16,0.04)':'transparent',
                          borderLeft:`3px solid ${urgent?'#6B1010':'rgba(10,37,64,0.15)'}`,
                        }}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontFamily:"'Crimson Pro',serif",fontSize:17,
                              color:urgent?'#6B1010':'#0A2540',fontWeight:600,
                              lineHeight:1.3,marginBottom:4}}>
                              {r.name}
                            </div>
                            <span style={{display:'inline-block',padding:'2px 10px',borderRadius:20,
                              fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                              background:'rgba(10,37,64,0.07)',border:'1px solid rgba(10,37,64,0.12)',
                              color:'rgba(10,37,64,0.50)'}}>
                              {r.id}
                            </span>
                          </div>
                          {days!==null&&(
                            <div style={{flexShrink:0,
                              padding:'6px 12px',borderRadius:8,
                              background:urgent?'rgba(107,16,16,0.10)':'rgba(212,175,55,0.10)',
                              border:`1px solid ${urgent?'rgba(107,16,16,0.30)':'rgba(212,175,55,0.30)'}`,
                              fontFamily:"'JetBrains Mono',monospace",fontSize:12,
                              color:urgent?'#6B1010':'#8B6914',fontWeight:700,
                              textAlign:'center'}}>
                              {days===0?'Сегодня!':days===1?'Завтра':`${days} дн.`}
                            </div>
                          )}
                          <button onClick={()=>toggleReport(r.id)}
                            style={{background:'none',border:'none',fontSize:18,
                              cursor:'pointer',color:'rgba(107,16,16,0.35)',
                              padding:'2px 4px',flexShrink:0}}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* БНС */}
                {selectedBns.length>0&&(
                  <div>
                    <div style={{padding:'10px 16px 6px',
                      fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                      color:'rgba(10,37,64,0.45)',letterSpacing:2,
                      textTransform:'uppercase',
                      borderBottom:'1px solid rgba(10,37,64,0.07)',
                      borderTop:'1px solid rgba(10,37,64,0.07)'}}>
                      📊 БНС · {selectedBns.length} форм
                    </div>
                    {selectedBns.map((r,i)=>(
                      <div key={r.id} style={{
                        display:'flex',alignItems:'center',gap:14,
                        padding:'13px 16px',
                        borderBottom:i<selectedBns.length-1?'1px solid rgba(10,37,64,0.07)':'none',
                        borderLeft:'3px solid rgba(10,37,64,0.15)'}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontFamily:"'Crimson Pro',serif",fontSize:17,
                            color:'#0A2540',fontWeight:600,lineHeight:1.3,marginBottom:4}}>
                            {r.name}
                          </div>
                          <span style={{display:'inline-block',padding:'2px 10px',borderRadius:20,
                            fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                            background:'rgba(10,37,64,0.07)',border:'1px solid rgba(10,37,64,0.12)',
                            color:'rgba(10,37,64,0.50)'}}>
                            {r.id}
                          </span>
                        </div>
                        <button onClick={()=>toggleReport(r.id)}
                          style={{background:'none',border:'none',fontSize:18,
                            cursor:'pointer',color:'rgba(107,16,16,0.35)',
                            padding:'2px 4px',flexShrink:0}}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Свои отчёты */}
                {customReportGroups.map(g=>g.reports.length>0&&(
                  <div key={g.id}>
                    <div style={{padding:'10px 16px 6px',
                      fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                      color:'rgba(139,105,20,0.7)',letterSpacing:2,textTransform:'uppercase',
                      borderBottom:'1px solid rgba(212,175,55,0.15)',
                      borderTop:'1px solid rgba(10,37,64,0.07)'}}>
                      ⭐ Мои формы · {g.reports.length} шт.
                    </div>
                    {g.reports.map((r,i)=>{
                      const dl=daysUntil(r.deadline);
                      const urgent=dl!==null&&dl<=3;
                      return (
                        <div key={r.id} style={{
                          display:'flex',alignItems:'flex-start',gap:14,
                          padding:'13px 16px',
                          borderBottom:i<g.reports.length-1?'1px solid rgba(212,175,55,0.10)':'none',
                          borderLeft:`3px solid ${urgent?'#6B1010':'rgba(212,175,55,0.50)'}`,
                          background:'rgba(212,175,55,0.04)'}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontFamily:"'Crimson Pro',serif",fontSize:17,
                              color:urgent?'#6B1010':'#0A2540',fontWeight:600,
                              lineHeight:1.3,marginBottom:6}}>
                              {r.name}
                            </div>
                            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                              <span style={{padding:'2px 10px',borderRadius:20,
                                fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                                background:'rgba(212,175,55,0.10)',border:'1px solid rgba(212,175,55,0.25)',
                                color:'rgba(139,105,20,0.8)'}}>
                                🔄 {freqLabel(r.frequency)}
                              </span>
                              <span style={{padding:'2px 10px',borderRadius:20,
                                fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                                background:urgent?'rgba(107,16,16,0.10)':'rgba(10,37,64,0.07)',
                                border:`1px solid ${urgent?'rgba(107,16,16,0.30)':'rgba(10,37,64,0.12)'}`,
                                color:urgent?'#6B1010':'rgba(10,37,64,0.55)',fontWeight:urgent?700:400}}>
                                📅 до {r.deadline}{dl!==null&&` (${dl<=0?'⚠ просрочен':`${dl} дн.`})`}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}

                <div style={{padding:'12px 16px'}}>
                  <button onClick={()=>setShowCustomModal(true)}
                    style={{width:'100%',padding:'12px 0',borderRadius:9,
                      border:'1.5px dashed rgba(10,37,64,0.22)',background:'transparent',
                      cursor:'pointer',fontFamily:"'Cinzel',serif",fontSize:12,
                      letterSpacing:2,textTransform:'uppercase',color:CC.navyMid}}>
                    + Добавить свой отчёт
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <div onClick={() => setCatalogOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: catalogOpen ? '12px 12px 0 0' : 12, cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.bdr}` }}>
              <span style={{ fontSize: 16 }}>🏛</span>
              <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.text1, fontWeight: 500 }}>Каталог форм КГД / БНС</span>
              <span style={{ fontSize: 11, color: T.text3 }}>{catalogOpen ? '▲' : '▼'}</span>
            </div>
            {catalogOpen && (
              <div style={{ border: `1px solid ${T.bdr}`, borderTop: 'none', borderRadius: '0 0 12px 12px', padding: 12 }}>
                <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.04)', borderRadius: 8, padding: 3, marginBottom: 10 }}>
                  {[['kgd','🏛 КГД'],['bns','📊 БНС']].map(([v,l]) => (
                    <div key={v} onClick={() => setCatalogTab(v)}
                      style={{ flex: 1, padding: '6px', borderRadius: 6, cursor: 'pointer', textAlign: 'center', fontSize: 13, background: catalogTab === v ? 'rgba(0,112,192,0.15)' : 'transparent', color: catalogTab === v ? T.gold : T.text2, transition: 'all .15s' }}>
                      {l}
                    </div>
                  ))}
                </div>
                <input
                  placeholder="Поиск по названию или коду..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', marginBottom: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.bdr}`, borderRadius: 8, color: T.text0, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {filteredCatalog.map(r => {
                    const isSelected = selectedReports.includes(r.id);
                    return (
                      <div key={r.id} onClick={() => toggleReport(r.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid rgba(255,255,255,0.04)`, cursor: 'pointer' }}>
                        <div style={{ width: 16, height: 16, borderRadius: 3, border: `1.5px solid ${isSelected ? T.success : T.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: T.success, flexShrink: 0, background: isSelected ? 'rgba(45,106,79,0.15)' : 'transparent' }}>
                          {isSelected ? '✓' : ''}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: T.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                          <div style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono',monospace" }}>{r.id}</div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredCatalog.length === 0 && (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: T.text3, fontSize: 13 }}>Ничего не найдено</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════ ВКЛАДКА: ИНСТРУМЕНТЫ ════ */}
      {workTab === 'tools' && <ToolsHub />}

      {/* ════ ВКЛАДКА: ИИ ════ */}
      {workTab === 'ai' && (
        <div>
          <button className="btn btn-primary" onClick={handleGetAI} disabled={aiLoading}
            style={{ width: '100%', marginBottom: 16, opacity: aiLoading ? 0.7 : 1 }}>
            {aiLoading ? '✦ Генерирую рекомендации...' : '✨ Получить рекомендации'}
          </button>
          {aiRecommendations.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.text3, letterSpacing: 2, marginBottom: 10 }}>РЕКОМЕНДАЦИИ ИИ</div>
              {aiRecommendations.map(rec => {
                const isExpanded = expandedRecId === rec.id;
                const isSaved = savedRecs.find(r => r.id === rec.id);
                return (
                  <div key={rec.id} style={{ marginBottom: 10, padding: '12px 14px', background: 'rgba(0,112,192,0.04)', border: `1px solid rgba(0,112,192,0.15)`, borderRadius: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ fontFamily:"'Cinzel',serif", fontSize: 17, color: '#0A2540', fontWeight:700, letterSpacing:1, flex: 1, paddingRight: 8 }}>{rec.title}</div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => saveRec(rec)}
                          style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid ${isSaved ? T.gold : T.bdr}`, background: isSaved ? 'rgba(200,164,90,0.15)' : 'transparent', color: isSaved ? T.gold : T.text3, cursor: 'pointer', fontSize: 11 }}>
                          {isSaved ? '✅' : '💾'}
                        </button>
                        {rec.tool && (
                          <button onClick={() => addToolFromRec(rec.tool)}
                            style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid rgba(0,112,192,0.3)`, background: 'rgba(0,112,192,0.08)', color: T.info || '#0070c0', cursor: 'pointer', fontSize: 11 }}>
                            🔧
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ fontFamily:"'Crimson Pro',serif", fontSize: 16, color: '#1E3A5F', lineHeight: 1.65, marginBottom: 8 }}>{rec.summary}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono',monospace" }}>{rec.source}</span>
                      <span onClick={() => setExpandedRecId(isExpanded ? null : rec.id)} style={{ fontSize: 11, color: T.gold, cursor: 'pointer' }}>
                        {isExpanded ? '▲ Скрыть' : '▼ Подробнее'}
                      </span>
                    </div>
                    {isExpanded && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid rgba(255,255,255,0.06)` }}>
                        <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.6, marginBottom: rec.tool ? 10 : 0 }}>{rec.details}</div>
                        {rec.tool && (
                          <div style={{ padding: '8px 10px', background: 'rgba(0,112,192,0.06)', borderRadius: 8, borderLeft: `3px solid rgba(0,112,192,0.4)` }}>
                            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.info || '#0070c0', letterSpacing: 1, marginBottom: 4 }}>🔧 {rec.tool.title}</div>
                            <div style={{ fontSize: 12, color: T.text2, marginBottom: 6 }}>{rec.tool.description}</div>
                            {(rec.tool.steps || []).map((step, si) => (
                              <div key={si} style={{ fontSize: 12, color: T.text2, marginBottom: 3, paddingLeft: 8 }}>
                                <span style={{ color: T.gold, marginRight: 6 }}>{si + 1}.</span>{step}
                              </div>
                            ))}
                            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => addToolFromRec(rec.tool)}>
                              + Добавить в инструменты
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <AiBox
            kb={`Профессия: ${profile?.profession || 'Бухгалтер'}. РК, 2026 год.`}
            prompt={`Профессия: ${profile?.profession || 'Бухгалтер'}. Задай мне вопрос по рабочим процессам или ответь на мой запрос.`}
            label="Спросить ИИ"
            btnText="Задать вопрос"
            placeholder="Анализирую рабочий профиль..."
          />
        </div>
      )}

      {/* ─── Модалка добавления своего отчёта ─── */}
      {showCustomModal && (
        <div className="overlay" onClick={() => setShowCustomModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <span className="modal-x" onClick={() => setShowCustomModal(false)}>✕</span>
            <div className="modal-title">Добавить отчёт</div>

            <div className="fld">
              <label>Название формы</label>
              <input
                placeholder="Название отчёта..."
                value={customForm.name}
                onChange={e => setCustomForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="fld">
              <label>Периодичность</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                {FREQ_OPTIONS.map(({ v, l, hint }) => {
                  const isActive = customForm.frequency === v;
                  return (
                    <div key={v}
                      onClick={() => setCustomForm(p => {
                        const daysAfter = p.daysAfter || '30';
                        return { ...p, frequency: v, daysAfter, deadline: calcDeadline(v, daysAfter) };
                      })}
                      style={{
                        padding: '8px 14px', borderRadius: 10, cursor: 'pointer', userSelect: 'none',
                        border: `1.5px solid ${isActive ? '#0070c0' : T.bdr}`,
                        background: isActive ? 'rgba(0,112,192,0.1)' : 'rgba(255,255,255,0.02)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? '#0070c0' : T.text1 }}>{l}</div>
                      <div style={{ fontSize: 10, color: isActive ? '#0070c0' : T.text3, marginTop: 2, opacity: 0.8 }}>{hint}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="fld">
              <label>Дней после окончания периода</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="number" min="1" max="365"
                  placeholder="Например: 15"
                  value={customForm.daysAfter}
                  onChange={e => {
                    const daysAfter = e.target.value;
                    const deadline = calcDeadline(customForm.frequency, daysAfter);
                    setCustomForm(p => ({ ...p, daysAfter, deadline }));
                  }}
                  style={{ width: 120 }}
                />
                {[15, 30, 60, 90].map(n => (
                  <div key={n}
                    onClick={() => {
                      const daysAfter = String(n);
                      const deadline = calcDeadline(customForm.frequency, daysAfter);
                      setCustomForm(p => ({ ...p, daysAfter, deadline }));
                    }}
                    style={{
                      padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, userSelect: 'none',
                      border: `1px solid ${customForm.daysAfter === String(n) ? '#0070c0' : T.bdr}`,
                      background: customForm.daysAfter === String(n) ? 'rgba(0,112,192,0.1)' : 'transparent',
                      color: customForm.daysAfter === String(n) ? '#0070c0' : T.text2,
                      transition: 'all 0.15s',
                    }}
                  >{n}</div>
                ))}
              </div>
              {customForm.deadline && customForm.daysAfter && (
                <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(0,112,192,0.06)', borderRadius: 8, borderLeft: '3px solid rgba(0,112,192,0.4)' }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.text3, marginBottom: 4, letterSpacing: 1 }}>СРОК СДАЧИ</div>
                  <div style={{ fontSize: 16, color: '#0070c0', fontWeight: 700 }}>{customForm.deadline}</div>
                  <div style={{ fontSize: 11, color: T.text3, marginTop: 3 }}>
                    {(() => {
                      const days = daysUntil(customForm.deadline);
                      if (days === null) return '';
                      if (days < 0) return '⚠ Срок уже прошёл';
                      if (days === 0) return '⚠ Сегодня!';
                      return `До срока: ${days} дн.`;
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => { setShowCustomModal(false); setCustomForm(EMPTY_FORM); }}>Отмена</button>
              <button
                className="btn btn-primary"
                disabled={!customForm.name.trim() || !customForm.deadline}
                onClick={() => {
                  if (!customForm.name.trim() || !customForm.deadline) return;
                  addReportToMyGroup({
                    name: customForm.name,
                    frequency: customForm.frequency,
                    deadline: customForm.deadline,
                    daysAfter: customForm.daysAfter,
                  });
                  setShowCustomModal(false);
                  setCustomForm(EMPTY_FORM);
                  notify('📋 Отчёт добавлен');
                }}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {modal !== null && (
        <TaskModal
          task={modal?.id ? modal : null}
          defaultSection="work"
          onSave={t => { setTasks(p => modal?.id ? p.map(x => x.id === t.id ? t : x) : [...p, t]); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
