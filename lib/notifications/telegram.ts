const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!

async function sendTelegramMessage(text: string, chatId?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId ?? CHAT_ID,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      })
    })
    const data = await res.json()
    if (!data.ok) return { ok: false, error: data.description }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Desconocida'
  return new Date(dateStr).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Santiago'
  })
}

export async function sendLeakNotification(leak: {
  title: string
  platform: string
  keyword_matched: string
  url: string
  published_at: string | null
}): Promise<void> {
  const text = [
    '🚨 *FILTRACIÓN DETECTADA — JERE KLEIN*',
    '',
    `🎬 *${leak.title}*`,
    `▶️ Plataforma: YouTube`,
    `🔑 Keyword: \`${leak.keyword_matched}\``,
    `🔗 ${leak.url}`,
    `📅 Subido: ${formatDate(leak.published_at)}`,
    '',
    '_⚡ Borrar inmediatamente — Leak Sniper_'
  ].join('\n')
  await sendTelegramMessage(text)
}

export async function sendScanReport(stats: {
  leaksFound: number
  youtubeKeywords: number
  leaks: Array<{ title: string; platform: string; url: string; keyword_matched: string }>
}): Promise<void> {
  const now = formatDate(new Date().toISOString())
  if (stats.leaksFound === 0) {
    const text = [
      '✅ *Monitoreo completado — Sin novedades*',
      '',
      `🕐 ${now}`,
      `▶️ YouTube: ${stats.youtubeKeywords} keywords escaneadas`,
      '',
      '_No se filtró nada de Jere Klein en este ciclo._'
    ].join('\n')
    await sendTelegramMessage(text)
  } else {
    const leakLines = stats.leaks.map((l, i) => [
      `${i + 1}. 🎬 *${l.title}*`,
      `   🔑 Keyword: \`${l.keyword_matched}\``,
      `   🔗 ${l.url}`
    ].join('\n')).join('\n\n')
    const text = [
      `🚨 *FILTRACIÓN DETECTADA — JERE KLEIN*`,
      `${stats.leaksFound} video${stats.leaksFound > 1 ? 's' : ''} filtrado${stats.leaksFound > 1 ? 's' : ''} en YouTube`,
      '',
      leakLines,
      '',
      `🕐 ${now}`,
      '_⚡ Borrar inmediatamente — Leak Sniper_'
    ].join('\n')
    await sendTelegramMessage(text)
  }
}

export async function sendTestNotification(): Promise<{ ok: boolean; error?: string }> {
  return sendTelegramMessage(
    '✅ *Jere Klein Leak Sniper — Conectado*\n\nLas notificaciones están funcionando.\n\n_Recibirás una alerta aquí cada vez que se detecte contenido filtrado._'
  )
}

export { sendTelegramMessage }
