import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'

export function useHousekeeping() {
  const { staff } = useAuth()
  const [rooms, setRooms] = useState([])
  const [latestLogs, setLatestLogs] = useState({})  // { roomId: {status, cleaner, logged_at} }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!staff) return
    loadData()

    const suffix = Math.random().toString(36).slice(2, 9)
    const channel = supabase
      .channel(`housekeeping-${suffix}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'housekeeping_logs' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, loadData)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [staff?.id])

  const loadData = async () => {
    // Load rooms (filtered by building if cleaner)
    let roomsQuery = supabase
      .from('rooms')
      .select('*')
      .order('floor').order('number')

    if (staff?.role === 'cleaner' && staff?.building) {
      roomsQuery = roomsQuery.eq('building', staff.building)
    }

    const { data: roomsData, error: rError } = await roomsQuery

    if (rError) { setError(rError.message); setLoading(false); return }

    // Load all HK logs, grab latest per room
    const { data: logsData, error: lError } = await supabase
      .from('housekeeping_logs')
      .select('*, cleaner:staff(id, name, role)')
      .order('logged_at', { ascending: false })

    if (lError) { setError(lError.message); setLoading(false); return }

    // Build map: roomId → latest log
    const latest = {}
    for (const log of logsData || []) {
      if (!latest[log.room_id]) latest[log.room_id] = log
    }

    setRooms(roomsData || [])
    setLatestLogs(latest)
    setLoading(false)
  }

  // Log a new status change for a room
  const logStatus = async (roomId, status, notes = null) => {
    // Get current staff ID
    const { data: userResp } = await supabase.auth.getUser()
    const { data: staffData } = await supabase
      .from('staff').select('id, role')
      .eq('auth_user_id', userResp.user?.id).single()

    if (!staffData) return { error: 'Could not find staff record' }

    // Insert the log entry
    const { error: logError } = await supabase
      .from('housekeeping_logs')
      .insert({
        room_id: roomId,
        status,
        cleaner_id: staffData.id,
        notes,
      })

    if (logError) return { error: logError.message }

    // Also update the room's main status when relevant
    // cleaned/inspected → room is 'clean'
    // dirty → room is 'dirty'
    // in-progress → room is 'in-progress'
    let newRoomStatus = null
    if (status === 'cleaned' || status === 'inspected') newRoomStatus = 'clean'
    else if (status === 'dirty') newRoomStatus = 'dirty'
    else if (status === 'in-progress') newRoomStatus = 'in-progress'

    if (newRoomStatus) {
      await supabase.from('rooms').update({ status: newRoomStatus }).eq('id', roomId)
    }

    return { ok: true }
  }

  return { rooms, latestLogs, loading, error, logStatus }
}