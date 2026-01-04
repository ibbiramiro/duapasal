import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const regencyId = searchParams.get('regency_id')

  if (!regencyId) {
    return NextResponse.json({ error: 'regency_id is required' }, { status: 400 })
  }

  try {
    const url = `https://alamat.thecloudalert.com/api/kecamatan/get/?d_kabkota_id=${encodeURIComponent(regencyId)}`
    const res = await fetch(url, { cache: 'no-store' })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch districts' }, { status: 502 })
    }

    const json = (await res.json()) as {
      status?: number
      message?: string
      result?: Array<{ id: string; text: string }>
    }

    return NextResponse.json({ data: json.result ?? [] })
  } catch (err) {
    console.error('[Locations] districts error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
