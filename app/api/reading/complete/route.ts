import { NextResponse } from 'next/server'

import { requireSupabaseAdmin } from '@/lib/supabase-admin'
import { createClient as createSupabaseServerClient } from '@/lib/supabase-server'
import type { Database } from '@/types/supabase'

function getJakartaDayStartUtc(date: string) {
  return new Date(`${date}T00:00:00+07:00`)
}

function formatJakartaDateFromUtc(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d)
}

async function isDayCompleted(
  supabaseAdmin: ReturnType<typeof requireSupabaseAdmin>,
  userId: string,
  date: string,
) {
  const { data: items, error: itemsError } = await supabaseAdmin
    .from('reading_plan_items')
    .select('id')
    .eq('scheduled_date', date)

  if (itemsError) throw new Error(itemsError.message)
  const ids = items?.map((i) => i.id) || []
  if (ids.length === 0) return false

  const { data: logs, error: logsError } = await supabaseAdmin
    .from('reading_logs')
    .select('plan_item_id')
    .eq('user_id', userId)
    .in('plan_item_id', ids)

  if (logsError) throw new Error(logsError.message)
  return (logs?.length || 0) >= ids.length
}

export async function POST(request: Request) {
  try {
    const auth = request.headers.get('authorization') ?? ''
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''

    const supabaseAdmin = requireSupabaseAdmin()

    let userId: string | null = null
    if (token) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
      if (authError || !authData.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = authData.user.id
    } else {
      const supabaseServer = createSupabaseServerClient()
      const { data, error } = await supabaseServer.auth.getUser()
      if (error || !data.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = data.user.id
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { planItemId, fallback } = await request.json()

    if (!planItemId) {
      return NextResponse.json({ error: 'Plan item ID is required' }, { status: 400 })
    }

    const now = new Date()
    // 1 poin per hari (akan diberikan hanya saat semua bacaan hari itu selesai)
    const points = 0

    const isFallbackId = typeof planItemId === 'string' && planItemId.startsWith('fallback-')
    const fallbackMode = Boolean(fallback) || isFallbackId

    // Check if already completed (idempotent behavior)
    const { data: existingLog, error: existingError } = await supabaseAdmin
      .from('reading_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_item_id', planItemId)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    let scheduleDate: string
    if (fallbackMode) {
      scheduleDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now)
    } else {
      const { data: planItem, error: planItemError } = await supabaseAdmin
        .from('reading_plan_items')
        .select('scheduled_date')
        .eq('id', planItemId)
        .maybeSingle()

      if (planItemError || !planItem) {
        // If plan item can't be found, gracefully treat it as fallback so UI can still proceed.
        scheduleDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now)
      } else {
        scheduleDate = (planItem as any).scheduled_date as string
      }
    }

    const alreadyCompleted = Boolean(existingLog)

    let readingLog = existingLog
    if (!readingLog) {
      const { data: inserted, error: logError } = await supabaseAdmin
        .from('reading_logs')
        .insert({
          user_id: userId,
          plan_item_id: planItemId,
          completed_at: now.toISOString(),
          points_earned: points,
        })
        .select()
        .single()

      if (logError) {
        return NextResponse.json({ error: logError.message }, { status: 500 })
      }

      readingLog = inserted
    }

    // Get all items for this schedule date
    const today = scheduleDate
    const { data: allItems, error: allItemsError } = await supabaseAdmin
      .from('reading_plan_items')
      .select('id')
      .eq('scheduled_date', today)

    if (allItemsError) {
      return NextResponse.json({ error: allItemsError.message }, { status: 500 })
    }

    if (!allItems || allItems.length === 0) {
      return NextResponse.json({
        readingLog,
        pointsEarned: points,
        dayCompleted: false,
        fallback,
        message: fallback ? 'Bacaan selesai (mode fleksibel).' : 'Tidak ada bacaan terjadwal untuk hari ini.',
      })
    }

    // Get user's completed items for today
    const { data: completedItems, error: completedError } = await supabaseAdmin
      .from('reading_logs')
      .select('plan_item_id')
      .eq('user_id', userId)
      .in('plan_item_id', allItems?.map(item => item.id) || [])

    if (completedError) {
      return NextResponse.json({ error: completedError.message }, { status: 500 })
    }

    const completedCount = completedItems?.length || 0
    const totalCount = allItems?.length || 0
    const dayCompleted = completedCount === totalCount

    let updatedProfile = null
    console.log('[Complete] dayCompleted?', { dayCompleted, completedCount, totalCount, fallback: fallbackMode, alreadyCompleted })
    if (dayCompleted && !alreadyCompleted) {
      // Update user's total points and streak
      const { data: currentProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('total_points, current_streak, longest_streak')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.error('[Complete] Failed to read current profile:', profileError)
        return NextResponse.json({ error: profileError.message }, { status: 500 })
      }

      console.log('[Complete] currentProfile:', currentProfile)
      // Check yesterday completion to compute streak
      const startUtc = getJakartaDayStartUtc(today)
      const yesterdayStartUtc = new Date(startUtc.getTime() - 24 * 60 * 60 * 1000)
      const yesterday = formatJakartaDateFromUtc(yesterdayStartUtc)
      const yesterdayCompleted = await isDayCompleted(supabaseAdmin, userId, yesterday)

      const prevStreak = currentProfile?.current_streak || 0
      const newStreak = yesterdayCompleted ? prevStreak + 1 : 1
      const newTotalPoints = (currentProfile?.total_points || 0) + 1
      const prevLongest = (currentProfile as any)?.longest_streak || 0
      const newLongest = Math.max(prevLongest, newStreak)

      console.log('[Complete] Computed new values:', { prevStreak, yesterdayCompleted, newStreak, newTotalPoints })

      // Award 1 point to the last log entry of the day
      const { error: updatePointsError } = await supabaseAdmin
        .from('reading_logs')
        .update({ points_earned: 1 })
        .eq('id', (readingLog as any).id)

      if (updatePointsError) {
        console.error('[Complete] Failed to update points_earned on reading_log:', updatePointsError)
        // Continue anyway, still try to update profile
      }

      // Update profile
      const { data: profile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          total_points: newTotalPoints,
          current_streak: newStreak,
          longest_streak: newLongest,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single()

      if (updateError) {
        console.error('[Complete] Failed to update profile:', updateError)
        return NextResponse.json({ error: `Failed to update profile: ${updateError.message}` }, { status: 500 })
      }

      updatedProfile = profile
      console.log('[Complete] Profile updated:', { userId, newTotalPoints, newStreak })
    }

    return NextResponse.json({
      readingLog,
      pointsEarned: dayCompleted ? 1 : 0,
      dayCompleted,
      fallback: fallbackMode,
      alreadyCompleted,
      streak: (updatedProfile as any)?.current_streak || 0,
      totalPoints: (updatedProfile as any)?.total_points || 0,
      progress: {
        completed: completedCount,
        total: totalCount,
        percentage: totalCount ? Math.round((completedCount / totalCount) * 100) : 0
      },
      message: dayCompleted
        ? '🎉 Semua bacaan hari ini selesai! Anda mendapatkan 1 poin dan streak bertambah!'
        : fallbackMode
        ? '✅ Bacaan selesai (mode fleksibel).'
        : alreadyCompleted
        ? '✅ Bacaan sudah tercatat sebelumnya.'
        : '✅ Bacaan selesai. Lanjutkan bacaan lainnya hari ini!',
    })
  } catch (error) {
    console.error('[API Complete Reading POST] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to complete reading',
      },
      { status: 500 }
    )
  }
}
