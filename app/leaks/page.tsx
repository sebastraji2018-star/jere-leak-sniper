'use client'
import { useEffect, useState } from 'react'

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
}

export default function LeaksPage() {
  const [leaks, setLeaks] = useState<Leak[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Filtraciones detectadas</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? 'Cargando...' : `${leaks.length} resultado${leaks.length !== 1 ? 's' : ''} en YouTube`}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600 bg-[#111111] border border-white/5 px-4 py-2 rounded-xl">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
          <span>▶ YouTube</span>
        </div>
      </div>

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
              El sistema escaneará YouTube automáticamente. Volvé después del próximo ciclo.
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
                  <th className="text-left px-5 py-3 font-medium">Enlace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/3">
                {leaks.map(leak => (
                  <tr key={leak.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3.5 max-w-[200px]">
                      <span className="font-medium text-sm truncate block">{leak.title}</span>
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
                      <a
                        href={leak.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#F5C518] hover:underline"
                      >
                        Abrir en YouTube ↗
                      </a>
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
