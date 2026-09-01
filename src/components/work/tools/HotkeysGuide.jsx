// src/components/work/tools/HotkeysGuide.jsx
import { useState, useMemo } from 'react';
import { useApp } from '../../../store/AppContext';

const HOTKEYS = {
  excel: [
    { keys: 'Ctrl + C',         desc: 'Копировать выделенное' },
    { keys: 'Ctrl + V',         desc: 'Вставить' },
    { keys: 'Ctrl + Z',         desc: 'Отменить действие' },
    { keys: 'Ctrl + Y',         desc: 'Повторить действие' },
    { keys: 'Alt + =',          desc: 'Автосумма выделенного диапазона' },
    { keys: 'Ctrl + Shift + L', desc: 'Включить/выключить фильтр' },
    { keys: 'Ctrl + T',         desc: 'Создать таблицу из диапазона' },
    { keys: 'F4',               desc: 'Повторить последнее действие / абсолютная ссылка' },
    { keys: 'Ctrl + Shift + :', desc: 'Вставить текущее время' },
    { keys: 'Ctrl + ;',         desc: 'Вставить текущую дату' },
    { keys: 'Ctrl + 1',         desc: 'Открыть формат ячеек' },
    { keys: 'Ctrl + Shift + $', desc: 'Формат денежный' },
    { keys: 'Ctrl + Shift + %', desc: 'Формат процентный' },
    { keys: 'F2',               desc: 'Редактировать содержимое ячейки' },
    { keys: 'Ctrl + Home',      desc: 'Перейти в начало таблицы' },
    { keys: 'Ctrl + End',       desc: 'Перейти в последнюю заполненную ячейку' },
  ],
  word: [
    { keys: 'Ctrl + B',         desc: 'Жирный текст' },
    { keys: 'Ctrl + I',         desc: 'Курсив' },
    { keys: 'Ctrl + U',         desc: 'Подчёркнутый' },
    { keys: 'Ctrl + K',         desc: 'Вставить гиперссылку' },
    { keys: 'Ctrl + Alt + 1',   desc: 'Заголовок 1' },
    { keys: 'Ctrl + Alt + 2',   desc: 'Заголовок 2' },
    { keys: 'F7',               desc: 'Проверка орфографии' },
    { keys: 'Ctrl + Enter',     desc: 'Вставить разрыв страницы' },
    { keys: 'Ctrl + Shift + C', desc: 'Копировать форматирование' },
    { keys: 'Ctrl + Shift + V', desc: 'Применить форматирование' },
    { keys: 'Alt + Shift + D',  desc: 'Вставить текущую дату' },
  ],
};

const EXCEL_MACROS = [
  {
    name: 'Очистить форматирование',
    desc: 'Удаляет всё форматирование в выделенной области',
    lang: 'VBA',
    code: `Sub ClearFormatting()
    Selection.ClearFormats
End Sub`,
  },
  {
    name: 'Выделить пустые ячейки',
    desc: 'Быстро находит и выделяет пустые ячейки',
    lang: 'VBA',
    code: `Sub SelectBlankCells()
    Selection.SpecialCells(xlCellTypeBlanks).Select
End Sub`,
  },
  {
    name: 'Сохранить лист как PDF',
    desc: 'Экспортирует текущий лист в PDF рядом с файлом',
    lang: 'VBA',
    code: `Sub SaveAsPDF()
    Dim path As String
    path = ThisWorkbook.Path & "\\" & _
           ActiveSheet.Name & ".pdf"
    ActiveSheet.ExportAsFixedFormat _
        xlTypePDF, path
    MsgBox "Сохранено: " & path
End Sub`,
  },
  {
    name: 'Удалить дубликаты',
    desc: 'Удаляет дублирующиеся строки в диапазоне',
    lang: 'VBA',
    code: `Sub RemoveDuplicates()
    ActiveSheet.UsedRange.RemoveDuplicates _
        Columns:=1, Header:=xlYes
    MsgBox "Дубликаты удалены"
End Sub`,
  },
  {
    name: 'Раскрасить по значению',
    desc: 'Подсвечивает: красный < 0, зелёный > 0',
    lang: 'VBA',
    code: `Sub ColorByValue()
    Dim cell As Range
    For Each cell In Selection
        If IsNumeric(cell.Value) Then
            If cell.Value < 0 Then
                cell.Interior.Color = _
                    RGB(255, 200, 200)
            ElseIf cell.Value > 0 Then
                cell.Interior.Color = _
                    RGB(200, 255, 200)
            Else
                cell.Interior.ColorIndex = _
                    xlNone
            End If
        End If
    Next cell
End Sub`,
  },
];

const WORD_MACROS = [
  {
    name: 'Вставить текущую дату',
    desc: 'Вставляет дату в формате дд.мм.гггг',
    lang: 'VBA',
    code: `Sub InsertDate()
    Selection.InsertAfter _
        Format(Date, "dd.mm.yyyy")
End Sub`,
  },
  {
    name: 'Очистить форматирование',
    desc: 'Сбрасывает форматирование выделенного текста',
    lang: 'VBA',
    code: `Sub ClearAllFormatting()
    Selection.ClearFormatting
End Sub`,
  },
  {
    name: 'Создать оглавление',
    desc: 'Автоматически создаёт оглавление из заголовков',
    lang: 'VBA',
    code: `Sub CreateTOC()
    ActiveDocument.TablesOfContents.Add _
        Range:=Selection.Range, _
        UseHeadingStyles:=True, _
        UpperHeadingLevel:=1, _
        LowerHeadingLevel:=3
End Sub`,
  },
  {
    name: 'Заменить шрифт в документе',
    desc: 'Меняет шрифт всего документа на Times New Roman 12pt',
    lang: 'VBA',
    code: `Sub ChangeFont()
    With ActiveDocument.Content.Font
        .Name = "Times New Roman"
        .Size = 12
    End With
End Sub`,
  },
];

const ONEC_SCRIPTS = [
  {
    name: 'Массовое проведение документов',
    desc: 'Проводит все документы выбранного типа за период',
    lang: '1С',
    code: `Процедура ПровестиДокументы(НачДата, КонДата)
    Запрос = Новый Запрос;
    Запрос.Текст =
        "ВЫБРАТЬ Ссылка
        |ИЗ Документ.РасходнаяНакладная
        |ГДЕ Дата МЕЖДУ &Нач И &Кон
        |  И Проведен = ЛОЖЬ";
    Запрос.УстановитьПараметр("Нач", НачДата);
    Запрос.УстановитьПараметр("Кон", КонДата);
    Выборка = Запрос.Выполнить().Выбрать();
    Пока Выборка.Следующий() Цикл
        Об = Выборка.Ссылка.ПолучитьОбъект();
        Об.Провести(РежимПроведения.Оперативный);
    КонецЦикла;
КонецПроцедуры`,
  },
  {
    name: 'Выгрузка таблицы в Excel',
    desc: 'Экспортирует табличную часть документа в Excel',
    lang: '1С',
    code: `Процедура ВыгрузитьВExcel(ТЗ, Путь)
    Excel = Новый COMОбъект("Excel.Application");
    Книга = Excel.Workbooks.Add();
    Лист = Книга.Worksheets(1);
    Для к = 1 По ТЗ.Колонки.Количество() Цикл
        Лист.Cells(1, к).Value =
            ТЗ.Колонки[к-1].Имя;
    КонецЦикла;
    Для н = 1 По ТЗ.Количество() Цикл
        Для к = 1 По ТЗ.Колонки.Количество() Цикл
            Лист.Cells(н+1, к).Value =
                ТЗ[н-1][к-1];
        КонецЦикла;
    КонецЦикла;
    Книга.SaveAs(Путь);
    Excel.Quit();
КонецПроцедуры`,
  },
  {
    name: 'Пересчёт итогов регистров',
    desc: 'Пересчитывает итоги регистров накопления',
    lang: '1С',
    code: `Процедура ПересчитатьИтоги()
    МенеджерИтогов =
        РегистрыНакопления.ОстаткиТоваров;
    МенеджерИтогов.УстановитьПериодичность(
        ПериодичностьИтогов.Месяц);
    МенеджерИтогов.ПересчитатьИтоги();
    Сообщить("Итоги пересчитаны успешно");
КонецПроцедуры`,
  },
];

const SHAREPOINT_FLOWS = [
  {
    name: 'Автосохранение документов',
    desc: 'При создании документа в Life Diary — сохраняется в SharePoint',
    icon: '📄',
    trigger: 'Когда документ создан в приложении',
    actions: 'Создать файл в SharePoint → Присвоить метки → Уведомить',
  },
  {
    name: 'Ежемесячная архивация',
    desc: '5-го числа каждого месяца архивирует документы за прошлый месяц',
    icon: '📦',
    trigger: 'По расписанию (5-е число ежемесячно)',
    actions: 'Получить файлы → Создать папку ГГГГ-ММ → Переместить',
  },
  {
    name: 'Уведомление о новых счетах',
    desc: 'При загрузке счёта от поставщика — уведомление в Teams',
    icon: '🔔',
    trigger: 'Когда добавляется файл в папку «Входящие счета»',
    actions: 'Отправить уведомление в Teams → Создать задачу в Planner',
  },
  {
    name: 'Автосоздание папки контрагента',
    desc: 'При добавлении контрагента создаётся структура папок',
    icon: '📁',
    trigger: 'Когда добавляется элемент в список контрагентов',
    actions: 'Создать папку → Назначить разрешения → Создать подпапки',
  },
  {
    name: 'Синхронизация отчётов',
    desc: 'Сохраняет сформированные отчёты из Life Diary в SharePoint',
    icon: '🔄',
    trigger: 'Когда отчёт сгенерирован',
    actions: 'Конвертировать в PDF → Загрузить в SharePoint → Отправить ссылку',
  },
];

const LANG_COLORS = {
  VBA: { bg: 'rgba(0,112,192,0.08)', border: 'rgba(0,112,192,0.2)', text: '#0070c0',   num: 'rgba(0,112,192,0.5)'  },
  '1С': { bg: 'rgba(200,164,90,0.08)', border: 'rgba(200,164,90,0.25)', text: '#c8a45a', num: 'rgba(200,164,90,0.5)' },
};

const TABS = [
  { id: 'hotkeys_excel', label: '⚡ Excel' },
  { id: 'hotkeys_word',  label: '📝 Word' },
  { id: 'excel_macros',  label: '🔧 Макросы Excel' },
  { id: 'word_macros',   label: '🔧 Макросы Word' },
  { id: 'onec',          label: '1️⃣ Скрипты 1С' },
  { id: 'sharepoint',    label: '☁️ SharePoint' },
];

export function HotkeysGuide() {
  const { notify } = useApp();

  const [activeTab,   setActiveTab]   = useState('hotkeys_excel');
  const [searchQuery, setSearchQuery] = useState('');

  const getData = () => {
    switch (activeTab) {
      case 'hotkeys_excel': return HOTKEYS.excel;
      case 'hotkeys_word':  return HOTKEYS.word;
      case 'excel_macros':  return EXCEL_MACROS;
      case 'word_macros':   return WORD_MACROS;
      case 'onec':          return ONEC_SCRIPTS;
      case 'sharepoint':    return SHAREPOINT_FLOWS;
      default:              return [];
    }
  };

  const filtered = useMemo(() => {
    const data = getData();
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(item => {
      const text = [item.keys, item.name, item.desc, item.trigger]
        .filter(Boolean).join(' ').toLowerCase();
      return text.includes(q);
    });
  }, [activeTab, searchQuery]); // eslint-disable-line

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    notify('📋 Скопировано в буфер обмена');
  };

  const isHotkeys    = activeTab.startsWith('hotkeys');
  const isMacros     = ['excel_macros','word_macros','onec'].includes(activeTab);
  const isSharePoint = activeTab === 'sharepoint';

  return (
    <div style={{ color: 'var(--text0)', paddingBottom: 24 }}>
      {/* Заголовок */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 14, fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: 3, color: 'var(--text3)', marginBottom: 4,
        }}>АВТОМАТИЗАЦИЯ</div>
        <div style={{ fontSize: 18, fontFamily: "'Cormorant Infant',serif", color: 'var(--text0)' }}>
          Горячие клавиши · Макросы · 1С · SharePoint
        </div>
      </div>

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id}
            onClick={() => { setActiveTab(t.id); setSearchQuery(''); }}
            style={{
              padding: '7px 14px', borderRadius: 14, fontSize: 14, cursor: 'pointer',
              background: activeTab === t.id ? 'rgba(0,112,192,0.1)' : 'transparent',
              border: `1px solid ${activeTab === t.id ? 'rgba(0,112,192,0.4)' : 'rgba(0,0,0,0.1)'}`,
              color: activeTab === t.id ? '#0070c0' : 'var(--text3)',
              transition: 'all 0.15s', fontFamily: "'JetBrains Mono',monospace",
              fontWeight: activeTab === t.id ? 600 : 400,
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Поиск */}
      <div style={{ marginBottom: 14 }}>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Поиск..."
          style={{
            width: '100%', padding: '9px 14px',
            background: 'rgba(255,255,255,0.8)',
            border: '1px solid rgba(0,112,192,0.15)',
            borderRadius: 18, color: 'var(--text0)',
            fontSize: 16, outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Счётчик */}
      <div style={{
        fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
        letterSpacing: 2, color: 'var(--text3)', marginBottom: 12,
      }}>
        НАЙДЕНО · {filtered.length}
      </div>

      {/* ════ ГОРЯЧИЕ КЛАВИШИ ════ */}
      {isHotkeys && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
          {filtered.map((item, i) => (
            <div key={i}
              onClick={() => copyToClipboard(item.keys)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
                background: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(0,112,192,0.1)',
                transition: 'all 0.15s',
              }}
            >
              {/* Клавиша */}
              <div style={{
                flexShrink: 0, padding: '6px 12px', borderRadius: 8,
                background: 'rgba(0,112,192,0.08)',
                border: '1px solid rgba(0,112,192,0.2)',
                fontSize: 14, color: '#0070c0', fontWeight: 600,
                fontFamily: "'JetBrains Mono',monospace",
                whiteSpace: 'nowrap', letterSpacing: 0.5,
                boxShadow: '0 1px 3px rgba(0,112,192,0.1)',
              }}>
                {item.keys}
              </div>
              <div style={{ fontSize: 16, color: 'var(--text1)', lineHeight: 1.4 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════ МАКРОСЫ И 1С ════ */}
      {isMacros && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((item, i) => {
            const lc = LANG_COLORS[item.lang] || LANG_COLORS.VBA;
            const lines = item.code.split('\n');
            return (
              <div key={i} style={{
                borderRadius: 12, overflow: 'hidden',
                border: '1px solid rgba(0,0,0,0.08)',
                background: 'rgba(255,255,255,0.7)',
              }}>
                {/* Шапка макроса */}
                <div style={{
                  padding: '12px 16px',
                  borderBottom: `1px solid ${lc.border}`,
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', gap: 12,
                  background: lc.bg,
                }}>
                  <div>
                    <div style={{
                      fontSize: 17, fontWeight: 600,
                      color: 'var(--text0)', marginBottom: 3,
                    }}>{item.name}</div>
                    <div style={{ fontSize: 15, color: 'var(--text3)', lineHeight: 1.4 }}>
                      {item.desc}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: 6,
                      fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
                      background: 'rgba(255,255,255,0.8)',
                      border: `1px solid ${lc.border}`,
                      color: lc.text, fontWeight: 600,
                    }}>{item.lang}</span>
                    <button
                      onClick={() => copyToClipboard(item.code)}
                      style={{
                        padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                        background: 'rgba(255,255,255,0.9)',
                        border: `1px solid ${lc.border}`,
                        color: lc.text, fontSize: 14,
                        fontFamily: "'JetBrains Mono',monospace",
                      }}
                    >Копировать</button>
                  </div>
                </div>

                {/* Код с нумерацией строк */}
                <div style={{
                  display: 'flex',
                  background: '#f8f9fa',
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 15.5, lineHeight: 1.7,
                  overflow: 'hidden',
                }}>
                  {/* Номера строк */}
                  <div style={{
                    padding: '12px 0',
                    background: 'rgba(250,243,224,0.03)',
                    borderRight: `1px solid ${lc.border}`,
                    userSelect: 'none', minWidth: 36,
                    textAlign: 'right',
                  }}>
                    {lines.map((_, li) => (
                      <div key={li} style={{
                        padding: '0 8px',
                        color: lc.num,
                        fontSize: 14,
                      }}>{li + 1}</div>
                    ))}
                  </div>

                  {/* Код */}
                  <div style={{
                    flex: 1, padding: '12px 16px',
                    overflowX: 'auto', whiteSpace: 'pre',
                  }}>
                    {lines.map((line, li) => {
                      // Простая подсветка ключевых слов
                      const isKeyword = item.lang === 'VBA'
                        ? /^(Sub|End Sub|Dim|For|Next|If|Then|Else|End If|With|End With|MsgBox|ActiveSheet|ActiveDocument|Selection)/i.test(line.trim())
                        : /^(Процедура|КонецПроцедуры|Если|КонецЕсли|Пока|КонецЦикла|Для|Цикл|Запрос|Выборка)/i.test(line.trim());
                      return (
                        <div key={li} style={{
                          color: isKeyword ? lc.text : 'var(--text1)',
                          fontWeight: isKeyword ? 600 : 400,
                        }}>{line || ' '}</div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════ SHAREPOINT ════ */}
      {isSharePoint && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((item, i) => (
            <div key={i} style={{
              borderRadius: 12, overflow: 'hidden',
              border: '1px solid rgba(0,112,192,0.15)',
              background: 'rgba(255,255,255,0.7)',
            }}>
              <div style={{
                padding: '14px 16px',
                background: 'rgba(0,112,192,0.04)',
                borderBottom: '1px solid rgba(0,112,192,0.1)',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text0)', marginBottom: 3 }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 15, color: 'var(--text3)', lineHeight: 1.5 }}>
                    {item.desc}
                  </div>
                </div>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{
                  padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(0,112,192,0.05)',
                  border: '1px solid rgba(0,112,192,0.15)',
                  fontSize: 15,
                }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 13, color: '#0070c0',
                    marginRight: 8, letterSpacing: 1,
                  }}>ТРИГГЕР</span>
                  <span style={{ color: 'var(--text1)' }}>{item.trigger}</span>
                </div>
                <div style={{
                  padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(34,197,94,0.04)',
                  border: '1px solid rgba(34,197,94,0.15)',
                  fontSize: 15,
                }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 13, color: '#22c55e',
                    marginRight: 8, letterSpacing: 1,
                  }}>ДЕЙСТВИЯ</span>
                  <span style={{ color: 'var(--text1)' }}>{item.actions}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{
          padding: '40px 20px', textAlign: 'center',
          color: 'var(--text3)', fontSize: 16,
        }}>
          Ничего не найдено по запросу «{searchQuery}»
        </div>
      )}
    </div>
  );
}
