// src/components/work/tools/AkashaLedger.jsx
import { useState, useMemo } from 'react';
import { useApp } from '../../../store/AppContext';

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const DOC_TYPES = {
  defect:   { label: 'Дефектный акт', color: 'rgba(239,68,68,0.4)',    icon: '🔍' },
  order:    { label: 'Приказ',        color: 'rgba(0,112,192,0.4)',    icon: '📋' },
  report:   { label: 'Отчёт',        color: 'rgba(34,197,94,0.4)',    icon: '📊' },
  template: { label: 'Шаблон',       color: 'rgba(200,164,90,0.4)',   icon: '📄' },
  act:      { label: 'Акт',          color: 'rgba(168,85,247,0.4)',   icon: '✅' },
  contract: { label: 'Договор',      color: 'rgba(249,115,22,0.4)',   icon: '🤝' },
  other:    { label: 'Прочее',       color: 'rgba(255,255,255,0.2)',  icon: '📁' },
};

const SYSTEM_SEARCH = `Ты — семантический поисковик по архиву документов бухгалтера.
Найди наиболее релевантные документы по запросу пользователя.
Отвечай кратко и по делу на русском языке.`;

const EMPTY_DOC_FORM = { title: '', type: 'other', path: '', tags: '', notes: '' };

export function AkashaLedger() {
  const { notify } = useApp();

  const [documents, setDocuments] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ld_akasha_docs') || '[]'); }
    catch { return []; }
  });

  const [searchQuery,      setSearchQuery]      = useState('');
  const [selectedDoc,      setSelectedDoc]       = useState(null);
  const [semanticResult,   setSemanticResult]    = useState('');
  const [loadingSearch,    setLoadingSearch]     = useState(false);
  const [showAddForm,      setShowAddForm]       = useState(false);
  const [docForm,          setDocForm]           = useState(EMPTY_DOC_FORM);
  const [filterType,       setFilterType]        = useState('all');

  const saveDocs = (docs) => {
    setDocuments(docs);
    try { localStorage.setItem('ld_akasha_docs', JSON.stringify(docs)); }
    catch {}
  };

  const addDocument = () => {
    if (!docForm.title.trim()) { notify('Введите название документа'); return; }
    const newDoc = {
      id: 'doc-' + Date.now(),
      title: docForm.title.trim(),
      type: docForm.type,
      path: docForm.path.trim() || 'Документы/',
      tags: docForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      notes: docForm.notes.trim(),
      date: localDateStr(),
    };
    saveDocs([newDoc, ...documents]);
    setDocForm(EMPTY_DOC_FORM);
    setShowAddForm(false);
    notify(`✅ Документ «${newDoc.title}» добавлен`);
  };

  const deleteDoc = (id) => {
    saveDocs(documents.filter(d => d.id !== id));
    if (selectedDoc?.id === id) setSelectedDoc(null);
    notify('🗑 Документ удалён');
  };

  const performSemanticSearch = async () => {
    if (!searchQuery.trim()) { notify('Введите запрос'); return; }
    setLoadingSearch(true);
    setSemanticResult('');
    setSelectedDoc(null);

    const docList = documents.map(d =>
      `• ${d.title} (${DOC_TYPES[d.type]?.label || d.type}) — теги: ${d.tags.join(', ') || 'нет'}`
    ).join('\n');

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: SYSTEM_SEARCH,
          user: `Запрос: "${searchQuery}"\n\nДоступные документы:\n${docList || 'Архив пуст'}`,
          maxTokens: 512,
        }),
      });
      const data = await res.json();
      setSemanticResult(data.text || 'Нет результатов.');
    } catch {
      setSemanticResult('Ошибка поиска. Попробуйте позже.');
    } finally {
      setLoadingSearch(false);
    }
  };

  // Обычная фильтрация
  const filteredDocs = useMemo(() => {
    let docs = documents;
    if (filterType !== 'all') docs = docs.filter(d => d.type === filterType);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.tags.some(t => t.toLowerCase().includes(q)) ||
        d.path.toLowerCase().includes(q)
      );
    }
    return docs;
  }, [documents, searchQuery, filterType]);

  return (
    <div style={{ color: 'var(--text0)', paddingBottom: 24 }}>
      {/* Заголовок */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{
            fontSize: 14, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: 3, color: 'rgba(200,164,90,0.7)', marginBottom: 4,
          }}>АКАША ЛЕДЖЕР</div>
          <div style={{ fontSize: 18, fontFamily: "'Cormorant Infant',serif" }}>
            Разумный архив документов
          </div>
        </div>
        <button onClick={() => setShowAddForm(v => !v)} style={{
          padding: '8px 16px', borderRadius: 16, cursor: 'pointer', fontSize: 15,
          background: showAddForm ? 'rgba(200,164,90,0.15)' : 'transparent',
          border: '1px solid rgba(200,164,90,0.4)',
          color: 'rgba(200,164,90,0.9)',
          fontFamily: "'JetBrains Mono',monospace",
        }}>
          {showAddForm ? '✕ Отмена' : '+ Добавить'}
        </button>
      </div>

      {/* Форма добавления */}
      {showAddForm && (
        <div style={{
          padding: '16px 14px', marginBottom: 16,
          background: 'rgba(200,164,90,0.05)',
          border: '1px solid rgba(200,164,90,0.2)',
          borderRadius: 12,
        }}>
          <div style={{
            fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: 2, color: 'rgba(200,164,90,0.7)', marginBottom: 12,
          }}>НОВЫЙ ДОКУМЕНТ</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, color: 'rgba(200,164,90,0.6)', marginBottom: 4 }}>НАЗВАНИЕ *</label>
              <input value={docForm.title} onChange={e => setDocForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Акт сверки с ТОО..."
                style={{ width: '100%', padding: '9px 11px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--text0)', fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, color: 'rgba(200,164,90,0.6)', marginBottom: 4 }}>ТИП</label>
              <select value={docForm.type} onChange={e => setDocForm(p => ({ ...p, type: e.target.value }))}
                style={{ width: '100%', padding: '9px 11px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--text0)', fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
              >
                {Object.entries(DOC_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, color: 'rgba(200,164,90,0.6)', marginBottom: 4 }}>ПУТЬ</label>
              <input value={docForm.path} onChange={e => setDocForm(p => ({ ...p, path: e.target.value }))}
                placeholder="Документы/Акты/"
                style={{ width: '100%', padding: '9px 11px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--text0)', fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, color: 'rgba(200,164,90,0.6)', marginBottom: 4 }}>ТЕГИ (через запятую)</label>
              <input value={docForm.tags} onChange={e => setDocForm(p => ({ ...p, tags: e.target.value }))}
                placeholder="сверка, контрагент..."
                style={{ width: '100%', padding: '9px 11px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--text0)', fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, color: 'rgba(200,164,90,0.6)', marginBottom: 4 }}>ЗАМЕТКИ</label>
            <textarea value={docForm.notes} onChange={e => setDocForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Дополнительные сведения..."
              rows={2}
              style={{ width: '100%', padding: '9px 11px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--text0)', fontSize: 16, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <button onClick={addDocument} style={{
            width: '100%', padding: '11px 0', borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(200,164,90,0.2), rgba(200,164,90,0.06))',
            border: '1px solid rgba(200,164,90,0.4)',
            color: 'rgba(200,164,90,0.9)', fontSize: 16, cursor: 'pointer',
            fontFamily: "'JetBrains Mono',monospace",
          }}>
            Добавить в архив
          </button>
        </div>
      )}

      {/* Поиск */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setSemanticResult(''); }}
          onKeyDown={e => e.key === 'Enter' && performSemanticSearch()}
          placeholder="Поиск или семантический запрос..."
          style={{
            flex: 1, padding: '10px 16px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(200,164,90,0.25)',
            borderRadius: 20, color: 'var(--text0)', fontSize: 16, outline: 'none',
          }}
        />
        <button onClick={performSemanticSearch} disabled={loadingSearch} style={{
          padding: '0 16px', borderRadius: 20,
          background: 'rgba(200,164,90,0.1)',
          border: '1px solid rgba(200,164,90,0.4)',
          color: 'rgba(200,164,90,0.9)',
          cursor: loadingSearch ? 'not-allowed' : 'pointer',
          fontSize: 16, opacity: loadingSearch ? 0.7 : 1,
          fontFamily: "'JetBrains Mono',monospace", whiteSpace: 'nowrap',
        }}>
          {loadingSearch ? '✦' : '🔮 ИИ поиск'}
        </button>
      </div>

      {/* Фильтр по типу */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
        <div onClick={() => setFilterType('all')}
          style={{
            flexShrink: 0, padding: '4px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
            border: `1px solid ${filterType === 'all' ? 'rgba(200,164,90,0.5)' : 'rgba(255,255,255,0.1)'}`,
            background: filterType === 'all' ? 'rgba(200,164,90,0.1)' : 'transparent',
            color: filterType === 'all' ? 'rgba(200,164,90,0.9)' : 'var(--text3)',
            fontFamily: "'JetBrains Mono',monospace",
          }}
        >ВСЕ · {documents.length}</div>
        {Object.entries(DOC_TYPES).map(([k, v]) => {
          const count = documents.filter(d => d.type === k).length;
          if (!count) return null;
          return (
            <div key={k} onClick={() => setFilterType(k)}
              style={{
                flexShrink: 0, padding: '4px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
                border: `1px solid ${filterType === k ? v.color : 'rgba(255,255,255,0.1)'}`,
                background: filterType === k ? v.color.replace('0.4', '0.1') : 'transparent',
                color: filterType === k ? 'rgba(255,255,255,0.9)' : 'var(--text3)',
                fontFamily: "'JetBrains Mono',monospace",
              }}
            >{v.icon} {v.label} · {count}</div>
          );
        })}
      </div>

      {/* Семантический результат */}
      {semanticResult && (
        <div style={{
          padding: '14px 16px', marginBottom: 14,
          background: 'rgba(168,85,247,0.05)',
          border: '1px solid rgba(168,85,247,0.25)',
          borderRadius: 10, fontSize: 16, lineHeight: 1.6,
          color: 'var(--text1)', whiteSpace: 'pre-wrap',
        }}>
          <div style={{
            fontSize: 12, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: 2, color: 'rgba(168,85,247,0.6)', marginBottom: 6,
          }}>🔮 СЕМАНТИЧЕСКИЙ РЕЗУЛЬТАТ</div>
          {semanticResult}
        </div>
      )}

      {/* Основной layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 14,
      }}>
        {/* Список */}
        <div>
          <div style={{
            fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
            letterSpacing: 2, color: 'rgba(255,255,255,0.3)', marginBottom: 10,
          }}>НАЙДЕНО · {filteredDocs.length}</div>

          {filteredDocs.length === 0 && (
            <div style={{
              padding: '40px 20px', textAlign: 'center',
              color: 'var(--text3)', fontFamily: "'Cormorant Infant',serif", fontSize: 16,
            }}>
              {documents.length === 0 ? 'Архив пуст. Добавьте первый документ.' : 'Ничего не найдено'}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredDocs.map(doc => {
              const dt = DOC_TYPES[doc.type] || DOC_TYPES.other;
              return (
                <div key={doc.id} onClick={() => { setSelectedDoc(doc); setSemanticResult(''); }}
                  style={{
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                    background: selectedDoc?.id === doc.id ? 'rgba(200,164,90,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${selectedDoc?.id === doc.id ? 'rgba(200,164,90,0.4)' : 'rgba(255,255,255,0.07)'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{dt.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 16, color: 'var(--text1)', fontWeight: 500,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{doc.title}</div>
                      <div style={{
                        fontSize: 13, color: 'var(--text3)',
                        fontFamily: "'JetBrains Mono',monospace", marginTop: 2,
                      }}>{doc.path}</div>
                    </div>
                    <span style={{
                      flexShrink: 0, fontSize: 13,
                      fontFamily: "'JetBrains Mono',monospace",
                      color: 'rgba(255,255,255,0.25)',
                    }}>{doc.date}</span>
                  </div>
                  {doc.tags.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {doc.tags.map(tag => (
                        <span key={tag} style={{
                          padding: '2px 8px', borderRadius: 8,
                          background: 'rgba(200,164,90,0.08)',
                          border: '1px solid rgba(200,164,90,0.2)',
                          fontSize: 12, color: 'rgba(200,164,90,0.7)',
                          fontFamily: "'JetBrains Mono',monospace",
                        }}>#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Детали документа */}
        <div style={{
          padding: '16px 14px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12, minHeight: 300,
        }}>
          {selectedDoc ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13, fontFamily: "'JetBrains Mono',monospace",
                    letterSpacing: 1, color: 'rgba(200,164,90,0.6)', marginBottom: 4,
                  }}>
                    {DOC_TYPES[selectedDoc.type]?.icon} {DOC_TYPES[selectedDoc.type]?.label?.toUpperCase()}
                  </div>
                  <div style={{
                    fontSize: 16, fontFamily: "'Cormorant Infant',serif",
                    color: 'var(--text1)', lineHeight: 1.3,
                  }}>{selectedDoc.title}</div>
                </div>
                <button onClick={() => deleteDoc(selectedDoc.id)}
                  style={{
                    padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                    background: 'transparent', border: '1px solid rgba(239,68,68,0.3)',
                    color: 'rgba(239,68,68,0.6)', fontSize: 14, flexShrink: 0,
                  }}
                >🗑</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>ПУТЬ</div>
                  <div style={{ fontSize: 15, color: 'var(--text2)', fontFamily: "'JetBrains Mono',monospace" }}>
                    {selectedDoc.path}
                  </div>
                </div>

                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>ДАТА ДОБАВЛЕНИЯ</div>
                  <div style={{ fontSize: 15, color: 'var(--text2)', fontFamily: "'JetBrains Mono',monospace" }}>
                    {selectedDoc.date}
                  </div>
                </div>

                {selectedDoc.tags.length > 0 && (
                  <div style={{
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8,
                  }}>
                    <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>ТЕГИ</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {selectedDoc.tags.map(tag => (
                        <span key={tag} style={{
                          padding: '3px 10px', borderRadius: 8,
                          background: 'rgba(200,164,90,0.08)',
                          border: '1px solid rgba(200,164,90,0.25)',
                          fontSize: 14, color: 'rgba(200,164,90,0.8)',
                        }}>#{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDoc.notes && (
                  <div style={{
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8,
                  }}>
                    <div style={{ fontSize: 12, fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>ЗАМЕТКИ</div>
                    <div style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.5 }}>
                      {selectedDoc.notes}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{
              height: '100%', minHeight: 200,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text3)', textAlign: 'center',
              fontFamily: "'Cormorant Infant',serif", fontSize: 16, lineHeight: 1.8,
            }}>
              Выберите документ<br/>для просмотра Акаша-записи
            </div>
          )}
        </div>
      </div>
    </div>
  );
                      }
