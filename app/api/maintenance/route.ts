'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type MaintenanceStatus = 'active' | 'upcoming' | 'ended' | 'disabled'

export async function GET() {
  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('maintenance')
      .select('enabled, title, message, start_at, end_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as any

    if (error) {
      console.error('[Maintenance API] Error:', error)
      return NextResponse.json({ enabled: false, status: 'disabled', config: null })
    }

    if (!data) {
      return NextResponse.json({ enabled: false, status: 'disabled', config: null })
    }

    const now = new Date()
    let status: MaintenanceStatus = 'disabled'
    let isActive = false

    if (!data.enabled) {
      status = 'disabled'
    } else {
      const startAt = data.start_at ? new Date(data.start_at) : null
      const endAt = data.end_at ? new Date(data.end_at) : null

      if (startAt && now < startAt) {
        status = 'upcoming'
      } else if (endAt && now > endAt) {
        status = 'ended'
      } else {
        status = 'active'
        isActive = true
      }
    }

    return NextResponse.json({
      enabled: isActive,
      status,
      config: data,
    })
  } catch (err) {
    console.error('[Maintenance API] Unexpected error:', err)
    return NextResponse.json({ enabled: false, status: 'disabled', config: null })
  }
}
