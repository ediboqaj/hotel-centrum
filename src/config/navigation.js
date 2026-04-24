// Defines all pages in the app + which roles can access each one
// Single source of truth — change here, sidebar updates everywhere

export const NAV_ITEMS = [
  { key: 'dashboard',    label: 'Dashboard',     icon: '◉', path: '/' },
  { key: 'bookings',     label: 'Bookings',      icon: '☰', path: '/bookings' },
  { key: 'calendar',     label: 'Calendar',      icon: '▦', path: '/calendar' },
  { key: 'housekeeping', label: 'Housekeeping',  icon: '✦', path: '/housekeeping' },
  { key: 'minibar',      label: 'Minibar',       icon: '◈', path: '/minibar' },
  { key: 'reports',      label: 'Reports',       icon: '▤', path: '/reports' },
  { key: 'staff',        label: 'Staff',         icon: '◐', path: '/staff' },
]

export const ROLE_ACCESS = {
  reception: ['housekeeping', 'minibar', 'reports'],
  cleaner:   ['housekeeping', 'minibar'],
  admin:     ['dashboard', 'bookings', 'calendar', 'housekeeping', 'minibar', 'reports', 'staff'],
  manager:   ['dashboard', 'bookings', 'calendar', 'housekeeping', 'minibar', 'reports', 'staff'],
}

export const ROLE_BADGE_COLORS = {
  admin:     { bg: 'rgba(239,68,68,0.2)',  color: '#fca5a5' },
  manager:   { bg: 'rgba(168,85,247,0.2)', color: '#d8b4fe' },
  reception: { bg: 'rgba(59,130,246,0.2)', color: '#93c5fd' },
  cleaner:   { bg: 'rgba(34,197,94,0.2)',  color: '#86efac' },
}

// Helper: get nav items the current role can see
export const getNavForRole = (role) => {
  const allowed = ROLE_ACCESS[role] || []
  return NAV_ITEMS.filter(item => allowed.includes(item.key))
}