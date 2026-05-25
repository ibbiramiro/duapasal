import { NextResponse } from 'next/server'

import { requireSupabaseAdmin } from '@/lib/supabase-admin'
import { createClient as createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
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

    const yearStr = searchParams.get('year')
    const year = yearStr && /^\d{4}$/.test(yearStr) ? parseInt(yearStr, 10) : new Date().getFullYear()

    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('reading_plan_items')
      .select('id, scheduled_date')
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    const itemRows = (items ?? []) as Array<{ id: string; scheduled_date: string }>

    const planIdsByDate: Record<string, string[]> = {}
    for (const it of itemRows) {
      const d = it.scheduled_date
      if (!planIdsByDate[d]) planIdsByDate[d] = []
      planIdsByDate[d].push(it.id)
    }

    const allItemIds = itemRows.map((i) => i.id)

    const logsResult = allItemIds.length
      ? await supabaseAdmin
          .from('reading_logs')
          .select('plan_item_id')
          .eq('user_id', userId)
          .in('plan_item_id', allItemIds)
      : { data: [], error: null }

    if (logsResult.error) {
      return NextResponse.json({ error: logsResult.error.message }, { status: 500 })
    }

    const completedSet = new Set((logsResult.data ?? []).map((l) => (l as any).plan_item_id as string))

    const completedDaysByMonth: Record<number, number> = {}

    for (let m = 1; m <= 12; m++) {
      completedDaysByMonth[m] = 0
    }

    for (const [date, ids] of Object.entries(planIdsByDate)) {
      if (ids.length > 0) {
        const completed = ids.reduce((sum, id) => sum + (completedSet.has(id) ? 1 : 0), 0)
        if (completed === ids.length) {
          const m = parseInt(date.split('-')[1], 10)
          completedDaysByMonth[m]++
        }
      }
    }

    const trophies = []
    for (let m = 1; m <= 12; m++) {
      const daysInMonth = getDaysInMonth(year, m)
      const earnedDays = completedDaysByMonth[m]
      trophies.push({
        month: MONTH_NAMES[m - 1],
        monthIndex: m,
        earned: earnedDays,
        total: daysInMonth,
        isCompleted: earnedDays > 0 && earnedDays >= daysInMonth // Or some other logic if you want
      })
    }

    return NextResponse.json({ year, trophies }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[API Yearly Progress GET] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get yearly progress' },
      { status: 500 }
    )
  }
}
