import { NextResponse } from 'next/server'
import { runFullScan } from '@/lib/scanner'

export const runtime = 'nodejs'

export async function POST() {
  runFullScan().catch(console.error)
  return NextResponse.json({ ok: true, message: 'Scan iniciado' })
}
