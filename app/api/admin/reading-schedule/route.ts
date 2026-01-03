import { NextResponse } from 'next/server'

import { requireSupabaseAdmin } from '@/lib/supabase-admin'

async function requireAdmin() {
  return {
    ok: true as const,
    response: null as any,
  }
}

type ScheduleItemInput = {
  book_id: number
  start_chapter: number
  end_chapter: number
}

export async function GET(request: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response

  const supabaseAdmin = requireSupabaseAdmin()
  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  if (!start || !end) {
    return NextResponse.json({ error: 'start and end are required (YYYY-MM-DD)' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('reading_plan_items')
    .select(
      `
        *,
        bible_books!inner(id, name, order_number)
      `
    )
    .gte('scheduled_date', start)
    .lte('scheduled_date', end)
    .order('scheduled_date', { ascending: true })
    .order('order_index', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const grouped: Record<string, any[]> = {}
  for (const row of data ?? []) {
    const date = (row as any).scheduled_date as string
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(row)
  }

  return NextResponse.json({ data: grouped })
}

export async function POST(request: Request) {
  try {
    const gate = await requireAdmin()
    if (!gate.ok) return gate.response

    const payload = (await request.json()) as {
      date?: string
      items?: ScheduleItemInput[]
    }

    const date = (payload.date ?? '').trim()
    if (!date) {
      return NextResponse.json({ error: 'date is required (YYYY-MM-DD)' }, { status: 400 })
    }

    const items = Array.isArray(payload.items) ? payload.items : []

    const normalized = items
      .filter(Boolean)
      .map((it) => ({
        book_id: Number(it.book_id),
        start_chapter: Number(it.start_chapter),
        end_chapter: Number(it.end_chapter),
      }))
      .filter((it) => Number.isFinite(it.book_id) && Number.isFinite(it.start_chapter) && Number.isFinite(it.end_chapter))

    const supabaseAdmin = requireSupabaseAdmin()

    const { error: delError } = await supabaseAdmin
      .from('reading_plan_items')
      .delete()
      .eq('scheduled_date', date)

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 })
    }

    if (normalized.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const rows = normalized.map((it, idx) => ({
      scheduled_date: date,
      order_index: idx,
      book_id: it.book_id,
      start_chapter: it.start_chapter,
      end_chapter: it.end_chapter,
    }))

    const { data, error } = await supabaseAdmin
      .from('reading_plan_items')
      .insert(rows)
      .select(
        `
        *,
        bible_books!inner(id, name, order_number)
      `
      )
      .order('order_index', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error saving schedule.' },
      { status: 500 }
    )
  }
}
