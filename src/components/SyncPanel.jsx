// src/components/SyncPanel.jsx
import { useState } from 'react';
import { useCloudSync } from '../hooks/useCloudSync';

export function SyncPanel() {
  const {
    syncKey, status, message,
    createAndSync, loadByKey, pushToCloud,
    setMessage, setStatus,
  } = useCloudSync();

  const [inputKey,  setInputKey]  = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [copied,    setCopied]    = useState(false);

  const copyKey = () => {
    navigator.clipboard.writeText(syncKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoad = async () => {
    const key = inputKey.trim();
    const ok = await loadByKey(key);
    if (ok) {
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const statusColor = {
    idle:    'rgba(255,255,255,0.4)',
    syncing: 'rgba(200,164,90,0.8)',
    success: 'rgba(34,197,94,0.8)',
    error:   'rgba(239,68,68,0.8)',
  }[status];

  const statusIcon = {
    idle:    '☁',
    syncing: '↻',
    success: '✓',
    error:   '✕',
  }[status];

  return (
    <>
      {/* Плавающая кнопка */}
      <div
        onClick={() => {
          setShowPanel(v => !v);
          setMessage('');
          setStatus('idle');
        }}
        style={{
          position: 'fixed', bottom: 80, right: 16, zIndex: 200,
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(10,15,30,0.9)',
          border: `1.5px solid ${statusColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 18, color: statusColor,
          boxShadow: `0 0 12px ${statusColor}44`,
          transition: 'all 0.2s',
        }}
        title="Синхронизация данных"
      >
        {statusIcon}
      </div>

      {/* Панель */}
      {showPanel && (
        <div
          onClick={() => setShowPanel(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480,
              background: 'linear-gradient(135deg, #0a0f1e, #050810)',
              border: '1px solid rgba(200,164,90,0.3)',
              borderRadius: '20px 20px 0 0',
              padding: '24px 20px 32px',
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            {/* Заголовок */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 20,
            }}>
              <div>
                <div style={{
                  fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
                  letterSpacing: 3, color: 'rgba(200,164,90,0.7)', marginBottom: 3,
                }}>СИНХРОНИЗАЦИЯ</div>
                <div style={{ fontSize: 16, fontFamily: "'Cormorant Infant',serif" }}>
                  Облачное хранилище данных
                </div>
              </div>
              <span
                onClick={() => setShowPanel(false)}
                style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
              >✕</span>
            </div>

            {/* Статус */}
            {message && (
              <div style={{
                padding: '10px 14px', marginBottom: 16, borderRadius: 10,
                background: status === 'error'
                  ? 'rgba(239,68,68,0.1)'
                  : 'rgba(34,197,94,0.1)',
                border: `1px solid ${status === 'error'
                  ? 'rgba(239,68,68,0.3)'
                  : 'rgba(34,197,94,0.3)'}`,
                fontSize: 13, color: statusColor, lineHeight: 1.5,
              }}>
                {statusIcon} {message}
              </div>
            )}

            {/* Есть ключ */}
            {syncKey ? (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
                  letterSpacing: 2, color: 'rgba(200,164,90,0.6)', marginBottom: 8,
                }}>ВАШ КЛЮЧ СИНХРОНИЗАЦИИ</div>

                <div style={{
                  display: 'flex', gap: 8, alignItems: 'center',
                  padding: '10px 14px',
                  background: 'rgba(200,164,90,0.08)',
                  border: '1px solid rgba(200,164,90,0.3)',
                  borderRadius: 10,
                }}>
                  <div style={{
                    flex: 1, fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 16, color: 'rgba(200,164,90,0.95)', letterSpacing: 1,
                  }}>
                    {syncKey}
                  </div>
                  <button onClick={copyKey} style={{
                    padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                    background: copied
                      ? 'rgba(34,197,94,0.2)'
                      : 'rgba(200,164,90,0.15)',
                    border: `1px solid ${copied
                      ? 'rgba(34,197,94,0.4)'
                      : 'rgba(200,164,90,0.4)'}`,
                    color: copied
                      ? 'rgba(34,197,94,0.9)'
                      : 'rgba(200,164,90,0.9)',
                    fontSize: 12,
                    fontFamily: "'JetBrains Mono',monospace",
                  }}>
                    {copied ? '✓' : '📋'}
                  </button>
                </div>

                <div style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.3)',
                  marginTop: 6, lineHeight: 1.5,
                }}>
                  Сохраните этот ключ. На другом устройстве введите его чтобы загрузить данные.
                </div>

                <div style={{ marginTop: 14 }}>
                  <button
                    onClick={() => pushToCloud(syncKey)}
                    disabled={status === 'syncing'}
                    style={{
                      width: '100%', padding: '11px 0', borderRadius: 12,
                      background: 'rgba(200,164,90,0.1)',
                      border: '1px solid rgba(200,164,90,0.4)',
                      color: 'rgba(200,164,90,0.9)', fontSize: 13,
                      cursor: status === 'syncing' ? 'not-allowed' : 'pointer',
                      opacity: status === 'syncing' ? 0.6 : 1,
                      fontFamily: "'JetBrains Mono',monospace",
                    }}
                  >
                    {status === 'syncing' ? '↻ Синхронизация...' : '☁ Сохранить в облако'}
                  </button>
                  <div style={{
                    marginTop: 6, fontSize: 11,
                    color: 'rgba(255,255,255,0.2)',
                    fontFamily: "'JetBrains Mono',monospace",
                    textAlign: 'center', letterSpacing: 1,
                  }}>
                    ↻ автосохранение каждые 30 сек
                  </div>
                </div>
              </div>
            ) : (
              /* Нет ключа */
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 13, color: 'rgba(255,255,255,0.5)',
                  marginBottom: 14, lineHeight: 1.6,
                }}>
                  У вас ещё нет ключа синхронизации. Создайте его чтобы сохранить данные в облако и использовать на других устройствах.
                </div>
                <button
                  onClick={createAndSync}
                  disabled={status === 'syncing'}
                  style={{
                    width: '100%', padding: '13px 0', borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(200,164,90,0.2), rgba(200,164,90,0.06))',
                    border: '1px solid rgba(200,164,90,0.5)',
                    color: 'rgba(200,164,90,0.95)', fontSize: 14,
                    cursor: status === 'syncing' ? 'not-allowed' : 'pointer',
                    opacity: status === 'syncing' ? 0.6 : 1,
                    fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1,
                  }}
                >
                  {status === 'syncing' ? '↻ Создаю ключ...' : '✦ Создать ключ и сохранить'}
                </button>
              </div>
            )}

            {/* Разделитель */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
            }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <div style={{
                fontSize: 10, color: 'rgba(255,255,255,0.25)',
                fontFamily: "'JetBrains Mono',monospace", whiteSpace: 'nowrap',
              }}>
                ЗАГРУЗИТЬ НА ЭТОМ УСТРОЙСТВЕ
              </div>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>

            {/* Ввод ключа */}
            <div>
              <div style={{
                fontSize: 10, fontFamily: "'JetBrains Mono',monospace",
                letterSpacing: 2, color: 'rgba(255,255,255,0.3)', marginBottom: 8,
              }}>ВВЕДИТЕ КЛЮЧ С ДРУГОГО УСТРОЙСТВА</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={inputKey}
                  onChange={e => setInputKey(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLoad()}
                  placeholder="ld-xxxxx-xxxxx"
                  style={{
                    flex: 1, padding: '10px 14px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, color: 'rgba(255,255,255,0.9)',
                    fontSize: 14, outline: 'none',
                    fontFamily: "'JetBrains Mono',monospace",
                  }}
                />
                <button
                  onClick={handleLoad}
                  disabled={!inputKey.trim() || status === 'syncing'}
                  style={{
                    padding: '0 18px', borderRadius: 10,
                    background: 'rgba(0,112,192,0.15)',
                    border: '1px solid rgba(0,112,192,0.4)',
                    color: 'rgba(100,180,255,0.9)',
                    cursor: !inputKey.trim() || status === 'syncing'
                      ? 'not-allowed'
                      : 'pointer',
                    opacity: !inputKey.trim() ? 0.5 : 1,
                    fontSize: 16,
                  }}
                >→</button>
              </div>
              <div style={{
                fontSize: 11, color: 'rgba(255,255,255,0.25)',
                marginTop: 6, lineHeight: 1.5,
              }}>
                После загрузки страница перезагрузится автоматически.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
