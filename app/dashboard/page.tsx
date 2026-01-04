'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import type { TodayReadingResponse } from '@/types/reading'

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

export default function DashboardPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<string>('USER')
  const [loading, setLoading] = useState(true)
  const [readingData, setReadingData] = useState<TodayReadingResponse | null>(null)
  const [readingLoading, setReadingLoading] = useState(true)

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

  useEffect(() => {
    if (!loading) {
      loadTodayReading()
    }
  }, [loading])

  // Refresh when a reading is completed in another tab (reader window)
  useEffect(() => {
    if (loading) return

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'duapasal:last_reading_complete') {
        loadTodayReading()
      }
    }

    window.addEventListener('storage', handleStorage)

    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('duapasal')
      bc.onmessage = (event) => {
        if (event?.data?.type === 'reading_completed') {
          loadTodayReading()
        }
      }
    } catch (_e) {
      // Ignore if BroadcastChannel is not available
    }

    return () => {
      window.removeEventListener('storage', handleStorage)
      try {
        bc?.close()
      } catch (_e) {
        // ignore
      }
    }
  }, [loading])

  // Refresh when window gains focus (e.g., after closing reader)
  useEffect(() => {
    const handleFocus = () => {
      if (!loading) loadTodayReading()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [loading, readingLoading])

  // Refresh on user interaction (click) as a safety net
  useEffect(() => {
    const handleClick = () => {
      if (!loading) loadTodayReading()
    }
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [loading, readingLoading])

  async function loadTodayReading() {
    try {
      setReadingLoading(true)
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token

      const res = await fetch('/api/reading/today', {
        cache: 'no-store',
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      })

      if (res.ok) {
        const data = await res.json() as TodayReadingResponse
        setReadingData(data)
      }
    } catch (error) {
      console.error('Failed to load today reading:', error)
    } finally {
      setReadingLoading(false)
    }
  }

  function openReader(item: any) {
    const params = new URLSearchParams({
      planItemId: item.id.toString(),
      bookId: item.book_id.toString(),
      startChapter: item.start_chapter.toString(),
      endChapter: item.end_chapter.toString(),
    })
    window.open(`/reader?${params.toString()}`, '_blank')
  }

  if (loading) {
    return (
      <div>
        <Header title="Loading..." />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header 
        title="Reading Hub" 
        subtitle={`Selamat datang kembali, ${email?.split('@')[0] || 'User'}!`}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Points Card */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm">Total Poin</p>
                  <p className="text-3xl font-bold mt-1">{readingData?.userStats.totalPoints || 0}</p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Streak Card */}
            <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">Streak Poin</p>
                  <p className="text-3xl font-bold mt-1">{readingData?.userStats.currentStreak || 0}</p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Today's Points Card */}
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Poin Hari Ini</p>
                  <p className="text-3xl font-bold mt-1">{readingData?.userStats.todayPoints || 0}</p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Reading */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Bacaan Hari Ini</h3>
              
              {readingLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-slate-600">Memuat bacaan hari ini...</p>
                </div>
              ) : !readingData || readingData.items.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-slate-100 rounded-full p-3 w-12 h-12 mx-auto mb-4">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-slate-900 mb-2">Belum Ada Bacaan Hari Ini</h4>
                  <p className="text-sm text-slate-600">Belum ada rencana bacaan untuk hari ini. Silakan coba lagi nanti.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {readingData.completedItems.length === readingData.items.length && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <div className="flex justify-center mb-2">
                        <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-green-800 mb-1">Target Hari Ini Tercapai! 🎉</h4>
                      <p className="text-green-700">Anda telah menyelesaikan semua bacaan hari ini. Tetap konsisten!</p>
                    </div>
                  )}

                  {/* Progress Circle */}
                  <div className="flex items-center justify-center mb-6">
                    <div className="relative">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="#e2e8f0"
                          strokeWidth="12"
                          fill="none"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="#3b82f6"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 56}`}
                          strokeDashoffset={`${2 * Math.PI * 56 * (1 - (readingData.items.length ? (readingData.completedItems.length / readingData.items.length) : 0))}`}
                          className="transition-all duration-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-slate-900">
                            {readingData.completedItems.length}/{readingData.items.length}
                          </p>
                          <p className="text-xs text-slate-600">Selesai</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reading Items */}
                  <div className="space-y-3">
                    {readingData.items.map((item, index) => {
                      const isCompleted = readingData.completedItems.includes(item.id)
                      return (
                        <div
                          key={item.id}
                          className={`border rounded-lg p-4 transition-all ${
                            isCompleted 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                isCompleted 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="font-medium text-slate-900">
                                  {item.bible_books.name} {item.start_chapter}
                                  {item.end_chapter > item.start_chapter && `-${item.end_chapter}`}
                                </h4>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {isCompleted ? (
                                <div className="flex items-center text-green-600">
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                  </svg>
                                  <span className="text-sm font-medium">Selesai</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => openReader(item)}
                                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                                >
                                  Mulai Membaca
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {readingData.completedItems.length > 0 && readingData.completedItems.length < readingData.items.length && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-blue-800 mb-1">Lanjutkan, tinggal sedikit lagi! 💪</h4>
                          <p className="text-sm text-blue-700">
                            Anda sudah menyelesaikan {readingData.completedItems.length} dari {readingData.items.length} bacaan hari ini. Yuk, selesaikan yang tersisa!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Admin Section */}
          {role === 'ADMIN' && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Admin Masterdata</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <a
                    href="/admin/churches"
                    className="block p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <h4 className="font-medium text-slate-900">Master Gereja</h4>
                    <p className="text-sm text-slate-600 mt-1">Kelola data gereja</p>
                  </a>
                  <a
                    href="/admin/pastors"
                    className="block p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <h4 className="font-medium text-slate-900">Master Pendeta</h4>
                    <p className="text-sm text-slate-600 mt-1">Kelola data pendeta</p>
                  </a>
                  <a
                    href="/admin/maintenance"
                    className="block p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div>
                        <h4 className="font-medium text-slate-900">Mode Maintenance</h4>
                        <p className="text-sm text-slate-600 mt-1">Atur mode perbaikan</p>
                      </div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
