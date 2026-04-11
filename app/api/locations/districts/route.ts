import { NextResponse } from 'next/server'

import { requireSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const regencyId = searchParams.get('regency_id')

  if (!regencyId) {
    return NextResponse.json({ error: 'regency_id is required' }, { status: 400 })
  }

  try {
    const supabaseAdmin = requireSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('districts')
      .select('id,name')
      .eq('regency_id', regencyId)
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: (data ?? []).map((d) => ({ id: d.id, text: d.name })) })
  } catch (err) {
    console.error('[Locations] districts error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
