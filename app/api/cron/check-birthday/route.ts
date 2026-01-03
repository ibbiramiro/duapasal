import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    // 1. Validasi API Key sederhana agar aman
    const { apiKey } = await request.json();
    if (apiKey !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Inisialisasi Supabase di dalam Next.js
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. Ambil data yang ultah hari ini
    const today = new Date();
    const mmdd = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('full_name, email, dob')
      .filter('dob', 'like', `%${mmdd}`);

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ message: 'No birthdays today' });
    }

    // 4. Setup Transporter SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // 5. Kirim Email dan log
    let sentCount = 0;
    for (const profile of profiles) {
      if (!profile.email) continue;

      const emailHtml = `
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
              <p>Shalom <b>${profile.full_name}</b>,</p>
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
      `;

      try {
        await transporter.sendMail({
          from: '"GBI AVIA" <no-reply@duapasal.id>',
          to: profile.email,
          subject: `Selamat Ulang Tahun, ${profile.full_name}! 🎂`,
          html: emailHtml,
        });

        // Log sukses
        await supabase.from('email_logs').insert({
          email: profile.email,
          type: 'birthday',
          status: 'sent',
          metadata: { full_name: profile.full_name, dob: profile.dob },
        });

        sentCount++;
      } catch (emailError: any) {
        // Log error
        await supabase.from('email_logs').insert({
          email: profile.email,
          type: 'birthday',
          status: 'failed',
          error: emailError.message,
          metadata: { full_name: profile.full_name, dob: profile.dob },
        });
      }
    }

    return NextResponse.json({ success: true, sent: sentCount, total: profiles.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
