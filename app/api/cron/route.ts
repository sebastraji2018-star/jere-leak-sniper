import { NextRequest, NextResponse } from 'next/server'
import { runYouTubeScan } from '@/lib/scanner'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Respond immediately, process async
  const response = NextResponse.json({ ok: true, message: 'YouTube scan initiated' })
  runYouTubeScan().catch(console.error)
  return response
}
