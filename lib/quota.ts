import { supabaseAdmin } from './supabase'

export async function getQuotaUsedToday(): Promise<number> {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabaseAdmin
    .from('youtube_quota')
    .select('units_used')
    .eq('date', today)
    .single()
  if (error || !data) return 0
  return data.units_used
}

export async function addQuotaUsed(units: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
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
