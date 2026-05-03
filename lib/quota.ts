import { supabaseAdmin } from './supabase'

// Usa zona horaria de Chile para que la cuota se reinicie a medianoche local
function getTodayChile(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

export async function getQuotaUsedToday(): Promise<number> {
  const today = getTodayChile()
  const { data, error } = await supabaseAdmin
    .from('youtube_quota')
    .select('units_used')
    .eq('date', today)
    .single()
  if (error || !data) return 0
  return data.units_used
}

export async function addQuotaUsed(units: number): Promise<void> {
  const today = getTodayChile()
  const current = await getQuotaUsedToday()
  await supabaseAdmin
    .from('youtube_quota')
    .upsert({ date: today, units_used: current + units }, { onConflict: 'date' })
}

export async function canRunYouTubeScan(keywordCount: number): Promise<boolean> {
  const needed = keywordCount * 100
  const used = await getQuotaUsedToday()
  return used + needed <= 9500
}
