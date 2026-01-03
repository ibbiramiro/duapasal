import { NextResponse } from 'next/server'

import { supabase } from '@/lib/supabase'
import { requireSupabaseAdmin } from '@/lib/supabase-admin'

async function requireAdmin() {
  // Simple check - just return true for now
  // Remove authentication requirement for development
  return { 
    ok: true as const,
    response: null as any
  }
}

export async function GET(request: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response

  const supabaseAdmin = requireSupabaseAdmin()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const churchId = searchParams.get('church_id')
  const limit = Number(searchParams.get('limit') ?? '200')

  let query = supabaseAdmin.from('pastors').select('*').order('name', { ascending: true })

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  if (churchId) {
    query = query.eq('church_id', churchId)
  }

  const { data, error } = await query.limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  try {
    const gate = await requireAdmin()
    if (!gate.ok) return gate.response

    const payload = (await request.json()) as {
      name?: string
      church_id?: string | null
      email?: string | null
      phone?: string | null
      is_main_pastor?: boolean
    }

    if (!payload?.name) {
      return NextResponse.json({ error: 'Nama pendeta wajib diisi.' }, { status: 400 })
    }

    const supabaseAdmin = requireSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('pastors')
      .insert({
        name: payload.name,
        church_id: payload.church_id ?? null,
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        is_main_pastor: payload.is_main_pastor ?? false,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error creating pastor.' },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const gate = await requireAdmin()
    if (!gate.ok) return gate.response

    const payload = (await request.json()) as {
      id?: string
      name?: string
      church_id?: string | null
      email?: string | null
      phone?: string | null
      is_main_pastor?: boolean
    }

    if (!payload?.id) {
      return NextResponse.json({ error: 'ID pendeta wajib disertakan.' }, { status: 400 })
    }

    const supabaseAdmin = requireSupabaseAdmin()
    const updateData: Record<string, string | null | undefined | boolean> = {}
    if (payload.name !== undefined) updateData.name = payload.name
    if (payload.church_id !== undefined) updateData.church_id = payload.church_id
    if (payload.email !== undefined) updateData.email = payload.email
    if (payload.phone !== undefined) updateData.phone = payload.phone
    if (payload.is_main_pastor !== undefined) updateData.is_main_pastor = payload.is_main_pastor

    const { data, error } = await supabaseAdmin
      .from('pastors')
      .update(updateData)
      .eq('id', payload.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error updating pastor.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const gate = await requireAdmin()
    if (!gate.ok) return gate.response

    const { id } = (await request.json()) as { id?: string }

    if (!id) {
      return NextResponse.json({ error: 'ID pendeta wajib disertakan.' }, { status: 400 })
    }

    const supabaseAdmin = requireSupabaseAdmin()
    const { error } = await supabaseAdmin.from('pastors').delete().eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error deleting pastor.' },
      { status: 500 },
    )
  }
}
