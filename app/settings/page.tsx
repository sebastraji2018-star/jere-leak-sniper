'use client'
import { useEffect, useState } from 'react'

interface OfficialAccount {
  id: string
  platform: string
  account_id: string
  account_name: string | null
}

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<OfficialAccount[]>([])
  const [monitoringStart, setMonitoringStart] = useState('')
  const [quotaUsed, setQuotaUsed] = useState(0)
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [resetStatus, setResetStatus] = useState<'idle' | 'saving' | 'ok'>('idle')
  const [newAccount, setNewAccount] = useState({ platform: 'youtube', account_id: '', account_name: '' })

  async function fetchData() {
    const [accRes, configRes, quotaRes] = await Promise.all([
      fetch('/api/settings/accounts').then(r => r.json()).catch(() => []),
      fetch('/api/settings/config').then(r => r.json()).catch(() => ({})),
      fetch('/api/settings/quota').then(r => r.json()).catch(() => ({ units_used: 0 }))
    ])
    setAccounts(Array.isArray(accRes) ? accRes : [])
    setMonitoringStart(configRes.monitoring_start_date ?? '')
    setQuotaUsed(quotaRes.units_used ?? 0)
  }

  useEffect(() => { fetchData() }, [])

  async function handleTestNotification() {
    setTestStatus('sending')
    const res = await fetch('/api/test-notification', { method: 'POST' })
    setTestStatus(res.ok ? 'ok' : 'error')
    setTimeout(() => setTestStatus('idle'), 3000)
  }

  async function handleResetDate() {
    setResetStatus('saving')
    await fetch('/api/settings/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'monitoring_start_date', value: new Date().toISOString() })
    })
    await fetchData()
    setResetStatus('ok')
    setTimeout(() => setResetStatus('idle'), 3000)
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/settings/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAccount)
    })
    setNewAccount({ platform: 'youtube', account_id: '', account_name: '' })
    fetchData()
  }

  async function handleDeleteAccount(id: string) {
    if (!confirm('¿Eliminar esta cuenta?')) return
    await fetch('/api/settings/accounts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    fetchData()
  }

  const mask = (s: string) => s ? s.slice(0, 6) + '...' + s.slice(-4) : '—'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ajustes</h1>
        <p className="text-gray-500 text-sm mt-1">Configuración del sistema de monitoreo</p>
      </div>

      {/* Telegram */}
      <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="font-semibold">Telegram</h2>
          <p className="text-xs text-gray-500 mt-0.5">Canal donde se envían las alertas de filtraciones</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3">
            <div className="text-xs text-gray-600 mb-1.5 uppercase tracking-wider">Bot Token</div>
            <div className="font-mono text-sm text-gray-300">{mask('8645317958:AAH8eWekN7lnZegM4csgHSLye6KmA28qAsw')}</div>
          </div>
          <div className="bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3">
            <div className="text-xs text-gray-600 mb-1.5 uppercase tracking-wider">Chat ID</div>
            <div className="font-mono text-sm text-gray-300">-5289696392</div>
          </div>
        </div>
        <button
          onClick={handleTestNotification}
          disabled={testStatus === 'sending'}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
            testStatus === 'ok' ? 'bg-[#F5C518]/20 text-[#F5C518] border border-[#F5C518]/30' :
            testStatus === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
            'bg-[#F5C518] text-black hover:bg-[#E8A000] hover:scale-105 active:scale-95'
          } disabled:opacity-60 disabled:hover:scale-100`}
        >
          {testStatus === 'sending' ? 'Enviando...' : testStatus === 'ok' ? '✓ Notificación enviada' : testStatus === 'error' ? 'Error al enviar' : 'Enviar notificación de prueba'}
        </button>
      </div>

      {/* Official accounts */}
      <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="font-semibold">Cuentas oficiales a ignorar</h2>
          <p className="text-xs text-gray-500 mt-0.5">Videos de estos canales de YouTube no se reportarán como filtraciones</p>
        </div>
        <form onSubmit={handleAddAccount} className="flex flex-wrap gap-2">
          <select
            value={newAccount.platform}
            onChange={e => setNewAccount(p => ({ ...p, platform: e.target.value }))}
            className="bg-[#0a0a0a] border border-white/8 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#F5C518]/50 transition-colors"
          >
            <option value="youtube">YouTube</option>
          </select>
          <input
            value={newAccount.account_id}
            onChange={e => setNewAccount(p => ({ ...p, account_id: e.target.value }))}
            placeholder="Channel ID (ej: UCxxxx)"
            className="flex-1 min-w-[160px] bg-[#0a0a0a] border border-white/8 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#F5C518]/50 transition-colors placeholder-gray-600"
          />
          <input
            value={newAccount.account_name}
            onChange={e => setNewAccount(p => ({ ...p, account_name: e.target.value }))}
            placeholder="Nombre del canal (opcional)"
            className="flex-1 min-w-[160px] bg-[#0a0a0a] border border-white/8 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#F5C518]/50 transition-colors placeholder-gray-600"
          />
          <button
            type="submit"
            disabled={!newAccount.account_id.trim()}
            className="bg-[#F5C518] text-black px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#E8A000] disabled:opacity-40 transition-all hover:scale-105 active:scale-95 disabled:hover:scale-100"
          >
            + Agregar
          </button>
        </form>
        {accounts.length === 0 ? (
          <p className="text-gray-600 text-sm py-2">Sin cuentas registradas. Todos los resultados se reportarán.</p>
        ) : (
          <div className="space-y-2">
            {accounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/15 px-2 py-0.5 rounded font-medium flex-shrink-0">▶ YouTube</span>
                  <span className="font-mono text-sm text-gray-300 truncate">{acc.account_id}</span>
                  {acc.account_name && <span className="text-gray-500 text-xs truncate">{acc.account_name}</span>}
                </div>
                <button
                  onClick={() => handleDeleteAccount(acc.id)}
                  className="flex-shrink-0 ml-4 text-gray-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                  title="Eliminar"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System */}
      <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="font-semibold">Sistema</h2>
          <p className="text-xs text-gray-500 mt-0.5">El sistema solo detecta videos subidos después de la fecha de inicio</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3">
            <div className="text-xs text-gray-600 mb-1.5 uppercase tracking-wider">Inicio del monitoreo</div>
            <div className="font-mono text-sm text-gray-300" suppressHydrationWarning>
              {monitoringStart ? new Date(monitoringStart).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
            </div>
          </div>
          <div className="bg-[#0a0a0a] border border-white/5 rounded-xl px-4 py-3">
            <div className="text-xs text-gray-600 mb-1.5 uppercase tracking-wider">Cuota YouTube hoy</div>
            <div className="font-mono text-sm text-[#F5C518]">{quotaUsed.toLocaleString('es-CL')} / 10.000 unidades</div>
          </div>
        </div>
        <button
          onClick={handleResetDate}
          disabled={resetStatus === 'saving'}
          className={`px-5 py-2.5 rounded-xl text-sm transition-all duration-200 disabled:opacity-60 ${
            resetStatus === 'ok'
              ? 'bg-[#F5C518]/20 text-[#F5C518] border border-[#F5C518]/30'
              : 'bg-[#0a0a0a] border border-white/8 text-gray-300 hover:border-[#F5C518]/40 hover:text-white'
          }`}
        >
          {resetStatus === 'saving' ? 'Guardando...' : resetStatus === 'ok' ? '✓ Fecha reseteada' : 'Resetear fecha de inicio a ahora'}
        </button>
      </div>
    </div>
  )
}
