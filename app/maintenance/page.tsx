'use client'

import { useEffect, useMemo, useState } from 'react'

type MaintenanceConfig = {
  title?: string
  message?: string
  start_at?: string | null
  end_at?: string | null
}

type ApiResponse = {
  enabled: boolean
  status: 'active' | 'upcoming' | 'ended' | 'disabled'
  config: MaintenanceConfig | null
}

export default function MaintenancePage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMaintenanceConfig() {
      try {
        const res = await fetch('/api/maintenance')
        if (!res.ok) throw new Error('Failed to fetch maintenance status')
        const payload = (await res.json()) as ApiResponse
        setData(payload)
      } catch (error) {
        console.error('Failed to fetch maintenance config:', error)
        setData({
          enabled: true,
          status: 'active',
          config: {
            title: 'Sedang Dalam Perbaikan',
            message: 'Sistem sedang dalam pemeliharaan. Silakan kembali beberapa saat lagi.',
          },
        })
      } finally {
        setLoading(false)
      }
    }

    fetchMaintenanceConfig()
  }, [])

  const fallbackMessage = useMemo(() => {
    if (!data || !data.config) return null

    const startAt = data.config.start_at ? new Date(data.config.start_at) : null
    const endAt = data.config.end_at ? new Date(data.config.end_at) : null

    if (data.status === 'upcoming' && startAt) {
      return `Maintenance dijadwalkan mulai ${startAt.toLocaleString('id-ID')}.`
    }

    if (data.status === 'ended' && endAt) {
      return `Maintenance berakhir ${endAt.toLocaleString('id-ID')}.`
    }

    return data.config.message
  }, [data])

  const subheading = useMemo(() => {
    if (!data) return 'Silakan kembali beberapa saat lagi.'
    if (data.status === 'upcoming') return 'Pekerjaan dijadwalkan akan segera dimulai.'
    if (data.status === 'ended') return 'Pekerjaan pemeliharaan sudah selesai, harap refresh halaman.'
    return 'Sistem sedang dalam pemeliharaan. Terima kasih atas pengertiannya.'
  }, [data])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  const title = data?.config?.title || 'Maintenance'
  const message = fallbackMessage || subheading

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-10">
      <div className="max-w-xl w-full rounded-3xl bg-white p-8 shadow-xl shadow-slate-200">
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4m0 0v4m0-4h4m-4 0H8M12 4c-4 0-7 1.5-7 4v5c0 2.5 3 4 7 4s7-1.5 7-4V8c0-2.5-3-4-7-4z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-indigo-600 uppercase tracking-[0.3em]">
            {data?.status === 'active' ? 'Maintenance Aktif' : data?.status === 'upcoming' ? 'Coming Soon' : 'Informasi Terbaru'}
          </p>
          <p className="text-gray-600 text-base leading-relaxed">{message}</p>
          {data?.config?.start_at && (
            <p className="text-sm text-slate-500">
              Dimulai: {new Date(data.config.start_at).toLocaleString('id-ID')}
            </p>
          )}
          {data?.config?.end_at && (
            <p className="text-sm text-slate-500">
              Selesai: {new Date(data.config.end_at).toLocaleString('id-ID')}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-3 inline-flex items-center justify-center rounded-md border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
          >
            Refresh Halaman
          </button>
        </div>
        <div className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Duapasal — Sistem Baca Alkitab Harian
        </div>
      </div>
    </div>
  )
}
