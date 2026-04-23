import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

// ── Date helpers ──────────────────────────────────
const fmt = d => d.toISOString().split('T')[0]
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }
const parseDate = s => new Date(s + 'T00:00:00')

const TODAY = new Date()
TODAY.setHours(0, 0, 0, 0)

const DAYS_VISIBLE = 14  // Show 2 weeks at a time

// Colors based on booking status
const STATUS_COLORS = {
  confirmed:     { bg: '#3b82f6', label: 'Confirmed' },     // blue
  'checked-in':  { bg: '#10b981', label: 'Checked In' },    // green
  'checked-out': { bg: '#94a3b8', label: 'Checked Out' },   // gray
}

export default function Calendar() {
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [startOffset, setStartOffset] = useState(-2)  // Start 2 days before today
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    loadData()

    // Unique channel names so we don't collide with other pages
    const suffix = Math.random().toString(36).slice(2, 9)
    const channel = supabase
      .channel(`calendar-${suffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, loadData)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadData = async () => {
    const [roomsResult, bookingsResult] = await Promise.all([
      supabase.from('rooms').select('*').order('floor').order('number'),
      supabase.from('bookings')
        .select('*, guest:guests(name)')
        .in('status', ['confirmed', 'checked-in', 'checked-out']),
    ])

    if (roomsResult.error) setError(roomsResult.error.message)
    else if (bookingsResult.error) setError(bookingsResult.error.message)
    else {
      setRooms(roomsResult.data || [])
      setBookings(bookingsResult.data || [])
    }
    setLoading(false)
  }

  if (loading) return <div style={{ color: 'var(--muted)' }}>Loading calendar...</div>
  if (error) return (
    <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 8 }}>
      Error: {error}
    </div>
  )

  // Build the array of visible days
  const days = Array.from({ length: DAYS_VISIBLE }, (_, i) => addDays(TODAY, startOffset + i))
  const firstDay = days[0]
  const lastDay = days[days.length - 1]
  const todayStr = fmt(TODAY)

  // Only show bookings that fall within the visible window
  const visibleBookings = bookings.filter(b => {
    const ci = parseDate(b.check_in)
    const co = parseDate(b.check_out)
    return co > firstDay && ci < addDays(lastDay, 1)
  })

  // Determine which rooms have at least one booking in the visible window
  const roomsWithBookings = new Set(visibleBookings.map(b => b.room_id))

  // If showAll is off, only show rooms that have bookings
  const visibleRooms = showAll
    ? rooms
    : rooms.filter(r => roomsWithBookings.has(r.id))

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Header with navigation */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10,
      }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Booking Calendar</h3>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
            {firstDay.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            {' → '}
            {lastDay.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <NavButton onClick={() => setShowAll(s => !s)} active={showAll}>
            {showAll ? `◉ Showing all ${rooms.length} rooms` : `○ Showing ${visibleRooms.length} booked rooms`}
          </NavButton>
          <NavButton onClick={() => setStartOffset(s => s - 7)}>← Prev week</NavButton>
          <NavButton onClick={() => setStartOffset(-2)}>Today</NavButton>
          <NavButton onClick={() => setStartOffset(s => s + 7)}>Next week →</NavButton>
        </div>
      </div>

      {/* The grid */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 900 }}>

          {/* Day headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `80px repeat(${DAYS_VISIBLE}, 1fr)`,
            borderBottom: '1px solid var(--border)',
            background: '#f8fafc',
          }}>
            <div style={{
              padding: 10, fontSize: 11, fontWeight: 600,
              color: 'var(--muted)', textTransform: 'uppercase',
              letterSpacing: '0.5px', display: 'flex', alignItems: 'center',
            }}>
              Room
            </div>
            {days.map((d, i) => {
              const isToday = fmt(d) === todayStr
              const isWeekend = d.getDay() === 0 || d.getDay() === 6
              return (
                <div
                  key={i}
                  style={{
                    padding: '8px 2px',
                    textAlign: 'center',
                    fontSize: 10, fontWeight: 600,
                    color: isToday ? 'var(--accent)' : isWeekend ? 'var(--muted)' : 'var(--text)',
                    background: isToday ? '#f0fdf4' : 'transparent',
                    borderLeft: '1px solid var(--border)',
                  }}
                >
                  <div>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{d.getDate()}</div>
                </div>
              )
            })}
          </div>

          {/* Room rows */}
          {visibleRooms.map(room => {
            const roomBookings = visibleBookings.filter(b => b.room_id === room.id)

            return (
              <div
                key={room.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `80px repeat(${DAYS_VISIBLE}, 1fr)`,
                  borderBottom: '1px solid var(--border)',
                  height: 42,
                  position: 'relative',
                }}
              >
                {/* Room label */}
                <div style={{
                  padding: '0 10px',
                  fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center',
                  background: '#f8fafc',
                  borderRight: '1px solid var(--border)',
                }}>
                  <div>
                    <div>{room.number}</div>
                    <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 400 }}>
                      Fl.{room.floor}
                    </div>
                  </div>
                </div>

                {/* Day cells (empty grid) */}
                {days.map((d, i) => {
                  const isToday = fmt(d) === todayStr
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6
                  return (
                    <div
                      key={i}
                      style={{
                        borderLeft: '1px solid var(--border)',
                        background: isToday
                          ? 'rgba(240,253,244,0.4)'
                          : isWeekend ? '#fafafa' : 'transparent',
                      }}
                    />
                  )
                })}

                {/* Booking bars (absolute positioned on top of grid) */}
                {roomBookings.map((b, bi) => {
                  const ci = parseDate(b.check_in)
                  const co = parseDate(b.check_out)
                  const startIdx = Math.max(0, Math.round((ci - firstDay) / 86400000))
                  const endIdx = Math.min(DAYS_VISIBLE, Math.round((co - firstDay) / 86400000))
                  if (endIdx <= 0 || startIdx >= DAYS_VISIBLE) return null

                  const widthCols = endIdx - startIdx
                  const statusColor = STATUS_COLORS[b.status] || STATUS_COLORS.confirmed
                  const color = statusColor.bg
                  const guestName = b.guest?.name?.split(' ')[0] || 'Guest'

                  return (
                    <div
                      key={b.id}
                      title={`${b.guest?.name || 'Guest'} · ${b.check_in} → ${b.check_out}`}
                      style={{
                        position: 'absolute',
                        top: 5, height: 32,
                        left: `calc(80px + (100% - 80px) * ${startIdx} / ${DAYS_VISIBLE})`,
                        width: `calc((100% - 80px) * ${widthCols} / ${DAYS_VISIBLE} - 2px)`,
                        background: color,
                        borderRadius: 4,
                        display: 'flex', alignItems: 'center',
                        padding: '0 8px',
                        fontSize: 11, fontWeight: 600, color: '#fff',
                        overflow: 'hidden', whiteSpace: 'nowrap',
                        boxSizing: 'border-box',
                      }}
                    >
                      {guestName}
                    </div>
                  )
                })}
              </div>
            )
          })}

          {visibleRooms.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              {showAll
                ? 'No rooms to display'
                : 'No bookings in this period — click "Show all rooms" to see empty rooms'}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        padding: '12px 18px',
        borderTop: '1px solid var(--border)',
        display: 'flex', gap: 18, flexWrap: 'wrap',
        fontSize: 11, color: 'var(--muted)',
      }}>
        <LegendDot color="#3b82f6" label="Confirmed" />
        <LegendDot color="#10b981" label="Checked In" />
        <LegendDot color="#94a3b8" label="Checked Out" />
      </div>
    </div>
  )
}

function NavButton({ onClick, children, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px', fontSize: 12, fontWeight: 500,
        background: active ? 'var(--accent)' : '#f1f5f9',
        color: active ? '#fff' : 'var(--text)',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 6,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 14, height: 10, borderRadius: 3,
        background: color,
      }} />
      {label}
    </div>
  )
}