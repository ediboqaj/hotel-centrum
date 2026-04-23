import { useState } from 'react'
import { useRooms } from '../hooks/useRooms'
import { useAuth } from '../context/AuthContext'
import Badge from '../components/Badge'

const STATUS_CONFIG = [
  { key: 'all',          label: 'Të gjitha',  color: '#64748b' },
  { key: 'clean',        label: 'E pastër',   color: '#15803d' },
  { key: 'dirty',        label: 'E Pa pastruar', color: '#b91c1c' },
]

const ROOM_BG_COLORS = {
  occupied:      { bg: '#dbeafe', border: '#bfdbfe' },
  clean:         { bg: '#dcfce7', border: '#bbf7d0' },
  dirty:         { bg: '#fef3c7', border: '#fde68a' },
  maintenance:   { bg: '#fee2e2', border: '#fecaca' },
  'in-progress': { bg: '#ede9fe', border: '#ddd6fe' },
  vacant:        { bg: '#f8fafc', border: '#e2e8f0' },
}

const ALL_STATUSES = ['vacant', 'occupied', 'clean', 'dirty', 'in-progress', 'maintenance']

const BUILDING_NAMES = {
  vjeter: 'Hoteli Vjetër',
  ri: 'Hoteli i Ri',
}

export default function Dashboard() {
  const { rooms, loading, error, updateRoomStatus } = useRooms()
  const { staff } = useAuth()
  const [filter, setFilter] = useState('all')
  const [selectedRoom, setSelectedRoom] = useState(null)

  const canEdit = ['admin', 'manager', 'reception'].includes(staff?.role)

  if (loading) return <div style={{ color: 'var(--muted)' }}>Duke u ngarkuar...</div>

  if (error) return (
    <div style={{
      background: '#fee2e2', color: '#b91c1c',
      padding: 12, borderRadius: 8, fontSize: 13,
    }}>
      Gabim: {error}
    </div>
  )

  // Count by status
  const counts = { all: rooms.length }
  ALL_STATUSES.forEach(s => {
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

  const handleStatusChange = async (roomId, newStatus) => {
    const ok = await updateRoomStatus(roomId, newStatus)
    if (ok) setSelectedRoom(null)
  }

  return (
    <div>
      {/* Stats grid */}
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
            {/* Building header — only show if more than 1 building visible */}
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
                      const isSelected = selectedRoom === room.id

                      return (
                        <div
                          key={room.id}
                          onClick={() => canEdit && setSelectedRoom(isSelected ? null : room.id)}
                          style={{
                            background: colors.bg,
                            border: `2px solid ${isSelected ? 'var(--accent)' : colors.border}`,
                            borderRadius: 8, padding: 12,
                            cursor: canEdit ? 'pointer' : 'default',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
                            {room.number}
                          </div>
                          <div style={{ marginTop: 6 }}>
                            <Badge status={room.status} />
                          </div>

                          {isSelected && canEdit && (
                            <div style={{
                              marginTop: 10, display: 'flex',
                              flexWrap: 'wrap', gap: 4,
                            }}>
                              {ALL_STATUSES
                                .filter(s => s !== room.status)
                                .map(s => (
                                  <button
                                    key={s}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStatusChange(room.id, s)
                                    }}
                                    style={{
                                      fontSize: 10, padding: '3px 7px',
                                      borderRadius: 4, fontWeight: 600,
                                      background: 'rgba(255,255,255,0.7)',
                                      color: 'var(--text)',
                                      border: '1px solid rgba(0,0,0,0.08)',
                                    }}
                                  >
                                    {s.replace('-', ' ')}
                                  </button>
                                ))}
                            </div>
                          )}
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