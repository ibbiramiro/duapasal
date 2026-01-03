import { supabase } from './supabase'
import type { Database } from '../types/supabase'
import type { PostgrestResponse } from '@supabase/supabase-js'

type BibleVerseRow = Database['public']['Tables']['bible_verses']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']

export async function fetchBibleVerses(select = '*'): Promise<PostgrestResponse<BibleVerseRow>> {
  return supabase.from('bible_verses').select(select)
}

export async function fetchProfiles(select = '*'): Promise<PostgrestResponse<ProfileRow>> {
  return supabase.from('profiles').select(select)
}
