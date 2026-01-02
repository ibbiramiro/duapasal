import { createClient } from '@supabase/supabase-js'

import type { Database } from '../types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable.')
}

const supabaseAdmin = serviceRoleKey
  ? createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

export function requireSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable on the server.')
  }

  return supabaseAdmin
}
