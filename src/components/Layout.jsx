import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import MobileTopBar from './MobileTopBar'
import BottomNav from './BottomNav'
import { useMobile } from '../hooks/useMobile'

export default function Layout() {
  const isMobile = useMobile()

  if (isMobile) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: '100vh', overflow: 'hidden',
      }}>
        <MobileTopBar />
        <main style={{
          flex: 1, overflowY: 'auto',
          padding: 12,
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0))',
        }}>
          <Outlet />
        </main>
        <BottomNav />
      </div>
    )
  }

  // Desktop layout (unchanged)
  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
    }}>
      <Sidebar />
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minWidth: 0, overflow: 'hidden',
      }}>
        <TopBar />
        <main style={{
          flex: 1, overflowY: 'auto', padding: 24,
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}