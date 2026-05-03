import { NextRequest, NextResponse } from 'next/server'
import { runFullScan } from '@/lib/scanner'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await runFullScan()
  return NextResponse.json({ ok: true, message: 'Scan completed' })
}
