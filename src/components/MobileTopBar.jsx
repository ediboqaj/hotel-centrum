import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { NAV_ITEMS, ROLE_BADGE_COLORS } from '../config/navigation'

export default function MobileTopBar() {
  const { t } = useTranslation()
  const location = useLocation()
  const { staff, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const currentItem = NAV_ITEMS.find(item =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  )
  const title = currentItem ? t(`nav.${currentItem.key}`) : t('layout.systemName')
  const badge = ROLE_BADGE_COLORS[staff?.role] || ROLE_BADGE_COLORS.cleaner

  return (
    <>
      <header style={{
        height: 50, minHeight: 50,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 14px', gap: 10,
      }}>
        <img
          src="/logoC.png"
          alt="Centrum"
          style={{ height: 24, marginRight: 8 }}
          onError={(e) => { e.target.style.display = 'none' }}
        />
        <h2 style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{title}</h2>

        <button
          onClick={() => setMenuOpen(true)}
          style={{
            padding: '4px 10px', borderRadius: 6,
            fontSize: 10, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.5px',
            background: badge.bg, color: badge.color,
            cursor: 'pointer',
          }}
        >
          {t(`roles.${staff?.role}`)}
        </button>
      </header>

      {menuOpen && (
        <>
          <div
            onClick={() => setMenuOpen(false)}
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

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                marginBottom: 4 }}>
                {t('layout.loggedInAs')}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                {staff?.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                @{staff?.email?.split('@')[0]}
              </div>
            </div>

            <button
              onClick={() => { setMenuOpen(false); signOut() }}
              style={{
                width: '100%', padding: '12px 16px',
                fontSize: 14, fontWeight: 500,
                background: '#fee2e2', color: '#b91c1c',
                borderRadius: 10, cursor: 'pointer',
              }}
            >
              {t('layout.signOut')}
            </button>
          </div>
        </>
      )}
    </>
  )
}