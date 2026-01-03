'use client'
export const dynamic = 'force-dynamic';

// ... sisa kode Anda
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import Header from '@/components/Header'
import { supabase } from '@/lib/supabase'
import type { VersesResponse } from '@/types/reading'

export default function ReaderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<VersesResponse | null>(null)
  const [fontSize, setFontSize] = useState(18)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bookId = searchParams.get('bookId')
  const startChapter = searchParams.get('startChapter')
  const endChapter = searchParams.get('endChapter')

  useEffect(() => {
    if (!bookId || !startChapter || !endChapter) {
      setError('Parameter pembacaan tidak lengkap')
      setLoading(false)
      return
    }

    loadVerses()
  }, [bookId, startChapter, endChapter])

  async function loadVerses() {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        bookId: bookId!,
        startChapter: startChapter!,
        endChapter: endChapter!,
      })

      const res = await fetch(`/api/reading/verses?${params}`)
      if (!res.ok) {
        throw new Error('Gagal memuat ayat Alkitab')
      }

      const versesData = await res.json() as VersesResponse
      setData(versesData)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  async function completeReading() {
    if (!data) return

    try {
      setCompleting(true)

      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token
      if (!accessToken) throw new Error('Session tidak ditemukan. Silakan login ulang.')

      // Get the plan item ID from session storage or pass it as parameter
      // For now, we'll need to find the matching plan item
      const todayJson = await fetch('/api/reading/today', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }).then((res) => res.json())

      const matchingItem = todayJson.items.find((item: any) => 
        item.book_id === parseInt(bookId!) && 
        item.start_chapter === parseInt(startChapter!) &&
        item.end_chapter === parseInt(endChapter!)
      )

      if (!matchingItem) {
        throw new Error('Tidak dapat menemukan item bacaan yang sesuai')
      }

      const res = await fetch('/api/reading/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          planItemId: matchingItem.id
        })
      })

      if (!res.ok) {
        throw new Error('Gagal menyelesaikan bacaan')
      }

      const result = await res.json()
      
      // Show success message
      if (result.dayCompleted) {
        alert(`🎉 ${result.message}\nAnda mendapatkan ${result.pointsEarned} poin!`)
      } else {
        alert(`✅ Bacaan selesai! Anda mendapatkan ${result.pointsEarned} poin.`)
      }

      // Close the reader window
      window.close()
      
      // If window doesn't close, redirect back to dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)

    } catch (error) {
      alert(error instanceof Error ? error.message : 'Gagal menyelesaikan bacaan')
    } finally {
      setCompleting(false)
    }
  }

  function adjustFontSize(delta: number) {
    setFontSize(prev => Math.max(12, Math.min(24, prev + delta)))
  }

  if (loading) {
    return (
      <div>
        <Header title="Loading..." />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-sm text-slate-600">Memuat Alkitab...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div>
        <Header title="Error" />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="bg-red-100 rounded-full p-3 w-12 h-12 mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Error</h2>
            <p className="text-sm text-slate-600 mb-4">{error || 'Data tidak ditemukan'}</p>
            <button
              onClick={() => window.close()}
              className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header 
        title={`${data.book.name} ${data.chapterRange.start}${data.chapterRange.end > data.chapterRange.start ? `-${data.chapterRange.end}` : ''}`}
        subtitle={`${data.totalVerses} ayat`}
      />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Reading Controls */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => adjustFontSize(-2)}
                  className="p-2 rounded border border-slate-200 hover:bg-slate-50"
                  title="Perkecil font"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="text-sm text-slate-600 min-w-[3rem] text-center">{fontSize}px</span>
                <button
                  onClick={() => adjustFontSize(2)}
                  className="p-2 rounded border border-slate-200 hover:bg-slate-50"
                  title="Perbesar font"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bible Content */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8">
          <div className="space-y-8" style={{ fontSize: `${fontSize}px` }}>
            {Object.entries(data.versesByChapter).map(([chapter, verses]) => (
              <div key={chapter} className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-2">
                  Pasal {chapter}
                </h2>
                <div className="space-y-3 text-slate-700 leading-relaxed font-serif">
                  {verses.map((verse, index) => (
                    <p key={verse.id} className="flex">
                      <span className="text-slate-500 font-sans font-medium mr-3 min-w-[2rem] text-right">
                        {verse.verse}.
                      </span>
                      <span className="flex-1">{verse.text}</span>
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Complete Button at Bottom */}
        <div className="mt-8 text-center">
          <button
            onClick={completeReading}
            disabled={completing}
            className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-lg font-medium"
          >
            {completing ? 'Menyimpan...' : '✓ Selesai Membaca'}
          </button>
        </div>
      </div>
    </div>
  )
}
