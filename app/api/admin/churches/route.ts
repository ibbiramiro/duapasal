import { NextResponse } from 'next/server'

import { requireSupabaseAdmin } from '@/lib/supabase-admin'
import { supabase } from '@/lib/supabase'

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
  const limit = Number(searchParams.get('limit') ?? '100')

  let query = supabaseAdmin.from('churches').select('*').order('name', { ascending: true })

  if (search) {
    query = query.ilike('name', `%${search}%`)
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
      city_regency?: string | null
      address?: string | null
    }

    if (!payload?.name) {
      return NextResponse.json({ error: 'Nama gereja wajib diisi.' }, { status: 400 })
    }

    const supabaseAdmin = requireSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('churches')
      .insert({
        name: payload.name,
        city_regency: payload.city_regency ?? null,
        address: payload.address ?? null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error creating church.' },
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
      city_regency?: string | null
      address?: string | null
    }

    if (!payload?.id) {
      return NextResponse.json({ error: 'ID gereja wajib disertakan.' }, { status: 400 })
    }

    const supabaseAdmin = requireSupabaseAdmin()
    const updateData: Record<string, string | null | undefined> = {}
    if (payload.name !== undefined) updateData.name = payload.name
    if (payload.city_regency !== undefined) updateData.city_regency = payload.city_regency
    if (payload.address !== undefined) updateData.address = payload.address

    const { data, error } = await supabaseAdmin
      .from('churches')
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
      { error: error instanceof Error ? error.message : 'Unexpected error updating church.' },
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
      return NextResponse.json({ error: 'ID gereja wajib disertakan.' }, { status: 400 })
    }

    const supabaseAdmin = requireSupabaseAdmin()
    const { error } = await supabaseAdmin.from('churches').delete().eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error deleting church.' },
      { status: 500 },
    )
  }
}
