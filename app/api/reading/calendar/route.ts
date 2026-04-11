import { NextResponse } from 'next/server'

import { requireSupabaseAdmin } from '@/lib/supabase-admin'
import { createClient as createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

function getJakartaDateString(now: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now)
}

function getJakartaMonthString(now: Date) {
  return getJakartaDateString(now).slice(0, 7)
}

function getMonthBounds(month: string) {
  const [yStr, mStr] = month.split('-')
  const y = Number(yStr)
  const m = Number(mStr)
  const startDate = `${month}-01`
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`
  return { startDate, endDate }
}

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

    const month = (searchParams.get('month') ?? '').trim() || getJakartaMonthString(new Date())
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Invalid month format. Expected YYYY-MM' }, { status: 400 })
    }

    const { startDate, endDate } = getMonthBounds(month)

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('reading_plan_items')
      .select('id, scheduled_date')
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    const itemRows = (items ?? []) as Array<{ id: string; scheduled_date: string }>

    const byDate: Record<string, string[]> = {}
    for (const it of itemRows) {
      const d = it.scheduled_date
      if (!byDate[d]) byDate[d] = []
      byDate[d].push(it.id)
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

    const days = Object.keys(byDate)
      .sort()
      .map((date) => {
        const ids = byDate[date] ?? []
        const completed = ids.reduce((sum, id) => sum + (completedSet.has(id) ? 1 : 0), 0)
        return {
          date,
          total: ids.length,
          completed,
          missed: ids.length > 0 && completed < ids.length,
        }
      })

    return NextResponse.json({ month, startDate, endDate, days }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[API Reading Calendar GET] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get calendar data' },
      { status: 500 }
    )
  }
}
