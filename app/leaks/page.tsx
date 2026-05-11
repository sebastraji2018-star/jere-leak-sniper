'use client'
import { useEffect, useState, useMemo } from 'react'

interface Leak {
  id: string
  platform: string
  title: string
  url: string
  keyword_matched: string
  channel_or_artist: string | null
  published_at: string | null
  detected_at: string
  notified: boolean
  managed: boolean
}

function platformIcon(platform: string): string {
  if (platform === 'spotify') return '🎵'
  if (platform === 'soundcloud') return '🟠'
  return '▶️'
}

function PlatformLink({ leak }: { leak: Leak }) {
  if (leak.platform === 'spotify') {
    return (
      <a
        href={leak.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
        style={{ color: '#1DB954' }}
      >
        🎵 Ver en Spotify ↗
      </a>
    )
  }
  if (leak.platform === 'soundcloud') {
    return (
      <a
        href={leak.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
        style={{ color: '#FF5500' }}
      >
        🟠 Ver en SoundCloud ↗
      </a>
    )
  }
  return (
    <a
      href={leak.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
      style={{ color: '#F5C518' }}
    >
      ▶️ Ver en YouTube ↗
    </a>
  )
}

type PlatformFilter = 'all' | 'youtube' | 'spotify' | 'soundcloud'

export default function LeaksPage() {
  const [leaks, setLeaks] = useState<Leak[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<PlatformFilter>('all')

  useEffect(() => {
    async function fetchLeaks() {
      setLoading(true)
      const res = await fetch('/api/leaks')
      const data = await res.json()
      setLeaks(Array.isArray(data) ? data : [])
      setLoading(false)
    }
    fetchLeaks()
  }, [])

  const counts = useMemo(() => ({
    all: leaks.length,
    youtube: leaks.filter(l => l.platform === 'youtube').length,
    spotify: leaks.filter(l => l.platform === 'spotify').length,
    soundcloud: leaks.filter(l => l.platform === 'soundcloud').length,
  }), [leaks])

  const filteredLeaks = useMemo(() => {
    if (activeFilter === 'all') return leaks
    return leaks.filter(l => l.platform === activeFilter)
  }, [leaks, activeFilter])

  const activePlatforms = useMemo(() => {
    const platforms = new Set(leaks.map(l => l.platform))
    return platforms.size
  }, [leaks])

  async function toggleManaged(leak: Leak) {
    const nextManaged = !leak.managed
    // Optimistic update
    setLeaks(prev => prev.map(l => l.id === leak.id ? { ...l, managed: nextManaged } : l))
    try {
      await fetch('/api/leaks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leak.id, managed: nextManaged })
      })
    } catch {
      // Revert on failure
      setLeaks(prev => prev.map(l => l.id === leak.id ? { ...l, managed: leak.managed } : l))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Filtraciones detectadas</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading
              ? 'Cargando...'
              : `${leaks.length} resultado${leaks.length !== 1 ? 's' : ''} en ${activePlatforms > 0 ? `${activePlatforms} plataforma${activePlatforms !== 1 ? 's' : ''}` : 'todas las plataformas'}`
            }
          </p>
        </div>
      </div>

      {/* Tabs de filtro por plataforma */}
      {!loading && leaks.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {([
            { key: 'all' as PlatformFilter, label: 'Todas', count: counts.all, icon: null },
            { key: 'youtube' as PlatformFilter, label: 'YouTube', count: counts.youtube, icon: '▶' },
            { key: 'spotify' as PlatformFilter, label: 'Spotify', count: counts.spotify, icon: '🎵' },
            { key: 'soundcloud' as PlatformFilter, label: 'SoundCloud', count: counts.soundcloud, icon: '🟠' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 border ${
                activeFilter === tab.key
                  ? 'bg-[#F5C518]/10 border-[#F5C518]/30 text-[#F5C518]'
                  : 'bg-transparent border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10'
              }`}
            >
              {tab.icon && <span className="text-xs">{tab.icon}</span>}
              <span>{tab.label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeFilter === tab.key ? 'bg-[#F5C518]/20 text-[#F5C518]' : 'bg-white/5 text-gray-600'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-[#F5C518] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leaks.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-5xl mb-4 opacity-30">🎬</div>
            <div className="text-gray-400 font-medium text-sm">Sin filtraciones registradas</div>
            <div className="text-gray-600 text-xs mt-2 max-w-xs mx-auto">
              El sistema escaneará YouTube, Spotify y SoundCloud automáticamente. Volvé después del próximo ciclo.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-600 text-xs border-b border-white/5 bg-white/2">
                  <th className="text-left px-5 py-3 font-medium">Video</th>
                  <th className="text-left px-5 py-3 font-medium">Keyword</th>
                  <th className="text-left px-5 py-3 font-medium">Canal</th>
                  <th className="text-left px-5 py-3 font-medium">Subido</th>
                  <th className="text-left px-5 py-3 font-medium">Detectado</th>
                  <th className="text-left px-5 py-3 font-medium">Notif.</th>
                  <th className="text-left px-5 py-3 font-medium">Gestionado</th>
                  <th className="text-left px-5 py-3 font-medium">Enlace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/3">
                {filteredLeaks.map(leak => (
                  <tr
                    key={leak.id}
                    className={`hover:bg-white/2 transition-colors ${leak.managed ? 'opacity-50' : ''}`}
                  >
                    <td className="px-5 py-3.5 max-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="flex-shrink-0 text-base">{platformIcon(leak.platform)}</span>
                        <span className="font-medium text-sm truncate block">{leak.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[#F5C518] text-xs bg-[#F5C518]/8 border border-[#F5C518]/20 px-2 py-0.5 rounded font-mono">
                        {leak.keyword_matched}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs max-w-[140px] truncate">
                      {leak.channel_or_artist ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap" suppressHydrationWarning>
                      {leak.published_at ? new Date(leak.published_at).toLocaleDateString('es-CL') : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap" suppressHydrationWarning>
                      {new Date(leak.detected_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-sm ${leak.notified ? 'text-[#F5C518]' : 'text-gray-600'}`} title={leak.notified ? 'Notificado' : 'Pendiente'}>
                        {leak.notified ? '✓' : '○'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => toggleManaged(leak)}
                        title={leak.managed ? 'Marcar como no gestionado' : 'Marcar como gestionado'}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                          leak.managed
                            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                            : 'bg-transparent border border-gray-700 text-transparent hover:border-gray-500'
                        }`}
                      >
                        {leak.managed ? '✅' : ''}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <PlatformLink leak={leak} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
