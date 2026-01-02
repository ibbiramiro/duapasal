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
}

const initialState: FormState = {
  email: '',
  full_name: '',
  dob: '',
  phone: '',
  address_line: '',
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

    const { email, full_name, dob, phone, address_line } = form

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
        data: {
          full_name,
          dob,
          phone,
          address_line,
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
    setMessage('Link pendaftaran/login sudah dikirim. Silakan cek email Anda.')
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
