import type { User } from '@supabase/supabase-js'

import type { Database } from '@/types/supabase'

const DEFAULT_ROLE = 'USER'

type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

export async function ensureProfile(user: User) {
  const metadata = user.user_metadata ?? {}
  const reminderRaw = (metadata.email_reminder_enabled ?? metadata.reminder_opt_in) as
    | string
    | boolean
    | undefined
    | null
  const reminderToggle =
    reminderRaw === undefined || reminderRaw === null
      ? null
      : typeof reminderRaw === 'boolean'
        ? reminderRaw
        : reminderRaw === 'true'

  const isGoogleSignIn = user.app_metadata?.provider === 'google'

  const baseProfile: ProfileInsert = {
    id: user.id,
    email: user.email ?? null,
    full_name:
      (metadata.full_name as string | undefined) ??
      (metadata.name as string | undefined) ??
      null,
    email_reminder_enabled: reminderToggle,
  }

  type OptionalProfileKey =
    | 'phone'
    | 'province'
    | 'city_regency'
    | 'district'
    | 'postal_code'
    | 'full_address'
    | 'church_id'
    | 'pastor_id'
    | 'dob'
    | 'updated_at'

  const assignField = <K extends OptionalProfileKey>(
    key: K,
    value: ProfileInsert[K] | undefined,
  ) => {
    if (value !== undefined || !isGoogleSignIn) {
      baseProfile[key] = (value ?? null) as ProfileInsert[K]
    }
  }

  assignField('phone', metadata.phone as ProfileInsert['phone'] | undefined)
  assignField('province', metadata.province as ProfileInsert['province'] | undefined)
  assignField(
    'city_regency',
    (metadata.city_regency as string | undefined) ??
      (metadata.city as string | undefined) ??
      undefined,
  )
  assignField('district', metadata.district as ProfileInsert['district'] | undefined)
  assignField('postal_code', metadata.postal_code as ProfileInsert['postal_code'] | undefined)
  assignField(
    'full_address',
    (metadata.full_address as string | undefined) ??
      (metadata.address_line as string | undefined) ??
      undefined,
  )
  assignField('church_id', metadata.church_id as ProfileInsert['church_id'] | undefined)
  assignField('pastor_id', metadata.pastor_id as ProfileInsert['pastor_id'] | undefined)
  assignField('dob', metadata.dob as ProfileInsert['dob'] | undefined)
  assignField('updated_at', new Date().toISOString() as ProfileInsert['updated_at'])

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
