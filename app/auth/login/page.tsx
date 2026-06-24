'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.ok) router.push('/dashboard')
    else setError('Email ou mot de passe incorrect.')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fb' }}>
      <div className="card" style={{ width: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#4f46e5' }}>AssurPilot</div>
          <div style={{ color: '#6b7280', marginTop: 4 }}>Centre d'appels IA</div>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Adresse email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus placeholder="admin@assurpilot.fr" />
          </div>
          <div className="form-group">
            <label>Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
