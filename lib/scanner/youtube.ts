import { supabaseAdmin } from '../supabase'
import { canRunYouTubeScan, addQuotaUsed } from '../quota'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY!
const MAX_KEYWORDS = 8

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getMonitoringStartDate(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('system_config')
    .select('value')
    .eq('key', 'monitoring_start_date')
    .single()
  return data?.value ?? new Date().toISOString()
}

async function getOfficialChannels(): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('official_accounts')
    .select('account_id')
    .eq('platform', 'youtube')
  return data?.map(r => r.account_id) ?? []
}

export async function scanYouTube(keywords: string[]): Promise<{
  leaksFound: number
  unitsUsed: number
  skipped: boolean
  reason?: string
}> {
  const activeKeywords = keywords.slice(0, MAX_KEYWORDS)

  const canRun = await canRunYouTubeScan(activeKeywords.length)
  if (!canRun) {
    return { leaksFound: 0, unitsUsed: 0, skipped: true, reason: 'Cuota diaria insuficiente' }
  }

  const startDate = await getMonitoringStartDate()
  const officialChannels = await getOfficialChannels()
  let leaksFound = 0
  let unitsUsed = 0

  for (const keyword of activeKeywords) {
    await delay(500)
    try {
      const params = new URLSearchParams({
        q: keyword,
        part: 'snippet',
        type: 'video',
        order: 'date',
        publishedAfter: new Date(startDate).toISOString(),
        maxResults: '25',
        key: YOUTUBE_API_KEY
      })

      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`)
      await addQuotaUsed(100)
      unitsUsed += 100

      if (!res.ok) {
        const err = await res.json()
        console.error('YouTube API error:', err)
        continue
      }

      const data = await res.json()
      const items = data.items ?? []

      for (const item of items) {
        const channelId = item.snippet?.channelId
        const videoId = item.id?.videoId
        const title = item.snippet?.title ?? ''
        const publishedAt = item.snippet?.publishedAt

        if (!videoId) continue
        if (officialChannels.includes(channelId)) continue
        if (!title.toLowerCase().includes(keyword.toLowerCase())) continue
        if (publishedAt && new Date(publishedAt) < new Date(startDate)) continue

        const { error: insertError } = await supabaseAdmin
          .from('detected_leaks')
          .insert({
            platform: 'youtube',
            content_id: videoId,
            title,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            channel_or_artist: item.snippet?.channelTitle,
            keyword_matched: keyword,
            published_at: publishedAt,
            notified: false
          })
          .select()

        if (!insertError) {
          leaksFound++
        }
      }
    } catch (err) {
      console.error(`YouTube scan error for keyword "${keyword}":`, err)
    }
  }

  return { leaksFound, unitsUsed, skipped: false }
}
