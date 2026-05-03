import { NextResponse } from 'next/server'
import { sendTestNotification } from '@/lib/notifications/telegram'

export async function POST() {
  const result = await sendTestNotification()
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
