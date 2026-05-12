// src/sections/ShoppingSection.jsx
import { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { AiBox } from '../components/AiBox';
import { T } from '../utils/theme';
import { SectionHero } from '../components/SectionHero';

export function ShoppingSection({ notify }) {
  // Получаем данные и функции из контекста
  const { profile, shopList, setShopList, shopAdvice, setShopAdvice, shopListOpen, setShopListOpen } = useApp();
  
  const [newItem, setNewItem] = useState('');
  const [newCat, setNewCat] = useState('Продукты');

  const cats = ['Продукты', 'Бытовая химия', 'Уход', 'Для питомцев', 'Одежда', 'Аптека', 'Другое'];

  // Очистка старых записей с [Категория] в названии
  useEffect(() => {
    const needsCleanup = shopList.some(item => /\[[^\]]+\]/.test(item.name));
    if (!needsCleanup) return;

    const validCats = cats;
    const cleaned = [];
    const seen = new Set();

    shopList.forEach(item => {
      const m = item.name.match(/\[([^\]]+)\]/);
      let cat = item.cat || 'Продукты';
      if (m && validCats.includes(m[1])) cat = m[1];
      
      let name = item.name.replace(/\[[^\]]+\]/g, '').replace(/^[:\s—-]+/, '').trim();
      if (!name || name.length < 2) return;
      
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      cleaned.push({ ...item, name, cat });
    });

    if (cleaned.length !== shopList.length) {
      setShopList(cleaned);
    }
  }, []);

  const add = () => {
    if (!newItem.trim()) return;
    setShopList(p => [...p, { id: Date.now(), name: newItem, cat: newCat, done: false }]);
    setNewItem('');
    if (notify) notify('Добавлено');
  };
  // Группировка по категориям
  const byCat = cats.reduce((a, c) => ({ ...a, [c]: shopList.filter(x => x.cat === c) }), {});
  const doneN = shopList.filter(x => x.done).length;

  // Проверка дня закупки
  const isShopDay = (() => {
    const days = { 'Пн': 1, 'Вт': 2, 'Ср': 3, 'Чт': 4, 'Пт': 5, 'Сб': 6, 'Вс': 0 };
    const todayDay = new Date().getDay();
    const shopDayNum = days[profile.shopDay];
    return shopDayNum !== undefined && todayDay === shopDayNum;
  })();

  const daysLeft = (() => {
    const days = { 'Пн': 1, 'Вт': 2, 'Ср': 3, 'Чт': 4, 'Пт': 5, 'Сб': 6, 'Вс': 0 };
    const todayDay = new Date().getDay();
    const shopDayNum = days[profile.shopDay];
    if (shopDayNum === undefined) return null;
    return (shopDayNum - todayDay + 7) % 7 || 7;
  })();

  return (
    <div>
      {/* Шапка с информацией о закупке */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 12px', background: 'rgba(45,32,16,0.05)', borderRadius: 10, marginBottom: 10, alignItems: 'center' }}>
        {profile.shopFreq && <span style={{ fontSize: 12, color: T.text2 }}>🛒 {profile.shopFreq}</span>}
        {profile.shopDay && <span style={{ fontSize: 12, color: T.gold }}>· 📅 {profile.shopDay}</span>}
        {profile.familySize && profile.familySize !== '1' && (
          <span style={{ fontSize: 12, color: T.text3, marginLeft: 'auto' }}>👨‍👩‍👧 {profile.familySize} чел.</span>
        )}
      </div>

      {/* Напоминание о дне закупки */}
      {profile.shopDay && (
        <div style={{
          padding: '10px 14px', borderRadius: 12, marginBottom: 12,
          background: isShopDay ? 'rgba(45,106,79,0.15)' : 'rgba(45,32,16,0.05)',
          border: `1px solid ${isShopDay ? T.success : T.bdrS}`,
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <span style={{ fontSize: 20 }}>{isShopDay ? '🛒' : '📅'}</span>
          <div>
            <div style={{ fontSize: 14, color: isShopDay ? T.success : T.text1, fontWeight: isShopDay ? 600 : 400 }}>
              {isShopDay ? `Сегодня день закупки! ${profile.shopDay}` : `День закупки: ${profile.shopDay}`}
            </div>
            <div style={{ fontSize: 12, color: T.text3 }}>
              {isShopDay ? 'Список уже готов — прокрути вниз' : `Через ${daysLeft} ${daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}`}
            </div>
          </div>
          {isShopDay && <span style={{ marginLeft: 'auto', fontSize: 20 }}>✦</span>}
        </div>      )}

      {/* AI Умный список */}
      <div style={{ marginBottom: 12 }}>
        <div onClick={() => setShopAdvice(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: shopAdvice ? '12px 12px 0 0' : '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ fontSize: 16 }}></span>
          <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.gold, fontWeight: 500 }}>Список покупок (AI)</span>
          <span style={{ fontSize: 11, color: T.text3 }}>{shopAdvice ? '▲' : '▼'}</span>
        </div>
        
        {shopAdvice && (
          <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
            <AiBox 
              profile={profile}
              label="Генератор списка"
              prompt={`Составь подробный список покупок на неделю для ${profile.familySize || 1} ${profile.familySize > 1 ? 'человек' : 'человека'}.
Состав семьи: ${(profile.livesWith || ['один(а)']).join(', ')}${profile.childrenAges ? '. Дети: ' + profile.childrenAges : ' '}${profile.familyNeeds ? '. Особые потребности: ' + profile.familyNeeds : ' '}.
Тип питания: ${profile.nutrition || 'обычное'}.
${(profile.mainGoal || '').toLowerCase().match(/похуде|вес|фигур/) ? 'ЦЕЛЬ: похудение — акцент на белок, овощи, ограничить простые углеводы. Калорийность умеренная.\n' : ' '}
ТКМ-профиль учитывай при выборе продуктов.
Всегда есть дома: ${(profile.staples || []).join(', ') || '—'}.
${(profile.pets || []).length ? 'Питомцы: ' + profile.pets.map(p => p.name + '(' + p.type + '): ' + (p.food || 'стандартный корм')).join(', ') + '.\n' : ' '}
День закупки: ${profile.shopDay || '—'}.

ВАЖНО: укажи количество с учётом всех членов семьи. 
Каждый товар начинай с метки [Продукты], [Бытовая химия], [Уход], [Для питомцев] или [Аптека].
Дай заголовки разделов через ## и нумерованный список.`}
              btnText={`Составить на ${profile.familySize > 1 ? profile.familySize + ' чел.' : 'меня'}`}
              placeholder="Составлю список с учётом всей семьи и целей..."
              actionType="shopping"
              onShopAdd={setShopList}
            />
          </div>
        )}
      </div>

      {/* Ручной список покупок */}
      <div style={{ marginBottom: 12 }}>
        <div onClick={() => setShopListOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: shopListOpen ? '12px 12px 0 0' : '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ fontSize: 16 }}>🛒</span>
          <span style={{ flex: 1, fontSize: 14, fontFamily: "'Crimson Pro',serif", color: T.gold, fontWeight: 500 }}>Ручной список</span>
          <span style={{ fontSize: 10, color: T.text3, fontFamily: "'JetBrains Mono'" }}>{shopList.length} поз.</span>
          <span style={{ fontSize: 11, color: T.text3 }}>{shopListOpen ? '▲' : '▼'}</span>
        </div>

        {shopListOpen && (
          <div className="card" style={{ borderRadius: '0 0 12px 12px', borderTop: 'none' }}>
            {/* Ввод нового товара */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <input                 style={{ flex: '1 1 180px', padding: '10px 14px', background: 'rgba(255,255,255,.03)', border: `1px solid ${T.bdr}`, borderRadius: 10, color: T.text0, fontFamily: "'Crimson Pro',serif", fontSize: 16, outline: 'none' }} 
                placeholder="Добавить товар..." 
                value={newItem} 
                onChange={e => setNewItem(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && add()} 
              />
              <select 
                style={{ padding: '10px', background: T.bg2, border: `1px solid ${T.bdr}`, borderRadius: 10, color: T.text1, fontSize: 14, outline: 'none' }} 
                value={newCat} 
                onChange={e => setNewCat(e.target.value)}
              >
                {cats.map(c => <option key={c}>{c}</option>)}
              </select>
              <button className="btn btn-primary btn-sm" onClick={add}>+</button>
            </div>

            {/* Кнопки очистки */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => {
                const validCats = cats;
                const cleaned = [];
                const seen = new Set();
                shopList.forEach(item => {
                  const m = item.name.match(/\[([^\]]+)\]/);
                  let cat = item.cat || 'Продукты';
                  if (m && validCats.includes(m[1])) cat = m[1];
                  let name = item.name.replace(/\[[^\]]+\]/g, ' ').replace(/^[:\s—-]+/, ' ').trim();
                  if (!name || name.length < 2) return;
                  const key = name.toLowerCase();
                  if (seen.has(key)) return;
                  seen.add(key);
                  cleaned.push({ ...item, name, cat });
                });
                const removedCount = shopList.length - cleaned.length;
                setShopList(cleaned);
                if (notify) notify(removedCount > 0 ? `Очищено: убрано ${removedCount} дубликатов и меток` : 'Список уже чист');
              }}>🧹 Очистить дубли и метки</button>
              
              {shopList.length > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  if (window.confirm('Удалить все товары из списка покупок?')) {
                    setShopList([]);
                    if (notify) notify('Список очищен');
                  }
                }}>🗑 Сбросить список</button>
              )}
            </div>

            {/* Список товаров */}
            {shopList.length === 0 && (              <div className="empty">
                <span className="empty-ico">🛒</span>
                <p>Список пуст. Нажми "Составить список" чтобы AI создал персональный список покупок.</p>
              </div>
            )}

            {cats.filter(c => byCat[c].length > 0).map(cat => {
              const catEmoji = { 'Продукты': '🥦', 'Бытовая химия': '🧼', 'Уход': '✨', 'Для питомцев': '🐾', 'Одежда': '👕', 'Аптека': '💊', 'Другое': '📦' }[cat] || '📦';
              const catColor = { 'Продукты': '#7BCCA0', 'Бытовая химия': '#82AADD', 'Уход': '#E8A8C8', 'Для питомцев': '#E8A85A', 'Одежда': '#B882E8', 'Аптека': T.danger, 'Другое': '#A8A49C' }[cat] || '#A8A49C';
              const itemsLeft = byCat[cat].filter(x => !x.done).length;
              const itemsDone = byCat[cat].filter(x => x.done).length;

              return (
                <div key={cat} style={{ marginBottom: 14, background: 'rgba(255,255,255,0.02)', border: `1px solid ${catColor}33`, borderRadius: 14, overflow: 'hidden' }}>
      <SectionHero sectionId="shopping" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: `linear-gradient(135deg, ${catColor}22, ${catColor}08)`, borderBottom: `1px solid ${catColor}22` }}>
                    <span style={{ fontSize: 22 }}>{catEmoji}</span>
                    <span style={{ flex: 1, fontFamily: "'Cormorant Infant',serif", fontSize: 18, color: catColor, fontWeight: 600 }}>{cat}</span>
                    <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: T.text2, letterSpacing: 1 }}>{itemsLeft}{itemsDone > 0 ? ` / ${itemsDone}✓` : ' '}</span>
                  </div>
                  <div style={{ padding: '4px 12px' }}>
                    {byCat[cat].map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                        <div className={`chk${item.done ? ' done' : ''}`} style={{ borderColor: item.done ? catColor : T.bdr, background: item.done ? catColor : 'transparent' }} onClick={() => setShopList(p => p.map(x => x.id === item.id ? { ...x, done: !x.done } : x))}>
                          {item.done ? '✓' : ' '}
                        </div>
                        <span style={{ flex: 1, fontSize: 15, textDecoration: item.done ? 'line-through' : 'none', color: item.done ? T.text3 : T.text0, fontFamily: "'Crimson Pro',serif" }}>{item.name}</span>
                        <div className="ico-btn danger" onClick={() => setShopList(p => p.filter(x => x.id !== item.id))}>✕</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {doneN > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => setShopList(p => p.filter(x => !x.done))}>Очистить купленное ({doneN})</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
              }
