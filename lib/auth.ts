import type { User } from '@supabase/supabase-js'

const DEFAULT_ROLE = 'USER'

export async function ensureProfile(user: User) {
  const metadata = user.user_metadata ?? {}
  const reminderRaw = metadata.reminder_opt_in as string | boolean | undefined | null
  const reminderToggle =
    reminderRaw === undefined || reminderRaw === null
      ? null
      : typeof reminderRaw === 'boolean'
        ? reminderRaw
        : reminderRaw === 'true'

  const baseProfile = {
    id: user.id,
    email: user.email ?? null,
    full_name:
      (metadata.full_name as string | undefined) ??
      (metadata.name as string | undefined) ??
      null,
    dob: (metadata.dob as string | undefined) ?? null,
    phone: (metadata.phone as string | undefined) ?? null,
    province: (metadata.province as string | undefined) ?? null,
    city: (metadata.city as string | undefined) ?? null,
    district: (metadata.district as string | undefined) ?? null,
    postal_code: (metadata.postal_code as string | undefined) ?? null,
    address_line: (metadata.address_line as string | undefined) ?? null,
    church_branch: (metadata.church_branch as string | undefined) ?? null,
    pastor_name: (metadata.pastor_name as string | undefined) ?? null,
    role: (user.app_metadata?.role as string | undefined) ?? DEFAULT_ROLE,
    reminder_opt_in: reminderToggle,
  }

  const response = await fetch('/api/profile-sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(baseProfile),
  })

  if (!response.ok) {
    let message = 'Gagal menyinkronkan profil.'

    try {
      const payload = (await response.json()) as { error?: string }
      if (payload?.error) {
        message = payload.error
      }
    } catch (error) {
      // abaikan parsing error dan pakai pesan default
    }

    throw new Error(message)
  }
}
