'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user

      if (!user) {
        router.replace('/login')
        return
      }

      if (!cancelled) {
        setEmail(user.email ?? null)
        setLoading(false)
      }
    }

    load()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login')
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-4">
      <div className="rounded border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-600">Login sebagai: {email ?? '-'}</p>
        <button
          type="button"
          onClick={logout}
          className="mt-3 rounded bg-slate-900 px-4 py-2 text-white"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
