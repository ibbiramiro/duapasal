'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'

import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const redirectTo = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/auth/callback`
  }, [])

  async function signInWithEmailOtp(e: FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setMessage(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (error) {
      setStatus('error')
      setMessage(error.message)
      return
    }

    setStatus('sent')
    setMessage('Link login sudah dikirim ke email Anda. Silakan cek inbox/spam.')
  }

  async function signInWithGoogle() {
    setStatus('loading')
    setMessage(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })

    if (error) {
      setStatus('error')
      setMessage(error.message)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="text-sm text-slate-600">Gunakan Email OTP atau Google.</p>
      </div>

      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={status === 'loading'}
        className="w-full rounded border border-slate-200 bg-white px-4 py-2 hover:bg-slate-50 disabled:opacity-60"
      >
        Login dengan Google
      </button>

      <div className="rounded border border-slate-200 bg-white p-4">
        <form className="space-y-3" onSubmit={signInWithEmailOtp}>
          <label className="block text-sm font-medium">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            placeholder="nama@email.com"
            className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
          />

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-60"
          >
            Kirim Link Login
          </button>

          {message ? <p className="text-sm text-slate-700">{message}</p> : null}
        </form>
      </div>

      <p className="text-sm text-slate-600">
        Belum punya akun?{' '}
        <a className="text-indigo-700 underline" href="/register">
          Register
        </a>
      </p>
    </div>
  )
}
