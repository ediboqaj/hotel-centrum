import { useLocation } from 'react-router-dom'
import { NAV_ITEMS } from '../config/navigation'
import { useTranslation } from 'react-i18next'

export default function TopBar() {
  const { t } = useTranslation()
  const location = useLocation()
  const currentItem = NAV_ITEMS.find(item =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  )
  const title = currentItem ? t(`nav.${currentItem.key}`) : t('nav.dashboard')

  const today = new Date().toLocaleDateString('sq-AL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <header style={{
      height: 52, minHeight: 52,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 12,
    }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>
        {title}
      </h2>
      <span style={{ color: 'var(--muted)', fontSize: 12 }}>
        {today}
      </span>
    </header>
  )
}