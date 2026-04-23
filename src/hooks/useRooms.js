import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'

export function useRooms() {
  const { staff } = useAuth()
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!staff) return
    loadRooms()

    const suffix = Math.random().toString(36).slice(2, 9)
    const channel = supabase
      .channel(`rooms-${suffix}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        () => loadRooms()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [staff?.id])

  const loadRooms = async () => {
    let query = supabase
      .from('rooms')
      .select('*')
      .order('floor', { ascending: true })
      .order('number', { ascending: true })

    // Cleaners only see rooms in their assigned building
    if (staff?.role === 'cleaner' && staff?.building) {
      query = query.eq('building', staff.building)
    }

    const { data, error } = await query

    if (error) setError(error.message)
    else setRooms(data || [])
    setLoading(false)
  }

  const updateRoomStatus = async (roomId, newStatus) => {
    const { error } = await supabase
      .from('rooms')
      .update({ status: newStatus })
      .eq('id', roomId)

    if (error) {
      setError(error.message)
      return false
    }
    return true
  }

  return { rooms, loading, error, updateRoomStatus }
}