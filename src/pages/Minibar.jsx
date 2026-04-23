import { useState } from 'react'
import { useMinibar } from '../hooks/useMinibar'
import { useAuth } from '../context/AuthContext'
import { useMobile } from '../hooks/useMobile'

const BUILDING_NAMES = {
  vjeter: 'Hoteli Vjetër',
  ri: 'Hoteli i Ri',
}

function timeAgo(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diffMin = Math.round((now - d) / 60000)
  if (diffMin < 1) return 'tani'
  if (diffMin < 60) return `${diffMin}m`
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`
  return d.toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' })
}

export default function Minibar() {
  const { staff } = useAuth()

  // Different views based on role
  if (staff?.role === 'cleaner') return <CleanerView />
  if (staff?.role === 'reception') return <ReceptionView />

  // Admin/manager fallback
  return <ReceptionView />
}

// ============================================
// CLEANER VIEW: tap a room → tap drinks that are missing
// ============================================
function CleanerView() {
  const { products, rooms, reports, loading, error, reportMissing } = useMinibar()
  const isMobile = useMobile()
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [reportingProductId, setReportingProductId] = useState(null)

  if (loading) return <div style={{ color: 'var(--muted)' }}>Duke u ngarkuar...</div>
  if (error) return (
    <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 8 }}>
      Gabim: {error}
    </div>
  )

  const handleReport = async (productId) => {
    setReportingProductId(productId)
    await reportMissing(selectedRoom.id, productId)
    setReportingProductId(null)
  }

  // Get reports for selected room (recent only)
  const roomReports = selectedRoom
    ? reports.filter(r => r.room_id === selectedRoom.id).slice(0, 10)
    : []

  if (selectedRoom) {
    return (
      <div>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          marginBottom: 16,
        }}>
          <button
            onClick={() => setSelectedRoom(null)}
            style={{
              padding: '8px 12px', fontSize: 13, fontWeight: 500,
              background: '#f1f5f9', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 7,
              cursor: 'pointer',
            }}
          >
            ← Kthehu
          </button>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>
              Dhoma {selectedRoom.number}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Kati {selectedRoom.floor} · {BUILDING_NAMES[selectedRoom.building]}
            </div>
          </div>
        </div>

        {/* Instruction */}
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe',
          padding: '10px 14px', borderRadius: 8, marginBottom: 16,
          fontSize: 12, color: '#1e40af', lineHeight: 1.5,
        }}>
          ℹ Klikoni produktin që mungon në frigorifer për ta raportuar te recepsioni.
        </div>

        {/* Products grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
          marginBottom: 24,
        }}>
          {products.map(prod => {
            const isReporting = reportingProductId === prod.id
            return (
              <button
                key={prod.id}
                onClick={() => handleReport(prod.id)}
                disabled={isReporting}
                style={{
                  padding: 16,
                  background: 'var(--surface)',
                  border: '2px solid var(--border)',
                  borderRadius: 10,
                  cursor: isReporting ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  fontSize: 14, fontWeight: 600,
                  minHeight: 70,
                  transition: 'all 0.1s',
                  opacity: isReporting ? 0.5 : 1,
                  display: 'flex', flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
                onMouseEnter={(e) => {
                  if (!isReporting) e.currentTarget.style.borderColor = 'var(--accent)'
                }}
                onMouseLeave={(e) => {
                  if (!isReporting) e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                <span>{prod.name}</span>
                <span style={{
                  fontSize: 11, fontWeight: 500,
                  color: isReporting ? 'var(--accent)' : 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  {isReporting ? '✓ U raportua' : '+ Raporto'}
                </span>
              </button>
            )
          })}
        </div>

        {/* Recent reports for this room */}
        {roomReports.length > 0 && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10, overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              fontWeight: 600, fontSize: 13,
            }}>
              Raportet e fundit për këtë dhomë
            </div>
            {roomReports.map(r => (
              <div key={r.id} style={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: 13,
              }}>
                <span style={{ fontWeight: 500 }}>{r.product?.name}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {timeAgo(r.recorded_at)}
                  {r.report_status === 'acknowledged' && (
                    <span style={{ color: 'var(--success)', marginLeft: 6 }}>✓</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Room list
  return (
    <div>
      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe',
        padding: '10px 14px', borderRadius: 8, marginBottom: 16,
        fontSize: 12, color: '#1e40af', lineHeight: 1.5,
      }}>
        ℹ Zgjidhni dhomën dhe raportoni produktet që mungojnë në minibar.
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
        gap: 10,
      }}>
        {rooms.map(room => {
          const pending = reports.filter(
            r => r.room_id === room.id && r.report_status === 'reported'
          ).length

          return (
            <button
              key={room.id}
              onClick={() => setSelectedRoom(room)}
              style={{
                padding: 14,
                background: 'var(--surface)',
                border: '2px solid var(--border)',
                borderRadius: 10,
                cursor: 'pointer',
                position: 'relative',
                minHeight: 80,
                display: 'flex', flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 4,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {room.number}
              </div>
              <div style={{
                fontSize: 10, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '0.4px',
              }}>
                Kati {room.floor}
              </div>
              {pending > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 8, right: 8,
                  background: 'var(--warning)',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '1px 7px',
                  fontSize: 10, fontWeight: 700,
                }}>
                  {pending}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// RECEPTION VIEW: feed of reports + handled history
// ============================================
function ReceptionView() {
  const { reports, loading, error, acknowledgeReport, acknowledgeAllForRoom } = useMinibar()
  const [tab, setTab] = useState('pending')
  const [busy, setBusy] = useState(null)

  if (loading) return <div style={{ color: 'var(--muted)' }}>Duke u ngarkuar...</div>
  if (error) return (
    <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 8 }}>
      Gabim: {error}
    </div>
  )

  const pending = reports.filter(r => r.report_status === 'reported')
  const acknowledged = reports.filter(r => r.report_status === 'acknowledged')

  // Group pending by room
  const groupedPending = {}
  pending.forEach(r => {
    if (!groupedPending[r.room_id]) groupedPending[r.room_id] = []
    groupedPending[r.room_id].push(r)
  })

  const handleAcknowledge = async (reportId) => {
    setBusy(reportId)
    await acknowledgeReport(reportId)
    setBusy(null)
  }

  const handleAcknowledgeAll = async (roomId) => {
    setBusy(roomId)
    await acknowledgeAllForRoom(roomId)
    setBusy(null)
  }

  const visibleReports = tab === 'pending' ? pending : acknowledged

  return (
    <div>
      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 2, background: '#f1f5f9',
        padding: 3, borderRadius: 8, marginBottom: 16,
        overflowX: 'auto', maxWidth: 400,
      }}>
        <TabButton active={tab === 'pending'} onClick={() => setTab('pending')}>
          Të reja
          <Counter color="#b45309">{pending.length}</Counter>
        </TabButton>
        <TabButton active={tab === 'acknowledged'} onClick={() => setTab('acknowledged')}>
          Të kryera
          <Counter color="#15803d">{acknowledged.length}</Counter>
        </TabButton>
      </div>

      {/* Empty state */}
      {visibleReports.length === 0 && (
        <div style={{
          padding: 60, textAlign: 'center', color: 'var(--muted)',
          background: 'var(--surface)', borderRadius: 10,
          border: '1px solid var(--border)',
        }}>
          {tab === 'pending'
            ? '🎉 Asnjë raport i ri për momentin'
            : 'Asnjë raport i kryer ende'}
        </div>
      )}

      {/* Pending: grouped by room */}
      {tab === 'pending' && Object.keys(groupedPending).map(roomId => {
        const items = groupedPending[roomId]
        const room = items[0].room

        return (
          <div
            key={roomId}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              marginBottom: 12,
              overflow: 'hidden',
            }}
          >
            <div style={{
              padding: '12px 16px',
              background: '#fef3c7',
              borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: 8,
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  Dhoma {room?.number}
                </div>
                <div style={{ fontSize: 11, color: '#78350f' }}>
                  {BUILDING_NAMES[room?.building]} · Kati {room?.floor} · {items.length} {items.length === 1 ? 'produkt' : 'produkte'}
                </div>
              </div>
              <button
                onClick={() => handleAcknowledgeAll(roomId)}
                disabled={busy === roomId}
                style={{
                  padding: '7px 14px', fontSize: 12, fontWeight: 600,
                  background: '#15803d', color: '#fff',
                  borderRadius: 7, cursor: 'pointer',
                  opacity: busy === roomId ? 0.5 : 1,
                }}
              >
                ✓ Kryej të gjitha
              </button>
            </div>

            {items.map(report => (
              <div
                key={report.id}
                style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: 13,
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {report.product?.name}
                    {report.quantity > 1 && (
                      <span style={{ color: 'var(--muted)', marginLeft: 6 }}>
                        × {report.quantity}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    Raportuar nga {report.reporter?.name || '—'} · {timeAgo(report.recorded_at)}
                  </div>
                </div>
                <button
                  onClick={() => handleAcknowledge(report.id)}
                  disabled={busy === report.id}
                  style={{
                    padding: '6px 12px', fontSize: 11, fontWeight: 600,
                    background: '#dcfce7', color: '#15803d',
                    borderRadius: 6, cursor: 'pointer',
                    opacity: busy === report.id ? 0.5 : 1,
                  }}
                >
                  ✓ Kryer
                </button>
              </div>
            ))}
          </div>
        )
      })}

      {/* Acknowledged: flat list */}
      {tab === 'acknowledged' && acknowledged.length > 0 && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          {acknowledged.map(report => (
            <div
              key={report.id}
              style={{
                padding: '11px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: 13,
              }}
            >
              <div>
                <div>
                  <span style={{ fontWeight: 600 }}>Dhoma {report.room?.number}</span>
                  <span style={{ color: 'var(--muted)', margin: '0 6px' }}>·</span>
                  <span>{report.product?.name}</span>
                  {report.quantity > 1 && (
                    <span style={{ color: 'var(--muted)', marginLeft: 4 }}>
                      ×{report.quantity}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {report.reporter?.name || '—'} · {timeAgo(report.recorded_at)}
                </div>
              </div>
              <span style={{ fontSize: 16, color: 'var(--success)' }}>✓</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Helpers ──────────
function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 14px', borderRadius: 6,
        fontSize: 13, fontWeight: 500,
        background: active ? '#fff' : 'transparent',
        color: active ? 'var(--text)' : 'var(--muted)',
        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}
    >
      {children}
    </button>
  )
}

function Counter({ children, color }) {
  return (
    <span style={{
      background: `${color}22`, color,
      padding: '1px 7px', borderRadius: 10,
      fontSize: 10, fontWeight: 700,
    }}>
      {children}
    </span>
  )
}