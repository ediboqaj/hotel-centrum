import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [staff, setStaff] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadStaff(session.user.id)
      else setLoading(false)
    })

    // Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        if (session) loadStaff(session.user.id)
        else { setStaff(null); setLoading(false) }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const loadStaff = async (authUserId) => {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single()

    if (error) console.error('Error loading staff:', error)
    else setStaff(data)
    setLoading(false)
  }

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ session, staff, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)