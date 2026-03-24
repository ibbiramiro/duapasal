'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { supabase } from '@/lib/supabase'

type FormState = {
  email: string
  full_name: string
  dob: string
  phone: string
  address_line: string
  province: string
  province_id: string
  city: string
  regency_id: string
  district: string
  district_id: string
  village: string
  village_id: string
  church_branch: string
  pastor_name: string
  reminder_opt_in: boolean
  password: string
  confirmPassword: string
}

const initialState: FormState = {
  email: '',
  full_name: '',
  dob: '',
  phone: '',
  address_line: '',
  province: '',
  province_id: '',
  city: '',
  regency_id: '',
  district: '',
  district_id: '',
  village: '',
  village_id: '',
  church_branch: '',
  pastor_name: '',
  reminder_opt_in: true,
  password: '',
  confirmPassword: '',
}

type RegionOption = {
  id: string
  name: string
}

type ComboboxOption = {
  value: string
  label: string
}

function Combobox({
  label,
  value,
  options,
  placeholder,
  emptyText,
  disabled,
  onChange,
}: {
  label: string
  value: string
  options: ComboboxOption[]
  placeholder: string
  emptyText: string
  disabled?: boolean
  onChange: (nextValue: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  return (
    <div className="relative grid gap-2">
      <label className="text-sm font-medium">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 text-left text-sm outline-none focus:border-indigo-400 disabled:bg-slate-50 disabled:text-slate-400"
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>
          {value || placeholder}
        </span>
        <span className="ml-2 text-slate-500">▾</span>
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded border border-slate-200 bg-white shadow-lg">
          <div className="p-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari..."
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-auto p-1">
            {filtered.length ? (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.label)
                    setOpen(false)
                  }}
                  className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100 ${
                    opt.label === value ? 'bg-slate-100' : ''
                  }`}
                >
                  {opt.label}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-slate-500">{emptyText}</div>
            )}
          </div>
          <div className="border-t border-slate-200 p-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Tutup
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>(initialState)
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const [provinces, setProvinces] = useState<RegionOption[]>([])
  const [regencies, setRegencies] = useState<RegionOption[]>([])
  const [districts, setDistricts] = useState<RegionOption[]>([])
  const [villages, setVillages] = useState<RegionOption[]>([])

  const [churches, setChurches] = useState<RegionOption[]>([])
  const [pastors, setPastors] = useState<RegionOption[]>([])

  const redirectTo = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/auth/callback`
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadChurchesAndPastors() {
      const [churchResult, pastorResult] = await Promise.all([
        supabase.from('churches').select('id,name').order('name', { ascending: true }),
        supabase.from('pastors').select('id,name').order('name', { ascending: true }),
      ])

      if (!mounted) return

      if (churchResult.error) {
        setMessage(churchResult.error.message)
      } else {
        setChurches((churchResult.data ?? []) as RegionOption[])
      }

      if (pastorResult.error) {
        setMessage(pastorResult.error.message)
      } else {
        setPastors((pastorResult.data ?? []) as RegionOption[])
      }
    }

    void loadChurchesAndPastors()

    return () => {
      mounted = false
    }
  }, [])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    let mounted = true

    async function loadProvinces() {
      const { data, error } = await supabase
        .from('provinces')
        .select('id,name')
        .order('name', { ascending: true })

      if (!mounted) return

      if (error) {
        setMessage(error.message)
        return
      }

      setProvinces((data ?? []) as RegionOption[])
    }

    void loadProvinces()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadRegencies() {
      if (!form.province_id) {
        setRegencies([])
        return
      }

      const { data, error } = await supabase
        .from('regencies')
        .select('id,name')
        .eq('province_id', form.province_id)
        .order('name', { ascending: true })

      if (!mounted) return

      if (error) {
        setMessage(error.message)
        return
      }

      setRegencies((data ?? []) as RegionOption[])
    }

    void loadRegencies()

    return () => {
      mounted = false
    }
  }, [form.province_id])

  useEffect(() => {
    let mounted = true

    async function loadDistricts() {
      if (!form.regency_id) {
        setDistricts([])
        return
      }

      const { data, error } = await supabase
        .from('districts')
        .select('id,name')
        .eq('regency_id', form.regency_id)
        .order('name', { ascending: true })

      if (!mounted) return

      if (error) {
        setMessage(error.message)
        return
      }

      setDistricts((data ?? []) as RegionOption[])
    }

    void loadDistricts()

    return () => {
      mounted = false
    }
  }, [form.regency_id])

  useEffect(() => {
    let mounted = true

    async function loadVillages() {
      if (!form.district_id) {
        setVillages([])
        return
      }

      const { data, error } = await supabase
        .from('villages')
        .select('id,name')
        .eq('district_id', form.district_id)
        .order('name', { ascending: true })

      if (!mounted) return

      if (error) {
        setMessage(error.message)
        return
      }

      setVillages((data ?? []) as RegionOption[])
    }

    void loadVillages()

    return () => {
      mounted = false
    }
  }, [form.district_id])

  function findIdByName(options: RegionOption[], name: string) {
    const cleaned = name.trim().toLowerCase()
    if (!cleaned) return ''
    return options.find((o) => o.name.toLowerCase() === cleaned)?.id ?? ''
  }

  const provinceOptions = useMemo<ComboboxOption[]>(
    () => provinces.map((p) => ({ value: p.id, label: p.name })),
    [provinces],
  )

  const regencyOptions = useMemo<ComboboxOption[]>(
    () => regencies.map((r) => ({ value: r.id, label: r.name })),
    [regencies],
  )

  const districtOptions = useMemo<ComboboxOption[]>(
    () => districts.map((d) => ({ value: d.id, label: d.name })),
    [districts],
  )

  const villageOptions = useMemo<ComboboxOption[]>(
    () => villages.map((v) => ({ value: v.id, label: v.name })),
    [villages],
  )

  const churchOptions = useMemo<ComboboxOption[]>(
    () => churches.map((c) => ({ value: c.id, label: c.name })),
    [churches],
  )

  const pastorOptions = useMemo<ComboboxOption[]>(
    () => pastors.map((p) => ({ value: p.id, label: p.name })),
    [pastors],
  )

  async function registerWithEmailOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setMessage(null)

    const {
      email,
      full_name,
      dob,
      phone,
      address_line,
      province,
      province_id,
      city,
      regency_id,
      district,
      district_id,
      village,
      village_id,
      church_branch,
      pastor_name,
      reminder_opt_in,
      password,
      confirmPassword,
    } = form

    if (password.length < 6) {
      setStatus('error')
      setMessage('Password minimal 6 karakter.')
      return
    }

    if (password !== confirmPassword) {
      setStatus('error')
      setMessage('Konfirmasi password tidak sama.')
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name,
          dob,
          phone,
          address_line,
          province,
          province_id,
          city,
          regency_id,
          district,
          district_id,
          village,
          village_id,
          church_branch,
          pastor_name,
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
      return
    }

    setStatus('sent')
    setMessage(
      'Akun berhasil didaftarkan. Silakan cek email untuk verifikasi melalui magic link sebelum login.',
    )
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
            <input
              value={form.dob}
              onChange={(e) => updateField('dob', e.target.value)}
              type="date"
              required
              className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
            />
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
              <Combobox
                label="Cabang Gereja"
                value={form.church_branch}
                options={churchOptions}
                placeholder="Pilih cabang gereja"
                emptyText="Tidak ada data gereja"
                onChange={(label) => updateField('church_branch', label)}
              />
            </div>
            <Combobox
              label="Pendeta Naungan"
              value={form.pastor_name}
              options={pastorOptions}
              placeholder="Pilih pendeta"
              emptyText="Tidak ada data pendeta"
              onChange={(label) => updateField('pastor_name', label)}
            />
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <Combobox
              label="Provinsi"
              value={form.province}
              options={provinceOptions}
              placeholder="Pilih provinsi"
              emptyText="Tidak ada data provinsi"
              onChange={(label) => {
                const id = findIdByName(provinces, label)
                setForm((prev) => ({
                  ...prev,
                  province: label,
                  province_id: id,
                  city: '',
                  regency_id: '',
                  district: '',
                  district_id: '',
                  village: '',
                  village_id: '',
                }))
              }}
            />
            <Combobox
              label="Kota / Kabupaten"
              value={form.city}
              options={regencyOptions}
              placeholder={form.province_id ? 'Pilih kota/kabupaten' : 'Pilih provinsi dulu'}
              emptyText="Tidak ada data kota/kabupaten"
              disabled={!form.province_id}
              onChange={(label) => {
                const id = findIdByName(regencies, label)
                setForm((prev) => ({
                  ...prev,
                  city: label,
                  regency_id: id,
                  district: '',
                  district_id: '',
                  village: '',
                  village_id: '',
                }))
              }}
            />
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <Combobox
              label="Kecamatan"
              value={form.district}
              options={districtOptions}
              placeholder={form.regency_id ? 'Pilih kecamatan' : 'Pilih kota/kabupaten dulu'}
              emptyText="Tidak ada data kecamatan"
              disabled={!form.regency_id}
              onChange={(label) => {
                const id = findIdByName(districts, label)
                setForm((prev) => ({
                  ...prev,
                  district: label,
                  district_id: id,
                  village: '',
                  village_id: '',
                }))
              }}
            />
            <Combobox
              label="Kelurahan"
              value={form.village}
              options={villageOptions}
              placeholder={
                !form.district_id
                  ? 'Pilih kecamatan dulu'
                  : villageOptions.length
                    ? 'Pilih kelurahan'
                    : 'Kelurahan tidak tersedia'
              }
              emptyText="Tidak ada data kelurahan"
              disabled={!form.district_id || villageOptions.length === 0}
              onChange={(label) => {
                const id = findIdByName(villages, label)
                updateField('village', label)
                updateField('village_id', id)
              }}
            />
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

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Password</label>
              <input
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                type="password"
                required
                minLength={6}
                placeholder="Minimal 6 karakter"
                className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Konfirmasi Password</label>
              <input
                value={form.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                type="password"
                required
                minLength={6}
                placeholder="Ulangi password"
                className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
              />
            </div>
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
