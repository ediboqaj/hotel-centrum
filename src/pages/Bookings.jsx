import { useState } from 'react'
import { useBookings } from '../hooks/useBookings'
import { useAuth } from '../context/AuthContext'
import { useMobile } from '../hooks/useMobile'
import Badge from '../components/Badge'
import NewBookingModal from '../components/NewBookingModal'
import BookingDetailPanel from '../components/BookingDetailPanel'

const TODAY = new Date().toISOString().split('T')[0]

const TABS = [
  { key: 'all',        label: 'All' },
  { key: 'arrivals',   label: '↓ Arrivals' },
  { key: 'departures', label: '↑ Departures' },
  { key: 'checked-in', label: 'In House' },
  { key: 'confirmed',  label: 'Upcoming' },
  { key: 'unpaid',     label: 'Unpaid' },
]

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24))
}

export default function Bookings() {
  const { bookings, loading, error } = useBookings()
  const { staff } = useAuth()
  const isMobile = useMobile()
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [showNew, setShowNew] = useState(false)

  const canCreate = ['admin', 'manager', 'reception'].includes(staff?.role)

  if (loading) return <div style={{ color: 'var(--muted)' }}>Loading bookings...</div>
  if (error) return (
    <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 8 }}>
      Error: {error}
    </div>
  )

  const filtered = bookings.filter(b => {
    const guestName = (b.guest?.name || '').toLowerCase()
    const roomNum = (b.room?.number || '').toLowerCase()
    const term = search.toLowerCase()
    if (search && !guestName.includes(term) && !roomNum.includes(term)) return false

    if (tab === 'all') return true
    if (tab === 'arrivals')   return b.check_in === TODAY && b.status === 'confirmed'
    if (tab === 'departures') return b.check_out === TODAY && b.status === 'checked-in'
    if (tab === 'unpaid')     return !b.paid && ['confirmed', 'checked-in', 'checked-out'].includes(b.status)
    return b.status === tab
  })

  const selected = bookings.find(b => b.id === selectedId)

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Search + New button */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by guest or room..."
            style={{
              flex: 1, minWidth: 140,
              padding: '9px 12px', fontSize: 13,
              border: '1px solid var(--border)', borderRadius: 7,
              background: 'var(--surface)',
            }}
          />
          {canCreate && (
            <button
              onClick={() => setShowNew(true)}
              style={{
                padding: '9px 14px', fontSize: 13, fontWeight: 500,
                background: 'var(--accent)', color: '#fff',
                borderRadius: 7, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              + New
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 2, background: '#f1f5f9',
          padding: 3, borderRadius: 8, marginBottom: 16,
          overflowX: 'auto',
        }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '6px 12px', borderRadius: 6,
                fontSize: 12, fontWeight: 500,
                background: tab === t.key ? '#fff' : 'transparent',
                color: tab === t.key ? 'var(--text)' : 'var(--muted)',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div style={{
            padding: 40, textAlign: 'center', color: 'var(--muted)',
            background: 'var(--surface)', borderRadius: 10,
            border: '1px solid var(--border)',
          }}>
            No bookings found
          </div>
        )}

        {/* Mobile: card view */}
        {isMobile && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(b => (
              <BookingCard
                key={b.id}
                booking={b}
                selected={b.id === selectedId}
                onClick={() => setSelectedId(b.id === selectedId ? null : b.id)}
              />
            ))}
          </div>
        )}

        {/* Desktop: table view */}
        {!isMobile && filtered.length > 0 && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10, overflow: 'hidden',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <Th>Guest</Th><Th>Room</Th><Th>Check-In</Th>
                    <Th>Check-Out</Th><Th>Nights</Th><Th>Status</Th><Th>Payment</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(b => (
                    <tr
                      key={b.id}
                      onClick={() => setSelectedId(b.id === selectedId ? null : b.id)}
                      style={{
                        cursor: 'pointer',
                        background: b.id === selectedId ? '#f0fdf4' : 'transparent',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <Td>
                        <div style={{ fontWeight: 600 }}>{b.guest?.name || '—'}</div>
                        {b.guest?.nationality && (
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {b.guest.nationality}
                          </div>
                        )}
                      </Td>
                      <Td>
                        <span style={{ fontWeight: 600 }}>{b.room?.number || '—'}</span>
                        {b.room?.building && (
                          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>
                            {b.room.building}
                          </div>
                        )}
                      </Td>
                      <Td>
                        {b.check_in === TODAY
                          ? <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Today</span>
                          : b.check_in}
                      </Td>
                      <Td>
                        {b.check_out === TODAY
                          ? <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Today</span>
                          : b.check_out}
                      </Td>
                      <Td>{daysBetween(b.check_in, b.check_out)}</Td>
                      <Td><Badge status={b.status} /></Td>
                      <Td>
                        {b.status === 'cancelled'
                          ? '—'
                          : <Badge status={b.paid ? 'paid' : 'unpaid'} />}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Detail: side panel on desktop, bottom sheet on mobile */}
      {selected && !isMobile && (
        <BookingDetailPanel booking={selected} onClose={() => setSelectedId(null)} />
      )}

      {selected && isMobile && (
        <>
          <div
            onClick={() => setSelectedId(null)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 199, backdropFilter: 'blur(2px)',
            }}
          />
          <div style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            maxHeight: '85vh',
            background: 'var(--surface)',
            borderRadius: '20px 20px 0 0',
            zIndex: 200,
            boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
            overflowY: 'auto',
            paddingBottom: 'env(safe-area-inset-bottom, 0)',
          }}>
            <div style={{
              width: 36, height: 4, background: '#e2e8f0',
              borderRadius: 2, margin: '12px auto 0',
            }} />
            <BookingDetailPanel
              booking={selected}
              onClose={() => setSelectedId(null)}
              embedded
            />
          </div>
        </>
      )}

      {showNew && (
        <NewBookingModal onClose={() => setShowNew(false)} />
      )}
    </div>
  )
}

// ── Mobile card ────────────────────────────────
function BookingCard({ booking, selected, onClick }) {
  const b = booking
  const nights = daysBetween(b.check_in, b.check_out)
  const isArriving = b.check_in === TODAY && b.status === 'confirmed'
  const isDeparting = b.check_out === TODAY && b.status === 'checked-in'

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 10,
        padding: 14,
        cursor: 'pointer',
        boxShadow: selected ? '0 0 0 2px rgba(16,185,129,0.2)' : 'none',
      }}
    >
      {/* Top row: name + room + status */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
            {b.guest?.name || '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            Room {b.room?.number} · {b.room?.type}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          <Badge status={b.status} />
          {b.status !== 'cancelled' && <Badge status={b.paid ? 'paid' : 'unpaid'} />}
        </div>
      </div>

      {/* Date row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12, color: 'var(--muted)',
        padding: '8px 10px', background: '#f8fafc',
        borderRadius: 7,
      }}>
        <span style={{
          fontWeight: isArriving ? 600 : 400,
          color: isArriving ? 'var(--accent)' : 'inherit',
        }}>
          {isArriving ? 'Today' : b.check_in}
        </span>
        <span>→</span>
        <span style={{
          fontWeight: isDeparting ? 600 : 400,
          color: isDeparting ? 'var(--danger)' : 'inherit',
        }}>
          {isDeparting ? 'Today' : b.check_out}
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>
          {nights} {nights === 1 ? 'night' : 'nights'}
        </span>
      </div>
    </div>
  )
}

// Table helpers
function Th({ children }) {
  return (
    <th style={{
      textAlign: 'left', padding: '10px 14px',
      fontSize: 11, fontWeight: 600, color: 'var(--muted)',
      textTransform: 'uppercase', letterSpacing: '0.5px',
      borderBottom: '1px solid var(--border)',
    }}>
      {children}
    </th>
  )
}
function Td({ children }) {
  return <td style={{ padding: '12px 14px', fontSize: 13 }}>{children}</td>
}