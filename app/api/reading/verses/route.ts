import { NextResponse } from 'next/server'

import { requireSupabaseAdmin } from '@/lib/supabase-admin'
import type { VersesResponse, BibleBook, BibleVerse } from '@/types/reading'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const bookId = searchParams.get('bookId')
    const startChapter = searchParams.get('startChapter')
    const endChapter = searchParams.get('endChapter')

    if (!bookId || !startChapter || !endChapter) {
      return NextResponse.json({ 
        error: 'bookId, startChapter, and endChapter are required' 
      }, { status: 400 })
    }

    const supabaseAdmin = requireSupabaseAdmin()

    // Get book details
    const { data: book, error: bookError } = await supabaseAdmin
      .from('bible_books')
      .select('*')
      .eq('id', parseInt(bookId))
      .single()

    if (bookError || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Get verses for the chapter range
    const startCh = parseInt(startChapter)
    const endCh = parseInt(endChapter)

    const { data: verses, error: versesError } = await supabaseAdmin
      .from('bible_verses')
      .select('*')
      .eq('book_id', parseInt(bookId))
      .gte('chapter', startCh)
      .lte('chapter', endCh)
      .order('chapter')
      .order('verse')

    if (versesError) {
      return NextResponse.json({ error: versesError.message }, { status: 500 })
    }

    // Group verses by chapter
    const versesByChapter: Record<number, BibleVerse[]> = (verses as BibleVerse[])?.reduce((acc, verse) => {
      const chapter = verse.chapter || 1
      if (!acc[chapter]) {
        acc[chapter] = []
      }
      acc[chapter].push(verse)
      return acc
    }, {} as Record<number, BibleVerse[]>) || {}

    return NextResponse.json({
      book,
      versesByChapter,
      chapterRange: {
        start: startCh,
        end: endCh,
        totalChapters: endCh - startCh + 1
      },
      totalVerses: verses?.length || 0
    } as VersesResponse)
  } catch (error) {
    console.error('[API Bible Reader GET] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get Bible verses',
      },
      { status: 500 }
    )
  }
}
