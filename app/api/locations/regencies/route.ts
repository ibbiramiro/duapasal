import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const provinceId = searchParams.get('province_id')

  if (!provinceId) {
    return NextResponse.json({ error: 'province_id is required' }, { status: 400 })
  }

  try {
    const url = `https://alamat.thecloudalert.com/api/kabkota/get/?d_provinsi_id=${encodeURIComponent(provinceId)}`
    const res = await fetch(url, { cache: 'no-store' })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch regencies' }, { status: 502 })
    }

    const json = (await res.json()) as {
      status?: number
      message?: string
      result?: Array<{ id: string; text: string }>
    }

    return NextResponse.json({ data: json.result ?? [] })
  } catch (err) {
    console.error('[Locations] regencies error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
