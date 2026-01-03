import { NextResponse } from 'next/server'

import { fetchBibleVerses } from '../../../lib/queries'

export async function GET() {
  const { data, error } = await fetchBibleVerses()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
