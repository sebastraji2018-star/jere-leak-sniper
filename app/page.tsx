'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
// Image import removed — using native img for blend-mode compatibility

interface Leak {
  id: string
  platform: string
  title: string
  url: string
  keyword_matched: string
  channel_or_artist: string | null
  published_at: string | null
  detected_at: string
}

interface ScanLog {
  id: string
  started_at: string
  completed_at: string | null
  platform: string
  keywords_scanned: number
  leaks_found: number
  youtube_units_used: number
  status: string
  error_message: string | null
}

interface DashboardData {
  leaks: Leak[]
  totalLeaks: number
  keywordCount: number
  quotaUsed: number
  lastScan: string | null
  isActive: boolean
  scanHistory: ScanLog[]
  spotifyLeaks: number
  soundcloudLeaks: number
}

function QuotaBar({ used, max = 10000 }: { used: number; max?: number }) {
  const pct = Math.min(100, Math.round((used / max) * 100))
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#F5C518'
  return (
    <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 hover:border-[#F5C518]/10 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-sm font-semibold">Cuota YouTube API</div>
          <div className="text-xs text-gray-600 mt-0.5">Se reinicia cada medianoche · cada keyword usa 100 unidades</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold font-mono" style={{ color }}>{pct}%</div>
          <div className="text-xs text-gray-600">{used.toLocaleString('es-CL')} / {max.toLocaleString('es-CL')}</div>
        </div>
      </div>
      <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
        <div className="h-2 rounded-full transition-all duration-1000" style={{ width: `${Math.max(pct, 0.3)}%`, backgroundColor: color }} />
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-700">
        <span>{pct}% usado hoy</span>
        <span>{(max - used).toLocaleString('es-CL')} disponibles</span>
      </div>
    </div>
  )
}

function NextScanCountdown({ lastScan, onZero }: { lastScan: string | null, onZero: () => void }) {
  const [t, setT] = useState({ h: 0, m: 0, s: 0, pct: 0 })
  const firedRef = useRef(false)

  useEffect(() => {
    firedRef.current = false
  }, [lastScan])

  useEffect(() => {
    function getNextScheduledScan(): number {
      // GitHub Actions cron: '0 */2 * * *' → runs at 00,02,04,...,22 UTC
      const now = Date.now()
      const ms2h = 2 * 3600 * 1000
      const midnight = new Date()
      midnight.setUTCHours(0, 0, 0, 0)
      const sinceM = now - midnight.getTime()
      // next 2h slot strictly in the future
      const next2h = Math.ceil((sinceM + 1000) / ms2h) * ms2h
      return midnight.getTime() + next2h
    }

    function calc() {
      const now = Date.now()
      const ms2h = 2 * 3600 * 1000

      // nextScan = lastScan + 2h, but if that's already past → use next scheduled slot
      let nextScan: number
      if (lastScan) {
        const candidate = new Date(lastScan).getTime() + ms2h
        nextScan = candidate > now ? candidate : getNextScheduledScan()
      } else {
        nextScan = getNextScheduledScan()
      }

      const rem = Math.max(0, nextScan - now)
      const elapsed = ms2h - rem
      const pct = Math.min(100, Math.round((elapsed / ms2h) * 100))
      setT({
        h: Math.floor(rem / 3600000),
        m: Math.floor((rem % 3600000) / 60000),
        s: Math.floor((rem % 60000) / 1000),
        pct
      })
      // Cuando llega a 0, refresca el dashboard después de 30s (tiempo para que el cron corra)
      if (rem === 0 && !firedRef.current) {
        firedRef.current = true
        setTimeout(() => { onZero(); firedRef.current = false }, 30000)
      }
    }
    calc()
    const iv = setInterval(calc, 1000)
    return () => clearInterval(iv)
  }, [lastScan, onZero])

  const r = 36
  const circ = 2 * Math.PI * r
  const offset = circ - (t.pct / 100) * circ
  const isImminent = t.h === 0 && t.m < 5

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
          <circle cx="40" cy="40" r={r} fill="none"
            stroke={isImminent ? '#22c55e' : '#F5C518'}
            strokeWidth="5" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center" suppressHydrationWarning>
          <div className="text-center">
            <div className={`text-xs font-mono font-bold leading-none ${isImminent ? 'text-green-400' : 'text-[#F5C518]'}`}>
              {String(t.h).padStart(2,'0')}:{String(t.m).padStart(2,'0')}
            </div>
            <div className="text-[9px] text-gray-700 mt-0.5">restante</div>
          </div>
        </div>
      </div>
      <div className={`text-xs text-center leading-tight ${isImminent ? 'text-green-400' : 'text-gray-600'}`}>
        {isImminent ? 'Escaneando\npronto...' : 'Próximo\nscan auto'}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState<'idle'|'scanning'|'done'|'error'>('idle')
  const [scanMsg, setScanMsg] = useState('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) setData(await res.json())
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchData()
    intervalRef.current = setInterval(fetchData, 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchData])

  async function handleScan() {
    setScanning(true)
    setScanStatus('scanning')
    setScanMsg('Buscando en YouTube con tus keywords...')
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        signal: AbortSignal.timeout(55000)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // Scan completed server-side (Telegram already sent) — refresh immediately
      await fetchData()
      setScanStatus('done')
      setScanMsg('Completado — revisá Telegram para el reporte')
      setScanning(false)
      setTimeout(() => { setScanStatus('idle'); setScanMsg('') }, 6000)
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'TimeoutError'
      setScanStatus('error')
      setScanMsg(isTimeout ? 'Timeout — el scan sigue corriendo, revisá Telegram' : 'Error al conectar')
      setScanning(false)
      // On timeout the server-side scan may still complete, so refresh after a short delay
      if (isTimeout) setTimeout(fetchData, 5000)
      setTimeout(() => { setScanStatus('idle'); setScanMsg('') }, 5000)
    }
  }

  if (!data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-64 bg-[#111111] border border-white/5 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-[#111111] border border-white/5 rounded-2xl h-32" />)}
        </div>
        <div className="bg-[#111111] border border-white/5 rounded-2xl h-20" />
      </div>
    )
  }

  return (
    <div className="space-y-6 slide-in">

      {/* HEADER — logo compacto + título + status + scan button */}
      <div className="relative overflow-hidden rounded-2xl border border-[#F5C518]/15 bg-[#0d0d0d]">
        <div className="h-px bg-gradient-to-r from-transparent via-[#F5C518]/25 to-transparent" />
        <div className="px-6 py-5 flex flex-col sm:flex-row items-center gap-4">
          {/* Logo pequeño */}
          <div className="flex-shrink-0" style={{ mixBlendMode: 'screen' }}>
            <img
              src="/isotipo.png"
              alt="Jere Klein"
              className="spin-3d"
              style={{ objectFit: 'contain', width: 120, height: 120, display: 'block' }}
            />
          </div>

          {/* Título + status + último scan */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">Leak Sniper</h1>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                data.isActive ? 'border-[#F5C518]/30 text-[#F5C518] bg-[#F5C518]/8' : 'border-white/10 text-gray-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${data.isActive ? 'bg-[#F5C518] animate-pulse' : 'bg-gray-600'}`} />
                {data.isActive ? 'Sistema activo' : 'Inactivo'}
              </div>
            </div>
            <p className="text-gray-500 text-sm">YouTube · Spotify · SoundCloud · cada 2 horas · alertas Telegram</p>
            {data.lastScan && (
              <p className="text-xs text-gray-700 mt-1" suppressHydrationWarning>
                Último scan: {new Date(data.lastScan).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          {/* Scan button — anclado a la derecha */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <button
              onClick={handleScan}
              disabled={scanning}
              className={`relative overflow-hidden px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                scanning
                  ? 'bg-[#F5C518]/15 text-[#F5C518] border border-[#F5C518]/30 cursor-not-allowed'
                  : 'bg-[#F5C518] text-black hover:bg-[#FFD740] hover:scale-105 active:scale-95 shadow-lg shadow-[#F5C518]/20'
              }`}
            >
              {scanning && (
                <div className="absolute inset-0 overflow-hidden rounded-xl">
                  <div className="scan-line absolute w-full h-0.5 bg-[#F5C518]/60 left-0" />
                </div>
              )}
              <div className="flex items-center gap-2">
                {scanning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#F5C518] border-t-transparent rounded-full animate-spin" />
                    <span>Escaneando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Escanear ahora</span>
                  </>
                )}
              </div>
            </button>
            {scanMsg && (
              <span className={`text-xs px-3 py-1.5 rounded-lg border text-center max-w-[200px] ${
                scanStatus === 'done' ? 'text-[#F5C518] bg-[#F5C518]/8 border-[#F5C518]/20' :
                scanStatus === 'error' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                'text-gray-400 bg-white/5 border-white/8'
              }`}>
                {scanMsg}
              </span>
            )}
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-[#F5C518]/20 to-transparent" />
      </div>

      {/* Stats — fila 1: filtraciones + plataformas (3 cols) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 hover:border-[#F5C518]/15 transition-colors group">
          <div className="text-xs text-gray-600 mb-3 uppercase tracking-wider font-medium">Filtraciones totales</div>
          <div className="flex items-end justify-between">
            <div className="text-5xl font-bold text-[#F5C518] group-hover:text-[#FFD740] transition-colors">{data.totalLeaks}</div>
            {data.totalLeaks > 0 && <a href="/leaks" className="text-xs text-gray-600 hover:text-[#F5C518] transition-colors pb-1">Ver todas →</a>}
          </div>
          <div className="text-xs text-gray-700 mt-2">desde la activación</div>
        </div>

        {/* Spotify */}
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 hover:border-[#1DB954]/20 transition-colors group">
          <div className="flex items-center gap-2 mb-3">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="#1DB954">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            <div className="text-xs text-gray-600 uppercase tracking-wider font-medium">Spotify</div>
          </div>
          <div className="text-5xl font-bold" style={{ color: data.spotifyLeaks > 0 ? '#1DB954' : undefined }}>
            {data.spotifyLeaks}
          </div>
          <div className="text-xs text-gray-700 mt-2">tracks sospechosos</div>
        </div>

        {/* SoundCloud */}
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 hover:border-[#FF5500]/20 transition-colors group">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[#FF5500] text-sm leading-none">●</span>
            <div className="text-xs text-gray-600 uppercase tracking-wider font-medium">SoundCloud</div>
          </div>
          <div className="text-5xl font-bold" style={{ color: data.soundcloudLeaks > 0 ? '#FF5500' : undefined }}>
            {data.soundcloudLeaks}
          </div>
          <div className="text-xs text-gray-700 mt-2">tracks sospechosos</div>
        </div>
      </div>

      {/* Stats — fila 2: keywords + countdown (2 cols) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 hover:border-[#F5C518]/15 transition-colors group">
          <div className="text-xs text-gray-600 mb-3 uppercase tracking-wider font-medium">Keywords activas</div>
          <div className="flex items-end justify-between">
            <div className="text-5xl font-bold group-hover:text-[#F5C518] transition-colors">{data.keywordCount}</div>
            <a href="/keywords" className="text-xs text-gray-600 hover:text-[#F5C518] transition-colors pb-1">Gestionar →</a>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-700 mb-1.5">
              <span>Límite YouTube</span>
              <span>{data.keywordCount}/8</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5">
              <div className="h-1.5 rounded-full transition-all duration-500" style={{
                width: `${Math.min(100, (data.keywordCount / 8) * 100)}%`,
                backgroundColor: data.keywordCount >= 8 ? '#ef4444' : data.keywordCount >= 6 ? '#f59e0b' : '#F5C518'
              }} />
            </div>
          </div>
        </div>

        <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 flex items-center justify-center hover:border-[#F5C518]/15 transition-colors">
          <NextScanCountdown lastScan={data.lastScan} onZero={fetchData} />
        </div>
      </div>

      {/* Quota */}
      <QuotaBar used={data.quotaUsed} />

      {/* Scan history */}
      {data.scanHistory && data.scanHistory.length > 0 && (
        <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Historial de scans</h2>
            <span className="text-xs text-gray-700">Últimos {data.scanHistory.length}</span>
          </div>
          <div className="divide-y divide-white/3">
            {data.scanHistory.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/2 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'completed' ? 'bg-[#F5C518]' : log.status === 'error' ? 'bg-red-500' : 'bg-yellow-400 animate-pulse'}`} />
                  <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap" suppressHydrationWarning>
                    {new Date(log.started_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-xs text-gray-600 hidden sm:inline">{log.keywords_scanned} keywords</span>
                  {log.platform && (
                    <span className="text-[10px] text-gray-700 bg-white/3 border border-white/5 px-1.5 py-0.5 rounded hidden sm:inline capitalize">
                      {log.platform}
                    </span>
                  )}
                </div>
                <div className="flex-shrink-0 ml-3">
                  {log.leaks_found > 0 ? (
                    <span className="text-xs font-semibold text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                      {log.leaks_found} {log.leaks_found > 1 ? 'filtraciones' : 'filtración'}
                    </span>
                  ) : log.status === 'error' ? (
                    <span className="text-xs text-red-500 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">Error</span>
                  ) : (
                    <span className="text-xs text-gray-600 bg-white/3 px-3 py-1 rounded-full">Sin novedades</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaks table */}
      <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Filtraciones detectadas</h2>
          {data.leaks.length > 0 && <a href="/leaks" className="text-xs text-[#F5C518] hover:underline">Ver todas →</a>}
        </div>
        {data.leaks.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-5 opacity-15">
              <img src="/isotipo.png" alt="" style={{ width: 64, height: 64, objectFit: 'contain', mixBlendMode: 'screen' }} />
            </div>
            <div className="text-gray-500 font-medium text-sm">Sin filtraciones detectadas</div>
            <div className="text-gray-700 text-xs mt-2 max-w-xs mx-auto leading-relaxed">
              Cuando el sistema detecte un video o track con tus keywords, aparecerá aquí y recibirás el link en Telegram
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-600 text-xs border-b border-white/5 bg-white/2">
                  <th className="text-left px-5 py-3 font-medium">Video detectado</th>
                  <th className="text-left px-5 py-3 font-medium">Keyword</th>
                  <th className="text-left px-5 py-3 font-medium">Canal</th>
                  <th className="text-left px-5 py-3 font-medium">Fecha</th>
                  <th className="text-left px-5 py-3 font-medium">Enlace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/3">
                {data.leaks.map(leak => (
                  <tr key={leak.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3.5 max-w-[240px]">
                      <div className="flex items-center gap-2">
                        <span className="flex-shrink-0 text-base">{leak.platform === 'spotify' ? '🎵' : leak.platform === 'soundcloud' ? '🟠' : '▶️'}</span>
                        <span className="font-medium text-sm truncate block max-w-[200px]">{leak.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[#F5C518] text-xs bg-[#F5C518]/8 border border-[#F5C518]/20 px-2 py-0.5 rounded font-mono">{leak.keyword_matched}</span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs max-w-[120px]">
                      <span className="truncate block">{leak.channel_or_artist ?? '—'}</span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap" suppressHydrationWarning>
                      {leak.published_at ? new Date(leak.published_at).toLocaleDateString('es-CL') : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <a href={leak.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-medium hover:underline"
                        style={{ color: leak.platform === 'spotify' ? '#1DB954' : leak.platform === 'soundcloud' ? '#FF5500' : '#F5C518' }}>
                        {leak.platform === 'spotify' ? 'Ver en Spotify ↗' : leak.platform === 'soundcloud' ? 'Ver en SoundCloud ↗' : 'Ver en YouTube ↗'}
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
