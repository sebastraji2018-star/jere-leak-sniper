'use client'
import { useEffect, useState } from 'react'

interface Keyword {
  id: string
  term: string
  active: boolean
  created_at: string
}

const MAX_YOUTUBE = 8

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [newTerm, setNewTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  const activeCount = keywords.filter(k => k.active).length
  const atLimit = activeCount >= MAX_YOUTUBE

  async function fetchKeywords() {
    setLoading(true)
    const res = await fetch('/api/keywords')
    const data = await res.json()
    setKeywords(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchKeywords() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTerm.trim()) return
    setAdding(true)
    await fetch('/api/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ term: newTerm.trim() })
    })
    setNewTerm('')
    setAdding(false)
    fetchKeywords()
  }

  async function handleToggle(id: string, active: boolean) {
    await fetch('/api/keywords', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active })
    })
    fetchKeywords()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta keyword?')) return
    await fetch('/api/keywords', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    fetchKeywords()
  }

  const limitPct = Math.round((activeCount / MAX_YOUTUBE) * 100)
  const limitColor = activeCount >= MAX_YOUTUBE ? '#ef4444' : activeCount >= 6 ? '#f59e0b' : '#F5C518'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Keywords</h1>
          <p className="text-gray-500 text-sm mt-1">Términos de búsqueda para detectar filtraciones en YouTube</p>
        </div>
        <div className="bg-[#111111] border border-white/5 rounded-xl px-4 py-3 text-sm flex items-center gap-4">
          <div className="text-center">
            <div className="font-bold text-lg" style={{ color: limitColor }}>{activeCount}</div>
            <div className="text-xs text-gray-600">activas</div>
          </div>
          <div className="h-8 w-px bg-white/5" />
          <div className="text-center">
            <div className="font-bold text-lg text-gray-400">{MAX_YOUTUBE}</div>
            <div className="text-xs text-gray-600">límite YT</div>
          </div>
          <div className="w-20">
            <div className="w-full bg-white/5 rounded-full h-1.5 mb-1">
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${limitPct}%`, backgroundColor: limitColor }}
              />
            </div>
            <div className="text-xs text-gray-600">{limitPct}%</div>
          </div>
        </div>
      </div>

      {/* Warning */}
      {atLimit && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400 flex items-start gap-2">
          <span className="text-base flex-shrink-0">⚠️</span>
          <div>
            <strong>Límite alcanzado.</strong> Tenés {activeCount} de {MAX_YOUTUBE} keywords activas para YouTube.
            Desactivá alguna antes de agregar nuevas o la cuota se agotará en un solo ciclo.
          </div>
        </div>
      )}

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-3">
        <div className="flex-1 relative">
          <input
            value={newTerm}
            onChange={e => setNewTerm(e.target.value)}
            placeholder="ej: jere klein filtrado, jere klein leak, jere inédito..."
            className="w-full bg-[#111111] border border-white/8 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#F5C518]/50 transition-colors placeholder-gray-600"
            disabled={atLimit}
          />
        </div>
        <button
          type="submit"
          disabled={adding || !newTerm.trim() || atLimit}
          className="bg-[#F5C518] text-black px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#E8A000] disabled:opacity-40 transition-all hover:scale-105 active:scale-95 disabled:hover:scale-100 whitespace-nowrap"
        >
          {adding ? '...' : '+ Agregar'}
        </button>
      </form>

      {/* Keywords list */}
      <div className="space-y-2">
        {loading ? (
          <div className="bg-[#111111] border border-white/5 rounded-2xl p-12 text-center">
            <div className="inline-block w-5 h-5 border-2 border-[#F5C518] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : keywords.length === 0 ? (
          <div className="bg-[#111111] border border-white/5 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-gray-500 text-sm">Sin keywords. Agregá una para empezar a monitorear.</div>
          </div>
        ) : (
          keywords.map(kw => (
            <div
              key={kw.id}
              className={`flex items-center justify-between bg-[#111111] border rounded-xl px-5 py-4 transition-all duration-200 hover:border-white/10 ${
                kw.active ? 'border-white/8' : 'border-white/3 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <button
                  onClick={() => handleToggle(kw.id, kw.active)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex-shrink-0 ${kw.active ? 'bg-[#F5C518]' : 'bg-white/10'}`}
                  title={kw.active ? 'Desactivar' : 'Activar'}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${kw.active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{kw.term}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/15 px-1.5 py-0.5 rounded font-medium">▶ YouTube</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${kw.active ? 'text-[#F5C518] bg-[#F5C518]/10 border border-[#F5C518]/20' : 'text-gray-600 bg-white/3 border border-white/5'}`}>
                      {kw.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(kw.id)}
                className="flex-shrink-0 ml-4 text-gray-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                title="Eliminar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {keywords.length > 0 && (
        <p className="text-xs text-gray-700 text-center">
          Las keywords se aplican al próximo scan automático o cuando presionás &quot;Escanear ahora&quot; en el panel.
        </p>
      )}
    </div>
  )
}
