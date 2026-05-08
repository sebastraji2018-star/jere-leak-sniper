import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })

  const [leaksRes, totalRes, keywordsRes, quotaRes, logRes, historyRes, spotifyLeaksRes] = await Promise.all([
    supabaseAdmin.from('detected_leaks').select('*').order('detected_at', { ascending: false }).limit(10),
    supabaseAdmin.from('detected_leaks').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('keywords').select('id', { count: 'exact' }).eq('active', true),
    supabaseAdmin.from('youtube_quota').select('units_used').eq('date', today).single(),
    supabaseAdmin.from('scan_logs').select('completed_at, platform, status').order('started_at', { ascending: false }).limit(1).single(),
    supabaseAdmin.from('scan_logs').select('*').order('started_at', { ascending: false }).limit(5),
    supabaseAdmin.from('detected_leaks').select('*', { count: 'exact', head: true }).eq('platform', 'spotify')
  ])

  return NextResponse.json({
    leaks: leaksRes.data ?? [],
    totalLeaks: totalRes.count ?? 0,
    keywordCount: keywordsRes.count ?? 0,
    quotaUsed: quotaRes.data?.units_used ?? 0,
    lastScan: logRes.data?.completed_at ?? null,
    isActive: logRes.data?.status === 'completed',
    scanHistory: historyRes.data ?? [],
    spotifyLeaks: spotifyLeaksRes.count ?? 0
  })
}
