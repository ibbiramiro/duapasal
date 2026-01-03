'use client'

import { useEffect, useMemo, useState } from 'react'
import Header from '@/components/Header'

type ChurchRow = {
  id: string
  name: string
  city_regency: string | null
  address: string | null
}

export default function AdminChurchesPage() {
  const [items, setItems] = useState<ChurchRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createCity, setCreateCity] = useState('')
  const [createAddress, setCreateAddress] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => {
      const matchSearch = !q || (item.name ?? '').toLowerCase().includes(q)
      return matchSearch
    })
  }, [items, search])

  async function load() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/churches')
      const json = (await res.json()) as { data?: ChurchRow[]; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Gagal memuat data gereja')
      setItems(json.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data gereja')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function createItem() {
    if (!createName.trim()) {
      setError('Nama gereja wajib diisi.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/churches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          city_regency: createCity.trim() ? createCity.trim() : null,
          address: createAddress.trim() ? createAddress.trim() : null,
        }),
      })

      const json = (await res.json()) as { data?: ChurchRow; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Gagal membuat gereja')

      setCreateName('')
      setCreateCity('')
      setCreateAddress('')
      setShowModal(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membuat gereja')
    } finally {
      setSaving(false)
    }
  }

  async function updateItem(id: string, patch: Partial<Pick<ChurchRow, 'name' | 'city_regency' | 'address'>>) {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/churches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      })

      const json = (await res.json()) as { data?: ChurchRow; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Gagal mengubah gereja')

      setItems((prev) => prev.map((x) => (x.id === id ? (json.data as ChurchRow) : x)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengubah gereja')
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(id: string) {
    const ok = window.confirm('Hapus gereja ini? Data akan hilang permanen.')
    if (!ok) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/churches', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      const json = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Gagal menghapus gereja')

      setItems((prev) => prev.filter((x) => x.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menghapus gereja')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Header title="Master Gereja" subtitle="Kelola data gereja untuk dropdown pendaftaran" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Search & Add Section */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Daftar Gereja</h2>
                <p className="text-sm text-slate-600">Kelola data gereja untuk dropdown pendaftaran.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                + Tambah Gereja Baru
              </button>
            </div>

            {/* Search & Filter Section */}
            <div className="mb-6 space-y-4">
              {/* Desktop Layout */}
              <div className="hidden md:flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Cari Nama Gereja</label>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Ketik nama gereja..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={load}
                    className="rounded-lg bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
                  >
                    {loading ? 'Memuat...' : 'Refresh Data'}
                  </button>
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="md:hidden space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Cari Nama Gereja</label>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Ketik nama gereja..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={load}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 text-sm"
                  >
                    {loading ? '...' : 'Refresh'}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            ) : null}

            {/* Table Data */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              {/* Header Desktop */}
              <div className="hidden md:grid grid-cols-12 gap-2 border-b bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                <div className="col-span-4">Nama Gereja</div>
                <div className="col-span-3">Kota/Kabupaten</div>
                <div className="col-span-4">Alamat</div>
                <div className="col-span-1 text-right">Aksi</div>
              </div>

              {/* Header Mobile */}
              <div className="md:hidden border-b bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                Daftar Gereja
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-slate-600">Memuat data...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-600">Tidak ada data gereja yang ditemukan.</div>
              ) : (
                <div className="divide-y">
                  {filtered.map((row) => (
                    <div key={row.id} className="hover:bg-slate-50">
                      {/* Desktop View */}
                      <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-3">
                        <div className="col-span-4">
                          <input
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            value={row.name}
                            onChange={(e) => {
                              const v = e.target.value
                              setItems((prev) => prev.map((x) => (x.id === row.id ? { ...x, name: v } : x)))
                            }}
                            onBlur={() => updateItem(row.id, { name: row.name })}
                          />
                        </div>

                        <div className="col-span-3">
                          <input
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            value={row.city_regency ?? ''}
                            onChange={(e) => {
                              const v = e.target.value
                              setItems((prev) => prev.map((x) => (x.id === row.id ? { ...x, city_regency: v || null } : x)))
                            }}
                            onBlur={() => updateItem(row.id, { city_regency: row.city_regency ?? null })}
                          />
                        </div>

                        <div className="col-span-4">
                          <input
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            value={row.address ?? ''}
                            onChange={(e) => {
                              const v = e.target.value
                              setItems((prev) => prev.map((x) => (x.id === row.id ? { ...x, address: v || null } : x)))
                            }}
                            onBlur={() => updateItem(row.id, { address: row.address ?? null })}
                          />
                        </div>

                        <div className="col-span-1 flex justify-end">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => deleteItem(row.id)}
                            className="rounded-lg bg-red-600 px-3 py-1 text-xs text-white disabled:opacity-60 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
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
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              value={row.name}
                              onChange={(e) => {
                                const v = e.target.value
                                setItems((prev) => prev.map((x) => (x.id === row.id ? { ...x, name: v } : x)))
                              }}
                              onBlur={() => updateItem(row.id, { name: row.name })}
                            />
                          </div>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => deleteItem(row.id)}
                            className="ml-2 rounded-lg bg-red-600 px-3 py-1 text-xs text-white disabled:opacity-60 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                          >
                            Hapus
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Kota/Kabupaten</label>
                            <input
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              value={row.city_regency ?? ''}
                              onChange={(e) => {
                                const v = e.target.value
                                setItems((prev) => prev.map((x) => (x.id === row.id ? { ...x, city_regency: v || null } : x)))
                              }}
                              onBlur={() => updateItem(row.id, { city_regency: row.city_regency ?? null })}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Alamat</label>
                            <input
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              value={row.address ?? ''}
                              onChange={(e) => {
                                const v = e.target.value
                                setItems((prev) => prev.map((x) => (x.id === row.id ? { ...x, address: v || null } : x)))
                              }}
                              onBlur={() => updateItem(row.id, { address: row.address ?? null })}
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
        </div>
      </div>

      {/* Modal Tambah Gereja */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Tambah Gereja Baru</h3>
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
                <label className="block text-sm font-medium mb-1">Nama Gereja *</label>
                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Masukkan nama gereja"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Kota/Kabupaten</label>
                <input
                  value={createCity}
                  onChange={(e) => setCreateCity(e.target.value)}
                  placeholder="Masukkan kota/kabupaten"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Alamat Lengkap</label>
                <textarea
                  value={createAddress}
                  onChange={(e) => setCreateAddress(e.target.value)}
                  placeholder="Jalan, nomor, kelurahan, dll."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={createItem}
                  className="rounded-lg bg-green-600 px-4 py-2 text-white disabled:opacity-60 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
