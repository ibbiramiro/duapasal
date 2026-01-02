'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'

import { supabase } from '@/lib/supabase'

type FormState = {
  email: string
  full_name: string
  dob: string
  phone: string
  address_line: string
  province: string
  city: string
  district: string
  postal_code: string
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
  city: '',
  district: '',
  postal_code: '',
  church_branch: '',
  pastor_name: '',
  reminder_opt_in: true,
  password: '',
  confirmPassword: '',
}

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>(initialState)
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const redirectTo = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/auth/callback`
  }, [])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
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
      city,
      district,
      postal_code,
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
          city,
          district,
          postal_code,
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
