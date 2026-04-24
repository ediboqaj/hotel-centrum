import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const BUILDING_NAMES = {
  vjeter: 'Hoteli Vjetër',
  ri: 'Hoteli i Ri',
}

const TABS = [
  { key: 'housekeeping', label: 'Pastrimi' },
  { key: 'minibar',      label: 'Minibar' },
]

const DAY_FILTERS = [
  { key: 'today',     label: 'Sot' },
  { key: 'yesterday', label: 'Dje' },
  { key: '7days',     label: '7 ditët' },
]

const STATUS_STYLES = {
  dirty:         { bg: '#fee2e2', color: '#b91c1c', label: 'E Pa pastruar' },
  'in-progress': { bg: '#ede9fe', color: '#4338ca', label: 'Në Proces' },
  cleaned:       { bg: '#dcfce7', color: '#15803d', label: 'E Pastruar' },
  inspected:     { bg: '#dbeafe', color: '#0369a1', label: 'E Inspektuar' },
}

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const time = d.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })
  const dateStr = d.toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' })
  if (d.toDateString() === today.toDateString()) return `Sot · ${time}`
  if (d.toDateString() === yesterday.toDateString()) return `Dje · ${time}`
  return `${dateStr} · ${time}`
}

function cleaningTypeLabel(notes) {
  if (notes === 'komplet') return 'Komplet dhoma'
  if (notes === 'pastrim') return 'Pastrim'
  return null
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function applyDayFilter(items, dayFilter, dateField) {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const yesterdayStart = startOfDay(new Date(now.getTime() - 86400000))
  const yesterdayEnd = endOfDay(new Date(now.getTime() - 86400000))

  return items.filter(item => {
    const d = new Date(item[dateField])
    if (dayFilter === 'today')     return d >= todayStart && d <= todayEnd
    if (dayFilter === 'yesterday') return d >= yesterdayStart && d <= yesterdayEnd
    return true // '7days' — show all (already fetched with 7-day limit)
  })
}

export default function Reports() {
  const [tab, setTab] = useState('housekeeping')
  const [dayFilter, setDayFilter] = useState('today')
  const [hkLogs, setHkLogs] = useState([])
  const [minibarLogs, setMinibarLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const since = sevenDaysAgo.toISOString()

    const [hkResult, mbResult] = await Promise.all([
      supabase
        .from('housekeeping_logs')
        .select('*, room:rooms(number, floor, building), cleaner:staff(name, role)')
        .gte('logged_at', since)
        .order('logged_at', { ascending: false }),
      supabase
        .from('minibar_consumption')
        .select('*, room:rooms(number, floor, building), product:minibar_products(name), reporter:staff!recorded_by(name)')
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: false }),
    ])

    if (hkResult.error || mbResult.error) {
      setError((hkResult.error || mbResult.error).message)
    } else {
      setHkLogs(hkResult.data || [])
      setMinibarLogs(mbResult.data || [])
    }
    setLoading(false)
  }

  if (loading) return <div style={{ color: 'var(--muted)' }}>Duke u ngarkuar...</div>
  if (error) return (
    <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 8 }}>
      Gabim: {error}
    </div>
  )

  // Apply day filter to both datasets
  const filteredHk = applyDayFilter(hkLogs, dayFilter, 'logged_at')
  const filteredMb = applyDayFilter(minibarLogs, dayFilter, 'recorded_at')

  return (
    <div>

      {/* Day filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {DAY_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setDayFilter(f.key)}
            style={{
              padding: '6px 16px', fontSize: 12, fontWeight: 600,
              background: dayFilter === f.key ? 'var(--accent)' : 'var(--surface)',
              color: dayFilter === f.key ? '#fff' : 'var(--muted)',
              border: `1px solid ${dayFilter === f.key ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 20, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
        <span style={{
          fontSize: 11, color: 'var(--muted)',
          display: 'flex', alignItems: 'center', marginLeft: 4,
        }}>
          {filteredHk.length + filteredMb.length} aktivitete
        </span>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 2, background: '#f1f5f9',
        padding: 3, borderRadius: 8, marginBottom: 16,
        maxWidth: 320,
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '7px 14px', borderRadius: 6,
              fontSize: 13, fontWeight: 500,
              background: tab === t.key ? '#fff' : 'transparent',
              color: tab === t.key ? 'var(--text)' : 'var(--muted)',
              boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center',
              justifyContent: 'center', gap: 6,
            }}
          >
            {t.label}
            <span style={{
              background: tab === t.key ? 'var(--accent)' : '#e2e8f0',
              color: tab === t.key ? '#fff' : 'var(--muted)',
              padding: '1px 7px', borderRadius: 10,
              fontSize: 10, fontWeight: 700,
            }}>
              {t.key === 'housekeeping' ? filteredHk.length : filteredMb.length}
            </span>
          </button>
        ))}
      </div>

      {/* ── HOUSEKEEPING TAB ── */}
      {tab === 'housekeeping' && (
        <>
          {filteredHk.length === 0 && (
            <EmptyState text={
              dayFilter === 'today' ? 'Asnjë aktivitet pastrimi sot' :
              dayFilter === 'yesterday' ? 'Asnjë aktivitet pastrimi dje' :
              'Asnjë aktivitet pastrimi në 7 ditët e fundit'
            } />
          )}

          {filteredHk.length > 0 && (
            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ minWidth: 580 }}>

                {/* Header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 1fr 130px 110px 170px',
                  padding: '8px 16px',
                  background: '#f8fafc',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 10, fontWeight: 700,
                  color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  gap: 8,
                }}>
                  <span>Dhoma</span>
                  <span>Hoteli</span>
                  <span>Statusi</span>
                  <span>Lloji</span>
                  <span>Nga · Koha</span>
                </div>

                {/* Rows */}
                {filteredHk.map(log => {
                  const s = STATUS_STYLES[log.status] ||
                    { bg: '#f1f5f9', color: '#64748b', label: log.status }
                  const typeLabel = cleaningTypeLabel(log.notes)
                  return (
                    <div
                      key={log.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '70px 1fr 130px 110px 170px',
                        padding: '11px 16px',
                        borderBottom: '1px solid var(--border)',
                        alignItems: 'center',
                        gap: 8, fontSize: 13,
                        background: 'var(--surface)',
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{log.room?.number || '—'}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {BUILDING_NAMES[log.room?.building] || '—'}
                      </span>
                      <span>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px', borderRadius: 20,
                          fontSize: 11, fontWeight: 600,
                          background: s.bg, color: s.color,
                          whiteSpace: 'nowrap',
                        }}>
                          {s.label}
                        </span>
                      </span>
                      <span style={{
                        fontSize: 11, color: 'var(--muted)', fontStyle: 'italic',
                      }}>
                        {typeLabel || '—'}
                      </span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>
                          {log.cleaner?.name || '—'}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                          {formatDateTime(log.logged_at)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── MINIBAR TAB ── */}
      {tab === 'minibar' && (
        <>
          {filteredMb.length === 0 && (
            <EmptyState text={
              dayFilter === 'today' ? 'Asnjë aktivitet minibar-i sot' :
              dayFilter === 'yesterday' ? 'Asnjë aktivitet minibar-i dje' :
              'Asnjë aktivitet minibar-i në 7 ditët e fundit'
            } />
          )}

          {filteredMb.length > 0 && (
            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ minWidth: 640 }}>

                {/* Header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 1fr 1fr 90px 110px 160px',
                  padding: '8px 16px',
                  background: '#f8fafc',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 10, fontWeight: 700,
                  color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  gap: 8,
                }}>
                  <span>Dhoma</span>
                  <span>Hoteli</span>
                  <span>Produkti</span>
                  <span>Statusi</span>
                  <span>Nga</span>
                  <span>Koha</span>
                </div>

                {/* Rows */}
                {filteredMb.map(log => (
                  <div
                    key={log.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '70px 1fr 1fr 90px 110px 160px',
                      padding: '11px 16px',
                      borderBottom: '1px solid var(--border)',
                      alignItems: 'center',
                      gap: 8, fontSize: 13,
                      background: 'var(--surface)',
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{log.room?.number || '—'}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {BUILDING_NAMES[log.room?.building] || '—'}
                    </span>
                    <span style={{ fontWeight: 500 }}>
                      {log.product?.name || '—'}
                      {log.quantity > 1 && (
                        <span style={{ color: 'var(--muted)', marginLeft: 4 }}>
                          ×{log.quantity}
                        </span>
                      )}
                    </span>
                    <span>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px', borderRadius: 20,
                        fontSize: 11, fontWeight: 600,
                        background: log.report_status === 'acknowledged' ? '#dcfce7' : '#fef3c7',
                        color: log.report_status === 'acknowledged' ? '#15803d' : '#b45309',
                        whiteSpace: 'nowrap',
                      }}>
                        {log.report_status === 'acknowledged' ? 'Kryer' : 'Në pritje'}
                      </span>
                    </span>
                    <span style={{ fontSize: 12 }}>
                      {log.reporter?.name || '—'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {formatDateTime(log.recorded_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div style={{
      padding: 60, textAlign: 'center', color: 'var(--muted)',
      background: 'var(--surface)', borderRadius: 10,
      border: '1px solid var(--border)',
    }}>
      {text}
    </div>
  )
}