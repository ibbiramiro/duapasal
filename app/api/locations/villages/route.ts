import { NextResponse } from 'next/server'

import { requireSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const districtId = searchParams.get('district_id')

  if (!districtId) {
    return NextResponse.json({ error: 'district_id is required' }, { status: 400 })
  }

  try {
    const supabaseAdmin = requireSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('wilayah_villages')
      .select('id,name')
      .eq('district_id', districtId)
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: (data ?? []).map((v) => ({ id: v.id, text: v.name })),
    })
  } catch (err) {
    console.error('[Locations] villages error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
