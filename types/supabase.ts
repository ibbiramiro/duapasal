export type Database = {
  public: {
    Tables: {
      bible_verses: {
        Row: {
          id: number
          book: string | null
          chapter: number | null
          verse: number | null
          text: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          book?: string | null
          chapter?: number | null
          verse?: number | null
          text?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          book?: string | null
          chapter?: number | null
          verse?: number | null
          text?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          dob: string | null
          phone: string | null
          church_branch: string | null
          pastor_name: string | null
          province: string | null
          city: string | null
          district: string | null
          postal_code: string | null
          address_line: string | null
          role: string | null
          reminder_opt_in: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          dob?: string | null
          phone?: string | null
          church_branch?: string | null
          pastor_name?: string | null
          province?: string | null
          city?: string | null
          district?: string | null
          postal_code?: string | null
          address_line?: string | null
          role?: string | null
          reminder_opt_in?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          dob?: string | null
          phone?: string | null
          church_branch?: string | null
          pastor_name?: string | null
          province?: string | null
          city?: string | null
          district?: string | null
          postal_code?: string | null
          address_line?: string | null
          role?: string | null
          reminder_opt_in?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
