import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '../types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

let client: SupabaseClient<Database> | null = null

function getClient() {
  if (client) return client

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (and optionally SUPABASE_URL / SUPABASE_ANON_KEY for server).',
    )
  }

  client = createClient<Database>(supabaseUrl, supabaseAnonKey)
  return client
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const c = getClient() as any
    return c[prop]
  },
})
