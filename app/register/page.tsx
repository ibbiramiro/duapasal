'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { useSupabase } from '@/components/supabase-provider'
import { logEmail } from '@/lib/email'

type FormState = {
  email: string
  full_name: string
  dob_day: string
  dob_month: string
  dob_year: string
  phone: string
  address_line: string
  province: string
  city: string
  district: string
  postal_code: string
  church_id: string
  pastor_id: string
  reminder_opt_in: boolean
}

const initialState: FormState = {
  email: '',
  full_name: '',
  dob_day: '',
  dob_month: '',
  dob_year: '',
  phone: '',
  address_line: '',
  province: '',
  city: '',
  district: '',
  postal_code: '',
  church_id: '',
  pastor_id: '',
  reminder_opt_in: true,
}

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

export default function RegisterPage() {
  const supabase = useSupabase()
  const [form, setForm] = useState<FormState>(initialState)
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [churches, setChurches] = useState<ChurchOption[]>([])
  const [pastors, setPastors] = useState<PastorOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)

  const redirectTo = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/auth/callback`
  }, [])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    let cancelled = false

    async function loadOptions() {
      setLoadingOptions(true)
      try {
        const [churchRes, pastorRes] = await Promise.all([
          fetch('/api/lookups/churches'),
          fetch('/api/lookups/pastors'),
        ])

        const churchJson = (await churchRes.json()) as { data?: ChurchOption[] }
        const pastorJson = (await pastorRes.json()) as { data?: PastorOption[] }

        if (!cancelled) {
          setChurches(churchJson.data ?? [])
          setPastors(pastorJson.data ?? [])
        }
      } catch (_error) {
        if (!cancelled) {
          setChurches([])
          setPastors([])
        }
      } finally {
        if (!cancelled) setLoadingOptions(false)
      }
    }

    loadOptions()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredPastors = useMemo(() => {
    if (!form.church_id) return pastors.filter(p => p.is_main_pastor === true)
    return pastors.filter((p) => p.church_id === form.church_id && p.is_main_pastor === true)
  }, [pastors, form.church_id])

  const dobIso = useMemo(() => {
    const dd = form.dob_day.trim()
    const mm = form.dob_month.trim()
    const yyyy = form.dob_year.trim()

    if (!dd || !mm || !yyyy) return ''
    if (dd.length !== 2 || yyyy.length !== 4) return ''

    const monthIndex = MONTHS.findIndex((m) => m.toLowerCase() === mm.toLowerCase())
    if (monthIndex < 0) return ''

    const monthNumber = String(monthIndex + 1).padStart(2, '0')
    return `${yyyy}-${monthNumber}-${dd}`
  }, [form.dob_day, form.dob_month, form.dob_year])

  async function registerWithEmailOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setMessage(null)

    const {
      email,
      full_name,
      dob_day,
      dob_month,
      dob_year,
      phone,
      address_line,
      province,
      city,
      district,
      postal_code,
      church_id,
      pastor_id,
      reminder_opt_in,
    } = form

    if (!dobIso) {
      setStatus('error')
      setMessage('Tanggal lahir tidak valid. Pastikan tanggal 2 digit, bulan sesuai pilihan, tahun 4 digit.')
      return
    }

    await logEmail(email, 'register', 'sending', null, form)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name,
          dob: dobIso,
          phone,
          full_address: address_line,
          province,
          city_regency: city,
          district,
          postal_code,
          church_id: church_id || null,
          pastor_id: pastor_id || null,
          reminder_opt_in,
        },
      },
    })

    if (error) {
      setStatus('error')
      const readable =
        error.message === 'Error sending magic link email'
          ? 'Supabase tidak dapat mengirim email. Pastikan SMTP service sudah dikonfigurasi di Auth Settings.'
          : error.message
      setMessage(readable)
      await logEmail(email, 'register', 'error', error, form)
      return
    }

    setStatus('sent')
    setMessage(
      'Akun berhasil didaftarkan. Silakan cek email untuk verifikasi melalui magic link sebelum login.',
    )
    await logEmail(email, 'register', 'sent', null, form)
    setForm(initialState)
  }

  const isSubmitting = status === 'loading'

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Daftar Akun Jemaat</h1>
        <p className="text-sm text-slate-600">
          Isi informasi dasar Anda, kami akan mengirimkan magic link untuk verifikasi email.
        </p>
      </div>

      <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
        <form className="grid gap-4" onSubmit={registerWithEmailOtp}>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Email</label>
            <input
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              type="email"
              required
              placeholder="nama@email.com"
              className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Nama Lengkap</label>
            <input
              value={form.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
              type="text"
              required
              placeholder="Nama sesuai identitas"
              className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Tanggal Lahir</label>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <input
                value={form.dob_day}
                onChange={(e) => updateField('dob_day', e.target.value.replace(/\D/g, '').slice(0, 2))}
                type="text"
                inputMode="numeric"
                required
                placeholder="Tanggal (DD)"
                className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
              />
              <select
                value={form.dob_month}
                onChange={(e) => updateField('dob_month', e.target.value)}
                required
                className="w-full rounded border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
              >
                <option value="">Pilih bulan</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                value={form.dob_year}
                onChange={(e) => updateField('dob_year', e.target.value.replace(/\D/g, '').slice(0, 4))}
                type="text"
                inputMode="numeric"
                required
                placeholder="Tahun (YYYY)"
                className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Nomor Telepon</label>
            <input
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              type="tel"
              required
              placeholder="08xxxxxxxxxx"
              className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
            />
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Cabang Gereja</label>
              <select
                value={form.church_id}
                onChange={(e) => {
                  updateField('church_id', e.target.value)
                  updateField('pastor_id', '')
                }}
                className="w-full rounded border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
              >
                <option value="">{loadingOptions ? 'Memuat...' : 'Pilih gereja'}</option>
                {churches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.city_regency ? ` - ${c.city_regency}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Pendeta Naungan</label>
              <select
                value={form.pastor_id}
                onChange={(e) => updateField('pastor_id', e.target.value)}
                className="w-full rounded border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
              >
                <option value="">{loadingOptions ? 'Memuat...' : 'Pilih pendeta utama'}</option>
                {filteredPastors.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.is_main_pastor ? '(Pendeta Utama)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Provinsi</label>
              <input
                value={form.province}
                onChange={(e) => updateField('province', e.target.value)}
                type="text"
                placeholder="Contoh: DKI Jakarta"
                className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Kota / Kabupaten</label>
              <input
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                type="text"
                placeholder="Contoh: Jakarta Selatan"
                className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Kecamatan</label>
              <input
                value={form.district}
                onChange={(e) => updateField('district', e.target.value)}
                type="text"
                placeholder="Contoh: Kebayoran Baru"
                className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Kode Pos</label>
              <input
                value={form.postal_code}
                onChange={(e) => updateField('postal_code', e.target.value)}
                type="text"
                placeholder="Contoh: 12190"
                className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Alamat Lengkap</label>
            <textarea
              value={form.address_line}
              onChange={(e) => updateField('address_line', e.target.value)}
              required
              placeholder="Jalan, komplek, nomor rumah"
              className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
              rows={3}
            />
          </div>

          <label className="flex items-start gap-3 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.reminder_opt_in}
              onChange={(e) => updateField('reminder_opt_in', e.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block font-medium text-slate-800">Reminder Email</span>
              <span className="text-slate-600">
                Terima pengingat harian untuk membaca Alkitab dari Duapasal.
              </span>
            </span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-60"
          >
            {isSubmitting ? 'Mengirim...' : 'Kirim Magic Link'}
          </button>

          {message ? <p className="text-sm text-slate-700">{message}</p> : null}
        </form>
      </div>

      <p className="text-sm text-slate-600">
        Sudah punya akun?{' '}
        <a className="text-indigo-700 underline" href="/login">
          Login
        </a>
      </p>
    </div>
  )
}
