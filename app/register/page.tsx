'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

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

type LocationOption = {
  id: string
  text: string
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
  const router = useRouter()
  const [form, setForm] = useState<FormState>(initialState)
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState | 'email_exists' | 'dob_day' | 'dob_year', string>>>({})
  const [churches, setChurches] = useState<ChurchOption[]>([])
  const [pastors, setPastors] = useState<PastorOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)

  const [provinces, setProvinces] = useState<LocationOption[]>([])
  const [regencies, setRegencies] = useState<LocationOption[]>([])
  const [districts, setDistricts] = useState<LocationOption[]>([])
  const [postalCodes, setPostalCodes] = useState<LocationOption[]>([])

  const [provinceId, setProvinceId] = useState<string>('')
  const [regencyId, setRegencyId] = useState<string>('')
  const [districtId, setDistrictId] = useState<string>('')

  const redirectTo = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/auth/callback`
  }, [])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete (next as any)[key]
      if (key === 'email' && (next as any).email_exists) {
        delete (next as any).email_exists
      }
      return next
    })
  }

  async function checkEmailExists(emailValue: string) {
    const email = emailValue.trim().toLowerCase()
    if (!email) return

    try {
      const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`)
      if (!res.ok) return
      const json = (await res.json()) as { exists?: boolean }
      if (json.exists) {
        setFieldErrors((prev) => ({ ...prev, email_exists: 'Akun email sudah pernah register.' }))
      } else {
        setFieldErrors((prev) => {
          if (!prev.email_exists) return prev
          const next = { ...prev }
          delete (next as any).email_exists
          return next
        })
      }
    } catch (_err) {
      // ignore
    }
  }

  function validateDobDay(dd: string) {
    const value = dd.trim()
    if (!value) return ''
    if (value.length !== 2) return 'Isi 2 digit (01-31).'
    const n = Number(value)
    if (Number.isNaN(n) || n < 1 || n > 31) return 'Isi 2 digit (01-31).'
    return ''
  }

  function validateDobYear(yyyy: string) {
    const value = yyyy.trim()
    if (!value) return ''
    if (value.length !== 4) return 'Isi 4 digit (YYYY).'
    const n = Number(value)
    const currentYear = new Date().getFullYear()
    if (Number.isNaN(n) || n < 1900 || n > currentYear) return 'Tahun tidak valid.'
    return ''
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

    async function loadProvinces() {
      try {
        const res = await fetch('/api/locations/provinces')
        const json = (await res.json()) as { data?: LocationOption[] }
        if (!cancelled) setProvinces(json.data ?? [])
      } catch (_error) {
        if (!cancelled) setProvinces([])
      }
    }

    loadOptions()
    loadProvinces()

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
    if (validateDobDay(dd) || validateDobYear(yyyy)) return ''

    const monthIndex = MONTHS.findIndex((m) => m.toLowerCase() === mm.toLowerCase())
    if (monthIndex < 0) return ''

    const monthNumber = String(monthIndex + 1).padStart(2, '0')
    return `${yyyy}-${monthNumber}-${dd}`
  }, [form.dob_day, form.dob_month, form.dob_year])

  async function registerWithEmailOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setMessage(null)
    setFieldErrors({})

    const {
      email,
      full_name,
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

    const emailTrimmed = email.trim().toLowerCase()
    if (!emailTrimmed) {
      setStatus('error')
      setFieldErrors((prev) => ({ ...prev, email: 'Email wajib diisi.' }))
      return
    }

    await checkEmailExists(emailTrimmed)
    const emailExistsNow = await (async () => {
      try {
        const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(emailTrimmed)}`)
        if (!res.ok) return false
        const json = (await res.json()) as { exists?: boolean }
        return Boolean(json.exists)
      } catch (_err) {
        return false
      }
    })()

    if (emailExistsNow) {
      setStatus('error')
      setFieldErrors((prev) => ({ ...prev, email_exists: 'Akun email sudah pernah register.' }))
      return
    }

    const ddError = validateDobDay(form.dob_day)
    const yyyyError = validateDobYear(form.dob_year)

    if (ddError || yyyyError) {
      setStatus('error')
      setFieldErrors((prev) => ({
        ...prev,
        ...(ddError ? { dob_day: ddError } : {}),
        ...(yyyyError ? { dob_year: yyyyError } : {}),
      }))
      return
    }

    if (!dobIso) {
      setStatus('error')
      setMessage('Tanggal lahir tidak valid. Pastikan bulan dipilih dan format tanggal benar.')
      return
    }

    await logEmail(emailTrimmed, 'register', 'sending', null, form)

    const { error } = await supabase.auth.signInWithOtp({
      email: emailTrimmed,
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
      await logEmail(emailTrimmed, 'register', 'error', error, form)
      return
    }

    setStatus('sent')
    setMessage(
      'Pendaftaran berhasil. Silakan cek email untuk verifikasi melalui magic link. Mengarahkan ke halaman login dalam 3 detik...',
    )
    await logEmail(emailTrimmed, 'register', 'sent', null, form)
    setForm(initialState)
    setProvinceId('')
    setRegencyId('')
    setDistrictId('')
    setRegencies([])
    setDistricts([])
    setPostalCodes([])

    setTimeout(() => {
      router.push('/login')
    }, 3000)
  }

  const isSubmitting = status === 'loading'

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <a
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          href="/login"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Login
        </a>
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
              onBlur={() => checkEmailExists(form.email)}
              type="email"
              required
              placeholder="nama@email.com"
              className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
            />
            {fieldErrors.email ? <p className="text-sm text-red-600">{fieldErrors.email}</p> : null}
            {fieldErrors.email_exists ? <p className="text-sm text-red-600">{fieldErrors.email_exists}</p> : null}
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
                onChange={(e) => {
                  const next = e.target.value.replace(/\D/g, '').slice(0, 2)
                  updateField('dob_day', next)
                }}
                onBlur={() => {
                  const err = validateDobDay(form.dob_day)
                  setFieldErrors((prev) => ({ ...prev, ...(err ? { dob_day: err } : {}) }))
                }}
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
                onChange={(e) => {
                  const next = e.target.value.replace(/\D/g, '').slice(0, 4)
                  updateField('dob_year', next)
                }}
                onBlur={() => {
                  const err = validateDobYear(form.dob_year)
                  setFieldErrors((prev) => ({ ...prev, ...(err ? { dob_year: err } : {}) }))
                }}
                type="text"
                inputMode="numeric"
                required
                placeholder="Tahun (YYYY)"
                className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
              />
            </div>
            {fieldErrors.dob_day ? <p className="text-sm text-red-600">{fieldErrors.dob_day}</p> : null}
            {fieldErrors.dob_year ? <p className="text-sm text-red-600">{fieldErrors.dob_year}</p> : null}
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
              <select
                value={provinceId}
                onChange={async (e) => {
                  const nextId = e.target.value
                  setProvinceId(nextId)
                  const nextText = provinces.find((p) => p.id === nextId)?.text ?? ''
                  updateField('province', nextText)
                  updateField('city', '')
                  updateField('district', '')
                  updateField('postal_code', '')
                  setRegencyId('')
                  setDistrictId('')
                  setRegencies([])
                  setDistricts([])
                  setPostalCodes([])

                  if (!nextId) return
                  try {
                    const res = await fetch(`/api/locations/regencies?province_id=${encodeURIComponent(nextId)}`)
                    const json = (await res.json()) as { data?: LocationOption[] }
                    setRegencies(json.data ?? [])
                  } catch (_err) {
                    setRegencies([])
                  }
                }}
                required
                className="w-full rounded border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400"
              >
                <option value="">Pilih provinsi</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.text}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Kota / Kabupaten</label>
              <select
                value={regencyId}
                onChange={async (e) => {
                  const nextId = e.target.value
                  setRegencyId(nextId)
                  const nextText = regencies.find((r) => r.id === nextId)?.text ?? ''
                  updateField('city', nextText)
                  updateField('district', '')
                  updateField('postal_code', '')
                  setDistrictId('')
                  setDistricts([])
                  setPostalCodes([])

                  if (!nextId) return
                  try {
                    const res = await fetch(`/api/locations/districts?regency_id=${encodeURIComponent(nextId)}`)
                    const json = (await res.json()) as { data?: LocationOption[] }
                    setDistricts(json.data ?? [])
                  } catch (_err) {
                    setDistricts([])
                  }
                }}
                required
                disabled={!provinceId}
                className="w-full rounded border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400 disabled:bg-slate-50"
              >
                <option value="">{provinceId ? 'Pilih kota/kabupaten' : 'Pilih provinsi dulu'}</option>
                {regencies.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.text}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Kecamatan</label>
              <select
                value={districtId}
                onChange={async (e) => {
                  const nextId = e.target.value
                  setDistrictId(nextId)
                  const nextText = districts.find((d) => d.id === nextId)?.text ?? ''
                  updateField('district', nextText)
                  updateField('postal_code', '')
                  setPostalCodes([])

                  if (!regencyId || !nextId) return
                  try {
                    const res = await fetch(
                      `/api/locations/postal-codes?regency_id=${encodeURIComponent(regencyId)}&district_id=${encodeURIComponent(nextId)}`
                    )
                    const json = (await res.json()) as { data?: LocationOption[] }
                    const nextPostalCodes = json.data ?? []
                    setPostalCodes(nextPostalCodes)
                    if (nextPostalCodes.length === 0) {
                      updateField('postal_code', '-')
                    }
                  } catch (_err) {
                    setPostalCodes([])
                    updateField('postal_code', '-')
                  }
                }}
                required
                disabled={!regencyId}
                className="w-full rounded border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400 disabled:bg-slate-50"
              >
                <option value="">{regencyId ? 'Pilih kecamatan' : 'Pilih kota dulu'}</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.text}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Kode Pos</label>
              <select
                value={form.postal_code}
                onChange={(e) => updateField('postal_code', e.target.value)}
                required={Boolean(districtId) && postalCodes.length > 0}
                disabled={!districtId}
                className="w-full rounded border border-slate-200 bg-white px-3 py-2 outline-none focus:border-indigo-400 disabled:bg-slate-50"
              >
                <option value="">{districtId ? 'Pilih kode pos' : 'Pilih kecamatan dulu'}</option>
                {districtId && postalCodes.length === 0 ? (
                  <option value="-">-</option>
                ) : null}
                {postalCodes.map((k) => (
                  <option key={k.id} value={k.text}>
                    {k.text}
                  </option>
                ))}
              </select>
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
            {isSubmitting ? 'Memproses...' : 'Daftar Sekarang'}
          </button>

          {message ? (
            <p className={status === 'error' ? 'text-sm text-red-600' : 'text-sm text-slate-700'}>{message}</p>
          ) : null}
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
