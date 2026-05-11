import { supabaseAdmin } from '../supabase'
import { scanYouTube } from './youtube'
import { scanSpotify } from './spotify'
import { scanSoundCloud } from './soundcloud'
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
  // ── Deduplication guard ──────────────────────────────────────────────────
  // Prevent duplicate scans when multiple cron systems fire close together.
  // If any scan (any platform) started in the last 90 minutes, skip this run.
  const { data: lastLog } = await supabaseAdmin
    .from('scan_logs')
    .select('started_at')
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  if (lastLog?.started_at) {
    const minsSinceLast = (Date.now() - new Date(lastLog.started_at).getTime()) / 60000
    if (minsSinceLast < 90) {
      console.log(`[runFullScan] Skipped — last scan was ${Math.round(minsSinceLast)}m ago (< 90m threshold)`)
      return
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const keywords = await getActiveKeywords()

  // Run YouTube, Spotify and SoundCloud scans in parallel — they are independent
  const [youtubeResult, spotifyResult, soundcloudResult] = await Promise.all([
    runYouTubeScan(),
    (async () => {
      const logId = await createScanLog('spotify')
      try {
        const result = await scanSpotify(keywords)
        await completeScanLog(logId, {
          keywordsScanned: keywords.length,
          leaksFound: result.leaksFound
        })
        return result
      } catch (err) {
        await completeScanLog(logId, { keywordsScanned: keywords.length, leaksFound: 0, error: String(err) })
        return { leaksFound: 0, tracksScanned: 0, skipped: true, reason: String(err) }
      }
    })(),
    (async () => {
      const logId = await createScanLog('soundcloud')
      try {
        const result = await scanSoundCloud(keywords)
        await completeScanLog(logId, {
          keywordsScanned: keywords.length,
          leaksFound: result.leaksFound
        })
        return result
      } catch (err) {
        await completeScanLog(logId, { keywordsScanned: keywords.length, leaksFound: 0, error: String(err) })
        return { leaksFound: 0, tracksScanned: 0, skipped: true, reason: String(err) }
      }
    })()
  ])

  // Fetch leaks detected in the last 5 minutes to include in the report
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: recentLeaks } = await supabaseAdmin
    .from('detected_leaks')
    .select('title, platform, url, keyword_matched')
    .gte('detected_at', fiveMinutesAgo)
    .order('detected_at', { ascending: false })

  await sendScanReport({
    leaksFound: youtubeResult.leaksFound + spotifyResult.leaksFound + soundcloudResult.leaksFound,
    youtubeKeywords: keywords.length,
    spotifyKeywords: keywords.length,
    spotifyTracksScanned: spotifyResult.tracksScanned,
    soundcloudTracksScanned: soundcloudResult.tracksScanned,
    leaks: recentLeaks ?? []
  })
}
