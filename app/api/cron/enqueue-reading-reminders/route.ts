import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  email_reminder_enabled: boolean | null
}

function requireEnv(key: string) {
  const value = process.env[key]
  if (!value) throw new Error(`Missing env: ${key}`)
  return value
}

function getJakartaDateString(now: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now)
}

function inferSessionType(phone: string | null | undefined): 'morning' | 'evening' {
  const raw = (phone ?? '').trim()
  const digits = raw.replace(/\D/g, '')
  if (!digits) return 'evening'
  const last = digits[digits.length - 1]
  const num = Number(last)
  if (!Number.isFinite(num)) return 'evening'
  return num % 2 === 1 ? 'morning' : 'evening'
}

function buildReminderHtml(params: { fullName: string | null; appUrl: string }) {
  const safeName = params.fullName?.trim() || 'Jemaat Tuhan'
  const link = params.appUrl ? `${params.appUrl.replace(/\/$/, '')}/dashboard` : ''
  const cta = link
    ? `<p style="margin:16px 0 0 0;"><a href="${link}" style="display:inline-block;padding:10px 14px;background:#4f46e5;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;">Buka Bacaan Hari Ini</a></p>`
    : ''

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Reminder Bacaan Harian</title>
    </head>
    <body style="font-family: Arial, sans-serif; background:#f9fafb; margin:0; padding:20px;">
      <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
        <div style="background:linear-gradient(135deg,#4f46e5,#3b82f6); padding:18px 22px; color:#fff;">
          <div style="font-size:16px; font-weight:700;">Reminder Bacaan Harian</div>
          <div style="font-size:13px; opacity:.9; margin-top:4px;">Duapasal</div>
        </div>
        <div style="padding:18px 22px; color:#111827;">
          <p style="margin:0 0 10px 0;">Shalom <b>${safeName}</b>,</p>
          <p style="margin:0 0 10px 0;">Ini pengingat untuk menyelesaikan bacaan harian hari ini.</p>
          <p style="margin:0 0 10px 0;">Tuhan Yesus memberkati!</p>
          ${cta}
          <p style="margin:16px 0 0 0; font-size:12px; color:#6b7280;">Jika Anda tidak ingin menerima email ini, nonaktifkan "Reminder Email" di halaman Profil.</p>
        </div>
      </div>
    </body>
  </html>`
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const session = (searchParams.get('session') ?? '').trim() as 'morning' | 'evening'
    if (session !== 'morning' && session !== 'evening') {
      return NextResponse.json({ error: 'Invalid session. Use ?session=morning|evening' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const apiKey = (body as any)?.apiKey as string | undefined
    if (apiKey !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const today = getJakartaDateString(new Date())

    const { data: items, error: itemsError } = await supabase
      .from('reading_plan_items')
      .select('id')
      .eq('scheduled_date', today)

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    const itemIds = (items ?? []).map((i: any) => i.id)
    if (itemIds.length === 0) {
      return NextResponse.json({ message: 'No reading items scheduled today', date: today, enqueued: 0 })
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone, email_reminder_enabled')
      .eq('email_reminder_enabled', true)

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    const allProfiles = (profiles ?? []) as ProfileRow[]

    const eligibleProfiles = allProfiles
      .filter((p) => Boolean((p.email ?? '').trim()))
      .filter((p) => inferSessionType(p.phone) === session)

    if (eligibleProfiles.length === 0) {
      return NextResponse.json({ message: 'No eligible profiles for this session', date: today, enqueued: 0 })
    }

    const userIds = eligibleProfiles.map((p) => p.id)

    const { data: logs, error: logsError } = await supabase
      .from('reading_logs')
      .select('user_id, plan_item_id')
      .in('plan_item_id', itemIds)
      .in('user_id', userIds)

    if (logsError) {
      return NextResponse.json({ error: logsError.message }, { status: 500 })
    }

    const completedCountByUser = new Map<string, number>()
    for (const row of (logs ?? []) as Array<{ user_id: string; plan_item_id: string }>) {
      completedCountByUser.set(row.user_id, (completedCountByUser.get(row.user_id) ?? 0) + 1)
    }

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '').trim()

    const now = new Date()
    const delaySeconds = 10

    const queuePayload = eligibleProfiles
      .filter((p) => (completedCountByUser.get(p.id) ?? 0) < itemIds.length) // Only remind if NOT completed 2/2
      .map((p, idx) => {
        const scheduled = new Date(now.getTime() + idx * delaySeconds * 1000)
        return {
          user_id: p.id,
          recipient_name: p.full_name?.trim() || 'Jemaat',
          recipient_email: (p.email ?? '').trim().toLowerCase(),
          recipient_phone: (p.phone ?? '-').trim() || '-',
          message_content: buildReminderHtml({ fullName: p.full_name, appUrl: baseUrl }),
          session_type: session,
          status: 'pending',
          retry_count: 0,
          error_message: null,
          scheduled_for: scheduled.toISOString(),
          reminder_date: today,
        }
      })

    if (queuePayload.length === 0) {
      return NextResponse.json({ message: 'All eligible users already completed today', date: today, enqueued: 0 })
    }

    // Requires a unique constraint/index on (user_id, reminder_date, session_type)
    const { error: insertError } = await supabase
      .from('reminder_queue')
      .upsert(queuePayload as any, { onConflict: 'user_id,reminder_date,session_type', ignoreDuplicates: true })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Enqueued',
      date: today,
      session,
      candidates: eligibleProfiles.length,
      enqueued: queuePayload.length,
      delaySeconds,
    })
  } catch (error) {
    console.error('[enqueue-reading-reminders] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to enqueue reading reminders' },
      { status: 500 }
    )
  }
}
