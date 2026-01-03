'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'

type MeResponse = {
  user?: {
    id: string
    email: string | null
  } | null
  profile?: {
    role?: string | null
  } | null
  error?: string
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState<'loading' | 'ready' | 'forbidden'>('loading')

  useEffect(() => {
    let cancelled = false

    async function gate() {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user

      if (!user) {
        router.replace('/login')
        return
      }

      const accessToken = data.session?.access_token
      const res = await fetch('/api/me', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      })
      const me = (await res.json()) as MeResponse
      const role = me.profile?.role ?? 'USER'

      if (!res.ok || role !== 'ADMIN') {
        if (!cancelled) setStatus('forbidden')
        return
      }

      if (!cancelled) setStatus('ready')
    }

    gate()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login')
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [router])

  if (status === 'loading') return <div>Loading...</div>

  if (status === 'forbidden') {
    return (
      <div className="rounded border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-semibold">Forbidden</h1>
        <p className="mt-1 text-sm text-slate-600">Halaman ini hanya untuk admin.</p>
        <button
          type="button"
          onClick={() => router.replace('/dashboard')}
          className="mt-3 rounded bg-slate-900 px-4 py-2 text-white"
        >
          Kembali
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Admin</h1>
          <p className="text-sm text-slate-600">Master data untuk dropdown pendaftaran.</p>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <a
            className={`rounded px-3 py-2 hover:bg-slate-100 ${pathname === '/admin/churches' ? 'bg-slate-100' : ''}`}
            href="/admin/churches"
          >
            Churches
          </a>
          <a
            className={`rounded px-3 py-2 hover:bg-slate-100 ${pathname === '/admin/reading' ? 'bg-slate-100' : ''}`}
            href="/admin/reading"
          >
            Bacaan
          </a>
          <a
            className={`rounded px-3 py-2 hover:bg-slate-100 ${pathname === '/admin/pastors' ? 'bg-slate-100' : ''}`}
            href="/admin/pastors"
          >
            Pastors
          </a>
        </nav>
      </div>
      {children}
    </div>
  )
}
