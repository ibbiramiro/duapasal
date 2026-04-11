import { NextResponse } from 'next/server'
 
import { requireSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabaseAdmin = requireSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('wilayah_provinces')
      .select('id,name')
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: (data ?? []).map((p) => ({ id: p.id, text: p.name })),
    })
  } catch (err) {
    console.error('[Locations] provinces error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
