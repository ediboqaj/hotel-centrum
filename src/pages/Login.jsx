import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

// Convert "username" to internal email format
// e.g. "recepsion" → "recepsion@centrum.local"
function usernameToEmail(username) {
  // Allow only lowercase letters, numbers, hyphens
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
  return `${clean}@centrum.local`
}

export default function Login() {
  const { t } = useTranslation()
  const { signIn } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim()) {
      setError(t('login.usernameRequired'))
      return
    }

    setLoading(true)
    const email = usernameToEmail(username)
    const { error } = await signIn(email, password)
    if (error) setError(t('login.invalid'))
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f1f5f9',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        background: '#fff',
        padding: 32,
        borderRadius: 12,
        width: 360,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', marginBottom: 24,
        }}>
          <img
            src="/logoC.png"
            alt="Hotel Centrum"
            style={{
              height: 48, maxWidth: '80%',
              marginBottom: 12,
            }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center' }}>
            {t('login.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>
            {t('login.usernameLabel')}
          </label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            required
            placeholder="Përdoruesi"
            style={{
              width: '100%', padding: '10px 12px', fontSize: 14,
              border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 14,
              boxSizing: 'border-box',
            }}
          />

          <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>
            {t('login.passwordLabel')}
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={{
              width: '100%', padding: '10px 12px', fontSize: 14,
              border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 14,
              boxSizing: 'border-box',
            }}
          />

          {error && (
            <div style={{
              background: '#fee2e2', color: '#b91c1c',
              padding: '8px 12px', borderRadius: 6, fontSize: 12, marginBottom: 14,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '10px 12px', fontSize: 14,
              background: '#10b981', color: '#fff', border: 'none',
              borderRadius: 6, cursor: 'pointer', fontWeight: 600,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? t('login.signingIn') : t('login.signIn')}
          </button>
        </form>
      </div>
    </div>
  )
}