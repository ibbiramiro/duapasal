import { NextResponse } from 'next/server'

import { requireSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const provinceId = searchParams.get('province_id')

  if (!provinceId) {
    return NextResponse.json({ error: 'province_id is required' }, { status: 400 })
  }

  try {
    const supabaseAdmin = requireSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('regencies')
      .select('id,name')
      .eq('province_id', provinceId)
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: (data ?? []).map((r) => ({ id: r.id, text: r.name })) })
  } catch (err) {
    console.error('[Locations] regencies error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
