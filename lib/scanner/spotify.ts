import { supabaseAdmin } from '../supabase'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!

// Jere Klein's official Spotify artist ID — tracks where he's primary are NOT leaks
const JERE_KLEIN_ARTIST_ID = '35oGZihZclGoTVuICPXRP9'

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getSpotifyToken(): Promise<string> {
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`
    },
    body: 'grant_type=client_credentials'
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Spotify token error: ${JSON.stringify(err)}`)
  }

  const data = await res.json()
  return data.access_token as string
}

export async function scanSpotify(keywords: string[]): Promise<{
  leaksFound: number
  tracksScanned: number
  skipped: boolean
  reason?: string
}> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return { leaksFound: 0, tracksScanned: 0, skipped: true, reason: 'Missing Spotify credentials' }
  }

  let token: string
  try {
    token = await getSpotifyToken()
  } catch (err) {
    console.error('Failed to get Spotify token:', err)
    return { leaksFound: 0, tracksScanned: 0, skipped: true, reason: String(err) }
  }

  let leaksFound = 0
  let tracksScanned = 0

  for (const keyword of keywords) {
    await delay(300)
    try {
      const params = new URLSearchParams({
        q: keyword,
        type: 'track',
        limit: '50'
      })

      const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        const err = await res.json()
        console.error(`Spotify search error for keyword "${keyword}":`, err)
        continue
      }

      const data = await res.json()
      const tracks: Array<{
        id: string
        name: string
        artists: Array<{ id: string; name: string }>
        album: { release_date: string }
        external_urls: { spotify: string }
      }> = data.tracks?.items ?? []

      tracksScanned += tracks.length

      for (const track of tracks) {
        const trackId = track.id
        const title = track.name ?? ''
        const artistIds = track.artists?.map(a => a.id) ?? []
        const artistNames = track.artists?.map(a => a.name).join(', ') ?? ''
        const releaseDate = track.album?.release_date ?? null
        const url = `https://open.spotify.com/track/${trackId}`

        if (!trackId) continue

        // Skip if Jere Klein is the primary artist (first artist) — that's official content
        if (artistIds[0] === JERE_KLEIN_ARTIST_ID) continue

        // Only flag tracks that actually reference Jere Klein in title or artist name
        // This prevents false positives from generic keywords like "medellin"
        const titleLower = title.toLowerCase()
        const artistLower = artistNames.toLowerCase()
        const isJereRelated = titleLower.includes('jere') || titleLower.includes('klein') ||
                              artistLower.includes('jere') || artistLower.includes('klein')
        if (!isJereRelated) continue

        const { error: insertError } = await supabaseAdmin
          .from('detected_leaks')
          .insert({
            platform: 'spotify',
            content_id: trackId,
            title,
            url,
            channel_or_artist: artistNames,
            keyword_matched: keyword,
            published_at: releaseDate ? new Date(releaseDate).toISOString() : null,
            notified: false
          })

        // Unique constraint (platform, content_id) will return error code 23505 for duplicates — skip those
        if (insertError) {
          if (insertError.code !== '23505') {
            console.error(`Insert error for Spotify track ${trackId}:`, insertError)
          }
          continue
        }

        leaksFound++
      }
    } catch (err) {
      console.error(`Spotify scan error for keyword "${keyword}":`, err)
    }
  }

  return { leaksFound, tracksScanned, skipped: false }
}
