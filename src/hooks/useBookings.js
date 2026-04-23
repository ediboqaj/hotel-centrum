import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export function useBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadBookings()

    // Unique channel name per hook instance to prevent collisions
    const channelName = `bookings-${Math.random().toString(36).slice(2, 9)}`

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => loadBookings()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'guests' },
        () => loadBookings()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadBookings = async () => {
    // Join bookings with guest info and room info in one query
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        guest:guests(id, name, email, phone, nationality, notes),
        room:rooms(id, number, type, floor, building)
      `)
      .order('check_in', { ascending: false })

    if (error) setError(error.message)
    else setBookings(data || [])
    setLoading(false)
  }

  // Create a new booking (and guest if needed)
  const createBooking = async ({ guest, roomId, checkIn, checkOut, adults, notes, totalAmount }) => {
    // First, create the guest
    const { data: guestData, error: guestError } = await supabase
      .from('guests')
      .insert({
        name: guest.name,
        email: guest.email || null,
        phone: guest.phone || null,
        nationality: guest.nationality || null,
        notes: guest.notes || null,
      })
      .select()
      .single()

    if (guestError) return { error: guestError.message }

    // Then, create the booking
    const { data: staffData } = await supabase
      .from('staff')
      .select('id')
      .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    const { data: booking, error: bookingError } = await supabase
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
      .select()
      .single()

    if (bookingError) return { error: bookingError.message }
    return { data: booking }
  }

  // Check guest in: booking → checked-in, room → occupied
  const checkIn = async (bookingId, roomId) => {
    const { error: e1 } = await supabase
      .from('bookings')
      .update({ status: 'checked-in' })
      .eq('id', bookingId)

    if (e1) return { error: e1.message }

    const { error: e2 } = await supabase
      .from('rooms')
      .update({ status: 'occupied' })
      .eq('id', roomId)

    if (e2) return { error: e2.message }
    return { ok: true }
  }

  // Check guest out: booking → checked-out, room → dirty (needs cleaning)
  const checkOut = async (bookingId, roomId) => {
    const { error: e1 } = await supabase
      .from('bookings')
      .update({ status: 'checked-out' })
      .eq('id', bookingId)

    if (e1) return { error: e1.message }

    const { error: e2 } = await supabase
      .from('rooms')
      .update({ status: 'dirty' })
      .eq('id', roomId)

    if (e2) return { error: e2.message }
    return { ok: true }
  }

  // Cancel booking (room stays as-is)
  const cancelBooking = async (bookingId) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
    if (error) return { error: error.message }
    return { ok: true }
  }

  // Mark as paid
  const markPaid = async (bookingId) => {
    const { data: staffData } = await supabase
      .from('staff')
      .select('id')
      .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    const { error } = await supabase
      .from('bookings')
      .update({
        paid: true,
        paid_at: new Date().toISOString(),
        paid_by: staffData?.id,
      })
      .eq('id', bookingId)
    if (error) return { error: error.message }
    return { ok: true }
  }

  // Check if a room is available for given dates (prevents double-booking)
  const isRoomAvailable = async (roomId, checkIn, checkOut, excludeBookingId = null) => {
    let query = supabase
      .from('bookings')
      .select('id')
      .eq('room_id', roomId)
      .in('status', ['confirmed', 'checked-in'])
      .lt('check_in', checkOut)   // existing booking starts before new one ends
      .gt('check_out', checkIn)   // existing booking ends after new one starts

    if (excludeBookingId) query = query.neq('id', excludeBookingId)

    const { data, error } = await query
    if (error) return { error: error.message }
    return { available: data.length === 0 }
  }

  return {
    bookings, loading, error,
    createBooking, checkIn, checkOut, cancelBooking, markPaid,
    isRoomAvailable,
  }
}