// src/components/work/ToolsHub.jsx
import { useState } from 'react';
import { EnhancedKanban }          from './tools/EnhancedKanban';
import { FocusMode }               from './tools/FocusMode';
import { TaxAssistant }            from './tools/TaxAssistant';
import { TaxRegimesComparison }    from './tools/TaxRegimesComparison';
import { LateralThinking }         from './tools/LateralThinking';
import { DecisionHub }             from './tools/DecisionHub';
import { VEDAssistant }            from './tools/VEDAssistant';
import { DocumentTemplates }       from './tools/DocumentTemplates';
import { AccountantNewsFeed }      from './tools/AccountantNewsFeed';
import { AkashaLedger }            from './tools/AkashaLedger';
import { FractalMindAccountant }   from './tools/FractalMindAccountant';
import { EchoLedgerNeuralSymphony} from './tools/EchoLedgerNeuralSymphony';
import { RecursiveSoulIndex }      from './tools/RecursiveSoulIndex';
import { HotkeysGuide }            from './tools/HotkeysGuide';

const C = {
  navy:'#0A2540', navyMid:'#1E3A5F',
  gold:'#D4AF37', goldDeep:'#B8941E', goldPale:'#F0DC90',
  bg:'#F5E8C7', bgCard:'#FAF3E0', bgCard2:'#F2E8CE',
  text1:'#0A2540', text2:'#1E3A5F', text3:'#4A6480',
  success:'#1A4D2E', error:'#6B1010',
  line:'rgba(10,37,64,0.22)', lineS:'rgba(10,37,64,0.10)',
};

const CATEGORY_STYLES = {
  tasks:     { accent:'#1E3A5F', bg:'rgba(30,58,95,0.12)',   label:'Задачи' },
  ai:        { accent:'#6B3FA0', bg:'rgba(107,63,160,0.12)', label:'ИИ' },
  analytics: { accent:'#1A4D2E', bg:'rgba(26,77,46,0.12)',   label:'Аналитика' },
  docs:      { accent:'#8B6914', bg:'rgba(139,105,20,0.12)', label:'Документы' },
  focus:     { accent:'#8B3010', bg:'rgba(139,48,16,0.10)',  label:'Фокус' },
};

// Описания инструментов для оборота карточки
const TOOL_DESCRIPTIONS = {
  kanban:   { desc:'Визуальное управление задачами. Колонки: Входящие → В работе → Готово. Drag-and-drop карточек.', steps:['Создайте задачи в колонке «Входящие»','Перетащите в «В работе» при старте','Переместите в «Готово» при завершении'] },
  focus:    { desc:'Таймер глубокой работы по методу Помодоро. Блокирует отвлечения и отслеживает продуктивность.', steps:['Выберите задачу','Запустите таймер (25 мин)','Сделайте паузу 5 мин после сессии'] },
  tax:      { desc:'ИИ-консультант по налогам РК: НДС, КПН, ИПН, соцотчисления. Актуально на 2026 год.', steps:['Введите вопрос по налогам','ИИ даёт ответ со ссылками на НК РК','Уточните детали в диалоге'] },
  regimes:  { desc:'Сравнение налоговых режимов РК 2026 после налоговой реформы: ОУР, Упрощённая декларация, СНР для самозанятых. Расчёт оптимального режима.', steps:['Введите доход и расходы','Выберите вид деятельности','Сравните налоговую нагрузку'] },
  lateral:  { desc:'Промпты для нестандартного мышления и поиска решений нетипичными методами.', steps:['Опишите проблему','Выберите метод (случайное слово, инверсия)','Получите неожиданные решения'] },
  decision: { desc:'Фреймворки принятия решений: матрица Эйзенхауэра, SWOT, анализ «за/против».', steps:['Опишите задачу','Выберите фреймворк','Заполните матрицу и получите вывод'] },
  ved:      { desc:'Помощник по ВЭД: Incoterms 2020, коды ТН ВЭД, таможенные требования РК.', steps:['Введите описание товара','Получите код ТН ВЭД','Проверьте условия поставки Incoterms'] },
  docs:     { desc:'Шаблоны документов: акты выполненных работ, приказы, договоры, счета-фактуры.', steps:['Выберите тип документа','Заполните поля','Скачайте готовый документ'] },
  news:     { desc:'Дашборд бухгалтера: новости налогового законодательства, дедлайны, аналитика.', steps:['Просмотрите последние изменения НК','Отметьте важные дедлайны','Используйте аналитику для планирования'] },
  akasha:   { desc:'Умный архив документов с поиском, тегами и структурированием по периодам.', steps:['Загрузите документы','Добавьте теги и период','Найдите быстро через поиск'] },
  fractal:  { desc:'Визуализация финансовых потоков в виде фрактальных схем. Помогает видеть картину целиком.', steps:['Введите статьи доходов и расходов','Изучите визуальную карту потоков','Найдите точки оптимизации'] },
  echo:     { desc:'Музыкальный фокус-режим. Генерирует звуковые ландшафты для концентрации.', steps:['Выберите тип звукового окружения','Запустите во время работы','Настройте интенсивность под задачу'] },
  soul:     { desc:'Инструмент рефлексии и самоанализа. Еженедельные инсайты по рабочим паттернам.', steps:['Ответьте на вопросы рефлексии','Изучите паттерны за неделю','Запишите ключевые инсайты'] },
  hotkeys:  { desc:'Справочник горячих клавиш: 1С 8.3, Excel, Windows. Макросы и автоматизация.', steps:['Найдите нужную программу','Изучите сочетания клавиш','Добавьте в избранное для быстрого доступа'] },
};

const TOOLS = [
  { id:'kanban',   icon:'🗂',  title:'Канбан Эхо',             subtitle:'Управление задачами',               category:'tasks',     img:'/work/tools/tool-kanban.jpg',    component:EnhancedKanban },
  { id:'focus',    icon:'⏱',  title:'Focus Mode',              subtitle:'Таймер глубокой работы',            category:'tasks',     img:'/work/tools/tool-focus.jpg',     component:FocusMode },
  { id:'tax',      icon:'🤖',  title:'Налоговый ИИ',            subtitle:'Консультант по налогам РК',         category:'ai',        img:'/work/tools/tool-tax.jpg',       component:TaxAssistant },
  { id:'regimes',  icon:'⚖️', title:'Налоговые режимы',        subtitle:'Сравнение и расчёт',                category:'analytics', img:'/work/tools/tool-regimes.jpg',   component:TaxRegimesComparison },
  { id:'lateral',  icon:'🌀',  title:'Нестандартное мышление',  subtitle:'Промпты для новых идей',            category:'ai',        img:'/work/tools/tool-lateral.jpg',   component:LateralThinking },
  { id:'decision', icon:'🧭',  title:'Хаб решений',             subtitle:'Фреймворки принятия решений',       category:'ai',        img:'/work/tools/tool-decision.jpg',  component:DecisionHub },
  { id:'ved',      icon:'🌐',  title:'ВЭД Ассистент',           subtitle:'Incoterms · ТН ВЭД · Экспорт',     category:'ai',        img:'/work/tools/tool-ved.jpg',       component:VEDAssistant },
  { id:'docs',     icon:'📄',  title:'Шаблоны документов',      subtitle:'Акты и приказы',                    category:'docs',      img:'/work/tools/tool-docs.jpg',      component:DocumentTemplates },
  { id:'news',     icon:'📊',  title:'Бухгалтерский дашборд',   subtitle:'Новости · Аналитика · Отчёты',      category:'analytics', img:'/work/tools/tool-news.jpg',      component:AccountantNewsFeed },
  { id:'akasha',   icon:'🗃',  title:'Акаша Леджер',            subtitle:'Умный архив документов',           category:'docs',      img:'/work/tools/tool-akasha.jpg',    component:AkashaLedger },
  { id:'fractal',  icon:'🔮',  title:'Фрактальный ум',          subtitle:'Визуализация финансовых потоков',  category:'analytics', img:'/work/tools/tool-fractal.jpg',   component:FractalMindAccountant },
  { id:'echo',     icon:'🎵',  title:'Echo Ledger',             subtitle:'Neural Symphony · Фокус через звук',category:'focus',    img:'/work/tools/tool-echo.jpg',      component:EchoLedgerNeuralSymphony },
  { id:'soul',     icon:'✨',  title:'Recursive Soul Index',    subtitle:'Рефлексия и инсайты',               category:'focus',     img:'/work/tools/tool-soul.jpg',      component:RecursiveSoulIndex },
  { id:'hotkeys',  icon:'⌨️', title:'Автоматизация',           subtitle:'Клавиши · Макросы · 1С · SharePoint',category:'docs',    img:'/work/tools/tool-hotkeys.jpg',   component:HotkeysGuide },
];

// ─── FLIP CARD ───
function ToolCard({ tool, onOpen }) {
  const [flipped, setFlipped] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const cat = CATEGORY_STYLES[tool.category];
  const info = TOOL_DESCRIPTIONS[tool.id];

  const handleClick = (e) => {
    e.stopPropagation();
    setFlipped(f => !f);
  };

  return (
    <div style={{ marginBottom: 0 }}>
      {/* ЛИЦЕВАЯ */}
      {!flipped && (
        <div onClick={handleClick}
          style={{ position:'relative', width:'100%', aspectRatio:'4/3',
            borderRadius:14, overflow:'hidden', cursor:'pointer',
            background:C.navyMid,
            boxShadow:`0 5px 18px rgba(10,37,64,0.20), 0 0 0 1.5px ${C.line}` }}>

          {imgOk && <img src={tool.img} alt={tool.title}
            style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover' }}
            onError={()=>setImgOk(false)}/>}
          {!imgOk && (
            <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',
              alignItems:'center',justifyContent:'center',
              background:`linear-gradient(135deg,${cat.bg},rgba(10,37,64,0.5))` }}>
              <div style={{ fontSize:48,marginBottom:8 }}>{tool.icon}</div>
            </div>
          )}

          {/* Градиент */}
          <div style={{ position:'absolute',inset:0,
            background:'linear-gradient(to top,rgba(10,25,45,0.92) 0%,rgba(10,25,45,0.15) 55%,transparent 100%)' }}/>

          {/* Угловые маркеры */}
          <div style={{ position:'absolute',top:8,left:8,width:12,height:12,
            borderTop:`2px solid ${C.gold}`,borderLeft:`2px solid ${C.gold}`,opacity:0.9 }}/>
          <div style={{ position:'absolute',bottom:8,right:8,width:12,height:12,
            borderBottom:`2px solid ${C.gold}`,borderRight:`2px solid ${C.gold}`,opacity:0.9 }}/>

          {/* Категория — бейдж */}
          <div style={{ position:'absolute',top:10,left:10,
            padding:'3px 10px',borderRadius:20,
            background:`${cat.accent}CC`,border:`1px solid rgba(255,255,255,0.2)`,
            fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:'#fff',
            letterSpacing:1,fontWeight:600 }}>
            {cat.label.toUpperCase()}
          </div>

          {/* Хинт */}
          <div style={{ position:'absolute',top:10,right:10,
            fontFamily:"'JetBrains Mono',monospace",
            fontSize:8,color:'rgba(212,175,55,0.75)',letterSpacing:1.5,textTransform:'uppercase' }}>
            →
          </div>

          {/* Название */}
          <div style={{ position:'absolute',bottom:0,left:0,right:0,padding:'10px 14px 14px' }}>
            <div style={{ fontFamily:"'Cinzel',serif",fontSize:15,fontWeight:700,color:'#fff',
              letterSpacing:1.5,textTransform:'uppercase',textShadow:'0 2px 8px rgba(0,0,0,0.8)',
              lineHeight:1.2,marginBottom:3 }}>{tool.title}</div>
            <div style={{ fontFamily:"'Crimson Pro',serif",fontSize:13,color:'rgba(255,255,255,0.65)',
              lineHeight:1.3 }}>{tool.subtitle}</div>
          </div>
        </div>
      )}

      {/* ОБОРОТ */}
      {flipped && (
        <div style={{ position:'relative',borderRadius:14,overflow:'hidden',
          border:`2px solid ${cat.accent}55`,
          background:`linear-gradient(160deg,${C.bgCard} 0%,${C.bgCard2} 100%)`,
          boxShadow:`0 5px 18px rgba(10,37,64,0.14)` }}>
          {imgOk && <img src={tool.img} alt="" style={{ position:'absolute',inset:0,
            width:'100%',height:'100%',objectFit:'cover',opacity:0.07,filter:'blur(4px)',pointerEvents:'none' }}/>}
          <div style={{ position:'absolute',inset:0,
            background:`linear-gradient(160deg,rgba(250,243,224,0.97) 0%,rgba(240,230,205,0.96) 100%)`,
            backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(10,37,64,0.04) 28px)` }}/>
          <div style={{ position:'absolute',top:7,left:7,width:11,height:11,
            borderTop:`2px solid ${C.gold}`,borderLeft:`2px solid ${C.gold}` }}/>
          <div style={{ position:'absolute',bottom:7,right:7,width:11,height:11,
            borderBottom:`2px solid ${C.gold}`,borderRight:`2px solid ${C.gold}` }}/>

          <div style={{ position:'relative',zIndex:1,padding:'14px 16px' }}>
            {/* Шапка оборота */}
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',
              marginBottom:12,paddingBottom:10,
              borderBottom:`1.5px solid rgba(10,37,64,0.12)` }}>
              <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                <span style={{ fontSize:20 }}>{tool.icon}</span>
                <div style={{ fontFamily:"'Cinzel',serif",fontSize:14,fontWeight:700,
                  color:cat.accent,letterSpacing:1.5,textTransform:'uppercase' }}>{tool.title}</div>
              </div>
              <button onClick={handleClick}
                style={{ background:`rgba(10,37,64,0.06)`,border:`1px solid ${C.lineS}`,
                  borderRadius:7,cursor:'pointer',padding:'6px 12px',
                  fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                  color:C.text3,letterSpacing:1 }}>←</button>
            </div>

            {/* Описание */}
            <div style={{ fontFamily:"'Crimson Pro',serif",fontSize:16,color:C.text2,
              lineHeight:1.7,marginBottom:14,
              padding:'10px 12px',borderRadius:8,
              background:`${cat.accent}10`,
              borderLeft:`3px solid ${cat.accent}` }}>
              {info?.desc || tool.subtitle}
            </div>

            {/* Шаги */}
            {info?.steps?.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                  letterSpacing:2,color:C.navyMid,textTransform:'uppercase',marginBottom:10 }}>
                  КАК ИСПОЛЬЗОВАТЬ
                </div>
                {info.steps.map((step,i)=>(
                  <div key={i} style={{ display:'flex',gap:12,padding:'9px 0',
                    borderBottom:`1px solid rgba(10,37,64,0.07)`,alignItems:'flex-start' }}>
                    <div style={{ width:24,height:24,borderRadius:'50%',flexShrink:0,
                      background:`${cat.accent}20`,border:`1.5px solid ${cat.accent}55`,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontFamily:"'JetBrains Mono',monospace",fontSize:12,
                      color:cat.accent,fontWeight:700 }}>{i+1}</div>
                    <span style={{ fontFamily:"'Crimson Pro',serif",fontSize:16,
                      color:C.text1,lineHeight:1.55,flex:1 }}>{step}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Кнопка открыть */}
            <button onClick={e=>{ e.stopPropagation(); onOpen(tool.id); }}
              style={{ width:'100%',padding:'13px 0',borderRadius:10,border:'none',cursor:'pointer',
                fontFamily:"'Cinzel',serif",fontSize:13,fontWeight:700,
                letterSpacing:2,textTransform:'uppercase',
                background:`linear-gradient(135deg,${C.navyMid},${C.navy})`,
                color:C.goldPale,boxShadow:`0 3px 12px rgba(10,37,64,0.22)` }}>
              Открыть инструмент →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ToolsHub() {
  const [activeTool, setActiveTool] = useState(null);
  const [filter, setFilter] = useState('all');

  const tool = TOOLS.find(t => t.id === activeTool);

  if (tool) {
    const ToolComponent = tool.component;
    const cat = CATEGORY_STYLES[tool.category];
    return (
      <div>
        <div onClick={()=>setActiveTool(null)}
          style={{ display:'inline-flex',alignItems:'center',gap:8,
            padding:'10px 18px',marginBottom:16,
            background:`linear-gradient(135deg,${C.bgCard},${C.bgCard2})`,
            border:`1.5px solid ${C.line}`,borderLeft:`4px solid ${C.gold}`,
            borderRadius:10,cursor:'pointer',
            fontFamily:"'Cinzel',serif",fontSize:12,
            color:C.navyMid,letterSpacing:2,textTransform:'uppercase',
            boxShadow:`0 2px 8px rgba(10,37,64,0.12)` }}>
          ← ИНСТРУМЕНТЫ
        </div>
        <div style={{ padding:'14px 16px',marginBottom:16,borderRadius:12,
          background:`linear-gradient(135deg,${C.bgCard},${C.bgCard2})`,
          border:`1.5px solid ${cat.accent}33`,borderLeft:`4px solid ${cat.accent}`,
          display:'flex',alignItems:'center',gap:12 }}>
          <span style={{ fontSize:28 }}>{tool.icon}</span>
          <div>
            <div style={{ fontFamily:"'Cinzel',serif",fontSize:17,fontWeight:700,
              color:cat.accent,letterSpacing:2,textTransform:'uppercase' }}>{tool.title}</div>
            <div style={{ fontFamily:"'Crimson Pro',serif",fontSize:15,color:C.text3,marginTop:2 }}>{tool.subtitle}</div>
          </div>
        </div>
        <ToolComponent />
      </div>
    );
  }

  const FILTERS = [
    { id:'all',      label:'Все' },
    { id:'tasks',    label:'Задачи' },
    { id:'ai',       label:'ИИ' },
    { id:'analytics',label:'Аналитика' },
    { id:'docs',     label:'Документы' },
    { id:'focus',    label:'Фокус' },
  ];

  const filtered = filter === 'all' ? TOOLS : TOOLS.filter(t => t.category === filter);

  return (
    <div>
      {/* Шапка */}
      <div style={{ position:'relative',height:90,borderRadius:14,overflow:'hidden',
        marginBottom:18,boxShadow:`0 4px 16px rgba(10,37,64,0.18)` }}>
        <img src="/sections/work.jpg" alt="" style={{ position:'absolute',inset:0,
          width:'100%',height:'100%',objectFit:'cover' }}
          onError={e=>e.target.style.display='none'}/>
        <div style={{ position:'absolute',inset:0,
          background:'linear-gradient(to top,rgba(10,25,45,0.88) 0%,rgba(10,25,45,0.25) 100%)' }}/>
        <div style={{ position:'absolute',top:8,left:10,width:12,height:12,
          borderTop:`2px solid ${C.gold}`,borderLeft:`2px solid ${C.gold}`,opacity:0.9 }}/>
        <div style={{ position:'absolute',bottom:8,right:10,width:12,height:12,
          borderBottom:`2px solid ${C.gold}`,borderRight:`2px solid ${C.gold}`,opacity:0.9 }}/>
        <div style={{ position:'absolute',bottom:12,left:18 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,
            letterSpacing:3,color:C.goldPale,textTransform:'uppercase',marginBottom:3,opacity:0.85 }}>
            Рабочее пространство
          </div>
          <div style={{ fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,
            color:'#fff',letterSpacing:2,textTransform:'uppercase',
            textShadow:'0 2px 8px rgba(0,0,0,0.6)' }}>
            Инструменты · {TOOLS.length}
          </div>
        </div>
      </div>

      {/* Фильтр по категориям */}
      <div style={{ display:'flex',gap:6,overflowX:'auto',paddingBottom:4,marginBottom:18 }}>
        {FILTERS.map(f => {
          const cat = CATEGORY_STYLES[f.id];
          const isActive = filter === f.id;
          return (
            <button key={f.id} onClick={()=>setFilter(f.id)}
              style={{ padding:'8px 16px',borderRadius:20,flexShrink:0,
                fontFamily:"'Cinzel',serif",fontSize:12,letterSpacing:1.5,
                textTransform:'uppercase',cursor:'pointer',
                border:`1.5px solid ${isActive?(cat?.accent||C.gold):C.lineS}`,
                background:isActive?(cat?.bg||`rgba(212,175,55,0.12)`):'transparent',
                color:isActive?(cat?.accent||C.goldDeep):C.text3,
                fontWeight:isActive?700:400 }}>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Сетка карточек */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
        {filtered.map(tool => (
          <ToolCard key={tool.id} tool={tool} onOpen={setActiveTool} />
        ))}
      </div>
    </div>
  );
}
