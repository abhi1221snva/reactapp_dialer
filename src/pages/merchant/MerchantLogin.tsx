import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Lock, Mail } from 'lucide-react'
import { useMerchantAuthStore } from '../../stores/merchantAuth.store'
import merchantPortalService from '../../services/merchantPortal.service'

export function MerchantLogin() {
  const navigate  = useNavigate()
  const { login } = useMerchantAuthStore()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await merchantPortalService.login(email, password)
      const data = res.data?.data
      if (!data?.token) throw new Error('Invalid response from server.')
      login(data)
      navigate('/merchant/applications', { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err as { message?: string })?.message
        ?? 'Login failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg,#f8fafc 0%,#e0e7ff 100%)',
      fontFamily: 'Inter, system-ui, sans-serif', padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '40px 36px',
        width: '100%', maxWidth: 400, boxShadow: '0 8px 40px rgba(0,0,0,.10)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: '#4f46e5',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
          }}>
            <Lock size={24} color="white" />
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
            Merchant Portal
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            Sign in to view your applications
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10,
            padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626', fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Email */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 5 }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com"
                style={{
                  width: '100%', padding: '10px 12px 10px 36px', border: '1.5px solid #e2e8f0',
                  borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  color: '#0f172a', background: '#f8fafc',
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 5 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '10px 12px 10px 36px', border: '1.5px solid #e2e8f0',
                  borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                  color: '#0f172a', background: '#f8fafc',
                }}
              />
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            style={{
              marginTop: 6, padding: '12px', borderRadius: 10, border: 'none',
              background: loading ? '#a5b4fc' : '#4f46e5', color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background .15s',
            }}
          >
            {loading && <Loader2 size={16} style={{ animation: 'spin .8s linear infinite' }} />}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
