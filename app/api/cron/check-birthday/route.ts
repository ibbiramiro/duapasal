import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

type BirthdayProfile = {
  id: string
  full_name: string | null
  email: string | null
  dob: string | null
  church_id: string | null
}

type PastorRecipient = {
  id: string
  name: string
  email: string | null
  church_id: string | null
  is_main_pastor: boolean
}

type AdminRecipient = {
  id: string
  full_name: string | null
  email: string | null
  church_id: string | null
  role: string | null
}

function requireEnv(key: string) {
  const value = process.env[key]
  if (!value) throw new Error(`Missing env: ${key}`)
  return value
}

function getTodayMmDdJakarta(now: Date) {
  const month = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Jakarta', month: '2-digit' }).format(now)
  const day = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Jakarta', day: '2-digit' }).format(now)
  return `${month}-${day}`
}

function uniqEmails(emails: Array<string | null | undefined>) {
  const set = new Set<string>()
  for (const e of emails) {
    const trimmed = (e ?? '').trim().toLowerCase()
    if (!trimmed) continue
    set.add(trimmed)
  }
  return Array.from(set)
}

function birthdayGreetingHtml(fullName: string | null, dob: string | null) {
  const safeName = fullName || 'Jemaat Tuhan'
  return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Selamat Ulang Tahun</title>
          <style>
            body { font-family: Arial, sans-serif; background: #f9fafb; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .header { background: linear-gradient(135deg, #fbbf24, #f59e0b); padding: 40px 30px; text-align: center; color: white; }
            .header h1 { margin: 0; font-size: 32px; }
            .body { padding: 30px; }
            .body p { font-size: 16px; line-height: 1.6; color: #374151; }
            .footer { background: #f3f4f6; padding: 20px 30px; text-align: center; font-size: 14px; color: #6b7280; }
            .footer a { color: #2563eb; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎂 Selamat Ulang Tahun!</h1>
            </div>
            <div class="body">
              <p>Shalom <b>${safeName}</b>,</p>
              <p>Pada hari spesial ini, kami dari GBI AVIA ingin mengucapkan selamat ulang tahun. Semoga di usiamu yang baru ini, kasih karunia Tuhan semakin melimpah, sukacita-Nya selalu menyertai, dan rencana-Nya yang indah terwujud dalam hidupmu.</p>
              <p>"Sebab Aku ini mengetahui rancangan-rancangan apa yang ada pada-Ku mengenai kamu, demikianlah firman TUHAN, yaitu rancangan damai sejahtera dan bukan rancangan kecelakaan untuk memberikan kamu hari depan yang penuh harapan." <i>(Yeremia 29:11)</i></p>
              <p>Tuhan Yesus memberkati kamu!</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} GBI AVIA &mdash; <a href="https://duapasal.id">duapasal.id</a></p>
            </div>
          </div>
        </body>
        </html>
      `
}

function birthdayNotifyHtml(params: {
  churchName: string | null
  birthdayPeople: Array<{ full_name: string | null; email: string | null; dob: string | null }>
}) {
  const churchLabel = params.churchName || 'Gereja (tidak terdaftar)'
  const rows = params.birthdayPeople
    .map((p) => {
      const name = p.full_name || '-'
      const email = p.email || '-'
      const dob = p.dob || '-'
      return `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${name}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${email}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${dob}</td></tr>`
    })
    .join('')

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Notifikasi Ulang Tahun Jemaat</title>
      </head>
      <body style="font-family: Arial, sans-serif; background:#f9fafb; margin:0; padding:20px;">
        <div style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <div style="background:#111827;color:#fff;padding:18px 22px;">
            <div style="font-size:16px;font-weight:700;">Notifikasi Ulang Tahun Jemaat</div>
            <div style="font-size:13px;opacity:0.9;margin-top:4px;">${churchLabel}</div>
          </div>
          <div style="padding:18px 22px;">
            <p style="margin:0 0 10px 0;color:#374151;">Shalom Bapak/Ibu Pengurus & Pendeta,</p>
            <p style="margin:0 0 14px 0;color:#374151;">Berikut daftar jemaat yang berulang tahun hari ini:</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <thead>
                <tr>
                  <th align="left" style="padding:8px;border-bottom:2px solid #e5e7eb;">Nama</th>
                  <th align="left" style="padding:8px;border-bottom:2px solid #e5e7eb;">Email</th>
                  <th align="left" style="padding:8px;border-bottom:2px solid #e5e7eb;">DOB</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
            <p style="margin:14px 0 0 0;color:#6b7280;font-size:12px;">Email ini dikirim otomatis dari sistem Duapasal.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export async function POST(request: Request) {
  try {
    // 1. Validasi API Key sederhana agar aman
    const body = await request.json();
    const apiKey = body?.apiKey as string | undefined
    const dryRun = Boolean(body?.dryRun)
    if (apiKey !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate required env (fail fast with clear message)
    const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    const SMTP_HOST = requireEnv('SMTP_HOST')
    const SMTP_USER = requireEnv('SMTP_USER')
    const SMTP_PASSWORD = requireEnv('SMTP_PASSWORD')
    const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465
    const SMTP_SECURE = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true

    // 2. Inisialisasi Supabase di dalam Next.js
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    // 3. Ambil data yang ultah hari ini
    const now = new Date();
    const mmdd = getTodayMmDdJakarta(now);
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, dob, church_id')
      .filter('dob', 'like', `%${mmdd}`);

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ message: 'No birthdays today' });
    }

    // 4. Setup Transporter SMTP
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    });

    // 5. Prepare monitoring payload
    const birthdayProfiles = (profiles as BirthdayProfile[]).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      dob: p.dob,
      church_id: p.church_id,
    }))

    // Helper log
    async function logEmailAttempt(params: {
      email: string
      type: string
      status: 'sent' | 'failed'
      error?: string
      metadata?: Record<string, unknown>
    }) {
      await supabase.from('email_logs').insert({
        email: params.email,
        type: params.type,
        status: params.status,
        error: params.error ?? null,
        metadata: (params.metadata ?? null) as any,
      })
    }

    // 6. Send birthday greeting to birthday people
    const greetingResults: Array<{ email: string; status: 'sent' | 'failed'; error?: string }> = []

    for (const p of birthdayProfiles) {
      if (!p.email) continue
      const html = birthdayGreetingHtml(p.full_name, p.dob)

      if (dryRun) {
        greetingResults.push({ email: p.email, status: 'sent' })
        continue
      }

      try {
        await transporter.sendMail({
          from: '"GBI AVIA" <ramirogunady@gmail.com>',
          to: p.email,
          subject: `Selamat Ulang Tahun, ${p.full_name ?? ''}! 🎂`,
          html,
        })

        await logEmailAttempt({
          email: p.email,
          type: 'birthday_greeting',
          status: 'sent',
          metadata: { profile_id: p.id, full_name: p.full_name, dob: p.dob, church_id: p.church_id },
        })
        greetingResults.push({ email: p.email, status: 'sent' })
      } catch (e: any) {
        await logEmailAttempt({
          email: p.email,
          type: 'birthday_greeting',
          status: 'failed',
          error: e?.message,
          metadata: { profile_id: p.id, full_name: p.full_name, dob: p.dob, church_id: p.church_id },
        })
        greetingResults.push({ email: p.email, status: 'failed', error: e?.message })
      }
    }

    // 7. Notify church admins + pastors (grouped by church_id)
    const churchIds = Array.from(new Set(birthdayProfiles.map((p) => p.church_id).filter(Boolean))) as string[]
    let churchesById = new Map<string, { id: string; name: string }>()
    if (churchIds.length) {
      const { data: churches, error: churchesError } = await supabase
        .from('churches')
        .select('id, name')
        .in('id', churchIds)
      if (!churchesError && churches) {
        churchesById = new Map(churches.map((c: any) => [c.id, { id: c.id, name: c.name }]))
      }
    }

    const { data: pastors, error: pastorsError } = churchIds.length
      ? await supabase.from('pastors').select('id, name, email, church_id, is_main_pastor').in('church_id', churchIds)
      : { data: [], error: null }
    if (pastorsError) {
      return NextResponse.json({ error: pastorsError.message }, { status: 500 })
    }

    const { data: admins, error: adminsError } = churchIds.length
      ? await supabase
          .from('profiles')
          .select('id, full_name, email, church_id, role')
          .in('church_id', churchIds)
          .eq('role', 'ADMIN')
      : { data: [], error: null }
    if (adminsError) {
      return NextResponse.json({ error: adminsError.message }, { status: 500 })
    }

    const pastorsByChurch = (pastors as PastorRecipient[]).reduce((acc, p) => {
      if (!p.church_id) return acc
      if (!acc[p.church_id]) acc[p.church_id] = []
      acc[p.church_id].push(p)
      return acc
    }, {} as Record<string, PastorRecipient[]>)

    const adminsByChurch = (admins as AdminRecipient[]).reduce((acc, a) => {
      if (!a.church_id) return acc
      if (!acc[a.church_id]) acc[a.church_id] = []
      acc[a.church_id].push(a)
      return acc
    }, {} as Record<string, AdminRecipient[]>)

    const birthdaysByChurch = birthdayProfiles.reduce((acc, p) => {
      const key = p.church_id || '__none__'
      if (!acc[key]) acc[key] = []
      acc[key].push(p)
      return acc
    }, {} as Record<string, BirthdayProfile[]>)

    const notifyResults: Array<{ church_id: string | null; recipients: string[]; status: 'sent' | 'skipped' | 'failed'; error?: string }> = []

    for (const [churchKey, people] of Object.entries(birthdaysByChurch)) {
      const churchId = churchKey === '__none__' ? null : churchKey
      if (!churchId) {
        notifyResults.push({ church_id: null, recipients: [], status: 'skipped' })
        continue
      }

      const pastorEmails = (pastorsByChurch[churchId] || []).map((p) => p.email)
      const adminEmails = (adminsByChurch[churchId] || []).map((a) => a.email)
      const recipients = uniqEmails([...pastorEmails, ...adminEmails]).filter((e) => !people.some((p) => (p.email ?? '').toLowerCase() === e))

      if (recipients.length === 0) {
        notifyResults.push({ church_id: churchId, recipients: [], status: 'skipped' })
        continue
      }

      const churchName = churchesById.get(churchId)?.name ?? null
      const html = birthdayNotifyHtml({
        churchName,
        birthdayPeople: people.map((p) => ({ full_name: p.full_name, email: p.email, dob: p.dob })),
      })

      if (dryRun) {
        notifyResults.push({ church_id: churchId, recipients, status: 'sent' })
        continue
      }

      try {
        await transporter.sendMail({
          from: '"GBI AVIA" <ramirogunady@gmail.com>',
          to: recipients,
          subject: `Notifikasi Ulang Tahun Jemaat - ${churchName ?? 'Gereja'}`,
          html,
        })

        for (const email of recipients) {
          await logEmailAttempt({
            email,
            type: 'birthday_notify',
            status: 'sent',
            metadata: {
              church_id: churchId,
              church_name: churchName,
              birthdays: people.map((p) => ({ id: p.id, full_name: p.full_name, email: p.email, dob: p.dob })),
            },
          })
        }

        notifyResults.push({ church_id: churchId, recipients, status: 'sent' })
      } catch (e: any) {
        for (const email of recipients) {
          await logEmailAttempt({
            email,
            type: 'birthday_notify',
            status: 'failed',
            error: e?.message,
            metadata: {
              church_id: churchId,
              church_name: churchName,
              birthdays: people.map((p) => ({ id: p.id, full_name: p.full_name, email: p.email, dob: p.dob })),
            },
          })
        }
        notifyResults.push({ church_id: churchId, recipients, status: 'failed', error: e?.message })
      }
    }

    const sentGreetings = greetingResults.filter((r) => r.status === 'sent').length
    const failedGreetings = greetingResults.filter((r) => r.status === 'failed').length

    return NextResponse.json({
      success: true,
      dryRun,
      mmdd,
      birthdays: birthdayProfiles,
      greeting: { total: greetingResults.length, sent: sentGreetings, failed: failedGreetings },
      notify: notifyResults,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
