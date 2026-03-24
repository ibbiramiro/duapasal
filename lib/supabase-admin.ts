import { createClient } from '@supabase/supabase-js'

import type { Database } from '../types/supabase'

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null

export function requireSupabaseAdmin() {
  if (!supabaseUrl) {
    throw new Error(
      'Missing SUPABASE_URL environment variable. (Fallback NEXT_PUBLIC_SUPABASE_URL is also not set.)',
    )
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable on the server.')
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return supabaseAdmin
}
