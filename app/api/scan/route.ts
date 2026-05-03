import { NextResponse } from 'next/server'
import { runFullScan } from '@/lib/scanner'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST() {
  await runFullScan()
  return NextResponse.json({ ok: true, message: 'Scan completado' })
}
