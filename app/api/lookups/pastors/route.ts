import { NextResponse } from 'next/server'

import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get('limit') ?? '300')
  const churchId = searchParams.get('church_id')

  let query = supabase
    .from('pastors')
    .select('id, name, church_id, is_main_pastor')
    .order('name', { ascending: true })

  if (churchId) {
    query = query.eq('church_id', churchId)
  }

  const { data, error } = await query.limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
