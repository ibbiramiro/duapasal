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

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>(initialState)
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const [provinces, setProvinces] = useState<RegionOption[]>([])
  const [regencies, setRegencies] = useState<RegionOption[]>([])
  const [districts, setDistricts] = useState<RegionOption[]>([])
  const [villages, setVillages] = useState<RegionOption[]>([])

  const redirectTo = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/auth/callback`
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
              <label className="text-sm font-medium">Cabang Gereja</label>
              <input
                value={form.church_branch}
                onChange={(e) => updateField('church_branch', e.target.value)}
                type="text"
                placeholder="Gereja tempat Anda tergabung"
                className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Pendeta Naungan</label>
              <input
                value={form.pastor_name}
                onChange={(e) => updateField('pastor_name', e.target.value)}
                type="text"
                placeholder="Nama pendeta"
                className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Provinsi</label>
              <input
                value={form.province}
                onChange={(e) => {
                  const value = e.target.value
                  const id = findIdByName(provinces, value)
                  setForm((prev) => ({
                    ...prev,
                    province: value,
                    province_id: id,
                    city: '',
                    regency_id: '',
                    district: '',
                    district_id: '',
                    village: '',
                    village_id: '',
                  }))
                }}
                list="province-options"
                type="text"
                placeholder="Cari provinsi"
                className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
                autoComplete="off"
              />
              <datalist id="province-options">
                {provinces.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Kota / Kabupaten</label>
              <input
                value={form.city}
                onChange={(e) => {
                  const value = e.target.value
                  const id = findIdByName(regencies, value)
                  setForm((prev) => ({
                    ...prev,
                    city: value,
                    regency_id: id,
                    district: '',
                    district_id: '',
                    village: '',
                    village_id: '',
                  }))
                }}
                list="regency-options"
                type="text"
                placeholder={form.province_id ? 'Cari kota/kabupaten' : 'Pilih provinsi dulu'}
                className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
                autoComplete="off"
                disabled={!form.province_id}
              />
              <datalist id="regency-options">
                {regencies.map((r) => (
                  <option key={r.id} value={r.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Kecamatan</label>
              <input
                value={form.district}
                onChange={(e) => {
                  const value = e.target.value
                  const id = findIdByName(districts, value)
                  setForm((prev) => ({
                    ...prev,
                    district: value,
                    district_id: id,
                    village: '',
                    village_id: '',
                  }))
                }}
                list="district-options"
                type="text"
                placeholder={form.regency_id ? 'Cari kecamatan' : 'Pilih kota/kabupaten dulu'}
                className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
                autoComplete="off"
                disabled={!form.regency_id}
              />
              <datalist id="district-options">
                {districts.map((d) => (
                  <option key={d.id} value={d.name} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Kelurahan</label>
              <input
                value={form.village}
                onChange={(e) => {
                  const value = e.target.value
                  const id = findIdByName(villages, value)
                  updateField('village', value)
                  updateField('village_id', id)
                }}
                list="village-options"
                type="text"
                placeholder={form.district_id ? 'Cari kelurahan' : 'Pilih kecamatan dulu'}
                className="w-full rounded border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400"
                autoComplete="off"
                disabled={!form.district_id}
              />
              <datalist id="village-options">
                {villages.map((v) => (
                  <option key={v.id} value={v.name} />
                ))}
              </datalist>
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
