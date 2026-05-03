import { supabaseAdmin } from '../supabase'
import { sendLeakNotification } from '../notifications/telegram'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getSpotifyToken(): Promise<string> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
    },
    body: 'grant_type=client_credentials'
  })
  const data = await res.json()
  return data.access_token
}

async function getMonitoringStartDate(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('system_config')
    .select('value')
    .eq('key', 'monitoring_start_date')
    .single()
  return data?.value ?? new Date().toISOString()
}

async function getOfficialArtists(): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('official_accounts')
    .select('account_id')
    .eq('platform', 'spotify')
  return data?.map(r => r.account_id) ?? []
}

export async function scanSpotify(keywords: string[]): Promise<{
  leaksFound: number
  skipped: boolean
  reason?: string
}> {
  const token = await getSpotifyToken()
  const startDate = await getMonitoringStartDate()
  const officialArtists = await getOfficialArtists()
  let leaksFound = 0

  for (const keyword of keywords) {
    await delay(500)
    try {
      const params = new URLSearchParams({
        q: keyword,
        type: 'track',
        limit: '50',
        market: 'AR'
      })

      const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        const err = await res.json()
        console.error('Spotify API error:', err)
        continue
      }

      const data = await res.json()
      const tracks = data.tracks?.items ?? []

      for (const track of tracks) {
        const releaseDate = track.album?.release_date
        const trackId = track.id
        const title = track.name ?? ''
        const artistIds = track.artists?.map((a: { id: string }) => a.id) ?? []
        const artistNames = track.artists?.map((a: { name: string }) => a.name).join(', ') ?? ''

        if (!trackId) continue
        if (!title.toLowerCase().includes(keyword.toLowerCase())) continue
        if (releaseDate && new Date(releaseDate) < new Date(startDate)) continue
        if (artistIds.some((id: string) => officialArtists.includes(id))) continue

        const { error: insertError } = await supabaseAdmin
          .from('detected_leaks')
          .insert({
            platform: 'spotify',
            content_id: trackId,
            title,
            url: `https://open.spotify.com/track/${trackId}`,
            channel_or_artist: artistNames,
            keyword_matched: keyword,
            published_at: releaseDate ? new Date(releaseDate).toISOString() : null,
            notified: false
          })
          .select()

        if (!insertError) {
          leaksFound++
          await sendLeakNotification({
            title,
            platform: 'spotify',
            keyword_matched: keyword,
            url: `https://open.spotify.com/track/${trackId}`,
            published_at: releaseDate ? new Date(releaseDate).toISOString() : null
          })
          await supabaseAdmin
            .from('detected_leaks')
            .update({ notified: true })
            .eq('platform', 'spotify')
            .eq('content_id', trackId)
        }
      }
    } catch (err) {
      console.error(`Spotify scan error for keyword "${keyword}":`, err)
    }
  }

  return { leaksFound, skipped: false }
}
