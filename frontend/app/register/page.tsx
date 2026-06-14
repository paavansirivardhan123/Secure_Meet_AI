'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'
import { Suspense } from 'react'

function RegisterForm() {
  const searchParams = useSearchParams()
  const [token, setToken] = useState(searchParams.get('token') || '')
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const router = useRouter()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/api/auth/register', { token, email, password, fullName })
      setAuth(data.accessToken, data.email, data.fullName, data.role, data.phoneNumber, data.profilePicture, data.bio)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M17 10h2a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2h2V9a5 5 0 0110 0v1zm-2 0V9a3 3 0 00-6 0v1h6z"/>
              </svg>
            </div>
            <span className="text-xl font-semibold text-text">SecureMeet</span>
          </div>
          <p className="text-subtext text-sm">Complete your registration</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <h1 className="text-text font-semibold text-lg mb-6">Create Account</h1>

          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-subtext text-xs uppercase tracking-wider block mb-2">Invite Token</label>
              <input
                value={token}
                onChange={e => setToken(e.target.value)}
                required
                className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-text text-sm
                           focus:outline-none focus:border-accent font-mono"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
            <div>
              <label className="text-subtext text-xs uppercase tracking-wider block mb-2">Full Name</label>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-text text-sm
                           focus:outline-none focus:border-accent"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="text-subtext text-xs uppercase tracking-wider block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-text text-sm
                           focus:outline-none focus:border-accent"
                placeholder="must match invite email"
              />
            </div>
            <div>
              <label className="text-subtext text-xs uppercase tracking-wider block mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-text text-sm
                           focus:outline-none focus:border-accent"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-2.5 rounded-lg
                         transition-all text-sm disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-subtext text-xs text-center mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-accent hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>
}
