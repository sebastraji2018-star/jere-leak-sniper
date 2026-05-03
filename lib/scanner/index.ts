import { supabaseAdmin } from '../supabase'
import { scanYouTube } from './youtube'
import { sendScanReport } from '../notifications/telegram'

async function getActiveKeywords(): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('keywords')
    .select('term')
    .eq('active', true)
  return data?.map(k => k.term) ?? []
}

async function createScanLog(platform: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('scan_logs')
    .insert({ platform, status: 'running' })
    .select('id')
    .single()
  return data?.id ?? ''
}

async function completeScanLog(id: string, stats: {
  keywordsScanned: number
  leaksFound: number
  youtubeUnitsUsed?: number
  error?: string
}) {
  await supabaseAdmin
    .from('scan_logs')
    .update({
      completed_at: new Date().toISOString(),
      status: stats.error ? 'error' : 'completed',
      keywords_scanned: stats.keywordsScanned,
      leaks_found: stats.leaksFound,
      youtube_units_used: stats.youtubeUnitsUsed ?? 0,
      error_message: stats.error ?? null
    })
    .eq('id', id)
}

export async function runYouTubeScan(): Promise<{ leaksFound: number; unitsUsed: number; keywords: string[] }> {
  const keywords = await getActiveKeywords()
  const logId = await createScanLog('youtube')
  try {
    const result = await scanYouTube(keywords)
    await completeScanLog(logId, {
      keywordsScanned: keywords.length,
      leaksFound: result.leaksFound,
      youtubeUnitsUsed: result.unitsUsed
    })
    return { leaksFound: result.leaksFound, unitsUsed: result.unitsUsed, keywords }
  } catch (err) {
    await completeScanLog(logId, { keywordsScanned: keywords.length, leaksFound: 0, error: String(err) })
    return { leaksFound: 0, unitsUsed: 0, keywords }
  }
}

export async function runFullScan(): Promise<void> {
  const result = await runYouTubeScan()

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: recentLeaks } = await supabaseAdmin
    .from('detected_leaks')
    .select('title, platform, url, keyword_matched')
    .gte('detected_at', fiveMinutesAgo)
    .order('detected_at', { ascending: false })

  await sendScanReport({
    leaksFound: result.leaksFound,
    youtubeKeywords: result.keywords.length,
    leaks: recentLeaks ?? []
  })
}
