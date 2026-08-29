// src/sections/TravelSection.jsx
import { useState, useEffect, useCallback } from "react";
import { useApp } from "../store/AppContext";
import { askViaServer } from "../services/aiClient";

const C = {
  navy:'#0A2540', navyMid:'#1E3A5F', navyLight:'#2C4F7A',
  gold:'#D4AF37', goldDeep:'#B8941E', goldPale:'#F0DC90',
  bg:'#F5E8C7', bgCard:'#FAF3E0', bgCard2:'#F2E8CE',
  text1:'#0A2540', text2:'#1E3A5F', text3:'#4A6480',
  success:'#1A4D2E', error:'#6B1010',
  line:'rgba(10,37,64,0.22)', lineS:'rgba(10,37,64,0.10)',
};

const TRANSPORT_TYPES = [
  { id:'plane', label:'Самолёт', emoji:'✈️', img:'/travel/transport-plane.jpg' },
  { id:'car',   label:'Авто',    emoji:'🚗', img:'/travel/transport-car.jpg' },
  { id:'train', label:'Поезд',   emoji:'🚂', img:'/travel/transport-train.jpg' },
  { id:'ship',  label:'Корабль', emoji:'🚢', img:'/travel/transport-ship.jpg' },
  { id:'bus',   label:'Автобус', emoji:'🚌', img:'/travel/transport-bus.jpg' },
];

// ─── САЙТЫ БРОНИРОВАНИЯ из Алматы ───
const BOOKING_SITES = {
  plane: [
    { name:'Aviasales',  url:'https://www.aviasales.kz', desc:'Лучшие цены на авиабилеты', emoji:'✈️' },
    { name:'Skyscanner', url:'https://www.skyscanner.ru', desc:'Сравнение авиабилетов', emoji:'🔍' },
    { name:'Chocotravel',url:'https://chocotravel.com', desc:'Казахстанский сервис', emoji:'🍫' },
    { name:'Air Astana', url:'https://www.airastana.com', desc:'Национальный авиаперевозчик', emoji:'🇰🇿' },
    { name:'FlyArystan',url:'https://www.flyarystan.com', desc:'Лоукостер из Алматы', emoji:'💰' },
  ],
  train: [
    { name:'Казахстан Темір Жолы', url:'https://ticket.railways.kz', desc:'Официальный сайт ЖД', emoji:'🚂' },
    { name:'Tutu.ru', url:'https://www.tutu.ru', desc:'Билеты на поезда СНГ', emoji:'🎫' },
    { name:'Ticketon', url:'https://ticketon.kz', desc:'Билеты в Казахстане', emoji:'🎟️' },
  ],
  bus: [
    { name:'Ecolines',  url:'https://www.ecolines.net/ru', desc:'Международные автобусы', emoji:'🚌' },
    { name:'Busfor',    url:'https://busfor.kz', desc:'Автобусы по Казахстану', emoji:'🎫' },
    { name:'Ticketon',  url:'https://ticketon.kz', desc:'Билеты в Казахстане', emoji:'🎟️' },
  ],
  ship: [
    { name:'Booking.com', url:'https://www.booking.com', desc:'Каюты и паромы', emoji:'🚢' },
    { name:'Viator',     url:'https://www.viator.com', desc:'Круизы и туры', emoji:'🌊' },
  ],
  car: [
    { name:'Яндекс Аренда', url:'https://arenda.yandex.ru', desc:'Аренда авто', emoji:'🚗' },
    { name:'Localrent',    url:'https://localrent.com', desc:'Аренда в 100+ городах', emoji:'🔑' },
    { name:'Rentalcars',   url:'https://www.rentalcars.com', desc:'Мировой агрегатор', emoji:'🌍' },
  ],
};

// ─── САЙТЫ ПРОЖИВАНИЯ ───
const HOTEL_SITES = [
  { name:'Booking.com', url:'https://www.booking.com', desc:'Крупнейший агрегатор', emoji:'🏨' },
  { name:'Ostrovok',   url:'https://ostrovok.ru', desc:'Удобен для СНГ', emoji:'🏖️' },
  { name:'Airbnb',     url:'https://www.airbnb.ru', desc:'Аренда жилья', emoji:'🏠' },
  { name:'Hotels.com', url:'https://ru.hotels.com', desc:'Бонусные ночи', emoji:'⭐' },
];

const TRAVEL_TIPS = {
  plane: {
    before:['Онлайн-регистрация открывается за 24ч — выбирайте место у окна заранее','Распечатайте посадочный талон или сохраните в Wallet','Жидкости только до 100мл, все в прозрачный пакет 1л','Зарядите все устройства — на досмотре могут попросить включить','Прибудьте в аэропорт за 2ч (внутр.) или 3ч (межд.)','Возьмите наличные местной валюты на первые расходы'],
    during:['Пейте воду каждый час — в самолёте очень сухой воздух','Вставайте каждые 2ч для профилактики тромбоза','Не пейте алкоголь — на высоте он действует сильнее','Перед посадкой жуйте жвачку — выравнивает давление в ушах','Переведите часы на местное время сразу после взлёта'],
    after:['Выпейте 500мл воды сразу после прилёта','При смене часовых поясов — ложитесь спать по местному времени','Не планируйте важных встреч в день прилёта при разнице >4ч'],
    packing:['Компрессионные носки обязательны для перелётов >4ч','Подушка для шеи, маска, беруши — в ручную кладь','Смена одежды в ручной клади на случай потери багажа','Лекарства только в оригинальной упаковке с рецептом'],
  },
  car: {
    before:['Проверьте давление в шинах, масло, омыватель и тормозную жидкость','Загрузите офлайн-карты (Maps.me или Google Maps офлайн)','Возьмите аптечку, знак аварийной остановки, огнетушитель','Проверьте страховку и техосмотр','Заправьте полный бак перед выездом из города'],
    during:['Делайте остановку каждые 2ч — 10-15 минут','При усталости: кофе + 20 минут сна = бодрость на 2ч','В незнакомом городе: включите звук навигатора'],
    after:['Запишите пробег и расходы на топливо','Проверьте масло при длительных поездках каждые 500км'],
    packing:['Зарядное с нескольких портов USB','Холодильник-сумка для еды','Наличные — на трассе карты часто не принимают'],
  },
  train: {
    before:['Купите постельное бельё заранее или возьмите своё','Положите еду в плотный контейнер','Нижняя полка удобнее для длительных поездок'],
    during:['Замок для рюкзака на ночь — даже в купе','Попросите проводника разбудить за 30-40 мин до станции','Заряжайте устройства в зонах розеток'],
    after:['Уточните у проводника расписание — поезд иногда приходит раньше'],
    packing:['Тапочки — обязательно','Туалетные принадлежности в доступном месте','Снеки и термос с чаем','Беруши'],
  },
  ship: {
    before:['Возьмите таблетки от морской болезни — выпейте за 1ч до отплытия','Забронируйте каюту ближе к центру — меньше качает'],
    during:['При качке смотрите на горизонт','Патч от укачивания за ухо действует до 72ч'],
    after:['После круиза первые часы на суше может казаться что земля качается — это нормально'],
    packing:['Тёплая куртка — на воде холоднее','Водонепроницаемый чехол для телефона','Санскрин — вода усиливает UV'],
  },
  bus: {
    before:['Выберите место за водителем — меньше укачивает','Уточните есть ли туалет на борту'],
    during:['Не кладите ценности в верхние полки','При остановках уточните время отправления'],
    after:['Сразу разомнитесь — длительное сидение напрягает поясницу'],
    packing:['Запасной аккумулятор — розеток почти нет','Небольшой перекус и вода','Тёплая кофта — кондиционер часто на максимум'],
  },
};

// ─── УТИЛИТЫ ───
function localDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function parseDateRange(datesStr) {
  if (!datesStr) return [];
  // Парсим форматы: "15-22 июля 2025", "2025-07-15 - 2025-07-22", "15.07.2025 - 22.07.2025"
  const months = { 'января':0,'февраля':1,'марта':2,'апреля':3,'мая':4,'июня':5,
    'июля':6,'августа':7,'сентября':8,'октября':9,'ноября':10,'декабря':11 };

  // Формат "15-22 июля 2025"
  const m1 = datesStr.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s+(\S+)\s+(\d{4})/);
  if (m1) {
    const [,d1,d2,mon,yr] = m1;
    const mIdx = months[mon.toLowerCase()];
    if (mIdx !== undefined) {
      const dates = [];
      for (let d = parseInt(d1); d <= parseInt(d2); d++) {
        dates.push(localDateStr(new Date(parseInt(yr), mIdx, d)));
      }
      return dates;
    }
  }

  // Формат ISO "2025-07-15 - 2025-07-22"
  const m2 = datesStr.match(/(\d{4}-\d{2}-\d{2})\s*[-–]\s*(\d{4}-\d{2}-\d{2})/);
  if (m2) {
    const start = new Date(m2[1]+'T00:00:00');
    const end   = new Date(m2[2]+'T00:00:00');
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
      dates.push(localDateStr(new Date(d)));
    }
    return dates;
  }

  // Формат "15.07 - 22.07.2025"
  const m3 = datesStr.match(/(\d{1,2})\.(\d{2})\s*[-–]\s*(\d{1,2})\.(\d{2})\.(\d{4})/);
  if (m3) {
    const [,d1,mo1,d2,mo2,yr] = m3;
    const start = new Date(parseInt(yr), parseInt(mo1)-1, parseInt(d1));
    const end   = new Date(parseInt(yr), parseInt(mo2)-1, parseInt(d2));
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
      dates.push(localDateStr(new Date(d)));
    }
    return dates;
  }

  return [];
}

// ─── UI КОМПОНЕНТЫ ───
function Card({ children, style={} }) {
  return (
    <div style={{
      background:`linear-gradient(160deg, ${C.bgCard} 0%, ${C.bgCard2} 100%)`,
      border:`1.5px solid ${C.line}`, borderRadius:12, padding:18, marginBottom:14,
      position:'relative', overflow:'hidden',
      boxShadow:`0 3px 14px rgba(10,37,64,0.10)`,
      backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(10,37,64,0.03) 28px)`,
      ...style,
    }}>
      <div style={{ position:'absolute', top:6, left:6, width:11, height:11,
        borderTop:`2px solid ${C.gold}`, borderLeft:`2px solid ${C.gold}`, opacity:0.7 }} />
      <div style={{ position:'absolute', bottom:6, right:6, width:11, height:11,
        borderBottom:`2px solid ${C.gold}`, borderRight:`2px solid ${C.gold}`, opacity:0.7 }} />
      {children}
    </div>
  );
}

function SecLabel({ children }) {
  return (
    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, letterSpacing:3,
      color:C.navyMid, textTransform:'uppercase', marginBottom:12, marginTop:6,
      paddingBottom:6, borderBottom:`1px solid ${C.lineS}`,
      display:'flex', alignItems:'center', gap:8 }}>
      <span style={{ color:C.gold }}>▸</span>{children}
    </div>
  );
}

function TipRow({ text, storageKey }) {
  const [done, setDone] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)||'false'); } catch { return false; }
  });
  const toggle = () => {
    const next = !done; setDone(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  };
  return (
    <div onClick={toggle} style={{ display:'flex', alignItems:'flex-start', gap:10,
      padding:'10px 0', borderBottom:`1px solid ${C.lineS}`,
      cursor:'pointer', opacity: done ? 0.45 : 1 }}>
      <div style={{ width:20, height:20, borderRadius:4, flexShrink:0, marginTop:1,
        border:`1.5px solid ${done ? C.success : C.line}`,
        background: done ? C.success : 'transparent',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:11, color:'#fff' }}>{done ? '✓' : ''}</div>
      <span style={{ fontFamily:"'Crimson Pro',serif", fontSize:15,
        color: done ? C.text3 : C.text1, lineHeight:1.55,
        textDecoration: done ? 'line-through' : 'none' }}>{text}</span>
    </div>
  );
}

// ─── ДАННЫЕ ПОЕЗДКИ ───
function TripSetup({ tripData, onUpdate }) {
  return (
    <Card>
      <SecLabel>Текущая поездка</SecLabel>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {[
          { key:'destination', label:'Место назначения', placeholder:'Город или страна...' },
          { key:'dates',       label:'Даты',             placeholder:'15-22 июля 2025' },
          { key:'budget',      label:'Бюджет (тенге)',   placeholder:'например: 500 000 ₸' },
        ].map(f => (
          <div key={f.key}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10,
              letterSpacing:2, color:C.navyMid, marginBottom:6, textTransform:'uppercase',
              display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ color:C.gold }}>·</span>{f.label}
            </div>
            <input value={tripData[f.key]||''} onChange={e=>onUpdate({ [f.key]:e.target.value })}
              placeholder={f.placeholder}
              style={{ width:'100%', padding:'12px 14px',
                border:`1.5px solid ${C.line}`, borderRadius:8,
                background:'rgba(250,243,224,0.8)',
                fontFamily:"'Crimson Pro',serif", fontSize:16, color:C.text1, outline:'none' }}
            />
          </div>
        ))}
        <div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10,
            letterSpacing:2, color:C.navyMid, marginBottom:6, textTransform:'uppercase',
            display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ color:C.gold }}>·</span>Заметки
          </div>
          <textarea value={tripData.notes||''} onChange={e=>onUpdate({ notes:e.target.value })}
            placeholder="Бронь отеля, контакты, план..." rows={3}
            style={{ width:'100%', padding:'12px 14px',
              border:`1.5px solid ${C.line}`, borderRadius:8,
              background:'rgba(250,243,224,0.8)',
              fontFamily:"'Crimson Pro',serif", fontSize:16, color:C.text1,
              outline:'none', resize:'vertical' }}
          />
        </div>
      </div>
    </Card>
  );
}

// ─── БЮДЖЕТ ───
function BudgetBlock({ tripData, onUpdate }) {
  const expenses = tripData.expenses || [];
  const budget = parseFloat((tripData.budget||'0').replace(/[^\d.]/g,'')) || 0;
  const spent = expenses.reduce((s,e)=>s+parseFloat(e.amount||0),0);
  const left = budget - spent;
  const pct = budget > 0 ? Math.min(100, (spent/budget)*100) : 0;

  const CATEGORIES = [
    { id:'transport', label:'Транспорт', emoji:'✈️' },
    { id:'hotel',     label:'Проживание', emoji:'🏨' },
    { id:'food',      label:'Питание',    emoji:'🍽️' },
    { id:'tours',     label:'Экскурсии',  emoji:'🗺️' },
    { id:'shopping',  label:'Шопинг',     emoji:'🛍️' },
    { id:'other',     label:'Прочее',     emoji:'💰' },
  ];

  const [form, setForm] = useState({ cat:'transport', desc:'', amount:'' });
  const addExpense = () => {
    if (!form.amount||!form.desc) return;
    const next = [...expenses, { id:Date.now(), ...form, date:localDateStr(new Date()) }];
    onUpdate({ expenses:next });
    setForm({ cat:'transport', desc:'', amount:'' });
  };

  return (
    <Card>
      <SecLabel>Бюджет поездки</SecLabel>

      {/* Прогресс */}
      {budget > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ fontFamily:"'Crimson Pro',serif", fontSize:15, color:C.text2 }}>
              Потрачено: <strong>{spent.toLocaleString('ru')} ₸</strong>
            </span>
            <span style={{ fontFamily:"'Crimson Pro',serif", fontSize:15,
              color: left < 0 ? C.error : C.success }}>
              Осталось: <strong>{left.toLocaleString('ru')} ₸</strong>
            </span>
          </div>
          <div style={{ height:8, background:`rgba(10,37,64,0.09)`, borderRadius:4, overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:4, transition:'width .4s',
              width:`${pct}%`,
              background: pct>90 ? `linear-gradient(90deg,${C.error},#c0392b)` :
                          pct>70 ? `linear-gradient(90deg,${C.gold},${C.goldDeep})` :
                                   `linear-gradient(90deg,${C.navyMid},${C.gold})` }} />
          </div>
          <div style={{ textAlign:'right', fontFamily:"'JetBrains Mono',monospace",
            fontSize:9, color:C.text3, marginTop:4 }}>
            {pct.toFixed(0)}% от бюджета {budget.toLocaleString('ru')} ₸
          </div>
        </div>
      )}

      {/* По категориям */}
      {expenses.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:14 }}>
          {CATEGORIES.map(cat => {
            const sum = expenses.filter(e=>e.cat===cat.id).reduce((s,e)=>s+parseFloat(e.amount||0),0);
            if (!sum) return null;
            return (
              <div key={cat.id} style={{ padding:'8px 10px', borderRadius:8,
                background:`rgba(10,37,64,0.05)`, border:`1px solid ${C.lineS}`,
                textAlign:'center' }}>
                <div style={{ fontSize:18, marginBottom:2 }}>{cat.emoji}</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                  color:C.text3, marginBottom:2, letterSpacing:0.5 }}>{cat.label}</div>
                <div style={{ fontFamily:"'Crimson Pro',serif", fontSize:14,
                  color:C.text1, fontWeight:700 }}>{sum.toLocaleString('ru')} ₸</div>
              </div>
            );
          }).filter(Boolean)}
        </div>
      )}

      {/* Добавить расход */}
      <div style={{ background:`rgba(10,37,64,0.04)`, borderRadius:8, padding:12,
        border:`1px solid ${C.lineS}` }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
          letterSpacing:2, color:C.navyMid, marginBottom:10, textTransform:'uppercase' }}>
          + Добавить расход
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <select value={form.cat} onChange={e=>setForm({...form,cat:e.target.value})}
            style={{ padding:'9px 10px', border:`1.5px solid ${C.line}`, borderRadius:6,
              background:'rgba(250,243,224,0.9)', fontFamily:"'Crimson Pro',serif",
              fontSize:14, color:C.text1, outline:'none' }}>
            {CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select>
          <input value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})}
            placeholder="Описание" style={{ flex:1, minWidth:100, padding:'9px 12px',
              border:`1.5px solid ${C.line}`, borderRadius:6,
              background:'rgba(250,243,224,0.9)', fontFamily:"'Crimson Pro',serif",
              fontSize:14, color:C.text1, outline:'none' }} />
          <input value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}
            placeholder="Сумма ₸" type="number" style={{ width:100, padding:'9px 12px',
              border:`1.5px solid ${C.line}`, borderRadius:6,
              background:'rgba(250,243,224,0.9)', fontFamily:"'Crimson Pro',serif",
              fontSize:14, color:C.text1, outline:'none' }} />
          <button onClick={addExpense} style={{ padding:'9px 18px', borderRadius:6,
            fontFamily:"'Cinzel',serif", fontSize:12, letterSpacing:1.5,
            fontWeight:700, textTransform:'uppercase', cursor:'pointer',
            background:`linear-gradient(135deg,${C.navyMid},${C.navy})`,
            color:C.goldPale, border:`1.5px solid ${C.navy}` }}>
            +
          </button>
        </div>
      </div>

      {/* Список расходов */}
      {expenses.length > 0 && (
        <div style={{ marginTop:12 }}>
          {expenses.slice().reverse().map(e => {
            const cat = CATEGORIES.find(c=>c.id===e.cat);
            return (
              <div key={e.id} style={{ display:'flex', alignItems:'center', gap:10,
                padding:'8px 0', borderBottom:`1px solid ${C.lineS}` }}>
                <span style={{ fontSize:16 }}>{cat?.emoji}</span>
                <span style={{ flex:1, fontFamily:"'Crimson Pro',serif",
                  fontSize:14, color:C.text1 }}>{e.desc}</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace",
                  fontSize:12, color:C.text2, fontWeight:600 }}>
                  {parseFloat(e.amount).toLocaleString('ru')} ₸
                </span>
                <span onClick={()=>onUpdate({expenses:expenses.filter(x=>x.id!==e.id)})}
                  style={{ fontSize:16, color:C.text3, cursor:'pointer', padding:'0 4px' }}>×</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── БРОНИРОВАНИЕ ───
function BookingLinks({ transport }) {
  const [showHotels, setShowHotels] = useState(false);
  const sites = BOOKING_SITES[transport] || BOOKING_SITES.plane;

  return (
    <Card>
      <SecLabel>Бронирование из Алматы</SecLabel>

      <div style={{ marginBottom:14 }}>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
          letterSpacing:2, color:C.text3, textTransform:'uppercase', marginBottom:10 }}>
          {TRANSPORT_TYPES.find(t=>t.id===transport)?.emoji} Билеты
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {sites.map(site => (
            <a key={site.name} href={site.url} target="_blank" rel="noopener noreferrer"
              style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                borderRadius:8, background:`rgba(10,37,64,0.04)`,
                border:`1px solid ${C.lineS}`, textDecoration:'none',
                transition:'all .2s' }}
              onMouseEnter={e=>{e.currentTarget.style.background=`rgba(10,37,64,0.08)`;e.currentTarget.style.borderColor=C.navyMid;}}
              onMouseLeave={e=>{e.currentTarget.style.background=`rgba(10,37,64,0.04)`;e.currentTarget.style.borderColor=C.lineS;}}>
              <span style={{ fontSize:22 }}>{site.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Cinzel',serif", fontSize:14,
                  color:C.navy, fontWeight:600, letterSpacing:1 }}>{site.name}</div>
                <div style={{ fontFamily:"'Crimson Pro',serif", fontSize:13,
                  color:C.text3 }}>{site.desc}</div>
              </div>
              <span style={{ fontSize:16, color:C.gold }}>→</span>
            </a>
          ))}
        </div>
      </div>

      <div style={{ borderTop:`1px solid ${C.lineS}`, paddingTop:12 }}>
        <div onClick={()=>setShowHotels(!showHotels)}
          style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
            letterSpacing:2, color:C.navyMid, textTransform:'uppercase',
            marginBottom: showHotels ? 10 : 0,
            cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          🏨 Проживание
          <span style={{ color:C.gold, fontSize:12,
            transform:showHotels?'rotate(180deg)':'rotate(0)', transition:'.2s' }}>▼</span>
        </div>
        {showHotels && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {HOTEL_SITES.map(site => (
              <a key={site.name} href={site.url} target="_blank" rel="noopener noreferrer"
                style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                  borderRadius:8, background:`rgba(10,37,64,0.04)`,
                  border:`1px solid ${C.lineS}`, textDecoration:'none' }}>
                <span style={{ fontSize:22 }}>{site.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Cinzel',serif", fontSize:14,
                    color:C.navy, fontWeight:600, letterSpacing:1 }}>{site.name}</div>
                  <div style={{ fontFamily:"'Crimson Pro',serif", fontSize:13,
                    color:C.text3 }}>{site.desc}</div>
                </div>
                <span style={{ fontSize:16, color:C.gold }}>→</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── ТРАНСПОРТ + ЛАЙФХАКИ ───
function TransportBlock({ tripData, onUpdate }) {
  const selected = tripData.transport || null;
  const tips = selected ? TRAVEL_TIPS[selected] : null;
  const [openSection, setOpenSection] = useState('before');
  const SECTIONS = [
    { id:'before',  label:'До поездки',  emoji:'📋' },
    { id:'during',  label:'В пути',      emoji:'🚀' },
    { id:'after',   label:'По прибытии', emoji:'🏁' },
    { id:'packing', label:'Что взять',   emoji:'🎒' },
  ];
  const dest = tripData.destination||'';
  const dates = tripData.dates||'';

  return (
    <Card>
      <SecLabel>Транспорт</SecLabel>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, marginBottom:16 }}>
        {TRANSPORT_TYPES.map(t => {
          const isActive = selected===t.id;
          return (
            <div key={t.id} onClick={()=>onUpdate({ transport:t.id })}
              style={{ borderRadius:10, overflow:'hidden', cursor:'pointer',
                border:`2px solid ${isActive ? C.gold : C.lineS}`,
                boxShadow: isActive ? `0 0 12px rgba(212,175,55,0.35)` : 'none',
                transition:'all .2s', aspectRatio:'1', position:'relative',
                background: C.navyMid }}>
              <img src={t.img} alt={t.label}
                style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}
                onError={e=>{e.target.style.display='none';}}
              />
              <div style={{ position:'absolute', inset:0,
                background:'linear-gradient(to top, rgba(10,25,45,0.85) 0%, rgba(10,25,45,0.2) 100%)' }} />
              <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'4px 4px 5px', textAlign:'center' }}>
                <div style={{ fontSize:16 }}>{t.emoji}</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:7,
                  color:'#fff', letterSpacing:0.5, lineHeight:1.2 }}>{t.label}</div>
              </div>
              {isActive && (
                <div style={{ position:'absolute', top:4, right:4, width:10, height:10,
                  borderRadius:'50%', background:C.gold }} />
              )}
            </div>
          );
        })}
      </div>

      {tips && (
        <>
          <div style={{ display:'flex', gap:4, marginBottom:14,
            background:`rgba(10,37,64,0.05)`, border:`1.5px solid ${C.line}`,
            borderRadius:6, padding:3 }}>
            {SECTIONS.map(s => (
              <button key={s.id} onClick={()=>setOpenSection(s.id)} style={{
                flex:1, padding:'8px 4px', border:'none', borderRadius:4,
                cursor:'pointer', textAlign:'center',
                fontFamily:"'JetBrains Mono',monospace", fontSize:8, letterSpacing:0.5,
                background: openSection===s.id ? C.navy : 'transparent',
                color: openSection===s.id ? C.goldPale : C.text3,
                fontWeight: openSection===s.id ? 700 : 400 }}>
                <div style={{ fontSize:14, marginBottom:2 }}>{s.emoji}</div>
                {s.label}
              </button>
            ))}
          </div>
          <div>
            {(tips[openSection]||[]).map((tip,i) => (
              <TipRow key={`${selected}-${openSection}-${i}`}
                text={tip}
                storageKey={`ld_tip_${selected}_${openSection}_${i}_${dest}_${dates}`}
              />
            ))}
          </div>
        </>
      )}

      {!selected && (
        <div style={{ textAlign:'center', padding:'20px 0',
          fontFamily:"'Cormorant Infant',serif", fontSize:16,
          fontStyle:'italic', color:C.text3 }}>
          Выберите транспорт для просмотра лайфхаков
        </div>
      )}
    </Card>
  );
}

// ─── КАРТОЧКА МЕСТА (ИИ) ───
function DestinationCard({ tripData }) {
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dest = tripData.destination||'';
  const storageKey = `ld_travel_dest_${dest.toLowerCase().replace(/\s+/g,'_')}`;

  useEffect(() => {
    if (!dest) return;
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) setAiData(JSON.parse(cached));
    } catch {}
  }, [dest, storageKey]);

  const fetchDestInfo = useCallback(async () => {
    if (!dest) return;
    setLoading(true); setError(null);
    try {
      const transport = TRANSPORT_TYPES.find(t=>t.id===tripData.transport)?.label||'';
      const dates = tripData.dates||'';
      const prompt = `Ты — опытный трэвел-эксперт. Пользователь летит из Алматы, Казахстан в "${dest}"${transport?` на ${transport}`:''}${dates?` (${dates})`:''}.\n\nОтветь ТОЛЬКО JSON (без markdown):\n{"overview":"2-3 предложения о месте","highlights":["топ-5 достопримечательностей с emoji"],"tips":["3-5 советов для туристов из Казахстана"],"food":["3-4 блюда с emoji"],"warnings":["2-3 важных предупреждения"],"bestTime":"лучшее время","transport":"как передвигаться внутри","budget":"примерный бюджет в USD/день","visa":"нужна ли виза для граждан Казахстана","currency":"валюта страны и курс к тенге"}`;
      const response = await askViaServer('Ты — опытный трэвел-эксперт. Отвечай ТОЛЬКО валидным JSON, без markdown и пояснений.', prompt, 1000);
      const parsed = JSON.parse(response.replace(/```json|```/g,'').trim());
      setAiData(parsed);
      try { localStorage.setItem(storageKey, JSON.stringify(parsed)); } catch {}
    } catch(e) {
      setError('Не удалось загрузить информацию. Проверьте соединение.');
    } finally { setLoading(false); }
  }, [dest, tripData.transport, tripData.dates, storageKey]);

  if (!dest) return null;

  return (
    <div style={{ position:'relative', borderRadius:12, overflow:'hidden',
      marginBottom:14, border:`1.5px solid ${C.line}`,
      boxShadow:`0 4px 16px rgba(10,37,64,0.12)` }}>
      <img src="/travel/destination-card.jpg" alt=""
        style={{ position:'absolute', inset:0, width:'100%', height:'100%',
          objectFit:'cover', opacity:0.12, pointerEvents:'none' }}
        onError={e=>e.target.style.display='none'}
      />
      <div style={{ position:'absolute', inset:0,
        background:`linear-gradient(160deg, rgba(250,243,224,0.96) 0%, rgba(240,230,205,0.95) 100%)`,
        backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(10,37,64,0.03) 28px)` }} />
      <div style={{ position:'absolute', top:7, left:7, width:12, height:12,
        borderTop:`2px solid ${C.gold}`, borderLeft:`2px solid ${C.gold}`, opacity:0.8 }} />
      <div style={{ position:'absolute', bottom:7, right:7, width:12, height:12,
        borderBottom:`2px solid ${C.gold}`, borderRight:`2px solid ${C.gold}`, opacity:0.8 }} />

      <div style={{ position:'relative', zIndex:1, padding:18 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          marginBottom:14, paddingBottom:12, borderBottom:`1.5px solid ${C.line}` }}>
          <div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
              letterSpacing:3, color:C.text3, textTransform:'uppercase', marginBottom:3 }}>
              Место назначения
            </div>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:20, fontWeight:700,
              color:C.navy, letterSpacing:2, textTransform:'uppercase' }}>{dest}</div>
          </div>
          <button onClick={fetchDestInfo} disabled={loading} style={{
            padding:'10px 16px', borderRadius:8, fontFamily:"'Cinzel',serif",
            fontSize:12, fontWeight:600, letterSpacing:1.5, cursor:'pointer',
            background: loading ? `rgba(10,37,64,0.08)` : `linear-gradient(135deg,${C.navyMid},${C.navy})`,
            color: loading ? C.text3 : C.goldPale,
            border:`1.5px solid ${loading ? C.lineS : C.navy}`,
            textTransform:'uppercase' }}>
            {loading ? '⏳...' : aiData ? '🔄 Обновить' : '✨ Узнать'}
          </button>
        </div>

        {error && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14,
          background:'rgba(107,16,16,0.08)', border:`1px solid rgba(107,16,16,0.25)`,
          fontFamily:"'Crimson Pro',serif", fontSize:14, color:C.error }}>{error}</div>}

        {loading && <div style={{ textAlign:'center', padding:'30px 0',
          fontFamily:"'Cormorant Infant',serif", fontSize:16, fontStyle:'italic', color:C.text3 }}>
          ИИ собирает информацию о {dest}...
        </div>}

        {aiData && !loading && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ fontFamily:"'Crimson Pro',serif", fontSize:16, color:C.text2, lineHeight:1.7,
              padding:'10px 14px', background:`rgba(10,37,64,0.04)`, borderRadius:8,
              borderLeft:`3px solid ${C.gold}` }}>{aiData.overview}</div>

            {/* Виза + валюта */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { label:'Виза', value:aiData.visa, icon:'📋' },
                { label:'Валюта', value:aiData.currency, icon:'💱' },
                { label:'Бюджет/день', value:aiData.budget, icon:'💰' },
                { label:'Лучшее время', value:aiData.bestTime, icon:'📅' },
              ].filter(r=>r.value).map((row,i) => (
                <div key={i} style={{ padding:'10px 12px', borderRadius:8,
                  background:`rgba(10,37,64,0.05)`, border:`1px solid ${C.lineS}` }}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                    letterSpacing:1.5, color:C.text3, marginBottom:4, textTransform:'uppercase' }}>
                    {row.icon} {row.label}
                  </div>
                  <div style={{ fontFamily:"'Crimson Pro',serif", fontSize:15,
                    color:C.text1, lineHeight:1.4 }}>{row.value}</div>
                </div>
              ))}
            </div>

            {aiData.highlights?.length > 0 && (
              <div>
                <SecLabel>Топ достопримечательностей</SecLabel>
                {aiData.highlights.map((h,i) => (
                  <div key={i} style={{ display:'flex', gap:10, padding:'8px 0',
                    borderBottom:`1px solid ${C.lineS}`,
                    fontFamily:"'Crimson Pro',serif", fontSize:15, color:C.text1, lineHeight:1.5 }}>
                    <span style={{ color:C.gold, fontWeight:700, flexShrink:0 }}>{i+1}.</span>{h}
                  </div>
                ))}
              </div>
            )}

            {aiData.food?.length > 0 && (
              <div>
                <SecLabel>Что попробовать</SecLabel>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {aiData.food.map((f,i) => (
                    <div key={i} style={{ padding:'6px 14px', borderRadius:20,
                      background:`rgba(10,37,64,0.06)`, border:`1px solid ${C.line}`,
                      fontFamily:"'Crimson Pro',serif", fontSize:14, color:C.text1 }}>{f}</div>
                  ))}
                </div>
              </div>
            )}

            {aiData.tips?.length > 0 && (
              <div>
                <SecLabel>Советы из Казахстана</SecLabel>
                {aiData.tips.map((tip,i) => (
                  <TipRow key={i} text={tip}
                    storageKey={`ld_dest_tip_${dest}_${i}`} />
                ))}
              </div>
            )}

            {aiData.warnings?.length > 0 && (
              <div style={{ padding:'12px 14px', borderRadius:8,
                background:'rgba(107,16,16,0.06)', border:`1px solid rgba(107,16,16,0.20)`,
                borderLeft:`3px solid ${C.error}` }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                  letterSpacing:2, color:C.error, marginBottom:8, textTransform:'uppercase' }}>
                  ⚠ Важно знать
                </div>
                {aiData.warnings.map((w,i) => (
                  <div key={i} style={{ fontFamily:"'Crimson Pro',serif",
                    fontSize:14, color:C.error, lineHeight:1.5, marginBottom:4 }}>· {w}</div>
                ))}
              </div>
            )}

            {aiData.transport && (
              <div style={{ padding:'10px 14px', borderRadius:8,
                background:`rgba(10,37,64,0.04)`, border:`1px solid ${C.lineS}`,
                borderLeft:`3px solid ${C.navyMid}` }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                  color:C.navyMid, marginBottom:4, letterSpacing:1, textTransform:'uppercase' }}>
                  🚇 Транспорт внутри
                </div>
                <div style={{ fontFamily:"'Crimson Pro',serif", fontSize:15, color:C.text2 }}>
                  {aiData.transport}
                </div>
              </div>
            )}
          </div>
        )}

        {!aiData && !loading && !error && (
          <div style={{ textAlign:'center', padding:'20px 0',
            fontFamily:"'Cormorant Infant',serif", fontSize:16,
            fontStyle:'italic', color:C.text3 }}>
            Нажмите «Узнать» для информации о месте
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ИИ-ЧЕКЛИСТ (что взять) ───
function AiPackingList({ tripData }) {
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const dest = tripData.destination||'';
  const transport = TRANSPORT_TYPES.find(t=>t.id===tripData.transport)?.label||'';
  const dates = tripData.dates||'';
  const storageKey = `ld_packing_${dest}_${tripData.transport}_${dates}`.replace(/\s+/g,'_');

  useEffect(() => {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) setItems(JSON.parse(cached));
    } catch {}
  }, [storageKey]);

  const generate = async () => {
    setLoading(true);
    try {
      const prompt = `Составь чеклист вещей для поездки из Алматы, Казахстан${dest?` в ${dest}`:''}${transport?` на ${transport}`:''}${dates?` (${dates})`:''}.\n\nОтветь ТОЛЬКО JSON (без markdown):\n{"categories":[{"name":"Документы","emoji":"📋","items":["паспорт","..."]},{"name":"Одежда","emoji":"👕","items":[...]},{"name":"Техника","emoji":"📱","items":[...]},{"name":"Медицина","emoji":"💊","items":[...]},{"name":"Прочее","emoji":"🎒","items":[...]}]}`;
      const response = await askViaServer('Отвечай ТОЛЬКО валидным JSON, без markdown и пояснений.', prompt, 1000);
      const parsed = JSON.parse(response.replace(/```json|```/g,'').trim());
      setItems(parsed.categories||[]);
      try { localStorage.setItem(storageKey, JSON.stringify(parsed.categories)); } catch {}
    } catch(e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  return (
    <Card>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
        marginBottom:12 }}>
        <SecLabel>Что взять с собой</SecLabel>
        <button onClick={generate} disabled={loading} style={{
          padding:'8px 14px', borderRadius:6, fontFamily:"'Cinzel',serif",
          fontSize:11, fontWeight:600, letterSpacing:1.5, cursor:'pointer',
          background: loading ? `rgba(10,37,64,0.08)` : `linear-gradient(135deg,${C.navyMid},${C.navy})`,
          color: loading ? C.text3 : C.goldPale,
          border:`1.5px solid ${loading ? C.lineS : C.navy}`,
          textTransform:'uppercase' }}>
          {loading ? '⏳...' : items ? '🔄' : '✨ ИИ'}
        </button>
      </div>

      {loading && <div style={{ textAlign:'center', padding:'20px 0',
        fontFamily:"'Cormorant Infant',serif", fontSize:16,
        fontStyle:'italic', color:C.text3 }}>Составляю список...</div>}

      {items && !loading && items.map((cat, ci) => (
        <div key={ci} style={{ marginBottom:14 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
            letterSpacing:2, color:C.navyMid, textTransform:'uppercase',
            marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:14 }}>{cat.emoji}</span>{cat.name}
          </div>
          {(cat.items||[]).map((item, ii) => (
            <TipRow key={ii} text={item}
              storageKey={`ld_pack_${storageKey}_${ci}_${ii}`} />
          ))}
        </div>
      ))}

      {!items && !loading && (
        <div style={{ textAlign:'center', padding:'20px 0',
          fontFamily:"'Cormorant Infant',serif", fontSize:16,
          fontStyle:'italic', color:C.text3 }}>
          ИИ составит персональный список с учётом страны, транспорта и дат
        </div>
      )}
    </Card>
  );
}

// ─── ОБЫЧНЫЙ ЧЕКЛИСТ ───
function TripChecklist({ tripData, onUpdate }) {
  const items = tripData.checklist||[];
  const done = items.filter(i=>i.done).length;
  const pct = items.length ? (done/items.length)*100 : 0;

  const addItem = () => {
    const text = prompt('Что добавить?');
    if (!text?.trim()) return;
    onUpdate({ checklist:[...items, { id:Date.now(), text:text.trim(), done:false }] });
  };

  return (
    <Card>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
        marginBottom:12 }}>
        <SecLabel>Мой чеклист</SecLabel>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10,
          color:C.text3 }}>{done}/{items.length}</div>
      </div>

      {items.length > 0 && (
        <div style={{ height:5, background:`rgba(10,37,64,0.08)`, borderRadius:3,
          overflow:'hidden', marginBottom:12 }}>
          <div style={{ height:'100%', borderRadius:3, transition:'width .4s',
            width:`${pct}%`,
            background:`linear-gradient(90deg,${C.navyMid},${C.gold})` }} />
        </div>
      )}

      {items.map(item => (
        <div key={item.id} style={{ display:'flex', alignItems:'center', gap:10,
          padding:'9px 0', borderBottom:`1px solid ${C.lineS}` }}>
          <div onClick={()=>onUpdate({checklist:items.map(i=>i.id===item.id?{...i,done:!i.done}:i)})}
            style={{ width:20, height:20, borderRadius:4, flexShrink:0,
              border:`1.5px solid ${item.done?C.success:C.line}`,
              background:item.done?C.success:'transparent',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, color:'#fff', cursor:'pointer' }}>
            {item.done?'✓':''}
          </div>
          <span style={{ flex:1, fontFamily:"'Crimson Pro',serif", fontSize:15,
            color:item.done?C.text3:C.text1,
            textDecoration:item.done?'line-through':'none' }}>{item.text}</span>
          <div onClick={()=>onUpdate({checklist:items.filter(i=>i.id!==item.id)})}
            style={{ fontSize:16, color:C.text3, cursor:'pointer', padding:'0 4px' }}>×</div>
        </div>
      ))}

      <button onClick={addItem} style={{ width:'100%', marginTop:12, padding:'11px 0',
        border:`1.5px dashed rgba(10,37,64,0.28)`, borderRadius:8, background:'transparent',
        fontFamily:"'Cinzel',serif", fontSize:12, letterSpacing:2,
        color:C.text2, cursor:'pointer', textTransform:'uppercase' }}>
        + Добавить
      </button>
    </Card>
  );
}

// ─── СИНХРОНИЗАЦИЯ С РАСПИСАНИЕМ ───
function ScheduleSync({ tripData, tasks, setTasks, notify }) {
  const dest = tripData.destination||'';
  const dates = tripData.dates||'';
  const [synced, setSynced] = useState(false);

  const syncToSchedule = () => {
    const tripDates = parseDateRange(dates);
    if (!tripDates.length) {
      notify?.('⚠️ Укажите даты в формате: 15-22 июля 2025');
      return;
    }

    // Удаляем старые записи этой поездки
    const cleaned = tasks.filter(t => !t.isTravelEvent);

    // Добавляем новые — первая запись каждого дня (06:00)
    const newTasks = tripDates.map(dateStr => ({
      id: `travel_${dateStr}_${Date.now()}`,
      title: `✈️ Поездка${dest ? `: ${dest}` : ''}`,
      section: 'schedule',
      preferredTime: '06:00',
      freq: `once:${dateStr}`,
      dueDate: dateStr,
      isTravelEvent: true,
      createdAt: new Date().toISOString(),
    }));

    setTasks([...cleaned, ...newTasks]);
    setSynced(true);
    notify?.(`✅ Добавлено в расписание: ${tripDates.length} дн.`);
  };

  const removeFromSchedule = () => {
    setTasks(tasks.filter(t => !t.isTravelEvent));
    setSynced(false);
    notify?.('🗑️ Поездка удалена из расписания');
  };

  const hasTravelEvents = tasks.some(t => t.isTravelEvent);

  if (!dest && !dates) return null;

  return (
    <Card>
      <SecLabel>Синхронизация с расписанием</SecLabel>
      <div style={{ fontFamily:"'Crimson Pro',serif", fontSize:15, color:C.text2,
        lineHeight:1.6, marginBottom:14 }}>
        {dest && <span>📍 {dest}</span>}
        {dest && dates && <span style={{ color:C.text3 }}> · </span>}
        {dates && <span>📅 {dates}</span>}
        {parseDateRange(dates).length > 0 && (
          <span style={{ display:'block', marginTop:4,
            fontFamily:"'JetBrains Mono',monospace", fontSize:10,
            color:C.success, letterSpacing:1 }}>
            ✓ {parseDateRange(dates).length} дней распознано
          </span>
        )}
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={syncToSchedule} style={{
          flex:2, padding:'12px 0', borderRadius:8,
          fontFamily:"'Cinzel',serif", fontSize:13, fontWeight:700,
          letterSpacing:2, textTransform:'uppercase', cursor:'pointer',
          background:`linear-gradient(135deg,${C.navyMid},${C.navy})`,
          color:C.goldPale, border:`1.5px solid ${C.navy}`,
          boxShadow:`0 3px 10px rgba(10,37,64,0.20)` }}>
          📅 В расписание
        </button>
        {hasTravelEvents && (
          <button onClick={removeFromSchedule} style={{
            flex:1, padding:'12px 0', borderRadius:8,
            fontFamily:"'Cinzel',serif", fontSize:12, fontWeight:600,
            letterSpacing:1.5, textTransform:'uppercase', cursor:'pointer',
            background:'transparent', color:C.error,
            border:`1.5px dashed rgba(107,16,16,0.35)` }}>
            Удалить
          </button>
        )}
      </div>
    </Card>
  );
}

// ─── ГЛАВНЫЙ КОМПОНЕНТ ───
export function TravelSection() {
  const { profile, tasks, setTasks, notify } = useApp();

  const [tripData, setTripData] = useState(() => {
    try {
      const saved = localStorage.getItem('ld_travel_current');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      destination: profile?.travelDestination||'',
      dates: profile?.travelDates||'',
      transport: null,
      notes: '',
      budget: '',
      expenses: [],
      checklist: [],
    };
  });

  const updateTrip = useCallback((patch) => {
    setTripData(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem('ld_travel_current', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <div className="page" style={{ paddingBottom:80 }}>

      {/* Шапка */}
      <div style={{ position:'relative', borderRadius:12, overflow:'hidden',
        marginBottom:18, height:140, boxShadow:`0 5px 20px rgba(10,37,64,0.18)` }}>
        <img src="/sections/travel.jpg" alt="Поездки"
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}
          onError={e=>{e.target.style.background=C.navyMid;}}
        />
        <div style={{ position:'absolute', inset:0,
          background:'linear-gradient(to top, rgba(10,25,45,0.80) 0%, rgba(10,25,45,0.20) 70%, transparent 100%)' }} />
        <div style={{ position:'absolute', top:7, left:7, width:12, height:12,
          borderTop:`2px solid ${C.gold}`, borderLeft:`2px solid ${C.gold}`, opacity:0.8 }} />
        <div style={{ position:'absolute', bottom:7, right:7, width:12, height:12,
          borderBottom:`2px solid ${C.gold}`, borderRight:`2px solid ${C.gold}`, opacity:0.8 }} />
        <div style={{ position:'absolute', bottom:16, left:18 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
            letterSpacing:3, color:C.goldPale, textTransform:'uppercase',
            marginBottom:4, opacity:0.9 }}>Путевой дневник</div>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:22, fontWeight:700,
            color:'#fff', letterSpacing:3, textTransform:'uppercase',
            textShadow:'0 2px 8px rgba(0,0,0,0.5)' }}>
            {tripData.destination ? `→ ${tripData.destination}` : 'Мои поездки'}
          </div>
        </div>
      </div>

      <TripSetup tripData={tripData} onUpdate={updateTrip} />
      <ScheduleSync tripData={tripData} tasks={tasks} setTasks={setTasks} notify={notify} />
      <TransportBlock tripData={tripData} onUpdate={updateTrip} />
      {tripData.transport && <BookingLinks transport={tripData.transport} />}
      <BudgetBlock tripData={tripData} onUpdate={updateTrip} />
      <DestinationCard tripData={tripData} />
      <AiPackingList tripData={tripData} />
      <TripChecklist tripData={tripData} onUpdate={updateTrip} />
    </div>
  );
                               }
