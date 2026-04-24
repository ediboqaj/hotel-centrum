import { useState } from 'react'
import { useHousekeeping } from '../hooks/useHousekeeping'
import { useAuth } from '../context/AuthContext'

const HK_STATUSES = [
  { key: 'dirty',       label: 'E Pa pastruar', color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
  { key: 'in-progress', label: 'Në proces',     color: '#4338ca', bg: '#ede9fe', border: '#ddd6fe' },
  { key: 'cleaned',     label: 'E Pastruar',    color: '#15803d', bg: '#dcfce7', border: '#bbf7d0' },
  { key: 'inspected',   label: 'E Inspektuar',  color: '#0369a1', bg: '#dbeafe', border: '#bfdbfe' },
]

const NONE_STYLE = { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' }

const BUILDING_NAMES = {
  vjeter: 'Hoteli Vjetër',
  ri: 'Hoteli i Ri',
}

const CLEANING_TYPES = [
  { key: 'komplet', label: 'Komplet dhoma' },
  { key: 'pastrim', label: 'Pastrim' },
]

const RECEPTION_ACTIONS = {
  dirty: [], 'in-progress': [], cleaned: [], inspected: [], none: [],
}

const CLEANER_ACTIONS = {
  dirty:         [{ key: 'in-progress', label: '▶ Fillo', needsType: false }],
  'in-progress': [{ key: 'cleaned',     label: '✓ E Pastruar', needsType: false }],
  cleaned: [], inspected: [], none: [],
}

function formatTime(isoString) {
  if (!isoString) return null
  const d = new Date(isoString)
  const now = new Date()
  const diffMin = Math.round((now - d) / 60000)
  if (diffMin < 1) return 'tani'
  if (diffMin < 60) return `${diffMin}m`
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}o`
  return d.toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' })
}

function statusLabel(key) {
  if (key === 'none') return 'Pa regjistrim'
  return HK_STATUSES.find(s => s.key === key)?.label || key
}

function cleaningTypeLabel(notes) {
  if (!notes) return null
  if (notes === 'komplet') return 'Komplet dhoma'
  if (notes === 'pastrim') return 'Pastrim'
  return notes
}

export default function Housekeeping() {
  const { rooms, latestLogs, loading, error, logStatus } = useHousekeeping()
  const { staff } = useAuth()
  const [filter, setFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [collapsedFloors, setCollapsedFloors] = useState({})
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [actionInProgress, setActionInProgress] = useState(null)

  const isCleaner = staff?.role === 'cleaner'
  const isReception = staff?.role === 'reception'
  const canManage = ['admin', 'manager', 'reception', 'cleaner'].includes(staff?.role)

  if (loading) return <div style={{ color: 'var(--muted)' }}>Duke u ngarkuar...</div>
  if (error) return (
    <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 8 }}>
      Gabim: {error}
    </div>
  )

  const roomsWithHk = rooms.map(r => {
    const log = latestLogs[r.id]
    return { ...r, hkStatus: log?.status || 'none', lastLog: log }
  })

  const counts = { all: rooms.length }
  HK_STATUSES.forEach(s => {
    counts[s.key] = roomsWithHk.filter(r => r.hkStatus === s.key).length
  })

  const typeCounts = {
    komplet: roomsWithHk.filter(r => r.lastLog?.notes === 'komplet').length,
    pastrim: roomsWithHk.filter(r => r.lastLog?.notes === 'pastrim').length,
  }

  const afterStatusFilter = filter === 'all'
    ? roomsWithHk
    : roomsWithHk.filter(r => r.hkStatus === filter)

  const filtered = typeFilter === 'all'
    ? afterStatusFilter
    : afterStatusFilter.filter(r => r.lastLog?.notes === typeFilter)

  const buildings = {}
  filtered.forEach(r => {
    const bldg = r.building || 'unknown'
    if (!buildings[bldg]) buildings[bldg] = {}
    if (!buildings[bldg][r.floor]) buildings[bldg][r.floor] = []
    buildings[bldg][r.floor].push(r)
  })
  const buildingOrder = ['vjeter', 'ri']
  const visibleBuildings = buildingOrder.filter(b => buildings[b])

  const handleActionTap = (action) => {
    if (action.needsType) {
      setPendingAction(action)
    } else {
      executeAction(action.key, null)
    }
  }

  const executeAction = async (statusKey, cleaningType) => {
    if (!selectedRoom) return
    setActionInProgress(selectedRoom)
    setPendingAction(null)
    const typeToLog = cleaningType || selected?.lastLog?.notes || null
    await logStatus(selectedRoom, statusKey, typeToLog)
    setActionInProgress(null)
    setSelectedRoom(null)
  }

  const toggleFloor = (building, floor) => {
    const key = `${building}-${floor}`
    setCollapsedFloors(c => ({ ...c, [key]: !c[key] }))
  }

  const selected = roomsWithHk.find(r => r.id === selectedRoom)
  const selectedStyle = selected
    ? HK_STATUSES.find(s => s.key === selected.hkStatus) || NONE_STYLE
    : null

  const getActions = (hkStatus) => {
    if (isCleaner) return CLEANER_ACTIONS[hkStatus] || []
    if (isReception) return RECEPTION_ACTIONS[hkStatus] || []
    return CLEANER_ACTIONS[hkStatus] || []
  }

  const cleanerIsBlocked = isCleaner && selected &&
    !['dirty', 'in-progress'].includes(selected.hkStatus)

  const getReceptionDirtyButton = (hkStatus) => {
    if (!isReception) return null
    if (hkStatus === 'none' || hkStatus === 'cleaned' || hkStatus === 'inspected') {
      return { key: 'dirty', label: 'E Pa pastruar', needsType: true }
    }
    return null
  }

  return (
    <div>
      {/* Status filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <FilterChip
          label="Të gjitha" count={counts.all} color="#64748b"
          active={filter === 'all'} onClick={() => setFilter('all')}
        />
        {HK_STATUSES
          .filter(s => s.key !== 'inspected')
          .map(s => (
            <FilterChip
              key={s.key} label={s.label} count={counts[s.key]} color={s.color}
              active={filter === s.key}
              onClick={() => setFilter(filter === s.key ? 'all' : s.key)}
            />
          ))}
      </div>

      {/* Type filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <FilterChip
          label="Komplet dhoma" count={typeCounts.komplet} color="#0f172a"
          active={typeFilter === 'komplet'}
          onClick={() => setTypeFilter(typeFilter === 'komplet' ? 'all' : 'komplet')}
        />
        <FilterChip
          label="Pastrim" count={typeCounts.pastrim} color="#475569"
          active={typeFilter === 'pastrim'}
          onClick={() => setTypeFilter(typeFilter === 'pastrim' ? 'all' : 'pastrim')}
        />
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{
          padding: 40, textAlign: 'center', color: 'var(--muted)',
          background: 'var(--surface)', borderRadius: 10,
          border: '1px solid var(--border)',
        }}>
          Asnjë dhomë me këtë status
        </div>
      )}

      {/* Buildings → Floors → Rooms */}
      {visibleBuildings.map(building => {
        const floorMap = buildings[building]
        const floorNumbers = Object.keys(floorMap).map(Number).sort()
        const totalRooms = Object.values(floorMap).reduce((sum, arr) => sum + arr.length, 0)

        return (
          <div key={building} style={{ marginBottom: 28 }}>
            {visibleBuildings.length > 1 && (
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: 10,
                marginBottom: 12, paddingBottom: 6,
                borderBottom: '2px solid var(--border)',
              }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>
                  {BUILDING_NAMES[building] || building}
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {totalRooms} {totalRooms === 1 ? 'dhomë' : 'dhoma'}
                </span>
              </div>
            )}

            {floorNumbers.map(floor => {
              const floorRooms = floorMap[floor]
              const isCollapsed = collapsedFloors[`${building}-${floor}`]

              return (
                <div key={floor} style={{ marginBottom: 18 }}>
                  <div
                    onClick={() => toggleFloor(building, floor)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      marginBottom: 10, cursor: 'pointer', padding: '4px 0',
                    }}
                  >
                    <span style={{ fontSize: 11, color: 'var(--muted)', width: 14 }}>
                      {isCollapsed ? '▶' : '▼'}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>Kati {floor}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {floorRooms.length} {floorRooms.length === 1 ? 'dhomë' : 'dhoma'}
                    </span>
                  </div>

                  {!isCollapsed && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                      gap: 8,
                    }}>
                      {floorRooms.map(room => {
                        const style = HK_STATUSES.find(s => s.key === room.hkStatus) || NONE_STYLE
                        const isSelected = selectedRoom === room.id
                        const timeAgo = formatTime(room.lastLog?.logged_at)
                        const typeLabel = cleaningTypeLabel(room.lastLog?.notes)

                        return (
                          <div
                            key={room.id}
                            onClick={() => canManage && setSelectedRoom(isSelected ? null : room.id)}
                            style={{
                              background: style.bg,
                              border: `2px solid ${isSelected ? 'var(--accent)' : style.border}`,
                              borderRadius: 8, padding: 10,
                              cursor: canManage ? 'pointer' : 'default',
                              transition: 'all 0.15s',
                            }}
                          >
                            <div style={{
                              fontSize: 17, fontWeight: 700,
                              color: style.color, lineHeight: 1.1,
                            }}>
                              {room.number}
                            </div>
                            <div style={{
                              fontSize: 9, fontWeight: 600,
                              color: style.color, opacity: 0.75,
                              textTransform: 'uppercase', letterSpacing: '0.4px',
                              marginTop: 3,
                            }}>
                              {statusLabel(room.hkStatus)}
                            </div>
                            {typeLabel && (
                              <div style={{
                                fontSize: 9, color: style.color, opacity: 0.6,
                                marginTop: 2, fontStyle: 'italic',
                              }}>
                                {typeLabel}
                              </div>
                            )}
                            {timeAgo && (
                              <div style={{
                                fontSize: 10, color: style.color, opacity: 0.7,
                                marginTop: 2,
                              }}>
                                {timeAgo}
                                {room.lastLog?.cleaner?.name
                                  && ` · ${room.lastLog.cleaner.name.split(' ')[0]}`}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {/* ── Bottom action bar ── */}
      {selected && canManage && (
        <div style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          background: 'var(--surface)',
          borderTop: `3px solid ${selectedStyle.color}`,
          boxShadow: '0 -8px 30px rgba(0,0,0,0.12)',
          padding: '14px 20px',
          paddingBottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
          zIndex: 200,
        }}>

          {/* Room info */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            marginBottom: 10, flexWrap: 'wrap',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 10,
              background: selectedStyle.bg,
              border: `2px solid ${selectedStyle.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, color: selectedStyle.color,
              flexShrink: 0,
            }}>
              {selected.number}
            </div>

            <div style={{ flex: 1, minWidth: 100 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                Dhoma {selected.number}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {statusLabel(selected.hkStatus)}
                {selected.lastLog?.notes && ` · ${cleaningTypeLabel(selected.lastLog.notes)}`}
                {selected.lastLog && ` · ${formatTime(selected.lastLog.logged_at)}`}
                {selected.lastLog?.cleaner?.name && ` · ${selected.lastLog.cleaner.name}`}
              </div>
            </div>

            {!pendingAction && (
              <button
                onClick={() => { setSelectedRoom(null); setPendingAction(null) }}
                style={{
                  padding: '9px 12px', fontSize: 18, color: 'var(--muted)',
                  background: 'transparent', cursor: 'pointer',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Type picker */}
          {pendingAction && (
            <div>
              <div style={{
                fontSize: 12, fontWeight: 600, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                marginBottom: 10,
              }}>
                Zgjidh llojin e pastrimit:
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CLEANING_TYPES.map(type => (
                  <button
                    key={type.key}
                    onClick={() => executeAction(pendingAction.key, type.key)}
                    disabled={actionInProgress === selectedRoom}
                    style={{
                      padding: '12px 20px', fontSize: 14, fontWeight: 700,
                      background: type.key === 'komplet' ? '#0f172a' : '#f1f5f9',
                      color: type.key === 'komplet' ? '#fff' : 'var(--text)',
                      border: `2px solid ${type.key === 'komplet' ? '#0f172a' : 'var(--border)'}`,
                      borderRadius: 10, cursor: 'pointer',
                      flex: 1, minWidth: 120,
                      opacity: actionInProgress === selectedRoom ? 0.5 : 1,
                    }}
                  >
                    {type.label}
                  </button>
                ))}
                <button
                  onClick={() => setPendingAction(null)}
                  style={{
                    padding: '12px 16px', fontSize: 13,
                    background: 'transparent', color: 'var(--muted)',
                    border: '1px solid var(--border)', borderRadius: 10,
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!pendingAction && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>

              {/* Cleaner blocked message */}
              {cleanerIsBlocked && (
                <div style={{
                  fontSize: 12, color: 'var(--muted)',
                  padding: '8px 12px',
                  background: '#f8fafc',
                  border: '1px solid var(--border)',
                  borderRadius: 8, lineHeight: 1.5,
                }}>
                  Recepsioni duhet ta shënojë dhomën si{' '}
                  <strong>E Pa pastruar</strong> para se të filloni pastrimin.
                </div>
              )}

              {/* Reception E Pa pastruar button */}
              {isReception && getReceptionDirtyButton(selected.hkStatus) && (
                <button
                  onClick={() => handleActionTap(getReceptionDirtyButton(selected.hkStatus))}
                  disabled={actionInProgress === selectedRoom}
                  style={{
                    padding: '9px 16px', fontSize: 13, fontWeight: 600,
                    background: '#fee2e2', color: '#b91c1c',
                    border: '1px solid #fecaca',
                    borderRadius: 8, cursor: 'pointer',
                    opacity: actionInProgress === selectedRoom ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  E Pa pastruar
                </button>
              )}

              {/* Regular action buttons */}
              {!cleanerIsBlocked && getActions(selected.hkStatus).map(action => {
                const actStyle = HK_STATUSES.find(s => s.key === action.key) || NONE_STYLE
                return (
                  <button
                    key={action.key}
                    onClick={() => handleActionTap(action)}
                    disabled={actionInProgress === selectedRoom}
                    style={{
                      padding: '9px 16px', fontSize: 13, fontWeight: 600,
                      background: actStyle.bg, color: actStyle.color,
                      border: `1px solid ${actStyle.border}`,
                      borderRadius: 8, cursor: 'pointer',
                      opacity: actionInProgress === selectedRoom ? 0.5 : 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {action.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {selected && <div style={{ height: 180 }} />}
    </div>
  )
}

function FilterChip({ label, count, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 14px', fontSize: 12, fontWeight: 600,
        background: active ? color : 'var(--surface)',
        color: active ? '#fff' : color,
        border: `1px solid ${active ? color : 'var(--border)'}`,
        borderRadius: 20,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      {label}
      <span style={{
        background: active ? 'rgba(255,255,255,0.25)' : `${color}22`,
        color: active ? '#fff' : color,
        padding: '1px 7px', borderRadius: 10,
        fontSize: 11, fontWeight: 700,
      }}>
        {count}
      </span>
    </button>
  )
}