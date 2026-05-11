import { supabaseAdmin } from '../supabase'

// SoundCloud API v2 — only needs client_id, no OAuth2 required for search
const CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID

// Username patterns that belong to the official Jere Klein account — skip these
const OFFICIAL_USERNAME_PATTERNS = ['jereklein', 'jere-klein', 'jere klein']

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface SoundCloudTrack {
  id: number
  title: string
  user: { id: number; username: string; permalink_url: string }
  permalink_url: string
  created_at: string
}

export async function scanSoundCloud(keywords: string[]): Promise<{
  leaksFound: number
  tracksScanned: number
  skipped: boolean
  reason?: string
}> {
  if (!CLIENT_ID) {
    return { leaksFound: 0, tracksScanned: 0, skipped: true, reason: 'Missing SOUNDCLOUD_CLIENT_ID' }
  }

  let leaksFound = 0
  let tracksScanned = 0

  for (const keyword of keywords) {
    await delay(400)
    try {
      // API v2 — public search, no OAuth token needed, only client_id
      const params = new URLSearchParams({
        q: keyword,
        client_id: CLIENT_ID,
        limit: '50'
      })

      const res = await fetch(`https://api-v2.soundcloud.com/search/tracks?${params}`, {
        headers: {
          'Accept': 'application/json; charset=utf-8',
          'User-Agent': 'Mozilla/5.0'
        }
      })

      if (!res.ok) {
        const text = await res.text()
        console.error(`SoundCloud search error for keyword "${keyword}": ${res.status} ${text}`)
        continue
      }

      const data = await res.json()
      const tracks: SoundCloudTrack[] = data.collection ?? []
      tracksScanned += tracks.length

      for (const track of tracks) {
        const usernameLower = track.user?.username?.toLowerCase() ?? ''
        const titleLower = track.title?.toLowerCase() ?? ''

        // Skip official Jere Klein account
        const isOfficial = OFFICIAL_USERNAME_PATTERNS.some(p => usernameLower.includes(p))
        if (isOfficial) continue

        // Only flag tracks that reference Jere/Klein in title or uploader username
        const isJereRelated =
          titleLower.includes('jere') || titleLower.includes('klein') ||
          usernameLower.includes('jere') || usernameLower.includes('klein')
        if (!isJereRelated) continue

        const contentId = String(track.id)
        const url = track.permalink_url
        const publishedAt = track.created_at ? new Date(track.created_at).toISOString() : null

        const { error: insertError } = await supabaseAdmin
          .from('detected_leaks')
          .insert({
            platform: 'soundcloud',
            content_id: contentId,
            title: track.title,
            url,
            channel_or_artist: track.user?.username ?? null,
            keyword_matched: keyword,
            published_at: publishedAt,
            notified: false
          })

        // 23505 = unique constraint violation (already detected) — skip silently
        if (insertError) {
          if (insertError.code !== '23505') {
            console.error(`Insert error for SoundCloud track ${contentId}:`, insertError)
          }
          continue
        }

        leaksFound++
      }
    } catch (err) {
      console.error(`SoundCloud scan error for keyword "${keyword}":`, err)
    }
  }

  return { leaksFound, tracksScanned, skipped: false }
}
