import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useMobile } from '../hooks/useMobile'
import Badge from '../components/Badge'

const TABS = [
  { key: 'arrivals',   label: 'Arrivals' },
  { key: 'departures', label: 'Departures' },
  { key: 'dirty',      label: 'Dirty Rooms' },
  { key: 'minibar',    label: 'Minibar Sales' },
  { key: 'cleaners',   label: 'Cleaner Activity' },
]

export default function Reports() {
  const isMobile = useMobile()
  const [tab, setTab] = useState('arrivals')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const [arrivals, setArrivals] = useState([])
  const [departures, setDepartures] = useState([])
  const [dirtyRooms, setDirtyRooms] = useState([])
  const [minibarRows, setMinibarRows] = useState([])
  const [cleanerLogs, setCleanerLogs] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { loadAll() }, [date])

  const loadAll = async () => {
    setLoading(true)
    try {
      // Arrivals: bookings with check_in === selected date, status confirmed or checked-in
      const { data: arr } = await supabase
        .from('bookings')
        .select('*, guest:guests(name, nationality), room:rooms(number, type, floor)')
        .eq('check_in', date)
        .in('status', ['confirmed', 'checked-in'])
        .order('check_in')

      // Departures: bookings with check_out === selected date, status checked-in or checked-out
      const { data: dep } = await supabase
        .from('bookings')
        .select('*, guest:guests(name), room:rooms(number, type)')
        .eq('check_out', date)
        .in('status', ['checked-in', 'checked-out'])
        .order('check_out')

      // Dirty rooms (real-time snapshot)
      const { data: dirty } = await supabase
        .from('rooms')
        .select('*')
        .in('status', ['dirty', 'in-progress'])
        .order('floor').order('number')

      // Minibar charges recorded on the selected date
      const startOfDay = `${date}T00:00:00`
      const endOfDay = `${date}T23:59:59`
      const { data: mb } = await supabase
        .from('minibar_consumption')
        .select(`
          *,
          product:minibar_products(name),
          booking:bookings(room:rooms(number), guest:guests(name))
        `)
        .gte('recorded_at', startOfDay)
        .lte('recorded_at', endOfDay)
        .order('recorded_at', { ascending: false })

      // Cleaner activity on selected date
      const { data: logs } = await supabase
        .from('housekeeping_logs')
        .select('*, cleaner:staff(name, role), room:rooms(number, floor)')
        .gte('logged_at', startOfDay)
        .lte('logged_at', endOfDay)
        .order('logged_at', { ascending: false })

      setArrivals(arr || [])
      setDepartures(dep || [])
      setDirtyRooms(dirty || [])
      setMinibarRows(mb || [])
      setCleanerLogs(logs || [])
      setError(null)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const tabCount = {
    arrivals: arrivals.length,
    departures: departures.length,
    dirty: dirtyRooms.length,
    minibar: minibarRows.length,
    cleaners: cleanerLogs.length,
  }

  const totalMinibar = minibarRows.reduce(
    (sum, r) => sum + r.quantity * Number(r.unit_price), 0
  )

  if (error) return (
    <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 8 }}>
      Error: {error}
    </div>
  )

  return (
    <div>
      {/* Top bar: date picker + tabs */}
      <div style={{
        display: 'flex', gap: 12,
        marginBottom: 16,
        alignItems: 'center', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
            Date:
          </span>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{
              padding: '7px 10px', fontSize: 13,
              border: '1px solid var(--border)', borderRadius: 7,
              background: 'var(--surface)',
            }}
          />
          <button
            onClick={() => setDate(new Date().toISOString().split('T')[0])}
            style={{
              padding: '7px 12px', fontSize: 12, fontWeight: 500,
              background: '#f1f5f9', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 7,
              cursor: 'pointer',
            }}
          >
            Today
          </button>
        </div>
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
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            {t.label}
            <span style={{
              background: tab === t.key ? 'var(--accent)' : '#e2e8f0',
              color: tab === t.key ? '#fff' : 'var(--muted)',
              padding: '1px 7px', borderRadius: 10,
              fontSize: 10, fontWeight: 700,
            }}>
              {tabCount[t.key]}
            </span>
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ color: 'var(--muted)', padding: 20 }}>Loading...</div>
      )}

      {!loading && (
        <>
          {tab === 'arrivals' && (
            <ReportCard title={`Arrivals on ${date}`} count={arrivals.length} empty="No arrivals on this date">
              <ReportTable
                isMobile={isMobile}
                columns={['Guest', 'Room', 'Type', 'Status', 'Paid', 'Notes']}
                rows={arrivals.map(b => ({
                  key: b.id,
                  cells: [
                    <GuestCell name={b.guest?.name} sub={b.guest?.nationality} />,
                    <strong>{b.room?.number}</strong>,
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{b.room?.type}</span>,
                    <Badge status={b.status} />,
                    <Badge status={b.paid ? 'paid' : 'unpaid'} />,
                    <NotesCell text={b.notes} />,
                  ],
                }))}
              />
            </ReportCard>
          )}

          {tab === 'departures' && (
            <ReportCard title={`Departures on ${date}`} count={departures.length} empty="No departures on this date">
              <ReportTable
                isMobile={isMobile}
                columns={['Guest', 'Room', 'Status', 'Paid', 'Stayed']}
                rows={departures.map(b => ({
                  key: b.id,
                  cells: [
                    <strong>{b.guest?.name}</strong>,
                    <strong>{b.room?.number}</strong>,
                    <Badge status={b.status} />,
                    <Badge status={b.paid ? 'paid' : 'unpaid'} />,
                    `${daysBetween(b.check_in, b.check_out)} nights`,
                  ],
                }))}
              />
            </ReportCard>
          )}

          {tab === 'dirty' && (
            <ReportCard
              title="Rooms needing attention (live)"
              count={dirtyRooms.length}
              empty="🎉 All rooms are clean"
            >
              <ReportTable
                isMobile={isMobile}
                columns={['Room', 'Floor', 'Type', 'Status']}
                rows={dirtyRooms.map(r => ({
                  key: r.id,
                  cells: [
                    <strong>{r.number}</strong>,
                    r.floor,
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{r.type}</span>,
                    <Badge status={r.status} />,
                  ],
                }))}
              />
            </ReportCard>
          )}

          {tab === 'minibar' && (
            <ReportCard
              title={`Minibar charges on ${date}`}
              count={minibarRows.length}
              empty="No minibar activity on this date"
              footer={minibarRows.length > 0 && (
                <div style={{
                  padding: '12px 16px',
                  background: '#f0fdf4',
                  borderTop: '1px solid var(--border)',
                  fontSize: 13, fontWeight: 600,
                  display: 'flex', justifyContent: 'space-between',
                }}>
                  <span>Total revenue</span>
                  <span style={{ color: 'var(--accent-dark)' }}>
                    €{totalMinibar.toFixed(2)}
                  </span>
                </div>
              )}
            >
              <ReportTable
                isMobile={isMobile}
                columns={['Room', 'Guest', 'Product', 'Qty', 'Total', 'Status']}
                rows={minibarRows.map(r => ({
                  key: r.id,
                  cells: [
                    <strong>{r.booking?.room?.number || '—'}</strong>,
                    r.booking?.guest?.name || '—',
                    r.product?.name || '—',
                    `${r.quantity}×`,
                    <strong>€{(r.quantity * Number(r.unit_price)).toFixed(2)}</strong>,
                    <Badge status={r.charged ? 'paid' : 'unpaid'}
                           text={r.charged ? 'On bill' : 'Pending'} />,
                  ],
                }))}
              />
            </ReportCard>
          )}

          {tab === 'cleaners' && (
            <ReportCard
              title={`Cleaner activity on ${date}`}
              count={cleanerLogs.length}
              empty="No housekeeping activity on this date"
            >
              <ReportTable
                isMobile={isMobile}
                columns={['Time', 'Room', 'Floor', 'Action', 'By']}
                rows={cleanerLogs.map(l => ({
                  key: l.id,
                  cells: [
                    formatTime(l.logged_at),
                    <strong>{l.room?.number || '—'}</strong>,
                    l.room?.floor || '—',
                    <Badge status={l.status} />,
                    l.cleaner?.name || '—',
                  ],
                }))}
              />
            </ReportCard>
          )}
        </>
      )}
    </div>
  )
}

// ── Helpers ──────────────────────────

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24))
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function ReportCard({ title, count, empty, children, footer }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          {count} {count === 1 ? 'item' : 'items'}
        </span>
      </div>
      {count === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
          {empty}
        </div>
      ) : children}
      {footer}
    </div>
  )
}

function ReportTable({ columns, rows, isMobile }) {
  if (isMobile) {
    // Mobile: stacked cards
    return (
      <div style={{ padding: 8 }}>
        {rows.map(row => (
          <div
            key={row.key}
            style={{
              background: '#f8fafc',
              borderRadius: 8,
              padding: 12,
              marginBottom: 8,
              display: 'flex', flexDirection: 'column', gap: 6,
            }}
          >
            {row.cells.map((cell, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', gap: 10,
                  fontSize: 12,
                }}
              >
                <span style={{ color: 'var(--muted)', fontSize: 11 }}>
                  {columns[i]}
                </span>
                <span style={{ textAlign: 'right' }}>{cell}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  // Desktop: table
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {columns.map((col, i) => (
              <th
                key={i}
                style={{
                  textAlign: 'left', padding: '10px 14px',
                  fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={row.key}
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              {row.cells.map((cell, i) => (
                <td key={i} style={{ padding: '11px 14px', fontSize: 13 }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GuestCell({ name, sub }) {
  return (
    <div>
      <div style={{ fontWeight: 600 }}>{name}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>}
    </div>
  )
}

function NotesCell({ text }) {
  if (!text) return <span style={{ color: 'var(--muted)' }}>—</span>
  return (
    <span style={{
      fontSize: 11, color: 'var(--muted)',
      maxWidth: 200, display: 'inline-block',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    }}>
      {text}
    </span>
  )
}