import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { useMobile } from '../hooks/useMobile'
import { ROLE_BADGE_COLORS } from '../config/navigation'

const ROLES = ['admin', 'manager', 'reception', 'cleaner']

export default function Staff() {
  const { staff: currentStaff } = useAuth()
  const isMobile = useMobile()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [roleFilter, setRoleFilter] = useState('all')
  const [showInactive, setShowInactive] = useState(false)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)

  const isAdmin = currentStaff?.role === 'admin'

  useEffect(() => {
    loadStaff()

    const suffix = Math.random().toString(36).slice(2, 9)
    const channel = supabase
      .channel(`staff-${suffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, loadStaff)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadStaff = async () => {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('role')
      .order('name')

    if (error) setError(error.message)
    else setStaff(data || [])
    setLoading(false)
  }

  const toggleActive = async (id, currentActive) => {
    const { error } = await supabase
      .from('staff')
      .update({ active: !currentActive })
      .eq('id', id)
    if (error) alert(error.message)
  }

  const changeRole = async (id, newRole) => {
    const { error } = await supabase
      .from('staff')
      .update({ role: newRole })
      .eq('id', id)
    if (error) alert(error.message)
    else setEditingId(null)
  }

  const updateField = async (id, field, value) => {
    const { error } = await supabase
      .from('staff')
      .update({ [field]: value })
      .eq('id', id)
    if (error) alert(error.message)
  }

  if (loading) return <div style={{ color: 'var(--muted)' }}>Loading staff...</div>
  if (error) return (
    <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 12, borderRadius: 8 }}>
      Error: {error}
    </div>
  )

  // Filter + search
  const filtered = staff.filter(s => {
    if (!showInactive && !s.active) return false
    if (roleFilter !== 'all' && s.role !== roleFilter) return false
    if (search) {
      const term = search.toLowerCase()
      if (!s.name.toLowerCase().includes(term) && !s.email.toLowerCase().includes(term)) {
        return false
      }
    }
    return true
  })

  // Counts by role (for filter buttons)
  const counts = { all: staff.filter(s => showInactive || s.active).length }
  ROLES.forEach(r => {
    counts[r] = staff.filter(s => s.role === r && (showInactive || s.active)).length
  })

  return (
    <div>
      {/* Info banner */}
      {isAdmin && (
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe',
          padding: '10px 14px', borderRadius: 8, marginBottom: 16,
          fontSize: 12, color: '#1e40af', lineHeight: 1.5,
        }}>
          ℹ To add new staff members, create them in Supabase Authentication first,
          then they'll appear here automatically. You can then assign their role and details.
        </div>
      )}

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          style={{
            flex: 1, minWidth: 180,
            padding: '8px 12px', fontSize: 13,
            border: '1px solid var(--border)', borderRadius: 7,
            background: 'var(--surface)',
          }}
        />
        <label style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 4px', fontSize: 12,
          color: 'var(--muted)', cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
          />
          Show inactive
        </label>
      </div>

      {/* Role filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        <RoleChip
          label="All" count={counts.all}
          active={roleFilter === 'all'}
          onClick={() => setRoleFilter('all')}
        />
        {ROLES.map(r => (
          <RoleChip
            key={r} label={r} count={counts[r] || 0}
            active={roleFilter === r}
            onClick={() => setRoleFilter(roleFilter === r ? 'all' : r)}
            role={r}
          />
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{
          padding: 40, textAlign: 'center', color: 'var(--muted)',
          background: 'var(--surface)', borderRadius: 10,
          border: '1px solid var(--border)',
        }}>
          No staff members match your filter
        </div>
      )}

      {/* Staff list */}
      {filtered.length > 0 && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10, overflow: 'hidden',
        }}>
          {filtered.map(s => (
            <StaffRow
              key={s.id}
              staff={s}
              isMobile={isMobile}
              canEdit={isAdmin}
              isEditing={editingId === s.id}
              onStartEdit={() => setEditingId(s.id)}
              onCancelEdit={() => setEditingId(null)}
              onToggleActive={() => toggleActive(s.id, s.active)}
              onChangeRole={(newRole) => changeRole(s.id, newRole)}
              onUpdateField={(field, value) => updateField(s.id, field, value)}
              isSelf={s.id === currentStaff?.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Staff Row ──────────────────────
function StaffRow({
  staff: s, isMobile, canEdit, isEditing,
  onStartEdit, onCancelEdit, onToggleActive, onChangeRole, onUpdateField,
  isSelf,
}) {
  const badge = ROLE_BADGE_COLORS[s.role] || ROLE_BADGE_COLORS.cleaner

  return (
    <div
      style={{
        padding: isMobile ? '14px 14px' : '14px 18px',
        borderBottom: '1px solid var(--border)',
        opacity: s.active ? 1 : 0.55,
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        flexWrap: isMobile ? 'wrap' : 'nowrap',
      }}>
        {/* Avatar circle */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: badge.bg.replace('0.2', '0.3'), color: badge.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, flexShrink: 0,
        }}>
          {s.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
        </div>

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 3, flexWrap: 'wrap',
          }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              {s.name}
            </span>
            {isSelf && (
              <span style={{
                fontSize: 10, color: 'var(--accent)',
                background: '#f0fdf4', padding: '1px 7px',
                borderRadius: 4, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                You
              </span>
            )}
            {!s.active && (
              <span style={{
                fontSize: 10, color: 'var(--muted)',
                background: '#f1f5f9', padding: '1px 7px',
                borderRadius: 4, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                Inactive
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 3 }}>
            {s.email}
          </div>
          {s.phone && (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              📞 {s.phone}
            </div>
          )}
          {s.notes && !isEditing && (
            <div style={{
              fontSize: 11, color: 'var(--muted)',
              marginTop: 4, fontStyle: 'italic',
            }}>
              {s.notes}
            </div>
          )}
        </div>

        {/* Role + actions */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          gap: 8, alignItems: 'flex-end',
          width: isMobile ? '100%' : 'auto',
        }}>
          {isEditing ? (
            <select
              value={s.role}
              onChange={e => onChangeRole(e.target.value)}
              style={{
                padding: '5px 8px', fontSize: 12, fontWeight: 600,
                border: '1px solid var(--border)', borderRadius: 6,
              }}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          ) : (
            <span style={{
              display: 'inline-block',
              padding: '3px 10px', borderRadius: 5,
              fontSize: 11, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.5px',
              background: badge.bg, color: badge.color,
            }}>
              {s.role}
            </span>
          )}

          {canEdit && (
            <div style={{ display: 'flex', gap: 6 }}>
              {isEditing ? (
                <button
                  onClick={onCancelEdit}
                  style={{
                    padding: '5px 10px', fontSize: 11,
                    background: '#f1f5f9', color: 'var(--text)',
                    border: '1px solid var(--border)', borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              ) : (
                <button
                  onClick={onStartEdit}
                  style={{
                    padding: '5px 10px', fontSize: 11,
                    background: '#f1f5f9', color: 'var(--text)',
                    border: '1px solid var(--border)', borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  Edit role
                </button>
              )}
              {!isSelf && (
                <button
                  onClick={onToggleActive}
                  style={{
                    padding: '5px 10px', fontSize: 11,
                    background: s.active ? '#fee2e2' : '#dcfce7',
                    color: s.active ? '#b91c1c' : '#15803d',
                    borderRadius: 6, cursor: 'pointer',
                  }}
                >
                  {s.active ? 'Deactivate' : 'Activate'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit mode: phone + notes fields */}
      {isEditing && canEdit && (
        <div style={{
          marginTop: 12, padding: 12,
          background: '#f8fafc', borderRadius: 8,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{
                fontSize: 11, color: 'var(--muted)', fontWeight: 500,
                display: 'block', marginBottom: 3,
              }}>
                Name
              </label>
              <input
                type="text"
                defaultValue={s.name}
                onBlur={e => {
                  if (e.target.value !== s.name) onUpdateField('name', e.target.value)
                }}
                style={{
                  width: '100%', padding: '6px 10px', fontSize: 12,
                  border: '1px solid var(--border)', borderRadius: 6,
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{
                fontSize: 11, color: 'var(--muted)', fontWeight: 500,
                display: 'block', marginBottom: 3,
              }}>
                Phone
              </label>
              <input
                type="text"
                defaultValue={s.phone || ''}
                onBlur={e => {
                  if (e.target.value !== (s.phone || '')) onUpdateField('phone', e.target.value || null)
                }}
                style={{
                  width: '100%', padding: '6px 10px', fontSize: 12,
                  border: '1px solid var(--border)', borderRadius: 6,
                }}
              />
            </div>
          </div>
          <div>
            <label style={{
              fontSize: 11, color: 'var(--muted)', fontWeight: 500,
              display: 'block', marginBottom: 3,
            }}>
              Notes
            </label>
            <input
              type="text"
              defaultValue={s.notes || ''}
              onBlur={e => {
                if (e.target.value !== (s.notes || '')) onUpdateField('notes', e.target.value || null)
              }}
              placeholder="Shift info, languages, availability..."
              style={{
                width: '100%', padding: '6px 10px', fontSize: 12,
                border: '1px solid var(--border)', borderRadius: 6,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Role filter chip ──────────────
function RoleChip({ label, count, active, onClick, role }) {
  const colors = role ? ROLE_BADGE_COLORS[role] : { bg: '#e2e8f0', color: '#64748b' }
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px', fontSize: 12, fontWeight: 600,
        background: active ? colors.color : 'var(--surface)',
        color: active ? '#fff' : colors.color,
        border: `1px solid ${active ? colors.color : 'var(--border)'}`,
        borderRadius: 20,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        cursor: 'pointer',
        textTransform: 'capitalize',
      }}
    >
      {label}
      <span style={{
        background: active ? 'rgba(255,255,255,0.25)' : `${colors.color}22`,
        color: active ? '#fff' : colors.color,
        padding: '1px 7px', borderRadius: 10,
        fontSize: 11, fontWeight: 700,
      }}>
        {count}
      </span>
    </button>
  )
}