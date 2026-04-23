import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const TODAY = new Date().toISOString().split('T')[0]
const TOMORROW = new Date(Date.now() + 86400000).toISOString().split('T')[0]

// Local helpers (instead of the full useBookings hook)
async function isRoomAvailable(roomId, checkIn, checkOut) {
  const { data, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('room_id', roomId)
    .in('status', ['confirmed', 'checked-in'])
    .lt('check_in', checkOut)
    .gt('check_out', checkIn)
  if (error) return { error: error.message }
  return { available: data.length === 0 }
}

async function createBooking({ guest, roomId, checkIn, checkOut, adults, notes, totalAmount }) {
  const { data: guestData, error: guestError } = await supabase
    .from('guests')
    .insert({
      name: guest.name,
      email: guest.email || null,
      phone: guest.phone || null,
      nationality: guest.nationality || null,
    })
    .select().single()
  if (guestError) return { error: guestError.message }

  const { data: userResp } = await supabase.auth.getUser()
  const { data: staffData } = await supabase
    .from('staff').select('id')
    .eq('auth_user_id', userResp.user?.id).single()

  const { error: bookingError } = await supabase
    .from('bookings')
    .insert({
      guest_id: guestData.id,
      room_id: roomId,
      check_in: checkIn,
      check_out: checkOut,
      adults: adults || 1,
      notes: notes || null,
      status: 'confirmed',
      total_amount: totalAmount || null,
      created_by: staffData?.id,
    })
  if (bookingError) return { error: bookingError.message }
  return { ok: true }
}

export default function NewBookingModal({ onClose }) {
  const [rooms, setRooms] = useState([])
  const [form, setForm] = useState({
    name: '', email: '', phone: '', nationality: '',
    roomId: '', checkIn: TODAY, checkOut: TOMORROW,
    adults: 1, notes: '', totalAmount: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load all rooms for dropdown
  useEffect(() => {
    supabase.from('rooms')
      .select('*')
      .neq('status', 'maintenance')
      .order('floor').order('number')
      .then(({ data }) => setRooms(data || []))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setError('')

    if (!form.name.trim()) { setError('Guest name is required'); return }
    if (!form.roomId) { setError('Please select a room'); return }
    if (form.checkOut <= form.checkIn) { setError('Check-out must be after check-in'); return }

    // Soft warning for backdated check-ins
    const today = new Date().toISOString().split('T')[0]
    if (form.checkIn < today) {
      const confirmed = confirm(
        `Check-in date (${form.checkIn}) is in the past. ` +
        `Are you sure you want to create a backdated booking?`
      )
      if (!confirmed) return
    }
    setSaving(true)

    const { available, error: availError } = await isRoomAvailable(
      form.roomId, form.checkIn, form.checkOut
    )
    if (availError) { setError(availError); setSaving(false); return }
    if (!available) {
      setError('This room is already booked for those dates. Please choose another room or different dates.')
      setSaving(false)
      return
    }

    const { error: createError } = await createBooking({
      guest: {
        name: form.name, email: form.email,
        phone: form.phone, nationality: form.nationality,
      },
      roomId: form.roomId,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      adults: parseInt(form.adults) || 1,
      notes: form.notes,
      totalAmount: form.totalAmount ? parseFloat(form.totalAmount) : null,
    })

    setSaving(false)
    if (createError) setError(createError)
    else onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(2px)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, width: 560,
        maxWidth: '95vw', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>New Reservation</h3>
          <button onClick={onClose} style={{ fontSize: 18, color: 'var(--muted)' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: 22, overflowY: 'auto' }}>
          <Row>
            <Field label="Guest Name *">
              <Input value={form.name} onChange={v => set('name', v)} placeholder="Full name" />
            </Field>
            <Field label="Nationality">
              <Input value={form.nationality} onChange={v => set('nationality', v)} placeholder="e.g. XK" />
            </Field>
          </Row>

          <Row>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={v => set('email', v)} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={v => set('phone', v)} />
            </Field>
          </Row>

          <Row>
            <Field label="Check-In *">
              <Input type="date" value={form.checkIn} onChange={v => set('checkIn', v)} />
            </Field>
            <Field label="Check-Out *">
              <Input type="date" value={form.checkOut} onChange={v => set('checkOut', v)} />
            </Field>
          </Row>

          <Row>
            <Field label="Room *">
              <Select value={form.roomId} onChange={v => set('roomId', v)}>
                <option value="">Select room...</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.number} — {r.type} (Floor {r.floor}{r.building ? `, ${r.building}` : ''})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Adults">
              <Select value={form.adults} onChange={v => set('adults', v)}>
                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
              </Select>
            </Field>
          </Row>

          <Field label="Total Amount (€)">
            <Input type="number" value={form.totalAmount} onChange={v => set('totalAmount', v)} placeholder="Optional" />
          </Field>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Special requests..."
              style={{
                width: '100%', padding: '8px 11px',
                border: '1px solid var(--border)', borderRadius: 7,
                fontSize: 13, minHeight: 70, resize: 'vertical',
              }}
            />
          </Field>

          {error && (
            <div style={{
              background: '#fee2e2', color: '#b91c1c',
              padding: '10px 12px', borderRadius: 7,
              fontSize: 12, marginTop: 8,
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '8px 14px', fontSize: 13,
              background: '#f1f5f9', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 7,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            style={{
              padding: '8px 14px', fontSize: 13, fontWeight: 500,
              background: 'var(--accent)', color: '#fff',
              borderRadius: 7, cursor: 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Small helpers
function Row({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>
}
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  )
}
function Input({ type = 'text', value, onChange, placeholder }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '8px 11px', fontSize: 13,
        border: '1px solid var(--border)', borderRadius: 7,
        background: '#fff', outline: 'none',
      }}
    />
  )
}
function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '8px 11px', fontSize: 13,
        border: '1px solid var(--border)', borderRadius: 7,
        background: '#fff', outline: 'none',
      }}
    >
      {children}
    </select>
  )
}