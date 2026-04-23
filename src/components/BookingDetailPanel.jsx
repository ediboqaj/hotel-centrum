import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import Badge from './Badge'

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24))
}

// Local action functions (direct Supabase calls, no hook)
async function doCheckIn(bookingId, roomId) {
  await supabase.from('bookings').update({ status: 'checked-in' }).eq('id', bookingId)
  await supabase.from('rooms').update({ status: 'occupied' }).eq('id', roomId)
}
async function doCheckOut(bookingId, roomId) {
  await supabase.from('bookings').update({ status: 'checked-out' }).eq('id', bookingId)
  await supabase.from('rooms').update({ status: 'dirty' }).eq('id', roomId)
}
async function doCancel(bookingId) {
  await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId)
}
async function doMarkPaid(bookingId) {
  const { data: userResp } = await supabase.auth.getUser()
  const { data: staffData } = await supabase
    .from('staff').select('id')
    .eq('auth_user_id', userResp.user?.id).single()
  await supabase.from('bookings').update({
    paid: true,
    paid_at: new Date().toISOString(),
    paid_by: staffData?.id,
  }).eq('id', bookingId)
}

export default function BookingDetailPanel({ booking, onClose, embedded = false }) {
  const { staff } = useAuth()
  const canManage = ['admin', 'manager', 'reception'].includes(staff?.role)

  // Load minibar totals for this booking
  const [minibarTotals, setMinibarTotals] = useState({ charged: 0, pending: 0 })

  useEffect(() => {
    const loadMinibar = async () => {
      const { data } = await supabase
        .from('minibar_consumption')
        .select('quantity, unit_price, charged')
        .eq('booking_id', booking.id)

      if (data) {
        const charged = data.filter(c => c.charged)
          .reduce((s, c) => s + c.quantity * Number(c.unit_price), 0)
        const pending = data.filter(c => !c.charged)
          .reduce((s, c) => s + c.quantity * Number(c.unit_price), 0)
        setMinibarTotals({ charged, pending })
      }
    }
    loadMinibar()

    // Keep totals live if something changes in another tab
    const suffix = Math.random().toString(36).slice(2, 9)
    const channel = supabase
      .channel(`booking-detail-minibar-${suffix}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'minibar_consumption',
        filter: `booking_id=eq.${booking.id}`,
      }, loadMinibar)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [booking.id])

  const handleCheckIn  = async () => { await doCheckIn(booking.id, booking.room_id); onClose() }
  const handleCheckOut = async () => { await doCheckOut(booking.id, booking.room_id); onClose() }
  const handleCancel   = async () => {
    if (confirm('Cancel this booking?')) { await doCancel(booking.id); onClose() }
  }
  const handleMarkPaid = async () => { await doMarkPaid(booking.id) }

  return (
    <aside style={{
      width: embedded ? '100%' : 320,
      minWidth: embedded ? 'auto' : 320,
      background: embedded ? 'transparent' : 'var(--surface)',
      border: embedded ? 'none' : '1px solid var(--border)',
      borderRadius: embedded ? 0 : 10,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 18px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{booking.guest?.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            Room {booking.room?.number} · {booking.id.slice(0, 8)}
          </div>
        </div>
        <button onClick={onClose} style={{ fontSize: 18, color: 'var(--muted)' }}>✕</button>
      </div>

      {/* Booking section */}
      <Section title="Booking">
        <DetailRow label="Status" value={<Badge status={booking.status} />} />
        <DetailRow label="Check-In" value={booking.check_in} />
        <DetailRow label="Check-Out" value={booking.check_out} />
        <DetailRow label="Nights" value={daysBetween(booking.check_in, booking.check_out)} />
        <DetailRow label="Adults" value={booking.adults} />
      </Section>

      {/* Bill section */}
      <Section title="Bill">
        {booking.total_amount !== null && booking.total_amount !== undefined && (
          <DetailRow
            label="Booking total"
            value={`€${Number(booking.total_amount).toFixed(2)}`}
          />
        )}
        {minibarTotals.charged > 0 && (
          <DetailRow
            label="Minibar (on bill)"
            value={`€${minibarTotals.charged.toFixed(2)}`}
          />
        )}
        {minibarTotals.pending > 0 && (
          <DetailRow
            label="Minibar (pending)"
            value={
              <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                €{minibarTotals.pending.toFixed(2)}
              </span>
            }
          />
        )}
        <DetailRow
          label="Payment"
          value={<Badge status={booking.paid ? 'paid' : 'unpaid'} />}
        />
        {minibarTotals.pending > 0 && (
          <div style={{
            fontSize: 11, color: 'var(--warning)',
            marginTop: 8, padding: '6px 10px',
            background: '#fef3c7', borderRadius: 6,
            lineHeight: 1.4,
          }}>
            ⚠ Pending minibar charges are not yet added to the bill. Charge them from the Minibar page before checkout.
          </div>
        )}
      </Section>

      {/* Contact section */}
      {(booking.guest?.email || booking.guest?.phone) && (
        <Section title="Contact">
          {booking.guest.email && <DetailRow label="Email" value={booking.guest.email} small />}
          {booking.guest.phone && <DetailRow label="Phone" value={booking.guest.phone} />}
        </Section>
      )}

      {/* Notes section */}
      {booking.notes && (
        <Section title="Notes">
          <p style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text)' }}>
            {booking.notes}
          </p>
        </Section>
      )}

      {/* Actions section */}
      {canManage && (
        <Section title="Actions">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {booking.status === 'confirmed' && (
              <ActionButton onClick={handleCheckIn} variant="success">
                ✓ Check In
              </ActionButton>
            )}
            {booking.status === 'checked-in' && (
              <ActionButton onClick={handleCheckOut} variant="primary">
                → Check Out
              </ActionButton>
            )}
            {!booking.paid && booking.status !== 'cancelled' && (
              <ActionButton onClick={handleMarkPaid} variant="primary">
                € Mark as Paid
              </ActionButton>
            )}
            {['confirmed', 'checked-in'].includes(booking.status) && (
              <ActionButton onClick={handleCancel} variant="danger">
                ✕ Cancel Booking
              </ActionButton>
            )}
          </div>
        </Section>
      )}
    </aside>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
      <h4 style={{
        fontSize: 11, fontWeight: 600, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10,
      }}>
        {title}
      </h4>
      {children}
    </div>
  )
}

function DetailRow({ label, value, small }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 7, gap: 8,
    }}>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
      <span style={{
        fontSize: small ? 11 : 12, fontWeight: 500,
        color: 'var(--text)', textAlign: 'right',
        wordBreak: 'break-word',
      }}>
        {value}
      </span>
    </div>
  )
}

function ActionButton({ onClick, children, variant }) {
  const styles = {
    primary: { bg: 'var(--accent)', color: '#fff' },
    success: { bg: '#dcfce7', color: '#15803d' },
    danger:  { bg: '#fee2e2', color: '#b91c1c' },
  }
  const s = styles[variant] || styles.primary
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px', fontSize: 13, fontWeight: 500,
        background: s.bg, color: s.color,
        borderRadius: 7, cursor: 'pointer', width: '100%',
      }}
    >
      {children}
    </button>
  )
}