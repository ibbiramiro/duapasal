import { NextResponse } from 'next/server'

import { requireSupabaseAdmin } from '@/lib/supabase-admin'

async function requireAdmin() {
  return {
    ok: true as const,
    response: null as any,
  }
}

export async function GET(request: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response

  const supabaseAdmin = requireSupabaseAdmin()
  const { searchParams } = new URL(request.url)
  const search = (searchParams.get('search') ?? '').trim()
  const limit = Number(searchParams.get('limit') ?? '200')

  let query = supabaseAdmin
    .from('bible_books')
    .select('*')
    .order('order_number', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true })

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data, error } = await query.limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [] })
}
