'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'

import { useSupabase } from '@/components/supabase-provider'
import { logEmail } from '@/lib/email'

export default function LoginPage() {
  const supabase = useSupabase()
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

    if (!email.trim()) {
      setStatus('error')
      setMessage('Email wajib diisi')
      return
    }

    await logEmail(email, 'login', 'sending')

    try {
      console.log('[Login] Sending OTP to:', email.trim())
      
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
        },
      })

      if (error) {
        console.error('[Login] OTP error:', error)
        setStatus('error')
        setMessage(error.message || 'Gagal mengirim link login')
        await logEmail(email, 'login', 'error', error)
        return
      }

      console.log('[Login] OTP sent successfully')
      setStatus('sent')
      setMessage('Link login sudah dikirim ke email Anda. Silakan cek inbox dan folder spam.')
      await logEmail(email, 'login', 'sent')
    } catch (err) {
      console.error('[Login] Unexpected error:', err)
      setStatus('error')
      setMessage('Terjadi kesalahan. Silakan coba lagi.')
      await logEmail(email, 'login', 'error', err)
    }
  }

  async function signInWithGoogle() {
    setStatus('loading')
    setMessage(null)

    try {
      console.log('[Login] Initiating Google OAuth')
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      })

      if (error) {
        console.error('[Login] Google error:', error)
        setStatus('error')
        setMessage(error.message || 'Gagal login dengan Google')
      }
    } catch (err) {
      console.error('[Login] Google unexpected error:', err)
      setStatus('error')
      setMessage('Terjadi kesalahan dengan Google login. Silakan coba lagi.')
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
        className="w-full rounded border border-slate-200 bg-white px-4 py-2 hover:bg-slate-50 disabled:opacity-60 transition-colors"
      >
        <div className="flex items-center justify-center space-x-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Login dengan Google</span>
        </div>
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-slate-500">atau</span>
        </div>
      </div>

      <div className="rounded border border-slate-200 bg-white p-4">
        <form className="space-y-4" onSubmit={signInWithEmailOtp}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full rounded border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
              disabled={status === 'loading' || status === 'sent'}
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading' || status === 'sent' || !email.trim()}
            className="w-full rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'loading' ? 'Mengirim...' : status === 'sent' ? 'Link Terkirim' : 'Kirim Link Login'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            status === 'error' 
              ? 'bg-red-50 border border-red-200 text-red-800' 
              : 'bg-green-50 border border-green-200 text-green-800'
          }`}>
            {message}
          </div>
        )}

        {status === 'sent' && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Penting:</strong> Link login akan kadaluarsa dalam 1 jam. Pastikan Anda membuka link di browser yang sama.
            </p>
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="text-xs text-slate-500">
          Belum punya akun?{' '}
          <a href="/register" className="text-indigo-600 hover:text-indigo-800">
            Daftar di sini
          </a>
        </p>
      </div>
    </div>
  )
}
