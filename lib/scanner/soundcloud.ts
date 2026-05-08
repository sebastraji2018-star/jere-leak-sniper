import { supabaseAdmin } from '../supabase'

const CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID!
const CLIENT_SECRET = process.env.SOUNDCLOUD_CLIENT_SECRET!

// Username patterns that belong to the official Jere Klein account — skip these
const OFFICIAL_USERNAME_PATTERNS = ['jereklein', 'jere-klein', 'jere klein']

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getSoundCloudToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  })

  const res = await fetch('https://api.soundcloud.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`SoundCloud token error: ${JSON.stringify(err)}`)
  }

  const data = await res.json()
  return data.access_token as string
}

interface SoundCloudTrack {
  id: number
  title: string
  user: { id: number; username: string; permalink_url: string }
  permalink_url: string
  created_at: string
  user_id: number
}

export async function scanSoundCloud(keywords: string[]): Promise<{
  leaksFound: number
  tracksScanned: number
  skipped: boolean
  reason?: string
}> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return { leaksFound: 0, tracksScanned: 0, skipped: true, reason: 'Missing SoundCloud credentials' }
  }

  let token: string
  try {
    token = await getSoundCloudToken()
  } catch (err) {
    console.error('Failed to get SoundCloud token:', err)
    return { leaksFound: 0, tracksScanned: 0, skipped: true, reason: String(err) }
  }

  let leaksFound = 0
  let tracksScanned = 0

  for (const keyword of keywords) {
    await delay(400)
    try {
      const params = new URLSearchParams({ q: keyword, limit: '50' })
      const res = await fetch(`https://api.soundcloud.com/search/tracks?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        const err = await res.json()
        console.error(`SoundCloud search error for keyword "${keyword}":`, err)
        continue
      }

      const data = await res.json()
      // SoundCloud search returns { collection: [...] }
      const tracks: SoundCloudTrack[] = data.collection ?? []
      tracksScanned += tracks.length

      for (const track of tracks) {
        const usernameLower = track.user?.username?.toLowerCase() ?? ''

        // Skip if this looks like the official Jere Klein account
        const isOfficial = OFFICIAL_USERNAME_PATTERNS.some(pattern => usernameLower.includes(pattern))
        if (isOfficial) continue

        const titleLower = track.title?.toLowerCase() ?? ''

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

        // Unique constraint (platform, content_id) returns 23505 for duplicates — skip silently
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
