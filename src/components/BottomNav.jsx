import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { getNavForRole } from '../config/navigation'

const MAX_VISIBLE = 4

export default function BottomNav() {
  const { t } = useTranslation()
  const { staff } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  const navItems = getNavForRole(staff?.role)

  const needsMore = navItems.length > 5
  const visible = needsMore ? navItems.slice(0, MAX_VISIBLE) : navItems
  const overflow = needsMore ? navItems.slice(MAX_VISIBLE) : []

  const overflowActive = overflow.some(item =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  )

  const handleOverflowSelect = (path) => {
    navigate(path)
    setMoreOpen(false)
  }

  return (
    <>
      <nav style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        background: 'var(--sidebar)',
        height: 62,
        zIndex: 150,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '0 4px',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}>
        {visible.map(item => (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.path === '/'}
            style={({ isActive }) => ({
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 2,
              padding: '6px 6px',
              color: isActive ? '#6ee7b7' : 'rgba(255,255,255,0.45)',
              background: isActive ? 'rgba(16,185,129,0.15)' : 'transparent',
              borderRadius: 8,
              textDecoration: 'none',
              minWidth: 44, minHeight: 44,
              flex: 1,
              transition: 'all 0.15s',
            })}
          >
            <span style={{ fontSize: 19, lineHeight: 1 }}>{item.icon}</span>
            <span style={{
              fontSize: 9, fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
            }}>
              {t(`nav.${item.key}`)}
            </span>
          </NavLink>
        ))}

        {needsMore && (
          <button
            onClick={() => setMoreOpen(true)}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 2,
              padding: '6px 6px',
              color: overflowActive ? '#6ee7b7' : 'rgba(255,255,255,0.45)',
              background: overflowActive ? 'rgba(16,185,129,0.15)' : 'transparent',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              minWidth: 44, minHeight: 44,
              flex: 1,
            }}
          >
            <span style={{ fontSize: 19, lineHeight: 1 }}>⋯</span>
            <span style={{
              fontSize: 9, fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
            }}>
              {t('nav.more')}
            </span>
          </button>
        )}
      </nav>

      {moreOpen && (
        <>
          <div
            onClick={() => setMoreOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 199,
              backdropFilter: 'blur(2px)',
            }}
          />
          <div style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            background: 'var(--surface)',
            borderRadius: '20px 20px 0 0',
            padding: 20,
            zIndex: 200,
            boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
            paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0))',
          }}>
            <div style={{
              width: 36, height: 4, background: '#e2e8f0',
              borderRadius: 2, margin: '0 auto 16px',
            }} />

            <div style={{
              fontSize: 11, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.5px',
              marginBottom: 12,
            }}>
              {t('nav.more')}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {overflow.map(item => (
                <button
                  key={item.key}
                  onClick={() => handleOverflowSelect(item.path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 20, width: 24, textAlign: 'center' }}>
                    {item.icon}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                    {t(`nav.${item.key}`)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}