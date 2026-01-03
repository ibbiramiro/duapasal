'use client'

import { useEffect, useMemo, useState } from 'react'

import Header from '@/components/Header'

type BibleBook = {
  id: number
  name: string
  order_number: number | null
}

type ScheduleRow = {
  id: string
  scheduled_date: string
  book_id: number
  start_chapter: number
  end_chapter: number
  order_index: number
  bible_books: BibleBook
}

type ScheduleGrouped = Record<string, ScheduleRow[]>

type EditRow = {
  book_id: number | ''
  start_chapter: number | ''
  end_chapter: number | ''
}

function toUtcDate(date: string) {
  // Ensure consistent day iteration regardless of local timezone
  return new Date(`${date}T00:00:00Z`)
}

function formatDateUTC(d: Date) {
  return d.toISOString().slice(0, 10)
}

function listDatesInclusive(start: string, end: string) {
  const startDate = toUtcDate(start)
  const endDate = toUtcDate(end)
  const out: string[] = []

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return out

  const cur = new Date(startDate)
  while (cur.getTime() <= endDate.getTime()) {
    out.push(formatDateUTC(cur))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }

  return out
}

function formatItem(r: ScheduleRow) {
  const range = r.end_chapter > r.start_chapter ? `${r.start_chapter}-${r.end_chapter}` : `${r.start_chapter}`
  return `${r.bible_books.name} ${range}`
}

export default function AdminReadingSchedulePage() {
  const [books, setBooks] = useState<BibleBook[]>([])
  const [schedule, setSchedule] = useState<ScheduleGrouped>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [start, setStart] = useState('2026-01-01')
  const [end, setEnd] = useState('2026-12-31')
  const [search, setSearch] = useState('')

  // modal
  const [showModal, setShowModal] = useState(false)
  const [activeDate, setActiveDate] = useState<string>('')
  const [editRows, setEditRows] = useState<EditRow[]>([])
  const [saving, setSaving] = useState(false)

  async function loadBooks() {
    const res = await fetch('/api/admin/bible-books')
    const json = (await res.json()) as { data?: BibleBook[]; error?: string }
    if (!res.ok) throw new Error(json.error ?? 'Gagal memuat daftar kitab')
    setBooks(json.data ?? [])
  }

  async function loadSchedule() {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ start, end })
      const res = await fetch(`/api/admin/reading-schedule?${params.toString()}`)
      const json = (await res.json()) as { data?: ScheduleGrouped; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Gagal memuat jadwal bacaan')
      setSchedule(json.data ?? {})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat jadwal bacaan')
      setSchedule({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        await loadBooks()
        if (!cancelled) await loadSchedule()
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal memuat data')
      }
    }

    init()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()

    const dates = listDatesInclusive(start, end)

    return dates
      .map((date) => {
        const items = schedule[date] ?? []
        const summary = items.map(formatItem).join('; ')
        return { date, items, summary }
      })
      .filter((r) => {
        if (!q) return true
        return r.date.includes(q) || r.summary.toLowerCase().includes(q)
      })
  }, [schedule, search, start, end])

  function openEditor(date: string) {
    const items = schedule[date] ?? []
    const next: EditRow[] = items.length
      ? items
          .slice()
          .sort((a, b) => a.order_index - b.order_index)
          .map((it) => ({
            book_id: it.book_id,
            start_chapter: it.start_chapter,
            end_chapter: it.end_chapter,
          }))
      : [{ book_id: '', start_chapter: '', end_chapter: '' }]

    setActiveDate(date)
    setEditRows(next)
    setShowModal(true)
  }

  function addRow() {
    setEditRows((prev) => [...prev, { book_id: '', start_chapter: '', end_chapter: '' }])
  }

  function removeRow(idx: number) {
    setEditRows((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateRow(idx: number, patch: Partial<EditRow>) {
    setEditRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  async function save() {
    if (!activeDate) return

    setSaving(true)
    setError(null)

    try {
      const payload = {
        date: activeDate,
        items: editRows
          .filter((r) => r.book_id !== '' && r.start_chapter !== '' && r.end_chapter !== '')
          .map((r) => ({
            book_id: Number(r.book_id),
            start_chapter: Number(r.start_chapter),
            end_chapter: Number(r.end_chapter),
          })),
      }

      const res = await fetch('/api/admin/reading-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = (await res.json()) as { data?: ScheduleRow[]; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Gagal menyimpan jadwal')

      setSchedule((prev) => ({
        ...prev,
        [activeDate]: (json.data ?? []).sort((a, b) => a.order_index - b.order_index),
      }))

      setShowModal(false)
      setActiveDate('')
      setEditRows([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan jadwal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Header title="Bacaan Harian" subtitle="Cek & atur bacaan harian sepanjang 2026" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mulai</label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sampai</label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cari</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="2026-01-01 / Kejadian"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={loadSchedule}
                disabled={loading}
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
              >
                {loading ? 'Memuat...' : 'Load'}
              </button>
            </div>
          </div>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <div className="overflow-auto border border-slate-200 rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-700">Tanggal</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-700">Bacaan</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                      {loading ? 'Memuat...' : 'Tidak ada data.'}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.date} className="border-t border-slate-200">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">{r.date}</td>
                      <td className="px-4 py-3 text-slate-700">{r.summary || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEditor(r.date)}
                          className="rounded bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-3xl rounded-lg bg-white border border-slate-200 shadow-lg">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Edit Bacaan</h2>
                  <p className="text-sm text-slate-600">Tanggal: {activeDate}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded px-3 py-1.5 text-slate-700 hover:bg-slate-100"
                >
                  Tutup
                </button>
              </div>

              <div className="p-5 space-y-3">
                {editRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-6">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Kitab</label>
                      <select
                        value={row.book_id}
                        onChange={(e) => updateRow(idx, { book_id: e.target.value ? Number(e.target.value) : '' })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <option value="">Pilih kitab</option>
                        {books.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Pasal</label>
                      <input
                        type="number"
                        min={1}
                        value={row.start_chapter}
                        onChange={(e) => updateRow(idx, { start_chapter: e.target.value ? Number(e.target.value) : '' })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Sampai</label>
                      <input
                        type="number"
                        min={1}
                        value={row.end_chapter}
                        onChange={(e) => updateRow(idx, { end_chapter: e.target.value ? Number(e.target.value) : '' })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={addRow}
                    className="rounded-lg border border-slate-200 px-4 py-2 hover:bg-slate-50"
                  >
                    + Tambah Bacaan
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="rounded-lg border border-slate-200 px-4 py-2 hover:bg-slate-50"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={save}
                      disabled={saving}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
