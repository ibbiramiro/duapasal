// app/api/log-email/route.ts
import { NextResponse } from 'next/server'

import type { Database } from '@/types/supabase'
import { requireSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const { email, type, status, error, metadata } = (await request.json()) as {
      email?: string
      type?: Database['public']['Tables']['email_logs']['Row']['type']
      status?: Database['public']['Tables']['email_logs']['Row']['status']
      error?: string | null
      metadata?: Database['public']['Tables']['email_logs']['Row']['metadata']
    }

    if (!email || !type || !status) {
      return NextResponse.json(
        { error: 'Email, type, and status are required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = requireSupabaseAdmin()

    // Log to Supabase with proper typing
    const payload: Database['public']['Tables']['email_logs']['Insert'] = {
      email,
      type,
      status,
      error: error ?? null,
      metadata: metadata ?? null,
    }

    const { data, error: logError } = await supabaseAdmin
      .from('email_logs')
      .insert(payload)
      .select()
      .single()

    if (logError) {
      console.error('Error logging email:', logError)
      return NextResponse.json(
        { error: 'Failed to log email', details: logError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in log-email endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}