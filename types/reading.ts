import type { Database } from '@/types/supabase'

export type ReadingPlanItemWithBook = Database['public']['Tables']['reading_plan_items']['Row'] & {
  bible_books: Database['public']['Tables']['bible_books']['Row']
}

export type BibleVerse = Database['public']['Tables']['bible_verses']['Row']

export type BibleBook = Database['public']['Tables']['bible_books']['Row']

export type VersesByChapter = Record<number, BibleVerse[]>

export type VersesResponse = {
  book: BibleBook
  versesByChapter: VersesByChapter
  chapterRange: {
    start: number
    end: number
    totalChapters: number
  }
  totalVerses: number
}

export type TodayReadingResponse = {
  date: string
  items: ReadingPlanItemWithBook[]
  completedItems: string[]
  userStats: {
    totalPoints: number
    currentStreak: number
    todayPoints: number
  }
}

export type CompleteReadingResponse = {
  readingLog: Database['public']['Tables']['reading_logs']['Row']
  pointsEarned: number
  dayCompleted: boolean
  updatedProfile?: Database['public']['Tables']['profiles']['Row']
  progress: {
    completed: number
    total: number
    percentage: number
  }
  message: string
}
