'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { ensureProfile } from '@/lib/auth'
import { useSupabase } from '@/components/supabase-provider'

export default function AuthCallbackPage() {
  const supabase = useSupabase()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        console.log('[Auth Callback] Processing authentication...')
        
        // Let Supabase handle the session automatically
        const { data, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('[Auth Callback] Session error:', sessionError)
          throw sessionError
        }

        const user = data.session?.user
        console.log('[Auth Callback] User found:', !!user)

        if (user) {
          console.log('[Auth Callback] User authenticated, syncing profile...')
          // Sync user profile and redirect
          await ensureProfile(user)
          
          if (!cancelled) {
            setStatus('success')
            console.log('[Auth Callback] Profile synced, redirecting to dashboard...')
            setTimeout(() => {
              router.replace('/dashboard')
            }, 1000)
          }
          return
        }

        // Check URL parameters for errors
        const errorDescription = searchParams.get('error_description')
        if (errorDescription) {
          throw new Error(decodeURIComponent(errorDescription))
        }

        // Check hash for errors
        const hash = typeof window !== 'undefined' ? window.location.hash : ''
        if (hash) {
          const hashParams = new URLSearchParams(hash.slice(1))
          const hashError = hashParams.get('error') || hashParams.get('error_description')
          if (hashError) {
            throw new Error(decodeURIComponent(hashError))
          }
        }

        throw new Error('Authentication failed. No session found.')
        
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error occurred'
        console.error('[Auth Callback] Authentication failed:', e)
        
        setError(message)
        setStatus('error')
        
        if (!cancelled) {
          // Redirect to login after 5 seconds
          setTimeout(() => {
            router.replace('/login')
          }, 5000)
        }
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [router, searchParams])

  return (
    <div className="mx-auto w-full max-w-md rounded border border-slate-200 bg-white p-6">
      <div className="text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Memproses Login</h1>
              <p className="text-sm text-slate-600 mt-2">Sedang memproses autentikasi Anda...</p>
            </div>
          </div>
        )}
        
        {status === 'success' && (
          <div className="space-y-4">
            <div className="rounded-full bg-green-100 p-3 w-12 h-12 mx-auto">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Login Berhasil</h1>
              <p className="text-sm text-slate-600 mt-2">Mengarahkan ke dashboard...</p>
            </div>
          </div>
        )}
        
        {status === 'error' && (
          <div className="space-y-4">
            <div className="rounded-full bg-red-100 p-3 w-12 h-12 mx-auto">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Login Gagal</h1>
              <p className="text-sm text-red-600 mt-2">{error}</p>
              <p className="text-xs text-slate-500 mt-4">Anda akan diarahkan ke halaman login dalam 5 detik...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
