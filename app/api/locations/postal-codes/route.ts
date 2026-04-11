import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const regencyId = searchParams.get('regency_id')
  const districtId = searchParams.get('district_id')

  if (!regencyId || !districtId) {
    return NextResponse.json(
      { error: 'regency_id and district_id are required' },
      { status: 400 }
    )
  }

  try {
    void regencyId
    void districtId
    return NextResponse.json({ data: [] })
  } catch (err) {
    console.error('[Locations] postal-codes error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
