// src/components/work/tools/HotkeysGuide.jsx
import { useState, useMemo } from 'react';
import { useApp } from '../../../store/AppContext';

const HOTKEYS = {
  excel: [
    { keys: 'Ctrl + C',           desc: 'Копировать выделенное' },
    { keys: 'Ctrl + V',           desc: 'Вставить' },
    { keys: 'Ctrl + Z',           desc: 'Отменить действие' },
    { keys: 'Ctrl + Y',           desc: 'Повторить действие' },
    { keys: 'Alt + =',            desc: 'Автосумма выделенного диапазона' },
    { keys: 'Ctrl + Shift + L',   desc: 'Включить/выключить фильтр' },
    { keys: 'Ctrl + T',           desc: 'Создать таблицу из диапазона' },
    { keys: 'F4',                 desc: 'Повторить последнее действие / абсолютная ссылка' },
    { keys: 'Ctrl + Shift + :',   desc: 'Вставить текущее время' },
    { keys: 'Ctrl + ;',           desc: 'Вставить текущую дату' },
    { keys: 'Ctrl + 1',           desc: 'Открыть формат ячеек' },
    { keys: 'Ctrl + Shift + $',   desc: 'Формат денежный' },
    { keys: 'Ctrl + Shift + %',   desc: 'Формат процентный' },
    { keys: 'F2',                 desc: 'Редактировать содержимое ячейки' },
    { keys: 'Ctrl + Home',        desc: 'Перейти в начало таблицы' },
    { keys: 'Ctrl + End',         desc: 'Перейти в последнюю заполненную ячейку' },
  ],
  word: [
    { keys: 'Ctrl + B',           desc: 'Жирный текст' },
    { keys: 'Ctrl + I',           desc: 'Курсив' },
    { keys: 'Ctrl + U',           desc: 'Подчёркнутый' },
    { keys: 'Ctrl + K',           desc: 'Вставить гиперссылку' },
    { keys: 'Ctrl + Alt + 1',     desc: 'Заголовок 1' },
    { keys: 'Ctrl + Alt + 2',     desc: 'Заголовок 2' },
    { keys: 'F7',                 desc: 'Проверка орфографии' },
    { keys: 'Ctrl + Enter',       desc: 'Вставить разрыв страницы' },
    { keys: 'Ctrl + Shift + C',   desc: 'Копировать форматирование' },
    { keys: 'Ctrl + Shift + V',   desc: 'Применить форматирование' },
    { keys: 'Alt + Shift + D',    desc: 'Вставить текущую дату' },
  ],
};

const EXCEL_MACROS = [
  {
    name: 'Очистить форматирование',
    desc: 'Удаляет всё форматирование в выделенной области',
    code: `Sub ClearFormatting()
    Selection.ClearFormats
End Sub`,
  },
  {
    name: 'Выделить пустые ячейки',
    desc: 'Быстро находит и выделяет пустые ячейки',
    code: `Sub SelectBlankCells()
    Selection.SpecialCells(xlCellTypeBlanks).Select
End Sub`,
  },
  {
    name: 'Сохранить лист как PDF',
    desc: 'Экспортирует текущий лист в PDF рядом с файлом',
    code: `Sub SaveAsPDF()
    Dim path As String
    path = ThisWorkbook.Path & "\\" & ActiveSheet.Name & ".pdf"
    ActiveSheet.ExportAsFixedFormat xlTypePDF, path
    MsgBox "Сохранено: " & path
End Sub`,
  },
  {
    name: 'Удалить дубликаты',
    desc: 'Удаляет дублирующиеся строки в выделенном диапазоне',
    code: `Sub RemoveDuplicates()
    ActiveSheet.UsedRange.RemoveDuplicates _
        Columns:=1, Header:=xlYes
    MsgBox "Дубликаты удалены"
End Sub`,
  },
  {
    name: 'Раскрасить по значению',
    desc: 'Подсвечивает ячейки: красный < 0, зелёный > 0',
    code: `Sub ColorByValue()
    Dim cell As Range
    For Each cell In Selection
        If IsNumeric(cell.Value) Then
            If cell.Value < 0 Then
                cell.Interior.Color = RGB(255, 200, 200)
            ElseIf cell.Value > 0 Then
                cell.Interior.Color = RGB(200, 255, 200)
            Else
                cell.Interior.ColorIndex = xlNone
            End If
        End If
    Next cell
End Sub`,
  },
];

const WORD_MACROS = [
  {
    name: 'Вставить текущую дату',
    desc: 'Вставляет сегодняшнюю дату в формате дд.мм.гггг',
    code: `Sub InsertDate()
    Selection.InsertAfter Format(Date, "dd.mm.yyyy")
End Sub`,
  },
  {
    name: 'Очистить форматирование',
    desc: 'Сбрасывает всё форматирование выделенного текста',
    code: `Sub ClearAllFormatting()
    Selection.ClearFormatting
End Sub`,
  },
  {
    name: 'Создать оглавление',
    desc: 'Автоматически создаёт оглавление на основе заголовков',
    code: `Sub CreateTOC()
    ActiveDocument.TablesOfContents.Add _
        Range:=Selection.Range, _
        UseHeadingStyles:=True, _
        UpperHeadingLevel:=1, _
        LowerHeadingLevel:=3
End Sub`,
  },
  {
    name: 'Заменить шрифт во всём документе',
    desc: 'Меняет шрифт всего документа на Times New Roman 12pt',
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
    code: `Процедура ПровестиДокументыЗаПериод(НачДата, КонДата, ВидДок)
    Запрос = Новый Запрос;
    Запрос.Текст = "ВЫБРАТЬ Ссылка ИЗ " + ВидДок +
        " ГДЕ Дата МЕЖДУ &Нач И &Кон И Проведен = ЛОЖЬ";
    Запрос.УстановитьПараметр("Нач", НачДата);
    Запрос.УстановитьПараметр("Кон", КонДата);
    Выборка = Запрос.Выполнить().Выбрать();
    Пока Выборка.Следующий() Цикл
        Об = Выборка.Ссылка.ПолучитьОбъект();
        Об.Провести(РежимПроведенияДокумента.Оперативный);
    КонецЦикла;
КонецПроцедуры`,
  },
  {
    name: 'Выгрузка таблицы в Excel',
    desc: 'Экспортирует табличную часть документа в Excel',
    code: `Процедура ВыгрузитьВExcel(ТЗ, ПутьКФайлу)
    Excel = Новый COMОбъект("Excel.Application");
    Книга = Excel.Workbooks.Add();
    Лист = Книга.Worksheets(1);
    Для к = 1 По ТЗ.Колонки.Количество() Цикл
        Лист.Cells(1, к).Value = ТЗ.Колонки[к-1].Имя;
    КонецЦикла;
    Для н = 1 По ТЗ.Количество() Цикл
        Для к = 1 По ТЗ.Колонки.Количество() Цикл
            Лист.Cells(н+1, к).Value = ТЗ[н-1][к-1];
        КонецЦикла;
    КонецЦикла;
    Книга.SaveAs(ПутьКФайлу);
    Excel.Quit();
КонецПроцедуры`,
  },
  {
    name: 'Очистить кэш регистров',
    desc: 'Пересчёт итогов регистров накопления',
    code: `Процедура ПересчитатьИтоги()
    РегистрыНакопления.ОстаткиТоваров.УстановитьПериодичностьИтогов(
        ПериодичностьИтоговРегистраНакопления.Месяц);
    МенеджерИтогов = РегистрыНакопления.ОстаткиТоваров;
    МенеджерИтогов.ПересчитатьИтоги();
    Сообщить("Итоги пересчитаны");
КонецПроцедуры`,
  },
];

const SHAREPOINT_FLOWS = [
  {
    name: 'Автосохранение документов из Life Diary',
    desc: 'При создании акта или приказа — автоматически сохраняется в SharePoint',
    trigger: 'Когда документ создан в приложении',
    actions: 'Создать файл в SharePoint → Присвоить метки → Уведомить бухгалтера',
    icon: '📄',
  },
  {
    name: 'Ежемесячная архивация',
    desc: '5-го числа каждого месяца архивирует все документы за предыдущий месяц',
    trigger: 'По расписанию (5-е число ежемесячно)',
    actions: 'Получить файлы → Создать папку ГГГГ-ММ → Переместить → Уведомить',
    icon: '📦',
  },
  {
    name: 'Уведомление о новых счетах',
    desc: 'При загрузке нового счёта от поставщика в папку SharePoint',
    trigger: 'Когда добавляется файл в папку «Входящие счета»',
    actions: 'Отправить уведомление в Teams → Создать задачу в Planner',
    icon: '🔔',
  },
  {
    name: 'Автосоздание папки контрагента',
    desc: 'При добавлении нового контрагента создаётся папка в SharePoint',
    trigger: 'Когда добавляется элемент в список контрагентов',
    actions: 'Создать папку → Назначить разрешения → Создать подпапки',
    icon: '📁',
  },
  {
    name: 'Синхронизация отчётов',
    desc: 'Автоматически сохраняет сформированные отчёты из Life Diary',
    trigger: 'Когда отчёт сгенерирован',
    actions: 'Конвертировать в PDF → Загрузить в SharePoint → Отправить ссылку',
    icon: '🔄',
  },
];

const TABS = [
  { id: 'hotkeys_excel', label: '⚡ Excel',         group: 'hotkeys' },
  { id: 'hotkeys_word',  label: '📝 Word',          group: 'hotkeys' },
  { id: 'excel_macros',  label: '🔧 Макросы Excel', group: 'macros'  },
  { id: 'word_macros',   label: '🔧 Макросы Word',  group: 'macros'  },
  { id: 'onec',          label: '1️⃣ Скрипты 1С',   group: 'macros'  },
  { id: 'sharepoint',    label: '☁️ SharePoint',    group: 'cloud'   },
];

export function HotkeysGuide() {
  const { notify } = useApp();

  const [activeTab,    setActiveTab]    = useState('hotkeys_excel');
  const [searchQuery,  setSearchQuery]  = useState('');

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

  const isHotkeys   = activeTab.startsWith('hotkeys');
  const isMacros    = ['excel_macros','word_macros','onec'].includes(activeTab);
  const isSharePoint = activeTab === 'sharepoint';

  return (
    <div style={{ color: 'var(--text0)', paddingBottom: 24 }}>
      {/* Заголовок */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 11, fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: 3, color: 'rgba(200,164,90,0.7)', marginBottom: 4,
        }}>АВТОМАТИЗАЦИЯ</div>
        <div style={{ fontSize: 18, fontFamily: "'Cormorant Infant',serif" }}>
          Горячие клавиши · Макросы · 1С · SharePoint
        </div>
      </div>

      {/* Вкладки */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setSearchQuery(''); }}
            style={{
              padding: '7px 14px', borderRadius: 14, fontSize: 11, cursor: 'pointer',
              background: activeTab === t.id ? 'rgba(200,164,90,0.15)' : 'transparent',
              border: `1px solid ${activeTab === t.id ? 'rgba(200,164,90,0.5)' : 'rgba(255,255,255,0.1)'}`,
              color: activeTab === t.id ? 'rgba(200,164,90,0.9)' : 'var(--text3)',
              transition: 'all 0.15s', fontFamily: "'JetBrains Mono',monospace",
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Поиск */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Поиск..."
          style={{
            width: '100%', padding: '10px 16px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(200,164,90,0.2)',
            borderRadius: 20, color: 'var(--text0)',
            fontSize: 13, outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Счётчик */}
      <div style={{
        fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
        letterSpacing: 2, color: 'rgba(255,255,255,0.25)', marginBottom: 12,
      }}>
        НАЙДЕНО · {filtered.length}
      </div>

      {/* ════ ГОРЯЧИЕ КЛАВИШИ ════ */}
      {isHotkeys && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
          {filtered.map((item, i) => (
            <div
              key={i}
              onClick={() => copyToClipboard(item.keys)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                flexShrink: 0, padding: '5px 10px', borderRadius: 8,
                background: 'rgba(200,164,90,0.1)',
                border: '1px solid rgba(200,164,90,0.3)',
                fontSize: 11, color: 'rgba(200,164,90,0.9)',
                fontFamily: "'JetBrains Mono',monospace",
                whiteSpace: 'nowrap',
              }}>
                {item.keys}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════ МАКРОСЫ И 1С ════ */}
      {isMacros && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((item, i) => (
            <div key={i} style={{
              padding: '14px 16px', borderRadius: 12,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{
                    fontSize: 14, color: 'rgba(200,164,90,0.9)',
                    fontWeight: 600, marginBottom: 3,
                    fontFamily: "'Cormorant Infant',serif",
                  }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.4 }}>
                    {item.desc}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(item.code)}
                  style={{
                    flexShrink: 0, padding: '5px 12px', borderRadius: 8,
                    background: 'rgba(200,164,90,0.1)',
                    border: '1px solid rgba(200,164,90,0.3)',
                    color: 'rgba(200,164,90,0.8)', fontSize: 11,
                    cursor: 'pointer', marginLeft: 10,
                    fontFamily: "'JetBrains Mono',monospace",
                  }}
                >
                  Копировать
                </button>
              </div>
              <pre style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                padding: '12px 14px', borderRadius: 8,
                fontSize: 12, lineHeight: 1.6,
                overflowX: 'auto', whiteSpace: 'pre',
                color: 'rgba(200,220,255,0.8)',
                fontFamily: "'JetBrains Mono',monospace",
                margin: 0,
              }}>
                {item.code}
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* ════ SHAREPOINT ════ */}
      {isSharePoint && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((item, i) => (
            <div key={i} style={{
              padding: '16px 16px', borderRadius: 12,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(0,112,192,0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 14, color: 'rgba(200,164,90,0.9)',
                    fontWeight: 600, marginBottom: 4,
                    fontFamily: "'Cormorant Infant',serif",
                  }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10, lineHeight: 1.5 }}>
                    {item.desc}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{
                      padding: '6px 10px', borderRadius: 8,
                      background: 'rgba(0,112,192,0.06)',
                      border: '1px solid rgba(0,112,192,0.2)',
                      fontSize: 11, color: 'rgba(100,180,255,0.8)',
                    }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", opacity: 0.6 }}>Триггер: </span>
                      {item.trigger}
                    </div>
                    <div style={{
                      padding: '6px 10px', borderRadius: 8,
                      background: 'rgba(34,197,94,0.04)',
                      border: '1px solid rgba(34,197,94,0.15)',
                      fontSize: 11, color: 'rgba(100,220,150,0.8)',
                    }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", opacity: 0.6 }}>Действия: </span>
                      {item.actions}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{
          padding: '40px 20px', textAlign: 'center',
          color: 'var(--text3)', fontFamily: "'Cormorant Infant',serif", fontSize: 13,
        }}>
          Ничего не найдено по запросу «{searchQuery}»
        </div>
      )}
    </div>
  );
              }
