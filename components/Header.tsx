'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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

interface HeaderProps {
  title?: string
  subtitle?: string
  showBackButton?: boolean
  backHref?: string
}

export default function Header({ title = "Dashboard", subtitle, showBackButton = false, backHref = "/dashboard" }: HeaderProps) {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<string>('USER')
  const [loading, setLoading] = useState(true)
  const [showDropdown, setShowDropdown] = useState(false)

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
        try {
          const accessToken = data.session?.access_token
          const res = await fetch('/api/me', {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          })
          const me = (await res.json()) as MeResponse
          setRole(me.profile?.role ?? 'USER')
        } catch (_error) {
          setRole('USER')
        }
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
    return (
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-slate-900">Loading...</h1>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left Side - Title */}
          <div className="flex items-center">
            {showBackButton && (
              <button
                onClick={() => router.push(backHref)}
                className="mr-4 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Kembali"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
              {subtitle && (
                <p className="text-sm text-slate-600">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right Side - User Profile */}
          <div className="flex items-center space-x-4">
            {/* Admin Quick Links */}
            {role === 'ADMIN' && (
              <div className="hidden md:flex items-center space-x-2">
                <a
                  href="/admin/churches"
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                >
                  Master Gereja
                </a>
                <a
                  href="/admin/pastors"
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                >
                  Master Pendeta
                </a>
              </div>
            )}

            {/* User Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {/* User Avatar */}
                <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                
                {/* User Info */}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-slate-900">
                    {email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {role === 'ADMIN' ? 'Admin' : 'User'}
                  </p>
                </div>

                {/* Dropdown Arrow */}
                <svg
                  className={`hidden md:block h-4 w-4 text-slate-400 transition-transform ${
                    showDropdown ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {email}
                    </p>
                    <p className="text-xs text-slate-500">
                      {role === 'ADMIN' ? 'Administrator' : 'User'}
                    </p>
                  </div>
                  
                  <div className="py-1">
                    <a
                      href="/profile"
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                      onClick={() => setShowDropdown(false)}
                    >
                      <div className="flex items-center">
                        <svg className="mr-3 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Edit Profile
                      </div>
                    </a>
                    
                    <button
                      type="button"
                      onClick={logout}
                      className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <div className="flex items-center">
                        <svg className="mr-3 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Close dropdown when clicking outside */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  )
}
