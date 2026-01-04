import { NextResponse } from 'next/server'

import { requireSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const emailRaw = searchParams.get('email') ?? ''
  const email = emailRaw.trim().toLowerCase()

  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  try {
    const supabaseAdmin = requireSupabaseAdmin()

    let page = 1
    const perPage = 1000

    while (page <= 50) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })

      if (error) {
        console.error('[Check Email] listUsers error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const users = data?.users ?? []
      const exists = users.some((u) => (u.email ?? '').toLowerCase() === email)

      if (exists) {
        return NextResponse.json({ exists: true })
      }

      if (users.length < perPage) {
        break
      }

      page += 1
    }

    return NextResponse.json({ exists: false })
  } catch (err) {
    console.error('[Check Email] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
