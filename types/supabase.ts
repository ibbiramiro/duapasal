export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Timestamp = string | null

export type Database = {
  public: {
    Tables: {
      bible_verses: {
        Row: {
          id: number
          book_id: number | null
          chapter: number | null
          verse: number | null
          text: string | null
        }
        Insert: {
          id?: number
          book_id?: number | null
          chapter?: number | null
          verse?: number | null
          text?: string | null
        }
        Update: {
          id?: number
          book_id?: number | null
          chapter?: number | null
          verse?: number | null
          text?: string | null
        }
        Relationships: []
      }
      bible_books: {
        Row: {
          id: number
          name: string
          order_number: number | null
        }
        Insert: {
          id?: number
          name: string
          order_number?: number | null
        }
        Update: {
          id?: number
          name?: string
          order_number?: number | null
        }
        Relationships: []
      }
      churches: {
        Row: {
          id: string
          name: string
          city_regency: string | null
          address: string | null
          created_at: Timestamp
          updated_at: Timestamp
        }
        Insert: {
          id?: string
          name: string
          city_regency?: string | null
          address?: string | null
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        Update: {
          id?: string
          name?: string
          city_regency?: string | null
          address?: string | null
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        Relationships: []
      }
      pastors: {
        Row: {
          id: string
          name: string
          church_id: string | null
          email: string | null
          phone: string | null
          is_main_pastor: boolean
          created_at: Timestamp
          updated_at: Timestamp
        }
        Insert: {
          id?: string
          name: string
          church_id?: string | null
          email?: string | null
          phone?: string | null
          is_main_pastor?: boolean
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        Update: {
          id?: string
          name?: string
          church_id?: string | null
          email?: string | null
          phone?: string | null
          is_main_pastor?: boolean
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        Relationships: [
          {
            foreignKeyName: 'pastors_church_id_fkey'
            columns: ['church_id']
            referencedRelation: 'churches'
            referencedColumns: ['id']
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          phone: string | null
          dob: string | null
          role: string | null
          church_id: string | null
          pastor_id: string | null
          province: string | null
          city_regency: string | null
          district: string | null
          postal_code: string | null
          full_address: string | null
          email_reminder_enabled: boolean | null
          total_points: number | null
          current_streak: number | null
          longest_streak: number | null
          created_at: Timestamp
          updated_at: Timestamp
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          dob?: string | null
          role?: string | null
          church_id?: string | null
          pastor_id?: string | null
          province?: string | null
          city_regency?: string | null
          district?: string | null
          postal_code?: string | null
          full_address?: string | null
          email_reminder_enabled?: boolean | null
          total_points?: number | null
          current_streak?: number | null
          longest_streak?: number | null
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          dob?: string | null
          role?: string | null
          church_id?: string | null
          pastor_id?: string | null
          province?: string | null
          city_regency?: string | null
          district?: string | null
          postal_code?: string | null
          full_address?: string | null
          email_reminder_enabled?: boolean | null
          total_points?: number | null
          current_streak?: number | null
          longest_streak?: number | null
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_church_id_fkey'
            columns: ['church_id']
            referencedRelation: 'churches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profiles_pastor_id_fkey'
            columns: ['pastor_id']
            referencedRelation: 'pastors'
            referencedColumns: ['id']
          }
        ]
      }
      email_logs: {
        Row: {
          id: string
          email: string
          type: string
          status: string
          error: string | null
          metadata: Json | null
          created_at: Timestamp
          updated_at: Timestamp
        }
        Insert: {
          id?: string
          email: string
          type: string
          status: string
          error?: string | null
          metadata?: Json | null
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        Update: {
          id?: string
          email?: string
          type?: string
          status?: string
          error?: string | null
          metadata?: Json | null
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        Relationships: []
      }
      reading_plans: {
        Row: {
          id: string
          date: string
          created_at: Timestamp
          updated_at: Timestamp
        }
        Insert: {
          id?: string
          date: string
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        Update: {
          id?: string
          date?: string
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        Relationships: []
      }
      reading_plan_items: {
        Row: {
          id: string
          book_id: number
          start_chapter: number
          end_chapter: number
          order_index: number
          scheduled_date: string
        }
        Insert: {
          id?: string
          book_id: number
          start_chapter: number
          end_chapter: number
          order_index: number
          scheduled_date: string
        }
        Update: {
          id?: string
          book_id?: number
          start_chapter?: number
          end_chapter?: number
          order_index?: number
          scheduled_date?: string
        }
        Relationships: []
      }
      reading_logs: {
        Row: {
          id: string
          user_id: string
          plan_item_id: string
          completed_at: Timestamp
          points_earned: number
          created_at: Timestamp
        }
        Insert: {
          id?: string
          user_id: string
          plan_item_id: string
          completed_at?: Timestamp
          points_earned: number
          created_at?: Timestamp
        }
        Update: {
          id?: string
          user_id?: string
          plan_item_id?: string
          completed_at?: Timestamp
          points_earned?: number
          created_at?: Timestamp
        }
        Relationships: []
      }
      maintenance: {
        Row: {
          id: string
          enabled: boolean
          title: string | null
          message: string | null
          start_at: string | null
          end_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          enabled: boolean
          title?: string | null
          message?: string | null
          start_at?: string | null
          end_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          enabled?: boolean
          title?: string | null
          message?: string | null
          start_at?: string | null
          end_at?: string | null
          created_at?: string
          updated_at?: string
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
