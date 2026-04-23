import { useTranslation } from 'react-i18next'

const STATUS_STYLES = {
  occupied:      { bg: '#dbeafe', color: '#1d4ed8' },
  clean:         { bg: '#dcfce7', color: '#15803d' },
  dirty:         { bg: '#fef3c7', color: '#b45309' },
  maintenance:   { bg: '#fee2e2', color: '#b91c1c' },
  'in-progress': { bg: '#e0e7ff', color: '#4338ca' },
  vacant:        { bg: '#f8fafc', color: '#64748b' },
  confirmed:     { bg: '#f0f9ff', color: '#0369a1' },
  'checked-in':  { bg: '#dcfce7', color: '#15803d' },
  'checked-out': { bg: '#f1f5f9', color: '#475569' },
  cancelled:     { bg: '#fee2e2', color: '#b91c1c' },
  paid:          { bg: '#dcfce7', color: '#15803d' },
  unpaid:        { bg: '#fef3c7', color: '#b45309' },
  cleaned:       { bg: '#dcfce7', color: '#15803d' },
  inspected:     { bg: '#dbeafe', color: '#1d4ed8' },
}

export default function Badge({ status, text }) {
  const { t } = useTranslation()
  const style = STATUS_STYLES[status] || { bg: '#f1f5f9', color: '#64748b' }
  const label = text || t(`badges.${status}`, status)

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      background: style.bg, color: style.color,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}