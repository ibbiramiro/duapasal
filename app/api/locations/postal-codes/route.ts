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
    const url = `https://alamat.thecloudalert.com/api/kodepos/get/?d_kabkota_id=${encodeURIComponent(regencyId)}&d_kecamatan_id=${encodeURIComponent(districtId)}`
    const res = await fetch(url, { cache: 'no-store' })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch postal codes' }, { status: 502 })
    }

    const json = (await res.json()) as {
      status?: number
      message?: string
      result?: Array<{ id: string; text: string }>
    }

    return NextResponse.json({ data: json.result ?? [] })
  } catch (err) {
    console.error('[Locations] postal-codes error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
