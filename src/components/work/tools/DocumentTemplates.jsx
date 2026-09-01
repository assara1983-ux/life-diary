// src/components/work/tools/DocumentTemplates.jsx
import { useState } from 'react';
import { useApp } from '../../../store/AppContext';

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function localDateRu(d = new Date()) {
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

const EMPTY_FORM = { date: localDateStr(), number: '', object: '', description: '', responsible: '' };

const TEMPLATES = {
  defect: {
    title: 'Дефектный Акт',
    icon: '🔍',
    desc: 'Фиксация дефектов и неисправностей',
    fields: [
      { key: 'number',      label: 'Номер акта',           placeholder: 'DA-2026-001' },
      { key: 'date',        label: 'Дата',                 type: 'date' },
      { key: 'object',      label: 'Объект / оборудование', placeholder: 'Принтер HP LaserJet...' },
      { key: 'description', label: 'Описание дефекта',     placeholder: 'Не подаёт бумагу, замятие...', multiline: true },
      { key: 'responsible', label: 'Ответственное лицо',   placeholder: 'Иванов И.И.' },
    ],
    generate: (d) => `ДЕФЕКТНЫЙ АКТ № ${d.number || '_____'}
Дата: ${d.date ? localDateRu(new Date(d.date + 'T00:00:00')) : localDateRu()}

Объект/Оборудование: ${d.object || '________________________'}

Описание дефекта:
${d.description || '________________________________________________'}

Ответственное лицо: ${d.responsible || '________________________'}

Рекомендации по устранению: ___________________________________

Подписи:
Выявил: ___________________     Принял к исполнению: ___________________

Дата устранения: ___________________`,
  },

  order: {
    title: 'Приказ',
    icon: '📋',
    desc: 'Внутренний приказ организации',
    fields: [
      { key: 'number',      label: 'Номер приказа',   placeholder: 'П-2026-001' },
      { key: 'date',        label: 'Дата',             type: 'date' },
      { key: 'object',      label: 'О чём приказ',     placeholder: 'проведении инвентаризации...' },
      { key: 'description', label: 'Текст приказа',    placeholder: 'Провести инвентаризацию...', multiline: true },
      { key: 'responsible', label: 'Ответственный',    placeholder: 'Петрова А.С.' },
    ],
    generate: (d) => `ПРИКАЗ № ${d.number || '_____'}
Дата: ${d.date ? localDateRu(new Date(d.date + 'T00:00:00')) : localDateRu()}

О ${d.object || '________________________'}

ПРИКАЗЫВАЮ:

${d.description || '________________________________________________'}

Ответственный за исполнение: ${d.responsible || '________________________'}
Срок исполнения: ___________________
Контроль исполнения оставляю за собой.

Генеральный директор: ___________________     /___________________/`,
  },

  act: {
    title: 'Акт выполненных работ',
    icon: '✅',
    desc: 'Подтверждение выполнения услуг',
    fields: [
      { key: 'number',      label: 'Номер акта',       placeholder: 'АВР-2026-001' },
      { key: 'date',        label: 'Дата',             type: 'date' },
      { key: 'object',      label: 'Контрагент',       placeholder: 'ТОО "Название"' },
      { key: 'description', label: 'Перечень работ',   placeholder: 'Бухгалтерские услуги за май...', multiline: true },
      { key: 'responsible', label: 'Сумма (₸)',        placeholder: '150 000' },
    ],
    generate: (d) => `АКТ ВЫПОЛНЕННЫХ РАБОТ № ${d.number || '_____'}
Дата: ${d.date ? localDateRu(new Date(d.date + 'T00:00:00')) : localDateRu()}

Исполнитель: ________________________
Заказчик: ${d.object || '________________________'}

Перечень выполненных работ/услуг:
${d.description || '________________________________________________'}

Сумма: ${d.responsible || '___________'} тенге (без НДС)
НДС (12%): ___________ тенге
Итого с НДС: ___________ тенге

Работы выполнены в полном объёме и в установленные сроки.
Претензий по качеству и срокам нет.

Исполнитель: ___________________     Заказчик: ___________________`,
  },

  memo: {
    title: 'Служебная записка',
    icon: '📝',
    desc: 'Внутренняя служебная записка',
    fields: [
      { key: 'number',      label: 'Кому',           placeholder: 'Директору / Главному бухгалтеру' },
      { key: 'date',        label: 'Дата',           type: 'date' },
      { key: 'object',      label: 'Тема',           placeholder: 'О необходимости закупки...' },
      { key: 'description', label: 'Содержание',     placeholder: 'Прошу рассмотреть...', multiline: true },
      { key: 'responsible', label: 'От кого',        placeholder: 'Бухгалтер Сидорова В.А.' },
    ],
    generate: (d) => `СЛУЖЕБНАЯ ЗАПИСКА

Кому: ${d.number || '________________________'}
От: ${d.responsible || '________________________'}
Дата: ${d.date ? localDateRu(new Date(d.date + 'T00:00:00')) : localDateRu()}

Тема: ${d.object || '________________________'}

${d.description || '________________________________________________'}

Прошу рассмотреть и принять решение.

Подпись: ___________________     Дата: ___________________`,
  },
};

export function DocumentTemplates() {
  const { notify } = useApp();

  const [activeType,    setActiveType]    = useState('defect');
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [generatedDoc,  setGeneratedDoc]  = useState('');

  const template = TEMPLATES[activeType];

  const setField = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const generateDocument = () => {
    const doc = template.generate(form);
    setGeneratedDoc(doc);
    notify(`✅ Документ «${template.title}» сгенерирован`);
  };

  const copyToClipboard = () => {
    if (!generatedDoc) return;
    navigator.clipboard.writeText(generatedDoc);
    notify('📋 Скопировано в буфер обмена');
  };

  const clearForm = () => {
    setForm(EMPTY_FORM);
    setGeneratedDoc('');
    notify('Форма очищена');
  };

  return (
    <div style={{ color: 'var(--text0)', paddingBottom: 24 }}>
      {/* Заголовок */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 14, fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: 3, color: 'rgba(200,164,90,0.7)', marginBottom: 4,
        }}>ШАБЛОНЫ ДОКУМЕНТОВ</div>
        <div style={{ fontSize: 18, fontFamily: "'Cormorant Infant',serif" }}>
          Акты · Приказы · Записки
        </div>
      </div>

      {/* Выбор типа */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(TEMPLATES).map(([key, t]) => (
          <button key={key} onClick={() => { setActiveType(key); setGeneratedDoc(''); }}
            style={{
              padding: '8px 16px', borderRadius: 16, fontSize: 15, cursor: 'pointer',
              background: activeType === key ? 'rgba(200,164,90,0.15)' : 'transparent',
              border: `1px solid ${activeType === key ? 'rgba(200,164,90,0.5)' : 'rgba(255,255,255,0.1)'}`,
              color: activeType === key ? 'rgba(200,164,90,0.9)' : 'var(--text3)',
              transition: 'all 0.15s',
            }}
          >{t.icon} {t.title}</button>
        ))}
      </div>

      {/* Основной layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 16,
      }}>
        {/* Форма */}
        <div style={{
          padding: '16px 14px',
          background: 'rgba(255,255,255,0.70)',
          border: '1px solid rgba(200,164,90,0.2)',
          borderRadius: 12,
        }}>
          <div style={{
            fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: 2, color: 'rgba(200,164,90,0.7)', marginBottom: 14,
          }}>{template.icon} {template.title.toUpperCase()}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {template.fields.map(f => (
              <div key={f.key}>
                <label style={{
                  display: 'block', fontSize: 13,
                  fontFamily: "'JetBrains Mono',monospace",
                  letterSpacing: 1, color: 'rgba(200,164,90,0.6)', marginBottom: 5,
                }}>{f.label.toUpperCase()}</label>
                {f.multiline ? (
                  <textarea
                    value={form[f.key] || ''}
                    onChange={e => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    rows={4}
                    style={{
                      width: '100%', padding: '10px 12px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8, color: 'var(--text0)',
                      fontSize: 16, resize: 'vertical',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                ) : (
                  <input
                    type={f.type || 'text'}
                    value={form[f.key] || ''}
                    onChange={e => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    style={{
                      width: '100%', padding: '10px 12px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8, color: 'var(--text0)',
                      fontSize: 16, outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={generateDocument} style={{
              flex: 2, padding: '11px 0', borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(200,164,90,0.2), rgba(200,164,90,0.06))',
              border: '1px solid rgba(200,164,90,0.4)',
              color: 'rgba(200,164,90,0.9)', fontSize: 16, cursor: 'pointer',
              fontFamily: "'JetBrains Mono',monospace",
            }}>
              Сгенерировать
            </button>
            <button onClick={clearForm} style={{
              flex: 1, padding: '11px 0', borderRadius: 10,
              background: 'transparent', border: `1px solid rgba(0,0,0,0.12)`,
              color: 'var(--text3)', fontSize: 15, cursor: 'pointer',
            }}>
              Очистить
            </button>
          </div>
        </div>

        {/* Предпросмотр */}
        <div style={{
          padding: '16px 14px',
          background: 'rgba(255,255,255,0.60)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12,
        }}>
          <div style={{
            fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: 2, color: 'var(--text3)', marginBottom: 14,
          }}>ПРЕДПРОСМОТР</div>

          {generatedDoc ? (
            <>
              <pre style={{
                background: 'rgba(255,255,255,0.70)',
                border: `1px solid rgba(0,0,0,0.12)`,
                padding: '14px', borderRadius: 10,
                whiteSpace: 'pre-wrap', fontSize: 15,
                lineHeight: 1.7, maxHeight: 420,
                overflowY: 'auto', color: 'var(--text1)',
                fontFamily: "'JetBrains Mono',monospace",
              }}>
                {generatedDoc}
              </pre>
              <button onClick={copyToClipboard} style={{
                width: '100%', marginTop: 12, padding: '11px 0', borderRadius: 10,
                background: 'rgba(200,164,90,0.1)',
                border: '1px solid rgba(200,164,90,0.4)',
                color: 'rgba(200,164,90,0.9)', fontSize: 16, cursor: 'pointer',
                fontFamily: "'JetBrains Mono',monospace",
              }}>
                📋 Скопировать
              </button>
            </>
          ) : (
            <div style={{
              padding: '60px 20px', textAlign: 'center',
              color: 'var(--text3)', fontSize: 15,
              fontFamily: "'Cormorant Infant',serif", lineHeight: 1.8,
            }}>
              Заполните форму и нажмите<br/>«Сгенерировать»
            </div>
          )}
        </div>
      </div>
    </div>
  );
            }
