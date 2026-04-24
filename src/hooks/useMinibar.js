import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'

export function useMinibar() {
  const { staff } = useAuth()
  const [products, setProducts] = useState([])
  const [rooms, setRooms] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!staff) return
    loadData()

    const suffix = Math.random().toString(36).slice(2, 9)
    const channel = supabase
      .channel(`minibar-${suffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'minibar_consumption' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, loadData)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [staff?.id])

  const loadData = async () => {
    // Products
    const productsQuery = supabase
      .from('minibar_products')
      .select('*')
      .eq('active', true)
      .order('name')

    // Rooms (filter by building for cleaners)
    let roomsQuery = supabase
      .from('rooms')
      .select('*')
      .order('floor').order('number')
    if (staff?.role === 'cleaner' && staff?.building) {
      roomsQuery = roomsQuery.eq('building', staff.building)
    }

    // Reports (consumption records with new workflow)
    let reportsQuery = supabase
      .from('minibar_consumption')
      .select('*, product:minibar_products(name), room:rooms(number, building, floor), reporter:staff!recorded_by(name)')
      .order('recorded_at', { ascending: false })
      .limit(200)

    // Cleaners only see reports for their building
    if (staff?.role === 'cleaner' && staff?.building) {
      // Need to filter by room building — done client-side below
    }

    const [p, r, rep] = await Promise.all([productsQuery, roomsQuery, reportsQuery])

    if (p.error) { setError(p.error.message); setLoading(false); return }
    if (r.error) { setError(r.error.message); setLoading(false); return }
    if (rep.error) { setError(rep.error.message); setLoading(false); return }

    setProducts(p.data || [])
    setRooms(r.data || [])

    // Filter reports by building if cleaner
    let filteredReports = rep.data || []
    if (staff?.role === 'cleaner' && staff?.building) {
      filteredReports = filteredReports.filter(r => r.room?.building === staff.building)
    }
    setReports(filteredReports)
    setLoading(false)
  }

  // Cleaner action: report missing item(s)
  const reportMissing = async (roomId, productId, quantity = 1) => {
    const { data: userResp } = await supabase.auth.getUser()
    const { data: staffData } = await supabase
      .from('staff').select('id')
      .eq('auth_user_id', userResp.user?.id).single()

    const { error } = await supabase
      .from('minibar_consumption')
      .insert({
        room_id: roomId,
        product_id: productId,
        quantity,
        unit_price: 0,
        recorded_by: staffData?.id,
        report_status: 'reported',
      })

    if (error) return { error: error.message }
    return { ok: true }
  }

  // Reception action: mark a report as handled
  const acknowledgeReport = async (reportId) => {
    const { error } = await supabase
      .from('minibar_consumption')
      .update({ report_status: 'acknowledged' })
      .eq('id', reportId)

    if (error) return { error: error.message }
    return { ok: true }
  }

  // Reception action: acknowledge ALL pending reports for a room
  const acknowledgeAllForRoom = async (roomId) => {
    const { error } = await supabase
      .from('minibar_consumption')
      .update({ report_status: 'acknowledged' })
      .eq('room_id', roomId)
      .eq('report_status', 'reported')

    if (error) return { error: error.message }
    return { ok: true }
  }
  // Cleaner action: delete a mistaken report (only if not yet acknowledged)
  const deleteReport = async (reportId) => {
    const { error } = await supabase
      .from('minibar_consumption')
      .delete()
      .eq('id', reportId)
      .eq('report_status', 'reported') // safety: can't delete acknowledged ones

    if (error) return { error: error.message }
    return { ok: true }
  }

  return {
    products, rooms, reports,
    loading, error,
    reportMissing, acknowledgeReport, acknowledgeAllForRoom, deleteReport,
  }
}