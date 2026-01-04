import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

type QueueItem = {
  id: string
  user_id: string | null
  recipient_name: string
  recipient_email: string | null
  recipient_phone: string | null
  message_content: string
  session_type: string | null
  status: string
  retry_count: number | null
  error_message: string | null
  scheduled_for: string | null
}

function requireEnv(key: string) {
  const value = process.env[key]
  if (!value) throw new Error(`Missing env: ${key}`)
  return value
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const apiKey = (body as any)?.apiKey as string | undefined
    const dryRun = Boolean((body as any)?.dryRun)

    if (apiKey !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

    const SMTP_HOST = requireEnv('SMTP_HOST')
    const SMTP_USER = requireEnv('SMTP_USER')
    const SMTP_PASSWORD = requireEnv('SMTP_PASSWORD')
    const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465
    const SMTP_SECURE = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true
    const SMTP_FROM = (process.env.SMTP_FROM || SMTP_USER).trim()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Claim rows atomically in the DB to avoid double-send.
    // Requires SQL function: public.claim_reminder_queue(batch_size int)
    const batchSize = typeof (body as any)?.batchSize === 'number' ? (body as any).batchSize : 10

    const { data: claimed, error: claimError } = await supabase.rpc('claim_reminder_queue', {
      batch_size: batchSize,
    })

    if (claimError) {
      return NextResponse.json(
        {
          error: claimError.message,
          hint: 'Missing RPC claim_reminder_queue. Create it in Supabase SQL editor (see instructions).',
        },
        { status: 500 }
      )
    }

    const queue = (claimed ?? []) as QueueItem[]
    if (queue.length === 0) {
      return NextResponse.json({ message: 'No pending reminders' })
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    })

    const subject = 'Reminder Bacaan Harian - Duapasal'

    let sent = 0
    let failed = 0

    // Small delay per email as an extra safety net (in addition to scheduled_for staggering)
    const perEmailDelayMs = typeof (body as any)?.perEmailDelayMs === 'number' ? (body as any).perEmailDelayMs : 250

    for (const item of queue) {
      const to = (item.recipient_email ?? '').trim().toLowerCase()
      if (!to) {
        failed += 1
        await supabase
          .from('reminder_queue')
          .update({
            status: 'failed',
            error_message: 'Missing recipient_email',
          })
          .eq('id', item.id)
        continue
      }

      try {
        if (!dryRun) {
          await transporter.sendMail({
            from: SMTP_FROM,
            to,
            subject,
            html: item.message_content,
          })
        }

        sent += 1
        await supabase
          .from('reminder_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', item.id)

        // Optional log to email_logs if you want audit
        try {
          await supabase.from('email_logs').insert({
            email: to,
            type: 'reading_reminder',
            status: 'sent',
            error: null,
            metadata: {
              queue_id: item.id,
              session_type: item.session_type,
            },
          } as any)
        } catch (_e) {
          // ignore
        }
      } catch (err) {
        failed += 1
        const message = err instanceof Error ? err.message : 'Unknown error'
        const currentRetry = item.retry_count ?? 0
        const nextRetry = currentRetry + 1
        const maxRetry = typeof (body as any)?.maxRetry === 'number' ? (body as any).maxRetry : 3

        // Exponential backoff (minutes): 5, 15, 30...
        const backoffMinutes = nextRetry === 1 ? 5 : nextRetry === 2 ? 15 : 30
        const shouldRetry = nextRetry <= maxRetry
        const nextStatus = shouldRetry ? 'pending' : 'failed'
        const nextScheduledFor = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString()

        await supabase
          .from('reminder_queue')
          .update({
            status: nextStatus,
            retry_count: nextRetry,
            error_message: message,
            scheduled_for: shouldRetry ? nextScheduledFor : item.scheduled_for,
          })
          .eq('id', item.id)

        try {
          await supabase.from('email_logs').insert({
            email: to,
            type: 'reading_reminder',
            status: 'error',
            error: message,
            metadata: {
              queue_id: item.id,
              session_type: item.session_type,
              retry_count: nextRetry,
            },
          } as any)
        } catch (_e) {
          // ignore
        }
      }

      if (perEmailDelayMs > 0) {
        await sleep(perEmailDelayMs)
      }
    }

    return NextResponse.json({ processed: queue.length, sent, failed, dryRun })
  } catch (error) {
    console.error('[send-reading-reminders-worker] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send reminders' },
      { status: 500 }
    )
  }
}
