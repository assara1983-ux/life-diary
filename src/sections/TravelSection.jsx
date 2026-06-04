// src/sections/TravelSection.jsx
import { useState, useEffect, useCallback } from "react";
import { useApp } from "../store/AppContext";

// ─── ПАЛИТРА ───
const C = {
  navy:'#0A2540', navyMid:'#1E3A5F', navyLight:'#2C4F7A',
  gold:'#D4AF37', goldDeep:'#B8941E', goldPale:'#F0DC90',
  bg:'#F5E8C7', bgCard:'#FAF3E0', bgCard2:'#F2E8CE',
  text1:'#0A2540', text2:'#1E3A5F', text3:'#4A6480',
  success:'#1A4D2E', error:'#6B1010',
  line:'rgba(10,37,64,0.22)', lineS:'rgba(10,37,64,0.10)',
};

// ─── ТРАНСПОРТ ───
const TRANSPORT_TYPES = [
  { id:'plane', label:'Самолёт', emoji:'✈️', img:'/travel/transport-plane.jpg' },
  { id:'car',   label:'Авто',    emoji:'🚗', img:'/travel/transport-car.jpg' },
  { id:'train', label:'Поезд',   emoji:'🚂', img:'/travel/transport-train.jpg' },
  { id:'ship',  label:'Корабль', emoji:'🚢', img:'/travel/transport-ship.jpg' },
  { id:'bus',   label:'Автобус', emoji:'🚌', img:'/travel/transport-bus.jpg' },
];

// ─── БАЗА ЛАЙФХАКОВ ───
const TRAVEL_TIPS = {
  plane: {
    before: [
      'Онлайн-регистрация открывается за 24ч — выбирайте место у окна заранее',
      'Распечатайте посадочный талон или сохраните в Wallet — в аэропорту не будет связи',
      'Жидкости только до 100мл, все в прозрачный пакет 1л',
      'Зарядите все устройства до 100% — на досмотре могут попросить включить',
      'Прибудьте в аэропорт за 2ч (внутренний) или 3ч (международный)',
      'Возьмите наличные местной валюты на первые расходы',
    ],
    during: [
      'Пейте воду каждый час — в самолёте очень сухой воздух',
      'Вставайте и разминайтесь каждые 2ч для профилактики тромбоза',
      'Не пейте алкоголь — на высоте он действует в 2 раза сильнее',
      'Используйте беруши и маску для сна — сэкономит силы',
      'Перед посадкой жуйте жвачку или зевайте — выравнивает давление в ушах',
      'Переведите часы на местное время сразу после взлёта',
    ],
    after: [
      'Выпейте 500мл воды сразу после прилёта',
      'При смене часовых поясов: ложитесь спать по местному времени',
      'Не планируйте важных встреч в день прилёта при разнице >4 часов',
      'Для акклиматизации: первый день — лёгкая прогулка, без активности',
    ],
    packing: [
      'Компрессионные носки обязательны для перелётов >4ч',
      'Подушка для шеи, маска, беруши — в ручную кладь',
      'Смена одежды в ручной клади на случай потери багажа',
      'Лекарства только в оригинальной упаковке с рецептом',
    ],
  },
  car: {
    before: [
      'Проверьте давление в шинах, масло, омыватель и тормозную жидкость',
      'Загрузите офлайн-карты (Maps.me или Google Maps офлайн)',
      'Возьмите аптечку, знак аварийной остановки, огнетушитель',
      'Проверьте страховку и техосмотр — штрафы на границах высокие',
      'Заправьте полный бак перед выездом из города',
    ],
    during: [
      'Делайте остановку каждые 2ч — 10-15 минут для восстановления внимания',
      'Не ешьте тяжёлую пищу за рулём — вызывает сонливость',
      'Держите дистанцию 3 секунды — считайте по столбам',
      'При усталости: кофе + 20 минут сна = эффект бодрости на 2ч',
      'В незнакомом городе: включите звук навигатора, не смотрите на экран',
    ],
    after: [
      'Запишите пробег и расходы на топливо после каждого этапа',
      'Проверьте масло при длительных поездках каждые 500км',
    ],
    packing: [
      'Зарядное с нескольких портов USB для всех устройств',
      'Холодильник-сумка для еды и напитков',
      'Плед и подушка для пассажиров',
      'Наличные — на трассе карты часто не принимают',
    ],
  },
  train: {
    before: [
      'Купите постельное бельё заранее или возьмите своё',
      'Положите еду в плотный контейнер — запахи в купе распространяются',
      'Скачайте фильмы и книги — интернет в поездах нестабильный',
      'Нижняя полка удобнее для длительных поездок',
    ],
    during: [
      'Замок для рюкзака на ночь — даже в купе',
      'Попросите проводника разбудить за 30-40 минут до станции',
      'Берите горячую воду из титана — чай и каши доступны всегда',
      'Заряжайте устройства в зонах розеток — в купе их мало',
    ],
    after: [
      'Уточните у проводника расписание — иногда поезд приходит раньше',
    ],
    packing: [
      'Тапочки — обязательно',
      'Туалетные принадлежности в доступном месте',
      'Снеки и термос с чаем',
      'Беруши — соседи бывают громкими',
    ],
  },
  ship: {
    before: [
      'Возьмите таблетки от морской болезни — выпейте за 1ч до отплытия',
      'Уточните правила провоза алкоголя на борту',
      'Забронируйте каюту ближе к центру судна — меньше качает',
    ],
    during: [
      'При качке смотрите на горизонт — стабилизирует вестибулярный аппарат',
      'Ешьте лёгкую пищу в первый день плавания',
      'Патч от укачивания за ухо действует до 72 часов',
      'Свежий воздух на палубе лучше, чем закрытая каюта при тошноте',
    ],
    after: [
      'После длительного круиза первые часы на суше может казаться что земля качается — это нормально',
    ],
    packing: [
      'Тёплая куртка — на воде холоднее даже летом',
      'Водонепроницаемый чехол для телефона',
      'Санскрин — вода усиливает UV-излучение',
    ],
  },
  bus: {
    before: [
      'Выберите место за водителем — меньше укачивает',
      'Возьмите подушку для шеи — спинки часто не откидываются',
      'Уточните есть ли туалет на борту и остановки',
    ],
    during: [
      'Не кладите ценности в верхние полки — труднее контролировать',
      'Сохраните билет до конца поездки',
      'При остановках уточните время отправления — автобусы уходят строго по расписанию',
    ],
    after: [
      'Сразу разомнитесь — длительное сидение напрягает поясницу',
    ],
    packing: [
      'Запасной аккумулятор — розеток почти нет',
      'Небольшой перекус и вода — не всегда есть буфет',
      'Тёплая кофта — кондиционер часто работает на максимум',
    ],
  },
};

// ─── ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ───

function Card({ children, style={} }) {
  return (
    <div style={{
      background:`linear-gradient(160deg, ${C.bgCard} 0%, ${C.bgCard2} 100%)`,
      border:`1.5px solid ${C.line}`,
      borderRadius:12, padding:18, marginBottom:14,
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
    <div style={{
      fontFamily:"'JetBrains Mono',monospace",
      fontSize:10, letterSpacing:3, color:C.navyMid,
      textTransform:'uppercase', marginBottom:12, marginTop:6,
      paddingBottom:6, borderBottom:`1px solid ${C.lineS}`,
      display:'flex', alignItems:'center', gap:8,
    }}>
      <span style={{ color:C.gold }}>▸</span>
      {children}
    </div>
  );
}

function TipRow({ text, idx }) {
  const [done, setDone] = useState(false);
  return (
    <div onClick={()=>setDone(!done)} style={{
      display:'flex', alignItems:'flex-start', gap:10,
      padding:'10px 0',
      borderBottom:`1px solid ${C.lineS}`,
      cursor:'pointer', transition:'opacity .2s',
      opacity: done ? 0.45 : 1,
    }}>
      <div style={{
        width:20, height:20, borderRadius:4, flexShrink:0, marginTop:1,
        border:`1.5px solid ${done ? C.success : C.line}`,
        background: done ? C.success : 'transparent',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:11, color:'#fff', transition:'all .15s',
      }}>{done ? '✓' : ''}</div>
      <span style={{
        fontFamily:"'Crimson Pro',serif", fontSize:15,
        color: done ? C.text3 : C.text1, lineHeight:1.55,
        textDecoration: done ? 'line-through' : 'none',
      }}>{text}</span>
    </div>
  );
}

// ─── БЛОК ТРАНСПОРТА ───
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

  return (
    <Card>
      <SecLabel>Транспорт</SecLabel>

      {/* Выбор транспорта */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:8, marginBottom:16 }}>
        {TRANSPORT_TYPES.map(t => {
          const isActive = selected === t.id;
          return (
            <div key={t.id} onClick={()=>onUpdate({ transport: t.id })}
              style={{
                borderRadius:10, overflow:'hidden', cursor:'pointer',
                border:`2px solid ${isActive ? C.gold : C.lineS}`,
                boxShadow: isActive ? `0 0 12px rgba(212,175,55,0.35)` : 'none',
                transition:'all .2s', aspectRatio:'1',
                position:'relative', background: C.navyMid,
              }}>
              <img src={t.img} alt={t.label}
                style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}
                onError={e=>{e.target.style.display='none';}}
              />
              <div style={{ position:'absolute', inset:0,
                background:'linear-gradient(to top, rgba(10,25,45,0.85) 0%, rgba(10,25,45,0.2) 100%)' }} />
              <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'4px 4px 5px',
                textAlign:'center' }}>
                <div style={{ fontSize:16 }}>{t.emoji}</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:7,
                  color:'#fff', letterSpacing:0.5, lineHeight:1.2 }}>
                  {t.label}
                </div>
              </div>
              {isActive && (
                <div style={{ position:'absolute', top:4, right:4, width:10, height:10,
                  borderRadius:'50%', background:C.gold }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Лайфхаки */}
      {tips && (
        <>
          {/* Табы секций */}
          <div style={{ display:'flex', gap:4, marginBottom:14,
            background:`rgba(10,37,64,0.05)`,
            border:`1.5px solid ${C.line}`, borderRadius:6, padding:3 }}>
            {SECTIONS.map(s => (
              <button key={s.id} onClick={()=>setOpenSection(s.id)} style={{
                flex:1, padding:'8px 4px', border:'none', borderRadius:4,
                cursor:'pointer', textAlign:'center',
                fontFamily:"'JetBrains Mono',monospace",
                fontSize:8, letterSpacing:0.5,
                background: openSection===s.id ? C.navy : 'transparent',
                color: openSection===s.id ? C.goldPale : C.text3,
                transition:'all .2s', fontWeight: openSection===s.id ? 700 : 400,
              }}>
                <div style={{ fontSize:14, marginBottom:2 }}>{s.emoji}</div>
                {s.label}
              </button>
            ))}
          </div>

          {/* Список лайфхаков */}
          <div>
            {(tips[openSection]||[]).map((tip, i) => (
              <TipRow key={`${selected}-${openSection}-${i}`} text={tip} idx={i} />
            ))}
          </div>
        </>
      )}

      {!selected && (
        <div style={{ textAlign:'center', padding:'20px 0',
          fontFamily:"'Cormorant Infant',serif",
          fontSize:16, fontStyle:'italic', color:C.text3 }}>
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

  const dest = tripData.destination || '';
  const storageKey = `ld_travel_dest_${dest.toLowerCase().replace(/\s+/g,'_')}`;

  // Загружаем кэш из localStorage
  useEffect(() => {
    if (!dest) return;
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) setAiData(JSON.parse(cached));
    } catch {}
  }, [dest, storageKey]);

  const fetchDestInfo = useCallback(async () => {
    if (!dest) return;
    setLoading(true);
    setError(null);
    try {
      const transport = TRANSPORT_TYPES.find(t=>t.id===tripData.transport)?.label || '';
      const dates = tripData.dates || '';
      const prompt = `Ты — опытный трэвел-эксперт. Пользователь едет в "${dest}"${transport ? ` на ${transport}` : ''}${dates ? ` (${dates})` : ''}.

Дай структурированный ответ ТОЛЬКО в JSON (без markdown):
{
  "overview": "2-3 предложения о месте",
  "highlights": ["топ-5 достопримечательностей с emoji"],
  "tips": ["3-5 практических советов для этого места"],
  "food": ["3-4 блюда которые стоит попробовать с emoji"],
  "warnings": ["2-3 важных предупреждения"],
  "bestTime": "лучшее время для посещения",
  "transport": "как добраться внутри города",
  "budget": "примерный дневной бюджет в USD"
}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens:1000,
          messages:[{ role:'user', content:prompt }],
        }),
      });

      const data = await response.json();
      const text = data.content?.find(b=>b.type==='text')?.text || '';
      const clean = text.replace(/```json|```/g,'').trim();
      const parsed = JSON.parse(clean);

      setAiData(parsed);
      try { localStorage.setItem(storageKey, JSON.stringify(parsed)); } catch {}
    } catch(e) {
      setError('Не удалось загрузить информацию. Проверьте соединение.');
    } finally {
      setLoading(false);
    }
  }, [dest, tripData.transport, tripData.dates, storageKey]);

  if (!dest) return null;

  return (
    <div style={{
      position:'relative', borderRadius:12, overflow:'hidden',
      marginBottom:14, border:`1.5px solid ${C.line}`,
      boxShadow:`0 4px 16px rgba(10,37,64,0.12)`,
    }}>
      {/* Фон */}
      <img src="/travel/destination-card.jpg" alt=""
        style={{ position:'absolute', inset:0, width:'100%', height:'100%',
          objectFit:'cover', opacity:0.15, pointerEvents:'none' }}
        onError={e=>e.target.style.display='none'}
      />
      <div style={{ position:'absolute', inset:0,
        background:`linear-gradient(160deg, rgba(250,243,224,0.95) 0%, rgba(240,230,205,0.94) 100%)`,
        backgroundImage:`repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(10,37,64,0.03) 28px)`,
      }} />

      {/* Угловые маркеры */}
      <div style={{ position:'absolute', top:7, left:7, width:12, height:12,
        borderTop:`2px solid ${C.gold}`, borderLeft:`2px solid ${C.gold}`, opacity:0.8 }} />
      <div style={{ position:'absolute', bottom:7, right:7, width:12, height:12,
        borderBottom:`2px solid ${C.gold}`, borderRight:`2px solid ${C.gold}`, opacity:0.8 }} />

      <div style={{ position:'relative', zIndex:1, padding:18 }}>
        {/* Заголовок */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          marginBottom:14, paddingBottom:12, borderBottom:`1.5px solid ${C.line}` }}>
          <div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
              letterSpacing:3, color:C.text3, textTransform:'uppercase', marginBottom:3 }}>
              Место назначения
            </div>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:20, fontWeight:700,
              color:C.navy, letterSpacing:2, textTransform:'uppercase' }}>
              {dest}
            </div>
          </div>
          <button onClick={fetchDestInfo} disabled={loading} style={{
            padding:'10px 16px', borderRadius:8,
            fontFamily:"'Cinzel',serif", fontSize:12,
            fontWeight:600, letterSpacing:1.5, cursor:'pointer',
            background: loading ? `rgba(10,37,64,0.08)` : `linear-gradient(135deg, ${C.navyMid}, ${C.navy})`,
            color: loading ? C.text3 : C.goldPale,
            border:`1.5px solid ${loading ? C.lineS : C.navy}`,
            textTransform:'uppercase', transition:'all .2s',
            boxShadow: loading ? 'none' : `0 3px 10px rgba(10,37,64,0.20)`,
          }}>
            {loading ? '⏳ Загрузка...' : aiData ? '🔄 Обновить' : '✨ Узнать'}
          </button>
        </div>

        {error && (
          <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14,
            background:'rgba(107,16,16,0.08)', border:`1px solid rgba(107,16,16,0.25)`,
            fontFamily:"'Crimson Pro',serif", fontSize:14, color:C.error }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ textAlign:'center', padding:'30px 0',
            fontFamily:"'Cormorant Infant',serif", fontSize:16,
            fontStyle:'italic', color:C.text3 }}>
            ИИ собирает информацию о {dest}...
          </div>
        )}

        {aiData && !loading && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

            {/* Обзор */}
            <div style={{ fontFamily:"'Crimson Pro',serif", fontSize:16,
              color:C.text2, lineHeight:1.7,
              padding:'10px 14px', background:`rgba(10,37,64,0.04)`,
              borderRadius:8, borderLeft:`3px solid ${C.gold}` }}>
              {aiData.overview}
            </div>

            {/* Топ достопримечательностей */}
            {aiData.highlights?.length > 0 && (
              <div>
                <SecLabel>Топ достопримечательностей</SecLabel>
                {aiData.highlights.map((h,i) => (
                  <div key={i} style={{ display:'flex', gap:10, padding:'8px 0',
                    borderBottom:`1px solid ${C.lineS}`,
                    fontFamily:"'Crimson Pro',serif", fontSize:15, color:C.text1, lineHeight:1.5 }}>
                    <span style={{ color:C.gold, fontWeight:700, flexShrink:0 }}>{i+1}.</span>
                    {h}
                  </div>
                ))}
              </div>
            )}

            {/* Еда */}
            {aiData.food?.length > 0 && (
              <div>
                <SecLabel>Что попробовать</SecLabel>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {aiData.food.map((f,i) => (
                    <div key={i} style={{
                      padding:'6px 14px', borderRadius:20,
                      background:`rgba(10,37,64,0.06)`,
                      border:`1px solid ${C.line}`,
                      fontFamily:"'Crimson Pro',serif", fontSize:14, color:C.text1,
                    }}>{f}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Советы */}
            {aiData.tips?.length > 0 && (
              <div>
                <SecLabel>Советы путешественнику</SecLabel>
                {aiData.tips.map((tip,i) => (
                  <TipRow key={i} text={tip} idx={i} />
                ))}
              </div>
            )}

            {/* Важно */}
            {aiData.warnings?.length > 0 && (
              <div style={{ padding:'12px 14px', borderRadius:8,
                background:'rgba(107,16,16,0.06)',
                border:`1px solid rgba(107,16,16,0.20)`,
                borderLeft:`3px solid ${C.error}` }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                  letterSpacing:2, color:C.error, marginBottom:8, textTransform:'uppercase' }}>
                  ⚠ Важно знать
                </div>
                {aiData.warnings.map((w,i) => (
                  <div key={i} style={{ fontFamily:"'Crimson Pro',serif",
                    fontSize:14, color:C.error, lineHeight:1.5, marginBottom:4 }}>
                    · {w}
                  </div>
                ))}
              </div>
            )}

            {/* Инфо-строки */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { label:'Лучшее время', value:aiData.bestTime, icon:'📅' },
                { label:'Транспорт', value:aiData.transport, icon:'🚇' },
                { label:'Бюджет/день', value:aiData.budget, icon:'💰' },
              ].filter(r=>r.value).map((row,i) => (
                <div key={i} style={{ padding:'10px 12px', borderRadius:8,
                  background:`rgba(10,37,64,0.05)`,
                  border:`1px solid ${C.lineS}`,
                  gridColumn: i===2 ? '1 / -1' : undefined }}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                    letterSpacing:1.5, color:C.text3, marginBottom:4, textTransform:'uppercase' }}>
                    {row.icon} {row.label}
                  </div>
                  <div style={{ fontFamily:"'Crimson Pro',serif",
                    fontSize:15, color:C.text1, lineHeight:1.4 }}>{row.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!aiData && !loading && !error && (
          <div style={{ textAlign:'center', padding:'20px 0',
            fontFamily:"'Cormorant Infant',serif",
            fontSize:16, fontStyle:'italic', color:C.text3 }}>
            Нажмите «Узнать» для получения информации о месте
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ФОРМА ПОЕЗДКИ ───
function TripSetup({ tripData, onUpdate }) {
  return (
    <Card>
      <SecLabel>Текущая поездка</SecLabel>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

        <div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10,
            letterSpacing:2, color:C.navyMid, marginBottom:6, textTransform:'uppercase',
            display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ color:C.gold }}>·</span> Место назначения
          </div>
          <input
            value={tripData.destination || ''}
            onChange={e=>onUpdate({ destination: e.target.value })}
            placeholder="Город или страна..."
            style={{ width:'100%', padding:'12px 14px',
              border:`1.5px solid ${C.line}`, borderRadius:8,
              background:'rgba(250,243,224,0.8)',
              fontFamily:"'Crimson Pro',serif", fontSize:16, color:C.text1,
              outline:'none',
            }}
          />
        </div>

        <div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10,
            letterSpacing:2, color:C.navyMid, marginBottom:6, textTransform:'uppercase',
            display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ color:C.gold }}>·</span> Даты
          </div>
          <input
            value={tripData.dates || ''}
            onChange={e=>onUpdate({ dates: e.target.value })}
            placeholder="например: 15-22 июля 2025"
            style={{ width:'100%', padding:'12px 14px',
              border:`1.5px solid ${C.line}`, borderRadius:8,
              background:'rgba(250,243,224,0.8)',
              fontFamily:"'Crimson Pro',serif", fontSize:16, color:C.text1,
              outline:'none',
            }}
          />
        </div>

        <div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10,
            letterSpacing:2, color:C.navyMid, marginBottom:6, textTransform:'uppercase',
            display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ color:C.gold }}>·</span> Заметки
          </div>
          <textarea
            value={tripData.notes || ''}
            onChange={e=>onUpdate({ notes: e.target.value })}
            placeholder="Бронь отеля, контакты, план..."
            rows={3}
            style={{ width:'100%', padding:'12px 14px',
              border:`1.5px solid ${C.line}`, borderRadius:8,
              background:'rgba(250,243,224,0.8)',
              fontFamily:"'Crimson Pro',serif", fontSize:16, color:C.text1,
              outline:'none', resize:'vertical',
            }}
          />
        </div>
      </div>
    </Card>
  );
}

// ─── ЧЕКЛИСТ ───
function TripChecklist({ tripData, onUpdate }) {
  const items = tripData.checklist || [];

  const addItem = () => {
    const text = prompt('Что добавить в список?');
    if (!text?.trim()) return;
    onUpdate({ checklist: [...items, { id: Date.now(), text: text.trim(), done: false }] });
  };

  const toggle = (id) => {
    onUpdate({ checklist: items.map(i => i.id===id ? {...i, done:!i.done} : i) });
  };

  const remove = (id) => {
    onUpdate({ checklist: items.filter(i => i.id!==id) });
  };

  const done = items.filter(i=>i.done).length;

  return (
    <Card>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <SecLabel>Чеклист поездки</SecLabel>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10,
          color:C.text3, letterSpacing:1 }}>
          {done}/{items.length}
        </div>
      </div>

      {items.length > 0 && (
        <div style={{ marginBottom:10,
          height:5, background:`rgba(10,37,64,0.08)`, borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:3,
            width:`${items.length ? (done/items.length)*100 : 0}%`,
            background:`linear-gradient(90deg, ${C.navyMid}, ${C.gold})`,
            transition:'width .4s ease' }} />
        </div>
      )}

      {items.map(item => (
        <div key={item.id} style={{ display:'flex', alignItems:'center', gap:10,
          padding:'9px 0', borderBottom:`1px solid ${C.lineS}` }}>
          <div onClick={()=>toggle(item.id)} style={{
            width:20, height:20, borderRadius:4, flexShrink:0,
            border:`1.5px solid ${item.done ? C.success : C.line}`,
            background: item.done ? C.success : 'transparent',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:11, color:'#fff', cursor:'pointer', transition:'all .15s',
          }}>{item.done ? '✓' : ''}</div>
          <span style={{ flex:1, fontFamily:"'Crimson Pro',serif", fontSize:15,
            color: item.done ? C.text3 : C.text1,
            textDecoration: item.done ? 'line-through' : 'none' }}>
            {item.text}
          </span>
          <div onClick={()=>remove(item.id)} style={{
            fontSize:16, color:C.text3, cursor:'pointer', padding:'0 4px',
            transition:'color .15s',
          }}>×</div>
        </div>
      ))}

      <button onClick={addItem} style={{
        width:'100%', marginTop:12, padding:'11px 0',
        border:`1.5px dashed rgba(10,37,64,0.28)`,
        borderRadius:8, background:'transparent',
        fontFamily:"'Cinzel',serif", fontSize:12,
        letterSpacing:2, color:C.text2, cursor:'pointer',
        textTransform:'uppercase', transition:'all .2s',
      }}>+ Добавить</button>
    </Card>
  );
}

// ─── ГЛАВНЫЙ КОМПОНЕНТ ───
export function TravelSection() {
  const { profile } = useApp();

  const [tripData, setTripData] = useState(() => {
    try {
      const saved = localStorage.getItem('ld_travel_current');
      if (saved) return JSON.parse(saved);
    } catch {}
    // Берём из профиля если есть
    return {
      destination: profile?.travelDestination || '',
      dates: profile?.travelDates || '',
      transport: null,
      notes: '',
      checklist: [],
    };
  });

  // Сохраняем при каждом изменении
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
        marginBottom:18, height:140,
        boxShadow:`0 5px 20px rgba(10,37,64,0.18)` }}>
        <img src="/sections/travel.jpg" alt="Поездки"
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}
          onError={e=>e.target.style.background=C.navyMid}
        />
        <div style={{ position:'absolute', inset:0,
          background:'linear-gradient(to top, rgba(10,25,45,0.80) 0%, rgba(10,25,45,0.20) 70%, transparent 100%)' }} />
        <div style={{ position:'absolute', top:7, left:7, width:12, height:12,
          borderTop:`2px solid ${C.gold}`, borderLeft:`2px solid ${C.gold}`, opacity:0.8 }} />
        <div style={{ position:'absolute', bottom:7, right:7, width:12, height:12,
          borderBottom:`2px solid ${C.gold}`, borderRight:`2px solid ${C.gold}`, opacity:0.8 }} />
        <div style={{ position:'absolute', bottom:16, left:18 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
            letterSpacing:3, color:C.goldPale, textTransform:'uppercase', marginBottom:4, opacity:0.9 }}>
            Путевой дневник
          </div>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:22, fontWeight:700,
            color:'#fff', letterSpacing:3, textTransform:'uppercase',
            textShadow:'0 2px 8px rgba(0,0,0,0.5)' }}>
            {tripData.destination ? `→ ${tripData.destination}` : 'Мои поездки'}
          </div>
        </div>
      </div>

      {/* Данные поездки */}
      <TripSetup tripData={tripData} onUpdate={updateTrip} />

      {/* Транспорт + лайфхаки */}
      <TransportBlock tripData={tripData} onUpdate={updateTrip} />

      {/* Место назначения (ИИ) */}
      <DestinationCard tripData={tripData} />

      {/* Чеклист */}
      <TripChecklist tripData={tripData} onUpdate={updateTrip} />

    </div>
  );
      }
