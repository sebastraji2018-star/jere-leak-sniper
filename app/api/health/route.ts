import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })

  const [lastScanRes, quotaRes, totalLeaksRes] = await Promise.all([
    supabaseAdmin.from('scan_logs').select('completed_at, status, platform').order('started_at', { ascending: false }).limit(1).single(),
    supabaseAdmin.from('youtube_quota').select('units_used').eq('date', today).single(),
    supabaseAdmin.from('detected_leaks').select('*', { count: 'exact', head: true })
  ])

  const hasSpotify = !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET)
  const hasSoundCloud = !!(process.env.SOUNDCLOUD_CLIENT_ID && process.env.SOUNDCLOUD_CLIENT_SECRET)
  const hasYouTube = !!process.env.YOUTUBE_API_KEY
  const hasTelegram = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    apis: {
      youtube: hasYouTube ? 'configured' : 'missing',
      spotify: hasSpotify ? 'configured' : 'missing',
      soundcloud: hasSoundCloud ? 'configured' : 'missing',
      telegram: hasTelegram ? 'configured' : 'missing'
    },
    lastScan: {
      completedAt: lastScanRes.data?.completed_at ?? null,
      status: lastScanRes.data?.status ?? 'unknown'
    },
    quota: {
      used: quotaRes.data?.units_used ?? 0,
      remaining: 10000 - (quotaRes.data?.units_used ?? 0)
    },
    totalLeaks: totalLeaksRes.count ?? 0
  })
}
