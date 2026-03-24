'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { ensureProfile } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const code = searchParams.get('code')
        const errorDescriptionParam = searchParams.get('error_description')
        const hasHash = typeof window !== 'undefined' && window.location.hash.length > 1

        if (errorDescriptionParam) {
          throw new Error(decodeURIComponent(errorDescriptionParam))
        }

        if (hasHash) {
          const hashParams = new URLSearchParams(window.location.hash.slice(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          const hashError = hashParams.get('error') || hashParams.get('error_description')

          if (hashError) {
            throw new Error(decodeURIComponent(hashError))
          }

          if (accessToken && refreshToken) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })

            if (setSessionError) throw setSessionError

            window.history.replaceState(
              {},
              document.title,
              window.location.pathname + window.location.search,
            )
          }
        } else if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
        }

        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        const user = data.session?.user
        if (!user) {
          throw new Error('Session tidak ditemukan. Silakan login ulang.')
        }

        await ensureProfile(user)

        if (!cancelled) router.replace('/dashboard')
      } catch (e) {
        const message = e instanceof Error ? e.message : JSON.stringify(e)
        // Tetap log agar bisa dicek di console browser ketika pengujian
        console.error('[auth/callback] Failed to handle session', e)
        if (!cancelled) setError(message)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [router, searchParams])

  return (
    <div className="mx-auto w-full max-w-md rounded border border-slate-200 bg-white p-4">
      <h1 className="text-lg font-semibold">Memproses login...</h1>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-md rounded border border-slate-200 bg-white p-4">
          <h1 className="text-lg font-semibold">Memproses login...</h1>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  )
}
