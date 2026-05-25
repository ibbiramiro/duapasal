'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import type { TodayReadingResponse, ReadingCalendarResponse } from '@/types/reading'

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

type TabType = 'home' | 'challenge' | 'collection' | 'settings'

export default function DashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<string>('USER')
  const [loading, setLoading] = useState(true)
  const [readingData, setReadingData] = useState<TodayReadingResponse | null>(null)
  const [readingLoading, setReadingLoading] = useState(true)

  const [calendarMonth, setCalendarMonth] = useState<string>('')
  const [calendarData, setCalendarData] = useState<ReadingCalendarResponse | null>(null)
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedReadingData, setSelectedReadingData] = useState<TodayReadingResponse | null>(null)
  const [selectedReadingLoading, setSelectedReadingLoading] = useState(false)
  const [yearlyProgress, setYearlyProgress] = useState<{ year: number, trophies: any[] } | null>(null)
  const [yearlyProgressLoading, setYearlyProgressLoading] = useState(false)

  function optimisticMarkCompleted(planItemId?: string | null) {
    if (!planItemId) return
    setReadingData((prev) => {
      if (!prev) return prev
      if (prev.completedItems.includes(planItemId)) return prev
      return {
        ...prev,
        completedItems: [...prev.completedItems, planItemId],
      }
    })
  }

  async function loadCalendar(month: string) {
    if (!month) return
    try {
      setCalendarLoading(true)
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      const res = await fetch(`/api/reading/calendar?month=${encodeURIComponent(month)}`, {
        cache: 'no-store',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      })
      if (!res.ok) return
      const json = (await res.json()) as ReadingCalendarResponse
      setCalendarData(json)
    } catch (e) {
      console.error('Failed to load reading calendar:', e)
      setCalendarData(null)
    } finally {
      setCalendarLoading(false)
    }
  }

  async function loadReadingByDate(date: string) {
    if (!date) return
    try {
      setSelectedReadingLoading(true)
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      const res = await fetch(`/api/reading/today?date=${encodeURIComponent(date)}`, {
        cache: 'no-store',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      })
      if (!res.ok) return
      const json = (await res.json()) as TodayReadingResponse
      setSelectedReadingData(json)
    } catch (e) {
      console.error('Failed to load reading by date:', e)
      setSelectedReadingData(null)
    } finally {
      setSelectedReadingLoading(false)
    }
  }

  useEffect(() => {
    if (!loading && calendarMonth && activeTab === 'challenge') {
      loadCalendar(calendarMonth)
    }
  }, [loading, calendarMonth, activeTab])

  useEffect(() => {
    if (!loading && selectedDate && activeTab === 'challenge') {
      loadReadingByDate(selectedDate)
    }
  }, [loading, selectedDate, activeTab])

  async function loadYearlyProgress() {
    try {
      setYearlyProgressLoading(true)
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      const res = await fetch(`/api/reading/yearly-progress?year=${new Date().getFullYear()}`, {
        cache: 'no-store',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      })
      if (!res.ok) return
      const json = await res.json()
      setYearlyProgress(json)
    } catch (e) {
      console.error('Failed to load yearly progress:', e)
    } finally {
      setYearlyProgressLoading(false)
    }
  }

  useEffect(() => {
    if (!loading && activeTab === 'collection' && !yearlyProgress) {
      loadYearlyProgress()
    }
  }, [loading, activeTab, yearlyProgress])

  function addMonths(month: string, delta: number) {
    const [yStr, mStr] = month.split('-')
    const y = Number(yStr)
    const m = Number(mStr)
    const next = new Date(Date.UTC(y, m - 1 + delta, 1))
    const yy = next.getUTCFullYear()
    const mm = String(next.getUTCMonth() + 1).padStart(2, '0')
    return `${yy}-${mm}`
  }

  function formatMonthTitle(month: string) {
    const [yStr, mStr] = month.split('-')
    const d = new Date(Date.UTC(Number(yStr), Number(mStr) - 1, 1))
    return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d)
  }

  function getMonthDaysCount(month: string) {
    const [yStr, mStr] = month.split('-')
    const y = Number(yStr)
    const m = Number(mStr)
    return new Date(Date.UTC(y, m, 0)).getUTCDate()
  }

  function getWeekdayIndex(date: string) {
    const d = new Date(`${date}T00:00:00`)
    return d.getDay()
  }

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
      initCalendarMonth()
    }
  }, [loading])

  function getJakartaDateString(now: Date) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now)
  }

  function initCalendarMonth() {
    const m = getJakartaDateString(new Date()).slice(0, 7)
    setCalendarMonth(m)
    setSelectedDate(getJakartaDateString(new Date()))
  }

  // Refresh when a reading is completed in another tab (reader window)
  useEffect(() => {
    if (loading) return

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'duapasal:last_reading_complete') {
        try {
          const payload = e.newValue ? JSON.parse(e.newValue) : null
          optimisticMarkCompleted(payload?.planItemId)
        } catch (_err) {
          // ignore
        }
        loadTodayReading()
      }
    }

    window.addEventListener('storage', handleStorage)

    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('duapasal')
      bc.onmessage = (event) => {
        if (event?.data?.type === 'reading_completed') {
          optimisticMarkCompleted(event?.data?.planItemId)
          loadTodayReading()
        }
      }
    } catch (_e) {
      // Ignore if BroadcastChannel is not available
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event?.data?.type === 'duapasal:reading_completed') {
        optimisticMarkCompleted(event?.data?.planItemId)
        loadTodayReading()
      }
    }
    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('message', handleMessage)
      try {
        bc?.close()
      } catch (_e) {
        // ignore
      }
    }
  }, [loading])

  // Refresh when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (!loading) loadTodayReading()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [loading, readingLoading])

  // Refresh on user interaction
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

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header title="Loading..." />
        <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  const renderHomeContent = () => (
    <div className="space-y-6">


      {/* Today's Reading */}
      <div className="bg-white rounded-xl md:rounded-lg border border-slate-200 shadow-sm">
        <div className="p-5 md:p-6">
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
                      stroke="#4f46e5"
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
                      className={`border rounded-xl md:rounded-lg p-4 transition-all ${
                        isCompleted 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap items-center space-x-3">
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
                        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                          {isCompleted ? (
                            <div className="flex items-center text-green-600">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                              </svg>
                              <span className="text-sm font-medium ml-1">Selesai</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => openReader(item)}
                              className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-700"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              </svg>
                              <span>Mulai</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {readingData.completedItems.length > 0 && readingData.completedItems.length < readingData.items.length && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl md:rounded-lg p-4">
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
    </div>
  )

  const renderChallengeContent = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl md:rounded-lg p-5 md:p-6 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium">Total Poin</p>
              <p className="text-3xl font-bold mt-1">{readingData?.userStats.totalPoints || 0}</p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-xl md:rounded-lg p-5 md:p-6 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Streak Poin</p>
              <p className="text-3xl font-bold mt-1">{readingData?.userStats.currentStreak || 0}</p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl md:rounded-lg p-5 md:p-6 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Poin Hari Ini</p>
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

      <div className="bg-white rounded-xl md:rounded-lg border border-slate-200 shadow-sm">
        <div className="p-5 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Kalender Bacaan</h3>
            <p className="mt-1 text-sm text-slate-600">
              Hari yang terlewat akan ditandai. Klik tanggal untuk melihat rincian bacaan.
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setCalendarMonth((m) => addMonths(m, -1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              &lt;
            </button>
            <div className="min-w-[9rem] text-center text-sm font-semibold text-slate-900">
              {calendarMonth ? formatMonthTitle(calendarMonth) : ''}
            </div>
            <button
              type="button"
              onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              &gt;
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="grid grid-cols-7 gap-1 text-xs font-semibold text-slate-500 mb-2">
              <div className="text-center">Min</div>
              <div className="text-center">Sen</div>
              <div className="text-center">Sel</div>
              <div className="text-center">Rab</div>
              <div className="text-center">Kam</div>
              <div className="text-center">Jum</div>
              <div className="text-center">Sab</div>
            </div>

            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {(() => {
                if (!calendarMonth) return null
                const daysCount = getMonthDaysCount(calendarMonth)
                const firstDate = `${calendarMonth}-01`
                const firstDay = getWeekdayIndex(firstDate)
                const map = new Map((calendarData?.days ?? []).map((d) => [d.date, d]))
                const today = getJakartaDateString(new Date())
                const cells: Array<JSX.Element> = []

                for (let i = 0; i < firstDay; i++) {
                  cells.push(<div key={`pad-${i}`} />)
                }

                for (let day = 1; day <= daysCount; day++) {
                  const date = `${calendarMonth}-${String(day).padStart(2, '0')}`
                  const info = map.get(date)
                  const isToday = date === today
                  const isSelected = date === selectedDate
                  const isFuture = date > today

                  const hasPlan = Boolean(info && info.total > 0)
                  const isCompleted = Boolean(info && info.total > 0 && info.completed >= info.total)
                  const isMissed = Boolean(info && info.missed)

                  const base = 'h-10 w-full rounded-lg border text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-center'

                  let cls = `${base} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`
                  if (!hasPlan) cls = `${base} border-slate-100 bg-slate-50 text-slate-400`
                  if (isCompleted) cls = `${base} border-green-200 bg-green-50 text-green-800 hover:bg-green-100`
                  if (isMissed) cls = `${base} border-red-200 bg-red-50 text-red-800 hover:bg-red-100`
                  if (isToday) cls = `${cls} ring-2 ring-indigo-500`
                  if (isSelected) cls = `${cls} ring-2 ring-slate-800 ring-offset-1`
                  if (isFuture) cls = `${base} border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed`

                  cells.push(
                    <button
                      key={date}
                      type="button"
                      className={cls}
                      disabled={isFuture}
                      onClick={() => setSelectedDate(date)}
                      title={
                        hasPlan
                          ? isCompleted
                            ? 'Selesai'
                            : isMissed
                              ? 'Terlewat'
                              : 'Belum selesai'
                          : 'Tidak ada rencana'
                      }
                    >
                      {day}
                    </button>
                  )
                }
                return cells
              })()}
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600 justify-center sm:justify-start">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-red-100 border border-red-200" />
                Terlewat
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-green-100 border border-green-200" />
                Selesai
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-slate-50 border border-slate-100" />
                Tidak ada rencana
              </div>
            </div>

            {calendarLoading ? (
              <div className="mt-4 text-sm text-slate-500 text-center sm:text-left">Memuat kalender...</div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Bacaan: {selectedDate || '-'}</div>
                <div className="mt-1 text-xs text-slate-600">Mulai membaca atau mengejar hari terlewat.</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const today = getJakartaDateString(new Date())
                  setSelectedDate(today)
                  setCalendarMonth(today.slice(0, 7))
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Hari Ini
              </button>
            </div>

            {selectedReadingLoading ? (
              <div className="mt-4 text-sm text-slate-600">Memuat bacaan...</div>
            ) : !selectedReadingData || selectedReadingData.items.length === 0 ? (
              <div className="mt-4 text-sm text-slate-600 flex-1 flex items-center justify-center">
                Tidak ada bacaan untuk tanggal ini.
              </div>
            ) : (
              <div className="mt-2 space-y-2 flex-1">
                {selectedReadingData.items.map((item, idx) => {
                  const isCompleted = selectedReadingData.completedItems.includes(item.id)
                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border px-3 py-3 sm:py-2 ${
                        isCompleted ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {idx + 1}. {item.bible_books.name} {item.start_chapter}
                          {item.end_chapter > item.start_chapter && `-${item.end_chapter}`}
                        </div>
                        <div className="text-xs text-slate-500">
                          {isCompleted ? 'Selesai' : 'Belum selesai'}
                        </div>
                      </div>
                      {!isCompleted ? (
                        <button
                          type="button"
                          onClick={() => openReader(item)}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                        >
                          Mulai
                        </button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  )

  const renderCollectionContent = () => (
    <div className="space-y-6">
      {role === 'ADMIN' ? (
        <div className="bg-white rounded-xl md:rounded-lg border border-slate-200 shadow-sm">
          <div className="p-5 md:p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Admin Masterdata</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <a
                href="/admin/churches"
                className="block p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <h4 className="font-medium text-slate-900">Master Gereja</h4>
                </div>
                <p className="text-sm text-slate-600">Kelola data gereja</p>
              </a>
              <a
                href="/admin/pastors"
                className="block p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h4 className="font-medium text-slate-900">Master Pendeta</h4>
                </div>
                <p className="text-sm text-slate-600">Kelola data pendeta</p>
              </a>
              <a
                href="/admin/maintenance"
                className="block p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h4 className="font-medium text-slate-900">Mode Maintenance</h4>
                </div>
                <p className="text-sm text-slate-600">Atur mode perbaikan</p>
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Records Section */}
          <section>
            <h3 className="text-lg font-semibold text-indigo-900 mb-4 px-1">Records</h3>
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm border border-slate-100 text-center">
                <div className="text-4xl mb-2">🔥</div>
                <div className="font-bold text-xl text-slate-800">{readingData?.userStats.longestStreak || 0}</div>
                <div className="text-[10px] md:text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Longest Streak</div>
              </div>
              <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm border border-slate-100 text-center">
                <div className="text-4xl mb-2">👑</div>
                <div className="font-bold text-xl text-slate-800">{readingData?.userStats.currentStreak || 0}</div>
                <div className="text-[10px] md:text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Highest Win Streak</div>
              </div>
              <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm border border-slate-100 text-center">
                <div className="text-4xl mb-2">🏆</div>
                <div className="font-bold text-xl text-slate-800">{Math.floor((readingData?.userStats.totalPoints || 0) / 100)}</div>
                <div className="text-[10px] md:text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">Most Wins</div>
              </div>
            </div>
          </section>

          {/* Awards Section */}
          <section>
            <h3 className="text-lg font-semibold text-indigo-900 mb-4 px-1">Awards</h3>
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm border border-slate-100 text-center">
                <div className="text-4xl mb-2 relative">
                  ⭐
                  <div className="absolute -bottom-2 -right-2 bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white">
                    {Math.min(10, Math.floor((readingData?.userStats.totalPoints || 0) / 100))}
                  </div>
                </div>
                <div className="font-bold text-sm text-slate-800 mt-3">Level Legend</div>
                <div className="text-[10px] md:text-xs text-slate-500 mt-1">{Math.min(10, Math.floor((readingData?.userStats.totalPoints || 0) / 100))} of 10</div>
              </div>
              <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm border border-slate-100 text-center">
                <div className="text-4xl mb-2 relative">
                  🎯
                  <div className="absolute -bottom-2 -right-2 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white">
                    {Math.min(10, Math.floor((readingData?.userStats.currentStreak || 0) / 7))}
                  </div>
                </div>
                <div className="font-bold text-sm text-slate-800 mt-3">Perfect Play</div>
                <div className="text-[10px] md:text-xs text-slate-500 mt-1">{Math.min(10, Math.floor((readingData?.userStats.currentStreak || 0) / 7))} of 10</div>
              </div>
              <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm border border-slate-100 text-center opacity-75">
                <div className="text-4xl mb-2 grayscale">
                  🛡️
                </div>
                <div className="font-bold text-sm text-slate-800 mt-3">Unstoppable</div>
                <div className="text-[10px] md:text-xs text-slate-500 mt-1">Locked</div>
              </div>
            </div>
          </section>

          {/* Challenge Trophies Section */}
          <section>
            <h3 className="text-lg font-semibold text-indigo-900 mb-4 px-1">Challenge Trophies</h3>
            <p className="text-xs font-semibold text-slate-500 px-1 mb-4 -mt-2">{yearlyProgress?.year || 2026}</p>
            {yearlyProgressLoading ? (
              <div className="text-center py-4 text-slate-500 text-sm">Memuat piala...</div>
            ) : (
              <div className="grid grid-cols-3 gap-3 md:gap-4">
                {(yearlyProgress?.trophies || [
                  { month: 'January', total: 31, earned: 0, isCompleted: false },
                  { month: 'February', total: 28, earned: 0, isCompleted: false },
                  { month: 'March', total: 31, earned: 0, isCompleted: false },
                  { month: 'April', total: 30, earned: 0, isCompleted: false },
                  { month: 'May', total: 31, earned: 0, isCompleted: false },
                ]).map((item: any, index: number) => (
                  <div key={index} className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm border border-slate-100 text-center">
                    <div className={`text-4xl mb-2 ${!item.isCompleted ? 'opacity-50 grayscale' : ''}`}>
                      🏆
                    </div>
                    <div className="font-bold text-sm text-slate-800 mt-2">{item.month}</div>
                    <div className="text-[10px] md:text-xs text-slate-500 mt-1">{item.earned} of {item.total}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )

  const renderSettingsContent = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl md:rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 text-center bg-indigo-50 border-b border-slate-200">
          <div className="w-24 h-24 bg-indigo-600 rounded-full mx-auto flex items-center justify-center text-3xl font-bold text-white shadow-md">
            {email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <h2 className="mt-4 text-xl font-semibold text-slate-900">{email}</h2>
          <p className="text-sm text-slate-600">{role === 'ADMIN' ? 'Administrator' : 'User'}</p>
        </div>
        
        <div className="p-4 md:p-6 space-y-3">
          <a
            href="/profile"
            className="flex items-center justify-between w-full p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center text-slate-700">
              <svg className="w-5 h-5 mr-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="font-medium">Edit Profil</span>
            </div>
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
          
          <button
            onClick={logout}
            className="flex items-center justify-between w-full p-4 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors text-red-700"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-medium">Logout</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header 
        title={
          activeTab === 'home' ? 'Reading Hub' :
          activeTab === 'challenge' ? 'Challenge' :
          activeTab === 'collection' ? 'Collection' : 'Settings'
        } 
        subtitle={activeTab === 'home' ? `Selamat datang kembali, ${email?.split('@')[0] || 'User'}!` : undefined}
      />
      
      {/* Main Content Area - with padding bottom for mobile nav */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24 md:pb-8">
        {activeTab === 'home' && renderHomeContent()}
        {activeTab === 'challenge' && renderChallengeContent()}
        {activeTab === 'collection' && renderCollectionContent()}
        {activeTab === 'settings' && renderSettingsContent()}
      </div>

      {/* Bottom/Tab Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:sticky md:bottom-0">
        <div className="max-w-md md:max-w-3xl mx-auto px-2 md:px-0">
          <nav className="flex items-center justify-around md:justify-center md:space-x-12 h-16 md:h-16">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                activeTab === 'home' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <svg className={`w-6 h-6 ${activeTab === 'home' ? 'fill-current' : ''}`} fill={activeTab === 'home' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'home' ? 1.5 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-[10px] md:text-xs font-medium">Home</span>
            </button>
            
            <button
              onClick={() => setActiveTab('challenge')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                activeTab === 'challenge' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <svg className={`w-6 h-6 ${activeTab === 'challenge' ? 'fill-current' : ''}`} fill={activeTab === 'challenge' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'challenge' ? 1.5 : 2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[10px] md:text-xs font-medium">Challenge</span>
            </button>
            
            <button
              onClick={() => setActiveTab('collection')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                activeTab === 'collection' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <svg className={`w-6 h-6 ${activeTab === 'collection' ? 'fill-current' : ''}`} fill={activeTab === 'collection' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'collection' ? 1.5 : 2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span className="text-[10px] md:text-xs font-medium">Collection</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                activeTab === 'settings' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <svg className={`w-6 h-6 ${activeTab === 'settings' ? 'fill-current' : ''}`} fill={activeTab === 'settings' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'settings' ? 1.5 : 2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'settings' ? 1.5 : 2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[10px] md:text-xs font-medium">Settings</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}
