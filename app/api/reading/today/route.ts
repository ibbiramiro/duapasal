import { NextResponse } from 'next/server'

import { requireSupabaseAdmin } from '@/lib/supabase-admin'
import { createClient as createSupabaseServerClient } from '@/lib/supabase-server'
import type { TodayReadingResponse } from '@/types/reading'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

function getJakartaDateString(now: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now)
}

function getJakartaDayBoundsIso(date: string) {
  const start = new Date(`${date}T00:00:00+07:00`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { startIso: start.toISOString(), endIso: end.toISOString() }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const auth = request.headers.get('authorization') ?? ''
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''

    const supabaseAdmin = requireSupabaseAdmin()

    const userPromise = token
      ? (() => {
          return supabaseAdmin.auth.getUser(token)
        })()
      : null

    let resolvedUserId: string | null = null

    if (userPromise) {
      const { data: authData, error: authError } = await userPromise
      if (authError || !authData.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      resolvedUserId = authData.user.id
    } else {
      const supabaseServer = createSupabaseServerClient()
      const { data, error } = await supabaseServer.auth.getUser()
      if (error || !data.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      resolvedUserId = data.user.id
    }

    const userIdFinal = resolvedUserId
    if (!userIdFinal) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const requestedDate = (searchParams.get('date') ?? '').trim()
    const today = requestedDate || getJakartaDateString(new Date())

    // Get reading plan items with book details
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('reading_plan_items')
      .select(`
        *,
        bible_books!inner(id, name, order_number)
      `)
      .eq('scheduled_date', today)
      .order('order_index')

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    // Get user's completed items for today
    const itemIds = (items as any[])?.map((item) => item.id) || []
    const completedItemsResult = itemIds.length
      ? await supabaseAdmin
          .from('reading_logs')
          .select('plan_item_id')
          .eq('user_id', userIdFinal)
          .in('plan_item_id', itemIds)
      : { data: [], error: null }

    const completedItems = completedItemsResult.data
    const completedError = completedItemsResult.error

    if (completedError) {
      return NextResponse.json({ error: completedError.message }, { status: 500 })
    }

    // Get user's total points and streak
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('total_points, current_streak')
      .eq('id', userIdFinal)
      .single()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Get today's earned points (based on today's scheduled items)
    // This avoids timezone/timestamp issues and matches how progress is computed.
    const todayPointsResult = itemIds.length
      ? await supabaseAdmin
          .from('reading_logs')
          .select('points_earned')
          .eq('user_id', userIdFinal)
          .in('plan_item_id', itemIds)
      : { data: [], error: null }

    if (todayPointsResult.error) {
      return NextResponse.json({ error: todayPointsResult.error.message }, { status: 500 })
    }

    const todayPoints = todayPointsResult.data?.reduce((sum, log) => sum + (log.points_earned || 0), 0) || 0

    const response: TodayReadingResponse = {
      date: today,
      items: items || [],
      completedItems: completedItems?.map((item) => item.plan_item_id) || [],
      userStats: {
        totalPoints: profile?.total_points || 0,
        currentStreak: profile?.current_streak || 0,
        todayPoints,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[API Today Reading GET] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get today\'s reading',
      },
      { status: 500 }
    )
  }
}
