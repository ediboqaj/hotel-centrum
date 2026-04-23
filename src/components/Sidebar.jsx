import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { getNavForRole, ROLE_BADGE_COLORS } from '../config/navigation'

export default function Sidebar() {
  const { t } = useTranslation()
  const { staff, signOut } = useAuth()
  const navItems = getNavForRole(staff?.role)
  const badge = ROLE_BADGE_COLORS[staff?.role] || ROLE_BADGE_COLORS.cleaner

  return (
    <aside style={{
      width: 220, minWidth: 220,
      background: 'var(--sidebar)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 18px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <img
          src="/logoC.png"
          alt="Hotel Centrum"
          style={{
            maxWidth: '100%',
            height: 32,
            display: 'block',
            marginBottom: 6,
            // Optional: if your logo is dark, remove the next line
            // If your logo is light/white, keep it for contrast on the dark sidebar
          }}
          onError={(e) => {
            // Fallback to text if image fails to load
            e.target.style.display = 'none'
            e.target.nextSibling.style.display = 'block'
          }}
        />
        <h1 style={{
          color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px',
          display: 'none', // hidden by default; shown if image fails
        }}>
          {t('layout.systemName')}
        </h1>
        <span style={{ color: '#94a3b8', fontSize: 11, display: 'block' }}>
          {t('layout.systemSubtitle')}
        </span>
      </div>

      {/* Section label */}
      <div style={{
        color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 600,
        letterSpacing: '0.8px', textTransform: 'uppercase',
        padding: '16px 18px 4px',
      }}>
        {t('layout.navSection')}
      </div>

      {/* Nav items */}
      {navItems.map(item => (
        <NavLink
          key={item.key}
          to={item.path}
          end={item.path === '/'}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 18px', fontSize: 13, textDecoration: 'none',
            color: isActive ? '#6ee7b7' : 'rgba(255,255,255,0.6)',
            background: isActive ? 'var(--sidebar-active)' : 'transparent',
            borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
            fontWeight: isActive ? 500 : 400,
            transition: 'all 0.15s',
          })}
        >
          <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{item.icon}</span>
          <span>{t(`nav.${item.key}`)}</span>
        </NavLink>
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* User info + sign out */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '14px 16px',
      }}>
        <div style={{
          color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6,
        }}>
          {t('layout.loggedInAs')}
        </div>
        <div style={{ color: '#fff', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>
          {staff?.name || t('common.loading')}
        </div>
        <span style={{
          display: 'inline-block',
          padding: '2px 8px', borderRadius: 4,
          fontSize: 10, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.5px',
          background: badge.bg, color: badge.color,
          marginBottom: 10,
        }}>
          {t(`roles.${staff?.role}`)}
        </span>
        <button
          onClick={signOut}
          style={{
            display: 'block', width: '100%',
            padding: '6px 10px', fontSize: 12,
            color: 'rgba(255,255,255,0.6)',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 6, textAlign: 'left',
          }}
        >
          → {t('layout.signOut')}
        </button>
      </div>
    </aside>
  )
}