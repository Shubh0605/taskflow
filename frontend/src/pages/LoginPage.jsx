import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { LogIn } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('Welcome back!')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">TaskFlow</div>
        <p style={{ textAlign: 'center', color: 'var(--text2)', marginBottom: 32, fontSize: 14 }}>
          Sign in to your workspace
        </p>

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email" name="email"
              value={form.email} onChange={handle}
              placeholder="you@example.com"
              required autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password" name="password"
              value={form.password} onChange={handle}
              placeholder="••••••••"
              required
            />
          </div>

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} disabled={loading}>
            <LogIn size={15} />
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text2)' }}>
          No account?{' '}
          <Link to="/signup" style={{ color: 'var(--accent2)', textDecoration: 'none', fontWeight: 600 }}>
            Create one
          </Link>
        </p>

        <div style={{ marginTop: 24, padding: 14, background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, fontWeight: 600 }}>Demo credentials:</p>
          <p style={{ fontSize: 12, color: 'var(--text2)' }}>Create an account to get started — no demo accounts needed.</p>
        </div>
      </div>
    </div>
  )
}
