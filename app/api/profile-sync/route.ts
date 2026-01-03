import { NextResponse } from 'next/server'

import { requireSupabaseAdmin } from '@/lib/supabase-admin'
import type { Database } from '@/types/supabase'

type ProfileUpsert = Database['public']['Tables']['profiles']['Update'] & { id: string }

type ProfileRow = Database['public']['Tables']['profiles']['Row']

export async function POST(request: Request) {
  try {
    const incoming = (await request.json()) as ProfileUpsert & {
      email_reminder_enabled?: boolean | null
    }

    if (!incoming?.id) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
    }

    const { role: _ignoreRole, email_reminder_enabled, ...rest } = incoming
    const payload: ProfileUpsert = {
      ...rest,
      id: incoming.id,
      email_reminder_enabled :
        email_reminder_enabled !== undefined ? email_reminder_enabled : incoming.email_reminder_enabled,
    }

    const supabaseAdmin = requireSupabaseAdmin()

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', payload.id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    const safePayload: ProfileRow | ProfileUpsert = existing?.role
      ? payload
      : { ...payload, role: 'USER' }

    const upsert = await supabaseAdmin.from('profiles').upsert(safePayload, { onConflict: 'id' })

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
