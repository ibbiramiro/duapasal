'use client'

import { useEffect, useMemo, useState } from 'react'

import Header from '@/components/Header'

type ChurchOption = {
  id: string
  name: string
  city_regency: string | null
}

type PastorRow = {
  id: string
  name: string
  church_id: string | null
  email: string | null
  phone: string | null
  is_main_pastor: boolean
}

export default function AdminPastorsPage() {
  const [pastors, setPastors] = useState<PastorRow[]>([])
  const [churches, setChurches] = useState<ChurchOption[]>([])
  const [search, setSearch] = useState('')
  const [filterChurch, setFilterChurch] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createChurchId, setCreateChurchId] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createPhone, setCreatePhone] = useState('')
  const [createIsMainPastor, setCreateIsMainPastor] = useState(false)

  const churchNameById = useMemo(() => {
    const map = new Map<string, string>()
    churches.forEach((c) => map.set(c.id, c.name))
    return map
  }, [churches])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return pastors.filter((p) => {
      const matchSearch = !q || (p.name ?? '').toLowerCase().includes(q)
      const matchChurch = !filterChurch || p.church_id === filterChurch
      return matchSearch && matchChurch
    })
  }, [pastors, search, filterChurch])

  async function loadChurches() {
    try {
      const res = await fetch('/api/admin/churches?limit=500')
      const json = (await res.json()) as { data?: ChurchOption[]; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Gagal memuat data gereja')
      setChurches(json.data ?? [])
    } catch (_e) {
      setChurches([])
    }
  }

  async function loadPastors() {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (filterChurch) params.set('church_id', filterChurch)
      params.set('limit', '500')

      const res = await fetch(`/api/admin/pastors?${params.toString()}`)
      const json = (await res.json()) as { data?: PastorRow[]; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Gagal memuat data pendeta')

      setPastors(json.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data pendeta')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadChurches()
    loadPastors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createItem() {
    if (!createName.trim()) {
      setError('Nama pendeta wajib diisi.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/pastors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          church_id: createChurchId || null,
          email: createEmail.trim() ? createEmail.trim() : null,
          phone: createPhone.trim() ? createPhone.trim() : null,
          is_main_pastor: createIsMainPastor,
        }),
      })

      const json = (await res.json()) as { data?: PastorRow; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Gagal membuat pendeta')

      setCreateName('')
      setCreateChurchId('')
      setCreateEmail('')
      setCreatePhone('')
      setCreateIsMainPastor(false)
      setShowModal(false)
      await loadPastors()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat pendeta')
    } finally {
      setSaving(false)
    }
  }

  async function updateItem(id: string, patch: Partial<Omit<PastorRow, 'id'>>) {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/pastors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      })

      const json = (await res.json()) as { data?: PastorRow; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Gagal mengubah pendeta')

      setPastors((prev) => prev.map((x) => (x.id === id ? (json.data as PastorRow) : x)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengubah pendeta')
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(id: string) {
    const ok = window.confirm('Hapus pendeta ini? Data akan hilang permanen.')
    if (!ok) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/pastors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      const json = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Gagal menghapus pendeta')

      setPastors((prev) => prev.filter((x) => x.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus pendeta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Header 
        title="Master Pendeta" 
        subtitle="Kelola data pendeta untuk dropdown pendaftaran"
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Search & Add Section */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Daftar Pendeta</h2>
                <p className="text-sm text-slate-600">Kelola daftar pendeta untuk dropdown pendaftaran.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                + Tambah Pendeta Baru
              </button>
            </div>

        {/* Search & Filter Section */}
        <div className="mb-6 space-y-4">
          {/* Desktop Layout */}
          <div className="hidden md:flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Cari Nama Pendeta</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ketik nama pendeta..."
                className="w-full rounded border border-slate-200 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Filter Gereja</label>
              <select
                value={filterChurch}
                onChange={(e) => setFilterChurch(e.target.value)}
                className="w-full rounded border border-slate-200 bg-white px-3 py-2"
              >
                <option value="">Semua Gereja</option>
                {churches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                disabled={loading}
                onClick={loadPastors}
                className="rounded bg-indigo-600 px-6 py-2 text-white disabled:opacity-60 hover:bg-indigo-700"
              >
                {loading ? 'Memuat...' : 'Refresh Data'}
              </button>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Cari Nama Pendeta</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ketik nama pendeta..."
                className="w-full rounded border border-slate-200 px-3 py-2"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Filter Gereja</label>
                <select
                  value={filterChurch}
                  onChange={(e) => setFilterChurch(e.target.value)}
                  className="w-full rounded border border-slate-200 bg-white px-3 py-2"
                >
                  <option value="">Semua Gereja</option>
                  {churches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={loading}
                  onClick={loadPastors}
                  className="rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-60 hover:bg-indigo-700 text-sm"
                >
                  {loading ? '...' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error ? (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : null}

        {/* Tabel Data */}
        <div className="overflow-hidden rounded border border-slate-200 bg-white">
          {/* Header Desktop */}
          <div className="hidden md:grid grid-cols-12 gap-2 border-b bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            <div className="col-span-3">Nama Pendeta</div>
            <div className="col-span-3">Gereja</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-2">No HP</div>
            <div className="col-span-1 text-right">Aksi</div>
          </div>

          {/* Header Mobile */}
          <div className="md:hidden border-b bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            Daftar Pendeta
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-600">Memuat data...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-600">Tidak ada data pendeta yang ditemukan.</div>
          ) : (
            <div className="divide-y">
              {filtered.map((row) => (
                <div key={row.id} className="hover:bg-slate-50">
                  {/* Desktop View */}
                  <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-3">
                    <div className="col-span-3">
                      <input
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                        value={row.name}
                        onChange={(e) => {
                          const v = e.target.value
                          setPastors((prev) => prev.map((x) => (x.id === row.id ? { ...x, name: v } : x)))
                        }}
                        onBlur={() => updateItem(row.id, { name: row.name })}
                      />
                      <div className="mt-1">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          row.is_main_pastor 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {row.is_main_pastor ? 'Gembala Utama' : 'Pengurus Gereja'}
                        </span>
                      </div>
                    </div>

                    <div className="col-span-3">
                      <select
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm"
                        value={row.church_id ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          setPastors((prev) =>
                            prev.map((x) => (x.id === row.id ? { ...x, church_id: v || null } : x)),
                          )
                        }}
                        onBlur={() => updateItem(row.id, { church_id: row.church_id ?? null })}
                      >
                        <option value="">(Tidak ada gereja)</option>
                        {churches.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {row.church_id && (
                        <p className="mt-1 text-xs text-slate-500">
                          Pengurus Gereja: {churchNameById.get(row.church_id)}
                        </p>
                      )}
                    </div>

                    <div className="col-span-3">
                      <input
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                        value={row.email ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          setPastors((prev) => prev.map((x) => (x.id === row.id ? { ...x, email: v || null } : x)))
                        }}
                        onBlur={() => updateItem(row.id, { email: row.email ?? null })}
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                        value={row.phone ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          setPastors((prev) => prev.map((x) => (x.id === row.id ? { ...x, phone: v || null } : x)))
                        }}
                        onBlur={() => updateItem(row.id, { phone: row.phone ?? null })}
                      />
                    </div>

                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => deleteItem(row.id)}
                        className="rounded bg-red-600 px-3 py-1 text-xs text-white disabled:opacity-60 hover:bg-red-700"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden px-3 py-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <input
                          className="w-full rounded border border-slate-200 px-2 py-1 text-sm font-medium"
                          value={row.name}
                          onChange={(e) => {
                            const v = e.target.value
                            setPastors((prev) => prev.map((x) => (x.id === row.id ? { ...x, name: v } : x)))
                          }}
                          onBlur={() => updateItem(row.id, { name: row.name })}
                        />
                        <div className="mt-1">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            row.is_main_pastor 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {row.is_main_pastor ? 'Gembala Utama' : 'Pengurus Gereja'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => deleteItem(row.id)}
                        className="ml-2 rounded bg-red-600 px-3 py-1 text-xs text-white disabled:opacity-60 hover:bg-red-700"
                      >
                        Hapus
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Gereja</label>
                        <select
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm"
                          value={row.church_id ?? ''}
                          onChange={(e) => {
                            const v = e.target.value
                            setPastors((prev) =>
                              prev.map((x) => (x.id === row.id ? { ...x, church_id: v || null } : x)),
                            )
                          }}
                          onBlur={() => updateItem(row.id, { church_id: row.church_id ?? null })}
                        >
                          <option value="">(Tidak ada gereja)</option>
                          {churches.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                        <input
                          className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                          value={row.email ?? ''}
                          onChange={(e) => {
                            const v = e.target.value
                            setPastors((prev) => prev.map((x) => (x.id === row.id ? { ...x, email: v || null } : x)))
                          }}
                          onBlur={() => updateItem(row.id, { email: row.email ?? null })}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">No HP</label>
                        <input
                          className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
                          value={row.phone ?? ''}
                          onChange={(e) => {
                            const v = e.target.value
                            setPastors((prev) => prev.map((x) => (x.id === row.id ? { ...x, phone: v || null } : x)))
                          }}
                          onBlur={() => updateItem(row.id, { phone: row.phone ?? null })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Tambah Pendeta */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Tambah Pendeta Baru</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nama Pendeta *</label>
                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  className="w-full rounded border border-slate-200 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Gereja</label>
                <select
                  value={createChurchId}
                  onChange={(e) => setCreateChurchId(e.target.value)}
                  className="w-full rounded border border-slate-200 bg-white px-3 py-2"
                >
                  <option value="">Pilih gereja</option>
                  {churches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full rounded border border-slate-200 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">No HP</label>
                <input
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full rounded border border-slate-200 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={createIsMainPastor}
                    onChange={(e) => setCreateIsMainPastor(e.target.checked)}
                    className="rounded border-slate-200 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label className="text-sm font-medium text-slate-700">Gembala Utama</label>
                </div>
              </div>

              {error && (
                <div className="rounded border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded border border-slate-200 px-4 py-2 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={createItem}
                  className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-60 hover:bg-green-700"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  )
}
