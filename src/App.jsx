import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ROLE_ACCESS } from './config/navigation'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Bookings from './pages/Bookings'
import Calendar from './pages/Calendar'
import Housekeeping from './pages/Housekeeping'
import Minibar from './pages/Minibar'
import Reports from './pages/Reports'
import Staff from './pages/Staff'

// Wrapper that blocks pages the current role can't access
function ProtectedRoute({ pageKey, children }) {
  const { staff } = useAuth()

  // Wait for staff record to load before deciding anything
  if (!staff) {
    return (
      <div style={{ color: 'var(--muted)', padding: 20 }}>
        Loading your access...
      </div>
    )
  }

  const allowed = ROLE_ACCESS[staff.role] || []

  // If this role can't access this page, redirect to their first allowed page
  if (!allowed.includes(pageKey)) {
    const firstAllowed = allowed[0]
    if (!firstAllowed) {
      // Edge case: role has no pages at all (shouldn't happen, but safe fallback)
      return (
        <div style={{ padding: 20, color: 'var(--danger)' }}>
          Your account has no access. Contact an administrator.
        </div>
      )
    }
    const path = firstAllowed === 'dashboard' ? '/' : `/${firstAllowed}`
    return <Navigate to={path} replace />
  }

  return children
}
function AppContent() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: 'var(--muted)',
      }}>
        Loading...
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ProtectedRoute pageKey="dashboard"><Dashboard /></ProtectedRoute>} />
          <Route path="bookings" element={<ProtectedRoute pageKey="bookings"><Bookings /></ProtectedRoute>} />
          <Route path="calendar" element={<ProtectedRoute pageKey="calendar"><Calendar /></ProtectedRoute>} />
          <Route path="housekeeping" element={<ProtectedRoute pageKey="housekeeping"><Housekeeping /></ProtectedRoute>} />
          <Route path="minibar" element={<ProtectedRoute pageKey="minibar"><Minibar /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute pageKey="reports"><Reports /></ProtectedRoute>} />
          <Route path="staff" element={<ProtectedRoute pageKey="staff"><Staff /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}