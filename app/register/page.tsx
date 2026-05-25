'use client'

import { useMemo, useState } from 'react'
import { useSupabase } from '@/components/supabase-provider'

export default function RegisterPage() {
  const supabase = useSupabase()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const redirectTo = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/auth/callback`
  }, [])

  async function signInWithGoogle() {
    setStatus('loading')
    setMessage(null)

    try {
      console.log('[Register] Initiating Google OAuth')
      console.log('[Register] redirectTo (Google):', redirectTo)
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      })

      if (error) {
        console.error('[Register] Google error:', error)
        setStatus('error')
        setMessage(error.message || 'Gagal mendaftar dengan Google')
      }
    } catch (err) {
      console.error('[Register] Google unexpected error:', err)
      setStatus('error')
      setMessage('Terjadi kesalahan dengan Google login. Silakan coba lagi.')
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Daftar Akun</h1>
        <p className="text-sm text-slate-600">Gunakan akun Google Anda.</p>
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
          <span>Lanjutkan dengan Google</span>
        </div>
      </button>

      {message && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${
          status === 'error' 
            ? 'bg-red-50 border border-red-200 text-red-800' 
            : 'bg-green-50 border border-green-200 text-green-800'
        }`}>
          {message}
        </div>
      )}

      <div className="text-center">
        <p className="text-xs text-slate-500">
          Sudah punya akun?{' '}
          <a href="/login" className="text-indigo-600 hover:text-indigo-800">
            Login di sini
          </a>
        </p>
      </div>
    </div>
  )
}
