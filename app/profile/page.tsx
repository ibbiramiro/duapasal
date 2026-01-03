'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'

type ChurchOption = {
  id: string
  name: string
  city_regency: string | null
}

type PastorOption = {
  id: string
  name: string
  church_id: string | null
  is_main_pastor: boolean
}

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  dob: string | null
  role: string | null
  church_id: string | null
  pastor_id: string | null
  province: string | null
  city_regency: string | null
  district: string | null
  postal_code: string | null
  full_address: string | null
  email_reminder_enabled: boolean | null
}

type MeResponse = {
  user?: {
    id: string
    email: string | null
  } | null
  profile?: ProfileRow | null
  error?: string
}

const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

function splitDob(dob: string | null) {
  if (!dob) return { day: '', month: '', year: '' }
  const parts = dob.split('-')
  if (parts.length !== 3) return { day: '', month: '', year: '' }
  const [yyyy, mm, dd] = parts
  const monthNumber = Number(mm)
  const monthName = monthNumber >= 1 && monthNumber <= 12 ? MONTHS[monthNumber - 1] : ''
  return { day: dd ?? '', month: monthName, year: yyyy ?? '' }
}

function composeDob(day: string, month: string, year: string) {
  const dd = day.trim()
  const mm = month.trim()
  const yyyy = year.trim()
  if (!dd || !mm || !yyyy) return ''
  if (dd.length !== 2 || yyyy.length !== 4) return ''
  const monthIndex = MONTHS.findIndex((m) => m.toLowerCase() === mm.toLowerCase())
  if (monthIndex < 0) return ''
  const monthNumber = String(monthIndex + 1).padStart(2, '0')
  return `${yyyy}-${monthNumber}-${dd}`
}

export default function ProfilePage() {
  const router = useRouter()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [churches, setChurches] = useState<ChurchOption[]>([])
  const [pastors, setPastors] = useState<PastorOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const initialDob = useMemo(() => splitDob(me?.profile?.dob ?? null), [me?.profile?.dob])

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    dob_day: '',
    dob_month: '',
    dob_year: '',
    church_id: '',
    pastor_id: '',
    province: '',
    city_regency: '',
    district: '',
    postal_code: '',
    full_address: '',
    email_reminder_enabled: true,
  })

  useEffect(() => {
    if (!me?.profile) return

    setForm((prev) => ({
      ...prev,
      full_name: me.profile?.full_name ?? '',
      phone: me.profile?.phone ?? '',
      dob_day: initialDob.day,
      dob_month: initialDob.month,
      dob_year: initialDob.year,
      church_id: me.profile?.church_id ?? '',
      pastor_id: me.profile?.pastor_id ?? '',
      province: me.profile?.province ?? '',
      city_regency: me.profile?.city_regency ?? '',
      district: me.profile?.district ?? '',
      postal_code: me.profile?.postal_code ?? '',
      full_address: me.profile?.full_address ?? '',
      email_reminder_enabled: me.profile?.email_reminder_enabled ?? true,
    }))
  }, [me?.profile, initialDob.day, initialDob.month, initialDob.year])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        console.log('[Profile] Loading profile data...')
        
        const { data: sessionData } = await supabase.auth.getSession()
        console.log('[Profile] Session data:', sessionData.session?.user?.email)
        
        const accessToken = sessionData.session?.access_token

        const [meRes, churchesRes, pastorsRes] = await Promise.all([
          fetch('/api/me', {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          }),
          fetch('/api/lookups/churches'),
          fetch('/api/lookups/pastors'),
        ])

        console.log('[Profile] API responses:', {
          meStatus: meRes.status,
          churchesStatus: churchesRes.status,
          pastorsStatus: pastorsRes.status
        })

        const meJson = (await meRes.json()) as MeResponse
        const churchesJson = (await churchesRes.json()) as { data?: ChurchOption[] }
        const pastorsJson = (await pastorsRes.json()) as { data?: PastorOption[] }

        console.log('[Profile] Me response:', meJson)
        console.log('[Profile] Churches count:', churchesJson.data?.length)
        console.log('[Profile] Pastors count:', pastorsJson.data?.length)

        if (!meRes.ok || !meJson.user) {
          console.log('[Profile] No user found, redirecting to login')
          router.replace('/login')
          return
        }

        if (!cancelled) {
          setMe(meJson)
          setChurches(churchesJson.data ?? [])
          setPastors(pastorsJson.data ?? [])
          console.log('[Profile] Profile data loaded successfully')
        }
      } catch (error) {
        console.error('[Profile] Failed to load profile data:', error)
      } finally {
        setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredPastors = useMemo(() => {
    if (!form.church_id) return []
    // Hanya tampilkan pendeta utama (is_main_pastor = true) dari gereja yang dipilih
    return pastors.filter((p) => p.church_id === form.church_id && p.is_main_pastor === true)
  }, [pastors, form.church_id])

  function updateField<K extends keyof typeof form>(field: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token

      const dobIso = composeDob(form.dob_day, form.dob_month, form.dob_year)

      const payload = {
        full_name: form.full_name.trim() || null,
        phone: form.phone.trim() || null,
        dob: dobIso || null,
        church_id: form.church_id || null,
        pastor_id: form.pastor_id || null,
        province: form.province.trim() || null,
        city_regency: form.city_regency.trim() || null,
        district: form.district.trim() || null,
        postal_code: form.postal_code.trim() || null,
        full_address: form.full_address.trim() || null,
        email_reminder_enabled: form.email_reminder_enabled,
      }

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Gagal memperbarui profil')
      }

      setMessage('Profil berhasil diperbarui!')

      // Reload data to show updated values
      const { data: sessionData2 } = await supabase.auth.getSession()
      const accessToken2 = sessionData2.session?.access_token
      const meRes = await fetch('/api/me', {
        headers: accessToken2 ? { Authorization: `Bearer ${accessToken2}` } : undefined,
      })
      const meJson = (await meRes.json()) as MeResponse
      setMe(meJson)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Header title="Loading..." />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-sm text-slate-600">Loading profile...</p>
          </div>
        </div>
      </div>
    )
  }

  // Check if user data exists
  if (!me?.user) {
    return (
      <div>
        <Header title="Error" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="rounded-full bg-red-100 p-3 w-12 h-12 mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">User Data Not Found</h2>
            <p className="text-sm text-slate-600 mb-4">Unable to load your profile information.</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header
        title="Edit Profile"
        subtitle="Perbarui informasi profil Anda"
        showBackButton={true}
        backHref="/dashboard"
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Role Indicator */}
        {me?.profile?.role && (
          <div className="mb-6">
            <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              me.profile.role === 'ADMIN' 
                ? 'bg-purple-100 text-purple-800' 
                : me.profile.role === 'PASTOR'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {me.profile.role === 'ADMIN' && 'Administrator'}
              {me.profile.role === 'PASTOR' && 'Pendeta'}
              {me.profile.role === 'USER' && 'User'}
              {me.profile.role === 'PENGURUS' && 'Pengurus Gereja'}
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={me?.user?.email ?? ''}
                disabled
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500"
                readOnly
              />
              <p className="mt-1 text-xs text-slate-500">Email tidak dapat diubah</p>
            </div>

            {/* Nama Lengkap */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => updateField('full_name', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Masukkan nama lengkap"
              />
            </div>

            {/* Tanggal Lahir */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Lahir</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={form.dob_day}
                  onChange={(e) => updateField('dob_day', e.target.value)}
                  placeholder="DD"
                  maxLength={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <select
                  value={form.dob_month}
                  onChange={(e) => updateField('dob_month', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Bulan</option>
                  {MONTHS.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={form.dob_year}
                  onChange={(e) => updateField('dob_year', e.target.value)}
                  placeholder="YYYY"
                  maxLength={4}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* No HP */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">No HP</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="08xxxxxxxxxx"
              />
            </div>

            {/* Gereja dan Pendeta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gereja - hanya untuk pendeta utama */}
              {me?.profile?.role === 'PASTOR' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Cabang Gereja
                    <span className="ml-1 text-xs text-indigo-600 font-medium">(Pendeta Utama)</span>
                  </label>
                  <select
                    value={form.church_id}
                    onChange={(e) => {
                      updateField('church_id', e.target.value)
                      updateField('pastor_id', '')
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Pilih cabang gereja</option>
                    {churches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.city_regency ? ` - ${c.city_regency}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Sebagai pendeta utama, Anda dapat memilih cabang gereja yang Anda layani
                  </p>
                </div>
              )}
              
              {/* Gereja - untuk user biasa (read-only jika sudah ada) */}
              {me?.profile?.role !== 'PASTOR' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gereja</label>
                  {form.church_id ? (
                    <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                      {churches.find(c => c.id === form.church_id)?.name || 'Gereja tidak ditemukan'}
                    </div>
                  ) : (
                    <select
                      value={form.church_id}
                      onChange={(e) => {
                        updateField('church_id', e.target.value)
                        updateField('pastor_id', '')
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Pilih gereja</option>
                      {churches.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.city_regency ? ` - ${c.city_regency}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              
              {/* Pendeta */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pendeta Utama</label>
                <select
                  value={form.pastor_id}
                  onChange={(e) => updateField('pastor_id', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={!form.church_id}
                >
                  <option value="">Pilih pendeta utama</option>
                  {filteredPastors.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {!form.church_id && (
                  <p className="mt-1 text-xs text-slate-500">Pilih gereja terlebih dahulu</p>
                )}
                {form.church_id && filteredPastors.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">Belum ada pendeta utama untuk gereja ini</p>
                )}
              </div>
            </div>

            {/* Alamat */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Provinsi</label>
                  <input
                    type="text"
                    value={form.province}
                    onChange={(e) => updateField('province', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Masukkan provinsi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kota / Kabupaten</label>
                  <input
                    type="text"
                    value={form.city_regency}
                    onChange={(e) => updateField('city_regency', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Masukkan kota/kabupaten"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kecamatan</label>
                  <input
                    type="text"
                    value={form.district}
                    onChange={(e) => updateField('district', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Masukkan kecamatan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kode Pos</label>
                  <input
                    type="text"
                    value={form.postal_code}
                    onChange={(e) => updateField('postal_code', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Masukkan kode pos"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Alamat Lengkap</label>
                <textarea
                  value={form.full_address}
                  onChange={(e) => updateField('full_address', e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Jalan, nomor, RT/RW, kelurahan, dll."
                />
              </div>
            </div>

            {/* Email Reminder */}
            <div className="flex items-start space-x-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                id="email_reminder"
                checked={form.email_reminder_enabled}
                onChange={(e) => updateField('email_reminder_enabled', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <label htmlFor="email_reminder" className="block text-sm font-medium text-slate-900">
                  Reminder Email
                </label>
                <p className="text-sm text-slate-600">
                  Terima pengingat harian untuk membaca Alkitab dari Duapasal.
                </p>
              </div>
            </div>

            {/* Message */}
            {message && (
              <div className={`rounded-lg p-4 ${
                message.includes('berhasil')
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <p className="text-sm font-medium">{message}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-white font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Menyimpan...' : 'Update Data'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
