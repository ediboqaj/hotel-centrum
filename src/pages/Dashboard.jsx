import { useRooms } from '../hooks/useRooms'

const STATUS_CONFIG = [
  { key: 'all',    label: 'Të gjitha',     color: '#64748b' },
  { key: 'clean',  label: 'E pastër',      color: '#15803d' },
  { key: 'dirty',  label: 'E Pa pastruar', color: '#b91c1c' },
]

const ROOM_BG_COLORS = {
  occupied:      { bg: '#dbeafe', border: '#bfdbfe' },
  clean:         { bg: '#dcfce7', border: '#bbf7d0' },
  dirty:         { bg: '#fee2e2', border: '#fecaca' },
  maintenance:   { bg: '#fee2e2', border: '#fecaca' },
  'in-progress': { bg: '#ede9fe', border: '#ddd6fe' },
  vacant:        { bg: '#f8fafc', border: '#e2e8f0' },
}

const STATUS_LABELS = {
  occupied:      'E zënë',
  clean:         'E pastër',
  dirty:         'E Pa pastruar',
  maintenance:   'Mirëmbajtje',
  'in-progress': 'Në proces',
  vacant:        'E lirë',
}

const STATUS_TEXT_COLORS = {
  occupied:      '#1d4ed8',
  clean:         '#15803d',
  dirty:         '#b91c1c',
  maintenance:   '#b91c1c',
  'in-progress': '#4338ca',
  vacant:        '#64748b',
}

const COUNT_STATUSES = ['vacant', 'occupied', 'clean', 'dirty', 'in-progress', 'maintenance']

const BUILDING_NAMES = {
  vjeter: 'Hoteli Vjetër',
  ri: 'Hoteli i Ri',
}

export default function Dashboard() {
  const { rooms, loading, error } = useRooms()
  // Filter state stays local — only used for the 3 stat cards as a quick scan
  // No mutation of rooms from this page (read-only)
  const [filter, setFilter] = useState('all')

  if (loading) return <div style={{ color: 'var(--muted)' }}>Duke u ngarkuar...</div>

  if (error) return (
    <div style={{
      background: '#fee2e2', color: '#b91c1c',
      padding: 12, borderRadius: 8, fontSize: 13,
    }}>
      Gabim: {error}
    </div>
  )

  // Counts
  const counts = { all: rooms.length }
  COUNT_STATUSES.forEach(s => {
    counts[s] = rooms.filter(r => r.status === s).length
  })

  // Apply filter
  const filtered = filter === 'all' ? rooms : rooms.filter(r => r.status === filter)

  // Group by building → floor
  const buildings = {}
  filtered.forEach(r => {
    const bldg = r.building || 'unknown'
    if (!buildings[bldg]) buildings[bldg] = {}
    if (!buildings[bldg][r.floor]) buildings[bldg][r.floor] = []
    buildings[bldg][r.floor].push(r)
  })

  const buildingOrder = ['vjeter', 'ri']
  const visibleBuildings = buildingOrder.filter(b => buildings[b])

  return (
    <div>
      {/* Stats grid (clickable to filter) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        {STATUS_CONFIG.map(({ key, label, color }) => (
          <div
            key={key}
            onClick={() => setFilter(key)}
            style={{
              background: 'var(--surface)',
              border: `1px solid ${filter === key ? color : 'var(--border)'}`,
              boxShadow: filter === key ? `0 0 0 2px ${color}33` : 'none',
              borderRadius: 10, padding: 16, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 4,
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color }}>
              {counts[key] || 0}
            </div>
            <div style={{
              fontSize: 11, color: 'var(--muted)', fontWeight: 500,
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 60, color: 'var(--muted)',
          background: 'var(--surface)', borderRadius: 10,
          border: '1px solid var(--border)',
        }}>
          Asnjë dhomë me këtë status
        </div>
      )}

      {/* Buildings → Floors */}
      {visibleBuildings.map(building => {
        const floorMap = buildings[building]
        const floorNumbers = Object.keys(floorMap).map(Number).sort()
        const totalRooms = Object.values(floorMap).reduce((sum, arr) => sum + arr.length, 0)

        return (
          <div key={building} style={{ marginBottom: 32 }}>
            {visibleBuildings.length > 1 && (
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: 10,
                marginBottom: 14,
                paddingBottom: 8,
                borderBottom: '2px solid var(--border)',
              }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>
                  {BUILDING_NAMES[building] || building}
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {totalRooms} {totalRooms === 1 ? 'dhomë' : 'dhoma'}
                </span>
              </div>
            )}

            {floorNumbers.map(floor => {
              const floorRooms = floorMap[floor]
              return (
                <div key={floor} style={{ marginBottom: 20 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                  }}>
                    <span style={{
                      fontWeight: 600, fontSize: 12, color: 'var(--muted)',
                    }}>
                      Kati {floor}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {floorRooms.length} {floorRooms.length === 1 ? 'dhomë' : 'dhoma'}
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: 10,
                  }}>
                    {floorRooms.map(room => {
                      const colors = ROOM_BG_COLORS[room.status] || ROOM_BG_COLORS.vacant
                      const textColor = STATUS_TEXT_COLORS[room.status] || '#64748b'
                      const statusLabel = STATUS_LABELS[room.status] || room.status

                      return (
                        <div
                          key={room.id}
                          style={{
                            background: colors.bg,
                            border: `2px solid ${colors.border}`,
                            borderRadius: 8, padding: 12,
                            cursor: 'default',
                          }}
                        >
                          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
                            {room.number}
                          </div>
                          <div style={{
                            marginTop: 6,
                            fontSize: 11, fontWeight: 600,
                            color: textColor,
                          }}>
                            {statusLabel}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// React's useState — small import alias to keep import block clean
import { useState } from 'react'