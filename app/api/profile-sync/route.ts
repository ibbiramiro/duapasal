import { NextResponse } from 'next/server'

import { requireSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      id: string
      email: string | null
      full_name: string | null
      role: string | null
    }

    if (!payload?.id) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
    }

    const supabaseAdmin = requireSupabaseAdmin()

    const upsert = await supabaseAdmin.from('profiles').upsert(payload, { onConflict: 'id' })

    if (upsert.error) {
      return NextResponse.json({ error: upsert.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unexpected server error while syncing profile',
      },
      { status: 500 },
    )
  }
}
