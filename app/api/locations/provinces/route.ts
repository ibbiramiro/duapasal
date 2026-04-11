import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const res = await fetch('https://alamat.thecloudalert.com/api/provinsi/get/', {
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch provinces' }, { status: 502 })
    }

    const json = (await res.json()) as {
      status?: number
      message?: string
      result?: Array<{ id: string; text: string }>
    }

    return NextResponse.json({ data: json.result ?? [] })
  } catch (err) {
    console.error('[Locations] provinces error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
